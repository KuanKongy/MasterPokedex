/**
 * Data that PokeAPI does not have and never will.
 *
 * PokeAPI models the games' *mechanics* exhaustively but carries no cartography:
 * no coordinates, no region artwork, no location adjacency, no descriptive prose
 * for places. The map page cannot render without it.
 *
 * The region descriptions and map images came from `MOCK_REGIONS` in the web
 * app's old `src/api/regionApi.ts` before that file was deleted.
 *
 * Map pins used to live here too, harvested from the same mocks — but those
 * numbers had been placed against different artwork, which is why every Kanto
 * pin sat in the wrong half of the map. Pins are now derived in bulk by
 * `scripts/fetch-map-pins.mjs` from Bulbapedia's Town Map images; the only ones
 * left by hand are `MANUAL_MAP_PINS` below, for the five regions whose per-
 * location images are screenshots rather than one shared map.
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

/**
 * Image values are RELATIVE paths under the web app's public/ directory
 * (apps/web/public), committed to the repo because the original Bulbagarden
 * archive hotlinks are Cloudflare-blocked for real browsers. The web client
 * resolves them against its base URL; see apps/web/scripts/fetch-static-assets.mjs
 * for each file's provenance.
 */

export const REGION_META: Record<string, RegionMeta> = {
  kanto: {
    displayName: 'Kanto',
    description:
      'The first region introduced in the Pokémon series, home to the original 151 Pokémon.',
    mapImage: 'maps/kanto.webp',
  },
  johto: {
    displayName: 'Johto',
    description:
      'A region west of Kanto, featuring many new Pokémon and the ancient Ruins of Alph.',
    mapImage: 'maps/johto.webp',
  },
  hoenn: {
    displayName: 'Hoenn',
    description: 'A region with diverse environments and many bodies of water.',
    mapImage: 'maps/hoenn.webp',
  },
  sinnoh: {
    displayName: 'Sinnoh',
    description:
      'A mountainous region split by Mt. Coronet, steeped in the mythology of time and space.',
    mapImage: 'maps/sinnoh.webp',
  },
  unova: {
    displayName: 'Unova',
    description: 'A distant region built around a great city, far from the older lands.',
    mapImage: 'maps/unova.webp',
  },
  kalos: {
    displayName: 'Kalos',
    description: 'A star-shaped region known for beauty, fashion, and Mega Evolution.',
    mapImage: 'maps/kalos.webp',
  },
  alola: {
    displayName: 'Alola',
    description: 'A tropical archipelago of four natural islands, home to regional variants.',
    mapImage: 'maps/alola.webp',
  },
  galar: {
    displayName: 'Galar',
    description: 'An industrial region where Pokémon battling is a national sport.',
    mapImage: 'maps/galar.webp',
  },
  hisui: {
    displayName: 'Hisui',
    description: 'Sinnoh as it was in the distant past, long before its towns were built.',
    mapImage: 'maps/hisui.webp',
  },
  paldea: {
    displayName: 'Paldea',
    description: 'An open region encircling a vast crater, explored in any order you like.',
    mapImage: 'maps/paldea.webp',
  },
  // The Gamecube side games. PokeAPI carries its 18 locations and their
  // encounters, so leaving it out of this map left a live tab with no art
  // and no description.
  orre: {
    displayName: 'Orre',
    description: 'A desert region of colosseums and canyons, where wild Pokémon are a rumour.',
    mapImage: 'maps/orre.webp',
  },
};

/**
 * One location's curated layer. Every field is optional because this type is
 * shared with `locations.generated.ts`, which fills the same shape from
 * Bulbapedia; the seed merges the two field by field, curation first.
 */
export type LocationMetaSeed = {
  image?: string | null;
  description?: string | null;
  kind?: string | null;
  /** PokeAPI location identifiers; resolved to ids at seed time. */
  neighbors?: string[];
  /** Gym Leaders, professors and other canon residents worth a chip on the page. */
  notableTrainers?: string[];
  /** Surfaced in the map page's "Notable locations" panel. */
  notable?: boolean;
};

