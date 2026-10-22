import chalk from 'chalk';
import {
  getBox,
  getById,
  getParty,
  moveToBox,
  moveToParty,
  releasePokemon,
  setNickname,
} from '../../functions.ts';
import type { Pokemon, Result } from '../../types.ts';
import { assertNever } from '../../utils/assert.ts';
import { drawScreen } from '../frame.ts';
import { askConfirm, askText, pause, selectMenu } from '../prompts.ts';
import { displayName, formatPokemonLine, title } from '../theme.ts';

type PartyAction = 'detail' | 'nickname' | 'move' | 'release' | 'back';

function renderList(): string[] {
  const lines: string[] = [title('Tim Aktif'), ''];
  const party = getParty();
  if (party.length === 0) lines.push(chalk.gray('  (kosong)'));
  for (const entry of party) lines.push(`  ${formatPokemonLine(entry)}`);

  lines.push('', title('PC Box'), '');
  const box = getBox();
  if (box.length === 0) lines.push(chalk.gray('  (kosong)'));
  for (const entry of box) lines.push(`  ${formatPokemonLine(entry)}`);
  return lines;
}

function renderDetail(entry: Pokemon): string[] {
  return [
    title(displayName(entry)),
    '',
    `  Nama spesies : ${entry.name}`,
    `  Level        : ${entry.level}`,
    `  EXP          : ${entry.exp}`,
    `  HP           : ${entry.hp}/${entry.maxHp}`,
    `  Attack       : ${entry.attack}`,
    `  Defense      : ${entry.defense}`,
    `  Speed        : ${entry.speed}`,
    `  Lokasi       : ${entry.inParty ? 'Party' : 'PC Box'}`,
  ];
}

function resultLine<TPayload>(result: Result<TPayload>): string {
  return result.ok ? chalk.green(result.message) : chalk.red(result.message);
}

async function handleDetail(entry: Pokemon): Promise<void> {
  const fresh = getById(entry.id) ?? entry;
  drawScreen(renderDetail(fresh));
  await pause();
}

async function handleNickname(entry: Pokemon): Promise<void> {
  drawScreen([...renderList(), '', title('Ganti nickname')]);
  const value = await askText('Nama panggilan baru (kosongkan untuk reset):', entry.nickname ?? '');
  drawScreen([...renderList(), '', resultLine(setNickname(entry.id, value))]);
  await pause();
}

async function handleMove(entry: Pokemon): Promise<void> {
  const result = entry.inParty ? moveToBox(entry.id) : moveToParty(entry.id);
  drawScreen([...renderList(), '', resultLine(result)]);
  await pause();
}

async function handleRelease(entry: Pokemon): Promise<void> {
  drawScreen([...renderList(), '', title('Lepas Pokémon')]);
  if (!(await askConfirm(`Lepas ${displayName(entry)} secara permanen?`))) return;
  const result = releasePokemon(entry.id);
  drawScreen([...renderList(), '', resultLine(result)]);
  await pause();
}

async function handleAction(entry: Pokemon, action: PartyAction): Promise<void> {
  switch (action) {
    case 'detail':
      await handleDetail(entry);
      return;
    case 'nickname':
      await handleNickname(entry);
      return;
    case 'move':
      await handleMove(entry);
      return;
    case 'release':
      await handleRelease(entry);
      return;
    case 'back':
      return;
    default:
      return assertNever(action);
  }
}

async function manageEntry(entry: Pokemon): Promise<void> {
  drawScreen(renderList());
  const action = await selectMenu<PartyAction>(`Aksi untuk ${displayName(entry)}:`, [
    { value: 'detail', name: 'Detail' },
    { value: 'nickname', name: 'Ganti nickname' },
    { value: 'move', name: entry.inParty ? 'Pindah ke PC box' : 'Pindah ke party' },
    { value: 'release', name: 'Lepas' },
    { value: 'back', name: 'Kembali' },
  ]);
  await handleAction(entry, action);
}

export async function runPartyScreen(): Promise<void> {
  let running = true;
  while (running) {
    const all = [...getParty(), ...getBox()];
    if (all.length === 0) {
      drawScreen([...renderList(), '', chalk.gray('Belum ada Pokémon.')]);
      await pause();
      return;
    }
    drawScreen(renderList());
    const choices = [
      ...all.map((entry) => ({
        value: String(entry.id),
        name: `${displayName(entry)} Lv${entry.level} (${entry.inParty ? 'party' : 'box'})`,
      })),
      { value: 'exit', name: 'Kembali ke menu utama' },
    ];
    const picked = await selectMenu('Pilih Pokémon:', choices);
    if (picked === 'exit') {
      running = false;
      continue;
    }
    const entry = getById(Number(picked));
    if (entry) await manageEntry(entry);
  }
}
