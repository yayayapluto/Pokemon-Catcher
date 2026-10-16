import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SAVE_DIR } from '../src/constants.ts';
import { resetData, trainer } from '../src/data.ts';
import { getAll } from '../src/functions.ts';
import { deleteSlot, describeSlot, loadSlot, saveSlot } from '../src/services/save.ts';
import { seedCollection } from './helpers.ts';

const originalCwd = process.cwd();
let sandbox = '';

function saveFile(slot: number): string {
  return join(sandbox, SAVE_DIR, `slot-${slot}.json`);
}

function writeRaw(slot: number, content: string): void {
  writeFileSync(saveFile(slot), content);
}

function validTrainer(): Record<string, unknown> {
  return { name: 'T', nextId: 1, totalCaught: 0, wins: 0, losses: 0, seenSpecies: [] };
}

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'pokemon-save-'));
  process.chdir(sandbox);
});

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(sandbox, { recursive: true, force: true });
});

beforeEach(() => {
  resetData();
  deleteSlot(1);
  deleteSlot(2);
  deleteSlot(3);
});

describe('saveSlot dan loadSlot', () => {
  test('menyimpan lalu memuat kembali koleksi dan statistik trainer', () => {
    seedCollection(3);
    trainer.totalCaught = 3;
    trainer.wins = 2;
    trainer.losses = 1;

    expect(saveSlot(1)).toBe(true);
    resetData();
    expect(getAll().length).toBe(0);

    expect(loadSlot(1)).toBe(true);
    expect(getAll().length).toBe(3);
    expect(trainer.totalCaught).toBe(3);
    expect(trainer.wins).toBe(2);
    expect(trainer.losses).toBe(1);
  });

  test('memuat slot kosong mengembalikan false dan tidak mengubah state', () => {
    seedCollection(2);
    expect(loadSlot(2)).toBe(false);
    expect(getAll().length).toBe(2);
  });

  test('slot terpisah tidak saling memengaruhi', () => {
    seedCollection(1);
    saveSlot(1);
    resetData();
    seedCollection(4);
    saveSlot(2);

    resetData();
    expect(loadSlot(1)).toBe(true);
    expect(getAll().length).toBe(1);
    expect(loadSlot(2)).toBe(true);
    expect(getAll().length).toBe(4);
  });

  test('describeSlot melaporkan ringkasan slot berisi', () => {
    seedCollection(2);
    saveSlot(1);
    const info = describeSlot(1);
    expect(info.exists).toBe(true);
    expect(info.summary).toContain('2 Pokémon');
    expect(info.summary).toContain('Lv5');
  });
});

describe('tolak data tidak valid', () => {
  test('JSON rusak ditolak dan dilaporkan file rusak', () => {
    writeRaw(1, '{bukan json');
    expect(loadSlot(1)).toBe(false);
    expect(describeSlot(1).summary).toBe('file rusak');
    expect(describeSlot(1).exists).toBe(false);
  });

  test('versi berbeda ditolak', () => {
    writeRaw(1, JSON.stringify({ version: 99, trainer: validTrainer(), pokemons: [] }));
    expect(loadSlot(1)).toBe(false);
    expect(describeSlot(1).summary).toBe('file rusak');
  });

  test('field angka yang salah tipe ditolak', () => {
    const bad = { ...validTrainer(), wins: 'dua' };
    writeRaw(1, JSON.stringify({ version: 1, trainer: bad, pokemons: [] }));
    expect(loadSlot(1)).toBe(false);
  });

  test('type di luar daftar resmi ditolak', () => {
    const pokemon = {
      id: 1,
      speciesId: 1,
      name: 'x',
      nickname: null,
      level: 5,
      exp: 0,
      types: ['tidak-ada'],
      hp: 10,
      maxHp: 10,
      attack: 1,
      defense: 1,
      speed: 1,
      inParty: true,
    };
    writeRaw(1, JSON.stringify({ version: 1, trainer: validTrainer(), pokemons: [pokemon] }));
    expect(loadSlot(1)).toBe(false);
  });

  test('field Pokémon yang hilang ditolak', () => {
    const partial = { id: 1, speciesId: 1, name: 'x', types: ['normal'], inParty: true };
    writeRaw(1, JSON.stringify({ version: 1, trainer: validTrainer(), pokemons: [partial] }));
    expect(loadSlot(1)).toBe(false);
  });

  test('data rusak tidak menghapus koleksi yang sedang aktif', () => {
    seedCollection(2);
    writeRaw(1, '{rusak');
    expect(loadSlot(1)).toBe(false);
    expect(getAll().length).toBe(2);
  });

  test('trainer bukan objek ditolak', () => {
    writeRaw(1, JSON.stringify({ version: 1, trainer: 5, pokemons: [] }));
    expect(loadSlot(1)).toBe(false);
  });

  test('file yang ditulis tetap bisa dibaca ulang setelah format', () => {
    seedCollection(1);
    saveSlot(1);
    const raw: unknown = JSON.parse(readFileSync(saveFile(1), 'utf8'));
    expect(raw).toEqual(expect.objectContaining({ version: 1 }));
  });
});

describe('deleteSlot', () => {
  test('menghapus slot berisi lalu melaporkannya kosong', () => {
    seedCollection(1);
    saveSlot(3);
    expect(describeSlot(3).exists).toBe(true);
    expect(deleteSlot(3)).toBe(true);
    expect(describeSlot(3).summary).toBe('kosong');
  });

  test('menghapus slot kosong mengembalikan false', () => {
    expect(deleteSlot(1)).toBe(false);
  });
});
