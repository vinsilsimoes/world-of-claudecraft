import type { SimEvent } from '../sim/types';
import {
  type Mir4NativePresentationContact,
  type Mir4NativePresentationContactVisual,
  type Mir4NativePresentationSourcePose,
  mir4NativeSkillContactVisual,
  mir4NativeSkillPresentationContactRange,
} from './mir4_native_skill_presentation_core';
import { validObliterateShellPresentation } from './mir4_obliterate_shell_painter';

type Mir4SkillPresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;

export interface Mir4NativeSkillPresentationDeps {
  playPersistentArea?(
    event: Mir4SkillPresentationEvent,
    area: NonNullable<Mir4SkillPresentationEvent['persistentArea']>,
  ): void;
  playProjectile?(
    event: Mir4SkillPresentationEvent,
    projectile: NonNullable<Mir4SkillPresentationEvent['projectiles']>[number],
    projectileIndex: number,
  ): void;
  playContact(
    event: Mir4SkillPresentationEvent,
    contact: Mir4NativePresentationContact,
    visual: Mir4NativePresentationContactVisual,
    contactIndex: number,
  ): void;
}

interface Mir4NativeSkillPresentationSlot {
  event: Mir4SkillPresentationEvent | null;
  elapsedMs: number;
  nextProjectile: number;
  persistentAreaStarted: boolean;
  active: boolean;
}

const AIR_SLASH_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash';
const OVERDRIVE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive';
const OVERDRIVE_VFX = [
  '/Game/Effect/PC/Pcw/P_pcw_OverDrive_001',
  '/Game/Effect/PC/Pcw/P_Pcw_Counter_Atk_01',
  '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
] as const;
const AIR_SLASH_VFX = [
  '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_002',
  '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_003',
  '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_Atk_01',
] as const;
const IRON_SHACKLE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain';
const IRON_SHACKLE_VFX = [
  '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_01',
  '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_02',
  '/Game/Effect/PC/Pcw/P_Pcw_IronChain_Atk_01',
] as const;
const DRAGON_FLAME_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Special';
const DRAGON_FLAME_VFX = [
  '/Game/Animation/AnimationSequence/PC/Effect/EFT_Dragon01/EFT_Dragon01_FireSword01',
  '/Game/Blueprint/Projectile/SkeletalEffect/SkeletalEffect04',
  '/Game/Effect/PC/Basic/P_Pct_Action01_03',
  '/Game/Effect/PC/Pcw/Special/p_pc_Special_001',
  '/Game/Effect/PC/Pcw/Special/p_pc_Special_002',
  '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
  '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
  '/Game/Effect/Common/System/Debuff/P_Buff_Fire_Bleeding_01',
] as const;
const LIGHT_RAY_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special';
const LIGHT_RAY_VFX = [
  '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_01',
  '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_02',
  '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_03',
  '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_04',
] as const;
const CRESCENT_BLADE_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon01';
const CRESCENT_BLADE_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_003',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_01_02',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_01_01',
] as const;
const DRAGON_TAIL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon02';
const DRAGON_TAIL_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/p_pcz_atk_gr_004',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_CircleMoon_02_03',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_02_01',
] as const;
const ASCENDING_DRAGON_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon03';
const ASCENDING_DRAGON_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_02',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon03_01',
] as const;
const NIRVANA_KICK_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon04';
const NIRVANA_KICK_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_01',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_02',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_04_03',
] as const;
const DOUBLE_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear01';
const DOUBLE_STRIKE_VFX = [
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear03_01',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_02',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_03',
] as const;
const CRUSHING_BLOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear03';
const CRUSHING_BLOW_VFX = [
  '/Game/Effect/PC/Basic/P_Pct_Action01_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_01',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear01_02',
  '/Game/Effect/PC/Pcz/TurnSpear/P_Pcz_Pcz_jump',
  '/Game/Effect/PC/Pcz/TurnSpear/Pcz_Btl_Skl_TurnSpear03_04',
] as const;
const SWEEPING_STORM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_01';
const SWEEPING_STORM_VFX = [
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_02_A2',
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_03',
  '/Game/Effect/PC/Pcz/Tonado/Pcz_Btl_Skl_Tornado_01_04',
] as const;
const WIND_WALL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_03';
const WIND_WALL_VFX = [
  '/Game/Effect/PC/Pcz/P_Pcz_Tornado_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_02',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Tornado_03_03',
] as const;
const RAVAGING_BLOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear01';
const RAVAGING_BLOW_VFX = [
  '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_01_Blue',
  '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_Blue',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_DashSpear05_02_Blue',
] as const;
const BLITZ_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear02';
const BLITZ_STRIKE_VFX = [
  '/Game/Effect/PC/Basic/P_Pct_Action01_02',
  '/Game/Effect/PC/Basic/P_Upturned01_03',
  '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_02',
  '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_Dashspear02_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_01',
] as const;
const DRAGON_SPEAR_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03';
const DRAGON_SPEAR_VFX = [
  '/Game/Effect/PC/Basic/P_Pct_Action01_03',
  '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_DashSpear03_in_glow',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_02',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_Ready',
] as const;
const FROST_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall';
const PIERCING_SPEAR_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05';
const PIERCING_SPEAR_VFX = [
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
  '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_05_03',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_01',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_02',
  '/Game/Effect/Hit/PC_Pcz/PC_Pcz_atk_01',
] as const;
const ABSORPTION_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear04';
const ABSORPTION_VFX = [
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_01',
  '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_02',
] as const;
const FLAME_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall';
const FLAME_ORB_VFX = [
  '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_01',
  '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_02',
  '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_03',
] as const;
const FROST_ORB_VFX = [
  '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_001',
  '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_002',
  '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_003',
] as const;
const DARK_VORTEX_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado';
const DARK_VORTEX_VFX = [
  '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_002',
  '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_01',
  '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_02',
] as const;
const THUNDERSTORM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder';
const THUNDERSTORM_VFX = [
  '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_Thunder_002',
  '/Game/Effect/PC/Pcm/Thunder/P_pcm_Thunder_Hand_01',
  '/Game/Effect/PC/Pcm/Thunder/P_Pcm_skill_down_Thunder_01',
] as const;
const BLIZZARD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard';
const BLIZZARD_VFX = [
  '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_001',
  '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_body_002',
  '/Game/Effect/PC/Pcm/Blizzard/P_Pcm_Blizzard_hand_001',
  '/Game/Effect/PC/Pcm/ice_ball/P_Pcm_iceball03_03',
] as const;
const MAGIC_SHIELD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield';
const MAGIC_SHIELD_VFX = [
  '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_01',
  '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_04',
] as const;
const CHAIN_LIGHTNING_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning';
const CHAIN_LIGHTNING_VFX = [
  '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_001',
  '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_002',
  '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_003',
  '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_004',
  '/Game/Effect/PC/Pcm/P_PCM_BeamTrail_thunder',
] as const;
const FLAME_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Meteor';
const FLAME_STRIKE_VFX = ['/Game/Effect/PC/Pcm/fire/P_pcm_firewind_001'] as const;
const FROZEN_BLOCK_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Freezing';
const FROZEN_BLOCK_VFX = [
  '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_01',
  '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_02',
  '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_03',
] as const;
const MOONLIGHT_WAVE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave';
const MOONLIGHT_WAVE_VFX = [
  '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_jump_dust_01',
  '/Game/Effect/PC/Pct/MoonWave/P_Pct_MoonWave_shoot_01',
] as const;
const MOONLIGHT_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb';
const MOONLIGHT_ORB_VFX = [
  '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Atk_01',
  '/Game/Effect/PC/Pct/MoonOrb/P_Pct_MoonOrb_Cast_02',
] as const;
const SUNBEAM_SWORD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SunLight';
const SUNBEAM_SWORD_VFX = [
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_atk_01',
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_dust',
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_01',
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_02',
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_03',
  '/Game/Effect/PC/Pct/SunLight/P_Pct_SunLight_trail_04',
] as const;
const PIERCING_BLADES_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_PiercingAtk';
const PIERCING_BLADES_VFX = [
  '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_launcher',
  '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_shoot',
  '/Game/Effect/PC/Pct/PiercingAtk/P_Pct_PiercingAtk_trail_01',
] as const;
const SOARING_SLASH_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordBlast';
const SOARING_SLASH_VFX = [
  '/Game/Effect/PC/Pct/SwordBlast/P_Pct_SwordBlast_Cast_01',
  '/Game/Effect/PC/Pct/SwordBlast/P_Pct_SwordBlast_Skl02',
] as const;
const EXPULSION_CIRCLE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Resist';
const EXPULSION_CIRCLE_VFX = [
  '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_01',
  '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_02',
  '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Shot_01',
] as const;
const RAIN_OF_BLADES_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain';
const RAIN_OF_BLADES_VFX = ['/Game/Effect/PC/Pct/SwordRain/P_Pct_SwordRain_Shot_01'] as const;
const HEAL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal';
const HEAL_VFX = [
  '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_hand_01',
  '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_outer_001',
  '/Game/Effect/Common/Projectile/Pc_Pct/P_Pct_Heal_Hit_01',
  '/Game/Effect/Common/Projectile/P_pct_V_Skl_magicBarrier04_prj',
  '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
  '/Game/Effect/Common/System/Buff/P_Buff_HealHP_02_Loop',
] as const;
const GREATER_HEAL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal';
const GREATER_HEAL_VFX = [
  '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Cast_01_A',
  '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Shot_01_A',
] as const;
const GUARDIAN_CIRCLE_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MagicBarrier03';
const QUICK_SHOT_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl01';
const QUICK_SHOT_VFX = [
  '/Game/Effect/PC/Pca/Skl01/P_Pca_Skl01_02',
  '/Game/Effect/PC/Pca/Skl01/P_Pca_Skl01_Arrow_02',
] as const;
const ILLUSION_ARROW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl03';
const ILLUSION_ARROW_VFX = [
  '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_01',
  '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_02',
  '/Game/Effect/PC/Pca/skl_03/P_pca_skl03_explostion_start',
  '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
] as const;
const BURST_SHELL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl04';
const BURST_SHELL_VFX = [
  '/Game/Effect/PC/Pca/Skl04/P_Pca_arrow_shoot_Skl04',
  '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_01',
  '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_02',
  '/Game/Effect/PC/Pca/skl_03/P_pca_skl_03_explosion',
  '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
] as const;
const VENOM_MIST_SHELL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl06';
const VENOM_MIST_SHELL_VFX = [
  '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_01',
  '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_03',
  '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail',
  '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail_02',
  '/Game/Effect/PC/Pca/Skl06/P_Pca_Smoke_skl06',
] as const;
const ICE_CAGE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl05';
const ICE_CAGE_VFX = [
  '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_001',
  '/Game/Effect/PC/Pca/Skl05/P_Pca_Skl05_Shoot',
] as const;
const FLASH_ARROW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl07';
const FLASH_ARROW_VFX = [
  '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_01_02',
  '/Game/Effect/PC/Pca/Skl07/P_Pca_Skl07_Shoot',
] as const;
const HEAVENLY_BOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl08';
const HEAVENLY_BOW_VFX = [
  '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08',
  '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_01',
  '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Shoot_02',
  '/Game/Effect/PC/Pca/Skl08/P_Pca_Skl08_Smoke',
] as const;
const SEEKING_BOLT_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl10';
const SEEKING_BOLT_VFX = [
  '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_03',
  '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_04',
  '/Game/Effect/PC/Pca/Skl10/P_PCA_Skl13',
] as const;
const MINDS_EYE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl11';
const MINDS_EYE_VFX = ['/Game/Effect/PC/Pca/Skl11/P_Pca_buff02'] as const;
const CLOAKING_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12';
const CLOAKING_VFX = ['/Game/Effect/PC/Pca/Skl12/P_pca_Smoke'] as const;
const ARROW_RAIN_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special';
const ARROW_RAIN_VFX = [
  '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_01',
  '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_02',
  '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_03',
] as const;
const PAINSTRIKE_GALE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl02';
const PAINSTRIKE_GALE_VFX = [
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
] as const;
const GUARDIAN_CIRCLE_VFX = [
  '/Game/Effect/Common/System/Buff/P_Buff_CommonUp_01',
  '/Game/Effect/Common/System/Buff/P_Buff_Taegi',
] as const;
const TAI_CHI_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Taegeuk';
const TAI_CHI_VFX = [
  '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Atk_01',
  '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_01',
  '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_02',
] as const;
const BLASTING_CHARM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_DarkBurst';
const BLASTING_CHARM_VFX = [
  '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Cast_01',
  '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Shot_01',
] as const;

