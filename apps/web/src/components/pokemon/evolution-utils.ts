import type { EvolutionNode } from '@masterpokedex/shared';
import { capitalize } from '../../utils/helpers';

/**
 * One human-readable line for how a species evolves — shared between the
 * detail page's chain and the /evolutions index.
 */
export function evolutionCondition(node: Pick<EvolutionNode, 'minLevel' | 'item' | 'minHappiness' | 'trigger'>): string {
  if (node.minLevel) return `Lv. ${node.minLevel}`;
  if (node.item) return capitalize(node.item.replace(/-/g, ' '));
  if (node.minHappiness) return 'Friendship';
  if (node.trigger) return capitalize(node.trigger.replace(/-/g, ' '));
  return 'Evolution';
}
