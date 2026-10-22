# src/AGENTS.md: tipe, konstanta, data, main, utils

Konteks untuk `types.ts`, `constants.ts`, `data.ts`, `main.ts`, dan `utils/`. Aturan lintas modul ada di `AGENTS.md` root.

## constants.ts

Tidak mengimpor apa pun. Semua angka dan daftar nilai game ada di sini.

```ts
import type { PokemonType } from './types.ts';

// Urutan ini = urutan tampil di menu filter.
export const POKEMON_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

export const MAX_PARTY_SIZE = 6;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;
export const STARTING_LEVEL = 5;
export const MAX_NICKNAME_LENGTH = 12;

export const MAX_SPECIES_ID = 1025;
export const API_TIMEOUT_MS = 5000;
export const PREFETCH_CONCURRENCY = 12;
export const POKEDEX_PAGE_SIZE = 40;
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export const SPINNER_INTERVAL_MS = 100;

export const STAT_SCALE_DIVISOR = 20;
export const EXP_PER_LEVEL = 20;
export const LEVEL_UP_STAT_GROWTH = 0.05;

export const MIN_WILD_LEVEL = 2;
export const WILD_LEVEL_SPREAD = 2;
export const DAMAGE_POWER = 100;

export const TYPE_CHART: Record<PokemonTypeName, Partial<Record<PokemonTypeName, number>>>;
export const TYPE_EFFECTIVE_LABELS = { immune, weak, neutral, strong };
export const TYPE_EFFECTIVE_SYMBOLS = { immune: '×0', weak: '×½', neutral: '', strong: '×2' };
```

Tambah konstanta lain (batas peluang tangkap dan kabur, faktor EXP) di file ini, bukan di tengah function.

`TYPE_CHART` adalah tabel efektivitas type resmi Pokémon (18×18), ditulis sebagai `TYPE_CHART_ROWS: Record<PokemonType, Partial<Record<PokemonType, number>>>` supaya kompiler memastikan setiap type punya baris. Hanya matchup yang **bukan** 1× yang ditulis; type yang tidak ada di baris berarti 1×. Barisnya dipakai `effectiveness` di `battle/damage.ts`. Angka 0, 0.5, dan 2 tidak ditulis langsung melainkan lewat konstanta lokal `CHART_IMMUNE` / `CHART_NOT_VERY` / `CHART_SUPER` supaya maksudnya terbaca.

`TYPE_EFFECTIVE_LABELS` dipakai engine untuk pesan serangan; `TYPE_EFFECTIVE_SYMBOLS` dan `TYPE_EFFECTIVE_LABELS` dipakai `ui/theme.ts` untuk indikator. `constants.ts` boleh `import type` dari `types.ts` untuk mengetik `POKEMON_TYPES`, `TYPE_COLORS`, dan `TYPE_CHART_ROWS`; arah import sebaliknya dilarang.

## types.ts

Semua tipe domain ada di sini. `types.ts` tidak mengimpor apa pun (tanpa import melingkar dengan `constants.ts`).

```ts
export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export type SortKey = 'level' | 'name' | 'hp' | 'attack' | 'defense' | 'speed';
export type SortOrder = 'asc' | 'desc';

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Species {
  speciesId: number;
  name: string;
  types: PokemonType[];
  baseStats: BaseStats;
  captureRate: number;
}

export interface Pokemon {
  id: number;
  speciesId: number;
  name: string;
  nickname: string | null;
  level: number;
  exp: number;
  types: PokemonType[];
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  inParty: boolean;
}

export type NewPokemon = Omit<Pokemon, 'id' | 'inParty'>;

export interface Trainer {
  name: string;
  nextId: number;
  totalCaught: number;
  wins: number;
  losses: number;
  seenSpecies: SeenSpecies[];
}

export interface SeenSpecies {
  speciesId: number;
  name: string;
  types: PokemonType[];
}

export type Result<T> =
  | { ok: true; message: string; data: T }
  | { ok: false; message: string };
```

Catatan:
- `Pokemon` punya tepat 13 field dan bersifat mutable. Function Read mengembalikan salinan baru.
- `types` berisi 1 atau 2 type. Nilai dari luar yang bukan salah satu dari 18 type resmi harus disaring di `services/`.
- Tipe khusus battle (`BattleState`, `BattleEvent`, `Outcome`) ada di `battle/engine.ts`.
- `SeenSpecies` menyimpan bentuk ringkas spesies yang ditemui di pertarungan liar. Menyimpan `name` dan `types` (bukan hanya id) karena spesies liar bisa punya id di luar `speciesCatalog` (misalnya saat data PokeAPI gagal dimuat), jadi Pokédex tidak bisa menampilkan namanya kalau yang disimpan hanya id. Lihat `functions/pokedex.ts`.

## Skema data

Penyimpanan utama adalah satu array `pokemons` di `data.ts`. Party dan PC box dibedakan dengan flag `inParty`, bukan dua array.

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number | ID unik instance di koleksi. Diambil dari `trainer.nextId` lalu di-increment. Tidak pernah dipakai ulang. |
| `speciesId` | number | ID spesies di PokeAPI. |
| `name` | string | Nama spesies (lowercase). |
| `nickname` | string \| null | Nama panggilan. `null` berarti pakai `name`. |
| `level` | number | 1 sampai 100. |
| `exp` | number | EXP menuju level berikutnya. Direset ke sisa saat naik level. |
| `types` | PokemonType[] | 1 atau 2 type. |
| `hp` / `maxHp` | number | HP saat ini dan maksimum. `hp` tidak boleh di bawah 0 atau di atas `maxHp`. |
| `attack`, `defense`, `speed` | number | Stat yang sudah di-scale sesuai level. |
| `inParty` | boolean | `true` di tim aktif, `false` di PC box. |

