export type Rng = () => number;

export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randomChoice<T>(items: T[], rng: Rng = Math.random): T {
  if (items.length === 0) {
    throw new RangeError('randomChoice menerima array kosong');
  }
  const index = randomInt(0, items.length - 1, rng);
  const picked = items[index];
  if (picked === undefined) {
    throw new RangeError('randomChoice gagal memilih elemen');
  }
  return picked;
}

export function chance(probability: number, rng: Rng = Math.random): boolean {
  return rng() < probability;
}
