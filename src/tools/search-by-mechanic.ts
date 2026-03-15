import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { KeywordRow } from '../data/db.js';

// --- Input schema ---

export const SearchByMechanicInput = z.object({
  keyword: z.string().describe('Keyword/mechanic to search for (e.g., "Flying", "Trample")'),
  include_definition: z.boolean().optional().describe('Include keyword definition from keywords table'),
  format: z.string().optional().describe('Filter by format legality'),
  limit: z.number().min(1).max(50).optional().describe('Max results (default 25, max 50)'),
});

export type SearchByMechanicParams = z.infer<typeof SearchByMechanicInput>;

// --- Output types ---

export interface MechanicCardSummary {
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text_preview: string | null;
}

export interface KeywordDefinition {
  name: string;
  section: string;
  type: string;
  rules_text: string;
}

export interface SearchByMechanicResult {
  keyword: string;
  definition?: KeywordDefinition;
  cards: MechanicCardSummary[];
  total: number;
}

// --- Handler ---

export function handler(db: Database.Database, params: SearchByMechanicParams): SearchByMechanicResult {
  const limit = params.limit ?? 25;
  const result: SearchByMechanicResult = {
    keyword: params.keyword,
    cards: [],
    total: 0,
  };

  // Optionally fetch keyword definition
  if (params.include_definition) {
    const kwRow = db.prepare(
      'SELECT * FROM keywords WHERE LOWER(name) = LOWER(?)'
    ).get(params.keyword) as KeywordRow | undefined;

    if (kwRow) {
      result.definition = {
        name: kwRow.name,
        section: kwRow.section,
        type: kwRow.type,
        rules_text: kwRow.rules_text,
      };
    }
  }

  // Primary: search keywords JSON array
  const formatJoin = params.format
    ? 'JOIN legalities l ON l.card_id = c.id'
    : '';
  const formatWhere = params.format
    ? "AND l.format = ? AND l.status = 'legal'"
    : '';

  const keywordSql = `
    SELECT c.name, c.mana_cost, c.type_line, c.oracle_text
    FROM cards c
    ${formatJoin}
    WHERE c.keywords LIKE ?
    ${formatWhere}
    ORDER BY c.name
    LIMIT ?
  `;

  const keywordBindings: unknown[] = [`%"${params.keyword}"%`];
  if (params.format) {
    keywordBindings.push(params.format);
  }
  keywordBindings.push(limit);

  const keywordRows = db.prepare(keywordSql).all(...keywordBindings) as Array<{
    name: string;
    mana_cost: string | null;
    type_line: string | null;
    oracle_text: string | null;
  }>;

  const seenNames = new Set<string>();
  for (const row of keywordRows) {
    seenNames.add(row.name);
    result.cards.push({
      name: row.name,
      mana_cost: row.mana_cost,
      type_line: row.type_line,
      oracle_text_preview: row.oracle_text ? row.oracle_text.split('\n')[0] : null,
    });
  }

  // Fallback: FTS5 oracle_text search if we haven't hit the limit
  if (result.cards.length < limit) {
    const remaining = limit - result.cards.length;
    try {
      const ftsSql = `
        SELECT c.name, c.mana_cost, c.type_line, c.oracle_text
        FROM cards_fts fts
        JOIN cards c ON c.rowid = fts.rowid
        ${params.format ? 'JOIN legalities l ON l.card_id = c.id' : ''}
        WHERE cards_fts MATCH ?
        ${formatWhere}
        ORDER BY fts.rank
        LIMIT ?
      `;
      const ftsBindings: unknown[] = [params.keyword];
      if (params.format) {
        ftsBindings.push(params.format);
      }
      ftsBindings.push(remaining);

      const ftsRows = db.prepare(ftsSql).all(...ftsBindings) as Array<{
        name: string;
        mana_cost: string | null;
        type_line: string | null;
        oracle_text: string | null;
      }>;

      for (const row of ftsRows) {
        if (!seenNames.has(row.name)) {
          seenNames.add(row.name);
          result.cards.push({
            name: row.name,
            mana_cost: row.mana_cost,
            type_line: row.type_line,
            oracle_text_preview: row.oracle_text ? row.oracle_text.split('\n')[0] : null,
          });
        }
      }
    } catch {
      // FTS5 query might fail with certain keyword patterns — that's OK,
      // we already have results from the JSON keyword search
    }
  }

  result.total = result.cards.length;
  return result;
}
