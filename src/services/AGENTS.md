# src/services/AGENTS.md: integrasi PokeAPI

Konteks untuk `pokeapi.ts`. Ini satu-satunya tempat yang boleh memakai `pokenode-ts`.

## Aturan modul

- Boleh import `data.ts` (`fallbackSpecies`, `speciesCatalog`, `mergeSpecies`), `constants.ts`, `types.ts`, `utils/`, dan `pokenode-ts`. Tidak boleh import `ui/`, `battle/`, atau `functions/`.
- Tidak mencetak apa pun.
- Respons API adalah data tidak tepercaya. Validasi dan persempit tipenya di sini, jangan teruskan bentuk mentah ke lapisan lain.
- Tipe dari `pokenode-ts` diimpor dengan alias supaya tidak bentrok dengan tipe sendiri: `import type { Pokemon as ApiPokemon, PokemonSpecies as ApiSpecies } from 'pokenode-ts'`.

## Bentuk modul

```ts
export interface SpeciesSource {
  fetchSpecies(speciesId: number): Promise<Species>;
}

export interface RandomSpeciesOptions {
  source?: SpeciesSource;
  rng?: Rng;
  timeoutMs?: number;
}

export function createPokeApiSource(): SpeciesSource;
export function mapToSpecies(pokemon: ApiPokemon, species: ApiSpecies): Species;
export function isPokemonType(value: string): value is PokemonType;
export interface PrefetchOptions {
  source?: SpeciesSource;
  total?: number;
  concurrency?: number;
  onLoaded?: (species: Species) => void;
}

export interface PrefetchProgress {
  loaded: number;
  total: number;
  done: boolean;
}

export async function getRandomSpecies(options?: RandomSpeciesOptions): Promise<Species>;
export async function prefetchSpeciesCatalog(options?: PrefetchOptions): Promise<void>;
export function startSpeciesPrefetch(options?: PrefetchOptions): void;
export function getPrefetchProgress(): PrefetchProgress;
export function resetPrefetchProgress(): void;
```

- `createPokeApiSource()`: membuat `PokemonClient` dan mengimplementasikan `fetchSpecies` dengan `getPokemonById` dan `getPokemonSpeciesById` (dipanggil paralel dengan `Promise.all`), lalu memetakan lewat `mapToSpecies`. Client dibuat di dalam function ini, bukan di level modul, supaya import modul tidak punya efek samping.
- `mapToSpecies(pokemon, species)`: murni.
  - `name` dari `pokemon.name`.
  - `types` dari `pokemon.types[].type.name`, disaring dengan `isPokemonType`. Jika hasilnya kosong, lempar `Error`.
  - `baseStats` dari `pokemon.stats[]`, cocokkan `stat.name` dengan `hp`, `attack`, `defense`, `speed`. Jika ada yang tidak ditemukan atau bukan angka valid, lempar `Error`.
  - `captureRate` dari `species.capture_rate`, harus angka valid di `0..255`, jika tidak lempar `Error`.
  - `speciesId` dari `pokemon.id`.
- `isPokemonType(value)`: type guard terhadap `POKEMON_TYPES`.
- `getRandomSpecies(options)`:
  - Jika `options.source` **tidak** diberikan dan `speciesCatalog` sudah berisi (prefetch/seeding), ambil acak dari katalog dengan `randomChoice`. Katalog dianggap sumber paling murah dan selalu tersedia lebih dulu.
  - Jika `options.source` diberikan eksplisit, jalur jaringan selalu dipakai (dibungkus `withTimeout`, default `API_TIMEOUT_MS`) walaupun katalog terisi, supaya test dapat menguji jalur jaringan.
  - Jika katalog kosong dan tidak ada `source`, jatuh ke fetch acak id `1..MAX_SPECIES_ID`.
  - **Tidak boleh pernah menolak (reject).** Gagal atau timeout kembalikan `randomChoice(fallbackSpecies, rng)`.
  - `catch` hanya menangkap error dari jalur jaringan dan pemetaan. Persempit `unknown` sebelum dipakai. Bug lain tidak ditelan diam-diam.
  - Program tidak boleh crash karena internet.

