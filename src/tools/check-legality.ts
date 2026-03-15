import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow, LegalityRow } from '../data/db.js';

// --- Input schema ---

export const CheckLegalityInput = z.object({
  cards: z.union([z.string(), z.array(z.string()).max(50)]).describe('Card name or array of card names (max 50)'),
  format: z.string().optional().describe('Specific format to check (e.g., "commander", "modern"). Omit for all formats.'),
});

export type CheckLegalityParams = z.infer<typeof CheckLegalityInput>;

// --- Format aliases ---

const FORMAT_ALIASES: Record<string, string> = {
  edh: 'commander',
  cmd: 'commander',
  cdh: 'duel',
};

function resolveFormat(format: string): string {
  return FORMAT_ALIASES[format.toLowerCase()] ?? format.toLowerCase();
}

// --- Output types ---

export interface CardLegality {
  card_name: string;
  found: boolean;
  legalities: Record<string, string>;
  message?: string;
}

export interface CheckLegalityResult {
  format: string | null;
  results: CardLegality[];
}

// --- Handler ---

export function handler(db: Database.Database, params: CheckLegalityParams): CheckLegalityResult {
  const cardNames = Array.isArray(params.cards) ? params.cards : [params.cards];
  const resolvedFormat = params.format ? resolveFormat(params.format) : null;

  const results: CardLegality[] = [];

  for (const name of cardNames) {
    // Case-insensitive exact match, then LIKE fallback
    let card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
    ).get(name) as CardRow | undefined;

    if (!card) {
      card = db.prepare(
        'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
      ).get(`%${name}%`) as CardRow | undefined;
    }

    if (!card) {
      results.push({
        card_name: name,
        found: false,
        legalities: {},
        message: `Card not found: "${name}"`,
      });
      continue;
    }

    let rows: LegalityRow[];
    if (resolvedFormat) {
      rows = db.prepare(
        'SELECT * FROM legalities WHERE card_id = ? AND format = ?'
      ).all(card.id, resolvedFormat) as LegalityRow[];
    } else {
      rows = db.prepare(
        'SELECT * FROM legalities WHERE card_id = ?'
      ).all(card.id) as LegalityRow[];
    }

    const legalities: Record<string, string> = {};
    for (const row of rows) {
      legalities[row.format] = row.status;
    }

    results.push({
      card_name: card.name,
      found: true,
      legalities,
    });
  }

  return {
    format: resolvedFormat,
    results,
  };
}
