import { describe, expect, it } from 'vitest';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Moonlight Orb native Totem plan', () => {
  it('compiles the exact eight-contact lunar-orb timeline', () => {
    const plan = mir4NativeRuntimeTotemPlan(3301);
    expect(plan).toMatchObject({
      skillId: 3301,
      spawnAttackId: 330101,
      totemId: 1004,
      spawnOffsetMs: 567,
      reconstruction: {
        authority: 'authorial-browser-reconstruction',
        nativeClaim: false,
        policyId: 'mir4-authorial.skill3301.totem-anchor-lifetime-v1',
        anchor: 'selected-target-position-at-cast',
        lifetimeMs: 6000,
      },
      ownerSnapshot: {
        damagePower: 'owner-spell-power-at-cast',
        accuracyNative: 3000,
        criticalNative: 1300,
        criticalOutcomeNative: 12000,
      },
      attackDelayMs: 8000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 20_000,
      aggregateLevelUpCoefficient: 440,
    });
    expect(
      plan?.contacts.map(
        ({ attackId, offsetMs, coefficient, levelUpCoefficient, reaction }) => ({
          attackId,
          offsetMs,
          coefficient,
          levelUpCoefficient,
          reaction: {
            kind: reaction.kind,
            moveDistanceYards: reaction.moveDistanceYards,
            moveDurationMs: reaction.moveDurationMs,
          },
        }),
      ),
    ).toEqual([
      { attackId: 330111, offsetMs: 867, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'knock-back', moveDistanceYards: -0.6, moveDurationMs: 200 } },
      { attackId: 330111, offsetMs: 1467, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'knock-back', moveDistanceYards: -0.6, moveDurationMs: 200 } },
      { attackId: 330112, offsetMs: 1817, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'attack-back', moveDistanceYards: -0.6, moveDurationMs: 200 } },
      { attackId: 330112, offsetMs: 2117, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'attack-back', moveDistanceYards: -0.6, moveDurationMs: 200 } },
      { attackId: 330113, offsetMs: 2467, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'knock-back', moveDistanceYards: -1, moveDurationMs: 200 } },
      { attackId: 330113, offsetMs: 2767, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'knock-back', moveDistanceYards: -1, moveDurationMs: 200 } },
      { attackId: 330114, offsetMs: 3117, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'attack-back', moveDistanceYards: -1, moveDurationMs: 200 } },
      { attackId: 330114, offsetMs: 3417, coefficient: 2500, levelUpCoefficient: 55, reaction: { kind: 'attack-back', moveDistanceYards: -1, moveDurationMs: 200 } },
    ]);
    expect(
      plan?.contacts.every(
        (contact) =>
          contact.damageType === 2 &&
          contact.damageAttribute === 5 &&
          contact.area.radiusMaxYards === 5.5 &&
          contact.area.heightYards === 3 &&
          contact.area.targetCap === 6 &&
          contact.reaction.probabilityPercent === 100,
      ),
    ).toBe(true);
  });
});
