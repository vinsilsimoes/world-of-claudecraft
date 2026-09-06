import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const CIRCLE_MOON_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon01';

describe('MIR4 Lancer 5101 Crescent Blade presentation', () => {
  it('pins the exact CircleMoon01 cooked asset and its native dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5101)).toEqual({
      skillId: 5101,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: CIRCLE_MOON_ANIMATION,
        sha256: 'DD9117F28BB38C022986754B2E52000115A87E23F673D65EED47C97D33563176',
        sizeBytes: 58_830,
        numFrames: 60,
        sequenceLengthSeconds: 1.9666667,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: CIRCLE_MOON_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_003',
          '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01',
          '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01_02',
          '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_01_01',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
          '/Game/Effect/curve/PC/CharMT_Float07_001',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk12_Cue',
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Umbrilla_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_Shape_1_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_ChainSword_03_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_ChainSword_07_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_Swing_3_Cue',
          '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
          '/Game/Sound/Sound_Weapon/Whoosh_B_Axe_L1_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon01',
          '/Game/Data/Curve/TargetCameraCurve/Target_01',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02'],
      },
    });
  });

  it('projects both native 160-degree sweeps from the one-yard rear offset', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5101);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5101,
      ability: 'mir4_skill_5101',
      profile: 'lancer-crescent-blade',
      durationMs: 1_967,
      endCutMs: 1_560,
      animationAssetPath: CIRCLE_MOON_ANIMATION,
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_003',
        '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01',
        '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01_02',
        '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_01_01',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk12_Cue',
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_12_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Umbrilla_1_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_Shape_1_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_ChainSword_03_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_ChainSword_07_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_Sword_Swing_3_Cue',
        '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
        '/Game/Sound/Sound_Weapon/Whoosh_B_Axe_L1_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon01',
        '/Game/Data/Curve/TargetCameraCurve/Target_01',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02'],
      contacts: [
        {
          attackId: 510101,
          offsetMs: 400,
          shape: 'sector',
          centerOffsetYards: -1,
          radiusYards: 7,
          angleDegrees: 160,
          heightYards: 5,
          damageCoefficient: 13_000,
        },
        {
          attackId: 510102,
          offsetMs: 1_120,
          shape: 'sector',
          centerOffsetYards: -1,
          radiusYards: 7,
          angleDegrees: 160,
          heightYards: 5,
          damageCoefficient: 6_000,
        },
      ],
    });
  });
});
