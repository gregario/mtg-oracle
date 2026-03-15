## Context

mtg-oracle is a greenfield MCP server for Magic: The Gathering. The project skeleton exists (package.json, tsconfig, CLAUDE.md) but no source code has been written. The architecture follows the warhammer-oracle pattern (curated domain knowledge MCP server) but diverges on data strategy: three runtime data sources downloaded into SQLite instead of embedded data at build time.

Three external data sources provide comprehensive MTG coverage:
1. **Scryfall** — bulk card data (~80MB oracle_cards, ~24MB rulings, ~70K cards). Updates daily.
2. **Academy Ruins** — comprehensive rules as structured JSON (sections, subsections, glossary). AGPL-3.0 project but we only call their public API.
3. **Commander Spellbook** — combo database with official npm client (`@space-cow-media/spellbook-client`, MIT). Cards, prerequisites, steps, results, color identity, legality.

Stack: TypeScript + Node.js, `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`, `@space-cow-media/spellbook-client`. Stdio transport for MCP.

## Goals / Non-Goals

**Goals:**
- Offline-capable after first data download (all 3 sources cached in SQLite)
- Sub-100ms query times via SQLite (vs 200-500ms API round-trips)
- Comprehensive rules knowledge (no other MCP server has this)
- Commander/EDH intelligence with combo discovery
- Curated knowledge that makes LLMs better at MTG reasoning
- Clean MCP tool design following tool_design.md principles (12 tools)
- Publishable on npm with zero bundled data

**Non-Goals:**
- Real-time price data (Scryfall prices are delayed anyway)
- Deck building / optimization (tools inform, LLM reasons)
- Image serving (card images stay on Scryfall CDN, provide URLs only)
- Multi-user / server mode (stdio transport, single user)
- Full Scryfall API coverage (curated subset that adds value)
- Modifying or redistributing Academy Ruins code (API calls only)

## Decisions

### 1. SQLite via better-sqlite3 for all runtime data

**Decision**: Use `better-sqlite3` (synchronous, fast) to store all runtime data in `~/.mtg-oracle/cards.sqlite`. One database file, created on first run.

**Rationale**: Synchronous API is simpler than async alternatives. Single-file database is easy to manage (delete to force re-download). `better-sqlite3` is the fastest SQLite binding for Node.js. Three data sources (cards, rules, combos) all benefit from indexed queries and can coexist in one database.

**Alternative considered**: Separate databases per source. Rejected — complicates queries that cross sources (e.g., keyword lookup needs both cards and rules).

### 2. SQLite schema design

**Decision**: Nine tables with FTS5 for full-text search.

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
  edhrec_rank INTEGER,
  artist TEXT
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
  format TEXT NOT NULL,
  status TEXT NOT NULL,          -- legal, not_legal, banned, restricted
  PRIMARY KEY (card_id, format),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Official rulings from Scryfall
