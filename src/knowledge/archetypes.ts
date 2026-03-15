/**
 * Curated MTG deck archetypes — hand-built knowledge module.
 *
 * Covers ~20 archetypes across constructed and limited formats
 * with key mechanics, typical colors, example cards, and
 * strengths/weaknesses.
 */

// --- Types ---

export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G';

export interface Archetype {
  /** Unique slug identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Short description of the archetype's game plan. */
  description: string;
  /** Core mechanics the archetype relies on. */
  keyMechanics: string[];
  /** Typical color identity (one or more of WUBRG). */
  typicalColors: MtgColor[];
  /** Example real MTG cards that define the archetype. */
  exampleCards: string[];
  /** What the archetype does well. */
  strengths: string[];
  /** Where the archetype struggles. */
  weaknesses: string[];
  /** Formats where the archetype has notable presence. */
  formatPresence: string[];
}

// --- Data ---

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: 'aggro-red',
    name: 'Red Deck Wins',
    description: 'Aggressive mono-red strategy that wins quickly with cheap creatures and burn spells.',
    keyMechanics: ['haste', 'direct damage', 'low mana curve'],
    typicalColors: ['R'],
    exampleCards: ['Goblin Guide', 'Lightning Bolt', 'Monastery Swiftspear', 'Eidolon of the Great Revel'],
    strengths: ['Fast clock', 'Punishes stumbles', 'Budget-friendly'],
    weaknesses: ['Runs out of gas', 'Weak to lifegain', 'Poor late game'],
    formatPresence: ['Modern', 'Pioneer', 'Legacy', 'Standard'],
  },
  {
    id: 'aggro-white',
    name: 'White Weenie',
    description: 'Go-wide aggro strategy using efficient small white creatures and anthem effects.',
    keyMechanics: ['tokens', 'anthems', 'first strike', 'protection'],
    typicalColors: ['W'],
    exampleCards: ['Thalia, Guardian of Thraben', 'Adanto Vanguard', 'Benalish Marshal', 'Brave the Elements'],
    strengths: ['Resilient board', 'Anthem synergies', 'Tax effects'],
    weaknesses: ['Vulnerable to sweepers', 'Limited card draw', 'Small individual threats'],
    formatPresence: ['Standard', 'Pioneer', 'Modern'],
  },
  {
    id: 'midrange-jund',
    name: 'Jund Midrange',
    description: 'Value-oriented midrange deck that trades resources efficiently using the best cards in Jund colors.',
    keyMechanics: ['discard', 'removal', 'value creatures', 'planeswalkers'],
    typicalColors: ['B', 'R', 'G'],
    exampleCards: ['Tarmogoyf', 'Liliana of the Veil', 'Bloodbraid Elf', 'Thoughtseize'],
    strengths: ['Flexible answers', 'Efficient threats', 'Strong 1-for-1 trading'],
    weaknesses: ['Mana base is painful', 'Weak to big mana', 'No counterspells'],
    formatPresence: ['Modern', 'Legacy'],
  },
  {
    id: 'midrange-gbx',
    name: 'Abzan Midrange',
    description: 'Grindy midrange deck combining black disruption, white removal, and green threats.',
    keyMechanics: ['discard', 'removal', 'planeswalkers', 'lifelink'],
    typicalColors: ['W', 'B', 'G'],
    exampleCards: ['Siege Rhino', 'Abrupt Decay', 'Lingering Souls', 'Thoughtseize'],
    strengths: ['Resilient threats', 'Great sideboard options', 'Lifegain offsets aggro'],
    weaknesses: ['Slower than Jund', 'Mana-intensive', 'Weak to combo'],
    formatPresence: ['Modern', 'Pioneer'],
  },
  {
    id: 'control-uw',
    name: 'Azorius Control',
    description: 'Classic draw-go control deck using counterspells, removal, and card advantage to dominate the late game.',
    keyMechanics: ['counterspells', 'card draw', 'board wipes', 'planeswalkers'],
    typicalColors: ['W', 'U'],
    exampleCards: ['Teferi, Hero of Dominaria', 'Supreme Verdict', 'Counterspell', 'Sphinx\'s Revelation'],
    strengths: ['Inevitability', 'Flexible answers', 'Strong late game'],
    weaknesses: ['Slow win conditions', 'Weak to resolved planeswalkers', 'Vulnerable to aggro on the draw'],
    formatPresence: ['Modern', 'Pioneer', 'Standard', 'Legacy'],
  },
  {
    id: 'control-esper',
    name: 'Esper Control',
    description: 'Three-color control adding black for discard and removal alongside blue-white countermagic.',
    keyMechanics: ['counterspells', 'discard', 'removal', 'card draw'],
    typicalColors: ['W', 'U', 'B'],
    exampleCards: ['Thoughtseize', 'Fatal Push', 'Teferi, Hero of Dominaria', 'Kaya\'s Guile'],
    strengths: ['Proactive disruption', 'Broad answer suite', 'Strong finishers'],
    weaknesses: ['Three-color mana base', 'Life loss from lands and discard', 'Complex sequencing'],
    formatPresence: ['Modern', 'Pioneer', 'Standard'],
  },
  {
    id: 'combo-storm',
    name: 'Storm',
    description: 'Combo deck that chains cheap spells together to build a lethal storm count.',
    keyMechanics: ['storm', 'rituals', 'cantrips', 'cost reduction'],
    typicalColors: ['U', 'R'],
    exampleCards: ['Grapeshot', 'Gifts Ungiven', 'Manamorphose', 'Past in Flames'],
    strengths: ['Can win through combat damage prevention', 'Resilient combo', 'Fast kills'],
    weaknesses: ['Fragile to hand disruption', 'Weak to Rule of Law effects', 'High skill ceiling'],
    formatPresence: ['Modern', 'Legacy', 'Vintage'],
  },
  {
    id: 'combo-splinter-twin',
    name: 'Splinter Twin / Copycat',
    description: 'Two-card combo deck that creates infinite copies of a creature for a lethal attack.',
    keyMechanics: ['copy effects', 'untap triggers', 'flash', 'counterspell backup'],
    typicalColors: ['U', 'R'],
    exampleCards: ['Splinter Twin', 'Deceiver Exarch', 'Saheeli Rai', 'Felidar Guardian'],
    strengths: ['Compact combo', 'Can play as tempo/control', 'Instant-speed win'],
    weaknesses: ['Vulnerable to removal', 'Requires specific pieces', 'Sideboard hate'],
    formatPresence: ['Pioneer', 'Modern'],
  },
  {
    id: 'tempo-delver',
    name: 'Delver Tempo',
    description: 'Tempo deck that deploys cheap threats early and protects them with countermagic and removal.',
    keyMechanics: ['cantrips', 'counterspells', 'efficient threats', 'tempo'],
    typicalColors: ['U', 'R'],
    exampleCards: ['Delver of Secrets', 'Lightning Bolt', 'Daze', 'Force of Will'],
    strengths: ['Fast clock with protection', 'Card selection', 'Mana-efficient'],
    weaknesses: ['Needs to flip Delver', 'Weak to sweepers', 'Small threats'],
    formatPresence: ['Legacy', 'Vintage', 'Pauper'],
  },
  {
    id: 'ramp-green',
    name: 'Green Ramp',
    description: 'Accelerates mana production to deploy game-ending threats ahead of schedule.',
    keyMechanics: ['mana dorks', 'land search', 'big creatures', 'card advantage'],
    typicalColors: ['G'],
    exampleCards: ['Llanowar Elves', 'Primeval Titan', 'Cavalier of Thorns', 'Nissa, Who Shakes the World'],
    strengths: ['Explosive mana', 'Huge threats', 'Good against midrange'],
    weaknesses: ['Vulnerable early', 'Weak to aggro', 'Mana dorks die to removal'],
    formatPresence: ['Standard', 'Pioneer', 'Modern'],
  },
  {
    id: 'tron',
    name: 'Tron',
    description: 'Assembles Urza lands to generate massive mana and cast colorless bombs.',
    keyMechanics: ['land assembly', 'colorless bombs', 'card filtering', 'board wipes'],
    typicalColors: ['G'],
    exampleCards: ['Urza\'s Tower', 'Karn Liberated', 'Wurmcoil Engine', 'Ugin, the Spirit Dragon'],
    strengths: ['Turn 3 Karn', 'Resilient to 1-for-1 removal', 'Huge threats'],
    weaknesses: ['Weak to land destruction', 'Slow without Tron', 'Bad against fast combo'],
    formatPresence: ['Modern'],
  },
  {
    id: 'reanimator',
    name: 'Reanimator',
    description: 'Cheats large creatures into play from the graveyard using discard and reanimation spells.',
    keyMechanics: ['discard outlets', 'reanimation', 'graveyard synergy', 'fatties'],
    typicalColors: ['U', 'B'],
    exampleCards: ['Reanimate', 'Griselbrand', 'Entomb', 'Animate Dead'],
    strengths: ['Turn 1–2 kills possible', 'Huge threats early', 'Redundant enablers'],
    weaknesses: ['Weak to graveyard hate', 'Needs specific pieces', 'Mulligans often'],
    formatPresence: ['Legacy', 'Vintage', 'Modern'],
  },
  {
    id: 'dredge',
    name: 'Dredge',
    description: 'Abuses the dredge mechanic to fill the graveyard and generate value from cards in the yard.',
    keyMechanics: ['dredge', 'graveyard recursion', 'self-mill', 'flashback'],
    typicalColors: ['B', 'R', 'G'],
    exampleCards: ['Stinkweed Imp', 'Narcomoeba', 'Creeping Chill', 'Life from the Loam'],
    strengths: ['Ignores normal card draw', 'Explosive', 'Hard to interact with game 1'],
    weaknesses: ['Folds to graveyard hate', 'Inconsistent draws', 'Non-interactive'],
    formatPresence: ['Modern', 'Legacy', 'Vintage'],
  },
  {
    id: 'affinity',
    name: 'Affinity / Artifacts Aggro',
    description: 'Artifact-heavy aggro deck that leverages affinity and metalcraft for undercosted threats.',
    keyMechanics: ['affinity', 'metalcraft', 'artifact synergy', 'modular'],
    typicalColors: ['U', 'R'],
    exampleCards: ['Cranial Plating', 'Arcbound Ravager', 'Ornithopter', 'Thought Monitor'],
    strengths: ['Explosive starts', 'Evasive threats', 'Resilient to creature removal'],
    weaknesses: ['Weak to artifact hate', 'Fragile mana base', 'Null Rod effects'],
    formatPresence: ['Modern', 'Pauper', 'Vintage'],
  },
  {
    id: 'death-and-taxes',
    name: 'Death and Taxes',
    description: 'Disruptive aggro-control deck that uses taxing creatures and resource denial to slow opponents.',
    keyMechanics: ['tax effects', 'mana denial', 'flickering', 'equipment'],
    typicalColors: ['W'],
    exampleCards: ['Thalia, Guardian of Thraben', 'Stoneforge Mystic', 'Aether Vial', 'Rishadan Port'],
    strengths: ['Disrupts combo and control', 'Resilient to sweepers via Vial', 'Hatebears'],
    weaknesses: ['Small creatures', 'Weak to big mana', 'Needs Vial to function smoothly'],
    formatPresence: ['Legacy', 'Modern'],
  },
  {
    id: 'tokens',
    name: 'Tokens',
    description: 'Go-wide strategy that creates many creature tokens and buffs them with anthems or sacrifice synergies.',
    keyMechanics: ['token generation', 'anthems', 'sacrifice', 'convoke'],
    typicalColors: ['W', 'B', 'G'],
    exampleCards: ['Bitterblossom', 'Lingering Souls', 'Intangible Virtue', 'Raise the Alarm'],
    strengths: ['Resilient to spot removal', 'Scales with anthems', 'Wide board presence'],
    weaknesses: ['Weak to sweepers', 'Tokens are fragile individually', 'Slow without payoffs'],
    formatPresence: ['Modern', 'Standard', 'Commander'],
  },
  {
    id: 'mill',
    name: 'Mill',
    description: 'Alternative win condition deck that wins by emptying the opponent\'s library.',
    keyMechanics: ['mill', 'card advantage', 'graveyard interaction', 'control elements'],
    typicalColors: ['U', 'B'],
    exampleCards: ['Hedron Crab', 'Archive Trap', 'Glimpse the Unthinkable', 'Jace, the Mind Sculptor'],
    strengths: ['Ignores board state', 'Punishes large libraries', 'Synergy with graveyard hate'],
    weaknesses: ['Feeds graveyard decks', 'Slow without key pieces', 'Weak to Eldrazi shufflers'],
    formatPresence: ['Modern', 'Standard', 'Pauper'],
  },
  {
    id: 'lands',
    name: 'Lands',
    description: 'Uses lands as the primary resource and win condition, recurring and tutoring lands for value.',
    keyMechanics: ['land recursion', 'land destruction', 'dredge', 'Maze of Ith'],
    typicalColors: ['R', 'G'],
    exampleCards: ['Life from the Loam', 'Dark Depths', 'Thespian\'s Stage', 'Exploration'],
    strengths: ['Hard to interact with', 'Inevitability', 'Resilient to creature removal'],
    weaknesses: ['Slow without acceleration', 'Weak to Blood Moon', 'Limited interaction early'],
    formatPresence: ['Legacy'],
  },
  {
    id: 'elves',
    name: 'Elves',
    description: 'Tribal synergy deck that floods the board with elves and generates explosive mana for combo finishes.',
    keyMechanics: ['tribal synergy', 'mana dorks', 'lords', 'combo finish'],
    typicalColors: ['G'],
    exampleCards: ['Llanowar Elves', 'Elvish Archdruid', 'Craterhoof Behemoth', 'Collected Company'],
    strengths: ['Explosive mana', 'Resilient — recovers from sweepers', 'Multiple win conditions'],
    weaknesses: ['Weak to sweepers', 'Creature-dependent', 'Fragile combo'],
    formatPresence: ['Modern', 'Legacy', 'Commander'],
  },
  {
    id: 'stax',
    name: 'Stax',
    description: 'Lock-oriented control deck that restricts opponent\'s resources through taxing and denial effects.',
    keyMechanics: ['resource denial', 'tax effects', 'sacrifice', 'static abilities'],
    typicalColors: ['W'],
    exampleCards: ['Smokestack', 'Trinisphere', 'Winter Orb', 'Lodestone Golem'],
    strengths: ['Shuts down fast decks', 'Hard to play against', 'Inevitability'],
    weaknesses: ['Very slow', 'Hurts yourself too', 'Weak to resolved threats'],
    formatPresence: ['Vintage', 'Legacy', 'Commander'],
  },
] as const;

// --- Lookup ---

/**
 * Find an archetype by its ID slug.
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find(a => a.id === id);
}

/**
 * Find archetypes that include a given color in their typical colors.
 */
export function getArchetypesByColor(color: MtgColor): Archetype[] {
  return ARCHETYPES.filter(a => a.typicalColors.includes(color));
}

/**
 * Find archetypes present in a given format.
 */
export function getArchetypesByFormat(format: string): Archetype[] {
  return ARCHETYPES.filter(a =>
    a.formatPresence.some(f => f.toLowerCase() === format.toLowerCase()),
  );
}
