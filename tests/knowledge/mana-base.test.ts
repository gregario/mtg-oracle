import { describe, it, expect } from 'vitest';
import {
  MANA_BASE_GUIDES,
  MANA_FIXING_CATEGORIES,
  getGuideByColorCount,
  getFixingByFormat,
  getFixingById,
  type ManaBaseGuide,
  type ManaFixingCategory,
} from '../../src/knowledge/mana-base.js';

describe('Mana Base Knowledge Module', () => {
  describe('MANA_BASE_GUIDES completeness', () => {
    it('covers color counts 1 through 5', () => {
      expect(MANA_BASE_GUIDES.length).toBe(5);
      const counts = MANA_BASE_GUIDES.map(g => g.colorCount);
      expect(counts).toEqual([1, 2, 3, 4, 5]);
    });

    it('every guide has all required fields', () => {
      for (const guide of MANA_BASE_GUIDES) {
        expect(guide.colorCount).toBeGreaterThanOrEqual(1);
        expect(guide.colorCount).toBeLessThanOrEqual(5);
        expect(guide.label).toBeTruthy();
        expect(guide.description).toBeTruthy();
        expect(guide.landRecommendations.length).toBeGreaterThan(0);
        expect(guide.exampleFixing.length).toBeGreaterThan(0);
        expect(guide.tips.length).toBeGreaterThan(0);
      }
    });

    it('land recommendations have valid structure', () => {
      for (const guide of MANA_BASE_GUIDES) {
        for (const rec of guide.landRecommendations) {
          expect(rec.format).toBeTruthy();
          expect(rec.deckSize).toBeGreaterThan(0);
          expect(rec.recommendedLands).toBeGreaterThan(0);
          expect(rec.recommendedLands).toBeLessThanOrEqual(rec.deckSize);
          expect(rec.notes).toBeTruthy();
        }
      }
    });

    it('mono-color recommends fewer lands than 5-color for the same format', () => {
      const mono = getGuideByColorCount(1)!;
      const five = getGuideByColorCount(5)!;
      const monoCommander = mono.landRecommendations.find(r => r.format === 'Commander');
      const fiveCommander = five.landRecommendations.find(r => r.format === 'Commander');
      if (monoCommander && fiveCommander) {
        expect(monoCommander.recommendedLands).toBeLessThanOrEqual(fiveCommander.recommendedLands);
      }
    });
  });

  describe('MANA_FIXING_CATEGORIES completeness', () => {
    it('has at least 10 fixing categories', () => {
      expect(MANA_FIXING_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    });

    it('every category has all required fields', () => {
      for (const cat of MANA_FIXING_CATEGORIES) {
        expect(cat.id).toBeTruthy();
        expect(cat.name).toBeTruthy();
        expect(cat.description).toBeTruthy();
        expect(['untapped', 'conditional', 'tapped']).toContain(cat.speed);
        expect(cat.exampleCards.length).toBeGreaterThan(0);
        expect(cat.relevantFormats.length).toBeGreaterThan(0);
      }
    });

    it('all IDs are unique', () => {
      const ids = MANA_FIXING_CATEGORIES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('includes fetch lands, shock lands, and original duals', () => {
      const ids = MANA_FIXING_CATEGORIES.map(c => c.id);
      expect(ids).toContain('fetch-lands');
      expect(ids).toContain('shock-lands');
      expect(ids).toContain('original-duals');
    });
  });

  describe('getGuideByColorCount', () => {
    it('returns guide for valid color count', () => {
      const guide = getGuideByColorCount(2);
      expect(guide).toBeDefined();
      expect(guide!.label).toBe('Two-Color');
    });

    it('returns undefined for invalid color count', () => {
      expect(getGuideByColorCount(0)).toBeUndefined();
      expect(getGuideByColorCount(6)).toBeUndefined();
    });
  });

  describe('getFixingByFormat', () => {
    it('returns fixing categories relevant to Modern', () => {
      const modern = getFixingByFormat('Modern');
      expect(modern.length).toBeGreaterThan(0);
      const ids = modern.map(c => c.id);
      expect(ids).toContain('fetch-lands');
      expect(ids).toContain('shock-lands');
    });

    it('is case-insensitive', () => {
      const a = getFixingByFormat('modern');
      const b = getFixingByFormat('Modern');
      expect(a.length).toBe(b.length);
    });

    it('returns empty array for unknown format', () => {
      expect(getFixingByFormat('Nonexistent')).toHaveLength(0);
    });
  });

  describe('getFixingById', () => {
    it('returns correct category', () => {
      const result = getFixingById('triomes');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Triomes');
    });

    it('returns undefined for unknown ID', () => {
      expect(getFixingById('nonexistent')).toBeUndefined();
    });
  });
});
