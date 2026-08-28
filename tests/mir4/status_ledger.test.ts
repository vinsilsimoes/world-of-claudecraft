import { describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import { aggregateMir4PassiveBonuses } from '../../src/sim/content/mir4/passives';
import { MIR4_SPIRITS_CATALOG } from '../../src/sim/content/mir4/spirits_catalog';
import { aggregateMir4CharacterStatuses } from '../../src/sim/mir4/status_aggregation';
import {
  MIR4_STATUS_SOURCE_KINDS,
  Mir4StatusLedger,
  mir4StatusBreakdown,
  mir4StatusContributionsBySource,
  mir4StatusTotalsFromContributions,
} from '../../src/sim/mir4/status_ledger';

describe('MIR4 status contribution ledger', () => {
  it('normalizes through the status accumulator and explains totals by source', () => {
    const ledger = new Mir4StatusLedger();
    ledger.add({ sourceKind: 'level', sourceId: 'level:1:1' }, 20.9, 10.9);
    ledger.add({ sourceKind: 'gear', sourceId: 'equipment:1:991010101' }, 20, 5);
    ledger.add({ sourceKind: 'gear', sourceId: 'equipment:1:991010101' }, 20, 2);
    ledger.add({ sourceKind: 'affix', sourceId: 'invalid' }, 0, 999);

    const snapshot = ledger.snapshot();
    expect(snapshot.values.get(20)).toBe(17);
    expect(snapshot.contributions).toHaveLength(3);
    expect(mir4StatusBreakdown(snapshot.contributions, 20)).toEqual([
      { sourceKind: 'level', sourceId: 'level:1:1', value: 10 },
      { sourceKind: 'gear', sourceId: 'equipment:1:991010101', value: 7 },
    ]);
    expect(mir4StatusTotalsFromContributions(snapshot.contributions)).toEqual(snapshot.values);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.contributions)).toBe(true);
    expect(snapshot.contributions.every((entry) => Object.isFrozen(entry))).toBe(true);
  });

  it('attributes every progression system without changing the aggregate status map', () => {
    const mount = MIR4_MOUNTS_CATALOG[0];
    const spirit = MIR4_SPIRITS_CATALOG[0];
    if (!mount || !spirit) throw new Error('MIR4 collection catalogs must not be empty');
    const result = aggregateMir4CharacterStatuses({
      classId: 1,
      level: 20,
      equipment: { 1: 991010101, 5: 991050101 },
      instances: {
        991010101: {
          itemId: 991010101,
          enhancement: 1,
          affixes: { enchantment: [[20, 7]], blessing: [[30, 2]] },
        },
        991050101: {
          itemId: 991050101,
          enhancement: 0,
          affixes: { blessing: [[29, 3]] },
        },
      },
      mounts: {
        owned: { [mount.id]: 1 },
        discovered: [mount.id],
        equippedMountId: mount.id,
      },
      spirits: {
        owned: { [spirit.id]: 1 },
        discovered: [spirit.id],
        equippedSpiritId: spirit.id,
      },
      codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 25 } },
      },
      training: {
        version: 1,
        constitution: [1, 1, 1, 1, 1, 1, 1],
        innerForce: [1, 1, 1, 1],
      },
    });

    expect(mir4StatusTotalsFromContributions(result.contributions)).toEqual(result.values);
    expect(new Set(result.contributions.map((entry) => entry.sourceKind))).toEqual(
      new Set(MIR4_STATUS_SOURCE_KINDS),
    );
    expect(
      Object.fromEntries(
        MIR4_STATUS_SOURCE_KINDS.map((sourceKind) => [
          sourceKind,
          result.contributions
            .filter((entry) => entry.sourceKind === sourceKind)
            .map((entry) => [entry.statusId, entry.value]),
        ]),
      ),
    ).toEqual({
      level: [
        [1, 8_560],
        [6, 790],
        [19, 710],
        [20, 202],
        [24, 95],
        [26, 95],
        [28, 76],
        [29, 76],
        [38, 19],
        [41, 86],
        [43, 86],
      ],
      gear: [
        [20, 18],
        [28, 2],
        [24, 14],
        [26, 11],
        [31, 1],
      ],
      affix: [
        [20, 7],
        [30, 2],
        [29, 3],
      ],
      mount: [
        [1, 25],
        [24, 4],
        [26, 4],
      ],
      spirit: [
        [1, 25],
        [20, 2],
        [22, 2],
        [24, 2],
        [26, 2],
        [28, 1],
      ],
      codex: [[1, 100]],
      training: [
        [24, 12],
        [26, 12],
        [1, 100],
        [6, 20],
        [29, 4],
        [28, 4],
        [20, 14],
        [40, 5],
      ],
      passive: [[1, 704]],
    });
    expect([...result.values]).toEqual([
      [1, 9_514],
      [6, 810],
      [19, 710],
      [20, 243],
      [24, 127],
      [26, 124],
      [28, 83],
      [29, 83],
      [38, 19],
      [41, 86],
      [43, 86],
      [30, 2],
      [31, 1],
      [40, 5],
      [22, 2],
    ]);

    const gear = mir4StatusContributionsBySource(result.contributions, 'gear');
    const affixes = mir4StatusContributionsBySource(result.contributions, 'affix');
    expect(gear.length).toBeGreaterThan(0);
    expect(gear.every((entry) => entry.sourceId.startsWith('equipment:'))).toBe(true);
    expect(affixes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'equipment:1:991010101:enchantment', value: 7 }),
        expect.objectContaining({ sourceId: 'equipment:1:991010101:blessing', value: 2 }),
        expect.objectContaining({ sourceId: 'equipment:5:991050101:blessing', value: 3 }),
      ]),
    );
    expect(mir4StatusContributionsBySource(result.contributions, 'mount').length).toBeGreaterThan(
      0,
    );
    expect(mir4StatusContributionsBySource(result.contributions, 'spirit').length).toBeGreaterThan(
      0,
    );
    expect(mir4StatusContributionsBySource(result.contributions, 'codex').length).toBeGreaterThan(
      0,
    );
  });

  it('records passives as the applied difference instead of duplicating their base', () => {
    const result = aggregateMir4CharacterStatuses({ classId: 1, level: 20 });
    const passive = mir4StatusContributionsBySource(result.contributions, 'passive');
    const beforePassive = mir4StatusTotalsFromContributions(
      result.contributions.filter((entry) => entry.sourceKind !== 'passive'),
    );
    const rates = aggregateMir4PassiveBonuses(1, 20);

    expect(passive.length).toBeGreaterThan(0);
    for (const contribution of passive) {
      expect(contribution.value).toBe(
        Math.floor(
          ((beforePassive.get(contribution.statusId) ?? 0) *
            (rates.get(contribution.statusId) ?? 0)) /
            10_000,
        ),
      );
    }
  });
});
