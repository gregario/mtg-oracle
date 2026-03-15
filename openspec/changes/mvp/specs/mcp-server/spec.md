## ADDED Requirements

### Requirement: MCP server initialization
The system SHALL start as an MCP server using stdio transport, register all 8 tools, and initialize the data pipeline before accepting tool calls.

#### Scenario: Server startup
- **WHEN** the server process starts
- **THEN** the system SHALL initialize the data pipeline (check/download/update), connect to SQLite, register all tools with the MCP SDK, and begin accepting tool calls via stdio

#### Scenario: Data pipeline completes before tool registration
- **WHEN** the server starts for the first time (no local data)
- **THEN** the system SHALL complete the full data download and ingestion before registering tools, ensuring no tool call can execute against an empty database

#### Scenario: Server metadata
- **WHEN** an MCP client requests server info
- **THEN** the system SHALL report name "mtg-oracle", version from package.json, and list all 8 available tools with descriptions

### Requirement: Tool input validation
The system SHALL validate all tool inputs using Zod schemas and return clear error messages for invalid inputs.

#### Scenario: Missing required parameter
- **WHEN** a tool is called without a required parameter (e.g., `get_card` without `name`)
- **THEN** the system SHALL return a validation error listing the missing parameter

#### Scenario: Invalid parameter type
- **WHEN** a tool receives a parameter of the wrong type (e.g., `cmc_max: "three"` instead of a number)
- **THEN** the system SHALL return a validation error describing the expected type

#### Scenario: Valid input
- **WHEN** a tool receives all required parameters with correct types
- **THEN** the system SHALL process the request and return results

### Requirement: Tool response format
All tools SHALL return structured text responses optimized for LLM consumption, not raw JSON dumps.

#### Scenario: Card search results
- **WHEN** `search_cards` returns results
- **THEN** each card SHALL be formatted as a concise summary (name, mana cost, type, abbreviated oracle text) separated by blank lines

#### Scenario: Full card data
- **WHEN** `get_card` returns a card
- **THEN** the response SHALL be formatted with clear section headers (Name, Mana Cost, Type, Oracle Text, Stats, Legality, etc.)

#### Scenario: Error responses
- **WHEN** any tool encounters an error
- **THEN** the system SHALL return an `isError: true` response with a human-readable error message and suggested next steps

### Requirement: Tool descriptions for LLM consumption
Each tool SHALL have a description that explains to an LLM WHEN to call it, following MCP tool_design.md principles.

#### Scenario: Tool descriptions explain purpose
- **WHEN** an LLM reads the tool descriptions
- **THEN** each description SHALL clearly state what the tool does, when to use it vs other tools, and what parameters are available

#### Scenario: Tool descriptions distinguish similar tools
- **WHEN** an LLM must choose between `search_cards` and `search_by_mechanic`
- **THEN** the descriptions SHALL make clear that `search_cards` is for general queries (name, type, color, text) while `search_by_mechanic` is specifically for finding cards by keyword abilities and mechanics
