import type { Pokemon, Species, Trainer } from './types.ts';

export const pokemons: Pokemon[] = [];

export const speciesCatalog = new Map<number, Species>();

export const trainer: Trainer = {
  name: 'Trainer',
  nextId: 1,
  totalCaught: 0,
  wins: 0,
  losses: 0,
  seenSpecies: [],
};

const INITIAL_TRAINER: Trainer = {
  name: 'Trainer',
  nextId: 1,
  totalCaught: 0,
  wins: 0,
  losses: 0,
  seenSpecies: [],
};

export const fallbackSpecies = [
  {
    speciesId: 1,
    name: 'bulbasaur',
    types: ['grass', 'poison'],
    baseStats: { hp: 45, attack: 49, defense: 49, speed: 45 },
    captureRate: 45,
  },
  {
    speciesId: 4,
    name: 'charmander',
    types: ['fire'],
    baseStats: { hp: 39, attack: 52, defense: 43, speed: 65 },
    captureRate: 45,
  },
  {
    speciesId: 7,
    name: 'squirtle',
    types: ['water'],
    baseStats: { hp: 44, attack: 48, defense: 65, speed: 43 },
    captureRate: 45,
  },
  {
    speciesId: 16,
    name: 'pidgey',
    types: ['normal', 'flying'],
    baseStats: { hp: 40, attack: 45, defense: 40, speed: 56 },
    captureRate: 255,
  },
  {
    speciesId: 19,
    name: 'rattata',
    types: ['normal'],
    baseStats: { hp: 30, attack: 56, defense: 35, speed: 72 },
    captureRate: 255,
  },
  {
    speciesId: 25,
    name: 'pikachu',
    types: ['electric'],
    baseStats: { hp: 35, attack: 55, defense: 40, speed: 90 },
    captureRate: 190,
  },
  {
    speciesId: 74,
    name: 'geodude',
    types: ['rock', 'ground'],
    baseStats: { hp: 40, attack: 80, defense: 100, speed: 20 },
    captureRate: 255,
  },
  {
    speciesId: 133,
    name: 'eevee',
    types: ['normal'],
    baseStats: { hp: 55, attack: 55, defense: 50, speed: 55 },
    captureRate: 45,
  },
] as const satisfies readonly Species[];

export function mergeSpecies(entries: readonly Species[]): void {
  for (const entry of entries) {
    speciesCatalog.set(entry.speciesId, entry);
  }
}

export function resetData(): void {
  pokemons.length = 0;
  Object.assign(trainer, INITIAL_TRAINER);
  trainer.seenSpecies = [];
  speciesCatalog.clear();
  mergeSpecies(fallbackSpecies);
}

mergeSpecies(fallbackSpecies);
