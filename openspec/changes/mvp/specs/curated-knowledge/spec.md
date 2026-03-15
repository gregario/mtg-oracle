## ADDED Requirements

### Requirement: Keyword definitions
The system SHALL include curated plain-English definitions for all evergreen and common MTG keywords (~60 keywords).

#### Scenario: Evergreen keyword lookup
- **WHEN** the keyword "deathtouch" is referenced
- **THEN** the system SHALL provide: keyword name, category (evergreen/keyword action/ability word), plain-English definition, and any notable rules interactions

#### Scenario: Complete keyword coverage
- **WHEN** the system is queried for keyword information
- **THEN** the system SHALL have definitions for at minimum: flying, first strike, double strike, deathtouch, trample, lifelink, haste, vigilance, reach, menace, hexproof, shroud, indestructible, flash, defender, ward, cascade, convoke, delve, dredge, equip, flashback, kicker, madness, morph, mutate, ninjutsu, proliferate, prowess, suspend, affinity, annihilator, changeling, companion, crew, cycling, dash, devoid, emerge, embalm, enrage, eternalize, evoke, evolve, exalted, exploit, explore, fabricate, fading, fear, flanking, food, forecast, fortell, horsemanship, improvise, infect, intimidate, landfall, living weapon, miracle, modular, myriad, overload, partner, persist, phasing, protection, provoke, raid, rally, rampage, rebound, recover, reinforce, renown, replicate, retrace, scavenge, shadow, skulk, soulbond, spectacle, splice, storm, sunburst, surge, totem armor, transmute, undying, unearth, wither

### Requirement: Archetype definitions
The system SHALL include curated definitions of common MTG deck archetypes with descriptions, key characteristics, and example strategies.

#### Scenario: Archetype query
- **WHEN** the archetype "aristocrats" is referenced
- **THEN** the system SHALL provide: archetype name, description (sacrifice-based value engines), typical game plan, key card categories (sacrifice outlets, death triggers, token generators), and which formats it appears in

#### Scenario: Complete archetype coverage
- **WHEN** the system is queried for archetype information
- **THEN** the system SHALL have definitions for at minimum: aggro, midrange, control, combo, tempo, ramp, tokens, aristocrats, voltron, storm, stax, group hug, mill, reanimator, spellslinger, tribal, landfall, blink/flicker, superfriends, infect, equipment, enchantress, graveyard, toolbox

### Requirement: Commander archetypes by color identity
The system SHALL include curated knowledge of common Commander strategies organized by color identity.

#### Scenario: Color identity strategy query
- **WHEN** the color identity "UBR" (Grixis) is queried
- **THEN** the system SHALL return common Grixis commander strategies (e.g., spellslinger, reanimator, wheel effects, treasure/artifacts) and notable commanders for each strategy

#### Scenario: Mono-color identity
- **WHEN** the color identity "G" (mono-green) is queried
- **THEN** the system SHALL return mono-green strategies (ramp, stompy, elfball, voltron) and key staples unique to mono-green commander decks

#### Scenario: All color combinations covered
- **WHEN** any valid 1-5 color combination is queried
- **THEN** the system SHALL have strategy information for that color identity (32 possible identities including colorless)

### Requirement: Format staple lists
The system SHALL include curated lists of commonly played cards for each major format, organized by archetype where applicable.

#### Scenario: Commander staples
- **WHEN** Commander format staples are requested
- **THEN** the system SHALL return 20-30 universally played Commander staples (e.g., Sol Ring, Command Tower, Swords to Plowshares, Cyclonic Rift, Demonic Tutor)

#### Scenario: Modern staples by archetype
- **WHEN** Modern staples for "burn" archetype are requested
- **THEN** the system SHALL return staple cards for Modern burn (e.g., Lightning Bolt, Goblin Guide, Eidolon of the Great Revel)

#### Scenario: Format coverage
- **WHEN** staples are requested
- **THEN** the system SHALL have staple lists for: Standard (generic good cards), Modern, Pioneer, Legacy, Vintage, Commander, and Pauper

### Requirement: Synergy category definitions
The system SHALL include curated synergy categories that classify cards by strategic role, enabling synergy-based card discovery.

#### Scenario: Synergy category lookup
- **WHEN** the "sacrifice" synergy category is queried
- **THEN** the system SHALL return: category name, description, subcategories (sacrifice outlets, death triggers, token fodder, payoffs), and example cards for each subcategory

#### Scenario: Complete synergy category coverage
- **WHEN** the system is queried for synergy categories
- **THEN** the system SHALL have definitions for at minimum: tribal, sacrifice/aristocrats, +1/+1 counters, graveyard, tokens, artifacts, enchantments, spellslinger/instants-sorceries, voltron/equipment, landfall, blink/flicker, mill/self-mill, ramp, lifegain/life matters, discard/wheels, treasure, food, clues/investigate
