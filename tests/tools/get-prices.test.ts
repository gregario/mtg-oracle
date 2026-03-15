import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard,
  type CardRow,
} from '../../src/data/db.js';
import { handler, GetPricesInput } from '../../src/tools/get-prices.js';
import { formatGetPrices } from '../../src/format.js';

// --- Test fixtures ---

function makeBolt(): CardRow {
  return {
    id: 'bolt-001', name: 'Lightning Bolt', mana_cost: '{R}', cmc: 1,
    type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    power: null, toughness: null, loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 5, artist: 'Christopher Rush',
    price_usd: 1.23, price_usd_foil: 4.56, price_eur: 1.10, price_eur_foil: 3.50, price_tix: 0.5,
  };
}

function makeSolRing(): CardRow {
  return {
    id: 'sol-ring-001', name: 'Sol Ring', mana_cost: '{1}', cmc: 1,
    type_line: 'Artifact', oracle_text: '{T}: Add {C}{C}.',
    power: null, toughness: null, loyalty: null, colors: '[]',
    color_identity: '[]', keywords: '[]', rarity: 'uncommon',
    set_code: 'c21', set_name: 'Commander 2021', released_at: '2021-04-23',
    image_uri: null, scryfall_uri: null, edhrec_rank: 1, artist: 'Mike Bierek',
    price_usd: 0.99, price_usd_foil: null, price_eur: 0.85, price_eur_foil: null, price_tix: null,
  };
}

function makeForest(): CardRow {
  return {
    id: 'forest-001', name: 'Forest', mana_cost: null, cmc: 0,
    type_line: 'Basic Land — Forest', oracle_text: '({T}: Add {G}.)',
    power: null, toughness: null, loyalty: null, colors: '[]',
    color_identity: '["G"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: null,
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeSolRing());
  insertCard(db, makeForest());
}

// --- Tests ---

describe('get_prices tool', () => {
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
      expect(GetPricesInput.safeParse({ names: ['Lightning Bolt'] }).success).toBe(true);
    });

    it('accepts array of multiple names', () => {
      expect(GetPricesInput.safeParse({ names: ['Lightning Bolt', 'Sol Ring'] }).success).toBe(true);
    });

    it('rejects empty array', () => {
      expect(GetPricesInput.safeParse({ names: [] }).success).toBe(false);
    });

    it('rejects missing names', () => {
      expect(GetPricesInput.safeParse({}).success).toBe(false);
    });
  });

  describe('single card lookup', () => {
    it('returns prices for a card with all prices', () => {
      const result = handler(db, { names: ['Lightning Bolt'] });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[0].name).toBe('Lightning Bolt');
      expect(result.cards[0].price_usd).toBe(1.23);
      expect(result.cards[0].price_usd_foil).toBe(4.56);
      expect(result.cards[0].price_eur).toBe(1.10);
      expect(result.cards[0].price_eur_foil).toBe(3.50);
      expect(result.cards[0].price_tix).toBe(0.5);
    });

    it('returns partial prices when some are null', () => {
      const result = handler(db, { names: ['Sol Ring'] });
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[0].price_usd).toBe(0.99);
      expect(result.cards[0].price_usd_foil).toBeNull();
      expect(result.cards[0].price_tix).toBeNull();
    });

    it('returns all null prices for card with no price data', () => {
      const result = handler(db, { names: ['Forest'] });
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[0].price_usd).toBeNull();
      expect(result.cards[0].price_usd_foil).toBeNull();
      expect(result.cards[0].price_eur).toBeNull();
      expect(result.cards[0].price_eur_foil).toBeNull();
      expect(result.cards[0].price_tix).toBeNull();
    });
  });

  describe('batch lookup', () => {
    it('returns prices for multiple cards', () => {
      const result = handler(db, { names: ['Lightning Bolt', 'Sol Ring'] });
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].name).toBe('Lightning Bolt');
      expect(result.cards[1].name).toBe('Sol Ring');
    });

    it('handles mix of found and not-found cards', () => {
      const result = handler(db, { names: ['Lightning Bolt', 'Nonexistent Card', 'Sol Ring'] });
      expect(result.cards).toHaveLength(3);
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[1].found).toBe(false);
      expect(result.cards[1].name).toBe('Nonexistent Card');
      expect(result.cards[2].found).toBe(true);
    });
  });

  describe('card not found', () => {
    it('returns found: false for missing card', () => {
      const result = handler(db, { names: ['Nonexistent Card'] });
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].found).toBe(false);
      expect(result.cards[0].name).toBe('Nonexistent Card');
      expect(result.cards[0].price_usd).toBeNull();
    });
  });

  describe('fuzzy matching', () => {
    it('finds card via case-insensitive match', () => {
      const result = handler(db, { names: ['lightning bolt'] });
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });

    it('finds card via partial name', () => {
      const result = handler(db, { names: ['Bolt'] });
      expect(result.cards[0].found).toBe(true);
      expect(result.cards[0].name).toBe('Lightning Bolt');
    });
  });
});

// --- Formatter tests ---

describe('formatGetPrices', () => {
  it('formats prices for found cards', () => {
    const text = formatGetPrices({
      cards: [
        { name: 'Lightning Bolt', found: true, price_usd: 1.23, price_usd_foil: 4.56, price_eur: 1.10, price_eur_foil: null, price_tix: 0.5 },
      ],
    });
    expect(text).toContain('# Card Prices');
    expect(text).toContain('**Lightning Bolt**');
    expect(text).toContain('USD: $1.23');
    expect(text).toContain('USD Foil: $4.56');
    expect(text).toContain('EUR: €1.10');
    expect(text).toContain('MTGO: 0.5 tix');
    expect(text).not.toContain('EUR Foil');
  });

  it('formats not-found card', () => {
    const text = formatGetPrices({
      cards: [
        { name: 'Nonexistent', found: false, price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null },
      ],
    });
    expect(text).toContain('**Nonexistent**: Not found');
  });

  it('formats card with no price data', () => {
    const text = formatGetPrices({
      cards: [
        { name: 'Forest', found: true, price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null },
      ],
    });
    expect(text).toContain('**Forest**: No price data available');
  });

  it('formats multiple cards', () => {
    const text = formatGetPrices({
      cards: [
        { name: 'Lightning Bolt', found: true, price_usd: 1.23, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null },
        { name: 'Sol Ring', found: true, price_usd: 0.99, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null },
      ],
    });
    expect(text).toContain('**Lightning Bolt**: USD: $1.23');
    expect(text).toContain('**Sol Ring**: USD: $0.99');
  });
});
