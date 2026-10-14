# src/ui/AGENTS.md: TUI

Konteks untuk `theme.ts`, `prompts.ts`, dan `screens/*`. Bersama `main.ts`, ini satu-satunya lapisan yang boleh mencetak ke terminal.

## Aturan modul

- Boleh import semua lapisan lain. `screens/*` tidak boleh import `@inquirer/prompts` langsung, harus lewat `ui/prompts.ts`.
- Semua teks yang tampil ke pemain pakai bahasa Indonesia.
- Screen tidak berisi logika game. Hitung dan ubah data lewat `functions.ts` dan `battle/`, UI hanya memanggil dan menampilkan hasilnya (`Result.message`, `BattleEvent.message`).
- Selalu periksa `result.ok` sebelum memakai `result.data` (discriminated union). Tampilkan `message` untuk kedua kasus.
- Teks yang diketik pemain adalah input tidak tepercaya. Teruskan apa adanya ke `functions/`, validasi ada di sana.
- Rendering `BattleEvent` memakai `switch` exhaustive dengan `assertNever`.

## ui/prompts.ts

Implementasi sendiri di atas `node:readline` dan raw mode `stdin`, bukan memanggil `@inquirer/prompts`:

```ts
export interface MenuChoice<T extends string> {
  readonly value: T;
  readonly name: string;
  readonly description?: string;
}

export interface SelectMenuOptions {
  readonly status?: (tick: number) => string | null;
  readonly statusIntervalMs?: number;
}

export function selectMenu<T extends string>(
  message: string,
  choices: readonly MenuChoice<T>[],
  options?: SelectMenuOptions,
): Promise<T>;
export function askText(message: string, defaultValue?: string): Promise<string>;
export function askConfirm(message: string): Promise<boolean>;
export function pause(): Promise<void>;
export function isExitPromptError(error: unknown): boolean;

`options.status` mengembalikan baris status hidup (atau `null` untuk tidak menampilkan). `selectMenu` menjalankan satu `setInterval` yang menaikkan `tick` dan menggambar ulang **satu** blok berisi menu + baris status. Satu penulis untuk seluruh blok adalah syaratnya: kalau ada penulis kedua (mis. spinner terpisah), keduanya berebut kursor dan layar berkedip. Interval dibersihkan di `finally` supaya `ExitPromptError` maupun Enter tidak meninggalkan timer. Pemakai produksi: `main.ts` mengirim `prefetchStatusLine` dari `ui/theme.ts` agar progres prefetch terlihat berputar di bawah menu.
```

- `pause()` menunggu Enter.
- `isExitPromptError` mempersempit `unknown`: `error instanceof Error && error.name === 'ExitPromptError'`. Dipakai `main.ts` untuk Ctrl+C.

## ui/theme.ts

- `typeColors`: `Record<PokemonType, ChalkInstance>` dengan `chalk.hex(...)` untuk 18 type resmi. Gunakan `satisfies` supaya kompiler memastikan semua type terisi.
- `typeBadge(type: PokemonType): string`: nama type berwarna.
- `typeGlyph(type: PokemonType): string` dan `typeGlyphStrip(types: readonly PokemonType[]): string`: glyph satu karakter per type, diwarnai lewat `typeColors`. Glyph dibuat ASCII supaya aman di berbagai terminal dan code page. Daftar type kosong menghasilkan `-` abu-abu.
- `section(heading: string, body: readonly string[]): string[]`: judul opsional, lalu **baris kosong**, lalu isi. `panel` adalah `section` dengan isi di-indentasi dua spasi. Heading kosong tidak menambah baris kosong. Tidak memakai karakter border; pemisah visual hanya judul, baris kosong, dan indentasi.
- Jarak antar bagian layar adalah keputusan `theme.ts`, bukan tiap screen: setiap screen yang menampilkan beberapa section memakai `section()`/`panel()` atau menulis pola yang sama (judul, `''`, isi) supaya tidak berdesakan. Header singkat yang langsung diikuti prompt `@inquirer` tidak perlu baris kosong.
- `frames(lines: readonly string[]): string[][]`: potongan bertambah satu baris, dipakai untuk menampilkan event satu per satu.
- `hpBarDrain(from, to, maxHp, step, width = 20): string`: bar HP pada nilai interpolasi antar `from` dan `to` selama `HP_DRAIN_STEPS` langkah. `step` 1 sama dengan `hpBar(from, ...)`, `step` terakhir sama dengan `hpBar(to, ...)`.
- `displayName(p: PokemonView): string`: `p.nickname ?? p.name`.
- `hpBar(hp: number, maxHp: number, width = 20): string`: bar hijau, kuning, atau merah sesuai persentase. Tahan `maxHp` 0 dan nilai di luar rentang.
- `formatPokemonLine(p: PokemonView): string`: satu baris ringkas berisi nama, level, type, bar HP.
- `title(text: string): string`: judul section.
- Warna dan ambang bar (misalnya batas kuning dan merah) dijadikan konstanta bernama.
- Durasi animasi dan jumlah langkah drain ada di `constants.ts` (`ANIMATION_ENABLED`, `ANIMATION_EVENT_DELAY_MS`, `ANIMATION_HP_TICK_MS`, `HP_DRAIN_STEPS`). `ANIMATION_ENABLED` adalah satu-satunya saklar: `false` membuat semua jeda hilang tanpa mengubah hasil permainan. `delay()` di `utils/async.ts` adalah satu-satunya cara menunggu.
- `spinnerFrame(tick: number): string`: satu karakter dari `SPINNER_FRAMES` (braille, aman di Windows Terminal), memakai modulo positif sehingga `tick` negatif pun valid.
- `prefetchStatusLine(tick: number): string | null`: baris status prefetch (`⠋ memuat N/1025 spesies...`) atau `null` saat `getPrefetchProgress().done`. Ini satu-satunya tempat UI membaca progres prefetch; `theme.ts` boleh import `services/pokeapi.ts` karena `ui/` boleh import semua lapisan.
- `matchupLine(label, attackerTypes, defenderTypes): string` dan `effectivenessBadge(kind: Effectiveness): string`: indikator efektivitas type (`Serangmu: ×2 sangat efektif`). `theme.ts` import `effectiveness`/`effectivenessOf` dari `battle/damage.ts`; UI tidak pernah menghitung ulang chart sendiri.

