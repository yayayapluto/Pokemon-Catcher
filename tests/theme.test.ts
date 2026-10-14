import { describe, expect, test } from 'bun:test';
import { HP_DRAIN_STEPS, SPINNER_FRAMES } from '../src/constants.ts';
import {
  frames,
  hpBar,
  hpBarDrain,
  panel,
  section,
  spinnerFrame,
  typeGlyphStrip,
} from '../src/ui/theme.ts';

describe('typeGlyphStrip', () => {
  test('mengembalikan glyph bertipe, bukan format badge', () => {
    const strip = typeGlyphStrip(['fire']);
    expect(strip.length).toBeGreaterThan(0);
    expect(strip.includes('[')).toBe(false);
  });

  test('menggabungkan beberapa tipe dengan spasi', () => {
    const strip = typeGlyphStrip(['grass', 'poison']);
    expect(strip.includes(' ')).toBe(true);
  });

  test('daftar kosong tetap menghasilkan penanda', () => {
    expect(typeGlyphStrip([]).length).toBeGreaterThan(0);
  });
});

describe('panel', () => {
  test('heading kosong hanya mengembalikan body yang diindentasi', () => {
    const lines = panel('', ['satu', 'dua']);
    expect(lines.length).toBe(2);
    expect(lines[0]?.startsWith('  satu')).toBe(true);
  });

  test('heading diikuti baris kosong lalu body terindentasi', () => {
    const lines = panel('Hasil', ['menang']);
    expect(lines.length).toBe(3);
    expect(lines[0]?.includes('Hasil')).toBe(true);
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('  menang');
  });

  test('section menyisipkan baris kosong setelah heading tanpa indentasi body', () => {
    const lines = section('Tim Aktif', ['a', 'b']);
    expect(lines[1]).toBe('');
    expect(lines.slice(2)).toEqual(['a', 'b']);
    expect(lines[0]?.includes('Tim Aktif')).toBe(true);
    expect(section('', ['a'])).toEqual(['a']);
  });
});

describe('frames', () => {
  test('mengembalikan potongan bertambah satu baris', () => {
    expect(frames(['a', 'b', 'c'])).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c']]);
  });

  test('daftar kosong menghasilkan tanpa frame', () => {
    expect(frames([])).toEqual([]);
  });
});

describe('hpBarDrain', () => {
  test('langkah pertama sama dengan bar awal', () => {
    expect(hpBarDrain(100, 60, 100, 1)).toBe(hpBar(100, 100));
  });

  test('langkah terakhir sama dengan bar akhir', () => {
    expect(hpBarDrain(100, 60, 100, HP_DRAIN_STEPS)).toBe(hpBar(60, 100));
  });

  test('langkah antara berbeda dari titik awal dan akhir', () => {
    const mid = hpBarDrain(100, 60, 100, 2);
    expect(mid).not.toBe(hpBar(100, 100));
    expect(mid).not.toBe(hpBar(60, 100));
  });
});

describe('spinnerFrame', () => {
  test('menggilir seluruh frame lalu kembali ke awal', () => {
    const seen = SPINNER_FRAMES.map((_, index) => spinnerFrame(index));
    expect(seen).toEqual([...SPINNER_FRAMES]);
    expect(spinnerFrame(SPINNER_FRAMES.length)).toBe(SPINNER_FRAMES[0]);
  });

  test('tick negatif tetap menghasilkan frame yang valid', () => {
    const framesList: readonly string[] = SPINNER_FRAMES;
    expect(framesList).toContain(spinnerFrame(-1));
  });
});
