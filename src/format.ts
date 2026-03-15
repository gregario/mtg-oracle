/**
 * Response formatters that convert raw tool results into readable text for LLMs.
 * Tools should return formatted text, NOT raw JSON.
 */

import type { SearchCardsResult } from './tools/search-cards.js';
import type { GetCardResult, CardDetail } from './tools/get-card.js';
import type { GetRulingsResult } from './tools/get-rulings.js';
import type { CheckLegalityResult } from './tools/check-legality.js';
import type { SearchByMechanicResult } from './tools/search-by-mechanic.js';
import type { LookupRuleResult } from './tools/lookup-rule.js';
import type { GetGlossaryResult } from './tools/get-glossary.js';
import type { GetKeywordResult } from './tools/get-keyword.js';
import type { AnalyzeCommanderResult } from './tools/analyze-commander.js';
import type { FindCombosResult } from './tools/find-combos.js';
import type { FindSynergiesResult } from './tools/find-synergies.js';
import type { FormatStaplesResult } from './tools/get-format-staples.js';

// --- Card tools ---

export function formatSearchCards(result: SearchCardsResult): string {
  if (result.cards.length === 0) {
    return 'No cards found matching your search criteria.';
  }

  const lines: string[] = [`Found ${result.total} card(s):\n`];

  for (const card of result.cards) {
    const costPart = card.mana_cost ? ` ${card.mana_cost}` : '';
    const colorPart = card.colors.length > 0 ? ` [${card.colors.join('')}]` : '';
    lines.push(`- **${card.name}**${costPart} — ${card.type_line ?? 'Unknown Type'}${colorPart}`);
    if (card.oracle_text_preview) {
      lines.push(`  ${card.oracle_text_preview}`);
    }
  }

  return lines.join('\n');
}

export function formatGetCard(result: GetCardResult): string {
  if (!result.found) {
    let text = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      text += `\n\nDid you mean: ${result.suggestions.join(', ')}?`;
    }
    return text;
  }

  const card = result.card;
  return formatCardDetail(card);
}

function formatCardDetail(card: CardDetail): string {
  const lines: string[] = [];

  // Header
  const costPart = card.mana_cost ? ` ${card.mana_cost}` : '';
  lines.push(`# ${card.name}${costPart}`);

  // Type line
  if (card.type_line) {
    lines.push(card.type_line);
  }

  // Oracle text
  if (card.oracle_text) {
    lines.push('');
    lines.push(card.oracle_text);
  }

  // P/T or Loyalty
  if (card.power && card.toughness) {
    lines.push(`\n${card.power}/${card.toughness}`);
  }
  if (card.loyalty) {
    lines.push(`\nLoyalty: ${card.loyalty}`);
  }

  // Metadata
  const metaParts: string[] = [];
  if (card.rarity) metaParts.push(`Rarity: ${capitalize(card.rarity)}`);
  if (card.set_code && card.set_name) metaParts.push(`Set: ${card.set_code.toUpperCase()} (${card.set_name})`);
  if (card.edhrec_rank) metaParts.push(`EDHREC Rank: #${card.edhrec_rank}`);
  if (card.artist) metaParts.push(`Artist: ${card.artist}`);
  if (metaParts.length > 0) {
    lines.push('');
    lines.push(metaParts.join(' | '));
  }

  // Color identity
  if (card.color_identity.length > 0) {
    lines.push(`Color Identity: ${card.color_identity.join('')}`);
  }

  // Keywords
  if (card.keywords.length > 0) {
    lines.push(`Keywords: ${card.keywords.join(', ')}`);
  }

  // Faces (double-faced cards)
  if (card.faces.length > 0) {
    lines.push('\n## Faces');
    for (const face of card.faces) {
      const faceCost = face.mana_cost ? ` ${face.mana_cost}` : '';
      lines.push(`\n### ${face.name}${faceCost}`);
      if (face.type_line) lines.push(face.type_line);
      if (face.oracle_text) lines.push(face.oracle_text);
      if (face.power && face.toughness) lines.push(`${face.power}/${face.toughness}`);
    }
  }

  // Legality
  const legalFormats = Object.entries(card.legalities);
  if (legalFormats.length > 0) {
    lines.push('\n## Legality');
    const legalParts = legalFormats.map(([fmt, status]) =>
      `${capitalize(fmt)}: ${capitalize(status)}`
    );
    lines.push(legalParts.join(' | '));
  }

  // Rulings
  if (card.rulings.length > 0) {
    lines.push(`\n## Rulings (${card.rulings.length})`);
    for (const ruling of card.rulings) {
      const datePart = ruling.published_at ? `${ruling.published_at}` : '';
      const sourcePart = ruling.source ? ` (${ruling.source})` : '';
      lines.push(`- ${datePart}${sourcePart}: ${ruling.comment}`);
    }
  }

  // Scryfall link
  if (card.scryfall_uri) {
    lines.push(`\n[View on Scryfall](${card.scryfall_uri})`);
  }

  return lines.join('\n');
}

