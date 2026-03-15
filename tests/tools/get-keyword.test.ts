import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase, insertKeyword, type KeywordRow } from '../../src/data/db.js';
import { handler, GetKeywordInput } from '../../src/tools/get-keyword.js';

// --- Test fixtures ---

function seedKeywordsData(db: Database.Database): void {
  const keywords: KeywordRow[] = [
    { name: 'Flying', section: '702.9', type: 'ability', rules_text: 'A creature with flying can\'t be blocked except by creatures with flying and/or reach.' },
    { name: 'Trample', section: '702.19', type: 'ability', rules_text: 'Trample is a static ability that modifies the rules for assigning an attacking creature\'s combat damage.' },
    { name: 'Equip', section: '702.6', type: 'action', rules_text: 'Equip is an activated ability of Equipment cards. "Equip [cost]" means "[Cost]: Attach this permanent to target creature you control."' },
    { name: 'Scry', section: '701.18', type: 'action', rules_text: 'To scry N, look at the top N cards of your library, then put any number of them on the bottom of your library and the rest on top in any order.' },
    { name: 'First Strike', section: '702.7', type: 'ability', rules_text: 'First strike is a static ability that modifies the rules for the combat damage step.' },
  ];
  for (const keyword of keywords) insertKeyword(db, keyword);
}

// --- Tests ---

describe('get_keyword tool', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
    seedKeywordsData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Zod schema validation', () => {
    it('accepts valid input', () => {
      expect(GetKeywordInput.safeParse({ name: 'Flying' }).success).toBe(true);
    });

    it('rejects missing name', () => {
      expect(GetKeywordInput.safeParse({}).success).toBe(false);
    });
  });

  describe('exact match', () => {
    it('finds keyword by exact name', () => {
      const result = handler(db, { name: 'Flying' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.name).toBe('Flying');
        expect(result.keyword.section).toBe('702.9');
        expect(result.keyword.type).toBe('ability');
        expect(result.keyword.rules_text).toContain("can't be blocked");
      }
    });

    it('is case-insensitive', () => {
      const result = handler(db, { name: 'flying' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.name).toBe('Flying');
      }
    });

    it('returns action type keyword', () => {
      const result = handler(db, { name: 'Equip' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.type).toBe('action');
        expect(result.keyword.section).toBe('702.6');
      }
    });

    it('returns section reference', () => {
      const result = handler(db, { name: 'Scry' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.section).toBe('701.18');
        expect(result.keyword.type).toBe('action');
      }
    });
  });

  describe('fuzzy fallback', () => {
    it('finds keyword via partial name', () => {
      const result = handler(db, { name: 'Tram' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.name).toBe('Trample');
      }
    });

    it('finds multi-word keyword', () => {
      const result = handler(db, { name: 'First Strike' });
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.keyword.name).toBe('First Strike');
        expect(result.keyword.type).toBe('ability');
      }
    });
  });

  describe('not found', () => {
    it('returns found: false for non-existent keyword', () => {
      const result = handler(db, { name: 'Nonexistent' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.message).toContain('Nonexistent');
      }
    });

    it('returns suggestions when available', () => {
      const result = handler(db, { name: 'Fly away' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!).toContain('Flying');
      }
    });

    it('returns no suggestions when no partial match', () => {
      const result = handler(db, { name: 'xyznonexistent' });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.suggestions).toBeUndefined();
      }
    });
  });
});
