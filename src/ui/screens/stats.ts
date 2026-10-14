import chalk from 'chalk';
import { getTrainerStats } from '../../functions.ts';
import { drawScreen } from '../frame.ts';
import { pause } from '../prompts.ts';
import { displayName, title, typeBadge } from '../theme.ts';

export async function runStatsScreen(): Promise<void> {
  const stats = getTrainerStats();
  drawScreen([
    title(`Statistik ${stats.name}`),
    '',
    `  Dimiliki        : ${stats.currentOwned} (party ${stats.partySize}, box ${stats.boxSize})`,
    `  Menang          : ${chalk.green(stats.wins)}`,
    `  Kalah           : ${chalk.red(stats.losses)}`,
    `  Win rate        : ${chalk.bold(`${stats.winRate}%`)}`,
    `  Tipe terbanyak  : ${stats.mostCommonType ? typeBadge(stats.mostCommonType) : chalk.gray('-')}`,
    `  Level tertinggi : ${stats.highestLevel ? chalk.cyan(`${displayName(stats.highestLevel)} Lv${stats.highestLevel.level}`) : chalk.gray('-')}`,
  ]);
  await pause();
}
