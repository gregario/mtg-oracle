## MODIFIED Requirements

### Requirement: MCP server initialization
The system SHALL start as an MCP server on stdio by default, or on streamable HTTP when configured, and register all 14 tools.

#### Scenario: Server startup on stdio
- **WHEN** the server process starts with no transport configured
- **THEN** the system SHALL connect to SQLite, register all 14 tools, and accept tool calls via stdio

#### Scenario: Server startup on HTTP
- **WHEN** the server process starts with `--http` or `MTG_ORACLE_TRANSPORT=http`
- **THEN** the system SHALL listen on `MTG_ORACLE_HOST` (default `127.0.0.1`) and `MTG_ORACLE_PORT` (default `3000`) and accept tool calls via streamable HTTP at `POST /mcp`

#### Scenario: Invalid configuration
- **WHEN** `MTG_ORACLE_TRANSPORT` is neither `stdio` nor `http`, or `MTG_ORACLE_PORT` is not a valid port
- **THEN** the system SHALL exit with an error naming the variable, rather than fall back to a default

## ADDED Requirements

### Requirement: Stateless HTTP transport
The HTTP transport SHALL keep no per-client state, so that any number of clients can be served by any instance.

#### Scenario: Independent clients
- **WHEN** several clients initialize and call tools concurrently
- **THEN** each SHALL be served correctly, with no session ID issued or required

#### Scenario: Session and stream methods
- **WHEN** a client sends `GET` or `DELETE` to `/mcp`
- **THEN** the system SHALL respond 405 with `Allow: POST`

### Requirement: Health check
The HTTP transport SHALL expose a health endpoint for container orchestrators and reverse proxies.

#### Scenario: Health probe
- **WHEN** a client sends `GET /healthz`
- **THEN** the system SHALL respond 200 with `{"status":"ok","version":"<package version>"}`
