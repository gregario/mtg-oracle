import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { getDatabase } from '../src/data/db.js';
import { createServer } from '../src/mcp.js';

const EXPECTED_TOOLS = [
  'analyze_commander',
  'analyze_deck',
  'check_legality',
  'find_combos',
  'find_synergies',
  'get_card',
  'get_format_staples',
  'get_glossary',
  'get_keyword',
  'get_prices',
  'get_rulings',
  'lookup_rule',
  'search_by_mechanic',
  'search_cards',
];

describe('createServer', () => {
  const db = getDatabase(':memory:');
  const client = new Client({ name: 'test-client', version: '0.0.0' });

  beforeAll(async () => {
    const server = createServer(db, '1.2.3');
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    db.close();
  });

  it('reports name and version', () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'mtg-oracle', version: '1.2.3' });
  });

  it('registers all 14 tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('answers tool calls against the given database', async () => {
    const result = await client.callTool({ name: 'get_card', arguments: { name: 'Lightning Bolt' } });
    expect(result.content).toEqual([expect.objectContaining({ type: 'text' })]);
  });
});
