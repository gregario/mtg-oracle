/**
 * Curated MTG format primers — hand-built knowledge module.
 *
 * Covers the major constructed and limited formats with
 * descriptions, card pools, rotation info, and power levels.
 */

// --- Types ---

export interface FormatPrimer {
  /** Unique slug identifier. */
  id: string;
  /** Official format name. */
  name: string;
  /** Short description of the format. */
  description: string;
  /** What sets/cards are legal in the format. */
  cardPool: string;
  /** Rotation policy — null for non-rotating formats. */
  rotation: string | null;
  /** Minimum deck size. */
  minDeckSize: number;
  /** Maximum deck size — null if no upper limit. */
  maxDeckSize: number | null;
  /** Maximum copies of a card (excluding basic lands). */
  maxCopies: number;
  /** Sideboard size — null if not applicable. */
  sideboardSize: number | null;
  /** Relative power level from 1 (lowest) to 10 (highest). */
  powerLevel: number;
  /** Banned list highlights (notable cards, not exhaustive). */
  notableBans: string[];
  /** Key characteristics that define the format's identity. */
  keyCharacteristics: string[];
}

// --- Data ---

export const FORMATS: readonly FormatPrimer[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'The flagship rotating format using the most recent sets. Designed to be accessible and balanced, with a regularly shifting metagame.',
    cardPool: 'Last 2-3 years of Standard-legal sets (typically 5-8 sets)',
    rotation: 'Rotates annually when the fall set releases; older sets leave the format.',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 4,
    notableBans: ['Oko, Thief of Crowns', 'Omnath, Locus of Creation', 'The Meathook Massacre'],
    keyCharacteristics: [
      'Most accessible constructed format',
      'Regular rotation keeps metagame fresh',
      'Lower power level rewards format knowledge',
      'Best-of-three with sideboarding at competitive level',
    ],
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Non-rotating format starting from Return to Ravnica (2012) forward. Positioned between Standard and Modern in power level.',
    cardPool: 'All Standard-legal sets from Return to Ravnica (October 2012) onward',
    rotation: null,
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 6,
    notableBans: ['Smuggler\'s Copter', 'Uro, Titan of Nature\'s Wrath', 'Inverter of Truth'],
    keyCharacteristics: [
      'No fetchlands — healthier mana bases',
      'Creature-centric metagame',
      'Regional Championship format (RCQ)',
      'Growing format with active bans management',
    ],
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Non-rotating format using cards from Eighth Edition (2003) forward plus Modern Horizons sets. Known for powerful strategies and diverse metagame.',
    cardPool: 'All Standard-legal sets from Eighth Edition onward, plus Modern Horizons 1, 2, and 3',
    rotation: null,
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 7,
    notableBans: ['Splinter Twin', 'Birthing Pod', 'Hogaak, Arisen Necropolis', 'Faithless Looting'],
    keyCharacteristics: [
      'Fetchland + shockland mana bases',
      'Modern Horizons sets inject unique cards',
      'Highly diverse metagame',
      'Pro Tour format',
    ],
  },
  {
    id: 'legacy',
    name: 'Legacy',
    description: 'Eternal format allowing nearly all printed cards. Known for extremely powerful and efficient gameplay using cards from Magic\'s entire history.',
    cardPool: 'All printed Magic cards (minus banned list)',
    rotation: null,
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 9,
    notableBans: ['Ancestral Recall', 'Black Lotus', 'Time Walk', 'Balance', 'Channel'],
    keyCharacteristics: [
      'Force of Will defines the format',
      'Brainstorm + fetchlands for card selection',
      'Turn 1 kills possible but kept in check',
      'Reserved List cards drive high costs',
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'The most powerful format in Magic, allowing almost every card ever printed with a restricted list instead of bans.',
    cardPool: 'All printed Magic cards (only ante/manual-dexterity/conspiracy cards banned)',
    rotation: null,
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 10,
    notableBans: ['Shahrazad', 'Chaos Orb', 'Falling Star'],
    keyCharacteristics: [
      'Power Nine legal (restricted to 1 copy)',
      'Restricted list limits broken cards to 1 copy',
      'Fastest format — turn 0 wins exist',
      'Proxy-friendly in most communities',
    ],
  },
  {
    id: 'commander',
    name: 'Commander (EDH)',
    description: 'Multiplayer singleton format built around a legendary creature commander. The most popular casual format in Magic.',
    cardPool: 'All printed Magic cards (minus Commander-specific banned list)',
    rotation: null,
    minDeckSize: 100,
    maxDeckSize: 100,
    maxCopies: 1,
    sideboardSize: null,
    powerLevel: 5,
    notableBans: ['Flash', 'Biorhythm', 'Sway of the Stars', 'Primeval Titan'],
    keyCharacteristics: [
      'Singleton — only 1 copy of each card (except basic lands)',
      '100-card deck including commander',
      'Color identity restricts deck building',
      'Multiplayer politics and social dynamics',
      'Commander starts in command zone, costs more each recast',
    ],
  },
  {
    id: 'pauper',
    name: 'Pauper',
    description: 'Constructed format where only cards printed at common rarity are legal. Offers deep gameplay at an affordable price.',
    cardPool: 'All cards ever printed at common rarity on MTGO',
    rotation: null,
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    sideboardSize: 15,
    powerLevel: 5,
    notableBans: ['Arcum\'s Astrolabe', 'Chatterstorm', 'Daze', 'Galvanic Relay'],
    keyCharacteristics: [
      'Commons-only keeps costs low',
      'Surprisingly high power level',
      'Creature combat matters more',
      'Strong community-driven format',
    ],
  },
  {
    id: 'draft',
    name: 'Booster Draft',
    description: 'Limited format where players open packs and pick cards one at a time, then build 40-card decks. Tests card evaluation and adaptability.',
    cardPool: 'Cards drafted from 3 booster packs (typically same set)',
    rotation: null,
    minDeckSize: 40,
    maxDeckSize: null,
    maxCopies: 99,
    sideboardSize: null,
    powerLevel: 3,
    notableBans: [],
    keyCharacteristics: [
      'Pick 1 card per pack, pass remaining cards',
      'Build 40-card deck (typically 17 lands, 23 spells)',
      'Tests card evaluation and reading signals',
      'Usually 2 colors, sometimes splash a third',
      'Format changes with each new set',
    ],
  },
  {
    id: 'sealed',
    name: 'Sealed Deck',
    description: 'Limited format where players open 6 booster packs and build a 40-card deck from that pool. Used at prereleases and Grand Prix day 1.',
    cardPool: '6 booster packs (typically same set)',
    rotation: null,
    minDeckSize: 40,
    maxDeckSize: null,
    maxCopies: 99,
    sideboardSize: null,
    powerLevel: 3,
    notableBans: [],
    keyCharacteristics: [
      'Open 6 packs, build from your pool only',
      'Build 40-card deck (typically 17 lands, 23 spells)',
      'More bomb-dependent than draft',
      'Tests deck building and pool evaluation',
      'Prerelease format',
    ],
  },
] as const;

// --- Lookup ---

/**
 * Find a format primer by its ID slug.
 */
export function getFormatById(id: string): FormatPrimer | undefined {
  return FORMATS.find(f => f.id === id);
}

/**
 * Get all non-rotating formats.
 */
export function getNonRotatingFormats(): FormatPrimer[] {
  return FORMATS.filter(f => f.rotation === null && f.id !== 'draft' && f.id !== 'sealed');
}

/**
 * Get all constructed formats (deck size >= 60).
 */
export function getConstructedFormats(): FormatPrimer[] {
  return FORMATS.filter(f => f.minDeckSize >= 60);
}

/**
 * Get all limited formats.
 */
export function getLimitedFormats(): FormatPrimer[] {
  return FORMATS.filter(f => f.minDeckSize === 40);
}
