import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow } from '../data/db.js';
import {
  COMMANDER_STRATEGIES,
  type CommanderStrategy,
  type ColorIdentity,
} from '../knowledge/commander-strategies.js';
import { ARCHETYPES, type Archetype } from '../knowledge/archetypes.js';

// --- Input schema ---

export const AnalyzeCommanderInput = z.object({
  name: z.string().describe('Commander card name to analyze'),
});

export type AnalyzeCommanderParams = z.infer<typeof AnalyzeCommanderInput>;

// --- Output types ---

export interface CommanderAnalysis {
  name: string;
  color_identity: string[];
  type_line: string;
  oracle_text: string | null;
  edhrec_rank: number | null;
  has_partner: boolean;
  suggested_strategies: Array<{
    id: string;
    name: string;
    description: string;
    power_brackets: string[];
    staple_cards: string[];
    key_synergies: string[];
  }>;
  suggested_archetypes: Array<{
    id: string;
    name: string;
    description: string;
    key_mechanics: string[];
  }>;
  recommended_categories: string[];
}

export type AnalyzeCommanderResult =
  | { found: true; analysis: CommanderAnalysis }
  | { found: false; message: string };

// --- Helpers ---

/**
 * Build the WUBRG color identity string key used in commander-strategies.
 */
function buildColorIdentityKey(colors: string[]): ColorIdentity {
  if (colors.length === 0) return 'colorless';
  const order = ['W', 'U', 'B', 'R', 'G'];
  const sorted = colors.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.join('') as ColorIdentity;
}

/**
 * Match strategies by exact color identity.
 */
function matchStrategies(colorIdentity: string[]): CommanderStrategy[] {
  const key = buildColorIdentityKey(colorIdentity);
  return COMMANDER_STRATEGIES.filter(s => s.colorIdentity === key);
}

/**
 * Match archetypes by checking if the card's oracle_text or keywords
 * overlap with archetype key mechanics.
 */
function matchArchetypes(
  oracleText: string | null,
  keywords: string[],
  colorIdentity: string[],
): Archetype[] {
  const textLower = (oracleText ?? '').toLowerCase();
  const keywordsLower = keywords.map(k => k.toLowerCase());

  return ARCHETYPES.filter(arch => {
    // Check mechanic overlap first
    const mechanicMatch = arch.keyMechanics.some(mech => {
      const mechLower = mech.toLowerCase();
      // For multi-word mechanics, also check individual words (e.g., "token generation" -> "token")
      const mechWords = mechLower.split(/\s+/);
      return textLower.includes(mechLower) ||
        keywordsLower.includes(mechLower) ||
        mechWords.some(w => w.length > 4 && textLower.includes(w));
    });

    // For commander analysis, mechanic overlap is sufficient.
    // Commanders can use any archetype strategy regardless of typical colors.
    return mechanicMatch;
  });
}

/**
 * Suggest recommended card categories based on the commander's abilities.
 */
function recommendCategories(
  oracleText: string | null,
  keywords: string[],
  typeLine: string | null,
): string[] {
  const categories: string[] = ['Ramp', 'Card Draw', 'Removal', 'Board Wipes'];
  const text = (oracleText ?? '').toLowerCase();
  const type = (typeLine ?? '').toLowerCase();

  if (text.includes('token') || text.includes('create')) categories.push('Token Generators');
  if (text.includes('counter') && !text.includes('counterspell')) categories.push('+1/+1 Counter Support');
  if (text.includes('graveyard') || text.includes('return from')) categories.push('Graveyard Recursion');
  if (text.includes('sacrifice') || text.includes('dies')) categories.push('Sacrifice Outlets');
  if (keywords.includes('Flying') || keywords.includes('Trample')) categories.push('Evasion');
  if (text.includes('equipment') || text.includes('equip')) categories.push('Equipment');
  if (text.includes('enchantment') || type.includes('enchantment')) categories.push('Enchantments');
  if (text.includes('artifact') || type.includes('artifact')) categories.push('Artifacts');
  if (text.includes('land') || text.includes('landfall')) categories.push('Lands Matter');

  return categories;
}

// --- Handler ---

export function handler(db: Database.Database, params: AnalyzeCommanderParams): AnalyzeCommanderResult {
  // 1. Look up the card
  let card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
  ).get(params.name) as CardRow | undefined;

  if (!card) {
    card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
    ).get(`%${params.name}%`) as CardRow | undefined;
  }

  if (!card) {
    return {
      found: false,
      message: `No card found matching "${params.name}"`,
    };
  }

  // 2. Verify it's a legendary creature
  const typeLine = card.type_line ?? '';
  if (!typeLine.toLowerCase().includes('legendary') || !typeLine.toLowerCase().includes('creature')) {
    return {
      found: false,
      message: `"${card.name}" is not a legendary creature (type: ${typeLine}). Only legendary creatures can be commanders.`,
    };
  }

  // 3. Extract data
  const colorIdentity: string[] = card.color_identity
    ? JSON.parse(card.color_identity) as string[]
    : [];
  const keywords: string[] = card.keywords
    ? JSON.parse(card.keywords) as string[]
    : [];

  // 4. Check for Partner
  const hasPartner = keywords.some(k =>
    k.toLowerCase() === 'partner' ||
    k.toLowerCase().startsWith('partner with')
  ) || (card.oracle_text ?? '').toLowerCase().includes('partner');

  // 5. Match strategies & archetypes
  const strategies = matchStrategies(colorIdentity);
  const archetypes = matchArchetypes(card.oracle_text, keywords, colorIdentity);
  const categories = recommendCategories(card.oracle_text, keywords, card.type_line);

  const analysis: CommanderAnalysis = {
    name: card.name,
    color_identity: colorIdentity,
    type_line: typeLine,
    oracle_text: card.oracle_text,
    edhrec_rank: card.edhrec_rank,
    has_partner: hasPartner,
    suggested_strategies: strategies.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      power_brackets: [...s.powerBrackets],
      staple_cards: [...s.stapleCards],
      key_synergies: [...s.keySynergies],
    })),
    suggested_archetypes: archetypes.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      key_mechanics: [...a.keyMechanics],
    })),
    recommended_categories: categories,
  };

  return { found: true, analysis };
}
