import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Ice Cage Totem contract', () => {
  it('compiles the reviewed seven-contact cage timeline without changing the source summary', () => {
    const plan = mir4NativeRuntimeTotemPlan(4105);
    expect(plan).toMatchObject({
      skillId: 4105,
      spawnAttackId: 410501,
      totemId: 1404,
      spawnOffsetMs: 560,
      reconstruction: {
        policyId: 'mir4-authorial.skill4105.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 3000,
      },
      ownerSnapshot: {
        damagePower: 'owner-physical-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      aggregateCoefficient: 19_000,
      aggregateLevelUpCoefficient: 400,
    });
    expect(
      plan?.contacts.map(({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
        attackId,
        offsetMs,
        coefficient,
        levelUpCoefficient,
      })),
    ).toEqual([
      { attackId: 410511, offsetMs: 660, coefficient: 2000, levelUpCoefficient: 50 },
      { attackId: 410511, offsetMs: 860, coefficient: 2000, levelUpCoefficient: 50 },
      { attackId: 410512, offsetMs: 960, coefficient: 2500, levelUpCoefficient: 50 },
      { attackId: 410512, offsetMs: 1160, coefficient: 2500, levelUpCoefficient: 50 },
      { attackId: 410513, offsetMs: 1260, coefficient: 2500, levelUpCoefficient: 50 },
      { attackId: 410513, offsetMs: 1460, coefficient: 2500, levelUpCoefficient: 50 },
      { attackId: 410514, offsetMs: 1560, coefficient: 5000, levelUpCoefficient: 100 },
    ]);
  });
});
