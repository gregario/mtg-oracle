import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase } from '../../src/data/db.js';
import { handler, FindCombosInput } from '../../src/tools/find-combos.js';

// --- Test fixtures ---

function seedCombos(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO combos (id, cards, color_identity, prerequisites, steps, results, legality, popularity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    'combo-001',
    '["Splinter Twin","Deceiver Exarch"]',
    '["U","R"]',
    'Splinter Twin enchanting Deceiver Exarch',
    'Tap Deceiver Exarch to create a copy. The copy untaps Deceiver Exarch. Repeat.',
    'Infinite 1/4 creature tokens with haste',
    '{"modern":"banned","legacy":"legal","commander":"legal"}',
    95,
  );

  insert.run(
    'combo-002',
    '["Thassa\'s Oracle","Demonic Consultation"]',
    '["U","B"]',
    'Both cards in hand, 2 mana available',
    'Cast Demonic Consultation naming a card not in your deck. With the trigger on the stack, cast Thassa\'s Oracle.',
    'Win the game (devotion to blue check with empty library)',
    '{"commander":"legal","legacy":"legal"}',
    100,
  );

  insert.run(
    'combo-003',
    '["Kiki-Jiki, Mirror Breaker","Zealous Conscripts"]',
    '["R"]',
    'Both creatures on the battlefield',
    'Use Kiki-Jiki to copy Zealous Conscripts. The copy untaps Kiki-Jiki. Repeat.',
    'Infinite hasty creature tokens',
    '{"commander":"legal","modern":"legal"}',
    80,
  );

  insert.run(
    'combo-004',
    '["Splinter Twin","Pestermite"]',
    '["U","R"]',
    'Splinter Twin enchanting Pestermite',
    'Same as Deceiver Exarch combo but with Pestermite.',
    'Infinite 2/1 creature tokens with haste and flying',
    '{"modern":"banned","legacy":"legal","commander":"legal"}',
    70,
  );

  insert.run(
    'combo-005',
    '["Heliod, Sun-Crowned","Walking Ballista"]',
    '["W"]',
    'Both on the battlefield, Ballista has at least one counter',
    'Remove a counter to deal 1 damage. Heliod triggers, adding a counter. Repeat.',
    'Infinite damage to any target',
    '{"commander":"legal","modern":"legal","pioneer":"legal"}',
    85,
  );
}

// --- Tests ---

describe('find_combos tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedCombos(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts card_name only', () => {
      expect(FindCombosInput.safeParse({ card_name: 'Splinter Twin' }).success).toBe(true);
    });

    it('accepts card_names array', () => {
      expect(FindCombosInput.safeParse({ card_names: ['Splinter Twin', 'Deceiver Exarch'] }).success).toBe(true);
    });

    it('accepts color_identity filter', () => {
      expect(FindCombosInput.safeParse({ color_identity: ['U', 'R'] }).success).toBe(true);
    });

    it('accepts all options combined', () => {
      const result = FindCombosInput.safeParse({
        card_name: 'Splinter Twin',
        color_identity: ['U', 'R'],
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects limit above 50', () => {
      expect(FindCombosInput.safeParse({ card_name: 'X', limit: 100 }).success).toBe(false);
    });
  });

  describe('search by single card name', () => {
    it('finds combos containing the card', () => {
      const result = handler(db, { card_name: 'Splinter Twin' });
      expect(result.combos.length).toBe(2);
      const comboIds = result.combos.map(c => c.id);
      expect(comboIds).toContain('combo-001');
      expect(comboIds).toContain('combo-004');
    });

    it('returns combo details', () => {
      const result = handler(db, { card_name: 'Splinter Twin' });
      const combo = result.combos.find(c => c.id === 'combo-001');
      expect(combo).toBeDefined();
      expect(combo!.cards).toEqual(['Splinter Twin', 'Deceiver Exarch']);
      expect(combo!.prerequisites).toContain('Splinter Twin');
      expect(combo!.steps).toContain('copy');
      expect(combo!.results).toContain('Infinite');
    });

    it('returns combos sorted by popularity DESC', () => {
      const result = handler(db, { card_name: 'Splinter Twin' });
      expect(result.combos[0].popularity).toBeGreaterThanOrEqual(result.combos[1].popularity!);
    });
  });

  describe('search by multiple card names', () => {
    it('finds combos containing all specified cards', () => {
      const result = handler(db, { card_names: ['Splinter Twin', 'Deceiver Exarch'] });
      expect(result.combos.length).toBe(1);
      expect(result.combos[0].id).toBe('combo-001');
    });

    it('returns empty when no combo has all cards', () => {
      const result = handler(db, { card_names: ['Splinter Twin', 'Walking Ballista'] });
      expect(result.combos.length).toBe(0);
    });
  });

  describe('color identity filter', () => {
    it('filters combos within color identity', () => {
      const result = handler(db, { card_name: 'Splinter Twin', color_identity: ['U', 'R'] });
      expect(result.combos.length).toBe(2); // Both UR combos should match
      for (const combo of result.combos) {
        for (const color of combo.color_identity) {
          expect(['U', 'R']).toContain(color);
        }
      }
    });

    it('excludes combos outside color identity', () => {
      // Searching for combos that fit in mono-W — only Heliod combo
      const result = handler(db, { color_identity: ['W'], card_name: 'Heliod' });
      expect(result.combos.length).toBe(1);
      expect(result.combos[0].id).toBe('combo-005');
    });

    it('excludes combos with extra colors', () => {
      // Mono-R identity — Kiki-Jiki fits, but Splinter Twin combos are UR
      const result = handler(db, { card_name: 'Kiki-Jiki', color_identity: ['R'] });
      expect(result.combos.length).toBe(1);
      expect(result.combos[0].id).toBe('combo-003');
    });
  });

  describe('limit', () => {
    it('defaults to 20', () => {
      const result = handler(db, { card_name: 'Splinter Twin' });
      expect(result.combos.length).toBeLessThanOrEqual(20);
    });

    it('respects custom limit', () => {
      const result = handler(db, { card_name: 'Splinter Twin', limit: 1 });
      expect(result.combos.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('returns empty for nonexistent card', () => {
      const result = handler(db, { card_name: 'Nonexistent Card' });
      expect(result.combos.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('returns empty when no params provided', () => {
      const result = handler(db, {});
      expect(result.combos.length).toBe(0);
    });

    it('parses color_identity from combo rows', () => {
      const result = handler(db, { card_name: 'Thassa\'s Oracle' });
      expect(result.combos.length).toBe(1);
      expect(result.combos[0].color_identity).toEqual(['U', 'B']);
    });
  });
});
