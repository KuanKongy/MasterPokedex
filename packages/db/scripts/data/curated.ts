/**
 * Data that PokeAPI does not have and never will.
 *
 * PokeAPI models the games' *mechanics* exhaustively but carries no cartography:
 * no coordinates, no region artwork, no location adjacency, no descriptive prose
 * for places. The map page cannot render without it.
 *
 * The `mapX`/`mapY` values below were harvested out of `MOCK_LOCATIONS` in the
 * web app's old `src/api/locationApi.ts` before that file was deleted — they were
 * hand-placed by eye against the region maps and existed nowhere else. Same for
 * the region descriptions and map images, which came from `MOCK_REGIONS` in
 * `src/api/regionApi.ts`.
 *
 * Coordinates are percentages (0-100) into the region's map image, so markers
 * stay correct at any render size. Keys are PokeAPI location identifiers; the
 * seed warns about any that do not resolve rather than failing, so this file can
 * be extended ahead of verifying a slug.
 */

export type RegionMeta = {
  displayName: string;
  description: string;
  mapImage: string | null;
};

const BULBA = 'https://archives.bulbagarden.net/media/upload';

export const REGION_META: Record<string, RegionMeta> = {
  kanto: {
    displayName: 'Kanto',
    description:
      'The first region introduced in the Pokémon series, home to the original 151 Pokémon.',
    mapImage: `${BULBA}/thumb/7/7d/PE_Kanto_Map.png/600px-PE_Kanto_Map.png`,
  },
  johto: {
    displayName: 'Johto',
    description:
      'A region west of Kanto, featuring many new Pokémon and the ancient Ruins of Alph.',
    mapImage: `${BULBA}/thumb/6/64/JohtoMap.png/300px-JohtoMap.png`,
  },
  hoenn: {
    displayName: 'Hoenn',
    description: 'A region with diverse environments and many bodies of water.',
    mapImage: `${BULBA}/thumb/8/85/Hoenn_ORAS.png/300px-Hoenn_ORAS.png`,
  },
  sinnoh: {
    displayName: 'Sinnoh',
    description:
      'A mountainous region split by Mt. Coronet, steeped in the mythology of time and space.',
    mapImage: `${BULBA}/thumb/0/08/Sinnoh_BDSP_artwork.png/300px-Sinnoh_BDSP_artwork.png`,
  },
  unova: {
    displayName: 'Unova',
    description: 'A distant region built around a great city, far from the older lands.',
    mapImage: `${BULBA}/thumb/f/fc/Unova_B2W2_alt.png/300px-Unova_B2W2_alt.png`,
  },
  kalos: {
    displayName: 'Kalos',
    description: 'A star-shaped region known for beauty, fashion, and Mega Evolution.',
    mapImage: `${BULBA}/thumb/8/8a/Kalos_map.png/300px-Kalos_map.png`,
  },
  alola: {
    displayName: 'Alola',
    description: 'A tropical archipelago of four natural islands, home to regional variants.',
    mapImage: `${BULBA}/thumb/0/0b/Alola_USUM_artwork.png/300px-Alola_USUM_artwork.png`,
  },
  galar: {
    displayName: 'Galar',
    description: 'An industrial region where Pokémon battling is a national sport.',
    mapImage: `${BULBA}/thumb/c/ce/Galar_artwork.png/300px-Galar_artwork.png`,
  },
  hisui: {
    displayName: 'Hisui',
    description: 'Sinnoh as it was in the distant past, long before its towns were built.',
    mapImage: null,
  },
  paldea: {
    displayName: 'Paldea',
    description: 'An open region encircling a vast crater, explored in any order you like.',
    mapImage: null,
  },
};

export type LocationMetaSeed = {
  mapX: number | null;
  mapY: number | null;
  image: string | null;
  description: string | null;
  kind: string | null;
  /** PokeAPI location identifiers; resolved to ids at seed time. */
  neighbors: string[];
};

