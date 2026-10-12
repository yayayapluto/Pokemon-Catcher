# src/battle/AGENTS.md: engine battle

Konteks untuk `engine.ts`, `damage.ts`, `catch.ts`. Tipe dasar di `src/types.ts`, konstanta di `src/constants.ts`.

## Aturan modul

- Boleh import `functions.ts`, `constants.ts`, `types.ts`, `utils/`. Tidak boleh import `ui/`, `services/`, atau `data.ts` langsung.
- Tidak mencetak apa pun. Hasil dikembalikan sebagai data (event).
- Engine tidak menjalankan loop sendiri. UI memanggil per aksi.
- Setiap function yang memakai random menerima `rng: Rng = Math.random` sebagai parameter terakhir.
- State battle **immutable**: setiap aksi mengembalikan state baru, tidak memutasi state yang diterima. Yang dimutasi hanya store Pokémon pemain lewat function di `functions.ts`.
- Pokémon liar hidup hanya di `BattleState`, **bukan** di `pokemons`, sampai berhasil ditangkap.

## damage.ts

```ts
type Combatant = Pick<Pokemon, 'level' | 'attack' | 'defense'> & { readonly types: readonly PokemonType[] };

export type Effectiveness = 'immune' | 'weak' | 'neutral' | 'strong';

export function effectiveness(attackerTypes: readonly PokemonType[], defenderTypes: readonly PokemonType[]): number;
export function effectivenessOf(multiplier: number): Effectiveness;
export function calcDamage(attacker: Combatant, defender: Combatant, rng: Rng = Math.random): number;
```

`effectiveness` mengalikan `TYPE_CHART[attackerType][defenderType]` untuk setiap pasangan type
(dual-type bisa 4× atau 0.25×). `TYPE_CHART` adalah tabel 18×18 di `constants.ts`, hanya berisi
matchup yang bukan 1×; type yang tidak ada di baris berarti 1×.

Kekebalan (**0×**) mengembalikan `0` **sebelum** memanggil `rng` dan sebelum floor `Math.max(1, …)`.
Pemanggil wajib menangani damage 0: HP defender tidak berubah, log memakai label `tidak berpengaruh`.
`playerAttack` sudah menangani ini (`withWildHp` menerima `hp - 0`), tetapi jangan menambah asumsi
`damage >= 1` di kode baru.

Setelah selesai, simulasikan beberapa battle level setara (di test) dan pastikan satu battle berlangsung sekitar 3 sampai 8 giliran. Kalau terlalu cepat atau lambat, sesuaikan `DAMAGE_POWER` di `constants.ts` dan tulis perubahan di README.

## catch.ts

```ts
export function catchChance(wildHp: number, wildMaxHp: number, captureRate: number): number {
  const hpFactor = 1 - 0.66 * (wildHp / wildMaxHp);
  return clamp(hpFactor * (captureRate / 255) * 3, 0.1, 0.95);
}

export function runChance(playerSpeed: number, wildSpeed: number): number {
  return clamp(0.5 + (playerSpeed - wildSpeed) / 100, 0.25, 0.9);
}
```

Angka `0.66`, `255`, `3`, dan batas clamp dipindah ke `constants.ts` sebagai konstanta bernama. `wildMaxHp` harus lebih dari 0.

## engine.ts

Tipe yang diekspor dari file ini:

```ts
export type Side = 'player' | 'wild';
export type Outcome = 'win' | 'lose' | 'caught' | 'ran';

export type BattleEvent =
  | { readonly type: 'attack'; readonly side: Side; readonly damage: number; readonly effectiveness: Effectiveness; readonly message: string }
  | { readonly type: 'faint'; readonly side: Side; readonly message: string }
  | { readonly type: 'exp'; readonly amount: number; readonly message: string }
  | { readonly type: 'level-up'; readonly newLevel: number; readonly message: string }
  | { readonly type: 'catch-attempt'; readonly success: boolean; readonly message: string }
  | { readonly type: 'caught'; readonly entry: PokemonView; readonly message: string }
  | { readonly type: 'run-attempt'; readonly success: boolean; readonly message: string }
  | { readonly type: 'switch'; readonly message: string }
  | { readonly type: 'party-wiped'; readonly message: string };

export interface BattleState {
  readonly activeId: number;
  readonly wild: NewPokemon;
  readonly captureRate: number;
}

export interface BattleStep {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
  readonly outcome: Outcome | null;
}
```

