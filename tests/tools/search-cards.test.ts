import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertCard, insertLegality, type CardRow, type LegalityRow } from '../../src/data/db.js';
import { handler, SearchCardsInput } from '../../src/tools/search-cards.js';

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
    type_line: 'Creature — Lhurgoyf', oracle_text: "Tarmogoyf's power is equal to the number of card types among cards in all graveyards.",
    power: '*', toughness: '1+*', loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '[]', rarity: 'mythic',
    set_code: 'fut', set_name: 'Future Sight', released_at: '2007-05-04',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: 'Ryan Barger',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeSwords(): CardRow {
  return {
    id: 'stp-001', name: 'Swords to Plowshares', mana_cost: '{W}', cmc: 1,
    type_line: 'Instant', oracle_text: 'Exile target creature. Its controller gains life equal to its power.',
    power: null, toughness: null, loyalty: null, colors: '["W"]',
    color_identity: '["W"]', keywords: '[]', rarity: 'uncommon',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 3, artist: 'Jeff A. Menges',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeOmnath(): CardRow {
  return {
    id: 'omnath-001', name: 'Omnath, Locus of Creation', mana_cost: '{R}{G}{W}{U}', cmc: 4,
    type_line: 'Legendary Creature — Elemental', oracle_text: "Landfall — Whenever a land enters the battlefield under your control, do stuff.\nWhen Omnath dies, draw a card.",
    power: '4', toughness: '4', loyalty: null, colors: '["R","G","W","U"]',
    color_identity: '["R","G","W","U"]', keywords: '["Landfall"]', rarity: 'mythic',
    set_code: 'znr', set_name: 'Zendikar Rising', released_at: '2020-09-25',
    image_uri: null, scryfall_uri: null, edhrec_rank: 100, artist: 'Chris Rahn',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedAll(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeGoyf());
  insertCard(db, makeSwords());
  insertCard(db, makeOmnath());

  // Legalities
  const legalities: LegalityRow[] = [
    { card_id: 'bolt-001', format: 'modern', status: 'legal' },
    { card_id: 'bolt-001', format: 'standard', status: 'not_legal' },
    { card_id: 'bolt-001', format: 'commander', status: 'legal' },
    { card_id: 'goyf-001', format: 'modern', status: 'legal' },
    { card_id: 'goyf-001', format: 'standard', status: 'not_legal' },
    { card_id: 'stp-001', format: 'legacy', status: 'legal' },
    { card_id: 'stp-001', format: 'commander', status: 'legal' },
    { card_id: 'stp-001', format: 'modern', status: 'not_legal' },
    { card_id: 'omnath-001', format: 'commander', status: 'legal' },
    { card_id: 'omnath-001', format: 'modern', status: 'legal' },
  ];
  for (const l of legalities) {
    insertLegality(db, l);
  }
}

// --- Tests ---

describe('search_cards tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedAll(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts valid input', () => {
      const result = SearchCardsInput.safeParse({ query: 'Lightning' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (all optional)', () => {
      const result = SearchCardsInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects limit above 50', () => {
      const result = SearchCardsInput.safeParse({ limit: 100 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid cmcOp', () => {
      const result = SearchCardsInput.safeParse({ cmc: 3, cmcOp: 'neq' });
      expect(result.success).toBe(false);
    });
  });

  describe('FTS5 text search', () => {
    it('finds cards by name', () => {
      const result = handler(db, { query: 'Lightning' });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });

    it('finds cards by oracle text', () => {
      const result = handler(db, { query: 'damage' });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });

    it('finds cards by type line', () => {
      const result = handler(db, { query: 'Lhurgoyf' });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Tarmogoyf');
    });

    it('returns empty array for no matches', () => {
      const result = handler(db, { query: 'Planeswalker' });
      expect(result.cards).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('structured filters', () => {
    it('filters by name (LIKE)', () => {
      const result = handler(db, { name: 'Bolt' });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });

    it('filters by type', () => {
      const result = handler(db, { type: 'Instant' });
      expect(result.cards).toHaveLength(2); // Bolt + Swords
    });

    it('filters by colors', () => {
      const result = handler(db, { colors: ['R'] });
      expect(result.cards.length).toBeGreaterThanOrEqual(1);
      expect(result.cards.every(c => c.colors.includes('R'))).toBe(true);
    });

    it('filters by multiple colors', () => {
      const result = handler(db, { colors: ['R', 'G'] });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Omnath, Locus of Creation');
    });

    it('filters by cmc (eq)', () => {
      const result = handler(db, { cmc: 1 });
      expect(result.cards).toHaveLength(2); // Bolt + Swords
    });

    it('filters by cmc (lte)', () => {
      const result = handler(db, { cmc: 2, cmcOp: 'lte' });
      expect(result.cards).toHaveLength(3); // Bolt + Swords + Goyf
    });

    it('filters by cmc (gt)', () => {
      const result = handler(db, { cmc: 2, cmcOp: 'gt' });
      expect(result.cards).toHaveLength(1); // Omnath
    });

    it('filters by rarity', () => {
      const result = handler(db, { rarity: 'mythic' });
      expect(result.cards).toHaveLength(2); // Goyf + Omnath
    });

    it('filters by set', () => {
      const result = handler(db, { set: 'lea' });
      expect(result.cards).toHaveLength(2); // Bolt + Swords
    });

    it('filters by keyword', () => {
      const result = handler(db, { keyword: 'Landfall' });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Omnath, Locus of Creation');
    });
  });

  describe('format filter', () => {
    it('filters by format legality', () => {
      const result = handler(db, { format: 'modern' });
      expect(result.cards.length).toBeGreaterThanOrEqual(2);
      const names = result.cards.map(c => c.name);
      expect(names).toContain('Lightning Bolt');
      expect(names).toContain('Tarmogoyf');
      expect(names).not.toContain('Swords to Plowshares');
    });

    it('combines format with other filters', () => {
      const result = handler(db, { format: 'commander', type: 'Instant' });
      expect(result.cards).toHaveLength(2); // Bolt + Swords
    });
  });

  describe('combined filters with FTS', () => {
    it('combines FTS query with color filter', () => {
      const result = handler(db, { query: 'damage', colors: ['R'] });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });
  });

  describe('limit and result format', () => {
    it('defaults to limit 25', () => {
      // With only 4 cards, all should be returned
      const result = handler(db, {});
      expect(result.cards.length).toBeLessThanOrEqual(25);
    });

    it('respects custom limit', () => {
      const result = handler(db, { limit: 2 });
      expect(result.cards).toHaveLength(2);
    });

    it('returns oracle_text_preview as first line only', () => {
      const result = handler(db, { name: 'Omnath' });
      expect(result.cards[0].oracle_text_preview).not.toContain('\n');
      expect(result.cards[0].oracle_text_preview).toContain('Landfall');
    });

    it('returns parsed colors array', () => {
      const result = handler(db, { name: 'Bolt' });
      expect(result.cards[0].colors).toEqual(['R']);
    });
  });
});
