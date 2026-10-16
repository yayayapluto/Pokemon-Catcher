import chalk from 'chalk';
import { effectiveness, effectivenessOf } from '../../battle/damage.ts';
import {
  createBattle,
  needsSwitch,
  playerAttack,
  playerCatch,
  playerRun,
  rollWildLevel,
  switchActive,
  type BattleEvent,
  type BattleState,
  type BattleStep,
  type Outcome,
} from '../../battle/engine.ts';
import {
  ANIMATION_ENABLED,
  ANIMATION_EVENT_DELAY_MS,
  ANIMATION_HP_TICK_MS,
  HP_DRAIN_STEPS,
} from '../../constants.ts';
import { getAll, getParty, healAll } from '../../functions.ts';
import { getRandomSpecies } from '../../services/pokeapi.ts';
import { assertNever } from '../../utils/assert.ts';
import type { PokemonType, PokemonView } from '../../types.ts';
import { delay } from '../../utils/async.ts';
import { drawScreen } from '../frame.ts';
import { askConfirm, pause, selectMenu } from '../prompts.ts';
import type { ArtMoment } from '../art.ts';
import {
  artBlock,
  displayName,
  effectivenessBadge,
  hpBar,
  hpBarDrain,
  matchupLine,
  panel,
  title,
  typeBadge,
} from '../theme.ts';

type BattleAction = 'attack' | 'catch' | 'switch' | 'run';

function renderEvent(event: BattleEvent): string {
  switch (event.type) {
    case 'attack':
      return event.side === 'player' ? chalk.green(event.message) : chalk.red(event.message);
    case 'faint':
      return chalk.bold.red(event.message);
    case 'exp':
      return chalk.cyan(event.message);
    case 'level-up':
      return chalk.bold.yellow(event.message);
    case 'catch-attempt':
      return event.success ? chalk.green(event.message) : chalk.yellow(event.message);
    case 'caught':
      return chalk.bold.inverse.green(` ${event.message} `);
    case 'run-attempt':
      return event.success ? chalk.green(event.message) : chalk.gray(event.message);
    case 'switch':
      return chalk.magenta(event.message);
    case 'party-wiped':
      return chalk.bold.red(event.message);
    default:
      return assertNever(event);
  }
}

function renderEventList(events: readonly BattleEvent[]): string[] {
  return events.map(renderEvent);
}

function renderCombatant(
  label: string,
  name: string,
  level: number,
  types: string,
  hp: number,
  maxHp: number,
): string[] {
  return [
    `  ${label} ${name} Lv${level} ${types}`,
    `    HP ${Math.max(0, hp)}/${Math.max(0, maxHp)} ${hpBar(hp, maxHp)}`,
  ];
}

interface Scoreboard {
  readonly lines: string[];
  readonly wildBarIndex: number;
}

function renderScoreboard(state: BattleState): Scoreboard {
  const active = getParty().find((entry) => entry.id === state.activeId);
  const lines: string[] = [title('Pertarungan'), ''];
  if (active) {
    lines.push(
      ...renderCombatant(
        'Kamu:',
        displayName(active),
        active.level,
        active.types.map(typeBadge).join(' '),
        active.hp,
        active.maxHp,
      ),
    );
  }
  const wild = state.wild;
  lines.push(
    ...renderCombatant(
      'Liar:',
      wild.name,
      wild.level,
      wild.types.map(typeBadge).join(' '),
      wild.hp,
      wild.maxHp,
    ),
  );
  if (active) {
    lines.push(
      matchupLine('Serangmu', active.types, wild.types),
      matchupLine('Serangnya', wild.types, active.types),
    );
  }
  return { lines, wildBarIndex: lines.length - 1 - (active ? 2 : 0) };
}

async function revealLines(base: readonly string[], revealed: readonly string[]): Promise<void> {
  if (!ANIMATION_ENABLED) return;
  for (let count = 1; count <= revealed.length; count += 1) {
    drawScreen([...base, ...revealed.slice(0, count), '']);
    await delay(ANIMATION_EVENT_DELAY_MS);
  }
}

async function revealHpDrain(
  base: readonly string[],
  barIndex: number,
  from: number,
  to: number,
  maxHp: number,
): Promise<void> {
  if (!ANIMATION_ENABLED || from <= to) return;
  const before = hpBar(from, maxHp);
  for (let step = 2; step <= HP_DRAIN_STEPS; step += 1) {
    const line = base[barIndex];
    if (line === undefined) return;
    const lines = [...base];
    lines[barIndex] = line.replace(before, hpBarDrain(from, to, maxHp, step));
    drawScreen([...lines, '']);
    await delay(ANIMATION_HP_TICK_MS);
  }
}

async function promptAction(): Promise<BattleAction> {
  return selectMenu<BattleAction>('Aksi:', [
    { value: 'attack', name: 'Attack', description: 'Serang Pokémon liar' },
    { value: 'catch', name: 'Catch', description: 'Lempar Poké Ball' },
    { value: 'switch', name: 'Ganti Pokémon', description: 'Tukar ke anggota party lain' },
    { value: 'run', name: 'Run', description: 'Coba kabur dari pertarungan' },
  ]);
}

function replacementName(entry: PokemonView, wildTypes: readonly PokemonType[]): string {
  const matchup = effectivenessBadge(effectivenessOf(effectiveness(entry.types, wildTypes)));
  const types = entry.types.map(typeBadge).join(' ');
  return `${displayName(entry)} ${chalk.gray(`Lv${entry.level}`)} ${types} ${matchup}`;
}

