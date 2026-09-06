import type { Mir4ClassId } from '../content/mir4/classes';
import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { SimEvent } from '../types';
import { mir4NativeSkillAssetPresentationEvidence } from './native_skill_asset_presentation';
import { mir4NativeExpulsionCirclePolicy } from './native_skill_expulsion_circle';
import { mir4NativeGreaterHealPolicy } from './native_skill_greater_heal';
import { mir4NativeGuardianCirclePolicy } from './native_skill_guardian_circle';
import { mir4NativeHealPolicy } from './native_skill_heal';
import { mir4NativeMindsEyePolicy } from './native_skill_minds_eye';
import { mir4NativeTaiChiPolicy } from './native_skill_tai_chi';
import { mir4NativeDistanceToYards } from './native_skill_units';
import { mir4NativeUltimateExecutionPlan } from './native_ultimate_runtime';
import type { Mir4SkillExecutionPlan } from './skill_execution_types';

type Mir4SkillPresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;

const AIR_SLASH_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash';
const OVERDRIVE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive';
const IRON_SHACKLE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain';
const DRAGON_FLAME_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Special';
const DRAGON_TORNADO_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado';
const LIGHT_RAY_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special';
const FROST_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall';
const FLAME_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall';
const DARK_VORTEX_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado';
const THUNDERSTORM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder';
const BLIZZARD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard';
const MAGIC_SHIELD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield';
const CHAIN_LIGHTNING_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning';
const FLAME_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Meteor';
const FROZEN_BLOCK_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Freezing';
const MOONLIGHT_WAVE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave';
const MOONLIGHT_ORB_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb';
const SUNBEAM_SWORD_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SunLight';
const PIERCING_BLADES_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_PiercingAtk';
const RAIN_OF_BLADES_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain';
const HEAL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal';
const GREATER_HEAL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal';
const GUARDIAN_CIRCLE_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MagicBarrier03';
const TAI_CHI_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Taegeuk';
const BLASTING_CHARM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_DarkBurst';
const SOARING_SLASH_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordBlast';
const EXPULSION_CIRCLE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Resist';
const QUICK_SHOT_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl01';
const PAINSTRIKE_GALE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl02';
const ILLUSION_ARROW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl03';
const BURST_SHELL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl04';
const VENOM_MIST_SHELL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl06';
const ICE_CAGE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl05';
const FLASH_ARROW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl07';
const HEAVENLY_BOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl08';
const OBLITERATE_SHELL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl09';
const SEEKING_BOLT_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl10';
const MINDS_EYE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl11';
const CLOAKING_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12';
const ARROW_RAIN_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special';
const CRESCENT_BLADE_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon01';
const DRAGON_TAIL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon02';
const ASCENDING_DRAGON_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon03';
const NIRVANA_KICK_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon04';
const DOUBLE_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear01';
const CRUSHING_BLOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear03';
const SWEEPING_STORM_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_01';
const WIND_WALL_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_Tornado_03';
const RAVAGING_BLOW_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear01';
const BLITZ_STRIKE_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear02';
const DRAGON_SPEAR_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03';
const PIERCING_SPEAR_ANIMATION =
  '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05';
const ABSORPTION_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear04';

function isSorcererTargetOrbProfile(
  profile: Mir4SkillPresentationEvent['profile'],
): profile is 'sorcerer-flame-orb' | 'sorcerer-frost-orb' {
  return profile === 'sorcerer-flame-orb' || profile === 'sorcerer-frost-orb';
}

function isSorcererTargetAreaProfile(
  profile: Mir4SkillPresentationEvent['profile'],
): profile is
  | 'sorcerer-flame-orb'
  | 'sorcerer-frost-orb'
  | 'sorcerer-thunderstorm'
  | 'sorcerer-dark-vortex'
  | 'sorcerer-blizzard'
  | 'taoist-rain-of-blades'
  | 'taoist-moonlight-orb'
  | 'taoist-moonlight-wave'
  | 'arbalist-burst-shell'
  | 'arbalist-venom-mist-shell'
  | 'arbalist-ice-cage'
  | 'arbalist-flash-arrow'
  | 'arbalist-heavenly-bow'
  | 'lancer-absorption' {
  return (
    isSorcererTargetOrbProfile(profile) ||
    profile === 'sorcerer-thunderstorm' ||
    profile === 'sorcerer-dark-vortex' ||
    profile === 'sorcerer-blizzard' ||
    profile === 'taoist-rain-of-blades' ||
    profile === 'taoist-moonlight-orb' ||
    profile === 'taoist-moonlight-wave' ||
    profile === 'arbalist-burst-shell' ||
    profile === 'arbalist-venom-mist-shell' ||
    profile === 'arbalist-ice-cage' ||
    profile === 'arbalist-flash-arrow' ||
    profile === 'arbalist-heavenly-bow' ||
    profile === 'lancer-absorption'
  );
}

