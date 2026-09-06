import { describe, expect, it } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Flash Arrow native presentation', () => {
  it('pins the inspected Skl07 animation and extracted dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4107)).toMatchObject({
      skillId: 4107,
      source: {
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl07',
        sha256: '2B01325BD19E6FFE6B34D5E6299F8B5DEE4F3E171779022ECFD2599F79143CF7',
        sizeBytes: 35_255,
      },
      presentation: {
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_01_02',
          '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_Shoot',
        ],
      },
    });
  });

  it('presents the direct flash and six fixed pulses over the full field lifetime', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4107);
    if (!plan) throw new Error('Missing Flash Arrow plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    expect(event).toMatchObject({
      skillId: 4107,
      ability: 'mir4_skill_4107',
      profile: 'arbalist-flash-arrow',
      durationMs: 6450,
      endCutMs: 900,
      persistentArea: {
        spawnOffsetMs: 450,
        expiresOffsetMs: 6450,
        x: 12,
        z: 18,
        radiusYards: 6,
        heightYards: 3,
      },
      projectiles: [{ attackId: 410701, launchOffsetMs: 450, speedYardsPerSecond: 40 }],
    });
    expect(
      event?.contacts.map((contact) => [contact.attackId, contact.offsetMs, contact.shape]),
    ).toEqual([
      [410711, 750, 'fixed-circle'],
      [410702, 790, 'target-circle'],
      [410712, 1150, 'fixed-circle'],
      [410713, 1550, 'fixed-circle'],
      [410714, 1950, 'fixed-circle'],
      [410715, 2350, 'fixed-circle'],
      [410716, 2750, 'fixed-circle'],
    ]);
    if (!event) throw new Error('Missing Flash Arrow event');
    expect(new Mir4NativeSkillPresentationPainter({ playContact() {} }, 1).start(event)).toBe(true);
  });

  it('fails closed without the fixed target anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4107);
    if (!plan) throw new Error('Missing Flash Arrow plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
