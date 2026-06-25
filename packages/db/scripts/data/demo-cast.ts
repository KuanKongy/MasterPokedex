/**
 * The demo cast. Carries forward the characters the app has always shipped
 * with — Ash and his bag from the old mock `trainerApi`, Misty/Brock/Oak from
 * `otherTrainersApi`, and Abigail/Jas from the reference schema's seed — so a
 * fresh database renders a populated trainer directory before anyone signs up.
 *
 * Ids are fixed v4-shaped UUIDs so reseeding is idempotent: the seeder deletes
 * exactly these trainers and re-inserts them, and nothing else.
 *
 * Species/levels: members carry `experience`; the database trigger derives
 * `level` from the species' growth rate. Items and regions and types are named
 * by their PokeAPI identifiers and resolved to ids at seed time.
 */

import type { TrainerRank, TeamCategory } from '@masterpokedex/shared';

export type DemoMember = {
  pokemonId: number;
  nickname?: string;
  experience: number;
  isShiny?: boolean;
  gender?: 'male' | 'female' | 'genderless';
  notes?: string;
};

export type DemoTeam = {
  name: string;
  category: TeamCategory;
  description?: string;
  members: DemoMember[];
};

export type DemoTrainer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  /** PokeAPI region name, resolved against dex.regions. */
  region: string;
  /** PokeAPI type name, resolved against dex.types. */
  favoriteType: string | null;
  rank: TrainerRank;
  badges: number;
  teams: DemoTeam[];
  /** PokeAPI item name → quantity, resolved against dex.items. */
  items: Record<string, number>;
  /** Favourite species by dex id. */
  favorites: number[];
};

const uuid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

