import { pokemons } from '../data.ts';
import type { Pokemon, PokemonType } from '../types.ts';

export type SortKey = 'level' | 'name' | 'hp' | 'attack' | 'defense' | 'speed';
export type SortOrder = 'asc' | 'desc';

export function searchByName(keyword: string): Pokemon[] {
  const needle = keyword.trim().toLowerCase();
  if (needle.length === 0) return [];
  return pokemons.filter((entry) => {
    const nickname = entry.nickname?.toLowerCase() ?? '';
    return entry.name.toLowerCase().includes(needle) || nickname.includes(needle);
  });
}

export function filterByType(type: PokemonType): Pokemon[] {
  return pokemons.filter((entry) => entry.types.includes(type));
}

function compare(a: Pokemon, b: Pokemon, key: SortKey): number {
  if (key === 'name') return a.name.localeCompare(b.name);
  return a[key] - b[key];
}

export function sortBy(key: SortKey, order: SortOrder = 'asc'): Pokemon[] {
  const direction = order === 'desc' ? -1 : 1;
  return [...pokemons].sort((a, b) => compare(a, b, key) * direction);
}
