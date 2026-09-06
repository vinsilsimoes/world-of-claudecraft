// The mir4-gameplay-port combat pipeline: skill casts and the basic attack,
// resolved with the ported bps formulas (src/sim/mir4/math.ts) against the
// ported datasets (src/sim/content/mir4/), applied through the SHARED classic
// machinery (ctx.dealDamage receives the already-final integer; the stun rides
// the classic stun aura; cooldowns/GCD ride the classic Entity fields in
// seconds). Every roll draws through ctx.rng so offline, server, and headless
// stay byte-identical. Classic characters never reach this module.
//
// Basic attack policy is the source's sealed authorial baseline
// (F:\Dev\Survival-Game server/mir4-durable-combat.js
// createP3bB3DurableCombatSpec invariants and the per-class P4 builders):
// coefficient, authored impact offset, cadence, gauge gain, and the ultimate
// all come from MIR4_CLASS_COMBAT_SPECS (src/sim/content/mir4/classes.ts).

import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  type Mir4SkillDef,
  type Mir4SkillEffect,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
} from '../content/mir4';
import { mir4MobAccuracy, mir4MobBuildDefenses } from '../content/mir4/mobs';
import { resolveMobTemplate } from '../mob/template';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { SimContext } from '../sim_context';
import { addThreat } from '../threat';
import type { Entity, Mir4PendingImpact, PlayerClass } from '../types';
import { CAST_COMPLETE_EPS, dist2d } from '../types';
import { refreshMir4KnownAbilities } from './action_abilities';
import { mir4AreaSecondaryTargets } from './area_targets';
import {
  mir4AnimationDurationForContactsMs,
  mir4ContactOffsetsMs,
  mir4ValidatedSkillContactOffsetsMs,
} from './attack_timeline';
import {
  type Mir4BuildCombatContext,
  mir4BuildAttackIntervalMs,
  mir4BuildCapTempoAndDrain,
} from './build_balance';
import {
  mir4ControlChanceFromStatuses,
  mir4ControlDurationMs,
  mir4ControlFamilyOf,
} from './control';
import { interruptMir4SkillMovementOnDisplacement } from './displacement';
import {
  applyMir4Effect,
  mir4AllDamageReductionBonusBps,
  mir4AoEHostileTargets,
  mir4AttackMultiplier,
  mir4BossDamageReductionBonusBps,
  mir4DamageTakenAddend,
  mir4DefenseMultiplier,
  mir4DodgeBonus,
  mir4EffectiveSpellPower,
  mir4EffectKindOf,
  mir4EvadeDisabled,
  mir4HardControlled,
  mir4NativeStatusBonus,
  mir4PhysicalAttackFlatReduction,
  mir4SecondaryBps,
  mir4Silenced,
  mir4SkillDamageReductionBonusBps,
} from './effects';
import {
  type Mir4CombatStats,
  type Mir4TargetKind,
  mir4AuthorialSkillRankDamage,
  mir4CoefficientDamage,
  mir4ResolveDamage,
  mir4SkillManaCost,
  mir4SkillRankScaledInteger,
} from './math';
import { mir4NativeApprovedImpactTargets } from './native_impact_targets';
import { applyMir4NativePeriodicDamage } from './native_periodic_damage';
import { applyMir4NativeAbsorptionContact } from './native_skill_absorption';
import {
  mir4NativeDirectAdmissionWithinRange,
  mir4NativeSkillActivationRanges,
  mir4NativeTargetHeightAdmitted,
} from './native_skill_activation_range';
import {
  mir4NativeAggroThreatFromRate,
  mir4NativeRuntimeAggroPolicy,
  mir4NativeRuntimeAggroThreat,
} from './native_skill_aggro';
import {
  applyMir4NativeAscendingDragonContact,
  mir4NativeAscendingDragonPersistentMonsterDamageBps,
} from './native_skill_ascending_dragon';
import {
  applyMir4NativeAttackBackReaction,
  mir4NativeRuntimeAttackBackReaction,
} from './native_skill_attack_back';
import { mir4NativeBashScaledRawDamage } from './native_skill_bash';
import { mir4NativeRuntimeBerserkPolicy } from './native_skill_berserk';
import {
  applyMir4NativeBerserkSourceBuff,
  mir4NativeBerserkSkillDamageBonusBps,
} from './native_skill_berserk_runtime';
import { applyMir4NativeBlastingCharmContact } from './native_skill_blasting_charm';
import {
  applyMir4NativeBlitzStrikeFinalContact,
  mir4NativeBlitzStrikePersistentSkillDamageReductionBps,
} from './native_skill_blitz_strike';
import {
  applyMir4NativeBurstShellContact,
  mir4NativeBurstShellMonsterDamageBasisPoints,
} from './native_skill_burst_shell';
import { mir4NativeChainLightningTargets } from './native_skill_chain_lightning';
import {
  applyMir4NativeSkillChillDebuff,
  mir4NativeRuntimeChillDebuff,
} from './native_skill_chill_debuff';
import {
  applyMir4NativeCloaking,
  breakMir4NativeCloaking,
  mir4NativeCloakingPolicy,
} from './native_skill_cloaking';
import {
  applyMir4NativeCrescentBladeFinalContact,
  mir4NativeCrescentBladeConditionalDamageBasisPoints,
} from './native_skill_crescent_blade';
import {
  applyMir4NativeAdmittedCrowdControlReaction,
  mir4NativeCrowdControlEffectActive,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import {
  applyMir4NativeCrushingBlowFinalContact,
  applyMir4NativeCrushingBlowInvincibility,
  applyMir4NativeCrushingBlowRankBuffs,
  mir4NativeCrushingBlowConditionalDamageBasisPoints,
  mir4NativeCrushingBlowPolicy,
} from './native_skill_crushing_blow';
import { mir4NativeDoubleStrikeConditionalDamageBasisPoints } from './native_skill_double_strike';
import {
  applyMir4NativeDragonTailContact,
  applyMir4NativeDragonTailHitReaction,
  mir4NativeDragonTailMonsterDamageBasisPoints,
  mir4NativeDragonTailPersistentBossDamageReductionBps,
} from './native_skill_dragon_tail';
import {
  applyMir4NativeExpulsionCirclePartyBuffs,
  isMir4NativeExpulsionCircleSetup,
  mir4NativeExpulsionCirclePolicy,
  mir4NativeExpulsionCircleScheduledImpacts,
} from './native_skill_expulsion_circle';
import {
  applyMir4NativeFlashArrowContact,
  mir4NativeFlashArrowFocusSchedule,
} from './native_skill_flash_arrow';
import { mir4NativeRuntimeFrozenBlockPolicy } from './native_skill_frozen_block';
import { applyMir4NativeFrozenBlock } from './native_skill_frozen_block_runtime';
import {
  applyMir4NativeGreaterHealControlImmunity,
  applyMir4NativeGreaterHealLiving,
  applyMir4NativeGreaterHealProtection,
  applyMir4NativeGreaterHealRevive,
  isMir4NativeGreaterHealSetup,
  mir4NativeGreaterHealPolicy,
  mir4NativeGreaterHealScheduledImpacts,
} from './native_skill_greater_heal';
import {
  applyMir4NativeGuardianCircleLowestHealthBuff,
  applyMir4NativeGuardianCirclePartyBuffs,
  applyMir4NativeGuardianCircleStunRemoval,
  isMir4NativeGuardianCircleSetup,
  mir4NativeGuardianCirclePolicy,
  mir4NativeGuardianCircleScheduledImpacts,
} from './native_skill_guardian_circle';
import { mir4NativeSkillGuideEvents } from './native_skill_guide_event';
import {
  applyMir4NativeHealControlImmunity,
  applyMir4NativeHealPulse,
  applyMir4NativeHealRankEffects,
  isMir4NativeHealSetup,
  mir4NativeHealPolicy,
  mir4NativeHealScheduledImpacts,
} from './native_skill_heal';
import {
  applyMir4NativeHeavenlyBowReload,
  mir4NativeHeavenlyBowFocusSchedule,
  mir4NativeHeavenlyBowPersistentMonsterDamageBps,
} from './native_skill_heavenly_bow';
import {
  applyMir4NativeHitReaction,
  mir4HitReacting,
  mir4NativeRuntimeHitReaction,
} from './native_skill_hit_reaction';
import {
  applyMir4NativeIceCageDirectContact,
  mir4NativeIceCageDarknessDamageBasisPoints,
  mir4NativeIceCageFocusSchedule,
} from './native_skill_ice_cage';
import {
  applyMir4NativeIllusionArrowEvasion,
  applyMir4NativeIllusionArrowSourceBuffs,
  mir4NativeIllusionArrowCriticalDamageBasisPoints,
  mir4NativeIllusionArrowMonsterDamageBasisPoints,
  mir4NativeIllusionArrowPolicy,
} from './native_skill_illusion_arrow';
import {
  applyMir4NativeIronShackleImpactEffects,
  mir4NativeIronShacklePersistentCombatBonuses,
} from './native_skill_iron_shackle_runtime';
import {
  applyMir4NativeKnockbackReaction,
  mir4NativeRuntimeKnockbackReaction,
} from './native_skill_knockback';
import {
  applyMir4NativeLionRoarDebuff,
  mir4NativeRuntimeLionRoarDebuff,
} from './native_skill_lion_roar_debuff';
import { mir4NativeRuntimeMagicShieldPolicy } from './native_skill_magic_shield';
import { applyMir4NativeMagicShield } from './native_skill_magic_shield_runtime';
import {
  applyMir4NativeMindsEyePartyBuffs,
  isMir4NativeMindsEyeSetup,
  mir4NativeMindsEyePersistentAllDamageReductionBps,
  mir4NativeMindsEyePersistentBossDamageBps,
  mir4NativeMindsEyePolicy,
  mir4NativeMindsEyeScheduledImpacts,
} from './native_skill_minds_eye';
import {
  applyMir4NativeMoonlightOrbSpecialContact,
  mir4NativeMoonlightOrbPartyDefenseBonus,
  mir4NativeMoonlightOrbPersistentMonsterDamageBps,
} from './native_skill_moonlight_orb';
import {
  applyMir4NativeNirvanaKickFinalContact,
  mir4NativeNirvanaKickPersistentBossDamageBps,
  mir4NativeNirvanaKickPersistentMonsterDamageBps,
} from './native_skill_nirvana_kick';
import {
  applyMir4NativeObliterateShellKnockdown,
  mir4NativeObliterateShellConditionalDamageBasisPoints,
  mir4NativeObliterateShellFocusSchedule,
} from './native_skill_obliterate_shell';
import {
  applyMir4NativePainstrikeGaleContact,
  applyMir4NativePainstrikeGaleSourceBuffs,
  mir4NativePainstrikeGalePolicy,
} from './native_skill_painstrike_gale';
import { mir4NativeRuntimePhoenixEmbracePolicy } from './native_skill_phoenix_embrace';
import {
  applyMir4NativePhoenixEmbrace,
  mir4NativePhoenixEmbracePersistentSkillDamageBonusBps,
} from './native_skill_phoenix_embrace_runtime';
import {
  applyMir4NativePiercingBladesSpecialContact,
  mir4NativePiercingBladesPersistentBossDamageBps,
} from './native_skill_piercing_blades';
import { applyMir4NativePiercingSpearContact } from './native_skill_piercing_spear';
import {
  mir4NativeSkillPresentationEvent,
  mir4NativeUltimatePresentationEvent,
} from './native_skill_presentation_event';
import {
  applyMir4NativePushToPointReaction,
  mir4NativeRuntimePushToPointReaction,
} from './native_skill_push_to_point';
import {
  applyMir4NativeSkillQuellDebuff,
  mir4NativeRuntimeQuellDebuff,
} from './native_skill_quell_debuff';
import {
  applyMir4NativeArbalistFocus,
  mir4NativeBurstShellFocusSchedule,
  mir4NativeQuickShotFocusSchedule,
} from './native_skill_quick_shot';
import {
  mir4NativeAttackRageGainFromPoints,
  mir4NativeResolveHitRageGain,
  mir4NativeResolveHitRageGainFromPoints,
  mir4NativeRuntimeAttackRageGain,
} from './native_skill_rage';
import {
  applyMir4NativeRainOfBladesSpecialContact,
  mir4NativeRainOfBladesPartySkillDamageReductionBps,
  mir4NativeRainOfBladesPolicy,
} from './native_skill_rain_of_blades';
import {
  applyMir4NativeRiposteMonsterKnockdown,
  applyMir4NativeRipostePlayerKnockdown,
  applyMir4NativeRipostePlayerKnockdownRecovery,
  applyMir4NativeRiposteSourceBuffs,
  applyMir4NativeRiposteTaunt,
} from './native_skill_riposte_runtime';
import { mir4NativeRuntimeSkillEffect } from './native_skill_runtime_effect';
import {
  applyMir4NativeSeekingBoltCastingImmunity,
  applyMir4NativeSeekingBoltDirectContact,
  mir4NativeSeekingBoltPartyAccuracy,
  mir4NativeSeekingBoltPolicy,
  mir4NativeSeekingBoltSchedules,
} from './native_skill_seeking_bolt';
import {
  applyMir4NativeSkillSmiteDebuff,
  mir4NativeRuntimeSmiteDebuff,
} from './native_skill_smite_debuff';
import {
  applyMir4NativeSkillSmiteDefenseDebuff,
  mir4NativeRuntimeSmiteDefenseDebuff,
} from './native_skill_smite_defense_debuff';
import {
  applyMir4NativeSoaringSlashContact,
  mir4NativeSoaringSlashConditionalDamageBasisPoints,
  mir4NativeSoaringSlashPartySkillDamageReductionBps,
} from './native_skill_soaring_slash';
import { applyMir4NativeSunbeamSwordSpecialContact } from './native_skill_sunbeam_sword';
import {
  mir4NativeControlAdmissionBasisPoints,
  mir4NativeRuntimeSuperState,
} from './native_skill_super_state';
import { applyMir4NativeSweepingStormContact } from './native_skill_sweeping_storm';
import {
  applyMir4NativeTaiChiControlImmunity,
  applyMir4NativeTaiChiFinalContact,
  applyMir4NativeTaiChiPartyRecoveryBuff,
  applyMir4NativeTaiChiSourceRankEffects,
  applyMir4NativeTaiChiSpecialContact,
  isMir4NativeTaiChiSetup,
  mir4NativeTaiChiScheduledImpacts,
} from './native_skill_tai_chi';
import {
  mir4NativeTotemAttackerStats,
  mir4NativeTotemDamageOverrides,
} from './native_skill_totem_combat';
import { applyMir4NativeTotemReaction } from './native_skill_totem_reaction';
import { mir4NativeRuntimeTotemPlan } from './native_skill_totem_runtime';
import { mir4NativeTotemContactTargets } from './native_skill_totem_targets';
import { mir4NativeRuntimeUnbreakableStancePolicy } from './native_skill_unbreakable_stance';
import {
  applyMir4NativeUnbreakableStanceAlwaysBuffs,
  applyMir4NativeUnbreakableStanceStunnedBuffs,
  mir4NativeUnbreakableStancePersistentCombatBonuses,
} from './native_skill_unbreakable_stance_runtime';
import {
  applyMir4NativeVenomMistShellDirectContact,
  mir4NativeVenomMistShellFocusSchedule,
  mir4NativeVenomMistShellPersistentBossDamageReductionBps,
} from './native_skill_venom_mist_shell';
import {
  applyMir4NativeWindWallPartyBuffs,
  applyMir4NativeWindWallSourceBuffs,
  isMir4NativeWindWallSetup,
  mir4NativeWindWallScheduledImpacts,
} from './native_skill_wind_wall';
import { applyMir4NativeUltimateReaction } from './native_ultimate_reactions';
import {
  applyMir4NativeUltimateSetup,
  mir4NativeUltimateExecutionPlan,
} from './native_ultimate_runtime';
import { mir4NativeVfxCue } from './native_vfx';
import { mir4PartyNeedsHealing, mir4PartyPulseTargets } from './party_support';
import { cancelMir4QuestObjectiveCastForCombat } from './quest_objective_cast';
import { mir4RuntimeSkillExecutionPlan } from './runtime_skill_execution';
import {
  mir4ActiveSkillSuperArmorNative,
  mir4SkillActionLocked,
  startMir4SkillAction,
} from './skill_action_scheduler';
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4SkillUnlockLevel,
} from './skill_progression';
import { resolveMir4PlayerDamageWithSpirit } from './spirit_combat';
import {
  advanceMir4Experience,
  mir4ClassIdForPlayerClass,
  mir4RecalcClassOf,
  recalcMir4PlayerStats,
} from './stats';
import {
  mir4DrainOnDamage,
  mir4ManaRecoveredFromHealing,
  mir4ModifiedManaCost,
  mir4ModifiedPotionAmount,
  mir4ModifiedProgressionReward,
  mir4ModifiedSkillCooldownSeconds,
  mir4ModifiedSkillHealing,
  mir4RecoveryPerTenSeconds,
} from './status_effects';
import { mir4StatusRecordValue } from './status_values';

