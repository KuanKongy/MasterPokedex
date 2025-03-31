
import { Trainer } from "../types/trainer";

// Mock data for other trainers
export const MOCK_OTHER_TRAINERS: Trainer[] = [
  {
    id: "trainer-002",
    name: "Blue",
    avatar: "/images/trainer-blue.png",
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
    name: "Leaf",
    avatar: "/images/trainer-leaf.png",
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
    name: "Gold",
    avatar: "/images/trainer-gold.png",
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
