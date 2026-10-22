// 18 tipe resmi Pokémon.
export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Species {
  speciesId: number;
  name: string;
  types: PokemonType[];
  baseStats: BaseStats;
  captureRate: number;
}

export interface Pokemon {
  id: number;
  speciesId: number;
  name: string;
  nickname: string | null;
  level: number;
  exp: number;
  types: PokemonType[];
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  inParty: boolean;
}

export type NewPokemon = Omit<Pokemon, 'id' | 'inParty'>;

export interface Trainer {
  name: string;
  nextId: number;
  totalCaught: number;
  wins: number;
  losses: number;
  seenSpecies: SeenSpecies[];
}

export interface SeenSpecies {
  speciesId: number;
  name: string;
  types: PokemonType[];
}

export type Result<T = null> =
  | { ok: true; message: string; data: T }
  | { ok: false; message: string };