const BASIC_ATTACK_COOLDOWN_KEY = 'mir4_basic';

export function mir4BasicAttackCadenceSeconds(
  authoredCadenceMs: number,
  attackSpeedBps: number,
  context: Mir4BuildCombatContext = 'pve',
): number {
  const capped = mir4BuildCapTempoAndDrain({ attackSpeedBps }, context);
  return mir4BuildAttackIntervalMs(authoredCadenceMs, capped.attackSpeedBps) / 1_000;
}

function mir4AttackerStats(ctx: SimContext, p: Entity): Partial<Mir4CombatStats> {
  const s = p.mir4;
  const ironShackle = mir4NativeIronShacklePersistentCombatBonuses(ctx, p);
  const moonlightOrbMonsterDamage = mir4NativeMoonlightOrbPersistentMonsterDamageBps(ctx, p);
  const heavenlyBowMonsterDamage = mir4NativeHeavenlyBowPersistentMonsterDamageBps(ctx, p);
  const piercingBladesBossDamage = mir4NativePiercingBladesPersistentBossDamageBps(ctx, p);
  const mindsEyeBossDamage = mir4NativeMindsEyePersistentBossDamageBps(ctx, p);
  const nirvanaKickMonsterDamage = mir4NativeNirvanaKickPersistentMonsterDamageBps(ctx, p);
  const nirvanaKickBossDamage = mir4NativeNirvanaKickPersistentBossDamageBps(ctx, p);
  const ascendingDragonMonsterDamage = mir4NativeAscendingDragonPersistentMonsterDamageBps(ctx, p);
  return {
    accuracy:
      (s?.accuracy ?? 0) +
      mir4NativeStatusBonus(p, 28) +
      mir4NativeSeekingBoltPartyAccuracy(ctx, p),
    critical: (s?.critical ?? 0) + mir4NativeStatusBonus(p, 30),
    criticalOutcome: s?.criticalOutcome ?? 10,
    penetrationBps: s?.penetrationBps ?? 0,
    pvpDamageBps: s?.pvpDamageBps ?? 0,
    monsterDamageBps:
      (s?.monsterDamageBps ?? 0) +
      ironShackle.monsterDamageBasisPoints +
      moonlightOrbMonsterDamage +
      heavenlyBowMonsterDamage +
      nirvanaKickMonsterDamage +
      ascendingDragonMonsterDamage,
    bossDamageBps:
      (s?.bossDamageBps ?? 0) +
      piercingBladesBossDamage +
      mindsEyeBossDamage +
      nirvanaKickBossDamage,
    allDamageBps: s?.allDamageBps ?? 0,
    skillDamageBps:
      (s?.skillDamageBps ?? 0) +
      mir4NativeStatusBonus(p, 44) +
      mir4NativeBerserkSkillDamageBonusBps(p) +
      mir4NativePhoenixEmbracePersistentSkillDamageBonusBps(ctx, p),
    basicDamageBps:
      mir4StatusRecordValue(s?.statusValues, 143) + mir4StatusRecordValue(s?.statusValues, 159),
  };
}

function mir4PhysicalAttackPower(entity: Entity): number {
  return Math.max(
    0,
    entity.attackPower +
      mir4NativeStatusBonus(entity, 20) -
      mir4PhysicalAttackFlatReduction(entity),
  );
}

function mir4TargetKind(ctx: SimContext, target: Entity): Mir4TargetKind {
  if (target.kind === 'player' || target.ownerId !== null) return 'player';
  const template = resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates);
  return template?.boss ? 'boss' : 'monster';
}

function mir4CombatContextForTarget(target: Entity | null): Mir4BuildCombatContext {
  return target && (target.kind === 'player' || target.ownerId !== null) ? 'pvp' : 'pve';
}

function mir4CombatContextForAction(
  ctx: SimContext,
  source: Entity,
  target: Entity | null,
): Mir4BuildCombatContext {
  // An explicit target is authoritative. Only targetless utility actions may
  // inherit the context of the hostile player currently selected by the user.
  if (target !== null) return mir4CombatContextForTarget(target);
  const selected = source.targetId === null ? null : ctx.entities.get(source.targetId);
  return selected && !selected.dead && ctx.isHostileTo(source, selected)
    ? mir4CombatContextForTarget(selected)
    : 'pve';
}

function mir4DefenderStats(ctx: SimContext, target: Entity): Partial<Mir4CombatStats> {
  const s = target.mir4;
  const template =
    target.kind === 'mob'
      ? resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates)
      : undefined;
  const grade = template?.boss ? 'guardian' : template?.elite ? 'veteran' : 'normal';
  const mobDefenses =
    target.kind === 'mob'
      ? mir4MobBuildDefenses(target.level, template?.family, grade, target.stats.armor, {
          physicalDefense: template?.mir4PhysicalDefense,
          magicDefense: template?.mir4MagicDefense,
          dodge: template?.mir4Dodge,
          avoidCritical: template?.mir4AvoidCritical,
        })
      : undefined;
  const physicalDefenseMultiplier = mir4DefenseMultiplier(target, 'physical');
  const magicDefenseMultiplier = mir4DefenseMultiplier(target, 'magic');
  const moonlightOrbPartyDefense = mir4NativeMoonlightOrbPartyDefenseBonus(ctx, target);
  const ironShackle = mir4NativeIronShacklePersistentCombatBonuses(ctx, target);
  const unbreakableStance = mir4NativeUnbreakableStancePersistentCombatBonuses(ctx, target);
  const mindsEyeAllDamageReduction = mir4NativeMindsEyePersistentAllDamageReductionBps(ctx, target);
  const venomMistBossDamageReduction = mir4NativeVenomMistShellPersistentBossDamageReductionBps(
    ctx,
    target,
  );
  const dragonTailBossDamageReduction = mir4NativeDragonTailPersistentBossDamageReductionBps(
    ctx,
    target,
  );
  const blitzStrikeSkillDamageReduction = mir4NativeBlitzStrikePersistentSkillDamageReductionBps(
    ctx,
    target,
  );
  return {
    dodge: mir4EvadeDisabled(target)
      ? 0
      : (s?.dodge ?? mobDefenses?.dodge ?? 0) +
        mir4DodgeBonus(target) +
        mir4NativeStatusBonus(target, 29),
    avoidCritical:
      (s?.avoidCritical ?? mobDefenses?.avoidCritical ?? 0) + mir4NativeStatusBonus(target, 31),
    criticalDamageReduction:
      mir4StatusRecordValue(s?.statusValues, 33) + mir4NativeStatusBonus(target, 33),
    physicalDefense: Math.floor(
      ((s?.physicalDefense ?? mobDefenses?.physicalDefense ?? 0) +
        mir4NativeStatusBonus(target, 24) +
        moonlightOrbPartyDefense) *
        physicalDefenseMultiplier,
    ),
    magicDefense: Math.floor(
      ((s?.magicDefense ?? mobDefenses?.magicDefense ?? 0) +
        mir4NativeStatusBonus(target, 26) +
        moonlightOrbPartyDefense) *
        magicDefenseMultiplier,
    ),
    penetrationDefenseBps: s?.penetrationDefenseBps ?? 0,
    pvpDamageReductionBps: (s?.pvpDamageReductionBps ?? 0) + mir4NativeStatusBonus(target, 39),
    monsterDamageReductionBps:
      (s?.monsterDamageReductionBps ?? 0) + mir4NativeStatusBonus(target, 42),
    bossDamageReductionBps:
      (s?.bossDamageReductionBps ?? 0) +
      (template?.mir4BossDamageReductionBps ?? 0) +
      mir4BossDamageReductionBonusBps(target) +
      mir4NativeStatusBonus(target, 43) +
      venomMistBossDamageReduction +
      dragonTailBossDamageReduction,
    allDamageReductionBps:
      (s?.allDamageReductionBps ?? 0) +
      mir4AllDamageReductionBonusBps(target) +
      mir4NativeStatusBonus(target, 47) +
      ironShackle.allDamageReductionBasisPoints +
      unbreakableStance.allDamageReductionBasisPoints +
      mindsEyeAllDamageReduction,
    skillDamageReductionBps:
      (s?.skillDamageReductionBps ?? 0) +
      mir4SkillDamageReductionBonusBps(target) +
      mir4NativeRainOfBladesPartySkillDamageReductionBps(ctx, target) +
      mir4NativeSoaringSlashPartySkillDamageReductionBps(ctx, target) +
      blitzStrikeSkillDamageReduction,
    basicDamageReductionBps: mir4StatusRecordValue(s?.statusValues, 160),
  };
}

function applyMir4Drain(player: Entity, target: Entity, landedDamage: number): void {
  if (landedDamage <= 0 || !player.mir4) return;
  const drain = mir4DrainOnDamage(
    landedDamage,
    player.mir4.statusValues,
    mir4CombatContextForTarget(target),
  );
  if (drain.hp > 0) player.hp = Math.min(player.maxHp, player.hp + drain.hp);
  if (drain.mp > 0) {
    player.resource = Math.min(player.maxResource, player.resource + drain.mp);
  }
}

/** One 0..9999 roll from the shared deterministic stream. */
function rollBps(ctx: SimContext): number {
  return Math.floor(ctx.rng.next() * 10_000);
}

function classRangeYards(p: Entity): number {
  const classId = p.mir4?.classId ?? mir4ClassIdForPlayerClass(p.templateId as PlayerClass);
  const def = mir4ClassById(classId);
  return def ? mir4ClassRangeYards(def) : 4;
}

/** Authoritative reach of this character's basic attack. Automation callers
 * share this helper so pursuit stops at the exact same range the cast admits. */
export function mir4BasicAttackRangeYards(p: Entity): number {
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1];
  if (!spec) return classRangeYards(p);
  return Math.min(classRangeYards(p), spec.basic.rangePx / 16);
}

function resolveLivingHostileTarget(
  ctx: SimContext,
  pid: number,
  targetId: number | undefined,
): Entity | null {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return null;
  const target = targetId !== undefined ? ctx.entities.get(targetId) : null;
  if (!target || target.dead || !ctx.isHostileTo(p, target)) return null;
  return target;
}

function mir4SkillEffects(skill: Mir4SkillDef): readonly Mir4SkillEffect[] {
  return [skill.effect, ...(skill.additionalEffects ?? [])].filter(
    (effect): effect is Mir4SkillEffect => effect !== null,
  );
}

function isMir4SelfUtility(skill: Mir4SkillDef): boolean {
  const effects = mir4SkillEffects(skill);
  return (
    skill.damage === null &&
    effects.length > 0 &&
    effects.every((effect) => effect.subject === 'actor' || effect.subject === 'party')
  );
}

function moveMir4EntityNear(
  ctx: SimContext,
  mover: Entity,
  anchor: Entity,
  separationYards: number,
): void {
  const dx = mover.pos.x - anchor.pos.x;
  const dz = mover.pos.z - anchor.pos.z;
  const length = Math.hypot(dx, dz) || 1;
  const desiredX = anchor.pos.x + (dx / length) * separationYards;
  const desiredZ = anchor.pos.z + (dz / length) * separationYards;
  const resolved = ctx.resolveMove(
    mover.pos.x,
    mover.pos.z,
    desiredX,
    desiredZ,
    PLAYER_BODY_RADIUS,
    mover,
  );
  if (resolved.x !== mover.pos.x || resolved.z !== mover.pos.z) {
    interruptMir4SkillMovementOnDisplacement(ctx, mover);
  }
  mover.prevPos = { ...mover.pos };
  mover.pos = ctx.groundPos(resolved.x, resolved.z);
  mover.vx = 0;
  mover.vy = 0;
  mover.vz = 0;
  ctx.rebucket(mover);
}

function mir4EntityNearSnapshot(
  ctx: SimContext,
  mover: Entity,
  anchor: Entity,
  separationYards: number,
): Entity {
  const dx = mover.pos.x - anchor.pos.x;
  const dz = mover.pos.z - anchor.pos.z;
  const length = Math.hypot(dx, dz) || 1;
  const desiredX = anchor.pos.x + (dx / length) * separationYards;
  const desiredZ = anchor.pos.z + (dz / length) * separationYards;
  const resolved = ctx.resolveMove(
    mover.pos.x,
    mover.pos.z,
    desiredX,
    desiredZ,
    PLAYER_BODY_RADIUS,
    mover,
  );
  return { ...mover, pos: ctx.groundPos(resolved.x, resolved.z) };
}

function mir4ActionInFlight(ctx: SimContext, player: Entity): boolean {
  return (
    (player.mir4PendingImpacts?.some((impact) => impact.nativeTotem === undefined) ?? false) ||
    mir4SkillActionLocked(ctx.players.get(player.id)?.mir4SkillAction, ctx.tickCount)
  );
}

export interface Mir4CastResult {
  ok: boolean;
  reason?:
    | 'unknown-skill'
    | 'wrong-class'
    | 'not-unlocked'
    | 'no-target'
    | 'out-of-range'
    | 'no-mp'
    | 'on-cooldown'
    | 'on-gcd'
    | 'controlled'
    | 'silenced'
    | 'utility-not-ready';
}

/**
 * Cast a mir4 skill. Gates mirror the source admission list (mp, cooldown,
 * range, target-life; cc-immunity joins with the stun land in Phase 3), then
 * each damage component resolves per impact through mir4ResolveDamage.
 */
