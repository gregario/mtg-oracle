/**
 * Scryfall data pipeline: download bulk data and ingest into SQLite.
 *
 * Data sourced from Scryfall (https://scryfall.com/).
 * Card data © Wizards of the Coast. Used under Fan Content Policy.
 */
import type Database from 'better-sqlite3';

// --- Types ---

/** Scryfall bulk-data metadata (one entry from the /bulk-data array). */
export interface BulkDataEntry {
  id: string;
  type: string;
  updated_at: string;
  download_uri: string;
  name: string;
  size: number;
}

/** Scryfall card object (subset of fields we care about). */
export interface ScryfallCard {
  id: string;              // oracle_id on Scryfall — but `id` in the bulk JSON
  oracle_id?: string;      // present on oracle_cards bulk
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  rarity?: string;
  set?: string;
  set_name?: string;
  released_at?: string;
  image_uris?: { normal?: string; small?: string; png?: string };
  scryfall_uri?: string;
  edhrec_rank?: number;
  artist?: string;
  legalities?: Record<string, string>;
  card_faces?: ScryfallCardFace[];
  layout?: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  image_uris?: { normal?: string; small?: string };
}

export interface ScryfallRuling {
  oracle_id: string;
  source: string;
  published_at: string;
  comment: string;
}

// --- Download helpers ---

const BULK_DATA_URL = 'https://api.scryfall.com/bulk-data';

/**
 * Fetch Scryfall bulk-data metadata listing.
 * Returns the array of available bulk data entries.
 */
export async function fetchBulkDataMetadata(
  fetchFn: typeof fetch = fetch,
): Promise<BulkDataEntry[]> {
  const resp = await fetchFn(BULK_DATA_URL, {
    headers: { 'User-Agent': 'mtg-oracle/0.1.0', 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Scryfall bulk-data metadata request failed: ${resp.status}`);
  }
  const body = (await resp.json()) as { data: BulkDataEntry[] };
  return body.data;
}

/**
 * Find a specific bulk data entry by type (e.g. 'oracle_cards', 'rulings').
 */
export function findBulkEntry(entries: BulkDataEntry[], type: string): BulkDataEntry | undefined {
  return entries.find(e => e.type === type);
}

/**
 * Download a bulk JSON file from Scryfall. Returns the parsed JSON.
 * For the oracle_cards file (~80-160MB), this loads the full JSON into memory.
 * A streaming approach would be better for very large files, but Node's native
 * fetch already streams the body — JSON.parse is the bottleneck.
 */
export async function downloadBulkFile<T>(
  url: string,
  label: string,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  console.error(`[scryfall] Downloading ${label}...`);
  const resp = await fetchFn(url, {
    headers: { 'User-Agent': 'mtg-oracle/0.1.0', 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to download ${label}: ${resp.status}`);
  }
  const text = await resp.text();
  console.error(`[scryfall] Parsing ${label} (${(text.length / 1024 / 1024).toFixed(1)} MB)...`);
  return JSON.parse(text) as T;
}

// --- Ingestion ---

const BATCH_SIZE = 500;

/**
 * Returns true if the card has multiple faces that should be stored separately.
 * Transform/MDFC/adventure/flip cards have card_faces.
 */
function isMultiFace(card: ScryfallCard): boolean {
  const multiFaceLayouts = new Set([
    'transform', 'modal_dfc', 'double_faced_token',
    'reversible_card', 'art_series',
  ]);
  return !!(card.card_faces && card.card_faces.length > 1 && card.layout && multiFaceLayouts.has(card.layout));
}

/**
 * Ingest an array of Scryfall oracle cards into the database.
 * Uses the oracle_id as the card primary key (one row per unique card, not per printing).
 * Inserts in batched transactions for performance.
 */
export function ingestCards(db: Database.Database, cards: ScryfallCard[]): {
  cardsInserted: number;
  facesInserted: number;
  legalitiesInserted: number;
} {
  const insertCard = db.prepare(`
    INSERT OR REPLACE INTO cards
    (id, name, mana_cost, cmc, type_line, oracle_text, power, toughness,
     loyalty, colors, color_identity, keywords, rarity, set_code, set_name,
     released_at, image_uri, scryfall_uri, edhrec_rank, artist)
    VALUES
    (@id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @power, @toughness,
     @loyalty, @colors, @color_identity, @keywords, @rarity, @set_code, @set_name,
     @released_at, @image_uri, @scryfall_uri, @edhrec_rank, @artist)
  `);

  const insertFace = db.prepare(`
    INSERT INTO card_faces
    (card_id, face_index, name, mana_cost, type_line, oracle_text, power, toughness, colors)
    VALUES
    (@card_id, @face_index, @name, @mana_cost, @type_line, @oracle_text, @power, @toughness, @colors)
  `);

  const insertLegality = db.prepare(`
    INSERT OR REPLACE INTO legalities (card_id, format, status)
    VALUES (@card_id, @format, @status)
  `);

  let cardsInserted = 0;
  let facesInserted = 0;
  let legalitiesInserted = 0;

  // Process in batches inside transactions
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    const txn = db.transaction(() => {
      for (const card of batch) {
        const cardId = card.oracle_id ?? card.id;

        // For multi-face cards, store top-level info from the first face if missing
        const imageUri = card.image_uris?.normal
          ?? card.card_faces?.[0]?.image_uris?.normal
          ?? null;

        insertCard.run({
          id: cardId,
          name: card.name,
          mana_cost: card.mana_cost ?? null,
          cmc: card.cmc ?? null,
          type_line: card.type_line ?? null,
          oracle_text: card.oracle_text ?? null,
          power: card.power ?? null,
          toughness: card.toughness ?? null,
          loyalty: card.loyalty ?? null,
          colors: card.colors ? JSON.stringify(card.colors) : null,
          color_identity: card.color_identity ? JSON.stringify(card.color_identity) : null,
          keywords: card.keywords ? JSON.stringify(card.keywords) : null,
          rarity: card.rarity ?? null,
          set_code: card.set ?? null,
          set_name: card.set_name ?? null,
          released_at: card.released_at ?? null,
          image_uri: imageUri,
          scryfall_uri: card.scryfall_uri ?? null,
          edhrec_rank: card.edhrec_rank ?? null,
          artist: card.artist ?? null,
        });
        cardsInserted++;

        // Multi-face cards: store each face
        if (isMultiFace(card) && card.card_faces) {
          for (let fi = 0; fi < card.card_faces.length; fi++) {
            const face = card.card_faces[fi];
            insertFace.run({
              card_id: cardId,
              face_index: fi,
              name: face.name,
              mana_cost: face.mana_cost ?? null,
              type_line: face.type_line ?? null,
              oracle_text: face.oracle_text ?? null,
              power: face.power ?? null,
              toughness: face.toughness ?? null,
              colors: face.colors ? JSON.stringify(face.colors) : null,
            });
            facesInserted++;
          }
        }

        // Legalities
        if (card.legalities) {
          for (const [format, status] of Object.entries(card.legalities)) {
            insertLegality.run({ card_id: cardId, format, status });
            legalitiesInserted++;
          }
        }
      }
    });
    txn();
  }

  console.error(`[scryfall] Ingested ${cardsInserted} cards, ${facesInserted} faces, ${legalitiesInserted} legality rows`);
  return { cardsInserted, facesInserted, legalitiesInserted };
}