export const LOCATION_META: Record<string, LocationMetaSeed> = {
  'pallet-town': {
    mapX: 16,
    mapY: 72,
    image: `${BULBA}/4/45/Pallet_Town_PE.png`,
    description: 'A small, quiet town where the protagonist begins their journey.',
    kind: 'town',
    neighbors: ['viridian-city', 'cinnabar-island'],
  },
  'viridian-city': {
    mapX: 16,
    mapY: 54,
    image: `${BULBA}/f/fc/Viridian_City_PE.png`,
    description: 'The first city encountered on your journey. Contains the first Gym.',
    kind: 'city',
    neighbors: ['pallet-town', 'pewter-city', 'viridian-forest'],
  },
  'pewter-city': {
    mapX: 16,
    mapY: 37,
    image: `${BULBA}/1/11/Pewter_City_PE.png`,
    description:
      'A city located between Viridian Forest and Mt. Moon. Home to the Rock-type Gym Leader Brock.',
    kind: 'city',
    neighbors: ['viridian-city', 'mt-moon', 'cerulean-city'],
  },
  'new-bark-town': {
    mapX: 88,
    mapY: 52,
    image: `${BULBA}/d/dd/New_Bark_Town_HGSS.png`,
    description: 'A small town where winds of a new beginning blow.',
    kind: 'town',
    neighbors: ['cherrygrove-city'],
  },
  'littleroot-town': {
    mapX: 46,
    mapY: 83,
    image: `${BULBA}/a/a3/Littleroot_Town_RS.png`,
    description: 'A small town with the scent of wild flowers.',
    kind: 'town',
    neighbors: ['oldale-town'],
  },
  'viridian-forest': {
    mapX: 16,
    mapY: 45,
    image: null,
    description: 'A dense, maze-like forest full of Bug-type Pokémon and inexperienced trainers.',
    kind: 'forest',
    neighbors: ['viridian-city', 'pewter-city'],
  },
  'cerulean-city': {
    mapX: 40,
    mapY: 30,
    image: null,
    description: 'A city of water, home to the Water-type Gym Leader Misty.',
    kind: 'city',
    neighbors: ['pewter-city', 'vermilion-city', 'mt-moon'],
  },
  'mt-moon': {
    mapX: 28,
    mapY: 32,
    image: null,
    description: 'A cave system said to be the landing site of a meteorite.',
    kind: 'cave',
    neighbors: ['pewter-city', 'cerulean-city'],
  },
  'vermilion-city': {
    mapX: 40,
    mapY: 55,
    image: null,
    description: 'A port city where ships from across the sea make harbour.',
    kind: 'city',
    neighbors: ['cerulean-city', 'lavender-town'],
  },
  'lavender-town': {
    mapX: 62,
    mapY: 45,
    image: null,
    description: 'A sombre town best known for the Pokémon Tower.',
    kind: 'town',
    neighbors: ['vermilion-city', 'celadon-city'],
  },
  'celadon-city': {
    mapX: 46,
    mapY: 40,
    image: null,
    description: 'The largest city in Kanto, famous for its department store.',
    kind: 'city',
    neighbors: ['lavender-town', 'saffron-city'],
  },
  'saffron-city': {
    mapX: 55,
    mapY: 42,
    image: null,
    description: 'A bustling central city and the home of psychic training.',
    kind: 'city',
    neighbors: ['celadon-city', 'lavender-town', 'vermilion-city'],
  },
  'cinnabar-island': {
    mapX: 16,
    mapY: 90,
    image: null,
    description: 'A volcanic island with a Gym, a laboratory, and a long history.',
    kind: 'island',
    neighbors: ['pallet-town'],
  },
  'cherrygrove-city': {
    mapX: 80,
    mapY: 50,
    image: null,
    description: 'A seaside city filled with the scent of flowers.',
    kind: 'city',
    neighbors: ['new-bark-town'],
  },
  'oldale-town': {
    mapX: 46,
    mapY: 74,
    image: null,
    description: 'A quiet town that serves as a first stop for new trainers in Hoenn.',
    kind: 'town',
    neighbors: ['littleroot-town'],
  },
};
