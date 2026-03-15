import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { getDatabase } from '../../src/data/db.js';
import {
  variantToCombo,
  ingestCombos,
  runSpellbookPipeline,
  type ComboData,
} from '../../src/data/spellbook.js';
import type { VariantsApi } from '@space-cow-media/spellbook-client';
import type { Variant, PaginatedVariantList } from '@space-cow-media/spellbook-client';

// --- Mock helpers ---

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 'variant-001',
    status: 'OK' as never,
    uses: [
      {
        card: { id: 1, name: "Thassa's Oracle", oracleId: 'oracle-thassa', spoiler: false },
        zoneLocations: ['HAND'],
        battlefieldCardState: '',
        exileCardState: '',
        libraryCardState: '',
        graveyardCardState: '',
        mustBeCommander: false,
        quantity: 1,
      },
      {
        card: { id: 2, name: 'Demonic Consultation', oracleId: 'oracle-demcon', spoiler: false },
        zoneLocations: ['HAND'],
        battlefieldCardState: '',
        exileCardState: '',
        libraryCardState: '',
        graveyardCardState: '',
        mustBeCommander: false,
        quantity: 1,
      },
    ] as never,
    requires: [],
    produces: [
      {
        feature: { id: 1, name: 'Win the game', description: '', uncountable: false },
        quantity: 1,
      },
    ] as never,
    of: [],
    includes: [],
    identity: ['U', 'B'] as never,
    manaNeeded: '{U}{U}{B}',
    manaValueNeeded: 3,
    easyPrerequisites: 'Both cards in hand',
    notablePrerequisites: '',
    // No otherPrerequisites field on the SDK Variant type
    description: '1. Cast Demonic Consultation naming a card not in your deck.\n2. Cast Thassa\'s Oracle.',
    notes: '',
    popularity: 9500,
    spoiler: false,
    bracketTag: 4 as never,
    legalities: {
      commander: true,
      pauperCommanderMain: false,
      pauperCommander: false,
      oathbreaker: true,
      predh: false,
      brawl: false,
      vintage: true,
      legacy: true,
      premodern: false,
      modern: false,
      pioneer: false,
      standard: false,
      pauper: false,
    },
    prices: { cardkingdom: 0, tcgplayer: 0 } as never,
    variantCount: 1,
    ...overrides,
  } as Variant;
}

function makeMockApi(pages: Variant[][]): VariantsApi {
  let callCount = 0;
  return {
    variantsList: async (params?: { limit?: number; offset?: number }): Promise<PaginatedVariantList> => {
      const pageIndex = callCount;
      callCount++;
      const results = pages[pageIndex] ?? [];
      const hasMore = pageIndex < pages.length - 1;
      return {
        count: pages.reduce((sum, p) => sum + p.length, 0),
        next: hasMore ? 'http://next' : null,
        previous: null,
        results,
      };
    },
  } as unknown as VariantsApi;
}

// --- Tests ---

