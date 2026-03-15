import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { getDatabase } from '../../src/data/db.js';
import {
  fetchComprehensiveRules,
  fetchGlossary,
  getParentSection,
  extractTitle,
  getKeywordType,
  extractKeywordName,
  ingestRules,
  ingestGlossary,
  ingestKeywords,
  runRulesPipeline,
  type AcademyRuinsRule,
  type AcademyRuinsGlossaryEntry,
} from '../../src/data/rules.js';

// --- Mock helpers ---

function mockFetch(responses: Record<string, { status: number; body: unknown }>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const match = Object.entries(responses).find(([pattern]) => url.includes(pattern));
    if (!match) {
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }
    const [, resp] = match;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
    } as Response;
  }) as typeof fetch;
}

function makeSampleRules(): AcademyRuinsRule[] {
  return [
    { ruleNumber: '1', ruleText: 'Game Concepts' },
    { ruleNumber: '100', ruleText: 'General' },
    { ruleNumber: '100.1', ruleText: 'These Magic rules apply to any Magic game with two or more players.' },
    { ruleNumber: '100.1a', ruleText: 'A two-player game is a game that begins with only two players.' },
    { ruleNumber: '100.2', ruleText: 'To play, each player needs their own deck.' },
    { ruleNumber: '7', ruleText: 'Additional Rules' },
    { ruleNumber: '701', ruleText: 'Keyword Actions' },
    { ruleNumber: '701.2', ruleText: 'Activate' },
    { ruleNumber: '701.2a', ruleText: 'To activate an activated ability means to put it onto the stack.' },
    { ruleNumber: '701.2b', ruleText: 'Only the controller of an object can activate its abilities.' },
    { ruleNumber: '701.5', ruleText: 'Destroy' },
    { ruleNumber: '701.5a', ruleText: 'To destroy a permanent, move it to its owner\'s graveyard.' },
    { ruleNumber: '702', ruleText: 'Keyword Abilities' },
    { ruleNumber: '702.2', ruleText: 'Deathtouch' },
    { ruleNumber: '702.2a', ruleText: 'Deathtouch is a static ability.' },
    { ruleNumber: '702.2b', ruleText: 'A creature with lethal damage from a source with deathtouch is destroyed.' },
    { ruleNumber: '702.9', ruleText: 'Flying' },
    { ruleNumber: '702.9a', ruleText: 'Flying is an evasion ability.' },
  ];
}

function makeSampleGlossary(): AcademyRuinsGlossaryEntry[] {
  return [
    { term: 'Activate', definition: 'To put an activated ability onto the stack and pay its costs.' },
    { term: 'Deathtouch', definition: 'A keyword ability that causes damage dealt by a source to be lethal.' },
    { term: 'Flying', definition: 'A keyword ability that restricts which creatures can block.' },
    { term: 'Trample', definition: 'A keyword ability that modifies how combat damage is assigned.' },
  ];
}

// --- Tests ---

