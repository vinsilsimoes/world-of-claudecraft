import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Sunbeam Sword native presentation', () => {
  it('pins the inspected SunLight package and its extracted presentation dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(3101);
    expect(evidence).toMatchObject({
      skillId: 3101,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SunLight',
        sha256: '84B6227E30DFCE3EDAE2E60F45BB40BEDB1C3B4345F6C057958269EE78CC7AD3',
        sizeBytes: 71_373,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SunLight',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
    expect(evidence?.presentation.vfxAssetPaths).toHaveLength(6);
    expect(evidence?.presentation.cameraCurveAssetPaths).toContain(
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_SunLight',
    );
  });

  it('projects all seven source-timed contacts over the native frontal footprint', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(3101);
    expect(authority?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(3101);
    if (!plan) throw new Error('Missing Sunbeam Sword plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 4, plan);

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 4,
      skillId: 3101,
      ability: 'mir4_skill_3101',
      profile: 'taoist-sunbeam-sword',
      durationMs: 1833,
      endCutMs: 1600,
    });
    expect(
      event?.contacts.map((contact) => [
        contact.attackId,
        contact.offsetMs,
        contact.damageCoefficient,
        contact.shape,
      ]),
    ).toEqual([
      [310101, 380, 5000, 'direct'],
      [310102, 550, 5000, 'direct'],
      [310102, 750, 5000, 'direct'],
      [310103, 950, 5000, 'direct'],
      [310103, 1150, 5000, 'direct'],
      [310104, 1350, 5000, 'direct'],
      [310104, 1550, 5000, 'direct'],
    ]);
  });

  it('admits the sealed event into the pooled painter and plays each contact once', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3101);
    if (!plan) throw new Error('Missing Sunbeam Sword plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    if (!event) throw new Error('Missing Sunbeam Sword presentation');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(1.6, pose);
    expect(playContact).toHaveBeenCalledTimes(7);
  });
});
