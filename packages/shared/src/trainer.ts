import { z } from 'zod';
import { PokemonTypeSchema, PokemonSummarySchema } from './pokemon';

/** Lowercase, URL-safe, and stored as `citext` so uniqueness is case-insensitive. */
export const UsernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers and underscores');

export const TRAINER_RANKS = ['rookie', 'trainer', 'ace', 'veteran', 'elite', 'champion'] as const;
export const TrainerRankSchema = z.enum(TRAINER_RANKS);
export type TrainerRank = z.infer<typeof TrainerRankSchema>;

export const TrainerSummarySchema = z.object({
  id: z.string().uuid(),
  username: UsernameSchema,
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  regionId: z.number().int().positive().nullable(),
  regionName: z.string().nullable(),
  rank: TrainerRankSchema,
  badges: z.number().int().nonnegative(),
  favoriteType: PokemonTypeSchema.nullable(),
  caughtCount: z.number().int().nonnegative(),
  isGuest: z.boolean(),
});
export type TrainerSummary = z.infer<typeof TrainerSummarySchema>;

export const TrainerProfileSchema = TrainerSummarySchema.extend({
  bio: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
  teamCount: z.number().int().nonnegative(),
  uniqueSpeciesCount: z.number().int().nonnegative(),
  shinyCount: z.number().int().nonnegative(),
  /** Present only when the viewer is authenticated and is not this trainer. */
  friendshipStatus: z.enum(['none', 'pending_outgoing', 'pending_incoming', 'accepted', 'blocked']).optional(),
});
export type TrainerProfile = z.infer<typeof TrainerProfileSchema>;

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  regionId: z.number().int().positive().nullable().optional(),
  favoriteTypeId: z.number().int().positive().nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const ClaimUsernameInputSchema = z.object({
  username: UsernameSchema,
  displayName: z.string().min(1).max(40),
});
export type ClaimUsernameInput = z.infer<typeof ClaimUsernameInputSchema>;

/**
 * Team categories carry the capacity that the reference schema kept in
 * `Collection2.collection_size` and enforced with the `check_team_size` trigger.
 */
export const TEAM_CATEGORIES = ['party', 'box', 'showcase'] as const;
export const TeamCategorySchema = z.enum(TEAM_CATEGORIES);
export type TeamCategory = z.infer<typeof TeamCategorySchema>;

export const TEAM_CAPACITY: Record<TeamCategory, number> = {
  party: 6,
  box: 30,
  showcase: 12,
};

export const CaughtPokemonSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  pokemonId: z.number().int().positive(),
  nickname: z.string().nullable(),
  level: z.number().int().min(1).max(100),
  experience: z.number().int().nonnegative(),
  isShiny: z.boolean(),
  gender: z.enum(['male', 'female', 'genderless']).nullable(),
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  caughtAt: z.string().datetime(),
  caughtLocationAreaId: z.number().int().positive().nullable(),
  caughtLocationName: z.string().nullable(),
  notes: z.string().nullable(),
  /** Denormalised dex data so a team renders without an N+1 round trip. */
  pokemon: PokemonSummarySchema,
});
export type CaughtPokemon = z.infer<typeof CaughtPokemonSchema>;

export const TeamSchema = z.object({
  id: z.string().uuid(),
  trainerId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: TeamCategorySchema,
  capacity: z.number().int().positive(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  members: z.array(CaughtPokemonSchema),
});
export type Team = z.infer<typeof TeamSchema>;

export const CreateTeamInputSchema = z.object({
  name: z.string().min(1).max(40),
  description: z.string().max(300).nullable().optional(),
  category: TeamCategorySchema.default('box'),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInputSchema>;

export const UpdateTeamInputSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  description: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamInputSchema>;

/**
 * `level` is intentionally absent: it is derived from `experience` and the
 * species' growth rate by a database trigger reading `dex.experience`, which
 * replaces the reference schema's hand-rolled PL/SQL cube-root formula.
 */
export const CatchPokemonInputSchema = z.object({
  pokemonId: z.number().int().positive(),
  nickname: z.string().min(1).max(24).nullable().optional(),
  experience: z.number().int().nonnegative().default(0),
  isShiny: z.boolean().default(false),
  gender: z.enum(['male', 'female', 'genderless']).nullable().optional(),
  caughtLocationAreaId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
});
export type CatchPokemonInput = z.infer<typeof CatchPokemonInputSchema>;

export const UpdateCaughtPokemonInputSchema = z.object({
  nickname: z.string().min(1).max(24).nullable().optional(),
  experience: z.number().int().nonnegative().optional(),
  teamId: z.string().uuid().optional(),
  notes: z.string().max(300).nullable().optional(),
});
export type UpdateCaughtPokemonInput = z.infer<typeof UpdateCaughtPokemonInputSchema>;

export const ItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  category: z.string(),
  effect: z.string().nullable(),
  sprite: z.string().url().nullable(),
  cost: z.number().int().nullable(),
});
export type Item = z.infer<typeof ItemSchema>;

export const TrainerItemSchema = ItemSchema.extend({
  quantity: z.number().int().nonnegative(),
});
export type TrainerItem = z.infer<typeof TrainerItemSchema>;

export const AdjustItemInputSchema = z
  .object({
    quantity: z.number().int().nonnegative().optional(),
    delta: z.number().int().optional(),
  })
  .refine((v) => (v.quantity === undefined) !== (v.delta === undefined), {
    message: 'Provide exactly one of `quantity` (absolute) or `delta` (relative)',
  });
export type AdjustItemInput = z.infer<typeof AdjustItemInputSchema>;

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'blocked'] as const;
export const FriendshipStatusSchema = z.enum(FRIENDSHIP_STATUSES);
export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>;

export const FriendshipSchema = z.object({
  id: z.string().uuid(),
  status: FriendshipStatusSchema,
  direction: z.enum(['incoming', 'outgoing']),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  trainer: TrainerSummarySchema,
});
export type Friendship = z.infer<typeof FriendshipSchema>;

export const RespondToFriendInputSchema = z.object({
  status: z.enum(['accepted', 'blocked']),
});
export type RespondToFriendInput = z.infer<typeof RespondToFriendInputSchema>;

export const ACTIVITY_KINDS = ['caught', 'team_created', 'friend_added', 'badge_earned', 'shiny_caught'] as const;
export const ActivityKindSchema = z.enum(ACTIVITY_KINDS);
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  kind: ActivityKindSchema,
  createdAt: z.string().datetime(),
  trainer: TrainerSummarySchema,
  payload: z.record(z.unknown()),
});
export type Activity = z.infer<typeof ActivitySchema>;
