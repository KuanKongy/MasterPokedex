
export interface Location {
  id: number;
  name: string;
  region: string;
  description: string;
  coordinates: [number, number]; // [latitude, longitude]
  weather: string[];
  pokemonEncounters: PokemonEncounter[];
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
  locations: Location[];
}
