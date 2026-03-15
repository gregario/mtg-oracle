## Why

Every existing MTG MCP server on GitHub is a thin Scryfall API wrapper -- they proxy HTTP requests, return raw API responses, and add no domain intelligence. This means they are slow (HTTP round-trips per query), offline-incapable, and offer no value beyond what Scryfall's own API provides. An LLM using these tools has to do all the MTG reasoning itself.

mtg-oracle takes the warhammer-oracle approach: curated domain knowledge that makes an LLM genuinely better at MTG. Runtime SQLite queries instead of live API calls. Format legality intelligence. Commander/EDH awareness. Archetype and synergy knowledge that doesn't exist in Scryfall's data. The npm package ships code and knowledge -- not card data (downloaded at runtime from Scryfall bulk endpoints).

## What Changes

This is a greenfield MVP. Everything is new.

- **Runtime data pipeline**: First-run download of Scryfall bulk data (~80MB oracle_cards JSON), ingested into SQLite (`~/.mtg-oracle/`). Auto-update check on boot comparing `updated_at` timestamps. npm package contains zero card data.
- **Card search and lookup tools**: Full-text search with filters (name, type, color, CMC, rarity, set, format legality), exact card lookup, and rulings retrieval. All backed by SQLite -- fast, offline after first download.
- **Format intelligence tools**: Legality checking across all formats (Standard, Modern, Pioneer, Legacy, Vintage, Commander, Pauper). Format staple lists (curated, not computed). Understands format-specific rules (e.g., Commander singleton, banned-as-commander).
- **Commander/EDH tools**: Color identity awareness, partner validation, archetype analysis, synergy discovery. This is the primary differentiator -- no existing MCP server does this.
- **Curated domain knowledge**: Hand-built datasets that go beyond Scryfall: keyword definitions (~60 evergreen keywords), archetype definitions, commander strategies by color identity, synergy categories (tribal, sacrifice, counters, graveyard, tokens, etc.), format staples.
- **MCP server with 8 tools**: `search_cards`, `get_card`, `get_rulings`, `check_legality`, `search_by_mechanic`, `analyze_commander`, `find_synergies`, `get_format_staples`.

## Capabilities

### New Capabilities
- `data-pipeline`: Runtime download, SQLite ingestion, and auto-update of Scryfall bulk card data
- `card-tools`: Card search, exact lookup, and rulings retrieval via SQLite
- `format-intelligence`: Format legality checking, format staple lists, and mechanic/keyword search
- `commander-tools`: Commander analysis, synergy discovery, and archetype awareness
- `curated-knowledge`: Hand-built domain knowledge datasets (keywords, archetypes, staples, synergies)
- `mcp-server`: MCP server shell, tool registration, and stdio transport

### Modified Capabilities

## Impact

- **Dependencies**: `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod` (already in package.json)
- **Filesystem**: Creates `~/.mtg-oracle/` directory for SQLite database and update metadata
- **Network**: First-run and periodic downloads from `api.scryfall.com` (bulk data endpoint)
- **npm package**: Ships code + curated knowledge JSON only -- no card data bundled
- **Scryfall compliance**: Must remain free, must add value beyond raw data, no endorsement claims
