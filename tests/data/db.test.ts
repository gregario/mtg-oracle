import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  getDatabase,
  insertCard,
  insertCardFace,
  insertLegality,
  insertRuling,
  getCardById,
  getCardByName,
  getCardFaces,
  getCardLegalities,
  searchCards,
  getTableNames,
  type CardRow,
  type CardFaceRow,
  type LegalityRow,
  type RulingRow,
} from '../../src/data/db.js';

// --- Test fixtures ---

function makeLightningBolt(): CardRow {
  return {
    id: 'oracle-bolt-001',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    power: null,
    toughness: null,
    loyalty: null,
    colors: '["R"]',
    color_identity: '["R"]',
    keywords: '[]',
    rarity: 'common',
    set_code: 'lea',
    set_name: 'Limited Edition Alpha',
    released_at: '1993-08-05',
    image_uri: 'https://example.com/bolt.jpg',
    scryfall_uri: 'https://scryfall.com/card/lea/bolt',
    edhrec_rank: 5,
    artist: 'Christopher Rush',
  };
}

function makeTarmogoyfCard(): CardRow {
  return {
    id: 'oracle-goyf-001',
    name: 'Tarmogoyf',
    mana_cost: '{1}{G}',
    cmc: 2,
    type_line: 'Creature — Lhurgoyf',
    oracle_text: "Tarmogoyf's power is equal to the number of card types among cards in all graveyards and its toughness is equal to that number plus 1.",
    power: '*',
    toughness: '1+*',
    loyalty: null,
    colors: '["G"]',
    color_identity: '["G"]',
    keywords: '[]',
    rarity: 'mythic',
    set_code: 'fut',
    set_name: 'Future Sight',
    released_at: '2007-05-04',
    image_uri: null,
    scryfall_uri: null,
    edhrec_rank: null,
    artist: 'Ryan Barger',
  };
}

function makeDelverOfSecrets(): CardRow {
  return {
    id: 'oracle-delver-001',
    name: 'Delver of Secrets // Insectile Aberration',
    mana_cost: '{U}',
    cmc: 1,
    type_line: 'Creature — Human Wizard // Creature — Human Insect',
    oracle_text: 'At the beginning of your upkeep, look at the top card of your library. You may reveal that card. If an instant or sorcery card is revealed this way, transform Delver of Secrets.',
    power: '1',
    toughness: '1',
    loyalty: null,
    colors: '["U"]',
    color_identity: '["U"]',
    keywords: '["Transform"]',
    rarity: 'common',
    set_code: 'isd',
    set_name: 'Innistrad',
    released_at: '2011-09-30',
    image_uri: null,
    scryfall_uri: null,
    edhrec_rank: null,
    artist: 'Matt Stewart',
  };
}

// --- Tests ---

