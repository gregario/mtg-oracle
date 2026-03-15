import { describe, it, expect } from 'vitest';
import {
  FORMATS,
  getFormatById,
  getNonRotatingFormats,
  getConstructedFormats,
  getLimitedFormats,
  type FormatPrimer,
} from '../../src/knowledge/formats.js';

describe('Formats Knowledge Module', () => {
  describe('data completeness', () => {
    it('has 8-10 format primers', () => {
      expect(FORMATS.length).toBeGreaterThanOrEqual(8);
      expect(FORMATS.length).toBeLessThanOrEqual(10);
    });

    it('every format has all required fields', () => {
      for (const fmt of FORMATS) {
        expect(fmt.id, `missing id`).toBeTruthy();
        expect(fmt.name, `${fmt.id} missing name`).toBeTruthy();
        expect(fmt.description, `${fmt.id} missing description`).toBeTruthy();
        expect(fmt.cardPool, `${fmt.id} missing cardPool`).toBeTruthy();
        expect(fmt.minDeckSize, `${fmt.id} missing minDeckSize`).toBeGreaterThan(0);
        expect(fmt.maxCopies, `${fmt.id} missing maxCopies`).toBeGreaterThan(0);
        expect(typeof fmt.powerLevel, `${fmt.id} powerLevel not a number`).toBe('number');
        expect(fmt.powerLevel).toBeGreaterThanOrEqual(1);
        expect(fmt.powerLevel).toBeLessThanOrEqual(10);
        expect(fmt.keyCharacteristics.length, `${fmt.id} missing keyCharacteristics`).toBeGreaterThan(0);
      }
    });

    it('all IDs are unique', () => {
      const ids = FORMATS.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('includes all major formats', () => {
      const ids = FORMATS.map(f => f.id);
      expect(ids).toContain('standard');
      expect(ids).toContain('modern');
      expect(ids).toContain('pioneer');
      expect(ids).toContain('legacy');
      expect(ids).toContain('vintage');
      expect(ids).toContain('commander');
      expect(ids).toContain('pauper');
      expect(ids).toContain('draft');
    });

    it('Standard is the only rotating constructed format', () => {
      const rotating = FORMATS.filter(f => f.rotation !== null);
      expect(rotating.length).toBe(1);
      expect(rotating[0].id).toBe('standard');
    });

    it('Commander has correct singleton rules', () => {
      const edh = getFormatById('commander');
      expect(edh).toBeDefined();
      expect(edh!.minDeckSize).toBe(100);
      expect(edh!.maxDeckSize).toBe(100);
      expect(edh!.maxCopies).toBe(1);
    });

    it('Limited formats have 40-card minimum', () => {
      const draft = getFormatById('draft');
      const sealed = getFormatById('sealed');
      expect(draft!.minDeckSize).toBe(40);
      expect(sealed!.minDeckSize).toBe(40);
    });
  });

  describe('getFormatById', () => {
    it('returns the correct format for a valid ID', () => {
      const result = getFormatById('modern');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Modern');
    });

    it('returns undefined for an unknown ID', () => {
      expect(getFormatById('nonexistent')).toBeUndefined();
    });
  });

  describe('getNonRotatingFormats', () => {
    it('returns only non-rotating constructed formats', () => {
      const nonRotating = getNonRotatingFormats();
      expect(nonRotating.length).toBeGreaterThan(0);
      for (const fmt of nonRotating) {
        expect(fmt.rotation).toBeNull();
        expect(fmt.id).not.toBe('draft');
        expect(fmt.id).not.toBe('sealed');
      }
    });

    it('excludes Standard', () => {
      const nonRotating = getNonRotatingFormats();
      expect(nonRotating.find(f => f.id === 'standard')).toBeUndefined();
    });
  });

  describe('getConstructedFormats', () => {
    it('returns formats with 60+ card decks', () => {
      const constructed = getConstructedFormats();
      expect(constructed.length).toBeGreaterThan(0);
      for (const fmt of constructed) {
        expect(fmt.minDeckSize).toBeGreaterThanOrEqual(60);
      }
    });

    it('includes Commander', () => {
      const constructed = getConstructedFormats();
      expect(constructed.find(f => f.id === 'commander')).toBeDefined();
    });
  });

  describe('getLimitedFormats', () => {
    it('returns only limited formats', () => {
      const limited = getLimitedFormats();
      expect(limited.length).toBeGreaterThanOrEqual(2);
      for (const fmt of limited) {
        expect(fmt.minDeckSize).toBe(40);
      }
    });
  });
});
