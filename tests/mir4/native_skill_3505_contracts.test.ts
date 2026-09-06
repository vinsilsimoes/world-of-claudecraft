import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3505 Blasting Charm compiled contracts', () => {
  it('promotes the exact homing talisman and target-area explosion', () => {
    const action = mir4NativeSkillActionById(3505);
    const authority = mir4RuntimeSkillExecutionAuthority(3505);

    expect(action?.rows.map((row) => row.attackId)).toEqual([350501, 350502]);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(3505));
    expect(authority?.plan).toMatchObject({
      skillId: 3505,
      cooldownMs: 28_000,
      skillCostType: 2,
      skillCost: 4_000,
      attackAnimationMs: 1_533,
      endCutAnimationMs: 1_350,
      sourceHitCount: 1,
      requiredClassLevel: 32,
      requiresTarget: true,
      damageAllocation: 'per-impact',
    });
    expect(authority?.plan?.rows[0]).toMatchObject({
      attackId: 350501,
      projectile: {
        movement: 'target-homing',
        releaseOffsetMs: 830,
        travelSpeedYardsPerSecond: 40,
        lifetimeMs: 2_000,
        socketName: 'Hand_L',
        effectId: 2_040_034,
        effectScale: 1,
      },
      contacts: [],
    });
    expect(authority?.plan?.rows[1]).toMatchObject({
      attackId: 350502,
      target: { impactType: 1, authorialTargetValue: 5 },
      geometry: { nativeDistanceMax: 600, nativeHeight: 400 },
      contacts: [
        {
          sourceImpactIndex: 0,
          offsetMs: 1_080,
          damage: {
            damageType: 2,
            damageAttribute: 6,
            coefficient: 24_000,
            levelUpCoefficient: 500,
            componentImpactCount: 1,
            allocationMode: 'per-impact',
          },
        },
      ],
    });
  });
});
