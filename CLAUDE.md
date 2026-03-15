# mtg-oracle

MCP server for Magic: The Gathering card data, rules, and deck analysis.

## Stack Profiles

- MCP stack profile: `../../stacks/mcp/`
- TypeScript stack profile: `../../stacks/typescript/`

Read both stack profiles before writing any code.

## Architecture

- **Runtime data**: Downloads Scryfall bulk data on first run, stores in `~/.mtg-oracle/`
- **Does NOT bundle card data** in the npm package — data is fetched at runtime
- **Updates**: Checks Scryfall `bulk-data` metadata endpoint, downloads only if newer
- **Storage**: SQLite via `better-sqlite3` for fast indexed queries

## Data Source Compliance

### Wizards of the Coast — Fan Content Policy
This project is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast. All rights reserved.

### Scryfall Terms
- Card data provided by Scryfall
- Must remain free to use
- Must add value beyond raw data access
- Do not claim endorsement by Scryfall

## Engineering

Uses Superpowers for engineering execution. Follow TDD workflow: write tests first, then implement.
