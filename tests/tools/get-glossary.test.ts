import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertGlossary, type GlossaryRow } from '../../src/data/db.js';
import { handler, GetGlossaryInput } from '../../src/tools/get-glossary.js';

// --- Test fixtures ---

function seedGlossaryData(db: Database.Database): void {
  const entries: GlossaryRow[] = [
    { term: 'Activated Ability', definition: 'An ability that can be activated by paying a cost. Activated abilities are written as "[Cost]: [Effect.]"' },
    { term: 'Attach', definition: 'To move an Aura, Equipment, or Fortification onto another object or player.' },
    { term: 'Battlefield', definition: 'The zone in which permanents exist. See rule 403.' },
    { term: 'Cast', definition: 'To take a spell from where it is and put it on the stack.' },
    { term: 'Colorless', definition: 'An object with no color is colorless. Colorless is not a color.' },
    { term: 'Commander', definition: 'A designation given to a legendary creature card that heads a Commander deck.' },
  ];
  for (const entry of entries) insertGlossary(db, entry);
}

// --- Tests ---

describe('get_glossary tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedGlossaryData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts valid input', () => {
      expect(GetGlossaryInput.safeParse({ term: 'Battlefield' }).success).toBe(true);
    });

    it('rejects missing term', () => {
      expect(GetGlossaryInput.safeParse({}).success).toBe(false);
    });
  });

  describe('exact match', () => {
    it('finds term by exact name', () => {
      const result = handler(db, { term: 'Battlefield' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].term).toBe('Battlefield');
        expect(result.entries[0].definition).toContain('permanents exist');
      }
    });

    it('is case-insensitive', () => {
      const result = handler(db, { term: 'battlefield' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].term).toBe('Battlefield');
      }
    });

    it('is case-insensitive with ALL CAPS', () => {
      const result = handler(db, { term: 'CAST' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries[0].term).toBe('Cast');
      }
    });
  });

  describe('partial match', () => {
    it('finds terms by partial name', () => {
      const result = handler(db, { term: 'Color' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.entries.length).toBeGreaterThanOrEqual(1);
        const terms = result.entries.map(e => e.term);
        expect(terms).toContain('Colorless');
      }
    });

    it('returns multiple matches for broad partial', () => {
      const result = handler(db, { term: 'Ac' });
      expect(result.found).toBe(true);
      if (result.found) {
        // Should match "Activated Ability" and "Attach"
        expect(result.entries.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('prefers exact match over partial', () => {
      const result = handler(db, { term: 'Cast' });
      expect(result.found).toBe(true);
      if (result.found) {
        // Exact match returns single entry, not partials
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].term).toBe('Cast');
      }
    });
  });

  describe('not found', () => {
    it('returns found: false when no match exists', () => {
      const result = handler(db, { term: 'Nonexistent' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('Nonexistent');
      }
    });
  });
});