function hasExactAssetPaths(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length && actual.every((path, index) => path === expected[index])
  );
}

function validAirSlashContacts(contacts: readonly Mir4NativePresentationContact[]): boolean {
  const expected = [
    [110202, 520, 4.5, 5, 8000],
    [110203, 699, 6.5, 5, 8000],
    [110204, 900, 8.5, 5, 9000],
  ] as const;
  return (
    contacts.length === expected.length &&
    contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.reachYards === row[2] &&
        contact.widthYards === row[3] &&
        contact.damageCoefficient === row[4]
      );
    })
  );
}

function validIronShackleContacts(contacts: readonly Mir4NativePresentationContact[]): boolean {
  const expected = [
    [120101, 500, 7, 11, 4, 7000],
    [120102, 850, 7, 11, 4, 7000],
    [120103, 1500, 3, 7, 4, 8000],
  ] as const;
  return (
    contacts.length === expected.length &&
    contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === row[2] &&
        contact.radiusYards === row[3] &&
        contact.heightYards === row[4] &&
        contact.damageCoefficient === row[5]
      );
    })
  );
}

function validOverDriveContacts(contacts: readonly Mir4NativePresentationContact[]): boolean {
  const expected = [
    [110100, 20, 0, 5, 4, 8000],
    [110101, 650, 0, 5, 4, 8000],
  ] as const;
  return (
    contacts.length === expected.length &&
    contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === row[2] &&
        contact.radiusYards === row[3] &&
        contact.heightYards === row[4] &&
        contact.damageCoefficient === row[5]
      );
    })
  );
}

function validDragonFlameContacts(contacts: readonly Mir4NativePresentationContact[]): boolean {
  const expected = [
    [140302, 780, 5, 7, 4, 15_000],
    [140303, 1500, 5, 7, 4, 15_500],
    [140303, 1720, 5, 7, 4, 15_500],
    [140304, 2560, 5, 7, 4, 20_000],
  ] as const;
  return (
    contacts.length === expected.length &&
    contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === row[2] &&
        contact.radiusYards === row[3] &&
        contact.heightYards === row[4] &&
        contact.damageCoefficient === row[5]
      );
    })
  );
}

function validLightRayContacts(contacts: readonly Mir4NativePresentationContact[]): boolean {
  const expected = [
    [330303, 1060, 13, 3.5, 5000],
    [330303, 1260, 13, 3.5, 5000],
    [330305, 1660, 13, 3.5, 5000],
    [330305, 1860, 13, 3.5, 5000],
    [330306, 2200, 13, 3.5, 11_000],
    [330309, 2600, 16, 4, 13_000],
    [330310, 2800, 16, 4, 12_000],
  ] as const;
  return (
    contacts.length === expected.length &&
    contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.reachYards === row[2] &&
        contact.widthYards === row[3] &&
        contact.damageCoefficient === row[4]
      );
    })
  );
}

function validFrostOrbPresentation(event: Mir4SkillPresentationEvent): boolean {
  const projectile = event.projectiles?.[0];
  const contact = event.contacts[0];
  return (
    event.projectiles?.length === 1 &&
    projectile?.attackId === 211101 &&
    projectile.launchOffsetMs === 574 &&
    projectile.movement === 'target-homing' &&
    projectile.speedYardsPerSecond === 40 &&
    projectile.lifetimeMs === 2000 &&
    projectile.sourceSocketName === 'head' &&
    projectile.effectId === 2040032 &&
    projectile.effectScale === 1 &&
    event.contacts.length === 1 &&
    contact?.shape === 'target-circle' &&
    contact.attackId === 211102 &&
    contact.offsetMs === 824 &&
    contact.radiusYards === 4.5 &&
    contact.heightYards === 4 &&
    contact.damageCoefficient === 17_800
  );
}

