# AGENTS.md: Pokémon Catcher (CLI / TUI, TypeScript)

Instruksi untuk agent yang membangun proyek ini dari nol. Ikuti secara literal. Kalau ada yang ambigu, pilih opsi paling sederhana yang tidak melanggar aturan di bawah, lalu catat asumsinya di README.

## 1. Konteks modular

Konteks dipecah per modul supaya agent hanya memuat yang relevan. File ini berisi aturan lintas modul. Sebelum membuat atau mengubah file di sebuah folder, baca `AGENTS.md` di folder itu.

| File konteks | Isi |
|---|---|
| `AGENTS.md` (ini) | tujuan, syarat tugas, stack, struktur, aturan dependensi, best practices, urutan kerja, README, definition of done, larangan |
| `src/AGENTS.md` | tipe domain, konstanta, skema data, `data.ts`, `main.ts`, `utils/` |
| `src/functions/AGENTS.md` | spesifikasi function CRUD |
| `src/battle/AGENTS.md` | engine, damage, peluang tangkap dan kabur |
| `src/services/AGENTS.md` | integrasi PokeAPI, fallback, dan penyimpanan slot save |
| `src/ui/AGENTS.md` | TUI, tema, prompts, screens |
| `tests/AGENTS.md` | aturan dan skenario test |

Jika dua file bentrok: aturan di file ini (stack, dependensi, best practices, larangan) selalu menang. File konteks modul menang untuk detail modulnya sendiri.

## 2. Tujuan

Bangun game Pokémon berbasis terminal (TUI) bernama **Pokémon Catcher** dengan **Bun** sebagai runtime dan package manager, ditulis dalam **TypeScript** (ES Modules). Pemain menjelajah, bertemu Pokémon liar, battle sederhana turn-based, lalu menangkapnya. Seluruh koleksi Pokémon disimpan dalam **sebuah array of object** di memori, dan semua operasi CRUD dilakukan ke array itu.

Proyek ini adalah tugas Mini Project Study Club Backend (individu). Kriteria penilaian ada di bagian 3 dan wajib terpenuhi.

## 3. Syarat tugas (tidak boleh dilanggar)

Wajib:
- Ada tema proyek (tema: game Pokémon catcher).
- Ada struktur data berupa array berisi object, minimal 3 key-value per object.
- Minimal 5 function yang memenuhi operasi CRUD (Create, Read, Update, Delete).

Nilai tambahan (semuanya harus dikerjakan):
- Modularisasi dengan import-export, dengan file `data.ts`, `functions.ts`, `main.ts` (padanan TypeScript dari `data.js`, `functions.js`, `main.js`; catat ini di README).
- Lebih dari 5 function (target 15+).
- Aplikasi CLI interaktif.
- Kreativitas (battle, party/PC box, statistik, warna per type).

Format pengumpulan (harus didukung oleh hasil akhir):
- Dikumpulkan sebagai zip bernama `NAMA_NIM_PokemonCatcher.zip`.
- `node_modules` tidak boleh ikut di zip. `bun.lock` ikut.
- Wajib ada `README.md` berisi: judul proyek, gambaran umum file, format data beserta keterangannya, penjelasan masing-masing function.

## 4. Tech stack

- Runtime dan package manager: **Bun** (versi stabil terbaru). Bukan Node.js, npm, atau yarn. Dependency dipasang dengan `bun add` (runtime) dan `bun add -d` (dev).
- **TypeScript** mode strict. Bun menjalankan `.ts` langsung, tidak ada langkah build. Type check dilakukan dengan `tsc --noEmit`.
- ES Modules (`"type": "module"`).
- Kode aplikasi (`src/`) tidak boleh memakai API khusus Bun (`Bun.file`, `Bun.serve`, dan sejenisnya) supaya portabel. Pengecualian: file di `tests/` boleh memakai `bun:test`.
- Dependency runtime (`dependencies`), hanya tiga:
  - `pokenode-ts` untuk data PokeAPI (`PokemonClient`)
  - `@inquirer/prompts` untuk menu interaktif (`select`, `input`, `confirm`)
  - `chalk` untuk warna
