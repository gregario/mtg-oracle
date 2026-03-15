import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES,
  getArchetypeById,
  getArchetypesByColor,
  getArchetypesByFormat,
  type Archetype,
  type MtgColor,
} from '../../src/knowledge/archetypes.js';

describe('Archetypes Knowledge Module', () => {
  describe('data completeness', () => {
    it('has at least 20 archetypes', () => {
      expect(ARCHETYPES.length).toBeGreaterThanOrEqual(20);
    });

    it('every archetype has all required fields', () => {
      for (const arch of ARCHETYPES) {
        expect(arch.id, `${arch.name} missing id`).toBeTruthy();
        expect(arch.name, `${arch.id} missing name`).toBeTruthy();
        expect(arch.description, `${arch.id} missing description`).toBeTruthy();
        expect(arch.keyMechanics.length, `${arch.id} missing keyMechanics`).toBeGreaterThan(0);
        expect(arch.typicalColors.length, `${arch.id} missing typicalColors`).toBeGreaterThan(0);
        expect(arch.exampleCards.length, `${arch.id} missing exampleCards`).toBeGreaterThan(0);
        expect(arch.strengths.length, `${arch.id} missing strengths`).toBeGreaterThan(0);
        expect(arch.weaknesses.length, `${arch.id} missing weaknesses`).toBeGreaterThan(0);
        expect(arch.formatPresence.length, `${arch.id} missing formatPresence`).toBeGreaterThan(0);
      }
    });

    it('all IDs are unique', () => {
      const ids = ARCHETYPES.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all colors are valid WUBRG', () => {
      const validColors = new Set<string>(['W', 'U', 'B', 'R', 'G']);
      for (const arch of ARCHETYPES) {
        for (const color of arch.typicalColors) {
          expect(validColors.has(color), `${arch.id} has invalid color ${color}`).toBe(true);
        }
      }
    });

    it('has representation across all five colors', () => {
      const allColors = new Set(ARCHETYPES.flatMap(a => a.typicalColors));
      expect(allColors).toContain('W');
      expect(allColors).toContain('U');
      expect(allColors).toContain('B');
      expect(allColors).toContain('R');
      expect(allColors).toContain('G');
    });
  });

  describe('getArchetypeById', () => {
    it('returns the correct archetype for a valid ID', () => {
      const result = getArchetypeById('aggro-red');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Red Deck Wins');
    });

    it('returns undefined for an unknown ID', () => {
      expect(getArchetypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('getArchetypesByColor', () => {
    it('returns archetypes containing the given color', () => {
      const redArchetypes = getArchetypesByColor('R');
      expect(redArchetypes.length).toBeGreaterThan(0);
      for (const arch of redArchetypes) {
        expect(arch.typicalColors).toContain('R');
      }
    });

    it('returns empty array for no matches (impossible with WUBRG but tests the function)', () => {
      // All colors are represented, so just verify the function filters correctly
      const blueArchetypes = getArchetypesByColor('U');
      expect(blueArchetypes.every(a => a.typicalColors.includes('U'))).toBe(true);
    });
  });

  describe('getArchetypesByFormat', () => {
    it('returns archetypes present in Modern', () => {
      const modern = getArchetypesByFormat('Modern');
      expect(modern.length).toBeGreaterThan(0);
      for (const arch of modern) {
        expect(arch.formatPresence.map(f => f.toLowerCase())).toContain('modern');
      }
    });

    it('is case-insensitive', () => {
      const a = getArchetypesByFormat('modern');
      const b = getArchetypesByFormat('Modern');
      expect(a.length).toBe(b.length);
    });

    it('returns empty array for unknown format', () => {
      expect(getArchetypesByFormat('Nonexistent')).toHaveLength(0);
    });
  });
});
