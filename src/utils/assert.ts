export function assertNever(value: never): never {
  throw new Error(`Nilai tak terduga: ${JSON.stringify(value)}`);
}