function validFlameOrbPresentation(event: Mir4SkillPresentationEvent): boolean {
  const projectile = event.projectiles?.[0];
  const contact = event.contacts[0];
  return (
    event.projectiles?.length === 1 &&
    projectile?.attackId === 210101 &&
    projectile.launchOffsetMs === 530 &&
    projectile.movement === 'target-homing' &&
    projectile.speedYardsPerSecond === 40 &&
    projectile.lifetimeMs === 2000 &&
    projectile.sourceSocketName === 'Hand_L' &&
    projectile.effectId === 2040003 &&
    projectile.effectScale === 1 &&
    event.contacts.length === 1 &&
    contact?.shape === 'target-circle' &&
    contact.attackId === 210102 &&
    contact.offsetMs === 780 &&
    contact.radiusYards === 4.5 &&
    contact.heightYards === 4 &&
    contact.damageCoefficient === 18_700
  );
}

function validBlastingCharmPresentation(event: Mir4SkillPresentationEvent): boolean {
  const projectile = event.projectiles?.[0];
  const contact = event.contacts[0];
  return (
    event.projectiles?.length === 1 &&
    projectile?.attackId === 350501 &&
    projectile.launchOffsetMs === 830 &&
    projectile.movement === 'target-homing' &&
    projectile.speedYardsPerSecond === 40 &&
    projectile.lifetimeMs === 2_000 &&
    projectile.sourceSocketName === 'Hand_L' &&
    projectile.effectId === 2_040_034 &&
    projectile.effectScale === 1 &&
    event.contacts.length === 1 &&
    contact?.shape === 'target-circle' &&
    contact.attackId === 350502 &&
    contact.offsetMs === 1_080 &&
    contact.radiusYards === 6 &&
    contact.heightYards === 4 &&
    contact.damageCoefficient === 24_000
  );
}

function validDarkVortexPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [250102, 720, 'target-circle', 3, 4_000],
    [250111, 1_100, 'fixed-circle', 4.5, 4_000],
    [250112, 1_300, 'fixed-circle', 4.5, 4_000],
    [250113, 1_500, 'fixed-circle', 4.5, 4_000],
    [250114, 1_700, 'fixed-circle', 4.5, 5_000],
    [250115, 1_800, 'fixed-circle', 4.5, 5_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 6_100 &&
    area.radiusYards === 4.5 &&
    area.heightYards === 3 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === row[2] &&
        contact.radiusYards === row[3] &&
        contact.damageCoefficient === row[4] &&
        (contact.shape !== 'fixed-circle' ||
          (contact.x === area.x && contact.y === area.y && contact.z === area.z))
      );
    })
  );
}

function validDragonTornadoPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [240321, 555],
    [240321, 700],
    [240321, 800],
    [240322, 950],
    [240322, 1050],
    [240323, 1150],
    [240324, 1250],
    [240324, 1450],
    [240324, 1650],
    [240325, 1850],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 6100 &&
    area.radiusYards === 7 &&
    area.heightYards === 4 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === 'fixed-circle' &&
        contact.radiusYards === 7 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === 6800 &&
        contact.x === area.x &&
        contact.y === area.y &&
        contact.z === area.z
      );
    })
  );
}

function validThunderstormPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [230112, 800, 7, 0],
    [230113, 900, 7, 7_300],
    [230114, 950, 7, 7_300],
    [230115, 1_000, 7, 7_300],
    [230116, 1_050, 3.5, 7_300],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 4_100 &&
    area.radiusYards === 7 &&
    area.heightYards === 4 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === 'fixed-circle' &&
        contact.radiusYards === row[2] &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[3] &&
        contact.x === area.x &&
        contact.y === area.y &&
        contact.z === area.z
      );
    })
  );
}

function validMoonlightWavePresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [350611, 620, 'fixed-circle', 5000],
    [350611, 700, 'fixed-circle', 5000],
    [350602, 732, 'target-circle', 6000],
    [350612, 780, 'fixed-circle', 5000],
    [350612, 800, 'fixed-circle', 5000],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 200 &&
    area.expiresOffsetMs === 4200 &&
    area.radiusYards === 6 &&
    area.heightYards === 4 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === row[2] &&
        contact.radiusYards === 6 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[3] &&
        (contact.shape !== 'fixed-circle' ||
          (contact.x === area.x && contact.y === area.y && contact.z === area.z))
      );
    })
  );
}

function validMoonlightOrbPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [330111, 867, 'fixed-circle', 2500],
    [330102, 900, 'target-circle', 3500],
    [330111, 1467, 'fixed-circle', 2500],
    [330112, 1817, 'fixed-circle', 2500],
    [330112, 2117, 'fixed-circle', 2500],
    [330113, 2467, 'fixed-circle', 2500],
    [330113, 2767, 'fixed-circle', 2500],
    [330114, 3117, 'fixed-circle', 2500],
    [330114, 3417, 'fixed-circle', 2500],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 567 &&
    area.expiresOffsetMs === 6567 &&
    area.radiusYards === 5.5 &&
    area.heightYards === 3 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === row[2] &&
        contact.radiusYards === 5.5 &&
        contact.heightYards === 3 &&
        contact.damageCoefficient === row[3] &&
        (contact.shape !== 'fixed-circle' ||
          (contact.x === area.x && contact.y === area.y && contact.z === area.z))
      );
    })
  );
}

function validRainOfBladesPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [310411, 480, 'fixed-circle', 10_000],
    [310412, 680, 'fixed-circle', 11_000],
    [310402, 1_000, 'target-circle', 9_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 4_100 &&
    area.radiusYards === 6 &&
    area.heightYards === 4 &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === row[2] &&
        contact.damageCoefficient === row[3] &&
        ('radiusYards' in contact ? contact.radiusYards === 6 : false) &&
        ('heightYards' in contact ? contact.heightYards === 4 : false) &&
        (contact.shape !== 'fixed-circle' ||
          (contact.x === area.x && contact.y === area.y && contact.z === area.z))
      );
    })
  );
}

function validBlizzardPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [220311, 555, 'fixed-circle', 4, 3450],
    [220311, 750, 'fixed-circle', 4, 3450],
    [220312, 950, 'fixed-circle', 4, 3900],
    [220313, 1150, 'fixed-circle', 4, 3450],
    [220313, 1550, 'fixed-circle', 4, 3450],
    [220302, 1600, 'target-circle', 3, 3900],
    [220314, 1750, 'fixed-circle', 4, 3900],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 6100 &&
    area.radiusYards === 7 &&
    area.heightYards === 4 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.shape === row[2] &&
        contact.radiusYards === 7 &&
        contact.heightYards === row[3] &&
        contact.damageCoefficient === row[4] &&
        (contact.shape !== 'fixed-circle' ||
          (contact.x === area.x && contact.y === area.y && contact.z === area.z))
      );
    })
  );
}

function validMagicShieldPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [250301, 450, 4.5, 4, 3_000],
    [250302, 850, 5.5, 4, 4_000],
    [250303, 1_050, 6.5, 4, 4_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === row[2] &&
        contact.heightYards === row[3] &&
        contact.damageCoefficient === row[4]
      );
    })
  );
}

function validChainLightningPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expectedOffsets = [979, 1110, 1250, 1390, 1530, 1670, 1800] as const;
  const expectedCoefficients = [35200, 33000, 30800, 28600, 26400, 24200, 22000] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length >= 1 &&
    event.contacts.length <= 7 &&
    event.contacts.every((contact, index) => {
      if (contact.shape !== 'chain') return false;
      const previous = event.contacts[index - 1];
      return (
        contact.attackId === 230301 &&
        contact.offsetMs === expectedOffsets[index] &&
        contact.damageCoefficient === expectedCoefficients[index] &&
        contact.jumpRadiusYards === 11 &&
        contact.heightYards === 8 &&
        contact.toEntityId > 0 &&
        contact.fromEntityId > 0 &&
        (index === 0
          ? contact.fromEntityId === event.sourceId && contact.toEntityId === event.targetId
          : previous?.shape === 'chain' && contact.fromEntityId === previous.toEntityId)
      );
    })
  );
}

function validFlameStrikePresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [220102, 446, 8_000],
    [220103, 746, 15_000],
    [220103, 1_076, 15_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 7.5 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validFrozenBlockPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [220201, 20, 2_200],
    [220202, 3_000, 9_900],
    [220203, 3_400, 9_900],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 7 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validSunbeamSwordPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [310101, 380, 5_000],
    [310102, 550, 5_000],
    [310102, 750, 5_000],
    [310103, 950, 5_000],
    [310103, 1_150, 5_000],
    [310104, 1_350, 5_000],
    [310104, 1_550, 5_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.reachYards === 8 &&
        contact.widthYards === 5 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validPiercingBladesPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [310302, 720],
    [310302, 850],
    [310302, 980],
    [310303, 1_120],
    [310303, 1_250],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.reachYards === 12 &&
        contact.widthYards === 5 &&
        contact.damageCoefficient === 10_000
      );
    })
  );
}

function validSoaringSlashPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [320301, 350, 12_000],
    [320301, 500, 12_000],
    [320301, 650, 12_000],
    [320302, 800, 14_000],
    [320302, 950, 14_000],
    [320302, 1_100, 14_000],
    [320303, 1_250, 14_000],
    [320303, 1_450, 14_000],
    [320303, 1_650, 14_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.reachYards === 12 &&
        contact.widthYards === 4 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validHealPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [350301, 20],
    [350302, 590],
    [350303, 840],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 30 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === 0
      );
    })
  );
}

function validGreaterHealPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [350401, 20],
    [350402, 740],
    [350403, 900],
    [350404, 1_050],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 30 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === 0
      );
    })
  );
}

function validGuardianCirclePresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [350101, 20, 15, 0],
    [350102, 400, 6, 6_000],
    [350103, 550, 15, 0],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === row[2] &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[3]
      );
    })
  );
}

function validExpulsionCirclePresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'circle' &&
    contact.attackId === 340401 &&
    contact.offsetMs === 564 &&
    contact.centerOffsetYards === 0 &&
    contact.radiusYards === 15 &&
    contact.heightYards === 4 &&
    contact.damageCoefficient === 0
  );
}

function validMindsEyePresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'circle' &&
    contact.attackId === 411101 &&
    contact.offsetMs === 564 &&
    contact.centerOffsetYards === 0 &&
    contact.radiusYards === 15 &&
    contact.heightYards === 4 &&
    contact.damageCoefficient === 0
  );
}

function validCloakingPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 20 &&
    area.expiresOffsetMs === 1_020 &&
    area.radiusYards === 3.5 &&
    area.heightYards === 5 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === 1 &&
    contact?.shape === 'fixed-circle' &&
    contact.attackId === 411211 &&
    contact.offsetMs === 720 &&
    contact.x === area.x &&
    contact.y === area.y &&
    contact.z === area.z &&
    contact.radiusYards === 3.5 &&
    contact.heightYards === 5 &&
    contact.damageCoefficient === 9_000
  );
}

function validTaiChiPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [320101, 20, 15, 5_000],
    [320102, 490, 10, 5_000],
    [320103, 690, 10, 5_000],
    [320104, 850, 10, 5_000],
    [320105, 1_000, 10, 6_000],
    [320106, 1_340, 10, 6_000],
    [320107, 1_440, 10, 0],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === row[2] &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[3]
      );
    })
  );
}

function validQuickShotPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [410101, 113, 0],
    [410101, 213, 3_300],
    [410102, 313, 0],
    [410102, 413, 3_300],
    [410103, 519, 0],
    [410103, 619, 3_300],
    [410104, 719, 0],
    [410104, 819, 3_300],
    [410105, 913, 0],
    [410105, 1_013, 4_400],
    [410106, 1_116, 0],
    [410106, 1_216, 4_400],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'target-circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.radiusYards === 4 &&
        contact.heightYards === 8 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validIllusionArrowPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [410201, 20, 4_000],
    [410202, 400, 5_000],
    [410203, 600, 5_000],
    [410204, 800, 5_000],
    [410205, 1_000, 5_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 10 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validBurstShellPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [410311, 1_450, 4_500],
    [410311, 1_500, 4_500],
    [410312, 1_600, 5_500],
    [410313, 1_700, 4_500],
    [410313, 1_750, 4_500],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 600 &&
    area.expiresOffsetMs === 3_600 &&
    area.radiusYards === 8 &&
    area.heightYards === 4 &&
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.z) &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'fixed-circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.x === area.x &&
        contact.y === area.y &&
        contact.z === area.z &&
        contact.radiusYards === 8 &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validFlashArrowPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [410711, 750, 'fixed-circle', 0],
    [410702, 790, 'target-circle', 19_000],
    [410712, 1_150, 'fixed-circle', 0],
    [410713, 1_550, 'fixed-circle', 0],
    [410714, 1_950, 'fixed-circle', 0],
    [410715, 2_350, 'fixed-circle', 0],
    [410716, 2_750, 'fixed-circle', 0],
  ] as const;
  return (
    event.projectiles?.length === 1 &&
    event.projectiles[0]?.attackId === 410701 &&
    event.projectiles[0]?.launchOffsetMs === 450 &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 450 &&
    area.expiresOffsetMs === 6_450 &&
    area.radiusYards === 6 &&
    area.heightYards === 3 &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      if (!row || contact.attackId !== row[0] || contact.offsetMs !== row[1]) return false;
      if (contact.shape !== row[2] || contact.damageCoefficient !== row[3]) return false;
      if (contact.shape === 'fixed-circle') {
        return (
          contact.x === area.x &&
          contact.y === area.y &&
          contact.z === area.z &&
          contact.radiusYards === 6 &&
          contact.heightYards === 3
        );
      }
      return contact.radiusYards === 4.5 && contact.heightYards === 2.5;
    })
  );
}

function validIceCagePresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [410511, 660, 'fixed-circle', 2_000],
    [410511, 860, 'fixed-circle', 2_000],
    [410502, 900, 'target-circle', 4_000],
    [410512, 960, 'fixed-circle', 2_500],
    [410512, 1_160, 'fixed-circle', 2_500],
    [410513, 1_260, 'fixed-circle', 2_500],
    [410513, 1_460, 'fixed-circle', 2_500],
    [410514, 1_560, 'fixed-circle', 5_000],
  ] as const;
  return (
    event.projectiles?.length === 1 &&
    event.projectiles[0]?.attackId === 410501 &&
    event.projectiles[0]?.launchOffsetMs === 560 &&
    event.projectiles[0]?.speedYardsPerSecond === 30 &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 560 &&
    area.expiresOffsetMs === 3_560 &&
    area.radiusYards === 5 &&
    area.heightYards === 3 &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      if (!row || contact.attackId !== row[0] || contact.offsetMs !== row[1]) return false;
      if (contact.shape !== row[2] || contact.damageCoefficient !== row[3]) return false;
      if (contact.shape === 'fixed-circle') {
        return (
          contact.x === area.x &&
          contact.y === area.y &&
          contact.z === area.z &&
          contact.radiusYards === 5 &&
          contact.heightYards === 3
        );
      }
      return contact.radiusYards === 5 && contact.heightYards === 3;
    })
  );
}

function validVenomMistShellPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const projectile = event.projectiles?.[0];
  const expected = [
    [410403, 750, 'target-circle', 5_500],
    [410411, 890, 'fixed-circle', 2_750],
    [410411, 1_290, 'fixed-circle', 2_750],
    [410412, 1_490, 'fixed-circle', 2_750],
    [410412, 1_690, 'fixed-circle', 2_750],
    [410413, 1_890, 'fixed-circle', 2_750],
    [410413, 2_090, 'fixed-circle', 2_750],
    [410414, 2_290, 'fixed-circle', 2_750],
    [410414, 2_490, 'fixed-circle', 2_750],
  ] as const;
  return (
    event.projectiles?.length === 1 &&
    projectile?.attackId === 410401 &&
    projectile.launchOffsetMs === 220 &&
    projectile.movement === 'target-curve' &&
    projectile.speedYardsPerSecond === 12 &&
    projectile.lifetimeMs === 700 &&
    projectile.sourceSocketName === 'Hand_L' &&
    projectile.effectId === 2_040_069 &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 390 &&
    area.expiresOffsetMs === 6_390 &&
    area.radiusYards === 4.5 &&
    area.heightYards === 3 &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      if (!row || contact.attackId !== row[0] || contact.offsetMs !== row[1]) return false;
      if (contact.shape !== row[2] || contact.damageCoefficient !== row[3]) return false;
      if (contact.shape === 'fixed-circle') {
        return (
          contact.x === area.x &&
          contact.y === area.y &&
          contact.z === area.z &&
          contact.radiusYards === 4.5 &&
          contact.heightYards === 3
        );
      }
      return contact.radiusYards === 6 && contact.heightYards === 4;
    })
  );
}

