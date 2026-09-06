import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';

describe('MIR4 Moonlight Wave extracted presentation evidence', () => {
  it('pins the inspected Pct animation and all recovered dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(3506);
    expect(evidence).toEqual({
      skillId: 3506,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave',
        sha256: 'CD5F4D451FFEF18C94E1B15163714A2630E32B6598E30E8959F5FBEEF3DCA79E',
        sizeBytes: 70_149,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_jump_dust_01',
          '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_shoot_01',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Green'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_9_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_Step_2_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MoonWave',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation.vfxAssetPaths)).toBe(true);
  });
});