/**
 * Ingest an array of Scryfall rulings into the database.
 */
export function ingestRulings(db: Database.Database, rulings: ScryfallRuling[]): number {
  const insert = db.prepare(`
    INSERT INTO rulings (card_id, source, published_at, comment)
    VALUES (@card_id, @source, @published_at, @comment)
  `);

  let count = 0;
  for (let i = 0; i < rulings.length; i += BATCH_SIZE) {
    const batch = rulings.slice(i, i + BATCH_SIZE);
    const txn = db.transaction(() => {
      for (const ruling of batch) {
        insert.run({
          card_id: ruling.oracle_id,
          source: ruling.source,
          published_at: ruling.published_at,
          comment: ruling.comment,
        });
        count++;
      }
    });
    txn();
  }

  console.error(`[scryfall] Ingested ${count} rulings`);
  return count;
}

/**
 * Full Scryfall pipeline: fetch metadata, download oracle_cards + rulings, ingest both.
 * Returns true if data was updated, false if already up-to-date.
 */
export async function runScryfallPipeline(
  db: Database.Database,
  lastUpdated: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<{ updated: boolean; updatedAt: string }> {
  // 1. Fetch metadata
  const entries = await fetchBulkDataMetadata(fetchFn);

  const oracleEntry = findBulkEntry(entries, 'oracle_cards');
  if (!oracleEntry) {
    throw new Error('Could not find oracle_cards in Scryfall bulk-data listing');
  }

  // 2. Check if update needed
  if (lastUpdated && oracleEntry.updated_at <= lastUpdated) {
    console.error('[scryfall] Data is up-to-date, skipping download');
    return { updated: false, updatedAt: lastUpdated };
  }

  // 3. Clear existing data before re-ingesting
  db.exec('DELETE FROM rulings');
  db.exec('DELETE FROM legalities');
  db.exec('DELETE FROM card_faces');
  db.exec('DELETE FROM cards');

  // 4. Download and ingest oracle cards
  const cards = await downloadBulkFile<ScryfallCard[]>(
    oracleEntry.download_uri, 'oracle_cards', fetchFn,
  );
  ingestCards(db, cards);

  // 5. Download and ingest rulings
  const rulingsEntry = findBulkEntry(entries, 'rulings');
  if (rulingsEntry) {
    const rulings = await downloadBulkFile<ScryfallRuling[]>(
      rulingsEntry.download_uri, 'rulings', fetchFn,
    );
    ingestRulings(db, rulings);
  } else {
    console.error('[scryfall] No rulings bulk data found, skipping');
  }

  return { updated: true, updatedAt: oracleEntry.updated_at };
}
