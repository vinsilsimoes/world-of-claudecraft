import { describe, expect, it } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Ice Cage native presentation', () => {
  it('pins the inspected Skl05 animation and extracted dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4105)).toMatchObject({
      skillId: 4105,
      source: {
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl05',
        sha256: '35537B2698A69C1353A7AABDA5C83E924E6DD8F063E46D24F40352C0BC2D19E2',
        sizeBytes: 37_210,
      },
      presentation: {
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_001',
          '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_Shoot',
        ],
      },
    });
  });

  it('presents the direct blast and seven fixed cage contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4105);
    if (!plan) throw new Error('Missing Ice Cage plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    expect(event).toMatchObject({
      skillId: 4105,
      ability: 'mir4_skill_4105',
      profile: 'arbalist-ice-cage',
      durationMs: 3560,
      endCutMs: 900,
      persistentArea: {
        spawnOffsetMs: 560,
        expiresOffsetMs: 3560,
        x: 12,
        z: 18,
        radiusYards: 5,
        heightYards: 3,
      },
      projectiles: [{ attackId: 410501, launchOffsetMs: 560, speedYardsPerSecond: 30 }],
    });
    expect(
      event?.contacts.map((contact) => [
        contact.attackId,
        contact.offsetMs,
        contact.shape,
        contact.damageCoefficient,
      ]),
    ).toEqual([
      [410511, 660, 'fixed-circle', 2000],
      [410511, 860, 'fixed-circle', 2000],
      [410502, 900, 'target-circle', 4000],
      [410512, 960, 'fixed-circle', 2500],
      [410512, 1160, 'fixed-circle', 2500],
      [410513, 1260, 'fixed-circle', 2500],
      [410513, 1460, 'fixed-circle', 2500],
      [410514, 1560, 'fixed-circle', 5000],
    ]);
    if (!event) throw new Error('Missing Ice Cage event');
    expect(new Mir4NativeSkillPresentationPainter({ playContact() {} }, 1).start(event)).toBe(true);
  });

  it('fails closed without the fixed target anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4105);
    if (!plan) throw new Error('Missing Ice Cage plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