export function castMir4Skill(
  ctx: SimContext,
  pid: number,
  skillId: number,
  targetId?: number,
): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const skill = mir4SkillById(skillId);
  if (!skill) return { ok: false, reason: 'unknown-skill' };
  const executionPlan = mir4RuntimeSkillExecutionPlan(skillId);
  const classId = p.mir4?.classId;
  if (classId !== skill.classId) return { ok: false, reason: 'wrong-class' };
  if (p.level < mir4SkillUnlockLevel(skill)) {
    return { ok: false, reason: 'not-unlocked' };
  }
  const meta = ctx.players.get(pid);
  const rawLevel = meta?.mir4SkillLevels?.[skillId] ?? 1;
  const skillLevel = Math.min(MIR4_SKILL_MAX_LEVEL, Math.max(1, Math.floor(rawLevel)));
  const guardianCirclePolicy = skillId === 3501 ? mir4NativeGuardianCirclePolicy(skillLevel) : null;
  const expulsionCirclePolicy =
    skillId === 3404 ? mir4NativeExpulsionCirclePolicy(skillLevel) : null;
  const mindsEyePolicy = skillId === 4111 ? mir4NativeMindsEyePolicy(skillLevel) : null;
  const nativeHealPolicy = skillId === 3503 ? mir4NativeHealPolicy(skillLevel) : null;
  const nativeGreaterHealPolicy = skillId === 3504 ? mir4NativeGreaterHealPolicy(skillLevel) : null;
  const rainOfBladesPolicy = skillId === 3104 ? mir4NativeRainOfBladesPolicy(skillLevel) : null;
  const seekingBoltPolicy = skillId === 4110 ? mir4NativeSeekingBoltPolicy(skillLevel) : null;
  const cloakingPolicy = skillId === 4112 ? mir4NativeCloakingPolicy(skillLevel) : null;
  const activeNonStunHardControl = (p.mir4Effects?.active ?? []).some(
    (effect) =>
      effect.remaining > CAST_COMPLETE_EPS &&
      (effect.kind === 'knockdown' || effect.kind === 'dazed' || effect.kind === 'freeze'),
  );
  const startedWhileStunned = ctx.isStunned(p) && !activeNonStunHardControl;
  const unbreakableStancePolicy =
    skillId === 1502 ? mir4NativeRuntimeUnbreakableStancePolicy(skillLevel) : null;
  const mayCastWhileStunned =
    startedWhileStunned &&
    (unbreakableStancePolicy?.usableWhileStunned === true ||
      guardianCirclePolicy?.usableWhileStunned === true);
  const mayUseGreaterHealWhileStunned =
    startedWhileStunned && nativeGreaterHealPolicy?.usableWhileStunned === true;
  if (
    (!mayCastWhileStunned && !mayUseGreaterHealWhileStunned && ctx.isStunned(p)) ||
    activeNonStunHardControl ||
    mir4HitReacting(p)
  ) {
    return { ok: false, reason: 'controlled' };
  }
  if (
    mir4Silenced(p) &&
    nativeHealPolicy?.usableWhileSilenced !== true &&
    nativeGreaterHealPolicy?.usableWhileSilenced !== true &&
    expulsionCirclePolicy?.usableWhileSilenced !== true &&
    cloakingPolicy?.usableWhileSilenced !== true
  ) {
    return { ok: false, reason: 'silenced' };
  }
  // Self utilities need no target. Catalog rows that explicitly carry a
  // targetless area resolve around the actor and choose visible enemies
  // deterministically; other offensive rows still require a live target.
  const phoenixEmbrace =
    skillId === 2204 ? mir4NativeRuntimePhoenixEmbracePolicy(skillLevel) : null;
  const isSelfUtility =
    isMir4SelfUtility(skill) ||
    phoenixEmbrace !== null ||
    expulsionCirclePolicy !== null ||
    nativeGreaterHealPolicy !== null ||
    mindsEyePolicy !== null ||
    cloakingPolicy !== null;
  const areaRadiusYards = (skill.effect?.areaRadiusPx ?? 0) / 16;
  const isNativeActorCenteredDamage =
    executionPlan !== null &&
    !skill.requiresTarget &&
    executionPlan.rows.some((row) => row.contacts.length > 0);
  const isActorCenteredAoE =
    !skill.requiresTarget && !isSelfUtility && (areaRadiusYards > 0 || isNativeActorCenteredDamage);
  const maxSecondaryTargets = skill.effect?.maxSecondaryTargets ?? 0;
  const actorCenteredTargets = isActorCenteredAoE
    ? mir4AoEHostileTargets(ctx, p, p, areaRadiusYards, Math.max(1, maxSecondaryTargets + 1))
    : [];
  // A targetless actor-area action is legal even when its circle is empty.
  // Nearby hostiles determine contacts, never whether the button can be used.
  // This distinction is also what lets defensive actor-area skills commit
  // their self effect before an enemy reaches the player.
  const target = isSelfUtility
    ? null
    : isActorCenteredAoE
      ? (actorCenteredTargets[0] ?? (isNativeActorCenteredDamage ? p : null))
      : resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!isSelfUtility && !isActorCenteredAoE && !target) {
    return { ok: false, reason: 'no-target' };
  }
  const chainLightningTargets =
    target === null ? null : mir4NativeChainLightningTargets(ctx, p, skillId, target);
  if (skill.effect?.effect === 'magic-shield' && (p.mir4Shield?.remaining ?? 0) > 0) {
    return { ok: false, reason: 'utility-not-ready' };
  }
  if (isSelfUtility) {
    if (
      skill.effect?.effect === 'heal-pulse' &&
      // Native Taoist Heal has no injured-target admission gate: a manual,
      // targetless press always releases the cast, presentation, immunity and
      // rank effects. Its pulses already clamp at maximum health. Keep the
      // conservative legacy gate only for non-native authored heal utilities.
      nativeHealPolicy === null &&
      !mir4PartyNeedsHealing(ctx, p, {
        radiusYards: (skill.effect.partyRadiusPx ?? 0) / 16,
        maxTargets: skill.effect.maxPartyTargets ?? 1,
      })
    ) {
      return { ok: false, reason: 'utility-not-ready' };
    }
  }
  const nativeActivation = mir4NativeSkillActivationRanges(skillId, {
    targetBodyRadiusYards: PLAYER_BODY_RADIUS,
    skillDistanceBonusNative: 0,
  });
  if (!isActorCenteredAoE && target) {
    if (nativeActivation) {
      if (
        !mir4NativeDirectAdmissionWithinRange(dist2d(p.pos, target.pos), nativeActivation) ||
        !mir4NativeTargetHeightAdmitted(target.pos.y - p.pos.y, nativeActivation) ||
        (nativeActivation.blockingCheck && !ctx.hasLineOfSight(p, target))
      ) {
        return { ok: false, reason: 'out-of-range' };
      }
    } else {
      const rangeYards = (skill.castRangePx ?? classRangeYards(p) * 16) / 16;
      if (dist2d(p.pos, target.pos) > rangeYards || !ctx.hasLineOfSight(p, target)) {
        return { ok: false, reason: 'out-of-range' };
      }
    }
  }
  if (p.cooldowns.has(String(skillId))) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(ctx, p)) return { ok: false, reason: 'on-gcd' };

  const cost = mir4ModifiedManaCost(
    mir4SkillManaCost(p.mir4?.manaCostStat ?? 0, skill.skillCost, skill.skillCostType),
    p.mir4?.statusValues,
  );
  const bypassResourceCost = ctx.devCommands && p.devInfiniteResource === true;
  if (!bypassResourceCost && p.resource < cost) return { ok: false, reason: 'no-mp' };

  // Commit: spend, arm cooldown + the shared 1s GCD (seconds on Entity).
  cancelMir4QuestObjectiveCastForCombat(ctx, p);
  if (skillId !== 4112 && (skill.damage !== null || !isSelfUtility)) {
    breakMir4NativeCloaking(ctx, p);
  }
  if (!bypassResourceCost) p.resource -= cost;
  p.cooldowns.set(
    String(skillId),
    mir4ModifiedSkillCooldownSeconds(
      skill.cooldownMs / 1000,
      p.mir4?.statusValues,
      mir4CombatContextForAction(ctx, p, target),
      mir4NativeStatusBonus(p, 95),
    ),
  );
  if (phoenixEmbrace?.globalCooldownMs !== 0) {
    p.gcdRemaining = Math.max(p.gcdRemaining, MIR4_SKILL_GLOBAL_COOLDOWN_MS / 1000);
  }
  if (target && target.id !== p.id) {
    p.facing = Math.atan2(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
  }
  const nativeActionStarted = startMir4SkillAction(ctx, p, skillId, target);
  let presentationEvent: ReturnType<typeof mir4NativeSkillPresentationEvent> = null;
  if (executionPlan) {
    for (const guideEvent of mir4NativeSkillGuideEvents(p.id, executionPlan)) {
      ctx.emit(guideEvent);
    }
    presentationEvent = mir4NativeSkillPresentationEvent(
      p.id,
      target?.id ?? p.id,
      p.facing,
      executionPlan,
      target ? { x: target.pos.x, y: target.pos.y, z: target.pos.z } : undefined,
      chainLightningTargets?.map((chainTarget) => chainTarget.id),
      { x: p.pos.x, y: p.pos.y, z: p.pos.z },
    );
    if (presentationEvent) ctx.emit(presentationEvent);
  }

  // Skill rank from the authoritative per-skill state. Persistence and the
  // upgrade verb both fail-close class ownership and the shared rank-15 cap.
  if (skillId === 1301) applyMir4NativeRiposteSourceBuffs(ctx, p, skillLevel);
  if (skillId === 5303) {
    const crushingBlow = mir4NativeCrushingBlowPolicy(skillLevel);
    if (crushingBlow) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + crushingBlow.invincibility.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: 530301,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'lancer-crushing-blow-invincibility',
        attackAnimationStarted: true,
      });
      if (crushingBlow.sourceSkillDamageBoost && crushingBlow.sourceCooldownReduction) {
        scheduleMir4Impact(ctx, p, p, {
          dueAt: ctx.time + crushingBlow.rankBuffApplyAtMs / 1_000,
          rawDamage: 0,
          channel: 'physical',
          attackKind: 'skill',
          name: skill.displayName,
          gaugeGain: 0,
          spiritProcEligible: false,
          skillId,
          attackId: 530302,
          skillLevel,
          effectOnly: true,
          nativeSetup: 'lancer-crushing-blow-rank-buffs',
          attackAnimationStarted: true,
        });
      }
    }
  }
  if (skillId === 5403) {
    for (const impact of mir4NativeWindWallScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 1502) {
    if (startedWhileStunned) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + 0.02,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: 150201,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'unbreakable-stance-stunned',
        attackAnimationStarted: true,
      });
    }
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + 0.24,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: 150202,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'unbreakable-stance-always',
      attackAnimationStarted: true,
    });
  }
  if (skillId === 1101) {
    const berserk = mir4NativeRuntimeBerserkPolicy(skillLevel);
    for (const row of berserk?.rows ?? []) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + row.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: row.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'berserk-source-buff',
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 3503) {
    for (const impact of mir4NativeHealScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 3504) {
    for (const impact of mir4NativeGreaterHealScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 3501) {
    for (const impact of mir4NativeGuardianCircleScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 3404) {
    for (const impact of mir4NativeExpulsionCircleScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 3201) {
    for (const impact of mir4NativeTaiChiScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 4111) {
    for (const impact of mir4NativeMindsEyeScheduledImpacts(ctx, p, skillLevel)) {
      scheduleMir4Impact(ctx, p, impact.target, {
        dueAt: ctx.time + impact.dueOffsetMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: impact.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: impact.nativeSetup,
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 4112 && cloakingPolicy) {
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + cloakingPolicy.focusApplyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: cloakingPolicy.focusAttackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      attackAnimationStarted: true,
    });
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + cloakingPolicy.cloakApplyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: cloakingPolicy.cloakAttackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-cloaking',
      attackAnimationStarted: true,
    });
  }
  let areaSelectionActor = p;
  if (target && skill.effect?.chargeToTarget && nativeActionStarted) {
    // The old charge resolved before actor-area target selection. Preserve
    // that frozen target set while the body now follows its authored timeline.
    areaSelectionActor = mir4EntityNearSnapshot(ctx, p, target, 1.6);
  } else if (target && skill.effect?.chargeToTarget) {
    moveMir4EntityNear(ctx, p, target, 1.6);
  }
  for (const effect of mir4SkillEffects(skill)) {
    if (skillId === 3503 && effect.effect === 'heal-pulse') continue;
    if (effect.subject === 'actor') {
      if (skillId === 2503 && effect.effect === 'magic-shield') continue;
      applyMir4ConfiguredSkillEffect(ctx, p, p, skill, skillLevel, effect, false);
      continue;
    }
    if (effect.subject === 'party') {
      const partyTargets = mir4PartyPulseTargets(ctx, p, {
        radiusYards: Number(effect.partyRadiusPx ?? 0) / 16,
        maxTargets: Number(effect.maxPartyTargets ?? 1),
      });
      for (const partyTarget of partyTargets) {
        applyMir4ConfiguredSkillEffect(ctx, p, partyTarget, skill, skillLevel, effect, false);
      }
    }
  }
  const primaryImpacts: Array<{
    target: Entity;
    rawDamage: number;
    channel: 'physical' | 'magic';
    attackId?: number;
    sourceImpactIndex?: number;
    /** Exact native contact time when this skill has an approved execution plan. */
    offsetMs?: number;
    /** Shared by multiple damage channels belonging to one native contact. */
    nativeContactKey?: string;
  }> = [];
  let totalRawDamage = 0;
  const areaSecondaries = target
    ? isActorCenteredAoE
      ? actorCenteredTargets.slice(1)
      : skill.effect && areaRadiusYards > 0 && maxSecondaryTargets > 0
        ? mir4AreaSecondaryTargets(
            ctx,
            areaSelectionActor,
            target,
            skill.effect,
            maxSecondaryTargets,
          )
        : []
    : [];

  // Authorial skills keep their aggregate mechanics inside the same immediate
  // action batch as catalog damage components.
  const policy =
    skill.provenance === 'authorial-v1' ? MIR4_AUTHORIAL_SKILL_POLICIES[skillId] : undefined;
  if (policy && target) {
    const phys = Math.floor(
      (mir4PhysicalAttackPower(p) * (policy.damage.physicalCoefficient ?? 0)) / 10_000,
    );
    const magic = Math.floor(
      (mir4EffectiveSpellPower(p, ctx) * (policy.damage.magicCoefficient ?? 0)) / 10_000,
    );
    totalRawDamage = mir4AuthorialSkillRankDamage(Math.max(1, phys + magic), skillLevel);
    primaryImpacts.push({
      target,
      rawDamage: totalRawDamage,
      channel: policy.damage.damageType === 2 ? 'magic' : 'physical',
    });
  }

  if (executionPlan) {
    // A homologated skill executes the compiler output itself. The runtime
    // catalogue was already reconciled by the compiler, so it must not be
    // reread here as a second, independently drifting timing/damage source.
    for (const row of executionPlan.rows) {
      for (const contact of row.contacts) {
        if (!target) break;
        if (contact.damage.coefficient === 0 && contact.damage.levelUpCoefficient === 0) continue;
        const contactTarget =
          skillId === 2303 ? chainLightningTargets?.[contact.sourceImpactIndex] : target;
        if (!contactTarget) continue;
        const coefficient =
          contact.damage.coefficient + (skillLevel - 1) * contact.damage.levelUpCoefficient;
        const magic = contact.damage.damageType === 2;
        const attackPower = magic ? mir4EffectiveSpellPower(p, ctx) : mir4PhysicalAttackPower(p);
        const coefficientDamage = mir4CoefficientDamage(attackPower, coefficient);
        const rawDamage =
          contact.damage.allocationMode === 'row-total-impact-vector'
            ? Math.floor(coefficientDamage / contact.damage.componentImpactCount)
            : coefficientDamage;
        if (rawDamage <= 0) continue;
        totalRawDamage += rawDamage;
        primaryImpacts.push({
          target: contactTarget,
          rawDamage,
          channel: magic ? 'magic' : 'physical',
          attackId: row.attackId,
          sourceImpactIndex: contact.sourceImpactIndex,
          offsetMs: contact.offsetMs,
          nativeContactKey:
            row.contacts.filter(
              (candidate) => candidate.sourceImpactIndex === contact.sourceImpactIndex,
            ).length > 1
              ? `${row.attackId}:${contact.sourceImpactIndex}`
              : undefined,
        });
      }
    }
    // Hybrid rows contain one runtime contact per damage channel. Preserve
    // each authored timestamp by interleaving equal-time channels before the
    // shared timeline validator; component-major source order would otherwise
    // jump backwards and incorrectly force the legacy immediate path.
    primaryImpacts.sort((left, right) => (left.offsetMs ?? 0) - (right.offsetMs ?? 0));
  } else {
    for (const component of skill.damage?.components ?? []) {
      if (!target) break;
      const componentTarget = target;
      const coefficient = component.coefficient + (skillLevel - 1) * component.levelUpCoefficient;
      // damageType 2 rides the magic channel (spellPower); 1 the physical one.
      const magic = component.damageType === 2;
      const attackPower = magic ? mir4EffectiveSpellPower(p, ctx) : mir4PhysicalAttackPower(p);
      const componentChannel = magic ? 'magic' : 'physical';
      const coefficientDamage = mir4CoefficientDamage(attackPower, coefficient);
      const impactCount = Math.max(1, component.impactCount);
      const perImpact =
        skill.damage?.allocationMode === 'row-total-impact-vector'
          ? Math.floor(coefficientDamage / impactCount)
          : coefficientDamage;
      totalRawDamage += perImpact * impactCount;
      for (let impact = 0; impact < impactCount; impact++) {
        primaryImpacts.push({
          target: componentTarget,
          rawDamage: perImpact,
          channel: componentChannel,
          attackId: component.attackId,
          sourceImpactIndex: impact,
        });
      }
    }
  }

  const secondaryImpacts: Array<{
    target: Entity;
    rawDamage: number;
    channel: 'physical' | 'magic';
  }> = [];
  if (areaRadiusYards > 0 && totalRawDamage > 0 && target) {
    const bps = skill.effect?.secondaryDamageBasisPoints ?? 0;
    if (maxSecondaryTargets > 0 && bps > 0) {
      const secondaryChannel = primaryImpacts[0]?.channel ?? 'physical';
      const perSecondary = Math.floor(
        (totalRawDamage * mir4SecondaryBps(bps, maxSecondaryTargets, areaSecondaries.length)) /
          10_000,
      );
      for (const secondary of areaSecondaries) {
        if (secondary.dead) continue;
        secondaryImpacts.push({
          target: secondary,
          rawDamage: perSecondary,
          channel: secondaryChannel,
        });
      }
    }
  }

  const cue = mir4NativeVfxCue(skill);
  const visualTarget = target?.id ?? p.id;
  const totemOnlyContactOffsets =
    executionPlan?.totem && primaryImpacts.length === 0
      ? executionPlan.totem.contacts.map((contact) => contact.offsetMs)
      : null;
  const synchronizedOffsets = phoenixEmbrace
    ? [phoenixEmbrace.applyAtMs]
    : mindsEyePolicy
      ? [mindsEyePolicy.applyAtMs]
      : executionPlan
        ? (totemOnlyContactOffsets ?? primaryImpacts.map((impact) => impact.offsetMs ?? 0))
        : (skill.impactOffsetsMs ??
          (skill.classId >= 1 && skill.classId <= 5
            ? mir4ContactOffsetsMs(skill.attackAnimationMs, Math.max(1, primaryImpacts.length))
            : undefined));
  // A durable Totem owns contacts after the player's animation has ended.
  // Its compiler already validates the ordered native attack graph, so those
  // contacts must not be rejected by the actor-animation duration gate.
  const skillContactOffsetsMs = totemOnlyContactOffsets
    ? Object.freeze([...totemOnlyContactOffsets])
    : mir4ValidatedSkillContactOffsetsMs(
        synchronizedOffsets,
        skill.attackAnimationMs,
        Math.max(1, primaryImpacts.length),
      );
  const finalSkillContactMs = skillContactOffsetsMs?.at(-1) ?? 0;
  const actionPrefix = `${p.id}:skill:${skillId}:${Math.round(ctx.time * 1_000)}`;
  const actionGroups = new Map<number, string>();
  const actionGroupFor = (impactTarget: Entity): string => {
    if (skillId === 2303) return actionPrefix;
    const existing = actionGroups.get(impactTarget.id);
    if (existing) return existing;
    const created = `${actionPrefix}:${impactTarget.id}`;
    actionGroups.set(impactTarget.id, created);
    return created;
  };
  if (skillId === 2503) {
    const shield = mir4NativeRuntimeMagicShieldPolicy(skillLevel);
    if (shield) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + shield.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: shield.sourceAttackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'magic-shield-source-buff',
        actionGroupId: actionGroupFor(p),
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 2202) {
    const frozenBlock = mir4NativeRuntimeFrozenBlockPolicy();
    if (frozenBlock) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + frozenBlock.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'magic',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: frozenBlock.sourceAttackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'frozen-block-source-buff',
        actionGroupId: actionGroupFor(p),
        attackAnimationStarted: true,
      });
    }
  }
  if (phoenixEmbrace) {
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + phoenixEmbrace.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'magic',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: phoenixEmbrace.sourceAttackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'phoenix-embrace-source-buff',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  const scheduledNativeContactKeys = new Set<string>();
  for (const [impactIndex, impact] of primaryImpacts.entries()) {
    const nativeContactKey = impact.nativeContactKey
      ? `${actionPrefix}:${impact.nativeContactKey}`
      : undefined;
    const ownsNativeContact =
      nativeContactKey === undefined || !scheduledNativeContactKeys.has(nativeContactKey);
    if (nativeContactKey) scheduledNativeContactKeys.add(nativeContactKey);
    scheduleMir4Impact(ctx, p, impact.target, {
      dueAt: ctx.time + (impact.offsetMs ?? skillContactOffsetsMs?.[impactIndex] ?? 0) / 1000,
      rawDamage: impact.rawDamage,
      channel: impact.channel,
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain:
        impact.attackId === undefined || !ownsNativeContact
          ? 0
          : (mir4NativeRuntimeAttackRageGain(skillId, impact.attackId)?.gaugePercent ?? 0),
      // Every contact remains eligible until the first one actually lands;
      // the action-group state then closes the single spirit-proc attempt.
      spiritProcEligible: true,
      skillId,
      attackId: impact.attackId,
      sourceImpactIndex: impact.sourceImpactIndex,
      skillLevel,
      actionGroupId: actionGroupFor(impact.target),
      nativeContactKey,
      forceHit:
        rainOfBladesPolicy?.unavoidable || seekingBoltPolicy?.unavoidable ? true : undefined,
      attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
    });
  }
  if (skillId === 4101) {
    const focus = mir4NativeQuickShotFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4103) {
    const focus = mir4NativeBurstShellFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4104) {
    const focus = mir4NativeVenomMistShellFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4105) {
    const focus = mir4NativeIceCageFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4107) {
    const focus = mir4NativeFlashArrowFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4108) {
    const focus = mir4NativeHeavenlyBowFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4109) {
    const focus = mir4NativeObliterateShellFocusSchedule();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4110 && seekingBoltPolicy) {
    const schedules = mir4NativeSeekingBoltSchedules();
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + schedules.immunity.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: schedules.immunity.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-seeking-bolt-immunity',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + schedules.focus.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: schedules.focus.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4111 && mindsEyePolicy) {
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + mindsEyePolicy.applyAtMs / 1_000,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: mindsEyePolicy.attackId,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'arbalist-focus',
      actionGroupId: actionGroupFor(p),
      attackAnimationStarted: true,
    });
  }
  if (skillId === 4102) {
    const illusionArrow = mir4NativeIllusionArrowPolicy(skillLevel);
    if (illusionArrow) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + illusionArrow.source.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: illusionArrow.source.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'arbalist-illusion-arrow-source-buffs',
        actionGroupId: actionGroupFor(p),
        attackAnimationStarted: true,
      });
    }
  }
  if (skillId === 4106) {
    const painstrike = mir4NativePainstrikeGalePolicy(skillLevel);
    if (painstrike) {
      scheduleMir4Impact(ctx, p, p, {
        dueAt: ctx.time + painstrike.source.applyAtMs / 1_000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: painstrike.source.attackId,
        skillLevel,
        effectOnly: true,
        nativeSetup: 'arbalist-painstrike-source-buffs',
        actionGroupId: actionGroupFor(p),
        attackAnimationStarted: true,
      });
    }
  }
  if (
    executionPlan?.totem &&
    (target || executionPlan.totem.reconstruction.anchor === 'source-position-at-cast')
  ) {
    const totem = executionPlan.totem;
    const anchor = totem.reconstruction.anchor === 'source-position-at-cast' ? p : target!;
    const origin = { x: anchor.pos.x, y: anchor.pos.y, z: anchor.pos.z };
    const expiresAt = ctx.time + (totem.spawnOffsetMs + totem.reconstruction.lifetimeMs) / 1000;
    for (const contact of totem.contacts) {
      const components = contact.damageComponents ?? [
        {
          damageType: contact.damageType,
          damageAttribute: contact.damageAttribute,
          coefficient: contact.coefficient,
          levelUpCoefficient: contact.levelUpCoefficient,
        },
      ];
      const nativeContactKey = `${actionPrefix}:totem:${contact.attackId}:${contact.offsetMs}`;
      for (const component of components) {
        const coefficient = component.coefficient + (skillLevel - 1) * component.levelUpCoefficient;
        const channel = component.damageType === 2 ? 'magic' : 'physical';
        const attackPower =
          channel === 'magic' ? mir4EffectiveSpellPower(p, ctx) : mir4PhysicalAttackPower(p);
        scheduleMir4Impact(ctx, p, target ?? p, {
          dueAt: ctx.time + contact.offsetMs / 1000,
          rawDamage: mir4CoefficientDamage(attackPower, coefficient),
          channel,
          attackKind: 'skill',
          name: skill.displayName,
          gaugeGain:
            mir4NativeAttackRageGainFromPoints(contact.nativeCombat?.attackRagePoint ?? 0)
              ?.gaugePercent ?? 0,
          spiritProcEligible: false,
          skillId,
          attackId: contact.attackId,
          sourceImpactIndex: 0,
          skillLevel,
          actionGroupId: actionGroupFor(target ?? p),
          nativeContactKey: components.length > 1 ? nativeContactKey : undefined,
          forceHit:
            rainOfBladesPolicy?.unavoidable || seekingBoltPolicy?.unavoidable ? true : undefined,
          attackAnimationStarted: true,
          nativeTotem: {
            totemId: totem.totemId,
            origin,
            expiresAt,
            combatResolution: {
              accuracy: totem.ownerSnapshot.accuracyNative,
              critical: totem.ownerSnapshot.criticalNative,
              criticalOutcome: totem.ownerSnapshot.criticalOutcomeNative,
              hitChanceBps: totem.combatResolution.hitChanceBps,
              criticalChanceBps: totem.combatResolution.criticalChanceBps,
              criticalMultiplierBps: totem.combatResolution.criticalMultiplierBps,
              policyId: totem.combatResolution.policyId,
              nativeClaim: false,
            },
          },
          nativeTotemCombat: contact.nativeCombat ? { ...contact.nativeCombat } : undefined,
        });
      }
    }
  }
  if (skillId === 1301 && target) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + 0.02,
      rawDamage: 0,
      channel: 'physical',
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      attackId: 130101,
      sourceImpactIndex: 0,
      skillLevel,
      effectOnly: true,
      nativeSetup: 'riposte-taunt',
      actionGroupId: actionGroupFor(target),
      attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
    });
  }
  for (const impact of secondaryImpacts) {
    scheduleMir4Impact(ctx, p, impact.target, {
      dueAt: ctx.time + finalSkillContactMs / 1000,
      rawDamage: impact.rawDamage,
      channel: impact.channel,
      attackKind: 'skill',
      name: skill.displayName,
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId,
      skillLevel,
      actionGroupId: actionGroupFor(impact.target),
      attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
    });
  }

  const hostileEffects = mir4SkillEffects(skill).filter(
    (effect) => effect.subject !== 'actor' && effect.subject !== 'party',
  );
  if (hostileEffects.length > 0 && primaryImpacts.length + secondaryImpacts.length > 0) {
    const nativeRuntimeEffect = mir4NativeRuntimeSkillEffect(skillId);
    const damagedTargets = new Map<number, Entity>();
    for (const impact of [...primaryImpacts, ...secondaryImpacts]) {
      damagedTargets.set(impact.target.id, impact.target);
    }
    // The effect resolves after the action's damage contacts. It observes
    // whether ANY contact landed, so a miss on the last hit cannot
    // erase an effect earned by an earlier hit and the effect still cannot
    // amplify damage from the action that applied it.
    for (const effectTarget of damagedTargets.values()) {
      scheduleMir4Impact(ctx, p, effectTarget, {
        dueAt: ctx.time + finalSkillContactMs / 1000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        attackId: nativeRuntimeEffect?.sourceAttackId,
        skillLevel,
        applySkillEffect: true,
        effectOnly: true,
        requiresLandedImpact: true,
        actionGroupId: actionGroupFor(effectTarget),
        attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
      });
    }
  } else if (
    primaryImpacts.length === 0 &&
    secondaryImpacts.length === 0 &&
    hostileEffects.length > 0
  ) {
    const effectTargets = isSelfUtility
      ? [p]
      : target
        ? areaRadiusYards > 0
          ? [target, ...areaSecondaries]
          : [target]
        : [];
    for (const effectTarget of effectTargets) {
      scheduleMir4Impact(ctx, p, effectTarget, {
        dueAt: ctx.time + finalSkillContactMs / 1000,
        rawDamage: 0,
        channel: 'physical',
        attackKind: 'skill',
        name: skill.displayName,
        gaugeGain: 0,
        spiritProcEligible: false,
        skillId,
        skillLevel,
        applySkillEffect: true,
        effectOnly: true,
        actionGroupId: actionGroupFor(effectTarget),
        attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
      });
    }
  }
  if (skillContactOffsetsMs) {
    ctx.emit({
      type: 'mir4AttackStart',
      sourceId: p.id,
      targetId: visualTarget,
      ability: cue.ability,
      action: 'skill',
      pose: 'weapon',
      durationMs: skill.attackAnimationMs,
    });
  } else {
    // Non-MIR4 extension content without an official animation duration keeps
    // the legacy immediate path. Every official five-class skill is scheduled
    // after its animation begins, even where the source table exposes only a
    // duration/hit count and no exact per-contact timestamps.
    resolveMir4SkillActionImmediately(ctx, p, actionPrefix);
  }
  ctx.emit({
    type: 'spellfx',
    sourceId: p.id,
    targetId: visualTarget,
    school: cue.school,
    fx: cue.fx,
    ability: cue.ability,
    impactDelayMs: skillContactOffsetsMs ? finalSkillContactMs : undefined,
    attackAnimationStarted: skillContactOffsetsMs ? true : undefined,
    nativePresentationOwned: presentationEvent ? true : undefined,
  });
  return { ok: true };
}