export function formatGetRulings(result: GetRulingsResult): string {
  if (!result.found) {
    return result.message;
  }

  if (result.rulings.length === 0) {
    return `No rulings found for "${result.card_name}".`;
  }

  const lines: string[] = [`# Rulings for ${result.card_name} (${result.rulings.length})\n`];
  for (const ruling of result.rulings) {
    const datePart = ruling.published_at ? `${ruling.published_at}` : '';
    const sourcePart = ruling.source ? ` (${ruling.source})` : '';
    lines.push(`- ${datePart}${sourcePart}: ${ruling.comment}`);
  }

  return lines.join('\n');
}

export function formatCheckLegality(result: CheckLegalityResult): string {
  const lines: string[] = [];

  if (result.format) {
    lines.push(`# Format Legality Check: ${capitalize(result.format)}\n`);
  } else {
    lines.push('# Format Legality Check\n');
  }

  for (const card of result.results) {
    if (!card.found) {
      lines.push(`**${card.card_name}**: ${card.message}`);
      continue;
    }

    lines.push(`**${card.card_name}**:`);
    const entries = Object.entries(card.legalities);
    if (entries.length === 0) {
      lines.push('  No legality data available.');
    } else {
      const parts = entries.map(([fmt, status]) => `${capitalize(fmt)}: ${capitalize(status)}`);
      lines.push(`  ${parts.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

export function formatSearchByMechanic(result: SearchByMechanicResult): string {
  const lines: string[] = [];

  lines.push(`# Cards with "${result.keyword}"\n`);

  if (result.definition) {
    lines.push(`**${result.definition.name}** (${result.definition.type}, Section ${result.definition.section})`);
    lines.push(result.definition.rules_text);
    lines.push('');
  }

  if (result.cards.length === 0) {
    lines.push('No cards found with this keyword/mechanic.');
    return lines.join('\n');
  }

  lines.push(`Found ${result.total} card(s):\n`);
  for (const card of result.cards) {
    const costPart = card.mana_cost ? ` ${card.mana_cost}` : '';
    lines.push(`- **${card.name}**${costPart} — ${card.type_line ?? 'Unknown Type'}`);
    if (card.oracle_text_preview) {
      lines.push(`  ${card.oracle_text_preview}`);
    }
  }

  return lines.join('\n');
}

// --- Rules tools ---

export function formatLookupRule(result: LookupRuleResult): string {
  if (!result.found) {
    return result.message;
  }

  const lines: string[] = [];

  if (result.parent) {
    lines.push(`(Parent: ${result.parent.section} — ${result.parent.title ?? result.parent.text})\n`);
  }

  for (const rule of result.rules) {
    const titlePart = rule.title ? ` — ${rule.title}` : '';
    lines.push(`**${rule.section}${titlePart}**`);
    lines.push(rule.text);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function formatGetGlossary(result: GetGlossaryResult): string {
  if (!result.found) {
    return result.message;
  }

  const lines: string[] = [];
  for (const entry of result.entries) {
    lines.push(`**${entry.term}**: ${entry.definition}`);
  }

  return lines.join('\n\n');
}

export function formatGetKeyword(result: GetKeywordResult): string {
  if (!result.found) {
    let text = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      text += `\n\nDid you mean: ${result.suggestions.join(', ')}?`;
    }
    return text;
  }

  const kw = result.keyword;
  const lines: string[] = [
    `# ${kw.name}`,
    `Type: ${kw.type} | Section: ${kw.section}`,
    '',
    kw.rules_text,
  ];

  return lines.join('\n');
}

// --- Commander tools ---

export function formatAnalyzeCommander(result: AnalyzeCommanderResult): string {
  if (!result.found) {
    return result.message;
  }

  const a = result.analysis;
  const lines: string[] = [];

  lines.push(`# Commander Analysis: ${a.name}`);
  lines.push(`Color Identity: ${a.color_identity.length > 0 ? a.color_identity.join('') : 'Colorless'}`);
  lines.push(`Type: ${a.type_line}`);
  if (a.edhrec_rank) lines.push(`EDHREC Rank: #${a.edhrec_rank}`);
  if (a.has_partner) lines.push('Has Partner');

  if (a.oracle_text) {
    lines.push('');
    lines.push(a.oracle_text);
  }

  if (a.suggested_strategies.length > 0) {
    lines.push('\n## Suggested Strategies');
    for (const strat of a.suggested_strategies) {
      lines.push(`\n### ${strat.name}`);
      lines.push(strat.description);
      if (strat.power_brackets.length > 0) {
        lines.push(`Power Brackets: ${strat.power_brackets.join(', ')}`);
      }
      if (strat.staple_cards.length > 0) {
        lines.push(`Staple Cards: ${strat.staple_cards.join(', ')}`);
      }
      if (strat.key_synergies.length > 0) {
        lines.push(`Key Synergies: ${strat.key_synergies.join(', ')}`);
      }
    }
  }

  if (a.suggested_archetypes.length > 0) {
    lines.push('\n## Suggested Archetypes');
    for (const arch of a.suggested_archetypes) {
      lines.push(`- **${arch.name}**: ${arch.description}`);
      if (arch.key_mechanics.length > 0) {
        lines.push(`  Mechanics: ${arch.key_mechanics.join(', ')}`);
      }
    }
  }

  if (a.recommended_categories.length > 0) {
    lines.push('\n## Recommended Card Categories');
    lines.push(a.recommended_categories.map(c => `- ${c}`).join('\n'));
  }

  return lines.join('\n');
}

export function formatFindCombos(result: FindCombosResult): string {
  if (result.combos.length === 0) {
    return 'No combos found matching your criteria.';
  }

  const lines: string[] = [`Found ${result.total} combo(s):\n`];

  for (const combo of result.combos) {
    const colorPart = combo.color_identity.length > 0 ? ` [${combo.color_identity.join('')}]` : '';
    lines.push(`## ${combo.cards.join(' + ')}${colorPart}`);

    if (combo.prerequisites) {
      lines.push(`**Prerequisites:** ${combo.prerequisites}`);
    }
    if (combo.steps) {
      lines.push(`**Steps:** ${combo.steps}`);
    }
    if (combo.results) {
      lines.push(`**Result:** ${combo.results}`);
    }
    if (combo.popularity) {
      lines.push(`Popularity: ${combo.popularity}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function formatFindSynergies(result: FindSynergiesResult): string {
  const lines: string[] = [`# Synergies for ${result.card_name}\n`];

  if (result.keywords.length > 0) {
    lines.push(`Keywords: ${result.keywords.join(', ')}`);
  }
  if (result.creature_types.length > 0) {
    lines.push(`Creature Types: ${result.creature_types.join(', ')}`);
  }

  if (result.matching_categories.length === 0) {
    lines.push('\nNo synergy categories matched.');
    return lines.join('\n');
  }

  lines.push('');
  for (const cat of result.matching_categories) {
    lines.push(`## ${cat.name}`);
    lines.push(cat.description);
    lines.push(`Match Reason: ${cat.match_reason}`);
    if (cat.sample_cards.length > 0) {
      lines.push(`Sample Cards: ${cat.sample_cards.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function formatGetFormatStaples(result: FormatStaplesResult): string {
  const lines: string[] = [];

  const title = result.archetype_filter
    ? `# ${capitalize(result.format)} Staples — ${result.archetype_filter}`
    : `# ${capitalize(result.format)} Staples`;
  lines.push(title);

  if (result.format_info) {
    lines.push(`${result.format_info.description}`);
    lines.push(`Power Level: ${result.format_info.power_level}/10`);
  }

  if (result.staple_cards.length > 0) {
    lines.push(`\n## Key Cards (${result.staple_cards.length})`);
    lines.push(result.staple_cards.map(c => `- ${c}`).join('\n'));
  }

  if (result.archetypes.length > 0) {
    lines.push('\n## Archetypes');
    for (const arch of result.archetypes) {
      lines.push(`\n### ${arch.name}`);
      if (arch.example_cards.length > 0) {
        lines.push(arch.example_cards.map(c => `- ${c}`).join('\n'));
      }
    }
  }

  return lines.join('\n');
}

// --- Helpers ---

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
