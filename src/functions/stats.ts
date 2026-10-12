import { trainer, pokemons } from '../data.ts';
import type { PokemonType, PokemonView, Result } from '../types.ts';
import { ok } from '../utils/result.ts';

export interface TrainerStats {
  readonly name: string;
  readonly totalCaught: number;
  readonly currentOwned: number;
  readonly partySize: number;
  readonly boxSize: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly mostCommonType: PokemonType | null;
  readonly highestLevel: PokemonView | null;
}

export function recordBattleResult(won: boolean): Result<null> {
  if (won) {
    trainer.wins += 1;
    return ok('Kemenangan tercatat.');
  }
  trainer.losses += 1;
  return ok('Kekalahan tercatat.');
}

function findMostCommonType(entries: readonly PokemonView[]): PokemonType | null {
  const counts = new Map<PokemonType, number>();
  for (const entry of entries) {
    for (const type of entry.types) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  let best: PokemonType | null = null;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

function findHighestLevel(entries: readonly PokemonView[]): PokemonView | null {
  let best: PokemonView | null = null;
  for (const entry of entries) {
    if (best === null || entry.level > best.level) best = entry;
  }
  return best;
}

export function getTrainerStats(): TrainerStats {
  const entries = [...pokemons];
  const partySize = entries.filter((entry) => entry.inParty).length;
  const battles = trainer.wins + trainer.losses;
  return {
    name: trainer.name,
    totalCaught: trainer.totalCaught,
    currentOwned: entries.length,
    partySize,
    boxSize: entries.length - partySize,
    wins: trainer.wins,
    losses: trainer.losses,
    winRate: battles === 0 ? 0 : Math.round((trainer.wins / battles) * 100),
    mostCommonType: findMostCommonType(entries),
    highestLevel: findHighestLevel(entries),
  };
}