/**
 * The per-class basic attack from the ported spec: coefficient, authored
 * impact offset, cadence. The damage resolves AT the offset (rolls then), and
 * each landed impact feeds the ultimate gauge.
 */
export function mir4BasicAttack(ctx: SimContext, pid: number, targetId?: number): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  const target = resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  if (ctx.isStunned(p) || mir4HardControlled(p) || mir4HitReacting(p)) {
    return { ok: false, reason: 'controlled' };
  }
  const spec = MIR4_CLASS_COMBAT_SPECS[p.mir4?.classId ?? 1] ?? MIR4_CLASS_COMBAT_SPECS[1];
  const rangeYards = mir4BasicAttackRangeYards(p);
  if (dist2d(p.pos, target.pos) > rangeYards) {
    return { ok: false, reason: 'out-of-range' };
  }
  if (!ctx.hasLineOfSight(p, target)) return { ok: false, reason: 'out-of-range' };
  if (p.cooldowns.has(BASIC_ATTACK_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(ctx, p)) return { ok: false, reason: 'on-gcd' };

  cancelMir4QuestObjectiveCastForCombat(ctx, p);
  breakMir4NativeCloaking(ctx, p);
  p.cooldowns.set(
    BASIC_ATTACK_COOLDOWN_KEY,
    mir4BasicAttackCadenceSeconds(
      spec.basic.cadenceMs,
      p.mir4?.mountBasicAttackSpeedBps ?? 0,
      mir4CombatContextForTarget(target),
    ),
  );
  ctx.emit({
    type: 'mir4AttackStart',
    sourceId: p.id,
    targetId: target.id,
    action: 'basic',
    pose: spec.basic.channel === 'magic' ? 'cast' : 'weapon',
    durationMs: mir4AnimationDurationForContactsMs(spec.basic.impactOffsetMs),
  });
  const attackPower =
    spec.basic.channel === 'magic' ? mir4EffectiveSpellPower(p, ctx) : mir4PhysicalAttackPower(p);
  const damage = mir4CoefficientDamage(attackPower, spec.basic.coefficient);
  const actionGroupId = `${p.id}:basic:${Math.round(ctx.time * 1_000)}:${target.id}`;
  for (const offsetMs of spec.basic.impactOffsetMs) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.basic.channel,
      attackKind: 'basic',
      name: null,
      gaugeGain: spec.basic.gaugeGainPerImpact,
      spiritProcEligible: true,
      actionGroupId,
    });
  }
  return { ok: true };
}

