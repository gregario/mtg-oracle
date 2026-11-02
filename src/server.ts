#!/usr/bin/env node

/**
 * mtg-oracle MCP Server
 *
 * Exposes 12 Magic: The Gathering tools over the Model Context Protocol (stdio transport).
 * On startup: runs the data pipeline (download/update check), initializes the database,
 * registers all tools, and starts listening.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { runPipeline } from './data/pipeline.js';
import { createServer } from './mcp.js';
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

  // Initialize database
  const db = getDatabase();

  // Create MCP server (connect transport first, then update data in background)
  const server = createServer(db, version);

  // --- Connect transport and start ---

  const transport = new StdioServerTransport();
  console.error(`[mtg-oracle] v${version} starting on stdio...`);
  await server.connect(transport);
  console.error(`[mtg-oracle] Server running — 14 tools registered`);

  // Run data pipeline in background (download/update check)
  // Server is already accepting requests with existing cached data
  runPipeline(db)
    .then((result) => {
      console.error(`[mtg-oracle] Pipeline complete — Scryfall: ${result.scryfall.success ? 'ok' : 'failed'}, Rules: ${result.rules.success ? 'ok' : 'failed'}, Spellbook: ${result.spellbook.success ? 'ok' : 'failed'}`);
    })
    .catch((err) => {
      console.error(`[mtg-oracle] Data pipeline error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('[mtg-oracle] Continuing with existing data (if any)...');
    });

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`[mtg-oracle] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
