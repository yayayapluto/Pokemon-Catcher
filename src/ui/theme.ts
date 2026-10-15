import chalk, { type ChalkInstance } from 'chalk';
import { effectiveness, effectivenessOf, type Effectiveness } from '../battle/damage.ts';
import {
  HP_BAR_BRACKET_WIDTH,
  HP_BAR_DANGER_RATIO,
  HP_BAR_STATUS_WIDTH,
  HP_BAR_WARNING_RATIO,
  HP_DRAIN_STEPS,
  SPINNER_FRAMES,
  TEXT_COLUMN_WIDTH,
  TYPE_COLORS,
  TYPE_EFFECTIVE_LABELS,
} from '../constants.ts';
import { getPrefetchProgress } from '../services/pokeapi.ts';
import type { PokemonType, PokemonView } from '../types.ts';
import { ART, ART_WIDTH, type ArtMoment } from './art.ts';

const typeColors = {
  normal: chalk.hex(TYPE_COLORS.normal),
  fire: chalk.hex(TYPE_COLORS.fire),
  water: chalk.hex(TYPE_COLORS.water),
  electric: chalk.hex(TYPE_COLORS.electric),
  grass: chalk.hex(TYPE_COLORS.grass),
  ice: chalk.hex(TYPE_COLORS.ice),
  fighting: chalk.hex(TYPE_COLORS.fighting),
  poison: chalk.hex(TYPE_COLORS.poison),
  ground: chalk.hex(TYPE_COLORS.ground),
  flying: chalk.hex(TYPE_COLORS.flying),
  psychic: chalk.hex(TYPE_COLORS.psychic),
  bug: chalk.hex(TYPE_COLORS.bug),
  rock: chalk.hex(TYPE_COLORS.rock),
  ghost: chalk.hex(TYPE_COLORS.ghost),
  dragon: chalk.hex(TYPE_COLORS.dragon),
  dark: chalk.hex(TYPE_COLORS.dark),
  steel: chalk.hex(TYPE_COLORS.steel),
  fairy: chalk.hex(TYPE_COLORS.fairy),
} satisfies Record<PokemonType, ChalkInstance>;

const typeGlyphs = {
  normal: '*',
  fire: '^',
  water: '~',
  electric: '!',
  grass: 'v',
  ice: '%',
  fighting: '#',
  poison: '&',
  ground: '_',
  flying: '>',
  psychic: '@',
  bug: ',',
  rock: '.',
  ghost: '?',
  dragon: '$',
  dark: ':',
  steel: '+',
  fairy: '=',
} satisfies Record<PokemonType, string>;

export function typeGlyph(type: PokemonType): string {
  return typeColors[type](typeGlyphs[type]);
}

export function typeBadge(type: PokemonType): string {
  return typeColors[type](`[${type}]`);
}

export function typeGlyphStrip(types: readonly PokemonType[]): string {
  if (types.length === 0) return chalk.gray('-');
  return types.map(typeGlyph).join(' ');
}

export function section(heading: string, body: readonly string[]): string[] {
  const lines: string[] = heading === '' ? [] : [title(heading), ''];
  for (const line of body) lines.push(line);
  return lines;
}

export function panel(heading: string, body: readonly string[]): string[] {
  return section(
    heading,
    body.map((line) => `  ${line}`),
  );
}

export function frames(lines: readonly string[]): string[][] {
  return lines.map((_, index) => lines.slice(0, index + 1));
}

export function displayName(p: PokemonView): string {
  return p.nickname ?? p.name;
}

export function hpBar(hp: number, maxHp: number, width = 20): string {
  const safeMax = maxHp > 0 ? maxHp : 1;
  const ratio = Math.max(0, Math.min(1, hp / safeMax));
  const filled = Math.round(ratio * width);
  const color =
    ratio > HP_BAR_WARNING_RATIO
      ? chalk.green
      : ratio > HP_BAR_DANGER_RATIO
        ? chalk.yellow
        : chalk.red;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(Math.max(0, width - filled)));
}

export function hpBarDrain(
  from: number,
  to: number,
  maxHp: number,
  step: number,
  width = 20,
): string {
  if (step <= 1) return hpBar(from, maxHp, width);
  const progress = Math.min(1, step / HP_DRAIN_STEPS);
  const value = Math.round(from + (to - from) * progress);
  return hpBar(value, maxHp, width);
}

export function hpStatus(hp: number, maxHp: number): string {
  return `${Math.max(0, hp)}/${Math.max(0, maxHp)}`.padEnd(HP_BAR_STATUS_WIDTH);
}

export function formatPokemonLine(p: PokemonView): string {
  const types = p.types.map(typeBadge).join(' ');
  const bar = hpBar(p.hp, p.maxHp, HP_BAR_BRACKET_WIDTH);
  const level = chalk.bold(`Lv${p.level}`);
  const name = chalk.cyan(displayName(p));
  const place = p.inParty ? chalk.green('party') : chalk.magenta('box');
  return `${name.padEnd(TEXT_COLUMN_WIDTH * 5)} ${level.padEnd(TEXT_COLUMN_WIDTH * 3)} ${types} ${hpStatus(p.hp, p.maxHp)} ${bar} ${place}`;
}

export function title(text: string): string {
  return chalk.bold.underline(text);
}

export function dim(text: string): string {
  return chalk.gray(text);
}

export function spinnerFrame(tick: number): string {
  const index = ((tick % SPINNER_FRAMES.length) + SPINNER_FRAMES.length) % SPINNER_FRAMES.length;
  return SPINNER_FRAMES[index] ?? SPINNER_FRAMES[0];
}

export function prefetchStatusLine(tick: number): string | null {
  const progress = getPrefetchProgress();
  if (progress.done) return null;
  const head = chalk.cyan(spinnerFrame(tick));
  return `  ${head} ${chalk.gray(`memuat ${progress.loaded}/${progress.total} spesies...`)}`;
}

export function effectivenessBadge(kind: Effectiveness): string {
  if (kind === 'strong') return chalk.green.bold('×2');
  if (kind === 'weak') return chalk.yellow('×½');
  if (kind === 'immune') return chalk.gray('×0');
  return chalk.gray('×1');
}

export function matchupLine(
  label: string,
  attackerTypes: readonly PokemonType[],
  defenderTypes: readonly PokemonType[],
): string {
  const kind = effectivenessOf(effectiveness(attackerTypes, defenderTypes));
  const text = TYPE_EFFECTIVE_LABELS[kind];
  const colored =
    kind === 'strong' ? chalk.green(text) : kind === 'weak' ? chalk.yellow(text) : chalk.gray(text);
  return `    ${chalk.gray(`${label}:`)} ${effectivenessBadge(kind)} ${colored}`;
}

const ART_COLORS: Record<ArtMoment, ChalkInstance> = {
  win: chalk.green,
  lose: chalk.red,
  caught: chalk.yellow,
  'rare-caught': chalk.magenta,
};

export function artBlock(moment: ArtMoment, caption: string): string[] {
  const color = ART_COLORS[moment];
  const widest = Math.max(...ART[moment].map((line) => line.length));
  const indent = ' '.repeat(Math.floor((ART_WIDTH - widest) / 2));
  const art = ART[moment].map((line) => color(indent + line));
  const head = caption === '' ? [] : [title(caption), ''];
  return [...head, ...art, ''];
}

export function print(...args: unknown[]): void {
  const joined = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ');
  const lines = joined.split('\n');
  while (lines.length > 0 && lines[0] === '') lines.shift();
  console.log(lines.join('\n'));
}
