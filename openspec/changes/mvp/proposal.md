## Why

Every existing MTG MCP server on GitHub is a thin Scryfall API wrapper — they proxy HTTP requests, return raw API responses, and add no domain intelligence. They are slow (HTTP round-trips per query), offline-incapable, and offer no value beyond what Scryfall's own API provides. An LLM using these tools has to do all the MTG reasoning itself.

mtg-oracle takes the warhammer-oracle approach: curated domain knowledge that makes an LLM genuinely better at MTG. Three runtime data sources (Scryfall bulk data, Academy Ruins comprehensive rules, Commander Spellbook combos) ingested into SQLite for sub-100ms offline queries. Hand-built knowledge modules (archetypes, formats, mana base, commander strategies) ship with npm. 12 tools covering cards, rules, combos, and strategic advice.

## What Changes

This is a greenfield MVP. Everything is new.

- **Runtime data pipeline (3 sources)**: Scryfall bulk data (~80MB oracle_cards + ~24MB rulings), Academy Ruins comprehensive rules (structured JSON sections + glossary), and Commander Spellbook combos (via `@space-cow-media/spellbook-client`). All downloaded on first run, stored in `~/.mtg-oracle/cards.sqlite`, auto-updated on boot. npm package ships zero data.
- **Card search and lookup tools (5 tools)**: `search_cards` (FTS5 with filters), `get_card` (exact lookup with rulings and legalities), `get_rulings` (per-card rulings), `check_legality` (batch format legality), `search_by_mechanic` (keyword + oracle text search). All backed by SQLite.
- **Rules tools (3 tools)**: `lookup_rule` (search comprehensive rules by section/keyword/topic), `get_glossary` (glossary term definitions), `get_keyword` (full rules text for keyword abilities from CR 701/702).
- **Commander/EDH tools (3 tools)**: `analyze_commander` (color identity, archetypes, strategy suggestions, partner compatibility), `find_combos` (Commander Spellbook search by card/color identity), `find_synergies` (tribal/keyword/category matching with color identity constraint).
- **Curated domain knowledge (shipped in npm)**: ~20 archetype definitions, 8-10 format primers, mana base guidelines by color count, commander strategy patterns by color identity, synergy category definitions.
- **MCP server with 12 tools**: stdio transport, Zod validation, LLM-optimized response formatting.

## Capabilities

### New Capabilities
- `data-pipeline`: Runtime download and SQLite ingestion of Scryfall bulk data, Academy Ruins comprehensive rules, and Commander Spellbook combos. Auto-update on boot.
- `card-tools`: Card search (FTS5), exact lookup, rulings retrieval, format legality checking, mechanic/keyword search.
- `rules-tools`: Comprehensive rules search by section/keyword/topic, glossary term lookup, keyword ability/action definitions from CR 701/702.
- `commander-tools`: Commander analysis, combo discovery via Commander Spellbook, synergy finding with curated categories.
- `curated-knowledge`: Hand-built datasets for archetypes, format primers, mana base guidelines, commander strategies, and format staples.
- `mcp-server`: MCP server shell, tool registration, response formatting, error handling.

### Modified Capabilities

## Impact

- **Dependencies**: `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`, `@space-cow-media/spellbook-client` (Commander Spellbook client)
- **Filesystem**: Creates `~/.mtg-oracle/` directory for SQLite database (`cards.sqlite`) and update metadata (`last_update.json`)
- **Network**: First-run and periodic downloads from `api.scryfall.com` (bulk data), `api.academyruins.com` (comprehensive rules + glossary), `backend.commanderspellbook.com` (combos)
- **npm package**: Ships code + curated knowledge modules only — no card/rules/combo data bundled
- **Legal posture**: Scryfall data is free with attribution (must add value beyond raw data, no endorsement claims). Academy Ruins API is AGPL-3.0 but we only call their API, not modify their code — MIT license for our project is fine. Commander Spellbook client is MIT. Wizards of the Coast Fan Content Policy applies to all card data/names.
- **Competitive differentiation**: No existing MCP server provides comprehensive rules, combo discovery, curated archetype knowledge, or commander strategy analysis. The 5+ competitors on GitHub are all Scryfall-API-only wrappers with 1-3 tools.