function validHeavenlyBowPresentation(event: Mir4SkillPresentationEvent): boolean {
  const area = event.persistentArea;
  const expected = [
    [410811, 555, 'fixed-circle', 6_600],
    [410812, 700, 'fixed-circle', 3_300],
    [410812, 800, 'fixed-circle', 3_300],
    [410802, 900, 'target-circle', 6_600],
    [410813, 900, 'fixed-circle', 3_300],
    [410813, 1_000, 'fixed-circle', 3_300],
    [410814, 1_100, 'fixed-circle', 3_300],
    [410814, 1_200, 'fixed-circle', 3_300],
  ] as const;
  return (
    event.projectiles === undefined &&
    area?.shape === 'fixed-circle' &&
    area.spawnOffsetMs === 100 &&
    area.expiresOffsetMs === 6_100 &&
    area.radiusYards === 7 &&
    area.heightYards === 4 &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      if (!row || contact.attackId !== row[0] || contact.offsetMs !== row[1]) return false;
      if (contact.shape !== row[2] || contact.damageCoefficient !== row[3]) return false;
      if (contact.shape === 'fixed-circle') {
        return (
          contact.x === area.x &&
          contact.y === area.y &&
          contact.z === area.z &&
          contact.radiusYards === 7 &&
          contact.heightYards === 4
        );
      }
      return contact.radiusYards === 7 && contact.heightYards === 3;
    })
  );
}

function validSeekingBoltPresentation(event: Mir4SkillPresentationEvent): boolean {
  const projectile = event.projectiles?.[0];
  const contact = event.contacts[0];
  return (
    event.projectiles?.length === 1 &&
    projectile?.attackId === 411001 &&
    projectile.launchOffsetMs === 1_000 &&
    projectile.movement === 'target-homing' &&
    projectile.speedYardsPerSecond === 48 &&
    projectile.lifetimeMs === 2_000 &&
    projectile.sourceSocketName === 'Hand_R' &&
    projectile.effectId === 2_040_070 &&
    projectile.effectScale === 1 &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'target-circle' &&
    contact.attackId === 411002 &&
    contact.offsetMs === 1_250 &&
    contact.radiusYards === 0 &&
    contact.heightYards === 8 &&
    contact.damageCoefficient === 42_000
  );
}

function validPainstrikeGalePresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'direct' &&
    contact.attackId === 410602 &&
    contact.offsetMs === 450 &&
    contact.reachYards === 6 &&
    contact.widthYards === 0 &&
    contact.damageCoefficient === 17_000
  );
}

function validArrowRainPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [411302, 539, 21, 55],
    [411303, 913, 22, 65],
    [411304, 1_283, 23, 80],
    [411305, 1_644, 24, 100],
    [411306, 2_010, 25, 120],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'sector' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.radiusYards === row[2] &&
        contact.angleDegrees === row[3] &&
        contact.heightYards === 4 &&
        contact.damageCoefficient === 13_000
      );
    })
  );
}

function validPiercingSpearPresentation(event: Mir4SkillPresentationEvent): boolean {
  const [near, far] = event.contacts;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 2 &&
    near?.shape === 'direct' &&
    near.attackId === 520502 &&
    near.offsetMs === 380 &&
    near.minReachYards === undefined &&
    near.reachYards === 20 &&
    near.widthYards === 4 &&
    near.damageCoefficient === 21_000 &&
    far?.shape === 'direct' &&
    far.attackId === 520503 &&
    far.offsetMs === 400 &&
    far.minReachYards === 15 &&
    far.reachYards === 20 &&
    far.widthYards === 4 &&
    far.damageCoefficient === 21_000
  );
}

function validRavagingBlowPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [520101, 480, 7, 10_000],
    [520101, 690, 7, 10_000],
    [520101, 880, 7, 10_000],
    [520102, 1_000, 7, 9_000],
    [520102, 1_150, 7, 9_000],
    [520103, 1_300, 7.5, 9_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.minReachYards === undefined &&
        contact.reachYards === row[2] &&
        contact.widthYards === 5 &&
        contact.damageCoefficient === row[3]
      );
    })
  );
}

function validCrescentBladePresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [510101, 400, 13_000],
    [510102, 1_120, 6_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'sector' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === -1 &&
        contact.radiusYards === 7 &&
        contact.angleDegrees === 160 &&
        contact.heightYards === 5 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validDragonTailPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [510202, 400, 7, 16_000],
    [510203, 790, 7, 16_000],
    [510204, 890, 12, 4_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'sector' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === -1 &&
        contact.radiusYards === row[2] &&
        contact.angleDegrees === 160 &&
        contact.heightYards === 5 &&
        contact.damageCoefficient === row[3]
      );
    })
  );
}

function validAscendingDragonPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [510302, 580, 9_000],
    [510303, 960, 9_000],
    [510304, 1_240, 10_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 4 &&
        contact.radiusYards === 6 &&
        contact.heightYards === 5 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validNirvanaKickPresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'direct' &&
    contact.attackId === 510402 &&
    contact.offsetMs === 600 &&
    contact.minReachYards === undefined &&
    contact.reachYards === 4.5 &&
    contact.widthYards === 5 &&
    contact.damageCoefficient === 16_000
  );
}

function validDoubleStrikePresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [530101, 400, 9_000],
    [530102, 1_040, 8_000],
    [530103, 1_200, 8_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.minReachYards === undefined &&
        contact.reachYards === 7 &&
        contact.widthYards === 5 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validSweepingStormPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [540101, 20, 12, 4_000],
    [540102, 240, 5.5, 4_000],
    [540103, 400, 5.5, 4_000],
    [540104, 510, 5.5, 5_000],
    [540105, 660, 5.5, 6_000],
    [540106, 840, 5.5, 6_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === row[2] &&
        contact.heightYards === 5 &&
        contact.damageCoefficient === row[3]
      );
    })
  );
}

function validWindWallPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [540301, 20, 5_000],
    [540303, 300, 5_000],
    [540303, 400, 5_000],
    [540304, 510, 6_000],
    [540305, 620, 6_000],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'direct' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.minReachYards === undefined &&
        contact.reachYards === 10 &&
        contact.widthYards === 5 &&
        contact.damageCoefficient === row[2]
      );
    })
  );
}

function validCrushingBlowPresentation(event: Mir4SkillPresentationEvent): boolean {
  const expected = [
    [530302, 400],
    [530302, 550],
    [530302, 700],
    [530303, 890],
  ] as const;
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === expected.length &&
    event.contacts.every((contact, index) => {
      const row = expected[index];
      return (
        row !== undefined &&
        contact.shape === 'circle' &&
        contact.attackId === row[0] &&
        contact.offsetMs === row[1] &&
        contact.centerOffsetYards === 0 &&
        contact.radiusYards === 5 &&
        contact.heightYards === 5 &&
        contact.damageCoefficient === 6_000
      );
    })
  );
}

function validAbsorptionPresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'target-circle' &&
    contact.attackId === 530401 &&
    contact.offsetMs === 950 &&
    contact.radiusYards === 8 &&
    contact.heightYards === 5 &&
    contact.damageCoefficient === 11_000
  );
}

function validBlitzStrikePresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'direct' &&
    contact.attackId === 520202 &&
    contact.offsetMs === 600 &&
    contact.minReachYards === undefined &&
    contact.reachYards === 6.5 &&
    contact.widthYards === 4 &&
    contact.damageCoefficient === 28_000
  );
}

function validDragonSpearPresentation(event: Mir4SkillPresentationEvent): boolean {
  const contact = event.contacts[0];
  return (
    event.projectiles === undefined &&
    event.persistentArea === undefined &&
    event.contacts.length === 1 &&
    contact?.shape === 'direct' &&
    contact.attackId === 520302 &&
    contact.offsetMs === 1_320 &&
    contact.minReachYards === undefined &&
    contact.reachYards === 17 &&
    contact.widthYards === 4.5 &&
    contact.damageCoefficient === 70_000
  );
}

