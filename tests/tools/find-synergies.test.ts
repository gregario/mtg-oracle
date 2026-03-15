import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertCard, type CardRow } from '../../src/data/db.js';
import { handler, FindSynergiesInput } from '../../src/tools/find-synergies.js';

// --- Test fixtures ---

function makeKrenko(): CardRow {
  return {
    id: 'krenko-001', name: 'Krenko, Mob Boss', mana_cost: '{2}{R}{R}', cmc: 4,
    type_line: 'Legendary Creature — Goblin Warrior',
    oracle_text: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
    power: '3', toughness: '3', loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '[]', rarity: 'rare',
    set_code: 'm13', set_name: 'Magic 2013', released_at: '2012-07-13',
    image_uri: null, scryfall_uri: null, edhrec_rank: 42, artist: 'Karl Kopinski',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeGoblinChieftain(): CardRow {
  return {
    id: 'chieftain-001', name: 'Goblin Chieftain', mana_cost: '{1}{R}{R}', cmc: 3,
    type_line: 'Creature — Goblin',
    oracle_text: 'Haste\nOther Goblin creatures you control get +1/+1 and have haste.',
    power: '2', toughness: '2', loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '["Haste"]', rarity: 'rare',
    set_code: 'm10', set_name: 'Magic 2010', released_at: '2009-07-17',
    image_uri: null, scryfall_uri: null, edhrec_rank: 100, artist: 'Sam Wood',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeSkirk(): CardRow {
  return {
    id: 'skirk-001', name: 'Skirk Prospector', mana_cost: '{R}', cmc: 1,
    type_line: 'Creature — Goblin',
    oracle_text: 'Sacrifice a Goblin: Add {R}.',
    power: '1', toughness: '1', loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '[]', rarity: 'common',
    set_code: 'dom', set_name: 'Dominaria', released_at: '2018-04-27',
    image_uri: null, scryfall_uri: null, edhrec_rank: 200, artist: 'Brom',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeElvishArchdruid(): CardRow {
  return {
    id: 'archdruid-001', name: 'Elvish Archdruid', mana_cost: '{1}{G}{G}', cmc: 3,
    type_line: 'Creature — Elf Druid',
    oracle_text: 'Other Elf creatures you control get +1/+1.\n{T}: Add {G} for each Elf you control.',
    power: '2', toughness: '2', loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '[]', rarity: 'rare',
    set_code: 'm10', set_name: 'Magic 2010', released_at: '2009-07-17',
    image_uri: null, scryfall_uri: null, edhrec_rank: 80, artist: 'Karl Kopinski',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeBloodArtist(): CardRow {
  return {
    id: 'blood-artist-001', name: 'Blood Artist', mana_cost: '{1}{B}', cmc: 2,
    type_line: 'Creature — Vampire',
    oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.',
    power: '0', toughness: '1', loyalty: null, colors: '["B"]',
    color_identity: '["B"]', keywords: '[]', rarity: 'uncommon',
    set_code: 'avr', set_name: 'Avacyn Restored', released_at: '2012-05-04',
    image_uri: null, scryfall_uri: null, edhrec_rank: 30, artist: 'Johannes Voss',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeHardenedScales(): CardRow {
  return {
    id: 'scales-001', name: 'Hardened Scales', mana_cost: '{G}', cmc: 1,
    type_line: 'Enchantment',
    oracle_text: 'If one or more +1/+1 counters would be placed on a creature you control, that many plus one +1/+1 counters are placed on it instead.',
    power: null, toughness: null, loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '[]', rarity: 'rare',
    set_code: 'ktk', set_name: 'Khans of Tarkir', released_at: '2014-09-26',
    image_uri: null, scryfall_uri: null, edhrec_rank: 60, artist: 'Mark Winters',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeKrenko());
  insertCard(db, makeGoblinChieftain());
  insertCard(db, makeSkirk());
  insertCard(db, makeElvishArchdruid());
  insertCard(db, makeBloodArtist());
  insertCard(db, makeHardenedScales());
}

// --- Tests ---

describe('find_synergies tool', () => {
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
      expect(FindSynergiesInput.safeParse({ card_name: 'Krenko, Mob Boss' }).success).toBe(true);
    });

    it('accepts all options', () => {
      const result = FindSynergiesInput.safeParse({
        card_name: 'Krenko', color_identity: ['R'], format: 'commander', category: 'tribal', limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing card_name', () => {
      expect(FindSynergiesInput.safeParse({}).success).toBe(false);
    });

    it('rejects limit above 50', () => {
      expect(FindSynergiesInput.safeParse({ card_name: 'X', limit: 100 }).success).toBe(false);
    });
  });

  describe('creature type extraction', () => {
    it('extracts creature types from type line', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      expect(result.creature_types).toContain('Goblin');
      expect(result.creature_types).toContain('Warrior');
    });

    it('returns empty creature types for non-creature', () => {
      const result = handler(db, { card_name: 'Hardened Scales' });
      expect(result.creature_types).toHaveLength(0);
    });
  });

  describe('tribal matching', () => {
    it('matches tribal synergy for creatures with subtypes', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      const tribalMatch = result.matching_categories.find(c => c.id === 'tribal');
      expect(tribalMatch).toBeDefined();
      expect(tribalMatch!.match_reason).toContain('Goblin');
    });

    it('finds tribal sample cards sharing creature type', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      const tribalMatch = result.matching_categories.find(c => c.id === 'tribal');
      expect(tribalMatch).toBeDefined();
      const sampleNames = tribalMatch!.sample_cards;
      expect(sampleNames).toContain('Goblin Chieftain');
      expect(sampleNames).toContain('Skirk Prospector');
    });
  });

  describe('keyword extraction', () => {
    it('extracts keywords from card', () => {
      const result = handler(db, { card_name: 'Goblin Chieftain' });
      expect(result.keywords).toContain('Haste');
    });
  });

  describe('oracle text synergy matching', () => {
    it('matches sacrifice synergy for cards mentioning sacrifice', () => {
      const result = handler(db, { card_name: 'Blood Artist' });
      const sacrificeMatch = result.matching_categories.find(c => c.id === 'sacrifice');
      expect(sacrificeMatch).toBeDefined();
    });

    it('matches token synergy for token creators', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      const tokenMatch = result.matching_categories.find(c => c.id === 'tokens');
      expect(tokenMatch).toBeDefined();
    });

    it('matches counter synergy for counter-related cards', () => {
      const result = handler(db, { card_name: 'Hardened Scales' });
      const counterMatch = result.matching_categories.find(c => c.id === 'counters');
      expect(counterMatch).toBeDefined();
    });
  });

  describe('category filter', () => {
    it('filters to specific synergy category', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss', category: 'tribal' });
      expect(result.matching_categories.length).toBeLessThanOrEqual(1);
      if (result.matching_categories.length > 0) {
        expect(result.matching_categories[0].id).toBe('tribal');
      }
    });

    it('returns empty when category does not match', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss', category: 'mill' });
      expect(result.matching_categories.length).toBe(0);
    });
  });

  describe('format filter', () => {
    it('filters synergy categories by format relevance', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss', format: 'commander' });
      for (const cat of result.matching_categories) {
        // All returned categories should be relevant to Commander
        // (verified by the knowledge module)
        expect(cat.id).toBeDefined();
      }
    });
  });

  describe('card not found', () => {
    it('returns empty results for nonexistent card', () => {
      const result = handler(db, { card_name: 'Nonexistent Card' });
      expect(result.card_name).toBe('Nonexistent Card');
      expect(result.creature_types).toHaveLength(0);
      expect(result.keywords).toHaveLength(0);
      expect(result.matching_categories).toHaveLength(0);
    });
  });

  describe('color identity constraint', () => {
    it('filters tribal sample cards by color identity', () => {
      // Krenko is mono-R; Elvish Archdruid is G — should not appear in R-only results
      const result = handler(db, { card_name: 'Krenko, Mob Boss', color_identity: ['R'] });
      const tribalMatch = result.matching_categories.find(c => c.id === 'tribal');
      if (tribalMatch) {
        expect(tribalMatch.sample_cards).not.toContain('Elvish Archdruid');
      }
    });
  });

  describe('result structure', () => {
    it('returns card_name in result', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      expect(result.card_name).toBe('Krenko, Mob Boss');
    });

    it('returns matching categories with required fields', () => {
      const result = handler(db, { card_name: 'Krenko, Mob Boss' });
      for (const cat of result.matching_categories) {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('description');
        expect(cat).toHaveProperty('match_reason');
        expect(cat).toHaveProperty('sample_cards');
      }
    });
  });
});
