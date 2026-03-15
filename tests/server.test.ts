import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Smoke tests verifying that the MCP server structure is valid.
 * These test the server setup pattern without actually starting stdio transport.
 */

describe('MCP server setup', () => {
  it('creates a McpServer instance with correct metadata', () => {
    const server = new McpServer(
      { name: 'mtg-oracle', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });

  it('can register a tool with zod schema shape', async () => {
    const { z } = await import('zod');
    const server = new McpServer(
      { name: 'mtg-oracle', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    const schema = z.object({
      name: z.string().describe('Card name'),
    });

    // Should not throw
    server.tool(
      'test_tool',
      'A test tool description',
      schema.shape,
      async () => {
        return { content: [{ type: 'text' as const, text: 'ok' }] };
      },
    );
  });

  it('can register a tool with refined schema using innerType', async () => {
    const { z } = await import('zod');
    const server = new McpServer(
      { name: 'mtg-oracle', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    // LookupRuleInput uses .refine() — need .innerType().shape
    const schema = z.object({
      section: z.string().optional(),
      query: z.string().optional(),
    }).refine(data => data.section || data.query, {
      message: 'Either section or query must be provided',
    });

    server.tool(
      'test_refined',
      'Test refined schema',
      schema.innerType().shape,
      async () => {
        return { content: [{ type: 'text' as const, text: 'ok' }] };
      },
    );
  });

  it('can register a tool with union schema', async () => {
    const { z } = await import('zod');
    const server = new McpServer(
      { name: 'mtg-oracle', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    // CheckLegalityInput uses z.union in a field
    const schema = z.object({
      cards: z.union([z.string(), z.array(z.string())]),
      format: z.string().optional(),
    });

    server.tool(
      'test_union',
      'Test union schema',
      schema.shape,
      async () => {
        return { content: [{ type: 'text' as const, text: 'ok' }] };
      },
    );
  });

  it('registers all 12 tool schemas without error', async () => {
    const server = new McpServer(
      { name: 'mtg-oracle', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    // Import all schemas
    const { SearchCardsInput } = await import('../src/tools/search-cards.js');
    const { GetCardInput } = await import('../src/tools/get-card.js');
    const { GetRulingsInput } = await import('../src/tools/get-rulings.js');
    const { CheckLegalityInput } = await import('../src/tools/check-legality.js');
    const { SearchByMechanicInput } = await import('../src/tools/search-by-mechanic.js');
    const { LookupRuleInput } = await import('../src/tools/lookup-rule.js');
    const { GetGlossaryInput } = await import('../src/tools/get-glossary.js');
    const { GetKeywordInput } = await import('../src/tools/get-keyword.js');
    const { AnalyzeCommanderInput } = await import('../src/tools/analyze-commander.js');
    const { FindCombosInput } = await import('../src/tools/find-combos.js');
    const { FindSynergiesInput } = await import('../src/tools/find-synergies.js');
    const { GetFormatStaplesInput } = await import('../src/tools/get-format-staples.js');

    const dummyHandler = async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
    });

    // Register all 12 — none should throw
    server.tool('search_cards', 'Search cards', SearchCardsInput.shape, dummyHandler);
    server.tool('get_card', 'Get card', GetCardInput.shape, dummyHandler);
    server.tool('get_rulings', 'Get rulings', GetRulingsInput.shape, dummyHandler);
    server.tool('check_legality', 'Check legality', CheckLegalityInput.shape, dummyHandler);
    server.tool('search_by_mechanic', 'Search by mechanic', SearchByMechanicInput.shape, dummyHandler);
    server.tool('lookup_rule', 'Lookup rule', LookupRuleInput.innerType().shape, dummyHandler);
    server.tool('get_glossary', 'Get glossary', GetGlossaryInput.shape, dummyHandler);
    server.tool('get_keyword', 'Get keyword', GetKeywordInput.shape, dummyHandler);
    server.tool('analyze_commander', 'Analyze commander', AnalyzeCommanderInput.shape, dummyHandler);
    server.tool('find_combos', 'Find combos', FindCombosInput.shape, dummyHandler);
    server.tool('find_synergies', 'Find synergies', FindSynergiesInput.shape, dummyHandler);
    server.tool('get_format_staples', 'Get format staples', GetFormatStaplesInput.shape, dummyHandler);
  });
});
