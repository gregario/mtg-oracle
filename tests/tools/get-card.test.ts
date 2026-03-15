import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard, insertCardFace, insertLegality, insertRuling,
  type CardRow, type CardFaceRow, type LegalityRow, type RulingRow,
} from '../../src/data/db.js';
import { handler, GetCardInput } from '../../src/tools/get-card.js';

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

function makeDelver(): CardRow {
  return {
    id: 'delver-001', name: 'Delver of Secrets // Insectile Aberration', mana_cost: '{U}', cmc: 1,
    type_line: 'Creature — Human Wizard // Creature — Human Insect',
    oracle_text: 'At the beginning of your upkeep, look at the top card of your library. You may reveal that card. If an instant or sorcery card is revealed this way, transform Delver of Secrets.',
    power: '1', toughness: '1', loyalty: null, colors: '["U"]',
    color_identity: '["U"]', keywords: '["Transform"]', rarity: 'common',
    set_code: 'isd', set_name: 'Innistrad', released_at: '2011-09-30',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: 'Matt Stewart',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeDelver());

  // Legalities for Bolt
  const legalities: LegalityRow[] = [
    { card_id: 'bolt-001', format: 'modern', status: 'legal' },
    { card_id: 'bolt-001', format: 'legacy', status: 'legal' },
    { card_id: 'bolt-001', format: 'standard', status: 'not_legal' },
  ];
  for (const l of legalities) insertLegality(db, l);

  // Rulings for Bolt
  const rulings: RulingRow[] = [
    { card_id: 'bolt-001', source: 'wotc', published_at: '2023-01-01', comment: 'Can target any target.' },
    { card_id: 'bolt-001', source: 'wotc', published_at: '2023-06-01', comment: 'Includes planeswalkers.' },
  ];
  for (const r of rulings) insertRuling(db, r);

  // Faces for Delver
  const frontFace: CardFaceRow = {
    card_id: 'delver-001', face_index: 0, name: 'Delver of Secrets',
    mana_cost: '{U}', type_line: 'Creature — Human Wizard',
    oracle_text: 'At the beginning of your upkeep, look at the top card of your library.',
    power: '1', toughness: '1', colors: '["U"]',
  };
  const backFace: CardFaceRow = {
    card_id: 'delver-001', face_index: 1, name: 'Insectile Aberration',
    mana_cost: null, type_line: 'Creature — Human Insect',
    oracle_text: 'Flying', power: '3', toughness: '2', colors: '["U"]',
  };
  insertCardFace(db, frontFace);
  insertCardFace(db, backFace);
}

// --- Tests ---

describe('get_card tool', () => {
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
      expect(GetCardInput.safeParse({ name: 'Lightning Bolt' }).success).toBe(true);
    });

    it('rejects missing name', () => {
      expect(GetCardInput.safeParse({}).success).toBe(false);
    });
  });

  describe('exact match', () => {
    it('finds card by exact name', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.name).toBe('Lightning Bolt');
        expect(result.card.mana_cost).toBe('{R}');
        expect(result.card.cmc).toBe(1);
      }
    });

    it('is case-insensitive', () => {
      const result = handler(db, { name: 'lightning bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.name).toBe('Lightning Bolt');
      }
    });

    it('returns parsed arrays for colors, color_identity, keywords', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.colors).toEqual(['R']);
        expect(result.card.color_identity).toEqual(['R']);
        expect(result.card.keywords).toEqual([]);
      }
    });
  });

  describe('fuzzy fallback', () => {
    it('finds card via LIKE when exact match fails', () => {
      const result = handler(db, { name: 'Lightning' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.name).toBe('Lightning Bolt');
      }
    });

    it('finds card via partial name', () => {
      const result = handler(db, { name: 'Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.name).toBe('Lightning Bolt');
      }
    });
  });

  describe('not found', () => {
    it('returns found: false when card does not exist', () => {
      const result = handler(db, { name: 'Nonexistent Card' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('Nonexistent Card');
      }
    });

    it('returns not-found with message for partial non-match', () => {
      // "Lightning Strike" won't match because LIKE looks for "%Lightning Strike%"
      const result = handler(db, { name: 'Lightning Strike' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('Lightning Strike');
        // Should return suggestions based on first word "Lightning"
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThanOrEqual(1);
        expect(result.suggestions!).toContain('Lightning Bolt');
      }
    });
  });

  describe('multi-face card handling', () => {
    it('returns all card faces', () => {
      const result = handler(db, { name: 'Delver of Secrets // Insectile Aberration' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.faces).toHaveLength(2);
        expect(result.card.faces[0].name).toBe('Delver of Secrets');
        expect(result.card.faces[0].face_index).toBe(0);
        expect(result.card.faces[1].name).toBe('Insectile Aberration');
        expect(result.card.faces[1].face_index).toBe(1);
        expect(result.card.faces[1].power).toBe('3');
        expect(result.card.faces[1].colors).toEqual(['U']);
      }
    });

    it('returns empty faces array for single-faced cards', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.faces).toHaveLength(0);
      }
    });
  });

  describe('rulings and legalities', () => {
    it('includes rulings', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.rulings).toHaveLength(2);
        expect(result.card.rulings[0].comment).toBe('Can target any target.');
        expect(result.card.rulings[0].source).toBe('wotc');
      }
    });

    it('includes legalities as record', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.legalities).toEqual({
          modern: 'legal',
          legacy: 'legal',
          standard: 'not_legal',
        });
      }
    });

    it('returns empty rulings for card with none', () => {
      const result = handler(db, { name: 'Delver of Secrets // Insectile Aberration' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.card.rulings).toHaveLength(0);
      }
    });
  });
});
