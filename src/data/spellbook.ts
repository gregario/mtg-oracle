/**
 * Commander Spellbook combo pipeline: fetch combos from the
 * Commander Spellbook API and ingest into SQLite.
 *
 * Uses the @space-cow-media/spellbook-client SDK.
 */
import type Database from 'better-sqlite3';
import { VariantsApi, Configuration } from '@space-cow-media/spellbook-client';
import type { Variant, PaginatedVariantList } from '@space-cow-media/spellbook-client';

// --- Types ---

export interface ComboData {
  id: string;
  cards: string[];
  colorIdentity: string[];
  prerequisites: string;
  steps: string;
  results: string;
  legality: Record<string, boolean>;
  popularity: number | null;
}

// --- Fetch helpers ---

/**
 * Convert a Variant from the Spellbook API into our ComboData format.
 */
export function variantToCombo(variant: Variant): ComboData {
  const cards = variant.uses.map(u => u.card.name);
  const colorIdentity = variant.identity
    ? (Array.isArray(variant.identity) ? variant.identity : [])
    : [];
  const prerequisites = [
    variant.easyPrerequisites ?? '',
    variant.notablePrerequisites ?? '',
  ].filter(Boolean).join('; ');
  const steps = variant.description ?? '';
  const results = variant.produces
    .map(p => p.feature?.name ?? '')
    .filter(Boolean)
    .join(', ');
  const legality: Record<string, boolean> = {};
  if (variant.legalities) {
    const legalityObj = variant.legalities as unknown as Record<string, boolean>;
    for (const [k, v] of Object.entries(legalityObj)) {
      legality[k] = v;
    }
  }

  return {
    id: variant.id,
    cards,
    colorIdentity: colorIdentity as string[],
    prerequisites,
    steps,
    results,
    legality,
    popularity: variant.popularity ?? null,
  };
}

/**
 * Fetch all combos from Commander Spellbook API using pagination.
 * Yields pages of variants for memory-efficient processing.
 */
export async function* fetchAllCombos(
  api: VariantsApi,
  pageSize: number = 100,
): AsyncGenerator<Variant[], void, unknown> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page: PaginatedVariantList = await api.variantsList({
      limit: pageSize,
      offset,
    });

    if (page.results.length > 0) {
      yield page.results;
      offset += page.results.length;
    }

    hasMore = page.next !== null && page.results.length > 0;
  }
}

/**
 * Fetch all combos into an array (for smaller datasets or testing).
 */
export async function fetchAllCombosArray(
  api: VariantsApi,
  pageSize: number = 100,
): Promise<Variant[]> {
  const all: Variant[] = [];
  for await (const page of fetchAllCombos(api, pageSize)) {
    all.push(...page);
  }
  return all;
}

// --- Ingestion ---

const BATCH_SIZE = 500;

/**
 * Ingest combos into the database.
 */
export function ingestCombos(db: Database.Database, combos: ComboData[]): number {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO combos
    (id, cards, color_identity, prerequisites, steps, results, legality, popularity)
    VALUES
    (@id, @cards, @color_identity, @prerequisites, @steps, @results, @legality, @popularity)
  `);

  let count = 0;
  for (let i = 0; i < combos.length; i += BATCH_SIZE) {
    const batch = combos.slice(i, i + BATCH_SIZE);
    const txn = db.transaction(() => {
      for (const combo of batch) {
        insert.run({
          id: combo.id,
          cards: JSON.stringify(combo.cards),
          color_identity: JSON.stringify(combo.colorIdentity),
          prerequisites: combo.prerequisites || null,
          steps: combo.steps || null,
          results: combo.results || null,
          legality: JSON.stringify(combo.legality),
          popularity: combo.popularity,
        });
        count++;
      }
    });
    txn();
  }

  console.error(`[spellbook] Ingested ${count} combos`);
  return count;
}

/**
 * Full Spellbook pipeline: fetch all combos, ingest into database.
 */
export async function runSpellbookPipeline(
  db: Database.Database,
  api?: VariantsApi,
): Promise<{ combosInserted: number }> {
  const variantsApi = api ?? new VariantsApi(new Configuration());

  console.error('[spellbook] Fetching combos from Commander Spellbook...');

  // Clear existing combos
  db.exec('DELETE FROM combos');

  let combosInserted = 0;

  for await (const page of fetchAllCombos(variantsApi)) {
    const combos = page.map(variantToCombo);
    combosInserted += ingestCombos(db, combos);
  }

  console.error(`[spellbook] Pipeline complete: ${combosInserted} combos`);
  return { combosInserted };
}