// Potions (the source's mir4_hp_potion / mir4_mp_potion): HP restores 5% of
// max on a 1s group cooldown, MP restores a flat 120 on a 5s group cooldown.
// The slice has no consumable inventory yet, so counts are unlimited and only
// the cooldowns gate use; the Phase 4 inventory port carries the stacks.
export const MIR4_HP_POTION_HEAL_BPS = 500;
export const MIR4_MP_POTION_RESTORE = 120;
export const MIR4_HP_POTION_COOLDOWN_SECONDS = 1;
export const MIR4_MP_POTION_COOLDOWN_SECONDS = 5;
const HP_POTION_COOLDOWN_KEY = 'mir4_potion_hp';
const MP_POTION_COOLDOWN_KEY = 'mir4_potion_mp';

export function mir4UsePotion(
  ctx: { entities: Map<number, Entity> },
  pid: number,
  kind: 'hp' | 'mp',
): boolean {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return false;
  if (kind === 'hp') {
    if (p.hp >= p.maxHp) return false; // RESOURCE_FULL: nothing to restore
    if (p.cooldowns.has(HP_POTION_COOLDOWN_KEY)) return false;
    p.cooldowns.set(HP_POTION_COOLDOWN_KEY, MIR4_HP_POTION_COOLDOWN_SECONDS);
    const baseHeal = Math.floor((p.maxHp * MIR4_HP_POTION_HEAL_BPS) / 10_000);
    p.hp = Math.min(
      p.maxHp,
      p.hp +
        mir4ModifiedPotionAmount(
          baseHeal,
          'hp',
          p.mir4?.statusValues,
          mir4NativeStatusBonus(p, 146),
        ),
    );
    return true;
  }
  if (p.resource >= p.maxResource) return false;
  if (p.cooldowns.has(MP_POTION_COOLDOWN_KEY)) return false;
  p.cooldowns.set(MP_POTION_COOLDOWN_KEY, MIR4_MP_POTION_COOLDOWN_SECONDS);
  p.resource = Math.min(
    p.maxResource,
    p.resource +
      mir4ModifiedPotionAmount(
        MIR4_MP_POTION_RESTORE,
        'mp',
        p.mir4?.statusValues,
        mir4NativeStatusBonus(p, 147),
      ),
  );
  return true;
}

const ULTIMATE_COOLDOWN_KEY = 'mir4_ult';

/**
 * Spend the full ultimate gauge and execute the class's authored contact plan.
 * Homologated classes use direct native evidence. Other classes retain the
 * compatibility spec until their own native plan passes the same gate.
 */
export function mir4Ultimate(ctx: SimContext, pid: number, targetId?: number): Mir4CastResult {
  const p = ctx.entities.get(pid);
  if (!p || p.dead) return { ok: false, reason: 'no-target' };
  if (p.level < MIR4_ULTIMATE_UNLOCK_LEVEL) return { ok: false, reason: 'not-unlocked' };
  const target = resolveLivingHostileTarget(ctx, pid, targetId ?? p.targetId ?? undefined);
  if (!target) return { ok: false, reason: 'no-target' };
  if (ctx.isStunned(p) || mir4HardControlled(p) || mir4HitReacting(p)) {
    return { ok: false, reason: 'controlled' };
  }
  if (mir4Silenced(p)) return { ok: false, reason: 'silenced' };
  const classDef = mir4ClassById(p.mir4?.classId ?? 1);
  const classId = classDef?.classId ?? 1;
  const spec = MIR4_CLASS_COMBAT_SPECS[classId] ?? MIR4_CLASS_COMBAT_SPECS[1];
  const nativePlan = mir4NativeUltimateExecutionPlan(classId);
  const requiredGauge = nativePlan?.requiredGauge ?? spec.ultimate.requiredGauge;
  if ((p.mir4UltGauge ?? 0) < requiredGauge) return { ok: false, reason: 'no-mp' };

  const nativeActivation = nativePlan
    ? mir4NativeSkillActivationRanges(nativePlan.skillId, {
        targetBodyRadiusYards: PLAYER_BODY_RADIUS,
        skillDistanceBonusNative: 0,
      })
    : null;
  if (nativeActivation) {
    if (
      !mir4NativeDirectAdmissionWithinRange(dist2d(p.pos, target.pos), nativeActivation) ||
      !mir4NativeTargetHeightAdmitted(target.pos.y - p.pos.y, nativeActivation) ||
      (nativeActivation.blockingCheck && !ctx.hasLineOfSight(p, target))
    ) {
      return { ok: false, reason: 'out-of-range' };
    }
  } else {
    const rangeYards = Math.min(classRangeYards(p) * 1.5, spec.ultimate.rangePx / 16);
    if (dist2d(p.pos, target.pos) > rangeYards || !ctx.hasLineOfSight(p, target)) {
      return { ok: false, reason: 'out-of-range' };
    }
  }
  if (p.cooldowns.has(ULTIMATE_COOLDOWN_KEY)) return { ok: false, reason: 'on-cooldown' };
  if (p.gcdRemaining > 0 || mir4ActionInFlight(ctx, p)) return { ok: false, reason: 'on-gcd' };

  const resourceCost = nativePlan
    ? mir4ModifiedManaCost(
        mir4SkillManaCost(
          p.mir4?.manaCostStat ?? 0,
          nativePlan.skillCost,
          nativePlan.skillCostType,
        ),
        p.mir4?.statusValues,
      )
    : 0;
  const bypassResourceCost = ctx.devCommands && p.devInfiniteResource === true;
  if (!bypassResourceCost && p.resource < resourceCost) return { ok: false, reason: 'no-mp' };

  cancelMir4QuestObjectiveCastForCombat(ctx, p);
  breakMir4NativeCloaking(ctx, p);
  if (!bypassResourceCost) p.resource -= resourceCost;
  p.mir4UltGauge = 0;
  p.cooldowns.set(
    ULTIMATE_COOLDOWN_KEY,
    mir4ModifiedSkillCooldownSeconds(
      (nativePlan?.cooldownMs ?? spec.ultimate.cooldownMs) / 1000,
      p.mir4?.statusValues,
      mir4CombatContextForTarget(target),
      mir4NativeStatusBonus(p, 95),
    ),
  );
  p.facing = Math.atan2(target.pos.x - p.pos.x, target.pos.z - p.pos.z);

  if (nativePlan) {
    startMir4SkillAction(ctx, p, nativePlan.skillId, target);
    const presentationEvent = mir4NativeUltimatePresentationEvent(
      p.id,
      target.id,
      p.facing,
      classId,
      { x: target.pos.x, y: target.pos.y, z: target.pos.z },
    );
    if (presentationEvent) ctx.emit(presentationEvent);
    const actionGroupId = `${p.id}:ultimate:${Math.round(ctx.time * 1_000)}:${target.id}`;
    scheduleMir4Impact(ctx, p, p, {
      dueAt: ctx.time + nativePlan.sourceInvincibility.applyAtMs / 1_000,
      rawDamage: 0,
      channel: nativePlan.channel,
      attackKind: 'skill',
      name: classDef?.ultimateDisplayName ?? 'Dragon Flame',
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId: nativePlan.skillId,
      attackId: nativePlan.sourceInvincibility.attackId,
      sourceImpactIndex: 0,
      skillLevel: 1,
      effectOnly: true,
      nativeSetup: 'native-ultimate-source-buff',
      actionGroupId,
      attackAnimationStarted: true,
    });
    const nativeTotem = nativePlan.totem
      ? {
          totemId: nativePlan.totem.totemId,
          origin: { x: target.pos.x, y: target.pos.y, z: target.pos.z },
          expiresAt:
            ctx.time +
            (nativePlan.totem.spawnOffsetMs + nativePlan.totem.reconstruction.lifetimeMs) / 1000,
          combatResolution: {
            accuracy: nativePlan.totem.ownerSnapshot.accuracyNative,
            critical: nativePlan.totem.ownerSnapshot.criticalNative,
            criticalOutcome: nativePlan.totem.ownerSnapshot.criticalOutcomeNative,
            hitChanceBps: nativePlan.totem.combatResolution.hitChanceBps,
            criticalChanceBps: nativePlan.totem.combatResolution.criticalChanceBps,
            criticalMultiplierBps: nativePlan.totem.combatResolution.criticalMultiplierBps,
            policyId: nativePlan.totem.combatResolution.policyId,
            nativeClaim: false as const,
          },
        }
      : undefined;
    for (const contact of nativePlan.contacts) {
      const damageComponents = contact.damageComponents ?? [
        { channel: nativePlan.channel, coefficient: contact.coefficient },
      ];
      const nativeContactKey = `${actionGroupId}:contact:${contact.attackId}:${contact.sourceImpactIndex}`;
      for (const component of damageComponents) {
        const attackPower =
          component.channel === 'magic'
            ? mir4EffectiveSpellPower(p, ctx)
            : mir4PhysicalAttackPower(p);
        scheduleMir4Impact(ctx, p, target, {
          dueAt: ctx.time + contact.offsetMs / 1_000,
          rawDamage: mir4CoefficientDamage(attackPower, component.coefficient),
          channel: component.channel,
          attackKind: 'skill',
          name: classDef?.ultimateDisplayName ?? 'Dragon Flame',
          gaugeGain: 0,
          spiritProcEligible: true,
          skillId: nativePlan.skillId,
          attackId: contact.attackId,
          sourceImpactIndex: contact.sourceImpactIndex,
          skillLevel: 1,
          actionGroupId,
          nativeContactKey: damageComponents.length > 1 ? nativeContactKey : undefined,
          attackAnimationStarted: true,
          nativeTotem,
        });
      }
    }
    const nativeUltimateAbility = `mir4_ultimate_${classId}` as const;
    ctx.emit({
      type: 'mir4AttackStart',
      sourceId: p.id,
      targetId: target.id,
      ability: nativeUltimateAbility,
      action: 'ultimate',
      pose: nativePlan.channel === 'magic' ? 'cast' : 'weapon',
      durationMs: nativePlan.attackAnimationMs,
    });
    ctx.emit({
      type: 'spellfx',
      sourceId: p.id,
      targetId: target.id,
      school: nativePlan.channel,
      fx: 'nova',
      ability: nativeUltimateAbility,
      impactDelayMs: nativePlan.contacts.at(-1)?.offsetMs,
      attackAnimationStarted: true,
    });
    return { ok: true };
  }

  const attackPower =
    spec.ultimate.channel === 'magic'
      ? mir4EffectiveSpellPower(p, ctx)
      : mir4PhysicalAttackPower(p);
  const damage = mir4CoefficientDamage(attackPower, spec.ultimate.perImpactCoefficient);
  ctx.emit({
    type: 'mir4AttackStart',
    sourceId: p.id,
    targetId: target.id,
    action: 'ultimate',
    pose: spec.ultimate.channel === 'magic' ? 'cast' : 'weapon',
    durationMs: mir4AnimationDurationForContactsMs(spec.ultimate.impactOffsetMs),
  });
  const actionGroupId = `${p.id}:ultimate:${Math.round(ctx.time * 1_000)}:${target.id}`;
  for (const offsetMs of spec.ultimate.impactOffsetMs) {
    scheduleMir4Impact(ctx, p, target, {
      dueAt: ctx.time + offsetMs / 1000,
      rawDamage: damage,
      channel: spec.ultimate.channel,
      attackKind: 'skill',
      name: classDef?.ultimateDisplayName ?? 'Ultimate',
      gaugeGain: 0,
      spiritProcEligible: true,
      actionGroupId,
      attackAnimationStarted: true,
    });
  }
  return { ok: true };
}

function scheduleMir4Impact(
  _ctx: SimContext,
  p: Entity,
  target: Entity,
  impact: {
    dueAt: number;
    rawDamage: number;
    channel: 'physical' | 'magic';
    attackKind: 'basic' | 'skill';
    name: string | null;
    gaugeGain: number;
    spiritProcEligible: boolean;
    skillId?: number;
    attackId?: number;
    sourceImpactIndex?: number;
    skillLevel?: number;
    applySkillEffect?: boolean;
    effectOnly?: boolean;
    nativeSetup?: Mir4PendingImpact['nativeSetup'];
    actionGroupId?: string;
    requiresLandedImpact?: boolean;
    attackAnimationStarted?: true;
    nativeTotem?: Mir4PendingImpact['nativeTotem'];
    nativeTotemCombat?: Mir4PendingImpact['nativeTotemCombat'];
    nativeContactKey?: string;
    forceHit?: boolean;
  },
): void {
  if (!p.mir4PendingImpacts) p.mir4PendingImpacts = [];
  p.mir4PendingImpacts.push({
    dueAt: impact.dueAt,
    sourceId: p.id,
    targetId: target.id,
    rawDamage: impact.rawDamage,
    channel: impact.channel,
    attackKind: impact.attackKind,
    name: impact.name,
    gaugeGain: impact.gaugeGain,
    spiritProcEligible: impact.spiritProcEligible,
    skillId: impact.skillId,
    attackId: impact.attackId,
    sourceImpactIndex: impact.sourceImpactIndex,
    skillLevel: impact.skillLevel,
    applySkillEffect: impact.applySkillEffect,
    effectOnly: impact.effectOnly,
    nativeSetup: impact.nativeSetup,
    actionGroupId: impact.actionGroupId,
    requiresLandedImpact: impact.requiresLandedImpact,
    attackAnimationStarted: impact.attackAnimationStarted,
    nativeTotem: impact.nativeTotem,
    nativeTotemCombat: impact.nativeTotemCombat,
    nativeContactKey: impact.nativeContactKey,
    forceHit: impact.forceHit,
  });
}

