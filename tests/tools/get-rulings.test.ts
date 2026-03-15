import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard, insertRuling,
  type CardRow, type RulingRow,
} from '../../src/data/db.js';
import { handler, GetRulingsInput } from '../../src/tools/get-rulings.js';

// --- Test fixtures ---

function makeBolt(): CardRow {
  return {
    id: 'bolt-001', name: 'Lightning Bolt', mana_cost: '{R}', cmc: 1,
    type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    power: null, toughness: null, loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 5, artist: 'Christopher Rush',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeGoyf(): CardRow {
  return {
    id: 'goyf-001', name: 'Tarmogoyf', mana_cost: '{1}{G}', cmc: 2,
    type_line: 'Creature — Lhurgoyf', oracle_text: "Tarmogoyf's power...",
    power: '*', toughness: '1+*', loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '[]', rarity: 'mythic',
    set_code: 'fut', set_name: 'Future Sight', released_at: '2007-05-04',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: 'Ryan Barger',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeGoyf());

  const rulings: RulingRow[] = [
    { card_id: 'bolt-001', source: 'wotc', published_at: '2023-01-01', comment: 'Can target any target.' },
    { card_id: 'bolt-001', source: 'wotc', published_at: '2023-06-01', comment: 'Includes planeswalkers.' },
    { card_id: 'bolt-001', source: 'scryfall', published_at: '2024-01-15', comment: 'This is a very efficient burn spell.' },
  ];
  for (const r of rulings) insertRuling(db, r);
  // Goyf gets no rulings
}

// --- Tests ---

describe('get_rulings tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedTestData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts valid input', () => {
      expect(GetRulingsInput.safeParse({ card_name: 'Lightning Bolt' }).success).toBe(true);
    });

    it('rejects missing card_name', () => {
      expect(GetRulingsInput.safeParse({}).success).toBe(false);
    });
  });

  describe('card lookup', () => {
    it('finds rulings by exact name', () => {
      const result = handler(db, { card_name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card_name).toBe('Lightning Bolt');
        expect(result.rulings).toHaveLength(3);
      }
    });

    it('is case-insensitive', () => {
      const result = handler(db, { card_name: 'lightning bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card_name).toBe('Lightning Bolt');
      }
    });

    it('falls back to LIKE match', () => {
      const result = handler(db, { card_name: 'Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card_name).toBe('Lightning Bolt');
      }
    });
  });

  describe('ruling details', () => {
    it('returns source, date, and comment for each ruling', () => {
      const result = handler(db, { card_name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        const ruling = result.rulings[0];
        expect(ruling.source).toBe('wotc');
        expect(ruling.published_at).toBe('2023-01-01');
        expect(ruling.comment).toBe('Can target any target.');
      }
    });

    it('orders rulings by published_at', () => {
      const result = handler(db, { card_name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rulings[0].published_at).toBe('2023-01-01');
        expect(result.rulings[1].published_at).toBe('2023-06-01');
        expect(result.rulings[2].published_at).toBe('2024-01-15');
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty rulings array for card with no rulings', () => {
      const result = handler(db, { card_name: 'Tarmogoyf' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rulings).toHaveLength(0);
      }
    });

    it('returns not found for nonexistent card', () => {
      const result = handler(db, { card_name: 'Totally Fake Card' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('Totally Fake Card');
      }
    });
  });
});
