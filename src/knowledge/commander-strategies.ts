/**
 * Curated Commander strategies — hand-built knowledge module.
 *
 * Strategies organized by color identity, staple cards per identity,
 * and power level brackets.
 */

// --- Types ---

export type ColorIdentity = 'W' | 'U' | 'B' | 'R' | 'G'
  | 'WU' | 'WB' | 'WR' | 'WG'
  | 'UB' | 'UR' | 'UG'
  | 'BR' | 'BG'
  | 'RG'
  | 'colorless';

export type PowerBracket = 'casual' | 'focused' | 'optimized' | 'cedh';

export interface CommanderStrategy {
  /** Unique slug identifier. */
  id: string;
  /** Strategy name. */
  name: string;
  /** Color identity (WUBRG letters concatenated, or 'colorless'). */
  colorIdentity: ColorIdentity;
  /** Description of the strategy's game plan. */
  description: string;
  /** Power level brackets this strategy commonly operates at. */
  powerBrackets: PowerBracket[];
  /** Staple cards for this strategy (real MTG card names). */
  stapleCards: string[];
  /** Example commander(s) that lead this strategy. */
  exampleCommanders: string[];
  /** Key synergies and interactions. */
  keySynergies: string[];
}

export interface PowerBracketInfo {
  /** Bracket identifier. */
  id: PowerBracket;
  /** Display name. */
  name: string;
  /** Description of this power level. */
  description: string;
  /** Typical turn range for wins. */
  typicalWinTurn: string;
  /** Budget considerations. */
  budgetNotes: string;
  /** Cards or strategies generally avoided or expected. */
  expectations: string[];
}

// --- Data ---

export const POWER_BRACKETS: readonly PowerBracketInfo[] = [
  {
    id: 'casual',
    name: 'Casual (Bracket 1)',
    description: 'Relaxed games focused on fun, theme, and social interaction. Precon-level or slightly upgraded.',
    typicalWinTurn: 'Turn 10-15+',
    budgetNotes: 'Budget-friendly, precon-level investment ($25-$75).',
    expectations: [
      'No infinite combos',
      'No mass land destruction',
      'Precon commanders welcome',
      'Emphasis on battlecruiser Magic',
      'No fast mana (Mana Crypt, Sol Ring sometimes excluded)',
    ],
  },
  {
    id: 'focused',
    name: 'Focused (Bracket 2)',
    description: 'Upgraded decks with a clear strategy and synergy plan. Most common power level at LGS play.',
    typicalWinTurn: 'Turn 8-12',
    budgetNotes: 'Moderate budget ($75-$300). Some staples but not fully optimized.',
    expectations: [
      'Coherent strategy with synergies',
      'Some tutors and interaction',
      'Combos may exist but are not the primary plan',
      'Reasonable mana base with some dual lands',
      'Most common LGS power level',
    ],
  },
  {
    id: 'optimized',
    name: 'Optimized (Bracket 3)',
    description: 'Fully tuned decks with efficient win conditions, strong mana bases, and consistent game plans.',
    typicalWinTurn: 'Turn 6-9',
    budgetNotes: 'Higher budget ($300-$1000+). Optimal card choices in most slots.',
    expectations: [
      'Efficient tutors and card advantage',
      'Focused win conditions (possibly combo)',
      'Strong interaction suite',
      'Optimized mana base with fetches/shocks',
      'Fast mana expected (Sol Ring, Mana Crypt)',
    ],
  },
  {
    id: 'cedh',
    name: 'Competitive EDH (Bracket 4)',
    description: 'Maximum power level. Decks built to win as fast and consistently as possible. Tournament-style play.',
    typicalWinTurn: 'Turn 2-5',
    budgetNotes: 'No budget restrictions. Proxy-friendly in most groups ($1000+ without proxies).',
    expectations: [
      'Fastest possible win conditions',
      'Maximum interaction and protection',
      'All fast mana legal',
      'Extensive tutoring packages',
      'Thoracle/Demonic Consultation-style compact combos',
      'Stax and resource denial acceptable',
    ],
  },
] as const;

