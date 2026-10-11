import type { Failure, Result } from '../types.ts';

export function ok(message: string): Result<null>;
export function ok<T>(message: string, data: T): Result<T>;
export function ok<T>(message: string, data?: T): Result<T | null> {
  if (data === undefined) {
    return { ok: true, message, data: null };
  }
  return { ok: true, message, data };
}

export function fail(message: string): Failure {
  return { ok: false, message };
}