export const LOCATION_META: Record<string, LocationMetaSeed> = {
  'pallet-town': {
    image: 'locations/pallet-town.webp',
    description: 'A small, quiet town where the protagonist begins their journey.',
    kind: 'town',
    neighbors: ['viridian-city', 'cinnabar-island'],
    notableTrainers: ['Professor Oak'],
  },
  'viridian-city': {
    image: 'locations/viridian-city.webp',
    description: 'The first city encountered on your journey. Contains the first Gym.',
    kind: 'city',
    neighbors: ['pallet-town', 'pewter-city', 'viridian-forest'],
    notableTrainers: ['Giovanni'],
  },
  'pewter-city': {
    image: 'locations/pewter-city.webp',
    description:
      'A city located between Viridian Forest and Mt. Moon. Home to the Rock-type Gym Leader Brock.',
    kind: 'city',
    neighbors: ['viridian-city', 'mt-moon', 'cerulean-city'],
    notableTrainers: ['Brock'],
  },
  'new-bark-town': {
    image: 'locations/new-bark-town.webp',
    description: 'A small town where winds of a new beginning blow.',
    kind: 'town',
    neighbors: ['cherrygrove-city'],
    notableTrainers: ['Professor Elm'],
  },
  'littleroot-town': {
    image: 'locations/littleroot-town.webp',
    description: 'A small town with the scent of wild flowers.',
    kind: 'town',
    neighbors: ['oldale-town'],
    notableTrainers: ['Professor Birch'],
  },
  'viridian-forest': {
    image: null,
    description: 'A dense, maze-like forest full of Bug-type Pokémon and inexperienced trainers.',
    kind: 'forest',
    neighbors: ['viridian-city', 'pewter-city'],
  },
  'cerulean-city': {
    image: null,
    description: 'A city of water, home to the Water-type Gym Leader Misty.',
    kind: 'city',
    neighbors: ['pewter-city', 'vermilion-city', 'mt-moon'],
    notableTrainers: ['Misty'],
  },
  'mt-moon': {
    image: null,
    description: 'A cave system said to be the landing site of a meteorite.',
    kind: 'cave',
    neighbors: ['pewter-city', 'cerulean-city'],
  },
  'vermilion-city': {
    image: null,
    description: 'A port city where ships from across the sea make harbour.',
    kind: 'city',
    neighbors: ['cerulean-city', 'lavender-town'],
    notableTrainers: ['Lt. Surge'],
  },
  'lavender-town': {
    image: null,
    description: 'A sombre town best known for the Pokémon Tower.',
    kind: 'town',
    neighbors: ['vermilion-city', 'celadon-city'],
    notableTrainers: ['Mr. Fuji'],
  },
  'celadon-city': {
    image: null,
    description: 'The largest city in Kanto, famous for its department store.',
    kind: 'city',
    neighbors: ['lavender-town', 'saffron-city'],
    notableTrainers: ['Erika'],
  },
  'saffron-city': {
    image: null,
    description: 'A bustling central city and the home of psychic training.',
    kind: 'city',
    neighbors: ['celadon-city', 'lavender-town', 'vermilion-city'],
    notableTrainers: ['Sabrina'],
  },
  'cinnabar-island': {
    image: null,
    description: 'A volcanic island with a Gym, a laboratory, and a long history.',
    kind: 'island',
    neighbors: ['pallet-town'],
    notableTrainers: ['Blaine'],
  },
  'cherrygrove-city': {
    image: null,
    description: 'A seaside city filled with the scent of flowers.',
    kind: 'city',
    neighbors: ['new-bark-town'],
  },
  'oldale-town': {
    image: null,
    description: 'A quiet town that serves as a first stop for new trainers in Hoenn.',
    kind: 'town',
    neighbors: ['littleroot-town'],
  },
};

