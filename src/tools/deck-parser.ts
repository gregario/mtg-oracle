/**
 * Deck list parser — handles plain text and MTGO .dek XML formats.
 *
 * Plain text format:
 *   <count> <card name>
 *   Lines starting with // or # are comments.
 *   Blank lines, "// Sideboard", "Sideboard:", or "SB:" switch to sideboard section.
 *   "Commander:" or "// Commander" marks the commander.
 *
 * MTGO .dek XML format:
 *   <Deck>
 *     <Cards CatID="12345" Quantity="4" Sideboard="false" Name="Lightning Bolt"/>
 *   </Deck>
 */

// --- Types ---

export interface DeckEntry {
  count: number;
  name: string;
}

export interface ParsedDeck {
  main: DeckEntry[];
  sideboard: DeckEntry[];
  commander?: string;
  format_hint?: string;
}

// --- Helpers ---

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isXmlFormat(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('<') && trimmed.includes('<Deck');
}

// --- Plain text parser ---

function parsePlainText(input: string): ParsedDeck {
  const lines = normalizeLineEndings(input).split('\n');
  const main: DeckEntry[] = [];
  const sideboard: DeckEntry[] = [];
  let commander: string | undefined;
  let currentSection: 'main' | 'sideboard' = 'main';

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Empty line — could be section separator
    if (line === '') {
      continue;
    }

    // Commander markers
    if (/^\/\/\s*commander$/i.test(line)) {
      // Next card line is the commander — but we handle inline too
      continue;
    }
    if (/^commander:\s*(.+)/i.test(line)) {
      const match = line.match(/^commander:\s*(.+)/i);
      if (match) {
        commander = match[1].trim();
      }
      continue;
    }

    // Sideboard markers
    if (/^\/\/\s*sideboard$/i.test(line) || /^sideboard:?\s*$/i.test(line)) {
      currentSection = 'sideboard';
      continue;
    }

    // SB: prefix — card goes to sideboard regardless of current section
    if (/^sb:\s*/i.test(line)) {
      const rest = line.replace(/^sb:\s*/i, '').trim();
      const entry = parseCardLine(rest);
      if (entry) {
        sideboard.push(entry);
      }
      continue;
    }

    // Comment lines
    if (line.startsWith('//') || line.startsWith('#')) {
      // Check if this is a "// Commander" line followed by a card name on the same line
      // e.g., "// Commander: Atraxa, Praetors' Voice"
      const commanderInline = line.match(/^\/\/\s*commander[:\s]+(.+)/i);
      if (commanderInline) {
        commander = commanderInline[1].trim();
      }
      continue;
    }

    // Parse card line
    const entry = parseCardLine(line);
    if (entry) {
      if (currentSection === 'sideboard') {
        sideboard.push(entry);
      } else {
        main.push(entry);
      }
    }
  }

  // Infer format hint
  const totalMain = main.reduce((sum, e) => sum + e.count, 0);
  let format_hint: string | undefined;
  if (commander || totalMain === 100 || totalMain === 99) {
    format_hint = 'commander';
  } else if (totalMain === 60) {
    format_hint = 'constructed';
  } else if (totalMain === 40) {
    format_hint = 'limited';
  }

  return { main, sideboard, commander, format_hint };
}

function parseCardLine(line: string): DeckEntry | null {
  // Match: optional count (defaults to 1), then card name
  // Formats: "4 Lightning Bolt", "4x Lightning Bolt", "Lightning Bolt"
  const match = line.match(/^(\d+)\s*x?\s+(.+)$/);
  if (match) {
    const count = parseInt(match[1], 10);
    const name = match[2].trim();
    if (count > 0 && name.length > 0) {
      return { count, name };
    }
  }

  // If no count prefix, treat entire line as card name with count 1
  if (line.length > 0 && !/^\d+$/.test(line)) {
    return { count: 1, name: line };
  }

  return null;
}

// --- XML parser ---

function parseXml(input: string): ParsedDeck {
  const main: DeckEntry[] = [];
  const sideboard: DeckEntry[] = [];

  // Match <Cards ... /> elements
  const cardPattern = /<Cards\s+([^>]*?)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = cardPattern.exec(input)) !== null) {
    const attrs = match[1];

    const nameMatch = attrs.match(/Name="([^"]*)"/);
    const quantityMatch = attrs.match(/Quantity="(\d+)"/);
    const sideboardMatch = attrs.match(/Sideboard="(true|false)"/i);

    if (nameMatch && quantityMatch) {
      const name = nameMatch[1];
      const count = parseInt(quantityMatch[1], 10);
      const isSideboard = sideboardMatch ? sideboardMatch[1].toLowerCase() === 'true' : false;

      if (count > 0 && name.length > 0) {
        if (isSideboard) {
          sideboard.push({ count, name });
        } else {
          main.push({ count, name });
        }
      }
    }
  }

  // Infer format hint
  const totalMain = main.reduce((sum, e) => sum + e.count, 0);
  let format_hint: string | undefined;
  if (totalMain === 100 || totalMain === 99) {
    format_hint = 'commander';
  } else if (totalMain === 60) {
    format_hint = 'constructed';
  } else if (totalMain === 40) {
    format_hint = 'limited';
  }

  return { main, sideboard, format_hint };
}

// --- Public API ---

/**
 * Parse a deck list from plain text or MTGO .dek XML format.
 */
export function parseDeckList(input: string): ParsedDeck {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { main: [], sideboard: [] };
  }

  if (isXmlFormat(trimmed)) {
    return parseXml(trimmed);
  }

  return parsePlainText(trimmed);
}
