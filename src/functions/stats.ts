import { trainer, pokemons } from '../data.ts';
import type { Pokemon, PokemonType, Result } from '../types.ts';
import { okNull } from '../utils/result.ts';

export interface TrainerStats {
  name: string;
  totalCaught: number;
  currentOwned: number;
  partySize: number;
  boxSize: number;
  wins: number;
  losses: number;
  winRate: number;
  mostCommonType: PokemonType | null;
  highestLevel: Pokemon | null;
}

export function recordBattleResult(won: boolean): Result<null> {
  if (won) {
    trainer.wins += 1;
    return okNull('Kemenangan tercatat.');
  }
  trainer.losses += 1;
  return okNull('Kekalahan tercatat.');
}

function findMostCommonType(entries: Pokemon[]): PokemonType | null {
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

function findHighestLevel(entries: Pokemon[]): Pokemon | null {
  let best: Pokemon | null = null;
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