CREATE TABLE rulings (
  card_id TEXT NOT NULL,
  source TEXT,                   -- wotc, scryfall
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

-- Comprehensive Rules sections (from Academy Ruins)
CREATE TABLE rules (
  section TEXT PRIMARY KEY,      -- e.g., "702.2", "100.1a"
  title TEXT,                    -- section title if available
  text TEXT NOT NULL,            -- full rule text
  parent_section TEXT            -- parent section number for hierarchy
);

-- Glossary terms (from Academy Ruins)
CREATE TABLE glossary (
  term TEXT PRIMARY KEY,
  definition TEXT NOT NULL
);

-- Keyword definitions extracted from CR 701/702
CREATE TABLE keywords (
  name TEXT PRIMARY KEY,         -- e.g., "Flying", "Trample"
  section TEXT NOT NULL,         -- CR section reference (e.g., "702.9")
  type TEXT NOT NULL,            -- "ability" (702) or "action" (701)
  rules_text TEXT NOT NULL       -- full rules text for this keyword
);

-- Commander Spellbook combos
CREATE TABLE combos (
  id TEXT PRIMARY KEY,           -- Spellbook combo ID
  cards TEXT NOT NULL,           -- JSON array of card names
  color_identity TEXT,           -- JSON array: ["W","U","B"]
  prerequisites TEXT,            -- text description
  steps TEXT,                    -- text description
  results TEXT,                  -- text description
  legality TEXT,                 -- JSON object: {format: status}
  popularity INTEGER
);
```

**Rationale**: Oracle cards (not all printings) keeps the dataset manageable (~70K rows vs 300K+). FTS5 gives fast full-text search. Rules/glossary/keywords as separate tables allow efficient lookup by section, term, or keyword name. Combos table enables card-based and color-identity combo searches.

### 3. Data pipeline: three-source download orchestration

**Decision**: On server startup:
1. Check if `~/.mtg-oracle/cards.sqlite` exists
2. If not: download all three sources in parallel, ingest into SQLite
3. If yes: check each source for updates via metadata endpoints
4. Download only sources with newer data (Scryfall cards/rulings update daily, rules less often, combos periodically)
5. If any source unreachable: use existing data for that source (graceful degradation per-source)

**Source-specific update checks:**
- **Scryfall**: `GET https://api.scryfall.com/bulk-data` → compare `updated_at` timestamps
- **Academy Ruins**: `GET https://api.academyruins.com/cr` → compare rules effective date or ETag
- **Commander Spellbook**: Check timestamp, refresh if older than 7 days (combos change less frequently)

**Rationale**: Per-source update checking avoids re-downloading everything when only one source has new data. Parallel downloads on first run minimize startup time. Per-source graceful degradation means a flaky third-party API doesn't block the server.

### 4. Commander Spellbook integration via official npm client

**Decision**: Use `@space-cow-media/spellbook-client` (MIT license) to fetch combo data. Cache results in SQLite `combos` table for offline use.

**Rationale**: Official client handles API pagination, typing, and endpoint changes. MIT license is compatible. Caching in SQLite means combo searches work offline after first download. Refresh interval of 7 days balances freshness with API courtesy.

**Alternative considered**: Direct REST calls. Rejected — the official client is well-maintained and handles edge cases.

### 5. Curated knowledge as embedded TypeScript modules

**Decision**: Ship curated knowledge as TypeScript modules with embedded data. These are NOT downloaded — they are hand-built and version-controlled.

```
src/knowledge/
  archetypes.ts             -- ~20 archetype definitions
  formats.ts                -- 8-10 format primers
  mana-base.ts              -- Mana base guidelines by color count
  commander-strategies.ts   -- Commander strategies by color identity
  synergy-categories.ts     -- Synergy types for card discovery
```

**Rationale**: This is what differentiates mtg-oracle from API wrappers. External APIs provide card data but not MTG knowledge. These modules encode expert understanding. Embedded in the package means they work offline and are versioned with the code.

### 6. Tool design: 12 tools organized by domain

**Decision**: Twelve tools following MCP tool_design.md principles.

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_cards` | Full-text search with filters | SQLite FTS5 + legalities |
| `get_card` | Exact card lookup by name | SQLite cards + rulings |
| `get_rulings` | Official rulings for a card | SQLite rulings table |
| `check_legality` | Format legality for card(s) | SQLite legalities table |
| `search_by_mechanic` | Find cards by keyword/ability | SQLite + keywords table |
| `lookup_rule` | Search comprehensive rules | SQLite rules table |
| `get_glossary` | Glossary term definitions | SQLite glossary table |
| `get_keyword` | Keyword ability/action rules text | SQLite keywords table |
| `analyze_commander` | Commander analysis | SQLite + curated knowledge |
| `find_combos` | Combo search via Spellbook data | SQLite combos table |
| `find_synergies` | Synergy-based card discovery | SQLite + synergy categories |
| `get_format_staples` | Staple cards by format/archetype | Curated knowledge |

**Rationale**: 12 tools organized into clear domains (cards, rules, commander, knowledge). Each has a distinct purpose. The split between SQLite-backed tools and knowledge-backed tools reflects the two data tiers.

### 7. Project structure

```
src/
  server.ts                    -- MCP server entry point, tool registration
  tools/
    search-cards.ts
    get-card.ts
    get-rulings.ts
    check-legality.ts
    search-by-mechanic.ts
    lookup-rule.ts
    get-glossary.ts
    get-keyword.ts
    analyze-commander.ts
    find-combos.ts
    find-synergies.ts
    get-format-staples.ts
  data/
    pipeline.ts                -- Download orchestration (3 sources)
    scryfall.ts                -- Scryfall bulk download + ingest
    rules.ts                   -- Academy Ruins download + parse
    spellbook.ts               -- Commander Spellbook fetch + cache
    schema.sql                 -- SQLite schema DDL
    db.ts                      -- Database connection + query helpers
  knowledge/
    archetypes.ts
    formats.ts
    mana-base.ts
    commander-strategies.ts
    synergy-categories.ts
tests/
  data/
    pipeline.test.ts
    scryfall.test.ts
    rules.test.ts
    spellbook.test.ts
    db.test.ts
  tools/
    search-cards.test.ts
    get-card.test.ts
    get-rulings.test.ts
    check-legality.test.ts
    search-by-mechanic.test.ts
    lookup-rule.test.ts
    get-glossary.test.ts
    get-keyword.test.ts
    analyze-commander.test.ts
    find-combos.test.ts
    find-synergies.test.ts
    get-format-staples.test.ts
  knowledge/
    archetypes.test.ts
    formats.test.ts
    mana-base.test.ts
    commander-strategies.test.ts
    synergy-categories.test.ts
```

## Risks / Trade-offs

- **[~104MB download on first run]** Users must wait for initial download of all three sources. Mitigation: parallel downloads, progress logging, per-source graceful degradation.
- **[Scryfall rate limiting]** Scryfall asks for 50-100ms delay between requests. Mitigation: bulk data is a single download, not many requests.
- **[Academy Ruins API availability]** Third-party API could go down or change. Mitigation: graceful degradation (rules tools return "rules data unavailable"), cache in SQLite for offline use.
- **[Commander Spellbook API changes]** Backend API could change. Mitigation: using official npm client which handles versioning. Cache in SQLite.
- **[Stale curated knowledge]** Format staples and meta shift over time. Mitigation: version curated data, accept that staples are "generally good cards" not "current meta".
- **[better-sqlite3 native module]** Requires native compilation. Mitigation: well-supported on macOS/Linux/Windows, prebuild binaries available.
- **[Scryfall data schema changes]** Bulk data format could change. Mitigation: validate key fields during ingestion, fail gracefully.

## Open Questions

- Should downloads happen in parallel or sequentially on first run? (Parallel is faster but uses more memory.)
- Should `find_combos` also search locally cached combos via SQLite, or always hit the Spellbook API? (Design says cache in SQLite for offline — but should it also do live queries for freshest data?)
- How frequently should curated knowledge be updated? Per npm release? Community contributions?
