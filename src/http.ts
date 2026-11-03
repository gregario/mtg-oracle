/**
 * Streamable HTTP transport, for remote MCP clients (e.g. claude.ai custom connectors).
 *
 * Stateless: every POST to /mcp gets its own McpServer and transport, closed when the
 * response ends. The tools only read the shared database, so there is no session state
 * to keep, and any number of clients (or replicas behind a proxy) can be served.
 */

import http from 'node:http';
import type Database from 'better-sqlite3';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './mcp.js';
import { loadLastUpdate } from './data/pipeline.js';

const MCP_PATH = '/mcp';
const HEALTH_PATH = '/healthz';

function sendJson(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(JSON.stringify(body));
}

function jsonRpcError(code: number, message: string): unknown {
  return { jsonrpc: '2.0', error: { code, message }, id: null };
}

async function handleMcp(db: Database.Database, version: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const server = createServer(db, version);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

/**
 * Creates an HTTP server exposing MCP at POST /mcp and a health check at GET /healthz.
 * The health check reports when each data source was last updated (from `dataDir`),
 * so monitoring can alert on stale data. The caller is responsible for calling listen().
 */
export function createHttpServer(db: Database.Database, version: string, dataDir?: string): http.Server {
  return http.createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');

    if (pathname === HEALTH_PATH && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok', version, lastUpdate: loadLastUpdate(dataDir) });
      return;
    }

    if (pathname !== MCP_PATH) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    if (req.method !== 'POST') {
      // No sessions to resume or delete, and no server-initiated messages to stream.
      sendJson(res, 405, jsonRpcError(-32000, 'Method not allowed'), { Allow: 'POST' });
      return;
    }

    handleMcp(db, version, req, res).catch((err) => {
      console.error(`[mtg-oracle] HTTP request error: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        sendJson(res, 500, jsonRpcError(-32603, 'Internal server error'));
      }
    });
  });
}
