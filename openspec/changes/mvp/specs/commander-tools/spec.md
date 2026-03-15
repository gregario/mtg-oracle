## ADDED Requirements

### Requirement: analyze_commander tool
The system SHALL provide an `analyze_commander` MCP tool that provides comprehensive analysis of a card as a commander. This is the primary differentiator tool.

#### Scenario: Valid legendary creature commander
- **WHEN** `analyze_commander` is called with `name: "Atraxa, Praetors' Voice"`
- **THEN** the system SHALL return: color identity (WUBG), whether partner is available, typical archetypes (superfriends, +1/+1 counters, infect, proliferate), key synergy categories, EDHREC rank if available

#### Scenario: Partner commander
- **WHEN** `analyze_commander` is called with a commander that has Partner (e.g., "Thrasios, Triton Hero")
- **THEN** the system SHALL indicate Partner compatibility and list recommended partner pairings by complementary color identity and strategy

#### Scenario: Non-legendary creature
- **WHEN** `analyze_commander` is called with a card that is not a legendary creature (or does not have "can be your commander" text)
- **THEN** the system SHALL return an error explaining the card cannot be used as a commander

#### Scenario: Color identity analysis
- **WHEN** `analyze_commander` is called for any valid commander
- **THEN** the system SHALL include the full color identity, the number of cards available in that identity, and what the color combination is known for (e.g., Simic = UG = ramp + card draw + counters)

#### Scenario: Archetype suggestions
- **WHEN** `analyze_commander` is called for a valid commander
- **THEN** the system SHALL suggest 2-4 common archetypes based on the commander's abilities, keywords, and curated archetype knowledge

### Requirement: find_synergies tool
The system SHALL provide a `find_synergies` MCP tool that finds cards that synergize with a given card, using curated synergy categories and SQLite-based matching.

#### Scenario: Tribal synergy
- **WHEN** `find_synergies` is called with a card that references a creature type (e.g., "Krenko, Mob Boss" referencing Goblins)
- **THEN** the system SHALL return cards in the same tribe (Goblin cards) and cards that synergize with tribal strategies (e.g., "Coat of Arms")

#### Scenario: Keyword synergy
- **WHEN** `find_synergies` is called with a card that has specific keywords (e.g., a card with "sacrifice" in oracle text)
- **THEN** the system SHALL return cards in the "sacrifice" synergy category (aristocrats pieces, death triggers, token generators)

#### Scenario: Color identity constraint
- **WHEN** `find_synergies` is called with `commander: "Meren of Clan Nel Toth"` (BG color identity)
- **THEN** the system SHALL only return synergistic cards within the BG color identity

#### Scenario: Synergy category listing
- **WHEN** `find_synergies` is called with `list_categories: true`
- **THEN** the system SHALL return the available synergy categories (tribal, sacrifice, +1/+1 counters, graveyard, tokens, artifacts, enchantments, spellslinger, voltron, landfall, blink, mill, ramp, lifegain, discard)

#### Scenario: Card not found
- **WHEN** `find_synergies` is called with a card name that does not exist
- **THEN** the system SHALL return an error suggesting the user check the card name

### Requirement: Commander format rules awareness
The system SHALL understand Commander-specific rules for accurate analysis.

#### Scenario: Color identity includes mana symbols in rules text
- **WHEN** analyzing a card's color identity
- **THEN** the system SHALL consider mana symbols in rules text and color indicators, not just casting cost (per Commander rules)

#### Scenario: Singleton validation
- **WHEN** `check_legality` is called with `format: "commander"` for a list containing duplicate cards (other than basic lands)
- **THEN** the system SHALL flag the duplicate as a format violation

#### Scenario: Banned list awareness
- **WHEN** a card is on the Commander banned list (e.g., "Primeval Titan")
- **THEN** both `check_legality` and `analyze_commander` SHALL correctly identify it as banned
