import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Dragon Tornado native Totem plan', () => {
  it('compiles the exact ten-contact timeline and fixed-area contract', () => {
    const plan = mir4NativeRuntimeTotemPlan(2403);
    expect(plan).toMatchObject({
      skillId: 2403,
      spawnAttackId: 240302,
      totemId: 1013,
      spawnOffsetMs: 100,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill2403.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 6000,
      },
      ownerSnapshot: {
        damagePower: 'owner-spell-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      aggregateCoefficient: 68_000,
      aggregateLevelUpCoefficient: 1500,
    });
    expect(plan?.contacts.map(({ attackId, offsetMs, coefficient, levelUpCoefficient }) => ({
      attackId, offsetMs, coefficient, levelUpCoefficient,
    }))).toEqual([
      { attackId: 240321, offsetMs: 555, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240321, offsetMs: 700, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240321, offsetMs: 800, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240322, offsetMs: 950, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240322, offsetMs: 1050, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240323, offsetMs: 1150, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240324, offsetMs: 1250, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240324, offsetMs: 1450, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240324, offsetMs: 1650, coefficient: 6800, levelUpCoefficient: 150 },
      { attackId: 240325, offsetMs: 1850, coefficient: 6800, levelUpCoefficient: 150 },
    ]);
    expect(plan?.contacts.every((contact) =>
      contact.area.radiusMaxYards === 7 &&
      contact.area.heightYards === 4 &&
      contact.area.targetCap === 10
    )).toBe(true);
    expect(plan?.contacts[0].reaction).toMatchObject({ kind: 'knock-back', nativeValue: 20, probabilityPercent: 10 });
    expect(plan?.contacts[3].reaction).toMatchObject({ kind: 'knock-back', nativeValue: -20, probabilityPercent: 10 });
    expect(plan?.contacts[5].reaction).toMatchObject({ kind: 'knock-down', nativeHeight: 700, durationMs: 2100, probabilityPercent: 10 });
  });

  it('keeps unsupported Totems fail-closed', () => {
    expect(mir4NativeRuntimeTotemPlan(2402)).toBeNull();
  });
});
