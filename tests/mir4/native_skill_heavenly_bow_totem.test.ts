import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Heavenly Bow native Totem plan', () => {
  it('compiles the exact seven-contact arrow-rain timeline and preserves the source summary mismatch', () => {
    const plan = mir4NativeRuntimeTotemPlan(4108);
    expect(plan).toMatchObject({
      skillId: 4108,
      spawnAttackId: 410801,
      totemId: 1403,
      spawnOffsetMs: 100,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill4108.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 6000,
      },
      ownerSnapshot: {
        damagePower: 'owner-physical-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 2500,
        criticalOutcomeNative: 12000,
      },
      attackDelayMs: 8000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 26_400,
      aggregateLevelUpCoefficient: 528,
    });
    expect(
      plan?.contacts.map(({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
        attackId,
        offsetMs,
        coefficient,
        levelUpCoefficient,
      })),
    ).toEqual([
      { attackId: 410811, offsetMs: 555, coefficient: 6600, levelUpCoefficient: 132 },
      { attackId: 410812, offsetMs: 700, coefficient: 3300, levelUpCoefficient: 66 },
      { attackId: 410812, offsetMs: 800, coefficient: 3300, levelUpCoefficient: 66 },
      { attackId: 410813, offsetMs: 900, coefficient: 3300, levelUpCoefficient: 66 },
      { attackId: 410813, offsetMs: 1000, coefficient: 3300, levelUpCoefficient: 66 },
      { attackId: 410814, offsetMs: 1100, coefficient: 3300, levelUpCoefficient: 66 },
      { attackId: 410814, offsetMs: 1200, coefficient: 3300, levelUpCoefficient: 66 },
    ]);
    expect(
      plan?.contacts.every(
        (contact) =>
          contact.damageType === 1 &&
          contact.damageAttribute === 0 &&
          contact.area.radiusMaxYards === 7 &&
          contact.area.heightYards === 4 &&
          contact.area.targetCap === 8 &&
          contact.reaction.durationMs === 200 &&
          contact.reaction.probabilityPercent === 10,
      ),
    ).toBe(true);
  });
});
