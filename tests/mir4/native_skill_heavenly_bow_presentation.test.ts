import { describe, expect, it } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Heavenly Bow native presentation', () => {
  it('pins the inspected Skl08 animation and extracted dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4108)).toMatchObject({
      skillId: 4108,
      source: {
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl08',
        sha256: '0EF652297693F2D70172265359A790CC310B8FE7B1A8D4E351D7294F3DA980AB',
        sizeBytes: 40_214,
      },
      presentation: {
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08',
          '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_01',
          '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_02',
          '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Smoke',
        ],
      },
    });
  });

  it('presents one direct impact and seven fixed arrow-rain contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4108);
    if (!plan) throw new Error('Missing Heavenly Bow plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    expect(event).toMatchObject({
      skillId: 4108,
      ability: 'mir4_skill_4108',
      profile: 'arbalist-heavenly-bow',
      durationMs: 6100,
      endCutMs: 1020,
      persistentArea: {
        spawnOffsetMs: 100,
        expiresOffsetMs: 6100,
        x: 12,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
      },
    });
    expect(
      event?.contacts.map((contact) => [contact.attackId, contact.offsetMs, contact.shape]),
    ).toEqual([
      [410811, 555, 'fixed-circle'],
      [410812, 700, 'fixed-circle'],
      [410812, 800, 'fixed-circle'],
      [410802, 900, 'target-circle'],
      [410813, 900, 'fixed-circle'],
      [410813, 1000, 'fixed-circle'],
      [410814, 1100, 'fixed-circle'],
      [410814, 1200, 'fixed-circle'],
    ]);
    if (!event) throw new Error('Missing Heavenly Bow event');
    expect(new Mir4NativeSkillPresentationPainter({ playContact() {} }, 1).start(event)).toBe(true);
  });

  it('fails closed without the fixed target anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4108);
    if (!plan) throw new Error('Missing Heavenly Bow plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
