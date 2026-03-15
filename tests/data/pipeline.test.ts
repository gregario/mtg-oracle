import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../src/data/db.js';
import {
  loadLastUpdate,
  saveLastUpdate,
  needsSpellbookRefresh,
  isFirstRun,
  hasExistingData,
  runPipeline,
  type LastUpdate,
} from '../../src/data/pipeline.js';
import type { VariantsApi } from '@space-cow-media/spellbook-client';
import type { PaginatedVariantList } from '@space-cow-media/spellbook-client';

// --- Mock helpers ---

function makeMockFetch(options: {
  scryfallOk?: boolean;
  rulesOk?: boolean;
}): typeof fetch {
  const { scryfallOk = true, rulesOk = true } = options;

  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Scryfall bulk-data metadata
    if (url.includes('bulk-data')) {
      if (!scryfallOk) return { ok: false, status: 500, json: async () => ({}), text: async () => '{}' } as Response;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'bulk-oracle',
              type: 'oracle_cards',
              updated_at: '2026-03-15T10:00:00+00:00',
              download_uri: 'https://data.scryfall.io/oracle-cards/test.json',
              name: 'Oracle Cards',
              size: 1000,
            },
            {
              id: 'bulk-rulings',
              type: 'rulings',
              updated_at: '2026-03-15T10:00:00+00:00',
              download_uri: 'https://data.scryfall.io/rulings/test.json',
              name: 'Rulings',
              size: 500,
            },
          ],
        }),
        text: async () => JSON.stringify({ data: [] }),
      } as Response;
    }

    // Scryfall oracle cards download
    if (url.includes('oracle-cards')) {
      if (!scryfallOk) return { ok: false, status: 500, text: async () => '{}' } as Response;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([
          {
            id: 'scryfall-uuid',
            oracle_id: 'oracle-001',
            name: 'Test Card',
            cmc: 1,
            type_line: 'Instant',
            oracle_text: 'Test text',
            colors: ['R'],
            color_identity: ['R'],
            keywords: [],
            rarity: 'common',
            set: 'tst',
            set_name: 'Test Set',
            legalities: { standard: 'legal' },
            layout: 'normal',
          },
        ]),
        json: async () => [],
      } as Response;
    }

    // Scryfall rulings download
    if (url.includes('rulings')) {
      if (!scryfallOk) return { ok: false, status: 500, text: async () => '{}' } as Response;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([]),
        json: async () => [],
      } as Response;
    }

    // Academy Ruins glossary (must be checked before /cr)
    if (url.includes('glossary')) {
      if (!rulesOk) return { ok: false, status: 500, json: async () => ({}) } as Response;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ term: 'Test', definition: 'A test term' }] }),
      } as Response;
    }

    // Academy Ruins CR
    if (url.includes('/cr')) {
      if (!rulesOk) return { ok: false, status: 500, json: async () => ({}) } as Response;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ ruleNumber: '100', ruleText: 'General' }] }),
      } as Response;
    }

    return { ok: false, status: 404, json: async () => ({}), text: async () => '{}' } as Response;
  }) as typeof fetch;
}

function makeMockSpellbookApi(ok: boolean = true): VariantsApi {
  return {
    variantsList: async (): Promise<PaginatedVariantList> => {
      if (!ok) throw new Error('Spellbook API unavailable');
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    },
  } as unknown as VariantsApi;
}

// --- Tests ---

