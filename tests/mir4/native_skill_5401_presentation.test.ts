import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const TORNADO_01_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_01';

const TORNADO_01_VFX = [
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_02_A2',
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_03',
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_04',
] as const;

const TORNADO_01_SOUNDS = [
  '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk23_Cue',
  '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
  '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
  '/Game/Sound/Sound_Impact/Impact_Explo_9_Cue',
  '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
  '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
  '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
  '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
] as const;

describe('MIR4 Lancer 5401 Sweeping Storm presentation', () => {
  it('pins the exact Tornado_01 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5401)).toEqual({
      skillId: 5401,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: TORNADO_01_ANIMATION,
        sha256: '2357C212433F4FA1FC1C3ED934D3D6CC9F220E0213DB99B8A3EFB9EE8707B7B2',
        sizeBytes: 57_118,
        numFrames: 33,
        sequenceLengthSeconds: 1.0666667,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: TORNADO_01_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: TORNADO_01_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_Float07_005',
          '/Game/Effect/curve/PC/CharMT_V_gold_002',
          '/Game/Effect/curve/PC/CharMT_V_Orange2',
        ],
        soundAssetPaths: TORNADO_01_SOUNDS,
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_19_C',
          '/Game/Blueprint/BPCameraShake/BP_Yaw20_01',
        ],
      },
    });
  });

  it('condenses the physical and spell channels into the six real spin contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5401);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5401,
      ability: 'mir4_skill_5401',
      profile: 'lancer-sweeping-storm',
      durationMs: 1_067,
      endCutMs: 980,
      animationAssetPath: TORNADO_01_ANIMATION,
      vfxAssetPaths: TORNADO_01_VFX,
      soundAssetPaths: TORNADO_01_SOUNDS,
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_01',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_19_C',
        '/Game/Blueprint/BPCameraShake/BP_Yaw20_01',
      ],
      contacts: [
        {
          attackId: 540101,
          offsetMs: 20,
          shape: 'circle',
          centerOffsetYards: 0,
          radiusYards: 12,
          heightYards: 5,
          damageCoefficient: 4_000,
        },
        ...[
          [540102, 240, 4_000],
          [540103, 400, 4_000],
          [540104, 510, 5_000],
          [540105, 660, 6_000],
          [540106, 840, 6_000],
        ].map(([attackId, offsetMs, damageCoefficient]) => ({
          attackId,
          offsetMs,
          shape: 'circle' as const,
          centerOffsetYards: 0,
          radiusYards: 5.5,
          heightYards: 5,
          damageCoefficient,
        })),
      ],
    });
  });
});
