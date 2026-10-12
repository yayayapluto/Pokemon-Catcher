import { MAX_SPECIES_ID } from '../constants.ts';
import { pokemons, speciesCatalog, trainer } from '../data.ts';
import type { PokemonType, Result, SeenSpecies } from '../types.ts';
import { fail, ok } from '../utils/result.ts';

export interface PokedexEntry {
  readonly speciesId: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
  readonly seen: boolean;
  readonly caught: boolean;
  readonly count: number;
}

export interface PokedexProgress {
  readonly seen: number;
  readonly caught: number;
  readonly total: number;
}

export function recordSpeciesSeen(species: SeenSpecies): Result<null> {
  if (!Number.isInteger(species.speciesId) || species.speciesId <= 0) {
    return fail('Id spesies tidak valid.');
  }
  if (trainer.seenSpecies.some((entry) => entry.speciesId === species.speciesId)) {
    return ok('Spesies sudah tercatat di Pokédex.');
  }
  trainer.seenSpecies.push({ ...species });
  return ok('Spesies tercatat di Pokédex.');
}

export function getPokedex(): PokedexEntry[] {
  const seenById = new Map(trainer.seenSpecies.map((entry) => [entry.speciesId, entry]));
  const ownedIds = new Set(pokemons.map((entry) => entry.speciesId));
  const ids = new Set([...speciesCatalog.keys(), ...seenById.keys(), ...ownedIds]);
  return [...ids]
    .sort((a, b) => a - b)
    .map((speciesId) => {
      const known = speciesCatalog.get(speciesId) ?? seenById.get(speciesId);
      const owned = pokemons.filter((entry) => entry.speciesId === speciesId);
      return {
        speciesId,
        name: known?.name ?? `spesies #${speciesId}`,
        types: known?.types ?? [],
        seen: seenById.has(speciesId),
        caught: owned.length > 0,
        count: owned.length,
      };
    });
}
export function getPokedexProgress(): PokedexProgress {
  const seenIds = new Set(trainer.seenSpecies.map((entry) => entry.speciesId));
  const caughtIds = new Set(pokemons.map((entry) => entry.speciesId));
  return { seen: seenIds.size, caught: caughtIds.size, total: MAX_SPECIES_ID };
}
