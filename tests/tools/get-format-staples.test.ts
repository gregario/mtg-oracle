import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase } from '../../src/data/db.js';
import { handler, GetFormatStaplesInput } from '../../src/tools/get-format-staples.js';

// --- Tests ---

describe('get_format_staples tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts format only', () => {
      expect(GetFormatStaplesInput.safeParse({ format: 'modern' }).success).toBe(true);
    });

    it('accepts format with archetype', () => {
      expect(GetFormatStaplesInput.safeParse({ format: 'modern', archetype: 'aggro-red' }).success).toBe(true);
    });

    it('rejects missing format', () => {
      expect(GetFormatStaplesInput.safeParse({}).success).toBe(false);
    });
  });

  describe('format info', () => {
    it('returns format info for known format', () => {
      const result = handler(db, { format: 'modern' });
      expect(result.format_info).toBeDefined();
      expect(result.format_info!.name).toBe('Modern');
      expect(result.format_info!.power_level).toBe(7);
    });

    it('returns format info for commander', () => {
      const result = handler(db, { format: 'commander' });
      expect(result.format_info).toBeDefined();
      expect(result.format_info!.name).toBe('Commander (EDH)');
    });

    it('returns null format_info for unknown format', () => {
      const result = handler(db, { format: 'unknown-format' });
      expect(result.format_info).toBeNull();
    });
  });

  describe('staple cards', () => {
    it('returns staple cards for modern', () => {
      const result = handler(db, { format: 'modern' });
      expect(result.staple_cards.length).toBeGreaterThan(0);
    });

    it('returns staple cards for commander including strategy staples', () => {
      const result = handler(db, { format: 'commander' });
      expect(result.staple_cards.length).toBeGreaterThan(0);
      // Commander should include strategy staples like Sol Ring-adjacent cards
      // From COMMANDER_STRATEGIES, Krenko should have Goblin-related staples
      expect(result.staple_cards).toContain('Krenko, Mob Boss');
    });

    it('returns staple cards for legacy', () => {
      const result = handler(db, { format: 'legacy' });
      expect(result.staple_cards.length).toBeGreaterThan(0);
    });
  });

  describe('archetype filter', () => {
    it('filters staples by archetype', () => {
      const result = handler(db, { format: 'modern', archetype: 'aggro-red' });
      expect(result.archetype_filter).toBe('aggro-red');
      expect(result.staple_cards.length).toBeGreaterThan(0);
      // Red aggro staples
      expect(result.staple_cards).toContain('Goblin Guide');
      expect(result.staple_cards).toContain('Lightning Bolt');
    });

    it('returns fewer cards when filtered by archetype', () => {
      const allModern = handler(db, { format: 'modern' });
      const filteredModern = handler(db, { format: 'modern', archetype: 'aggro-red' });
      expect(filteredModern.staple_cards.length).toBeLessThan(allModern.staple_cards.length);
    });

    it('returns empty staples for nonexistent archetype', () => {
      const result = handler(db, { format: 'modern', archetype: 'nonexistent-archetype' });
      expect(result.staple_cards.length).toBe(0);
    });

    it('supports commander strategy IDs as archetype filter', () => {
      const result = handler(db, { format: 'commander', archetype: 'mono-r-goblins' });
      expect(result.staple_cards.length).toBeGreaterThan(0);
      expect(result.staple_cards).toContain('Krenko, Mob Boss');
      expect(result.staple_cards).toContain('Goblin Chieftain');
    });
  });

  describe('archetypes list', () => {
    it('returns relevant archetypes for the format', () => {
      const result = handler(db, { format: 'modern' });
      expect(result.archetypes.length).toBeGreaterThan(0);
      const ids = result.archetypes.map(a => a.id);
      expect(ids).toContain('aggro-red');
    });

    it('includes commander strategies in archetypes for commander format', () => {
      const result = handler(db, { format: 'commander' });
      const ids = result.archetypes.map(a => a.id);
      expect(ids).toContain('mono-r-goblins');
      expect(ids).toContain('azorius-blink');
    });

    it('includes example cards in archetype entries', () => {
      const result = handler(db, { format: 'modern', archetype: 'aggro-red' });
      expect(result.archetypes.length).toBeGreaterThan(0);
      expect(result.archetypes[0].example_cards.length).toBeGreaterThan(0);
    });
  });

  describe('format field', () => {
    it('echoes back the format parameter', () => {
      const result = handler(db, { format: 'legacy' });
      expect(result.format).toBe('legacy');
    });
  });

  describe('archetype_filter field', () => {
    it('is null when no archetype specified', () => {
      const result = handler(db, { format: 'modern' });
      expect(result.archetype_filter).toBeNull();
    });

    it('echoes back archetype when specified', () => {
      const result = handler(db, { format: 'modern', archetype: 'aggro-red' });
      expect(result.archetype_filter).toBe('aggro-red');
    });
  });
});
