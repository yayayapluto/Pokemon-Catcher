import { pokemons } from '../data.ts';
import type { Pokemon } from '../types.ts';

export function findById(id: number): Pokemon | undefined {
  if (!Number.isInteger(id)) return undefined;
  return pokemons.find((entry) => entry.id === id);
}

export function countParty(): number {
  return pokemons.filter((entry) => entry.inParty).length;
}

export function isLastPartyMember(entry: Pokemon): boolean {
  return entry.inParty && countParty() <= 1;
}
