// Pure MIR4 status-value primitives. Every character source writes through
// this accumulator so duplicate equipment, album and progression paths cannot
// silently apply a status with different arithmetic.

export type Mir4StatusValues = ReadonlyMap<number, number>;
export type Mir4StatusRecord = Readonly<Record<number, number>>;

export class Mir4StatusAccumulator {
  readonly #values = new Map<number, number>();

  add(statusId: number, value: number): void {
    const id = Math.floor(statusId);
    const amount = Math.floor(value);
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      id > 164 ||
      !Number.isSafeInteger(amount) ||
      amount === 0
    ) {
      return;
    }
    this.#values.set(id, (this.#values.get(id) ?? 0) + amount);
  }

  addAll(values: Iterable<readonly [number, number]>): void {
    for (const [statusId, value] of values) this.add(statusId, value);
  }

  value(statusId: number): number {
    return this.#values.get(statusId) ?? 0;
  }

  snapshot(): Mir4StatusValues {
    return new Map(this.#values);
  }

  record(): Mir4StatusRecord {
    return Object.freeze(Object.fromEntries(this.#values));
  }
}

export function mir4StatusValue(values: Mir4StatusValues, statusId: number): number {
  return values.get(statusId) ?? 0;
}

export function mir4StatusRecordValue(
  values: Mir4StatusRecord | undefined,
  statusId: number,
): number {
  return values?.[statusId] ?? 0;
}

/** Apply an additive 10,000-point rate to a nonnegative integer value. */
export function mir4ApplyRate(value: number, rateBps: number, minimum = 0): number {
  const base = Math.max(0, Math.floor(value));
  const rate = Math.max(-10_000, Math.min(100_000, Math.floor(rateBps)));
  return Math.max(minimum, Math.floor((base * (10_000 + rate)) / 10_000));
}