async function chooseReplacement(state: BattleState): Promise<number | null> {
  const options = getParty()
    .filter((entry) => entry.hp > 0 && entry.id !== state.activeId)
    .map((entry) => ({ value: String(entry.id), name: replacementName(entry, state.wild.types) }));
  if (options.length === 0) return null;
  return Number(await selectMenu('Pilih Pokémon:', options));
}

async function resolveForcedSwitch(
  state: BattleState,
): Promise<{ state: BattleState; events: string[] }> {
  drawScreen([
    ...renderScoreboard(state).lines,
    '',
    chalk.bold.red('Pokémon aktif pingsan. Pilih pengganti.'),
  ]);
  const id = await chooseReplacement(state);
  if (id === null) return { state, events: [] };
  const result = switchActive(state, id, { forced: true });
  if (!result.ok) {
    drawScreen([...renderScoreboard(state).lines, '', chalk.red(result.message)]);
    await pause();
    return { state, events: [] };
  }
  return { state: result.data.state, events: renderEventList(result.data.events) };
}

async function resolveVoluntarySwitch(state: BattleState): Promise<BattleStep> {
  drawScreen([...renderScoreboard(state).lines, '', chalk.gray('Pilih pengganti.')]);
  const id = await chooseReplacement(state);
  if (id === null) {
    drawScreen([...renderScoreboard(state).lines, '', chalk.gray('Tidak ada pengganti lain.')]);
    await pause();
    return { state, events: [], outcome: null };
  }
  const result = switchActive(state, id);
  if (!result.ok) {
    drawScreen([...renderScoreboard(state).lines, '', chalk.red(result.message)]);
    await pause();
    return { state, events: [], outcome: null };
  }
  return result.data;
}

async function runStep(state: BattleState, action: BattleAction): Promise<BattleStep> {
  if (action === 'switch') return resolveVoluntarySwitch(state);
  if (action === 'run') return playerRun(state);
  if (action === 'catch') return playerCatch(state);
  return playerAttack(state);
}

function outcomeMessage(outcome: Outcome): string {
  switch (outcome) {
    case 'win':
      return 'Kamu memenangkan pertarungan!';
    case 'lose':
      return 'Kamu kalah. Tim dipulihkan.';
    case 'caught':
      return 'Pokémon liar berhasil ditangkap!';
    case 'ran':
      return 'Kamu berhasil kabur.';
    default:
      return assertNever(outcome);
  }
}

function outcomeColor(outcome: Outcome, message: string): string {
  switch (outcome) {
    case 'caught':
      return chalk.inverse.green(` ${message} `);
    case 'win':
      return chalk.green(message);
    case 'lose':
      return chalk.red(message);
    case 'ran':
      return chalk.gray(message);
    default:
      return assertNever(outcome);
  }
}

function artMomentFor(outcome: Outcome, rareCatch: boolean): ArtMoment | null {
  switch (outcome) {
    case 'win':
      return 'win';
    case 'lose':
      return 'lose';
    case 'caught':
      return rareCatch ? 'rare-caught' : 'caught';
    case 'ran':
      return null;
    default:
      return assertNever(outcome);
  }
}

async function offerHeal(): Promise<void> {
  if (await askConfirm('Pulihkan tim sekarang?')) {
    const healed = healAll();
    drawScreen([chalk.green(healed.message)]);
  }
  await pause();
}

export async function runExploreScreen(): Promise<void> {
  drawScreen([chalk.gray('Mencari Pokémon liar...')]);
  const species = await getRandomSpecies();
  const created = createBattle(species, rollWildLevel());
  if (!created.ok) {
    drawScreen([chalk.yellow(created.message)]);
    await offerHeal();
    return;
  }

  let state = created.data;
  let outcome: Outcome | null = null;
  const log: string[] = [];
  let caughtSpeciesId: number | null = null;
  while (outcome === null) {
    if (needsSwitch(state)) {
      const resolved = await resolveForcedSwitch(state);
      state = resolved.state;
      log.push(...resolved.events);
      continue;
    }
    const board = renderScoreboard(state);
    drawScreen([...board.lines, '', ...log, '']);
    const step = await runStep(state, await promptAction());
    const rendered = renderEventList(step.events);
    const hit = step.events.find((event) => event.type === 'attack' && event.side === 'player');
    if (hit?.type === 'attack') {
      await revealLines([...board.lines, '', ...log], rendered);
      await revealHpDrain(
        [...board.lines, '', ...log, ...rendered],
        board.wildBarIndex,
        hit.damage + step.state.wild.hp,
        step.state.wild.hp,
        step.state.wild.maxHp,
      );
    } else {
      drawScreen([...board.lines, '', ...log, ...rendered, '']);
    }
    const caught = step.events.find((event) => event.type === 'caught');
    if (caught?.type === 'caught') caughtSpeciesId = caught.entry.speciesId;
    log.push(...rendered);
    state = step.state;
    outcome = step.outcome;
  }

  const rareCatch =
    caughtSpeciesId !== null &&
    getAll().filter((entry) => entry.speciesId === caughtSpeciesId).length === 1;
  const moment = artMomentFor(outcome, rareCatch);
  const art = moment === null ? [] : artBlock(moment, '');

  drawScreen([
    ...renderScoreboard(state).lines,
    '',
    ...log,
    '',
    ...panel('Hasil', [chalk.bold(outcomeColor(outcome, outcomeMessage(outcome)))]),
    ...(art.length > 0 ? ['', ...art] : []),
  ]);
  await pause();
}
