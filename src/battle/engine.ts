import {
  EXP_PER_WILD_LEVEL,
  EXP_WIN_BONUS,
  MAX_LEVEL,
  MIN_WILD_LEVEL,
  TYPE_EFFECTIVE_LABELS,
  WILD_LEVEL_SPREAD,
} from '../constants.ts';
import {
  applyDamage,
  buildPokemon,
  catchPokemon,
  gainExp,
  getById,
  getParty,
  healAll,
  recordBattleResult,
  recordSpeciesSeen,
} from '../functions.ts';
import type { NewPokemon, PokemonView, Result, Species } from '../types.ts';
import { randomInt, type Rng } from '../utils/random.ts';
import { fail, ok } from '../utils/result.ts';
import { calcDamage, effectiveness, effectivenessOf, type Effectiveness } from './damage.ts';
import { catchChance, runChance } from './catch.ts';

export type Side = 'player' | 'wild';
export type Outcome = 'win' | 'lose' | 'caught' | 'ran';

export type BattleEvent =
  | {
      readonly type: 'attack';
      readonly side: Side;
      readonly damage: number;
      readonly effectiveness: Effectiveness;
      readonly message: string;
    }
  | { readonly type: 'faint'; readonly side: Side; readonly message: string }
  | { readonly type: 'exp'; readonly amount: number; readonly message: string }
  | { readonly type: 'level-up'; readonly newLevel: number; readonly message: string }
  | { readonly type: 'catch-attempt'; readonly success: boolean; readonly message: string }
  | { readonly type: 'caught'; readonly entry: PokemonView; readonly message: string }
  | { readonly type: 'run-attempt'; readonly success: boolean; readonly message: string }
  | { readonly type: 'switch'; readonly message: string }
  | { readonly type: 'party-wiped'; readonly message: string };

export interface BattleState {
  readonly activeId: number;
  readonly wild: NewPokemon;
  readonly captureRate: number;
}

export interface BattleStep {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
  readonly outcome: Outcome | null;
}

function activePokemon(state: BattleState): PokemonView | undefined {
  return getById(state.activeId);
}

function aliveParty(): readonly PokemonView[] {
  return getParty().filter((entry) => entry.hp > 0);
}

function withWildHp(state: BattleState, hp: number): BattleState {
  return { ...state, wild: { ...state.wild, hp: Math.max(0, hp) } };
}

function partyWiped(): boolean {
  return getParty().every((entry) => entry.hp === 0);
}

function attackMessage(
  attackerName: string,
  defenderName: string,
  damage: number,
  kind: Effectiveness,
): string {
  const label = kind === 'neutral' ? '' : `, ${TYPE_EFFECTIVE_LABELS[kind]}`;
  return `${attackerName} menyerang ${defenderName} (${damage} damage${label}).`;
}

function wildTurn(state: BattleState, events: BattleEvent[], rng: Rng): BattleState {
  const active = activePokemon(state);
  if (!active || active.hp === 0 || state.wild.hp === 0) return state;
  const wildCombatant = { ...state.wild, maxHp: state.wild.maxHp };
  const multiplier = effectiveness(wildCombatant.types, active.types);
  const kind = effectivenessOf(multiplier);
  const damage = calcDamage(wildCombatant, active, rng);
  applyDamage(active.id, damage);
  events.push({
    type: 'attack',
    side: 'wild',
    damage,
    effectiveness: kind,
    message: attackMessage(`${state.wild.name} liar`, active.name, damage, kind),
  });
  const refreshed = getById(active.id);
  if (refreshed && refreshed.hp === 0) {
    events.push({
      type: 'faint',
      side: 'player',
      message: `${refreshed.name} pingsan!`,
    });
  }
  return state;
}

function playerWins(state: BattleState, events: BattleEvent[]): BattleStep {
  const active = activePokemon(state);
  if (!active) return { state, events, outcome: 'lose' };
  const amount = state.wild.level * EXP_PER_WILD_LEVEL + EXP_WIN_BONUS;
  const result = gainExp(active.id, amount);
  if (result.ok) {
    events.push({
      type: 'exp',
      amount,
      message: `${active.name} mendapat ${amount} EXP.`,
    });
    if (result.data.levelsGained > 0) {
      events.push({
        type: 'level-up',
        newLevel: result.data.newLevel,
        message: `${active.name} naik ke level ${result.data.newLevel}!`,
      });
    }
  }
  recordBattleResult(true);
  return { state, events, outcome: 'win' };
}

function playerLoses(state: BattleState, events: BattleEvent[]): BattleStep {
  recordBattleResult(false);
  healAll();
  events.push({
    type: 'party-wiped',
    message: 'Semua Pokémon pingsan. Tim dipulihkan di pusat Pokémon.',
  });
  return { state, events, outcome: 'lose' };
}

function resolveFaints(state: BattleState, events: BattleEvent[]): BattleStep | null {
  if (state.wild.hp === 0) return null;
  if (partyWiped()) return playerLoses(state, events);
  return null;
}

