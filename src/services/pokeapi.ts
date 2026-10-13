import type { Pokemon as ApiPokemon, PokemonSpecies as ApiSpecies } from 'pokenode-ts';
import { PokemonClient } from 'pokenode-ts';
import {
  API_TIMEOUT_MS,
  MAX_SPECIES_ID,
  POKEMON_TYPES,
  PREFETCH_CONCURRENCY,
  STAT_NAMES,
} from '../constants.ts';
import { fallbackSpecies, mergeSpecies, speciesCatalog } from '../data.ts';
import type { BaseStats, PokemonType, Species } from '../types.ts';
import { withTimeout } from '../utils/async.ts';
import { randomChoice, randomInt, type Rng } from '../utils/random.ts';

export interface SpeciesSource {
  fetchSpecies(speciesId: number): Promise<Species>;
}

export interface RandomSpeciesOptions {
  readonly source?: SpeciesSource;
  readonly rng?: Rng;
  readonly timeoutMs?: number;
}

export interface PrefetchOptions {
  readonly source?: SpeciesSource;
  readonly total?: number;
  readonly concurrency?: number;
  readonly onLoaded?: (species: Species) => void;
}

type StatName = (typeof STAT_NAMES)[number];

function isStatName(value: string): value is StatName {
  return (STAT_NAMES as readonly string[]).includes(value);
}

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

function readBaseStats(stats: ApiPokemon['stats']): BaseStats {
  const found: Record<StatName, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
  for (const entry of stats) {
    const name = entry.stat.name;
    if (!isStatName(name)) continue;
    if (!Number.isFinite(entry.base_stat)) {
      throw new Error(`Stat ${name} tidak valid.`);
    }
    found[name] = entry.base_stat;
  }
  for (const name of STAT_NAMES) {
    if (found[name] <= 0) {
      throw new Error(`Stat ${name} tidak ditemukan.`);
    }
  }
  return { hp: found.hp, attack: found.attack, defense: found.defense, speed: found.speed };
}

export function mapToSpecies(pokemon: ApiPokemon, species: ApiSpecies): Species {
  const types = pokemon.types.map((entry) => entry.type.name).filter(isPokemonType);
  if (types.length === 0) {
    throw new Error(`Tipe Pokémon ${pokemon.name} tidak dikenali.`);
  }
  const captureRate = species.capture_rate;
  if (!Number.isInteger(captureRate) || captureRate < 0 || captureRate > 255) {
    throw new Error(`Capture rate ${pokemon.name} tidak valid.`);
  }
  return {
    speciesId: pokemon.id,
    name: pokemon.name,
    types,
    baseStats: readBaseStats(pokemon.stats),
    captureRate,
  };
}

export function createPokeApiSource(): SpeciesSource {
  const client = new PokemonClient();
  return {
    async fetchSpecies(speciesId: number): Promise<Species> {
      const [pokemon, species] = await Promise.all([
        client.getPokemonById(speciesId),
        client.getPokemonSpeciesById(speciesId),
      ]);
      return mapToSpecies(pokemon, species);
    },
  };
}

export async function getRandomSpecies(options: RandomSpeciesOptions = {}): Promise<Species> {
  const rng = options.rng ?? Math.random;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  if (!options.source) {
    const loaded = [...speciesCatalog.values()];
    if (loaded.length > 0) {
      return randomChoice(loaded, rng);
    }
  }
  const source = options.source ?? createPokeApiSource();
  const speciesId = randomInt(1, MAX_SPECIES_ID, rng);
  try {
    return await withTimeout(source.fetchSpecies(speciesId), timeoutMs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return randomChoice(fallbackSpecies, rng);
    }
    throw error;
  }
}

export interface PrefetchProgress {
  readonly loaded: number;
  readonly total: number;
  readonly done: boolean;
}

let progress: PrefetchProgress = { loaded: 0, total: MAX_SPECIES_ID, done: false };
let prefetchStarted = false;

export function getPrefetchProgress(): PrefetchProgress {
  return progress;
}

export function resetPrefetchProgress(): void {
  progress = { loaded: 0, total: MAX_SPECIES_ID, done: false };
  prefetchStarted = false;
}

async function fetchOne(source: SpeciesSource, speciesId: number): Promise<Species | null> {
  try {
    return await withTimeout(source.fetchSpecies(speciesId), API_TIMEOUT_MS);
  } catch (error: unknown) {
    if (error instanceof Error) return null;
    throw error;
  }
}

async function worker(
  source: SpeciesSource,
  next: { value: number },
  options: { total: number; onLoaded: (species: Species) => void },
): Promise<void> {
  while (next.value <= options.total) {
    const speciesId = next.value;
    next.value += 1;
    const species = await fetchOne(source, speciesId);
    if (species) {
      options.onLoaded(species);
      progress = { ...progress, loaded: progress.loaded + 1 };
    }
  }
}

export async function prefetchSpeciesCatalog(options: PrefetchOptions = {}): Promise<void> {
  const source = options.source ?? createPokeApiSource();
  const total = options.total ?? MAX_SPECIES_ID;
  const concurrency = options.concurrency ?? PREFETCH_CONCURRENCY;
  const onLoaded = options.onLoaded ?? ((species: Species) => mergeSpecies([species]));
  const next = { value: 1 };
  const workers = Array.from({ length: Math.max(1, concurrency) }, () =>
    worker(source, next, { total, onLoaded }),
  );
  await Promise.all(workers);
  progress = { loaded: progress.loaded, total, done: true };
}

export function startSpeciesPrefetch(options: PrefetchOptions = {}): void {
  if (prefetchStarted) return;
  prefetchStarted = true;
  void prefetchSpeciesCatalog(options).catch((error: unknown) => {
    if (error instanceof Error) {
      progress = { ...progress, done: true };
      return;
    }
    throw error;
  });
}
