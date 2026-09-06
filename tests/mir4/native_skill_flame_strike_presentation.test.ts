import { describe, expect, it } from 'vitest';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Sorcerer 2201 Flame Strike presentation', () => {
  it('pins only the animation and dependencies found in the inspected cooked asset', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2201)).toEqual({
      skillId: 2201,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Meteor',
        sha256: 'F5A299B4350CD37A5256077593CFBC4AD57221C05111AB4575842F857582D647',
        sizeBytes: 41_557,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Meteor',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: ['/Game/Effect/PC/Pcm/fire/P_pcm_firewind_001'],
        guideAssetPaths: [
          '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_V_Red05',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explo_2_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_IceBall01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
        ],
      },
    });
  });

  it('projects three source-centred contacts and suppresses the guide-only row', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2201);
    if (!plan) throw new Error('missing Flame Strike execution plan');
    const event = mir4NativeSkillPresentationEvent(7, 7, -Math.PI / 4, plan);

    expect(event).toMatchObject({
      sourceId: 7,
      targetId: 7,
      sourceFacing: -Math.PI / 4,
      skillId: 2201,
      ability: 'mir4_skill_2201',
      profile: 'sorcerer-flame-strike',
      durationMs: 1_767,
      endCutMs: 1_400,
      contacts: [
        {
          attackId: 220102,
          offsetMs: 446,
          shape: 'circle',
          centerOffsetYards: 0,
          radiusYards: 7.5,
          heightYards: 4,
          damageCoefficient: 8_000,
        },
        {
          attackId: 220103,
          offsetMs: 746,
          shape: 'circle',
          damageCoefficient: 15_000,
        },
        {
          attackId: 220103,
          offsetMs: 1_076,
          shape: 'circle',
          damageCoefficient: 15_000,
        },
      ],
    });
    expect(event?.contacts.some((contact) => contact.attackId === 220101)).toBe(false);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2201')).toBe(true);
  });

  it('releases all three heat-storm contacts at their native timestamps', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2201);
    if (!plan) throw new Error('missing Flame Strike execution plan');
    const event = mir4NativeSkillPresentationEvent(7, 7, 0, plan);
    if (!event) throw new Error('missing Flame Strike presentation event');
    const contacts: number[] = [];
    const painter = new Mir4NativeSkillPresentationPainter({
      playContact: (_event, contact) => contacts.push(contact.offsetMs),
    }, 1);

    expect(painter.start(event)).toBe(true);
    painter.update(0.445, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 4, facing: 0 });
      return true;
    });
    expect(contacts).toEqual([]);
    painter.update(0.631, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 4, facing: 0 });
      return true;
    });
    expect(contacts).toEqual([446, 746, 1_076]);
  });
});
