import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(import.meta.dir, '..', 'src');

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function toPosix(path: string): string {
  return path.split('\\').join('/');
}

const files = collectFiles(SRC).map((file) => ({
  path: file,
  rel: toPosix(relative(SRC, file)),
  content: readFileSync(file, 'utf8'),
}));

function importsOf(content: string): string[] {
  const matches = content.matchAll(/from\s+'([^']+)'/g);
  return [...matches].map((match) => match[1] ?? '');
}

const RULES: Record<string, readonly string[]> = {
  'constants.ts': [],
  'types.ts': ['./constants.ts'],
  'data.ts': ['./constants.ts', './types.ts'],
  'functions.ts': [
    './constants.ts',
    './data.ts',
    './types.ts',
    './functions/collection.ts',
    './functions/party.ts',
    './functions/update.ts',
    './functions/query.ts',
    './functions/stats.ts',
    './functions/pokedex.ts',
  ],
};

describe('arsitektur dependensi', () => {
  test('constants.ts tidak mengimpor apa pun', () => {
    const file = files.find((entry) => entry.rel === 'constants.ts');
    expect(file?.content.includes('import')).toBe(false);
  });

  test('lapisan functions tidak menyentuh ui/services/battle/chalk/inquirer', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('functions'))) {
      for (const target of importsOf(file.content)) {
        expect(target.startsWith('../ui/')).toBe(false);
        expect(target.startsWith('./ui/')).toBe(false);
        expect(target.startsWith('../services/')).toBe(false);
        expect(target.startsWith('../battle/')).toBe(false);
        expect(target).not.toBe('chalk');
        expect(target).not.toBe('@inquirer/prompts');
      }
    }
  });

  test('functions sibling tidak saling import kecuali store.ts', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('functions/'))) {
      if (file.rel === 'functions/store.ts') continue;
      for (const target of importsOf(file.content)) {
        const sibling = target.match(/^\.\/([a-z]+)\.ts$/);
        if (!sibling || !files.some((entry) => entry.rel === `functions/${sibling[1]}.ts`)) {
          continue;
        }
        expect(target).toBe('./store.ts');
      }
    }
  });

  test('barrel tidak mengekspor store.ts', () => {
    const barrel = files.find((entry) => entry.rel === 'functions.ts');
    expect(barrel?.content.includes('store.ts')).toBe(false);
  });

  test('utils tidak mengimpor lapisan lain', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('utils/'))) {
      for (const target of importsOf(file.content)) {
        expect(target.startsWith('../ui/')).toBe(false);
        expect(target.startsWith('../services/')).toBe(false);
        expect(target.startsWith('../battle/')).toBe(false);
        expect(target.startsWith('../functions')).toBe(false);
      }
    }
  });

  test('services tidak mengimpor ui/battle/functions', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('services/'))) {
      for (const target of importsOf(file.content)) {
        expect(target.startsWith('../ui/')).toBe(false);
        expect(target.startsWith('../battle/')).toBe(false);
        expect(target.startsWith('../functions')).toBe(false);
      }
    }
  });

  test('battle tidak mengimpor ui/services/data langsung', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('battle/'))) {
      for (const target of importsOf(file.content)) {
        expect(target.startsWith('../ui/')).toBe(false);
        expect(target.startsWith('../services/')).toBe(false);
        expect(target).not.toBe('../data.ts');
      }
    }
  });

  test('konstanta dasar hanya dipakai lapisan yang diizinkan', () => {
    for (const file of files) {
      const allowed = RULES[file.rel];
      if (!allowed) continue;
      for (const target of importsOf(file.content)) {
        expect(allowed.includes(target)).toBe(true);
      }
    }
  });
});

describe('aturan kode', () => {
  test('tidak ada console di luar ui dan main', () => {
    for (const file of files) {
      if (file.rel.startsWith('ui/') || file.rel === 'main.ts') continue;
      expect(file.content.includes('console.')).toBe(false);
    }
  });

  test('tidak ada default export di src', () => {
    for (const file of files) {
      expect(/export\s+default/.test(file.content)).toBe(false);
    }
  });

  test('tidak ada komentar dekoratif', () => {
    for (const file of files) {
      for (const line of file.content.split('\n')) {
        expect(/^\s*\/\/\s*[-─=]{2,}/.test(line)).toBe(false);
      }
    }
  });

  test('pokemons tidak pernah di-reassign', () => {
    for (const file of files) {
      expect(/(?<!\.)\bpokemons\s*=(?!=)/.test(file.content)).toBe(false);
    }
  });

  test('screens tidak mengimpor inquirer langsung', () => {
    for (const file of files.filter((entry) => entry.rel.startsWith('ui/screens/'))) {
      expect(importsOf(file.content).includes('@inquirer/prompts')).toBe(false);
    }
  });

  test('functions.ts mengekspor lebih dari 15 function', () => {
    const barrelDir = join(SRC, 'functions');
    const names = new Set<string>();
    for (const file of collectFiles(barrelDir)) {
      if (file.endsWith('store.ts')) continue;
      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
        names.add(match[1] ?? '');
      }
    }
    expect(names.size).toBeGreaterThan(15);
  });
});
