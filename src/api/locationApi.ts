
import { Location, Region } from "../types/location";

// Mock data for locations
const MOCK_LOCATIONS: Location[] = [
  {
    id: 1,
    name: "Viridian Forest",
    region: "Kanto",
    description: "A forest full of bug Pokémon that lies between Viridian City and Pewter City.",
    coordinates: [35.6895, 139.6917],
    weather: ["sunny", "rainy"],
    pokemonEncounters: [
      {
        pokemonId: 10, // Caterpie
        name: "Caterpie",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png",
        rarity: "common",
        encounterRate: 40,
        conditions: ["morning", "day"]
      },
      {
        pokemonId: 13, // Weedle
        name: "Weedle",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/13.png",
        rarity: "common",
        encounterRate: 40,
        conditions: ["morning", "day"]
      },
      {
        pokemonId: 25, // Pikachu
        name: "Pikachu",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
        rarity: "rare",
        encounterRate: 5
      }
    ]
  },
  {
    id: 2,
    name: "Mt. Moon",
    region: "Kanto",
    description: "A mountain that stands between Pewter City and Cerulean City.",
    coordinates: [36.2048, 138.2529],
    weather: ["clear", "foggy"],
    pokemonEncounters: [
      {
        pokemonId: 41, // Zubat
        name: "Zubat",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/41.png",
        rarity: "common",
        encounterRate: 60
      },
      {
        pokemonId: 74, // Geodude
        name: "Geodude",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
        rarity: "common",
        encounterRate: 30
      },
      {
        pokemonId: 35, // Clefairy
        name: "Clefairy",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/35.png",
        rarity: "rare",
        encounterRate: 10,
        conditions: ["night", "full moon"]
      }
    ]
  },
  {
    id: 3,
    name: "Cerulean Cave",
    region: "Kanto",
    description: "A mysterious cave with powerful Pokémon, home to Mewtwo.",
    coordinates: [36.5, 138.5],
    weather: ["foggy"],
    pokemonEncounters: [
      {
        pokemonId: 42, // Golbat
        name: "Golbat",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/42.png",
        rarity: "common",
        encounterRate: 40
      },
      {
        pokemonId: 76, // Golem
        name: "Golem",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/76.png",
        rarity: "rare",
        encounterRate: 10
      },
      {
        pokemonId: 150, // Mewtwo
        name: "Mewtwo",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png",
        rarity: "legendary",
        encounterRate: 0.5,
        conditions: ["one-time", "requires-badges"]
      }
    ]
  },
  {
    id: 4,
    name: "Safari Zone",
    region: "Kanto",
    description: "A special area where rare Pokémon can be caught using Safari Balls.",
    coordinates: [35.4, 139.5],
    weather: ["sunny", "rainy"],
    pokemonEncounters: [
      {
        pokemonId: 111, // Rhyhorn
        name: "Rhyhorn",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/111.png",
        rarity: "uncommon",
        encounterRate: 20
      },
      {
        pokemonId: 123, // Scyther
        name: "Scyther",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/123.png",
        rarity: "rare",
        encounterRate: 5
      },
      {
        pokemonId: 128, // Tauros
        name: "Tauros",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/128.png",
        rarity: "rare",
        encounterRate: 5
      }
    ]
  },
  {
    id: 5,
    name: "Seafoam Islands",
    region: "Kanto",
    description: "A pair of islands between Fuchsia City and Cinnabar Island, home to Articuno.",
    coordinates: [34.6, 140.1],
    weather: ["snowy", "clear"],
    pokemonEncounters: [
      {
        pokemonId: 86, // Seel
        name: "Seel",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/86.png",
        rarity: "uncommon",
        encounterRate: 30
      },
      {
        pokemonId: 87, // Dewgong
        name: "Dewgong",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/87.png",
        rarity: "rare",
        encounterRate: 10
      },
      {
        pokemonId: 144, // Articuno
        name: "Articuno",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/144.png",
        rarity: "legendary",
        encounterRate: 0.5,
        conditions: ["one-time"]
      }
    ]
  }
];

// Mock regions data
const MOCK_REGIONS: Region[] = [
  {
    id: 1,
    name: "Kanto",
    description: "The first region explored in the Pokémon series, based on the real Kantō region of Japan.",
    mainImage: "/images/regions/kanto.jpg",
    locations: MOCK_LOCATIONS.filter(loc => loc.region === "Kanto")
  }
];

// Fetch all locations
export const fetchLocations = async (): Promise<Location[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_LOCATIONS);
    }, 800);
  });
};

// Fetch a specific location by ID
export const fetchLocationById = async (locationId: number): Promise<Location | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const location = MOCK_LOCATIONS.find(loc => loc.id === locationId);
      resolve(location);
    }, 400);
  });
};

// Fetch all regions
export const fetchRegions = async (): Promise<Region[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_REGIONS);
    }, 600);
  });
};

// Fetch a specific region by ID
export const fetchRegionById = async (regionId: number): Promise<Region | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const region = MOCK_REGIONS.find(reg => reg.id === regionId);
      resolve(region);
    }, 400);
  });
};
