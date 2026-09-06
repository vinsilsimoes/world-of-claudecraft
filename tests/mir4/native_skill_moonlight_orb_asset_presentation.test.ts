import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';

describe('MIR4 Moonlight Orb extracted presentation evidence', () => {
  it('pins the inspected Pct animation and all recovered dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(3301);
    expect(evidence).toEqual({
      skillId: 3301,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb',
        sha256: 'E4918011F30E09053BAD516D08ED67FD4D9866F55328FC90EC9F493FC58165D5',
        sizeBytes: 44_788,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Atk_01',
          '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Cast_02',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Green2'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_2_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MoonSpirit01',
          '/Game/Data/Curve/TargetCameraCurve/Target',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation.vfxAssetPaths)).toBe(true);
  });
});
