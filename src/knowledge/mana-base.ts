/**
 * Curated MTG mana base knowledge — hand-built knowledge module.
 *
 * Land count recommendations by color count and format,
 * plus mana fixing categories.
 */

// --- Types ---

export interface LandCountRecommendation {
  /** Format this recommendation applies to. */
  format: string;
  /** Minimum deck size in this format. */
  deckSize: number;
  /** Recommended total land count. */
  recommendedLands: number;
  /** Additional notes for this format. */
  notes: string;
}

export interface ManaBaseGuide {
  /** Number of colors (1-5). */
  colorCount: number;
  /** Descriptive label. */
  label: string;
  /** General description of mana base concerns. */
  description: string;
  /** Recommended land counts by format. */
  landRecommendations: LandCountRecommendation[];
  /** Example real mana fixing lands for this color count. */
  exampleFixing: string[];
  /** Practical tips for building this type of mana base. */
  tips: string[];
}

export interface ManaFixingCategory {
  /** Unique slug identifier. */
  id: string;
  /** Category name. */
  name: string;
  /** How this fixing works. */
  description: string;
  /** Speed: enters tapped or untapped? */
  speed: 'untapped' | 'conditional' | 'tapped';
  /** Example real MTG lands in this category. */
  exampleCards: string[];
  /** Which formats this fixing is most relevant in. */
  relevantFormats: string[];
}

// --- Data ---

export const MANA_BASE_GUIDES: readonly ManaBaseGuide[] = [
  {
    colorCount: 1,
    label: 'Mono-Color',
    description: 'Mono-color decks have the most consistent mana. All lands produce the color you need, freeing you to run utility lands.',
    landRecommendations: [
      { format: 'Standard', deckSize: 60, recommendedLands: 22, notes: 'Can go as low as 20 for aggressive decks.' },
      { format: 'Modern', deckSize: 60, recommendedLands: 21, notes: 'Aggressive mono-red runs 18-20 lands.' },
      { format: 'Commander', deckSize: 100, recommendedLands: 36, notes: 'Include utility lands like Nykthos, Shrine to Nyx.' },
      { format: 'Draft', deckSize: 40, recommendedLands: 17, notes: 'Standard 17 lands in limited.' },
    ],
    exampleFixing: ['Castle Vantress', 'Castle Locthwain', 'Nykthos, Shrine to Nyx', 'Faceless Haven'],
    tips: [
      'Maximize utility lands — you have room since color fixing is trivial.',
      'Devotion payoffs are stronger in mono-color.',
      'Consider creature-lands for extra value.',
    ],
  },
  {
    colorCount: 2,
    label: 'Two-Color',
    description: 'Two-color mana bases are reliable with good fixing. The standard for most competitive decks.',
    landRecommendations: [
      { format: 'Standard', deckSize: 60, recommendedLands: 24, notes: '8-12 dual lands recommended.' },
      { format: 'Modern', deckSize: 60, recommendedLands: 23, notes: '4 fetches + 2-3 shocks + 4 fast lands typical.' },
      { format: 'Pioneer', deckSize: 60, recommendedLands: 24, notes: 'Shock + check/pathway lands.' },
      { format: 'Commander', deckSize: 100, recommendedLands: 37, notes: '10-15 dual-producing lands.' },
      { format: 'Draft', deckSize: 40, recommendedLands: 17, notes: 'Prioritize on-color dual lands in draft.' },
    ],
    exampleFixing: ['Flooded Strand', 'Hallowed Fountain', 'Seachrome Coast', 'Glacial Fortress'],
    tips: [
      'Run 8+ sources of each color for consistency.',
      'Fast lands are great for aggressive decks.',
      'Check lands pair well with shock lands.',
    ],
  },
  {
    colorCount: 3,
    label: 'Three-Color',
    description: 'Three-color mana bases require significant investment in fixing. The pain from lands is a real cost.',
    landRecommendations: [
      { format: 'Standard', deckSize: 60, recommendedLands: 25, notes: 'Triomes are essential if available. Run 12+ duals.' },
      { format: 'Modern', deckSize: 60, recommendedLands: 24, notes: '7-10 fetches + 3-4 shocks + triome.' },
      { format: 'Pioneer', deckSize: 60, recommendedLands: 25, notes: 'Triome + shocks + checks. Slower than Modern.' },
      { format: 'Commander', deckSize: 100, recommendedLands: 38, notes: '15-20 multicolor lands, include signets/talismans.' },
      { format: 'Draft', deckSize: 40, recommendedLands: 17, notes: 'Need 3+ fixing lands; risky without them.' },
    ],
    exampleFixing: ['Raugrin Triome', 'Scalding Tarn', 'Steam Vents', 'Arcane Signet'],
    tips: [
      'Identify your primary color and weight mana sources accordingly.',
      'Triomes are fetchable — huge upgrade to consistency.',
      'Life loss from lands adds up — budget life total carefully.',
    ],
  },
  {
    colorCount: 4,
    label: 'Four-Color',
    description: 'Four-color mana bases are extremely demanding. Usually only viable with premier fixing or mana acceleration.',
    landRecommendations: [
      { format: 'Standard', deckSize: 60, recommendedLands: 26, notes: 'Rarely viable without exceptional fixing in format.' },
      { format: 'Modern', deckSize: 60, recommendedLands: 24, notes: '8+ fetches, 4+ shocks, triomes. Painful mana base.' },
      { format: 'Commander', deckSize: 100, recommendedLands: 38, notes: '20+ multicolor lands, heavy on signets and ramp.' },
    ],
    exampleFixing: ['Omnath, Locus of Creation', 'Dryad of the Ilysian Grove', 'Prismatic Vista', 'City of Brass'],
    tips: [
      'Fetches + triomes are near-mandatory for consistency.',
      'Often better to splash the 4th color lightly.',
      'Mana dorks and artifacts help bridge color gaps.',
    ],
  },
  {
    colorCount: 5,
    label: 'Five-Color',
    description: 'Five-color mana bases need every tool available. Most common in Commander where singleton rules demand diverse fixing.',
    landRecommendations: [
      { format: 'Modern', deckSize: 60, recommendedLands: 25, notes: 'Usually a Domain/Niv-Mizzet Reborn strategy. Mostly triomes.' },
      { format: 'Commander', deckSize: 100, recommendedLands: 38, notes: '25+ multicolor lands, 5+ mana rocks, green ramp spells.' },
    ],
    exampleFixing: ['Command Tower', 'The World Tree', 'Chromatic Lantern', 'Mana Confluence'],
    tips: [
      'Command Tower is essential in Commander.',
      'Green-based 5-color is most reliable (land ramp).',
      'Budget options: tri-lands, Vivid lands, guildgates with Gateway Plaza.',
      'Chromatic Lantern and Dryad of the Ilysian Grove solve all fixing.',
    ],
  },
] as const;

