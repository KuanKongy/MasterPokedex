
export interface Trainer {
  id: string;
  name: string;
  avatar: string;
  badges: number;
  pokemonCaught: number;
  favoriteType: string;
  region: string;
  joinDate: string;
  collectedPokemon: number[];
  items: TrainerItem[];
  collections?: TrainerCollection[];
}

export interface TrainerItem {
  id: number;
  name: string;
  description: string;
  category: ItemCategory;
  sprite: string;
  quantity: number;
}

export type ItemCategory = 
  | "pokeball" 
  | "medicine" 
  | "berry" 
  | "battle" 
  | "evolution" 
  | "machine" 
  | "key";

export interface TrainerCollection {
  id: string;
  name: string;
  trainers: string[];
  description: string;
}