## Prefetch katalog

Prefetch memuat seluruh National Dex ke `speciesCatalog` (di `data.ts`) di latar belakang saat game start.

- `PrefetchOptions`: `source?`, `total?`, `concurrency?`, `onLoaded?`. Semua opsional dan punya default, sehingga `startSpeciesPrefetch()` tanpa argumen langsung berjalan di produksi.
- `fetchOne(source, id)`: bungkus `withTimeout`. **Mengembalikan `null` saat gagal**, tidak pernah melempar. Ini yang membuat satu id rusak tidak menggagalkan prefetch.
- `worker(...)`: menarik id dari kursor bersama `{ value }` secara monoton. Kursor bersama, bukan pembagian rentang, supaya worker cepat tidak menganggur menunggu worker lambat.
- `prefetchSpeciesCatalog(options)`: jalankan `PREFETCH_CONCURRENCY` worker paralel, tunggu `Promise.all`, lalu tandai `done`. Default `onLoaded` memanggil `mergeSpecies([species])`.
- `startSpeciesPrefetch(options)`: fire-and-forget. **Mengembalikan `void` dan tidak pernah di-`await`.** Dijaga flag modul `prefetchStarted` supaya idempoten, dan `.catch()`-nya hanya menandai `done` untuk error tak terduga. Karena tidak di-`await`, menu starter tampil seketika (terbukti ~2 ms).
- `getPrefetchProgress()` / `resetPrefetchProgress()`: baca/atur `{ loaded, total, done }`. UI memakainya untuk status berputar; `resetPrefetchProgress()` hanya untuk test.
- Batas `PREFETCH_CONCURRENCY` (12) ada supaya ~2050 permintaan HTTP tidak kena rate limit PokeAPI. Jika id gagal karena rate limit, id itu dilewati; game tetap jalan dengan katalog parsial.

## Testing

Jalur normal, gagal, dan timeout dites dengan `SpeciesSource` palsu lewat `options.source`, tanpa jaringan. `mapToSpecies` dites dengan objek API buatan tangan, termasuk kasus type tidak dikenal dan stat hilang. Detail di `tests/AGENTS.md`.

## save.ts: slot penyimpanan

Satu-satunya modul yang menyentuh disk. Memakai `node:fs` dan `node:path` (builtin Node, bukan dependency).

- Tiga slot (`SlotId = 1 | 2 | 3`) di `saves/slot-N.json`, folder dari `SAVE_DIR` di `constants.ts` (relatif, di-`.gitignore`).
- Bentuk payload: `{ version, trainer, pokemons }`. `version` dibandingkan dengan `SAVE_VERSION`; file versi lain ditolak, bukan diparse setengah.
- **Data dari disk adalah data tidak tepercaya.** Setiap field dicek manual dengan `typeof`, `Array.isArray`, dan `numberField` sebelum menyentuh `pokemons`. Type harus ada di `POKEMON_TYPES`. `parsePayload` mengembalikan `null` untuk data rusak, tidak pernah melempar.
- `loadSlot` hanya menyentuh `pokemons`/`trainer` setelah payload dinyatakan valid, jadi file rusak tidak menghapus koleksi yang sedang aktif. `pokemons` dimutasi in-place (`length = 0` lalu `push`), tidak pernah di-reassign.
- `describeSlot` dipakai UI untuk label slot: `kosong`, `file rusak`, atau ringkasan (`2 Pokémon · 1 di tim · tertinggi Lv5 · menang 0 · kalah 0`).
- Boleh import `data.ts`, `constants.ts`, `types.ts`, `utils/`, `node:fs`, `node:path`. Tidak boleh import `ui/`, `battle/`, `functions/`, dan tidak mencetak apa pun.

Function yang diekspor: `describeSlot`, `loadSlot`, `saveSlot`, `deleteSlot`, `isCatalogLoaded`, `SLOT_IDS`.
