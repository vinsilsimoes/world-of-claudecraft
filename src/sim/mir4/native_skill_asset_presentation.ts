import type { Mir4NativeSkillPresentation } from '../content/mir4/native_skill_action_types';

export interface Mir4NativeSkillPresentationAssetSource {
  readonly kind: 'extracted-cooked-uasset';
  readonly packagePath: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly numFrames: number | null;
  readonly sequenceLengthSeconds: number | null;
  readonly notifyCount: number | null;
}

export interface Mir4NativeSkillAssetPresentationEvidence {
  readonly skillId: number;
  readonly source: Mir4NativeSkillPresentationAssetSource;
  readonly presentation: Mir4NativeSkillPresentation;
}

export interface Mir4NativeSkillSupplementalAnimationEvidence {
  readonly skillId: number;
  readonly role: 'recovery';
  readonly source: Mir4NativeSkillPresentationAssetSource;
}

const FROST_ORB_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall';
const FLAME_ORB_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall';
const DARK_VORTEX_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado';
const THUNDERSTORM_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder';
const BLIZZARD_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard';
const MAGIC_SHIELD_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield';
const CHAIN_LIGHTNING_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning';
const FLAME_STRIKE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Meteor';
const FROZEN_BLOCK_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Freezing';
const IMMOLATE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Laser';
const DRAGON_TORNADO_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado';
const LIGHT_RAY_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special';
const MOONLIGHT_WAVE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave';
const MOONLIGHT_ORB_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb';
const SUNBEAM_SWORD_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SunLight';
const PIERCING_BLADES_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_PiercingAtk';
const RAIN_OF_BLADES_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain';
const HEAL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal';
const GREATER_HEAL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal';
const GUARDIAN_CIRCLE_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MagicBarrier03';
const TAI_CHI_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Taegeuk';
const BLASTING_CHARM_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_DarkBurst';
const SOARING_SLASH_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordBlast';
const EXPULSION_CIRCLE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Resist';
const QUICK_SHOT_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl01';
const PAINSTRIKE_GALE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl02';
const ILLUSION_ARROW_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl03';
const BURST_SHELL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl04';
const VENOM_MIST_SHELL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl06';
const ICE_CAGE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl05';
const FLASH_ARROW_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl07';
const HEAVENLY_BOW_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl08';
const OBLITERATE_SHELL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl09';
const SEEKING_BOLT_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl10';
const MINDS_EYE_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl11';
const CLOAKING_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12';
const CLOAKING_RECOVERY_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12_1';
const ARROW_RAIN_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special';
const CRESCENT_BLADE_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon01';
const DRAGON_TAIL_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon02';
const ASCENDING_DRAGON_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon03';
const NIRVANA_KICK_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon04';
const DOUBLE_STRIKE_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear01';
const CRUSHING_BLOW_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear03';
const SWEEPING_STORM_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_01';
const WIND_WALL_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_03';
const RAVAGING_BLOW_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear01';
const BLITZ_STRIKE_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear02';
const DRAGON_SPEAR_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03';
const PIERCING_SPEAR_PACKAGE_PATH =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05';
const ABSORPTION_PACKAGE_PATH = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear04';

