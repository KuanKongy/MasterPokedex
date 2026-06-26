import type { EncounterRarity } from '@masterpokedex/shared';

/** Shared rarity pill styling for encounter tables, light and dark. */
export const RARITY_STYLE: Record<EncounterRarity, string> = {
  common: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  uncommon: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rare: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'very-rare': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  legendary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};