function applyMir4PendingSkillEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  skillLevel: number,
  effectOnly: boolean,
  nativeControlBaseChanceBps?: number,
): void {
  const skill = mir4SkillById(skillId);
  if (!skill || target.dead) return;
  for (const effect of mir4SkillEffects(skill)) {
    if (effect.subject === 'actor' || effect.subject === 'party') continue;
    applyMir4ConfiguredSkillEffect(
      ctx,
      source,
      target,
      skill,
      skillLevel,
      effect,
      effectOnly,
      nativeControlBaseChanceBps,
    );
  }
}

function applyMir4ConfiguredSkillEffect(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skill: Mir4SkillDef,
  skillLevel: number,
  effect: Mir4SkillEffect,
  effectOnly: boolean,
  nativeControlBaseChanceBps?: number,
): void {
  if (target.dead) return;
  if (skillLevel < Number(effect.minimumRank ?? 1)) return;

  if (effect.effect === 'heal-pulse' && source.id === target.id) {
    const bps = effect.healMaxHpBasisPoints as number | undefined;
    const scaledBps = mir4SkillRankScaledInteger(bps ?? 0, skillLevel);
    const partyTargets = mir4PartyPulseTargets(ctx, source, {
      radiusYards: (effect.partyRadiusPx ?? 0) / 16,
      maxTargets: effect.maxPartyTargets ?? 1,
    });
    let totalHealing = 0;
    for (const partyTarget of partyTargets) {
      const heal = mir4ModifiedSkillHealing(
        Math.floor((partyTarget.maxHp * scaledBps) / 10_000),
        source.mir4?.statusValues,
        mir4NativeStatusBonus(source, 148),
      );
      const healthBefore = partyTarget.hp;
      partyTarget.hp = Math.min(partyTarget.maxHp, partyTarget.hp + heal);
      totalHealing += partyTarget.hp - healthBefore;
    }
    source.resource = Math.min(
      source.maxResource,
      source.resource + mir4ManaRecoveredFromHealing(totalHealing, source.mir4?.statusValues),
    );
    return;
  }
  if (effect.effect === 'self-heal' && source.id === target.id) {
    const minimumRank = Number(effect.minimumRank ?? 1);
    if (skillLevel < minimumRank) return;
    const basisPoints =
      skillLevel >= 10
        ? Number(effect.rank10HealMaxHpBasisPoints ?? effect.healMaxHpBasisPoints ?? 0)
        : Number(effect.healMaxHpBasisPoints ?? 0);
    const heal = mir4ModifiedSkillHealing(
      Math.floor((source.maxHp * basisPoints) / 10_000),
      source.mir4?.statusValues,
      mir4NativeStatusBonus(source, 148),
    );
    source.hp = Math.min(source.maxHp, source.hp + heal);
    return;
  }

  const kind = mir4EffectKindOf(effect.effect);
  if (
    (effect.subject === 'actor' && source.id === target.id) ||
    (effect.subject === 'party' && !ctx.isHostileTo(source, target))
  ) {
    if (!kind) return;
    applyMir4Effect(ctx, source, {
      effectId: `mir4_${skill.skillId}_${effect.effect}`,
      kind,
      durationSeconds: (effect.durationMs ?? 0) / 1000,
      magnitude:
        skillLevel >= 10
          ? (effect.rank10Magnitude ?? effect.magnitude ?? 0)
          : (effect.magnitude ?? 0),
      name: skill.displayName,
      sourceId: source.id,
    });
    return;
  }
  if (!ctx.isHostileTo(source, target)) return;
  if (effect.pullToActor) {
    const template =
      target.kind === 'mob'
        ? resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates)
        : undefined;
    if (template?.boss !== true && target.ccImmune !== true) {
      moveMir4EntityNear(ctx, target, source, 1.6);
    }
  }
  if (effect.pushFromActorYards) {
    const template =
      target.kind === 'mob'
        ? resolveMobTemplate(target.templateId, ctx.mir4RuntimeMobTemplates)
        : undefined;
    if (template?.boss !== true && target.ccImmune !== true) {
      moveMir4EntityNear(ctx, target, source, effect.pushFromActorYards);
    }
  }
  if (!kind) return;
  let lands = true;
  const controlFamily = mir4ControlFamilyOf(kind);
  const targetKind = mir4TargetKind(ctx, target);
  const temporaryControlResistanceBps =
    controlFamily === 'stun'
      ? mir4NativeStatusBonus(target, 49)
      : controlFamily === 'debilitation'
        ? mir4NativeStatusBonus(target, 51)
        : controlFamily === 'silence'
          ? mir4NativeStatusBonus(target, 53)
          : 0;
  if (controlFamily) {
    const authoredBaseChance =
      targetKind === 'player' ? effect.pvpChanceBasisPoints : effect.pveChanceBasisPoints;
    const baseChance = nativeControlBaseChanceBps ?? authoredBaseChance ?? 10_000;
    const chance =
      nativeControlBaseChanceBps !== undefined
        ? Math.max(0, Math.min(10_000, nativeControlBaseChanceBps))
        : mir4ControlChanceFromStatuses(
            baseChance,
            controlFamily,
            source.mir4?.statusValues,
            target.mir4?.statusValues,
            targetKind,
            temporaryControlResistanceBps,
          );
    // Explicitly authored chance profiles (4106 included) preserve their
    // production draw even at 100%. A default-chance control draws only when
    // build opposition makes its result genuinely probabilistic.
    lands =
      authoredBaseChance !== undefined || nativeControlBaseChanceBps !== undefined
        ? rollBps(ctx) < chance
        : chance >= 10_000
          ? true
          : chance <= 0
            ? false
            : rollBps(ctx) < chance;
  }
  if (!lands) return;
  const rankedDurationMs = effectOnly
    ? mir4SkillRankScaledInteger(effect.durationMs ?? 0, skillLevel)
    : (effect.durationMs ?? 0);
  const durationMs = controlFamily
    ? mir4ControlDurationMs(
        rankedDurationMs,
        controlFamily,
        source.mir4?.statusValues,
        target.mir4?.statusValues,
        targetKind,
        temporaryControlResistanceBps,
      )
    : rankedDurationMs;
  const authoredMagnitude =
    skillLevel >= 10 ? (effect.rank10Magnitude ?? effect.magnitude ?? 0) : (effect.magnitude ?? 0);
  const magnitudeBasisPoints = effectOnly
    ? mir4SkillRankScaledInteger(Math.round(authoredMagnitude * 10_000), skillLevel)
    : Math.round(authoredMagnitude * 10_000);
  applyMir4Effect(ctx, target, {
    effectId: `mir4_${skill.skillId}_${effect.effect}`,
    kind,
    durationSeconds: durationMs / 1000,
    magnitude: magnitudeBasisPoints / 10_000,
    name: skill.displayName,
    sourceId: source.id,
  });
}

function patchMir4ActionGroup(
  owner: Entity,
  due: Mir4PendingImpact[],
  actionGroupId: string | undefined,
  patch: Pick<Mir4PendingImpact, 'actionLanded' | 'spiritProcAttempted'>,
): void {
  if (!actionGroupId) return;
  for (const candidate of [...due, ...(owner.mir4PendingImpacts ?? [])]) {
    if (candidate.actionGroupId !== actionGroupId) continue;
    if (patch.actionLanded === true) candidate.actionLanded = true;
    if (patch.spiritProcAttempted === true) candidate.spiritProcAttempted = true;
  }
}

