import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { GlossaryRow } from '../data/db.js';

// --- Input schema ---

export const GetGlossaryInput = z.object({
  term: z.string().describe('Glossary term to look up (case-insensitive). Supports exact and partial matching.'),
});

export type GetGlossaryParams = z.infer<typeof GetGlossaryInput>;

// --- Output types ---

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export type GetGlossaryResult = {
  found: true;
  entries: GlossaryEntry[];
} | {
  found: false;
  message: string;
};

// --- Handler ---

export function handler(db: Database.Database, params: GetGlossaryParams): GetGlossaryResult {
  // 1. Exact match (case-insensitive)
  const exact = db.prepare(
    'SELECT * FROM glossary WHERE LOWER(term) = LOWER(?)'
  ).get(params.term) as GlossaryRow | undefined;

  if (exact) {
    return {
      found: true,
      entries: [{ term: exact.term, definition: exact.definition }],
    };
  }

  // 2. Partial match (case-insensitive)
  const partials = db.prepare(
    'SELECT * FROM glossary WHERE LOWER(term) LIKE LOWER(?) ORDER BY term LIMIT 20'
  ).all(`%${params.term}%`) as GlossaryRow[];

  if (partials.length > 0) {
    return {
      found: true,
      entries: partials.map(row => ({ term: row.term, definition: row.definition })),
    };
  }

  return {
    found: false,
    message: `No glossary entry found for "${params.term}"`,
  };
}
