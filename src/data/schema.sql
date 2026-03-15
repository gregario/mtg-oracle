-- Core card data (one row per card, not per printing)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,           -- Scryfall oracle_id
  name TEXT NOT NULL,
  mana_cost TEXT,
  cmc REAL,
  type_line TEXT,
  oracle_text TEXT,
  power TEXT,
  toughness TEXT,
  loyalty TEXT,
  colors TEXT,                   -- JSON array: ["W","U"]
  color_identity TEXT,           -- JSON array: ["W","U","B"]
  keywords TEXT,                 -- JSON array: ["Flying","Trample"]
  rarity TEXT,
  set_code TEXT,
  set_name TEXT,
  released_at TEXT,
  image_uri TEXT,
  scryfall_uri TEXT,
  edhrec_rank INTEGER,
  artist TEXT,
  price_usd REAL,
  price_usd_foil REAL,
  price_eur REAL,
  price_eur_foil REAL,
  price_tix REAL
);

CREATE TABLE IF NOT EXISTS card_faces (
  card_id TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  mana_cost TEXT,
  type_line TEXT,
  oracle_text TEXT,
  power TEXT,
  toughness TEXT,
  colors TEXT,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS legalities (
  card_id TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (card_id, format),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS rulings (
  card_id TEXT NOT NULL,
  source TEXT,
  published_at TEXT,
  comment TEXT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  name, type_line, oracle_text,
  content='cards',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync with cards table
CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid, name, type_line, oracle_text)
  VALUES (new.rowid, new.name, new.type_line, new.oracle_text);
END;

CREATE TRIGGER IF NOT EXISTS cards_ad AFTER DELETE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, type_line, oracle_text)
  VALUES ('delete', old.rowid, old.name, old.type_line, old.oracle_text);
END;

CREATE TRIGGER IF NOT EXISTS cards_au AFTER UPDATE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, type_line, oracle_text)
  VALUES ('delete', old.rowid, old.name, old.type_line, old.oracle_text);
  INSERT INTO cards_fts(rowid, name, type_line, oracle_text)
  VALUES (new.rowid, new.name, new.type_line, new.oracle_text);
END;

CREATE TABLE IF NOT EXISTS rules (
  section TEXT PRIMARY KEY,
  title TEXT,
  text TEXT NOT NULL,
  parent_section TEXT
);

CREATE TABLE IF NOT EXISTS glossary (
  term TEXT PRIMARY KEY,
  definition TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keywords (
  name TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  type TEXT NOT NULL,
  rules_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS combos (
  id TEXT PRIMARY KEY,
  cards TEXT NOT NULL,            -- JSON array of card names
  color_identity TEXT,            -- JSON array: ["W","U","B"]
  prerequisites TEXT,
  steps TEXT,
  results TEXT,
  legality TEXT,                  -- JSON object: {"commander": "legal", ...}
  popularity INTEGER
);
