import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getDatabase } from '../src/data/db.js';
import { saveLastUpdate } from '../src/data/pipeline.js';
import { createHttpServer } from '../src/http.js';

describe('HTTP transport', () => {
  const db = getDatabase(':memory:');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtg-oracle-http-'));
  let httpServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    saveLastUpdate({ scryfall: '2026-10-01T00:00:00.000Z', rules: '2026-10-02T00:00:00.000Z' }, dataDir);
    httpServer = createHttpServer(db, '1.2.3', dataDir);
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function connectClient(): Promise<Client> {
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
    return client;
  }

  it('serves MCP over streamable HTTP at /mcp', async () => {
    const client = await connectClient();
    expect(client.getServerVersion()).toMatchObject({ name: 'mtg-oracle', version: '1.2.3' });
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(14);
    const result = await client.callTool({ name: 'get_card', arguments: { name: 'Lightning Bolt' } });
    expect(result.content).toEqual([expect.objectContaining({ type: 'text' })]);
    await client.close();
  });

  it('serves independent clients without sessions', async () => {
    const [a, b] = await Promise.all([connectClient(), connectClient()]);
    const [toolsA, toolsB] = await Promise.all([a.listTools(), b.listTools()]);
    expect(toolsA.tools).toHaveLength(14);
    expect(toolsB.tools).toHaveLength(14);
    await Promise.all([a.close(), b.close()]);
  });

  it('answers /healthz with status, version, and when each data source was last updated', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      version: '1.2.3',
      lastUpdate: { scryfall: '2026-10-01T00:00:00.000Z', rules: '2026-10-02T00:00:00.000Z' },
    });
  });

  it('rejects GET and DELETE on /mcp, since there are no sessions or server-initiated streams', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await fetch(`${baseUrl}/mcp`, { method });
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    }
  });

  it('returns 404 for unknown paths', async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });
});