export const MANA_FIXING_CATEGORIES: readonly ManaFixingCategory[] = [
  {
    id: 'fetch-lands',
    name: 'Fetch Lands',
    description: 'Sacrifice to search for a land with a basic land type. The gold standard of mana fixing — thin the deck and enable landfall.',
    speed: 'untapped',
    exampleCards: ['Flooded Strand', 'Polluted Delta', 'Scalding Tarn', 'Verdant Catacombs', 'Windswept Heath'],
    relevantFormats: ['Modern', 'Legacy', 'Vintage', 'Commander'],
  },
  {
    id: 'shock-lands',
    name: 'Shock Lands',
    description: 'Dual lands with basic land types that enter tapped unless you pay 2 life. Fetchable and format-defining.',
    speed: 'conditional',
    exampleCards: ['Hallowed Fountain', 'Watery Grave', 'Blood Crypt', 'Stomping Ground', 'Temple Garden'],
    relevantFormats: ['Modern', 'Pioneer', 'Commander'],
  },
  {
    id: 'original-duals',
    name: 'Original Dual Lands',
    description: 'The original dual lands from Alpha/Beta/Unlimited/Revised. Two basic land types with no drawback. Reserved List.',
    speed: 'untapped',
    exampleCards: ['Tundra', 'Underground Sea', 'Volcanic Island', 'Bayou', 'Savannah'],
    relevantFormats: ['Legacy', 'Vintage', 'Commander'],
  },
  {
    id: 'triomes',
    name: 'Triomes',
    description: 'Three-color lands with three basic land types. Enter tapped but are fetchable and cycleable.',
    speed: 'tapped',
    exampleCards: ['Raugrin Triome', 'Zagoth Triome', 'Savai Triome', 'Ketria Triome', 'Indatha Triome'],
    relevantFormats: ['Modern', 'Pioneer', 'Commander'],
  },
  {
    id: 'fast-lands',
    name: 'Fast Lands',
    description: 'Enter untapped if you control two or fewer other lands. Excellent for aggressive and tempo decks.',
    speed: 'conditional',
    exampleCards: ['Seachrome Coast', 'Darkslick Shores', 'Blackcleave Cliffs', 'Copperline Gorge', 'Razorverge Thicket'],
    relevantFormats: ['Modern', 'Pioneer'],
  },
  {
    id: 'check-lands',
    name: 'Check Lands',
    description: 'Enter untapped if you control a land with the appropriate basic land type. Pair naturally with shocks and basics.',
    speed: 'conditional',
    exampleCards: ['Glacial Fortress', 'Drowned Catacomb', 'Dragonskull Summit', 'Rootbound Crag', 'Sunpetal Grove'],
    relevantFormats: ['Standard', 'Pioneer', 'Commander'],
  },
  {
    id: 'pain-lands',
    name: 'Pain Lands',
    description: 'Tap for colorless freely, or for one of two colors at the cost of 1 life. Always enter untapped.',
    speed: 'untapped',
    exampleCards: ['Adarkar Wastes', 'Underground River', 'Sulfurous Springs', 'Karplusan Forest', 'Brushland'],
    relevantFormats: ['Standard', 'Pioneer', 'Commander'],
  },
  {
    id: 'pathway-lands',
    name: 'Pathway Lands',
    description: 'Modal double-faced lands — choose which color side to play. Enter untapped but locked to one color.',
    speed: 'untapped',
    exampleCards: ['Hengegate Pathway', 'Clearwater Pathway', 'Blightstep Pathway', 'Cragcrown Pathway', 'Branchloft Pathway'],
    relevantFormats: ['Standard', 'Pioneer'],
  },
  {
    id: 'creature-lands',
    name: 'Creature Lands',
    description: 'Lands that can become creatures until end of turn. Provide threats that dodge sorcery-speed removal.',
    speed: 'tapped',
    exampleCards: ['Celestial Colonnade', 'Creeping Tar Pit', 'Raging Ravine', 'Lumbering Falls', 'Shambling Vent'],
    relevantFormats: ['Modern', 'Pioneer', 'Commander'],
  },
  {
    id: 'utility-lands',
    name: 'Utility Lands',
    description: 'Colorless or mono-colored lands with powerful activated abilities. Trade fixing for functionality.',
    speed: 'untapped',
    exampleCards: ['Urza\'s Saga', 'Field of the Dead', 'Boseiju, Who Endures', 'Otawara, Soaring City', 'Castle Locthwain'],
    relevantFormats: ['Modern', 'Legacy', 'Commander'],
  },
  {
    id: 'mana-rocks',
    name: 'Mana Rocks (Artifacts)',
    description: 'Artifact-based mana fixing and acceleration. Essential in Commander, occasionally in constructed.',
    speed: 'untapped',
    exampleCards: ['Sol Ring', 'Arcane Signet', 'Chromatic Lantern', 'Fellwar Stone', 'Talisman of Dominance'],
    relevantFormats: ['Commander', 'Vintage'],
  },
] as const;

// --- Lookup ---

/**
 * Get mana base guide for a specific color count (1-5).
 */
export function getGuideByColorCount(colorCount: number): ManaBaseGuide | undefined {
  return MANA_BASE_GUIDES.find(g => g.colorCount === colorCount);
}

/**
 * Get mana fixing categories that are relevant to a given format.
 */
export function getFixingByFormat(format: string): ManaFixingCategory[] {
  return MANA_FIXING_CATEGORIES.filter(c =>
    c.relevantFormats.some(f => f.toLowerCase() === format.toLowerCase()),
  );
}

/**
 * Get a mana fixing category by its ID slug.
 */
export function getFixingById(id: string): ManaFixingCategory | undefined {
  return MANA_FIXING_CATEGORIES.find(c => c.id === id);
}
