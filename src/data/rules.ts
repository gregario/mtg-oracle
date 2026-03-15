/**
 * Academy Ruins rules pipeline: download comprehensive rules,
 * glossary, and keyword definitions.
 *
 * Data sourced from Academy Ruins API (https://academyruins.com/).
 * Rules content © Wizards of the Coast.
 */
import type Database from 'better-sqlite3';

// --- Types ---

/** A single rule entry from the Academy Ruins CR API. */
export interface AcademyRuinsRule {
  ruleNumber: string;
  ruleText: string;
}

/** Academy Ruins CR response: array of rules with a navigation tree. */
export interface AcademyRuinsCRResponse {
  data: AcademyRuinsRule[];
}

/** Glossary entry from Academy Ruins. */
export interface AcademyRuinsGlossaryEntry {
  term: string;
  definition: string;
}

export interface AcademyRuinsGlossaryResponse {
  data: AcademyRuinsGlossaryEntry[];
}

// --- Download helpers ---

const CR_URL = 'https://api.academyruins.com/cr';
const GLOSSARY_URL = 'https://api.academyruins.com/cr/glossary';

/**
 * Fetch comprehensive rules from Academy Ruins API.
 */
export async function fetchComprehensiveRules(
  fetchFn: typeof fetch = fetch,
): Promise<AcademyRuinsRule[]> {
  console.error('[rules] Fetching comprehensive rules...');
  const resp = await fetchFn(CR_URL, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Academy Ruins CR request failed: ${resp.status}`);
  }
  const body = await resp.json() as AcademyRuinsCRResponse;
  return body.data;
}

/**
 * Fetch glossary from Academy Ruins API.
 */
export async function fetchGlossary(
  fetchFn: typeof fetch = fetch,
): Promise<AcademyRuinsGlossaryEntry[]> {
  console.error('[rules] Fetching glossary...');
  const resp = await fetchFn(GLOSSARY_URL, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Academy Ruins glossary request failed: ${resp.status}`);
  }
  const body = await resp.json() as AcademyRuinsGlossaryResponse;
  return body.data;
}

// --- Parsing helpers ---

/**
 * Extract the parent section from a rule number.
 * E.g. "100.1a" → "100.1", "100.1" → "100", "100" → null
 */
export function getParentSection(ruleNumber: string): string | null {
  // Remove trailing letter suffix (e.g. "100.1a" → "100.1")
  const withoutLetter = ruleNumber.replace(/[a-z]+$/i, '');
  if (withoutLetter !== ruleNumber) {
    return withoutLetter;
  }

  // Remove last dot-separated segment (e.g. "100.1" → "100")
  const lastDot = ruleNumber.lastIndexOf('.');
  if (lastDot > 0) {
    return ruleNumber.substring(0, lastDot);
  }

  return null;
}

/**
 * Extract a title from a rule text if it's a section header.
 * Section headers are typically like "1. Game Concepts" or "100. General"
 */
export function extractTitle(ruleNumber: string, ruleText: string): string | null {
  // Top-level sections (single digit) and subsections without dots are titles
  if (!ruleNumber.includes('.')) {
    // The ruleText IS the title for top-level rules
    return ruleText;
  }
  return null;
}

/**
 * Determine the keyword type based on section number.
 * Section 701 = keyword actions, Section 702 = keyword abilities.
 */
export function getKeywordType(section: string): 'action' | 'ability' | null {
  if (section.startsWith('701.')) return 'action';
  if (section.startsWith('702.')) return 'ability';
  return null;
}

/**
 * Extract keyword name from rule text.
 * Keyword rules typically start with "701.X. <KeywordName>"
 * or "702.X. <KeywordName>".
 */
export function extractKeywordName(ruleText: string): string | null {
  // Match patterns like "702.2. Deathtouch" or "701.3a Activate..."
  // The first sentence/definition typically has the keyword name
  // Top-level keyword rules are like "Deathtouch" or "Flying"
  // Sub-rules start with the rule text directly
  const text = ruleText.trim();
  if (!text) return null;

  // If the text is short and doesn't contain a period, it's likely just a keyword name
  if (text.length < 50 && !text.includes('.')) {
    return text;
  }

  return null;
}