function presentationProfile(
  plan: Mir4SkillExecutionPlan,
): Mir4SkillPresentationEvent['profile'] | null {
  if (plan.skillId === 1101 && plan.presentation.animationAssetPath === OVERDRIVE_ANIMATION) {
    return 'warrior-overdrive';
  }
  if (plan.skillId === 1102 && plan.presentation.animationAssetPath === AIR_SLASH_ANIMATION) {
    return 'warrior-air-slash';
  }
  if (plan.skillId === 1201 && plan.presentation.animationAssetPath === IRON_SHACKLE_ANIMATION) {
    return 'warrior-iron-shackle';
  }
  if (plan.skillId === 1403 && plan.presentation.animationAssetPath === DRAGON_FLAME_ANIMATION) {
    return 'warrior-dragon-flame';
  }
  if (plan.skillId === 5101 && plan.presentation.animationAssetPath === CRESCENT_BLADE_ANIMATION) {
    return 'lancer-crescent-blade';
  }
  if (plan.skillId === 5102 && plan.presentation.animationAssetPath === DRAGON_TAIL_ANIMATION) {
    return 'lancer-dragon-tail';
  }
  if (
    plan.skillId === 5103 &&
    plan.presentation.animationAssetPath === ASCENDING_DRAGON_ANIMATION
  ) {
    return 'lancer-ascending-dragon';
  }
  if (plan.skillId === 5104 && plan.presentation.animationAssetPath === NIRVANA_KICK_ANIMATION) {
    return 'lancer-nirvana-kick';
  }
  if (plan.skillId === 5301 && plan.presentation.animationAssetPath === DOUBLE_STRIKE_ANIMATION) {
    return 'lancer-double-strike';
  }
  if (plan.skillId === 5303 && plan.presentation.animationAssetPath === CRUSHING_BLOW_ANIMATION) {
    return 'lancer-crushing-blow';
  }
  if (plan.skillId === 5401 && plan.presentation.animationAssetPath === SWEEPING_STORM_ANIMATION) {
    return 'lancer-sweeping-storm';
  }
  if (plan.skillId === 5403 && plan.presentation.animationAssetPath === WIND_WALL_ANIMATION) {
    return 'lancer-wind-wall';
  }
  if (plan.skillId === 5201 && plan.presentation.animationAssetPath === RAVAGING_BLOW_ANIMATION) {
    return 'lancer-ravaging-blow';
  }
  if (plan.skillId === 5202 && plan.presentation.animationAssetPath === BLITZ_STRIKE_ANIMATION) {
    return 'lancer-blitz-strike';
  }
  if (plan.skillId === 5205 && plan.presentation.animationAssetPath === PIERCING_SPEAR_ANIMATION) {
    return 'lancer-piercing-spear';
  }
  if (plan.skillId === 5304 && plan.presentation.animationAssetPath === ABSORPTION_ANIMATION) {
    return 'lancer-absorption';
  }
  if (plan.skillId === 2101 && plan.presentation.animationAssetPath === FLAME_ORB_ANIMATION) {
    return 'sorcerer-flame-orb';
  }
  if (plan.skillId === 2111 && plan.presentation.animationAssetPath === FROST_ORB_ANIMATION) {
    return 'sorcerer-frost-orb';
  }
  if (plan.skillId === 2301 && plan.presentation.animationAssetPath === THUNDERSTORM_ANIMATION) {
    return 'sorcerer-thunderstorm';
  }
  if (plan.skillId === 2501 && plan.presentation.animationAssetPath === DARK_VORTEX_ANIMATION) {
    return 'sorcerer-dark-vortex';
  }
  if (plan.skillId === 2203 && plan.presentation.animationAssetPath === BLIZZARD_ANIMATION) {
    return 'sorcerer-blizzard';
  }
  if (plan.skillId === 2503 && plan.presentation.animationAssetPath === MAGIC_SHIELD_ANIMATION) {
    return 'sorcerer-magic-shield';
  }
  if (plan.skillId === 2303 && plan.presentation.animationAssetPath === CHAIN_LIGHTNING_ANIMATION) {
    return 'sorcerer-chain-lightning';
  }
  if (plan.skillId === 2201 && plan.presentation.animationAssetPath === FLAME_STRIKE_ANIMATION) {
    return 'sorcerer-flame-strike';
  }
  if (plan.skillId === 2202 && plan.presentation.animationAssetPath === FROZEN_BLOCK_ANIMATION) {
    return 'sorcerer-frozen-block';
  }
  if (plan.skillId === 3506 && plan.presentation.animationAssetPath === MOONLIGHT_WAVE_ANIMATION) {
    return 'taoist-moonlight-wave';
  }
  if (plan.skillId === 3301 && plan.presentation.animationAssetPath === MOONLIGHT_ORB_ANIMATION) {
    return 'taoist-moonlight-orb';
  }
  if (plan.skillId === 3104 && plan.presentation.animationAssetPath === RAIN_OF_BLADES_ANIMATION) {
    return 'taoist-rain-of-blades';
  }
  if (plan.skillId === 3101 && plan.presentation.animationAssetPath === SUNBEAM_SWORD_ANIMATION) {
    return 'taoist-sunbeam-sword';
  }
  if (plan.skillId === 3103 && plan.presentation.animationAssetPath === PIERCING_BLADES_ANIMATION) {
    return 'taoist-piercing-blades';
  }
  if (plan.skillId === 3203 && plan.presentation.animationAssetPath === SOARING_SLASH_ANIMATION) {
    return 'taoist-soaring-slash';
  }
  if (plan.skillId === 3503 && plan.presentation.animationAssetPath === HEAL_ANIMATION) {
    return 'taoist-heal';
  }
  if (plan.skillId === 3504 && plan.presentation.animationAssetPath === GREATER_HEAL_ANIMATION) {
    return 'taoist-greater-heal';
  }
  if (plan.skillId === 3501 && plan.presentation.animationAssetPath === GUARDIAN_CIRCLE_ANIMATION) {
    return 'taoist-guardian-circle';
  }
  if (
    plan.skillId === 3404 &&
    plan.presentation.animationAssetPath === EXPULSION_CIRCLE_ANIMATION
  ) {
    return 'taoist-expulsion-circle';
  }
  if (plan.skillId === 3201 && plan.presentation.animationAssetPath === TAI_CHI_ANIMATION) {
    return 'taoist-tai-chi';
  }
  if (plan.skillId === 3505 && plan.presentation.animationAssetPath === BLASTING_CHARM_ANIMATION) {
    return 'taoist-blasting-charm';
  }
  if (plan.skillId === 4101 && plan.presentation.animationAssetPath === QUICK_SHOT_ANIMATION) {
    return 'arbalist-quick-shot';
  }
  if (plan.skillId === 4102 && plan.presentation.animationAssetPath === ILLUSION_ARROW_ANIMATION) {
    return 'arbalist-illusion-arrow';
  }
  if (plan.skillId === 4103 && plan.presentation.animationAssetPath === BURST_SHELL_ANIMATION) {
    return 'arbalist-burst-shell';
  }
  if (
    plan.skillId === 4104 &&
    plan.presentation.animationAssetPath === VENOM_MIST_SHELL_ANIMATION
  ) {
    return 'arbalist-venom-mist-shell';
  }
  if (plan.skillId === 4105 && plan.presentation.animationAssetPath === ICE_CAGE_ANIMATION) {
    return 'arbalist-ice-cage';
  }
  if (plan.skillId === 4107 && plan.presentation.animationAssetPath === FLASH_ARROW_ANIMATION) {
    return 'arbalist-flash-arrow';
  }
  if (plan.skillId === 4108 && plan.presentation.animationAssetPath === HEAVENLY_BOW_ANIMATION) {
    return 'arbalist-heavenly-bow';
  }
  if (plan.skillId === 4110 && plan.presentation.animationAssetPath === SEEKING_BOLT_ANIMATION) {
    return 'arbalist-seeking-bolt';
  }
  if (
    plan.skillId === 4109 &&
    plan.presentation.animationAssetPath === OBLITERATE_SHELL_ANIMATION
  ) {
    return 'arbalist-obliterate-shell';
  }
  if (plan.skillId === 4111 && plan.presentation.animationAssetPath === MINDS_EYE_ANIMATION) {
    return 'arbalist-minds-eye';
  }
  if (plan.skillId === 4112 && plan.presentation.animationAssetPath === CLOAKING_ANIMATION) {
    return 'arbalist-cloaking';
  }
  if (plan.skillId === 4106 && plan.presentation.animationAssetPath === PAINSTRIKE_GALE_ANIMATION) {
    return 'arbalist-painstrike-gale';
  }
  return null;
}

