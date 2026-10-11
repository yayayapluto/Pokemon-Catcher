import type { POKEMON_TYPES, SORT_KEYS } from './constants.ts';

export type PokemonType = (typeof POKEMON_TYPES)[number];
export type SortKey = (typeof SORT_KEYS)[number];
export type SortOrder = 'asc' | 'desc';

export interface BaseStats {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

export interface Species {
  readonly speciesId: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
  readonly baseStats: BaseStats;
  readonly captureRate: number;
}

export interface Pokemon {
  id: number;
  speciesId: number;
  name: string;
  nickname: string | null;
  level: number;
  exp: number;
  types: readonly PokemonType[];
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  inParty: boolean;
}

export type PokemonView = Readonly<Pokemon>;
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
  readonly speciesId: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
}

export interface Failure {
  readonly ok: false;
  readonly message: string;
}

export type Result<T = null> =
  | { readonly ok: true; readonly message: string; readonly data: T }
  | Failure;