export function rollWildLevel(rng: Rng = Math.random): number {
  const party = getParty();
  const highest = party.reduce((max, entry) => Math.max(max, entry.level), MIN_WILD_LEVEL);
  const low = Math.max(MIN_WILD_LEVEL, highest - WILD_LEVEL_SPREAD);
  const high = Math.min(MAX_LEVEL, highest + WILD_LEVEL_SPREAD);
  return randomInt(low, Math.max(low, high), rng);
}

export function createBattle(species: Species, level: number): Result<BattleState> {
  const active = aliveParty()[0];
  if (!active) {
    return fail('Tidak ada Pokémon yang bisa bertarung. Pulihkan tim dulu.');
  }
  const state: BattleState = {
    activeId: active.id,
    wild: buildPokemon(species, level),
    captureRate: species.captureRate,
  };
  recordSpeciesSeen({
    speciesId: species.speciesId,
    name: species.name,
    types: species.types,
  });
  return ok(`Pokémon liar ${state.wild.name} muncul!`, state);
}

export function needsSwitch(state: BattleState): boolean {
  const active = activePokemon(state);
  if (!active || active.hp > 0) return false;
  return aliveParty().length > 0;
}

export function playerAttack(state: BattleState, rng: Rng = Math.random): BattleStep {
  const events: BattleEvent[] = [];
  const active = activePokemon(state);
  if (!active) return { state, events, outcome: 'lose' };

  const wildCombatant = state.wild;
  const playerFirst = active.speed >= wildCombatant.speed ? rng() >= 0.5 : rng() < 0.5;

  const playerStrikes = (): BattleState => {
    if (active.hp === 0) return state;
    const kind = effectivenessOf(effectiveness(active.types, wildCombatant.types));
    const damage = calcDamage(active, wildCombatant, rng);
    events.push({
      type: 'attack',
      side: 'player',
      damage,
      effectiveness: kind,
      message: attackMessage(active.name, wildCombatant.name, damage, kind),
    });
    return withWildHp(state, wildCombatant.hp - damage);
  };

  let next = playerFirst ? playerStrikes() : wildTurn(state, events, rng);
  if (next.wild.hp === 0) {
    events.push({ type: 'faint', side: 'wild', message: `${next.wild.name} liar pingsan!` });
    return playerWins(next, events);
  }
  next = playerFirst ? wildTurn(next, events, rng) : playerStrikes();
  if (next.wild.hp === 0) {
    events.push({ type: 'faint', side: 'wild', message: `${next.wild.name} liar pingsan!` });
    return playerWins(next, events);
  }
  const resolved = resolveFaints(next, events);
  if (resolved) return resolved;
  return { state: next, events, outcome: null };
}

export function playerCatch(state: BattleState, rng: Rng = Math.random): BattleStep {
  const events: BattleEvent[] = [];
  const chance = catchChance(state.wild.hp, state.wild.maxHp, state.captureRate);
  const success = rng() < chance;
  events.push({
    type: 'catch-attempt',
    success,
    message: success
      ? `Poké Ball mengenai ${state.wild.name}!`
      : `${state.wild.name} liar berhasil kabur dari Poké Ball.`,
  });
  if (success) {
    const result = catchPokemon(state.wild);
    if (result.ok) {
      events.push({
        type: 'caught',
        entry: result.data,
        message: result.message,
      });
    }
    return { state, events, outcome: 'caught' };
  }
  const next = wildTurn(state, events, rng);
  const resolved = resolveFaints(next, events);
  if (resolved) return resolved;
  return { state: next, events, outcome: null };
}

export function playerRun(state: BattleState, rng: Rng = Math.random): BattleStep {
  const events: BattleEvent[] = [];
  const active = activePokemon(state);
  if (!active) return { state, events, outcome: 'lose' };
  const success = rng() < runChance(active.speed, state.wild.speed);
  events.push({
    type: 'run-attempt',
    success,
    message: success ? 'Berhasil kabur!' : 'Gagal kabur!',
  });
  if (success) return { state, events, outcome: 'ran' };
  const next = wildTurn(state, events, rng);
  const resolved = resolveFaints(next, events);
  if (resolved) return resolved;
  return { state: next, events, outcome: null };
}

export function switchActive(
  state: BattleState,
  id: number,
  options: { forced?: boolean } = {},
  rng: Rng = Math.random,
): Result<BattleStep> {
  const target = getById(id);
  if (!target?.inParty) return fail('Pilih anggota party yang valid.');
  if (target.hp === 0) return fail(`${target.name} pingsan dan tidak bisa bertarung.`);

  const events: BattleEvent[] = [{ type: 'switch', message: `Keluarkan ${target.name}!` }];
  const next: BattleState = { ...state, activeId: id };

  if (options.forced) {
    return ok(`Keluarkan ${target.name}!`, { state: next, events, outcome: null });
  }

  const afterWild = wildTurn(next, events, rng);
  const resolved = resolveFaints(afterWild, events);
  if (resolved) return ok(`Keluarkan ${target.name}!`, resolved);
  return ok(`Keluarkan ${target.name}!`, { state: afterWild, events, outcome: null });
}
