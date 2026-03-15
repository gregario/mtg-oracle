import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// --- Types ---

export interface CardRow {
  id: string;
  name: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  colors: string | null;
  color_identity: string | null;
  keywords: string | null;
  rarity: string | null;
  set_code: string | null;
  set_name: string | null;
  released_at: string | null;
  image_uri: string | null;
  scryfall_uri: string | null;
  edhrec_rank: number | null;
  artist: string | null;
}

export interface CardFaceRow {
  card_id: string;
  face_index: number;
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  colors: string | null;
}

export interface LegalityRow {
  card_id: string;
  format: string;
  status: string;
}

export interface RulingRow {
  card_id: string;
  source: string | null;
  published_at: string | null;
  comment: string;
}

export interface RuleRow {
  section: string;
  title: string | null;
  text: string;
  parent_section: string | null;
}

export interface GlossaryRow {
  term: string;
  definition: string;
}

export interface KeywordRow {
  name: string;
  section: string;
  type: string;
  rules_text: string;
}

export interface ComboRow {
  id: string;
  cards: string;
  color_identity: string | null;
  prerequisites: string | null;
  steps: string | null;
  results: string | null;
  legality: string | null;
  popularity: number | null;
}

export interface FtsSearchResult {
  name: string;
  type_line: string | null;
  oracle_text: string | null;
  rank: number;
}

// --- Constants ---

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.mtg-oracle');
const DB_FILENAME = 'cards.sqlite';

// --- Schema loading ---

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function loadSchema(): string {
  return fs.readFileSync(SCHEMA_PATH, 'utf-8');
}

// --- Database management ---

/**
 * Ensures the data directory exists, creating it if necessary.
 */
function ensureDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Opens (or creates) a SQLite database and initializes the schema.
 *
 * @param dataDir - Custom data directory. Defaults to ~/.mtg-oracle/.
 *                  Pass ':memory:' for an in-memory database (tests).
 * @returns A better-sqlite3 Database instance with schema applied.
 */
export function getDatabase(dataDir?: string): Database.Database {
  let db: Database.Database;

  if (dataDir === ':memory:') {
    db = new Database(':memory:');
  } else {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    ensureDataDir(dir);
    const dbPath = path.join(dir, DB_FILENAME);
    db = new Database(dbPath);
  }

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema (idempotent via IF NOT EXISTS)
  initializeSchema(db);

  return db;
}

/**
 * Runs the schema SQL against the database.
 * Safe to call multiple times due to IF NOT EXISTS clauses.
 */
function initializeSchema(db: Database.Database): void {
  // For in-memory databases, read schema from the source file or use embedded schema
  let schema: string;
  try {
    schema = loadSchema();
  } catch {
    // Fallback: if running from dist/ and schema.sql isn't copied, throw a clear error
    throw new Error(
      `Could not load schema.sql from ${SCHEMA_PATH}. ` +
      'Ensure schema.sql is copied to the dist/data/ directory during build.'
    );
  }
  db.exec(schema);
}

// --- Query helpers ---

/**
 * Insert a card into the cards table.
 */
export function insertCard(db: Database.Database, card: CardRow): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cards
    (id, name, mana_cost, cmc, type_line, oracle_text, power, toughness,
     loyalty, colors, color_identity, keywords, rarity, set_code, set_name,
     released_at, image_uri, scryfall_uri, edhrec_rank, artist)
    VALUES
    (@id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @power, @toughness,
     @loyalty, @colors, @color_identity, @keywords, @rarity, @set_code, @set_name,
     @released_at, @image_uri, @scryfall_uri, @edhrec_rank, @artist)
  `);
  stmt.run(card);
}

/**
 * Insert a card face into the card_faces table.
 */
export function insertCardFace(db: Database.Database, face: CardFaceRow): void {
  const stmt = db.prepare(`
    INSERT INTO card_faces
    (card_id, face_index, name, mana_cost, type_line, oracle_text, power, toughness, colors)
    VALUES
    (@card_id, @face_index, @name, @mana_cost, @type_line, @oracle_text, @power, @toughness, @colors)
  `);
  stmt.run(face);
}

/**
 * Insert a legality entry.
 */
export function insertLegality(db: Database.Database, legality: LegalityRow): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO legalities (card_id, format, status)
    VALUES (@card_id, @format, @status)
  `);
  stmt.run(legality);
}

/**
 * Insert a ruling entry.
 */
export function insertRuling(db: Database.Database, ruling: RulingRow): void {
  const stmt = db.prepare(`
    INSERT INTO rulings (card_id, source, published_at, comment)
    VALUES (@card_id, @source, @published_at, @comment)
  `);
  stmt.run(ruling);
}

/**
 * Get a card by its oracle ID.
 */
export function getCardById(db: Database.Database, id: string): CardRow | undefined {
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
}

/**
 * Get a card by exact name match.
 */
export function getCardByName(db: Database.Database, name: string): CardRow | undefined {
  return db.prepare('SELECT * FROM cards WHERE name = ?').get(name) as CardRow | undefined;
}

/**
 * Get all faces for a card.
 */
export function getCardFaces(db: Database.Database, cardId: string): CardFaceRow[] {
  return db.prepare('SELECT * FROM card_faces WHERE card_id = ? ORDER BY face_index').all(cardId) as CardFaceRow[];
}

/**
 * Get legalities for a card.
 */
export function getCardLegalities(db: Database.Database, cardId: string): LegalityRow[] {
  return db.prepare('SELECT * FROM legalities WHERE card_id = ?').all(cardId) as LegalityRow[];
}

/**
 * Full-text search across card name, type_line, and oracle_text.
 * Returns matching cards ranked by relevance.
 */
export function searchCards(db: Database.Database, query: string, limit: number = 20): FtsSearchResult[] {
  return db.prepare(`
    SELECT cards_fts.name, cards_fts.type_line, cards_fts.oracle_text, rank
    FROM cards_fts
    WHERE cards_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query, limit) as FtsSearchResult[];
}

/**
 * Get all table names in the database (excluding internal SQLite tables).
 */
export function getTableNames(db: Database.Database): string[] {
  const rows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as Array<{ name: string }>;
  return rows.map(r => r.name);
}
