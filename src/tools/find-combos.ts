import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { ComboRow } from '../data/db.js';

// --- Input schema ---

export const FindCombosInput = z.object({
  card_name: z.string().optional().describe('Single card name to search combos for'),
  card_names: z.array(z.string()).optional().describe('Multiple card names to search combos for'),
  color_identity: z.array(z.string()).optional().describe('Filter combos within this color identity (e.g. ["W","U","B"])'),
  limit: z.number().min(1).max(50).optional().describe('Max results (default 20, max 50)'),
});

export type FindCombosParams = z.infer<typeof FindCombosInput>;

// --- Output types ---

export interface ComboResult {
  id: string;
  cards: string[];
  color_identity: string[];
  prerequisites: string | null;
  steps: string | null;
  results: string | null;
  popularity: number | null;
}

export interface FindCombosResult {
  combos: ComboResult[];
  total: number;
}

// --- Helpers ---

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];

/**
 * Check if a combo's color identity fits within the given constraint.
 * A combo fits if all its colors are in the constraint.
 */
function fitsWithinIdentity(comboColors: string[], constraintColors: string[]): boolean {
  return comboColors.every(c => constraintColors.includes(c));
}

// --- Handler ---

export function handler(db: Database.Database, params: FindCombosParams): FindCombosResult {
  const limit = params.limit ?? 20;

  // Collect all card names to search for
  const searchNames: string[] = [];
  if (params.card_name) searchNames.push(params.card_name);
  if (params.card_names) searchNames.push(...params.card_names);

  if (searchNames.length === 0 && !params.color_identity) {
    return { combos: [], total: 0 };
  }

  // Build query
  let sql = 'SELECT * FROM combos';
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  // Card name filter: search in the JSON cards array
  if (searchNames.length > 0) {
    const nameConditions = searchNames.map(() => 'LOWER(cards) LIKE LOWER(?)');
    conditions.push(`(${nameConditions.join(' AND ')})`);
    for (const name of searchNames) {
      bindings.push(`%${name}%`);
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY popularity DESC LIMIT ?';
  // Fetch more than limit if we need to post-filter by color identity
  const fetchLimit = params.color_identity ? limit * 5 : limit;
  bindings.push(fetchLimit);

  const rows = db.prepare(sql).all(...bindings) as ComboRow[];

  // Post-filter by color identity constraint
  let filtered = rows;
  if (params.color_identity) {
    filtered = rows.filter(row => {
      const comboColors: string[] = row.color_identity
        ? JSON.parse(row.color_identity) as string[]
        : [];
      return fitsWithinIdentity(comboColors, params.color_identity!);
    });
  }

  // Apply limit after filtering
  const limited = filtered.slice(0, limit);

  const combos: ComboResult[] = limited.map(row => ({
    id: row.id,
    cards: JSON.parse(row.cards) as string[],
    color_identity: row.color_identity ? JSON.parse(row.color_identity) as string[] : [],
    prerequisites: row.prerequisites,
    steps: row.steps,
    results: row.results,
    popularity: row.popularity,
  }));

  return { combos, total: combos.length };
}
