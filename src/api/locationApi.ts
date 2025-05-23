
import { Location } from "../types/location";

// Mock data - In a real app, this would come from a backend
const MOCK_LOCATIONS: Record<string, Location[]> = {
  kanto: [
    {
      id: "pallet-town",
      name: "Pallet Town",
      image: "https://archives.bulbagarden.net/media/upload/4/45/Pallet_Town_PE.png",
      description: "A small, quiet town where the protagonist begins their journey.",
      region: "Kanto",
      type: "town",
      trainers: ["Professor Oak", "Blue"],
      pokemon: [16, 19, 21], // Pidgey, Rattata, Spearow
      coordinates: {
        x: 16,
        y: 72
      },
      neighboringLocations: ["viridian-city", "cinnabar-island"],
    },
    {
      id: "viridian-city",
      name: "Viridian City",
      image: "https://archives.bulbagarden.net/media/upload/f/fc/Viridian_City_PE.png",
      description: "The first city encountered on your journey. Contains the first Gym.",
      region: "Kanto",
      type: "city",
      trainers: ["Giovanni"],
      pokemon: [10, 13, 25, 23], // Pidgey, Rattata, Spearow, Ekans
      coordinates: {
        x: 16,
        y: 54
      },
      neighboringLocations: ["pallet-town", "pewter-city", "viridian-forest"],
    },
    {
      id: "pewter-city",
      name: "Pewter City",
      image: "https://archives.bulbagarden.net/media/upload/1/11/Pewter_City_PE.png",
      description: "A city located between Viridian Forest and Mt. Moon. Home to the Rock-type Gym Leader Brock.",
      region: "Kanto",
      type: "city",
      trainers: ["Brock"],
      pokemon: [74, 95], // Geodude, Onix
      coordinates: {
        x: 16,
        y: 37
      },
      neighboringLocations: ["viridian-city", "mt-moon", "cerulean-city"],
    },
  ],
  johto: [
    {
      id: "new-bark-town",
      name: "New Bark Town",
      image: "https://archives.bulbagarden.net/media/upload/d/dd/New_Bark_Town_HGSS.png",
      description: "A small town where winds of a new beginning blow.",
      region: "Johto",
      type: "town",
      trainers: ["Professor Elm"],
      pokemon: [152, 155, 158], // Chikorita, Cyndaquil, Totodile
      coordinates: {
        x: 88,
        y: 52
      },
      neighboringLocations: ["cherrygrove-city"],
    },
    // More locations can be added
  ],
  hoenn: [
    {
      id: "littleroot-town",
      name: "Littleroot Town",
      image: "https://archives.bulbagarden.net/media/upload/a/a3/Littleroot_Town_RS.png",
      description: "A small town with the scent of wild flowers.",
      region: "Hoenn",
      type: "town",
      trainers: ["Professor Birch"],
      pokemon: [252, 255, 258], // Treecko, Torchic, Mudkip
      coordinates: {
        x: 46,
        y: 83
      },
      neighboringLocations: ["oldale-town"],
    },
    // More locations can be added
  ]
};

// Fetch all locations (consolidated from regions)
export const fetchLocations = async (): Promise<Location[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const allLocations = Object.values(MOCK_LOCATIONS).flat();
      resolve(allLocations);
    }, 500);
  });
};

// Fetch locations by region
export const fetchLocationsByRegion = async (region: string): Promise<Location[]> => {
  // Simulate API call
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const locations = MOCK_LOCATIONS[region.toLowerCase()];
      if (locations) {
        resolve(locations);
      } else {
        reject(new Error(`No locations found for region: ${region}`));
      }
    }, 500);
  });
};

// Fetch a specific location by region and id
export const fetchLocationDetail = async (region: string, locationId: string): Promise<Location | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const locations = MOCK_LOCATIONS[region.toLowerCase()];
      const location = locations?.find(loc => loc.id === locationId);
      resolve(location);
    }, 300);
  });
};
