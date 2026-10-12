import { SORT_KEYS } from '../constants.ts';
import { pokemons } from '../data.ts';
import type { PokemonType, PokemonView, SortKey, SortOrder } from '../types.ts';

export function searchByName(keyword: string): readonly PokemonView[] {
  const needle = keyword.trim().toLowerCase();
  if (needle.length === 0) return [];
  return [...pokemons].filter((entry) => {
    const nickname = entry.nickname?.toLowerCase() ?? '';
    return entry.name.toLowerCase().includes(needle) || nickname.includes(needle);
  });
}

export function filterByType(type: PokemonType): readonly PokemonView[] {
  return [...pokemons].filter((entry) => entry.types.includes(type));
}

function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

function compare(a: PokemonView, b: PokemonView, key: SortKey): number {
  if (key === 'name') return a.name.localeCompare(b.name);
  return a[key] - b[key];
}

export function sortBy(key: SortKey, order: SortOrder = 'asc'): readonly PokemonView[] {
  const entries = [...pokemons];
  if (!isSortKey(key)) return entries;
  const direction = order === 'desc' ? -1 : 1;
  return [...entries].sort((a, b) => compare(a, b, key) * direction);
}
