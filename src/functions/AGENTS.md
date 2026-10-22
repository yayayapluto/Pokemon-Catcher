# src/functions/AGENTS.md: logika CRUD

Konteks untuk semua file di `src/functions/` dan `src/functions.ts`. Tipe ada di `src/types.ts`, konstanta di `src/constants.ts`.

## Aturan modul

- Hanya boleh import `data.ts`, `constants.ts`, `types.ts`, `utils/`, dan `functions/store.ts`. Sibling lain tidak boleh saling import.
- Tidak ada `console.*`, `chalk`, atau `@inquirer/prompts`.
- Validasi semua argumen di sini, jangan percaya UI. Id harus `Number.isInteger`. Jumlah (EXP, damage) harus bilangan bulat dan bukan `NaN`.
- Function yang **mengubah** data mengembalikan `Result<T>` (lihat `src/types.ts`). `message` berisi teks netral bahasa Indonesia untuk ditampilkan UI. Kegagalan wajar tidak melempar error, kembalikan `fail(message)`.
- Function yang **hanya membaca** mengembalikan data langsung dengan tipe read-only (`Pokemon`, `Pokemon[]`). Tidak boleh memutasi `pokemons`.
- `functions.ts` hanya berisi `export * from './functions/collection.ts'` dan seterusnya untuk lima file (collection, party, update, query, stats). `store.ts` **tidak** di-export.
- Mutasi `pokemons` dan `trainer` hanya in-place. Jangan reassign.

## functions/store.ts (internal)

Helper bersama supaya tidak ada circular import antar sibling:
- `findById(id: number): Pokemon | undefined`: mengembalikan entry yang bisa diubah, `undefined` jika id tidak valid atau tidak ada.
- `countParty(): number`.
- `isLastPartyMember(entry: Pokemon): boolean`.

## functions/collection.ts

- `buildPokemon(species: Species, level: number): NewPokemon`: murni, tidak menyentuh array. `level` dipaksa bilangan bulat dan di-clamp ke `MIN_LEVEL..MAX_LEVEL`. Mengembalikan objek tanpa `id` dan `inParty`, dengan `nickname: null`, `exp: 0`, `hp = maxHp`. Stat di-scale: `scaleStat(base) = Math.floor(base * (1 + level / STAT_SCALE_DIVISOR))`, berlaku untuk hp (jadi `maxHp`), attack, defense, speed.
- `catchPokemon(pokemon: NewPokemon): Result<Pokemon>` **(Create)**: beri `id` dari `trainer.nextId++`, set `inParty = countParty() < MAX_PARTY_SIZE`, push ke `pokemons`, `trainer.totalCaught++`. `data` = entry baru, `message` menyebut apakah masuk party atau PC box.
- `getAll(): Pokemon[]` **(Read)**: array baru `[...pokemons]`.
- `getById(id: number): Pokemon | undefined` **(Read)**.
- `releasePokemon(id: number): Result<Pokemon>` **(Delete)**: hapus dengan `splice`. Gagal jika id tidak ada, atau jika Pokémon itu adalah satu-satunya anggota party yang tersisa. `data` = salinan dangkal entry yang dilepas.

## functions/party.ts

- `getParty(): Pokemon[]` **(Read)**: filter `inParty === true`.
- `getBox(): Pokemon[]` **(Read)**: filter `inParty === false`.
- `moveToParty(id: number): Result<Pokemon>` **(Update)**: gagal jika party sudah `MAX_PARTY_SIZE`, id tidak ada, atau sudah di party.
- `moveToBox(id: number): Result<Pokemon>` **(Update)**: gagal jika id tidak ada, sudah di box, atau ini anggota party terakhir.

## functions/update.ts

- `setNickname(id: number, nickname: string): Result<Pokemon>` **(Update)**: trim. String kosong mengembalikan nickname ke `null`. Lebih dari `MAX_NICKNAME_LENGTH` karakter berarti gagal.
- `gainExp(id: number, amount: number): Result<{ levelsGained: number; newLevel: number }>` **(Update)**: `amount` harus bilangan bulat lebih dari 0. Tambah `exp`. Kebutuhan EXP level L adalah `L * EXP_PER_LEVEL`. Selama `exp >= L * EXP_PER_LEVEL` dan level < `MAX_LEVEL`: kurangi exp, level naik 1, dan `maxHp`, `attack`, `defense`, `speed` masing-masing naik `Math.max(1, Math.round(nilai * LEVEL_UP_STAT_GROWTH))`. `hp` bertambah sebesar kenaikan `maxHp`. Pada level `MAX_LEVEL`, exp tidak bertambah dan hasilnya tetap `ok` dengan `levelsGained: 0`.
- `applyDamage(id: number, amount: number): Result<{ hp: number; fainted: boolean }>` **(Update)**: `amount` bilangan bulat minimal 0. Kurangi `hp`, minimum 0.
- `healAll(): Result<{ healed: number }>` **(Update)**: `hp = maxHp` untuk semua Pokémon (party dan box). `healed` adalah jumlah entry yang HP-nya berubah.

