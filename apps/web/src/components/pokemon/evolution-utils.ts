import type { EvolutionMethod, EvolutionNode } from '@masterpokedex/shared';
import { capitalize } from '../../utils/helpers';

/**
 * How a species is reached, in words.
 *
 * This used to be first-match-wins over four fields, which is why Espeon read
 * "Friendship" with no mention of daytime, Sylveon fell through to a bare
 * "Level Up", and Leafeon lost the Mossy Rock. The games gate evolution on a
 * dozen different things at once and often on several *alternatives*, so the
 * API now returns every `dex.evolution` row for the species and this builds a
 * phrase per row, then joins the distinct ones with "or".
 */

/**
 * Identifiers are hyphenated and lowercase; these are proper nouns in a
 * sentence. `capitalize` alone gives "Water stone" and "Eterna forest".
 */
const pretty = (value: string) =>
  value
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');

/** Items read better in the imperative — "use Water Stone", not "Water Stone". */
function itemPhrase(item: string): string {
  return `use ${pretty(item)}`;
}

/** A method, plus every other place the same rule applies. */
type MergedMethod = EvolutionMethod & { locations?: (string | null)[] };

/**
 * The clauses that qualify a trigger — time of day, held item, a party member,
 * the weather. Ordered so the sentence reads the way a strategy guide writes it.
 */
function qualifiers(m: MergedMethod): string[] {
  const parts: string[] = [];
  if (m.minHappiness) parts.push('high Friendship');
  if (m.minAffection) parts.push('high Affection');
  if (m.minBeauty) parts.push('max Beauty');
  if (m.knownMoveType) parts.push(`knowing a ${pretty(m.knownMoveType)}-type move`);
  else if (m.knownMove) parts.push(`knowing ${pretty(m.knownMove)}`);
  if (m.heldItem) parts.push(`holding ${pretty(m.heldItem)}`);
  if (m.timeOfDay) parts.push(`at ${m.timeOfDay}`);
  if (m.gender) parts.push(`${m.gender} only`);
  if (m.nearSpecialRock) {
    // The games put the same rock in several places per generation, so the
    // rows differ only by where. `mergeByLocation` has already gathered them.
    const where = (m.locations ?? [m.location]).filter(Boolean).slice(0, 2).map(pretty);
    parts.push(where.length ? `near the rock in ${where.join(' or ')}` : 'near a special rock');
  } else if (m.location) parts.push(`at ${pretty(m.location)}`);
  else if (m.region) parts.push(`in ${pretty(m.region)}`);
  if (m.partySpecies) parts.push(`with ${pretty(m.partySpecies)} in the party`);
  if (m.partyType) parts.push(`with a ${pretty(m.partyType)}-type in the party`);
  if (m.relativePhysicalStats === 'attack') parts.push('Attack > Defense');
  if (m.relativePhysicalStats === 'defense') parts.push('Defense > Attack');
  if (m.relativePhysicalStats === 'equal') parts.push('Attack = Defense');
  if (m.needsOverworldRain) parts.push('while it is raining');
  if (m.turnUpsideDown) parts.push('holding the console upside down');
  return parts;
}

/**
 * Rows that differ only in `location` are one rule the games moved around —
 * Leafeon has four, one per generation's Moss Rock. Merging them keeps the
 * caption a sentence instead of a list.
 */
function mergeByLocation(methods: EvolutionMethod[]): MergedMethod[] {
  const groups = new Map<string, MergedMethod>();
  for (const m of methods) {
    const key = JSON.stringify({ ...m, location: null });
    const existing = groups.get(key);
    if (existing) existing.locations!.push(m.location);
    else groups.set(key, { ...m, locations: [m.location] });
  }
  return [...groups.values()];
}

/** One method as a single readable phrase. */
export function methodPhrase(m: MergedMethod): string {
  const extras = qualifiers(m);
  const join = (head: string) => [head, ...extras].filter(Boolean).join(', ');

  if (m.trigger === 'trade') {
    if (m.tradeSpecies) return join(`trade for ${pretty(m.tradeSpecies)}`);
    return join('trade');
  }
  if (m.trigger === 'use-item' && m.item) return join(itemPhrase(m.item));
  if (m.item) return join(itemPhrase(m.item));
  if (m.minLevel) return join(`Lv. ${m.minLevel}`);

  switch (m.trigger) {
    case 'shed':
      return 'level up with an empty party slot and a Poké Ball';
    case 'spin':
      return 'spin while holding a Sweet';
    case 'tower-of-darkness':
      return 'train in the Tower of Darkness';
    case 'tower-of-waters':
      return 'train in the Tower of Waters';
    case 'three-critical-hits':
      return 'land three critical hits in one battle';
    case 'take-damage':
      return m.minDamageTaken ? `take ${m.minDamageTaken} damage without fainting` : 'take heavy damage';
    case 'agile-style-move':
      return m.usedMove ? `use ${pretty(m.usedMove)} in Agile Style ${m.minMoveCount ?? 20} times` : 'use Agile Style moves';
    case 'strong-style-move':
      return m.usedMove ? `use ${pretty(m.usedMove)} in Strong Style ${m.minMoveCount ?? 20} times` : 'use Strong Style moves';
    case 'recoil-damage':
      return m.minDamageTaken ? `take ${m.minDamageTaken} recoil damage` : 'take recoil damage';
    case 'use-move':
      return m.usedMove ? `use ${pretty(m.usedMove)} ${m.minMoveCount ?? 20} times` : 'use a specific move repeatedly';
    case 'three-defeated-bisharp':
      return 'defeat three Bisharp holding a Leader’s Crest';
    case 'gimmighoul-coins':
      return 'collect 999 Gimmighoul Coins';
    default:
      break;
  }

  if (m.needsMultiplayer) return join('trade');
  if (m.minSteps) return join(`walk ${m.minSteps} steps`);
  if (extras.length) return join('level up');
  return m.trigger ? pretty(m.trigger) : 'Evolution';
}

/**
 * Every distinct way to reach this stage, joined. Duplicates across
 * generations collapse — six Leafeon rows are two sentences, not six.
 */
export function evolutionCondition(
  node: Pick<EvolutionNode, 'minLevel' | 'item' | 'minHappiness' | 'trigger' | 'methods'>,
  { limit = 3 }: { limit?: number } = {},
): string {
  const methods = node.methods ?? [];
  if (methods.length === 0) {
    // Pre-`methods` shape, and species with no evolution row at all.
    if (node.minLevel) return `Lv. ${node.minLevel}`;
    if (node.item) return itemPhrase(node.item);
    if (node.minHappiness) return 'high Friendship';
    if (node.trigger) return pretty(node.trigger);
    return 'Evolution';
  }
  const phrases = [...new Set(mergeByLocation(methods).map(methodPhrase))];
  // Three alternatives is already a paragraph in a 110px caption column; the
  // "how to get one" card asks for more room and passes a higher limit.
  const shown = phrases.slice(0, limit);
  return shown.join(', or ') + (phrases.length > shown.length ? ', …' : '');
}