export const COMMANDER_STRATEGIES: readonly CommanderStrategy[] = [
  {
    id: 'mono-w-lifegain',
    name: 'Mono-White Lifegain',
    colorIdentity: 'W',
    description: 'Gains life to trigger payoffs like Ajani\'s Pridemate and Serra Ascendant, aiming to overwhelm with growing threats.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Serra Ascendant', 'Ajani\'s Pridemate', 'Heliod, Sun-Crowned', 'Aetherflux Reservoir', 'Authority of the Consuls'],
    exampleCommanders: ['Heliod, Sun-Crowned', 'Lathiel, the Bounteous Dawn'],
    keySynergies: ['Lifegain triggers', 'Counter placement', 'Aetherflux Reservoir win'],
  },
  {
    id: 'mono-u-artifacts',
    name: 'Mono-Blue Artifacts',
    colorIdentity: 'U',
    description: 'Artifact-centric strategy that generates value through artifact synergies, combos, and counterspell protection.',
    powerBrackets: ['focused', 'optimized', 'cedh'],
    stapleCards: ['Urza, Lord High Artificer', 'Mystic Forge', 'Sensei\'s Divining Top', 'Mana Vault', 'Cyclonic Rift'],
    exampleCommanders: ['Urza, Lord High Artificer', 'Emry, Lurker of the Loch'],
    keySynergies: ['Artifact cost reduction', 'Untap loops', 'Top + Forge infinite draw'],
  },
  {
    id: 'mono-b-reanimator',
    name: 'Mono-Black Reanimator',
    colorIdentity: 'B',
    description: 'Fills the graveyard and recurs powerful creatures, using black\'s tutors and reanimation to cheat mana costs.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Reanimate', 'Entomb', 'Animate Dead', 'Gray Merchant of Asphodel', 'Phyrexian Arena'],
    exampleCommanders: ['Chainer, Dementia Master', 'Sheoldred, Whispering One'],
    keySynergies: ['Entomb + Reanimate', 'Gary drain loops', 'Sacrifice and recursion'],
  },
  {
    id: 'mono-r-goblins',
    name: 'Mono-Red Goblins',
    colorIdentity: 'R',
    description: 'Swarms the board with goblins, using tribal lords and Krenko-style token multiplication to overwhelm.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Krenko, Mob Boss', 'Goblin Chieftain', 'Skirk Prospector', 'Goblin Recruiter', 'Purphoros, God of the Forge'],
    exampleCommanders: ['Krenko, Mob Boss', 'Muxus, Goblin Grandee'],
    keySynergies: ['Krenko doublings', 'ETB damage with Purphoros', 'Goblin Recruiter stacking'],
  },
  {
    id: 'mono-g-stompy',
    name: 'Mono-Green Stompy',
    colorIdentity: 'G',
    description: 'Ramps aggressively into massive creatures and Craterhoof Behemoth-style finishers.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Craterhoof Behemoth', 'Nykthos, Shrine to Nyx', 'Beast Within', 'Selvala, Heart of the Wilds', 'Berserk'],
    exampleCommanders: ['Selvala, Heart of the Wilds', 'Omnath, Locus of Mana'],
    keySynergies: ['Big mana into Craterhoof', 'Devotion payoffs', 'Mana doubling'],
  },
  {
    id: 'azorius-blink',
    name: 'Azorius Blink',
    colorIdentity: 'WU',
    description: 'Flickers creatures with enter-the-battlefield abilities for repeated value, using Restoration Angel and Ephemerate effects.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Ephemerate', 'Soulherder', 'Mulldrifter', 'Restoration Angel', 'Conjurer\'s Closet'],
    exampleCommanders: ['Brago, King Eternal', 'Yorion, Sky Nomad'],
    keySynergies: ['ETB value loops', 'Brago untap mana rocks', 'Flickering removal creatures'],
  },
  {
    id: 'dimir-control',
    name: 'Dimir Control',
    colorIdentity: 'UB',
    description: 'Reactive control leveraging counterspells, removal, and card draw, typically winning via mill or combo.',
    powerBrackets: ['focused', 'optimized', 'cedh'],
    stapleCards: ['Counterspell', 'Demonic Tutor', 'Rhystic Study', 'Toxic Deluge', 'Thassa\'s Oracle'],
    exampleCommanders: ['Dimir Doppelganger', 'The Scarab God'],
    keySynergies: ['Thoracle + Demonic Consultation', 'Graveyard theft', 'Counter + removal suite'],
  },
  {
    id: 'rakdos-sacrifice',
    name: 'Rakdos Sacrifice',
    colorIdentity: 'BR',
    description: 'Sacrifices creatures for value using aristocrats-style payoffs like Blood Artist and Zulaport Cutthroat.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Blood Artist', 'Zulaport Cutthroat', 'Goblin Bombardment', 'Pitiless Plunderer', 'Dictate of Erebos'],
    exampleCommanders: ['Judith, the Scourge Diva', 'Prosper, Tome-Bound'],
    keySynergies: ['Death triggers', 'Treasure generation', 'Aristocrats drain loops'],
  },
  {
    id: 'gruul-landfall',
    name: 'Gruul Landfall',
    colorIdentity: 'RG',
    description: 'Plays extra lands to trigger landfall abilities, generating tokens, damage, and growing threats.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Avenger of Zendikar', 'Oracle of Mul Daya', 'Scapeshift', 'Valakut, the Molten Pinnacle', 'Kodama\'s Reach'],
    exampleCommanders: ['Omnath, Locus of Rage', 'Lord Windgrace'],
    keySynergies: ['Extra land drops + landfall payoffs', 'Scapeshift combos', 'Token generation'],
  },
  {
    id: 'simic-counters',
    name: 'Simic +1/+1 Counters',
    colorIdentity: 'UG',
    description: 'Grows creatures with +1/+1 counters, then proliferates and doubles for exponential growth.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Hardened Scales', 'Doubling Season', 'Bred for the Hunt', 'Herald of Secret Streams', 'Vorel of the Hull Clade'],
    exampleCommanders: ['Atraxa, Praetors\' Voice', 'Vorel of the Hull Clade'],
    keySynergies: ['Counter doubling', 'Proliferate', 'Unblockable with counters'],
  },
  {
    id: 'orzhov-aristocrats',
    name: 'Orzhov Aristocrats',
    colorIdentity: 'WB',
    description: 'Drains opponents through sacrifice loops, combining token generation with death-trigger payoffs.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Karlov of the Ghost Council', 'Blood Artist', 'Teysa Karlov', 'Bitterblossom', 'Dictate of Erebos'],
    exampleCommanders: ['Teysa Karlov', 'Teysa, Orzhov Scion'],
    keySynergies: ['Death trigger doubling', 'Token sacrifice loops', 'Drain + lifegain'],
  },
  {
    id: 'golgari-graveyard',
    name: 'Golgari Graveyard',
    colorIdentity: 'BG',
    description: 'Uses the graveyard as a second hand, recurring creatures and value pieces through Meren-style effects.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Meren of Clan Nel Toth', 'Sakura-Tribe Elder', 'Eternal Witness', 'Living Death', 'Dread Return'],
    exampleCommanders: ['Meren of Clan Nel Toth', 'The Gitrog Monster'],
    keySynergies: ['Experience counter accumulation', 'Sacrifice + recursion', 'Dredge value'],
  },
  {
    id: 'boros-equipment',
    name: 'Boros Equipment',
    colorIdentity: 'WR',
    description: 'Voltron-style strategy that suits up creatures with powerful equipment for lethal commander damage.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Sword of Fire and Ice', 'Lightning Greaves', 'Puresteel Paladin', 'Stoneforge Mystic', 'Colossus Hammer'],
    exampleCommanders: ['Rograkh, Son of Rohgahh', 'Wyleth, Soul of Steel'],
    keySynergies: ['Free equip costs', 'Equipment tutoring', 'Double strike + equipment'],
  },
  {
    id: 'izzet-spellslinger',
    name: 'Izzet Spellslinger',
    colorIdentity: 'UR',
    description: 'Casts cheap instants and sorceries to trigger magecraft and prowess-style effects, copying spells for explosive turns.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Archmage Emeritus', 'Storm-Kiln Artist', 'Jeska\'s Will', 'Underworld Breach', 'Mystical Tutor'],
    exampleCommanders: ['Veyran, Voice of Duality', 'Niv-Mizzet, Parun'],
    keySynergies: ['Magecraft triggers', 'Spell copying', 'Storm finishers'],
  },
  {
    id: 'selesnya-tokens',
    name: 'Selesnya Tokens',
    colorIdentity: 'WG',
    description: 'Goes wide with token generation and pumps them with anthems, Craterhoof, or Triumph of the Hordes.',
    powerBrackets: ['casual', 'focused'],
    stapleCards: ['Doubling Season', 'Anointed Procession', 'Parallel Lives', 'Craterhoof Behemoth', 'March of the Multitudes'],
    exampleCommanders: ['Rhys the Redeemed', 'Trostani, Selesnya\'s Voice'],
    keySynergies: ['Token doubling', 'Populate', 'Overrun effects'],
  },
  {
    id: 'sultai-value',
    name: 'Sultai Value Engine',
    colorIdentity: 'UB',
    description: 'Grinds value through card advantage, graveyard recursion, and flexible interaction in Sultai colors.',
    powerBrackets: ['optimized', 'cedh'],
    stapleCards: ['Thassa\'s Oracle', 'Demonic Consultation', 'Rhystic Study', 'Cyclonic Rift', 'Mana Drain'],
    exampleCommanders: ['Tasigur, the Golden Fang', 'Muldrotha, the Gravetide'],
    keySynergies: ['Thoracle combo', 'Graveyard recursion loops', 'Political card advantage'],
  },
  {
    id: 'jeskai-combo',
    name: 'Jeskai Combo-Control',
    colorIdentity: 'WU',
    description: 'Combines control elements with combo finishes, using white for removal, blue for counters, and red for damage-based combos.',
    powerBrackets: ['optimized', 'cedh'],
    stapleCards: ['Dockside Extortionist', 'Underworld Breach', 'Brain Freeze', 'Smothering Tithe', 'Enlightened Tutor'],
    exampleCommanders: ['Elsha of the Infinite', 'Narset, Enlightened Master'],
    keySynergies: ['Breach + Brain Freeze + LED', 'Top + cost reducers', 'Dockside loops'],
  },
  {
    id: 'five-color-goodstuff',
    name: 'Five-Color Goodstuff',
    colorIdentity: 'WU',
    description: 'Plays the best cards across all five colors, leveraging a 5-color commander for maximum flexibility.',
    powerBrackets: ['focused', 'optimized'],
    stapleCards: ['Command Tower', 'Chromatic Lantern', 'Dockside Extortionist', 'Smothering Tithe', 'Cyclonic Rift'],
    exampleCommanders: ['Kenrith, the Returned King', 'Golos, Tireless Pilgrim'],
    keySynergies: ['Best-of-everything card selection', 'Kenrith political abilities', 'Toolbox approach'],
  },
] as const;

// --- Lookup ---

/**
 * Find a commander strategy by its ID slug.
 */
export function getStrategyById(id: string): CommanderStrategy | undefined {
  return COMMANDER_STRATEGIES.find(s => s.id === id);
}

/**
 * Find strategies that operate at a given power bracket.
 */
export function getStrategiesByBracket(bracket: PowerBracket): CommanderStrategy[] {
  return COMMANDER_STRATEGIES.filter(s => s.powerBrackets.includes(bracket));
}

/**
 * Find strategies matching a specific color identity.
 */
export function getStrategiesByColorIdentity(identity: ColorIdentity): CommanderStrategy[] {
  return COMMANDER_STRATEGIES.filter(s => s.colorIdentity === identity);
}

/**
 * Get power bracket info by bracket ID.
 */
export function getPowerBracketInfo(bracket: PowerBracket): PowerBracketInfo | undefined {
  return POWER_BRACKETS.find(b => b.id === bracket);
}
