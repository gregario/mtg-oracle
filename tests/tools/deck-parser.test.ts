import { describe, it, expect } from 'vitest';
import { parseDeckList } from '../../src/tools/deck-parser.js';

describe('deck-parser', () => {
  describe('plain text format', () => {
    it('parses main deck only', () => {
      const input = `4 Lightning Bolt
4 Counterspell
2 Island`;
      const result = parseDeckList(input);
      expect(result.main).toEqual([
        { count: 4, name: 'Lightning Bolt' },
        { count: 4, name: 'Counterspell' },
        { count: 2, name: 'Island' },
      ]);
      expect(result.sideboard).toEqual([]);
      expect(result.commander).toBeUndefined();
    });

    it('parses main + sideboard separated by blank line and // Sideboard', () => {
      const input = `4 Lightning Bolt
4 Counterspell

// Sideboard
2 Negate
3 Rest in Peace`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(2);
      expect(result.main[0]).toEqual({ count: 4, name: 'Lightning Bolt' });
      expect(result.sideboard).toHaveLength(2);
      expect(result.sideboard[0]).toEqual({ count: 2, name: 'Negate' });
      expect(result.sideboard[1]).toEqual({ count: 3, name: 'Rest in Peace' });
    });

    it('parses sideboard with "Sideboard:" marker', () => {
      const input = `4 Lightning Bolt
Sideboard:
2 Negate`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(1);
      expect(result.sideboard).toHaveLength(1);
      expect(result.sideboard[0]).toEqual({ count: 2, name: 'Negate' });
    });

    it('parses SB: prefix cards', () => {
      const input = `4 Lightning Bolt
SB: 2 Negate
SB: 3 Rest in Peace`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(1);
      expect(result.sideboard).toHaveLength(2);
      expect(result.sideboard[0]).toEqual({ count: 2, name: 'Negate' });
    });

    it('parses commander marker', () => {
      const input = `Commander: Atraxa, Praetors' Voice
1 Sol Ring
1 Command Tower`;
      const result = parseDeckList(input);
      expect(result.commander).toBe("Atraxa, Praetors' Voice");
      expect(result.main).toHaveLength(2);
    });

    it('parses // Commander comment with card name', () => {
      const input = `// Commander: Krenko, Mob Boss
1 Sol Ring
1 Mountain`;
      const result = parseDeckList(input);
      expect(result.commander).toBe('Krenko, Mob Boss');
      expect(result.main).toHaveLength(2);
    });

    it('ignores comment lines starting with // or #', () => {
      const input = `# My awesome deck
// Version 2.0
4 Lightning Bolt
# Good card
2 Island`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(2);
      expect(result.main[0]).toEqual({ count: 4, name: 'Lightning Bolt' });
    });

    it('handles Windows line endings (\\r\\n)', () => {
      const input = "4 Lightning Bolt\r\n2 Island\r\n";
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(2);
    });

    it('handles trailing whitespace', () => {
      const input = '4 Lightning Bolt   \n2 Island  ';
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(2);
      expect(result.main[0].name).toBe('Lightning Bolt');
    });

    it('handles empty lines between cards', () => {
      const input = `4 Lightning Bolt

2 Island

1 Mountain`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(3);
    });

    it('handles "4x" count format', () => {
      const input = '4x Lightning Bolt\n2x Island';
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(2);
      expect(result.main[0]).toEqual({ count: 4, name: 'Lightning Bolt' });
    });

    it('returns empty deck for empty input', () => {
      const result = parseDeckList('');
      expect(result.main).toEqual([]);
      expect(result.sideboard).toEqual([]);
    });

    it('returns empty deck for whitespace-only input', () => {
      const result = parseDeckList('   \n  \n  ');
      expect(result.main).toEqual([]);
      expect(result.sideboard).toEqual([]);
    });
  });

  describe('format hints', () => {
    it('hints commander for 100-card main deck', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `1 Card ${i}`);
      const result = parseDeckList(lines.join('\n'));
      expect(result.format_hint).toBe('commander');
    });

    it('hints commander when commander is specified', () => {
      const input = `Commander: Krenko, Mob Boss
1 Sol Ring`;
      const result = parseDeckList(input);
      expect(result.format_hint).toBe('commander');
    });

    it('hints constructed for 60-card main deck', () => {
      const lines = Array.from({ length: 60 }, (_, i) => `1 Card ${i}`);
      const result = parseDeckList(lines.join('\n'));
      expect(result.format_hint).toBe('constructed');
    });

    it('hints limited for 40-card main deck', () => {
      const lines = Array.from({ length: 40 }, (_, i) => `1 Card ${i}`);
      const result = parseDeckList(lines.join('\n'));
      expect(result.format_hint).toBe('limited');
    });
  });

  describe('MTGO XML format', () => {
    it('parses basic XML deck', () => {
      const input = `<Deck>
  <Cards CatID="12345" Quantity="4" Sideboard="false" Name="Lightning Bolt"/>
  <Cards CatID="67890" Quantity="2" Sideboard="true" Name="Negate"/>
</Deck>`;
      const result = parseDeckList(input);
      expect(result.main).toEqual([{ count: 4, name: 'Lightning Bolt' }]);
      expect(result.sideboard).toEqual([{ count: 2, name: 'Negate' }]);
    });

    it('parses XML with multiple main and sideboard cards', () => {
      const input = `<Deck>
  <Cards CatID="1" Quantity="4" Sideboard="false" Name="Lightning Bolt"/>
  <Cards CatID="2" Quantity="4" Sideboard="false" Name="Counterspell"/>
  <Cards CatID="3" Quantity="20" Sideboard="false" Name="Island"/>
  <Cards CatID="4" Quantity="2" Sideboard="true" Name="Negate"/>
  <Cards CatID="5" Quantity="3" Sideboard="true" Name="Rest in Peace"/>
</Deck>`;
      const result = parseDeckList(input);
      expect(result.main).toHaveLength(3);
      expect(result.sideboard).toHaveLength(2);
    });

    it('handles empty XML deck', () => {
      const input = '<Deck></Deck>';
      const result = parseDeckList(input);
      expect(result.main).toEqual([]);
      expect(result.sideboard).toEqual([]);
    });
  });
});
