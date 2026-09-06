import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const CIRCLE_MOON_02_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon02';

const CIRCLE_MOON_02_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_004',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_02_03',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_02_01',
] as const;

describe('MIR4 Lancer 5102 Dragon Tail presentation', () => {
  it('pins the exact CircleMoon02 cooked asset and every imported presentation dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5102)).toEqual({
      skillId: 5102,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: CIRCLE_MOON_02_ANIMATION,
        sha256: 'B35A9D1A2C3976BD297DFAFC73AA029C815ADFA24C7FB8554F0F9AACCC13B902',
        sizeBytes: 51_159,
        numFrames: 51,
        sequenceLengthSeconds: 1.6666666,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: CIRCLE_MOON_02_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: CIRCLE_MOON_02_VFX,
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
          '/Game/Effect/curve/PC/CharMT_F_blue4',
          '/Game/Effect/curve/PC/CharMT_Float07_001',
          '/Game/Effect/curve/PC/CharMT_Float07_005',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
          '/Game/Sound/Sound_DropnCloth/cra_cloth_04_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_10_Mob',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_Swing_2_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon02',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02'],
      },
    });
  });

  it('projects the three native rear-offset spear sweeps and enlarged finisher', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5102);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5102,
      ability: 'mir4_skill_5102',
      profile: 'lancer-dragon-tail',
      durationMs: 1_667,
      endCutMs: 1_600,
      animationAssetPath: CIRCLE_MOON_02_ANIMATION,
      vfxAssetPaths: CIRCLE_MOON_02_VFX,
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
        '/Game/Sound/Sound_DropnCloth/cra_cloth_04_Cue',
        '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_Sword_10_Mob',
        '/Game/Sound/Sound_Weapon/Weapon_Sword_Swing_2_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon02',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02'],
      contacts: [
        {
          attackId: 510202,
          offsetMs: 400,
          shape: 'sector',
          centerOffsetYards: -1,
          radiusYards: 7,
          angleDegrees: 160,
          heightYards: 5,
          damageCoefficient: 16_000,
        },
        {
          attackId: 510203,
          offsetMs: 790,
          shape: 'sector',
          centerOffsetYards: -1,
          radiusYards: 7,
          angleDegrees: 160,
          heightYards: 5,
          damageCoefficient: 16_000,
        },
        {
          attackId: 510204,
          offsetMs: 890,
          shape: 'sector',
          centerOffsetYards: -1,
          radiusYards: 12,
          angleDegrees: 160,
          heightYards: 5,
          damageCoefficient: 4_000,
        },
      ],
    });
  });
});
