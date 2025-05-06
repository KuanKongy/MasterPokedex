
import { Trainer, TrainerItem } from "../types/trainer";

// Mock data for other trainers
export const MOCK_OTHER_TRAINERS: Trainer[] = [
  {
    id: "trainer-002",
    name: "Misty",
    avatar: "https://archives.bulbagarden.net/media/upload/4/4f/Misty_OS_2.png",
    badges: 8,
    pokemonCaught: 142,
    favoriteType: "water",
    region: "Kanto",
    joinDate: "2023-03-15",
    collectedPokemon: [7, 8, 9, 130, 131, 143],
    items: [
      {
        id: 1,
        name: "Poké Ball",
        description: "A device for catching wild Pokémon.",
        category: "pokeball",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
        quantity: 10
      },
      {
        id: 7,
        name: "Water Stone",
        description: "Makes certain species of Pokémon evolve.",
        category: "evolution",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png",
        quantity: 2
      }
    ]
  },
  {
    id: "trainer-003",
    name: "Brock",
    avatar: "https://archives.bulbagarden.net/media/upload/0/01/Brock_Vileplume_EToP.png",
    badges: 7,
    pokemonCaught: 120,
    favoriteType: "grass",
    region: "Kanto",
    joinDate: "2023-05-10",
    collectedPokemon: [1, 2, 3, 43, 44, 45],
    items: [
      {
        id: 1,
        name: "Poké Ball",
        description: "A device for catching wild Pokémon.",
        category: "pokeball",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
        quantity: 12
      },
      {
        id: 11,
        name: "Leaf Stone",
        description: "Makes certain species of Pokémon evolve.",
        category: "evolution",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png",
        quantity: 1
      }
    ]
  },
  {
    id: "trainer-004",
    name: "Oak",
    avatar: "https://archives.bulbagarden.net/media/upload/a/ae/Oak_Stadium.png",
    badges: 8,
    pokemonCaught: 135,
    favoriteType: "fire",
    region: "Johto",
    joinDate: "2023-06-20",
    collectedPokemon: [152, 155, 157, 250],
    items: [
      {
        id: 3,
        name: "Ultra Ball",
        description: "An ultra-high-performance Ball.",
        category: "pokeball",
        sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png",
        quantity: 5
      }
    ]
  }
];

// Valid regions
export const VALID_REGIONS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];

// Fetch all other trainers
export const fetchOtherTrainers = async (): Promise<Trainer[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_OTHER_TRAINERS);
    }, 500);
  });
};

// Fetch a specific trainer by ID
export const fetchTrainerById = async (trainerId: string): Promise<Trainer | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const trainer = MOCK_OTHER_TRAINERS.find(t => t.id === trainerId);
      resolve(trainer);
    }, 300);
  });
};

// Insert a new trainer
type InsertTrainerInput = Omit<Trainer, 'id' | 'joinDate'> & {
  collectedPokemon: number[];
  items: TrainerItem[];
};

export const insertTrainer = async (trainerData: InsertTrainerInput): Promise<Trainer> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Validate region
      if (!VALID_REGIONS.includes(trainerData.region)) {
        reject(new Error(`Invalid region: ${trainerData.region}. Must be one of: ${VALID_REGIONS.join(', ')}`));
        return;
      }

      const newId = `trainer-${Math.floor(1000 + Math.random() * 9000)}`;
      const joinDate = new Date().toISOString();
      
      const newTrainer: Trainer = {
        id: newId,
        joinDate,
        ...trainerData
      };
      
      MOCK_OTHER_TRAINERS.push(newTrainer);
      resolve(newTrainer);
    }, 500);
  });
};

// Delete trainer by ID
export const deleteTrainer = async (trainerId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const trainerIndex = MOCK_OTHER_TRAINERS.findIndex(t => t.id === trainerId);
      
      if (trainerIndex === -1) {
        reject(new Error("Trainer not found"));
        return;
      }
      
      MOCK_OTHER_TRAINERS.splice(trainerIndex, 1);
      resolve();
    }, 300);
  });
};

// Update trainer
export const updateTrainer = async (trainerId: string, updates: Partial<Omit<Trainer, 'id'>>): Promise<Trainer> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const trainerIndex = MOCK_OTHER_TRAINERS.findIndex(t => t.id === trainerId);
      
      if (trainerIndex === -1) {
        reject(new Error("Trainer not found"));
        return;
      }
      
      // Validate region if updating it
      if (updates.region && !VALID_REGIONS.includes(updates.region)) {
        reject(new Error(`Invalid region: ${updates.region}. Must be one of: ${VALID_REGIONS.join(', ')}`));
        return;
      }
      
      // Update trainer
      MOCK_OTHER_TRAINERS[trainerIndex] = {
        ...MOCK_OTHER_TRAINERS[trainerIndex],
        ...updates
      };
      
      resolve(MOCK_OTHER_TRAINERS[trainerIndex]);
    }, 300);
  });
};
