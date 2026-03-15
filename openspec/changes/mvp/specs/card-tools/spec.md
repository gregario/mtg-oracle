## ADDED Requirements

### Requirement: search_cards tool
The system SHALL provide a `search_cards` MCP tool that performs full-text and filtered search across the card database. Results SHALL return concise card summaries (name, mana cost, type line, first 100 chars of oracle text, colors).

#### Scenario: Text search by card name
- **WHEN** `search_cards` is called with `query: "Lightning Bolt"`
- **THEN** the system SHALL return cards matching "Lightning Bolt" via FTS5, ordered by relevance

#### Scenario: Search with type filter
- **WHEN** `search_cards` is called with `query: "draw"` and `type: "Instant"`
- **THEN** the system SHALL return only Instant cards whose oracle text or name matches "draw"

#### Scenario: Search with color filter
- **WHEN** `search_cards` is called with `colors: ["U", "B"]`
- **THEN** the system SHALL return only cards whose colors include blue and/or black

#### Scenario: Search with CMC filter
- **WHEN** `search_cards` is called with `cmc_max: 3`
- **THEN** the system SHALL return only cards with converted mana cost 3 or less

#### Scenario: Search with format legality filter
- **WHEN** `search_cards` is called with `format: "standard"` and `query: "creature"`
- **THEN** the system SHALL return only cards that are legal in Standard matching the query

#### Scenario: Search with rarity filter
- **WHEN** `search_cards` is called with `rarity: "mythic"`
- **THEN** the system SHALL return only mythic rare cards matching other filters

#### Scenario: Result limit
- **WHEN** `search_cards` returns more than 25 results
- **THEN** the system SHALL return the top 25 results and indicate total count

#### Scenario: No results
- **WHEN** `search_cards` matches no cards
- **THEN** the system SHALL return an empty result set with a helpful message

### Requirement: get_card tool
The system SHALL provide a `get_card` MCP tool that returns full card data for an exact card name lookup.

#### Scenario: Exact name match
- **WHEN** `get_card` is called with `name: "Sol Ring"`
- **THEN** the system SHALL return the complete card data: name, mana_cost, cmc, type_line, oracle_text, power, toughness, loyalty, colors, color_identity, keywords, rarity, set, legalities across all formats, image_uri, and scryfall_uri

#### Scenario: Case-insensitive lookup
- **WHEN** `get_card` is called with `name: "sol ring"`
- **THEN** the system SHALL match case-insensitively and return the card

#### Scenario: Multi-face card
- **WHEN** `get_card` is called for a double-faced card (e.g., "Delver of Secrets")
- **THEN** the system SHALL return data for all faces including each face's name, mana_cost, type_line, oracle_text, power, and toughness

#### Scenario: Card not found
- **WHEN** `get_card` is called with a name that does not match any card
- **THEN** the system SHALL return an error message suggesting the user check spelling or use `search_cards`

#### Scenario: Fuzzy name matching
- **WHEN** `get_card` is called with a name that partially matches (e.g., "Lightning Bo")
- **THEN** the system SHALL attempt a LIKE match and return the closest result, or suggest alternatives if ambiguous

### Requirement: get_rulings tool
The system SHALL provide a `get_rulings` MCP tool that returns official Wizards of the Coast rulings for a specific card.

#### Scenario: Card with rulings
- **WHEN** `get_rulings` is called with `name: "Panharmonicon"`
- **THEN** the system SHALL return all rulings for that card, each with published_at date and comment text

#### Scenario: Card with no rulings
- **WHEN** `get_rulings` is called for a card that has no rulings
- **THEN** the system SHALL return an empty list with a message that no official rulings exist

#### Scenario: Card not found
- **WHEN** `get_rulings` is called with a card name that does not exist
- **THEN** the system SHALL return an error message
