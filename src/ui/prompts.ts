import chalk from 'chalk';
import { SPINNER_INTERVAL_MS } from '../constants.ts';

export interface MenuChoice<T extends string> {
  readonly value: T;
  readonly name: string;
  readonly description?: string;
}

const KEY_UP = '\u001b[A';
const KEY_DOWN = '\u001b[B';
const KEY_ENTER = '\r';
const KEY_ENTER_LF = '\n';
const KEY_CTRL_C = '\u0003';
const CURSOR = '❯';
const IDLE = ' ';

interface KeyState {
  index: number;
  done: boolean;
}

export class ExitPromptError extends Error {
  constructor() {
    super('Prompt dibatalkan.');
    this.name = 'ExitPromptError';
  }
}

export function isExitPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ExitPromptError';
}

function writeLines(lines: readonly string[]): void {
  process.stdout.write(`${lines.join('\n')}\n`);
}

function clearLines(count: number): void {
  if (count <= 0) return;
  process.stdout.write(`\u001b[${count}A`);
  for (let i = 0; i < count; i += 1) process.stdout.write('\u001b[2K\u001b[1B');
  process.stdout.write(`\u001b[${count}A`);
}

function readKey(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();

    const onData = (chunk: Buffer): void => {
      const chunkStr = chunk.toString('utf8');
      if (chunkStr === KEY_CTRL_C) {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(KEY_CTRL_C);
        return;
      }
      const isArrow = chunkStr.startsWith('\u001b[');
      if (!isArrow || chunkStr.length >= 3) {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(chunkStr);
      }
    };
    stdin.on('data', onData);
  });
}

export function renderMenu(
  message: string,
  choices: readonly MenuChoice<string>[],
  index: number,
): string[] {
  const lines: string[] = [chalk.bold(message)];
  for (let i = 0; i < choices.length; i += 1) {
    const choice = choices[i];
    if (!choice) continue;
    const cursor = i === index ? chalk.cyan(CURSOR) : IDLE;
    const hasColor = choice.name.includes('\u001b[');
    const label = i === index && !hasColor ? chalk.cyan(choice.name) : choice.name;
    lines.push(`${cursor} ${label}`);
  }
  const active = choices[index];
  lines.push(chalk.gray(`  ${active?.description ?? ' '}`));
  lines.push(chalk.gray('↑↓ pilih • ⏎ konfirmasi • Ctrl+C keluar'));
  return lines;
}

export interface SelectMenuOptions {
  readonly status?: (tick: number) => string | null;
  readonly statusIntervalMs?: number;
}

export async function selectMenu<T extends string>(
  message: string,
  choices: readonly MenuChoice<T>[],
  options: SelectMenuOptions = {},
): Promise<T> {
  if (choices.length === 0) throw new Error('selectMenu butuh minimal satu pilihan.');
  const state: KeyState = { index: 0, done: false };
  const menuChoices = choices as readonly MenuChoice<string>[];
  let tick = 0;
  let statusLine = options.status?.(tick) ?? null;

  const compose = (): string[] => {
    const lines = renderMenu(message, menuChoices, state.index);
    if (statusLine !== null) lines.push(statusLine);
    return lines;
  };

  let drawn = compose();
  writeLines(drawn);

  const interval = options.status
    ? setInterval(() => {
        tick += 1;
        const next = options.status?.(tick) ?? null;
        if (next === statusLine) return;
        statusLine = next;
        clearLines(drawn.length);
        drawn = compose();
        writeLines(drawn);
      }, options.statusIntervalMs ?? SPINNER_INTERVAL_MS)
    : undefined;

  try {
    while (!state.done) {
      const key = await readKey();
      if (key === KEY_CTRL_C) {
        process.stdout.write('\n');
        throw new ExitPromptError();
      }
      if (key === KEY_UP) {
        state.index = (state.index - 1 + menuChoices.length) % menuChoices.length;
      } else if (key === KEY_DOWN) {
        state.index = (state.index + 1) % menuChoices.length;
      } else if (key === KEY_ENTER || key === KEY_ENTER_LF) {
        state.done = true;
        break;
      } else {
        continue;
      }
      clearLines(drawn.length);
      drawn = compose();
      writeLines(drawn);
    }
  } finally {
    clearInterval(interval);
  }

  const picked = menuChoices[state.index];
  if (!picked) throw new Error('Indeks pilihan di luar jangkauan.');
  clearLines(drawn.length);
  writeLines([`${chalk.cyan(CURSOR)} ${chalk.cyan(picked.name)}`]);
  return picked.value as T;
}

function readLine(prompt: string, defaultValue: string): Promise<string> {
  writeLines([`${chalk.bold(prompt)}${defaultValue ? chalk.gray(` (${defaultValue})`) : ''}`]);
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();
    let buffer = '';
    writeLines([`${chalk.cyan('❯')} `]);

    const finish = (): void => {
      stdin.setRawMode?.(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    const onData = (chunk: Buffer): void => {
      const raw = chunk.toString('utf8');
      if (raw === KEY_CTRL_C) {
        finish();
        process.stdout.write('\n');
        reject(new ExitPromptError());
        return;
      }
      for (const ch of raw) {
        if (ch === KEY_ENTER || ch === KEY_ENTER_LF) {
          finish();
          const result = buffer.length > 0 ? buffer : defaultValue;
          clearLines(2);
          writeLines([`${chalk.cyan('❯')} ${result}`]);
          resolve(result);
          return;
        }
        if (ch === '\u007f' || ch === '\b') {
          buffer = buffer.slice(0, -1);
        } else if (ch >= ' ') {
          buffer += ch;
        }
      }
      clearLines(2);
      writeLines([`${chalk.bold(prompt)}${defaultValue ? chalk.gray(` (${defaultValue})`) : ''}`]);
      writeLines([`${chalk.cyan('❯')} ${buffer}`]);
    };
    stdin.on('data', onData);
  });
}

export function askText(message: string, defaultValue?: string): Promise<string> {
  return readLine(message, defaultValue ?? '');
}

export async function askConfirm(message: string): Promise<boolean> {
  const answer = await readLine(`${message} (y/n)`, '');
  return answer.trim().toLowerCase().startsWith('y');
}

export async function pause(): Promise<void> {
  await readLine('Tekan Enter untuk melanjutkan...', '');
}