describe('Rules Pipeline', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('getParentSection', () => {
    it('returns parent for lettered sub-rule', () => {
      expect(getParentSection('100.1a')).toBe('100.1');
    });

    it('returns parent for numbered sub-section', () => {
      expect(getParentSection('100.1')).toBe('100');
    });

    it('returns null for top-level section', () => {
      expect(getParentSection('100')).toBeNull();
    });

    it('returns null for single digit section', () => {
      expect(getParentSection('1')).toBeNull();
    });

    it('handles multi-letter suffix', () => {
      expect(getParentSection('702.9ab')).toBe('702.9');
    });
  });

  describe('extractTitle', () => {
    it('returns text as title for top-level sections', () => {
      expect(extractTitle('100', 'General')).toBe('General');
    });

    it('returns text as title for single-digit sections', () => {
      expect(extractTitle('1', 'Game Concepts')).toBe('Game Concepts');
    });

    it('returns null for sub-rules', () => {
      expect(extractTitle('100.1', 'Some rule text')).toBeNull();
    });
  });

  describe('getKeywordType', () => {
    it('returns action for section 701', () => {
      expect(getKeywordType('701.2')).toBe('action');
      expect(getKeywordType('701.2a')).toBe('action');
    });

    it('returns ability for section 702', () => {
      expect(getKeywordType('702.9')).toBe('ability');
      expect(getKeywordType('702.9a')).toBe('ability');
    });

    it('returns null for other sections', () => {
      expect(getKeywordType('100.1')).toBeNull();
      expect(getKeywordType('703.1')).toBeNull();
    });
  });

  describe('extractKeywordName', () => {
    it('extracts short keyword names', () => {
      expect(extractKeywordName('Flying')).toBe('Flying');
      expect(extractKeywordName('Deathtouch')).toBe('Deathtouch');
    });

    it('returns null for long rule text', () => {
      expect(extractKeywordName('Deathtouch is a static ability that makes a creature with it lethal.')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractKeywordName('')).toBeNull();
    });
  });

  describe('fetchComprehensiveRules', () => {
    it('fetches and returns rules array', async () => {
      const fetchFn = mockFetch({
        '/cr': { status: 200, body: { data: makeSampleRules() } },
      });

      // Need to make sure it doesn't match /cr/glossary too
      const customFetch = (async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith('/cr') || url.endsWith('/cr/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: makeSampleRules() }),
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }) as typeof fetch;

      const rules = await fetchComprehensiveRules(customFetch);
      expect(rules).toHaveLength(18);
      expect(rules[0].ruleNumber).toBe('1');
    });

    it('throws on error response', async () => {
      const fetchFn = mockFetch({
        '/cr': { status: 500, body: {} },
      });

      await expect(fetchComprehensiveRules(fetchFn)).rejects.toThrow('500');
    });
  });

  describe('fetchGlossary', () => {
    it('fetches and returns glossary entries', async () => {
      const fetchFn = mockFetch({
        'glossary': { status: 200, body: { data: makeSampleGlossary() } },
      });

      const entries = await fetchGlossary(fetchFn);
      expect(entries).toHaveLength(4);
      expect(entries[0].term).toBe('Activate');
    });
  });

  describe('ingestRules', () => {
    it('inserts all rules into the database', () => {
      const rules = makeSampleRules();
      const count = ingestRules(db, rules);
      expect(count).toBe(18);

      const row = db.prepare('SELECT * FROM rules WHERE section = ?').get('100.1') as Record<string, unknown>;
      expect(row.text).toContain('Magic rules apply');
      expect(row.parent_section).toBe('100');
      expect(row.title).toBeNull();
    });

    it('sets title for top-level sections', () => {
      ingestRules(db, makeSampleRules());

      const row = db.prepare('SELECT * FROM rules WHERE section = ?').get('100') as Record<string, unknown>;
      expect(row.title).toBe('General');
    });

    it('sets correct parent sections', () => {
      ingestRules(db, makeSampleRules());

      const subRule = db.prepare('SELECT parent_section FROM rules WHERE section = ?').get('100.1a') as Record<string, unknown>;
      expect(subRule.parent_section).toBe('100.1');
    });
  });

  describe('ingestGlossary', () => {
    it('inserts all glossary entries', () => {
      const count = ingestGlossary(db, makeSampleGlossary());
      expect(count).toBe(4);

      const row = db.prepare('SELECT * FROM glossary WHERE term = ?').get('Flying') as Record<string, unknown>;
      expect(row.definition).toContain('restricts which creatures can block');
    });

    it('handles upsert (INSERT OR REPLACE)', () => {
      ingestGlossary(db, [{ term: 'Test', definition: 'Original' }]);
      ingestGlossary(db, [{ term: 'Test', definition: 'Updated' }]);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM glossary').get() as { cnt: number };
      expect(count.cnt).toBe(1);

      const row = db.prepare('SELECT definition FROM glossary WHERE term = ?').get('Test') as { definition: string };
      expect(row.definition).toBe('Updated');
    });
  });

  describe('ingestKeywords', () => {
    it('extracts keyword actions from section 701', () => {
      const count = ingestKeywords(db, makeSampleRules());
      expect(count).toBeGreaterThanOrEqual(2);  // Activate, Destroy

      const activate = db.prepare('SELECT * FROM keywords WHERE name = ?').get('Activate') as Record<string, unknown>;
      expect(activate).toBeDefined();
      expect(activate.type).toBe('action');
      expect(activate.section).toBe('701.2');
      expect((activate.rules_text as string)).toContain('activated ability');
    });

    it('extracts keyword abilities from section 702', () => {
      ingestKeywords(db, makeSampleRules());

      const deathtouch = db.prepare('SELECT * FROM keywords WHERE name = ?').get('Deathtouch') as Record<string, unknown>;
      expect(deathtouch).toBeDefined();
      expect(deathtouch.type).toBe('ability');
      expect(deathtouch.section).toBe('702.2');
    });

    it('combines sub-rule text into rules_text', () => {
      ingestKeywords(db, makeSampleRules());

      const activate = db.prepare('SELECT rules_text FROM keywords WHERE name = ?').get('Activate') as { rules_text: string };
      // Should contain both the name line and sub-rules
      expect(activate.rules_text).toContain('Activate');
      expect(activate.rules_text).toContain('put it onto the stack');
    });
  });

  describe('runRulesPipeline', () => {
    it('fetches and ingests rules, glossary, and keywords', async () => {
      const fetchFn = (async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('glossary')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: makeSampleGlossary() }),
          } as Response;
        }
        if (url.includes('/cr')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: makeSampleRules() }),
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }) as typeof fetch;

      const result = await runRulesPipeline(db, fetchFn);
      expect(result.rulesCount).toBe(18);
      expect(result.glossaryCount).toBe(4);
      expect(result.keywordsCount).toBeGreaterThanOrEqual(2);
    });

    it('clears existing data before re-ingesting', async () => {
      // Pre-populate
      db.prepare('INSERT INTO glossary (term, definition) VALUES (?, ?)').run('OldTerm', 'old def');

      const fetchFn = (async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('glossary')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [{ term: 'NewTerm', definition: 'new def' }] }),
          } as Response;
        }
        if (url.includes('/cr')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [{ ruleNumber: '1', ruleText: 'Game Concepts' }] }),
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }) as typeof fetch;

      await runRulesPipeline(db, fetchFn);

      const oldRow = db.prepare('SELECT * FROM glossary WHERE term = ?').get('OldTerm');
      expect(oldRow).toBeUndefined();

      const newRow = db.prepare('SELECT * FROM glossary WHERE term = ?').get('NewTerm');
      expect(newRow).toBeDefined();
    });
  });
});