## Screens

Masing-masing mengekspor satu fungsi `async` dengan return `Promise<void>`:

- `explore.ts` → `runExploreScreen()`: tampilkan "Mencari Pokémon liar...", panggil `getRandomSpecies()`, buat battle dengan `createBattle`. Jika gagal (tidak ada Pokémon hidup), tampilkan `message` dan tawarkan heal. Loop battle: tampilkan kedua Pokémon (nama, level, type, bar HP), menu Attack / Catch / Ganti Pokémon / Run, render `events` dari engine, simpan `state` baru dari `BattleStep`, ulangi sampai `outcome` tidak `null`. Jika `needsSwitch(state)`, paksa pemain memilih pengganti lewat `switchActive(..., { forced: true })`. Setelah battle, tampilkan ringkasan hasil (EXP, level naik, hasil tangkapan masuk party atau box).
- `renderScoreboard(state)` mengembalikan `{ lines, wildBarIndex }`, bukan `string[]`. `wildBarIndex` dipakai saat menganimasikan serangan pemain supaya bar milik wild bisa digambar ulang tanpa menebak posisinya — hitung ulang indeksnya kalau menambah baris setelah blok wild.
- Di bawah blok liar ada dua baris matchup (`matchupLine`): `Serangmu` (type aktif vs wild) dan `Serangnya` (wild vs aktif). Keduanya hanya muncul saat ada Pokémon aktif.
- Animasi: helper privat `revealLines` menampilkan event satu per satu memakai `frames()` dan `delay(ANIMATION_EVENT_DELAY_MS)`, lalu `revealHpDrain` menurunkan bar HP wild memakai `hpBarDrain` dan `delay(ANIMATION_HP_TICK_MS)`. Keduanya melewati jeda saat `ANIMATION_ENABLED` bernilai `false`. Hasil giliran ditutup dengan `panel('Hasil', ...)`. Animasi hanya jalan saat serangan pemain; hasil akhir (win/lose/caught/ran) tetap memakai layar statis.
- `party.ts` → `runPartyScreen()`: tampilkan party dan PC box. Pilih Pokémon, lalu aksi: Detail, Ganti nickname, Pindah ke party/box, Lepas (dengan `askConfirm`), Kembali.
- `collection.ts` → `runCollectionScreen()`: opsi Urutkan (pilih key dari `SORT_KEYS` dan arah), Cari nama, Filter type, Lihat semua. Tampilkan hasil dengan `formatPokemonLine`. Tangani hasil kosong dengan pesan ramah.
- `stats.ts` → `runStatsScreen()`: tampilkan hasil `getTrainerStats()` dengan format rapi dan berwarna.
- `pokedex.ts` → `runPokedexScreen()`: tampilkan hasil `getPokedex()`. Baris tertangkap memakai `✓` hijau, terlihat saja memakai `·` kuning, belum terlihat memakai `?` abu-abu. Judul diikuti ringkasan `Terlihat X/1025 · Tertangkap Z/1025` dari `getPokedexProgress()` (penyebut tetap `MAX_SPECIES_ID`, bukan jumlah baris), lalu `Entri dimuat: N/1025` plus status prefetch. Daftar dipotong `POKEDEX_PAGE_SIZE` (40) baris dengan ekor `... dan N entri lain` supaya terminal tidak dibanjiri 1025 baris.
- Highlight keberhasilan: event `caught` dirender `chalk.bold.inverse.green` (latar penuh, bukan hanya teks hijau), dan pesan hasil akhir berwarna per outcome lewat `outcomeColor` (`caught` inverse hijau, `win` hijau, `lose` merah, `ran` abu-abu). Jangan bungkus ulang baris ini dengan `chalk` lain karena akan menimpa highlight-nya.


Pecah function panjang di screen menjadi helper kecil (render, handle aksi). Tidak ada function screen yang lebih dari sekitar 30 baris.
