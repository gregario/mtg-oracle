# MTG Oracle MVP — Tasks

## 1. Project Setup & SQLite Foundation

- [ ] 1.1 Configure TypeScript project (tsconfig strict mode, ES modules, vitest config)
- [ ] 1.2 Install dependencies: `@modelcontextprotocol/sdk`, `better-sqlite3`, `@types/better-sqlite3`, `zod`, `@space-cow-media/spellbook-client`
- [ ] 1.3 Create SQLite schema file (`src/data/schema.sql`) with all 9 tables: cards, card_faces, legalities, rulings, cards_fts (FTS5), rules, glossary, keywords, combos
- [ ] 1.4 Implement database module (`src/data/db.ts`): connection management, schema initialization, query helpers, data directory creation (`~/.mtg-oracle/`)
- [ ] 1.5 Tests for database module (schema creation, directory management, basic CRUD, FTS5 queries)

## 2. Scryfall Data Pipeline

- [ ] 2.1 Implement Scryfall downloader (`src/data/scryfall.ts`): fetch bulk-data metadata from `https://api.scryfall.com/bulk-data`, download oracle_cards and rulings JSON files with progress logging
- [ ] 2.2 Implement Scryfall card ingester: parse oracle_cards JSON, insert into cards table (colors/color_identity/keywords as JSON arrays), card_faces table (multi-face cards), legalities table, and populate FTS5 index
- [ ] 2.3 Implement Scryfall rulings ingester: parse rulings JSON, insert into rulings table with source (wotc/scryfall), published_at, comment
- [ ] 2.4 Tests for Scryfall download (metadata parsing, update_at comparison)
- [ ] 2.5 Tests for Scryfall ingestion (card parsing, multi-face cards, legality rows, rulings, FTS5 population)

## 3. Academy Ruins Rules Pipeline

- [ ] 3.1 Implement rules downloader (`src/data/rules.ts`): fetch comprehensive rules from `https://api.academyruins.com/cr`, parse structured JSON sections/subsections into rules table with section numbers, titles, text, and parent references
- [ ] 3.2 Implement glossary downloader: fetch `https://api.academyruins.com/cr/glossary`, parse glossary terms with definitions into glossary table
- [ ] 3.3 Implement keyword extractor: parse sections 701 (keyword actions) and 702 (keyword abilities) from rules data, extract individual keyword definitions into keywords table with name, section reference, type, and full rules text
- [ ] 3.4 Tests for rules download and parsing (section structure, glossary terms, keyword extraction from 701/702)

## 4. Commander Spellbook Pipeline

- [ ] 4.1 Implement Spellbook fetcher (`src/data/spellbook.ts`): use `@space-cow-media/spellbook-client` to fetch combos, insert into combos table with cards (JSON array), color_identity, prerequisites, steps, results, legality, popularity
- [ ] 4.2 Implement combo refresh logic: check last_update timestamp, refresh if older than 7 days
- [ ] 4.3 Tests for Spellbook fetch and ingestion (combo parsing, refresh interval logic)

## 5. Pipeline Orchestration

- [ ] 5.1 Implement pipeline orchestrator (`src/data/pipeline.ts`): coordinate all 3 sources, first-run detection, per-source update checks via `last_update.json`, parallel downloads on first run
- [ ] 5.2 Implement per-source graceful degradation: if a source API is unreachable but cached data exists, log warning and continue; if no cached data and all sources unreachable, exit with error
- [ ] 5.3 Implement `last_update.json` management: per-source timestamps (scryfall, rules, spellbook), write on success, preserve on failure
- [ ] 5.4 Tests for pipeline orchestrator (first-run flow, per-source update checks, graceful degradation, offline fallback)

## 6. Card Tools

- [ ] 6.1 Implement `search_cards` tool (`src/tools/search-cards.ts`): FTS5 query with filters (name, type, color, cmc, rarity, set, format, keyword), result limit 25, Zod input schema
- [ ] 6.2 Implement `get_card` tool (`src/tools/get-card.ts`): exact name lookup (case-insensitive), fuzzy fallback via LIKE, multi-face card handling, full card data with rulings and legalities
- [ ] 6.3 Implement `get_rulings` tool (`src/tools/get-rulings.ts`): lookup by card name, return all rulings with source, dates, and comment text
- [ ] 6.4 Implement `check_legality` tool (`src/tools/check-legality.ts`): single and batch card legality, all-formats mode, format aliases (edh→commander), Zod input schema
- [ ] 6.5 Implement `search_by_mechanic` tool (`src/tools/search-by-mechanic.ts`): keyword array search, oracle text FTS5 fallback, include_definition option (from keywords table), format filter
- [ ] 6.6 Tests for search_cards (text search, each filter type, combined filters, empty results, result limit)
- [ ] 6.7 Tests for get_card (exact match, case-insensitive, fuzzy match, multi-face, not found, rulings included)
- [ ] 6.8 Tests for get_rulings (card with rulings, card without rulings, card not found)
- [ ] 6.9 Tests for check_legality (single card, batch, all formats, aliases, card not found)
- [ ] 6.10 Tests for search_by_mechanic (keyword search, text pattern search, with definition, format filter, unknown keyword)