function validEvent(event: Mir4SkillPresentationEvent): boolean {
  if (event.profile === 'lancer-crescent-blade') {
    return (
      event.skillId === 5101 &&
      event.ability === 'mir4_skill_5101' &&
      event.durationMs === 1_967 &&
      event.endCutMs === 1_560 &&
      event.animationAssetPath === CRESCENT_BLADE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, CRESCENT_BLADE_VFX) &&
      validCrescentBladePresentation(event)
    );
  }
  if (event.profile === 'lancer-dragon-tail') {
    return (
      event.skillId === 5102 &&
      event.ability === 'mir4_skill_5102' &&
      event.durationMs === 1_667 &&
      event.endCutMs === 1_600 &&
      event.animationAssetPath === DRAGON_TAIL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DRAGON_TAIL_VFX) &&
      validDragonTailPresentation(event)
    );
  }
  if (event.profile === 'lancer-ascending-dragon') {
    return (
      event.skillId === 5103 &&
      event.ability === 'mir4_skill_5103' &&
      event.durationMs === 2_000 &&
      event.endCutMs === 1_800 &&
      event.animationAssetPath === ASCENDING_DRAGON_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, ASCENDING_DRAGON_VFX) &&
      validAscendingDragonPresentation(event)
    );
  }
  if (event.profile === 'lancer-nirvana-kick') {
    return (
      event.skillId === 5104 &&
      event.ability === 'mir4_skill_5104' &&
      event.durationMs === 1_233 &&
      event.endCutMs === 1_000 &&
      event.animationAssetPath === NIRVANA_KICK_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, NIRVANA_KICK_VFX) &&
      validNirvanaKickPresentation(event)
    );
  }
  if (event.profile === 'lancer-double-strike') {
    return (
      event.skillId === 5301 &&
      event.ability === 'mir4_skill_5301' &&
      event.durationMs === 1_900 &&
      event.endCutMs === 1_700 &&
      event.animationAssetPath === DOUBLE_STRIKE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DOUBLE_STRIKE_VFX) &&
      validDoubleStrikePresentation(event)
    );
  }
  if (event.profile === 'lancer-crushing-blow') {
    return (
      event.skillId === 5303 &&
      event.ability === 'mir4_skill_5303' &&
      event.durationMs === 1_767 &&
      event.endCutMs === 1_600 &&
      event.animationAssetPath === CRUSHING_BLOW_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, CRUSHING_BLOW_VFX) &&
      validCrushingBlowPresentation(event)
    );
  }
  if (event.profile === 'lancer-sweeping-storm') {
    return (
      event.skillId === 5401 &&
      event.ability === 'mir4_skill_5401' &&
      event.durationMs === 1_067 &&
      event.endCutMs === 980 &&
      event.animationAssetPath === SWEEPING_STORM_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, SWEEPING_STORM_VFX) &&
      validSweepingStormPresentation(event)
    );
  }
  if (event.profile === 'lancer-wind-wall') {
    return (
      event.skillId === 5403 &&
      event.ability === 'mir4_skill_5403' &&
      event.durationMs === 800 &&
      event.endCutMs === 720 &&
      event.animationAssetPath === WIND_WALL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, WIND_WALL_VFX) &&
      validWindWallPresentation(event)
    );
  }
  if (event.profile === 'lancer-ravaging-blow') {
    return (
      event.skillId === 5201 &&
      event.ability === 'mir4_skill_5201' &&
      event.durationMs === 1_833 &&
      event.endCutMs === 1_740 &&
      event.animationAssetPath === RAVAGING_BLOW_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, RAVAGING_BLOW_VFX) &&
      validRavagingBlowPresentation(event)
    );
  }
  if (event.profile === 'lancer-blitz-strike') {
    return (
      event.skillId === 5202 &&
      event.ability === 'mir4_skill_5202' &&
      event.durationMs === 1_200 &&
      event.endCutMs === 1_080 &&
      event.animationAssetPath === BLITZ_STRIKE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, BLITZ_STRIKE_VFX) &&
      validBlitzStrikePresentation(event)
    );
  }
  if (event.profile === 'lancer-dragon-spear') {
    return (
      event.skillId === 5203 &&
      event.ability === 'mir4_ultimate_5' &&
      event.durationMs === 2_405 &&
      event.endCutMs === 1_910 &&
      event.animationAssetPath === DRAGON_SPEAR_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DRAGON_SPEAR_VFX) &&
      validDragonSpearPresentation(event)
    );
  }
  if (event.profile === 'lancer-absorption') {
    return (
      event.skillId === 5304 &&
      event.ability === 'mir4_skill_5304' &&
      event.durationMs === 1_260 &&
      event.endCutMs === 1_100 &&
      event.animationAssetPath === ABSORPTION_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, ABSORPTION_VFX) &&
      validAbsorptionPresentation(event)
    );
  }
  if (event.profile === 'lancer-piercing-spear') {
    return (
      event.skillId === 5205 &&
      event.ability === 'mir4_skill_5205' &&
      event.durationMs === 1_440 &&
      event.endCutMs === 1_400 &&
      event.animationAssetPath === PIERCING_SPEAR_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, PIERCING_SPEAR_VFX) &&
      validPiercingSpearPresentation(event)
    );
  }
  if (event.profile === 'arbalist-obliterate-shell') {
    return validObliterateShellPresentation(event);
  }
  if (event.profile === 'warrior-overdrive') {
    return (
      event.skillId === 1101 &&
      event.ability === 'mir4_skill_1101' &&
      event.durationMs === 1367 &&
      event.endCutMs === 1220 &&
      event.animationAssetPath === OVERDRIVE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, OVERDRIVE_VFX) &&
      validOverDriveContacts(event.contacts)
    );
  }
  if (event.profile === 'warrior-air-slash') {
    return (
      event.skillId === 1102 &&
      event.ability === 'mir4_skill_1102' &&
      event.durationMs === 1500 &&
      event.endCutMs === 1300 &&
      event.animationAssetPath === AIR_SLASH_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, AIR_SLASH_VFX) &&
      validAirSlashContacts(event.contacts)
    );
  }
  if (event.profile === 'warrior-dragon-flame') {
    return (
      event.skillId === 1403 &&
      event.ability === 'mir4_ultimate_1' &&
      event.durationMs === 3433 &&
      event.endCutMs === 2950 &&
      event.animationAssetPath === DRAGON_FLAME_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DRAGON_FLAME_VFX) &&
      validDragonFlameContacts(event.contacts)
    );
  }
  if (event.profile === 'taoist-light-ray') {
    return (
      event.skillId === 3303 &&
      event.ability === 'mir4_ultimate_3' &&
      event.durationMs === 4000 &&
      event.endCutMs === 3100 &&
      event.animationAssetPath === LIGHT_RAY_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, LIGHT_RAY_VFX) &&
      validLightRayContacts(event.contacts)
    );
  }
  if (event.profile === 'warrior-iron-shackle')
    return (
      event.profile === 'warrior-iron-shackle' &&
      event.skillId === 1201 &&
      event.ability === 'mir4_skill_1201' &&
      event.durationMs === 2833 &&
      event.endCutMs === 2300 &&
      event.animationAssetPath === IRON_SHACKLE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, IRON_SHACKLE_VFX) &&
      validIronShackleContacts(event.contacts)
    );
  if (event.profile === 'sorcerer-frost-orb') {
    return (
      event.skillId === 2111 &&
      event.ability === 'mir4_skill_2111' &&
      event.durationMs === 1330 &&
      event.endCutMs === 1100 &&
      event.animationAssetPath === FROST_ORB_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, FROST_ORB_VFX) &&
      validFrostOrbPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-flame-orb') {
    return (
      event.skillId === 2101 &&
      event.ability === 'mir4_skill_2101' &&
      event.durationMs === 1267 &&
      event.endCutMs === 1100 &&
      event.animationAssetPath === FLAME_ORB_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, FLAME_ORB_VFX) &&
      validFlameOrbPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-dark-vortex') {
    return (
      event.skillId === 2501 &&
      event.ability === 'mir4_skill_2501' &&
      event.durationMs === 6_100 &&
      event.endCutMs === 1_010 &&
      event.animationAssetPath === DARK_VORTEX_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DARK_VORTEX_VFX) &&
      validDarkVortexPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-dragon-tornado') {
    return (
      event.skillId === 2403 &&
      event.ability === 'mir4_ultimate_2' &&
      event.durationMs === 6100 &&
      event.endCutMs === 2760 &&
      event.animationAssetPath === DARK_VORTEX_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, DARK_VORTEX_VFX) &&
      validDragonTornadoPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-thunderstorm') {
    return (
      event.skillId === 2301 &&
      event.ability === 'mir4_skill_2301' &&
      event.durationMs === 4_100 &&
      event.endCutMs === 1_300 &&
      event.animationAssetPath === THUNDERSTORM_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, THUNDERSTORM_VFX) &&
      validThunderstormPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-blizzard') {
    return (
      event.skillId === 2203 &&
      event.ability === 'mir4_skill_2203' &&
      event.durationMs === 6100 &&
      event.endCutMs === 1600 &&
      event.animationAssetPath === BLIZZARD_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, BLIZZARD_VFX) &&
      validBlizzardPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-magic-shield') {
    return (
      event.skillId === 2503 &&
      event.ability === 'mir4_skill_2503' &&
      event.durationMs === 1_267 &&
      event.endCutMs === 1_010 &&
      event.animationAssetPath === MAGIC_SHIELD_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, MAGIC_SHIELD_VFX) &&
      validMagicShieldPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-chain-lightning') {
    return (
      event.skillId === 2303 &&
      event.ability === 'mir4_skill_2303' &&
      event.durationMs === 2_100 &&
      event.endCutMs === 1_890 &&
      event.animationAssetPath === CHAIN_LIGHTNING_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, CHAIN_LIGHTNING_VFX) &&
      validChainLightningPresentation(event)
    );
  }
  if (event.profile === 'sorcerer-flame-strike') {
    return (
      event.skillId === 2201 &&
      event.ability === 'mir4_skill_2201' &&
      event.durationMs === 1_767 &&
      event.endCutMs === 1_400 &&
      event.animationAssetPath === FLAME_STRIKE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, FLAME_STRIKE_VFX) &&
      validFlameStrikePresentation(event)
    );
  }
  if (event.profile === 'sorcerer-frozen-block') {
    return (
      event.skillId === 2202 &&
      event.ability === 'mir4_skill_2202' &&
      event.durationMs === 4_000 &&
      event.endCutMs === 3_600 &&
      event.animationAssetPath === FROZEN_BLOCK_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, FROZEN_BLOCK_VFX) &&
      validFrozenBlockPresentation(event)
    );
  }
  if (event.profile === 'taoist-moonlight-wave') {
    return (
      event.skillId === 3506 &&
      event.ability === 'mir4_skill_3506' &&
      event.durationMs === 4200 &&
      event.endCutMs === 2280 &&
      event.animationAssetPath === MOONLIGHT_WAVE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, MOONLIGHT_WAVE_VFX) &&
      validMoonlightWavePresentation(event)
    );
  }
  if (event.profile === 'taoist-moonlight-orb') {
    return (
      event.skillId === 3301 &&
      event.ability === 'mir4_skill_3301' &&
      event.durationMs === 6567 &&
      event.endCutMs === 1300 &&
      event.animationAssetPath === MOONLIGHT_ORB_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, MOONLIGHT_ORB_VFX) &&
      validMoonlightOrbPresentation(event)
    );
  }
  if (event.profile === 'taoist-rain-of-blades') {
    return (
      event.skillId === 3104 &&
      event.ability === 'mir4_skill_3104' &&
      event.durationMs === 4_100 &&
      event.endCutMs === 1_150 &&
      event.animationAssetPath === RAIN_OF_BLADES_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, RAIN_OF_BLADES_VFX) &&
      validRainOfBladesPresentation(event)
    );
  }
  if (event.profile === 'taoist-sunbeam-sword') {
    return (
      event.skillId === 3101 &&
      event.ability === 'mir4_skill_3101' &&
      event.durationMs === 1833 &&
      event.endCutMs === 1600 &&
      event.animationAssetPath === SUNBEAM_SWORD_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, SUNBEAM_SWORD_VFX) &&
      validSunbeamSwordPresentation(event)
    );
  }
  if (event.profile === 'taoist-piercing-blades') {
    return (
      event.skillId === 3103 &&
      event.ability === 'mir4_skill_3103' &&
      event.durationMs === 1_767 &&
      event.endCutMs === 1_650 &&
      event.animationAssetPath === PIERCING_BLADES_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, PIERCING_BLADES_VFX) &&
      validPiercingBladesPresentation(event)
    );
  }
  if (event.profile === 'taoist-soaring-slash') {
    return (
      event.skillId === 3203 &&
      event.ability === 'mir4_skill_3203' &&
      event.durationMs === 1_700 &&
      event.endCutMs === 1_550 &&
      event.animationAssetPath === SOARING_SLASH_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, SOARING_SLASH_VFX) &&
      validSoaringSlashPresentation(event)
    );
  }
  if (event.profile === 'taoist-heal') {
    return (
      event.skillId === 3503 &&
      event.ability === 'mir4_skill_3503' &&
      event.durationMs === 1_400 &&
      event.endCutMs === 1_350 &&
      event.animationAssetPath === HEAL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, HEAL_VFX) &&
      validHealPresentation(event)
    );
  }
  if (event.profile === 'taoist-greater-heal') {
    return (
      event.skillId === 3504 &&
      event.ability === 'mir4_skill_3504' &&
      event.durationMs === 1_640 &&
      event.endCutMs === 1_500 &&
      event.animationAssetPath === GREATER_HEAL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, GREATER_HEAL_VFX) &&
      validGreaterHealPresentation(event)
    );
  }
  if (event.profile === 'taoist-guardian-circle') {
    return (
      event.skillId === 3501 &&
      event.ability === 'mir4_skill_3501' &&
      event.durationMs === 1_000 &&
      event.endCutMs === 950 &&
      event.animationAssetPath === GUARDIAN_CIRCLE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, GUARDIAN_CIRCLE_VFX) &&
      validGuardianCirclePresentation(event)
    );
  }
  if (event.profile === 'taoist-expulsion-circle') {
    return (
      event.skillId === 3404 &&
      event.ability === 'mir4_skill_3404' &&
      event.durationMs === 1_000 &&
      event.endCutMs === 950 &&
      event.animationAssetPath === EXPULSION_CIRCLE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, EXPULSION_CIRCLE_VFX) &&
      validExpulsionCirclePresentation(event)
    );
  }
  if (event.profile === 'taoist-tai-chi') {
    return (
      event.skillId === 3201 &&
      event.ability === 'mir4_skill_3201' &&
      event.durationMs === 2_067 &&
      event.endCutMs === 1_850 &&
      event.animationAssetPath === TAI_CHI_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, TAI_CHI_VFX) &&
      validTaiChiPresentation(event)
    );
  }
  if (event.profile === 'taoist-blasting-charm') {
    return (
      event.skillId === 3505 &&
      event.ability === 'mir4_skill_3505' &&
      event.durationMs === 1_533 &&
      event.endCutMs === 1_350 &&
      event.animationAssetPath === BLASTING_CHARM_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, BLASTING_CHARM_VFX) &&
      validBlastingCharmPresentation(event)
    );
  }
  if (event.profile === 'arbalist-quick-shot') {
    return (
      event.skillId === 4101 &&
      event.ability === 'mir4_skill_4101' &&
      event.durationMs === 1_500 &&
      event.endCutMs === 1_350 &&
      event.animationAssetPath === QUICK_SHOT_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, QUICK_SHOT_VFX) &&
      validQuickShotPresentation(event)
    );
  }
  if (event.profile === 'arbalist-illusion-arrow') {
    return (
      event.skillId === 4102 &&
      event.ability === 'mir4_skill_4102' &&
      event.durationMs === 1_467 &&
      event.endCutMs === 1_320 &&
      event.animationAssetPath === ILLUSION_ARROW_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, ILLUSION_ARROW_VFX) &&
      validIllusionArrowPresentation(event)
    );
  }
  if (event.profile === 'arbalist-burst-shell') {
    return (
      event.skillId === 4103 &&
      event.ability === 'mir4_skill_4103' &&
      event.durationMs === 3_600 &&
      event.endCutMs === 880 &&
      event.animationAssetPath === BURST_SHELL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, BURST_SHELL_VFX) &&
      validBurstShellPresentation(event)
    );
  }
  if (event.profile === 'arbalist-venom-mist-shell') {
    return (
      event.skillId === 4104 &&
      event.ability === 'mir4_skill_4104' &&
      event.durationMs === 6_390 &&
      event.endCutMs === 1_140 &&
      event.animationAssetPath === VENOM_MIST_SHELL_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, VENOM_MIST_SHELL_VFX) &&
      validVenomMistShellPresentation(event)
    );
  }
  if (event.profile === 'arbalist-ice-cage') {
    return (
      event.skillId === 4105 &&
      event.ability === 'mir4_skill_4105' &&
      event.durationMs === 3_560 &&
      event.endCutMs === 900 &&
      event.animationAssetPath === ICE_CAGE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, ICE_CAGE_VFX) &&
      validIceCagePresentation(event)
    );
  }
  if (event.profile === 'arbalist-flash-arrow') {
    return (
      event.skillId === 4107 &&
      event.ability === 'mir4_skill_4107' &&
      event.durationMs === 6_450 &&
      event.endCutMs === 900 &&
      event.animationAssetPath === FLASH_ARROW_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, FLASH_ARROW_VFX) &&
      validFlashArrowPresentation(event)
    );
  }
  if (event.profile === 'arbalist-heavenly-bow') {
    return (
      event.skillId === 4108 &&
      event.ability === 'mir4_skill_4108' &&
      event.durationMs === 6_100 &&
      event.endCutMs === 1_020 &&
      event.animationAssetPath === HEAVENLY_BOW_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, HEAVENLY_BOW_VFX) &&
      validHeavenlyBowPresentation(event)
    );
  }
  if (event.profile === 'arbalist-seeking-bolt') {
    return (
      event.skillId === 4110 &&
      event.ability === 'mir4_skill_4110' &&
      event.durationMs === 1_900 &&
      event.endCutMs === 1_710 &&
      event.animationAssetPath === SEEKING_BOLT_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, SEEKING_BOLT_VFX) &&
      validSeekingBoltPresentation(event)
    );
  }
  if (event.profile === 'arbalist-minds-eye') {
    return (
      event.skillId === 4111 &&
      event.ability === 'mir4_skill_4111' &&
      event.durationMs === 1_000 &&
      event.endCutMs === 850 &&
      event.animationAssetPath === MINDS_EYE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, MINDS_EYE_VFX) &&
      validMindsEyePresentation(event)
    );
  }
  if (event.profile === 'arbalist-cloaking') {
    return (
      event.skillId === 4112 &&
      event.ability === 'mir4_skill_4112' &&
      event.durationMs === 1_020 &&
      event.endCutMs === 560 &&
      event.animationAssetPath === CLOAKING_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, CLOAKING_VFX) &&
      validCloakingPresentation(event)
    );
  }
  if (event.profile === 'arbalist-painstrike-gale') {
    return (
      event.skillId === 4106 &&
      event.ability === 'mir4_skill_4106' &&
      event.durationMs === 1_000 &&
      event.endCutMs === 900 &&
      event.animationAssetPath === PAINSTRIKE_GALE_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, PAINSTRIKE_GALE_VFX) &&
      validPainstrikeGalePresentation(event)
    );
  }
  if (event.profile === 'arbalist-arrow-rain') {
    return (
      event.skillId === 4113 &&
      event.ability === 'mir4_ultimate_4' &&
      event.durationMs === 2_933 &&
      event.endCutMs === 2_560 &&
      event.animationAssetPath === ARROW_RAIN_ANIMATION &&
      hasExactAssetPaths(event.vfxAssetPaths, ARROW_RAIN_VFX) &&
      validArrowRainPresentation(event)
    );
  }
  return false;
}

