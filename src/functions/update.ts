import {
  EXP_PER_LEVEL,
  LEVEL_UP_STAT_GROWTH,
  MAX_LEVEL,
  MAX_NICKNAME_LENGTH,
} from '../constants.ts';
import { pokemons } from '../data.ts';
import type { PokemonView, Result } from '../types.ts';
import { fail, ok } from '../utils/result.ts';
import { findById } from './store.ts';

export function setNickname(id: number, nickname: string): Result<PokemonView> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  const trimmed = nickname.trim();
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    return fail(`Nama panggilan maksimal ${MAX_NICKNAME_LENGTH} karakter.`);
  }
  entry.nickname = trimmed.length === 0 ? null : trimmed;
  return ok(`Nama panggilan ${entry.name} diperbarui.`, entry);
}

function expNeeded(level: number): number {
  return level * EXP_PER_LEVEL;
}

export function gainExp(
  id: number,
  amount: number,
): Result<{ levelsGained: number; newLevel: number }> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  if (!Number.isInteger(amount) || amount <= 0) {
    return fail('Jumlah EXP harus bilangan bulat lebih dari 0.');
  }
  if (entry.level >= MAX_LEVEL) {
    return ok(`${entry.name} sudah level maksimum.`, { levelsGained: 0, newLevel: entry.level });
  }
  entry.exp += amount;
  let levelsGained = 0;
  while (entry.level < MAX_LEVEL && entry.exp >= expNeeded(entry.level)) {
    entry.exp -= expNeeded(entry.level);
    entry.level += 1;
    levelsGained += 1;
    const hpGain = Math.max(1, Math.round(entry.maxHp * LEVEL_UP_STAT_GROWTH));
    entry.maxHp += hpGain;
    entry.hp += hpGain;
    entry.attack += Math.max(1, Math.round(entry.attack * LEVEL_UP_STAT_GROWTH));
    entry.defense += Math.max(1, Math.round(entry.defense * LEVEL_UP_STAT_GROWTH));
    entry.speed += Math.max(1, Math.round(entry.speed * LEVEL_UP_STAT_GROWTH));
  }
  return ok(`${entry.name} mendapat ${amount} EXP.`, { levelsGained, newLevel: entry.level });
}

export function applyDamage(id: number, amount: number): Result<{ hp: number; fainted: boolean }> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  if (!Number.isInteger(amount) || amount < 0) {
    return fail('Jumlah damage harus bilangan bulat minimal 0.');
  }
  entry.hp = Math.max(0, entry.hp - amount);
  return ok(`${entry.name} menerima ${amount} damage.`, { hp: entry.hp, fainted: entry.hp === 0 });
}

export function healAll(): Result<{ healed: number }> {
  let healed = 0;
  for (const entry of pokemons) {
    if (entry.hp !== entry.maxHp) {
      entry.hp = entry.maxHp;
      healed += 1;
    }
  }
  return ok(`${healed} Pokémon dipulihkan.`, { healed });
}
