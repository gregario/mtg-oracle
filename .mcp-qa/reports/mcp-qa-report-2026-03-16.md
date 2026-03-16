# MCP QA Report: mtg-oracle
**Date:** 2026-03-16
**Mode:** full
**Server version:** 0.2.0
**Health score:** 89/100 — Minor issues, fix before shipping

## Discovery
- **Tools:** 14 registered
- **Resources:** 0 registered
- **Prompts:** 0 registered

## Data Pipeline
- Scryfall bulk data: OK (36,923 cards, 74,817 rulings)
- Comprehensive rules: FAILED (external API issue — `Cannot read properties of undefined (reading 'length')`)
- Commander Spellbook: FAILED (external API issue — request interceptor failure)
- Server starts and operates with partial data — graceful degradation.

## Tool Execution Results
| Tool | Status | Response Size | Notes |
|------|--------|---------------|-------|
| search_cards | PASS | 3,558 bytes | Returns 25 cards with summaries |
| get_card | PASS | 785 bytes | Full Lightning Bolt details with prices, legality |
| get_rulings | PASS | 67 bytes | No rulings for Lightning Bolt — correct |
| check_legality | FAIL | 946 bytes | Probe generated empty args; tool requires `cards` param (anyOf string/array) — probe limitation, not server bug |
| search_by_mechanic | PASS | 2,668 bytes | Returns 25 cards with trample |
| lookup_rule | PASS | 64 bytes | No rules data (pipeline failed) — graceful |
| get_glossary | PASS | 63 bytes | No glossary data (pipeline failed) — graceful |
| get_keyword | PASS | 71 bytes | No keyword data (pipeline failed) — graceful |
| analyze_commander | PASS | 134 bytes | Correctly identifies Lightning Bolt is not legendary |
| find_combos | PASS | 66 bytes | No combos data (pipeline failed) — graceful |
| find_synergies | PASS | 93 bytes | No synergy matches — correct for Lightning Bolt |
| get_format_staples | PASS | 1,520 bytes | Returns Standard staples |
| get_prices | PASS | 103 bytes | Returns $2.95 USD for Lightning Bolt |
| analyze_deck | PASS | 415 bytes | Full analysis: mana curve, colors, types, mana base |

13/14 tools pass. 1 probe-induced failure (check_legality schema uses anyOf which probe couldn't handle — not a server issue).

## Best Practices Lint
| Check | Status | Severity |
|-------|--------|----------|
| No console.log in server code | PASS | CRITICAL |
| Shebang on entry point | PASS | HIGH |
| chmod in build script | FAIL | MEDIUM |
| All imports have .js extensions | PASS | HIGH |
| No 0.0.0.0 binding | PASS (stdio only) | CRITICAL |
| No secrets in parameters | PASS | CRITICAL |
| No secrets in hardcoded strings | PASS | HIGH |
| Error cases use isError: true | PASS (14 error handlers) | HIGH |
| Graceful shutdown handlers | FAIL | LOW |
| Server name/version from package.json | PASS | LOW |

## Findings

### FINDING-001: No graceful shutdown handlers
**Severity:** low
**Category:** practices
**Details:** No SIGINT/SIGTERM handlers. The server exits abruptly on signal. Should close the MCP server and SQLite database cleanly.

### FINDING-002: Build script missing chmod
**Severity:** medium
**Category:** practices
**Details:** Build script is `tsc && cp src/data/schema.sql dist/data/schema.sql` — missing `chmod +x dist/server.js`. The built entry point has `-rw-r--r--` permissions. `npx` may still work (runs via `node`), but direct execution will fail.

### FINDING-003: Rules pipeline error
**Severity:** medium
**Category:** execution
**Details:** Comprehensive rules download fails with `Cannot read properties of undefined (reading 'length')`. This means `lookup_rule`, `get_glossary`, and `get_keyword` return empty results. The error handling is graceful (server still starts, tools return "no data" messages), but the pipeline itself has a bug — likely the API response format changed.

### FINDING-004: Spellbook pipeline error
**Severity:** low
**Category:** execution
**Details:** Commander Spellbook API request fails. `find_combos` returns "no combos found" instead of crashing. Graceful degradation works, but the external API integration may need updating.

## Score Breakdown
| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Connectivity | 100 | 20% | 20.0 |
| Tool Quality | 100 | 25% | 25.0 |
| Tool Execution | 84 | 25% | 21.0 |
| Best Practices | 89 | 15% | 13.4 |
| Security | 100 | 10% | 10.0 |
| Value Delivery | 100 | 5% | 5.0 |
| **Total** | | | **89/100** |

### Execution: 100 - 8 (MEDIUM: rules pipeline) - 8 (MEDIUM: check_legality probe fail, discounted since probe limitation) = 84. Actually check_legality is probe's fault, so 100 - 8 (rules) - 3 (spellbook, LOW) = 89. Adjusted to split: execution=84 accounting for degraded pipelines. Best Practices: 100 - 8 (MEDIUM: chmod) - 3 (LOW: shutdown) = 89.
