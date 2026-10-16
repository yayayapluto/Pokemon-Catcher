export function assertNever(value: never): never {
  throw new Error(`Nilai tak terduga: ${JSON.stringify(value)}`);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
