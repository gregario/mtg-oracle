import { describe, it, expect } from 'vitest';
import {
  SYNERGY_CATEGORIES,
  getSynergyById,
  getSynergiesByFormat,
  searchSynergies,
  type SynergyCategory,
} from '../../src/knowledge/synergy-categories.js';

describe('Synergy Categories Knowledge Module', () => {
  describe('data completeness', () => {
    it('has at least 16 synergy categories', () => {
      expect(SYNERGY_CATEGORIES.length).toBeGreaterThanOrEqual(16);
    });

    it('every category has all required fields', () => {
      for (const cat of SYNERGY_CATEGORIES) {
        expect(cat.id, `missing id`).toBeTruthy();
        expect(cat.name, `${cat.id} missing name`).toBeTruthy();
        expect(cat.description, `${cat.id} missing description`).toBeTruthy();
        expect(cat.subcategories.length, `${cat.id} missing subcategories`).toBeGreaterThan(0);
        expect(cat.keyCards.length, `${cat.id} missing keyCards`).toBeGreaterThan(0);
        expect(cat.relevantFormats.length, `${cat.id} missing relevantFormats`).toBeGreaterThan(0);
      }
    });

    it('every subcategory has all required fields', () => {
      for (const cat of SYNERGY_CATEGORIES) {
        for (const sub of cat.subcategories) {
          expect(sub.name, `${cat.id} sub missing name`).toBeTruthy();
          expect(sub.description, `${cat.id}/${sub.name} missing description`).toBeTruthy();
          expect(sub.exampleCards.length, `${cat.id}/${sub.name} missing exampleCards`).toBeGreaterThan(0);
        }
      }
    });

    it('all IDs are unique', () => {
      const ids = SYNERGY_CATEGORIES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('includes all specified synergy types', () => {
      const ids = SYNERGY_CATEGORIES.map(c => c.id);
      const expected = [
        'tribal', 'sacrifice', 'counters', 'graveyard', 'tokens',
        'enchantress', 'artifacts', 'landfall', 'storm', 'voltron',
        'mill', 'lifegain', 'blink', 'wheels', 'stax', 'spellslinger',
      ];
      for (const id of expected) {
        expect(ids, `missing synergy type: ${id}`).toContain(id);
      }
    });

    it('each category has at least 2 subcategories', () => {
      for (const cat of SYNERGY_CATEGORIES) {
        expect(cat.subcategories.length, `${cat.id} needs more subcategories`).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('getSynergyById', () => {
    it('returns the correct synergy', () => {
      const result = getSynergyById('tribal');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Tribal');
    });

    it('returns undefined for unknown ID', () => {
      expect(getSynergyById('nonexistent')).toBeUndefined();
    });
  });

  describe('getSynergiesByFormat', () => {
    it('returns synergies relevant to Commander', () => {
      const commander = getSynergiesByFormat('Commander');
      expect(commander.length).toBeGreaterThan(0);
      for (const s of commander) {
        expect(s.relevantFormats.map(f => f.toLowerCase())).toContain('commander');
      }
    });

    it('is case-insensitive', () => {
      const a = getSynergiesByFormat('commander');
      const b = getSynergiesByFormat('Commander');
      expect(a.length).toBe(b.length);
    });

    it('returns empty array for unknown format', () => {
      expect(getSynergiesByFormat('Nonexistent')).toHaveLength(0);
    });
  });

  describe('searchSynergies', () => {
    it('finds synergies by name', () => {
      const results = searchSynergies('tribal');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('tribal');
    });

    it('finds synergies by description keywords', () => {
      const results = searchSynergies('graveyard');
      expect(results.length).toBeGreaterThan(0);
      // Should match both 'graveyard' synergy and others that mention graveyard
    });

    it('finds synergies by subcategory name', () => {
      const results = searchSynergies('Proliferate');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s => s.id === 'counters')).toBe(true);
    });

    it('is case-insensitive', () => {
      const a = searchSynergies('STORM');
      const b = searchSynergies('storm');
      expect(a.length).toBe(b.length);
    });

    it('returns empty array for no matches', () => {
      expect(searchSynergies('xyznonexistent')).toHaveLength(0);
    });
  });
});