## data.ts

```ts
import type { Pokemon, Species, Trainer } from './types.ts';

export const pokemons: Pokemon[] = [];

export const trainer: Trainer = { name: 'Trainer', nextId: 1, totalCaught: 0, wins: 0, losses: 0, seenSpecies: [] };

export const fallbackSpecies: Species[] = [ /* tabel di bawah */ ];

export const speciesCatalog = new Map<number, Species>();

export function mergeSpecies(entries: Species[]): void { /* set tiap entri ke speciesCatalog */ }

export function resetData(): void { /* kosongkan pokemons in-place, kembalikan trainer, kosongkan speciesCatalog lalu isi ulang dari fallbackSpecies */ }
```

- `pokemons`: array kosong di awal. **Jangan pernah di-reassign**, hanya dimutasi, karena binding export bersifat read-only bagi importer.
- `resetData()` hanya untuk test. Isinya `pokemons.length = 0`, `Object.assign(trainer, nilaiAwal)`, `trainer.seenSpecies = []` (array-nya diganti, bukan dimutasi, supaya referensi lama tidak bocor antar test), `speciesCatalog.clear()`, lalu `mergeSpecies(fallbackSpecies)`. Di akhir modul ada pemanggilan `mergeSpecies(fallbackSpecies)` supaya katalog selalu terisi saat modul dimuat. Nilai awal disimpan di konstanta yang tidak diekspor.
- `speciesCatalog`: katalog spesies yang dipakai Pokédex dan pencarian encounter. Diisi dari `fallbackSpecies` saat modul dimuat, lalu diperkaya oleh prefetch PokeAPI lewat `mergeSpecies`. Ini satu-satunya tempat daftar spesies yang diketahui hidup; `functions/` **tidak boleh** import `services/` (aturan §6), jadi penulisan ke katalog selalu lewat `mergeSpecies` di file ini.
- `MAX_SPECIES_ID` = 1025 (seluruh National Dex) adalah penyebut tetap Pokédex dan batas atas id encounter liar.
- `fallbackSpecies` ditulis persis seperti tabel ini, dengan `types` bertipe `PokemonType[]` (tipe `Species[]`, tanpa `satisfies`):

| speciesId | name | types | hp | attack | defense | speed | captureRate |
|---|---|---|---|---|---|---|---|
| 1 | bulbasaur | grass, poison | 45 | 49 | 49 | 45 | 45 |
| 4 | charmander | fire | 39 | 52 | 43 | 65 | 45 |
| 7 | squirtle | water | 44 | 48 | 65 | 43 | 45 |
| 16 | pidgey | normal, flying | 40 | 45 | 40 | 56 | 255 |
| 19 | rattata | normal | 30 | 56 | 35 | 72 | 255 |
| 25 | pikachu | electric | 35 | 55 | 40 | 90 | 190 |
| 74 | geodude | rock, ground | 40 | 80 | 100 | 20 | 255 |
| 133 | eevee | normal | 55 | 55 | 50 | 55 | 45 |

## main.ts

Hanya routing menu ke screen dan inisialisasi starter. Tidak ada logika game.

1. Jika `pokemons` kosong, tampilkan pilihan starter (bulbasaur, charmander, squirtle dari `fallbackSpecies`), buat level `STARTING_LEVEL` lewat `buildPokemon` + `catchPokemon`.
2. Loop menu utama: Explore, Tim & PC Box, Koleksi, Heal, Statistik, Keluar. Heal memanggil `healAll()` dan menampilkan `message`.
3. Bungkus semua dalam satu `try/catch` di tingkat teratas:
   - `isExitPromptError(error)` (dari `ui/prompts.ts`) berarti Ctrl+C: tampilkan pesan perpisahan, keluar tanpa stack trace.
   - Error lain: tampilkan pesan singkat bahasa Indonesia, set `process.exitCode = 1`.
4. Entry point dipanggil dengan `await` di tingkat modul atau `main().catch(...)`, tidak ada floating promise.

## utils/

Semua function murni dan kecil. Tidak ada output terminal.

- `random.ts`
  - `export type Rng = () => number;` (mengembalikan nilai di `[0, 1)`).
  - `randomInt(min: number, max: number, rng: Rng = Math.random): number`: bilangan bulat inklusif di `[min, max]`.
  - `randomChoice<T>(items: T[], rng: Rng = Math.random): T`: melempar `RangeError` jika `items` kosong (bug programmer).
  - `chance(probability: number, rng: Rng = Math.random): boolean`: `rng() < probability`.
- `math.ts`: `clamp(value: number, min: number, max: number): number`.
- `result.ts`: `ok<T>(message: string, data: T): Result<T>`, `okNull(message: string): Result<null>`, dan `fail(message: string): Result<never>` (memungkinkan narrowing tanpa overload).
- `async.ts`: `withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>`. Menolak dengan `Error` bernama `TimeoutError` jika lewat batas. Timer wajib dibersihkan di `finally`.
- `assert.ts`: `assertNever(value: never): never`, melempar `Error` untuk pengecekan exhaustive.
