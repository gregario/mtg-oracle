#!/usr/bin/env node

/**
 * mtg-oracle MCP Server
 *
 * Exposes 12 Magic: The Gathering tools over the Model Context Protocol (stdio transport).
 * On startup: runs the data pipeline (download/update check), initializes the database,
 * registers all tools, and starts listening.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { runPipeline } from './data/pipeline.js';
import { createRequire } from 'node:module';

// Tool schemas and handlers
import { SearchCardsInput, handler as searchCardsHandler } from './tools/search-cards.js';
import { GetCardInput, handler as getCardHandler } from './tools/get-card.js';
import { GetRulingsInput, handler as getRulingsHandler } from './tools/get-rulings.js';
import { CheckLegalityInput, handler as checkLegalityHandler } from './tools/check-legality.js';
import { SearchByMechanicInput, handler as searchByMechanicHandler } from './tools/search-by-mechanic.js';
import { LookupRuleInput, handler as lookupRuleHandler } from './tools/lookup-rule.js';
import { GetGlossaryInput, handler as getGlossaryHandler } from './tools/get-glossary.js';
import { GetKeywordInput, handler as getKeywordHandler } from './tools/get-keyword.js';
import { AnalyzeCommanderInput, handler as analyzeCommanderHandler } from './tools/analyze-commander.js';
import { FindCombosInput, handler as findCombosHandler } from './tools/find-combos.js';
import { FindSynergiesInput, handler as findSynergiesHandler } from './tools/find-synergies.js';
import { GetFormatStaplesInput, handler as getFormatStaplesHandler } from './tools/get-format-staples.js';
import { GetPricesInput, handler as getPricesHandler } from './tools/get-prices.js';
import { AnalyzeDeckInput, handler as analyzeDeckHandler } from './tools/analyze-deck.js';

// Response formatters
import {
  formatSearchCards,
  formatGetCard,
  formatGetRulings,
  formatCheckLegality,
  formatSearchByMechanic,
  formatLookupRule,
  formatGetGlossary,
  formatGetKeyword,
  formatAnalyzeCommander,
  formatFindCombos,
  formatFindSynergies,
  formatGetFormatStaples,
  formatGetPrices,
  formatAnalyzeDeck,
} from './format.js';

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

  // Run data pipeline (download/update check)
  // On first run this downloads card data; on subsequent runs it checks for updates
  try {
    console.error(`[mtg-oracle] Starting data pipeline...`);
    const pipelineResult = await runPipeline(db);
    console.error(`[mtg-oracle] Pipeline complete — Scryfall: ${pipelineResult.scryfall.success ? 'ok' : 'failed'}, Rules: ${pipelineResult.rules.success ? 'ok' : 'failed'}, Spellbook: ${pipelineResult.spellbook.success ? 'ok' : 'failed'}`);
  } catch (err) {
    console.error(`[mtg-oracle] Data pipeline error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('[mtg-oracle] Continuing with existing data (if any)...');
  }

  // Create MCP server
  const server = new McpServer(
    { name: 'mtg-oracle', version },
    { capabilities: { tools: {} } },
  );

  // --- Register Card Tools ---

  server.tool(
    'search_cards',
    'Search for Magic: The Gathering cards by name, type, color, mana cost, rarity, set, format legality, or keyword. Use this when you need to find cards matching specific criteria. Supports full-text search across card names, type lines, and oracle text. Returns a summary list — use get_card for full details on a specific card.',
    SearchCardsInput.shape,
    async (params) => {
      try {
        const result = searchCardsHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatSearchCards(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error searching cards: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_card',
    'Get complete details for a specific Magic card including oracle text, mana cost, type, power/toughness, rulings, and format legality. Use this when you know the exact card name (or close to it) and need full information. Supports fuzzy matching — partial names work.',
    GetCardInput.shape,
    async (params) => {
      try {
        const result = getCardHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetCard(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting card: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_rulings',
    'Get official rulings for a specific Magic card. Use this when a user asks about specific interactions, edge cases, or how a card works in unusual situations. Returns timestamped rulings from Wizards of the Coast.',
    GetRulingsInput.shape,
    async (params) => {
      try {
        const result = getRulingsHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetRulings(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting rulings: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'check_legality',
    'Check which formats a card (or multiple cards) is legal in. Use this when a user wants to know if a card is legal, banned, or restricted in formats like Commander, Modern, Standard, Legacy, or Vintage. Accepts a single card name or an array of up to 50 card names.',
    CheckLegalityInput.shape,
    async (params) => {
      try {
        const result = checkLegalityHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatCheckLegality(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error checking legality: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'search_by_mechanic',
    'Find cards that have a specific keyword or mechanic (e.g., "Flying", "Trample", "Scry", "Cascade"). Use this when a user asks about cards with a particular ability or mechanic. Optionally includes the keyword\'s official rules definition.',
    SearchByMechanicInput.shape,
    async (params) => {
      try {
        const result = searchByMechanicHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatSearchByMechanic(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error searching by mechanic: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  // --- Register Rules Tools ---

  server.tool(
    'lookup_rule',
    'Look up a specific section of the Magic: The Gathering Comprehensive Rules by section number (e.g., "702", "702.1") or search rules text. Use this when a user asks about specific game rules, rule interactions, or needs the official rule text. Returns the rule and its subsections.',
    LookupRuleInput.innerType().shape,
    async (params) => {
      try {
        const result = lookupRuleHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatLookupRule(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error looking up rule: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_glossary',
    'Look up a term in the Magic: The Gathering glossary. Use this when a user asks "what does X mean" for game-specific terminology like "permanent", "spell", "stack", "priority", etc. Supports partial matching.',
    GetGlossaryInput.shape,
    async (params) => {
      try {
        const result = getGlossaryHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetGlossary(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting glossary entry: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_keyword',
    'Get the official rules definition for a Magic keyword ability (e.g., "Flying", "Deathtouch", "Equip"). Use this when a user asks how a keyword works or what its rules text says. Different from get_glossary — this is specifically for keyword abilities with rules text.',
    GetKeywordInput.shape,
    async (params) => {
      try {
        const result = getKeywordHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetKeyword(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting keyword: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  // --- Register Commander Tools ---

  server.tool(
    'analyze_commander',
    'Analyze a legendary creature as a potential Commander. Returns color identity, suggested strategies, archetypes, and recommended card categories for building a deck around this commander. Use this when a user wants help building or evaluating a Commander deck.',
    AnalyzeCommanderInput.shape,
    async (params) => {
      try {
        const result = analyzeCommanderHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatAnalyzeCommander(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error analyzing commander: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'find_combos',
    'Find known infinite combos and synergistic card combinations from Commander Spellbook. Use this when a user asks about combos involving specific cards, combos in specific colors, or wants to find win conditions. Returns combo steps, prerequisites, and results.',
    FindCombosInput.shape,
    async (params) => {
      try {
        const result = findCombosHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatFindCombos(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error finding combos: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'find_synergies',
    'Find synergy categories and sample cards that work well with a specific card. Use this when a user wants to know what strategies or card types synergize with a particular card. Identifies matching archetypes (tokens, sacrifice, counters, etc.) and suggests complementary cards.',
    FindSynergiesInput.shape,
    async (params) => {
      try {
        const result = findSynergiesHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatFindSynergies(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error finding synergies: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_format_staples',
    'Get staple cards and popular archetypes for a specific format (Commander, Modern, Legacy, etc.). Use this when a user asks about the meta, popular decks, or key cards in a format. Optionally filter by archetype.',
    GetFormatStaplesInput.shape,
    async (params) => {
      try {
        const result = getFormatStaplesHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetFormatStaples(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting format staples: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  // --- Register Price Tools ---

  server.tool(
    'get_prices',
    'Look up current market prices for one or more Magic cards. Returns USD, USD Foil, EUR, and MTGO tix prices from Scryfall. Use this when a user asks about card prices, deck costs, or wants to compare card values.',
    GetPricesInput.shape,
    async (params) => {
      try {
        const result = getPricesHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatGetPrices(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error getting prices: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  // --- Register Deck Tools ---

  server.tool(
    'analyze_deck',
    'Analyze a Magic: The Gathering deck list. Paste a deck list (plain text format like \'4 Lightning Bolt\' per line, or MTGO .dek XML) and get mana curve, color distribution, type breakdown, mana base analysis, and format legality check. Use this when a user shares a deck list and wants feedback.',
    AnalyzeDeckInput.shape,
    async (params) => {
      try {
        const result = analyzeDeckHandler(db, params);
        return { content: [{ type: 'text' as const, text: formatAnalyzeDeck(result) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error analyzing deck: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  // --- Connect transport and start ---

  const transport = new StdioServerTransport();
  console.error(`[mtg-oracle] v${version} starting on stdio...`);
  await server.connect(transport);
  console.error(`[mtg-oracle] Server running — 14 tools registered`);

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
