import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard, insertLegality,
  type CardRow, type LegalityRow,
} from '../../src/data/db.js';
import { handler, SearchByMechanicInput } from '../../src/tools/search-by-mechanic.js';

// --- Test fixtures ---

function makeBirdsOfParadise(): CardRow {
  return {
    id: 'birds-001', name: 'Birds of Paradise', mana_cost: '{G}', cmc: 1,
    type_line: 'Creature — Bird', oracle_text: 'Flying\n{T}: Add one mana of any color.',
    power: '0', toughness: '1', loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '["Flying"]', rarity: 'rare',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 50, artist: 'Mark Poole',
  };
}

function makeSerraAngel(): CardRow {
  return {
    id: 'serra-001', name: 'Serra Angel', mana_cost: '{3}{W}{W}', cmc: 5,
    type_line: 'Creature — Angel', oracle_text: 'Flying, vigilance',
    power: '4', toughness: '4', loyalty: null, colors: '["W"]',
    color_identity: '["W"]', keywords: '["Flying","Vigilance"]', rarity: 'uncommon',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 200, artist: 'Douglas Shuler',
  };
}

function makeLlanowarElves(): CardRow {
  return {
    id: 'llanowar-001', name: 'Llanowar Elves', mana_cost: '{G}', cmc: 1,
    type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.',
    power: '1', toughness: '1', loyalty: null, colors: '["G"]',
    color_identity: '["G"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 10, artist: 'Anson Maddocks',
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
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBirdsOfParadise());
  insertCard(db, makeSerraAngel());
  insertCard(db, makeLlanowarElves());
  insertCard(db, makeLightningBolt());

  // Add a keyword definition
  db.prepare('INSERT INTO keywords (name, section, type, rules_text) VALUES (?, ?, ?, ?)').run(
    'Flying', '702.9', 'evasion', 'This creature can only be blocked by creatures with flying or reach.'
  );
  db.prepare('INSERT INTO keywords (name, section, type, rules_text) VALUES (?, ?, ?, ?)').run(
    'Vigilance', '702.20', 'combat', 'Attacking does not cause this creature to tap.'
  );

  // Legalities
  const legalities: LegalityRow[] = [
    { card_id: 'birds-001', format: 'modern', status: 'legal' },
    { card_id: 'birds-001', format: 'commander', status: 'legal' },
    { card_id: 'serra-001', format: 'modern', status: 'legal' },
    { card_id: 'serra-001', format: 'commander', status: 'legal' },
    { card_id: 'llanowar-001', format: 'modern', status: 'not_legal' },
    { card_id: 'llanowar-001', format: 'commander', status: 'legal' },
  ];
  for (const l of legalities) insertLegality(db, l);
}

// --- Tests ---

describe('search_by_mechanic tool', () => {
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
      expect(SearchByMechanicInput.safeParse({ keyword: 'Flying' }).success).toBe(true);
    });

    it('accepts all options', () => {
      const result = SearchByMechanicInput.safeParse({
        keyword: 'Flying', include_definition: true, format: 'modern', limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing keyword', () => {
      expect(SearchByMechanicInput.safeParse({}).success).toBe(false);
    });

    it('rejects limit above 50', () => {
      expect(SearchByMechanicInput.safeParse({ keyword: 'Flying', limit: 100 }).success).toBe(false);
    });
  });

  describe('keyword JSON search', () => {
    it('finds cards with the keyword', () => {
      const result = handler(db, { keyword: 'Flying' });
      expect(result.cards.length).toBeGreaterThanOrEqual(2);
      const names = result.cards.map(c => c.name);
      expect(names).toContain('Birds of Paradise');
      expect(names).toContain('Serra Angel');
    });

    it('does not include cards without the keyword', () => {
      const result = handler(db, { keyword: 'Flying' });
      const names = result.cards.map(c => c.name);
      expect(names).not.toContain('Llanowar Elves');
    });

    it('returns the keyword in the result', () => {
      const result = handler(db, { keyword: 'Flying' });
      expect(result.keyword).toBe('Flying');
    });
  });

  describe('FTS5 fallback', () => {
    it('finds cards via oracle text when not in keywords array', () => {
      // "damage" is in oracle text but not a keyword — FTS fallback should find it
      const result = handler(db, { keyword: 'damage' });
      expect(result.cards.length).toBeGreaterThanOrEqual(1);
      const names = result.cards.map(c => c.name);
      expect(names).toContain('Lightning Bolt');
    });
  });

  describe('include_definition option', () => {
    it('includes keyword definition when requested', () => {
      const result = handler(db, { keyword: 'Flying', include_definition: true });
      expect(result.definition).toBeDefined();
      expect(result.definition!.name).toBe('Flying');
      expect(result.definition!.section).toBe('702.9');
      expect(result.definition!.type).toBe('evasion');
      expect(result.definition!.rules_text).toContain('blocked');
    });

    it('omits definition when not requested', () => {
      const result = handler(db, { keyword: 'Flying' });
      expect(result.definition).toBeUndefined();
    });

    it('handles missing keyword definition gracefully', () => {
      const result = handler(db, { keyword: 'Trample', include_definition: true });
      expect(result.definition).toBeUndefined();
    });
  });

  describe('format filter', () => {
    it('filters cards by format legality', () => {
      const result = handler(db, { keyword: 'Flying', format: 'modern' });
      const names = result.cards.map(c => c.name);
      expect(names).toContain('Birds of Paradise');
      expect(names).toContain('Serra Angel');
    });
  });

  describe('limit', () => {
    it('respects custom limit', () => {
      const result = handler(db, { keyword: 'Flying', limit: 1 });
      expect(result.cards).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('returns empty results for nonexistent mechanic', () => {
      const result = handler(db, { keyword: 'Nonexistent' });
      expect(result.cards).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns oracle_text_preview as first line', () => {
      const result = handler(db, { keyword: 'Flying' });
      const birds = result.cards.find(c => c.name === 'Birds of Paradise');
      expect(birds).toBeDefined();
      expect(birds!.oracle_text_preview).toBe('Flying');
      expect(birds!.oracle_text_preview).not.toContain('\n');
    });
  });
});
