
import { Trainer, TrainerItem } from "../types/trainer";

// Mock data - In a real app, this would come from a backend
const MOCK_TRAINER: Trainer = {
  id: "trainer-001",
  name: "Red",
  avatar: "/images/trainer-red.png",
  badges: 8,
  pokemonCaught: 151,
  favoriteType: "electric",
  region: "Kanto",
  joinDate: "2023-04-01",
  collectedPokemon: [1, 4, 7, 25, 143, 149], // IDs of collected Pokémon
  items: [
    {
      id: 1,
      name: "Poké Ball",
      description: "A device for catching wild Pokémon.",
      category: "pokeball",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
      quantity: 15
    },
    {
      id: 2,
      name: "Great Ball",
      description: "A good, high-performance Ball.",
      category: "pokeball",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png",
      quantity: 5
    },
    {
      id: 3,
      name: "Ultra Ball",
      description: "An ultra-high-performance Ball.",
      category: "pokeball",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png",
      quantity: 3
    },
    {
      id: 4,
      name: "Potion",
      description: "Restores 20 HP of a Pokémon.",
      category: "medicine",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png",
      quantity: 10
    },
    {
      id: 5,
      name: "Super Potion",
      description: "Restores 50 HP of a Pokémon.",
      category: "medicine",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png",
      quantity: 5
    },
    {
      id: 6,
      name: "Rare Candy",
      description: "Raises the level of a Pokémon by one.",
      category: "evolution",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png",
      quantity: 2
    },
    {
      id: 7,
      name: "Fire Stone",
      description: "Makes certain species of Pokémon evolve.",
      category: "evolution",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png",
      quantity: 1
    },
    {
      id: 8,
      name: "TM01",
      description: "Contains the move Mega Punch.",
      category: "machine",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png",
      quantity: 1
    },
    {
      id: 9,
      name: "Bicycle",
      description: "A folding bicycle that enables a faster movement.",
      category: "key",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/bicycle.png",
      quantity: 1
    }
  ]
};

// Fetch trainer profile
export const fetchTrainerProfile = async (): Promise<Trainer> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TRAINER);
    }, 500);
  });
};

// Add Pokémon to collection
export const addPokemonToCollection = async (pokemonId: number): Promise<Trainer> => {
  // In a real app, this would make an API call to update the backend
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedTrainer = { 
        ...MOCK_TRAINER,
        collectedPokemon: [...MOCK_TRAINER.collectedPokemon, pokemonId]
      };
      resolve(updatedTrainer);
    }, 300);
  });
};

// Remove Pokémon from collection
export const removePokemonFromCollection = async (pokemonId: number): Promise<Trainer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedTrainer = { 
        ...MOCK_TRAINER,
        collectedPokemon: MOCK_TRAINER.collectedPokemon.filter(id => id !== pokemonId)
      };
      resolve(updatedTrainer);
    }, 300);
  });
};

// Fetch trainer items
export const fetchTrainerItems = async (): Promise<TrainerItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TRAINER.items);
    }, 400);
  });
};

// Use an item (decrement quantity)
export const useItem = async (itemId: number): Promise<TrainerItem[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const item = MOCK_TRAINER.items.find(item => item.id === itemId);
      if (!item) {
        reject(new Error("Item not found"));
        return;
      }
      
      if (item.quantity <= 0) {
        reject(new Error("Item out of stock"));
        return;
      }
      
      const updatedItems = MOCK_TRAINER.items.map(i => 
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
      
      resolve(updatedItems);
    }, 300);
  });
};
