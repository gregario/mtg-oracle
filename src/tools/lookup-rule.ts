import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { RuleRow } from '../data/db.js';

// --- Input schema ---

export const LookupRuleInput = z.object({
  section: z.string().optional().describe('Rule section number to look up (e.g. "702" or "702.1"). Returns exact match plus all subsections.'),
  query: z.string().optional().describe('Text to search for across all rule titles and text (case-insensitive).'),
}).refine(data => data.section || data.query, {
  message: 'Either section or query must be provided',
});

export type LookupRuleParams = z.infer<typeof LookupRuleInput>;

// --- Output types ---

export interface RuleEntry {
  section: string;
  title: string | null;
  text: string;
  parent_section: string | null;
}

export type LookupRuleResult = {
  found: true;
  rules: RuleEntry[];
  parent?: RuleEntry;
} | {
  found: false;
  message: string;
};

// --- Handler ---

export function handler(db: Database.Database, params: LookupRuleParams): LookupRuleResult {
  if (params.section) {
    return lookupBySection(db, params.section);
  }
  return searchByText(db, params.query!);
}

function lookupBySection(db: Database.Database, section: string): LookupRuleResult {
  // Exact match
  const exact = db.prepare(
    'SELECT * FROM rules WHERE section = ?'
  ).get(section) as RuleRow | undefined;

  // Subsections: match anything starting with "section." (e.g. "702" matches "702.1", "702.1a")
  const subsections = db.prepare(
    'SELECT * FROM rules WHERE section LIKE ? AND section != ? ORDER BY section'
  ).all(`${section}.%`, section) as RuleRow[];

  // Also get sub-subsections for sections like "702" → "702.1a"
  const subSubsections = db.prepare(
    'SELECT * FROM rules WHERE section LIKE ? AND section NOT LIKE ? AND section != ? ORDER BY section'
  ).all(`${section}%`, `${section}.%`, section) as RuleRow[];

  // Filter subSubsections to only those not already in subsections
  const subsectionSections = new Set(subsections.map(r => r.section));
  const additional = subSubsections.filter(r => !subsectionSections.has(r.section) && r.section !== section);

  const allRules: RuleEntry[] = [];

  if (exact) {
    allRules.push(toEntry(exact));
  }

  for (const r of [...subsections, ...additional]) {
    allRules.push(toEntry(r));
  }

  if (allRules.length === 0) {
    return {
      found: false,
      message: `No rule found for section "${section}"`,
    };
  }

  // Include parent context if the exact rule has a parent
  const result: LookupRuleResult = { found: true, rules: allRules };

  if (exact?.parent_section) {
    const parent = db.prepare(
      'SELECT * FROM rules WHERE section = ?'
    ).get(exact.parent_section) as RuleRow | undefined;
    if (parent) {
      result.parent = toEntry(parent);
    }
  }

  return result;
}

function searchByText(db: Database.Database, query: string): LookupRuleResult {
  const pattern = `%${query}%`;
  const rows = db.prepare(
    'SELECT * FROM rules WHERE LOWER(title) LIKE LOWER(?) OR LOWER(text) LIKE LOWER(?) ORDER BY section LIMIT 20'
  ).all(pattern, pattern) as RuleRow[];

  if (rows.length === 0) {
    return {
      found: false,
      message: `No rules found matching "${query}"`,
    };
  }

  return {
    found: true,
    rules: rows.map(toEntry),
  };
}

function toEntry(row: RuleRow): RuleEntry {
  return {
    section: row.section,
    title: row.title,
    text: row.text,
    parent_section: row.parent_section,
  };
}
