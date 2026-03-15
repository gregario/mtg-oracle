import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { getDatabase } from '../../src/data/db.js';
import {
  fetchBulkDataMetadata,
  findBulkEntry,
  downloadBulkFile,
  ingestCards,
  ingestRulings,
  runScryfallPipeline,
  type BulkDataEntry,
  type ScryfallCard,
  type ScryfallRuling,
} from '../../src/data/scryfall.js';

// --- Mock helpers ---

function mockFetch(responses: Record<string, { status: number; body: unknown }>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const match = Object.entries(responses).find(([pattern]) => url.includes(pattern));
    if (!match) {
      return { ok: false, status: 404, text: async () => 'Not found', json: async () => ({}) } as Response;
    }
    const [, resp] = match;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => JSON.stringify(resp.body),
      json: async () => resp.body,
    } as Response;
  }) as typeof fetch;
}

function makeBulkDataResponse(): { data: BulkDataEntry[] } {
  return {
    data: [
      {
        id: 'bulk-oracle',
        type: 'oracle_cards',
        updated_at: '2026-03-15T10:00:00+00:00',
        download_uri: 'https://data.scryfall.io/oracle-cards/oracle-cards-20260315.json',
        name: 'Oracle Cards',
        size: 80000000,
      },
      {
        id: 'bulk-rulings',
        type: 'rulings',
        updated_at: '2026-03-15T10:00:00+00:00',
        download_uri: 'https://data.scryfall.io/rulings/rulings-20260315.json',
        name: 'Rulings',
        size: 5000000,
      },
    ],
  };
}

function makeSingleFaceCard(): ScryfallCard {
  return {
    id: 'scryfall-bolt-uuid',
    oracle_id: 'oracle-bolt-001',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    power: undefined,
    toughness: undefined,
    colors: ['R'],
    color_identity: ['R'],
    keywords: [],
    rarity: 'common',
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    released_at: '1993-08-05',
    image_uris: { normal: 'https://example.com/bolt.jpg' },
    scryfall_uri: 'https://scryfall.com/card/lea/bolt',
    edhrec_rank: 5,
    artist: 'Christopher Rush',
    legalities: {
      standard: 'not_legal',
      modern: 'legal',
      legacy: 'legal',
      commander: 'legal',
    },
    layout: 'normal',
  };
}

function makeMultiFaceCard(): ScryfallCard {
  return {
    id: 'scryfall-delver-uuid',
    oracle_id: 'oracle-delver-001',
    name: 'Delver of Secrets // Insectile Aberration',
    cmc: 1,
    type_line: 'Creature — Human Wizard // Creature — Human Insect',
    colors: ['U'],
    color_identity: ['U'],
    keywords: ['Transform'],
    rarity: 'common',
    set: 'isd',
    set_name: 'Innistrad',
    released_at: '2011-09-30',
    scryfall_uri: 'https://scryfall.com/card/isd/delver',
    edhrec_rank: 200,
    artist: 'Matt Stewart',
    legalities: {
      standard: 'not_legal',
      modern: 'legal',
      legacy: 'legal',
    },
    layout: 'transform',
    card_faces: [
      {
        name: 'Delver of Secrets',
        mana_cost: '{U}',
        type_line: 'Creature — Human Wizard',
        oracle_text: 'At the beginning of your upkeep, look at the top card of your library.',
        power: '1',
        toughness: '1',
        colors: ['U'],
        image_uris: { normal: 'https://example.com/delver-front.jpg' },
      },
      {
        name: 'Insectile Aberration',
        mana_cost: '',
        type_line: 'Creature — Human Insect',
        oracle_text: 'Flying',
        power: '3',
        toughness: '2',
        colors: ['U'],
        image_uris: { normal: 'https://example.com/delver-back.jpg' },
      },
    ],
  };
}

function makeSampleRulings(): ScryfallRuling[] {
  return [
    {
      oracle_id: 'oracle-bolt-001',
      source: 'wotc',
      published_at: '2023-01-01',
      comment: 'Lightning Bolt can target any target.',
    },
    {
      oracle_id: 'oracle-bolt-001',
      source: 'scryfall',
      published_at: '2023-06-15',
      comment: 'This includes planeswalkers and battles.',
    },
    {
      oracle_id: 'oracle-delver-001',
      source: 'wotc',
      published_at: '2023-01-01',
      comment: 'Delver transforms only if the top card is an instant or sorcery.',
    },
  ];
}

