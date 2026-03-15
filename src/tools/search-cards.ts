import { z } from 'zod';
import type Database from 'better-sqlite3';

// --- Input schema ---

export const SearchCardsInput = z.object({
  query: z.string().optional().describe('Free-text search (FTS5) across name, type_line, oracle_text'),
  name: z.string().optional().describe('Filter by card name (LIKE match)'),
  type: z.string().optional().describe('Filter by type_line (LIKE match)'),
  colors: z.array(z.string()).optional().describe('Filter by colors (JSON array contains all specified)'),
  cmc: z.number().optional().describe('Filter by converted mana cost'),
  cmcOp: z.enum(['eq', 'lt', 'lte', 'gt', 'gte']).optional().describe('CMC comparison operator (default: eq)'),
  rarity: z.string().optional().describe('Filter by rarity (common, uncommon, rare, mythic)'),
  set: z.string().optional().describe('Filter by set code'),
  format: z.string().optional().describe('Filter by format legality (legal status)'),
  keyword: z.string().optional().describe('Filter by keyword in keywords JSON array'),
  limit: z.number().min(1).max(50).optional().describe('Max results (default 25, max 50)'),
});

export type SearchCardsParams = z.infer<typeof SearchCardsInput>;

// --- Output types ---

export interface CardSummary {
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text_preview: string | null;
  colors: string[];
}

export interface SearchCardsResult {
  cards: CardSummary[];
  total: number;
}

// --- Handler ---

export function handler(db: Database.Database, params: SearchCardsParams): SearchCardsResult {
  const limit = params.limit ?? 25;
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  const joins: string[] = [];

  // Determine base query source
  let usesFts = false;
  if (params.query) {
    usesFts = true;
  }

  // Build WHERE clauses for structured filters
  if (params.name) {
    conditions.push('c.name LIKE ?');
    bindings.push(`%${params.name}%`);
  }

  if (params.type) {
    conditions.push('c.type_line LIKE ?');
    bindings.push(`%${params.type}%`);
  }

  if (params.colors && params.colors.length > 0) {
    // Each color must be present in the JSON array
    for (const color of params.colors) {
      conditions.push("c.colors LIKE ?");
      bindings.push(`%"${color}"%`);
    }
  }

  if (params.cmc !== undefined) {
    const op = params.cmcOp ?? 'eq';
    const sqlOp = op === 'eq' ? '=' : op === 'lt' ? '<' : op === 'lte' ? '<=' : op === 'gt' ? '>' : '>=';
    conditions.push(`c.cmc ${sqlOp} ?`);
    bindings.push(params.cmc);
  }

  if (params.rarity) {
    conditions.push('c.rarity = ?');
    bindings.push(params.rarity);
  }

  if (params.set) {
    conditions.push('c.set_code = ?');
    bindings.push(params.set);
  }

  if (params.format) {
    joins.push('JOIN legalities l ON l.card_id = c.id');
    conditions.push("l.format = ? AND l.status = 'legal'");
    bindings.push(params.format);
  }

  if (params.keyword) {
    conditions.push("c.keywords LIKE ?");
    bindings.push(`%"${params.keyword}"%`);
  }

  let sql: string;
  const allBindings: unknown[] = [];

  if (usesFts) {
    // FTS5 query joined with cards table for structured filters
    sql = `SELECT c.name, c.mana_cost, c.type_line, c.oracle_text, c.colors
           FROM cards_fts fts
           JOIN cards c ON c.rowid = fts.rowid
           ${joins.join(' ')}
           WHERE cards_fts MATCH ?`;
    allBindings.push(params.query!);
    for (const cond of conditions) {
      sql += ` AND ${cond}`;
    }
    allBindings.push(...bindings);
    sql += ' ORDER BY fts.rank LIMIT ?';
  } else {
    sql = `SELECT c.name, c.mana_cost, c.type_line, c.oracle_text, c.colors
           FROM cards c
           ${joins.join(' ')}`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      allBindings.push(...bindings);
    }
    sql += ' ORDER BY c.name LIMIT ?';
  }
  allBindings.push(limit);

  const rows = db.prepare(sql).all(...allBindings) as Array<{
    name: string;
    mana_cost: string | null;
    type_line: string | null;
    oracle_text: string | null;
    colors: string | null;
  }>;

  const cards: CardSummary[] = rows.map(row => ({
    name: row.name,
    mana_cost: row.mana_cost,
    type_line: row.type_line,
    oracle_text_preview: row.oracle_text ? row.oracle_text.split('\n')[0] : null,
    colors: row.colors ? JSON.parse(row.colors) as string[] : [],
  }));

  return { cards, total: cards.length };
}
