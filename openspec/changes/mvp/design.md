## Context

mtg-oracle is a greenfield MCP server for Magic: The Gathering. The project skeleton exists (package.json, tsconfig, CLAUDE.md) but no source code has been written. The architecture follows the warhammer-oracle pattern (curated domain knowledge MCP server) but diverges on data strategy: runtime download + SQLite instead of embedded data at build time.

Scryfall provides free bulk data exports (~80MB JSON, ~70K cards) that update daily. The server must download this data on first run, ingest it into SQLite for fast queries, and check for updates on subsequent boots. The npm package ships zero card data.

Stack: TypeScript + Node.js, `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`. Stdio transport for MCP.

## Goals / Non-Goals

**Goals:**
- Offline-capable after first data download
- Sub-100ms query times via SQLite (vs 200-500ms Scryfall API round-trips)
- Commander/EDH intelligence that no other MCP server provides
- Curated knowledge that makes LLMs better at MTG reasoning
- Clean MCP tool design following tool_design.md principles
- Publishable on npm with zero bundled card data

**Non-Goals:**
- Real-time price data (Scryfall prices are delayed anyway)
- Deck building / optimization (tools inform, LLM reasons)
- Image serving (card images stay on Scryfall CDN, provide URLs only)
- Multi-user / server mode (stdio transport, single user)
- Full Scryfall API coverage (curated subset that adds value)

## Decisions

### 1. SQLite via better-sqlite3 for card storage

**Decision**: Use `better-sqlite3` (synchronous, fast) to store card data in `~/.mtg-oracle/cards.db`. One database file, created on first run.

**Rationale**: Synchronous API is simpler than async alternatives. Single-file database is easy to manage (delete to force re-download). `better-sqlite3` is the fastest SQLite binding for Node.js. The warhammer-oracle project uses embedded JSON, but 70K cards with full oracle text + rulings is too large to embed -- SQLite provides indexing and full-text search.

**Alternative considered**: PostgreSQL or other client-server DB. Rejected -- requires separate server process, overkill for single-user MCP tool.

### 2. SQLite schema design

**Decision**: Five core tables with FTS5 for full-text search.

```sql
-- Core card data (one row per card, not per printing)
CREATE TABLE cards (
  id TEXT PRIMARY KEY,           -- Scryfall oracle_id
  name TEXT NOT NULL,
  mana_cost TEXT,
  cmc REAL,
  type_line TEXT,
  oracle_text TEXT,
  power TEXT,
  toughness TEXT,
  loyalty TEXT,
  colors TEXT,                   -- JSON array: ["W","U"]
  color_identity TEXT,           -- JSON array: ["W","U","B"]
  keywords TEXT,                 -- JSON array: ["Flying","Trample"]
  rarity TEXT,
  set_code TEXT,
  set_name TEXT,
  released_at TEXT,
  image_uri TEXT,
  scryfall_uri TEXT,
  edhrec_rank INTEGER
);

-- Double-faced / split / adventure cards
CREATE TABLE card_faces (
  card_id TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  mana_cost TEXT,
  type_line TEXT,
  oracle_text TEXT,
  power TEXT,
  toughness TEXT,
  colors TEXT,                   -- JSON array
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Format legality (one row per card per format)
CREATE TABLE legalities (
  card_id TEXT NOT NULL,
  format TEXT NOT NULL,          -- standard, modern, pioneer, legacy, vintage, commander, pauper
  status TEXT NOT NULL,          -- legal, not_legal, banned, restricted
  PRIMARY KEY (card_id, format),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Official rulings
CREATE TABLE rulings (
  card_id TEXT NOT NULL,
  published_at TEXT,
  comment TEXT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE cards_fts USING fts5(
  name, type_line, oracle_text,
  content='cards',
  content_rowid='rowid'
);
```

**Rationale**: Oracle cards (not all printings) keeps the dataset manageable (~70K rows vs 300K+). FTS5 gives fast full-text search on card names and oracle text. Legalities as a separate table allows efficient format-specific queries. JSON arrays for colors/keywords leverage SQLite's JSON functions.

### 3. Data pipeline: download on first run, update check on boot

**Decision**: On server startup:
1. Check if `~/.mtg-oracle/cards.db` exists
2. If not: fetch Scryfall bulk-data metadata, download `oracle_cards` JSON, ingest into SQLite
3. If yes: fetch metadata, compare `updated_at` with stored timestamp in `~/.mtg-oracle/last_update.json`
4. If newer data available: re-download and re-ingest (full replace, not incremental)
5. If Scryfall is unreachable: use existing database (graceful degradation)

**Rationale**: Full replace is simpler than incremental updates and Scryfall's bulk data is designed for this pattern. The oracle_cards file is ~80MB uncompressed -- manageable for a one-time download. Storing `last_update.json` separately from the DB allows quick timestamp checks without opening SQLite.

**Alternative considered**: Incremental updates via Scryfall's search API. Rejected -- Scryfall recommends bulk data for full-catalog use cases, and incremental would require complex diff logic.

