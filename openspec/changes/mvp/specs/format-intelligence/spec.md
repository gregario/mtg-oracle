## ADDED Requirements

### Requirement: check_legality tool
The system SHALL provide a `check_legality` MCP tool that checks whether one or more cards are legal in a specific format.

#### Scenario: Single card legality check
- **WHEN** `check_legality` is called with `cards: ["Lightning Bolt"]` and `format: "standard"`
- **THEN** the system SHALL return the legality status (legal, not_legal, banned, restricted) for that card in Standard

#### Scenario: Batch legality check
- **WHEN** `check_legality` is called with `cards: ["Sol Ring", "Lightning Bolt", "Black Lotus"]` and `format: "commander"`
- **THEN** the system SHALL return the legality status for each card in Commander

#### Scenario: All formats for a single card
- **WHEN** `check_legality` is called with `cards: ["Counterspell"]` and no format specified
- **THEN** the system SHALL return legality across all formats (standard, modern, pioneer, legacy, vintage, commander, pauper)

#### Scenario: Invalid format name
- **WHEN** `check_legality` is called with `format: "edh"`
- **THEN** the system SHALL recognize common aliases (edh → commander) or return an error listing valid format names

#### Scenario: Card not found
- **WHEN** `check_legality` is called with a card name that does not exist in the database
- **THEN** the system SHALL return an error for that card while still processing other valid cards in the batch

### Requirement: search_by_mechanic tool
The system SHALL provide a `search_by_mechanic` MCP tool that finds cards with specific keywords or abilities, enhanced with curated keyword knowledge.

#### Scenario: Search by evergreen keyword
- **WHEN** `search_by_mechanic` is called with `keyword: "flying"`
- **THEN** the system SHALL return cards that have Flying in their keywords array

#### Scenario: Search by keyword with format filter
- **WHEN** `search_by_mechanic` is called with `keyword: "cascade"` and `format: "modern"`
- **THEN** the system SHALL return only Modern-legal cards with Cascade

#### Scenario: Keyword with definition
- **WHEN** `search_by_mechanic` is called with `keyword: "trample"` and `include_definition: true`
- **THEN** the system SHALL include the curated plain-English definition of Trample alongside the card results

#### Scenario: Search by ability text pattern
- **WHEN** `search_by_mechanic` is called with `keyword: "enters the battlefield"`
- **THEN** the system SHALL search oracle_text via FTS5 for cards containing that phrase

#### Scenario: Unknown keyword
- **WHEN** `search_by_mechanic` is called with a keyword not in the curated list and not matching any cards
- **THEN** the system SHALL return no results with a message listing similar known keywords

### Requirement: get_format_staples tool
The system SHALL provide a `get_format_staples` MCP tool that returns curated lists of commonly played cards for a given format and optional archetype.

#### Scenario: Format staples without archetype
- **WHEN** `get_format_staples` is called with `format: "commander"`
- **THEN** the system SHALL return the top 20-30 staple cards for Commander across all archetypes (e.g., Sol Ring, Command Tower, Swords to Plowshares)

#### Scenario: Format staples with archetype filter
- **WHEN** `get_format_staples` is called with `format: "modern"` and `archetype: "control"`
- **THEN** the system SHALL return staple cards for Modern control decks

#### Scenario: Unknown format
- **WHEN** `get_format_staples` is called with an unrecognized format
- **THEN** the system SHALL return an error listing supported formats

#### Scenario: Unknown archetype
- **WHEN** `get_format_staples` is called with `archetype: "unknown"`
- **THEN** the system SHALL return an error listing known archetypes for that format
