#!/usr/bin/env node

/**
 * mtg-oracle MCP Server
 *
 * Exposes 14 Magic: The Gathering tools over the Model Context Protocol, on stdio
 * (default) or streamable HTTP (`--http` or MTG_ORACLE_TRANSPORT=http; see config.ts).
 * On startup: initializes the database, starts listening, then runs the data pipeline
 * (download/update check) in the background, and again every MTG_ORACLE_REFRESH_HOURS.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { runPipeline } from './data/pipeline.js';
import { createServer } from './mcp.js';
import { createHttpServer } from './http.js';
import { resolveConfig } from './config.js';
import { scheduleRefresh } from './refresh.js';
import { createRequire } from 'node:module';

// --- Version ---

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

// --- Main ---

async function main(): Promise<void> {
  const version = getVersion();
  const config = resolveConfig(process.argv.slice(2), process.env);

  // Initialize database
  const db = getDatabase(config.dataDir);

  // Connect transport first, then update data in background
  let close: () => Promise<void>;
  if (config.transport === 'http') {
    const httpServer = createHttpServer(db, version, config.dataDir);
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(config.port, config.host, resolve);
    });
    console.error(`[mtg-oracle] v${version} listening on http://${config.host}:${config.port}/mcp — 14 tools registered`);
    close = () => new Promise((resolve) => httpServer.close(() => resolve()));
  } else {
    const server = createServer(db, version);
    console.error(`[mtg-oracle] v${version} starting on stdio...`);
    await server.connect(new StdioServerTransport());
    console.error(`[mtg-oracle] Server running — 14 tools registered`);
    close = () => server.close();
  }

  // Run data pipeline in background (download/update check), now and periodically.
  // Server is already accepting requests with existing cached data
  const refreshData = () =>
    runPipeline(db, { dataDir: config.dataDir })
      .then((result) => {
        console.error(`[mtg-oracle] Pipeline complete — Scryfall: ${result.scryfall.success ? 'ok' : 'failed'}, Rules: ${result.rules.success ? 'ok' : 'failed'}, Spellbook: ${result.spellbook.success ? 'ok' : 'failed'}`);
      })
      .catch((err) => {
        console.error(`[mtg-oracle] Data pipeline error: ${err instanceof Error ? err.message : String(err)}`);
        console.error('[mtg-oracle] Continuing with existing data (if any)...');
      });
  void refreshData();
  const refresh = scheduleRefresh(refreshData, config.refreshHours);

  process.on('SIGINT', async () => {
    refresh.stop();
    await close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    refresh.stop();
    await close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`[mtg-oracle] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
