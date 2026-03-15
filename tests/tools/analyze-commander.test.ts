import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertCard, type CardRow } from '../../src/data/db.js';
import { handler, AnalyzeCommanderInput } from '../../src/tools/analyze-commander.js';

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

function makeBrago(): CardRow {
  return {
    id: 'brago-001', name: 'Brago, King Eternal', mana_cost: '{2}{W}{U}', cmc: 4,
    type_line: 'Legendary Creature — Spirit Noble',
    oracle_text: 'Flying\nWhenever Brago, King Eternal deals combat damage to a player, exile any number of target nonland permanents you control, then return those cards to the battlefield under their owner\'s control.',
    power: '2', toughness: '4', loyalty: null, colors: '["W","U"]',
    color_identity: '["W","U"]', keywords: '["Flying"]', rarity: 'rare',
    set_code: 'cns', set_name: 'Conspiracy', released_at: '2014-06-06',
    image_uri: null, scryfall_uri: null, edhrec_rank: 150, artist: 'Karla Ortiz',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makePartnerCommander(): CardRow {
  return {
    id: 'thrasios-001', name: 'Thrasios, Triton Hero', mana_cost: '{G}{U}', cmc: 2,
    type_line: 'Legendary Creature — Merfolk Wizard',
    oracle_text: '{4}: Scry 1, then reveal the top card of your library. If it\'s a land card, put it onto the battlefield tapped. Otherwise, draw a card.\nPartner',
    power: '1', toughness: '3', loyalty: null, colors: '["G","U"]',
    color_identity: '["G","U"]', keywords: '["Partner"]', rarity: 'rare',
    set_code: 'c16', set_name: 'Commander 2016', released_at: '2016-11-11',
    image_uri: null, scryfall_uri: null, edhrec_rank: 10, artist: 'Josu Hernaiz',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeLightningBolt(): CardRow {
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

function makeMeren(): CardRow {
  return {
    id: 'meren-001', name: 'Meren of Clan Nel Toth', mana_cost: '{2}{B}{G}', cmc: 4,
    type_line: 'Legendary Creature — Human Shaman',
    oracle_text: 'Whenever another creature you control dies, you get an experience counter.\nAt the beginning of your end step, choose target creature card in your graveyard. If that card\'s mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand.',
    power: '3', toughness: '4', loyalty: null, colors: '["B","G"]',
    color_identity: '["B","G"]', keywords: '[]', rarity: 'mythic',
    set_code: 'c15', set_name: 'Commander 2015', released_at: '2015-11-13',
    image_uri: null, scryfall_uri: null, edhrec_rank: 25, artist: 'Mark Winters',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeKrenko());
  insertCard(db, makeBrago());
  insertCard(db, makePartnerCommander());
  insertCard(db, makeLightningBolt());
  insertCard(db, makeMeren());
}

// --- Tests ---

describe('analyze_commander tool', () => {
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
      expect(AnalyzeCommanderInput.safeParse({ name: 'Krenko, Mob Boss' }).success).toBe(true);
    });

    it('rejects missing name', () => {
      expect(AnalyzeCommanderInput.safeParse({}).success).toBe(false);
    });
  });

  describe('basic analysis', () => {
    it('returns analysis for a valid legendary creature', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.name).toBe('Krenko, Mob Boss');
        expect(result.analysis.color_identity).toEqual(['R']);
        expect(result.analysis.type_line).toContain('Legendary Creature');
      }
    });

    it('includes edhrec_rank', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.edhrec_rank).toBe(42);
      }
    });

    it('includes oracle_text', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.oracle_text).toContain('Goblin creature tokens');
      }
    });
  });

  describe('non-legendary / non-creature rejection', () => {
    it('rejects non-legendary creatures', () => {
      const result = handler(db, { name: 'Lightning Bolt' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('not a legendary creature');
      }
    });
  });

  describe('card not found', () => {
    it('returns found: false for nonexistent card', () => {
      const result = handler(db, { name: 'Nonexistent Commander' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('No card found');
      }
    });
  });

  describe('partner detection', () => {
    it('detects Partner keyword', () => {
      const result = handler(db, { name: 'Thrasios, Triton Hero' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.has_partner).toBe(true);
      }
    });

    it('reports no partner for non-partner commander', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.has_partner).toBe(false);
      }
    });
  });

  describe('strategy matching', () => {
    it('matches mono-red strategies for Krenko', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        const strategyIds = result.analysis.suggested_strategies.map(s => s.id);
        expect(strategyIds).toContain('mono-r-goblins');
      }
    });

    it('matches WU strategies for Brago', () => {
      const result = handler(db, { name: 'Brago, King Eternal' });
      expect(result.found).toBe(true);
      if (result.found) {
        const strategyIds = result.analysis.suggested_strategies.map(s => s.id);
        expect(strategyIds).toContain('azorius-blink');
      }
    });

    it('matches BG strategies for Meren', () => {
      const result = handler(db, { name: 'Meren of Clan Nel Toth' });
      expect(result.found).toBe(true);
      if (result.found) {
        const strategyIds = result.analysis.suggested_strategies.map(s => s.id);
        expect(strategyIds).toContain('golgari-graveyard');
      }
    });
  });

  describe('archetype matching', () => {
    it('suggests token-related archetypes for Krenko', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        // Krenko creates tokens, should match tokens archetype
        const archetypeIds = result.analysis.suggested_archetypes.map(a => a.id);
        expect(archetypeIds).toContain('tokens');
      }
    });
  });

  describe('recommended categories', () => {
    it('always includes staple categories', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.recommended_categories).toContain('Ramp');
        expect(result.analysis.recommended_categories).toContain('Card Draw');
        expect(result.analysis.recommended_categories).toContain('Removal');
        expect(result.analysis.recommended_categories).toContain('Board Wipes');
      }
    });

    it('includes Token Generators for token-creating commanders', () => {
      const result = handler(db, { name: 'Krenko, Mob Boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.recommended_categories).toContain('Token Generators');
      }
    });

    it('includes Evasion for flying commanders', () => {
      const result = handler(db, { name: 'Brago, King Eternal' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.recommended_categories).toContain('Evasion');
      }
    });

    it('includes Graveyard Recursion for graveyard-themed commanders', () => {
      const result = handler(db, { name: 'Meren of Clan Nel Toth' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.recommended_categories).toContain('Graveyard Recursion');
      }
    });
  });

  describe('case insensitivity', () => {
    it('finds commander with lowercase name', () => {
      const result = handler(db, { name: 'krenko, mob boss' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.analysis.name).toBe('Krenko, Mob Boss');
      }
    });
  });
});
