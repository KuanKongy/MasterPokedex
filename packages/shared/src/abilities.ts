import { z } from 'zod';
import { SortDirSchema } from './common';
import { PokemonTypeSchema } from './pokemon';

export const AbilitySummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  shortEffect: z.string().nullable(),
  generation: z.number().int().nullable(),
  pokemonCount: z.number().int().nonnegative(),
});
export type AbilitySummary = z.infer<typeof AbilitySummarySchema>;

/** One Pokémon that can have the ability. */
export const AbilityPokemonSchema = z.object({
  pokemonId: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  formLabel: z.string().nullable(),
  isDefault: z.boolean(),
  sprite: z.string().nullable(),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  isHidden: z.boolean(),
  slot: z.number().int(),
});
export type AbilityPokemon = z.infer<typeof AbilityPokemonSchema>;

export const AbilityDetailSchema = AbilitySummarySchema.extend({
  pokemon: z.array(AbilityPokemonSchema),
});
export type AbilityDetail = z.infer<typeof AbilityDetailSchema>;

export const AbilityListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
  q: z.string().min(1).max(50).optional(),
  sort: z.enum(['id', 'name']).default('id'),
  dir: SortDirSchema,
});
export type AbilityListQuery = z.infer<typeof AbilityListQuerySchema>;
