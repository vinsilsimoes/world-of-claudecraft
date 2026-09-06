import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_sorcerer';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';

describe('MIR4 native skill asset presentation', () => {
  it('pins the extracted Flame Orb animation and presentation dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(2101);

    expect(evidence).toEqual({
      skillId: 2101,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall',
        sha256: '0792E9A438475E006BE89292D0928673BF1EF2A874CF6EBD3A81F2D55E9D799F',
        sizeBytes: 41_674,
        numFrames: 39,
        sequenceLengthSeconds: 1.2666667,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_01',
          '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_02',
          '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_03',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk14_rand_Cue',
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill6_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.source)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation.vfxAssetPaths)).toBe(true);
  });

  it('pins the extracted Frost Orb animation and presentation dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(2111);

    expect(evidence).toEqual({
      skillId: 2111,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall',
        sha256: '87DD022672688BF8DE7009D3B56C1C8ABEFA1E9086EEE3EA685B98BB654AA3E1',
        sizeBytes: 39_802,
        numFrames: 41,
        sequenceLengthSeconds: 1.3333334,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_001',
          '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_002',
          '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_003',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill12_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_shot_ice_2_Cue',
          '/Game/Sound/Sound_Skill/Whoosh_Fire_6_Cue2',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall11',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16'],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.source)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation.vfxAssetPaths)).toBe(true);
  });

  it('pins the extracted Dark Vortex asset identity without fabricating unavailable sequence metadata', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2501)).toEqual({
      skillId: 2501,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
        sha256: 'C56B42431B3424ECDFA05B0D359877253CCE79E693D5022B2B646AFE57CA5958',
        sizeBytes: 43_174,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_002',
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_01',
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_02',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
          '/Game/Sound/Sound_Skill/Magic_02_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
          '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_Fire_10_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_Tornado',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_05'],
      },
    });
  });

  it('pins only the Thunderstorm animation dependencies proven by inspected cooked bindings', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2301)).toEqual({
      skillId: 2301,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder',
        sha256: '422BD24EA07DD20A53CC1E6DEF1673D5B86844F0CBD3D5F9760F75752E78E462',
        sizeBytes: 53_071,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_Thunder_002',
          '/Game/Effect/PC/Pcm/Thunder/P_pcm_Thunder_Hand_01',
          '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_down_Thunder_01',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
      },
    });
  });

  it('pins the extracted Chain Lightning animation and bound lightning assets', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2303)).toMatchObject({
      skillId: 2303,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning',
        sha256: '0B8244936C32B66D9EE997C0AACDDC3577FDB94037B045E50DE14FF02C2E179A',
        sizeBytes: 57_508,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_001',
          '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_002',
          '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_003',
          '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_004',
          '/Game/Effect/PC/Pcm/P_PCM_BeamTrail_thunder',
        ],
      },
    });
  });

  it('pins Piercing Spear to the exact Lancer blueprint state and cooked dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(5205);

    expect(evidence).toEqual({
      skillId: 5205,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05',
        sha256: '13660CBE735C10077346D73EE897CCE7350790B10B0AB849DC615A911A24E127',
        sizeBytes: 53_734,
        numFrames: 44,
        sequenceLengthSeconds: 1.4389937,
        notifyCount: 20,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05',
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
          '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_05_03',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_01',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_02',
          '/Game/Effect/Hit/PC_Pcz/PC_Pcz_atk_01',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_breath2_Cue',
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_22_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Grab_1_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_dwn_04_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
          '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_Small_3_Cue',
          '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16'],
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence?.source)).toBe(true);
    expect(Object.isFrozen(evidence?.presentation)).toBe(true);
  });

  it('keeps unknown and unreviewed skills fail-closed', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2502)).toBeNull();
    expect(mir4NativeSkillAssetPresentationEvidence(999_999)).toBeNull();
  });

  it('places reviewed asset presentation in the immutable execution plan', () => {
    const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
      (candidate) => candidate.skillId === 2111,
    );
    const skill = mir4SkillById(2111);
    if (!action || !skill) throw new Error('Missing Frost Orb source data');

    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action,
      skill,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.presentation).toEqual(
      mir4NativeSkillAssetPresentationEvidence(2111)?.presentation,
    );
    expect(Object.isFrozen(result.plan.presentation)).toBe(true);
    expect(Object.isFrozen(result.plan.presentation.soundAssetPaths)).toBe(true);
  });
});
