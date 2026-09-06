import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';

describe('MIR4 Blizzard extracted presentation evidence', () => {
  it('pins the inspected animation identity and every complete bound dependency', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(2203);
    expect(evidence).toEqual({
      skillId: 2203,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard',
        sha256: 'FBC63696934A7F148A0994499171335CC12E08EE634E8D6590C30867CF5BE811',
        sizeBytes: 53_806,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_001',
          '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_002',
          '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_hand_001',
          '/Game/Effect/PC/Pcm/ice_ball/P_Pcm_iceball03_03',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill11_Cue',
          '/Game/Sound/Sound_DropnCloth/cra_cloth_02_Cue',
          '/Game/Sound/Sound_Object/Obje_break_ice_1_Cue',
          '/Game/Sound/Sound_Skill/Ice_Freeze_2_Cue',
          '/Game/Sound/Sound_Skill/Rev_Ice_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_shot_ice_2_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_IceBall03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_05',
        ],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation.vfxAssetPaths)).toBe(true);
  });
});
