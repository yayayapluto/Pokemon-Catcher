import { beforeEach, describe, expect, test } from 'bun:test';
import {
  CATCH_CHANCE_MAX,
  CATCH_CHANCE_MIN,
  MAX_LEVEL,
  MIN_WILD_LEVEL,
  POKEMON_TYPES,
  RUN_CHANCE_MAX,
  RUN_CHANCE_MIN,
  WILD_LEVEL_SPREAD,
} from '../src/constants.ts';
import { pokemons, resetData, trainer } from '../src/data.ts';
import { buildPokemon, catchPokemon, getById, getParty } from '../src/functions.ts';
import { calcDamage, effectiveness, effectivenessOf } from '../src/battle/damage.ts';
import { catchChance, runChance } from '../src/battle/catch.ts';
import {
  createBattle,
  needsSwitch,
  playerAttack,
  playerCatch,
  playerRun,
  rollWildLevel,
  switchActive,
} from '../src/battle/engine.ts';
import type { BattleState } from '../src/battle/engine.ts';
import { createSeededRng, makeSpecies } from './helpers.ts';
import { applyDamage, getPokedex } from '../src/functions.ts';

beforeEach(resetData);

function setupPlayer(level = 5, name = 'player'): void {
  catchPokemon(buildPokemon(makeSpecies({ name }), level));
}

function freshBattle(level = 5): BattleState {
  const result = createBattle(makeSpecies({ name: 'wild' }), level);
  if (!result.ok) throw new Error('battle gagal dibuat');
  return result.data;
}

describe('calcDamage', () => {
  test('selalu minimal 1', () => {
    const attacker = { level: 1, attack: 1, defense: 1, types: ['normal'] as const };
    const defender = { level: 100, attack: 1, defense: 9999, types: ['normal'] as const };
    expect(calcDamage(attacker, defender, () => 0)).toBeGreaterThanOrEqual(1);
  });

  test('deterministik untuk rng yang sama', () => {
    const attacker = { level: 5, attack: 20, defense: 20, types: ['normal'] as const };
    const defender = { level: 5, attack: 20, defense: 20, types: ['normal'] as const };
    const a = calcDamage(attacker, defender, createSeededRng(42));
    const b = calcDamage(attacker, defender, createSeededRng(42));
    expect(a).toBe(b);
  });

  test('kekebalan menghasilkan 0 tanpa memanggil rng', () => {
    const attacker = { level: 50, attack: 100, defense: 50, types: ['electric'] as const };
    const defender = { level: 50, attack: 50, defense: 50, types: ['ground'] as const };
    let calls = 0;
    const damage = calcDamage(attacker, defender, () => {
      calls += 1;
      return 0.5;
    });
    expect(damage).toBe(0);
    expect(calls).toBe(0);
  });

  test('efektivitas menggandakan dan memangkas damage', () => {
    const rng = () => 0.5;
    const base = { level: 50, attack: 100, defense: 100 } as const;
    const neutral = calcDamage({ ...base, types: ['normal'] }, { ...base, types: ['normal'] }, rng);
    const strong = calcDamage({ ...base, types: ['fire'] }, { ...base, types: ['grass'] }, rng);
    const weak = calcDamage({ ...base, types: ['fire'] }, { ...base, types: ['water'] }, rng);
    const double = calcDamage(
      { ...base, types: ['fighting'] },
      { ...base, types: ['ice', 'rock'] },
      rng,
    );
    expect(strong).toBeGreaterThan(neutral);
    expect(weak).toBeLessThan(neutral);
    expect(double / strong).toBeGreaterThanOrEqual(1.9);
    expect(double / strong).toBeLessThanOrEqual(2.1);
  });
});

