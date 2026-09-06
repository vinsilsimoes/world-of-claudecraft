import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const TORNADO_03_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_03';

const TORNADO_03_VFX = [
  '/Game/Effect/PC/Pcz/P_Pcz_Tornado_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_02',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_03',
] as const;

const TORNADO_03_SOUNDS = [
  '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
  '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
  '/Game/Sound/Sound_Weapon/weapon_spear_1_Cue',
  '/Game/Sound/Sound_Weapon/Weapon_Sword_long_Cue',
] as const;

describe('MIR4 Lancer 5403 Wind Wall presentation', () => {
  it('pins the exact Tornado_03 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5403)).toEqual({
      skillId: 5403,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: TORNADO_03_ANIMATION,
        sha256: '7411C14BED7B93BE1D638D066B291C7B7F6F8E2274BBE948FF1F1D175EF5924E',
        sizeBytes: 50_048,
        numFrames: 25,
        sequenceLengthSeconds: 0.8,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: TORNADO_03_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: TORNADO_03_VFX,
        guideAssetPaths: [],
        soundAssetPaths: TORNADO_03_SOUNDS,
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
        ],
      },
    });
  });

  it('condenses both damage channels into the five native forward-box contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5403);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5403,
      ability: 'mir4_skill_5403',
      profile: 'lancer-wind-wall',
      durationMs: 800,
      endCutMs: 720,
      animationAssetPath: TORNADO_03_ANIMATION,
      vfxAssetPaths: TORNADO_03_VFX,
      soundAssetPaths: TORNADO_03_SOUNDS,
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_03',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
      ],
      contacts: [
        [540301, 20, 5_000],
        [540303, 300, 5_000],
        [540303, 400, 5_000],
        [540304, 510, 6_000],
        [540305, 620, 6_000],
      ].map(([attackId, offsetMs, damageCoefficient]) => ({
        attackId,
        offsetMs,
        shape: 'direct' as const,
        reachYards: 10,
        widthYards: 5,
        damageCoefficient,
      })),
    });
  });
});
