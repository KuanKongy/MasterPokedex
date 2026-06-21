import { Trainer, TrainerItem, TrainerCollection, PokemonCollection } from "../types/trainer";

// Mock data - In a real app, this would come from a backend
let MOCK_TRAINER: Trainer = {
  id: "trainer-001",
  name: "Ash",
  avatar: "https://archives.bulbagarden.net/media/upload/c/cb/Mezastar_Trainer_Ash.png",
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
  ],
  collections: [
    {
      id: "collection-001",
      name: "Starter Pokémon",
      pokemon: [1, 4, 7],
      description: "My collection of starter Pokémon"
    },
    {
      id: "collection-002",
      name: "Favorites",
      pokemon: [25, 143],
      description: "My favorite Pokémon"
    },
    {
      id: "collection-003",
      name: "Legendaries",
      pokemon: [149],
      description: "Legendary Pokémon I've caught"
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

// Update trainer profile
export const updateTrainerProfile = async (profileData: Partial<Trainer>): Promise<Trainer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        ...profileData
      };
      resolve(MOCK_TRAINER);
    }, 300);
  });
};

// Add Pokémon to personal collection
export const addPokemonToTrainerCollection = async (pokemonId: number): Promise<Trainer> => {
  // In a real app, this would make an API call to update the backend
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!MOCK_TRAINER.collectedPokemon.includes(pokemonId)) {
        MOCK_TRAINER = {
          ...MOCK_TRAINER,
          collectedPokemon: [...MOCK_TRAINER.collectedPokemon, pokemonId],
          pokemonCaught: MOCK_TRAINER.pokemonCaught + 1
        };
      }
      resolve(MOCK_TRAINER);
    }, 300);
  });
};

// Remove Pokémon from personal collection
export const removePokemonFromTrainerCollection = async (pokemonId: number): Promise<Trainer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (MOCK_TRAINER.collectedPokemon.includes(pokemonId)) {
        MOCK_TRAINER = { 
          ...MOCK_TRAINER,
          collectedPokemon: MOCK_TRAINER.collectedPokemon.filter(id => id !== pokemonId),
          pokemonCaught: Math.max(0, MOCK_TRAINER.pokemonCaught - 1)
        };
      }
      resolve(MOCK_TRAINER);
    }, 300);
  });
};

// Update trainer name
export const updateTrainerName = async (newName: string): Promise<Trainer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_TRAINER = { 
        ...MOCK_TRAINER,
        name: newName
      };
      resolve(MOCK_TRAINER);
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
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        items: MOCK_TRAINER.items.map(i => 
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        )
      };
      
      resolve(MOCK_TRAINER.items);
    }, 300);
  });
};

// Remove item from inventory
export const removeItem = async (itemId: number): Promise<TrainerItem[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const itemIndex = MOCK_TRAINER.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        reject(new Error("Item not found"));
        return;
      }
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        items: MOCK_TRAINER.items.filter(i => i.id !== itemId)
      };
      
      resolve(MOCK_TRAINER.items);
    }, 300);
  });
};

// Add item to inventory
export const addItem = async (item: Omit<TrainerItem, 'id'>): Promise<TrainerItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newId = Math.max(...MOCK_TRAINER.items.map(i => i.id)) + 1;
      const newItem = { ...item, id: newId };
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        items: [...MOCK_TRAINER.items, newItem]
      };
      
      resolve(MOCK_TRAINER.items);
    }, 300);
  });
};

// Create a new Pokémon collection
export const createPokemonCollection = async (collection: Omit<PokemonCollection, 'id'>): Promise<PokemonCollection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newId = `collection-${Math.floor(1000 + Math.random() * 9000)}`;
      const newCollection = { ...collection, id: newId };
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        collections: [...(MOCK_TRAINER.collections || []), newCollection]
      };
      
      resolve(MOCK_TRAINER.collections || []);
    }, 300);
  });
};

// Add Pokémon to custom collection
export const addPokemonToCollection = async (collectionId: string, pokemonId: number): Promise<PokemonCollection[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!MOCK_TRAINER.collections) {
        reject(new Error("Collections not found"));
        return;
      }
      
      const collectionIndex = MOCK_TRAINER.collections.findIndex(c => c.id === collectionId);
      if (collectionIndex === -1) {
        reject(new Error("Collection not found"));
        return;
      }
      
      // Check if Pokémon is already in collection
      if (MOCK_TRAINER.collections[collectionIndex].pokemon.includes(pokemonId)) {
        resolve(MOCK_TRAINER.collections);
        return;
      }
      
      // Add Pokémon to collection
      const updatedCollections = [...MOCK_TRAINER.collections];
      updatedCollections[collectionIndex] = {
        ...updatedCollections[collectionIndex],
        pokemon: [...updatedCollections[collectionIndex].pokemon, pokemonId]
      };
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        collections: updatedCollections
      };
      
      resolve(MOCK_TRAINER.collections);
    }, 300);
  });
};

// Remove Pokémon from custom collection
export const removePokemonFromCollection = async (pokemonId: number): Promise<PokemonCollection[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!MOCK_TRAINER.collections) {
        reject(new Error("Collections not found"));
        return;
      }

      // Update all collections that might contain this Pokémon
      const updatedCollections = MOCK_TRAINER.collections.map(collection => ({
        ...collection,
        pokemon: collection.pokemon.filter(id => id !== pokemonId)
      }));
      
      MOCK_TRAINER = {
        ...MOCK_TRAINER,
        collections: updatedCollections,
        collectedPokemon: MOCK_TRAINER.collectedPokemon.filter(id => id !== pokemonId)
      };
      
      resolve(MOCK_TRAINER.collections);
    }, 300);
  });
};

// The functions below are for the old trainer collections system, keeping them for backwards compatibility
// Fetch trainer collections
export const fetchTrainerCollections = async (): Promise<TrainerCollection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]);
    }, 300);
  });
};

// Create a new collection
export const createCollection = async (collection: Omit<TrainerCollection, 'id'>): Promise<TrainerCollection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]);
    }, 300);
  });
};

// Add trainer to collection
export const addTrainerToCollection = async (collectionId: string, trainerId: string): Promise<TrainerCollection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]);
    }, 300);
  });
};

// Remove trainer from collection
export const removeTrainerFromCollection = async (collectionId: string, trainerId: string): Promise<TrainerCollection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]);
    }, 300);
  });
};
