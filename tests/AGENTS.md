# tests/AGENTS.md: pengujian

Konteks untuk semua file di `tests/`. Test dijalankan dengan `bun test`. Hanya folder ini yang boleh memakai `bun:test`.

## Aturan

- Test deterministik: tidak ada jaringan, tidak ada `Math.random` tanpa kendali. Pakai rng ber-seed dari `tests/helpers.ts`.
- Setiap test mereset state lewat `beforeEach(resetData)`. Tidak ada test yang bergantung pada urutan test lain.
- Test memeriksa perilaku lewat API publik (`functions.ts`, `battle/engine.ts`, `services/pokeapi.ts`), bukan detail internal.
- Satu test, satu perilaku. Nama test dalam bahasa Indonesia dan menjelaskan perilaku yang diharapkan.
- Tidak ada `any` atau `@ts-ignore` di test. Tipe tetap strict.
- Test ikut dicek oleh `bun run typecheck` dan `bun run lint`.

## helpers.ts

- `createSeededRng(seed: number): Rng`: pseudo-random deterministik (misalnya mulberry32). Nilai selalu di `[0, 1)`.
- `makeSpecies(overrides?: Partial<Species>): Species`: species uji dengan stat sederhana.
- `seedCollection(count: number): void`: menangkap `count` Pokémon uji lewat `buildPokemon` + `catchPokemon`.

## functions.test.ts

Skenario wajib:
- Menangkap 7 Pokémon: 6 pertama masuk party, yang ke-7 masuk PC box. `trainer.totalCaught` bernilai 7 dan `id` tidak pernah dipakai ulang setelah `releasePokemon`.
- `releasePokemon` pada satu-satunya anggota party gagal (`ok: false`), pada id yang tidak ada gagal, pada anggota box berhasil.
- `moveToParty` gagal saat party penuh, `moveToBox` gagal untuk anggota party terakhir.
- `gainExp` menaikkan level beberapa kali dalam satu panggilan, sisa exp benar, stat naik, dan berhenti di `MAX_LEVEL`. Jumlah tidak valid (0, negatif, desimal, `NaN`) gagal.
- `applyDamage` tidak membuat `hp` di bawah 0 dan melaporkan `fainted`. `healAll` memulihkan semua entry, party dan box.
- `setNickname`: trim, string kosong mengembalikan `null`, 13 karakter ke atas gagal.
- `sortBy`, `searchByName`, dan `filterByType` tidak memutasi `pokemons` (bandingkan isi dan urutan sebelum dan sesudah). `sortBy` dengan key tidak valid mengembalikan `getAll()`.
- `getTrainerStats` benar untuk koleksi kosong (`winRate` 0, `mostCommonType` dan `highestLevel` `null`) dan koleksi berisi.
- Semua function yang menerima id menolak nilai bukan integer tanpa melempar error.

## battle.test.ts

- `calcDamage` selalu minimal 1 untuk matchup netral, dan hasil dengan rng yang sama selalu sama.
- Matchup kebal menghasilkan `0` dan **tidak memanggil rng** sama sekali.
- Efektivitas menggandakan/memangkas damage: super efektif > netral > kurang efektif, dan dual-type 4× menghasilkan sekitar dua kali lipat hasil 2×.
- `effectiveness`: matchup netral 1×, dual-type defender 4× dan 0.25×, dual-type penyerang mengalikan kedua attack, dan kekebalan 0× menang atas kelemahan.
- Setiap pasangan dari 18 type menghasilkan salah satu dari 0, 0.25, 0.5, 1, 2, 4 (menjamin chart tidak punya nilai liar).
- `effectivenessOf` memetakan 0/0.5/1/2/4 ke `immune`/`weak`/`neutral`/`strong`.
- `catchChance` dan `runChance` selalu berada di rentang clamp-nya.
- `rollWildLevel` selalu di dalam rentang yang ditentukan untuk berbagai rng.
- Simulasi: untuk beberapa seed, jalankan `playerAttack` berulang sampai `outcome` terisi pada battle level setara. Jumlah giliran rata-rata berada di sekitar 3 sampai 8.
- Semua outcome tercapai dan tertangani: `win` (EXP bertambah, `trainer.wins` naik), `lose` (`trainer.losses` naik, party dipulihkan), `caught` (entry baru masuk `pokemons`), `ran`.
- Pokémon liar tidak ada di `pokemons` sebelum `caught`.
- `createBattle` gagal jika semua party pingsan. `needsSwitch` benar saat Pokémon aktif pingsan dan masih ada anggota hidup. `switchActive` menolak anggota pingsan atau yang bukan di party.
- State yang diterima engine tidak berubah setelah aksi (immutable).
- `createBattle` mencatat spesies liar sebagai terlihat: setelah `createBattle`, `getPokedex()` memuat baris dengan `seen: true` untuk `speciesId` tersebut, termasuk spesies di luar katalog (pakai id di luar 1..1025, mis. 99999).

