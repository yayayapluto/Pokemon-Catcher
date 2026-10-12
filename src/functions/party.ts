import { MAX_PARTY_SIZE } from '../constants.ts';
import type { PokemonView, Result } from '../types.ts';
import { fail, ok } from '../utils/result.ts';
import { pokemons } from '../data.ts';
import { countParty, findById, isLastPartyMember } from './store.ts';

export function getParty(): readonly PokemonView[] {
  return pokemons.filter((entry) => entry.inParty);
}

export function getBox(): readonly PokemonView[] {
  return pokemons.filter((entry) => !entry.inParty);
}

export function moveToParty(id: number): Result<PokemonView> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  if (entry.inParty) return fail(`${entry.name} sudah ada di party.`);
  if (countParty() >= MAX_PARTY_SIZE) return fail('Party sudah penuh (maksimal 6).');
  entry.inParty = true;
  return ok(`${entry.name} dipindahkan ke party.`, entry);
}

export function moveToBox(id: number): Result<PokemonView> {
  const entry = findById(id);
  if (!entry) return fail(`Tidak ada Pokémon dengan id ${id}.`);
  if (!entry.inParty) return fail(`${entry.name} sudah ada di PC box.`);
  if (isLastPartyMember(entry)) return fail('Party tidak boleh kosong.');
  entry.inParty = false;
  return ok(`${entry.name} dipindahkan ke PC box.`, entry);
}