export const DEMO_TRAINERS: DemoTrainer[] = [
  {
    id: uuid(1),
    username: 'ash',
    displayName: 'Ash Ketchum',
    avatarUrl: 'avatars/ash.png',
    bio: 'Pokémon Master in training. Pallet Town, Kanto.',
    region: 'kanto',
    favoriteType: 'electric',
    rank: 'champion',
    badges: 8,
    teams: [
      {
        name: 'Travel Party',
        category: 'party',
        description: 'The team that never leaves my side.',
        members: [
          { pokemonId: 25, nickname: 'Pikachu', experience: 800000, gender: 'male', notes: 'Refuses the Poké Ball.' },
          { pokemonId: 6, nickname: 'Charizard', experience: 900000, gender: 'male' },
          { pokemonId: 143, nickname: 'Snorlax', experience: 600000, gender: 'male', notes: 'Asleep more often than not.' },
          { pokemonId: 149, experience: 700000, gender: 'female' },
          { pokemonId: 1, experience: 120000, gender: 'male' },
          { pokemonId: 7, experience: 110000, gender: 'female' },
        ],
      },
      {
        name: "Oak's Ranch",
        category: 'box',
        description: 'Friends resting at the lab.',
        members: [
          { pokemonId: 12, experience: 150000, gender: 'female' },
          { pokemonId: 18, experience: 320000, gender: 'male' },
          { pokemonId: 99, experience: 280000, gender: 'male' },
          { pokemonId: 89, experience: 260000, gender: 'male' },
          { pokemonId: 128, experience: 340000, gender: 'male' },
          { pokemonId: 214, experience: 300000, gender: 'male' },
          { pokemonId: 164, nickname: 'Noctowl', experience: 210000, isShiny: true, gender: 'male', notes: 'Caught it in Johto — it shimmers.' },
        ],
      },
      {
        name: 'Champions',
        category: 'showcase',
        description: 'League-winning lineup.',
        members: [
          { pokemonId: 6, experience: 950000, gender: 'male' },
          { pokemonId: 25, experience: 820000, gender: 'male' },
          { pokemonId: 658, experience: 880000, gender: 'male' },
        ],
      },
    ],
    items: {
      'poke-ball': 15,
      'great-ball': 5,
      'ultra-ball': 3,
      potion: 10,
      'super-potion': 5,
      'rare-candy': 2,
      'fire-stone': 1,
      bicycle: 1,
    },
    favorites: [25, 149, 6],
  },
  {
    id: uuid(2),
    username: 'misty',
    displayName: 'Misty',
    avatarUrl: 'avatars/misty.png',
    bio: 'Cerulean City Gym Leader. Water-type specialist.',
    region: 'kanto',
    favoriteType: 'water',
    rank: 'elite',
    badges: 8,
    teams: [
      {
        name: 'Cerulean Aces',
        category: 'party',
        members: [
          { pokemonId: 121, nickname: 'Starmie', experience: 500000 },
          { pokemonId: 54, nickname: 'Psyduck', experience: 90000, gender: 'male', notes: 'Comes out on its own.' },
          { pokemonId: 120, experience: 200000 },
          { pokemonId: 130, nickname: 'Gyarados', experience: 640000, isShiny: true, gender: 'male' },
          { pokemonId: 176, experience: 180000, gender: 'female' },
          { pokemonId: 186, experience: 420000, gender: 'male' },
        ],
      },
      {
        name: 'Cerulean Gym',
        category: 'box',
        members: [
          { pokemonId: 118, experience: 80000, gender: 'female' },
          { pokemonId: 119, experience: 160000, gender: 'male' },
          { pokemonId: 116, experience: 70000, gender: 'male' },
          { pokemonId: 131, experience: 380000, gender: 'female' },
          { pokemonId: 8, experience: 140000, gender: 'male' },
          { pokemonId: 9, experience: 460000, gender: 'male' },
        ],
      },
    ],
    items: { 'poke-ball': 10, 'water-stone': 2, 'super-potion': 3 },
    favorites: [131, 121],
  },
  {
    id: uuid(3),
    username: 'brock',
    displayName: 'Brock',
    avatarUrl: 'avatars/brock.png',
    bio: 'Pewter City Gym Leader and aspiring Pokémon breeder.',
    region: 'kanto',
    favoriteType: 'grass',
    rank: 'elite',
    badges: 7,
    teams: [
      {
        name: 'Boulder Badge',
        category: 'party',
        members: [
          { pokemonId: 95, nickname: 'Onix', experience: 520000, gender: 'male' },
          { pokemonId: 74, experience: 100000, gender: 'male' },
          { pokemonId: 45, nickname: 'Vileplume', experience: 440000, gender: 'female' },
          { pokemonId: 2, experience: 170000, gender: 'male' },
          { pokemonId: 44, experience: 130000, gender: 'female' },
          { pokemonId: 169, experience: 360000, gender: 'male' },
        ],
      },
      {
        name: 'Greenhouse',
        category: 'box',
        members: [
          { pokemonId: 43, experience: 40000, gender: 'female' },
          { pokemonId: 1, experience: 60000, gender: 'male' },
          { pokemonId: 3, experience: 500000, gender: 'female' },
          { pokemonId: 208, experience: 540000, gender: 'male' },
          { pokemonId: 185, experience: 220000, gender: 'male' },
        ],
      },
    ],
    items: { 'poke-ball': 12, 'leaf-stone': 1, potion: 6 },
    favorites: [45, 95],
  },
  {
    id: uuid(4),
    username: 'prof_oak',
    displayName: 'Professor Oak',
    avatarUrl: 'avatars/prof-oak.png',
    bio: 'Pokémon researcher. Studies the bonds between people and Pokémon.',
    region: 'johto',
    favoriteType: 'fire',
    rank: 'veteran',
    badges: 8,
    teams: [
      {
        name: 'Field Research',
        category: 'party',
        members: [
          { pokemonId: 152, experience: 30000, gender: 'female' },
          { pokemonId: 155, experience: 32000, gender: 'male' },
          { pokemonId: 157, experience: 480000, gender: 'male' },
          { pokemonId: 250, nickname: 'Ho-Oh', experience: 1000000, gender: 'genderless', notes: 'Observed over Ecruteak. Do not battle.' },
          { pokemonId: 149, experience: 560000, gender: 'male' },
          { pokemonId: 128, experience: 240000, gender: 'male' },
        ],
      },
      {
        name: 'Lab Specimens',
        category: 'box',
        members: [
          { pokemonId: 133, experience: 50000, gender: 'female' },
          { pokemonId: 137, experience: 190000, gender: 'genderless' },
        ],
      },
    ],
    items: { 'ultra-ball': 5, 'rare-candy': 3 },
    favorites: [250],
  },
  {
    id: uuid(5),
    username: 'abigail',
    displayName: 'Abigail',
    avatarUrl: 'avatars/abigail.png',
    bio: 'Just started my journey in Kalos!',
    region: 'kalos',
    favoriteType: 'psychic',
    rank: 'rookie',
    badges: 1,
    teams: [
      {
        name: 'First Steps',
        category: 'party',
        members: [
          { pokemonId: 653, nickname: 'Ember', experience: 22000, gender: 'female' },
          { pokemonId: 661, experience: 9000, gender: 'male' },
          { pokemonId: 280, experience: 12000, gender: 'female' },
        ],
      },
    ],
    items: { 'poke-ball': 8, potion: 4 },
    favorites: [280],
  },
  {
    id: uuid(6),
    username: 'jas',
    displayName: 'Jas',
    avatarUrl: 'avatars/jas.png',
    bio: 'Sinnoh trainer chasing legends.',
    region: 'sinnoh',
    favoriteType: 'dragon',
    rank: 'rookie',
    badges: 2,
    teams: [
      {
        name: 'Sinnoh Squad',
        category: 'party',
        members: [
          { pokemonId: 387, experience: 26000, gender: 'male' },
          { pokemonId: 443, nickname: 'Chompy', experience: 34000, gender: 'female' },
          { pokemonId: 396, experience: 8000, gender: 'male' },
          { pokemonId: 447, experience: 18000, gender: 'male' },
        ],
      },
    ],
    items: { 'poke-ball': 6, 'super-potion': 2 },
    favorites: [443, 487],
  },
];

export type DemoFriendship = {
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
};

/** Usernames, resolved to ids at seed time. Stored requester → addressee. */
export const DEMO_FRIENDSHIPS: DemoFriendship[] = [
  { requester: 'ash', addressee: 'misty', status: 'accepted' },
  { requester: 'ash', addressee: 'brock', status: 'accepted' },
  { requester: 'misty', addressee: 'brock', status: 'accepted' },
  { requester: 'prof_oak', addressee: 'ash', status: 'accepted' },
  { requester: 'jas', addressee: 'ash', status: 'pending' },
  { requester: 'abigail', addressee: 'misty', status: 'pending' },
];
