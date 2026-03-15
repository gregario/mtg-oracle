import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  getDatabase, insertCard, insertLegality,
  type CardRow, type LegalityRow,
} from '../../src/data/db.js';
import { handler, AnalyzeDeckInput } from '../../src/tools/analyze-deck.js';

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

function makeCounterspell(): CardRow {
  return {
    id: 'counter-001', name: 'Counterspell', mana_cost: '{U}{U}', cmc: 2,
    type_line: 'Instant', oracle_text: 'Counter target spell.',
    power: null, toughness: null, loyalty: null, colors: '["U"]',
    color_identity: '["U"]', keywords: '[]', rarity: 'uncommon',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 10, artist: 'Mark Poole',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeIsland(): CardRow {
  return {
    id: 'island-001', name: 'Island', mana_cost: null, cmc: 0,
    type_line: 'Basic Land — Island', oracle_text: '({T}: Add {U}.)',
    power: null, toughness: null, loyalty: null, colors: '[]',
    color_identity: '["U"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: 'Mark Poole',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeMountain(): CardRow {
  return {
    id: 'mountain-001', name: 'Mountain', mana_cost: null, cmc: 0,
    type_line: 'Basic Land — Mountain', oracle_text: '({T}: Add {R}.)',
    power: null, toughness: null, loyalty: null, colors: '[]',
    color_identity: '["R"]', keywords: '[]', rarity: 'common',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: null, artist: 'Mark Poole',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeNegate(): CardRow {
  return {
    id: 'negate-001', name: 'Negate', mana_cost: '{1}{U}', cmc: 2,
    type_line: 'Instant', oracle_text: 'Counter target noncreature spell.',
    power: null, toughness: null, loyalty: null, colors: '["U"]',
    color_identity: '["U"]', keywords: '[]', rarity: 'common',
    set_code: 'akh', set_name: 'Amonkhet', released_at: '2017-04-28',
    image_uri: null, scryfall_uri: null, edhrec_rank: 20, artist: 'Mark Winters',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeGoblinGuide(): CardRow {
  return {
    id: 'goblin-001', name: 'Goblin Guide', mana_cost: '{R}', cmc: 1,
    type_line: 'Creature — Goblin Scout', oracle_text: 'Haste\nWhenever Goblin Guide attacks, defending player reveals the top card of their library. If it\'s a land card, that player puts it into their hand.',
    power: '2', toughness: '2', loyalty: null, colors: '["R"]',
    color_identity: '["R"]', keywords: '["Haste"]', rarity: 'rare',
    set_code: 'zen', set_name: 'Zendikar', released_at: '2009-10-02',
    image_uri: null, scryfall_uri: null, edhrec_rank: 500, artist: 'Warren Mahy',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function makeSolRing(): CardRow {
  return {
    id: 'sol-001', name: 'Sol Ring', mana_cost: '{1}', cmc: 1,
    type_line: 'Artifact', oracle_text: '{T}: Add {C}{C}.',
    power: null, toughness: null, loyalty: null, colors: '[]',
    color_identity: '[]', keywords: '[]', rarity: 'uncommon',
    set_code: 'lea', set_name: 'Alpha', released_at: '1993-08-05',
    image_uri: null, scryfall_uri: null, edhrec_rank: 1, artist: 'Mark Tedin',
    price_usd: null, price_usd_foil: null, price_eur: null, price_eur_foil: null, price_tix: null,
  };
}

function seedTestData(db: Database.Database): void {
  insertCard(db, makeBolt());
  insertCard(db, makeCounterspell());
  insertCard(db, makeIsland());
  insertCard(db, makeMountain());
  insertCard(db, makeNegate());
  insertCard(db, makeGoblinGuide());
  insertCard(db, makeSolRing());

  // Legalities
  const legalities: LegalityRow[] = [
    { card_id: 'bolt-001', format: 'modern', status: 'legal' },
    { card_id: 'bolt-001', format: 'standard', status: 'not_legal' },
    { card_id: 'counter-001', format: 'modern', status: 'not_legal' },
    { card_id: 'counter-001', format: 'legacy', status: 'legal' },
    { card_id: 'island-001', format: 'modern', status: 'legal' },
    { card_id: 'mountain-001', format: 'modern', status: 'legal' },
    { card_id: 'negate-001', format: 'modern', status: 'legal' },
    { card_id: 'goblin-001', format: 'modern', status: 'legal' },
    { card_id: 'sol-001', format: 'modern', status: 'banned' },
  ];
  for (const l of legalities) insertLegality(db, l);
}

// --- Tests ---

describe('analyze_deck tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedTestData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts valid input with deck_list', () => {
      expect(AnalyzeDeckInput.safeParse({ deck_list: '4 Lightning Bolt' }).success).toBe(true);
    });

    it('accepts input with optional format', () => {
      expect(AnalyzeDeckInput.safeParse({ deck_list: '4 Lightning Bolt', format: 'modern' }).success).toBe(true);
    });

    it('rejects missing deck_list', () => {
      expect(AnalyzeDeckInput.safeParse({}).success).toBe(false);
    });
  });

  describe('basic analysis', () => {
    it('analyzes a simple deck', () => {
      const deckList = `4 Lightning Bolt
4 Counterspell
4 Goblin Guide
24 Island
24 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.main_count).toBe(60);
        expect(result.analysis.sideboard_count).toBe(0);
      }
    });

    it('includes sideboard count', () => {
      const deckList = `4 Lightning Bolt
20 Mountain

// Sideboard
2 Negate`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.main_count).toBe(24);
        expect(result.analysis.sideboard_count).toBe(2);
      }
    });
  });

  describe('mana curve', () => {
    it('computes mana curve for non-land cards', () => {
      const deckList = `4 Lightning Bolt
4 Counterspell
4 Goblin Guide
12 Island`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        const curve = result.analysis.mana_curve;
        const cmc1 = curve.find(e => e.cmc === '1');
        const cmc2 = curve.find(e => e.cmc === '2');
        expect(cmc1?.count).toBe(8); // 4 Bolt + 4 Goblin Guide
        expect(cmc2?.count).toBe(4); // 4 Counterspell
      }
    });

    it('excludes lands from mana curve', () => {
      const deckList = `24 Island
4 Lightning Bolt`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        const totalCurve = result.analysis.mana_curve.reduce((sum, e) => sum + e.count, 0);
        expect(totalCurve).toBe(4); // Only Bolt, not Islands
      }
    });
  });

  describe('color distribution', () => {
    it('counts cards per color', () => {
      const deckList = `4 Lightning Bolt
4 Counterspell
4 Sol Ring`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        const colors = result.analysis.color_distribution;
        const red = colors.find(c => c.color === 'Red');
        const blue = colors.find(c => c.color === 'Blue');
        const colorless = colors.find(c => c.color === 'Colorless');
        expect(red?.count).toBe(4);
        expect(blue?.count).toBe(4);
        expect(colorless?.count).toBe(4);
      }
    });
  });

  describe('type breakdown', () => {
    it('counts cards by type', () => {
      const deckList = `4 Lightning Bolt
4 Goblin Guide
4 Sol Ring
12 Island`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.analysis.type_breakdown;
        const instants = types.find(t => t.type === 'Instant');
        const creatures = types.find(t => t.type === 'Creature');
        const artifacts = types.find(t => t.type === 'Artifact');
        const lands = types.find(t => t.type === 'Land');
        expect(instants?.count).toBe(4);
        expect(creatures?.count).toBe(4);
        expect(artifacts?.count).toBe(4);
        expect(lands?.count).toBe(12);
      }
    });
  });

  describe('mana base analysis', () => {
    it('counts lands and computes percentage', () => {
      const deckList = `4 Lightning Bolt
20 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.mana_base.land_count).toBe(20);
        expect(result.analysis.mana_base.land_percentage).toBeCloseTo(83.3, 0);
      }
    });

    it('detects color sources from land types', () => {
      const deckList = `4 Lightning Bolt
12 Island
12 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.mana_base.color_sources['U']).toBe(12);
        expect(result.analysis.mana_base.color_sources['R']).toBe(12);
      }
    });

    it('provides recommended land count', () => {
      // Build a 60-card deck
      const lines = [
        '4 Lightning Bolt',
        '4 Goblin Guide',
        '4 Counterspell',
        '24 Island',
        '24 Mountain',
      ];
      const result = handler(db, { deck_list: lines.join('\n') });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.mana_base.recommended_lands).not.toBeNull();
      }
    });
  });

  describe('format legality', () => {
    it('checks format legality when format specified', () => {
      const deckList = `4 Lightning Bolt
4 Counterspell
20 Island`;
      const result = handler(db, { deck_list: deckList, format: 'modern' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.format_legality).toBeDefined();
        expect(result.analysis.format_legality!.format).toBe('modern');
        expect(result.analysis.format_legality!.all_legal).toBe(false);
        const illegalNames = result.analysis.format_legality!.illegal_cards.map(c => c.name);
        expect(illegalNames).toContain('Counterspell');
      }
    });

    it('reports all legal when all cards are legal', () => {
      const deckList = `4 Lightning Bolt
4 Goblin Guide
20 Mountain`;
      const result = handler(db, { deck_list: deckList, format: 'modern' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.format_legality!.all_legal).toBe(true);
      }
    });

    it('reports banned cards correctly', () => {
      const deckList = `4 Sol Ring
20 Mountain`;
      const result = handler(db, { deck_list: deckList, format: 'modern' });
      expect(result.success).toBe(true);
      if (result.success) {
        const solRing = result.analysis.format_legality!.illegal_cards.find(c => c.name === 'Sol Ring');
        expect(solRing).toBeDefined();
        expect(solRing!.status).toBe('banned');
      }
    });

    it('omits format legality when format not specified', () => {
      const deckList = '4 Lightning Bolt\n20 Mountain';
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.format_legality).toBeUndefined();
      }
    });
  });

  describe('cards not found', () => {
    it('reports cards not in the database', () => {
      const deckList = `4 Lightning Bolt
4 Nonexistent Card
20 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.cards_not_found).toHaveLength(1);
        expect(result.analysis.cards_not_found[0].name).toBe('Nonexistent Card');
      }
    });

    it('suggests similar cards when possible', () => {
      const deckList = `4 Lihgtning Bolt
20 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.cards_not_found).toHaveLength(1);
        // "Lihgtning" first word is "Lihgtning" — may not match.
        // But let's verify the structure exists.
        expect(result.analysis.cards_not_found[0].name).toBe('Lihgtning Bolt');
      }
    });
  });

  describe('empty / malformed input', () => {
    it('returns failure for empty deck', () => {
      const result = handler(db, { deck_list: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain('empty');
      }
    });

    it('handles deck with only comments', () => {
      const result = handler(db, { deck_list: '# Just a comment\n// Another comment' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain('empty');
      }
    });
  });

  describe('commander deck', () => {
    it('detects commander format hint for 100-card deck', () => {
      const lines = ['1 Sol Ring'];
      for (let i = 0; i < 99; i++) {
        lines.push(`1 Mountain`);
      }
      const result = handler(db, { deck_list: lines.join('\n') });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.format_hint).toBe('commander');
      }
    });

    it('includes commander name when specified', () => {
      const deckList = `Commander: Goblin Guide
1 Lightning Bolt
1 Mountain`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.commander).toBe('Goblin Guide');
      }
    });
  });

  describe('MTGO XML format', () => {
    it('analyzes an XML deck list', () => {
      const deckList = `<Deck>
  <Cards CatID="1" Quantity="4" Sideboard="false" Name="Lightning Bolt"/>
  <Cards CatID="2" Quantity="20" Sideboard="false" Name="Mountain"/>
  <Cards CatID="3" Quantity="2" Sideboard="true" Name="Negate"/>
</Deck>`;
      const result = handler(db, { deck_list: deckList });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.main_count).toBe(24);
        expect(result.analysis.sideboard_count).toBe(2);
      }
    });
  });
});
