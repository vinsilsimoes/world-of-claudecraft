import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const CIRCLE_MOON_03_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon03';

const CIRCLE_MOON_03_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_02',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon03_01',
] as const;

describe('MIR4 Lancer 5103 Ascending Dragon presentation', () => {
  it('pins the exact CircleMoon03 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5103)).toEqual({
      skillId: 5103,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: CIRCLE_MOON_03_ANIMATION,
        sha256: 'E1CB6430C6D72B24C91828B99D65A5B83E575D1F079BE740C401031EEA55827E',
        sizeBytes: 70_342,
        numFrames: 61,
        sequenceLengthSeconds: 2,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: CIRCLE_MOON_03_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: CIRCLE_MOON_03_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
          '/Game/Effect/curve/PC/CharMT_Float06',
          '/Game/Effect/curve/PC/CharMT_Float07_001',
          '/Game/Effect/curve/PC/CharMT_Float07_005',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_14_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
          '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_DashSpear03',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01'],
      },
    });
  });

  it('condenses each hybrid pair into the three forward-circle contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5103);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5103,
      ability: 'mir4_skill_5103',
      profile: 'lancer-ascending-dragon',
      durationMs: 2_000,
      endCutMs: 1_800,
      animationAssetPath: CIRCLE_MOON_03_ANIMATION,
      vfxAssetPaths: CIRCLE_MOON_03_VFX,
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_14_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
        '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
        '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear03',
        '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_DashSpear03',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01'],
      contacts: [
        {
          attackId: 510302,
          offsetMs: 580,
          shape: 'circle',
          centerOffsetYards: 4,
          radiusYards: 6,
          heightYards: 5,
          damageCoefficient: 9_000,
        },
        {
          attackId: 510303,
          offsetMs: 960,
          shape: 'circle',
          centerOffsetYards: 4,
          radiusYards: 6,
          heightYards: 5,
          damageCoefficient: 9_000,
        },
        {
          attackId: 510304,
          offsetMs: 1_240,
          shape: 'circle',
          centerOffsetYards: 4,
          radiusYards: 6,
          heightYards: 5,
          damageCoefficient: 10_000,
        },
      ],
    });
  });
});
