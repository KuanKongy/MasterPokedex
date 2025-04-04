import { Region } from "../types/location";

// Mock data for regions
const MOCK_REGIONS: Region[] = [
  {
    id: 1,
    name: "Kanto",
    description: "The first region introduced in the Pokémon series, home to the original 151 Pokémon.",
    mainImage: "https://archives.bulbagarden.net/media/upload/thumb/f/f3/LGPE_Kanto_Map.png/300px-LGPE_Kanto_Map.png",
    locations: [
      {
        id: "1", // Changed from number to string
        name: "Pallet Town",
        region: "Kanto",
        description: "A small, quiet town where many trainers begin their Pokémon journey.",
        coordinates: [34.5, 138.2],
        weather: ["sunny"],
        pokemonEncounters: []
      },
      {
        id: "2", // Changed from number to string
        name: "Viridian Forest",
        region: "Kanto",
        description: "A dense forest home to many Bug and Grass type Pokémon.",
        coordinates: [34.7, 138.1],
        weather: ["sunny", "rain"],
        pokemonEncounters: [
          {
            pokemonId: 10,
            name: "Caterpie",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png",
            rarity: "common",
            encounterRate: 40
          },
          {
            pokemonId: 13,
            name: "Weedle",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/13.png",
            rarity: "common",
            encounterRate: 40
          },
          {
            pokemonId: 25,
            name: "Pikachu",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
            rarity: "rare",
            encounterRate: 5
          }
        ]
      }
    ]
  },
  {
    id: 2,
    name: "Johto",
    description: "A region west of Kanto, featuring many new Pokémon and the ancient Ruins of Alph.",
    mainImage: "https://archives.bulbagarden.net/media/upload/thumb/6/64/JohtoMap.png/300px-JohtoMap.png",
    locations: [
      {
        id: "3", // Changed from number to string
        name: "New Bark Town",
        region: "Johto",
        description: "A town where winds of a new beginning blow.",
        coordinates: [33.5, 135.2],
        weather: ["sunny"],
        pokemonEncounters: []
      },
      {
        id: "4", // Changed from number to string
        name: "Ilex Forest",
        region: "Johto",
        description: "A mysterious forest said to be protected by the forest's guardian.",
        coordinates: [33.7, 135.1],
        weather: ["sunny", "rain", "fog"],
        pokemonEncounters: [
          {
            pokemonId: 46,
            name: "Paras",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/46.png",
            rarity: "common",
            encounterRate: 30
          },
          {
            pokemonId: 92,
            name: "Gastly",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/92.png",
            rarity: "uncommon",
            encounterRate: 15,
            conditions: ["night"]
          }
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Hoenn",
    description: "A region with diverse environments and many bodies of water.",
    mainImage: "https://archives.bulbagarden.net/media/upload/thumb/8/85/Hoenn_ORAS.png/300px-Hoenn_ORAS.png",
    locations: [
      {
        id: "5", // Changed from number to string
        name: "Littleroot Town",
        region: "Hoenn",
        description: "A small town with the scent of wild flowers.",
        coordinates: [31.5, 130.2],
        weather: ["sunny"],
        pokemonEncounters: []
      },
      {
        id: "6", // Changed from number to string
        name: "Petalburg Woods",
        region: "Hoenn",
        description: "A lush forest teeming with Bug Pokémon.",
        coordinates: [31.7, 130.1],
        weather: ["sunny", "rain"],
        pokemonEncounters: [
          {
            pokemonId: 265,
            name: "Wurmple",
            sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/265.png",
            rarity: "common",
            encounterRate: 35
          }
        ]
      }
    ]
  }
];

// Fetch all regions
export const fetchRegions = async (): Promise<Region[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_REGIONS);
    }, 500);
  });
};

// Fetch a specific region by ID
export const fetchRegionById = async (regionId: number): Promise<Region | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const region = MOCK_REGIONS.find(r => r.id === regionId);
      resolve(region);
    }, 300);
  });
};
