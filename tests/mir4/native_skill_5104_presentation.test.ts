import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const CIRCLE_MOON_04_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon04';

const CIRCLE_MOON_04_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_01',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_02',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_03',
] as const;

describe('MIR4 Lancer 5104 Nirvana Kick presentation', () => {
  it('pins the exact CircleMoon04 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5104)).toEqual({
      skillId: 5104,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: CIRCLE_MOON_04_ANIMATION,
        sha256: 'D2B3C37F5A2051DC3C70F60998E3C4863A7A855A6D7FBF0CAB193B29CE6D42F5',
        sizeBytes: 47_802,
        numFrames: 38,
        sequenceLengthSeconds: 1.2333333,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: CIRCLE_MOON_04_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: CIRCLE_MOON_04_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_V_Orange2',
          '/Game/Effect/curve/PC/Light_HitPoint',
          '/Game/Effect/curve/PC/RadiusCurve',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Leather_02_Cue',
          '/Game/Sound/Sound_Hit/hit_bone9_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon04',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
        ],
      },
    });
  });

  it('projects the single target-facing path after the cross-through dash', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5104);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5104,
      ability: 'mir4_skill_5104',
      profile: 'lancer-nirvana-kick',
      durationMs: 1_233,
      endCutMs: 1_000,
      animationAssetPath: CIRCLE_MOON_04_ANIMATION,
      vfxAssetPaths: CIRCLE_MOON_04_VFX,
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Leather_02_Cue',
        '/Game/Sound/Sound_Hit/hit_bone9_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon04',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16',
        '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
      ],
      contacts: [
        {
          attackId: 510402,
          offsetMs: 600,
          shape: 'direct',
          reachYards: 4.5,
          widthYards: 5,
          damageCoefficient: 16_000,
        },
      ],
    });
  });
});
