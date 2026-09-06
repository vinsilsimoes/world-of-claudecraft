import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const TURN_SPEAR_03_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear03';

const TURN_SPEAR_03_VFX = [
  '/Game/Effect/PC/Basic/P_Pct_Action01_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_01',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_02',
  '/Game/Effect/PC/Pcz/TurnSpear/P_Pcz_Pcz_jump',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_04',
] as const;

describe('MIR4 Lancer 5303 Crushing Blow presentation', () => {
  it('pins the exact TurnSpear03 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5303)).toEqual({
      skillId: 5303,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: TURN_SPEAR_03_ANIMATION,
        sha256: '5F0C3038A7AF51B027FBFDEDB3A9AB0729C5C70EE95F59623FC6FA301914055C',
        sizeBytes: 62_407,
        numFrames: 54,
        sequenceLengthSeconds: 1.7666667,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: TURN_SPEAR_03_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: TURN_SPEAR_03_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_Float06',
          '/Game/Effect/curve/PC/CharMT_Float07_005',
          '/Game/Effect/curve/PC/CharMt_V_Green',
          '/Game/Effect/curve/PC/RadiusCurve',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
          '/Game/Sound/Sound_Impact/Impact_Ground_4_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_01_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue2',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear03',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
        ],
      },
    });
  });

  it('projects the three equal rush contacts and the equal knockdown finisher', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5303);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5303,
      ability: 'mir4_skill_5303',
      profile: 'lancer-crushing-blow',
      durationMs: 1_767,
      endCutMs: 1_600,
      animationAssetPath: TURN_SPEAR_03_ANIMATION,
      vfxAssetPaths: TURN_SPEAR_03_VFX,
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
        '/Game/Sound/Sound_Impact/Impact_Ground_4_Cue',
        '/Game/Sound/Sound_Skill/Skill_Rev_01_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue2',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear03',
        '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear03',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
        '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
      ],
      contacts: [400, 550, 700, 890].map((offsetMs, index) => ({
        attackId: index < 3 ? 530302 : 530303,
        offsetMs,
        shape: 'circle' as const,
        centerOffsetYards: 0,
        radiusYards: 5,
        heightYards: 5,
        damageCoefficient: 6_000,
      })),
    });
  });
});
