import { describe, it, expect } from 'vitest';
import {
  formatSearchCards,
  formatGetCard,
  formatGetRulings,
  formatCheckLegality,
  formatSearchByMechanic,
  formatLookupRule,
  formatGetGlossary,
  formatGetKeyword,
  formatAnalyzeCommander,
  formatFindCombos,
  formatFindSynergies,
  formatGetFormatStaples,
} from '../src/format.js';

// --- search_cards ---

describe('formatSearchCards', () => {
  it('formats empty results', () => {
    const text = formatSearchCards({ cards: [], total: 0 });
    expect(text).toBe('No cards found matching your search criteria.');
  });

  it('formats card list with mana costs and colors', () => {
    const text = formatSearchCards({
      cards: [
        { name: 'Sol Ring', mana_cost: '{1}', type_line: 'Artifact', oracle_text_preview: '{T}: Add {C}{C}.', colors: [] },
        { name: 'Lightning Bolt', mana_cost: '{R}', type_line: 'Instant', oracle_text_preview: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
      ],
      total: 2,
    });
    expect(text).toContain('Found 2 card(s)');
    expect(text).toContain('**Sol Ring** {1}');
    expect(text).toContain('Artifact');
    expect(text).toContain('{T}: Add {C}{C}.');
    expect(text).toContain('**Lightning Bolt** {R}');
    expect(text).toContain('[R]');
  });

  it('handles cards without mana cost or oracle text', () => {
    const text = formatSearchCards({
      cards: [{ name: 'Forest', mana_cost: null, type_line: 'Basic Land — Forest', oracle_text_preview: null, colors: [] }],
      total: 1,
    });
    expect(text).toContain('**Forest**');
    expect(text).toContain('Basic Land');
    expect(text).not.toContain('null');
  });
});

// --- get_card ---

describe('formatGetCard', () => {
  it('formats not-found with suggestions', () => {
    const text = formatGetCard({
      found: false,
      message: 'No card found matching "Sol Rng"',
      suggestions: ['Sol Ring', 'Sol Talisman'],
    });
    expect(text).toContain('No card found');
    expect(text).toContain('Did you mean: Sol Ring, Sol Talisman?');
  });

  it('formats not-found without suggestions', () => {
    const text = formatGetCard({ found: false, message: 'No card found matching "xyzzy"' });
    expect(text).toBe('No card found matching "xyzzy"');
  });

  it('formats full card detail', () => {
    const text = formatGetCard({
      found: true,
      card: {
        id: 'sol-ring-id',
        name: 'Sol Ring',
        mana_cost: '{1}',
        cmc: 1,
        type_line: 'Artifact',
        oracle_text: '{T}: Add {C}{C}.',
        power: null,
        toughness: null,
        loyalty: null,
        colors: [],
        color_identity: [],
        keywords: [],
        rarity: 'uncommon',
        set_code: 'c21',
        set_name: 'Commander 2021',
        released_at: '2021-04-23',
        image_uri: null,
        scryfall_uri: 'https://scryfall.com/card/c21/263',
        edhrec_rank: 1,
        artist: 'Mike Bierek',
        faces: [],
        rulings: [
          { source: 'wotc', published_at: '2024-01-01', comment: 'Sol Ring produces colorless mana.' },
        ],
        legalities: { commander: 'legal', vintage: 'restricted', legacy: 'banned' },
      },
    });
    expect(text).toContain('# Sol Ring {1}');
    expect(text).toContain('Artifact');
    expect(text).toContain('{T}: Add {C}{C}.');
    expect(text).toContain('Rarity: Uncommon');
    expect(text).toContain('Set: C21 (Commander 2021)');
    expect(text).toContain('EDHREC Rank: #1');
    expect(text).toContain('Artist: Mike Bierek');
    expect(text).toContain('## Legality');
    expect(text).toContain('Commander: Legal');
    expect(text).toContain('Vintage: Restricted');
    expect(text).toContain('## Rulings (1)');
    expect(text).toContain('2024-01-01 (wotc): Sol Ring produces colorless mana.');
    expect(text).toContain('[View on Scryfall]');
  });

  it('formats creature with P/T', () => {
    const text = formatGetCard({
      found: true,
      card: {
        id: 'bolt-id', name: 'Grizzly Bears', mana_cost: '{1}{G}', cmc: 2,
        type_line: 'Creature — Bear', oracle_text: null,
        power: '2', toughness: '2', loyalty: null,
        colors: ['G'], color_identity: ['G'], keywords: [],
        rarity: 'common', set_code: 'a25', set_name: 'Masters 25',
        released_at: '2018-03-16', image_uri: null, scryfall_uri: null,
        edhrec_rank: null, artist: null, faces: [], rulings: [], legalities: {},
      },
    });
    expect(text).toContain('2/2');
    expect(text).toContain('Color Identity: G');
  });

  it('formats planeswalker with loyalty', () => {
    const text = formatGetCard({
      found: true,
      card: {
        id: 'jace-id', name: 'Jace, the Mind Sculptor', mana_cost: '{2}{U}{U}', cmc: 4,
        type_line: 'Legendary Planeswalker — Jace', oracle_text: '+2: Look at the top card...',
        power: null, toughness: null, loyalty: '3',
        colors: ['U'], color_identity: ['U'], keywords: [],
        rarity: 'mythic', set_code: 'wwk', set_name: 'Worldwake',
        released_at: '2010-02-05', image_uri: null, scryfall_uri: null,
        edhrec_rank: 100, artist: null, faces: [], rulings: [], legalities: {},
      },
    });
    expect(text).toContain('Loyalty: 3');
  });

  it('formats double-faced card', () => {
    const text = formatGetCard({
      found: true,
      card: {
        id: 'dfc-id', name: 'Delver of Secrets // Insectile Aberration', mana_cost: '{U}', cmc: 1,
        type_line: null, oracle_text: null,
        power: null, toughness: null, loyalty: null,
        colors: ['U'], color_identity: ['U'], keywords: ['Flying', 'Transform'],
        rarity: 'common', set_code: 'isd', set_name: 'Innistrad',
        released_at: '2011-09-30', image_uri: null, scryfall_uri: null,
        edhrec_rank: null, artist: null,
        faces: [
          { face_index: 0, name: 'Delver of Secrets', mana_cost: '{U}', type_line: 'Creature — Human Wizard', oracle_text: 'At the beginning of your upkeep...', power: '1', toughness: '1', colors: ['U'] },
          { face_index: 1, name: 'Insectile Aberration', mana_cost: null, type_line: 'Creature — Human Insect', oracle_text: 'Flying', power: '3', toughness: '2', colors: ['U'] },
        ],
        rulings: [], legalities: {},
      },
    });
    expect(text).toContain('## Faces');
    expect(text).toContain('### Delver of Secrets');
    expect(text).toContain('### Insectile Aberration');
    expect(text).toContain('1/1');
    expect(text).toContain('3/2');
  });
});

// --- get_rulings ---

describe('formatGetRulings', () => {
  it('formats not-found', () => {
    const text = formatGetRulings({ found: false, message: 'No card found matching "xyz"' });
    expect(text).toBe('No card found matching "xyz"');
  });

  it('formats empty rulings', () => {
    const text = formatGetRulings({ found: true, card_name: 'Forest', rulings: [] });
    expect(text).toContain('No rulings found for "Forest"');
  });

  it('formats rulings list', () => {
    const text = formatGetRulings({
      found: true,
      card_name: 'Sol Ring',
      rulings: [
        { source: 'wotc', published_at: '2024-01-01', comment: 'This is a mana ability.' },
        { source: 'wotc', published_at: '2024-02-01', comment: 'It does not use the stack.' },
      ],
    });
    expect(text).toContain('# Rulings for Sol Ring (2)');
    expect(text).toContain('2024-01-01 (wotc): This is a mana ability.');
    expect(text).toContain('2024-02-01 (wotc): It does not use the stack.');
  });
});

// --- check_legality ---

describe('formatCheckLegality', () => {
  it('formats with format filter', () => {
    const text = formatCheckLegality({
      format: 'commander',
      results: [{ card_name: 'Sol Ring', found: true, legalities: { commander: 'legal' } }],
    });
    expect(text).toContain('# Format Legality Check: Commander');
    expect(text).toContain('**Sol Ring**');
    expect(text).toContain('Commander: Legal');
  });

  it('formats not-found card', () => {
    const text = formatCheckLegality({
      format: null,
      results: [{ card_name: 'Xyzzy', found: false, legalities: {}, message: 'Card not found: "Xyzzy"' }],
    });
    expect(text).toContain('**Xyzzy**: Card not found');
  });

  it('formats multiple cards', () => {
    const text = formatCheckLegality({
      format: null,
      results: [
        { card_name: 'Sol Ring', found: true, legalities: { commander: 'legal', modern: 'not_legal' } },
        { card_name: 'Lightning Bolt', found: true, legalities: { commander: 'legal', modern: 'legal' } },
      ],
    });
    expect(text).toContain('**Sol Ring**');
    expect(text).toContain('**Lightning Bolt**');
  });
});

// --- search_by_mechanic ---

describe('formatSearchByMechanic', () => {
  it('formats with keyword definition', () => {
    const text = formatSearchByMechanic({
      keyword: 'Flying',
      definition: { name: 'Flying', section: '702.9', type: 'Evasion', rules_text: 'This creature can only be blocked by...' },
      cards: [{ name: 'Serra Angel', mana_cost: '{3}{W}{W}', type_line: 'Creature — Angel', oracle_text_preview: 'Flying, vigilance' }],
      total: 1,
    });
    expect(text).toContain('# Cards with "Flying"');
    expect(text).toContain('**Flying** (Evasion, Section 702.9)');
    expect(text).toContain('Serra Angel');
  });

  it('formats empty results', () => {
    const text = formatSearchByMechanic({ keyword: 'Xyzzy', cards: [], total: 0 });
    expect(text).toContain('No cards found with this keyword');
  });
});

// --- lookup_rule ---

describe('formatLookupRule', () => {
  it('formats not-found', () => {
    const text = formatLookupRule({ found: false, message: 'No rule found for section "999"' });
    expect(text).toBe('No rule found for section "999"');
  });

  it('formats rules with parent', () => {
    const text = formatLookupRule({
      found: true,
      parent: { section: '702', title: 'Keyword Abilities', text: 'Keyword abilities...', parent_section: null },
      rules: [
        { section: '702.9', title: 'Flying', text: 'A creature with flying can only be blocked...', parent_section: '702' },
        { section: '702.9a', title: null, text: 'Flying is an evasion ability.', parent_section: '702.9' },
      ],
    });
    expect(text).toContain('Parent: 702');
    expect(text).toContain('**702.9 — Flying**');
    expect(text).toContain('**702.9a**');
  });
});

// --- get_glossary ---

describe('formatGetGlossary', () => {
  it('formats not-found', () => {
    const text = formatGetGlossary({ found: false, message: 'No glossary entry found for "xyzzy"' });
    expect(text).toBe('No glossary entry found for "xyzzy"');
  });

  it('formats glossary entries', () => {
    const text = formatGetGlossary({
      found: true,
      entries: [
        { term: 'Permanent', definition: 'A card or token on the battlefield.' },
        { term: 'Spell', definition: 'A card on the stack.' },
      ],
    });
    expect(text).toContain('**Permanent**: A card or token on the battlefield.');
    expect(text).toContain('**Spell**: A card on the stack.');
  });
});

// --- get_keyword ---

describe('formatGetKeyword', () => {
  it('formats not-found with suggestions', () => {
    const text = formatGetKeyword({
      found: false,
      message: 'No keyword found matching "Flyin"',
      suggestions: ['Flying'],
    });
    expect(text).toContain('No keyword found');
    expect(text).toContain('Did you mean: Flying?');
  });

  it('formats keyword', () => {
    const text = formatGetKeyword({
      found: true,
      keyword: { name: 'Flying', section: '702.9', type: 'Evasion', rules_text: 'A creature with flying...' },
    });
    expect(text).toContain('# Flying');
    expect(text).toContain('Type: Evasion | Section: 702.9');
    expect(text).toContain('A creature with flying...');
  });
});

// --- analyze_commander ---

describe('formatAnalyzeCommander', () => {
  it('formats not-found', () => {
    const text = formatAnalyzeCommander({ found: false, message: 'Not a legendary creature' });
    expect(text).toBe('Not a legendary creature');
  });

  it('formats analysis', () => {
    const text = formatAnalyzeCommander({
      found: true,
      analysis: {
        name: 'Krenko, Mob Boss',
        color_identity: ['R'],
        type_line: 'Legendary Creature — Goblin Warrior',
        oracle_text: '{T}: Create X tokens...',
        edhrec_rank: 42,
        has_partner: false,
        suggested_strategies: [{
          id: 'red-aggro', name: 'Red Aggro', description: 'Fast red beatdown',
          power_brackets: ['casual'], staple_cards: ['Goblin Bombardment'], key_synergies: ['Haste enablers'],
        }],
        suggested_archetypes: [{
          id: 'tokens', name: 'Tokens', description: 'Create lots of tokens', key_mechanics: ['Token Generation'],
        }],
        recommended_categories: ['Ramp', 'Card Draw', 'Token Generators'],
      },
    });
    expect(text).toContain('# Commander Analysis: Krenko, Mob Boss');
    expect(text).toContain('Color Identity: R');
    expect(text).toContain('EDHREC Rank: #42');
    expect(text).toContain('## Suggested Strategies');
    expect(text).toContain('### Red Aggro');
    expect(text).toContain('Goblin Bombardment');
    expect(text).toContain('## Suggested Archetypes');
    expect(text).toContain('**Tokens**');
    expect(text).toContain('## Recommended Card Categories');
    expect(text).toContain('- Token Generators');
  });
});

// --- find_combos ---

describe('formatFindCombos', () => {
  it('formats empty results', () => {
    const text = formatFindCombos({ combos: [], total: 0 });
    expect(text).toBe('No combos found matching your criteria.');
  });

  it('formats combos', () => {
    const text = formatFindCombos({
      combos: [{
        id: 'combo-1',
        cards: ['Splinter Twin', 'Deceiver Exarch'],
        color_identity: ['U', 'R'],
        prerequisites: 'Both on battlefield',
        steps: '1. Activate Splinter Twin...',
        results: 'Infinite tokens',
        popularity: 500,
      }],
      total: 1,
    });
    expect(text).toContain('Found 1 combo(s)');
    expect(text).toContain('## Splinter Twin + Deceiver Exarch [UR]');
    expect(text).toContain('**Prerequisites:** Both on battlefield');
    expect(text).toContain('**Steps:** 1. Activate Splinter Twin');
    expect(text).toContain('**Result:** Infinite tokens');
    expect(text).toContain('Popularity: 500');
  });
});

// --- find_synergies ---

describe('formatFindSynergies', () => {
  it('formats no matches', () => {
    const text = formatFindSynergies({
      card_name: 'Forest',
      creature_types: [],
      keywords: [],
      matching_categories: [],
    });
    expect(text).toContain('# Synergies for Forest');
    expect(text).toContain('No synergy categories matched');
  });

  it('formats synergies', () => {
    const text = formatFindSynergies({
      card_name: 'Doubling Season',
      creature_types: [],
      keywords: [],
      matching_categories: [{
        id: 'counters', name: 'Counters', description: '+1/+1 and loyalty counter strategies',
        match_reason: 'Oracle text mentions "counter"',
        sample_cards: ['Hardened Scales', 'Winding Constrictor'],
      }],
    });
    expect(text).toContain('# Synergies for Doubling Season');
    expect(text).toContain('## Counters');
    expect(text).toContain('Match Reason: Oracle text mentions "counter"');
    expect(text).toContain('Hardened Scales, Winding Constrictor');
  });
});

// --- get_format_staples ---

describe('formatGetFormatStaples', () => {
  it('formats format staples', () => {
    const text = formatGetFormatStaples({
      format: 'commander',
      format_info: { name: 'Commander', description: '100-card singleton format', power_level: 7 },
      archetype_filter: null,
      staple_cards: ['Sol Ring', 'Command Tower'],
      archetypes: [{ id: 'tokens', name: 'Tokens', example_cards: ['Doubling Season'] }],
    });
    expect(text).toContain('# Commander Staples');
    expect(text).toContain('100-card singleton format');
    expect(text).toContain('Power Level: 7/10');
    expect(text).toContain('## Key Cards (2)');
    expect(text).toContain('- Sol Ring');
    expect(text).toContain('## Archetypes');
    expect(text).toContain('### Tokens');
  });

  it('formats with archetype filter', () => {
    const text = formatGetFormatStaples({
      format: 'modern',
      format_info: null,
      archetype_filter: 'burn',
      staple_cards: ['Lightning Bolt'],
      archetypes: [],
    });
    expect(text).toContain('# Modern Staples — burn');
  });
});

// --- General formatting properties ---

describe('response formatting', () => {
  it('never returns raw JSON objects', () => {
    // Every formatter returns a string, not an object
    const searchResult = formatSearchCards({ cards: [{ name: 'Test', mana_cost: '{1}', type_line: 'Artifact', oracle_text_preview: 'Test text', colors: [] }], total: 1 });
    expect(typeof searchResult).toBe('string');
    expect(searchResult).not.toMatch(/^\s*\{/); // Not JSON

    const cardResult = formatGetCard({ found: false, message: 'Not found' });
    expect(typeof cardResult).toBe('string');
  });

  it('uses markdown formatting for readability', () => {
    const text = formatGetCard({
      found: true,
      card: {
        id: 'test', name: 'Test Card', mana_cost: '{1}', cmc: 1,
        type_line: 'Artifact', oracle_text: 'Test.', power: null, toughness: null,
        loyalty: null, colors: [], color_identity: [], keywords: [],
        rarity: 'common', set_code: 'tst', set_name: 'Test Set',
        released_at: '2024-01-01', image_uri: null, scryfall_uri: null,
        edhrec_rank: null, artist: null, faces: [], rulings: [],
        legalities: { commander: 'legal' },
      },
    });
    // Uses markdown headers
    expect(text).toContain('# Test Card');
    expect(text).toContain('## Legality');
  });
});
