import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const TURN_SPEAR_01_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear01';

const TURN_SPEAR_01_VFX = [
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear03_01',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_02',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_03',
] as const;

const TURN_SPEAR_01_SOUNDS = [
  '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk43_Cue',
  '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
  '/Game/Sound/Sound_DropnCloth/cloth10_Cue',
  '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
  '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
  '/Game/Sound/Sound_DropnCloth/Cloth_Grab_1_Cue',
  '/Game/Sound/Sound_Impact/Impact_Ground_1_Cue',
  '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
  '/Game/Sound/Sound_Weapon/Trap_Axe_Whoosh_1_Cue',
  '/Game/Sound/Sound_Weapon/Weapon_ChainSword_09_Cue',
  '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
] as const;

describe('MIR4 Lancer 5301 Double Strike presentation', () => {
  it('pins the exact TurnSpear01 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5301)).toEqual({
      skillId: 5301,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: TURN_SPEAR_01_ANIMATION,
        sha256: '8664C88045FAEA1AEA5A5F2C3D5F55FFCBF135888B5EEB80FF21792B7CB84407',
        sizeBytes: 61_413,
        numFrames: 58,
        sequenceLengthSeconds: 1.9,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: TURN_SPEAR_01_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: TURN_SPEAR_01_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_Float06',
          '/Game/Effect/curve/PC/CharMT_Float07_005',
          '/Game/Effect/curve/PC/CharMt_V_Green',
        ],
        soundAssetPaths: TURN_SPEAR_01_SOUNDS,
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear01',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      },
    });
  });

  it('projects all three frontal contacts around the two native movement stages', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5301);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5301,
      ability: 'mir4_skill_5301',
      profile: 'lancer-double-strike',
      durationMs: 1_900,
      endCutMs: 1_700,
      animationAssetPath: TURN_SPEAR_01_ANIMATION,
      vfxAssetPaths: TURN_SPEAR_01_VFX,
      soundAssetPaths: TURN_SPEAR_01_SOUNDS,
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear01',
        '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear01',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      contacts: [
        {
          attackId: 530101,
          offsetMs: 400,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 9_000,
        },
        {
          attackId: 530102,
          offsetMs: 1_040,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 8_000,
        },
        {
          attackId: 530103,
          offsetMs: 1_200,
          shape: 'direct',
          reachYards: 7,
          widthYards: 5,
          damageCoefficient: 8_000,
        },
      ],
    });
  });
});