describe('effectiveness', () => {
  test('matchup netral menghasilkan 1', () => {
    expect(effectiveness(['normal'], ['normal'])).toBe(1);
    expect(effectiveness(['fire'], ['dragon'])).toBe(0.5);
  });

  test('dual type mengalikan kedua defense', () => {
    expect(effectiveness(['fighting'], ['ice', 'rock'])).toBe(4);
    expect(effectiveness(['grass'], ['fire', 'flying'])).toBe(0.25);
    expect(effectiveness(['ground'], ['electric', 'flying'])).toBe(0);
  });

  test('dual type penyerang mengalikan kedua attack', () => {
    expect(effectiveness(['grass', 'poison'], ['water'])).toBe(2);
    expect(effectiveness(['grass', 'poison'], ['rock'])).toBe(1);
    expect(effectiveness(['grass', 'poison'], ['grass'])).toBe(1);
  });

  test('kekebalan menang atas kelemahan', () => {
    expect(effectiveness(['normal'], ['ghost'])).toBe(0);
    expect(effectiveness(['electric'], ['ground'])).toBe(0);
    expect(effectiveness(['psychic'], ['dark'])).toBe(0);
  });

  test('setiap type punya entri dan nilai valid', () => {
    for (const attackType of POKEMON_TYPES) {
      for (const defendType of POKEMON_TYPES) {
        const value = effectiveness([attackType], [defendType]);
        expect([0, 0.25, 0.5, 1, 2, 4]).toContain(value);
      }
    }
  });

  test('effectivenessOf memetakan multiplier ke label', () => {
    expect(effectivenessOf(0)).toBe('immune');
    expect(effectivenessOf(0.25)).toBe('weak');
    expect(effectivenessOf(0.5)).toBe('weak');
    expect(effectivenessOf(1)).toBe('neutral');
    expect(effectivenessOf(2)).toBe('strong');
    expect(effectivenessOf(4)).toBe('strong');
  });
});

describe('catchChance dan runChance', () => {
  test('catchChance berada di rentang clamp', () => {
    for (const hp of [0, 1, 50, 100]) {
      const value = catchChance(hp, 100, 255);
      expect(value).toBeGreaterThanOrEqual(CATCH_CHANCE_MIN);
      expect(value).toBeLessThanOrEqual(CATCH_CHANCE_MAX);
    }
  });

  test('runChance berada di rentang clamp', () => {
    for (const delta of [-9999, 0, 9999]) {
      const value = runChance(50 + delta, 50);
      expect(value).toBeGreaterThanOrEqual(RUN_CHANCE_MIN);
      expect(value).toBeLessThanOrEqual(RUN_CHANCE_MAX);
    }
  });
});

describe('rollWildLevel', () => {
  test('selalu di dalam rentang yang ditentukan', () => {
    setupPlayer(20);
    for (let seed = 0; seed < 20; seed += 1) {
      const level = rollWildLevel(createSeededRng(seed));
      expect(level).toBeGreaterThanOrEqual(Math.max(MIN_WILD_LEVEL, 20 - WILD_LEVEL_SPREAD));
      expect(level).toBeLessThanOrEqual(Math.min(MAX_LEVEL, 20 + WILD_LEVEL_SPREAD));
    }
  });
});

describe('simulasi battle', () => {
  test('battle level setara berlangsung sekitar 3 sampai 8 giliran', () => {
    const turnCounts: number[] = [];
    for (let seed = 0; seed < 30; seed += 1) {
      resetData();
      setupPlayer(10);
      const rng = createSeededRng(seed);
      let state = freshBattle(10);
      let turns = 0;
      let step = playerAttack(state, rng);
      while (step.outcome === null && turns < 50) {
        state = step.state;
        step = playerAttack(state, rng);
        turns += 1;
      }
      if (step.outcome === 'win') turnCounts.push(turns + 1);
    }
    expect(turnCounts.length).toBeGreaterThan(10);
    const average = turnCounts.reduce((sum, value) => sum + value, 0) / turnCounts.length;
    expect(average).toBeGreaterThanOrEqual(3);
    expect(average).toBeLessThanOrEqual(8);
  });
});

