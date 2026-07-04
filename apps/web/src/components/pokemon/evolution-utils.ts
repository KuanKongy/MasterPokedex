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

/**
 * Phrases are built as parts so the UI can hang a link on an item's name
 * (`itemSlug` is the dex identifier, valid in /items/:name) while every
 * string consumer keeps getting the joined text, byte for byte.
 */
export type PhrasePart = { text: string; itemSlug?: string };

const textOf = (parts: PhrasePart[]): string => parts.map((p) => p.text).join('');
const plain = (text: string): PhrasePart[] => [{ text }];

/** Items read better in the imperative — "use Water Stone", not "Water Stone". */
function itemParts(item: string): PhrasePart[] {
  return [{ text: 'use ' }, { text: pretty(item), itemSlug: item }];
}

/** A method, plus every other place the same rule applies. */
type MergedMethod = EvolutionMethod & { locations?: (string | null)[] };

/**
 * The clauses that qualify a trigger — time of day, held item, a party member,
 * the weather. Ordered so the sentence reads the way a strategy guide writes it.
 */
function qualifiers(m: MergedMethod): PhrasePart[][] {
  const parts: PhrasePart[][] = [];
  if (m.minHappiness) parts.push(plain('high Friendship'));
  if (m.minAffection) parts.push(plain('high Affection'));
  if (m.minBeauty) parts.push(plain('max Beauty'));
  if (m.knownMoveType) parts.push(plain(`knowing a ${pretty(m.knownMoveType)}-type move`));
  else if (m.knownMove) parts.push(plain(`knowing ${pretty(m.knownMove)}`));
  if (m.heldItem) parts.push([{ text: 'holding ' }, { text: pretty(m.heldItem), itemSlug: m.heldItem }]);
  if (m.timeOfDay) parts.push(plain(`at ${m.timeOfDay}`));
  if (m.gender) parts.push(plain(`${m.gender} only`));
  if (m.nearSpecialRock) {
    // The games put the same rock in several places per generation, so the
    // rows differ only by where. `mergeByLocation` has already gathered them.
    const where = (m.locations ?? [m.location]).filter(Boolean).slice(0, 2).map(pretty);
    parts.push(plain(where.length ? `near the rock in ${where.join(' or ')}` : 'near a special rock'));
  } else if (m.location) parts.push(plain(`at ${pretty(m.location)}`));
  else if (m.region) parts.push(plain(`in ${pretty(m.region)}`));
  if (m.partySpecies) parts.push(plain(`with ${pretty(m.partySpecies)} in the party`));
  if (m.partyType) parts.push(plain(`with a ${pretty(m.partyType)}-type in the party`));
  if (m.relativePhysicalStats === 'attack') parts.push(plain('Attack > Defense'));
  if (m.relativePhysicalStats === 'defense') parts.push(plain('Defense > Attack'));
  if (m.relativePhysicalStats === 'equal') parts.push(plain('Attack = Defense'));
  if (m.needsOverworldRain) parts.push(plain('while it is raining'));
  if (m.turnUpsideDown) parts.push(plain('holding the console upside down'));
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

/** One method as a single readable phrase, in linkable parts. */
export function methodPhraseParts(m: MergedMethod): PhrasePart[] {
  const extras = qualifiers(m);
  const join = (head: PhrasePart[]): PhrasePart[] =>
    extras.reduce((acc, extra) => [...acc, { text: ', ' }, ...extra], head);

  if (m.trigger === 'trade') {
    if (m.tradeSpecies) return join(plain(`trade for ${pretty(m.tradeSpecies)}`));
    return join(plain('trade'));
  }
  if (m.trigger === 'use-item' && m.item) return join(itemParts(m.item));
  if (m.item) return join(itemParts(m.item));
  // Only plain level-ups collapse to a bare "Lv. N"; the strange triggers
  // below keep their own words, or Maushold reads like an ordinary level-up.
  if (m.minLevel && (!m.trigger || m.trigger === 'level-up')) return join(plain(`Lv. ${m.minLevel}`));

  switch (m.trigger) {
    case 'in-battle-level-up':
      return join(plain(m.minLevel ? `Lv. ${m.minLevel}, levelled up in battle` : 'level up in battle'));
    case 'meltan-candies':
      return plain('feed 400 Meltan Candies in Pokémon GO');
    case 'shed':
      return plain('level up with an empty party slot and a Poké Ball');
    case 'spin':
      return plain('spin while holding a Sweet');
    case 'tower-of-darkness':
      return plain('train in the Tower of Darkness');
    case 'tower-of-waters':
      return plain('train in the Tower of Waters');
    case 'three-critical-hits':
      return plain('land three critical hits in one battle');
    case 'take-damage':
      return plain(m.minDamageTaken ? `take ${m.minDamageTaken} damage without fainting` : 'take heavy damage');
    case 'agile-style-move':
      return plain(m.usedMove ? `use ${pretty(m.usedMove)} in Agile Style ${m.minMoveCount ?? 20} times` : 'use Agile Style moves');
    case 'strong-style-move':
      return plain(m.usedMove ? `use ${pretty(m.usedMove)} in Strong Style ${m.minMoveCount ?? 20} times` : 'use Strong Style moves');
    case 'recoil-damage':
      return plain(m.minDamageTaken ? `take ${m.minDamageTaken} recoil damage` : 'take recoil damage');
    case 'use-move':
      return plain(m.usedMove ? `use ${pretty(m.usedMove)} ${m.minMoveCount ?? 20} times` : 'use a specific move repeatedly');
    case 'three-defeated-bisharp':
      return plain('defeat three Bisharp holding a Leader’s Crest');
    case 'gimmighoul-coins':
      return plain('collect 999 Gimmighoul Coins');
    default:
      break;
  }

  if (m.needsMultiplayer) return join(plain('trade'));
  if (m.minLevel) return join(plain(`Lv. ${m.minLevel}`));
  if (m.minSteps) return join(plain(`walk ${m.minSteps} steps`));
  if (extras.length) return join(plain('level up'));
  return plain(m.trigger ? pretty(m.trigger) : 'Evolution');
}

/** The same phrase as plain text; Evolutions.tsx groups and labels on it. */
export function methodPhrase(m: MergedMethod): string {
  return textOf(methodPhraseParts(m));
}

/**
 * Every distinct way to reach this stage, joined, in linkable parts.
 * Duplicates across generations collapse — six Leafeon rows are two
 * sentences, not six.
 */
export function evolutionConditionParts(
  node: Pick<EvolutionNode, 'minLevel' | 'item' | 'minHappiness' | 'trigger' | 'methods'>,
  { limit = 3 }: { limit?: number } = {},
): PhrasePart[] {
  const methods = node.methods ?? [];
  if (methods.length === 0) {
    // Pre-`methods` shape, and species with no evolution row at all.
    if (node.minLevel) return plain(`Lv. ${node.minLevel}`);
    if (node.item) return itemParts(node.item);
    if (node.minHappiness) return plain('high Friendship');
    if (node.trigger) return plain(pretty(node.trigger));
    return plain('Evolution');
  }
  const seen = new Set<string>();
  const phrases: PhrasePart[][] = [];
  for (const merged of mergeByLocation(methods)) {
    const parts = methodPhraseParts(merged);
    const key = textOf(parts);
    if (!seen.has(key)) {
      seen.add(key);
      phrases.push(parts);
    }
  }
  // Three alternatives is already a paragraph in a 110px caption column; the
  // "how to get one" card asks for more room and passes a higher limit.
  const shown = phrases.slice(0, limit);
  const joined = shown.reduce<PhrasePart[]>(
    (acc, parts, index) => (index === 0 ? [...parts] : [...acc, { text: ', or ' }, ...parts]),
    [],
  );
  if (phrases.length > shown.length) joined.push({ text: ', …' });
  return joined;
}

export function evolutionCondition(
  node: Pick<EvolutionNode, 'minLevel' | 'item' | 'minHappiness' | 'trigger' | 'methods'>,
  opts: { limit?: number } = {},
): string {
  return textOf(evolutionConditionParts(node, opts));
}