Boleh menambah varian event, tapi harus tetap discriminated union dengan field `type` dan `message` (bahasa Indonesia, teks netral).

Fungsi yang diekspor:
- `rollWildLevel(rng: Rng = Math.random): number`: level tertinggi di party dikurangi `WILD_LEVEL_SPREAD` sampai ditambah `WILD_LEVEL_SPREAD` secara acak, di-clamp ke `MIN_WILD_LEVEL..MAX_LEVEL`.
- `createBattle(species: Species, level: number): Result<BattleState>`: ambil Pokémon aktif pertama di party yang `hp > 0`. Jika tidak ada, kembalikan `fail(...)` supaya UI menawarkan heal. `wild = buildPokemon(species, level)`, simpan `captureRate`, lalu panggil `recordSpeciesSeen` dari `functions.ts` dengan `speciesId`, `name`, dan `types` agar spesies liar tercatat di Pokédex. Ini satu-satunya tempat spesies liar dicatat sebagai terlihat, dan tidak mengubah `pokemons` sebelum Pokémon benar-benar ditangkap.
- `needsSwitch(state: BattleState): boolean`: `true` jika Pokémon aktif pingsan tetapi masih ada anggota party yang hidup.
- `playerAttack(state: BattleState, rng?: Rng): BattleStep`: urutan giliran berdasarkan `speed` (seri diacak). Pihak yang HP-nya 0 tidak menyerang.
  - Pemain menang jika HP wild 0: `gainExp(active.id, wild.level * 10 + 10)`, `recordBattleResult(true)`, outcome `'win'`. Event `exp` dan `level-up` ikut dikirim.
  - Pemain kalah jika semua party pingsan: `recordBattleResult(false)`, lalu `healAll()` (tanpa penalti lain), outcome `'lose'`.
  - Jika Pokémon aktif pingsan tapi party masih ada yang hidup: outcome `null`, UI memakai `needsSwitch`.
- `playerCatch(state: BattleState, rng?: Rng): BattleStep`: lempar dengan `catchChance`. Berhasil memanggil `catchPokemon(state.wild)` lalu outcome `'caught'` dan event `caught` membawa entry baru. Gagal berarti wild menyerang.
- `playerRun(state: BattleState, rng?: Rng): BattleStep`: berhasil sesuai `runChance` (outcome `'ran'`), gagal berarti wild menyerang.
- `switchActive(state: BattleState, id: number, options?: { forced?: boolean }, rng?: Rng): Result<BattleStep>`: ganti ke anggota party yang masih hidup dan ada di party, selain itu `fail`. Memakan giliran (wild menyerang) kecuali `forced: true` karena Pokémon aktif pingsan.

Aturan damage:
- Damage ke Pokémon pemain selalu lewat `applyDamage` supaya HP tersimpan di array.
- Damage ke wild hanya menghasilkan `wild` baru dengan `hp` berkurang (`{ ...state.wild, hp }`), minimum 0.
- Setelah `applyDamage` atau `gainExp`, baca ulang data lewat `getById(id)`. Jangan memakai referensi lama, nilainya sudah berubah.
- Tangani semua varian `Outcome` dan `BattleEvent` dengan `switch` exhaustive (`assertNever`) di tempat yang membutuhkan.
- Setiap event `attack` membawa `effectiveness` supaya UI bisa menandai matchup tanpa menghitung ulang. Pesan serangan menyisipkan label dari `TYPE_EFFECTIVE_LABELS`; matchup netral tidak diberi label.
