import { z } from 'zod';
import type Database from 'better-sqlite3';
import { FORMATS, type FormatPrimer } from '../knowledge/formats.js';
import { ARCHETYPES, type Archetype } from '../knowledge/archetypes.js';
import {
  COMMANDER_STRATEGIES,
  type CommanderStrategy,
} from '../knowledge/commander-strategies.js';

// --- Input schema ---

export const GetFormatStaplesInput = z.object({
  format: z.string().describe('Format to get staples for (e.g. "commander", "modern", "legacy")'),
  archetype: z.string().optional().describe('Optional archetype filter (e.g. "aggro-red", "control-uw")'),
});

export type GetFormatStaplesParams = z.infer<typeof GetFormatStaplesInput>;

// --- Output types ---

export interface FormatStaplesResult {
  format: string;
  format_info: {
    name: string;
    description: string;
    power_level: number;
  } | null;
  archetype_filter: string | null;
  staple_cards: string[];
  archetypes: Array<{
    id: string;
    name: string;
    example_cards: string[];
  }>;
}

// --- Handler ---

export function handler(_db: Database.Database, params: GetFormatStaplesParams): FormatStaplesResult {
  const formatLower = params.format.toLowerCase();

  // 1. Find format info
  const formatInfo = FORMATS.find(f =>
    f.id === formatLower || f.name.toLowerCase() === formatLower
  );

  // 2. If format is commander, include commander strategies
  const isCommander = formatLower === 'commander' || formatLower === 'edh';

  // 3. Find relevant archetypes
  let archetypes: Archetype[];
  if (params.archetype) {
    const arch = ARCHETYPES.find(a =>
      a.id === params.archetype!.toLowerCase() ||
      a.name.toLowerCase() === params.archetype!.toLowerCase()
    );
    archetypes = arch ? [arch] : [];
  } else {
    archetypes = ARCHETYPES.filter(a =>
      a.formatPresence.some(f => f.toLowerCase() === formatLower)
    );
  }

  // 4. Collect staple cards
  const stapleSet = new Set<string>();

  // From archetypes
  for (const arch of archetypes) {
    for (const card of arch.exampleCards) {
      stapleSet.add(card);
    }
  }

  // From commander strategies if format is commander
  if (isCommander) {
    let strategies: CommanderStrategy[];
    if (params.archetype) {
      const strat = COMMANDER_STRATEGIES.find(s =>
        s.id === params.archetype!.toLowerCase() ||
        s.name.toLowerCase() === params.archetype!.toLowerCase()
      );
      strategies = strat ? [strat] : [];

      // If we found a commander strategy, use it even if no archetype matched
      if (strategies.length > 0 && archetypes.length === 0) {
        // Commander strategies are valid archetype sources too
      }
    } else {
      strategies = [...COMMANDER_STRATEGIES];
    }

    for (const strat of strategies) {
      for (const card of strat.stapleCards) {
        stapleSet.add(card);
      }
    }
  }

  // Build archetype output — include commander strategies as pseudo-archetypes
  const archetypeOutput: Array<{ id: string; name: string; example_cards: string[] }> = [];

  for (const arch of archetypes) {
    archetypeOutput.push({
      id: arch.id,
      name: arch.name,
      example_cards: [...arch.exampleCards],
    });
  }

  if (isCommander) {
    let strategies: CommanderStrategy[];
    if (params.archetype) {
      const strat = COMMANDER_STRATEGIES.find(s =>
        s.id === params.archetype!.toLowerCase() ||
        s.name.toLowerCase() === params.archetype!.toLowerCase()
      );
      strategies = strat ? [strat] : [];
    } else {
      strategies = [...COMMANDER_STRATEGIES];
    }

    for (const strat of strategies) {
      archetypeOutput.push({
        id: strat.id,
        name: strat.name,
        example_cards: [...strat.stapleCards],
      });
    }
  }

  return {
    format: params.format,
    format_info: formatInfo
      ? {
          name: formatInfo.name,
          description: formatInfo.description,
          power_level: formatInfo.powerLevel,
        }
      : null,
    archetype_filter: params.archetype ?? null,
    staple_cards: [...stapleSet],
    archetypes: archetypeOutput,
  };
}
