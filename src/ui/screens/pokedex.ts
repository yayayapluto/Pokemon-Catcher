import chalk from 'chalk';
import { POKEDEX_PAGE_SIZE } from '../../constants.ts';
import { getPokedex, getPokedexProgress, type PokedexEntry } from '../../functions.ts';
import { drawScreen } from '../frame.ts';
import { pause } from '../prompts.ts';
import { prefetchStatusLine, title, typeGlyphStrip } from '../theme.ts';

function renderEntry(entry: PokedexEntry): string {
  const number = `#${String(entry.speciesId).padStart(4, '0')}`;
  if (entry.caught) {
    const count = entry.count > 1 ? chalk.gray(` x${entry.count}`) : '';
    const name = chalk.green.bold(entry.name);
    return `  ${chalk.green('✓')} ${number} ${name} ${typeGlyphStrip(entry.types)}${count}`;
  }
  if (entry.seen) {
    const name = chalk.yellow(entry.name);
    return `  ${chalk.yellow('·')} ${number} ${name} ${typeGlyphStrip(entry.types)}`;
  }
  return chalk.gray(`  ? ${number} belum terlihat`);
}

export async function runPokedexScreen(): Promise<void> {
  const entries = getPokedex();
  const progress = getPokedexProgress();
  const shown = entries.slice(0, POKEDEX_PAGE_SIZE);
  const hidden = entries.length - shown.length;
  const loading = prefetchStatusLine(0) ?? '';
  const more = hidden > 0 ? [chalk.gray(`  ... dan ${hidden} entri lain`)] : [];
  drawScreen([
    title('Pokédex'),
    '',
    chalk.gray(
      `Terlihat ${progress.seen}/${progress.total} · Tertangkap ${progress.caught}/${progress.total}`,
    ),
    chalk.gray(`Entri dimuat: ${entries.length}/${progress.total}`) + loading,
    '',
    ...shown.map(renderEntry),
    ...more,
  ]);
  await pause();
}