// --- Ingestion ---

const BATCH_SIZE = 500;

/**
 * Ingest comprehensive rules into the database.
 */
export function ingestRules(db: Database.Database, rules: AcademyRuinsRule[]): number {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO rules (section, title, text, parent_section)
    VALUES (@section, @title, @text, @parent_section)
  `);

  let count = 0;
  for (let i = 0; i < rules.length; i += BATCH_SIZE) {
    const batch = rules.slice(i, i + BATCH_SIZE);
    const txn = db.transaction(() => {
      for (const rule of batch) {
        insert.run({
          section: rule.ruleNumber,
          title: extractTitle(rule.ruleNumber, rule.ruleText),
          text: rule.ruleText,
          parent_section: getParentSection(rule.ruleNumber),
        });
        count++;
      }
    });
    txn();
  }

  console.error(`[rules] Ingested ${count} rules`);
  return count;
}

/**
 * Ingest glossary entries into the database.
 */
export function ingestGlossary(db: Database.Database, entries: AcademyRuinsGlossaryEntry[]): number {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO glossary (term, definition)
    VALUES (@term, @definition)
  `);

  let count = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const txn = db.transaction(() => {
      for (const entry of batch) {
        insert.run({ term: entry.term, definition: entry.definition });
        count++;
      }
    });
    txn();
  }

  console.error(`[rules] Ingested ${count} glossary terms`);
  return count;
}

/**
 * Extract keywords from rules sections 701 and 702.
 * Each top-level subsection (701.X, 702.X with no further dot segments)
 * defines a keyword.
 */
export function ingestKeywords(db: Database.Database, rules: AcademyRuinsRule[]): number {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO keywords (name, section, type, rules_text)
    VALUES (@name, @section, @type, @rules_text)
  `);

  // Collect all sub-rules for each keyword section
  const keywordSections = new Map<string, { name: string; section: string; type: string; texts: string[] }>();

  for (const rule of rules) {
    const section = rule.ruleNumber;
    const kwType = getKeywordType(section);
    if (!kwType) continue;

    // Top-level keyword entries are like "701.2." or "702.3."
    // They match pattern: 70X.N (with optional trailing dot)
    const topLevelMatch = section.match(/^(70[12]\.\d+)\.?$/);
    if (topLevelMatch) {
      const baseSection = topLevelMatch[1];
      const name = extractKeywordName(rule.ruleText);
      if (name) {
        keywordSections.set(baseSection, {
          name,
          section: baseSection,
          type: kwType,
          texts: [rule.ruleText],
        });
      }
      continue;
    }

    // Sub-rules (701.2a, 701.2b) — append to parent keyword
    const subMatch = section.match(/^(70[12]\.\d+)[a-z]/);
    if (subMatch) {
      const baseSection = subMatch[1];
      const existing = keywordSections.get(baseSection);
      if (existing) {
        existing.texts.push(rule.ruleText);
      }
    }
  }

  let count = 0;
  const txn = db.transaction(() => {
    for (const kw of keywordSections.values()) {
      insert.run({
        name: kw.name,
        section: kw.section,
        type: kw.type,
        rules_text: kw.texts.join('\n'),
      });
      count++;
    }
  });
  txn();

  console.error(`[rules] Extracted ${count} keywords`);
  return count;
}

/**
 * Full rules pipeline: fetch CR, glossary, extract keywords.
 */
export async function runRulesPipeline(
  db: Database.Database,
  fetchFn: typeof fetch = fetch,
): Promise<{ rulesCount: number; glossaryCount: number; keywordsCount: number }> {
  // Clear existing data
  db.exec('DELETE FROM keywords');
  db.exec('DELETE FROM glossary');
  db.exec('DELETE FROM rules');

  // Fetch and ingest rules
  const rules = await fetchComprehensiveRules(fetchFn);
  const rulesCount = ingestRules(db, rules);

  // Fetch and ingest glossary
  const glossary = await fetchGlossary(fetchFn);
  const glossaryCount = ingestGlossary(db, glossary);

  // Extract keywords from rules
  const keywordsCount = ingestKeywords(db, rules);

  return { rulesCount, glossaryCount, keywordsCount };
}
