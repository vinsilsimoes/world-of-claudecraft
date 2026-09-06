import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const DASH_SPEAR_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear01';

describe('MIR4 Lancer 5201 Ravaging Blow presentation', () => {
  it('pins the exact DashSpear01 cooked asset and its native dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5201)).toEqual({
      skillId: 5201,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: DASH_SPEAR_ANIMATION,
        sha256: 'CB9BE5201C755612621D229BA37FBDEDEA8050FD1AF50523B886695AA7B0295C',
        sizeBytes: 65_345,
        numFrames: 56,
        sequenceLengthSeconds: 1.8333334,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: DASH_SPEAR_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_01_Blue',
          '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_Blue',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_DashSpear05_02_Blue',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Blue'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
          '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear01',
          '/Game/Data/Curve/TargetCameraCurve/Target_10',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16'],
      },
    });
  });

  it('projects all six hybrid spear contacts onto the native forward strips', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5201);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5201,
      ability: 'mir4_skill_5201',
      profile: 'lancer-ravaging-blow',
      durationMs: 1_833,
      endCutMs: 1_740,
      animationAssetPath: DASH_SPEAR_ANIMATION,
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_01_Blue',
        '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_Blue',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_DashSpear05_02_Blue',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
        '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear01',
        '/Game/Data/Curve/TargetCameraCurve/Target_10',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16'],
      contacts: [
        {
          attackId: 520101,
          offsetMs: 480,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 10_000,
        },
        {
          attackId: 520101,
          offsetMs: 690,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 10_000,
        },
        {
          attackId: 520101,
          offsetMs: 880,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 10_000,
        },
        {
          attackId: 520102,
          offsetMs: 1_000,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 9_000,
        },
        {
          attackId: 520102,
          offsetMs: 1_150,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 9_000,
        },
        {
          attackId: 520103,
          offsetMs: 1_300,
          shape: 'direct',
          reachYards: 7.5,
          widthYards: 5,
          damageCoefficient: 9_000,
        },
      ],
    });
  });
});