const CRESCENT_BLADE_PRESENTATION = Object.freeze({
  skillId: 5101,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: CRESCENT_BLADE_PACKAGE_PATH,
    sha256: 'DD9117F28BB38C022986754B2E52000115A87E23F673D65EED47C97D33563176',
    sizeBytes: 58_830,
    numFrames: 60,
    sequenceLengthSeconds: 1.9666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: CRESCENT_BLADE_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_003',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01_02',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_01_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
      '/Game/Effect/curve/PC/CharMT_Float07_001',
    ]),
    soundAssetPaths: Object.freeze([
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
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon01',
      '/Game/Data/Curve/TargetCameraCurve/Target_01',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const DRAGON_TAIL_PRESENTATION = Object.freeze({
  skillId: 5102,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: DRAGON_TAIL_PACKAGE_PATH,
    sha256: 'B35A9D1A2C3976BD297DFAFC73AA029C815ADFA24C7FB8554F0F9AACCC13B902',
    sizeBytes: 51_159,
    numFrames: 51,
    sequenceLengthSeconds: 1.6666666,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: DRAGON_TAIL_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_004',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_02_03',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_02_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
      '/Game/Effect/curve/PC/CharMT_F_blue4',
      '/Game/Effect/curve/PC/CharMT_Float07_001',
      '/Game/Effect/curve/PC/CharMT_Float07_005',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_DropnCloth/cra_cloth_04_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_10_Mob',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_Swing_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon02',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const ASCENDING_DRAGON_PRESENTATION = Object.freeze({
  skillId: 5103,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: ASCENDING_DRAGON_PACKAGE_PATH,
    sha256: 'E1CB6430C6D72B24C91828B99D65A5B83E575D1F079BE740C401031EEA55827E',
    sizeBytes: 70_342,
    numFrames: 61,
    sequenceLengthSeconds: 2,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: ASCENDING_DRAGON_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_02',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon03_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
      '/Game/Effect/curve/PC/CharMT_Float06',
      '/Game/Effect/curve/PC/CharMT_Float07_001',
      '/Game/Effect/curve/PC/CharMT_Float07_005',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_14_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
      '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_DashSpear03',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const NIRVANA_KICK_PRESENTATION = Object.freeze({
  skillId: 5104,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: NIRVANA_KICK_PACKAGE_PATH,
    sha256: 'D2B3C37F5A2051DC3C70F60998E3C4863A7A855A6D7FBF0CAB193B29CE6D42F5',
    sizeBytes: 47_802,
    numFrames: 38,
    sequenceLengthSeconds: 1.2333333,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: NIRVANA_KICK_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_01',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_02',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_03',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_V_Orange2',
      '/Game/Effect/curve/PC/Light_HitPoint',
      '/Game/Effect/curve/PC/RadiusCurve',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_02_Cue',
      '/Game/Sound/Sound_Hit/hit_bone9_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon04',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const DOUBLE_STRIKE_PRESENTATION = Object.freeze({
  skillId: 5301,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: DOUBLE_STRIKE_PACKAGE_PATH,
    sha256: '8664C88045FAEA1AEA5A5F2C3D5F55FFCBF135888B5EEB80FF21792B7CB84407',
    sizeBytes: 61_413,
    numFrames: 58,
    sequenceLengthSeconds: 1.9,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: DOUBLE_STRIKE_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear03_01',
      '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_02',
      '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_03',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_Float06',
      '/Game/Effect/curve/PC/CharMT_Float07_005',
      '/Game/Effect/curve/PC/CharMt_V_Green',
    ]),
    soundAssetPaths: Object.freeze([
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
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear01',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const CRUSHING_BLOW_PRESENTATION = Object.freeze({
  skillId: 5303,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: CRUSHING_BLOW_PACKAGE_PATH,
    sha256: '5F0C3038A7AF51B027FBFDEDB3A9AB0729C5C70EE95F59623FC6FA301914055C',
    sizeBytes: 62_407,
    numFrames: 54,
    sequenceLengthSeconds: 1.7666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: CRUSHING_BLOW_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Basic/P_Pct_Action01_03',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_01',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_02',
      '/Game/Effect/PC/Pcz/TurnSpear/P_Pcz_Pcz_jump',
      '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_04',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_Float06',
      '/Game/Effect/curve/PC/CharMT_Float07_005',
      '/Game/Effect/curve/PC/CharMt_V_Green',
      '/Game/Effect/curve/PC/RadiusCurve',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk29_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_Impact/Impact_Ground_4_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_01_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue2',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_TurnSpear03',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const SWEEPING_STORM_PRESENTATION = Object.freeze({
  skillId: 5401,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: SWEEPING_STORM_PACKAGE_PATH,
    sha256: '2357C212433F4FA1FC1C3ED934D3D6CC9F220E0213DB99B8A3EFB9EE8707B7B2',
    sizeBytes: 57_118,
    numFrames: 33,
    sequenceLengthSeconds: 1.0666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: SWEEPING_STORM_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_02_A2',
      '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_03',
      '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_04',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_Float07_005',
      '/Game/Effect/curve/PC/CharMT_V_gold_002',
      '/Game/Effect/curve/PC/CharMT_V_Orange2',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_batk23_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explo_9_Cue',
      '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
      '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_19_C',
      '/Game/Blueprint/BPCameraShake/BP_Yaw20_01',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const WIND_WALL_PRESENTATION = Object.freeze({
  skillId: 5403,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: WIND_WALL_PACKAGE_PATH,
    sha256: '7411C14BED7B93BE1D638D066B291C7B7F6F8E2274BBE948FF1F1D175EF5924E',
    sizeBytes: 50_048,
    numFrames: 25,
    sequenceLengthSeconds: 0.8,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: WIND_WALL_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/P_Pcz_Tornado_03',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_02',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_03',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Weapon/weapon_spear_1_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_long_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_Tornado_03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake.BP_Atk_CameraShake_16_C',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const RAVAGING_BLOW_PRESENTATION = Object.freeze({
  skillId: 5201,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: RAVAGING_BLOW_PACKAGE_PATH,
    sha256: 'CB9BE5201C755612621D229BA37FBDEDEA8050FD1AF50523B886695AA7B0295C',
    sizeBytes: 65_345,
    numFrames: 56,
    sequenceLengthSeconds: 1.8333334,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: RAVAGING_BLOW_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_01_Blue',
      '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_Blue',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_DashSpear05_02_Blue',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Blue']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_21_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_12_Cue',
      '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear01',
      '/Game/Data/Curve/TargetCameraCurve/Target_10',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const BLITZ_STRIKE_PRESENTATION = Object.freeze({
  skillId: 5202,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: BLITZ_STRIKE_PACKAGE_PATH,
    sha256: 'A0660ADFC16B760BB97414C2F4DEDDA84EA9371E95F9683A1003E12FF52C5DDA',
    sizeBytes: 44_955,
    numFrames: 37,
    sequenceLengthSeconds: 1.2,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: BLITZ_STRIKE_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Basic/P_Pct_Action01_02',
      '/Game/Effect/PC/Basic/P_Upturned01_03',
      '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_02',
      '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_Dashspear02_03',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_01',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Red']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_15_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explo_9_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_Small_3_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear02',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const DRAGON_SPEAR_PRESENTATION = Object.freeze({
  skillId: 5203,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: DRAGON_SPEAR_PACKAGE_PATH,
    sha256: '07FEB1C18717FB1C6A23F622176921B6C34864BA690149CE76371C9AB64B2F0E',
    sizeBytes: 61_341,
    numFrames: 73,
    sequenceLengthSeconds: 2.4,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: DRAGON_SPEAR_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Basic/P_Pct_Action01_03',
      '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_DashSpear03_in_glow',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_02',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_Ready',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMt_V_Red',
      '/Game/Effect/curve/PC/Light_HitPoint_0500',
      '/Game/Effect/curve/PC/PP_Curve01_01',
      '/Game/Effect/curve/PC/RadiusCurve',
      '/Game/Effect/curve/PC/RadiusCurve_00001',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_speacial_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_05_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear05',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_DashSpear05',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake',
      '/Game/Blueprint/BPCameraShake/BP_Shake06_02',
      '/Game/Blueprint/BPCameraShake/BP_Shake18_01',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const ABSORPTION_PRESENTATION = Object.freeze({
  skillId: 5304,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: ABSORPTION_PACKAGE_PATH,
    sha256: '7578146B58D34FD3B17EADF72C9CE3F8AEEA68BBA5F6DC98E76E7075ABF10E22',
    sizeBytes: 38_835,
    numFrames: 39,
    sequenceLengthSeconds: 1.2666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: ABSORPTION_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_01',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_02',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMT_V_Red03']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
      '/Game/Sound/Sound_Skill/Magic_02_Cue',
      '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
      '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear04',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const PIERCING_SPEAR_PRESENTATION = Object.freeze({
  skillId: 5205,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: PIERCING_SPEAR_PACKAGE_PATH,
    sha256: '13660CBE735C10077346D73EE897CCE7350790B10B0AB849DC615A911A24E127',
    sizeBytes: 53_734,
    numFrames: 44,
    sequenceLengthSeconds: 1.4389937,
    notifyCount: 20,
  }),
  presentation: Object.freeze({
    animationAssetPath: PIERCING_SPEAR_PACKAGE_PATH,
    animationBindingConfidence: 'exact-blueprint-state' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
      '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_05_03',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_01',
      '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_02',
      '/Game/Effect/Hit/PC_Pcz/PC_Pcz_atk_01',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
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
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const OBLITERATE_SHELL_PRESENTATION = Object.freeze({
  skillId: 4109,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: OBLITERATE_SHELL_PACKAGE_PATH,
    sha256: '666B01BB6612FF176DE86B8600E8ABE95E028649617E0AF67A4E1C67B114DCE7',
    sizeBytes: 63_456,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: OBLITERATE_SHELL_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl09/P_Mon_PCA3_trail_01',
      '/Game/Effect/PC/Pca/Skl09/P_Pca_projectile1',
      '/Game/Effect/PC/Pca/Skl09/P_PCA_Skl09',
      '/Game/Effect/PC/Pca/Skl09/P_Pca_Skl09_02',
      '/Game/Effect/PC/Pca/Skl09/P_pca_Smoke',
      '/Game/Effect/PC/Pca/Skl09/Pca_Skl_decal_02',
      '/Game/Effect/PC/Pca/Skl09/Pca_Skl_decal_03',
      '/Game/Effect/PC/Pca/Skl09/Pca_Skl_decal_04',
      '/Game/Effect/PC/Pca/Skl09/Pca_Skl_decal_05',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_Purple_02',
      '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_19_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_9_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth7_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
      '/Game/Sound/Sound_Hit/hit_effect/hit_arrow_1_Cue',
      '/Game/Sound/Sound_Hit/hit_effect/hit_arrow_2_Cue',
      '/Game/Sound/Sound_Hit/hit_effect/hit_arrow_4_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_4_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl09',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_05',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const ICE_CAGE_PRESENTATION = Object.freeze({
  skillId: 4105,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: ICE_CAGE_PACKAGE_PATH,
    sha256: '35537B2698A69C1353A7AABDA5C83E924E6DD8F063E46D24F40352C0BC2D19E2',
    sizeBytes: 37_210,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: ICE_CAGE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_001',
      '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_Shoot',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue3',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_20_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_44_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_1_Cue',
      '/Game/Sound/Sound_Skill/Fly_Whoosh_4_Cue',
      '/Game/Sound/Sound_Skill/skill_bomb_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_4_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl05',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const MINDS_EYE_PRESENTATION = Object.freeze({
  skillId: 4111,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: MINDS_EYE_PACKAGE_PATH,
    sha256: '04F449499CFB57AED48CF1E3435B2A21F4C0C4309FA764660E30EAD193FFE719',
    sizeBytes: 30_848,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: MINDS_EYE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze(['/Game/Effect/PC/Pca/Skl11/P_Pca_buff02']),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_violet1',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_batk_2_Cue',
      '/Game/Sound/Sound_Skill/Magic_02_Cue',
      '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl11',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const CLOAKING_PRESENTATION = Object.freeze({
  skillId: 4112,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: CLOAKING_PACKAGE_PATH,
    sha256: '5F73EFD0B59297A94398E90FFF52A452F2B63C1DC3B4F7F56488D6CCBFB445F6',
    sizeBytes: 26_765,
    numFrames: 19,
    sequenceLengthSeconds: 0.6,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: CLOAKING_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze(['/Game/Effect/PC/Pca/Skl12/P_pca_Smoke']),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_Purple_02',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_breath_3_rand_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl12',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const ARROW_RAIN_PRESENTATION = Object.freeze({
  skillId: 4113,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: ARROW_RAIN_PACKAGE_PATH,
    sha256: 'AF3742AE759F10D943998A39AD5E8239708E074C18D02E6CA84E36738A43AB30',
    sizeBytes: 123_937,
    numFrames: 89,
    sequenceLengthSeconds: 2.9333334,
    notifyCount: 61,
  }),
  presentation: Object.freeze({
    animationAssetPath: ARROW_RAIN_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_01',
      '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_02',
      '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_03',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue5',
      '/Game/Effect/curve/PC/CharMT_Float06',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skillname_Manchun_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explo_10_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_Special_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Special',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const CLOAKING_RECOVERY_PRESENTATION = Object.freeze({
  skillId: 4112,
  role: 'recovery' as const,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: CLOAKING_RECOVERY_PACKAGE_PATH,
    sha256: 'C5DFE43D85DCB44B70F5CF10F956D190E4A0519C7EA36421853C7DE15E4F1F39',
    sizeBytes: 17_604,
    numFrames: null,
    sequenceLengthSeconds: 1,
    notifyCount: 0,
  }),
}) satisfies Mir4NativeSkillSupplementalAnimationEvidence;

const SEEKING_BOLT_PRESENTATION = Object.freeze({
  skillId: 4110,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: SEEKING_BOLT_PACKAGE_PATH,
    sha256: 'A602DFAE85E437DDCDC0FAFF4F8579DE08A2A5D5388D58D476FA30B1C143C3D9',
    sizeBytes: 55_864,
    numFrames: 58,
    sequenceLengthSeconds: 1.9,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: SEEKING_BOLT_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_03',
      '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_04',
      '/Game/Effect/PC/Pca/Skl10/P_PCA_Skl13',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_batk_10_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_3_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/skill_rev_fire_3_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_Bow_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl10',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const HEAVENLY_BOW_PRESENTATION = Object.freeze({
  skillId: 4108,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: HEAVENLY_BOW_PACKAGE_PATH,
    sha256: '0EF652297693F2D70172265359A790CC310B8FE7B1A8D4E351D7294F3DA980AB',
    sizeBytes: 40_214,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: HEAVENLY_BOW_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08',
      '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_01',
      '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_02',
      '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Smoke',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue4',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_8_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_arrow_fly_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_8_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl08',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_05',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const FLASH_ARROW_PRESENTATION = Object.freeze({
  skillId: 4107,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: FLASH_ARROW_PACKAGE_PATH,
    sha256: '2B01325BD19E6FFE6B34D5E6299F8B5DEE4F3E171779022ECFD2599F79143CF7',
    sizeBytes: 35_255,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: FLASH_ARROW_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_01_02',
      '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_Shoot',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_breath_7_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_7_Cue',
      '/Game/Sound/Sound_Skill/Fly_Whoosh_4_Cue',
      '/Game/Sound/Sound_Skill/skill_bomb_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl07',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const BURST_SHELL_PRESENTATION = Object.freeze({
  skillId: 4103,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: BURST_SHELL_PACKAGE_PATH,
    sha256: '0A21839810A59D452B99887E108BF61906ABEE81E4D2452F0E43D422246B473E',
    sizeBytes: 39_251,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: BURST_SHELL_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl04/P_Pca_arrow_shoot_Skl04',
      '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_01',
      '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_02',
      '/Game/Effect/PC/Pca/skl_03/P_pca_skl_03_explosion',
      '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_27_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_4_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Equip_1_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Umbrilla_1_Cue',
      '/Game/Sound/Sound_Skill/Fly_Whoosh_4_Cue',
      '/Game/Sound/Sound_Skill/skill_bomb_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue_Big',
      '/Game/Sound/Sound_Impact/Impact_Ground_1_Big_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl04',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const VENOM_MIST_SHELL_PRESENTATION = Object.freeze({
  skillId: 4104,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: VENOM_MIST_SHELL_PACKAGE_PATH,
    sha256: 'C6F1A835117BE9FDB9C259A41FD4CFD6EF0AA19FBA99A166EA74CF2441D580CA',
    sizeBytes: 44_222,
    numFrames: 33,
    sequenceLengthSeconds: 1.0666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: VENOM_MIST_SHELL_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_01',
      '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_03',
      '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail',
      '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail_02',
      '/Game/Effect/PC/Pca/Skl06/P_Pca_Smoke_skl06',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_Purple_03',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_27_Cue',
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_44_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth10_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_Step_1_Cue',
      '/Game/Sound/Sound_Hit/Hit_Kick_1_Cue',
      '/Game/Sound/Sound_Skill/Shoot_Jangpung_Fire_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl06',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const ILLUSION_ARROW_PRESENTATION = Object.freeze({
  skillId: 4102,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: ILLUSION_ARROW_PACKAGE_PATH,
    sha256: '523A6F496E147D2FABD6B06FCDC21297209306DA6C8F34391A5463634C890A15',
    sizeBytes: 49_329,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: ILLUSION_ARROW_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_01',
      '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_02',
      '/Game/Effect/PC/Pca/skl_03/P_pca_skl03_explostion_start',
      '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_20_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth8_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_throw_1_Cue',
      '/Game/Sound/Sound_Hit/hit_effect/hit_arrow_1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const PAINSTRIKE_GALE_PRESENTATION = Object.freeze({
  skillId: 4106,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: PAINSTRIKE_GALE_PACKAGE_PATH,
    sha256: 'F1856B6E22781826725D774E763131A9895D212A59EDDA5FBDF5358373AE23B3',
    sizeBytes: 117_671,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: PAINSTRIKE_GALE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_02',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_03',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Arrow_02',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_01',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_02',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_03',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_04',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_05',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_06',
      '/Game/Effect/PC/Pca/Skl02/P_Pca_Skl02_Shadow_08',
      '/Game/Effect/PC/Pca/Skl01/P_Pca_Smoke_02',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_4_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Ski_Bow_multishot_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Ski_Bow_multishot_1-1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl02',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const QUICK_SHOT_PRESENTATION = Object.freeze({
  skillId: 4101,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: QUICK_SHOT_PACKAGE_PATH,
    sha256: '1FA92C4611817EC2D5AEE19EBEC6A96C4DF4D04594CEF9D8B4433CB535E97A3C',
    sizeBytes: 71_739,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: QUICK_SHOT_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pca/Skl01/P_Pca_Skl01_02',
      '/Game/Effect/PC/Pca/Skl01/P_Pca_Skl01_Arrow_02',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/Light_Flicker_052',
      '/Game/Effect/curve/PC/RadiusCurve',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_1-1_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Equip_1_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_4_Cue',
      '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const EXPULSION_CIRCLE_PRESENTATION = Object.freeze({
  skillId: 3404,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: EXPULSION_CIRCLE_PACKAGE_PATH,
    sha256: 'D72B7608EBBF8D0763CB073BB134495B3DF2250AD832D7D6986B122E8C9E6272',
    sizeBytes: 40_857,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: EXPULSION_CIRCLE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_01',
      '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_02',
      '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Shot_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
      '/Game/Effect/curve/PC/CharMT_V_Blue_003',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_batk12_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_Skill/Magic_02_Cue',
      '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
      '/Game/Sound/Sound_Skill/Whoosh_Ice_1_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Resist',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const LIGHT_RAY_PRESENTATION = Object.freeze({
  skillId: 3303,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: LIGHT_RAY_PACKAGE_PATH,
    sha256: 'C53986B5A683ABFE14307EB94D06DD72EDA064391547BE1BCA227565A86BF171',
    sizeBytes: 76_927,
    numFrames: 121,
    sequenceLengthSeconds: 4,
    notifyCount: 19,
  }),
  presentation: Object.freeze({
    animationAssetPath: LIGHT_RAY_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_01',
      '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_02',
      '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_03',
      '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_04',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Green']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_Long_1_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/pct_breath16_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_ilyangji_Cue',
      '/Game/Sound/Sound_Skill/Shot_ice_Explo_1_Cue',
      '/Game/Sound/Sound_Skill/Rev_Whoosh_L_1_Cue',
      '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Special',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Shake10_01/BP_Shake10_01_C',
      '/Game/Blueprint/BPCameraShake/BP_Shake18_01/BP_Shake18_01_C',
      '/Game/Blueprint/BPCameraShake/BP_Shake20_01/BP_Shake20_01_C',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const SOARING_SLASH_PRESENTATION = Object.freeze({
  skillId: 3203,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: SOARING_SLASH_PACKAGE_PATH,
    sha256: '2035FFE5290ED96D95ED9DAF02FA886D9FE756D7F60C99365BD514E63B58FF90',
    sizeBytes: 74_410,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: SOARING_SLASH_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/SwordBlast/P_Pct_SwordBlast_Cast_01',
      '/Game/Effect/PC/Pct/SwordBlast/P_Pct_SwordBlast_Skl02',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMt_V_Pink1',
      '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_batk10_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/pct_skill_16_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue2',
      '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_6_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_IllusionSword03',
      '/Game/Data/Curve/TargetCameraCurve/Target_02',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const BLASTING_CHARM_PRESENTATION = Object.freeze({
  skillId: 3505,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: BLASTING_CHARM_PACKAGE_PATH,
    sha256: '133FA71E54897CB3A806313913F5EE2F01AB8BBF3F269CF59901F88731F7D461',
    sizeBytes: 44_725,
    // The cooked package proves identity and dependencies; its sequence
    // header is not safely decoded by the extracted-client tooling.
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: BLASTING_CHARM_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Cast_01',
      '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Shot_01',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Pink1']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_atk23_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_atk2_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
      '/Game/Sound/Sound_Hit/Hit_Kick_1_Cue',
      '/Game/Sound/Sound_Skill/Magic_01_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
      '/Game/Sound/Sound_Skill/Whoosh_Wind_1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_DarkBurst',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const TAI_CHI_PRESENTATION = Object.freeze({
  skillId: 3201,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: TAI_CHI_PACKAGE_PATH,
    sha256: 'C8462DC3941BFD27AC58F62F1F678C1F72CA73FCD69F850E04D7BBBCEBB5F955',
    sizeBytes: 71_673,
    // The cooked package proves its identity and dependency graph. Its
    // sequence header is not safely decoded by the extracted-client tooling.
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: TAI_CHI_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Atk_01',
      '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_01',
      '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_02',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMT_V_gold_005']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_batk16_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/pct_skill_4_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Change_1_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
      '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
      '/Game/Sound/Sound_Skill/Rev_Whoosh_L_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Taegeuk01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const GUARDIAN_CIRCLE_PRESENTATION = Object.freeze({
  skillId: 3501,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: GUARDIAN_CIRCLE_PACKAGE_PATH,
    sha256: '59C0613E32A4CBA3E546EFA1DD8197EAC9C9254B188F502EB339D2587BA2C261',
    sizeBytes: 54_391,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: GUARDIAN_CIRCLE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    // The cooked animation exposes the native buff systems but not a safely
    // attributable standalone main particle. Preserve only proved bindings;
    // the browser painter reconstructs the barrier from these source colors.
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/Common/System/Buff/P_Buff_CommonUp_01',
      '/Game/Effect/Common/System/Buff/P_Buff_Taegi',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_atk27_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_batk2_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_Impact/Impact_Ground_4_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze(['/Game/Data/Curve/TargetCameraCurve/Target_01']),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const HEAL_PRESENTATION = Object.freeze({
  skillId: 3503,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: HEAL_PACKAGE_PATH,
    sha256: '8853E657C5241759FC883E1E320E99889B57F359FB62137B02131DC63EA1887C',
    sizeBytes: 43_506,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: HEAL_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_hand_01',
      '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_outer_001',
      '/Game/Effect/Common/Projectile/Pc_Pct/P_Pct_Heal_Hit_01',
      '/Game/Effect/Common/Projectile/P_pct_V_Skl_magicBarrier04_prj',
      '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
      '/Game/Effect/Common/System/Buff/P_Buff_HealHP_02_Loop',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMT_V_Orange2']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_skill_1_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_Step_2_Cue',
      '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
      '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Heal',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const GREATER_HEAL_PRESENTATION = Object.freeze({
  skillId: 3504,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: GREATER_HEAL_PACKAGE_PATH,
    sha256: '86191D291CC5B8792B63C533CE891727046A52BF160E4C01571AFA5A55A0926B',
    sizeBytes: 50_097,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: GREATER_HEAL_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Cast_01_A',
      '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Shot_01_A',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMT_V_Orange2']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_breath6_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_22_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
      '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_6_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MagicBarrier01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const RAIN_OF_BLADES_PRESENTATION = Object.freeze({
  skillId: 3104,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: RAIN_OF_BLADES_PACKAGE_PATH,
    sha256: '9FC8145678B42469BF2E5D06DEFD8E193FF1FFBCC85678DF4E25808153E371D7',
    sizeBytes: 38_825,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: RAIN_OF_BLADES_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze(['/Game/Effect/PC/Pct/SwordRain/P_Pct_SwordRain_Shot_01']),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMT_V_Blue_003']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_22_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_Step_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_ChainSword_07_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_SwordRain',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const MOONLIGHT_ORB_PRESENTATION = Object.freeze({
  skillId: 3301,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: MOONLIGHT_ORB_PACKAGE_PATH,
    sha256: 'E4918011F30E09053BAD516D08ED67FD4D9866F55328FC90EC9F493FC58165D5',
    sizeBytes: 44_788,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: MOONLIGHT_ORB_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Atk_01',
      '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Cast_02',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Green2']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_2_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MoonSpirit01',
      '/Game/Data/Curve/TargetCameraCurve/Target',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const SUNBEAM_SWORD_PRESENTATION = Object.freeze({
  skillId: 3101,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: SUNBEAM_SWORD_PACKAGE_PATH,
    sha256: '84B6227E30DFCE3EDAE2E60F45BB40BEDB1C3B4345F6C057958269EE78CC7AD3',
    sizeBytes: 71_373,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: SUNBEAM_SWORD_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_atk_01',
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_dust',
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_01',
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_02',
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_03',
      '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_04',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_Float05',
      '/Game/Effect/curve/PC/CharMt_V_Pink1',
      '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_batk_24_rand_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_ChainSword_03_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_ChainSword_05_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_Sword_long_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_IllusionSword01',
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_SunLight',
      '/Game/Data/Curve/TargetCameraCurve/Target_02',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const PIERCING_BLADES_PRESENTATION = Object.freeze({
  skillId: 3103,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: PIERCING_BLADES_PACKAGE_PATH,
    sha256: '0B70FC8A1F3E705C911040815B8F07352ACE5B4A9F3D06E2004AE01448436ECC',
    sizeBytes: 63_285,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: PIERCING_BLADES_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_launcher',
      '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_shoot',
      '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_trail_01',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMt_V_Pink1',
      '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/pct_atk24_Cue',
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_batk6_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth7_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_01_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_ChainSword_03_Cue',
      '/Game/Sound/Sound_Weapon/Weapon_ChainSword_05_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_PiercingAtk',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const MOONLIGHT_WAVE_PRESENTATION = Object.freeze({
  skillId: 3506,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: MOONLIGHT_WAVE_PACKAGE_PATH,
    sha256: 'CD5F4D451FFEF18C94E1B15163714A2630E32B6598E30E8959F5FBEEF3DCA79E',
    sizeBytes: 70_149,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: MOONLIGHT_WAVE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_jump_dust_01',
      '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_shoot_01',
    ]),
    guideAssetPaths: Object.freeze(['/Game/Effect/curve/PC/CharMt_V_Green']),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_9_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
      '/Game/Sound/Sound_DropnCloth/Drop_Step_2_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MoonWave',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const DRAGON_TORNADO_PRESENTATION = Object.freeze({
  skillId: 2403,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: DRAGON_TORNADO_PACKAGE_PATH,
    sha256: 'C56B42431B3424ECDFA05B0D359877253CCE79E693D5022B2B646AFE57CA5958',
    sizeBytes: 43_174,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: DRAGON_TORNADO_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_002',
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_01',
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_02',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
      '/Game/Sound/Sound_Skill/Magic_02_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
      '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_Fire_10_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_Tornado',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_05']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const IMMOLATE_PRESENTATION = Object.freeze({
  skillId: 2103,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: IMMOLATE_PACKAGE_PATH,
    sha256: '9A4599973645C7DB26D067364B776C1B2C0A532C96DDC624A03B8D2360090992',
    sizeBytes: 65_319,
    // The cooked package proves the Pcm laser identity and dependencies, but
    // its sequence metadata is not safely recoverable from this build.
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: IMMOLATE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/Laser/P_pcm_laser_001',
      '/Game/Effect/PC/Pcm/Laser/P_Pcm_laser_002',
      '/Game/Effect/PC/Pcm/Laser/P_Pcm_laser_004',
      '/Game/Effect/PC/Pcm/Laser/P_Pcm_laser_005',
      '/Game/Effect/PC/Pcm/Laser/P_Pcm_laser_006',
      '/Game/Effect/Hit/PC_PCm/P_Pcm_laser_Hit_001',
      '/Game/Effect/Common/System/Debuff/P_Buff_Fire_Bleeding_01',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_batk11_Cue',
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_breath34_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth8_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_Skill/Shot_Sizzle-Lazer-1_Cue',
      '/Game/Sound/Sound_Skill/Skill_fire_sizzle_4_Cue',
      '/Game/Sound/Sound_Skill/Skill_Impact_Fire_1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Sk_Laser',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const FROZEN_BLOCK_PRESENTATION = Object.freeze({
  skillId: 2202,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: FROZEN_BLOCK_PACKAGE_PATH,
    sha256: '73410BF9BC9127277EB99D5FD5C6A0A02576FD53C4611D7CB5BC4F35CDD82436',
    sizeBytes: 62_730,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: FROZEN_BLOCK_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_01',
      '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_02',
      '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_03',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_batk1_Cue',
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
      '/Game/Sound/Sound_DropnCloth/cra_cloth_02_Cue',
      '/Game/Sound/Sound_Object/Obje_break_ice_1_Cue',
      '/Game/Sound/Sound_Skill/Ice_Crash_1_Cue',
      '/Game/Sound/Sound_Skill/Ice_Freeze_1_Cue',
      '/Game/Sound/Sound_Skill/Ice_Freeze_3_Cue',
      '/Game/Sound/Sound_Skill/Rev_Ice_1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_IceBall02',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcw_Btl_Skl_Banwol01',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const FLAME_STRIKE_PRESENTATION = Object.freeze({
  skillId: 2201,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: FLAME_STRIKE_PACKAGE_PATH,
    sha256: 'F5A299B4350CD37A5256077593CFBC4AD57221C05111AB4575842F857582D647',
    sizeBytes: 41_557,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: FLAME_STRIKE_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze(['/Game/Effect/PC/Pcm/fire/P_pcm_firewind_001']),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_V_Red05',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill12_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explo_2_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_IceBall01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const CHAIN_LIGHTNING_PRESENTATION = Object.freeze({
  skillId: 2303,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: CHAIN_LIGHTNING_PACKAGE_PATH,
    sha256: '0B8244936C32B66D9EE997C0AACDDC3577FDB94037B045E50DE14FF02C2E179A',
    sizeBytes: 57_508,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: CHAIN_LIGHTNING_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_001',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_002',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_003',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_004',
      '/Game/Effect/PC/Pcm/P_PCM_BeamTrail_thunder',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
      '/Game/Effect/curve/PC/CharMT_Float07_001',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk2_rand_Cue',
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_breath10_Cue',
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
      '/Game/Sound/Sound_Skill/Spark_Rev_1_Cue',
      '/Game/Sound/Sound_Skill/Spark_Shot_5_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_Thunder03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Pcm_Btl_Skl_ChainLightning',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_04',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const MAGIC_SHIELD_PRESENTATION = Object.freeze({
  skillId: 2503,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: MAGIC_SHIELD_PACKAGE_PATH,
    sha256: '5B0D50BD0DDF8D355E4EB55C035645B9896F1C5552A0DB029429028B45944E73',
    sizeBytes: 34_675,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: MAGIC_SHIELD_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_01',
      '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_04',
    ]),
    guideAssetPaths: Object.freeze([
      '/Game/Effect/curve/PC/CharMT_F_0015',
      '/Game/Effect/curve/PC/CharMT_F_04',
      '/Game/Effect/curve/PC/CharMT_F_blue2',
    ]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk2_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_1_Cue',
      '/Game/Sound/Sound_Skill/Ice_Freeze_3_Cue',
      '/Game/Sound/Sound_Skill/Magic_01_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_ManaShield',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const BLIZZARD_PRESENTATION = Object.freeze({
  skillId: 2203,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: BLIZZARD_PACKAGE_PATH,
    sha256: 'FBC63696934A7F148A0994499171335CC12E08EE634E8D6590C30867CF5BE811',
    sizeBytes: 53_806,
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: BLIZZARD_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_001',
      '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_002',
      '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_hand_001',
      '/Game/Effect/PC/Pcm/ice_ball/P_Pcm_iceball03_03',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill11_Cue',
      '/Game/Sound/Sound_DropnCloth/cra_cloth_02_Cue',
      '/Game/Sound/Sound_Object/Obje_break_ice_1_Cue',
      '/Game/Sound/Sound_Skill/Ice_Freeze_2_Cue',
      '/Game/Sound/Sound_Skill/Rev_Ice_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_shot_ice_2_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_IceBall03',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze([
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_01',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_05',
    ]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const THUNDERSTORM_PRESENTATION = Object.freeze({
  skillId: 2301,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: THUNDERSTORM_PACKAGE_PATH,
    sha256: '422BD24EA07DD20A53CC1E6DEF1673D5B86844F0CBD3D5F9760F75752E78E462',
    sizeBytes: 53_071,
    // This cooked package proves the animation identity and bound effects,
    // but its sequence metadata is not safely decodable in the extracted build.
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: THUNDERSTORM_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_Thunder_002',
      '/Game/Effect/PC/Pcm/Thunder/P_pcm_Thunder_Hand_01',
      '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_down_Thunder_01',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([]),
    cameraCurveAssetPaths: Object.freeze([]),
    cameraShakeAssetPaths: Object.freeze([]),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const DARK_VORTEX_PRESENTATION = Object.freeze({
  skillId: 2501,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: DARK_VORTEX_PACKAGE_PATH,
    sha256: 'C56B42431B3424ECDFA05B0D359877253CCE79E693D5022B2B646AFE57CA5958',
    sizeBytes: 43_174,
    // The preserved package proves identity and dependencies. Sequence
    // metadata could not be decoded from this cooked build, so it remains
    // explicitly unknown instead of being inferred from action timings.
    numFrames: null,
    sequenceLengthSeconds: null,
    notifyCount: null,
  }),
  presentation: Object.freeze({
    animationAssetPath: DARK_VORTEX_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_002',
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_01',
      '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_02',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
      '/Game/Sound/Sound_Skill/Magic_02_Cue',
      '/Game/Sound/Sound_Skill/shot_30_Cue',
      '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      '/Game/Sound/Sound_Skill/Skill_Shot_Fire_10_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_Tornado',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_05']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const FLAME_ORB_PRESENTATION = Object.freeze({
  skillId: 2101,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: FLAME_ORB_PACKAGE_PATH,
    sha256: '0792E9A438475E006BE89292D0928673BF1EF2A874CF6EBD3A81F2D55E9D799F',
    sizeBytes: 41_674,
    numFrames: 39,
    sequenceLengthSeconds: 1.2666667,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: FLAME_ORB_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_01',
      '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_02',
      '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_03',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk14_rand_Cue',
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill6_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
      '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall01',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

const FROST_ORB_PRESENTATION = Object.freeze({
  skillId: 2111,
  source: Object.freeze({
    kind: 'extracted-cooked-uasset' as const,
    packagePath: FROST_ORB_PACKAGE_PATH,
    sha256: '87DD022672688BF8DE7009D3B56C1C8ABEFA1E9086EEE3EA685B98BB654AA3E1',
    sizeBytes: 39_802,
    numFrames: 41,
    sequenceLengthSeconds: 1.3333334,
    notifyCount: 8,
  }),
  presentation: Object.freeze({
    animationAssetPath: FROST_ORB_PACKAGE_PATH,
    animationBindingConfidence: 'corroborated-asset' as const,
    vfxAssetPaths: Object.freeze([
      '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_001',
      '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_002',
      '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_003',
    ]),
    guideAssetPaths: Object.freeze([]),
    soundAssetPaths: Object.freeze([
      '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill12_Cue',
      '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
      '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
      '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
      '/Game/Sound/Sound_Skill/Skill_shot_ice_2_Cue',
      '/Game/Sound/Sound_Skill/Whoosh_Fire_6_Cue2',
    ]),
    cameraCurveAssetPaths: Object.freeze([
      '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall11',
      '/Game/Data/Curve/TargetCameraCurve/Target_Base',
    ]),
    cameraShakeAssetPaths: Object.freeze(['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16']),
  }),
}) satisfies Mir4NativeSkillAssetPresentationEvidence;

/** Returns only presentation bindings corroborated by an inspected cooked skill asset. */
export function mir4NativeSkillAssetPresentationEvidence(
  skillId: number,
): Mir4NativeSkillAssetPresentationEvidence | null {
  if (skillId === CRESCENT_BLADE_PRESENTATION.skillId) return CRESCENT_BLADE_PRESENTATION;
  if (skillId === DRAGON_TAIL_PRESENTATION.skillId) return DRAGON_TAIL_PRESENTATION;
  if (skillId === ASCENDING_DRAGON_PRESENTATION.skillId) return ASCENDING_DRAGON_PRESENTATION;
  if (skillId === NIRVANA_KICK_PRESENTATION.skillId) return NIRVANA_KICK_PRESENTATION;
  if (skillId === DOUBLE_STRIKE_PRESENTATION.skillId) return DOUBLE_STRIKE_PRESENTATION;
  if (skillId === CRUSHING_BLOW_PRESENTATION.skillId) return CRUSHING_BLOW_PRESENTATION;
  if (skillId === SWEEPING_STORM_PRESENTATION.skillId) return SWEEPING_STORM_PRESENTATION;
  if (skillId === WIND_WALL_PRESENTATION.skillId) return WIND_WALL_PRESENTATION;
  if (skillId === RAVAGING_BLOW_PRESENTATION.skillId) return RAVAGING_BLOW_PRESENTATION;
  if (skillId === BLITZ_STRIKE_PRESENTATION.skillId) return BLITZ_STRIKE_PRESENTATION;
  if (skillId === DRAGON_SPEAR_PRESENTATION.skillId) return DRAGON_SPEAR_PRESENTATION;
  if (skillId === ABSORPTION_PRESENTATION.skillId) return ABSORPTION_PRESENTATION;
  if (skillId === PIERCING_SPEAR_PRESENTATION.skillId) return PIERCING_SPEAR_PRESENTATION;
  if (skillId === ICE_CAGE_PRESENTATION.skillId) return ICE_CAGE_PRESENTATION;
  if (skillId === MINDS_EYE_PRESENTATION.skillId) return MINDS_EYE_PRESENTATION;
  if (skillId === CLOAKING_PRESENTATION.skillId) return CLOAKING_PRESENTATION;
  if (skillId === ARROW_RAIN_PRESENTATION.skillId) return ARROW_RAIN_PRESENTATION;
  if (skillId === SEEKING_BOLT_PRESENTATION.skillId) return SEEKING_BOLT_PRESENTATION;
  if (skillId === HEAVENLY_BOW_PRESENTATION.skillId) return HEAVENLY_BOW_PRESENTATION;
  if (skillId === OBLITERATE_SHELL_PRESENTATION.skillId) return OBLITERATE_SHELL_PRESENTATION;
  if (skillId === FLASH_ARROW_PRESENTATION.skillId) return FLASH_ARROW_PRESENTATION;
  if (skillId === BURST_SHELL_PRESENTATION.skillId) return BURST_SHELL_PRESENTATION;
  if (skillId === VENOM_MIST_SHELL_PRESENTATION.skillId) return VENOM_MIST_SHELL_PRESENTATION;
  if (skillId === ILLUSION_ARROW_PRESENTATION.skillId) return ILLUSION_ARROW_PRESENTATION;
  if (skillId === PAINSTRIKE_GALE_PRESENTATION.skillId) return PAINSTRIKE_GALE_PRESENTATION;
  if (skillId === QUICK_SHOT_PRESENTATION.skillId) return QUICK_SHOT_PRESENTATION;
  if (skillId === FLAME_ORB_PRESENTATION.skillId) return FLAME_ORB_PRESENTATION;
  if (skillId === FROST_ORB_PRESENTATION.skillId) return FROST_ORB_PRESENTATION;
  if (skillId === THUNDERSTORM_PRESENTATION.skillId) return THUNDERSTORM_PRESENTATION;
  if (skillId === DARK_VORTEX_PRESENTATION.skillId) return DARK_VORTEX_PRESENTATION;
  if (skillId === BLIZZARD_PRESENTATION.skillId) return BLIZZARD_PRESENTATION;
  if (skillId === MAGIC_SHIELD_PRESENTATION.skillId) return MAGIC_SHIELD_PRESENTATION;
  if (skillId === CHAIN_LIGHTNING_PRESENTATION.skillId) return CHAIN_LIGHTNING_PRESENTATION;
  if (skillId === FLAME_STRIKE_PRESENTATION.skillId) return FLAME_STRIKE_PRESENTATION;
  if (skillId === FROZEN_BLOCK_PRESENTATION.skillId) return FROZEN_BLOCK_PRESENTATION;
  if (skillId === IMMOLATE_PRESENTATION.skillId) return IMMOLATE_PRESENTATION;
  if (skillId === DRAGON_TORNADO_PRESENTATION.skillId) return DRAGON_TORNADO_PRESENTATION;
  if (skillId === LIGHT_RAY_PRESENTATION.skillId) return LIGHT_RAY_PRESENTATION;
  if (skillId === MOONLIGHT_WAVE_PRESENTATION.skillId) return MOONLIGHT_WAVE_PRESENTATION;
  if (skillId === MOONLIGHT_ORB_PRESENTATION.skillId) return MOONLIGHT_ORB_PRESENTATION;
  if (skillId === SUNBEAM_SWORD_PRESENTATION.skillId) return SUNBEAM_SWORD_PRESENTATION;
  if (skillId === PIERCING_BLADES_PRESENTATION.skillId) return PIERCING_BLADES_PRESENTATION;
  if (skillId === RAIN_OF_BLADES_PRESENTATION.skillId) return RAIN_OF_BLADES_PRESENTATION;
  if (skillId === TAI_CHI_PRESENTATION.skillId) return TAI_CHI_PRESENTATION;
  if (skillId === GUARDIAN_CIRCLE_PRESENTATION.skillId) return GUARDIAN_CIRCLE_PRESENTATION;
  if (skillId === HEAL_PRESENTATION.skillId) return HEAL_PRESENTATION;
  if (skillId === GREATER_HEAL_PRESENTATION.skillId) return GREATER_HEAL_PRESENTATION;
  if (skillId === BLASTING_CHARM_PRESENTATION.skillId) return BLASTING_CHARM_PRESENTATION;
  if (skillId === SOARING_SLASH_PRESENTATION.skillId) return SOARING_SLASH_PRESENTATION;
  if (skillId === EXPULSION_CIRCLE_PRESENTATION.skillId) return EXPULSION_CIRCLE_PRESENTATION;
  return null;
}

/** Returns inspected secondary animation clips without conflating them with the cast clip. */
export function mir4NativeSkillSupplementalAnimationEvidence(
  skillId: number,
): readonly Mir4NativeSkillSupplementalAnimationEvidence[] {
  return skillId === CLOAKING_RECOVERY_PRESENTATION.skillId
    ? Object.freeze([CLOAKING_RECOVERY_PRESENTATION])
    : Object.freeze([]);
}