/**
 * Projects only presentation contracts whose native asset identity and runtime
 * execution plan have both been homologated. Unknown skills remain fail-closed
 * and continue through the existing compatibility presentation.
 */
export function mir4NativeSkillPresentationEvent(
  sourceId: number,
  targetId: number,
  sourceFacing: number,
  plan: Mir4SkillExecutionPlan,
  targetAnchor?: { readonly x: number; readonly y: number; readonly z: number },
  targetSequence?: readonly number[],
  sourceAnchor?: { readonly x: number; readonly y: number; readonly z: number },
): Mir4SkillPresentationEvent | null {
  const animationAssetPath = plan.presentation.animationAssetPath;
  if (!animationAssetPath) return null;
  const profile = presentationProfile(plan);
  if (!profile) return null;
  if (!Number.isFinite(sourceFacing)) return null;
  if (
    (profile === 'sorcerer-thunderstorm' ||
      profile === 'sorcerer-dark-vortex' ||
      profile === 'sorcerer-blizzard' ||
      profile === 'taoist-rain-of-blades' ||
      profile === 'taoist-moonlight-orb' ||
      profile === 'taoist-moonlight-wave' ||
      profile === 'taoist-blasting-charm' ||
      profile === 'arbalist-burst-shell' ||
      profile === 'arbalist-venom-mist-shell' ||
      profile === 'arbalist-ice-cage' ||
      profile === 'arbalist-flash-arrow' ||
      profile === 'arbalist-heavenly-bow') &&
    (!targetAnchor ||
      !Number.isFinite(targetAnchor.x) ||
      !Number.isFinite(targetAnchor.y) ||
      !Number.isFinite(targetAnchor.z))
  ) {
    return null;
  }
  if (
    profile === 'sorcerer-chain-lightning' &&
    (!targetSequence ||
      targetSequence.length < 1 ||
      targetSequence.length > 7 ||
      targetSequence[0] !== targetId ||
      new Set(targetSequence).size !== targetSequence.length)
  ) {
    return null;
  }
  if (
    profile === 'arbalist-cloaking' &&
    (!sourceAnchor ||
      !Number.isFinite(sourceAnchor.x) ||
      !Number.isFinite(sourceAnchor.y) ||
      !Number.isFinite(sourceAnchor.z))
  ) {
    return null;
  }

  const directContacts: Mir4SkillPresentationEvent['contacts'] = [];
  if (profile === 'arbalist-cloaking') {
    const contact = plan.totem?.contacts[0];
    if (
      plan.totem?.spawnAttackId !== 411201 ||
      plan.totem.totemId !== 1402 ||
      plan.totem.contacts.length !== 1 ||
      !contact ||
      !sourceAnchor
    ) {
      return null;
    }
    directContacts.push({
      attackId: contact.attackId,
      offsetMs: contact.offsetMs,
      shape: 'fixed-circle',
      x: sourceAnchor.x,
      y: sourceAnchor.y,
      z: sourceAnchor.z,
      radiusYards: contact.area.radiusMaxYards,
      heightYards: contact.area.heightYards,
      damageCoefficient: contact.coefficient,
    });
  }
  const healPolicy = profile === 'taoist-heal' ? mir4NativeHealPolicy(1) : null;
  if (healPolicy) {
    const expectedRows = [
      [healPolicy.sourceBuffAttackId, healPolicy.sourceBuffApplyAtMs],
      [healPolicy.specialAttackId, healPolicy.specialApplyAtMs],
      [healPolicy.partyBuffAttackId, healPolicy.partyBuffApplyAtMs],
    ] as const;
    for (const [attackId, offsetMs] of expectedRows) {
      if (!plan.rows.some((row) => row.attackId === attackId)) return null;
      directContacts.push({
        attackId,
        offsetMs,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: healPolicy.radiusYards,
        heightYards: healPolicy.heightYards,
        damageCoefficient: 0,
      });
    }
  }
  const greaterHealPolicy =
    profile === 'taoist-greater-heal' ? mir4NativeGreaterHealPolicy(1) : null;
  if (greaterHealPolicy) {
    const expectedRows = [
      [greaterHealPolicy.controlAttackId, greaterHealPolicy.controlApplyAtMs],
      [greaterHealPolicy.healAttackId, greaterHealPolicy.healApplyAtMs],
      [350403, 900],
      [350404, 1_050],
    ] as const;
    for (const [attackId, offsetMs] of expectedRows) {
      if (!plan.rows.some((row) => row.attackId === attackId)) return null;
      directContacts.push({
        attackId,
        offsetMs,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: greaterHealPolicy.radiusYards,
        heightYards: greaterHealPolicy.heightYards,
        damageCoefficient: 0,
      });
    }
  }
  const guardianCirclePolicy =
    profile === 'taoist-guardian-circle' ? mir4NativeGuardianCirclePolicy(1) : null;
  if (guardianCirclePolicy) {
    const expectedRows = [
      [
        guardianCirclePolicy.setupAttackId,
        guardianCirclePolicy.setupApplyAtMs,
        guardianCirclePolicy.partyRadiusYards,
        0,
      ],
      [
        guardianCirclePolicy.damageAttackId,
        guardianCirclePolicy.damageApplyAtMs,
        guardianCirclePolicy.damageRadiusYards,
        guardianCirclePolicy.damageSpellAttackBasisPoints,
      ],
      [
        guardianCirclePolicy.partyBuffAttackId,
        guardianCirclePolicy.partyBuffApplyAtMs,
        guardianCirclePolicy.partyRadiusYards,
        0,
      ],
    ] as const;
    for (const [attackId, offsetMs, radiusYards, damageCoefficient] of expectedRows) {
      if (!plan.rows.some((row) => row.attackId === attackId)) return null;
      directContacts.push({
        attackId,
        offsetMs,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards,
        heightYards: guardianCirclePolicy.damageHeightYards,
        damageCoefficient,
      });
    }
  }
  const expulsionCirclePolicy =
    profile === 'taoist-expulsion-circle' ? mir4NativeExpulsionCirclePolicy(1) : null;
  if (expulsionCirclePolicy) {
    if (!plan.rows.some((row) => row.attackId === expulsionCirclePolicy.partyBuffAttackId)) {
      return null;
    }
    directContacts.push({
      attackId: expulsionCirclePolicy.partyBuffAttackId,
      offsetMs: expulsionCirclePolicy.partyBuffApplyAtMs,
      shape: 'circle',
      centerOffsetYards: 0,
      radiusYards: expulsionCirclePolicy.partyRadiusYards,
      heightYards: expulsionCirclePolicy.partyHeightYards,
      damageCoefficient: 0,
    });
  }
  const mindsEyePolicy = profile === 'arbalist-minds-eye' ? mir4NativeMindsEyePolicy(1) : null;
  if (mindsEyePolicy) {
    if (!plan.rows.some((row) => row.attackId === mindsEyePolicy.attackId)) return null;
    directContacts.push({
      attackId: mindsEyePolicy.attackId,
      offsetMs: mindsEyePolicy.applyAtMs,
      shape: 'circle',
      centerOffsetYards: 0,
      radiusYards: mindsEyePolicy.radiusYards,
      heightYards: mindsEyePolicy.heightYards,
      damageCoefficient: 0,
    });
  }
  const taiChiPolicy = profile === 'taoist-tai-chi' ? mir4NativeTaiChiPolicy(1) : null;
  if (taiChiPolicy) {
    const expectedRows = [
      [320101, 20, 15, 5_000],
      [320102, 490, 10, 5_000],
      [320103, 690, 10, 5_000],
      [320104, 850, 10, 5_000],
      [320105, 1_000, 10, 6_000],
      [320106, 1_340, 10, 6_000],
      [320107, taiChiPolicy.partySpecialApplyAtMs, taiChiPolicy.partyRadiusYards, 0],
    ] as const;
    for (const [attackId, offsetMs, radiusYards, damageCoefficient] of expectedRows) {
      if (!plan.rows.some((row) => row.attackId === attackId)) return null;
      directContacts.push({
        attackId,
        offsetMs,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards,
        heightYards: taiChiPolicy.partyHeightYards,
        damageCoefficient,
      });
    }
  }
  for (const row of healPolicy ||
  greaterHealPolicy ||
  guardianCirclePolicy ||
  expulsionCirclePolicy ||
  mindsEyePolicy ||
  taiChiPolicy ||
  profile === 'arbalist-cloaking'
    ? []
    : plan.rows) {
    for (let contactIndex = 0; contactIndex < row.contacts.length; contactIndex += 1) {
      const contact = row.contacts[contactIndex];
      if (!contact) continue;
      if (
        (profile === 'taoist-rain-of-blades' ||
          profile === 'taoist-soaring-slash' ||
          profile === 'lancer-ascending-dragon' ||
          profile === 'lancer-sweeping-storm' ||
          profile === 'lancer-wind-wall' ||
          profile === 'lancer-ravaging-blow' ||
          profile === 'lancer-piercing-spear') &&
        row.contacts.findIndex(
          (candidate) =>
            candidate.offsetMs === contact.offsetMs &&
            candidate.sourceImpactIndex === contact.sourceImpactIndex,
        ) !== contactIndex
      ) {
        continue;
      }
      const presentationDamageCoefficient =
        profile === 'lancer-crushing-blow'
          ? contact.damage.coefficient / Math.max(1, contact.damage.componentImpactCount)
          : profile === 'taoist-rain-of-blades' ||
              profile === 'taoist-soaring-slash' ||
              profile === 'lancer-ascending-dragon' ||
              profile === 'lancer-sweeping-storm' ||
              profile === 'lancer-wind-wall' ||
              profile === 'lancer-ravaging-blow' ||
              profile === 'lancer-piercing-spear'
            ? row.contacts
                .filter(
                  (candidate) =>
                    candidate.offsetMs === contact.offsetMs &&
                    candidate.sourceImpactIndex === contact.sourceImpactIndex,
                )
                .reduce((total, candidate) => total + candidate.damage.coefficient, 0)
            : contact.damage.coefficient;
      if (profile === 'sorcerer-chain-lightning') {
        if (contact.sourceImpactIndex >= (targetSequence?.length ?? 0)) continue;
        directContacts.push({
          attackId: row.attackId,
          offsetMs: contact.offsetMs,
          shape: 'chain',
          fromEntityId:
            contact.sourceImpactIndex === 0
              ? sourceId
              : (targetSequence?.[contact.sourceImpactIndex - 1] ?? sourceId),
          toEntityId: targetSequence?.[contact.sourceImpactIndex] ?? targetId,
          jumpRadiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
          damageCoefficient: presentationDamageCoefficient,
        });
        continue;
      }
      if (
        (profile === 'warrior-dragon-flame' ||
          isSorcererTargetOrbProfile(profile) ||
          profile === 'taoist-blasting-charm' ||
          profile === 'sorcerer-flame-strike' ||
          profile === 'arbalist-burst-shell' ||
          profile === 'arbalist-venom-mist-shell' ||
          profile === 'arbalist-ice-cage' ||
          profile === 'arbalist-flash-arrow' ||
          profile === 'arbalist-heavenly-bow') &&
        contact.damage.coefficient === 0
      ) {
        continue;
      }
      if (
        isSorcererTargetAreaProfile(profile) ||
        profile === 'taoist-blasting-charm' ||
        profile === 'arbalist-quick-shot' ||
        profile === 'arbalist-seeking-bolt'
      ) {
        directContacts.push({
          attackId: row.attackId,
          offsetMs: contact.offsetMs,
          shape: 'target-circle',
          radiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
          damageCoefficient: presentationDamageCoefficient,
        });
      } else if (profile === 'lancer-crescent-blade' || profile === 'lancer-dragon-tail') {
        directContacts.push({
          attackId: row.attackId,
          offsetMs: contact.offsetMs,
          shape: 'sector',
          centerOffsetYards: mir4NativeDistanceToYards(row.geometry.nativeOffset.x),
          radiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          angleDegrees: row.geometry.angleDegrees,
          heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
          damageCoefficient: presentationDamageCoefficient,
        });
      } else if (
        profile === 'warrior-air-slash' ||
        profile === 'taoist-sunbeam-sword' ||
        profile === 'taoist-piercing-blades' ||
        profile === 'taoist-soaring-slash' ||
        profile === 'arbalist-painstrike-gale' ||
        profile === 'arbalist-obliterate-shell' ||
        profile === 'lancer-nirvana-kick' ||
        profile === 'lancer-double-strike' ||
        profile === 'lancer-wind-wall' ||
        profile === 'lancer-ravaging-blow' ||
        profile === 'lancer-blitz-strike' ||
        profile === 'lancer-piercing-spear'
      ) {
        const minReachYards = mir4NativeDistanceToYards(row.geometry.nativeDistanceMin);
        directContacts.push({
          attackId: row.attackId,
          offsetMs: contact.offsetMs,
          shape: 'direct',
          ...(minReachYards > 0 ? { minReachYards } : {}),
          reachYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          widthYards: mir4NativeDistanceToYards(row.geometry.nativeWidth),
          damageCoefficient: presentationDamageCoefficient,
        });
      } else {
        directContacts.push({
          attackId: row.attackId,
          offsetMs: contact.offsetMs,
          shape: 'circle',
          centerOffsetYards:
            profile === 'lancer-crushing-blow'
              ? 0
              : mir4NativeDistanceToYards(row.geometry.nativeOffset.x),
          radiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
          damageCoefficient: presentationDamageCoefficient,
        });
      }
    }
  }
  const contacts =
    (profile === 'sorcerer-thunderstorm' ||
      profile === 'sorcerer-dark-vortex' ||
      profile === 'sorcerer-blizzard' ||
      profile === 'taoist-rain-of-blades' ||
      profile === 'taoist-moonlight-orb' ||
      profile === 'taoist-moonlight-wave' ||
      profile === 'arbalist-burst-shell' ||
      profile === 'arbalist-venom-mist-shell' ||
      profile === 'arbalist-ice-cage' ||
      profile === 'arbalist-flash-arrow' ||
      profile === 'arbalist-heavenly-bow') &&
    plan.totem &&
    targetAnchor
      ? [
          ...directContacts,
          ...plan.totem.telegraphs.map(
            (telegraph) =>
              ({
                attackId: telegraph.attackId,
                offsetMs: telegraph.offsetMs,
                shape: 'fixed-circle' as const,
                x: targetAnchor.x,
                y: targetAnchor.y,
                z: targetAnchor.z,
                radiusYards: telegraph.area.radiusMaxYards,
                heightYards: telegraph.area.heightYards,
                damageCoefficient: 0,
              }) satisfies Mir4SkillPresentationEvent['contacts'][number],
          ),
          ...plan.totem.contacts.map(
            (contact) =>
              ({
                attackId: contact.attackId,
                offsetMs: contact.offsetMs,
                shape: 'fixed-circle' as const,
                x: targetAnchor.x,
                y: targetAnchor.y,
                z: targetAnchor.z,
                radiusYards: contact.area.radiusMaxYards,
                heightYards: contact.area.heightYards,
                damageCoefficient: contact.coefficient,
              }) satisfies Mir4SkillPresentationEvent['contacts'][number],
          ),
        ].sort((left, right) => left.offsetMs - right.offsetMs)
      : directContacts;
  const expectedContactCount =
    profile === 'warrior-overdrive'
      ? 2
      : profile === 'lancer-crescent-blade'
        ? 2
        : profile === 'lancer-dragon-tail'
          ? 3
          : profile === 'lancer-ascending-dragon'
            ? 3
            : profile === 'lancer-nirvana-kick'
              ? 1
              : profile === 'lancer-double-strike'
                ? 3
                : profile === 'lancer-crushing-blow'
                  ? 4
                  : profile === 'lancer-sweeping-storm'
                    ? 6
                    : profile === 'lancer-wind-wall'
                      ? 5
                      : profile === 'lancer-ravaging-blow'
                        ? 6
                        : profile === 'lancer-blitz-strike'
                          ? 1
                          : profile === 'lancer-piercing-spear'
                            ? 2
                            : profile === 'lancer-absorption'
                              ? 1
                              : profile === 'warrior-dragon-flame'
                                ? 4
                                : isSorcererTargetOrbProfile(profile)
                                  ? 1
                                  : profile === 'sorcerer-thunderstorm'
                                    ? 5
                                    : profile === 'sorcerer-dark-vortex'
                                      ? 6
                                      : profile === 'sorcerer-blizzard'
                                        ? 7
                                        : profile === 'taoist-rain-of-blades'
                                          ? 3
                                          : profile === 'taoist-moonlight-orb'
                                            ? 9
                                            : profile === 'taoist-moonlight-wave'
                                              ? 5
                                              : profile === 'taoist-sunbeam-sword'
                                                ? 7
                                                : profile === 'taoist-piercing-blades'
                                                  ? 5
                                                  : profile === 'taoist-soaring-slash'
                                                    ? 9
                                                    : profile === 'taoist-heal'
                                                      ? 3
                                                      : profile === 'taoist-greater-heal'
                                                        ? 4
                                                        : profile === 'taoist-guardian-circle'
                                                          ? 3
                                                          : profile === 'taoist-expulsion-circle'
                                                            ? 1
                                                            : profile === 'taoist-tai-chi'
                                                              ? 7
                                                              : profile === 'taoist-blasting-charm'
                                                                ? 1
                                                                : profile === 'arbalist-quick-shot'
                                                                  ? 12
                                                                  : profile ===
                                                                      'arbalist-illusion-arrow'
                                                                    ? 5
                                                                    : profile ===
                                                                        'arbalist-burst-shell'
                                                                      ? 5
                                                                      : profile ===
                                                                          'arbalist-venom-mist-shell'
                                                                        ? 9
                                                                        : profile ===
                                                                            'arbalist-ice-cage'
                                                                          ? 8
                                                                          : profile ===
                                                                              'arbalist-flash-arrow'
                                                                            ? 7
                                                                            : profile ===
                                                                                'arbalist-heavenly-bow'
                                                                              ? 8
                                                                              : profile ===
                                                                                  'arbalist-seeking-bolt'
                                                                                ? 1
                                                                                : profile ===
                                                                                    'arbalist-minds-eye'
                                                                                  ? 1
                                                                                  : profile ===
                                                                                      'arbalist-cloaking'
                                                                                    ? 1
                                                                                    : profile ===
                                                                                        'arbalist-painstrike-gale'
                                                                                      ? 1
                                                                                      : 3;
  const resolvedExpectedContactCount =
    profile === 'sorcerer-chain-lightning'
      ? (targetSequence?.length ?? 0)
      : profile === 'arbalist-obliterate-shell'
        ? 2
        : expectedContactCount;
  if (contacts.length !== resolvedExpectedContactCount) return null;

  const projectiles = (
    profile === 'taoist-heal' ||
    profile === 'taoist-greater-heal' ||
    profile === 'taoist-guardian-circle' ||
    profile === 'taoist-expulsion-circle' ||
    profile === 'arbalist-minds-eye' ||
    profile === 'arbalist-cloaking' ||
    profile === 'taoist-tai-chi'
      ? []
      : plan.rows
  ).flatMap((row) =>
    row.projectile
      ? [
          {
            attackId: row.attackId,
            // releaseOffsetMs is the projectile row's authored animation
            // notify. launchGapMs is an additional per-projectile gap, not a
            // cast-start timestamp.
            launchOffsetMs: row.projectile.releaseOffsetMs + row.projectile.launchGapMs,
            movement: row.projectile.movement,
            speedYardsPerSecond: row.projectile.travelSpeedYardsPerSecond,
            lifetimeMs: row.projectile.lifetimeMs,
            sourceSocketName: row.projectile.socketName,
            effectId: row.projectile.effectId,
            effectScale: row.projectile.effectScale,
          },
        ]
      : [],
  );
  if (
    isSorcererTargetOrbProfile(profile) &&
    (projectiles.length !== 1 ||
      projectiles[0].attackId !== (profile === 'sorcerer-flame-orb' ? 210101 : 211101))
  ) {
    return null;
  }

  return {
    type: 'mir4SkillPresentation',
    sourceId,
    targetId,
    sourceFacing,
    skillId: plan.skillId,
    ability: profile === 'warrior-dragon-flame' ? 'mir4_ultimate_1' : `mir4_skill_${plan.skillId}`,
    profile,
    durationMs:
      profile === 'lancer-crushing-blow'
        ? 1_767
        : (profile === 'sorcerer-thunderstorm' ||
              profile === 'sorcerer-dark-vortex' ||
              profile === 'sorcerer-blizzard' ||
              profile === 'taoist-rain-of-blades' ||
              profile === 'taoist-moonlight-orb' ||
              profile === 'taoist-moonlight-wave' ||
              profile === 'arbalist-burst-shell' ||
              profile === 'arbalist-venom-mist-shell' ||
              profile === 'arbalist-ice-cage' ||
              profile === 'arbalist-flash-arrow' ||
              profile === 'arbalist-heavenly-bow' ||
              profile === 'arbalist-cloaking') &&
            plan.totem
          ? Math.max(
              plan.attackAnimationMs,
              plan.totem.spawnOffsetMs + plan.totem.reconstruction.lifetimeMs,
            )
          : plan.attackAnimationMs,
    endCutMs: plan.endCutAnimationMs,
    animationAssetPath,
    vfxAssetPaths: [...plan.presentation.vfxAssetPaths],
    soundAssetPaths: [...plan.presentation.soundAssetPaths],
    cameraCurveAssetPaths: [...plan.presentation.cameraCurveAssetPaths],
    cameraShakeAssetPaths: [...plan.presentation.cameraShakeAssetPaths],
    ...((profile === 'sorcerer-thunderstorm' ||
      profile === 'sorcerer-dark-vortex' ||
      profile === 'sorcerer-blizzard' ||
      profile === 'taoist-rain-of-blades' ||
      profile === 'taoist-moonlight-orb' ||
      profile === 'taoist-moonlight-wave' ||
      profile === 'arbalist-burst-shell' ||
      profile === 'arbalist-venom-mist-shell' ||
      profile === 'arbalist-ice-cage' ||
      profile === 'arbalist-flash-arrow' ||
      profile === 'arbalist-heavenly-bow') &&
    plan.totem &&
    targetAnchor
      ? {
          persistentArea: {
            spawnOffsetMs: plan.totem.spawnOffsetMs,
            expiresOffsetMs: plan.totem.spawnOffsetMs + plan.totem.reconstruction.lifetimeMs,
            shape: 'fixed-circle' as const,
            x: targetAnchor.x,
            y: targetAnchor.y,
            z: targetAnchor.z,
            radiusYards: plan.totem.contacts[0].area.radiusMaxYards,
            heightYards: plan.totem.contacts[0].area.heightYards,
          },
        }
      : {}),
    ...(profile === 'arbalist-cloaking' && plan.totem && sourceAnchor
      ? {
          persistentArea: {
            spawnOffsetMs: plan.totem.spawnOffsetMs,
            expiresOffsetMs: plan.totem.spawnOffsetMs + plan.totem.reconstruction.lifetimeMs,
            shape: 'fixed-circle' as const,
            x: sourceAnchor.x,
            y: sourceAnchor.y,
            z: sourceAnchor.z,
            radiusYards: plan.totem.contacts[0].area.radiusMaxYards,
            heightYards: plan.totem.contacts[0].area.heightYards,
          },
        }
      : {}),
    ...(projectiles.length > 0 ? { projectiles } : {}),
    contacts,
  };
}

