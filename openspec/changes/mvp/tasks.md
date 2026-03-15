# MTG Oracle — Tasks

## MVP (COMPLETE)

All 11 phases shipped. 402 tests, 12 tools, 3 data sources, curated knowledge modules.
Published to npm, Glama listed, MCP Registry registered, Dockerfile added.

- [x] 1. Project Setup & SQLite Foundation
- [x] 2. Scryfall Data Pipeline
- [x] 3. Academy Ruins Rules Pipeline
- [x] 4. Commander Spellbook Pipeline
- [x] 5. Pipeline Orchestration
- [x] 6. Card Tools (search_cards, get_card, get_rulings, check_legality, search_by_mechanic)
- [x] 7. Rules Tools (lookup_rule, get_glossary, get_keyword)
- [x] 8. Curated Knowledge Modules (archetypes, formats, mana base, commander, synergies)
- [x] 9. Commander Tools (analyze_commander, find_combos, find_synergies, get_format_staples)
- [x] 10. MCP Server Integration
- [x] 11. CLI & Packaging

### Distribution (COMPLETE)
- [x] npm published
- [x] Glama listed + score badge
- [x] MCP Registry registered
- [x] Dockerfile for Glama inspection
- [x] LICENSE file
- [x] README with badges and IDE config
- [ ] awesome-mcp-servers PR (waiting on Glama sync)
- [ ] Community launch (manual)

## Phase 2: Price Data

Scryfall bulk data already includes price fields — just not ingested yet.

- [ ] 2.1 Add price columns to cards table (usd, usd_foil, eur, eur_foil, tix)
- [ ] 2.2 Update Scryfall ingester to populate price fields from oracle_cards JSON
- [ ] 2.3 Include price data in get_card tool response (when prices exist)
- [ ] 2.4 Implement `get_prices` tool: lookup prices by card name, batch support (up to 50), format as readable table
- [ ] 2.5 Add price sorting/filtering to search_cards (sort_by: price, max_price filter)
- [ ] 2.6 Tests for price ingestion, get_prices tool, price display in get_card, search sort/filter

## Phase 3: Deck Import & Analysis

Parse deck lists and run analysis using existing tools.

- [ ] 3.1 Implement deck parser (`src/tools/deck-parser.ts`): plain text format ("4 Lightning Bolt"), MTGO .dek XML, handle main/sideboard/commander sections
- [ ] 3.2 Implement `analyze_deck` tool: parse deck list input, return mana curve, color distribution, card type breakdown, total price, format legality check
- [ ] 3.3 Implement synergy/combo detection within deck: run find_synergies and find_combos across deck cards, surface key interactions
- [ ] 3.4 Implement mana base analysis: land count vs nonland, color source coverage vs color requirements, suggest fixes from mana-base knowledge module
- [ ] 3.5 Tests for deck parser (plain text, MTGO XML, commander deck, sideboard, malformed input)
- [ ] 3.6 Tests for analyze_deck (full analysis, commander deck, format check, price total)
- [ ] 3.7 Tests for synergy/combo detection within deck
- [ ] 3.8 Tests for mana base analysis
