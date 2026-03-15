/**
 * Curated MTG synergy categories — hand-built knowledge module.
 *
 * ~16 synergy types with descriptions, subcategories,
 * and example card names.
 */

// --- Types ---

export interface SynergySubcategory {
  /** Subcategory name. */
  name: string;
  /** Short description. */
  description: string;
  /** Example real MTG cards. */
  exampleCards: string[];
}

export interface SynergyCategory {
  /** Unique slug identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Description of this synergy archetype. */
  description: string;
  /** Subcategories within this synergy type. */
  subcategories: SynergySubcategory[];
  /** Key cards that define or enable this synergy. */
  keyCards: string[];
  /** Formats where this synergy is most relevant. */
  relevantFormats: string[];
}

// --- Data ---

export const SYNERGY_CATEGORIES: readonly SynergyCategory[] = [
  {
    id: 'tribal',
    name: 'Tribal',
    description: 'Creature type matters — lords, tribal payoffs, and type-specific synergies that reward committing to a creature type.',
    subcategories: [
      { name: 'Lords', description: 'Creatures that buff all others of their type.', exampleCards: ['Lord of Atlantis', 'Goblin Chieftain', 'Elvish Archdruid'] },
      { name: 'Tribal Spells', description: 'Non-creature spells that care about creature types.', exampleCards: ['Collected Company', 'Cavern of Souls', 'Aether Vial'] },
      { name: 'Changeling Support', description: 'Creatures with all types that fill tribal gaps.', exampleCards: ['Maskwood Nexus', 'Unsettled Mariner', 'Realmwalker'] },
    ],
    keyCards: ['Cavern of Souls', 'Aether Vial', 'Herald\'s Horn', 'Kindred Discovery'],
    relevantFormats: ['Commander', 'Modern', 'Legacy', 'Standard'],
  },
  {
    id: 'sacrifice',
    name: 'Sacrifice (Aristocrats)',
    description: 'Sacrifice creatures for value — triggers death payoffs, drains life, and generates resources.',
    subcategories: [
      { name: 'Drain Effects', description: 'Deal damage or drain life when creatures die.', exampleCards: ['Blood Artist', 'Zulaport Cutthroat', 'Cruel Celebrant'] },
      { name: 'Sacrifice Outlets', description: 'Free or cheap ways to sacrifice creatures.', exampleCards: ['Viscera Seer', 'Goblin Bombardment', 'Phyrexian Altar'] },
      { name: 'Recursive Creatures', description: 'Creatures that return themselves from the graveyard.', exampleCards: ['Gravecrawler', 'Bloodghast', 'Reassembling Skeleton'] },
    ],
    keyCards: ['Blood Artist', 'Viscera Seer', 'Phyrexian Altar', 'Dictate of Erebos'],
    relevantFormats: ['Commander', 'Modern', 'Standard', 'Pioneer'],
  },
  {
    id: 'counters',
    name: '+1/+1 Counters',
    description: 'Place, proliferate, and double +1/+1 counters for growing threats that snowball out of control.',
    subcategories: [
      { name: 'Counter Placement', description: 'Cards that place counters on creatures.', exampleCards: ['Hardened Scales', 'Luminarch Aspirant', 'Walking Ballista'] },
      { name: 'Proliferate', description: 'Increase all counters on all permanents you control.', exampleCards: ['Atraxa, Praetors\' Voice', 'Karn\'s Bastion', 'Flux Channeler'] },
      { name: 'Counter Doubling', description: 'Double the number of counters placed.', exampleCards: ['Doubling Season', 'Branching Evolution', 'Corpsejack Menace'] },
    ],
    keyCards: ['Hardened Scales', 'Ozolith, the Shattered Spire', 'Walking Ballista', 'Doubling Season'],
    relevantFormats: ['Commander', 'Modern', 'Standard'],
  },
  {
    id: 'graveyard',
    name: 'Graveyard',
    description: 'Uses the graveyard as a resource — reanimating creatures, recurring spells, and filling the yard for value.',
    subcategories: [
      { name: 'Reanimation', description: 'Return creatures directly from graveyard to battlefield.', exampleCards: ['Reanimate', 'Animate Dead', 'Unburial Rites'] },
      { name: 'Self-Mill', description: 'Put cards from library into your own graveyard.', exampleCards: ['Stitcher\'s Supplier', 'Satyr Wayfinder', 'Grisly Salvage'] },
      { name: 'Flashback/Escape', description: 'Cast spells from the graveyard.', exampleCards: ['Snapcaster Mage', 'Uro, Titan of Nature\'s Wrath', 'Past in Flames'] },
    ],
    keyCards: ['Reanimate', 'Entomb', 'Living Death', 'Meren of Clan Nel Toth'],
    relevantFormats: ['Commander', 'Modern', 'Legacy', 'Pioneer'],
  },
  {
    id: 'tokens',
    name: 'Tokens',
    description: 'Generate creature tokens and overwhelm opponents with numbers, anthem effects, and sacrifice fodder.',
    subcategories: [
      { name: 'Token Generation', description: 'Create multiple creature tokens.', exampleCards: ['Lingering Souls', 'Bitterblossom', 'Hordeling Outburst'] },
      { name: 'Token Doubling', description: 'Double the number of tokens created.', exampleCards: ['Doubling Season', 'Anointed Procession', 'Parallel Lives'] },
      { name: 'Anthems', description: 'Buff all your creatures.', exampleCards: ['Intangible Virtue', 'Glorious Anthem', 'Coat of Arms'] },
    ],
    keyCards: ['Doubling Season', 'Anointed Procession', 'Bitterblossom', 'Craterhoof Behemoth'],
    relevantFormats: ['Commander', 'Modern', 'Standard'],
  },
  {
    id: 'enchantress',
    name: 'Enchantress',
    description: 'Draw cards by casting enchantments, building a value engine around enchantment synergies.',
    subcategories: [
      { name: 'Draw Engines', description: 'Draw a card when you cast an enchantment.', exampleCards: ['Enchantress\'s Presence', 'Argothian Enchantress', 'Mesa Enchantress'] },
      { name: 'Enchantment Payoffs', description: 'Cards that benefit from enchantment density.', exampleCards: ['Sigil of the Empty Throne', 'Sphere of Safety', 'Destiny Spinner'] },
      { name: 'Aura Voltron', description: 'Stack auras on a single creature.', exampleCards: ['Ethereal Armor', 'All That Glitters', 'Ancestral Mask'] },
    ],
    keyCards: ['Enchantress\'s Presence', 'Sigil of the Empty Throne', 'Replenish', 'Sterling Grove'],
    relevantFormats: ['Commander', 'Legacy', 'Modern'],
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    description: 'Artifact-centric strategies leveraging cost reduction, untapping, and artifact-count-matters payoffs.',
    subcategories: [
      { name: 'Affinity/Metalcraft', description: 'Benefit from artifact count.', exampleCards: ['Thought Monitor', 'Cranial Plating', 'Galvanic Blast'] },
      { name: 'Artifact Recursion', description: 'Return artifacts from graveyard.', exampleCards: ['Scrap Trawler', 'Emry, Lurker of the Loch', 'Goblin Welder'] },
      { name: 'Cost Reduction', description: 'Make artifacts cheaper to cast.', exampleCards: ['Foundry Inspector', 'Etherium Sculptor', 'Jhoira\'s Familiar'] },
    ],
    keyCards: ['Urza, Lord High Artificer', 'Cranial Plating', 'Arcbound Ravager', 'Mystic Forge'],
    relevantFormats: ['Modern', 'Commander', 'Vintage', 'Pauper'],
  },
  {
    id: 'landfall',
    name: 'Landfall',
    description: 'Triggers abilities when lands enter the battlefield — rewarding extra land drops, fetch lands, and ramp.',
    subcategories: [
      { name: 'Creature Growth', description: 'Creatures that grow with each land drop.', exampleCards: ['Omnath, Locus of Rage', 'Avenger of Zendikar', 'Rampaging Baloths'] },
      { name: 'Extra Land Drops', description: 'Play additional lands per turn.', exampleCards: ['Exploration', 'Oracle of Mul Daya', 'Azusa, Lost but Seeking'] },
      { name: 'Land Recursion', description: 'Return lands from graveyard to replay landfall triggers.', exampleCards: ['Crucible of Worlds', 'Ramunap Excavator', 'Life from the Loam'] },
    ],
    keyCards: ['Avenger of Zendikar', 'Scapeshift', 'Exploration', 'Omnath, Locus of Creation'],
    relevantFormats: ['Commander', 'Modern', 'Standard'],
  },
  {
    id: 'storm',
    name: 'Storm',
    description: 'Casts many spells in a single turn to build storm count or trigger magecraft, culminating in a lethal finisher.',
    subcategories: [
      { name: 'Rituals', description: 'Spells that generate more mana than they cost.', exampleCards: ['Dark Ritual', 'Cabal Ritual', 'Pyretic Ritual'] },
      { name: 'Cantrips', description: 'Cheap spells that replace themselves.', exampleCards: ['Brainstorm', 'Ponder', 'Preordain'] },
      { name: 'Storm Finishers', description: 'Cards with storm or similar "count spells" effects.', exampleCards: ['Grapeshot', 'Tendrils of Agony', 'Brain Freeze'] },
    ],
    keyCards: ['Grapeshot', 'Tendrils of Agony', 'Past in Flames', 'Underworld Breach'],
    relevantFormats: ['Legacy', 'Modern', 'Vintage', 'Commander'],
  },
  {
    id: 'voltron',
    name: 'Voltron',
    description: 'Suits up a single creature (often the commander) with equipment and auras to deal lethal commander/combat damage.',
    subcategories: [
      { name: 'Equipment', description: 'Artifacts that attach to creatures for bonuses.', exampleCards: ['Sword of Fire and Ice', 'Colossus Hammer', 'Lightning Greaves'] },
      { name: 'Auras', description: 'Enchantments that buff a creature.', exampleCards: ['Ethereal Armor', 'Eldrazi Conscription', 'Battle Mastery'] },
      { name: 'Protection', description: 'Keep your voltron creature alive.', exampleCards: ['Lightning Greaves', 'Swiftfoot Boots', 'Tyvar\'s Stand'] },
    ],
    keyCards: ['Lightning Greaves', 'Sword of Fire and Ice', 'Colossus Hammer', 'Puresteel Paladin'],
    relevantFormats: ['Commander'],
  },
  {
    id: 'mill',
    name: 'Mill',
    description: 'Puts cards from opponents\' libraries into their graveyards as an alternative win condition.',
    subcategories: [
      { name: 'Targeted Mill', description: 'Mill a specific number of cards.', exampleCards: ['Hedron Crab', 'Maddening Cacophony', 'Glimpse the Unthinkable'] },
      { name: 'Persistent Mill', description: 'Ongoing mill effects.', exampleCards: ['Bruvac the Grandiloquent', 'Altar of Dementia', 'Mesmeric Orb'] },
      { name: 'Mill Payoffs', description: 'Cards that benefit from opponent having cards in graveyard.', exampleCards: ['Tasha\'s Hideous Laughter', 'Consuming Aberration', 'Ruin Crab'] },
    ],
    keyCards: ['Hedron Crab', 'Archive Trap', 'Bruvac the Grandiloquent', 'Altar of Dementia'],
    relevantFormats: ['Modern', 'Commander', 'Standard', 'Pauper'],
  },
  {
    id: 'lifegain',
    name: 'Lifegain',
    description: 'Gains life to trigger payoffs that create tokens, grow creatures, or drain opponents.',
    subcategories: [
      { name: 'Lifegain Triggers', description: 'Effects that happen when you gain life.', exampleCards: ['Ajani\'s Pridemate', 'Voice of the Blessed', 'Archangel of Thune'] },
      { name: 'Lifegain Sources', description: 'Repeatable ways to gain life.', exampleCards: ['Soul Warden', 'Authority of the Consuls', 'Heliod, Sun-Crowned'] },
      { name: 'Life-as-Resource', description: 'Spend life total as a resource.', exampleCards: ['Aetherflux Reservoir', 'Bolas\'s Citadel', 'Necropotence'] },
    ],
    keyCards: ['Heliod, Sun-Crowned', 'Aetherflux Reservoir', 'Soul Warden', 'Archangel of Thune'],
    relevantFormats: ['Commander', 'Standard', 'Modern'],
  },
  {
    id: 'blink',
    name: 'Blink / Flicker',
    description: 'Exile permanents and return them to the battlefield to re-trigger enter-the-battlefield abilities.',
    subcategories: [
      { name: 'Single-Target Blink', description: 'Flicker one permanent at a time.', exampleCards: ['Ephemerate', 'Restoration Angel', 'Felidar Guardian'] },
      { name: 'Mass Blink', description: 'Flicker multiple permanents simultaneously.', exampleCards: ['Eerie Interlude', 'Yorion, Sky Nomad', 'Brago, King Eternal'] },
      { name: 'ETB Payoffs', description: 'Creatures with powerful enter-the-battlefield effects.', exampleCards: ['Mulldrifter', 'Cloudblazer', 'Agent of Treachery'] },
    ],
    keyCards: ['Ephemerate', 'Brago, King Eternal', 'Panharmonicon', 'Restoration Angel'],
    relevantFormats: ['Commander', 'Modern', 'Pauper', 'Legacy'],
  },
  {
    id: 'wheels',
    name: 'Wheels',
    description: 'Forces all players to discard hands and draw new cards, fueling graveyard synergies and discard payoffs.',
    subcategories: [
      { name: 'Wheel Effects', description: 'Everyone discards and draws.', exampleCards: ['Wheel of Fortune', 'Windfall', 'Wheel of Misfortune'] },
      { name: 'Discard Payoffs', description: 'Benefit when opponents discard.', exampleCards: ['Notion Thief', 'Narset, Parter of Veils', 'Waste Not'] },
      { name: 'Damage on Draw', description: 'Deal damage for each card drawn.', exampleCards: ['Nekusar, the Mindrazer', 'Underworld Dreams', 'Teferi\'s Puzzle Box'] },
    ],
    keyCards: ['Wheel of Fortune', 'Windfall', 'Notion Thief', 'Nekusar, the Mindrazer'],
    relevantFormats: ['Commander', 'Vintage', 'Legacy'],
  },
  {
    id: 'stax',
    name: 'Stax',
    description: 'Restricts opponents\' ability to play the game through taxing effects, resource denial, and static abilities.',
    subcategories: [
      { name: 'Tax Effects', description: 'Make spells and abilities cost more.', exampleCards: ['Thalia, Guardian of Thraben', 'Sphere of Resistance', 'Trinisphere'] },
      { name: 'Resource Denial', description: 'Restrict untapping and mana production.', exampleCards: ['Winter Orb', 'Stasis', 'Static Orb'] },
      { name: 'Rule-Setting', description: 'Prevent certain actions.', exampleCards: ['Rule of Law', 'Drannith Magistrate', 'Collector Ouphe'] },
    ],
    keyCards: ['Thalia, Guardian of Thraben', 'Winter Orb', 'Trinisphere', 'Drannith Magistrate'],
    relevantFormats: ['Commander', 'Legacy', 'Vintage'],
  },
  {
    id: 'spellslinger',
    name: 'Spellslinger',
    description: 'Casts many instants and sorceries, triggering prowess, magecraft, and spell-copying effects.',
    subcategories: [
      { name: 'Prowess/Magecraft', description: 'Creatures that trigger on spell casts.', exampleCards: ['Monastery Swiftspear', 'Archmage Emeritus', 'Storm-Kiln Artist'] },
      { name: 'Spell Copying', description: 'Duplicate spells for double value.', exampleCards: ['Twincast', 'Galvanic Iteration', 'Double Vision'] },
      { name: 'Spell Recursion', description: 'Reuse spells from the graveyard.', exampleCards: ['Snapcaster Mage', 'Mission Briefing', 'Past in Flames'] },
    ],
    keyCards: ['Monastery Swiftspear', 'Archmage Emeritus', 'Young Pyromancer', 'Snapcaster Mage'],
    relevantFormats: ['Modern', 'Commander', 'Legacy', 'Pioneer', 'Standard'],
  },
] as const;

// --- Lookup ---

/**
 * Find a synergy category by its ID slug.
 */
export function getSynergyById(id: string): SynergyCategory | undefined {
  return SYNERGY_CATEGORIES.find(s => s.id === id);
}

/**
 * Find synergy categories relevant to a given format.
 */
export function getSynergiesByFormat(format: string): SynergyCategory[] {
  return SYNERGY_CATEGORIES.filter(s =>
    s.relevantFormats.some(f => f.toLowerCase() === format.toLowerCase()),
  );
}

/**
 * Search for synergy categories whose name or description matches a query (case-insensitive).
 */
export function searchSynergies(query: string): SynergyCategory[] {
  const lower = query.toLowerCase();
  return SYNERGY_CATEGORIES.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.subcategories.some(sub => sub.name.toLowerCase().includes(lower)),
  );
}