describe('Spellbook Pipeline', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('variantToCombo', () => {
    it('converts a variant to ComboData', () => {
      const variant = makeVariant();
      const combo = variantToCombo(variant);

      expect(combo.id).toBe('variant-001');
      expect(combo.cards).toEqual(["Thassa's Oracle", 'Demonic Consultation']);
      expect(combo.colorIdentity).toEqual(['U', 'B']);
      expect(combo.steps).toContain('Cast Demonic Consultation');
      expect(combo.results).toBe('Win the game');
      expect(combo.popularity).toBe(9500);
    });

    it('converts legalities to a record', () => {
      const combo = variantToCombo(makeVariant());
      expect(combo.legality.commander).toBe(true);
      expect(combo.legality.modern).toBe(false);
      expect(combo.legality.legacy).toBe(true);
    });

    it('combines prerequisites', () => {
      const combo = variantToCombo(makeVariant());
      expect(combo.prerequisites).toContain('Both cards in hand');
    });

    it('handles variant with no produces', () => {
      const variant = makeVariant({ produces: [] as never });
      const combo = variantToCombo(variant);
      expect(combo.results).toBe('');
    });

    it('handles null popularity', () => {
      const variant = makeVariant({ popularity: null as never });
      const combo = variantToCombo(variant);
      expect(combo.popularity).toBeNull();
    });
  });

  describe('ingestCombos', () => {
    it('inserts combos into the database', () => {
      const combos: ComboData[] = [
        {
          id: 'combo-001',
          cards: ["Thassa's Oracle", 'Demonic Consultation'],
          colorIdentity: ['U', 'B'],
          prerequisites: 'Both cards in hand, UUB available',
          steps: 'Cast Demonic Consultation then Thassa\'s Oracle',
          results: 'Win the game',
          legality: { commander: true, legacy: true },
          popularity: 9500,
        },
      ];

      const count = ingestCombos(db, combos);
      expect(count).toBe(1);

      const row = db.prepare('SELECT * FROM combos WHERE id = ?').get('combo-001') as Record<string, unknown>;
      expect(JSON.parse(row.cards as string)).toEqual(["Thassa's Oracle", 'Demonic Consultation']);
      expect(JSON.parse(row.color_identity as string)).toEqual(['U', 'B']);
      expect(row.popularity).toBe(9500);
    });

    it('handles batch of multiple combos', () => {
      const combos: ComboData[] = Array.from({ length: 5 }, (_, i) => ({
        id: `combo-${i}`,
        cards: [`Card A ${i}`, `Card B ${i}`],
        colorIdentity: ['W'],
        prerequisites: 'prereq',
        steps: 'steps',
        results: 'results',
        legality: {},
        popularity: i * 100,
      }));

      const count = ingestCombos(db, combos);
      expect(count).toBe(5);

      const dbCount = db.prepare('SELECT COUNT(*) as cnt FROM combos').get() as { cnt: number };
      expect(dbCount.cnt).toBe(5);
    });

    it('upserts combos with INSERT OR REPLACE', () => {
      const combo: ComboData = {
        id: 'combo-001',
        cards: ['A', 'B'],
        colorIdentity: ['W'],
        prerequisites: 'original',
        steps: 'steps',
        results: 'results',
        legality: {},
        popularity: 100,
      };

      ingestCombos(db, [combo]);
      ingestCombos(db, [{ ...combo, prerequisites: 'updated' }]);

      const row = db.prepare('SELECT prerequisites FROM combos WHERE id = ?').get('combo-001') as { prerequisites: string };
      expect(row.prerequisites).toBe('updated');

      const cnt = db.prepare('SELECT COUNT(*) as cnt FROM combos').get() as { cnt: number };
      expect(cnt.cnt).toBe(1);
    });
  });

  describe('runSpellbookPipeline', () => {
    it('fetches and ingests combos from paginated API', async () => {
      const variant1 = makeVariant({ id: 'v-001' });
      const variant2 = makeVariant({ id: 'v-002' });

      const api = makeMockApi([[variant1, variant2]]);

      const result = await runSpellbookPipeline(db, api);
      expect(result.combosInserted).toBe(2);

      const dbCount = db.prepare('SELECT COUNT(*) as cnt FROM combos').get() as { cnt: number };
      expect(dbCount.cnt).toBe(2);
    });

    it('handles multiple pages', async () => {
      const page1 = [makeVariant({ id: 'v-001' }), makeVariant({ id: 'v-002' })];
      const page2 = [makeVariant({ id: 'v-003' })];

      const api = makeMockApi([page1, page2]);

      const result = await runSpellbookPipeline(db, api);
      expect(result.combosInserted).toBe(3);
    });

    it('handles empty response', async () => {
      const api = makeMockApi([[]]);
      const result = await runSpellbookPipeline(db, api);
      expect(result.combosInserted).toBe(0);
    });

    it('clears existing combos before re-ingesting', async () => {
      // Pre-populate
      db.prepare("INSERT INTO combos (id, cards, prerequisites, steps, results) VALUES ('old', '[\"A\"]', '', '', '')").run();

      const api = makeMockApi([[makeVariant({ id: 'new-001' })]]);
      await runSpellbookPipeline(db, api);

      const oldRow = db.prepare('SELECT * FROM combos WHERE id = ?').get('old');
      expect(oldRow).toBeUndefined();

      const newRow = db.prepare('SELECT * FROM combos WHERE id = ?').get('new-001');
      expect(newRow).toBeDefined();
    });
  });
});
