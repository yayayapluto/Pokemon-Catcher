import { beforeEach, describe, expect, test } from 'bun:test';
import { fallbackSpecies, mergeSpecies, resetData, speciesCatalog, trainer } from '../src/data.ts';
import { getPokedex, getPokedexProgress, recordSpeciesSeen } from '../src/functions.ts';
import { seedCollection } from './helpers.ts';

beforeEach(resetData);

const pikachu = { speciesId: 25, name: 'pikachu', types: ['electric'] as const };

describe('pokedex', () => {
  test('koleksi kosong menghasilkan baris katalog tanpa status terlihat', () => {
    const entries = getPokedex();
    expect(entries.length).toBe(speciesCatalog.size);
    for (const entry of entries) {
      expect(entry.seen).toBe(false);
      expect(entry.caught).toBe(false);
      expect(entry.count).toBe(0);
    }
  });

  test('recordSpeciesSeen menandai terlihat tanpa menandai tertangkap', () => {
    expect(recordSpeciesSeen(pikachu).ok).toBe(true);
    const entry = getPokedex().find((item) => item.speciesId === 25);
    expect(entry?.seen).toBe(true);
    expect(entry?.caught).toBe(false);
  });

  test('recordSpeciesSeen tidak menggandakan spesies yang sama', () => {
    recordSpeciesSeen(pikachu);
    recordSpeciesSeen(pikachu);
    expect(trainer.seenSpecies.length).toBe(1);
  });

  test('recordSpeciesSeen menolak id yang bukan integer positif', () => {
    expect(recordSpeciesSeen({ ...pikachu, speciesId: 1.5 }).ok).toBe(false);
    expect(recordSpeciesSeen({ ...pikachu, speciesId: 0 }).ok).toBe(false);
    expect(recordSpeciesSeen({ ...pikachu, speciesId: -3 }).ok).toBe(false);
  });

  test('spesies yang tertangkap muncul sebagai caught dengan count', () => {
    seedCollection(1);
    const entry = getPokedex().find((item) => item.speciesId === 1);
    expect(entry?.caught).toBe(true);
    expect(entry?.count).toBe(1);
  });

  test('spesies di luar katalog tetap mendapat barisnya sendiri', () => {
    recordSpeciesSeen({ speciesId: 99999, name: 'missingno', types: ['normal'] });
    const entry = getPokedex().find((item) => item.speciesId === 99999);
    expect(entry?.name).toBe('missingno');
    expect(entry?.seen).toBe(true);
  });

  test('mergeSpecies menambahkan spesies katalog ke Pokédex', () => {
    mergeSpecies([
      {
        speciesId: 151,
        name: 'mew',
        types: ['psychic'],
        baseStats: { hp: 100, attack: 100, defense: 100, speed: 100 },
        captureRate: 45,
      },
    ]);
    const entry = getPokedex().find((item) => item.speciesId === 151);
    expect(entry?.name).toBe('mew');
    expect(entry?.seen).toBe(false);
  });

  test('baris diurutkan berdasarkan speciesId', () => {
    mergeSpecies([
      {
        speciesId: 3,
        name: 'venusaur',
        types: ['grass', 'poison'],
        baseStats: { hp: 80, attack: 82, defense: 83, speed: 80 },
        captureRate: 45,
      },
    ]);
    const ids = getPokedex().map((entry) => entry.speciesId);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });

  test('progress memakai MAX_SPECIES_ID sebagai penyebut, bukan jumlah baris', () => {
    seedCollection(1);
    mergeSpecies([
      { ...pikachu, baseStats: { hp: 1, attack: 1, defense: 1, speed: 1 }, captureRate: 1 },
    ]);
    recordSpeciesSeen(pikachu);
    const progress = getPokedexProgress();
    expect(progress.total).toBe(1025);
    expect(progress.seen).toBe(1);
    expect(progress.caught).toBe(1);
  });

  test('resetData mengembalikan katalog dan seenSpecies ke kondisi awal', () => {
    recordSpeciesSeen(pikachu);
    mergeSpecies([
      {
        speciesId: 151,
        name: 'mew',
        types: ['psychic'],
        baseStats: { hp: 100, attack: 100, defense: 100, speed: 100 },
        captureRate: 45,
      },
    ]);
    resetData();
    expect(trainer.seenSpecies.length).toBe(0);
    expect(speciesCatalog.size).toBe(fallbackSpecies.length);
    expect(getPokedex().some((entry) => entry.speciesId === 151)).toBe(false);
  });
});
