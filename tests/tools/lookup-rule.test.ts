import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertRule, type RuleRow } from '../../src/data/db.js';
import { handler, LookupRuleInput } from '../../src/tools/lookup-rule.js';

// --- Test fixtures ---

function seedRulesData(db: Database.Database): void {
  const rules: RuleRow[] = [
    { section: '7', title: 'Additional Rules', text: 'These rules cover additional game concepts.', parent_section: null },
    { section: '702', title: 'Keyword Abilities', text: 'This section lists keyword abilities.', parent_section: '7' },
    { section: '702.1', title: null, text: 'Most abilities describe exactly what they do in the card\'s rules text.', parent_section: '702' },
    { section: '702.2', title: 'Deathtouch', text: 'Deathtouch is a static ability.', parent_section: '702' },
    { section: '702.2a', title: null, text: 'A lethal amount of damage dealt to a creature by a source with deathtouch is considered to be 1.', parent_section: '702.2' },
    { section: '702.2b', title: null, text: 'A creature with toughness greater than 0 that\'s been dealt damage by a source with deathtouch since the last time state-based actions were checked is destroyed.', parent_section: '702.2' },
    { section: '702.3', title: 'Defender', text: 'Defender is a static ability.', parent_section: '702' },
    { section: '100', title: 'General', text: 'These are the general rules of Magic: The Gathering.', parent_section: null },
    { section: '100.1', title: null, text: 'These Magic rules apply to any Magic game with two or more players.', parent_section: '100' },
    { section: '601', title: 'Casting Spells', text: 'Casting a spell involves several steps.', parent_section: null },
  ];
  for (const rule of rules) insertRule(db, rule);
}

// --- Tests ---

describe('lookup_rule tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedRulesData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts section input', () => {
      expect(LookupRuleInput.safeParse({ section: '702' }).success).toBe(true);
    });

    it('accepts query input', () => {
      expect(LookupRuleInput.safeParse({ query: 'deathtouch' }).success).toBe(true);
    });

    it('accepts both section and query', () => {
      expect(LookupRuleInput.safeParse({ section: '702', query: 'deathtouch' }).success).toBe(true);
    });

    it('rejects empty object', () => {
      expect(LookupRuleInput.safeParse({}).success).toBe(false);
    });
  });

  describe('section lookup — exact match', () => {
    it('finds rule by exact section number', () => {
      const result = handler(db, { section: '702.2' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rules[0].section).toBe('702.2');
        expect(result.rules[0].title).toBe('Deathtouch');
        expect(result.rules[0].text).toContain('static ability');
      }
    });

    it('returns parent context for exact match', () => {
      const result = handler(db, { section: '702.2' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.parent).toBeDefined();
        expect(result.parent!.section).toBe('702');
        expect(result.parent!.title).toBe('Keyword Abilities');
      }
    });
  });

  describe('section lookup — with subsections', () => {
    it('returns subsections of a parent section', () => {
      const result = handler(db, { section: '702.2' });
      expect(result.found).toBe(true);
      if (result.found) {
        // Should include 702.2 (exact) plus 702.2a, 702.2b (subsections)
        const sections = result.rules.map(r => r.section);
        expect(sections).toContain('702.2');
        expect(sections).toContain('702.2a');
        expect(sections).toContain('702.2b');
      }
    });

    it('returns all children for a top-level section', () => {
      const result = handler(db, { section: '702' });
      expect(result.found).toBe(true);
      if (result.found) {
        const sections = result.rules.map(r => r.section);
        expect(sections).toContain('702');
        expect(sections).toContain('702.1');
        expect(sections).toContain('702.2');
        expect(sections).toContain('702.3');
      }
    });
  });

  describe('section lookup — not found', () => {
    it('returns found: false for non-existent section', () => {
      const result = handler(db, { section: '999' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('999');
      }
    });
  });

  describe('text search', () => {
    it('finds rules by text content', () => {
      const result = handler(db, { query: 'deathtouch' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rules.length).toBeGreaterThanOrEqual(1);
        const hasDeathtouch = result.rules.some(r => r.text.toLowerCase().includes('deathtouch'));
        expect(hasDeathtouch).toBe(true);
      }
    });

    it('finds rules by title', () => {
      const result = handler(db, { query: 'Casting Spells' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rules[0].section).toBe('601');
        expect(result.rules[0].title).toBe('Casting Spells');
      }
    });

    it('is case-insensitive', () => {
      const result = handler(db, { query: 'DEATHTOUCH' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rules.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns found: false for no matches', () => {
      const result = handler(db, { query: 'xyznonexistent' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('xyznonexistent');
      }
    });
  });

  describe('section takes priority over query', () => {
    it('uses section when both provided', () => {
      const result = handler(db, { section: '100', query: 'deathtouch' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.rules[0].section).toBe('100');
      }
    });
  });
});
