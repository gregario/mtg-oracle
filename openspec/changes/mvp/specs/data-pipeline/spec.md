## ADDED Requirements

### Requirement: Runtime data directory
The system SHALL create and manage a data directory at `~/.mtg-oracle/` for storing the SQLite database (`cards.db`) and update metadata (`last_update.json`).

#### Scenario: First run with no data directory
- **WHEN** the server starts and `~/.mtg-oracle/` does not exist
- **THEN** the system SHALL create the directory and proceed to initial data download

#### Scenario: Data directory already exists
- **WHEN** the server starts and `~/.mtg-oracle/` exists with `cards.db`
- **THEN** the system SHALL check for updates without re-creating the directory

### Requirement: Initial Scryfall bulk data download
The system SHALL download the Scryfall `oracle_cards` bulk data file on first run when no local database exists. The system SHALL also download the `rulings` bulk data file.

#### Scenario: First run downloads card data
- **WHEN** the server starts and no `cards.db` exists
- **THEN** the system SHALL fetch the Scryfall bulk-data metadata endpoint, download the `oracle_cards` JSON file, and ingest it into SQLite

#### Scenario: First run downloads rulings
- **WHEN** the server starts and no `cards.db` exists
- **THEN** the system SHALL fetch the Scryfall `rulings` bulk data and ingest it into the rulings table

#### Scenario: Download progress indication
- **WHEN** a bulk data download is in progress
- **THEN** the system SHALL log progress information to stderr

### Requirement: SQLite ingestion
The system SHALL parse the Scryfall oracle_cards JSON and insert records into the SQLite database with the schema defined in the design document (cards, card_faces, legalities, rulings tables, and cards_fts virtual table).

#### Scenario: Card data ingestion
- **WHEN** the oracle_cards JSON has been downloaded
- **THEN** the system SHALL create all tables and insert one row per card into the `cards` table, with colors, color_identity, and keywords stored as JSON arrays

#### Scenario: Multi-face card ingestion
- **WHEN** a card has multiple faces (DFC, split, adventure)
- **THEN** the system SHALL insert face data into the `card_faces` table with correct face_index ordering

#### Scenario: Legality ingestion
- **WHEN** card data includes legalities
- **THEN** the system SHALL insert one row per card per format into the `legalities` table with status values (legal, not_legal, banned, restricted)

#### Scenario: FTS5 index creation
- **WHEN** ingestion completes
- **THEN** the system SHALL populate the `cards_fts` FTS5 virtual table with card name, type_line, and oracle_text for full-text search

### Requirement: Auto-update on boot
The system SHALL check for newer Scryfall data on each server startup and download updates when available.

#### Scenario: Newer data available
- **WHEN** the server starts with an existing database and Scryfall's `updated_at` timestamp is newer than the stored `last_update.json` timestamp
- **THEN** the system SHALL re-download oracle_cards and rulings, drop and re-create all tables, and re-ingest

#### Scenario: Data is current
- **WHEN** the server starts and Scryfall's `updated_at` matches or is older than the local timestamp
- **THEN** the system SHALL skip download and use the existing database

#### Scenario: Scryfall unreachable
- **WHEN** the server starts with an existing database but cannot reach Scryfall's API
- **THEN** the system SHALL log a warning and continue using the existing database (graceful degradation)

#### Scenario: Scryfall unreachable on first run
- **WHEN** the server starts with no existing database and cannot reach Scryfall's API
- **THEN** the system SHALL log an error and exit with a non-zero exit code

### Requirement: Update metadata persistence
The system SHALL store the last successful update timestamp in `~/.mtg-oracle/last_update.json`.

#### Scenario: Timestamp written after successful ingestion
- **WHEN** data ingestion completes successfully
- **THEN** the system SHALL write `last_update.json` with the Scryfall `updated_at` timestamp

#### Scenario: Timestamp not updated on failure
- **WHEN** data ingestion fails (download error, parse error, disk full)
- **THEN** the system SHALL NOT update `last_update.json`, preserving the previous timestamp
