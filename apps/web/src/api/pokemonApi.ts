
import { Pokemon, PokemonSpecies, EvolutionChain } from '../types/pokemon';

// Base URL for the PokeAPI
const API_BASE_URL = 'https://pokeapi.co/api/v2';

// Number of Pokemon to fetch
const POKEMON_LIMIT = 151; // Gen 1 Pokemon (can be expanded later)

// Fetch a list of all Pokemon with basic info
export const fetchPokemonList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pokemon?limit=${POKEMON_LIMIT}`);
    const data = await response.json();
    
    // Fetch details for each Pokemon in parallel
    const pokemonPromises = data.results.map((pokemon: { name: string, url: string }) =>
      fetchPokemonDetails(pokemon.name)
    );
    
    const pokemonList = await Promise.all(pokemonPromises);
    return pokemonList;
  } catch (error) {
    console.error('Error fetching Pokemon list:', error);
    throw error;
  }
};

// Fetch detailed information about a specific Pokemon
export const fetchPokemonDetails = async (nameOrId: string | number): Promise<Pokemon> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pokemon/${nameOrId.toString().toLowerCase()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Pokemon details for ${nameOrId}:`, error);
    throw error;
  }
};

// Fetch species information (including evolution chain URL)
export const fetchPokemonSpecies = async (nameOrId: string | number): Promise<PokemonSpecies> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pokemon-species/${nameOrId.toString().toLowerCase()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Pokemon species for ${nameOrId}:`, error);
    throw error;
  }
};

// Fetch evolution chain data
export const fetchEvolutionChain = async (url: string): Promise<EvolutionChain> => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching evolution chain at ${url}:`, error);
    throw error;
  }
};