/** Pooled host-neutral scheduler for a compiler-approved native presentation. */
export class Mir4NativeSkillPresentationPainter {
  private readonly slots: Mir4NativeSkillPresentationSlot[];
  private readonly sourcePose: Mir4NativePresentationSourcePose = {
    x: 0,
    y: 0,
    z: 0,
    facing: 0,
  };
  private readonly targetPose: Mir4NativePresentationSourcePose = {
    x: 0,
    y: 0,
    z: 0,
    facing: 0,
  };
  private nextSlot = 0;

  constructor(
    private readonly deps: Mir4NativeSkillPresentationDeps,
    capacity = 8,
  ) {
    this.slots = Array.from({ length: Math.max(1, capacity) }, () => ({
      event: null,
      elapsedMs: 0,
      nextProjectile: 0,
      persistentAreaStarted: false,
      active: false,
    }));
  }

  start(event: Mir4SkillPresentationEvent): boolean {
    if (!validEvent(event)) return false;
    const slot = this.slots[this.nextSlot];
    this.nextSlot = (this.nextSlot + 1) % this.slots.length;
    slot.event = event;
    slot.elapsedMs = 0;
    slot.nextProjectile = 0;
    slot.persistentAreaStarted = false;
    slot.active = true;
    const projectiles = event.projectiles ?? [];
    while (
      slot.nextProjectile < projectiles.length &&
      projectiles[slot.nextProjectile].launchOffsetMs <= 0
    ) {
      const projectileIndex = slot.nextProjectile;
      this.deps.playProjectile?.(event, projectiles[projectileIndex], projectileIndex);
      slot.nextProjectile += 1;
    }
    return true;
  }

