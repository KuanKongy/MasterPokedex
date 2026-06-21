
export interface Pokemon {
  id: number;
  name: string;
  types: PokemonType[];
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      }
    }
  };
  stats: PokemonStat[];
  height: number;
  weight: number;
  base_experience: number; // Changed to non-optional since it's being used directly in PokemonFilter
  abilities: PokemonAbility[];
  species: {
    url: string;
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonSpecies {
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  evolution_chain: {
    url: string;
  };
  genera: {
    genus: string;
    language: {
      name: string;
    };
  }[];
  color: {
    name: string;
  };
}

export interface EvolutionChain {
  chain: EvolutionChainLink;
}

export interface EvolutionChainLink {
  species: {
    name: string;
    url: string;
  };
  evolution_details: {
    min_level: number;
    item: { name: string } | null;
    trigger: { name: string };
  }[];
  evolves_to: EvolutionChainLink[];
}

export type PokemonTypeColor = Record<string, string>;