// --- Tests ---

describe('Scryfall Pipeline', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('fetchBulkDataMetadata', () => {
    it('fetches and parses bulk data entries', async () => {
      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: makeBulkDataResponse() },
      });

      const entries = await fetchBulkDataMetadata(fetchFn);
      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('oracle_cards');
      expect(entries[1].type).toBe('rulings');
    });

    it('throws on non-200 response', async () => {
      const fetchFn = mockFetch({
        'bulk-data': { status: 500, body: {} },
      });

      await expect(fetchBulkDataMetadata(fetchFn)).rejects.toThrow('500');
    });
  });

  describe('findBulkEntry', () => {
    it('finds entry by type', () => {
      const entries = makeBulkDataResponse().data;
      const oracle = findBulkEntry(entries, 'oracle_cards');
      expect(oracle).toBeDefined();
      expect(oracle!.download_uri).toContain('oracle-cards');
    });

    it('returns undefined for missing type', () => {
      const entries = makeBulkDataResponse().data;
      expect(findBulkEntry(entries, 'nonexistent')).toBeUndefined();
    });
  });

  describe('downloadBulkFile', () => {
    it('downloads and parses JSON', async () => {
      const testData = [{ id: '1' }, { id: '2' }];
      const fetchFn = mockFetch({
        'oracle-cards': { status: 200, body: testData },
      });

      const result = await downloadBulkFile<typeof testData>(
        'https://data.scryfall.io/oracle-cards/test.json',
        'test',
        fetchFn,
      );
      expect(result).toEqual(testData);
    });

    it('throws on download failure', async () => {
      const fetchFn = mockFetch({
        'oracle-cards': { status: 503, body: {} },
      });

      await expect(
        downloadBulkFile('https://data.scryfall.io/oracle-cards/test.json', 'test', fetchFn),
      ).rejects.toThrow('503');
    });
  });

  describe('ingestCards', () => {
    it('ingests a single-face card', () => {
      const result = ingestCards(db, [makeSingleFaceCard()]);
      expect(result.cardsInserted).toBe(1);
      expect(result.facesInserted).toBe(0);

      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get('oracle-bolt-001') as Record<string, unknown>;
      expect(card.name).toBe('Lightning Bolt');
      expect(card.mana_cost).toBe('{R}');
      expect(JSON.parse(card.colors as string)).toEqual(['R']);
      expect(JSON.parse(card.keywords as string)).toEqual([]);
    });

    it('ingests a multi-face card with faces', () => {
      const result = ingestCards(db, [makeMultiFaceCard()]);
      expect(result.cardsInserted).toBe(1);
      expect(result.facesInserted).toBe(2);

      const faces = db.prepare('SELECT * FROM card_faces WHERE card_id = ? ORDER BY face_index').all('oracle-delver-001') as Array<Record<string, unknown>>;
      expect(faces).toHaveLength(2);
      expect(faces[0].name).toBe('Delver of Secrets');
      expect(faces[1].name).toBe('Insectile Aberration');
      expect(faces[1].power).toBe('3');
    });

    it('ingests legalities for each card', () => {
      const result = ingestCards(db, [makeSingleFaceCard()]);
      expect(result.legalitiesInserted).toBe(4);

      const legalities = db.prepare('SELECT * FROM legalities WHERE card_id = ?').all('oracle-bolt-001') as Array<Record<string, unknown>>;
      expect(legalities).toHaveLength(4);
      const modern = legalities.find(l => l.format === 'modern');
      expect(modern!.status).toBe('legal');
    });

    it('handles batch of multiple cards', () => {
      const cards = [makeSingleFaceCard(), makeMultiFaceCard()];
      const result = ingestCards(db, cards);
      expect(result.cardsInserted).toBe(2);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
      expect(count.cnt).toBe(2);
    });

    it('uses oracle_id as primary key', () => {
      const card = makeSingleFaceCard();
      ingestCards(db, [card]);

      const row = db.prepare('SELECT id FROM cards').get() as { id: string };
      expect(row.id).toBe('oracle-bolt-001');  // oracle_id, not scryfall id
    });

    it('falls back to card.id when oracle_id is missing', () => {
      const card = makeSingleFaceCard();
      delete (card as Partial<ScryfallCard>).oracle_id;
      ingestCards(db, [card]);

      const row = db.prepare('SELECT id FROM cards').get() as { id: string };
      expect(row.id).toBe('scryfall-bolt-uuid');
    });

    it('populates FTS5 index via trigger', () => {
      ingestCards(db, [makeSingleFaceCard()]);

      const results = db.prepare(
        "SELECT name FROM cards_fts WHERE cards_fts MATCH 'Lightning'"
      ).all() as Array<{ name: string }>;
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Lightning Bolt');
    });

    it('gets image_uri from card_faces when top-level is missing', () => {
      const card = makeMultiFaceCard();
      // Multi-face cards typically don't have top-level image_uris
      ingestCards(db, [card]);

      const row = db.prepare('SELECT image_uri FROM cards WHERE id = ?').get('oracle-delver-001') as { image_uri: string };
      expect(row.image_uri).toBe('https://example.com/delver-front.jpg');
    });
  });

  describe('ingestRulings', () => {
    it('ingests rulings linked to cards', () => {
      // Insert cards first (foreign key constraint)
      ingestCards(db, [makeSingleFaceCard(), makeMultiFaceCard()]);

      const count = ingestRulings(db, makeSampleRulings());
      expect(count).toBe(3);

      const boltRulings = db.prepare('SELECT * FROM rulings WHERE card_id = ?').all('oracle-bolt-001') as Array<Record<string, unknown>>;
      expect(boltRulings).toHaveLength(2);
      expect(boltRulings[0].source).toBe('wotc');
      expect(boltRulings[1].source).toBe('scryfall');
    });
  });

  describe('runScryfallPipeline', () => {
    it('downloads and ingests all data on first run', async () => {
      const cards = [makeSingleFaceCard(), makeMultiFaceCard()];
      const rulings = makeSampleRulings();

      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: makeBulkDataResponse() },
        'oracle-cards': { status: 200, body: cards },
        'rulings': { status: 200, body: rulings },
      });

      const result = await runScryfallPipeline(db, null, fetchFn);
      expect(result.updated).toBe(true);
      expect(result.updatedAt).toBe('2026-03-15T10:00:00+00:00');

      const cardCount = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
      expect(cardCount.cnt).toBe(2);

      const rulingCount = db.prepare('SELECT COUNT(*) as cnt FROM rulings').get() as { cnt: number };
      expect(rulingCount.cnt).toBe(3);
    });

    it('skips download when data is up-to-date', async () => {
      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: makeBulkDataResponse() },
      });

      const result = await runScryfallPipeline(
        db,
        '2026-03-15T10:00:00+00:00',  // same as updated_at
        fetchFn,
      );
      expect(result.updated).toBe(false);
    });

    it('downloads when lastUpdated is older', async () => {
      const cards = [makeSingleFaceCard()];
      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: makeBulkDataResponse() },
        'oracle-cards': { status: 200, body: cards },
        'rulings': { status: 200, body: [] },
      });

      const result = await runScryfallPipeline(
        db,
        '2026-03-14T00:00:00+00:00',  // older than updated_at
        fetchFn,
      );
      expect(result.updated).toBe(true);
    });

    it('throws when oracle_cards entry is missing from metadata', async () => {
      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: { data: [{ type: 'other', updated_at: '', download_uri: '', id: '', name: '', size: 0 }] } },
      });

      await expect(runScryfallPipeline(db, null, fetchFn)).rejects.toThrow('oracle_cards');
    });

    it('clears old data before re-ingesting', async () => {
      // Insert some data first
      ingestCards(db, [makeSingleFaceCard()]);
      const initialCount = (db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number }).cnt;
      expect(initialCount).toBe(1);

      // Re-run pipeline with different data
      const newCard: ScryfallCard = {
        ...makeSingleFaceCard(),
        oracle_id: 'oracle-new-001',
        name: 'Shock',
        legalities: {},
      };

      const fetchFn = mockFetch({
        'bulk-data': { status: 200, body: makeBulkDataResponse() },
        'oracle-cards': { status: 200, body: [newCard] },
        'rulings': { status: 200, body: [] },
      });

      await runScryfallPipeline(db, null, fetchFn);

      const finalCount = (db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number }).cnt;
      expect(finalCount).toBe(1);
      const card = db.prepare('SELECT name FROM cards').get() as { name: string };
      expect(card.name).toBe('Shock');
    });
  });
});
