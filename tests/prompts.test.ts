import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

class FakeStdin extends EventEmitter {
  isTTY = true;
  isRaw = false;

  setRawMode(value: boolean): this {
    this.isRaw = value;
    return this;
  }

  resume(): void {}
  pause(): void {}

  send(text: string): void {
    this.emit('data', Buffer.from(text, 'utf8'));
  }
}

const realStdin = process.stdin;
let fake: FakeStdin;

beforeEach(() => {
  fake = new FakeStdin();
  Object.defineProperty(process, 'stdin', { value: fake, configurable: true });
});

afterEach(() => {
  Object.defineProperty(process, 'stdin', { value: realStdin, configurable: true });
});

async function importPrompts() {
  return import('../src/ui/prompts.ts');
}

// Prompt mendaftarkan listener 'data' secara sinkron di dalam readKey sebelum
// await pertama, jadi flush microtask sudah cukup untuk memastikan listener siap.
async function ready(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function key(text: string): Promise<void> {
  await ready();
  fake.send(text);
}

describe('selectMenu', () => {
  test('navigasi panah lalu Enter mengembalikan pilihan yang disorot', async () => {
    const { selectMenu } = await importPrompts();
    const pending = selectMenu('Pilih:', [
      { value: 'a', name: 'Alpha' },
      { value: 'b', name: 'Beta' },
      { value: 'c', name: 'Gamma' },
    ]);
    await key('\u001b[B');
    await key('\u001b[B');
    await key('\u001b[A');
    await key('\r');
    expect(await pending).toBe('b');
  });

  test('panah atas dari pilihan pertama berputar ke pilihan terakhir', async () => {
    const { selectMenu } = await importPrompts();
    const pending = selectMenu('Pilih:', [
      { value: 'a', name: 'Alpha' },
      { value: 'b', name: 'Beta' },
    ]);
    await key('\u001b[A');
    await key('\r');
    expect(await pending).toBe('b');
  });

  test('tinggi frame tetap walau description pilihan aktif berbeda', async () => {
    const { renderMenu } = await importPrompts();
    const choices = [
      { value: 'a', name: 'Alpha', description: 'punya deskripsi' },
      { value: 'b', name: 'Beta' },
    ];
    const withDescription = renderMenu('Menu:', choices, 0);
    const withoutDescription = renderMenu('Menu:', choices, 1);
    expect(withDescription.length).toBe(withoutDescription.length);
    expect(withDescription.length).toBe(choices.length + 3);
  });

  test('Ctrl+C melempar ExitPromptError', async () => {
    const { selectMenu } = await importPrompts();
    const pending = selectMenu('Pilih:', [{ value: 'a', name: 'Alpha' }]);
    await key('\u0003');
    const error: unknown = await pending.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error instanceof Error && error.name === 'ExitPromptError').toBe(true);
  });
  test('daftar kosong melempar Error', async () => {
    const { selectMenu } = await importPrompts();
    await expect(selectMenu('Pilih:', [])).rejects.toThrow(Error);
  });
});

describe('askText', () => {
  test('mengembalikan teks yang diketik', async () => {
    const { askText } = await importPrompts();
    const pending = askText('Nama:');
    await key('hello');
    await key('\r');
    expect(await pending).toBe('hello');
  });

  test('Enter tanpa teks memakai nilai default', async () => {
    const { askText } = await importPrompts();
    const pending = askText('Nama:', 'def');
    await key('\r');
    expect(await pending).toBe('def');
  });

  test('backspace menghapus karakter terakhir', async () => {
    const { askText } = await importPrompts();
    const pending = askText('Nama:');
    await key('abc');
    await key('\u007f');
    await key('\r');
    expect(await pending).toBe('ab');
  });
});

describe('askConfirm', () => {
  test('jawaban y mengembalikan true', async () => {
    const { askConfirm } = await importPrompts();
    const pending = askConfirm('Yakin?');
    await key('y');
    await key('\r');
    expect(await pending).toBe(true);
  });

  test('jawaban n mengembalikan false', async () => {
    const { askConfirm } = await importPrompts();
    const pending = askConfirm('Yakin?');
    await key('n');
    await key('\r');
    expect(await pending).toBe(false);
  });
});

describe('isExitPromptError', () => {
  test('mengenali ExitPromptError dan menolak error lain', async () => {
    const { isExitPromptError, ExitPromptError } = await importPrompts();
    expect(isExitPromptError(new ExitPromptError())).toBe(true);
    expect(isExitPromptError(new Error('lain'))).toBe(false);
    expect(isExitPromptError('bukan error')).toBe(false);
  });
});
