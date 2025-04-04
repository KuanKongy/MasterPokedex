
export interface Location {
  id: string;
  name: string;
  image: string;
  description: string;
  region: string;
  type: string;
  trainers: string[];
  pokemon: number[]; // Pokemon IDs
  coordinates: {
    x: number;
    y: number;
  };
  neighboringLocations: string[];
}

export interface PokemonEncounter {
  pokemonId: number;
  name: string;
  sprite: string;
  rarity: "common" | "uncommon" | "rare" | "very-rare" | "legendary";
  encounterRate: number; // percentage
  conditions?: string[]; // e.g., "morning", "fishing", "rain"
}

export interface Region {
  id: number;
  name: string;
  description: string;
  mainImage: string;
  locations: {
    id: string;
    name: string;
    description: string;
    pokemonEncounters: PokemonEncounter[];
  }[];
}
