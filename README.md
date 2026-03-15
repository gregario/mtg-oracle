<!-- mcp-name: io.github.gregario/mtg-oracle -->

# mtg-oracle

[![npm version](https://img.shields.io/npm/v/mtg-oracle.svg)](https://www.npmjs.com/package/mtg-oracle)
[![npm downloads](https://img.shields.io/npm/dm/mtg-oracle.svg)](https://www.npmjs.com/package/mtg-oracle)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)

[![mtg-oracle MCP server](https://glama.ai/mcp/servers/gregario/mtg-oracle/badges/card.svg)](https://glama.ai/mcp/servers/gregario/mtg-oracle)
[![gregario/mtg-oracle MCP server](https://glama.ai/mcp/servers/gregario/mtg-oracle/badges/score.svg)](https://glama.ai/mcp/servers/gregario/mtg-oracle)

Magic: The Gathering MCP server. Card search, rules lookup, deck analysis, and Commander intelligence.

Provides 14 tools for AI assistants to answer questions about Magic cards, game rules, combos, synergies, and format meta via the [Model Context Protocol](https://modelcontextprotocol.io).

**Not just another Scryfall wrapper.** mtg-oracle downloads card data, comprehensive rules, and combo databases locally into SQLite for fast offline queries, and ships with curated MTG knowledge (archetypes, format primers, commander strategies, mana base guidelines) that makes LLMs genuinely competent at Magic.

## Installation

```bash
npm install -g mtg-oracle
```

Or run directly with npx:

```bash
npx mtg-oracle
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mtg-oracle": {
      "command": "npx",
      "args": ["-y", "mtg-oracle"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "mtg-oracle": {
      "command": "mtg-oracle"
    }
  }
}
```

## Claude Code Configuration

```bash
claude mcp add mtg-oracle -- npx -y mtg-oracle
```

## Data

On first run, mtg-oracle downloads card data from Scryfall and rules data from Academy Ruins. Data is stored in `~/.mtg-oracle/` and updated automatically on subsequent runs. No card data is bundled in the npm package.

## Tools

### Card Tools

| Tool | Description |
|------|-------------|
| `search_cards` | Search cards by name, type, color, mana cost, rarity, set, format, or keyword. Full-text search across names, type lines, and oracle text. |
| `get_card` | Get complete details for a specific card: oracle text, mana cost, type, P/T, rulings, and legality. Fuzzy name matching. |
| `get_rulings` | Get official Wizards of the Coast rulings for a card (interactions, edge cases, clarifications). |
| `check_legality` | Check format legality for one or more cards (up to 50). Covers Commander, Modern, Standard, Legacy, Vintage, and more. |
| `search_by_mechanic` | Find cards with a specific keyword or mechanic (Flying, Trample, Cascade, etc.). Optionally includes the keyword's rules definition. |
| `get_prices` | Look up current market prices for one or more cards (up to 50). Returns USD, USD Foil, EUR, and MTGO tix prices from Scryfall. |

### Deck Tools

| Tool | Description |
|------|-------------|
| `analyze_deck` | Analyze a deck list (plain text or MTGO XML). Returns mana curve, color distribution, type breakdown, mana base analysis, and format legality check. |

### Rules Tools

| Tool | Description |
|------|-------------|
| `lookup_rule` | Look up Comprehensive Rules by section number (e.g., "702.1") or search by text. Returns rule text with subsections and parent context. |
| `get_glossary` | Look up game terminology in the official glossary ("permanent", "spell", "stack", "priority", etc.). |
| `get_keyword` | Get the official rules definition for keyword abilities (Flying, Deathtouch, Equip, etc.). |

### Commander Tools

| Tool | Description |
|------|-------------|
| `analyze_commander` | Analyze a legendary creature as a Commander: strategies, archetypes, recommended card categories for deckbuilding. |
| `find_combos` | Find known infinite combos from Commander Spellbook. Search by card name(s) or color identity. Returns steps, prerequisites, and results. |
| `find_synergies` | Find synergy categories (tokens, sacrifice, counters, etc.) and sample cards that work well with a specific card. |
| `get_format_staples` | Get staple cards and popular archetypes for any format. Optionally filter by archetype. |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm start
```

## Attribution

- Card data provided by [Scryfall](https://scryfall.com). This project is not produced by or endorsed by Scryfall.
- Combo data from [Commander Spellbook](https://commanderspellbook.com).
- Rules data from [Academy Ruins](https://yawgatog.com/resources/magic-rules/).

## Legal

This is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast. All rights reserved.

## License

MIT
