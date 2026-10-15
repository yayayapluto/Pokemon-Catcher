# Pokémon Catcher

**Muhammad Farras Ashshiddiqi - 2610511057**

Pokémon Catcher adalah game berbasis terminal (TUI) yang dibangun dengan Bun dan TypeScript. Pemain menjelajah untuk mencari Pokémon liar, bertarung secara turn-based, lalu menangkapnya. Seluruh koleksi disimpan dalam satu array of object di memori dan dikelola lewat operasi CRUD. Sebagian besar data spesies diambil dari PokeAPI, tetapi game tetap bisa dimainkan saat offline berkat data fallback.

---

## Cara Menjalankan

Kebutuhan: [Bun](https://bun.sh) versi stabil terbaru. Tidak perlu Node.js atau npm.

```bash
bun install     # pasang dependency
bun start       # jalankan game
```

### Alternatif tanpa mengetik perintah

Windows: klik dua kali `start.bat`.

Linux/macOS/Git Bash: `./start.sh`.

Kedua launcher memasang dependency otomatis kalau `node_modules` belum ada, lalu menjalankan game.

### Build jadi file exe mandiri (opsional)

```bash
bun run build   # menghasilkan pokemon-catcher.exe
```

Hasilnya satu file `pokemon-catcher.exe` yang bisa dijalankan langsung tanpa Bun terpasang. File ini artefak build, sudah masuk `.gitignore`, dan tidak perlu ikut ke zip pengumpulan.

Script lain:

```bash
bun run typecheck   # cek tipe (tsc --noEmit)
bun run lint        # Biome check
bun run format      # Biome auto-format
bun test            # jalankan test
bun run check       # typecheck + lint + test (satu perintah)
bun run build       # compile ke pokemon-catcher.exe
```

Game mengambil data spesies dari PokeAPI. Saat start, game langsung menembak **prefetch** seluruh National Dex (1025 spesies) di latar belakang dengan worker pool 12 concurrent; menu tetap responsif dan ada indikator berputar `⠋ memuat N/1025 spesies...` di bawah menu selama proses berjalan. Jika internet mati atau permintaan gagal/timeout, tiap permintaan gagal dilewati diam-diam dan game memakai data `fallbackSpecies` (8 Pokémon) sehingga tetap bisa dimainkan. Tekan `Ctrl+C` kapan saja untuk keluar dengan rapi.

---

## Gambaran Umum File

```
pokemon-catcher/
├── package.json          # metadata, script, dependency
├── tsconfig.json         # konfigurasi TypeScript strict
├── biome.json            # konfigurasi lint dan format
├── .gitignore            # mengabaikan node_modules, *.zip
├── bun.lock              # lockfile Bun
├── README.md             # dokumen ini
├── AGENTS.md             # aturan proyek (format tugas)
├── start.sh              # launcher Linux/macOS/Git Bash (panggil bun run src/main.ts)
├── start.bat             # launcher Windows
├── src/
│   ├── main.ts           # entry point: routing menu dan inisialisasi starter
│   ├── data.ts           # array pokemons, objek trainer, speciesCatalog, fallbackSpecies, mergeSpecies, resetData
│   ├── types.ts          # semua tipe domain
│   ├── constants.ts      # konstanta game (tipe, rumus, batas, warna)
│   ├── functions.ts      # barrel: re-export CRUD dari functions/
│   ├── functions/        # logika CRUD murni (tanpa output terminal)
│   │   ├── store.ts      # helper internal bersama (tidak di-re-export)
│   │   ├── collection.ts # create/read/delete Pokémon
│   │   ├── party.ts      # party dan PC box
│   │   ├── update.ts     # update nickname, EXP, HP, heal
│   │   ├── query.ts      # search, filter, sort
│   │   ├── stats.ts      # statistik trainer
│   │   └── pokedex.ts    # daftar spesies terlihat dan tertangkap
│   ├── services/
│   │   └── pokeapi.ts    # wrapper pokenode-ts + fallback offline
│   ├── battle/
│   │   ├── engine.ts     # state battle dan aksi per giliran
│   │   ├── damage.ts     # rumus damage + efektivitas type
│   │   └── catch.ts      # rumus peluang tangkap dan kabur
│   ├── ui/               # satu-satunya lapisan (bersama main.ts) yang mencetak ke terminal
│   │   ├── theme.ts      # warna chalk, glyph tipe, panel, bar HP, dan art momen besar
│   │   ├── art.ts        # data art ASCII (win, lose, caught, rare-caught)
│   │   ├── frame.ts      # sesi layar dan gambar ulang penuh tiap frame
│   │   ├── prompts.ts    # menu panah dan input teks berbasis readline
│   │   └── screens/      # explore, party, pokedex, collection, stats
│   └── utils/            # utility murni (random, math, result, async, assert)
└── tests/                # test dengan bun:test
    ├── helpers.ts
    ├── functions.test.ts
    ├── battle.test.ts
    ├── pokeapi.test.ts
    ├── prompts.test.ts
    ├── pokedex.test.ts
    ├── theme.test.ts
    └── architecture.test.ts
```

Catatan: `data.ts`, `functions.ts`, dan `main.ts` adalah padanan TypeScript dari `data.js`, `functions.js`, dan `main.js` yang diminta pada tugas.

### Aturan dependensi antar modul

| Modul | Boleh import | Tidak boleh |
|---|---|---|
| `constants.ts` | — | semuanya |
| `types.ts` | `constants.ts` (hanya `import type`) | selain itu |
| `utils/*` | `constants.ts`, `types.ts`, sesama `utils/` | lapisan lain |
| `data.ts` | `constants.ts`, `types.ts` | lapisan lain |
| `functions/*` | `data.ts`, `constants.ts`, `types.ts`, `utils/`, `functions/store.ts` | `ui/`, `battle/`, `services/`, `chalk`, `@inquirer/prompts`, sibling selain `store.ts` |
| `battle/*` | `functions.ts`, `constants.ts`, `types.ts`, `utils/` | `ui/`, `services/`, `data.ts` langsung |
| `services/*` | `data.ts`, `constants.ts`, `types.ts`, `utils/`, `pokenode-ts` | `ui/`, `battle/`, `functions/` |
| `ui/*` | semua lapisan lain | memanggil `@inquirer/prompts` langsung dari `screens/*` |
| `main.ts` | `ui/`, `functions.ts`, `data.ts` | logika game |

Aturan ini ditegakkan otomatis oleh `tests/architecture.test.ts`.

---

## Format Data

Koleksi Pokémon disimpan dalam array `pokemons` di `src/data.ts`. Party dan PC box dibedakan lewat flag `inParty`, bukan dua array terpisah.

### Objek Pokémon (13 field)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number | ID unik instance di koleksi. Diambil dari `trainer.nextId` lalu di-increment. Tidak pernah dipakai ulang. |
| `speciesId` | number | ID spesies di PokeAPI. |
| `name` | string | Nama spesies (lowercase). |
| `nickname` | string \| null | Nama panggilan. `null` berarti pakai `name`. |
| `level` | number | 1 sampai 100. |
| `exp` | number | EXP menuju level berikutnya. |
| `types` | PokemonType[] | 1 atau 2 type dari 18 type resmi. |
| `hp` | number | HP saat ini (0 sampai `maxHp`). |
| `maxHp` | number | HP maksimum. |
| `attack` | number | Stat attack yang sudah di-scale sesuai level. |
| `defense` | number | Stat defense yang sudah di-scale sesuai level. |
| `speed` | number | Stat speed yang sudah di-scale sesuai level. |
| `inParty` | boolean | `true` di tim aktif, `false` di PC box. |

### Objek trainer

| Field | Tipe | Keterangan |
|---|---|---|
| `name` | string | Nama trainer. |
| `nextId` | number | ID berikutnya yang akan diberikan ke Pokémon baru. |
| `totalCaught` | number | Total Pokémon yang pernah ditangkap. |
| `wins` | number | Jumlah pertarungan yang dimenangkan. |
| `losses` | number | Jumlah pertarungan yang kalah. |
| `seenSpecies` | `SeenSpecies[]` | Spesies yang pernah ditemui di pertarungan liar, berisi `speciesId`, `name`, `types`. |

### Bentuk species

`Species` (dari PokeAPI atau `fallbackSpecies`) berisi `speciesId`, `name`, `types`, `baseStats` (`hp`, `attack`, `defense`, `speed`), dan `captureRate` (0–255).

### Tipe `Result`

Operasi yang bisa gagal mengembalikan `Result<T>`:

```ts
type Result<T = null> =
  | { readonly ok: true; readonly message: string; readonly data: T }
  | { readonly ok: false; readonly message: string };
```

`ok: true` membawa `data`; `ok: false` tidak. Selalu periksa `result.ok` sebelum memakai `result.data`. Kegagalan wajar (id tidak ada, party penuh, input salah) dikembalikan sebagai `Result`, bukan exception.

---

## Penjelasan Function

### `src/functions/collection.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `buildPokemon` | `species: Species`, `level: number` | `NewPokemon` | Murni, tidak menyentuh array. Level di-clamp ke 1–100, stat di-scale sesuai level, `hp = maxHp`. | — |
| `catchPokemon` | `pokemon: NewPokemon` | `Result<Pokemon>` | Beri `id`, tentukan party/box, push ke array, naikkan `totalCaught`. | **Create** |
| `getAll` | — | `readonly PokemonView[]` | Salinan seluruh koleksi. | **Read** |
| `getById` | `id: number` | `PokemonView \| undefined` | Cari berdasarkan id. | **Read** |
| `releasePokemon` | `id: number` | `Result<PokemonView>` | Hapus dari array. Gagal jika id tidak ada atau anggota party terakhir. | **Delete** |

### `src/functions/party.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `getParty` | — | `readonly PokemonView[]` | Filter `inParty === true`. | **Read** |
| `getBox` | — | `readonly PokemonView[]` | Filter `inParty === false`. | **Read** |
| `moveToParty` | `id: number` | `Result<PokemonView>` | Gagal jika party penuh, id tidak ada, atau sudah di party. | **Update** |
| `moveToBox` | `id: number` | `Result<PokemonView>` | Gagal jika id tidak ada, sudah di box, atau anggota party terakhir. | **Update** |

### `src/functions/update.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `setNickname` | `id: number`, `nickname: string` | `Result<PokemonView>` | Trim; string kosong → `null`; lebih dari 12 karakter gagal. | **Update** |
| `gainExp` | `id: number`, `amount: number` | `Result<{ levelsGained; newLevel }>` | Tambah EXP, naik level (bisa berkali-kali), stat bertambah, berhenti di level 100. | **Update** |
| `applyDamage` | `id: number`, `amount: number` | `Result<{ hp; fainted }>` | Kurangi HP, minimum 0; laporkan pingsan. | **Update** |
| `healAll` | — | `Result<{ healed }>` | Pulihkan HP seluruh Pokémon (party dan box). | **Update** |

### `src/functions/query.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `searchByName` | `keyword: string` | `readonly PokemonView[]` | Cocok sebagian, case-insensitive, terhadap `name` atau `nickname`. | **Read** |
| `filterByType` | `type: PokemonType` | `readonly PokemonView[]` | Pokémon yang tipenya mengandung `type`. | **Read** |
| `sortBy` | `key: SortKey`, `order: SortOrder` | `readonly PokemonView[]` | Salin lalu urutkan; key tidak valid mengembalikan `getAll()`. | **Read** |

Semua function di file ini tidak memutasi `pokemons`.

### `src/functions/stats.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `recordBattleResult` | `won: boolean` | `Result<null>` | Tambah `wins` atau `losses`. | **Update** |
| `getTrainerStats` | — | `TrainerStats` | Ringkasan trainer: total, kepemilikan, party/box, win rate, tipe terbanyak, level tertinggi. | **Read** |

### `src/functions/pokedex.ts`

| Function | Parameter | Return | Perilaku | CRUD |
|---|---|---|---|---|
| `recordSpeciesSeen` | `species: SeenSpecies` | `Result<null>` | Catat spesies yang ditemui agar muncul di Pokédex; id yang sudah ada tidak digandakan. | **Create** |
| `getPokedex` | — | `PokedexEntry[]` | Gabungan kunci `speciesCatalog`, spesies yang terlihat, dan spesies yang dimiliki, diurutkan per `speciesId`. | **Read** |
| `getPokedexProgress` | — | `PokedexProgress` | Jumlah spesies terlihat dan tertangkap dengan penyebut `MAX_SPECIES_ID` (1025), bukan jumlah baris. | **Read** |

Baris Pokédex dibentuk dari gabungan tiga sumber: katalog spesies (`speciesCatalog` di `data.ts`, hasil prefetch PokeAPI), spesies yang pernah terlihat, dan spesies yang dimiliki. Spesies di luar katalog tetap punya barisnya sendiri setelah ditemui, memakai nama yang tercatat saat ditemui. `caught` dan `count` diturunkan dari `pokemons`, bukan disimpan terpisah. Penyebut Pokédex selalu **1025** (seluruh National Dex), jadi angka `n/1025` tidak berubah mengikuti berapa entri yang sudah dimuat.


### `src/battle/`

| Function | Parameter | Return | Perilaku |
|---|---|---|---|
| `calcDamage` | `attacker`, `defender`, `rng` | `number` | Rumus damage dengan variasi acak dan pengali efektivitas type. Mengembalikan **0** untuk matchup kebal (tanpa memanggil `rng`); selain itu selalu minimal 1. |
| `effectiveness` | `attackerTypes`, `defenderTypes` | `number` | Hasil kali `TYPE_CHART` untuk setiap pasangan type. Bisa 0, 0.25, 0.5, 1, 2, atau 4. |
| `effectivenessOf` | `multiplier` | `Effectiveness` | Petakan pengali ke label: `immune`, `weak`, `neutral`, atau `strong`. |
| `catchChance` | `wildHp`, `wildMaxHp`, `captureRate` | `number` | Peluang tangkap (0.1–0.95). |
| `runChance` | `playerSpeed`, `wildSpeed` | `number` | Peluang kabur (0.25–0.9). |
| `rollWildLevel` | `rng` | `number` | Level liar di sekitar level tertinggi party. |
| `createBattle` | `species`, `level` | `Result<BattleState>` | Mulai battle dengan Pokémon party pertama yang hidup, sekaligus mencatat spesies liar sebagai terlihat di Pokédex. |
| `needsSwitch` | `state` | `boolean` | `true` jika aktif pingsan tapi party masih punya yang hidup. |
| `playerAttack` | `state`, `rng` | `BattleStep` | Satu giliran serang (urutan berdasarkan speed). |
| `playerCatch` | `state`, `rng` | `BattleStep` | Lempar Poké Ball; gagal berarti wild menyerang. |
| `playerRun` | `state`, `rng` | `BattleStep` | Coba kabur; gagal berarti wild menyerang. |
| `switchActive` | `state`, `id`, `options`, `rng` | `Result<BattleStep>` | Ganti Pokémon aktif; memakan giliran kecuali `forced`. |

Semua function di `battle/` mengembalikan state baru (immutable) dan tidak mencetak apa pun.

### `src/services/pokeapi.ts`

| Function | Parameter | Return | Perilaku |
|---|---|---|---|
| `createPokeApiSource` | — | `SpeciesSource` | Bungkus `PokemonClient` dari pokenode-ts. |
| `mapToSpecies` | `pokemon`, `species` | `Species` | Petakan respons API, saring data tidak valid. |
| `isPokemonType` | `value: string` | `value is PokemonType` | Type guard terhadap 18 type resmi. |
| `getRandomSpecies` | `options` | `Promise<Species>` | Ambil spesies acak; tidak pernah menolak, fallback saat gagal/timeout. |

### `src/ui/`

`theme.ts` menyediakan `typeBadge`, `displayName`, `hpBar`, `formatPokemonLine`, `title`, `section`, `panel`, `print`, `spinnerFrame`, `prefetchStatusLine`, serta `matchupLine`/`effectivenessBadge` untuk indikator efektivitas type. `section` menyisipkan baris kosong setelah heading supaya tiap bagian layar tidak berdesakan. `prompts.ts` menyediakan menu navigasi panah (`selectMenu`, `askText`, `askConfirm`, `pause`, `isExitPromptError`) yang dirender sendiri memakai `readline` dan mode raw stdin. Screens (`runExploreScreen`, `runPartyScreen`, `runCollectionScreen`, `runStatsScreen`, `runPokedexScreen`) hanya memanggil logika dan menampilkan hasil.
`art.ts` menyimpan empat art ASCII (`win`, `lose`, `caught`, `rare-caught`) sebagai array literal; `artBlock` di `theme.ts` memusatkannya pada lebar tetap dan mewarnainya per momen. Art muncul sekali di akhir battle lalu hilang saat layar berikutnya digambar, dan tidak pernah menumpuk.
`frame.ts` menyediakan `beginScreenSession`, `drawScreen`, dan `endScreenSession`: tiap screen membangun daftar baris lalu menggambar ulang seluruh layar lewat `drawScreen` (bersihkan layar + tulis seluruh frame), sehingga tampilan tidak menumpuk ke bawah seperti log. Kursor disembunyikan selama sesi dan dimunculkan lagi saat keluar, termasuk lewat Ctrl+C. Saat output bukan TTY (misalnya dipipe), pembersihan layar dilewati dan baris ditulis apa adanya.

---

## Mekanik Game

### Damage

```
effectiveness = product of TYPE_CHART[attackerType][defenderType] for setiap pasangan type
defense       = max(1, defender.defense)
base          = floor(((2 * level / 5 + 2) * DAMAGE_POWER * attack / defense) / 50 + 2)
variance      = 0.85 + rng() * 0.15
damage        = effectiveness === 0 ? 0 : max(1, floor(base * variance * effectiveness))
```

`DAMAGE_POWER = 100` (lihat catatan kalibrasi di bawah).

### Efektivitas type

`TYPE_CHART` di `constants.ts` adalah tabel 18×18 berisi matchup resmi Pokémon. Setiap penyerang
dan setiap defender menyumbang satu faktor, jadi Pokémon dual-type bisa mencapai 4× atau 0.25×.
Kekebalan (0×) menghasilkan **0 damage** dan tidak memanggil RNG sama sekali; HP defender tidak
berubah.

| Hasil | Label | Simbol | Warna |
|---|---|---|---|
| ≥ 2× | `sangat efektif` | `×2` | hijau tebal |
| = 1× | `normal` | `×1` | abu-abu |
| ≤ 0.5× | `kurang efektif` | `×½` | kuning |
| = 0× | `tidak berpengaruh` | `×0` | abu-abu |

Layar pertarungan menampilkan dua baris matchup di bawah bar HP: `Serangmu` (type aktif vs type
liar) dan `Serangnya` (type liar vs type aktif). Log serangan menambahkan label yang sama, misalnya
`bulbasaur menyerang palossand (3 damage, kurang efektif).`

### Peluang tangkap

```
hpFactor = 1 - 0.66 * (wildHp / wildMaxHp)
chance   = clamp(hpFactor * (captureRate / 255) * 3, 0.1, 0.95)
```

Makin rendah HP liar, makin besar peluang tangkap.

### Peluang kabur

```
chance = clamp(0.5 + (playerSpeed - wildSpeed) / 100, 0.25, 0.9)
```

### EXP dan level up

- Menang melawan Pokémon liar level `L` memberi `L * 10 + 10` EXP.
- Kebutuhan EXP untuk naik dari level `L` adalah `L * 20`.
- Setiap naik level, `maxHp`, `attack`, `defense`, `speed` naik `max(1, round(nilai * 0.05))`; HP ikut bertambah sebesar kenaikan `maxHp`.
- Saat level 100, EXP tidak bertambah lagi.

### Stat scaling

Saat Pokémon dibuat: `stat = floor(base * (1 + level / 20))`, diterapkan ke HP (jadi `maxHp`), attack, defense, dan speed.

---

## Keputusan Teknis

- **TypeScript strict** dengan `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, dan `verbatimModuleSyntax`. Tidak ada `any`, `@ts-ignore`, atau non-null assertion.
- **`Result` alih-alih exception** untuk kegagalan yang wajar, sehingga UI bisa menampilkan pesan tanpa `try/catch` di setiap pemanggilan.
- **RNG yang bisa disuntik**: setiap function yang memakai keacakan menerima `rng: Rng = Math.random`, sehingga test deterministik.
- **Pemisahan logika dan I/O**: hanya `ui/` dan `main.ts` yang mencetak ke terminal; `functions/`, `battle/`, dan `services/` murni data.
- **Model data tunggal**: party dan box adalah satu array dengan flag `inParty`, bukan dua struktur terpisah.
- **Kalibrasi `DAMAGE_POWER`**: nilai awal 40 membuat pertarungan level setara berlangsung terlalu lama (± 14 giliran). Nilai dinaikkan ke **100**, sehingga simulasi pada test menghasilkan rata-rata 3–8 giliran sesuai target.
- **`exactOptionalPropertyTypes` dan objek literal `BattleEvent`**: setiap varian event adalah objek literal penuh dengan `readonly`, sehingga perubahan bentuk state terdeteksi kompilasi.

### Asumsi yang diambil

- Data hanya disimpan di memori dan direset setiap program dijalankan (tidak ada file atau database).
- Starter dipilih dari tiga Pokémon (`bulbasaur`, `charmander`, `squirtle`) dan langsung masuk party pada level 5.
- Saat seluruh party pingsan, tim dipulihkan otomatis tanpa penalti lain, supaya pemain tidak terjebak.
- `searchByName` dengan keyword kosong mengembalikan array kosong.

---

## Catatan

- Saat start, `startSpeciesPrefetch()` (`src/services/pokeapi.ts`) memuat seluruh 1025 spesies ke `speciesCatalog` di latar belakang. Fungsi ini fire-and-forget dan tidak pernah di-`await` di `main.ts`, jadi menu starter tampil seketika. Worker pool dibatasi `PREFETCH_CONCURRENCY` (12) agar tidak kena rate limit; tiap id yang gagal mengembalikan `null` dan dilewati, tidak pernah menolak promise. Progresnya dibaca lewat `getPrefetchProgress()` dan ditampilkan sebagai status berputar di menu.
- Sumber data spesies default adalah **PokeAPI** lewat `pokenode-ts`. Sebelum prefetch selesai, `getRandomSpecies()` mengambil acak dari `speciesCatalog` yang sudah terisi; jika katalog masih kosong, ia jatuh ke fetch acak lalu `fallbackSpecies`.
- Data hanya ada di memori; menutup game berarti koleksi hilang.
- `node_modules` tidak boleh ikut ke dalam zip pengumpulan; `bun.lock` ikut.
- `pokemon-catcher.exe` (98 MB) adalah artefak build opsional, hanya untuk Windows. Hapus atau kecualikan file ini sebelum men-zip; `bun run build` tidak wajib dijalankan untuk pengumpulan.
- Navigasi menu memakai tombol panah (↑↓) dan Enter, dijalankan oleh prompt buatan sendiri di `src/ui/prompts.ts` (raw stdin + `readline`). `@inquirer/prompts` tetap terdaftar sebagai dependency sesuai ketentuan tugas, tetapi tidak dipakai untuk merender menu karena baris pilihannya tidak bisa diberi indent.
- Tiap screen menggambar ulang seluruh layar (`drawScreen`) alih-alih mencetak beruntun ke bawah, jadi tampilan battle dan menu tidak menumpuk seperti log. Di terminal non-TTY (output dipipe), pembersihan layar dilewati.