### 4. Curated knowledge as embedded JSON modules

**Decision**: Ship curated knowledge (keywords, archetypes, staples, synergies) as TypeScript modules with embedded data. These are NOT downloaded from Scryfall -- they are hand-built and version-controlled.

```
src/knowledge/
  keywords.ts        -- ~60 keyword definitions with plain-English explanations
  archetypes.ts      -- MTG archetype definitions (aggro, control, combo, etc.)
  commander-archetypes.ts  -- Commander strategies by color identity
  format-staples.ts  -- Top 20-30 staples per format
  synergy-categories.ts    -- Synergy types (tribal, sacrifice, counters, etc.)
```

**Rationale**: This is what differentiates mtg-oracle from API wrappers. Scryfall provides card data but not MTG knowledge. These modules encode expert understanding that helps LLMs reason about deck building, format choices, and card evaluation. Embedded in the package means they work offline and are versioned with the code.

### 5. Tool design: 8 tools with clear LLM-facing descriptions

**Decision**: Eight tools following MCP tool_design.md principles. Each tool description explains to the LLM WHEN to call it.

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_cards` | Full-text search with filters | SQLite FTS5 + legalities |
| `get_card` | Exact card lookup by name | SQLite cards table |
| `get_rulings` | Official rulings for a card | SQLite rulings table |
| `check_legality` | Format legality for card(s) | SQLite legalities table |
| `search_by_mechanic` | Find cards by keyword/ability | SQLite + keywords knowledge |
| `analyze_commander` | Commander analysis (identity, archetypes, synergies) | SQLite + curated knowledge |
| `find_synergies` | Find synergistic cards | SQLite + synergy categories |
| `get_format_staples` | Staple cards for format + archetype | Curated knowledge |

**Rationale**: Tool count (8) follows the MCP sweet spot -- enough to cover the domain without overwhelming tool selection. Each tool has a distinct purpose and trigger. The split between SQLite-backed tools (search, lookup) and knowledge-backed tools (staples, archetypes) reflects the two data sources.

### 6. Rulings: separate Scryfall endpoint

**Decision**: Fetch rulings separately from the Scryfall rulings bulk data endpoint. Store in the rulings table. Download alongside oracle_cards during initial setup and updates.

**Rationale**: Rulings are critical for accurate MTG reasoning (errata, interaction clarifications) but are a separate bulk download from Scryfall. Including them makes `get_rulings` work offline.

### 7. Project structure

```
src/
  index.ts              -- MCP server entry point, tool registration
  server.ts             -- Server class, startup logic
  data/
    pipeline.ts         -- Download + ingest orchestration
    downloader.ts       -- Scryfall bulk data fetching
    ingester.ts         -- JSON → SQLite transformation
    database.ts         -- SQLite connection + query helpers
    schema.sql          -- Table creation DDL
  tools/
    search-cards.ts     -- search_cards tool handler
    get-card.ts         -- get_card tool handler
    get-rulings.ts      -- get_rulings tool handler
    check-legality.ts   -- check_legality tool handler
    search-by-mechanic.ts -- search_by_mechanic tool handler
    analyze-commander.ts  -- analyze_commander tool handler
    find-synergies.ts   -- find_synergies tool handler
    get-format-staples.ts -- get_format_staples tool handler
  knowledge/
    keywords.ts
    archetypes.ts
    commander-archetypes.ts
    format-staples.ts
    synergy-categories.ts
tests/
  data/
    pipeline.test.ts
    ingester.test.ts
    database.test.ts
  tools/
    search-cards.test.ts
    get-card.test.ts
    get-rulings.test.ts
    check-legality.test.ts
    search-by-mechanic.test.ts
    analyze-commander.test.ts
    find-synergies.test.ts
    get-format-staples.test.ts
  knowledge/
    keywords.test.ts
    archetypes.test.ts
```

## Risks / Trade-offs

- **[80MB download on first run]** Users must wait for initial Scryfall download. Mitigation: progress logging, graceful error handling, clear error messages if offline.
- **[Scryfall rate limiting]** Scryfall asks for 50-100ms delay between requests. Mitigation: bulk data is a single download, not many requests. Respect rate limits on metadata check.
- **[Stale curated knowledge]** Format staples and meta shift over time. Mitigation: version curated data, make it easy to update. Accept that staples are "generally good cards" not "current meta".
- **[better-sqlite3 native module]** Requires native compilation, can fail on some platforms. Mitigation: well-supported on macOS/Linux/Windows, prebuild binaries available.
- **[Scryfall data schema changes]** Bulk data format could change. Mitigation: validate key fields during ingestion, fail gracefully with clear errors.

## Open Questions

- Should rulings be fetched on first run (adds download time) or lazily on first `get_rulings` call?
- Should `find_synergies` use only curated categories or also do SQLite-based heuristic matching (e.g., cards that reference the same creature type)?
- How frequently should curated knowledge (staples, archetypes) be updated? Per npm release? Community contributions?
