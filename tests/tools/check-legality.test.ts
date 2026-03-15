import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard, insertLegality,
  type CardRow, type LegalityRow,
} from '../../src/data/db.js';
import { handler, CheckLegalityInput } from '../../src/tools/check-legality.js';

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

function makeSwords(): CardRow {
  return {
    id: 'stp-001', name: 'Swords to Plowshares', mana_cost: '{W}', cmc: 1,
    type_line: 'Instant', oracle_text: 'Exile target creature.',
    power: null, toughness: null, loyalty: null, colors: '["W"]',
    color_identity: '["W"]', keywords: '[]', rarity: 'uncommon',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 3, artist: 'Jeff A. Menges',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeSwords());

  const legalities: LegalityRow[] = [
    { card_id: 'bolt-001', format: 'modern', status: 'legal' },
    { card_id: 'bolt-001', format: 'legacy', status: 'legal' },
    { card_id: 'bolt-001', format: 'standard', status: 'not_legal' },
    { card_id: 'bolt-001', format: 'commander', status: 'legal' },
    { card_id: 'stp-001', format: 'legacy', status: 'legal' },
    { card_id: 'stp-001', format: 'commander', status: 'legal' },
    { card_id: 'stp-001', format: 'modern', status: 'not_legal' },
  ];
  for (const l of legalities) insertLegality(db, l);
}

// --- Tests ---

describe('check_legality tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedTestData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts single card string', () => {
      expect(CheckLegalityInput.safeParse({ cards: 'Lightning Bolt' }).success).toBe(true);
    });

    it('accepts card array', () => {
      expect(CheckLegalityInput.safeParse({ cards: ['Lightning Bolt', 'Swords to Plowshares'] }).success).toBe(true);
    });

    it('accepts with format', () => {
      expect(CheckLegalityInput.safeParse({ cards: 'Lightning Bolt', format: 'modern' }).success).toBe(true);
    });

    it('rejects missing cards', () => {
      expect(CheckLegalityInput.safeParse({}).success).toBe(false);
    });

    it('rejects arrays over 50', () => {
      const cards = Array.from({ length: 51 }, (_, i) => `Card ${i}`);
      expect(CheckLegalityInput.safeParse({ cards }).success).toBe(false);
    });
  });

  describe('single card, all formats', () => {
    it('returns all legalities for a card', () => {
      const result = handler(db, { cards: 'Lightning Bolt' });
      expect(result.format).toBeNull();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].found).toBe(true);
      expect(result.results[0].card_name).toBe('Lightning Bolt');
      expect(result.results[0].legalities).toEqual({
        modern: 'legal',
        legacy: 'legal',
        standard: 'not_legal',
        commander: 'legal',
      });
    });
  });

  describe('single card, specific format', () => {
    it('returns legality for specified format', () => {
      const result = handler(db, { cards: 'Lightning Bolt', format: 'modern' });
      expect(result.format).toBe('modern');
      expect(result.results[0].legalities).toEqual({ modern: 'legal' });
    });

    it('returns empty legalities if card not legal in format', () => {
      const result = handler(db, { cards: 'Swords to Plowshares', format: 'standard' });
      expect(result.results[0].legalities).toEqual({});
    });
  });

  describe('format aliases', () => {
    it('resolves edh to commander', () => {
      const result = handler(db, { cards: 'Lightning Bolt', format: 'edh' });
      expect(result.format).toBe('commander');
      expect(result.results[0].legalities).toEqual({ commander: 'legal' });
    });

    it('resolves cmd to commander', () => {
      const result = handler(db, { cards: 'Lightning Bolt', format: 'cmd' });
      expect(result.format).toBe('commander');
      expect(result.results[0].legalities).toEqual({ commander: 'legal' });
    });
  });

  describe('batch cards', () => {
    it('returns results for multiple cards', () => {
      const result = handler(db, { cards: ['Lightning Bolt', 'Swords to Plowshares'] });
      expect(result.results).toHaveLength(2);
      expect(result.results[0].card_name).toBe('Lightning Bolt');
      expect(result.results[1].card_name).toBe('Swords to Plowshares');
    });

    it('handles mix of found and not-found cards', () => {
      const result = handler(db, { cards: ['Lightning Bolt', 'Fake Card'] });
      expect(result.results).toHaveLength(2);
      expect(result.results[0].found).toBe(true);
      expect(result.results[1].found).toBe(false);
      expect(result.results[1].message).toContain('Fake Card');
    });
  });

  describe('edge cases', () => {
    it('handles card not found gracefully', () => {
      const result = handler(db, { cards: 'Nonexistent Card' });
      expect(result.results[0].found).toBe(false);
      expect(result.results[0].legalities).toEqual({});
    });

    it('is case-insensitive for card lookup', () => {
      const result = handler(db, { cards: 'lightning bolt' });
      expect(result.results[0].found).toBe(true);
      expect(result.results[0].card_name).toBe('Lightning Bolt');
    });
  });
});