/**
 * Ultimate actions do not live in the ordinary hotbar-skill catalogue. Build
 * their visual contract from the independently validated native ultimate plan
 * instead of fabricating a duplicate Mir4SkillDef merely for presentation.
 */
export function mir4NativeUltimatePresentationEvent(
  sourceId: number,
  targetId: number,
  sourceFacing: number,
  classId: Mir4ClassId,
  targetAnchor?: { readonly x: number; readonly y: number; readonly z: number },
): Mir4SkillPresentationEvent | null {
  if (!Number.isFinite(sourceFacing)) return null;
  const plan = mir4NativeUltimateExecutionPlan(classId);
  if (
    !plan ||
    (plan.skillId !== 1403 &&
      plan.skillId !== 2403 &&
      plan.skillId !== 3303 &&
      plan.skillId !== 4113 &&
      plan.skillId !== 5203)
  ) {
    return null;
  }
  const action = mir4NativeDirectSkillActionEvidenceById(plan.skillId);
  const expectedAnimation =
    plan.skillId === 1403
      ? DRAGON_FLAME_ANIMATION
      : plan.skillId === 2403
        ? DRAGON_TORNADO_ANIMATION
        : plan.skillId === 3303
          ? LIGHT_RAY_ANIMATION
          : plan.skillId === 4113
            ? ARROW_RAIN_ANIMATION
            : DRAGON_SPEAR_ANIMATION;
  const assetPresentation =
    plan.skillId === 1403 ? null : mir4NativeSkillAssetPresentationEvidence(plan.skillId);
  const presentation = assetPresentation?.presentation ?? action?.presentation;
  if (!action || presentation?.animationAssetPath !== expectedAnimation) return null;

  if (plan.skillId === 4113) {
    const contacts = plan.contacts.flatMap((contact) => {
      const row = action.rows.find((candidate) => candidate.attackId === contact.attackId);
      if (!row) return [];
      return [
        {
          attackId: contact.attackId,
          offsetMs: contact.offsetMs,
          shape: 'sector' as const,
          radiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
          angleDegrees: row.geometry.angleDegrees,
          heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
          damageCoefficient: contact.coefficient,
        } satisfies Mir4SkillPresentationEvent['contacts'][number],
      ];
    });
    if (contacts.length !== plan.contacts.length) return null;
    return {
      type: 'mir4SkillPresentation',
      sourceId,
      targetId,
      sourceFacing,
      skillId: plan.skillId,
      ability: 'mir4_ultimate_4',
      profile: 'arbalist-arrow-rain',
      durationMs: plan.attackAnimationMs,
      endCutMs: plan.endCutAnimationMs,
      animationAssetPath: presentation.animationAssetPath,
      vfxAssetPaths: [...presentation.vfxAssetPaths],
      soundAssetPaths: [...presentation.soundAssetPaths],
      cameraCurveAssetPaths: [...presentation.cameraCurveAssetPaths],
      cameraShakeAssetPaths: [...presentation.cameraShakeAssetPaths],
      contacts,
    };
  }

  if (plan.skillId === 2403) {
    if (
      !plan.totem ||
      !targetAnchor ||
      !Number.isFinite(targetAnchor.x) ||
      !Number.isFinite(targetAnchor.y) ||
      !Number.isFinite(targetAnchor.z)
    ) {
      return null;
    }
    const contacts = plan.contacts.flatMap((contact) => {
      const totemContact = plan.totem?.contacts.find(
        (candidate) => candidate.attackId === contact.attackId,
      );
      if (!totemContact) return [];
      return [
        {
          attackId: contact.attackId,
          offsetMs: contact.offsetMs,
          shape: 'fixed-circle' as const,
          x: targetAnchor.x,
          y: targetAnchor.y,
          z: targetAnchor.z,
          radiusYards: totemContact.area.radiusMaxYards,
          heightYards: totemContact.area.heightYards,
          damageCoefficient: contact.coefficient,
        } satisfies Mir4SkillPresentationEvent['contacts'][number],
      ];
    });
    if (contacts.length !== plan.contacts.length) return null;
    return {
      type: 'mir4SkillPresentation',
      sourceId,
      targetId,
      sourceFacing,
      skillId: plan.skillId,
      ability: 'mir4_ultimate_2',
      profile: 'sorcerer-dragon-tornado',
      durationMs: plan.totem.spawnOffsetMs + plan.totem.reconstruction.lifetimeMs,
      endCutMs: plan.endCutAnimationMs,
      animationAssetPath: presentation.animationAssetPath,
      vfxAssetPaths: [...presentation.vfxAssetPaths],
      soundAssetPaths: [...presentation.soundAssetPaths],
      cameraCurveAssetPaths: [...presentation.cameraCurveAssetPaths],
      cameraShakeAssetPaths: [...presentation.cameraShakeAssetPaths],
      persistentArea: {
        spawnOffsetMs: plan.totem.spawnOffsetMs,
        expiresOffsetMs: plan.totem.spawnOffsetMs + plan.totem.reconstruction.lifetimeMs,
        shape: 'fixed-circle',
        x: targetAnchor.x,
        y: targetAnchor.y,
        z: targetAnchor.z,
        radiusYards: plan.totem.contacts[0].area.radiusMaxYards,
        heightYards: plan.totem.contacts[0].area.heightYards,
      },
      contacts,
    };
  }

  const contacts: Mir4SkillPresentationEvent['contacts'] = [];
  for (const contact of plan.contacts) {
    const row = action.rows.find((candidate) => candidate.attackId === contact.attackId);
    if (!row) continue;
    if (plan.skillId === 3303 || plan.skillId === 5203) {
      contacts.push({
        attackId: contact.attackId,
        offsetMs: contact.offsetMs,
        shape: 'direct',
        reachYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
        widthYards: mir4NativeDistanceToYards(row.geometry.nativeWidth),
        damageCoefficient: contact.coefficient,
      });
      continue;
    }
    contacts.push({
      attackId: contact.attackId,
      offsetMs: contact.offsetMs,
      shape: 'circle',
      centerOffsetYards: mir4NativeDistanceToYards(row.geometry.nativeOffset.x),
      radiusYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
      heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
      damageCoefficient: contact.coefficient,
    });
  }
  if (contacts.length !== plan.contacts.length) return null;

  return {
    type: 'mir4SkillPresentation',
    sourceId,
    targetId,
    sourceFacing,
    skillId: plan.skillId,
    ability:
      plan.skillId === 3303
        ? 'mir4_ultimate_3'
        : plan.skillId === 5203
          ? 'mir4_ultimate_5'
          : 'mir4_ultimate_1',
    profile:
      plan.skillId === 3303
        ? 'taoist-light-ray'
        : plan.skillId === 5203
          ? 'lancer-dragon-spear'
          : 'warrior-dragon-flame',
    durationMs: plan.attackAnimationMs,
    endCutMs: plan.endCutAnimationMs,
    animationAssetPath: presentation.animationAssetPath,
    vfxAssetPaths: [...presentation.vfxAssetPaths],
    soundAssetPaths: [...presentation.soundAssetPaths],
    cameraCurveAssetPaths: [...presentation.cameraCurveAssetPaths],
    cameraShakeAssetPaths: [...presentation.cameraShakeAssetPaths],
    contacts,
  };
}
