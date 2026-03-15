import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow } from '../data/db.js';
import {
  SYNERGY_CATEGORIES,
  type SynergyCategory,
} from '../knowledge/synergy-categories.js';

// --- Input schema ---

export const FindSynergiesInput = z.object({
  card_name: z.string().describe('Card name to find synergies for'),
  color_identity: z.array(z.string()).optional().describe('Filter synergistic cards within this color identity'),
  format: z.string().optional().describe('Filter by format relevance'),
  category: z.string().optional().describe('Filter by specific synergy category ID'),
  limit: z.number().min(1).max(50).optional().describe('Max sample cards per category (default 5, max 50)'),
});

export type FindSynergiesParams = z.infer<typeof FindSynergiesInput>;

// --- Output types ---

export interface SynergyCategoryMatch {
  id: string;
  name: string;
  description: string;
  match_reason: string;
  sample_cards: string[];
}

export interface FindSynergiesResult {
  card_name: string;
  creature_types: string[];
  keywords: string[];
  matching_categories: SynergyCategoryMatch[];
}

// --- Helpers ---

/**
 * Extract creature types from a type_line like "Legendary Creature — Elf Druid".
 */
function extractCreatureTypes(typeLine: string | null): string[] {
  if (!typeLine) return [];
  const dashIndex = typeLine.indexOf('—');
  if (dashIndex === -1) return [];
  const subtypes = typeLine.substring(dashIndex + 1).trim();
  return subtypes.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Category-specific oracle text keywords for matching.
 * More targeted than splitting subcategory descriptions.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sacrifice: ['sacrifice', 'dies', 'death trigger', 'when .* dies'],
  counters: ['+1/+1 counter', 'counter on', 'counters on', 'proliferate'],
  graveyard: ['graveyard', 'return .* from your graveyard', 'reanimate', 'mill yourself'],
  tokens: ['create .* token', 'token creature', 'tokens'],
  enchantress: ['enchantment', 'cast an enchantment', 'aura'],
  artifacts: ['artifact', 'affinity', 'metalcraft'],
  landfall: ['landfall', 'land enters', 'whenever a land'],
  storm: ['storm', 'magecraft', 'cast an instant or sorcery'],
  voltron: ['equip', 'equipment', 'attached', 'aura'],
  mill: ['mill', 'put .* cards .* into .* graveyard', 'library into'],
  lifegain: ['gain life', 'gains life', 'lifelink', 'whenever you gain life'],
  blink: ['exile .* return', 'flicker', 'enters the battlefield'],
  wheels: ['discard .* hand', 'each player draws', 'wheel'],
  stax: ['can\'t cast', 'costs .* more', 'don\'t untap', 'tax'],
  spellslinger: ['prowess', 'magecraft', 'instant or sorcery', 'cast .* spell'],
};

/**
 * Determine which synergy categories match a card based on its keywords,
 * oracle text, and creature types.
 */
function matchSynergyCategories(
  oracleText: string | null,
  keywords: string[],
  creatureTypes: string[],
  format?: string,
  categoryFilter?: string,
): Array<{ category: SynergyCategory; reason: string }> {
  const text = (oracleText ?? '').toLowerCase();
  const keywordsLower = keywords.map(k => k.toLowerCase());
  const matches: Array<{ category: SynergyCategory; reason: string }> = [];

  for (const cat of SYNERGY_CATEGORIES) {
    // Filter by specific category if provided
    if (categoryFilter && cat.id !== categoryFilter) continue;

    // Filter by format relevance
    if (format && !cat.relevantFormats.some(f => f.toLowerCase() === format.toLowerCase())) {
      continue;
    }

    let reason: string | null = null;

    // Check tribal: if creature types are present and category is tribal
    if (cat.id === 'tribal' && creatureTypes.length > 0) {
      reason = `Creature types: ${creatureTypes.join(', ')}`;
    }

    // Check keywords overlap with synergy category subcategories
    if (!reason) {
      for (const sub of cat.subcategories) {
        const subNameLower = sub.name.toLowerCase();
        const subDescLower = sub.description.toLowerCase();

        for (const kw of keywordsLower) {
          if (subNameLower.includes(kw) || subDescLower.includes(kw)) {
            reason = `Keyword "${kw}" matches subcategory "${sub.name}"`;
            break;
          }
        }
        if (reason) break;
      }
    }

    // Check oracle text against category-specific keyword patterns
    if (!reason) {
      const catKeywords = CATEGORY_KEYWORDS[cat.id];
      if (catKeywords) {
        for (const pattern of catKeywords) {
          if (pattern.includes('.')) {
            // Regex pattern
            const regex = new RegExp(pattern, 'i');
            if (regex.test(text)) {
              reason = `Oracle text matches "${cat.name}" pattern`;
              break;
            }
          } else {
            // Simple substring match
            if (text.includes(pattern)) {
              reason = `Oracle text mentions "${pattern}"`;
              break;
            }
          }
        }
      }
    }

    if (reason) {
      matches.push({ category: cat, reason });
    }
  }

  return matches;
}

