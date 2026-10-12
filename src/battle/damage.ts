import {
  DAMAGE_POWER,
  DAMAGE_VARIANCE_MIN,
  DAMAGE_VARIANCE_SPREAD,
  TYPE_CHART,
} from '../constants.ts';
import type { Pokemon, PokemonType } from '../types.ts';
import type { Rng } from '../utils/random.ts';

type Combatant = Pick<Pokemon, 'level' | 'attack' | 'defense'>;
type TypedCombatant = Combatant & { readonly types: readonly PokemonType[] };

export type Effectiveness = 'immune' | 'weak' | 'neutral' | 'strong';

export function effectivenessOf(multiplier: number): Effectiveness {
  if (multiplier === 0) return 'immune';
  if (multiplier < 1) return 'weak';
  if (multiplier > 1) return 'strong';
  return 'neutral';
}

export function effectiveness(
  attackerTypes: readonly PokemonType[],
  defenderTypes: readonly PokemonType[],
): number {
  let multiplier = 1;
  for (const attackType of attackerTypes) {
    const row = TYPE_CHART[attackType];
    for (const defendType of defenderTypes) {
      multiplier *= row[defendType] ?? 1;
    }
  }
  return multiplier;
}

export function calcDamage(
  attacker: TypedCombatant,
  defender: TypedCombatant,
  rng: Rng = Math.random,
): number {
  const multiplier = effectiveness(attacker.types, defender.types);
  if (multiplier === 0) return 0;
  const defense = Math.max(1, defender.defense);
  const base = Math.floor(
    (((2 * attacker.level) / 5 + 2) * DAMAGE_POWER * attacker.attack) / defense / 50 + 2,
  );
  const variance = DAMAGE_VARIANCE_MIN + rng() * DAMAGE_VARIANCE_SPREAD;
  return Math.max(1, Math.floor(base * variance * multiplier));
}