describe('outcome', () => {
  test('win menambah EXP dan kemenangan', () => {
    setupPlayer(50);
    const state = { ...freshBattle(2), wild: { ...freshBattle(2).wild, hp: 1 } };
    let step = playerAttack(state, createSeededRng(1));
    let guard = 0;
    while (step.outcome === null && guard < 20) {
      step = playerAttack(step.state, createSeededRng(guard + 2));
      guard += 1;
    }
    expect(step.outcome).toBe('win');
    expect(trainer.wins).toBe(1);
  });

  test('lose mencatat kekalahan dan memulihkan party', () => {
    setupPlayer(1);
    let state = freshBattle(50);
    let step = playerAttack(state, createSeededRng(7));
    let guard = 0;
    while (step.outcome === null && guard < 50) {
      state = step.state;
      step = playerAttack(state, createSeededRng(guard));
      guard += 1;
    }
    expect(step.outcome).toBe('lose');
    expect(trainer.losses).toBeGreaterThanOrEqual(1);
    for (const entry of getParty()) expect(entry.hp).toBe(entry.maxHp);
  });

  test('caught menambah entry ke pokemons', () => {
    setupPlayer(50);
    const state = { ...freshBattle(2), wild: { ...freshBattle(2).wild, hp: 0 } };
    const before = pokemons.length;
    const step = playerCatch(state, () => 0);
    expect(step.outcome).toBe('caught');
    expect(pokemons.length).toBe(before + 1);
  });

  test('ran mengakhiri battle tanpa menangkap', () => {
    setupPlayer(50);
    const before = pokemons.length;
    const step = playerRun(freshBattle(2), () => 0);
    expect(step.outcome).toBe('ran');
    expect(pokemons.length).toBe(before);
  });

  test('pokemon liar tidak ada di pokemons sebelum caught', () => {
    setupPlayer(50);
    const state = freshBattle(2);
    const step = playerCatch(state, () => 0.999);
    expect(step.outcome).toBeNull();
    expect(pokemons.some((entry) => entry.name === 'wild')).toBe(false);
  });
});

describe('createBattle dan switch', () => {
  test('gagal jika semua party pingsan', () => {
    setupPlayer(5);
    applyDamage(1, 9999);
    expect(createBattle(makeSpecies(), 5).ok).toBe(false);
  });

  test('needsSwitch benar saat aktif pingsan tapi party masih hidup', () => {
    setupPlayer(5, 'a');
    catchPokemon(buildPokemon(makeSpecies({ name: 'b' }), 5));
    const state = freshBattle(5);
    applyDamage(state.activeId, 9999);
    expect(needsSwitch(state)).toBe(true);
  });

  test('switchActive menolak anggota pingsan', () => {
    setupPlayer(5, 'a');
    catchPokemon(buildPokemon(makeSpecies({ name: 'b' }), 5));
    applyDamage(2, 9999);
    const state = freshBattle(5);
    expect(switchActive(state, 2, { forced: true }).ok).toBe(false);
  });

  test('switchActive menolak id yang bukan anggota party', () => {
    setupPlayer(5);
    const state = freshBattle(5);
    expect(switchActive(state, 999, { forced: true }).ok).toBe(false);
  });
});

describe('immutability', () => {
  test('state yang diterima engine tidak berubah setelah aksi', () => {
    setupPlayer(10);
    const state = freshBattle(10);
    const snapshot = { activeId: state.activeId, wildHp: state.wild.hp };
    playerAttack(state, createSeededRng(3));
    expect(state.activeId).toBe(snapshot.activeId);
    expect(state.wild.hp).toBe(snapshot.wildHp);
    expect(getById(state.activeId)).toBeDefined();
  });
});

describe('pokedex integration', () => {
  test('createBattle menandai spesies liar sebagai terlihat', () => {
    setupPlayer(5);
    createBattle(makeSpecies({ speciesId: 25, name: 'pikachu' }), 5);
    const entry = getPokedex().find((item) => item.speciesId === 25);
    expect(entry?.seen).toBe(true);
    expect(entry?.caught).toBe(false);
  });

  test('spesies liar di luar katalog tetap muncul di Pokédex', () => {
    setupPlayer(5);
    createBattle(makeSpecies({ speciesId: 99999, name: 'venusaur', types: ['grass'] }), 5);
    const entry = getPokedex().find((item) => item.speciesId === 99999);
    expect(entry?.seen).toBe(true);
    expect(entry?.name).toBe('venusaur');
  });
});