## 7. Rules Tools

- [ ] 7.1 Implement `lookup_rule` tool (`src/tools/lookup-rule.ts`): search by section number (exact match + subsections) or text search across rules, return rule text with section references and parent context
- [ ] 7.2 Implement `get_glossary` tool (`src/tools/get-glossary.ts`): exact and partial term lookup (case-insensitive), return matching glossary definitions
- [ ] 7.3 Implement `get_keyword` tool (`src/tools/get-keyword.ts`): keyword name lookup (case-insensitive) from keywords table, return full rules text with section reference and type (ability/action)
- [ ] 7.4 Tests for lookup_rule (section number lookup, subsection inclusion, text search, no matches, hierarchical context)
- [ ] 7.5 Tests for get_glossary (exact match, partial match, case-insensitive, not found)
- [ ] 7.6 Tests for get_keyword (ability lookup, action lookup, case-insensitive, not found, type indication)

## 8. Curated Knowledge Modules

- [ ] 8.1 Create archetype definitions module (`src/knowledge/archetypes.ts`): ~20 archetypes with name, description, key mechanics, typical colors, example cards, strengths/weaknesses, format presence
- [ ] 8.2 Create format primers module (`src/knowledge/formats.ts`): 8-10 formats with description, card pool, rotation info, banned list philosophy, deck count, power level, key characteristics
- [ ] 8.3 Create mana base guidelines module (`src/knowledge/mana-base.ts`): by color count (mono through 5-color), land count recommendations by format, mana fixing categories
- [ ] 8.4 Create commander strategies module (`src/knowledge/commander-strategies.ts`): strategies by color identity (mono, guild, shard/wedge, 4-5 color), staple cards per identity, power level brackets
- [ ] 8.5 Create synergy categories module (`src/knowledge/synergy-categories.ts`): ~16 synergy types with descriptions, subcategories, and example card names
- [ ] 8.6 Tests for archetype definitions (completeness of ~20 archetypes, structure validation)
- [ ] 8.7 Tests for format primers (completeness of 8-10 formats, structure validation)
- [ ] 8.8 Tests for mana base guidelines (all color counts covered, format-specific data)
- [ ] 8.9 Tests for commander strategies (color identity coverage, structure validation)
- [ ] 8.10 Tests for synergy categories (completeness of ~16 categories, structure validation)

## 9. Commander Tools

- [ ] 9.1 Implement `analyze_commander` tool (`src/tools/analyze-commander.ts`): validate legendary creature, extract color identity, suggest archetypes from curated knowledge + card abilities, partner detection, EDHREC rank, power level bracket, recommended card categories
- [ ] 9.2 Implement `find_combos` tool (`src/tools/find-combos.ts`): search combos table by card name(s) and/or color identity, sort by popularity, limit 20 results
- [ ] 9.3 Implement `find_synergies` tool (`src/tools/find-synergies.ts`): tribal matching (creature type extraction), keyword-based synergy category matching, combo partner inclusion, color identity constraint, category listing mode
- [ ] 9.4 Implement `get_format_staples` tool (`src/tools/get-format-staples.ts`): lookup by format + optional archetype filter, return curated staple list
- [ ] 9.5 Tests for analyze_commander (valid commander, partner, non-legendary, color identity, archetype suggestions, power level)
- [ ] 9.6 Tests for find_combos (by card, by multiple cards, by color identity, combined filters, no combos found, result limit)
- [ ] 9.7 Tests for find_synergies (tribal, keyword synergy, combo partners, color identity constraint, category listing, card not found)
- [ ] 9.8 Tests for get_format_staples (by format, by format+archetype, unknown format, unknown archetype)

## 10. MCP Server Integration

- [ ] 10.1 Implement MCP server entry point (`src/server.ts`): stdio transport, server metadata (name, version from package.json)
- [ ] 10.2 Implement tool registration for all 12 tools with Zod schema registration
- [ ] 10.3 Write LLM-facing tool descriptions following MCP tool_design.md principles (explain WHEN to call each tool, distinguish similar tools)
- [ ] 10.4 Implement structured text response formatting for each tool (card summaries, full card data, rules text, combo results — not raw JSON)
- [ ] 10.5 Implement error handling: isError responses with helpful messages and suggested next steps
- [ ] 10.6 Integration tests: server startup with data pipeline, tool registration, end-to-end tool calls against test database
- [ ] 10.7 Tests for response formatting (card summaries, full card data, rules, combos, error responses)

## 11. CLI & Packaging

- [ ] 11.1 Add bin entry to package.json for `mtg-oracle` CLI command
- [ ] 11.2 Add npm prepublish script (build only — no data bundling)
- [ ] 11.3 Configure .npmignore (exclude tests, raw data, dev configs)
- [ ] 11.4 Add README.md with installation, MCP client configuration (Claude Desktop, etc.), tool reference (all 12 tools), Scryfall/WotC/Academy Ruins/Commander Spellbook attribution
- [ ] 11.5 Verify npm pack produces a clean package with no card/rules/combo data
- [ ] 11.6 End-to-end smoke test: install from local tarball, first-run download, tool calls across all 12 tools
