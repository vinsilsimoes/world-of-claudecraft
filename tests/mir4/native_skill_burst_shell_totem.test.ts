import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Burst Shell native Totem plan', () => {
  it('compiles the exact five-contact explosive timeline and preserves the source summary mismatch', () => {
    const plan = mir4NativeRuntimeTotemPlan(4103);
    expect(plan).toMatchObject({
      skillId: 4103,
      spawnAttackId: 410302,
      totemId: 1401,
      spawnOffsetMs: 600,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill4103.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 3000,
      },
      ownerSnapshot: {
        damagePower: 'owner-physical-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      attackDelayMs: 6000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 23_500,
      aggregateLevelUpCoefficient: 550,
    });
    expect(
      plan?.contacts.map(({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
        attackId,
        offsetMs,
        coefficient,
        levelUpCoefficient,
      })),
    ).toEqual([
      { attackId: 410311, offsetMs: 1450, coefficient: 4500, levelUpCoefficient: 110 },
      { attackId: 410311, offsetMs: 1500, coefficient: 4500, levelUpCoefficient: 110 },
      { attackId: 410312, offsetMs: 1600, coefficient: 5500, levelUpCoefficient: 110 },
      { attackId: 410313, offsetMs: 1700, coefficient: 4500, levelUpCoefficient: 110 },
      { attackId: 410313, offsetMs: 1750, coefficient: 4500, levelUpCoefficient: 110 },
    ]);
    expect(plan?.contacts.every((contact) =>
      contact.nativeCombat?.attackRagePoint === 650 &&
      contact.nativeCombat.hitRagePoint === 240 &&
      contact.nativeCombat.aggroRate === 8000,
    )).toBe(true);
    expect(
      plan?.contacts.every(
        (contact) =>
          contact.damageType === 1 &&
          contact.damageAttribute === 0 &&
          contact.area.radiusMaxYards === 8 &&
          contact.area.heightYards === 4 &&
          contact.area.targetCap === 5 &&
          contact.reaction.durationMs === 300 &&
          contact.reaction.probabilityPercent === 100,
      ),
    ).toBe(true);
  });
});