- Dependency dev (`devDependencies`), hanya tiga:
  - `typescript`
  - `@types/bun`
  - `@biomejs/biome` (lint dan format)
- Dilarang dependency lain, database, atau web server. Penyimpanan ke file hanya lewat `node:fs`/`node:path` (builtin Node, bukan dependency) di `src/services/save.ts`, untuk tiga slot save JSON di folder `saves/`. State game tetap array di memori; file hanya cerminan saat keluar dan saat pemain menekan Simpan.

`package.json`:

```json
{
  "name": "pokemon-catcher",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run src/main.ts",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome check --write .",
    "test": "bun test",
    "check": "bun run typecheck && bun run lint && bun run test"
  }
}
```

Game dijalankan dengan `bun start`. Isi `dependencies` dan `devDependencies` datang dari perintah `bun add`, jangan ditulis manual.

`tsconfig.json` (tulis persis):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

`biome.json`: buat dengan `bunx biome init`, lalu atur:
- Formatter: indent 2 spasi, `lineWidth` 100, tanda kutip tunggal, titik koma selalu, trailing comma `all`.
- Linter: `recommended` aktif, ditambah rule berikut sebagai **error**: larangan `any` eksplisit, larangan non-null assertion (`!`), wajib `import type` untuk import tipe, larangan default export, larangan `console`.
- Override: rule larangan `console` dimatikan hanya untuk `src/ui/**`, `src/main.ts`, dan `tests/**`.
- Nama rule mengikuti versi Biome yang terpasang. Cek dokumentasinya, jangan menebak.

`.gitignore`: `node_modules/`, `*.zip`, `.DS_Store`.

## 5. Struktur file

Buat persis struktur ini (boleh tambah file kecil kalau benar-benar perlu, dan catat di README).

