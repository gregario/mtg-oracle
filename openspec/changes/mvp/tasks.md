# MTG Oracle MVP — Tasks

## 1. Project Setup & Data Pipeline

- [ ] 1.1 Configure TypeScript project (tsconfig strict mode, ES modules, jest config with ts-jest)
- [ ] 1.2 Create SQLite schema file (`src/data/schema.sql`) with cards, card_faces, legalities, rulings tables and cards_fts FTS5 virtual table
- [ ] 1.3 Implement database module (`src/data/database.ts`): connection management, schema initialization, query helpers
- [ ] 1.4 Implement downloader module (`src/data/downloader.ts`): fetch Scryfall bulk-data metadata, download oracle_cards and rulings JSON files
- [ ] 1.5 Implement ingester module (`src/data/ingester.ts`): parse oracle_cards JSON, insert into SQLite tables (cards, card_faces, legalities), populate FTS5 index
- [ ] 1.6 Implement rulings ingester: parse rulings JSON, insert into rulings table
- [ ] 1.7 Implement pipeline orchestrator (`src/data/pipeline.ts`): first-run detection, update check against last_update.json, download-if-newer, graceful degradation when offline
- [ ] 1.8 Tests for database module (schema creation, basic CRUD, FTS5 queries)
- [ ] 1.9 Tests for ingester (card parsing, multi-face cards, legality rows, FTS5 population)
- [ ] 1.10 Tests for pipeline orchestrator (first-run flow, update check, offline fallback)

## 2. Core Card Tools

- [ ] 2.1 Implement `search_cards` tool (`src/tools/search-cards.ts`): FTS5 query with filters (name, type, color, cmc, rarity, format), result limit 25, Zod input schema
- [ ] 2.2 Implement `get_card` tool (`src/tools/get-card.ts`): exact name lookup (case-insensitive), fuzzy fallback via LIKE, multi-face card handling, full card data response
- [ ] 2.3 Implement `get_rulings` tool (`src/tools/get-rulings.ts`): lookup by card name, return all rulings with dates
- [ ] 2.4 Tests for search_cards (text search, each filter type, combined filters, empty results, result limit)
- [ ] 2.5 Tests for get_card (exact match, case-insensitive, fuzzy match, multi-face, not found)
- [ ] 2.6 Tests for get_rulings (card with rulings, card without rulings, card not found)

## 3. Format Intelligence Tools

- [ ] 3.1 Implement `check_legality` tool (`src/tools/check-legality.ts`): single and batch card legality, all-formats mode, format aliases (edh→commander), Zod input schema
- [ ] 3.2 Implement `search_by_mechanic` tool (`src/tools/search-by-mechanic.ts`): keyword array search, oracle text FTS5 fallback, optional keyword definition inclusion, format filter
- [ ] 3.3 Tests for check_legality (single card, batch, all formats, aliases, card not found)
- [ ] 3.4 Tests for search_by_mechanic (keyword search, text pattern search, with definition, format filter, unknown keyword)

## 4. Curated Knowledge

- [ ] 4.1 Create keyword definitions module (`src/knowledge/keywords.ts`): ~60 evergreen and common keywords with plain-English definitions and categories
- [ ] 4.2 Create archetype definitions module (`src/knowledge/archetypes.ts`): ~24 deck archetypes with descriptions, key characteristics, typical card categories, format presence
- [ ] 4.3 Create commander archetypes module (`src/knowledge/commander-archetypes.ts`): strategies organized by color identity (all 32 combinations), notable commanders per strategy
- [ ] 4.4 Create format staples module (`src/knowledge/format-staples.ts`): top 20-30 staples per format (Commander, Modern, Pioneer, Legacy, Vintage, Pauper, Standard), organized by archetype where applicable
- [ ] 4.5 Create synergy categories module (`src/knowledge/synergy-categories.ts`): ~17 synergy types with descriptions, subcategories, and example card names
- [ ] 4.6 Implement `get_format_staples` tool (`src/tools/get-format-staples.ts`): lookup by format + optional archetype, return curated staple list
- [ ] 4.7 Tests for keyword definitions (completeness, structure validation)
- [ ] 4.8 Tests for archetype definitions (completeness, structure validation)
- [ ] 4.9 Tests for get_format_staples (by format, by format+archetype, unknown format, unknown archetype)

## 5. Commander Tools

- [ ] 5.1 Implement `analyze_commander` tool (`src/tools/analyze-commander.ts`): validate legendary creature, extract color identity, suggest archetypes from curated knowledge + card abilities, partner detection, EDHREC rank
- [ ] 5.2 Implement `find_synergies` tool (`src/tools/find-synergies.ts`): tribal matching (creature type extraction from oracle text), keyword-based synergy category matching, color identity constraint, category listing mode
- [ ] 5.3 Tests for analyze_commander (valid commander, partner, non-legendary, color identity, archetype suggestions)
- [ ] 5.4 Tests for find_synergies (tribal, keyword synergy, color identity constraint, category listing, card not found)

## 6. MCP Server Shell & Integration

- [ ] 6.1 Implement MCP server entry point (`src/index.ts`): stdio transport, server metadata (name, version)
- [ ] 6.2 Implement server class (`src/server.ts`): data pipeline initialization, tool registration for all 8 tools, Zod schema registration
- [ ] 6.3 Write LLM-facing tool descriptions following MCP tool_design.md principles (explain WHEN to call each tool)
- [ ] 6.4 Implement structured text response formatting for each tool (not raw JSON — formatted for LLM consumption)
- [ ] 6.5 Add error handling: isError responses with helpful messages and suggested next steps
- [ ] 6.6 Integration tests: server startup, tool registration, end-to-end tool calls against test database
- [ ] 6.7 Tests for response formatting (card summaries, full card data, error responses)

## 7. CLI & Packaging

- [ ] 7.1 Add bin entry to package.json for `mtg-oracle` CLI command
- [ ] 7.2 Add npm prepublish script (build only — no data bundling)
- [ ] 7.3 Configure .npmignore (exclude tests, raw data, dev configs)
- [ ] 7.4 Add README.md with installation, MCP client configuration (Claude Desktop, etc.), tool reference, Scryfall/WotC attribution
- [ ] 7.5 Verify npm pack produces a clean package with no card data
- [ ] 7.6 End-to-end smoke test: install from local tarball, first-run download, tool calls
