import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';

describe('MIR4 Rain of Blades extracted presentation evidence', () => {
  it('pins the inspected SwordRain animation and every recovered dependency', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3104)).toEqual({
      skillId: 3104,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain',
        sha256: '9FC8145678B42469BF2E5D06DEFD8E193FF1FFBCC85678DF4E25808153E371D7',
        sizeBytes: 38_825,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: ['/Game/Effect/PC/Pct/SwordRain/P_Pct_SwordRain_Shot_01'],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMT_V_Blue_003'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_22_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_Step_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_ChainSword_07_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_SwordRain',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });
});
