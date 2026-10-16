import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POKEMON_TYPES, SAVE_DIR, SAVE_VERSION } from '../constants.ts';
import { pokemons, speciesCatalog, trainer } from '../data.ts';
import type { Pokemon, PokemonType, SeenSpecies, Trainer } from '../types.ts';
import { asRecord } from '../utils/assert.ts';

export type SlotId = 1 | 2 | 3;

export const SLOT_IDS: readonly SlotId[] = [1, 2, 3];

export interface SlotInfo {
  readonly slot: SlotId;
  readonly exists: boolean;
  readonly summary: string;
}

interface SavePayload {
  readonly version: number;
  readonly trainer: Trainer;
  readonly pokemons: Pokemon[];
}

function savePath(slot: SlotId): string {
  return join(SAVE_DIR, `slot-${slot}.json`);
}

function parseTypes(value: unknown): readonly PokemonType[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const types: PokemonType[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    if (!(POKEMON_TYPES as readonly string[]).includes(entry)) return null;
    types.push(entry as PokemonType);
  }
  return types;
}

function numberField(fields: Record<string, unknown>, key: string): number | null {
  const value = fields[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parsePokemon(value: unknown): Pokemon | null {
  const fields = asRecord(value);
  if (fields === null) return null;
  const types = parseTypes(fields.types);
  if (types === null || typeof fields.name !== 'string') return null;
  if (typeof fields.inParty !== 'boolean') return null;
  if (fields.nickname !== null && typeof fields.nickname !== 'string') return null;
  const id = numberField(fields, 'id');
  const speciesId = numberField(fields, 'speciesId');
  const level = numberField(fields, 'level');
  const exp = numberField(fields, 'exp');
  const hp = numberField(fields, 'hp');
  const maxHp = numberField(fields, 'maxHp');
  const attack = numberField(fields, 'attack');
  const defense = numberField(fields, 'defense');
  const speed = numberField(fields, 'speed');
  if (
    id === null ||
    speciesId === null ||
    level === null ||
    exp === null ||
    hp === null ||
    maxHp === null ||
    attack === null ||
    defense === null ||
    speed === null
  ) {
    return null;
  }
  return {
    id,
    speciesId,
    name: fields.name,
    nickname: fields.nickname,
    level,
    exp,
    types,
    hp,
    maxHp,
    attack,
    defense,
    speed,
    inParty: fields.inParty,
  };
}

function parseSeenSpecies(value: unknown): SeenSpecies | null {
  const fields = asRecord(value);
  if (fields === null) return null;
  const types = parseTypes(fields.types);
  if (types === null) return null;
  const speciesId = numberField(fields, 'speciesId');
  if (speciesId === null || typeof fields.name !== 'string') return null;
  return { speciesId, name: fields.name, types };
}

function parseTrainer(value: unknown): Trainer | null {
  const fields = asRecord(value);
  if (fields === null) return null;
  if (typeof fields.name !== 'string') return null;
  const nextId = numberField(fields, 'nextId');
  const totalCaught = numberField(fields, 'totalCaught');
  const wins = numberField(fields, 'wins');
  const losses = numberField(fields, 'losses');
  if (nextId === null || totalCaught === null || wins === null || losses === null) return null;
  if (!Array.isArray(fields.seenSpecies)) return null;
  const seenSpecies: SeenSpecies[] = [];
  for (const entry of fields.seenSpecies) {
    const parsed = parseSeenSpecies(entry);
    if (parsed === null) return null;
    seenSpecies.push(parsed);
  }
  return { name: fields.name, nextId, totalCaught, wins, losses, seenSpecies };
}

function parsePayload(text: string): SavePayload | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const fields = asRecord(raw);
  if (fields === null || fields.version !== SAVE_VERSION) return null;
  const parsedTrainer = parseTrainer(fields.trainer);
  if (parsedTrainer === null || !Array.isArray(fields.pokemons)) return null;
  const parsedPokemons: Pokemon[] = [];
  for (const entry of fields.pokemons) {
    const parsed = parsePokemon(entry);
    if (parsed === null) return null;
    parsedPokemons.push(parsed);
  }
  return { version: SAVE_VERSION, trainer: parsedTrainer, pokemons: parsedPokemons };
}

export function describeSlot(slot: SlotId): SlotInfo {
  const path = savePath(slot);
  if (!existsSync(path)) return { slot, exists: false, summary: 'kosong' };
  const payload = parsePayload(readFileSync(path, 'utf8'));
  if (payload === null) return { slot, exists: false, summary: 'file rusak' };
  if (payload.pokemons.length === 0) {
    return { slot, exists: true, summary: 'starter belum dipilih' };
  }
  const party = payload.pokemons.filter((entry) => entry.inParty).length;
  const top = Math.max(...payload.pokemons.map((entry) => entry.level));
  const { wins, losses } = payload.trainer;
  return {
    slot,
    exists: true,
    summary: `${payload.pokemons.length} Pokémon · ${party} di tim · tertinggi Lv${top} · menang ${wins} · kalah ${losses}`,
  };
}

export function loadSlot(slot: SlotId): boolean {
  const path = savePath(slot);
  if (!existsSync(path)) return false;
  const payload = parsePayload(readFileSync(path, 'utf8'));
  if (payload === null) return false;
  pokemons.length = 0;
  pokemons.push(...payload.pokemons);
  Object.assign(trainer, payload.trainer);
  trainer.seenSpecies = [...payload.trainer.seenSpecies];
  return true;
}

export function saveSlot(slot: SlotId): boolean {
  mkdirSync(SAVE_DIR, { recursive: true });
  const payload: SavePayload = { version: SAVE_VERSION, trainer, pokemons: [...pokemons] };
  try {
    writeFileSync(savePath(slot), JSON.stringify(payload, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(slot: SlotId): boolean {
  const path = savePath(slot);
  if (!existsSync(path)) return false;
  try {
    rmSync(path);
    return true;
  } catch {
    return false;
  }
}

export function isCatalogLoaded(): boolean {
  return speciesCatalog.size > 0;
}
