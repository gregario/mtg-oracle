import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow, RulingRow } from '../data/db.js';

// --- Input schema ---

export const GetRulingsInput = z.object({
  card_name: z.string().describe('Name of the card to get rulings for'),
});

export type GetRulingsParams = z.infer<typeof GetRulingsInput>;

// --- Output types ---

export interface RulingEntry {
  source: string | null;
  published_at: string | null;
  comment: string;
}

export type GetRulingsResult = {
  found: true;
  card_name: string;
  rulings: RulingEntry[];
} | {
  found: false;
  message: string;
};

// --- Handler ---

export function handler(db: Database.Database, params: GetRulingsParams): GetRulingsResult {
  // Look up card by name (case-insensitive exact match first, then LIKE)
  let card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
  ).get(params.card_name) as CardRow | undefined;

  if (!card) {
    card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
    ).get(`%${params.card_name}%`) as CardRow | undefined;
  }

  if (!card) {
    return {
      found: false,
      message: `No card found matching "${params.card_name}"`,
    };
  }

  const rows = db.prepare(
    'SELECT * FROM rulings WHERE card_id = ? ORDER BY published_at'
  ).all(card.id) as RulingRow[];

  return {
    found: true,
    card_name: card.name,
    rulings: rows.map(r => ({
      source: r.source,
      published_at: r.published_at,
      comment: r.comment,
    })),
  };
}
