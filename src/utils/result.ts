import type { Result } from '../types.ts';

export function ok<T>(message: string, data: T): Result<T> {
  return { ok: true, message, data };
}

export function okNull(message: string): Result<null> {
  return { ok: true, message, data: null };
}

export function fail(message: string): Result<never> {
  return { ok: false, message };
}