function resolveMir4PendingImpactBatch(
  ctx: SimContext,
  owner: Entity,
  due: Mir4PendingImpact[],
): void {
  const ripostePlayerKnockdowns = new Map<
    string,
    { source: Entity; skillLevel: number; successfulTargets: number }
  >();
  const resolvedNativeContactEffects = new Set<string>();
  for (const impact of due) {
    const source = ctx.entities.get(impact.sourceId);
    const target = ctx.entities.get(impact.targetId);
    const nativeGreaterHealUtility = isMir4NativeGreaterHealSetup(
      impact.skillId,
      impact.nativeSetup,
    );
    const nativeGreaterHealRevive =
      nativeGreaterHealUtility && impact.nativeSetup === 'taoist-greater-heal-revive';
    if (!source || !target || source.dead || (target.dead && !nativeGreaterHealRevive)) continue;
    const nativeHealUtility = isMir4NativeHealSetup(impact.skillId, impact.nativeSetup);
    const nativeGuardianCircleUtility = isMir4NativeGuardianCircleSetup(
      impact.skillId,
      impact.nativeSetup,
    );
    const nativeExpulsionCircleUtility = isMir4NativeExpulsionCircleSetup(
      impact.skillId,
      impact.nativeSetup,
    );
    const nativeTaiChiUtility = isMir4NativeTaiChiSetup(impact.skillId, impact.nativeSetup);
    const nativeMindsEyeUtility = isMir4NativeMindsEyeSetup(impact.skillId, impact.nativeSetup);
    const nativeWindWallUtility = isMir4NativeWindWallSetup(impact.skillId, impact.nativeSetup);
    const selfUtility =
      impact.effectOnly === true &&
      (source.id === target.id ||
        nativeHealUtility ||
        nativeGreaterHealUtility ||
        nativeGuardianCircleUtility ||
        nativeExpulsionCircleUtility ||
        nativeTaiChiUtility ||
        nativeMindsEyeUtility ||
        nativeWindWallUtility);
    const pvpTarget = target.kind === 'player' || target.ownerId !== null;
    // Hostility is always revalidated because a duel can end during the
    // authored windup. PvP also keeps the impact-time sight check. A PvE
    // action, however, was already range/LOS-admitted at cast time: commit
    // it at the authored contact so a moving mob or a portal/building seam
    // cannot silently erase an otherwise valid action after its cooldown and
    // resource cost were spent.
    if (
      !selfUtility &&
      (!ctx.isHostileTo(source, target) || (pvpTarget && !ctx.hasLineOfSight(source, target)))
    ) {
      continue;
    }
    if (impact.effectOnly) {
      if (impact.nativeSetup === 'berserk-source-buff' && impact.skillId === 1101) {
        applyMir4NativeBerserkSourceBuff(ctx, source, impact.attackId ?? 0, impact.skillLevel ?? 1);
        continue;
      }
      if (
        impact.nativeSetup === 'native-ultimate-source-buff' &&
        impact.skillId !== undefined &&
        impact.attackId !== undefined
      ) {
        applyMir4NativeUltimateSetup(ctx, source, impact.skillId, impact.attackId);
        continue;
      }
      if (impact.nativeSetup === 'unbreakable-stance-stunned' && impact.skillId === 1502) {
        applyMir4NativeUnbreakableStanceStunnedBuffs(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'unbreakable-stance-always' && impact.skillId === 1502) {
        applyMir4NativeUnbreakableStanceAlwaysBuffs(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'lancer-crushing-blow-invincibility' && impact.skillId === 5303) {
        applyMir4NativeCrushingBlowInvincibility(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'lancer-crushing-blow-rank-buffs' && impact.skillId === 5303) {
        applyMir4NativeCrushingBlowRankBuffs(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'lancer-wind-wall-source-buffs' && impact.skillId === 5403) {
        applyMir4NativeWindWallSourceBuffs(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'lancer-wind-wall-party-buffs' && impact.skillId === 5403) {
        applyMir4NativeWindWallPartyBuffs(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (
        impact.nativeSetup === 'riposte-taunt' &&
        impact.skillId === 1301 &&
        impact.attackId === 130101
      ) {
        applyMir4NativeRiposteTaunt(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'magic-shield-source-buff' && impact.skillId === 2503) {
        applyMir4NativeMagicShield(source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'frozen-block-source-buff' && impact.skillId === 2202) {
        applyMir4NativeFrozenBlock(ctx, source);
        continue;
      }
      if (impact.nativeSetup === 'phoenix-embrace-source-buff' && impact.skillId === 2204) {
        applyMir4NativePhoenixEmbrace(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-heal-control-immunity' && impact.skillId === 3503) {
        applyMir4NativeHealControlImmunity(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-heal-rank-effects' && impact.skillId === 3503) {
        applyMir4NativeHealRankEffects(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-heal-pulse' && impact.skillId === 3503) {
        applyMir4NativeHealPulse(source, target, impact.skillLevel ?? 1, ctx);
        continue;
      }
      if (
        impact.nativeSetup === 'taoist-greater-heal-control-immunity' &&
        impact.skillId === 3504
      ) {
        applyMir4NativeGreaterHealControlImmunity(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-greater-heal-protection' && impact.skillId === 3504) {
        applyMir4NativeGreaterHealProtection(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-greater-heal-living' && impact.skillId === 3504) {
        applyMir4NativeGreaterHealLiving(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-greater-heal-revive' && impact.skillId === 3504) {
        applyMir4NativeGreaterHealRevive(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-guardian-circle-stun-removal' && impact.skillId === 3501) {
        applyMir4NativeGuardianCircleStunRemoval(target);
        continue;
      }
      if (impact.nativeSetup === 'taoist-guardian-circle-party-buffs' && impact.skillId === 3501) {
        applyMir4NativeGuardianCirclePartyBuffs(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (
        impact.nativeSetup === 'taoist-guardian-circle-lowest-health-buff' &&
        impact.skillId === 3501
      ) {
        applyMir4NativeGuardianCircleLowestHealthBuff(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-expulsion-circle-party-buffs' && impact.skillId === 3404) {
        applyMir4NativeExpulsionCirclePartyBuffs(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-tai-chi-control-immunity' && impact.skillId === 3201) {
        applyMir4NativeTaiChiControlImmunity(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-tai-chi-source-rank-effects' && impact.skillId === 3201) {
        applyMir4NativeTaiChiSourceRankEffects(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.nativeSetup === 'taoist-tai-chi-party-recovery' && impact.skillId === 3201) {
        applyMir4NativeTaiChiPartyRecoveryBuff(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (
        impact.nativeSetup === 'arbalist-seeking-bolt-immunity' &&
        impact.skillId === 4110 &&
        impact.attackId === 411000
      ) {
        applyMir4NativeSeekingBoltCastingImmunity(ctx, source);
        continue;
      }
      if (
        impact.nativeSetup === 'arbalist-focus' &&
        (impact.skillId === 4101 ||
          impact.skillId === 4103 ||
          impact.skillId === 4104 ||
          impact.skillId === 4105 ||
          impact.skillId === 4107 ||
          impact.skillId === 4108 ||
          impact.skillId === 4109 ||
          impact.skillId === 4110 ||
          impact.skillId === 4111 ||
          impact.skillId === 4112)
      ) {
        applyMir4NativeArbalistFocus(ctx, source);
        continue;
      }
      if (
        impact.nativeSetup === 'arbalist-cloaking' &&
        impact.skillId === 4112 &&
        impact.attackId === 411202
      ) {
        applyMir4NativeCloaking(ctx, source, impact.skillLevel ?? 1);
        continue;
      }
      if (
        impact.nativeSetup === 'arbalist-illusion-arrow-source-buffs' &&
        impact.skillId === 4102 &&
        impact.attackId === 410201
      ) {
        applyMir4NativeIllusionArrowSourceBuffs(ctx, source);
        continue;
      }
      if (
        impact.nativeSetup === 'arbalist-painstrike-source-buffs' &&
        impact.skillId === 4106 &&
        impact.attackId === 410601
      ) {
        applyMir4NativePainstrikeGaleSourceBuffs(ctx, source);
        continue;
      }
      if (impact.nativeSetup === 'arbalist-minds-eye-party-buffs' && impact.skillId === 4111) {
        applyMir4NativeMindsEyePartyBuffs(ctx, source, target, impact.skillLevel ?? 1);
        continue;
      }
      if (impact.requiresLandedImpact && impact.actionLanded !== true) continue;
      if (impact.applySkillEffect && impact.skillId !== undefined) {
        const nativeCrowdControl =
          impact.attackId === undefined
            ? null
            : mir4NativeRuntimeCrowdControlReaction(impact.skillId, impact.attackId);
        const nativeControlWasActive = nativeCrowdControl
          ? mir4NativeCrowdControlEffectActive(target, nativeCrowdControl)
          : false;
        const nativeSuperState =
          impact.attackId === undefined
            ? null
            : mir4NativeRuntimeSuperState(impact.skillId, impact.attackId);
        applyMir4PendingSkillEffect(
          ctx,
          source,
          target,
          impact.skillId,
          impact.skillLevel ?? 1,
          impact.requiresLandedImpact !== true,
          nativeSuperState
            ? mir4NativeControlAdmissionBasisPoints(
                nativeSuperState,
                mir4ActiveSkillSuperArmorNative(ctx, target),
              )
            : undefined,
        );
        if (nativeCrowdControl && !nativeControlWasActive && impact.attackId !== undefined) {
          applyMir4NativeAdmittedCrowdControlReaction(
            ctx,
            source,
            target,
            impact.skillId,
            impact.attackId,
            nativeCrowdControl,
          );
        }
      }
      continue;
    }
    const bashScaledRawDamage = mir4NativeBashScaledRawDamage(
      ctx,
      source,
      target,
      impact.skillId,
      impact.skillLevel,
      impact.rawDamage,
      impact.attackId,
    );
    const soaringSlashConditionalDamageBps =
      impact.skillId === 3203
        ? mir4NativeSoaringSlashConditionalDamageBasisPoints(target, impact.skillLevel ?? 1)
        : 0;
    const illusionArrowMonsterDamageBps = mir4NativeIllusionArrowMonsterDamageBasisPoints(
      impact.skillId,
      target,
      impact.skillLevel,
    );
    const burstShellMonsterDamageBps = mir4NativeBurstShellMonsterDamageBasisPoints(
      impact.skillId,
      target,
      impact.skillLevel,
    );
    const iceCageDarknessDamageBps = mir4NativeIceCageDarknessDamageBasisPoints(
      impact.skillId,
      target,
      impact.skillLevel,
    );
    const obliterateShellConditionalDamageBps =
      mir4NativeObliterateShellConditionalDamageBasisPoints(
        ctx,
        target,
        impact.skillId,
        impact.skillLevel,
      );
    const crescentBladeConditionalDamageBps =
      impact.skillId === 5101
        ? mir4NativeCrescentBladeConditionalDamageBasisPoints(target, impact.skillLevel ?? 1)
        : 10_000;
    const doubleStrikeConditionalDamageBps =
      impact.skillId === 5301
        ? mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, impact.skillLevel ?? 1)
        : 10_000;
    const crushingBlowConditionalDamageBps = mir4NativeCrushingBlowConditionalDamageBasisPoints(
      ctx,
      target,
      impact.skillId,
      impact.skillLevel ?? 1,
    );
    const dragonTailMonsterDamageBps =
      impact.skillId === 5102
        ? mir4NativeDragonTailMonsterDamageBasisPoints(target, impact.skillLevel ?? 1)
        : 10_000;
    const bashAndSoaringDamage = Math.floor(
      (bashScaledRawDamage * (10_000 + soaringSlashConditionalDamageBps)) / 10_000,
    );
    const illusionArrowDamage = Math.floor(
      (bashAndSoaringDamage * illusionArrowMonsterDamageBps) / 10_000,
    );
    const burstShellDamage = Math.floor(
      (illusionArrowDamage * burstShellMonsterDamageBps) / 10_000,
    );
    const iceCageDamage = Math.floor((burstShellDamage * iceCageDarknessDamageBps) / 10_000);
    const obliterateShellDamage = Math.floor(
      (iceCageDamage * obliterateShellConditionalDamageBps) / 10_000,
    );
    const crescentBladeDamage = Math.floor(
      (obliterateShellDamage * crescentBladeConditionalDamageBps) / 10_000,
    );
    const doubleStrikeDamage = Math.floor(
      (crescentBladeDamage * doubleStrikeConditionalDamageBps) / 10_000,
    );
    const crushingBlowDamage = Math.floor(
      (doubleStrikeDamage * crushingBlowConditionalDamageBps) / 10_000,
    );
    const dragonTailDamage = Math.floor((crushingBlowDamage * dragonTailMonsterDamageBps) / 10_000);
    const raw = Math.floor(
      dragonTailDamage *
        mir4AttackMultiplier(source, impact.channel) *
        (1 + mir4DamageTakenAddend(target)),
    );
    const hitRoll = impact.forceHit === undefined ? rollBps(ctx) : impact.forceHit ? 0 : 9_999;
    const criticalRoll =
      impact.forceCritical === undefined ? rollBps(ctx) : impact.forceCritical ? 0 : 9_999;
    const spiritDamage = resolveMir4PlayerDamageWithSpirit(ctx, source, target, {
      rawDamage: raw,
      channel: impact.channel,
      attacker: impact.nativeTotem
        ? mir4NativeTotemAttackerStats(mir4AttackerStats(ctx, source), impact.nativeTotem)
        : mir4AttackerStats(ctx, source),
      defender: mir4DefenderStats(ctx, target),
      targetKind: mir4TargetKind(ctx, target),
      attackKind: impact.attackKind,
      hitRoll,
      criticalRoll,
      ...(impact.nativeTotem ? (mir4NativeTotemDamageOverrides(impact.nativeTotem) ?? {}) : {}),
      allowSpiritProc: impact.spiritProcEligible === true && impact.spiritProcAttempted !== true,
      buildBalance: {
        attackerLevel: source.level,
        defenderLevel: target.level,
      },
      forceHit: impact.forceHit,
      forceCritical: impact.forceCritical,
    });
    if (spiritDamage.attempted) {
      patchMir4ActionGroup(owner, due, impact.actionGroupId, {
        spiritProcAttempted: true,
      });
    }
    const resolved = spiritDamage.resolved;
    if (!resolved.hit) continue;
    const ownsNativeContactEffects =
      impact.nativeContactKey === undefined ||
      !resolvedNativeContactEffects.has(impact.nativeContactKey);
    if (impact.nativeContactKey) resolvedNativeContactEffects.add(impact.nativeContactKey);
    patchMir4ActionGroup(owner, due, impact.actionGroupId, {
      actionLanded: true,
    });
    const nativeAggro =
      impact.skillId === undefined || impact.attackId === undefined
        ? null
        : mir4NativeRuntimeAggroPolicy(impact.skillId, impact.attackId);
    const nativeAggroRate =
      impact.nativeTotemCombat?.aggroRate ?? nativeAggro?.nativeRateBasisPoints;
    const resolvedDamage = Math.floor(
      (resolved.damage *
        mir4NativeIllusionArrowCriticalDamageBasisPoints(
          impact.skillId,
          resolved.critical,
          impact.skillLevel,
        )) /
        10_000,
    );
    const zeroDamageFlashArrowPulse =
      impact.skillId === 4107 &&
      impact.attackId !== undefined &&
      impact.attackId >= 410711 &&
      impact.attackId <= 410716;
    const landedDamage = zeroDamageFlashArrowPulse
      ? 0
      : ctx.dealDamage(
          source,
          target,
          resolvedDamage,
          resolved.critical,
          impact.channel,
          impact.name,
          'hit',
          true,
          nativeAggroRate !== undefined
            ? {
                mult: 0,
                preserveSourceStealth: impact.nativeTotem !== undefined,
              }
            : impact.nativeTotem
              ? { preserveSourceStealth: true }
              : undefined,
          !impact.periodic,
          impact.attackAnimationStarted === true || impact.attackKind !== 'skill',
        );
    if (ownsNativeContactEffects && impact.skillId === 5304 && impact.attackId === 530401) {
      applyMir4NativeAbsorptionContact(
        ctx,
        source,
        target,
        impact.attackId,
        impact.sourceImpactIndex ?? -1,
        impact.skillLevel ?? 1,
        landedDamage,
        () => rollBps(ctx),
      );
    }
    if (ownsNativeContactEffects && impact.skillId === 4108 && impact.attackId === 410802) {
      applyMir4NativeHeavenlyBowReload(
        ctx,
        source,
        target,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
    }
    if (ownsNativeContactEffects && impact.skillId === 4102 && impact.attackId === 410202) {
      applyMir4NativeIllusionArrowEvasion(ctx, source, impact.attackId, impact.skillLevel ?? 1);
    }
    if (
      ownsNativeContactEffects &&
      !target.dead &&
      impact.skillId !== undefined &&
      impact.attackId !== undefined
    ) {
      const nativeSmiteDebuff = mir4NativeRuntimeSmiteDebuff(
        impact.skillId,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
      if (nativeSmiteDebuff) {
        applyMir4NativeSkillSmiteDebuff(ctx, source, target, nativeSmiteDebuff);
      }
      const nativeSmiteDefenseDebuff = mir4NativeRuntimeSmiteDefenseDebuff(
        impact.skillId,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
      if (nativeSmiteDefenseDebuff) {
        applyMir4NativeSkillSmiteDefenseDebuff(ctx, source, target, nativeSmiteDefenseDebuff);
      }
      const nativeQuellDebuff = mir4NativeRuntimeQuellDebuff(
        impact.skillId,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
      if (nativeQuellDebuff) {
        applyMir4NativeSkillQuellDebuff(ctx, source, target, nativeQuellDebuff);
      }
      const nativeChillDebuff = mir4NativeRuntimeChillDebuff(
        impact.skillId,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
      if (nativeChillDebuff) {
        applyMir4NativeSkillChillDebuff(ctx, source, target, nativeChillDebuff);
      }
      const nativeLionRoarDebuff = mir4NativeRuntimeLionRoarDebuff(
        impact.skillId,
        impact.attackId,
        impact.skillLevel ?? 1,
      );
      if (nativeLionRoarDebuff) {
        applyMir4NativeLionRoarDebuff(ctx, source, target, nativeLionRoarDebuff);
      }
      if (impact.skillId === 3101 && impact.attackId === 310102) {
        applyMir4NativeSunbeamSwordSpecialContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3103 && impact.attackId === 310302) {
        applyMir4NativePiercingBladesSpecialContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 4106 && impact.attackId === 410602) {
        applyMir4NativePainstrikeGaleContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 4103 && impact.attackId === 410311) {
        applyMir4NativeBurstShellContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
          mir4PhysicalAttackPower(source),
        );
      }
      if (impact.skillId === 4105 && impact.attackId === 410502) {
        applyMir4NativeIceCageDirectContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 4104 && impact.attackId === 410403) {
        applyMir4NativeVenomMistShellDirectContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 4110 && impact.attackId === 411002) {
        applyMir4NativeSeekingBoltDirectContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
          resolved.critical,
        );
      }
      if (impact.skillId === 4109 && impact.attackId === 410902) {
        applyMir4NativeObliterateShellKnockdown(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
          target.kind === 'player' || target.ownerId !== null ? rollBps(ctx) : 0,
        );
      }
      if (impact.skillId === 5101 && impact.attackId === 510102) {
        applyMir4NativeCrescentBladeFinalContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          () => rollBps(ctx),
        );
      }
      if (impact.skillId === 5104 && impact.attackId === 510402) {
        applyMir4NativeNirvanaKickFinalContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          mir4PhysicalAttackPower(source),
          () => rollBps(ctx),
        );
      }
      if (impact.skillId === 5202 && impact.attackId === 520202) {
        applyMir4NativeBlitzStrikeFinalContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          mir4PhysicalAttackPower(source),
          () => rollBps(ctx),
        );
      }
      if (impact.skillId === 5303 && impact.attackId === 530303) {
        applyMir4NativeCrushingBlowFinalContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          () => rollBps(ctx),
        );
      }
      if (impact.skillId === 5205 && (impact.attackId === 520502 || impact.attackId === 520503)) {
        applyMir4NativePiercingSpearContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          () => rollBps(ctx),
        );
      }
      if (impact.skillId === 5103 && impact.attackId === 510302 && impact.channel === 'physical') {
        applyMir4NativeAscendingDragonContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          () => rollBps(ctx),
        );
      }
      if (
        impact.skillId === 4107 &&
        impact.attackId !== undefined &&
        (impact.attackId === 410702 || (impact.attackId >= 410711 && impact.attackId <= 410716))
      ) {
        applyMir4NativeFlashArrowContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3301 && impact.attackId === 330102) {
        applyMir4NativeMoonlightOrbSpecialContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3104 && impact.attackId === 310402) {
        applyMir4NativeRainOfBladesSpecialContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          resolved.critical,
        );
      }
      if (impact.skillId === 3201 && impact.attackId === 320102) {
        applyMir4NativeTaiChiSpecialContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3201 && impact.attackId === 320106) {
        applyMir4NativeTaiChiFinalContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3505 && impact.attackId === 350502) {
        applyMir4NativeBlastingCharmContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 5401 && (impact.attackId === 540102 || impact.attackId === 540103)) {
        applyMir4NativeSweepingStormContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 5102 && impact.attackId === 510202) {
        applyMir4NativeDragonTailContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
        );
      }
      if (impact.skillId === 3203) {
        applyMir4NativeSoaringSlashContact(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          impact.skillLevel ?? 1,
          resolved.critical,
        );
      }
      if (impact.skillId === 1201) {
        // Both native special rows are deterministic (BUFF probabilities 1000/1000),
        // so this path must not perturb the shared combat RNG stream.
        applyMir4NativeIronShackleImpactEffects(
          ctx,
          source,
          target,
          impact.skillId,
          impact.attackId,
          impact.skillLevel ?? 1,
          0,
        );
      }
      if (impact.skillId === 1301 && impact.attackId === 130102) {
        const skillLevel = impact.skillLevel ?? 1;
        if (target.kind === 'player') {
          const landed = applyMir4NativeRipostePlayerKnockdown(
            ctx,
            source,
            target,
            skillLevel,
            rollBps(ctx),
          );
          if (landed) {
            const actionGroup = impact.actionGroupId ?? `${source.id}:skill:1301`;
            const separator = actionGroup.lastIndexOf(':');
            const castKey = separator < 0 ? actionGroup : actionGroup.slice(0, separator);
            const recovery = ripostePlayerKnockdowns.get(castKey) ?? {
              source,
              skillLevel,
              successfulTargets: 0,
            };
            recovery.successfulTargets += 1;
            ripostePlayerKnockdowns.set(castKey, recovery);
          }
        } else {
          applyMir4NativeRiposteMonsterKnockdown(ctx, source, target, skillLevel);
        }
      }
      if (impact.skillId === 1403 && impact.attackId === 140304) {
        applyMir4NativePeriodicDamage(ctx, source, target, {
          buffId: 14_011,
          skillId: impact.skillId,
          attackId: impact.attackId,
          skillLevel: impact.skillLevel ?? 1,
          sourcePhysicalAttack: mir4PhysicalAttackPower(source),
        });
      }
      if (impact.skillId === 2103 && impact.attackId === 210302) {
        applyMir4NativePeriodicDamage(ctx, source, target, {
          buffId: 20_012,
          skillId: impact.skillId,
          attackId: impact.attackId,
          skillLevel: impact.skillLevel ?? 1,
          sourceSpellAttack: mir4EffectiveSpellPower(source, ctx),
        });
      }
    }
    if (
      nativeAggroRate !== undefined &&
      impact.skillId !== undefined &&
      impact.attackId !== undefined &&
      target.kind === 'mob' &&
      target.hostile &&
      source.id !== target.id &&
      (source.kind === 'player' || source.ownerId !== null)
    ) {
      const nativeThreat = impact.nativeTotemCombat
        ? mir4NativeAggroThreatFromRate(landedDamage, nativeAggroRate)
        : mir4NativeRuntimeAggroThreat(impact.skillId, impact.attackId, landedDamage);
      if (nativeThreat !== null) addThreat(target, source.id, nativeThreat);
    }
    if (
      ownsNativeContactEffects &&
      !target.dead &&
      impact.skillId !== undefined &&
      impact.attackId !== undefined
    ) {
      const ultimateReactionHandled = applyMir4NativeUltimateReaction(
        ctx,
        source,
        target,
        impact.skillId,
        impact.attackId,
        impact.sourceImpactIndex ?? -1,
      );
      const pushToPoint = ultimateReactionHandled
        ? null
        : mir4NativeRuntimePushToPointReaction(impact.skillId, impact.attackId);
      const pushSuperState = mir4NativeRuntimeSuperState(impact.skillId, impact.attackId);
      if (pushToPoint && pushSuperState) {
        const pushChance = mir4NativeControlAdmissionBasisPoints(
          pushSuperState,
          mir4ActiveSkillSuperArmorNative(ctx, target),
        );
        const pushLands = pushChance > 0 && rollBps(ctx) < pushChance;
        if (pushLands) {
          applyMir4NativePushToPointReaction(
            ctx,
            source,
            target,
            impact.skillId,
            impact.attackId,
            pushToPoint,
          );
        }
      }
      const knockback =
        ultimateReactionHandled || (impact.skillId === 5103 && impact.channel === 'magic')
          ? null
          : mir4NativeRuntimeKnockbackReaction(impact.skillId, impact.attackId);
      if (knockback) {
        applyMir4NativeKnockbackReaction(
          ctx,
          source,
          target,
          impact.skillId,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          knockback,
        );
      }
      const attackBack = ultimateReactionHandled
        ? null
        : mir4NativeRuntimeAttackBackReaction(impact.skillId, impact.attackId);
      if (attackBack) {
        applyMir4NativeAttackBackReaction(
          ctx,
          source,
          target,
          impact.skillId,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
          attackBack,
        );
      }
      const reaction = ultimateReactionHandled
        ? null
        : mir4NativeRuntimeHitReaction(impact.skillId, impact.attackId);
      if (reaction) {
        applyMir4NativeHitReaction(ctx, target, {
          sourceId: source.id,
          skillId: impact.skillId,
          attackId: impact.attackId,
          ...reaction,
        });
      }
      if (!ultimateReactionHandled && impact.skillId === 5102) {
        applyMir4NativeDragonTailHitReaction(
          ctx,
          source,
          target,
          impact.attackId,
          impact.sourceImpactIndex ?? -1,
        );
      }
      if (impact.nativeTotem) {
        const totemPlan = mir4NativeRuntimeTotemPlan(impact.skillId);
        const totemContact = totemPlan?.contacts.find(
          (contact) => contact.attackId === impact.attackId,
        );
        if (totemContact && totemPlan?.totemId === impact.nativeTotem.totemId) {
          applyMir4NativeTotemReaction(
            ctx,
            source,
            target,
            impact.skillId,
            impact.name,
            impact.nativeTotem.origin,
            totemContact,
          );
        }
      }
    }
    if (!impact.periodic) applyMir4Drain(source, target, landedDamage);
    if (ownsNativeContactEffects && impact.gaugeGain > 0) {
      source.mir4UltGauge = Math.min(100, (source.mir4UltGauge ?? 0) + impact.gaugeGain);
    }
    if (
      ownsNativeContactEffects &&
      !target.dead &&
      target.kind === 'player' &&
      impact.skillId !== undefined &&
      impact.attackId !== undefined
    ) {
      const targetRage = impact.nativeTotemCombat
        ? mir4NativeResolveHitRageGainFromPoints(impact.nativeTotemCombat.hitRagePoint)
        : mir4NativeResolveHitRageGain(impact.skillId, impact.attackId);
      if (targetRage) {
        target.mir4UltGauge = Math.min(100, (target.mir4UltGauge ?? 0) + targetRage.gaugePercent);
      }
    }
  }
  for (const recovery of ripostePlayerKnockdowns.values()) {
    applyMir4NativeRipostePlayerKnockdownRecovery(
      recovery.source,
      recovery.skillLevel,
      recovery.successfulTargets,
    );
  }
}

function actionGroupForDynamicTarget(
  actionGroupId: string | undefined,
  targetId: number,
): string | undefined {
  if (!actionGroupId) return undefined;
  const separator = actionGroupId.lastIndexOf(':');
  if (separator < 0) return actionGroupId;
  return `${actionGroupId.slice(0, separator + 1)}${targetId}`;
}

function nativeContactKeyForDynamicTarget(
  nativeContactKey: string | undefined,
  targetId: number,
): string | undefined {
  return nativeContactKey === undefined ? undefined : `${nativeContactKey}:target:${targetId}`;
}

function expandMir4NativeImpactTargets(
  ctx: SimContext,
  impact: Mir4PendingImpact,
): Mir4PendingImpact[] {
  if (impact.skillId === undefined || impact.attackId === undefined) return [impact];
  if (
    impact.nativeSetup === 'magic-shield-source-buff' ||
    impact.nativeSetup === 'frozen-block-source-buff' ||
    impact.nativeSetup === 'phoenix-embrace-source-buff' ||
    impact.nativeSetup === 'arbalist-focus' ||
    impact.nativeSetup === 'arbalist-seeking-bolt-immunity' ||
    impact.nativeSetup === 'arbalist-illusion-arrow-source-buffs' ||
    impact.nativeSetup === 'arbalist-painstrike-source-buffs' ||
    impact.nativeSetup === 'arbalist-cloaking' ||
    impact.nativeSetup === 'lancer-crushing-blow-invincibility' ||
    impact.nativeSetup === 'lancer-crushing-blow-rank-buffs' ||
    isMir4NativeWindWallSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeMindsEyeSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeHealSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeGreaterHealSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeGuardianCircleSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeExpulsionCircleSetup(impact.skillId, impact.nativeSetup) ||
    isMir4NativeTaiChiSetup(impact.skillId, impact.nativeSetup)
  )
    return [impact];
  const source = ctx.entities.get(impact.sourceId);
  if (!source || source.dead) return [];
  if (impact.nativeTotem) {
    if (impact.dueAt > impact.nativeTotem.expiresAt + CAST_COMPLETE_EPS) return [];
    const plan = mir4NativeRuntimeTotemPlan(impact.skillId);
    const contact = plan?.contacts.find((candidate) => candidate.attackId === impact.attackId);
    if (!plan || !contact || plan.totemId !== impact.nativeTotem.totemId) return [];
    return mir4NativeTotemContactTargets(ctx, source, impact.nativeTotem.origin, contact).map(
      (target) => ({
        ...impact,
        targetId: target.id,
        actionGroupId: actionGroupForDynamicTarget(impact.actionGroupId, target.id),
        nativeContactKey: nativeContactKeyForDynamicTarget(impact.nativeContactKey, target.id),
        spiritProcEligible: false,
      }),
    );
  }
  const anchor = ctx.entities.get(impact.targetId);
  const targets = mir4NativeApprovedImpactTargets(
    ctx,
    source,
    impact.skillId,
    impact.attackId,
    anchor,
  );
  if (targets === null) return [impact];
  return targets.map((target) => ({
    ...impact,
    targetId: target.id,
    actionGroupId: actionGroupForDynamicTarget(impact.actionGroupId, target.id),
    nativeContactKey: nativeContactKeyForDynamicTarget(impact.nativeContactKey, target.id),
    // Existing Aeldrune area policy grants the one-shot spirit attempt only
    // to the originally selected primary. Native spirit/passive routing is a
    // separate unresolved slice and must not be invented here.
    spiritProcEligible: target.id === impact.targetId ? impact.spiritProcEligible : false,
  }));
}

function resolveMir4SkillActionImmediately(
  ctx: SimContext,
  source: Entity,
  actionPrefix: string,
): void {
  const pending = source.mir4PendingImpacts ?? [];
  const groupPrefix = `${actionPrefix}:`;
  const immediate = pending.filter(
    (impact) =>
      impact.attackKind === 'skill' && impact.actionGroupId?.startsWith(groupPrefix) === true,
  );
  if (immediate.length === 0) return;
  const immediateSet = new Set(immediate);
  source.mir4PendingImpacts = pending.filter((impact) => !immediateSet.has(impact));
  resolveMir4PendingImpactBatch(ctx, source, immediate);
}

/** Drain the due authored-offset impacts; rolls are drawn HERE (source clock). */
export function updateMir4PendingImpacts(ctx: SimContext): void {
  for (const owner of ctx.entities.values()) {
    const pending = owner.mir4PendingImpacts;
    if (!pending || pending.length === 0) continue;
    const due = pending.filter((impact) => impact.dueAt <= ctx.time + CAST_COMPLETE_EPS);
    if (due.length === 0) continue;
    // Use the same epsilon boundary as the due selection. Otherwise a contact
    // admitted a fraction before its decimal timestamp remains queued and is
    // applied again on the following tick.
    owner.mir4PendingImpacts = pending.filter(
      (impact) => impact.dueAt > ctx.time + CAST_COMPLETE_EPS,
    );
    resolveMir4PendingImpactBatch(
      ctx,
      owner,
      due.flatMap((impact) => expandMir4NativeImpactTargets(ctx, impact)),
    );
  }
}

/** The PlayerMeta fields the XP grant reads (structural, no sim.ts cycle). */
interface Mir4XpTarget {
  entityId: number;
  xp: number;
  counters: { xpGained: number; levelUps: number };
  known: import('../sim').ResolvedAbility[];
  mir4SkillLevels?: Record<number, number>;
  mir4Equipment?: { weapon?: number };
  mir4EquipmentInstances?: Record<number, unknown>;
  mir4Mounts?: import('./mounts').Mir4MountState;
  mir4Spirits?: import('./spirits').Mir4SpiritState;
  mir4Codex?: import('./codex').Mir4CodexState;
  mir4ArcRewards?: { items?: Record<string, number> };
  mir4Training?: import('./training').Mir4TrainingState;
}

/**
 * Kill/quest XP under the mir4 profile: flat mob rewards through the ported
 * level table (BigInt-safe reqExp), replacing the classic XP_TABLE loop.
 * Called from the shared grantXp funnel when the profile is mir4.
 */
export function grantMir4Xp(
  ctx: SimContext,
  amount: number,
  meta: Mir4XpTarget,
  source: 'hunting' | 'reward' = 'reward',
): void {
  const p = ctx.entities.get(meta.entityId);
  if (!p || amount <= 0) return;
  amount = mir4ModifiedProgressionReward(
    amount,
    source === 'hunting' ? 'hunting-xp' : 'reward-xp',
    p.mir4?.statusValues,
  );
  meta.counters.xpGained += amount;
  const result = advanceMir4Experience(p.level, meta.xp, amount);
  meta.xp = result.xp;
  if (result.levelUps > 0) {
    const knownBeforeLevelUp = new Set(meta.known.map((ability) => ability.def.id));
    p.level = result.level;
    recalcMir4PlayerStats(
      p,
      mir4RecalcClassOf(p),
      result.level,
      meta.mir4Equipment,
      meta.mir4EquipmentInstances,
      meta.mir4Spirits,
      meta.mir4Mounts,
      meta.mir4Codex,
      meta.mir4ArcRewards?.items,
      meta.mir4Training,
    );
    refreshMir4KnownAbilities(p, meta);
    meta.counters.levelUps += result.levelUps;
    ctx.emit({ type: 'levelup', level: p.level, pid: p.id });
    for (const ability of meta.known) {
      if (knownBeforeLevelUp.has(ability.def.id)) continue;
      ctx.emit({
        type: 'learnAbility',
        abilityId: ability.def.id,
        rank: ability.rank,
        pid: p.id,
      });
    }
  }
  ctx.emit({ type: 'xp', amount, pid: p.id });
}

/** Apply the official per-ten-second HP and MP recovery statuses. */
export function updateMir4Regeneration(ctx: SimContext): void {
  if (ctx.tickCount <= 0 || ctx.tickCount % 200 !== 0) return;
  for (const player of ctx.entities.values()) {
    if (player.kind !== 'player' || player.dead || !player.mir4) continue;
    const recovery = mir4RecoveryPerTenSeconds(
      player.maxHp,
      player.maxResource,
      player.mir4.statusValues,
    );
    if (recovery.hp > 0) player.hp = Math.min(player.maxHp, player.hp + recovery.hp);
    if (recovery.mp > 0) {
      player.resource = Math.min(player.maxResource, player.resource + recovery.mp);
    }
  }
}

/**
 * The mob->player attack under the mir4 profile (3.7): the mob's raw attack
 * cut by any blind it carries, then the full bps pipeline against the
 * PLAYER's own defenses — hit, crit, the player-target contextual lane, and
 * the 100/(100+def) mitigation — with the magic shield's magnitude shaving
 * what lands. Draw order: hit, then crit.
 */
export function mir4MobAttackPlayer(ctx: SimContext, mob: Entity, player: Entity): void {
  if (mob.dead || player.dead) return;
  // The classic shell materializes weapon.min = round(dmg*0.8), a variance the
  // source spawn formula does not have: read the mir4 template's own dmg
  // columns back, falling back to the weapon for unknown templates.
  const template = resolveMobTemplate(mob.templateId, ctx.mir4RuntimeMobTemplates);
  const baseAttack = template
    ? template.dmgBase + template.dmgPerLevel * (mob.level - (template.statAnchorLevel ?? 1))
    : mob.weapon.min;
  const raw = Math.max(
    1,
    Math.floor(
      Math.max(0, baseAttack - mir4PhysicalAttackFlatReduction(mob)) *
        mir4AttackMultiplier(mob, 'physical'),
    ),
  );
  const resolved = mir4ResolveDamage({
    rawDamage: raw,
    channel: 'physical',
    attacker: {
      accuracy: mir4MobAccuracy(mob.level),
      critical: 0,
      criticalOutcome: 10,
    },
    defender: mir4DefenderStats(ctx, player),
    targetKind: mob.mobBoss ? 'boss' : 'monster',
    attackKind: 'basic',
    hitRoll: rollBps(ctx),
    criticalRoll: rollBps(ctx),
    buildBalance: { attackerLevel: mob.level, defenderLevel: player.level },
  });
  ctx.dealDamage(mob, player, resolved.damage, resolved.critical, 'physical', null, 'hit', false);
}
