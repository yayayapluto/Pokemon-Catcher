import { buildPokemon, catchPokemon } from '../src/functions.ts';
import type { Rng } from '../src/utils/random.ts';
import type { Species } from '../src/types.ts';

// mulberry32: cepat, deterministik, selalu di [0, 1).
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSpecies(overrides: Partial<Species> = {}): Species {
  return {
    speciesId: 1,
    name: 'testmon',
    types: ['normal'],
    baseStats: { hp: 50, attack: 50, defense: 50, speed: 50 },
    captureRate: 45,
    ...overrides,
  };
}

export function seedCollection(count: number): void {
  for (let index = 0; index < count; index += 1) {
    const species = makeSpecies({ speciesId: index + 1, name: `mon${index + 1}` });
    catchPokemon(buildPokemon(species, 5));
  }
}
