import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { KeywordRow } from '../data/db.js';

// --- Input schema ---

export const GetKeywordInput = z.object({
  name: z.string().describe('Keyword name to look up (case-insensitive). Examples: "Flying", "Equip", "Scry".'),
});

export type GetKeywordParams = z.infer<typeof GetKeywordInput>;

// --- Output types ---

export interface KeywordEntry {
  name: string;
  section: string;
  type: string;
  rules_text: string;
}

export type GetKeywordResult = {
  found: true;
  keyword: KeywordEntry;
} | {
  found: false;
  message: string;
  suggestions?: string[];
};

// --- Handler ---

export function handler(db: Database.Database, params: GetKeywordParams): GetKeywordResult {
  // 1. Exact match (case-insensitive)
  const exact = db.prepare(
    'SELECT * FROM keywords WHERE LOWER(name) = LOWER(?)'
  ).get(params.name) as KeywordRow | undefined;

  if (exact) {
    return {
      found: true,
      keyword: toEntry(exact),
    };
  }

  // 2. Fuzzy fallback via LIKE
  const fuzzy = db.prepare(
    'SELECT * FROM keywords WHERE LOWER(name) LIKE LOWER(?)'
  ).get(`%${params.name}%`) as KeywordRow | undefined;

  if (fuzzy) {
    return {
      found: true,
      keyword: toEntry(fuzzy),
    };
  }

  // 3. Suggestions based on first word
  const suggestions = db.prepare(
    'SELECT name FROM keywords WHERE LOWER(name) LIKE LOWER(?) LIMIT 5'
  ).all(`%${params.name.split(' ')[0]}%`) as Array<{ name: string }>;

  return {
    found: false,
    message: `No keyword found matching "${params.name}"`,
    suggestions: suggestions.length > 0 ? suggestions.map(s => s.name) : undefined,
  };
}

function toEntry(row: KeywordRow): KeywordEntry {
  return {
    name: row.name,
    section: row.section,
    type: row.type,
    rules_text: row.rules_text,
  };
}