describe('Database Module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('Schema creation', () => {
    it('creates all 9 expected tables', () => {
      const tables = getTableNames(db);
      // Core tables (9 logical tables)
      const coreTables = ['cards', 'card_faces', 'legalities', 'rulings', 'rules', 'glossary', 'keywords', 'combos'];
      for (const t of coreTables) {
        expect(tables).toContain(t);
      }
      // FTS5 virtual table
      expect(tables).toContain('cards_fts');
      // FTS5 creates internal shadow tables (cards_fts_config, cards_fts_data, etc.)
      expect(tables.filter(t => t.startsWith('cards_fts')).length).toBeGreaterThanOrEqual(2);
    });

    it('schema is idempotent — calling getDatabase twice works', () => {
      // The second call should not throw even though tables already exist
      const db2 = getDatabase(':memory:');
      const tables = getTableNames(db2);
      expect(tables).toContain('cards');
      expect(tables).toContain('combos');
      db2.close();
    });

    it('has foreign keys enabled', () => {
      const result = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
      expect(result[0].foreign_keys).toBe(1);
    });
  });

  describe('Card CRUD', () => {
    it('inserts and retrieves a card by ID', () => {
      const bolt = makeLightningBolt();
      insertCard(db, bolt);

      const result = getCardById(db, 'oracle-bolt-001');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Lightning Bolt');
      expect(result!.cmc).toBe(1);
      expect(result!.mana_cost).toBe('{R}');
      expect(result!.oracle_text).toBe('Lightning Bolt deals 3 damage to any target.');
    });

    it('retrieves a card by exact name', () => {
      insertCard(db, makeLightningBolt());

      const result = getCardByName(db, 'Lightning Bolt');
      expect(result).toBeDefined();
      expect(result!.id).toBe('oracle-bolt-001');
    });

    it('returns undefined for non-existent card', () => {
      const result = getCardById(db, 'does-not-exist');
      expect(result).toBeUndefined();
    });

    it('upserts a card with INSERT OR REPLACE', () => {
      const bolt = makeLightningBolt();
      insertCard(db, bolt);

      // Update the artist
      const updated = { ...bolt, artist: 'New Artist' };
      insertCard(db, updated);

      const result = getCardById(db, 'oracle-bolt-001');
      expect(result!.artist).toBe('New Artist');

      // Only one row should exist
      const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
      expect(count.cnt).toBe(1);
    });

    it('handles null fields correctly', () => {
      const goyf = makeTarmogoyfCard();
      insertCard(db, goyf);

      const result = getCardById(db, 'oracle-goyf-001');
      expect(result!.image_uri).toBeNull();
      expect(result!.scryfall_uri).toBeNull();
      expect(result!.edhrec_rank).toBeNull();
      expect(result!.loyalty).toBeNull();
    });

    it('stores and retrieves multiple cards', () => {
      insertCard(db, makeLightningBolt());
      insertCard(db, makeTarmogoyfCard());
      insertCard(db, makeDelverOfSecrets());

      const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
      expect(count.cnt).toBe(3);
    });
  });

  describe('Card faces (multi-face cards)', () => {
    it('inserts and retrieves card faces', () => {
      const delver = makeDelverOfSecrets();
      insertCard(db, delver);

      const frontFace: CardFaceRow = {
        card_id: delver.id,
        face_index: 0,
        name: 'Delver of Secrets',
        mana_cost: '{U}',
        type_line: 'Creature — Human Wizard',
        oracle_text: 'At the beginning of your upkeep, look at the top card of your library. You may reveal that card. If an instant or sorcery card is revealed this way, transform Delver of Secrets.',
        power: '1',
        toughness: '1',
        colors: '["U"]',
      };

      const backFace: CardFaceRow = {
        card_id: delver.id,
        face_index: 1,
        name: 'Insectile Aberration',
        mana_cost: null,
        type_line: 'Creature — Human Insect',
        oracle_text: 'Flying',
        power: '3',
        toughness: '2',
        colors: '["U"]',
      };

      insertCardFace(db, frontFace);
      insertCardFace(db, backFace);

      const faces = getCardFaces(db, delver.id);
      expect(faces).toHaveLength(2);
      expect(faces[0].name).toBe('Delver of Secrets');
      expect(faces[0].face_index).toBe(0);
      expect(faces[1].name).toBe('Insectile Aberration');
      expect(faces[1].face_index).toBe(1);
      expect(faces[1].power).toBe('3');
    });
  });

  describe('Legalities', () => {
    it('inserts and queries legalities for a card', () => {
      insertCard(db, makeLightningBolt());

      const legalities: LegalityRow[] = [
        { card_id: 'oracle-bolt-001', format: 'modern', status: 'legal' },
        { card_id: 'oracle-bolt-001', format: 'standard', status: 'not_legal' },
        { card_id: 'oracle-bolt-001', format: 'legacy', status: 'legal' },
        { card_id: 'oracle-bolt-001', format: 'commander', status: 'legal' },
      ];

      for (const l of legalities) {
        insertLegality(db, l);
      }

      const results = getCardLegalities(db, 'oracle-bolt-001');
      expect(results).toHaveLength(4);

      const modern = results.find(r => r.format === 'modern');
      expect(modern!.status).toBe('legal');

      const standard = results.find(r => r.format === 'standard');
      expect(standard!.status).toBe('not_legal');
    });

    it('upserts legality with INSERT OR REPLACE', () => {
      insertCard(db, makeLightningBolt());
      insertLegality(db, { card_id: 'oracle-bolt-001', format: 'modern', status: 'legal' });
      insertLegality(db, { card_id: 'oracle-bolt-001', format: 'modern', status: 'banned' });

      const results = getCardLegalities(db, 'oracle-bolt-001');
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('banned');
    });
  });

  describe('Rulings', () => {
    it('inserts and retrieves rulings', () => {
      insertCard(db, makeLightningBolt());

      const ruling: RulingRow = {
        card_id: 'oracle-bolt-001',
        source: 'wotc',
        published_at: '2023-01-01',
        comment: 'Lightning Bolt can target any target, including planeswalkers.',
      };
      insertRuling(db, ruling);

      const results = db.prepare('SELECT * FROM rulings WHERE card_id = ?').all('oracle-bolt-001') as RulingRow[];
      expect(results).toHaveLength(1);
      expect(results[0].comment).toContain('planeswalkers');
    });
  });

  describe('FTS5 full-text search', () => {
    beforeEach(() => {
      insertCard(db, makeLightningBolt());
      insertCard(db, makeTarmogoyfCard());
      insertCard(db, makeDelverOfSecrets());
    });

    it('finds cards by name', () => {
      const results = searchCards(db, 'Lightning');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('Lightning Bolt');
    });

    it('finds cards by oracle text', () => {
      const results = searchCards(db, 'damage');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('Lightning Bolt');
    });

    it('finds cards by type line', () => {
      const results = searchCards(db, 'Lhurgoyf');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('Tarmogoyf');
    });

    it('finds cards with partial word using prefix query', () => {
      const results = searchCards(db, 'Light*');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('Lightning Bolt');
    });

    it('respects the limit parameter', () => {
      const results = searchCards(db, 'Creature OR Instant', 1);
      expect(results).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      const results = searchCards(db, 'Planeswalker');
      expect(results).toHaveLength(0);
    });

    it('FTS index stays in sync after upsert', () => {
      // Update Lightning Bolt's oracle text
      const bolt = makeLightningBolt();
      bolt.oracle_text = 'Lightning Bolt deals 5 damage to any target.';
      insertCard(db, bolt);

      const results = searchCards(db, '5 damage');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Rules, Glossary, and Keywords tables', () => {
    it('inserts and retrieves rules', () => {
      db.prepare('INSERT INTO rules (section, title, text, parent_section) VALUES (?, ?, ?, ?)').run(
        '100.1', 'General', 'This is a rule about the game.', '100'
      );

      const row = db.prepare('SELECT * FROM rules WHERE section = ?').get('100.1') as { section: string; title: string; text: string };
      expect(row.title).toBe('General');
      expect(row.text).toBe('This is a rule about the game.');
    });

    it('inserts and retrieves glossary entries', () => {
      db.prepare('INSERT INTO glossary (term, definition) VALUES (?, ?)').run(
        'Trample', 'A keyword ability that modifies how a creature assigns combat damage.'
      );

      const row = db.prepare('SELECT * FROM glossary WHERE term = ?').get('Trample') as { term: string; definition: string };
      expect(row.definition).toContain('combat damage');
    });

    it('inserts and retrieves keywords', () => {
      db.prepare('INSERT INTO keywords (name, section, type, rules_text) VALUES (?, ?, ?, ?)').run(
        'Flying', '702.9', 'evasion', 'This creature can only be blocked by creatures with flying or reach.'
      );

      const row = db.prepare('SELECT * FROM keywords WHERE name = ?').get('Flying') as { name: string; section: string; type: string };
      expect(row.section).toBe('702.9');
      expect(row.type).toBe('evasion');
    });
  });

  describe('Combos table', () => {
    it('inserts and retrieves a combo', () => {
      db.prepare(`
        INSERT INTO combos (id, cards, color_identity, prerequisites, steps, results, legality, popularity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'combo-001',
        '["Thassa\'s Oracle","Demonic Consultation"]',
        '["U","B"]',
        'Both cards in hand, UUB available',
        '1. Cast Demonic Consultation naming a card not in your deck. 2. Cast Thassa\'s Oracle.',
        'Win the game',
        '{"commander":"legal","legacy":"legal"}',
        9500
      );

      const row = db.prepare('SELECT * FROM combos WHERE id = ?').get('combo-001') as { id: string; cards: string; popularity: number };
      expect(row.id).toBe('combo-001');
      expect(JSON.parse(row.cards)).toEqual(["Thassa's Oracle", "Demonic Consultation"]);
      expect(row.popularity).toBe(9500);
    });
  });

  describe('Data directory creation', () => {
    it('creates data directory for file-based database', () => {
      const tmpDir = `/tmp/mtg-oracle-test-${Date.now()}`;
      try {
        const fileDb = getDatabase(tmpDir);
        const tables = getTableNames(fileDb);
        expect(tables).toContain('cards');
        fileDb.close();

        // Verify the directory and database file exist
        expect(fs.existsSync(tmpDir)).toBe(true);
        expect(fs.existsSync(`${tmpDir}/cards.sqlite`)).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
