import { beforeEach, describe, expect, test } from 'bun:test';
import { resetData, speciesCatalog } from '../src/data.ts';
import {
  getPrefetchProgress,
  getRandomSpecies,
  prefetchSpeciesCatalog,
  resetPrefetchProgress,
  startSpeciesPrefetch,
  type SpeciesSource,
} from '../src/services/pokeapi.ts';
import type { Species } from '../src/types.ts';
import { makeSpecies } from './helpers.ts';

beforeEach(() => {
  resetData();
  resetPrefetchProgress();
});

function fakeSource(reachable: readonly number[], onCall?: () => void): SpeciesSource {
  return {
    async fetchSpecies(speciesId: number): Promise<Species> {
      onCall?.();
      if (!reachable.includes(speciesId)) throw new Error('tidak ada');
      return makeSpecies({ speciesId, name: `mon${speciesId}` });
    },
  };
}

describe('prefetch', () => {
  test('memuat semua id yang bisa dijangkau ke katalog', async () => {
    await prefetchSpeciesCatalog({
      source: fakeSource([1, 2, 3, 4, 5]),
      total: 5,
      concurrency: 2,
    });
    for (const id of [1, 2, 3, 4, 5]) {
      expect(speciesCatalog.get(id)?.speciesId).toBe(id);
    }
  });

  test('id yang gagal dilewati tanpa menggagalkan prefetch', async () => {
    await prefetchSpeciesCatalog({
      source: fakeSource([1, 3, 5]),
      total: 5,
      concurrency: 2,
    });
    expect(speciesCatalog.has(1)).toBe(true);
    expect(speciesCatalog.has(2)).toBe(false);
    expect(speciesCatalog.has(5)).toBe(true);
    expect(getPrefetchProgress().done).toBe(true);
  });

  test('progress melaporkan jumlah termuat dan total', async () => {
    await prefetchSpeciesCatalog({
      source: fakeSource([1, 2, 3]),
      total: 3,
      concurrency: 1,
    });
    const progress = getPrefetchProgress();
    expect(progress.total).toBe(3);
    expect(progress.loaded).toBe(3);
    expect(progress.done).toBe(true);
  });

  test('sumber yang selalu gagal tidak melempar dan menandai selesai', async () => {
    await prefetchSpeciesCatalog({ source: fakeSource([]), total: 4, concurrency: 2 });
    expect(getPrefetchProgress().done).toBe(true);
    expect(speciesCatalog.size).toBeGreaterThan(0);
  });

  test('startSpeciesPrefetch mulai sekali dan tidak memblokir', () => {
    startSpeciesPrefetch({ source: fakeSource([1, 2]), total: 2, concurrency: 1 });
    startSpeciesPrefetch({ source: fakeSource([3, 4]), total: 2, concurrency: 1 });
    expect(getPrefetchProgress().done).toBe(false);
  });

  test('getRandomSpecies tetap memanggil sumber saat disuntik eksplisit', async () => {
    await prefetchSpeciesCatalog({ source: fakeSource([7]), total: 7, concurrency: 1 });
    const requested: number[] = [];
    const result = await getRandomSpecies({
      source: {
        async fetchSpecies(speciesId: number): Promise<Species> {
          requested.push(speciesId);
          return makeSpecies({ speciesId, name: `mon${speciesId}` });
        },
      },
      rng: () => 0.5,
    });
    expect(requested).toEqual([result.speciesId]);
  });
});
