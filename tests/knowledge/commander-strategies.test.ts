import { describe, it, expect } from 'vitest';
import {
  COMMANDER_STRATEGIES,
  POWER_BRACKETS,
  getStrategyById,
  getStrategiesByBracket,
  getStrategiesByColorIdentity,
  getPowerBracketInfo,
  type CommanderStrategy,
  type PowerBracket,
} from '../../src/knowledge/commander-strategies.js';

describe('Commander Strategies Knowledge Module', () => {
  describe('POWER_BRACKETS completeness', () => {
    it('has exactly 4 brackets', () => {
      expect(POWER_BRACKETS.length).toBe(4);
    });

    it('includes all bracket levels', () => {
      const ids = POWER_BRACKETS.map(b => b.id);
      expect(ids).toEqual(['casual', 'focused', 'optimized', 'cedh']);
    });

    it('every bracket has all required fields', () => {
      for (const bracket of POWER_BRACKETS) {
        expect(bracket.id).toBeTruthy();
        expect(bracket.name).toBeTruthy();
        expect(bracket.description).toBeTruthy();
        expect(bracket.typicalWinTurn).toBeTruthy();
        expect(bracket.budgetNotes).toBeTruthy();
        expect(bracket.expectations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('COMMANDER_STRATEGIES completeness', () => {
    it('has at least 15 strategies', () => {
      expect(COMMANDER_STRATEGIES.length).toBeGreaterThanOrEqual(15);
    });

    it('every strategy has all required fields', () => {
      for (const strat of COMMANDER_STRATEGIES) {
        expect(strat.id, `missing id`).toBeTruthy();
        expect(strat.name, `${strat.id} missing name`).toBeTruthy();
        expect(strat.colorIdentity, `${strat.id} missing colorIdentity`).toBeTruthy();
        expect(strat.description, `${strat.id} missing description`).toBeTruthy();
        expect(strat.powerBrackets.length, `${strat.id} missing powerBrackets`).toBeGreaterThan(0);
        expect(strat.stapleCards.length, `${strat.id} missing stapleCards`).toBeGreaterThan(0);
        expect(strat.exampleCommanders.length, `${strat.id} missing exampleCommanders`).toBeGreaterThan(0);
        expect(strat.keySynergies.length, `${strat.id} missing keySynergies`).toBeGreaterThan(0);
      }
    });

    it('all IDs are unique', () => {
      const ids = COMMANDER_STRATEGIES.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all power brackets reference valid bracket IDs', () => {
      const validBrackets = new Set(POWER_BRACKETS.map(b => b.id));
      for (const strat of COMMANDER_STRATEGIES) {
        for (const bracket of strat.powerBrackets) {
          expect(validBrackets.has(bracket), `${strat.id} has invalid bracket ${bracket}`).toBe(true);
        }
      }
    });

    it('has strategies across multiple power brackets', () => {
      const allBrackets = new Set(COMMANDER_STRATEGIES.flatMap(s => s.powerBrackets));
      expect(allBrackets.has('casual')).toBe(true);
      expect(allBrackets.has('focused')).toBe(true);
      expect(allBrackets.has('optimized')).toBe(true);
      expect(allBrackets.has('cedh')).toBe(true);
    });

    it('includes mono-color strategies for all five colors', () => {
      const monoColors = COMMANDER_STRATEGIES
        .filter(s => s.colorIdentity.length === 1)
        .map(s => s.colorIdentity);
      expect(monoColors).toContain('W');
      expect(monoColors).toContain('U');
      expect(monoColors).toContain('B');
      expect(monoColors).toContain('R');
      expect(monoColors).toContain('G');
    });
  });

  describe('getStrategyById', () => {
    it('returns the correct strategy', () => {
      const result = getStrategyById('mono-r-goblins');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Mono-Red Goblins');
    });

    it('returns undefined for unknown ID', () => {
      expect(getStrategyById('nonexistent')).toBeUndefined();
    });
  });

  describe('getStrategiesByBracket', () => {
    it('returns strategies for casual bracket', () => {
      const casual = getStrategiesByBracket('casual');
      expect(casual.length).toBeGreaterThan(0);
      for (const s of casual) {
        expect(s.powerBrackets).toContain('casual');
      }
    });

    it('returns strategies for cedh bracket', () => {
      const cedh = getStrategiesByBracket('cedh');
      expect(cedh.length).toBeGreaterThan(0);
      for (const s of cedh) {
        expect(s.powerBrackets).toContain('cedh');
      }
    });
  });

  describe('getStrategiesByColorIdentity', () => {
    it('returns strategies for a specific color identity', () => {
      const wr = getStrategiesByColorIdentity('WR');
      expect(wr.length).toBeGreaterThan(0);
      for (const s of wr) {
        expect(s.colorIdentity).toBe('WR');
      }
    });

    it('returns empty array for identity with no strategies', () => {
      expect(getStrategiesByColorIdentity('colorless')).toHaveLength(0);
    });
  });

  describe('getPowerBracketInfo', () => {
    it('returns correct bracket info', () => {
      const info = getPowerBracketInfo('focused');
      expect(info).toBeDefined();
      expect(info!.name).toContain('Focused');
    });

    it('returns undefined for invalid bracket', () => {
      expect(getPowerBracketInfo('nonexistent' as PowerBracket)).toBeUndefined();
    });
  });
});
