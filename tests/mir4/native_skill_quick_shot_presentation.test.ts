import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Quick Shot native presentation', () => {
  it('pins the inspected Pca Skl01 package and dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4101)).toMatchObject({
      skillId: 4101,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl01',
        sha256: '1FA92C4611817EC2D5AEE19EBEC6A96C4DF4D04594CEF9D8B4433CB535E97A3C',
        sizeBytes: 71_739,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl01',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
  });

  it('keeps all twelve visual arrow contacts while only each second contact owns damage', () => {
    expect(mir4RuntimeSkillExecutionAuthority(4101)?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(4101);
    if (!plan) throw new Error('Missing Quick Shot plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      skillId: 4101,
      ability: 'mir4_skill_4101',
      profile: 'arbalist-quick-shot',
      durationMs: 1500,
      endCutMs: 1350,
    });
    expect(event?.contacts.map((contact) => [contact.attackId, contact.offsetMs, contact.damageCoefficient])).toEqual([
      [410101, 113, 0], [410101, 213, 3300],
      [410102, 313, 0], [410102, 413, 3300],
      [410103, 519, 0], [410103, 619, 3300],
      [410104, 719, 0], [410104, 819, 3300],
      [410105, 913, 0], [410105, 1013, 4400],
      [410106, 1116, 0], [410106, 1216, 4400],
    ]);

    if (!event) throw new Error('Missing Quick Shot event');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };
    expect(painter.start(event)).toBe(true);
    painter.update(1.3, pose);
    expect(playContact).toHaveBeenCalledTimes(12);
  });
});
