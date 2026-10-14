import { describe, expect, test } from 'bun:test';
import type { Pokemon as ApiPokemon, PokemonSpecies as ApiSpecies } from 'pokenode-ts';
import { fallbackSpecies } from '../src/data.ts';
import {
  getRandomSpecies,
  isPokemonType,
  mapToSpecies,
  type SpeciesSource,
} from '../src/services/pokeapi.ts';
import { createSeededRng } from './helpers.ts';

function makeApiPokemon(overrides: Partial<ApiPokemon> = {}): ApiPokemon {
  return {
    id: 25,
    name: 'pikachu',
    types: [{ slot: 1, type: { name: 'electric', url: '' } }],
    stats: [
      { stat: { name: 'hp', url: '' }, effort: 0, base_stat: 35 },
      { stat: { name: 'attack', url: '' }, effort: 0, base_stat: 55 },
      { stat: { name: 'defense', url: '' }, effort: 0, base_stat: 40 },
      { stat: { name: 'speed', url: '' }, effort: 0, base_stat: 90 },
    ],
    ...overrides,
  } as ApiPokemon;
}

function makeApiSpecies(overrides: Partial<ApiSpecies> = {}): ApiSpecies {
  return { capture_rate: 190, ...overrides } as ApiSpecies;
}

describe('mapToSpecies', () => {
  test('memetakan objek API dengan benar', () => {
    const result = mapToSpecies(makeApiPokemon(), makeApiSpecies());
    expect(result.speciesId).toBe(25);
    expect(result.name).toBe('pikachu');
    expect(result.types).toEqual(['electric']);
    expect(result.baseStats).toEqual({ hp: 35, attack: 55, defense: 40, speed: 90 });
    expect(result.captureRate).toBe(190);
  });

  test('menyaring type yang tidak dikenal', () => {
    const pokemon = makeApiPokemon({
      types: [
        { slot: 1, type: { name: 'unknown-type', url: '' } },
        { slot: 2, type: { name: 'fire', url: '' } },
      ],
    } as Partial<ApiPokemon>);
    const result = mapToSpecies(pokemon, makeApiSpecies());
    expect(result.types).toEqual(['fire']);
  });

  test('melempar error jika type kosong', () => {
    const pokemon = makeApiPokemon({
      types: [{ slot: 1, type: { name: 'unknown-type', url: '' } }],
    } as Partial<ApiPokemon>);
    expect(() => mapToSpecies(pokemon, makeApiSpecies())).toThrow();
  });

  test('melempar error jika stat hilang', () => {
    const pokemon = makeApiPokemon({
      stats: [{ stat: { name: 'hp', url: '' }, effort: 0, base_stat: 35 }],
    } as Partial<ApiPokemon>);
    expect(() => mapToSpecies(pokemon, makeApiSpecies())).toThrow();
  });

  test('melempar error jika capture_rate tidak valid', () => {
    expect(() => mapToSpecies(makeApiPokemon(), makeApiSpecies({ capture_rate: 999 }))).toThrow();
  });
});

describe('isPokemonType', () => {
  test('mengenali type resmi dan menolak lainnya', () => {
    expect(isPokemonType('fire')).toBe(true);
    expect(isPokemonType('bogus')).toBe(false);
  });
});

describe('getRandomSpecies', () => {
  test('jalur normal mengembalikan species dari sumber', async () => {
    const source: SpeciesSource = {
      async fetchSpecies(speciesId) {
        return {
          speciesId,
          name: 'stub',
          types: ['normal'],
          baseStats: { hp: 1, attack: 1, defense: 1, speed: 1 },
          captureRate: 45,
        };
      },
    };
    const result = await getRandomSpecies({ source, rng: createSeededRng(1) });
    expect(result.name).toBe('stub');
  });

  test('jalur gagal mengembalikan fallback', async () => {
    const source: SpeciesSource = {
      fetchSpecies() {
        return Promise.reject(new Error('jaringan mati'));
      },
    };
    const result = await getRandomSpecies({ source, rng: createSeededRng(2) });
    expect(fallbackSpecies.some((entry) => entry.speciesId === result.speciesId)).toBe(true);
  });

  test('jalur timeout mengembalikan fallback dengan cepat', async () => {
    const source: SpeciesSource = {
      fetchSpecies() {
        return new Promise(() => {});
      },
    };
    const result = await getRandomSpecies({ source, rng: createSeededRng(3), timeoutMs: 20 });
    expect(fallbackSpecies.some((entry) => entry.speciesId === result.speciesId)).toBe(true);
  });

  test('tidak pernah menolak', async () => {
    const source: SpeciesSource = {
      fetchSpecies() {
        return Promise.reject(new Error('gagal'));
      },
    };
    await expect(getRandomSpecies({ source, timeoutMs: 20 })).resolves.toBeDefined();
  });
});
