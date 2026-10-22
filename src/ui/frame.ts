const ANSI_CLEAR = '\x1b[2J\x1b[H';
const ANSI_CURSOR_HIDE = '\x1b[?25l';
const ANSI_CURSOR_SHOW = '\x1b[?25h';

let sessionActive = false;
let exitHookRegistered = false;

function restoreCursorOnExit(): void {
  if (sessionActive) process.stdout.write(ANSI_CURSOR_SHOW);
}

export function beginScreenSession(): void {
  if (!process.stdout.isTTY || sessionActive) return;
  sessionActive = true;
  if (!exitHookRegistered) {
    exitHookRegistered = true;
    process.on('exit', restoreCursorOnExit);
  }
  process.stdout.write(ANSI_CURSOR_HIDE);
  process.stdout.write(ANSI_CLEAR);
}

export function endScreenSession(): void {
  if (!sessionActive) return;
  sessionActive = false;
  process.stdout.write(ANSI_CURSOR_SHOW);
}

export function drawScreen(lines: string[]): void {
  if (process.stdout.isTTY) process.stdout.write(ANSI_CLEAR);
  process.stdout.write(`${lines.join('\n')}\n`);
}
