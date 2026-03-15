## ADDED Requirements

### Requirement: Runtime data directory
The system SHALL create and manage a data directory at `~/.mtg-oracle/` for storing the SQLite database (`cards.sqlite`) and update metadata (`last_update.json`).

#### Scenario: First run with no data directory
- **WHEN** the server starts and `~/.mtg-oracle/` does not exist
- **THEN** the system SHALL create the directory and proceed to initial data download

#### Scenario: Data directory already exists
- **WHEN** the server starts and `~/.mtg-oracle/` exists with `cards.sqlite`
- **THEN** the system SHALL check for updates without re-creating the directory

### Requirement: Scryfall bulk data download
The system SHALL download the Scryfall `oracle_cards` and `rulings` bulk data files on first run when no local database exists, and check for updates on subsequent runs.

#### Scenario: First run downloads card data
- **WHEN** the server starts and no `cards.sqlite` exists
- **THEN** the system SHALL fetch the Scryfall bulk-data metadata endpoint (`https://api.scryfall.com/bulk-data`), download the `oracle_cards` JSON file, and ingest it into SQLite

#### Scenario: First run downloads rulings
- **WHEN** the server starts and no `cards.sqlite` exists
- **THEN** the system SHALL fetch the Scryfall `rulings` bulk data and ingest it into the rulings table

#### Scenario: Download progress indication
- **WHEN** a bulk data download is in progress
- **THEN** the system SHALL log progress information to stderr

### Requirement: Scryfall SQLite ingestion
The system SHALL parse the Scryfall oracle_cards JSON and insert records into the SQLite database with tables for cards, card_faces, legalities, rulings, and a cards_fts FTS5 virtual table.

#### Scenario: Card data ingestion
- **WHEN** the oracle_cards JSON has been downloaded
- **THEN** the system SHALL create all tables and insert one row per card into the `cards` table, with colors, color_identity, and keywords stored as JSON arrays

#### Scenario: Multi-face card ingestion
- **WHEN** a card has multiple faces (DFC, split, adventure)
- **THEN** the system SHALL insert face data into the `card_faces` table with correct face_index ordering

#### Scenario: Legality ingestion
- **WHEN** card data includes legalities
- **THEN** the system SHALL insert one row per card per format into the `legalities` table with status values (legal, not_legal, banned, restricted)

#### Scenario: Rulings ingestion
- **WHEN** the rulings JSON has been downloaded
- **THEN** the system SHALL insert rulings into the `rulings` table with card_id, source (wotc/scryfall), published_at, and comment

#### Scenario: FTS5 index creation
- **WHEN** ingestion completes
- **THEN** the system SHALL populate the `cards_fts` FTS5 virtual table with card name, type_line, and oracle_text for full-text search

### Requirement: Academy Ruins comprehensive rules download
The system SHALL download comprehensive rules from the Academy Ruins API and store them in SQLite.

#### Scenario: Rules download
- **WHEN** the server starts and no rules data exists in the database
- **THEN** the system SHALL fetch `https://api.academyruins.com/cr` for structured rules JSON and parse sections/subsections into the `rules` table

#### Scenario: Glossary download
- **WHEN** the server starts and no glossary data exists
- **THEN** the system SHALL fetch `https://api.academyruins.com/cr/glossary` and parse glossary terms with definitions into the `glossary` table

#### Scenario: Keyword extraction from rules
- **WHEN** rules data has been downloaded
- **THEN** the system SHALL extract keyword ability definitions from section 702 and keyword action definitions from section 701, storing them in the `keywords` table with name, section reference, type (ability/action), and full rules text

### Requirement: Commander Spellbook combo download
The system SHALL download combo data from Commander Spellbook and cache it in SQLite.

#### Scenario: Combo data download
- **WHEN** the server starts and no combo data exists in the database
- **THEN** the system SHALL use the `@space-cow-media/spellbook-client` npm package to fetch combos and insert them into the `combos` table with cards (JSON array), color_identity, prerequisites, steps, results, legality, and popularity

#### Scenario: Combo data refresh
- **WHEN** the server starts and combo data is older than 7 days
- **THEN** the system SHALL re-fetch combo data from Commander Spellbook

#### Scenario: Combo data current
- **WHEN** the server starts and combo data is less than 7 days old
- **THEN** the system SHALL skip the combo refresh

### Requirement: Auto-update on boot
The system SHALL check each data source for updates on server startup and download only sources with newer data.

#### Scenario: Scryfall data newer
- **WHEN** the server starts and Scryfall's `updated_at` timestamp is newer than the stored timestamp
- **THEN** the system SHALL re-download oracle_cards and rulings, drop and re-create card-related tables, and re-ingest

#### Scenario: Rules data newer
- **WHEN** the server starts and Academy Ruins has newer rules data
- **THEN** the system SHALL re-download rules, glossary, and keywords, and re-ingest into rules-related tables

#### Scenario: All data current
- **WHEN** the server starts and all sources report no updates
- **THEN** the system SHALL skip all downloads and use the existing database

#### Scenario: Source unreachable with existing data
- **WHEN** the server starts with existing data but a source API is unreachable
- **THEN** the system SHALL log a warning for that source and continue using cached data (per-source graceful degradation)

#### Scenario: All sources unreachable on first run
- **WHEN** the server starts with no existing database and no source API is reachable
- **THEN** the system SHALL log an error and exit with a non-zero exit code

### Requirement: Update metadata persistence
The system SHALL store last successful update timestamps per source in `~/.mtg-oracle/last_update.json`.

#### Scenario: Timestamps written after successful ingestion
- **WHEN** data ingestion for a source completes successfully
- **THEN** the system SHALL write the source's timestamp to `last_update.json`

#### Scenario: Timestamps not updated on failure
- **WHEN** data ingestion for a source fails
- **THEN** the system SHALL NOT update that source's timestamp, preserving the previous value

#### Scenario: Per-source timestamps
- **WHEN** `last_update.json` is read
- **THEN** it SHALL contain separate timestamps for `scryfall`, `rules`, and `spellbook` sources
