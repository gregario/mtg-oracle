## Why

mtg-oracle only speaks stdio, so it works only with clients that launch it as a local process (Claude Desktop, Claude Code). Remote MCP clients, such as claude.ai custom connectors and the Claude mobile apps, connect to a URL and cannot launch processes. Serving the same tools over streamable HTTP makes one self-hosted instance usable from every client, while keeping the local-SQLite design that sets mtg-oracle apart from live-API wrappers.

## What Changes

- **Tool registration moves into `createServer(db, version)`** (`src/mcp.ts`), so a server can be created per transport, per request, or per test.
- **Streamable HTTP transport** (`src/http.ts`), opt-in with `--http` or `MTG_ORACLE_TRANSPORT=http`. MCP at `POST /mcp`, stateless (no sessions; one server and transport per request, JSON responses), `GET /healthz` for health checks. `GET`/`DELETE /mcp` return 405, as there are no sessions or server-initiated streams.
- **Configuration** (`src/config.ts`): `MTG_ORACLE_HOST` (default `127.0.0.1`) and `MTG_ORACLE_PORT` (default `3000`). Invalid values stop the server at startup.
- **Long-running servers**: `MTG_ORACLE_DATA_DIR` overrides `~/.mtg-oracle` (e.g. for a container volume). The data pipeline re-runs every `MTG_ORACLE_REFRESH_HOURS` (default 24, 0 disables), skipping a tick if the previous run is still going; it already downloads only what changed. `/healthz` reports each source's last update, so monitoring can alert on stale data.
- stdio stays the default, so existing installs are unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities
- `mcp-server`: may serve over streamable HTTP as well as stdio.
- `data-pipeline`: configurable data directory; periodic refresh while running.

## Impact

- **Dependencies**: none new. `StreamableHTTPServerTransport` ships with `@modelcontextprotocol/sdk`, and the server uses `node:http`.
- **Security**: the HTTP server has no authentication and binds to localhost by default. Exposing it is the operator's choice, behind a reverse proxy that adds TLS and access control.
