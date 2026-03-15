/**
 * Pipeline orchestrator: coordinates all data sources (Scryfall, Academy Ruins, Commander Spellbook).
 *
 * Manages per-source update checks, graceful degradation, and `last_update.json`.
 */
import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runScryfallPipeline } from './scryfall.js';
import { runRulesPipeline } from './rules.js';
import { runSpellbookPipeline } from './spellbook.js';
import { VariantsApi, Configuration } from '@space-cow-media/spellbook-client';

// --- Types ---

export interface LastUpdate {
  scryfall?: string;   // ISO timestamp of last Scryfall bulk data updated_at
  rules?: string;      // ISO timestamp of last rules fetch
  spellbook?: string;  // ISO timestamp of last spellbook fetch
}

export interface PipelineResult {
  scryfall: { success: boolean; updated: boolean; error?: string };
  rules: { success: boolean; error?: string };
  spellbook: { success: boolean; error?: string };
}

// --- last_update.json management ---

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.mtg-oracle');
const LAST_UPDATE_FILENAME = 'last_update.json';

/**
 * Load last_update.json from the data directory.
 */
export function loadLastUpdate(dataDir?: string): LastUpdate {
  const dir = dataDir ?? DEFAULT_DATA_DIR;
  const filePath = path.join(dir, LAST_UPDATE_FILENAME);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as LastUpdate;
  } catch {
    return {};
  }
}

/**
 * Save last_update.json to the data directory.
 */
export function saveLastUpdate(lastUpdate: LastUpdate, dataDir?: string): void {
  const dir = dataDir ?? DEFAULT_DATA_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, LAST_UPDATE_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(lastUpdate, null, 2), 'utf-8');
}

// --- Update checks ---

const SPELLBOOK_REFRESH_DAYS = 7;

/**
 * Check if the spellbook data needs refreshing (older than 7 days).
 */
export function needsSpellbookRefresh(lastUpdate: LastUpdate): boolean {
  if (!lastUpdate.spellbook) return true;
  const lastDate = new Date(lastUpdate.spellbook);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= SPELLBOOK_REFRESH_DAYS;
}

/**
 * Check if this is a first run (no sources have been fetched yet).
 */
export function isFirstRun(lastUpdate: LastUpdate): boolean {
  return !lastUpdate.scryfall && !lastUpdate.rules && !lastUpdate.spellbook;
}

/**
 * Check if the database has any card data (separate from last_update).
 */
export function hasExistingData(db: Database.Database): boolean {
  const row = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
  return row.count > 0;
}

// --- Pipeline orchestration ---

export interface PipelineOptions {
  dataDir?: string;
  fetchFn?: typeof fetch;
  spellbookApi?: VariantsApi;
  /** If true, force refresh all sources regardless of timestamps. */
  forceRefresh?: boolean;
}

/**
 * Run the full data pipeline: Scryfall → Rules → Spellbook.
 *
 * Behavior:
 * - First run: all sources must succeed or throw an error.
 * - Subsequent runs: per-source graceful degradation (failed sources keep cached data).
 * - Per-source update checks prevent unnecessary re-downloads.
 */
export async function runPipeline(
  db: Database.Database,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const { dataDir, fetchFn = fetch, forceRefresh = false } = options;
  const spellbookApi = options.spellbookApi ?? new VariantsApi(new Configuration());

  const lastUpdate = loadLastUpdate(dataDir);
  const firstRun = isFirstRun(lastUpdate);

  const result: PipelineResult = {
    scryfall: { success: false, updated: false },
    rules: { success: false },
    spellbook: { success: false },
  };

  // --- Scryfall ---
  try {
    const scryfallResult = await runScryfallPipeline(
      db,
      forceRefresh ? null : (lastUpdate.scryfall ?? null),
      fetchFn,
    );
    result.scryfall = { success: true, updated: scryfallResult.updated };
    lastUpdate.scryfall = scryfallResult.updatedAt;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Scryfall pipeline failed: ${message}`);
    result.scryfall = { success: false, updated: false, error: message };
  }

  // --- Rules ---
  try {
    await runRulesPipeline(db, fetchFn);
    result.rules = { success: true };
    lastUpdate.rules = new Date().toISOString();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Rules pipeline failed: ${message}`);
    result.rules = { success: false, error: message };
  }

  // --- Spellbook ---
  try {
    if (forceRefresh || needsSpellbookRefresh(lastUpdate)) {
      await runSpellbookPipeline(db, spellbookApi);
      result.spellbook = { success: true };
      lastUpdate.spellbook = new Date().toISOString();
    } else {
      console.error('[pipeline] Spellbook data is fresh, skipping');
      result.spellbook = { success: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Spellbook pipeline failed: ${message}`);
    result.spellbook = { success: false, error: message };
  }

  // --- First-run validation ---
  if (firstRun) {
    const allFailed = !result.scryfall.success && !result.rules.success && !result.spellbook.success;
    if (allFailed) {
      throw new Error(
        'All data sources failed on first run. Cannot start without any data.\n' +
        `Scryfall: ${result.scryfall.error}\n` +
        `Rules: ${result.rules.error}\n` +
        `Spellbook: ${result.spellbook.error}`
      );
    }
  }

  // Save updated timestamps
  saveLastUpdate(lastUpdate, dataDir);

  return result;
}
