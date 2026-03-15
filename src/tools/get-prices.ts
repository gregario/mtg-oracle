import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow } from '../data/db.js';

// --- Input schema ---

export const GetPricesInput = z.object({
  names: z.array(z.string()).min(1).max(50).describe('Card names to look up prices for (1-50)'),
});

export type GetPricesParams = z.infer<typeof GetPricesInput>;

// --- Output types ---

export interface CardPriceEntry {
  name: string;
  found: boolean;
  price_usd: number | null;
  price_usd_foil: number | null;
  price_eur: number | null;
  price_eur_foil: number | null;
  price_tix: number | null;
}

export interface GetPricesResult {
  cards: CardPriceEntry[];
}

// --- Handler ---

export function handler(db: Database.Database, params: GetPricesParams): GetPricesResult {
  const cards: CardPriceEntry[] = [];

  for (const name of params.names) {
    // 1. Exact match (case-insensitive)
    let card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
    ).get(name) as CardRow | undefined;

    // 2. Fuzzy fallback via LIKE
    if (!card) {
      card = db.prepare(
        'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
      ).get(`%${name}%`) as CardRow | undefined;
    }

    if (!card) {
      cards.push({
        name,
        found: false,
        price_usd: null,
        price_usd_foil: null,
        price_eur: null,
        price_eur_foil: null,
        price_tix: null,
      });
    } else {
      cards.push({
        name: card.name,
        found: true,
        price_usd: card.price_usd,
        price_usd_foil: card.price_usd_foil,
        price_eur: card.price_eur,
        price_eur_foil: card.price_eur_foil,
        price_tix: card.price_tix,
      });
    }
  }

  return { cards };
}