```
pokemon-catcher/
├── package.json
├── tsconfig.json
├── biome.json
├── .gitignore
├── bun.lock
├── README.md
├── AGENTS.md
├── src/
│   ├── AGENTS.md
│   ├── main.ts             # entry point, loop menu utama
│   ├── data.ts             # export pokemons, trainer, fallbackSpecies, resetData
│   ├── types.ts            # semua tipe domain
│   ├── constants.ts        # semua konstanta game dan konfigurasi
│   ├── functions.ts        # barrel: re-export dari functions/
│   ├── functions/
│   │   ├── AGENTS.md
│   │   ├── store.ts        # helper internal, TIDAK di-re-export barrel
│   │   ├── collection.ts   # buildPokemon, catchPokemon, getAll, getById, releasePokemon
│   │   ├── party.ts        # getParty, getBox, moveToParty, moveToBox
│   │   ├── update.ts       # setNickname, gainExp, applyDamage, healAll
│   │   ├── query.ts        # searchByName, filterByType, sortBy
│   │   └── stats.ts        # getTrainerStats, recordBattleResult
│   ├── services/
│   │   ├── AGENTS.md
│   │   ├── pokeapi.ts      # wrapper pokenode-ts + fallback
│   │   └── save.ts         # slot save JSON (baca/tulis file)
│   ├── battle/
│   │   ├── AGENTS.md
│   │   ├── engine.ts       # state battle dan aksi per giliran
│   │   ├── damage.ts       # rumus damage
│   │   └── catch.ts        # rumus peluang tangkap dan kabur
│   ├── ui/
│   │   ├── AGENTS.md
│   │   ├── theme.ts        # warna chalk per type, helper format
│   │   ├── prompts.ts      # wrapper @inquirer/prompts
│   │   └── screens/
│   │       ├── explore.ts
│   │       ├── party.ts
│   │       ├── collection.ts
│   │       └── stats.ts
│   └── utils/
│       ├── random.ts       # randomInt, randomChoice, chance
│       ├── math.ts         # clamp
│       ├── result.ts       # ok, fail
│       ├── async.ts        # withTimeout
│       └── assert.ts       # assertNever
└── tests/
    ├── AGENTS.md
    ├── helpers.ts
    ├── functions.test.ts
    ├── battle.test.ts
    ├── pokeapi.test.ts
    ├── save.test.ts
    └── architecture.test.ts

## 6. Aturan dependensi antar modul

Wajib supaya tidak ada circular import dan logika bisa dites tanpa UI. Aturan ini dicek otomatis oleh `tests/architecture.test.ts`.

| Modul | Boleh import | Tidak boleh |
|---|---|---|
| `constants.ts` | tidak ada | semuanya |
| `types.ts` | `constants.ts` (hanya `import type`) | selain itu |
| `utils/*` | `constants.ts`, `types.ts`, sesama `utils/` | lapisan lain |
| `data.ts` | `constants.ts`, `types.ts` | lapisan lain |
| `functions/*` | `data.ts`, `constants.ts`, `types.ts`, `utils/`, `functions/store.ts` | `ui/`, `battle/`, `services/`, `chalk`, `@inquirer/prompts`, sibling selain `store.ts`, output terminal |
| `battle/*` | `functions.ts`, `constants.ts`, `types.ts`, `utils/` | `ui/`, `services/`, `data.ts` langsung, output terminal |
| `services/*` | `data.ts` (fallback), `constants.ts`, `types.ts`, `utils/`, `pokenode-ts`, `node:fs`, `node:path` | `ui/`, `battle/`, `functions/`, output terminal |
| `ui/*` | semua lapisan lain | langsung memanggil `@inquirer/prompts` dari `ui/screens/*` (harus lewat `ui/prompts.ts`) |
| `main.ts` | `ui/`, `functions.ts`, `data.ts` | logika game |

- Hanya `ui/` dan `main.ts` yang boleh mencetak ke terminal.
- Import antar file memakai path relatif dengan ekstensi `.ts`. Tipe diimpor dengan `import type`.
- Sibling di `functions/` tidak boleh saling import. Logika bersama (cari by id, hitung party) ada di `functions/store.ts`.

## 7. Best practices (WAJIB)

Semua poin ini wajib dipatuhi di seluruh kode. Yang bertanda `[otomatis]` dicek oleh tooling, sisanya dicek manual saat checklist bagian 10.

Type safety:
1. `[otomatis]` Zero `any`, zero `@ts-ignore` / `@ts-expect-error`, zero non-null assertion (`!`). Type assertion (`as`) hanya kalau tidak ada cara lain, dan harus didahului pengecekan runtime. `as const` dan `satisfies` boleh dan dianjurkan.
2. Data dari luar (respons PokeAPI, input keyboard) dianggap tidak tepercaya. Validasi dan persempit tipenya di batas sistem: `services/` untuk API, `functions/` untuk semua argumen, jangan percaya UI.
3. Himpunan nilai tertentu dimodelkan sebagai union literal yang diturunkan dari konstanta (`as const`), bukan string bebas. Satu sumber kebenaran, contohnya `POKEMON_TYPES`.
4. Hasil yang punya beberapa bentuk memakai discriminated union (`Result`, `BattleEvent`). `switch` atas union wajib exhaustive dengan `assertNever`.
5. Data yang tidak boleh diubah ditandai `readonly`. Function Read mengembalikan tipe read-only supaya UI tidak bisa melewati validasi.

Desain:
6. Pisahkan logika murni dari I/O. Efek samping (terminal, jaringan, mutasi array) hanya di tempat yang ditentukan di bagian 6.
7. Sumber acak bisa disuntik: setiap function yang memakai random menerima parameter opsional `rng: Rng = Math.random`. Tidak ada `Math.random()` langsung di dalam badan function selain sebagai default parameter.
8. Tidak ada angka atau string ajaib. Semua konstanta game ada di `constants.ts`, kecuali konstanta lokal yang hanya masuk akal di satu function.
9. Function pendek (target maksimal sekitar 30 baris), satu tugas, early return, nesting maksimal 3 tingkat. Lebih dari 3 parameter memakai satu objek opsi.
10. Tidak ada state global selain `pokemons` dan `trainer` di `data.ts`. Tidak ada singleton tersembunyi di modul lain.
11. Ketergantungan eksternal bisa disuntik (misalnya sumber species di `services/`) supaya jalur gagal bisa dites tanpa jaringan.

Error handling dan async:
12. Kegagalan yang wajar (id tidak ada, party penuh, input salah) dikembalikan sebagai `Result` dengan `ok: false`, tidak melempar error. Kondisi yang menandakan bug programmer (array kosong ke `randomChoice`, state mustahil) melempar `Error` dengan pesan jelas.
13. Dilarang menelan error tanpa alasan. Setiap `catch` harus menangani kasusnya (fallback, pesan ke pemain) dan tipe error dipersempit dari `unknown`.
14. Setiap promise di-`await` atau ditangani. Timer dibersihkan di `finally`. Tidak ada floating promise.
15. Program tidak boleh crash karena internet. Ctrl+C keluar rapi tanpa stack trace. Error tak terduga di tingkat teratas menampilkan pesan singkat bahasa Indonesia dan mengatur `process.exitCode = 1`.

Kebersihan kode:
16. `[otomatis]` `bun run check` lolos tanpa error dan tanpa warning: type check, Biome, dan test.
17. `[otomatis]` Named export saja, tanpa default export di kode sendiri. Import default dari library (misalnya `chalk`) diperbolehkan.
18. Penamaan: `camelCase` untuk variabel dan function, `PascalCase` untuk tipe, `UPPER_SNAKE_CASE` untuk konstanta, boolean diawali `is`/`has`/`can`. Identifier berbahasa Inggris, teks ke pemain berbahasa Indonesia.
19. `const` secara default, `let` hanya jika perlu reassign, tanpa `var`. Pakai `Number.isInteger`, `Number.isFinite`, `?.`, dan `??` dengan benar, bukan truthiness untuk angka.
20. Komentar hanya untuk logika yang tidak jelas dari kodenya, berisi alasan (kenapa), bukan penjelasan isi (apa). **Dilarang** komentar dekoratif atau pembatas section (`// ───`, `// ====`, `// ----`, banner, judul section di dalam file). Penjelasan function ada di README, tidak ada JSDoc panjang. Tipe dan nama yang jelas adalah dokumentasi utama.
21. Satu file satu tanggung jawab. Tidak ada kode mati, import tak terpakai, atau `TODO` tersisa di hasil akhir.

Pengujian:
22. Logika di `functions/`, `battle/`, `utils/`, dan pemetaan di `services/` punya test (`bun test`). Test deterministik (rng ber-seed), tidak memakai jaringan, dan mereset state lewat `resetData()`. Detail di `tests/AGENTS.md`.

## 8. Urutan pengerjaan

Kerjakan berurutan. Di akhir setiap tahap, `bun run check` harus lolos sebelum lanjut.

1. Inisialisasi: `package.json`, `tsconfig.json`, `biome.json`, `.gitignore`. Jalankan `bun add pokenode-ts @inquirer/prompts chalk` lalu `bun add -d typescript @types/bun @biomejs/biome`. Buat semua folder dan file kosong sesuai bagian 5, termasuk semua `AGENTS.md`.
2. `constants.ts`, `types.ts`, `utils/*`, `data.ts` (termasuk `fallbackSpecies` dan `resetData`).
3. `functions/*` dan `functions.ts`, beserta `tests/functions.test.ts`.
4. `battle/damage.ts`, `battle/catch.ts`, `battle/engine.ts`, beserta `tests/battle.test.ts` (termasuk simulasi 3 sampai 8 giliran).
5. `services/pokeapi.ts`, beserta `tests/pokeapi.test.ts` untuk jalur normal, gagal, dan timeout.
6. `tests/architecture.test.ts`.
7. `ui/theme.ts`, `ui/prompts.ts`, screens satu per satu, lalu `main.ts`. Jalankan `bun start` dan telusuri semua menu secara manual, termasuk Ctrl+C dan mode offline.
8. Tulis `README.md`.
9. Jalankan checklist bagian 10. Hapus skrip sementara yang tidak masuk deliverable.

## 9. README.md (wajib, bahasa Indonesia)

Harus berisi bagian-bagian berikut:
1. **Judul proyek** dan deskripsi satu paragraf. Placeholder `NAMA - NIM` di bagian atas supaya mudah diisi.
2. **Cara menjalankan**: kebutuhan Bun, `bun install`, `bun start`, dan script lain (`bun run check`, `bun test`). Catatan bahwa game butuh internet tapi punya fallback offline.
3. **Gambaran umum file**: pohon folder dan satu kalimat fungsi tiap file/folder, termasuk aturan dependensi antar modul. Catat bahwa `data.ts`, `functions.ts`, `main.ts` adalah padanan TypeScript dari `data.js`, `functions.js`, `main.js`.
4. **Format data**: tipe objek Pokémon (tabel field, tipe, keterangan), objek `trainer`, bentuk species, dan tipe `Result`.
5. **Penjelasan function**: tiap function dalam tabel atau list berisi nama, parameter, nilai return, dan perilakunya. Kelompokkan per file dan tandai mana yang Create, Read, Update, Delete.
6. **Mekanik game**: ringkasan rumus damage, peluang tangkap, kabur, EXP, dan level up.
7. **Keputusan teknis**: TypeScript strict, `Result` alih-alih exception, rng yang bisa disuntik, pemisahan logika dan UI, hasil kalibrasi konstanta damage jika diubah, serta asumsi yang diambil.
8. **Catatan**: state game ada di memori dan dicerminkan ke slot save JSON saat keluar atau saat pemain menekan Simpan; sumber data PokeAPI via pokenode-ts. Sebutkan folder `saves/` ada di `.gitignore`.

## 10. Definition of done

- [ ] `bun install && bun start` berjalan tanpa error.
- [ ] `bun run check` lolos: type check, Biome (tanpa warning), dan semua test.
- [ ] Semua file di bagian 5 ada dan mengikuti aturan dependensi bagian 6 (test arsitektur lolos).
- [ ] Semua poin best practices bagian 7 terpenuhi. Tidak ada `any`, `@ts-ignore`, `!`, default export, atau `console` di luar `ui/`, `main.ts`, dan `tests/`.
- [ ] `pokemons` adalah array of object dengan 13 field, dan CRUD benar-benar dilakukan ke array itu.
- [ ] Jumlah function yang diekspor dari `functions.ts` lebih dari 15 dan mencakup Create, Read, Update, Delete.
- [ ] Party maksimal 6, tangkapan ke-7 dan seterusnya masuk PC box, party tidak bisa dikosongkan.
- [ ] Battle bisa Attack, Catch, Ganti Pokémon, Run, dengan hasil win, lose, caught, ran yang semuanya tertangani.
- [ ] Game tetap bisa dimainkan saat offline (fallback aktif), dan Ctrl+C keluar dengan rapi.
- [ ] Tiga slot save berfungsi: pemain memilih slot saat mulai, progres dimuat kalau slot berisi, tersimpan otomatis saat keluar dan lewat menu Simpan, bisa dihapus lewat menu Hapus data, dan file rusak ditolak tanpa mengubah state di memori.
- [ ] Sort, search, filter type, dan statistik trainer berfungsi.
- [ ] Tidak ada komentar dekoratif atau pembatas section di kode mana pun.
- [ ] README lengkap sesuai bagian 9.
- [ ] Tidak ada folder `node_modules` di hasil akhir yang akan di-zip.

## 11. Larangan

- Jangan menambah dependency di luar yang diizinkan di bagian 4.
- Jangan melonggarkan `tsconfig.json` atau aturan Biome untuk meloloskan error. Perbaiki kodenya.
- Jangan membuat database atau server HTTP. Penyimpanan ke file diizinkan **hanya** di `src/services/save.ts` (slot save JSON); tidak ada modul lain yang boleh menulis atau membaca file.
- Jangan reassign `pokemons`. Hanya mutasi in-place (`push`, `splice`, ubah properti).
- Jangan mencetak ke terminal dari `functions/`, `battle/`, atau `services/`.
- Jangan menyimpan Pokémon liar ke `pokemons` sebelum berhasil ditangkap.
- Jangan membuat zip atau mengubah nama proyek. Pengguna yang mengisi nama dan NIM lalu men-zip sendiri.