/**
 * Find sample cards in the database that share a creature type.
 */
function findTribalCards(
  db: Database.Database,
  creatureTypes: string[],
  excludeName: string,
  colorIdentity?: string[],
  limit: number = 5,
): string[] {
  const results: string[] = [];

  for (const type of creatureTypes) {
    let sql = 'SELECT name FROM cards WHERE type_line LIKE ? AND LOWER(name) != LOWER(?)';
    const bindings: unknown[] = [`%${type}%`, excludeName];

    if (colorIdentity && colorIdentity.length > 0) {
      // Filter: each color in the card's identity must be in the constraint
      for (const color of colorIdentity) {
        sql += ' AND color_identity LIKE ?';
        bindings.push(`%"${color}"%`);
      }
    }

    sql += ' LIMIT ?';
    bindings.push(limit - results.length);

    const rows = db.prepare(sql).all(...bindings) as Array<{ name: string }>;
    for (const row of rows) {
      if (!results.includes(row.name)) {
        results.push(row.name);
      }
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

/**
 * Find sample cards matching a synergy category via keyword search.
 */
function findCategoryCards(
  db: Database.Database,
  category: SynergyCategory,
  excludeName: string,
  colorIdentity?: string[],
  limit: number = 5,
): string[] {
  // Use key cards from the curated knowledge as starting point
  const samples: string[] = [];

  for (const cardName of category.keyCards) {
    if (cardName.toLowerCase() === excludeName.toLowerCase()) continue;

    // Verify the card exists in the database
    const exists = db.prepare(
      'SELECT name FROM cards WHERE LOWER(name) = LOWER(?)'
    ).get(cardName) as { name: string } | undefined;

    if (exists) {
      // If color identity constraint, check it
      if (colorIdentity && colorIdentity.length > 0) {
        const card = db.prepare(
          'SELECT color_identity FROM cards WHERE LOWER(name) = LOWER(?)'
        ).get(cardName) as { color_identity: string | null } | undefined;

        if (card?.color_identity) {
          const cardColors = JSON.parse(card.color_identity) as string[];
          if (!cardColors.every(c => colorIdentity.includes(c))) continue;
        }
      }

      samples.push(exists.name);
      if (samples.length >= limit) break;
    }
  }

  return samples;
}

// --- Handler ---

export function handler(db: Database.Database, params: FindSynergiesParams): FindSynergiesResult {
  const limit = params.limit ?? 5;

  // 1. Look up the card
  let card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
  ).get(params.card_name) as CardRow | undefined;

  if (!card) {
    card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
    ).get(`%${params.card_name}%`) as CardRow | undefined;
  }

  if (!card) {
    return {
      card_name: params.card_name,
      creature_types: [],
      keywords: [],
      matching_categories: [],
    };
  }

  // 2. Extract card data
  const keywords: string[] = card.keywords ? JSON.parse(card.keywords) as string[] : [];
  const creatureTypes = extractCreatureTypes(card.type_line);

  // 3. Match synergy categories
  const categoryMatches = matchSynergyCategories(
    card.oracle_text,
    keywords,
    creatureTypes,
    params.format,
    params.category,
  );

  // 4. Build results with sample cards
  const matchingCategories: SynergyCategoryMatch[] = categoryMatches.map(match => {
    let sampleCards: string[];

    if (match.category.id === 'tribal') {
      sampleCards = findTribalCards(db, creatureTypes, card!.name, params.color_identity, limit);
    } else {
      sampleCards = findCategoryCards(db, match.category, card!.name, params.color_identity, limit);
    }

    return {
      id: match.category.id,
      name: match.category.name,
      description: match.category.description,
      match_reason: match.reason,
      sample_cards: sampleCards,
    };
  });

  return {
    card_name: card.name,
    creature_types: creatureTypes,
    keywords,
    matching_categories: matchingCategories,
  };
}
