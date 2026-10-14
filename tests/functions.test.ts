import { beforeEach, describe, expect, test } from 'bun:test';
import { MAX_LEVEL, MAX_NICKNAME_LENGTH } from '../src/constants.ts';
import { resetData, trainer } from '../src/data.ts';
import {
  applyDamage,
  buildPokemon,
  catchPokemon,
  filterByType,
  gainExp,
  getAll,
  getById,
  getBox,
  getParty,
  getTrainerStats,
  healAll,
  moveToBox,
  moveToParty,
  releasePokemon,
  searchByName,
  setNickname,
  sortBy,
} from '../src/functions.ts';
import { makeSpecies, seedCollection } from './helpers.ts';

beforeEach(resetData);

describe('catchPokemon', () => {
  test('6 pertama masuk party, ke-7 masuk PC box', () => {
    for (let index = 0; index < 7; index += 1) {
      const result = catchPokemon(buildPokemon(makeSpecies({ speciesId: index + 1 }), 5));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.inParty).toBe(index < 6);
    }
    expect(trainer.totalCaught).toBe(7);
    expect(getParty().length).toBe(6);
    expect(getBox().length).toBe(1);
  });

  test('id unik dan tidak dipakai ulang setelah release', () => {
    seedCollection(3);
    const ids = getAll().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(3);
    releasePokemon(2);
    const fresh = catchPokemon(buildPokemon(makeSpecies(), 5));
    expect(fresh.ok).toBe(true);
    if (fresh.ok) expect(ids.includes(fresh.data.id)).toBe(false);
  });
});

describe('releasePokemon', () => {
  test('gagal untuk satu-satunya anggota party', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    const result = releasePokemon(1);
    expect(result.ok).toBe(false);
  });

  test('gagal untuk id yang tidak ada', () => {
    expect(releasePokemon(999).ok).toBe(false);
  });

  test('berhasil untuk anggota box', () => {
    seedCollection(7);
    const box = getBox();
    expect(box.length).toBe(1);
    const target = box[0];
    if (!target) throw new Error('box kosong');
    expect(releasePokemon(target.id).ok).toBe(true);
    expect(getAll().length).toBe(6);
  });
});

describe('party', () => {
  test('moveToParty gagal saat party penuh', () => {
    seedCollection(7);
    const box = getBox()[0];
    if (!box) throw new Error('box kosong');
    expect(moveToParty(box.id).ok).toBe(false);
  });

  test('moveToBox gagal untuk anggota party terakhir', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    expect(moveToBox(1).ok).toBe(false);
  });
});

describe('gainExp', () => {
  test('naik beberapa level sekaligus dengan sisa exp dan stat yang benar', () => {
    catchPokemon(buildPokemon(makeSpecies(), 1));
    const first = getById(1);
    if (!first) throw new Error('tidak ada');
    const before = { maxHp: first.maxHp, attack: first.attack };
    const result = gainExp(1, 60);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.newLevel).toBe(3);
    expect(result.data.levelsGained).toBe(2);
    const after = getById(1);
    if (!after) throw new Error('tidak ada');
    expect(after.exp).toBe(0);
    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    expect(after.attack).toBeGreaterThan(before.attack);
  });

  test('berhenti di MAX_LEVEL', () => {
    catchPokemon(buildPokemon(makeSpecies(), MAX_LEVEL));
    const result = gainExp(1, 1000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ levelsGained: 0, newLevel: MAX_LEVEL });
  });

  test('menolak jumlah tidak valid', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    for (const amount of [0, -5, 1.5, Number.NaN]) {
      expect(gainExp(1, amount).ok).toBe(false);
    }
  });
});

describe('applyDamage dan healAll', () => {
  test('hp tidak di bawah 0 dan melaporkan fainted', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    const result = applyDamage(1, 9999);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hp).toBe(0);
    expect(result.data.fainted).toBe(true);
  });

  test('healAll memulihkan party dan box', () => {
    seedCollection(7);
    for (const entry of getAll()) applyDamage(entry.id, 5);
    const result = healAll();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.healed).toBe(7);
    for (const entry of getAll()) expect(entry.hp).toBe(entry.maxHp);
  });
});

describe('setNickname', () => {
  test('trim dan string kosong mengembalikan null', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    setNickname(1, '  Pika  ');
    expect(getById(1)?.nickname).toBe('Pika');
    setNickname(1, '   ');
    expect(getById(1)?.nickname).toBeNull();
  });

  test('menolak nama lebih dari batas', () => {
    catchPokemon(buildPokemon(makeSpecies(), 5));
    const tooLong = 'a'.repeat(MAX_NICKNAME_LENGTH + 1);
    expect(setNickname(1, tooLong).ok).toBe(false);
  });
});

describe('query', () => {
  test('tidak memutasi koleksi', () => {
    seedCollection(4);
    const before = getAll().map((entry) => entry.id);
    sortBy('level', 'desc');
    searchByName('mon');
    filterByType('normal');
    expect(getAll().map((entry) => entry.id)).toEqual(before);
  });

  test('sortBy dengan key tidak valid mengembalikan getAll', () => {
    seedCollection(3);
    const invalid = 'bogus' as unknown as Parameters<typeof sortBy>[0];
    expect(sortBy(invalid).length).toBe(getAll().length);
  });

  test('searchByName case-insensitive dan keyword kosong', () => {
    catchPokemon(buildPokemon(makeSpecies({ name: 'pikachu' }), 5));
    setNickname(1, 'Sparky');
    expect(searchByName('PIKA').length).toBe(1);
    expect(searchByName('spark').length).toBe(1);
    expect(searchByName('   ').length).toBe(0);
  });

  test('filterByType menyaring sesuai tipe', () => {
    catchPokemon(buildPokemon(makeSpecies({ types: ['fire'] }), 5));
    catchPokemon(buildPokemon(makeSpecies({ types: ['water'] }), 5));
    expect(filterByType('fire').length).toBe(1);
  });
});

describe('getTrainerStats', () => {
  test('koleksi kosong', () => {
    const stats = getTrainerStats();
    expect(stats.winRate).toBe(0);
    expect(stats.mostCommonType).toBeNull();
    expect(stats.highestLevel).toBeNull();
  });

  test('koleksi berisi', () => {
    seedCollection(3);
    const stats = getTrainerStats();
    expect(stats.currentOwned).toBe(3);
    expect(stats.partySize).toBe(3);
    expect(stats.mostCommonType).toBe('normal');
    expect(stats.highestLevel).not.toBeNull();
  });
});

describe('validasi id', () => {
  test('function id menolak nilai bukan integer tanpa melempar', () => {
    for (const id of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getById(id)).toBeUndefined();
      expect(releasePokemon(id).ok).toBe(false);
      expect(moveToParty(id).ok).toBe(false);
      expect(moveToBox(id).ok).toBe(false);
      expect(setNickname(id, 'x').ok).toBe(false);
      expect(gainExp(id, 10).ok).toBe(false);
      expect(applyDamage(id, 10).ok).toBe(false);
    }
  });
});
