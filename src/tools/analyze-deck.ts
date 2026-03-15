import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow, LegalityRow } from '../data/db.js';
import { parseDeckList, type ParsedDeck, type DeckEntry } from './deck-parser.js';
import { MANA_BASE_GUIDES } from '../knowledge/mana-base.js';

// --- Input schema ---

export const AnalyzeDeckInput = z.object({
  deck_list: z.string().describe('The deck list in plain text or MTGO .dek XML format'),
  format: z.string().optional().describe('Format to check legality against (e.g., "modern", "commander", "standard")'),
});

export type AnalyzeDeckParams = z.infer<typeof AnalyzeDeckInput>;

// --- Output types ---

export interface ManaCurveEntry {
  cmc: string; // "0", "1", ..., "7+"
  count: number;
}

export interface ColorCount {
  color: string;
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface ManaBaseAnalysis {
  land_count: number;
  land_percentage: number;
  recommended_lands: number | null;
  color_sources: Record<string, number>;
  color_requirements: Record<string, number>;
  warnings: string[];
}

export interface CardNotFound {
  name: string;
  suggestion?: string;
}

export interface DeckAnalysis {
  main_count: number;
  sideboard_count: number;
  commander?: string;
  format_hint?: string;
  mana_curve: ManaCurveEntry[];
  color_distribution: ColorCount[];
  type_breakdown: TypeCount[];
  mana_base: ManaBaseAnalysis;
  format_legality?: {
    format: string;
    all_legal: boolean;
    illegal_cards: Array<{ name: string; status: string }>;
  };
  cards_not_found: CardNotFound[];
}

export type AnalyzeDeckResult =
  | { success: true; analysis: DeckAnalysis }
  | { success: false; message: string };

// --- Helpers ---

interface ResolvedCard {
  entry: DeckEntry;
  card: CardRow;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

const TYPE_CATEGORIES = [
  'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact',
  'Land', 'Planeswalker', 'Battle',
];

function lookupCard(db: Database.Database, name: string): { card?: CardRow; suggestion?: string } {
  // 1. Exact match (case-insensitive)
  let card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
  ).get(name) as CardRow | undefined;

  if (card) return { card };

  // 2. LIKE fallback
  card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
  ).get(`%${name}%`) as CardRow | undefined;

  if (card) return { card };

  // 3. Suggestion based on first word
  const firstWord = name.split(' ')[0];
  if (firstWord && firstWord.length > 2) {
    const suggestion = db.prepare(
      'SELECT name FROM cards WHERE LOWER(name) LIKE LOWER(?) LIMIT 1'
    ).get(`%${firstWord}%`) as { name: string } | undefined;
    return { suggestion: suggestion?.name };
  }

  return {};
}

function extractColors(card: CardRow): string[] {
  if (card.colors) {
    try {
      return JSON.parse(card.colors) as string[];
    } catch { /* ignore */ }
  }
  return [];
}

function getTypeLine(card: CardRow): string {
  return card.type_line ?? '';
}

function classifyType(typeLine: string): string {
  for (const type of TYPE_CATEGORIES) {
    if (typeLine.toLowerCase().includes(type.toLowerCase())) {
      return type;
    }
  }
  return 'Other';
}

function extractColorRequirements(manaCost: string | null): Record<string, number> {
  if (!manaCost) return {};
  const req: Record<string, number> = {};
  for (const ch of manaCost) {
    if (COLOR_NAMES[ch]) {
      req[ch] = (req[ch] ?? 0) + 1;
    }
  }
  return req;
}

function countColorSources(typeLine: string, oracleText: string | null, colors: string[]): string[] {
  // Basic lands and dual lands produce colors based on their color identity and type
  const sources: string[] = [];
  const lower = typeLine.toLowerCase();
  const text = (oracleText ?? '').toLowerCase();

  // Check for basic land types
  if (lower.includes('plains')) sources.push('W');
  if (lower.includes('island')) sources.push('U');
  if (lower.includes('swamp')) sources.push('B');
  if (lower.includes('mountain')) sources.push('R');
  if (lower.includes('forest')) sources.push('G');

  // Check oracle text for mana production
  if (text.includes('{w}')) sources.push('W');
  if (text.includes('{u}')) sources.push('U');
  if (text.includes('{b}')) sources.push('B');
  if (text.includes('{r}')) sources.push('R');
  if (text.includes('{g}')) sources.push('G');

  // If it's a basic land, use the card's colors (for lands that produce based on name)
  if (sources.length === 0 && lower.includes('land')) {
    return colors;
  }

  // Deduplicate
  return [...new Set(sources)];
}

