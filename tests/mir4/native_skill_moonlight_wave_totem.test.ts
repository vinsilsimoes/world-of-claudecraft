import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Moonlight Wave native Totem plan', () => {
  it('compiles the exact four-contact lunar-field timeline', () => {
    const plan = mir4NativeRuntimeTotemPlan(3506);
    expect(plan).toMatchObject({
      skillId: 3506,
      spawnAttackId: 350601,
      totemId: 1012,
      spawnOffsetMs: 200,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill3506.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 4000,
      },
      ownerSnapshot: {
        damagePower: 'owner-spell-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      attackDelayMs: 6000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 20_000,
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
      { attackId: 350611, offsetMs: 620, coefficient: 5000, levelUpCoefficient: 100 },
      { attackId: 350611, offsetMs: 700, coefficient: 5000, levelUpCoefficient: 100 },
      { attackId: 350612, offsetMs: 780, coefficient: 5000, levelUpCoefficient: 100 },
      { attackId: 350612, offsetMs: 800, coefficient: 5000, levelUpCoefficient: 100 },
    ]);
    expect(
      plan?.contacts.every(
        (contact) =>
          contact.damageType === 2 &&
          contact.damageAttribute === 5 &&
          contact.area.radiusMaxYards === 6 &&
          contact.area.heightYards === 4 &&
          contact.area.targetCap === 8 &&
          contact.reaction.durationMs === 300 &&
          contact.reaction.probabilityPercent === 100,
      ),
    ).toBe(true);
  });
});