/**
 * Pins placed by hand, on the five regions `fetch-map-pins.mjs` cannot derive.
 *
 * That script reads Bulbapedia's per-location Town Map images, which for Kanto
 * through Kalos are one shared map with a moving highlight. Alola ships a page
 * per island, Galar and Hisui ship screenshots, Paldea's differ in size — no
 * shared frame, nothing to diff. So these are read off the artwork by eye,
 * limited to the places worth a pin rather than every route and cave.
 *
 * Percentages into the region's map image, like the generated ones.
 */
export const MANUAL_MAP_PINS: Record<string, [number, number]> = {
  // ── Alola: four islands, clockwise from Melemele ──
  'iki-town': [33, 21],
  'hauoli-city': [29, 27],
  'melemele-meadow': [22, 22],
  'ten-carat-hill': [25, 24],
  'heahea-city': [55, 24],
  'paniola-town': [60, 26],
  'royal-avenue': [58, 30],
  'konikoni-city': [55, 33],
  'wela-volcano-park': [64, 23],
  'lush-jungle': [62, 30],
  'aether-paradise': [43, 43],
  'malie-city': [88, 52],
  'mount-hokulani': [84, 58],
  'tapu-village': [93, 57],
  'po-town': [82, 62],
  'mount-lanakila': [86, 50],
  'ulaula-meadow': [90, 62],
  'seafolk-village': [13, 63],
  'poni-wilds': [17, 57],
  'vast-poni-canyon': [11, 55],
  'exeggutor-island': [6, 68],

  // ── Galar: the map runs north (Wyndon) to south (Postwick) ──
  wyndon: [47, 13],
  circhester: [32, 29],
  hammerlocke: [46, 34],
  spikemuth: [66, 34],
  'stow-on-side': [30, 46],
  hulbury: [60, 47],
  motostoke: [39, 53],
  turffield: [36, 63],
  ballonlea: [37, 70],
  'glimwood-tangle': [40, 68],
  wedgehurst: [44, 85],
  postwick: [45, 91],
  'slumbering-weald': [38, 88],
  'galar-mine': [48, 44],
  'lake-of-outrage': [30, 60],

  // ── Hisui: five open areas around Jubilife ──
  'jubilife-village': [32, 50],
  'floaro-gardens': [34, 54],
  'horseshoe-plains': [40, 58],
  'obsidian-falls': [42, 52],
  'hisui-lake-verity': [30, 62],
  'deertrack-heights': [38, 64],
  'aipom-hill': [72, 40],
  'firespit-island': [84, 25],
  'castaway-shore': [78, 45],
  'ginkgo-landing': [70, 44],
  'celestica-ruins': [50, 44],
  'sacred-plaza': [46, 42],
  'temple-of-sinnoh': [42, 30],
  'hisui-snowpoint-temple': [36, 16],
  'avalugges-legacy': [33, 12],
  'bonechill-wastes': [38, 14],
  'scarlet-bog': [58, 62],
  'golden-lowlands': [52, 62],
  'brava-arena': [55, 70],
  'shrouded-ruins': [62, 58],

  // ── Paldea: Mesagoza in the middle, Area Zero in the crater ──
  mesagoza: [48, 54],
  'area-zero': [50, 36],
  'zero-lab': [50, 34],
  'cabo-poco': [50, 88],
  'los-platos': [47, 80],
  cortondo: [30, 72],
  'porto-marinada': [12, 72],
  artazon: [62, 68],
  levincia: [88, 62],
  cascarrafa: [16, 55],
  medali: [70, 50],
  montenevera: [72, 22],
  zapapico: [78, 40],
  'glaseado-mountain': [57, 14],
  'casseroya-lake': [24, 20],
  'asado-desert': [20, 36],
  'uva-academy': [48, 56],
  'poco-path': [48, 84],

  // ── Orre: only the places the region map marks unambiguously ──
  'agate-village': [15, 22],
  'mt-battle': [47, 12],
  'pyrite-town': [46, 39],
  'phenac-city': [19, 54],
  'outskirt-stand': [23, 60],
  'gateon-port': [79, 33],
};