function getRecommendedLands(deckSize: number, colorCount: number, format?: string): number | null {
  const guide = MANA_BASE_GUIDES.find(g => g.colorCount === Math.min(colorCount, 5));
  if (!guide) return null;

  // Try to match format first
  if (format) {
    const rec = guide.landRecommendations.find(r =>
      r.format.toLowerCase() === format.toLowerCase()
    );
    if (rec) return rec.recommendedLands;
  }

  // Fallback: match by deck size
  if (deckSize >= 99) {
    const rec = guide.landRecommendations.find(r => r.deckSize === 100);
    if (rec) return rec.recommendedLands;
  }
  if (deckSize <= 45) {
    const rec = guide.landRecommendations.find(r => r.deckSize === 40);
    if (rec) return rec.recommendedLands;
  }

  // Default to 60-card recommendation
  const rec = guide.landRecommendations.find(r => r.deckSize === 60);
  return rec?.recommendedLands ?? null;
}

// --- Handler ---

export function handler(db: Database.Database, params: AnalyzeDeckParams): AnalyzeDeckResult {
  // 1. Parse the deck list
  let parsed: ParsedDeck;
  try {
    parsed = parseDeckList(params.deck_list);
  } catch (err) {
    return {
      success: false,
      message: `Failed to parse deck list: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const allEntries = [...parsed.main, ...parsed.sideboard];
  if (allEntries.length === 0) {
    return { success: false, message: 'Deck list is empty — no cards found.' };
  }

  // 2. Look up each card
  const resolved: ResolvedCard[] = [];
  const notFound: CardNotFound[] = [];

  for (const entry of allEntries) {
    const result = lookupCard(db, entry.name);
    if (result.card) {
      resolved.push({ entry, card: result.card });
    } else {
      notFound.push({
        name: entry.name,
        suggestion: result.suggestion,
      });
    }
  }

  // Also resolve main-only for analysis (sideboard excluded from curve/type/color)
  const mainEntries = parsed.main;
  const resolvedMain: ResolvedCard[] = [];
  for (const entry of mainEntries) {
    const result = lookupCard(db, entry.name);
    if (result.card) {
      resolvedMain.push({ entry, card: result.card });
    }
  }

  // 3. Compute mana curve (main deck non-land cards only)
  const cmcBuckets: Record<string, number> = {};
  for (let i = 0; i <= 6; i++) cmcBuckets[String(i)] = 0;
  cmcBuckets['7+'] = 0;

  for (const { entry, card } of resolvedMain) {
    if (classifyType(getTypeLine(card)) === 'Land') continue;
    const cmc = card.cmc ?? 0;
    const key = cmc >= 7 ? '7+' : String(Math.floor(cmc));
    cmcBuckets[key] = (cmcBuckets[key] ?? 0) + entry.count;
  }

  const mana_curve: ManaCurveEntry[] = Object.entries(cmcBuckets).map(([cmc, count]) => ({
    cmc,
    count,
  }));

  // 4. Color distribution (main deck)
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0 };
  for (const { entry, card } of resolvedMain) {
    const colors = extractColors(card);
    if (colors.length === 0) {
      colorCounts['Colorless'] += entry.count;
    } else {
      for (const c of colors) {
        colorCounts[c] = (colorCounts[c] ?? 0) + entry.count;
      }
    }
  }

  const color_distribution: ColorCount[] = Object.entries(colorCounts)
    .map(([color, count]) => ({
      color: COLOR_NAMES[color] ?? color,
      count,
    }));

  // 5. Type breakdown (main deck)
  const typeCounts: Record<string, number> = {};
  for (const type of [...TYPE_CATEGORIES, 'Other']) typeCounts[type] = 0;

  for (const { entry, card } of resolvedMain) {
    const type = classifyType(getTypeLine(card));
    typeCounts[type] = (typeCounts[type] ?? 0) + entry.count;
  }

  const type_breakdown: TypeCount[] = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ type, count }));

  // 6. Mana base analysis (main deck)
  const landCount = typeCounts['Land'] ?? 0;
  const mainCardCount = mainEntries.reduce((sum, e) => sum + e.count, 0);
  const landPercentage = mainCardCount > 0 ? (landCount / mainCardCount) * 100 : 0;

  // Color sources from lands
  const colorSources: Record<string, number> = {};
  for (const { entry, card } of resolvedMain) {
    if (classifyType(getTypeLine(card)) !== 'Land') continue;
    const producedColors = countColorSources(
      getTypeLine(card),
      card.oracle_text,
      extractColors(card),
    );
    for (const c of producedColors) {
      colorSources[c] = (colorSources[c] ?? 0) + entry.count;
    }
  }

  // Color requirements from mana costs
  const colorRequirements: Record<string, number> = {};
  for (const { entry, card } of resolvedMain) {
    const reqs = extractColorRequirements(card.mana_cost);
    for (const [c, n] of Object.entries(reqs)) {
      colorRequirements[c] = (colorRequirements[c] ?? 0) + (n * entry.count);
    }
  }

  // Unique colors in the deck
  const uniqueColors = new Set<string>();
  for (const { card } of resolvedMain) {
    for (const c of extractColors(card)) {
      uniqueColors.add(c);
    }
  }

  const format = params.format ?? (parsed.format_hint === 'commander' ? 'commander' : undefined);
  const recommendedLands = getRecommendedLands(mainCardCount, uniqueColors.size, format);

  const warnings: string[] = [];
  if (recommendedLands !== null) {
    const diff = landCount - recommendedLands;
    if (diff < -3) {
      warnings.push(`Land count (${landCount}) is ${Math.abs(diff)} below the recommended ${recommendedLands} for a ${mainCardCount}-card deck.`);
    } else if (diff > 3) {
      warnings.push(`Land count (${landCount}) is ${diff} above the recommended ${recommendedLands} for a ${mainCardCount}-card deck.`);
    }
  }

  // Check color source coverage
  for (const [color, reqCount] of Object.entries(colorRequirements)) {
    const sourceCount = colorSources[color] ?? 0;
    if (sourceCount < 8 && reqCount > 5) {
      const colorName = COLOR_NAMES[color] ?? color;
      warnings.push(`Low ${colorName} sources (${sourceCount}) for ${reqCount} ${colorName} pips in mana costs. Consider adding more ${colorName} sources.`);
    }
  }

  const mana_base: ManaBaseAnalysis = {
    land_count: landCount,
    land_percentage: Math.round(landPercentage * 10) / 10,
    recommended_lands: recommendedLands,
    color_sources: colorSources,
    color_requirements: colorRequirements,
    warnings,
  };

  // 7. Format legality check
  let format_legality: DeckAnalysis['format_legality'];
  if (params.format) {
    const illegalCards: Array<{ name: string; status: string }> = [];
    const checkedNames = new Set<string>();

    for (const { card } of resolved) {
      if (checkedNames.has(card.name)) continue;
      checkedNames.add(card.name);

      const legalities = db.prepare(
        'SELECT * FROM legalities WHERE card_id = ? AND LOWER(format) = LOWER(?)'
      ).get(card.id, params.format) as LegalityRow | undefined;

      if (!legalities) {
        illegalCards.push({ name: card.name, status: 'not_legal' });
      } else if (legalities.status !== 'legal') {
        illegalCards.push({ name: card.name, status: legalities.status });
      }
    }

    format_legality = {
      format: params.format,
      all_legal: illegalCards.length === 0,
      illegal_cards: illegalCards,
    };
  }

  // 8. Assemble result
  const sideboardCount = parsed.sideboard.reduce((sum, e) => sum + e.count, 0);

  const analysis: DeckAnalysis = {
    main_count: mainCardCount,
    sideboard_count: sideboardCount,
    commander: parsed.commander,
    format_hint: parsed.format_hint,
    mana_curve,
    color_distribution,
    type_breakdown,
    mana_base,
    format_legality,
    cards_not_found: notFound,
  };

  return { success: true, analysis };
}
