// Pure, ephemeral provenance for MIR4 character statuses. The ledger explains
// the derived status map without becoming character state or save data.

import { Mir4StatusAccumulator, type Mir4StatusValues } from './status_values';

export const MIR4_STATUS_SOURCE_KINDS = [
  'level',
  'gear',
  'affix',
  'mount',
  'spirit',
  'codex',
  'training',
  'passive',
] as const;

export type Mir4StatusSourceKind = (typeof MIR4_STATUS_SOURCE_KINDS)[number];

export interface Mir4StatusSource {
  readonly sourceKind: Mir4StatusSourceKind;
  readonly sourceId: string;
}

export interface Mir4StatusContribution extends Mir4StatusSource {
  readonly statusId: number;
  readonly value: number;
}

export interface Mir4StatusLedgerSnapshot {
  readonly values: Mir4StatusValues;
  readonly contributions: readonly Mir4StatusContribution[];
}

export interface Mir4StatusSourceBreakdown extends Mir4StatusSource {
  readonly value: number;
}

/**
 * Status accumulator with source provenance. Accepted ids and integer
 * normalization deliberately delegate to Mir4StatusAccumulator, so adding
 * observability cannot alter the existing character totals.
 */
export class Mir4StatusLedger {
  readonly #statuses = new Mir4StatusAccumulator();
  readonly #contributions: Mir4StatusContribution[] = [];

  add(source: Mir4StatusSource, statusId: number, value: number): void {
    const normalizedStatusId = Math.floor(statusId);
    const before = this.#statuses.value(normalizedStatusId);
    this.#statuses.add(statusId, value);
    const accepted = this.#statuses.value(normalizedStatusId) - before;
    if (accepted === 0) return;
    this.#contributions.push(
      Object.freeze({
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        statusId: normalizedStatusId,
        value: accepted,
      }),
    );
  }

  addAll(source: Mir4StatusSource, values: Iterable<readonly [number, number]>): void {
    for (const [statusId, value] of values) this.add(source, statusId, value);
  }

  value(statusId: number): number {
    return this.#statuses.value(statusId);
  }

  snapshot(): Mir4StatusLedgerSnapshot {
    return Object.freeze({
      values: this.#statuses.snapshot(),
      contributions: Object.freeze([...this.#contributions]),
    });
  }
}

/** Rebuild the final status map from provenance alone. */
export function mir4StatusTotalsFromContributions(
  contributions: Iterable<Mir4StatusContribution>,
): Mir4StatusValues {
  const statuses = new Mir4StatusAccumulator();
  for (const contribution of contributions) {
    statuses.add(contribution.statusId, contribution.value);
  }
  return statuses.snapshot();
}

/** Aggregate one status by source while preserving first-seen source order. */
export function mir4StatusBreakdown(
  contributions: Iterable<Mir4StatusContribution>,
  statusId: number,
): readonly Mir4StatusSourceBreakdown[] {
  const order: string[] = [];
  const totals = new Map<string, Mir4StatusSourceBreakdown>();
  for (const contribution of contributions) {
    if (contribution.statusId !== statusId) continue;
    const key = `${contribution.sourceKind}\u0000${contribution.sourceId}`;
    const prior = totals.get(key);
    if (!prior) {
      order.push(key);
      totals.set(key, {
        sourceKind: contribution.sourceKind,
        sourceId: contribution.sourceId,
        value: contribution.value,
      });
      continue;
    }
    totals.set(key, { ...prior, value: prior.value + contribution.value });
  }
  return Object.freeze(
    order.map((key) => {
      const breakdown = totals.get(key);
      if (!breakdown) throw new Error(`missing MIR4 status breakdown for ${key}`);
      return Object.freeze(breakdown);
    }),
  );
}

/** Select contributions emitted by one progression system. */
export function mir4StatusContributionsBySource(
  contributions: readonly Mir4StatusContribution[],
  sourceKind: Mir4StatusSourceKind,
): readonly Mir4StatusContribution[] {
  return Object.freeze(contributions.filter((entry) => entry.sourceKind === sourceKind));
}
