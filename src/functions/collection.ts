import { pokemons, trainer } from '../data.ts';
import {
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MIN_LEVEL,
  STARTING_LEVEL,
  STAT_SCALE_DIVISOR,
} from '../constants.ts';
import type { NewPokemon, Pokemon, PokemonView, Result, Species } from '../types.ts';
import { clamp } from '../utils/math.ts';
import { fail, ok } from '../utils/result.ts';
import { countParty, findById } from './store.ts';

function scaleStat(base: number, level: number): number {
  return Math.floor(base * (1 + level / STAT_SCALE_DIVISOR));
}

export function buildPokemon(species: Species, level: number): NewPokemon {
  const safeLevel = Number.isFinite(level)
    ? clamp(Math.floor(level), MIN_LEVEL, MAX_LEVEL)
    : STARTING_LEVEL;
  const maxHp = scaleStat(species.baseStats.hp, safeLevel);
  return {
    speciesId: species.speciesId,
    name: species.name,
    nickname: null,
    level: safeLevel,
    exp: 0,
    types: [...species.types],
    hp: maxHp,
    maxHp,
    attack: scaleStat(species.baseStats.attack, safeLevel),
    defense: scaleStat(species.baseStats.defense, safeLevel),
    speed: scaleStat(species.baseStats.speed, safeLevel),
  };
}

export function catchPokemon(pokemon: NewPokemon): Result<Pokemon> {
  const id = trainer.nextId;
  trainer.nextId += 1;
  const inParty = countParty() < MAX_PARTY_SIZE;
  const entry: Pokemon = { ...pokemon, id, inParty };
  pokemons.push(entry);
  trainer.totalCaught += 1;
  const place = inParty ? 'party' : 'PC box';
  return ok(`${entry.name} ditangkap dan masuk ${place}!`, entry);
}

export function getAll(): readonly PokemonView[] {
  return [...pokemons];
}

export function getById(id: number): PokemonView | undefined {
  return findById(id);
}

export function releasePokemon(id: number): Result<PokemonView> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  if (entry.inParty && countParty() <= 1) {
    return fail('Tidak bisa melepas satu-satunya Pokémon di party.');
  }
  const index = pokemons.indexOf(entry);
  const [removed] = pokemons.splice(index, 1);
  const snapshot = removed ?? entry;
  return ok(`${snapshot.name} dilepas kembali ke alam liar.`, { ...snapshot });
}