  update(
    dtSeconds: number,
    entityPose: (entityId: number, out: Mir4NativePresentationSourcePose) => boolean,
  ): void {
    const deltaMs = Math.max(0, dtSeconds * 1_000);
    for (const slot of this.slots) {
      const event = slot.event;
      if (!slot.active || !event) continue;
      const previousElapsedMs = slot.elapsedMs;
      slot.elapsedMs += deltaMs;
      const projectiles = event.projectiles ?? [];
      while (
        slot.nextProjectile < projectiles.length &&
        projectiles[slot.nextProjectile].launchOffsetMs <= slot.elapsedMs
      ) {
        const projectileIndex = slot.nextProjectile;
        this.deps.playProjectile?.(event, projectiles[projectileIndex], projectileIndex);
        slot.nextProjectile += 1;
      }
      if (!entityPose(event.sourceId, this.sourcePose)) {
        slot.active = false;
        slot.event = null;
        continue;
      }
      const persistentArea = event.persistentArea;
      if (
        persistentArea &&
        !slot.persistentAreaStarted &&
        persistentArea.spawnOffsetMs <= slot.elapsedMs
      ) {
        this.deps.playPersistentArea?.(event, persistentArea);
        slot.persistentAreaStarted = true;
      }
      const due = mir4NativeSkillPresentationContactRange(
        previousElapsedMs,
        slot.elapsedMs,
        event.contacts,
      );
      const baseDamageCoefficient =
        event.contacts.find((contact) => contact.damageCoefficient > 0)?.damageCoefficient ?? 1;
      for (let index = due.start; index < due.end; index += 1) {
        const contact = event.contacts[index];
        const targetPose =
          (contact.shape === 'target-circle' || contact.shape === 'chain') &&
          entityPose(
            contact.shape === 'chain' ? contact.toEntityId : event.targetId,
            this.targetPose,
          )
            ? this.targetPose
            : undefined;
        if ((contact.shape === 'target-circle' || contact.shape === 'chain') && !targetPose)
          continue;
        this.deps.playContact(
          event,
          contact,
          mir4NativeSkillContactVisual(contact, baseDamageCoefficient, this.sourcePose, targetPose),
          index,
        );
      }
      if (slot.elapsedMs >= event.durationMs) {
        slot.active = false;
        slot.event = null;
      }
    }
  }

  activeCount(): number {
    return this.slots.reduce((count, slot) => count + (slot.active ? 1 : 0), 0);
  }

  clear(): void {
    for (const slot of this.slots) {
      slot.active = false;
      slot.event = null;
      slot.nextProjectile = 0;
      slot.persistentAreaStarted = false;
    }
  }
}
