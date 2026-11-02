## ADDED Requirements

### Requirement: Configurable data directory
The system SHALL store its database and update metadata in `MTG_ORACLE_DATA_DIR` when set, and in `~/.mtg-oracle/` otherwise.

#### Scenario: Custom data directory
- **WHEN** the server starts with `MTG_ORACLE_DATA_DIR=/data`
- **THEN** the system SHALL read and write `cards.sqlite` and `last_update.json` in `/data` only

### Requirement: Periodic refresh while running
The system SHALL re-run the data pipeline every `MTG_ORACLE_REFRESH_HOURS` (default 24) while the server is running.

#### Scenario: Scheduled refresh
- **WHEN** the refresh interval elapses
- **THEN** the system SHALL run the pipeline, which downloads only sources that have changed or passed their TTL

#### Scenario: Overlapping refresh
- **WHEN** the refresh interval elapses while a previous run is still in progress
- **THEN** the system SHALL skip that tick

#### Scenario: Refresh disabled
- **WHEN** `MTG_ORACLE_REFRESH_HOURS=0`
- **THEN** the system SHALL check for updates only at startup
