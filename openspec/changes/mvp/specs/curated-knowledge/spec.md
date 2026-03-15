## ADDED Requirements

### Requirement: Archetype definitions
The system SHALL include curated definitions of ~20 common MTG deck archetypes with descriptions, key mechanics, typical colors, example cards, and strengths/weaknesses.

#### Scenario: Archetype query
- **WHEN** the archetype "aristocrats" is referenced
- **THEN** the system SHALL provide: archetype name, description (sacrifice-based value engines), typical game plan, key mechanics, typical colors, example cards, strengths, weaknesses, and which formats it appears in

#### Scenario: Complete archetype coverage
- **WHEN** the system is queried for archetype information
- **THEN** the system SHALL have definitions for at minimum: aggro, midrange, control, combo, tempo, ramp, tokens, aristocrats, voltron, storm, stax, group_hug, mill, reanimator, spellslinger, tribal, landfall, enchantress, artifacts, superfriends

### Requirement: Format primers
The system SHALL include curated format primer data for 8-10 major MTG formats.

#### Scenario: Format primer query
- **WHEN** the format "Commander" is queried
- **THEN** the system SHALL return: format description, card pool rules, deck count (100), rotation info (none), banned list philosophy, power level description, key characteristics, and typical game dynamics

#### Scenario: Complete format coverage
- **WHEN** format information is requested
- **THEN** the system SHALL have primers for at minimum: Standard, Modern, Pioneer, Legacy, Vintage, Commander, Pauper, Draft/Limited

### Requirement: Mana base guidelines
The system SHALL include curated mana base recommendations organized by color count and format.

#### Scenario: Mono-color mana base
- **WHEN** mana base guidance for a mono-color deck is queried
- **THEN** the system SHALL return recommended land count, utility land suggestions, and format-specific considerations

#### Scenario: Multi-color mana base
- **WHEN** mana base guidance for a 3-color deck is queried
- **THEN** the system SHALL return recommended land count by format, mana fixing categories (fetch lands, shock lands, dual lands, tri-lands, etc.), and color distribution advice

#### Scenario: Format-specific land counts
- **WHEN** mana base guidance is queried with a specific format
- **THEN** the system SHALL return format-appropriate land count recommendations (e.g., 60-card formats vs Commander's 100 cards)

#### Scenario: Color count coverage
- **WHEN** mana base data is queried
- **THEN** the system SHALL have guidelines for mono, 2-color, 3-color, 4-color, and 5-color decks

### Requirement: Commander strategy patterns
The system SHALL include curated knowledge of common Commander strategies organized by color identity.

#### Scenario: Color identity strategy query
- **WHEN** the color identity "UBR" (Grixis) is queried
- **THEN** the system SHALL return common Grixis commander strategies (e.g., spellslinger, reanimator, wheel effects, treasure/artifacts) and notable commanders for each strategy

#### Scenario: Mono-color identity
- **WHEN** the color identity "G" (mono-green) is queried
- **THEN** the system SHALL return mono-green strategies (ramp, stompy, elfball, voltron) and key staples unique to mono-green commander decks

#### Scenario: Power level brackets
- **WHEN** strategy data is queried
- **THEN** the system SHALL include power level bracket information (casual, focused, optimized, competitive) with descriptions of what each bracket means

#### Scenario: Staple cards per color identity
- **WHEN** a color identity is queried
- **THEN** the system SHALL include staple cards commonly run in that color identity

#### Scenario: All color combinations covered
- **WHEN** any valid 1-5 color combination is queried
- **THEN** the system SHALL have strategy information for that color identity (all mono, guild, shard/wedge, and 4-5 color combinations plus colorless)

### Requirement: Format staple lists
The system SHALL include curated lists of commonly played staple cards for each major format, organized by archetype where applicable.

#### Scenario: Commander staples
- **WHEN** Commander format staples are requested
- **THEN** the system SHALL return 20-30 universally played Commander staples (e.g., Sol Ring, Command Tower, Swords to Plowshares, Cyclonic Rift)

#### Scenario: Format staples with archetype filter
- **WHEN** staples for a format and archetype combination are requested (e.g., Modern + burn)
- **THEN** the system SHALL return staple cards for that archetype in that format

#### Scenario: Format coverage
- **WHEN** staples are requested
- **THEN** the system SHALL have staple lists for: Standard, Modern, Pioneer, Legacy, Vintage, Commander, and Pauper

### Requirement: Synergy category definitions
The system SHALL include curated synergy categories that classify cards by strategic role, enabling synergy-based card discovery.

#### Scenario: Synergy category lookup
- **WHEN** the "sacrifice" synergy category is queried
- **THEN** the system SHALL return: category name, description, subcategories (sacrifice outlets, death triggers, token fodder, payoffs), and example cards for each subcategory

#### Scenario: Complete synergy category coverage
- **WHEN** the system is queried for synergy categories
- **THEN** the system SHALL have definitions for at minimum: tribal, sacrifice/aristocrats, +1/+1 counters, graveyard, tokens, artifacts, enchantments, spellslinger, voltron/equipment, landfall, blink/flicker, mill/self-mill, ramp, lifegain, discard/wheels, treasure