describe('Pipeline Orchestrator', () => {
  let db: Database.Database;
  let tmpDir: string;

  beforeEach(() => {
    db = getDatabase(':memory:');
    tmpDir = `/tmp/mtg-oracle-pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('loadLastUpdate', () => {
    it('returns empty object when file does not exist', () => {
      const result = loadLastUpdate(tmpDir);
      expect(result).toEqual({});
    });

    it('loads existing last_update.json', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      const data: LastUpdate = { scryfall: '2026-03-15T00:00:00Z', rules: '2026-03-14T00:00:00Z' };
      fs.writeFileSync(path.join(tmpDir, 'last_update.json'), JSON.stringify(data));

      const result = loadLastUpdate(tmpDir);
      expect(result.scryfall).toBe('2026-03-15T00:00:00Z');
      expect(result.rules).toBe('2026-03-14T00:00:00Z');
    });
  });

  describe('saveLastUpdate', () => {
    it('creates directory and writes file', () => {
      const data: LastUpdate = { scryfall: '2026-03-15T00:00:00Z' };
      saveLastUpdate(data, tmpDir);

      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'last_update.json'), 'utf-8'));
      expect(content.scryfall).toBe('2026-03-15T00:00:00Z');
    });

    it('overwrites existing file', () => {
      saveLastUpdate({ scryfall: 'old' }, tmpDir);
      saveLastUpdate({ scryfall: 'new', rules: 'added' }, tmpDir);

      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'last_update.json'), 'utf-8'));
      expect(content.scryfall).toBe('new');
      expect(content.rules).toBe('added');
    });
  });

  describe('needsSpellbookRefresh', () => {
    it('returns true when no spellbook timestamp', () => {
      expect(needsSpellbookRefresh({})).toBe(true);
    });

    it('returns true when older than 7 days', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      expect(needsSpellbookRefresh({ spellbook: eightDaysAgo })).toBe(true);
    });

    it('returns false when newer than 7 days', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(needsSpellbookRefresh({ spellbook: oneDayAgo })).toBe(false);
    });
  });

  describe('isFirstRun', () => {
    it('returns true when all timestamps are missing', () => {
      expect(isFirstRun({})).toBe(true);
    });

    it('returns false when any timestamp exists', () => {
      expect(isFirstRun({ scryfall: '2026-03-15T00:00:00Z' })).toBe(false);
      expect(isFirstRun({ rules: '2026-03-15T00:00:00Z' })).toBe(false);
      expect(isFirstRun({ spellbook: '2026-03-15T00:00:00Z' })).toBe(false);
    });
  });

  describe('hasExistingData', () => {
    it('returns false for empty database', () => {
      expect(hasExistingData(db)).toBe(false);
    });

    it('returns true when cards exist', () => {
      db.prepare(`
        INSERT INTO cards (id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords, rarity, set_code, set_name)
        VALUES ('oracle-001', 'Test', '{R}', 1, 'Instant', 'test', '["R"]', '["R"]', '[]', 'common', 'tst', 'Test')
      `).run();

      expect(hasExistingData(db)).toBe(true);
    });
  });

  describe('runPipeline', () => {
    it('runs all pipelines successfully on first run', async () => {
      const result = await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({}),
        spellbookApi: makeMockSpellbookApi(),
      });

      expect(result.scryfall.success).toBe(true);
      expect(result.scryfall.updated).toBe(true);
      expect(result.rules.success).toBe(true);
      expect(result.spellbook.success).toBe(true);

      // Verify last_update.json was saved
      const lastUpdate = loadLastUpdate(tmpDir);
      expect(lastUpdate.scryfall).toBeDefined();
      expect(lastUpdate.rules).toBeDefined();
      expect(lastUpdate.spellbook).toBeDefined();
    });

    it('handles scryfall failure gracefully on subsequent run', async () => {
      // Simulate a prior successful run
      saveLastUpdate({ scryfall: '2026-03-14T00:00:00Z', rules: '2026-03-14T00:00:00Z', spellbook: new Date().toISOString() }, tmpDir);

      const result = await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({ scryfallOk: false }),
        spellbookApi: makeMockSpellbookApi(),
      });

      // Scryfall failed but others succeed
      expect(result.scryfall.success).toBe(false);
      expect(result.scryfall.error).toBeDefined();
      expect(result.rules.success).toBe(true);
    });

    it('handles rules failure gracefully on subsequent run', async () => {
      saveLastUpdate({ scryfall: '2026-03-14T00:00:00Z', rules: '2026-03-14T00:00:00Z', spellbook: new Date().toISOString() }, tmpDir);

      const result = await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({ rulesOk: false }),
        spellbookApi: makeMockSpellbookApi(),
      });

      expect(result.rules.success).toBe(false);
      expect(result.rules.error).toBeDefined();
      expect(result.scryfall.success).toBe(true);
    });

    it('handles spellbook failure gracefully on subsequent run', async () => {
      saveLastUpdate({ scryfall: '2026-03-14T00:00:00Z', rules: '2026-03-14T00:00:00Z' }, tmpDir);

      const result = await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({}),
        spellbookApi: makeMockSpellbookApi(false),
      });

      expect(result.spellbook.success).toBe(false);
      expect(result.spellbook.error).toBeDefined();
      // Others should succeed
      expect(result.scryfall.success).toBe(true);
      expect(result.rules.success).toBe(true);
    });

    it('throws when all sources fail on first run', async () => {
      await expect(
        runPipeline(db, {
          dataDir: tmpDir,
          fetchFn: makeMockFetch({ scryfallOk: false, rulesOk: false }),
          spellbookApi: makeMockSpellbookApi(false),
        }),
      ).rejects.toThrow('All data sources failed on first run');
    });

    it('does NOT throw when at least one source succeeds on first run', async () => {
      // Scryfall fails, but rules + spellbook succeed
      const result = await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({ scryfallOk: false }),
        spellbookApi: makeMockSpellbookApi(),
      });

      expect(result.scryfall.success).toBe(false);
      expect(result.rules.success).toBe(true);
      expect(result.spellbook.success).toBe(true);
    });

    it('skips spellbook when data is fresh', async () => {
      const recentTimestamp = new Date().toISOString();
      saveLastUpdate({ scryfall: '2026-03-14T00:00:00Z', spellbook: recentTimestamp }, tmpDir);

      let spellbookCalled = false;
      const mockApi = {
        variantsList: async () => {
          spellbookCalled = true;
          return { count: 0, next: null, previous: null, results: [] };
        },
      } as unknown as VariantsApi;

      await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({}),
        spellbookApi: mockApi,
      });

      expect(spellbookCalled).toBe(false);
    });

    it('forces refresh when forceRefresh is true', async () => {
      const recentTimestamp = new Date().toISOString();
      saveLastUpdate({
        scryfall: '2026-03-15T10:00:00+00:00',
        spellbook: recentTimestamp,
        rules: recentTimestamp,
      }, tmpDir);

      let spellbookCalled = false;
      const mockApi = {
        variantsList: async () => {
          spellbookCalled = true;
          return { count: 0, next: null, previous: null, results: [] };
        },
      } as unknown as VariantsApi;

      await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({}),
        spellbookApi: mockApi,
        forceRefresh: true,
      });

      expect(spellbookCalled).toBe(true);
    });

    it('saves updated timestamps after successful pipeline', async () => {
      await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({}),
        spellbookApi: makeMockSpellbookApi(),
      });

      const lastUpdate = loadLastUpdate(tmpDir);
      expect(lastUpdate.scryfall).toBe('2026-03-15T10:00:00+00:00');
      expect(lastUpdate.rules).toBeDefined();
      expect(lastUpdate.spellbook).toBeDefined();
    });

    it('preserves timestamps for failed sources', async () => {
      const originalTimestamp = '2026-03-10T00:00:00Z';
      saveLastUpdate({ scryfall: originalTimestamp, rules: originalTimestamp }, tmpDir);

      await runPipeline(db, {
        dataDir: tmpDir,
        fetchFn: makeMockFetch({ rulesOk: false }),
        spellbookApi: makeMockSpellbookApi(),
      });

      const lastUpdate = loadLastUpdate(tmpDir);
      // Rules timestamp should be preserved (not overwritten) since it failed
      expect(lastUpdate.rules).toBe(originalTimestamp);
      // Scryfall should be updated
      expect(lastUpdate.scryfall).toBe('2026-03-15T10:00:00+00:00');
    });
  });
});