## functions/query.ts

Tidak boleh memutasi `pokemons`. Semua mengembalikan array baru.

- `searchByName(keyword: string): Pokemon[]` **(Read)**: trim, cocok sebagian, case-insensitive, terhadap `name` atau `nickname`. Keyword kosong mengembalikan `[]`.
- `filterByType(type: PokemonType): Pokemon[]` **(Read)**: yang `types` mengandung type tersebut.
- `sortBy(key: SortKey, order: SortOrder = 'asc'): Pokemon[]` **(Read)**: salin dulu baru urutkan. `name` memakai `localeCompare`. Key tidak valid saat runtime (misalnya dari UI) mengembalikan `getAll()` apa adanya.

## functions/stats.ts

- `recordBattleResult(won: boolean): Result<null>` **(Update)**: `trainer.wins++` jika menang, `trainer.losses++` jika kalah.
- `getTrainerStats(): TrainerStats` **(Read)**, dengan tipe yang diekspor dari file ini:

```ts
export interface TrainerStats {
  name: string;
  totalCaught: number;
  currentOwned: number;
  partySize: number;
  boxSize: number;
  wins: number;
  losses: number;
  winRate: number;
  mostCommonType: PokemonType | null;
  highestLevel: Pokemon | null;
}
```

`winRate` dalam persen 0 sampai 100 (0 jika belum pernah battle). `mostCommonType` dihitung dari semua entry (`null` jika kosong). `highestLevel` adalah entry dengan level tertinggi (`null` jika kosong).

## functions/pokedex.ts

- `recordSpeciesSeen(species: SeenSpecies): Result<null>` **(Create)**: catat spesies yang ditemui di pertarungan liar. Menolak `speciesId` yang bukan integer positif. Id yang sudah tercatat tidak digandakan dan mengembalikan `ok`.
- `getPokedex(): PokedexEntry[]` **(Read)**, dengan tipe yang diekspor dari file ini:

```ts
export interface PokedexEntry {
  speciesId: number;
  name: string;
  types: PokemonType[];
  seen: boolean;
  caught: boolean;
  count: number;
}

export interface PokedexProgress {
  seen: number;
  caught: number;
  total: number;
}
```

Baris dibentuk dari gabungan kunci `speciesCatalog` (di `data.ts`), `trainer.seenSpecies`, dan `pokemons`, di-`Set`, lalu diurutkan naik per `speciesId`. Karena `speciesCatalog` berisi seluruh katalog hasil prefetch, Pokédex menampilkan semua spesies yang sudah dimuat. Nama diambil dari `speciesCatalog`; kalau id tidak ada di katalog, dipakai `name` dari `seenSpecies` (spesies di luar katalog tetap punya baris setelah ditemui), dan jika keduanya tidak ada dipakai placeholder `spesies #<id>`. `seen` dibaca dari `trainer.seenSpecies`, sedangkan `caught` dan `count` diturunkan dari `pokemons` (bukan disimpan terpisah).

`getPokedexProgress` memakai `MAX_SPECIES_ID` (1025) sebagai penyebut tetap, **bukan** jumlah baris yang sudah dimuat. Jadi angka `n/1025` tidak berubah mengikuti progres prefetch; ini memperbaiki bug lama di mana penyebut mengikuti jumlah entri.

`recordSpeciesSeen` tidak mengembalikan error untuk duplikat; hanya id yang tidak valid yang gagal. Pemanggilnya adalah `createBattle` di `battle/engine.ts`, memakai `Species` yang sudah tersedia di sana.

## Cakupan CRUD

Total 21 function ter-export dari `functions.ts`: Create (`catchPokemon`, `recordSpeciesSeen`), Read (`getAll`, `getById`, `getParty`, `getBox`, `searchByName`, `filterByType`, `sortBy`, `getTrainerStats`, `getPokedex`, `getPokedexProgress`, ditambah `buildPokemon` murni), Update (`moveToParty`, `moveToBox`, `setNickname`, `gainExp`, `applyDamage`, `healAll`, `recordBattleResult`), Delete (`releasePokemon`).
