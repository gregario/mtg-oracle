import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { CardRow, CardFaceRow, LegalityRow, RulingRow } from '../data/db.js';

// --- Input schema ---

export const GetCardInput = z.object({
  name: z.string().describe('Card name to look up'),
});

export type GetCardParams = z.infer<typeof GetCardInput>;

// --- Output types ---

export interface CardDetail {
  id: string;
  name: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  rarity: string | null;
  set_code: string | null;
  set_name: string | null;
  released_at: string | null;
  image_uri: string | null;
  scryfall_uri: string | null;
  edhrec_rank: number | null;
  artist: string | null;
  faces: CardFaceDetail[];
  rulings: RulingDetail[];
  legalities: Record<string, string>;
  price_usd: number | null;
  price_usd_foil: number | null;
  price_eur: number | null;
  price_eur_foil: number | null;
  price_tix: number | null;
}

export interface CardFaceDetail {
  face_index: number;
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  colors: string[];
}

export interface RulingDetail {
  source: string | null;
  published_at: string | null;
  comment: string;
}

export type GetCardResult = {
  found: true;
  card: CardDetail;
} | {
  found: false;
  message: string;
  suggestions?: string[];
}

// --- Handler ---

export function handler(db: Database.Database, params: GetCardParams): GetCardResult {
  // 1. Exact match (case-insensitive)
  let card = db.prepare(
    'SELECT * FROM cards WHERE LOWER(name) = LOWER(?)'
  ).get(params.name) as CardRow | undefined;

  // 2. Fuzzy fallback via LIKE
  if (!card) {
    card = db.prepare(
      'SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)'
    ).get(`%${params.name}%`) as CardRow | undefined;
  }

  if (!card) {
    // Try to find suggestions
    const suggestions = db.prepare(
      'SELECT name FROM cards WHERE LOWER(name) LIKE LOWER(?) LIMIT 5'
    ).all(`%${params.name.split(' ')[0]}%`) as Array<{ name: string }>;

    return {
      found: false,
      message: `No card found matching "${params.name}"`,
      suggestions: suggestions.length > 0 ? suggestions.map(s => s.name) : undefined,
    };
  }

  // Fetch faces
  const faces = db.prepare(
    'SELECT * FROM card_faces WHERE card_id = ? ORDER BY face_index'
  ).all(card.id) as CardFaceRow[];

  // Fetch rulings
  const rulings = db.prepare(
    'SELECT * FROM rulings WHERE card_id = ? ORDER BY published_at'
  ).all(card.id) as RulingRow[];

  // Fetch legalities
  const legalityRows = db.prepare(
    'SELECT * FROM legalities WHERE card_id = ?'
  ).all(card.id) as LegalityRow[];

  const legalities: Record<string, string> = {};
  for (const row of legalityRows) {
    legalities[row.format] = row.status;
  }

  const cardDetail: CardDetail = {
    id: card.id,
    name: card.name,
    mana_cost: card.mana_cost,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    loyalty: card.loyalty,
    colors: card.colors ? JSON.parse(card.colors) as string[] : [],
    color_identity: card.color_identity ? JSON.parse(card.color_identity) as string[] : [],
    keywords: card.keywords ? JSON.parse(card.keywords) as string[] : [],
    rarity: card.rarity,
    set_code: card.set_code,
    set_name: card.set_name,
    released_at: card.released_at,
    image_uri: card.image_uri,
    scryfall_uri: card.scryfall_uri,
    edhrec_rank: card.edhrec_rank,
    artist: card.artist,
    faces: faces.map(f => ({
      face_index: f.face_index,
      name: f.name,
      mana_cost: f.mana_cost,
      type_line: f.type_line,
      oracle_text: f.oracle_text,
      power: f.power,
      toughness: f.toughness,
      colors: f.colors ? JSON.parse(f.colors) as string[] : [],
    })),
    rulings: rulings.map(r => ({
      source: r.source,
      published_at: r.published_at,
      comment: r.comment,
    })),
    legalities,
    price_usd: card.price_usd,
    price_usd_foil: card.price_usd_foil,
    price_eur: card.price_eur,
    price_eur_foil: card.price_eur_foil,
    price_tix: card.price_tix,
  };

  return { found: true, card: cardDetail };
}