## pokeapi.test.ts

Memakai `SpeciesSource` palsu lewat `options.source`:
- Jalur normal: mengembalikan species dari sumber.
- Jalur gagal: sumber melempar error, hasilnya salah satu dari `fallbackSpecies`.
- Jalur timeout: sumber tidak pernah selesai, `timeoutMs` kecil, hasilnya fallback dan test selesai cepat.
- `getRandomSpecies` tidak pernah menolak.
- `mapToSpecies`: pemetaan benar untuk objek API buatan tangan, type tak dikenal disaring, error jika type kosong atau stat hilang atau `capture_rate` tidak valid.

## pokedex.test.ts

- Koleksi kosong menghasilkan satu entri per kunci `speciesCatalog`, semua `seen`/`caught` `false`.
- `recordSpeciesSeen` menandai `seen` tanpa menandai `caught`, tidak menggandakan id yang sama, dan menolak id bukan integer positif.
- Spesies yang tertangkap muncul dengan `caught: true` dan `count` benar.
- Spesies di luar katalog (id di luar 1..1025) mendapat barisnya sendiri, memakai `name` yang tercatat di `seenSpecies`.
- `mergeSpecies` menambahkan entri ke katalog sehingga muncul sebagai baris Pokédex.
- Baris diurutkan naik berdasarkan `speciesId`.
- `getPokedexProgress` memakai `MAX_SPECIES_ID` (1025) sebagai penyebut, bukan jumlah baris (regresi utama: dulu penyebut mengikuti jumlah entri sehingga tampil `n/12`).
- `resetData` mengembalikan `speciesCatalog` ke `fallbackSpecies` dan membersihkan `seenSpecies`.


## prefetch.test.ts

Memakai `SpeciesSource` palsu yang hanya bisa menjangkau sebagian id:
- Memuat semua id yang bisa dijangkau ke `speciesCatalog`.
- Id yang gagal dilewati tanpa menggagalkan prefetch dan tanpa menolak promise.
- Progres melaporkan `loaded`, `total`, dan `done`.
- Sumber yang selalu gagal tetap selesai (`done: true`) dan tidak melempar.
- `startSpeciesPrefetch` idempoten dan tidak memblokir (dipanggil dua kali, `done` tetap `false`).
- `getRandomSpecies` memakai katalog saat tidak ada `source` eksplisit, dan tetap memanggil jaringan saat `source` disuntik.

## theme.test.ts

- `typeGlyphStrip` untuk daftar kosong dan berisi.
- `panel` meng-indentasi isi dua spasi setelah heading dan baris kosong; heading kosong tidak menambah baris kosong.
- `section` menyisipkan baris kosong setelah heading tanpa meng-indentasi body; heading kosong hanya mengembalikan body.
- `frames` bertambah satu baris tiap potongan; daftar kosong menghasilkan `[]`.
- `hpBarDrain` langkah pertama sama dengan bar awal, langkah terakhir sama dengan bar akhir.
- `spinnerFrame` menggilir seluruh `SPINNER_FRAMES` lalu kembali ke frame pertama, dan tetap mengembalikan frame valid untuk `tick` negatif.

## prompts.test.ts

Menguji implementasi readline sendiri lewat `stdin` palsu (subclass `EventEmitter` dengan `isTTY = true`), bukan TTY nyata. Tidak ada test yang menunggu animasi: `ANIMATION_ENABLED` tidak boleh diandalkan sebagai `false` di test, dan tidak ada test yang memanggil `delay()`.

## architecture.test.ts

Membaca semua `src/**/*.ts` dengan `node:fs` dan memeriksa:
- Aturan dependensi di tabel bagian 6 `AGENTS.md` root (periksa isi `import ... from '...'` tiap file).
- `functions/*` tidak saling import kecuali `store.ts`, dan `functions.ts` tidak me-re-export `store.ts`.
- Tidak ada `console.` di luar `src/ui/` dan `src/main.ts`.
- Tidak ada `export default` di `src/`.
- Tidak ada komentar dekoratif: baris komentar yang cocok dengan pola `// ─`, `// =`, `// -` berulang.
- `pokemons` tidak pernah di-reassign (tidak ada `pokemons =` di `src/`).
- `functions.ts` mengekspor lebih dari 15 function.

Test ini adalah pagar otomatis untuk Definition of Done. Jika gagal, perbaiki kodenya, jangan longgarkan test.
