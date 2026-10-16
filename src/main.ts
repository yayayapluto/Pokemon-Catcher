import chalk from 'chalk';
import { STARTER_SPECIES_IDS, STARTING_LEVEL } from './constants.ts';
import { fallbackSpecies, resetData } from './data.ts';
import { buildPokemon, catchPokemon, getAll, healAll } from './functions.ts';
import type { Species } from './types.ts';
import { assertNever } from './utils/assert.ts';
import { beginScreenSession, drawScreen, endScreenSession } from './ui/frame.ts';
import { askConfirm, isExitPromptError, pause, selectMenu } from './ui/prompts.ts';
import { runCollectionScreen } from './ui/screens/collection.ts';
import { runExploreScreen } from './ui/screens/explore.ts';
import { runPartyScreen } from './ui/screens/party.ts';
import { runPokedexScreen } from './ui/screens/pokedex.ts';
import { runStatsScreen } from './ui/screens/stats.ts';
import { startSpeciesPrefetch } from './services/pokeapi.ts';
import {
  SLOT_IDS,
  deleteSlot,
  describeSlot,
  loadSlot,
  saveSlot,
  type SlotId,
} from './services/save.ts';
import { print, prefetchStatusLine, title } from './ui/theme.ts';

type MainMenu =
  | 'explore'
  | 'party'
  | 'pokedex'
  | 'collection'
  | 'heal'
  | 'stats'
  | 'save'
  | 'reset'
  | 'exit';

function starters(): Species[] {
  return fallbackSpecies.filter((entry) =>
    (STARTER_SPECIES_IDS as readonly number[]).includes(entry.speciesId),
  );
}

function bootBackgroundPrefetch(): void {
  startSpeciesPrefetch();
}

async function chooseStarter(): Promise<void> {
  drawScreen([title('Selamat datang di Pokémon Catcher!')]);
  const options = starters().map((entry) => ({
    value: String(entry.speciesId),
    name: entry.name,
  }));
  const picked = await selectMenu('Pilih Pokémon starter:', options, {
    status: prefetchStatusLine,
  });
  const species = starters().find((entry) => entry.speciesId === Number(picked));
  if (!species) return;
  const result = catchPokemon(buildPokemon(species, STARTING_LEVEL));
  drawScreen([title('Selamat datang di Pokémon Catcher!'), '', chalk.green(result.message)]);
  await pause();
}

async function chooseSlot(): Promise<SlotId> {
  drawScreen([title('Pokémon Catcher')]);
  const options = SLOT_IDS.map((slot) => {
    const info = describeSlot(slot);
    return { value: String(slot), name: `Slot ${slot}`, description: info.summary };
  });
  const picked = await selectMenu('Pilih slot penyimpanan:', options, {
    status: prefetchStatusLine,
  });
  return Number(picked) as SlotId;
}

async function handleHeal(): Promise<void> {
  drawScreen([title('Heal')]);
  const result = healAll();
  drawScreen([title('Heal'), '', chalk.green(result.message)]);
  await pause();
}

async function handleSave(slot: SlotId): Promise<void> {
  const saved = saveSlot(slot);
  const message = saved ? `Progres tersimpan di slot ${slot}.` : 'Gagal menyimpan.';
  const paint = saved ? chalk.green(message) : chalk.red(message);
  drawScreen([title('Simpan'), '', paint]);
  await pause();
}

async function handleReset(slot: SlotId): Promise<void> {
  const confirmed = await askConfirm(`Hapus semua data slot ${slot} dan mulai dari awal?`);
  if (!confirmed) return;
  deleteSlot(slot);
  resetData();
  drawScreen([title('Hapus data'), '', chalk.yellow(`Slot ${slot} dikosongkan.`)]);
  await pause();
}

async function mainMenu(): Promise<MainMenu> {
  drawScreen([title('Menu utama')]);
  return selectMenu<MainMenu>(
    'Pilih menu:',
    [
      { value: 'explore', name: 'Explore', description: 'Cari dan tangkap Pokémon liar' },
      { value: 'party', name: 'Tim & PC Box', description: 'Kelola koleksi Pokémon' },
      { value: 'pokedex', name: 'Pokédex', description: 'Lihat spesies terlihat dan tertangkap' },
      { value: 'collection', name: 'Koleksi', description: 'Urutkan, cari, filter' },
      { value: 'heal', name: 'Heal', description: 'Pulihkan seluruh tim' },
      { value: 'stats', name: 'Statistik', description: 'Lihat statistik trainer' },
      {
        value: 'save',
        name: 'Simpan',
        description: 'Tulis progres sekarang (otomatis saat keluar)',
      },
      { value: 'reset', name: 'Hapus data', description: 'Kosongkan slot ini dan mulai ulang' },
      { value: 'exit', name: 'Keluar' },
    ],
    { status: prefetchStatusLine },
  );
}

async function dispatch(slot: SlotId, choice: MainMenu): Promise<boolean> {
  switch (choice) {
    case 'explore':
      await runExploreScreen();
      return true;
    case 'party':
      await runPartyScreen();
      return true;
    case 'pokedex':
      await runPokedexScreen();
      return true;
    case 'collection':
      await runCollectionScreen();
      return true;
    case 'heal':
      await handleHeal();
      return true;
    case 'stats':
      await runStatsScreen();
      return true;
    case 'save':
      await handleSave(slot);
      return true;
    case 'reset':
      await handleReset(slot);
      return true;
    case 'exit':
      return false;
    default:
      return assertNever(choice);
  }
}

async function runLoop(slot: SlotId): Promise<void> {
  let running = true;
  while (running) {
    running = await dispatch(slot, await mainMenu());
  }
}

async function main(): Promise<void> {
  bootBackgroundPrefetch();
  beginScreenSession();
  let slot: SlotId | null = null;
  try {
    slot = await chooseSlot();
    const hadData = loadSlot(slot);
    if (hadData) {
      drawScreen([title(`Slot ${slot} dimuat`), '', chalk.green(describeSlot(slot).summary)]);
      await pause();
    } else {
      drawScreen([title(`Slot ${slot} baru`), '', chalk.gray('Mulai dari awal.')]);
      await pause();
      await chooseStarter();
    }
    await runLoop(slot);
  } finally {
    if (slot !== null && getAll().length > 0) saveSlot(slot);
    endScreenSession();
  }
  print(chalk.cyan('Sampai jumpa, Trainer!'));
}

try {
  await main();
} catch (error: unknown) {
  endScreenSession();
  if (isExitPromptError(error)) {
    print(chalk.cyan('Sampai jumpa, Trainer!'));
  } else {
    console.error(chalk.red('Terjadi kesalahan tak terduga. Silakan jalankan ulang game.'));
    process.exitCode = 1;
  }
}
