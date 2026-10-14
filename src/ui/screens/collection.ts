import chalk from 'chalk';
import { POKEMON_TYPES, SORT_KEYS } from '../../constants.ts';
import { filterByType, getAll, searchByName, sortBy } from '../../functions.ts';
import type { PokemonType, PokemonView, SortKey, SortOrder } from '../../types.ts';
import { assertNever } from '../../utils/assert.ts';
import { drawScreen } from '../frame.ts';
import { askText, pause, selectMenu } from '../prompts.ts';
import { formatPokemonLine, title } from '../theme.ts';

type CollectionAction = 'sort' | 'search' | 'filter' | 'all' | 'back';

function renderEntries(titleText: string, entries: readonly PokemonView[]): string[] {
  const lines: string[] = [title(titleText), ''];
  if (entries.length === 0) {
    lines.push(chalk.gray('  Tidak ada Pokémon yang cocok.'));
    return lines;
  }
  for (const entry of entries) lines.push(`  ${formatPokemonLine(entry)}`);
  return lines;
}

async function doSort(): Promise<void> {
  drawScreen([title('Urutkan koleksi')]);
  const key = await selectMenu<SortKey>(
    'Urutkan berdasarkan:',
    SORT_KEYS.map((value) => ({ value, name: value })),
  );
  drawScreen([title(`Urutkan: ${key}`)]);
  const order = await selectMenu<SortOrder>('Arah:', [
    { value: 'asc', name: 'Naik (asc)' },
    { value: 'desc', name: 'Turun (desc)' },
  ]);
  drawScreen(renderEntries(`Urut: ${key} ${order}`, sortBy(key, order)));
  await pause();
}

async function doSearch(): Promise<void> {
  drawScreen([title('Cari nama')]);
  const keyword = await askText('Cari nama:');
  drawScreen(renderEntries(`Hasil pencarian "${keyword}"`, searchByName(keyword)));
  await pause();
}

async function doFilter(): Promise<void> {
  drawScreen([title('Filter tipe')]);
  const type = await selectMenu<PokemonType>(
    'Filter tipe:',
    POKEMON_TYPES.map((value) => ({ value, name: value })),
  );
  drawScreen(renderEntries(`Tipe: ${type}`, filterByType(type)));
  await pause();
}

async function doAll(): Promise<void> {
  drawScreen(renderEntries('Semua koleksi', getAll()));
  await pause();
}

async function handleAction(action: CollectionAction): Promise<void> {
  switch (action) {
    case 'sort':
      await doSort();
      return;
    case 'search':
      await doSearch();
      return;
    case 'filter':
      await doFilter();
      return;
    case 'all':
      await doAll();
      return;
    case 'back':
      return;
    default:
      return assertNever(action);
  }
}

export async function runCollectionScreen(): Promise<void> {
  drawScreen([title('Koleksi')]);
  const action = await selectMenu<CollectionAction>('Pilih aksi:', [
    { value: 'sort', name: 'Urutkan' },
    { value: 'search', name: 'Cari nama' },
    { value: 'filter', name: 'Filter tipe' },
    { value: 'all', name: 'Lihat semua' },
    { value: 'back', name: 'Kembali' },
  ]);
  await handleAction(action);
}
