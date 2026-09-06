import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Flash Arrow native Totem plan', () => {
  it('compiles the exact six non-damaging field pulses and six-second lifetime', () => {
    const plan = mir4NativeRuntimeTotemPlan(4107);
    expect(plan).toMatchObject({
      skillId: 4107,
      spawnAttackId: 410701,
      totemId: 1406,
      spawnOffsetMs: 450,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill4107.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 6000,
      },
      ownerSnapshot: {
        damagePower: 'owner-physical-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      attackDelayMs: 8000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 0,
      aggregateLevelUpCoefficient: 0,
    });
    expect(
      plan?.contacts.map(({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
        attackId,
        offsetMs,
        coefficient,
        levelUpCoefficient,
      })),
    ).toEqual([
      { attackId: 410711, offsetMs: 750, coefficient: 0, levelUpCoefficient: 0 },
      { attackId: 410712, offsetMs: 1150, coefficient: 0, levelUpCoefficient: 0 },
      { attackId: 410713, offsetMs: 1550, coefficient: 0, levelUpCoefficient: 0 },
      { attackId: 410714, offsetMs: 1950, coefficient: 0, levelUpCoefficient: 0 },
      { attackId: 410715, offsetMs: 2350, coefficient: 0, levelUpCoefficient: 0 },
      { attackId: 410716, offsetMs: 2750, coefficient: 0, levelUpCoefficient: 0 },
    ]);
    expect(
      plan?.contacts.every(
        (contact) =>
          contact.damageType === 1 &&
          contact.damageAttribute === 0 &&
          contact.area.radiusMaxYards === 6 &&
          contact.area.heightYards === 3 &&
          contact.area.targetCap === 5 &&
          contact.nativeCombat?.attackRagePoint === 474 &&
          contact.nativeCombat.hitRagePoint === 240 &&
          contact.nativeCombat.aggroRate === 8000 &&
          contact.reaction.durationMs === 0 &&
          contact.reaction.probabilityPercent === 100,
      ),
    ).toBe(true);
  });
});
