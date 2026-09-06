import type {
  Mir4NativeRawCoefficientChannel,
  Mir4NativeSkillAttackRow,
} from '../content/mir4/native_skill_action_types';
import { mir4NativeRuntimeActivationRangePolicy } from './native_skill_activation_range';
import { mir4NativeRuntimeAggroPolicy } from './native_skill_aggro';
import { mir4NativeAscendingDragonDamageSummaryMatches } from './native_skill_ascending_dragon';
import { mir4NativeSkillAssetPresentationEvidence } from './native_skill_asset_presentation';
import {
  mir4NativeAttackBackReactionMatchesRow,
  mir4NativeRuntimeAttackBackReaction,
} from './native_skill_attack_back';
import { mir4NativeRuntimeAttackUseTypePolicy } from './native_skill_attack_use_type';
import { mir4NativeBerserkImpactBuffsMatchRow } from './native_skill_berserk';
import { mir4NativeBlitzStrikeSourceMatches } from './native_skill_blitz_strike';
import { mir4NativeRuntimeImpactOffsets } from './native_skill_blizzard_timing';
import { mir4NativeChainLightningPolicy } from './native_skill_chain_lightning';
import { mir4NativeCloakingFocusBuffMatchesRow } from './native_skill_cloaking';
import {
  mir4NativeCrowdControlReactionMatchesRow,
  mir4NativeRuntimeCrowdControlReaction,
} from './native_skill_crowd_control';
import { mir4NativeCrushingBlowBuffsMatchRow } from './native_skill_crushing_blow';
import { mir4NativeRuntimeDamageSummary } from './native_skill_damage_summary';
import {
  mir4NativeDragonTailDamageSummaryMatches,
  mir4NativeDragonTailHitReaction,
} from './native_skill_dragon_tail';
import { mir4NativeExpulsionCircleBuffsMatchRow } from './native_skill_expulsion_circle';
import { mir4NativeFlashArrowBuffsMatchRow } from './native_skill_flash_arrow';
import { mir4NativeFrozenBlockBuffMatchesRow } from './native_skill_frozen_block';
import { mir4NativeGreaterHealBuffsMatchRow } from './native_skill_greater_heal';
import { mir4NativeGuardianCircleBuffsMatchRow } from './native_skill_guardian_circle';
import { mir4NativeRuntimeGuidePolicy } from './native_skill_guide';
import { mir4NativeHealBuffsMatchRow } from './native_skill_heal';
import { mir4NativeHeavenlyBowFocusBuffMatchesRow } from './native_skill_heavenly_bow';
import { mir4NativeRuntimeHitReaction } from './native_skill_hit_reaction';
import { mir4NativeIceCageFocusBuffMatchesRow } from './native_skill_ice_cage';
import { mir4NativeIllusionArrowBuffsMatchRow } from './native_skill_illusion_arrow';
import {
  mir4NativeImmolatePeriodicBuffMatchesRow,
  mir4NativeRuntimeImmolatePolicy,
} from './native_skill_immolate';
import { mir4NativeExpectedIndicator } from './native_skill_indicator';
import {
  mir4NativeInertReactionMatchesRow,
  mir4NativeRuntimeInertReaction,
} from './native_skill_inert_reaction';
import {
  mir4NativeKnockbackReactionMatchesRow,
  mir4NativeRuntimeKnockbackReaction,
} from './native_skill_knockback';
import { mir4NativeLionRoarDebuffMatchesRow } from './native_skill_lion_roar_debuff';
import { mir4NativeMagicShieldBuffMatchesRow } from './native_skill_magic_shield';
import { mir4NativeMindsEyeBuffsMatchRow } from './native_skill_minds_eye';
import { mir4NativeRuntimeMultiImpactPolicy } from './native_skill_multi_impact';
import { mir4NativeNirvanaKickAutoCondition } from './native_skill_nirvana_kick';
import { mir4NativeObliterateShellFocusBuffMatchesRow } from './native_skill_obliterate_shell';
import { mir4NativePainstrikeGaleBuffsMatchRow } from './native_skill_painstrike_gale';
import { mir4NativeGeneratedPassiveEligibility } from './native_skill_passive_eligibility';
import {
  mir4NativePhoenixEmbraceBuffMatchesRow,
  mir4NativeRuntimePhoenixEmbracePolicy,
} from './native_skill_phoenix_embrace';
import { mir4NativeRuntimeProjectilePolicy } from './native_skill_projectile';
import {
  mir4NativePushToPointReactionMatchesRow,
  mir4NativeRuntimePushToPointReaction,
} from './native_skill_push_to_point';
import {
  mir4NativeBurstShellFocusBuffMatchesRow,
  mir4NativeQuickShotBuffMatchesRow,
} from './native_skill_quick_shot';
import {
  mir4NativeRuntimeAttackRageGain,
  mir4NativeRuntimeAttackRagePolicy,
  mir4NativeRuntimeHitRagePolicy,
} from './native_skill_rage';
import { mir4NativeRiposteSetupBuffsMatchRow } from './native_skill_riposte';
import {
  compileMir4NativeRuntimeSkillEffect,
  mir4NativeRuntimeSkillEffect,
} from './native_skill_runtime_effect';
import {
  mir4NativeSeekingBoltFocusBuffMatchesRow,
  mir4NativeSeekingBoltSetupBuffsMatchRow,
} from './native_skill_seeking_bolt';
import { mir4NativeSoaringSlashDamageSummaryMatches } from './native_skill_soaring_slash';
import {
  mir4NativeRuntimeSkillPresentationFacets,
  mir4NativeRuntimeSkillSourceFacets,
} from './native_skill_source_facets';
import { mir4NativeRuntimeStateConditionPolicy } from './native_skill_state_condition';
import { mir4NativeExpectedSuperState } from './native_skill_super_state';
import { mir4NativeSweepingStormDamageSummaryMatches } from './native_skill_sweeping_storm';
import {
  mir4NativeTaiChiBuffMatchesRow,
  mir4NativeTaiChiDamageSummaryMatches,
} from './native_skill_tai_chi';
import { mir4NativeRuntimeTargetingMatches } from './native_skill_targeting';
import { mir4NativeRuntimeTotemPlan } from './native_skill_totem_runtime';
import { mir4NativeUnbreakableStanceImpactBuffsMatchRow } from './native_skill_unbreakable_stance';
import {
  mir4NativeRuntimeUninterruptibleBuff,
  mir4NativeSourceUninterruptibleBuffMatchesRow,
} from './native_skill_uninterruptible';
import { mir4NativeVenomMistShellFocusBuffMatchesRow } from './native_skill_venom_mist_shell';
import type {
  Mir4SkillExecutionContactPlan,
  Mir4SkillExecutionDamageAllocation,
  Mir4SkillExecutionIssue,
  Mir4SkillExecutionIssueCode,
  Mir4SkillExecutionIssueValue,
  Mir4SkillExecutionPlan,
  Mir4SkillExecutionPlanInput,
  Mir4SkillExecutionPlanResult,
  Mir4SkillExecutionRowPlan,
} from './skill_execution_types';

interface MutableIssue extends Mir4SkillExecutionIssue {}

interface IssueDetails {
  readonly attackId?: number;
  readonly relatedAttackId?: number;
  readonly expected?: Mir4SkillExecutionIssueValue;
  readonly actual?: Mir4SkillExecutionIssueValue;
}

function addIssue(
  issues: MutableIssue[],
  code: Mir4SkillExecutionIssueCode,
  path: string,
  details: IssueDetails = {},
): void {
  issues.push({ code, path, ...details });
}

function fail(issues: readonly MutableIssue[]): Mir4SkillExecutionPlanResult {
  const frozenIssues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
  return Object.freeze({ ok: false as const, issues: frozenIssues });
}

function validFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validFiniteInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

function issueNumber(value: number): number | string {
  return Number.isFinite(value) ? value : String(value);
}

function channelHasValue(channel: Mir4NativeRawCoefficientChannel): boolean {
  return (
    channel.coefficient !== 0 ||
    channel.levelUpCoefficient !== 0 ||
    channel.additive !== 0 ||
    channel.levelUpAdditive !== 0
  );
}

function channelHasAdditive(channel: Mir4NativeRawCoefficientChannel): boolean {
  return channel.additive !== 0 || channel.levelUpAdditive !== 0;
}

type RuntimeApprovedSkill = Extract<
  Mir4SkillExecutionPlanInput,
  { source: 'runtime-approved' }
>['skill'];

function runtimeDamageComponentsForAttack(
  skill: RuntimeApprovedSkill,
  attackId: number,
): readonly NonNullable<RuntimeApprovedSkill['damage']>['components'][number][] {
  return skill.damage?.components.filter((component) => component.attackId === attackId) ?? [];
}

function exactRuntimeDualDamageRow(
  skill: RuntimeApprovedSkill,
  row: Mir4NativeSkillAttackRow,
): boolean {
  const behavior = row.nativeBehavior;
  if (
    !channelHasValue(behavior.physicalDamage) ||
    !channelHasValue(behavior.magicDamage) ||
    channelHasAdditive(behavior.physicalDamage) ||
    channelHasAdditive(behavior.magicDamage)
  ) {
    return false;
  }
  const components = runtimeDamageComponentsForAttack(skill, row.attackId);
  if (components.length !== 2) return false;
  const physical = components.find((component) => component.damageType === 1);
  const magic = components.find((component) => component.damageType === 2);
  const expectedImpactCount = row.impactOffsetsMs.length;
  return (
    physical?.damageAttribute === behavior.damageAttribute &&
    physical.coefficient === behavior.physicalDamage.coefficient &&
    physical.levelUpCoefficient === behavior.physicalDamage.levelUpCoefficient &&
    physical.impactCount === expectedImpactCount &&
    magic?.damageAttribute === behavior.damageAttribute &&
    magic.coefficient === behavior.magicDamage.coefficient &&
    magic.levelUpCoefficient === behavior.magicDamage.levelUpCoefficient &&
    magic.impactCount === expectedImpactCount
  );
}

function rowHasDamage(row: Mir4NativeSkillAttackRow): boolean {
  return row.damage.coefficient !== 0 || row.damage.levelUpCoefficient !== 0;
}

function isExactTotemSetupDamageAttribute(skillId: number, row: Mir4NativeSkillAttackRow): boolean {
  const totem = mir4NativeRuntimeTotemPlan(skillId);
  return (
    totem !== null &&
    totem.spawnAttackId === row.attackId &&
    !rowHasDamage(row) &&
    row.nativeBehavior.damageType === 0 &&
    row.damage.type === 0 &&
    row.nativeBehavior.damageAttribute === row.damage.attribute
  );
}

function validateScalar(
  issues: MutableIssue[],
  path: string,
  value: number,
  source: 'native' | 'runtime',
  attackId?: number,
): void {
  if (validFiniteNonNegative(value)) return;
  addIssue(issues, source === 'native' ? 'invalid-native-value' : 'invalid-runtime-value', path, {
    ...(attackId === undefined ? {} : { attackId }),
    actual: issueNumber(value),
  });
}

function validateFiniteValue(
  issues: MutableIssue[],
  path: string,
  value: number,
  source: 'native' | 'runtime',
  attackId?: number,
): void {
  if (Number.isFinite(value)) return;
  addIssue(issues, source === 'native' ? 'invalid-native-value' : 'invalid-runtime-value', path, {
    ...(attackId === undefined ? {} : { attackId }),
    actual: String(value),
  });
}

function validateId(
  issues: MutableIssue[],
  path: string,
  value: number,
  source: 'native' | 'runtime',
  allowZero = false,
): void {
  if (Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0)) return;
  addIssue(issues, source === 'native' ? 'invalid-native-value' : 'invalid-runtime-value', path, {
    actual: issueNumber(value),
  });
}

function validateIntegerValue(
  issues: MutableIssue[],
  path: string,
  value: number,
  source: 'native' | 'runtime',
  minimum: number,
  attackId?: number,
): void {
  if (Number.isSafeInteger(value) && value >= minimum) return;
  addIssue(issues, source === 'native' ? 'invalid-native-value' : 'invalid-runtime-value', path, {
    ...(attackId === undefined ? {} : { attackId }),
    actual: issueNumber(value),
  });
}

function validateCoefficientChannel(
  issues: MutableIssue[],
  path: string,
  channel: Mir4NativeRawCoefficientChannel,
  attackId?: number,
): void {
  const values = [
    ['coefficient', channel.coefficient],
    ['levelUpCoefficient', channel.levelUpCoefficient],
    ['additive', channel.additive],
    ['levelUpAdditive', channel.levelUpAdditive],
  ] as const;
  for (const [field, value] of values) {
    if (validFiniteNonNegative(value)) continue;
    addIssue(issues, 'invalid-native-value', `${path}.${field}`, {
      ...(attackId === undefined ? {} : { attackId }),
      actual: issueNumber(value),
    });
  }
}

function validateNativeSkillFacets(
  issues: MutableIssue[],
  input: Extract<Mir4SkillExecutionPlanInput, { source: 'runtime-approved' }>,
): void {
  const behavior = input.action.nativeBehavior;
  const runtimeSourceFacets = mir4NativeRuntimeSkillSourceFacets(input.action.skillId);
  const runtimePresentationFacets = mir4NativeRuntimeSkillPresentationFacets(input.action.skillId);
  const base = 'action.nativeBehavior';
  const unresolvedZeroFields: readonly (keyof typeof behavior)[] = [
    'useControlTime',
    'conditionTarget',
    'conditionType',
    'conditionValue',
    'conditionRange',
    'conditionCheckTime',
    'chainUseSkillLevel',
    'chainSkillId',
    'chainSkillDelay',
    'chainSkillCount',
    'secondaryCostType',
    'secondaryCost',
  ];
  const nirvanaKickAutoCondition = mir4NativeNirvanaKickAutoCondition();
  const nirvanaKickAutoConditionFields = new Set<keyof typeof behavior>([
    'useControlTime',
    'conditionTarget',
    'conditionType',
    'conditionValue',
    'conditionRange',
    'conditionCheckTime',
  ]);
  const exactBlitzStrikeSource =
    input.action.skillId === 5202 && mir4NativeBlitzStrikeSourceMatches();
  const blitzStrikeInertDefaults = new Set<keyof typeof behavior>([
    'useControlTime',
    'chainSkillDelay',
    'chainSkillCount',
  ]);

  validateCoefficientChannel(issues, `${base}.primaryDamage`, behavior.primaryDamage);
  validateCoefficientChannel(issues, `${base}.secondaryDamage`, behavior.secondaryDamage);
  const runtimeDamageSummary = mir4NativeRuntimeDamageSummary(input.action.skillId);
  const runtimeTotemPlan = mir4NativeRuntimeTotemPlan(input.action.skillId);
  const phoenixEmbrace =
    input.action.skillId === 2204 ? mir4NativeRuntimePhoenixEmbracePolicy(1) : null;
  const directCoefficient = input.action.rows.reduce(
    (total, row) => total + (row.damage.type === 0 ? 0 : row.damage.coefficient),
    0,
  );
  const directLevelUpCoefficient = input.action.rows.reduce(
    (total, row) => total + (row.damage.type === 0 ? 0 : row.damage.levelUpCoefficient),
    0,
  );
  const exactPrimaryDamageSummary =
    runtimeDamageSummary !== null &&
    behavior.damageType === runtimeDamageSummary.damageType &&
    behavior.primaryDamage.coefficient === runtimeDamageSummary.coefficient &&
    behavior.primaryDamage.levelUpCoefficient === runtimeDamageSummary.levelUpCoefficient &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage);
  const exactSecondaryDamageSummary =
    runtimeDamageSummary !== null &&
    behavior.damageType === runtimeDamageSummary.damageType &&
    behavior.secondaryDamage.coefficient === runtimeDamageSummary.coefficient &&
    behavior.secondaryDamage.levelUpCoefficient === runtimeDamageSummary.levelUpCoefficient &&
    behavior.secondaryDamage.additive === 0 &&
    behavior.secondaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.primaryDamage);
  const exactRuntimeDamageSummary = exactPrimaryDamageSummary || exactSecondaryDamageSummary;
  const exactTotemDamageSummary =
    runtimeTotemPlan !== null &&
    (behavior.damageType === 0 ||
      (runtimeDamageSummary !== null && behavior.damageType === runtimeDamageSummary.damageType)) &&
    !channelHasValue(behavior.primaryDamage) &&
    behavior.secondaryDamage.additive === 0 &&
    behavior.secondaryDamage.levelUpAdditive === 0 &&
    behavior.secondaryDamage.coefficient * 100 ===
      directCoefficient + runtimeTotemPlan.aggregateCoefficient &&
    behavior.secondaryDamage.levelUpCoefficient * 100 ===
      directLevelUpCoefficient + runtimeTotemPlan.aggregateLevelUpCoefficient;
  const exactHybridTotemDamageSummary =
    runtimeTotemPlan?.aggregateDamage !== undefined &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    behavior.secondaryDamage.additive === 0 &&
    behavior.secondaryDamage.levelUpAdditive === 0 &&
    behavior.primaryDamage.coefficient * 100 ===
      (input.skill.damage?.components
        .filter((component) => component.damageType === 1)
        .reduce((total, component) => total + component.coefficient, 0) ?? 0) +
        runtimeTotemPlan.aggregateDamage.physical.coefficient &&
    behavior.primaryDamage.levelUpCoefficient * 100 ===
      (input.skill.damage?.components
        .filter((component) => component.damageType === 1)
        .reduce((total, component) => total + component.levelUpCoefficient, 0) ?? 0) +
        runtimeTotemPlan.aggregateDamage.physical.levelUpCoefficient &&
    behavior.secondaryDamage.coefficient * 100 ===
      (input.skill.damage?.components
        .filter((component) => component.damageType === 2)
        .reduce((total, component) => total + component.coefficient, 0) ?? 0) +
        runtimeTotemPlan.aggregateDamage.magic.coefficient &&
    behavior.secondaryDamage.levelUpCoefficient * 100 ===
      (input.skill.damage?.components
        .filter((component) => component.damageType === 2)
        .reduce((total, component) => total + component.levelUpCoefficient, 0) ?? 0) +
        runtimeTotemPlan.aggregateDamage.magic.levelUpCoefficient;
  const exactBurstShellTotemDamageSummary =
    input.action.skillId === 4103 &&
    runtimeTotemPlan?.skillId === 4103 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 220 &&
    behavior.primaryDamage.levelUpCoefficient === 5 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 0 &&
    directLevelUpCoefficient === 0 &&
    runtimeTotemPlan.aggregateCoefficient === 23_500 &&
    runtimeTotemPlan.aggregateLevelUpCoefficient === 550;
  const exactHeavenlyBowTotemDamageSummary =
    input.action.skillId === 4108 &&
    runtimeTotemPlan?.skillId === 4108 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 300 &&
    behavior.primaryDamage.levelUpCoefficient === 6 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 6600 &&
    directLevelUpCoefficient === 132 &&
    runtimeTotemPlan.aggregateCoefficient === 26_400 &&
    runtimeTotemPlan.aggregateLevelUpCoefficient === 528;
  const exactIceCageTotemDamageSummary =
    input.action.skillId === 4105 &&
    runtimeTotemPlan?.skillId === 4105 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 230 &&
    behavior.primaryDamage.levelUpCoefficient === 5 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 4000 &&
    directLevelUpCoefficient === 100 &&
    runtimeTotemPlan.aggregateCoefficient === 19_000 &&
    runtimeTotemPlan.aggregateLevelUpCoefficient === 400;
  const exactVenomMistShellTotemDamageSummary =
    input.action.skillId === 4104 &&
    runtimeTotemPlan?.skillId === 4104 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 250 &&
    behavior.primaryDamage.levelUpCoefficient === 5 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 5_500 &&
    directLevelUpCoefficient === 110 &&
    runtimeTotemPlan.aggregateCoefficient === 22_000 &&
    runtimeTotemPlan.aggregateLevelUpCoefficient === 440;
  const exactCloakingTotemDamageSummary =
    input.action.skillId === 4112 &&
    runtimeTotemPlan?.skillId === 4112 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 90 &&
    behavior.primaryDamage.levelUpCoefficient === 2 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 0 &&
    directLevelUpCoefficient === 0 &&
    runtimeTotemPlan.aggregateCoefficient === 9_000 &&
    runtimeTotemPlan.aggregateLevelUpCoefficient === 200;
  const exactObliterateShellDamageSummary =
    input.action.skillId === 4109 &&
    behavior.damageType === 0 &&
    behavior.primaryDamage.coefficient === 220 &&
    behavior.primaryDamage.levelUpCoefficient === 5 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    !channelHasValue(behavior.secondaryDamage) &&
    directCoefficient === 22_000 &&
    directLevelUpCoefficient === 500;
  const exactTaiChiDamageSummary = mir4NativeTaiChiDamageSummaryMatches(input.action, input.skill);
  const exactSoaringSlashDamageSummary = mir4NativeSoaringSlashDamageSummaryMatches(
    input.action,
    input.skill,
  );
  const exactSweepingStormDamageSummary = mir4NativeSweepingStormDamageSummaryMatches(
    input.action,
    input.skill,
  );
  const exactDragonTailDamageSummary = mir4NativeDragonTailDamageSummaryMatches(
    input.action,
    input.skill,
  );
  const exactAscendingDragonDamageSummary = mir4NativeAscendingDragonDamageSummaryMatches(
    input.action,
    input.skill,
  );
  const ravagingBlowMultiImpactPolicy =
    input.action.skillId === 5201 ? mir4NativeRuntimeMultiImpactPolicy(5201) : null;
  const exactRavagingBlowDamageSummary =
    ravagingBlowMultiImpactPolicy !== null &&
    input.skill.damage?.aggregateCoefficient ===
      ravagingBlowMultiImpactPolicy.summaryCoefficient * 100 &&
    input.skill.damage.aggregateLevelUpCoefficient ===
      ravagingBlowMultiImpactPolicy.summaryLevelUpCoefficient * 100;
  const windWallMultiImpactPolicy =
    input.action.skillId === 5403 ? mir4NativeRuntimeMultiImpactPolicy(5403) : null;
  const exactWindWallDamageSummary =
    windWallMultiImpactPolicy !== null &&
    input.skill.damage?.aggregateCoefficient ===
      windWallMultiImpactPolicy.summaryCoefficient * 100 &&
    input.skill.damage.aggregateLevelUpCoefficient ===
      windWallMultiImpactPolicy.summaryLevelUpCoefficient * 100;
  const piercingSpearRows = input.action.rows.filter(
    (row) => row.attackId === 520502 || row.attackId === 520503,
  );
  const exactPiercingSpearDamageSummary =
    input.action.skillId === 5205 &&
    behavior.useControlTime === 3 &&
    behavior.damageType === 1 &&
    behavior.primaryDamage.coefficient === 80 &&
    behavior.primaryDamage.levelUpCoefficient === 2 &&
    behavior.primaryDamage.additive === 0 &&
    behavior.primaryDamage.levelUpAdditive === 0 &&
    behavior.secondaryDamage.coefficient === 130 &&
    behavior.secondaryDamage.levelUpCoefficient === 3 &&
    behavior.secondaryDamage.additive === 0 &&
    behavior.secondaryDamage.levelUpAdditive === 0 &&
    input.skill.damage?.allocationMode === 'per-impact' &&
    input.skill.damage.aggregateCoefficient === 42_000 &&
    input.skill.damage.aggregateLevelUpCoefficient === 800 &&
    input.skill.damage.components.length === 4 &&
    piercingSpearRows.length === 2 &&
    piercingSpearRows.every((row) => exactRuntimeDualDamageRow(input.skill, row));

  if (behavior.skillType !== 1) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.skillType`, {
      expected: 1,
      actual: behavior.skillType,
    });
  }
  const chainLightning = mir4NativeChainLightningPolicy(input.action.skillId);
  const immolate = mir4NativeRuntimeImmolatePolicy(input.action.skillId);
  if (
    behavior.productType !== 0 &&
    chainLightning?.productType !== behavior.productType &&
    immolate?.productType !== behavior.productType
  ) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.productType`, {
      expected: 0,
      actual: behavior.productType,
    });
  }
  for (const field of unresolvedZeroFields) {
    const value = behavior[field];
    if (nirvanaKickAutoCondition && nirvanaKickAutoConditionFields.has(field)) continue;
    if (exactBlitzStrikeSource && blitzStrikeInertDefaults.has(field)) continue;
    if (input.action.skillId === 5103 && field === 'useControlTime' && value === 2) continue;
    if (exactPiercingSpearDamageSummary && field === 'useControlTime' && value === 3) continue;
    if (typeof value === 'number' && value !== 0) {
      addIssue(issues, 'unresolved-native-skill-facet', `${base}.${field}`, {
        expected: 0,
        actual: value,
      });
    }
  }
  if (
    behavior.darkChange !== 0 &&
    runtimePresentationFacets?.darkChange.nativeMode !== behavior.darkChange
  ) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.darkChange`, {
      expected: 0,
      actual: behavior.darkChange,
    });
  }
  if (channelHasAdditive(behavior.primaryDamage)) {
    addIssue(issues, 'unresolved-additive-damage', `${base}.primaryDamage`);
  }
  if (
    !exactPrimaryDamageSummary &&
    !exactTotemDamageSummary &&
    !exactHybridTotemDamageSummary &&
    !exactBurstShellTotemDamageSummary &&
    !exactHeavenlyBowTotemDamageSummary &&
    !exactIceCageTotemDamageSummary &&
    !exactVenomMistShellTotemDamageSummary &&
    !exactCloakingTotemDamageSummary &&
    !exactObliterateShellDamageSummary &&
    !exactTaiChiDamageSummary &&
    !exactSoaringSlashDamageSummary &&
    !exactSweepingStormDamageSummary &&
    !exactDragonTailDamageSummary &&
    !exactAscendingDragonDamageSummary &&
    !exactRavagingBlowDamageSummary &&
    !exactWindWallDamageSummary &&
    !exactPiercingSpearDamageSummary &&
    (behavior.primaryDamage.coefficient !== 0 || behavior.primaryDamage.levelUpCoefficient !== 0)
  ) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.primaryDamage`, {
      expected: 'zero-without-typed-interpreter',
      actual: `${behavior.primaryDamage.coefficient},${behavior.primaryDamage.levelUpCoefficient}`,
    });
  }
  if (
    channelHasValue(behavior.secondaryDamage) &&
    !exactSecondaryDamageSummary &&
    !exactTotemDamageSummary &&
    !exactHybridTotemDamageSummary &&
    !exactBurstShellTotemDamageSummary &&
    !exactHeavenlyBowTotemDamageSummary &&
    !exactVenomMistShellTotemDamageSummary &&
    !exactCloakingTotemDamageSummary &&
    !exactTaiChiDamageSummary &&
    !exactSoaringSlashDamageSummary &&
    !exactSweepingStormDamageSummary &&
    !exactDragonTailDamageSummary &&
    !exactAscendingDragonDamageSummary &&
    !exactRavagingBlowDamageSummary &&
    !exactWindWallDamageSummary &&
    !exactPiercingSpearDamageSummary
  ) {
    addIssue(issues, 'unresolved-dual-damage-channel', `${base}.secondaryDamage`);
  }
  if (
    behavior.damageType !== 0 &&
    !exactRuntimeDamageSummary &&
    !exactTotemDamageSummary &&
    !exactHybridTotemDamageSummary &&
    !exactBurstShellTotemDamageSummary &&
    !exactHeavenlyBowTotemDamageSummary &&
    !exactIceCageTotemDamageSummary &&
    !exactVenomMistShellTotemDamageSummary &&
    !exactCloakingTotemDamageSummary &&
    !exactObliterateShellDamageSummary &&
    !exactSweepingStormDamageSummary &&
    !exactAscendingDragonDamageSummary &&
    !exactRavagingBlowDamageSummary &&
    !exactWindWallDamageSummary &&
    !exactPiercingSpearDamageSummary &&
    !phoenixEmbrace
  ) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.damageType`, {
      expected: 0,
      actual: behavior.damageType,
    });
  }
  behavior.abilities.forEach((ability, index) => {
    const admitted = runtimePresentationFacets?.abilities[index];
    const exactAdmitted =
      admitted !== undefined &&
      ability.type === admitted.type &&
      ability.value === admitted.value &&
      ability.levelUpValue === admitted.levelUpValue &&
      ability.time === admitted.time;
    if (
      !exactAdmitted &&
      (ability.type !== 0 ||
        ability.value !== 0 ||
        ability.levelUpValue !== 0 ||
        ability.time !== 0)
    ) {
      addIssue(issues, 'unresolved-native-skill-facet', `${base}.abilities[${index}]`);
    }
  });
  if (
    behavior.stateConditionUse &&
    mir4NativeRuntimeStateConditionPolicy(input.action.skillId) === null
  ) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.stateConditionUse`, {
      expected: false,
      actual: true,
    });
  }
  if (behavior.moveConditionUse) {
    addIssue(issues, 'unresolved-native-skill-facet', `${base}.moveConditionUse`, {
      expected: false,
      actual: true,
    });
  }
  const unresolvedIdLists = [
    ['passiveIds', behavior.passiveIds],
    ['autoLearnPassiveIds', behavior.autoLearnPassiveIds],
    ['skillModPassiveIds', behavior.skillModPassiveIds],
  ] as const;
  const generatedPassiveEligibility = mir4NativeGeneratedPassiveEligibility(input.action.skillId);
  for (const [field, ids] of unresolvedIdLists) {
    const admittedIds =
      field === 'passiveIds'
        ? (runtimeSourceFacets?.passiveEligibilityIds ??
          generatedPassiveEligibility?.passiveEligibilityIds)
        : field === 'autoLearnPassiveIds'
          ? runtimeSourceFacets?.autoLearnPassiveIds
          : runtimeSourceFacets?.skillModPassiveIds;
    const exactAdmitted =
      admittedIds !== undefined &&
      ids.length === admittedIds.length &&
      ids.every((id, index) => id === admittedIds[index]);
    if (ids.length > 0 && !exactAdmitted) {
      addIssue(issues, 'unresolved-native-skill-facet', `${base}.${field}`, {
        actual: ids.join(','),
      });
    }
  }
  const exactSmiteBuffIds =
    runtimeSourceFacets !== null &&
    behavior.smiteBuffIds.length === runtimeSourceFacets.smiteBuffIds.length &&
    behavior.smiteBuffIds.every((id, index) => id === runtimeSourceFacets.smiteBuffIds[index]);
  if (behavior.smiteBuffIds.length > 0 && !exactSmiteBuffIds) {
    addIssue(issues, 'unresolved-buff-reference', `${base}.smiteBuffIds`, {
      actual: behavior.smiteBuffIds.join(','),
    });
  }
}

function validateNativeAttackFacets(
  issues: MutableIssue[],
  row: Mir4NativeSkillAttackRow,
  rowIndex: number,
  skillId: number,
  skill: RuntimeApprovedSkill,
): void {
  const behavior = row.nativeBehavior;
  const base = `action.rows[${rowIndex}].nativeBehavior`;
  const attackId = row.attackId;

  validateCoefficientChannel(issues, `${base}.physicalDamage`, behavior.physicalDamage, attackId);
  validateCoefficientChannel(issues, `${base}.magicDamage`, behavior.magicDamage, attackId);
  validateIntegerValue(issues, `${base}.damageType`, behavior.damageType, 'native', 0, attackId);
  validateIntegerValue(
    issues,
    `${base}.damageAttribute`,
    behavior.damageAttribute,
    'native',
    0,
    attackId,
  );

  if (
    behavior.attackUseType !== 0 &&
    mir4NativeRuntimeAttackUseTypePolicy(skillId, attackId)?.attackUseType !==
      behavior.attackUseType
  ) {
    addIssue(issues, 'unresolved-attack-use-type', `${base}.attackUseType`, {
      attackId,
      expected: 0,
      actual: behavior.attackUseType,
    });
  }
  if (behavior.impactSpawnType !== 0) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.impactSpawnType`, {
      attackId,
      expected: 0,
      actual: behavior.impactSpawnType,
    });
  }
  if (behavior.strikeDelay !== 0) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.strikeDelay`, {
      attackId,
      expected: 0,
      actual: behavior.strikeDelay,
    });
  }
  if (
    behavior.projectile !== null &&
    mir4NativeRuntimeProjectilePolicy(skillId, attackId) === null
  ) {
    addIssue(issues, 'unresolved-projectile', `${base}.projectile`, {
      attackId,
    });
  }
  const runtimeTotemPlan = mir4NativeRuntimeTotemPlan(skillId);
  const exactTotem =
    runtimeTotemPlan !== null &&
    runtimeTotemPlan.spawnAttackId === attackId &&
    behavior.totem !== null &&
    behavior.totem.id === runtimeTotemPlan.totemId &&
    behavior.totem.target ===
      (runtimeTotemPlan.reconstruction.anchor === 'source-position-at-cast' ? 1 : 0) &&
    behavior.totem.time * 1000 === runtimeTotemPlan.reconstruction.lifetimeMs &&
    behavior.totem.count === 1;
  const exactTotemSetupReaction = exactTotem && !rowHasDamage(row);
  if (behavior.totem !== null && !exactTotem) {
    addIssue(issues, 'unresolved-totem', `${base}.totem`, {
      attackId,
      actual: behavior.totem.id,
    });
  }
  const sourceUninterruptible = mir4NativeRuntimeUninterruptibleBuff(skillId);
  const exactSourceUninterruptible =
    sourceUninterruptible?.attackId === attackId &&
    mir4NativeSourceUninterruptibleBuffMatchesRow(row);
  const exactLionRoarDebuff = skillId === 1302 && mir4NativeLionRoarDebuffMatchesRow(row);
  const exactRiposteSetup = skillId === 1301 && mir4NativeRiposteSetupBuffsMatchRow(row);
  const exactUnbreakableStanceBuffs =
    skillId === 1502 && mir4NativeUnbreakableStanceImpactBuffsMatchRow(row);
  const exactBerserkBuffs = skillId === 1101 && mir4NativeBerserkImpactBuffsMatchRow(row);
  const exactMagicShieldBuff = skillId === 2503 && mir4NativeMagicShieldBuffMatchesRow(row);
  const exactFrozenBlockBuff = skillId === 2202 && mir4NativeFrozenBlockBuffMatchesRow(row);
  const exactPhoenixEmbraceBuff = skillId === 2204 && mir4NativePhoenixEmbraceBuffMatchesRow(row);
  const exactImmolatePeriodicBuff =
    skillId === 2103 && mir4NativeImmolatePeriodicBuffMatchesRow(row);
  const exactGuardianCircleBuffs = skillId === 3501 && mir4NativeGuardianCircleBuffsMatchRow(row);
  const exactExpulsionCircleBuffs = skillId === 3404 && mir4NativeExpulsionCircleBuffsMatchRow(row);
  const exactHealBuffs = skillId === 3503 && mir4NativeHealBuffsMatchRow(row);
  const exactGreaterHealBuffs = skillId === 3504 && mir4NativeGreaterHealBuffsMatchRow(row);
  const exactTaiChiBuff = skillId === 3201 && mir4NativeTaiChiBuffMatchesRow(row);
  const exactQuickShotFocus = skillId === 4101 && mir4NativeQuickShotBuffMatchesRow(row);
  const exactBurstShellFocus = skillId === 4103 && mir4NativeBurstShellFocusBuffMatchesRow(row);
  const exactIllusionArrowBuffs = skillId === 4102 && mir4NativeIllusionArrowBuffsMatchRow(row);
  const exactPainstrikeGaleBuffs = skillId === 4106 && mir4NativePainstrikeGaleBuffsMatchRow(row);
  const exactFlashArrowBuffs = skillId === 4107 && mir4NativeFlashArrowBuffsMatchRow(row);
  const exactHeavenlyBowFocus = skillId === 4108 && mir4NativeHeavenlyBowFocusBuffMatchesRow(row);
  const exactIceCageFocus = skillId === 4105 && mir4NativeIceCageFocusBuffMatchesRow(row);
  const exactVenomMistShellFocus =
    skillId === 4104 && mir4NativeVenomMistShellFocusBuffMatchesRow(row);
  const exactObliterateShellFocus =
    skillId === 4109 && mir4NativeObliterateShellFocusBuffMatchesRow(row);
  const exactSeekingBoltBuffs =
    skillId === 4110 &&
    (mir4NativeSeekingBoltSetupBuffsMatchRow(row) || mir4NativeSeekingBoltFocusBuffMatchesRow(row));
  const exactMindsEyeBuffs = skillId === 4111 && mir4NativeMindsEyeBuffsMatchRow(row);
  const exactCloakingFocus = skillId === 4112 && mir4NativeCloakingFocusBuffMatchesRow(row);
  const exactCrushingBlowBuff = skillId === 5303 && mir4NativeCrushingBlowBuffsMatchRow(row);
  if (
    behavior.buffIds.length > 0 &&
    !exactSourceUninterruptible &&
    !exactLionRoarDebuff &&
    !exactRiposteSetup &&
    !exactUnbreakableStanceBuffs &&
    !exactBerserkBuffs &&
    !exactMagicShieldBuff &&
    !exactFrozenBlockBuff &&
    !exactPhoenixEmbraceBuff &&
    !exactImmolatePeriodicBuff &&
    !exactGuardianCircleBuffs &&
    !exactExpulsionCircleBuffs &&
    !exactHealBuffs &&
    !exactGreaterHealBuffs &&
    !exactTaiChiBuff &&
    !exactQuickShotFocus &&
    !exactBurstShellFocus &&
    !exactIllusionArrowBuffs &&
    !exactPainstrikeGaleBuffs &&
    !exactFlashArrowBuffs &&
    !exactHeavenlyBowFocus &&
    !exactIceCageFocus &&
    !exactVenomMistShellFocus &&
    !exactObliterateShellFocus &&
    !exactSeekingBoltBuffs &&
    !exactMindsEyeBuffs &&
    !exactCloakingFocus &&
    !exactCrushingBlowBuff
  ) {
    addIssue(issues, 'unresolved-buff-reference', `${base}.buffIds`, {
      attackId,
      actual: behavior.buffIds.join(','),
    });
  }
  if (behavior.ccBuffIds.length > 0) {
    addIssue(issues, 'unresolved-buff-reference', `${base}.ccBuffIds`, {
      attackId,
      actual: behavior.ccBuffIds.join(','),
    });
  }
  const expectedSuperState = mir4NativeExpectedSuperState(skillId, attackId);
  const superFields = [
    ['superIgnore', behavior.superIgnore],
    ['superArmor', behavior.superArmor],
    ['actType', behavior.actType],
    ['ccUserCheck', behavior.ccUserCheck],
  ] as const;
  for (const [field, value] of superFields) {
    const expected = expectedSuperState?.[field] ?? 0;
    if (value !== expected) {
      addIssue(issues, 'unresolved-super-state', `${base}.${field}`, {
        attackId,
        expected,
        actual: value,
      });
    }
  }
  if (behavior.monsterScaleApply) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.monsterScaleApply`, {
      attackId,
      expected: false,
      actual: true,
    });
  }
  const runtimeAttackRage = mir4NativeRuntimeAttackRagePolicy(skillId, attackId);
  if (
    behavior.attackRagePoint !== 0 &&
    runtimeAttackRage?.nativePoints !== behavior.attackRagePoint
  ) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.attackRagePoint`, {
      attackId,
      expected: 0,
      actual: behavior.attackRagePoint,
    });
  }
  const runtimeHitRage = mir4NativeRuntimeHitRagePolicy(skillId, attackId);
  if (
    (behavior.hitRagePoint as number) !== 0 &&
    runtimeHitRage?.nativePoints !== behavior.hitRagePoint
  ) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.hitRagePoint`, {
      attackId,
      expected: 0,
      actual: behavior.hitRagePoint,
    });
  }
  const runtimeAggro = mir4NativeRuntimeAggroPolicy(skillId, attackId);
  if (behavior.aggroRate !== 0 && runtimeAggro?.nativeRateBasisPoints !== behavior.aggroRate) {
    addIssue(issues, 'unresolved-native-attack-facet', `${base}.aggroRate`, {
      attackId,
      expected: 0,
      actual: behavior.aggroRate,
    });
  }
  if (channelHasAdditive(behavior.physicalDamage)) {
    addIssue(issues, 'unresolved-additive-damage', `${base}.physicalDamage`, {
      attackId,
    });
  }
  if (channelHasAdditive(behavior.magicDamage)) {
    addIssue(issues, 'unresolved-additive-damage', `${base}.magicDamage`, {
      attackId,
    });
  }
  if (
    channelHasValue(behavior.physicalDamage) &&
    channelHasValue(behavior.magicDamage) &&
    !exactRuntimeDualDamageRow(skill, row)
  ) {
    addIssue(issues, 'unresolved-dual-damage-channel', `${base}.magicDamage`, {
      attackId,
    });
  }
  const runtimeHitReaction = mir4NativeRuntimeHitReaction(skillId, row.attackId);
  const exactRuntimeHitReaction =
    runtimeHitReaction !== null &&
    row.reaction.kind === 'hit' &&
    row.reaction.stance === runtimeHitReaction.stance &&
    row.reaction.value === 0 &&
    row.reaction.nativeHeight === 0 &&
    row.reaction.valueEx === 0 &&
    row.reaction.durationMs === runtimeHitReaction.durationMs &&
    row.reaction.probabilityPercent === 100 &&
    row.reaction.direction === 0;
  const dragonTailHitReaction = mir4NativeDragonTailHitReaction(row.attackId);
  const exactDragonTailHitReaction =
    skillId === 5102 &&
    dragonTailHitReaction !== null &&
    row.reaction.kind === 'hit' &&
    row.reaction.stance === dragonTailHitReaction.stance &&
    row.reaction.value === 0 &&
    row.reaction.nativeHeight === 0 &&
    row.reaction.valueEx === 0 &&
    row.reaction.durationMs === dragonTailHitReaction.durationMs &&
    row.reaction.probabilityPercent === 10 &&
    row.reaction.direction === 0;
  const runtimeCrowdControlReaction = mir4NativeRuntimeCrowdControlReaction(skillId, row.attackId);
  const exactRuntimeCrowdControlReaction =
    runtimeCrowdControlReaction !== null && mir4NativeCrowdControlReactionMatchesRow(row);
  const runtimeInertReaction = mir4NativeRuntimeInertReaction(skillId, row.attackId);
  const exactRuntimeInertReaction =
    runtimeInertReaction !== null && mir4NativeInertReactionMatchesRow(row, runtimeInertReaction);
  const runtimePushToPointReaction = mir4NativeRuntimePushToPointReaction(skillId, row.attackId);
  const exactRuntimePushToPointReaction =
    runtimePushToPointReaction !== null && mir4NativePushToPointReactionMatchesRow(row);
  const runtimeKnockbackReaction = mir4NativeRuntimeKnockbackReaction(skillId, row.attackId);
  const exactRuntimeKnockbackReaction =
    runtimeKnockbackReaction !== null && mir4NativeKnockbackReactionMatchesRow(row);
  const runtimeAttackBackReaction = mir4NativeRuntimeAttackBackReaction(skillId, row.attackId);
  const exactRuntimeAttackBackReaction =
    runtimeAttackBackReaction !== null && mir4NativeAttackBackReactionMatchesRow(row);
  if (
    !exactRuntimeHitReaction &&
    !exactDragonTailHitReaction &&
    !exactRuntimeCrowdControlReaction &&
    !exactRuntimeInertReaction &&
    !exactRuntimePushToPointReaction &&
    !exactRuntimeKnockbackReaction &&
    !exactRuntimeAttackBackReaction &&
    !exactTotemSetupReaction &&
    (row.reaction.kind !== 'none' ||
      row.reaction.stance !== 'none' ||
      row.reaction.value !== 0 ||
      row.reaction.nativeHeight !== 0 ||
      row.reaction.valueEx !== 0 ||
      row.reaction.durationMs !== 0 ||
      row.reaction.probabilityPercent !== 0 ||
      row.reaction.direction !== 0)
  ) {
    addIssue(issues, 'unresolved-hit-reaction', `action.rows[${rowIndex}].reaction`, {
      attackId,
      actual: row.reaction.kind,
    });
  }
  const runtimeGuide = mir4NativeRuntimeGuidePolicy(skillId, row.attackId);
  if (row.guideEffectId !== 0 && runtimeGuide?.guideEffectId !== row.guideEffectId) {
    addIssue(issues, 'unresolved-native-attack-facet', `action.rows[${rowIndex}].guideEffectId`, {
      attackId,
      expected: 0,
      actual: row.guideEffectId,
    });
  }
}

function validateRuntimeSkillFacets(
  issues: MutableIssue[],
  input: Extract<Mir4SkillExecutionPlanInput, { source: 'runtime-approved' }>,
): void {
  const { skill } = input;
  const additionalEffectCount = skill.additionalEffects?.length ?? 0;
  const admittedEffect = mir4NativeRuntimeSkillEffect(input.action.skillId);
  const compiledEffect =
    admittedEffect === null ? null : compileMir4NativeRuntimeSkillEffect(input.action, skill);
  if (skill.effect !== null && compiledEffect?.ok !== true) {
    addIssue(issues, 'unresolved-runtime-skill-facet', 'skill.effect', {
      expected: null,
      actual: skill.effect.effect,
    });
  } else if (skill.effect === null && admittedEffect !== null) {
    addIssue(issues, 'unresolved-runtime-skill-facet', 'skill.effect', {
      expected: admittedEffect.effect.effect,
      actual: null,
    });
  }
  if (additionalEffectCount > 0) {
    addIssue(issues, 'unresolved-runtime-skill-facet', 'skill.additionalEffects', {
      actual: additionalEffectCount,
    });
  }
  if (skill.minTargets !== null) {
    addIssue(issues, 'unresolved-runtime-skill-facet', 'skill.minTargets', {
      expected: null,
      actual: skill.minTargets,
    });
  }
}

function validateNativeDamageProjection(
  issues: MutableIssue[],
  row: Mir4NativeSkillAttackRow,
  rowIndex: number,
  skillId: number,
): void {
  const behavior = row.nativeBehavior;
  const attackId = row.attackId;
  const base = `action.rows[${rowIndex}]`;
  const physical = channelHasValue(behavior.physicalDamage);
  const magic = channelHasValue(behavior.magicDamage);
  const channel = row.damage.type === 2 ? behavior.magicDamage : behavior.physicalDamage;

  validateIntegerValue(issues, `${base}.damage.type`, row.damage.type, 'native', 0, attackId);
  validateIntegerValue(
    issues,
    `${base}.damage.attribute`,
    row.damage.attribute,
    'native',
    0,
    attackId,
  );
  validateScalar(issues, `${base}.damage.coefficient`, row.damage.coefficient, 'native', attackId);
  validateScalar(
    issues,
    `${base}.damage.levelUpCoefficient`,
    row.damage.levelUpCoefficient,
    'native',
    attackId,
  );

  if (!rowHasDamage(row)) {
    const exactTotemSetupAttribute = isExactTotemSetupDamageAttribute(skillId, row);
    const unresolvedSetupDamageFields = [
      ['nativeBehavior.damageType', behavior.damageType],
      ['nativeBehavior.damageAttribute', behavior.damageAttribute],
      ['damage.type', row.damage.type],
      ['damage.attribute', row.damage.attribute],
    ] as const;
    for (const [field, value] of unresolvedSetupDamageFields) {
      const admittedAttribute =
        exactTotemSetupAttribute && field.toLowerCase().endsWith('attribute');
      if (value !== 0 && !admittedAttribute) {
        addIssue(issues, 'unresolved-native-attack-facet', `${base}.${field}`, {
          attackId,
          expected: 0,
          actual: value,
        });
      }
    }
  }

  if (behavior.damageType !== row.damage.type) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.type`, {
      attackId,
      expected: behavior.damageType,
      actual: row.damage.type,
    });
  }
  if (behavior.damageAttribute !== row.damage.attribute) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.attribute`, {
      attackId,
      expected: behavior.damageAttribute,
      actual: row.damage.attribute,
    });
  }
  if (
    rowHasDamage(row) &&
    ((row.damage.type === 1 && !physical) || (row.damage.type === 2 && !magic))
  ) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.type`, {
      attackId,
      actual: row.damage.type,
    });
  }
  const exactHybridProjection =
    row.damage.type === 3 && behavior.damageType === 3 && physical && magic;
  if (
    row.damage.type !== 1 &&
    row.damage.type !== 2 &&
    !exactHybridProjection &&
    (physical || magic)
  ) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.type`, {
      attackId,
      actual: row.damage.type,
    });
  }
  if (!rowHasDamage(row) && (physical || magic)) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.coefficient`, {
      attackId,
      expected: 0,
      actual: channel.coefficient,
    });
  }
  if (channel.coefficient !== row.damage.coefficient) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.coefficient`, {
      attackId,
      expected: channel.coefficient,
      actual: row.damage.coefficient,
    });
  }
  if (channel.levelUpCoefficient !== row.damage.levelUpCoefficient) {
    addIssue(issues, 'native-damage-projection-mismatch', `${base}.damage.levelUpCoefficient`, {
      attackId,
      expected: channel.levelUpCoefficient,
      actual: row.damage.levelUpCoefficient,
    });
  }
}

function freezePlan(plan: Mir4SkillExecutionPlan): Mir4SkillExecutionPlan {
  const rows = plan.rows.map((row) =>
    Object.freeze({
      ...row,
      motion: row.motion === null ? null : Object.freeze({ ...row.motion }),
      projectile:
        row.projectile === null
          ? null
          : Object.freeze({
              ...row.projectile,
              rotationOffset: Object.freeze({
                ...row.projectile.rotationOffset,
              }),
            }),
      target: Object.freeze({ ...row.target }),
      geometry: Object.freeze({
        ...row.geometry,
        nativeOffset: Object.freeze({ ...row.geometry.nativeOffset }),
      }),
      guide:
        row.guide === null
          ? null
          : Object.freeze({
              ...row.guide,
              colors: Object.freeze({
                primary: Object.freeze([...row.guide.colors.primary]) as readonly [
                  number,
                  number,
                  number,
                ],
                secondary: Object.freeze([...row.guide.colors.secondary]) as readonly [
                  number,
                  number,
                  number,
                ],
                emissive: Object.freeze([...row.guide.colors.emissive]) as readonly [
                  number,
                  number,
                  number,
                ],
              }),
            }),
      nativeCombat: Object.freeze({
        attackRage:
          row.nativeCombat.attackRage === null
            ? null
            : Object.freeze({ ...row.nativeCombat.attackRage }),
        hitRage:
          row.nativeCombat.hitRage === null ? null : Object.freeze({ ...row.nativeCombat.hitRage }),
        aggro:
          row.nativeCombat.aggro === null ? null : Object.freeze({ ...row.nativeCombat.aggro }),
      }),
      contacts: Object.freeze(
        row.contacts.map((contact) =>
          Object.freeze({
            ...contact,
            damage: Object.freeze({ ...contact.damage }),
          }),
        ),
      ),
    }),
  );
  return Object.freeze({
    ...plan,
    nativeSkill:
      plan.nativeSkill === null
        ? null
        : Object.freeze({
            ...plan.nativeSkill,
            darkChange: Object.freeze({ ...plan.nativeSkill.darkChange }),
            abilities: Object.freeze(
              plan.nativeSkill.abilities.map((ability) => Object.freeze({ ...ability })),
            ),
            passiveEligibilityIds: Object.freeze([...plan.nativeSkill.passiveEligibilityIds]),
            smiteBuffIds: Object.freeze([...plan.nativeSkill.smiteBuffIds]),
            autoLearnPassiveIds: Object.freeze([...plan.nativeSkill.autoLearnPassiveIds]),
            skillModPassiveIds: Object.freeze([...plan.nativeSkill.skillModPassiveIds]),
          }),
    presentation: Object.freeze({
      ...plan.presentation,
      vfxAssetPaths: Object.freeze([...plan.presentation.vfxAssetPaths]),
      guideAssetPaths: Object.freeze([...plan.presentation.guideAssetPaths]),
      soundAssetPaths: Object.freeze([...plan.presentation.soundAssetPaths]),
      cameraCurveAssetPaths: Object.freeze([...plan.presentation.cameraCurveAssetPaths]),
      cameraShakeAssetPaths: Object.freeze([...plan.presentation.cameraShakeAssetPaths]),
    }),
    range: Object.freeze({ ...plan.range }),
    runtimeUnlock: Object.freeze({ ...plan.runtimeUnlock }),
    totem: plan.totem,
    rows: Object.freeze(rows),
  });
}

/**
 * Compile immutable execution evidence without touching live simulation state.
 * Any unresolved or contradictory facet returns only ordered diagnostic issues.
 */
export function compileMir4SkillExecutionPlan(
  input: Mir4SkillExecutionPlanInput,
): Mir4SkillExecutionPlanResult {
  if (input.source === 'direct-evidence-only') {
    return fail([
      {
        code: 'direct-evidence-not-runtime-approved',
        path: 'source',
        actual: input.source,
      },
    ]);
  }

  const { action, skill } = input;
  const issues: MutableIssue[] = [];

  validateId(issues, 'action.skillId', action.skillId, 'native');
  validateId(issues, 'skill.skillId', skill.skillId, 'runtime');
  validateIntegerValue(issues, 'skill.classId', skill.classId, 'runtime', 1);
  validateIntegerValue(issues, 'skill.slot', skill.slot, 'runtime', 1);
  validateIntegerValue(issues, 'action.cooldownMs', action.cooldownMs, 'native', 0);
  validateIntegerValue(issues, 'action.skillCostType', action.skillCostType, 'native', 0);
  validateIntegerValue(issues, 'action.skillCost', action.skillCost, 'native', 0);
  validateIntegerValue(issues, 'action.attackAnimationMs', action.attackAnimationMs, 'native', 0);
  validateIntegerValue(issues, 'action.endCutAnimationMs', action.endCutAnimationMs, 'native', 0);
  validateIntegerValue(issues, 'action.hitCount', action.hitCount, 'native', 0);
  validateIntegerValue(issues, 'action.requiredClassLevel', action.requiredClassLevel, 'native', 1);
  validateIntegerValue(issues, 'skill.cooldownMs', skill.cooldownMs, 'runtime', 0);
  validateIntegerValue(issues, 'skill.skillCostType', skill.skillCostType, 'runtime', 0);
  validateIntegerValue(issues, 'skill.skillCost', skill.skillCost, 'runtime', 0);
  validateIntegerValue(issues, 'skill.attackAnimationMs', skill.attackAnimationMs, 'runtime', 0);
  validateIntegerValue(issues, 'skill.hitCount', skill.hitCount, 'runtime', 0);
  validateScalar(issues, 'skill.browserRangePx', skill.browserRangePx, 'runtime');
  if (skill.unlock.kind === 'level') {
    validateIntegerValue(issues, 'skill.unlock.level', skill.unlock.level, 'runtime', 1);
  } else if ((skill.unlock.kind as string) !== 'initial-deck') {
    addIssue(issues, 'unresolved-runtime-skill-facet', 'skill.unlock.kind', {
      expected: 'initial-deck-or-level',
      actual: skill.unlock.kind,
    });
  }

  if (action.endCutAnimationMs > action.attackAnimationMs) {
    addIssue(issues, 'timing-outside-animation', 'action.endCutAnimationMs', {
      expected: action.attackAnimationMs,
      actual: action.endCutAnimationMs,
    });
  }
  if (action.skillId !== skill.skillId) {
    addIssue(issues, 'skill-id-mismatch', 'skill.skillId', {
      expected: action.skillId,
      actual: skill.skillId,
    });
  }
  if (action.cooldownMs !== skill.cooldownMs) {
    addIssue(issues, 'cooldown-mismatch', 'skill.cooldownMs', {
      expected: action.cooldownMs,
      actual: skill.cooldownMs,
    });
  }
  if (action.skillCostType !== skill.skillCostType) {
    addIssue(issues, 'skill-cost-type-mismatch', 'skill.skillCostType', {
      expected: action.skillCostType,
      actual: skill.skillCostType,
    });
  }
  if (action.skillCost !== skill.skillCost) {
    addIssue(issues, 'skill-cost-mismatch', 'skill.skillCost', {
      expected: action.skillCost,
      actual: skill.skillCost,
    });
  }
  if (action.attackAnimationMs !== skill.attackAnimationMs) {
    addIssue(issues, 'attack-animation-mismatch', 'skill.attackAnimationMs', {
      expected: action.attackAnimationMs,
      actual: skill.attackAnimationMs,
    });
  }
  if (action.hitCount !== skill.hitCount) {
    addIssue(issues, 'hit-count-mismatch', 'skill.hitCount', {
      expected: action.hitCount,
      actual: skill.hitCount,
    });
  }
  if (skill.unlock.kind === 'level' && action.requiredClassLevel !== skill.unlock.level) {
    addIssue(issues, 'unlock-level-mismatch', 'skill.unlock.level', {
      expected: action.requiredClassLevel,
      actual: skill.unlock.level,
    });
  }
  if (!mir4NativeRuntimeTargetingMatches(action.skillId, action.targeting, skill.requiresTarget)) {
    addIssue(issues, 'targeting-mismatch', 'skill.requiresTarget', {
      expected: action.targeting,
      actual: skill.requiresTarget,
    });
  }

  const nativeRangePolicy = mir4NativeRuntimeActivationRangePolicy(action.skillId);
  const nativeSourceFacets = mir4NativeRuntimeSkillSourceFacets(action.skillId);
  const nativeIndicatorPolicy = mir4NativeExpectedIndicator(action.skillId);
  const nativeGuidePolicy =
    action.rows
      .map((row) => mir4NativeRuntimeGuidePolicy(action.skillId, row.attackId))
      .find((policy) => policy !== null) ?? null;
  let runtimeRangePixels: number | null = 0;
  if (skill.requiresTarget) {
    if (nativeRangePolicy) {
      runtimeRangePixels = null;
    } else if (skill.castRangePx === undefined) {
      addIssue(issues, 'runtime-range-unresolved', 'skill.castRangePx', {
        actual: null,
      });
    } else {
      runtimeRangePixels = skill.castRangePx;
      validateScalar(issues, 'skill.castRangePx', runtimeRangePixels, 'runtime');
    }
  } else if (skill.castRangePx !== undefined) {
    runtimeRangePixels = skill.castRangePx;
    validateScalar(issues, 'skill.castRangePx', runtimeRangePixels, 'runtime');
    if (skill.castRangePx !== 0) {
      addIssue(issues, 'range-mismatch', 'skill.castRangePx', {
        expected: 0,
        actual: skill.castRangePx,
      });
    }
  }
  if (!nativeRangePolicy && skill.browserRangePx !== runtimeRangePixels) {
    addIssue(issues, 'range-mismatch', 'skill.browserRangePx', {
      expected: runtimeRangePixels,
      actual: skill.browserRangePx,
    });
  }
  validateScalar(issues, 'action.indicator.nativeMin', action.indicator.nativeMin, 'native');
  validateScalar(issues, 'action.indicator.nativeMax', action.indicator.nativeMax, 'native');
  if (action.indicator.nativeMin > action.indicator.nativeMax) {
    addIssue(issues, 'range-mismatch', 'action.indicator.nativeMin', {
      expected: action.indicator.nativeMax,
      actual: action.indicator.nativeMin,
    });
  }
  if (nativeRangePolicy && action.blockingCheck !== (nativeRangePolicy.blockingCheck ? 1 : 0)) {
    addIssue(issues, 'range-mismatch', 'action.blockingCheck', {
      expected: nativeRangePolicy.blockingCheck ? 1 : 0,
      actual: action.blockingCheck,
    });
  } else if (!nativeRangePolicy && action.blockingCheck !== 0) {
    addIssue(issues, 'unresolved-native-skill-facet', 'action.blockingCheck', {
      expected: 0,
      actual: action.blockingCheck,
    });
  }
  const unresolvedIndicatorFields = [
    ['type', action.indicator.type],
    ['index', action.indicator.index],
    ['angleDegrees', action.indicator.angleDegrees],
    ['nativeWidth', action.indicator.nativeWidth],
    ['nativeOffset', action.indicator.nativeOffset],
    ['nativeHeight', action.indicator.nativeHeight],
  ] as const;
  for (const [field, value] of unresolvedIndicatorFields) {
    if (field === 'nativeHeight' && nativeRangePolicy) {
      if (value !== nativeRangePolicy.targetHeightNative) {
        addIssue(issues, 'range-mismatch', `action.indicator.${field}`, {
          expected: nativeRangePolicy.targetHeightNative,
          actual: value,
        });
      }
      continue;
    }
    const exactGuideIndicator =
      nativeGuidePolicy !== null &&
      ((field === 'index' && value === nativeGuidePolicy.indicatorIndex) ||
        (field === 'nativeWidth' &&
          value ===
            (nativeGuidePolicy.guideShape === 'direct'
              ? nativeGuidePolicy.indicatorNativeWidth
              : 0)));
    const exactTargetingIndicator =
      nativeIndicatorPolicy !== null &&
      ((field === 'type' && value === 0) ||
        (field === 'index' && value === nativeIndicatorPolicy.index) ||
        (field === 'angleDegrees' && value === nativeIndicatorPolicy.angleDegrees) ||
        (field === 'nativeWidth' && value === nativeIndicatorPolicy.nativeWidth) ||
        (field === 'nativeOffset' && value === nativeIndicatorPolicy.nativeOffset) ||
        (field === 'nativeHeight' && value === nativeIndicatorPolicy.nativeHeight));
    const expectedTargetingValue =
      nativeIndicatorPolicy === null
        ? 0
        : field === 'index'
          ? nativeIndicatorPolicy.index
          : field === 'angleDegrees'
            ? nativeIndicatorPolicy.angleDegrees
            : field === 'nativeWidth'
              ? nativeIndicatorPolicy.nativeWidth
              : field === 'nativeOffset'
                ? nativeIndicatorPolicy.nativeOffset
                : field === 'nativeHeight'
                  ? nativeIndicatorPolicy.nativeHeight
                  : 0;
    if (
      !exactGuideIndicator &&
      !exactTargetingIndicator &&
      (value !== 0 || expectedTargetingValue !== 0)
    ) {
      addIssue(issues, 'unresolved-native-skill-facet', `action.indicator.${field}`, {
        expected: expectedTargetingValue,
        actual: value,
      });
    }
  }

  validateNativeSkillFacets(issues, input);
  validateRuntimeSkillFacets(issues, input);

  const attackIds = new Set<number>();
  action.rows.forEach((row, rowIndex) => {
    validateId(issues, `action.rows[${rowIndex}].attackId`, row.attackId, 'native');
    validateId(issues, `action.rows[${rowIndex}].nextAttackId`, row.nextAttackId, 'native', true);
    validateIntegerValue(
      issues,
      `action.rows[${rowIndex}].mainAttack`,
      row.mainAttack,
      'native',
      0,
      row.attackId,
    );
    if (attackIds.has(row.attackId)) {
      addIssue(issues, 'duplicate-attack-id', `action.rows[${rowIndex}].attackId`, {
        attackId: row.attackId,
        actual: row.attackId,
      });
    }
    attackIds.add(row.attackId);
  });
  const runtimeAttackIds = new Set<number>();
  skill.attackIds.forEach((attackId, index) => {
    validateId(issues, `skill.attackIds[${index}]`, attackId, 'runtime');
    if (runtimeAttackIds.has(attackId)) {
      addIssue(issues, 'duplicate-attack-id', `skill.attackIds[${index}]`, {
        attackId,
        actual: attackId,
      });
    }
    runtimeAttackIds.add(attackId);
  });

  const maxAttackIdLength = Math.max(action.rows.length, skill.attackIds.length);
  for (let index = 0; index < maxAttackIdLength; index += 1) {
    const nativeAttackId = action.rows[index]?.attackId ?? null;
    const runtimeAttackId = skill.attackIds[index] ?? null;
    if (nativeAttackId !== runtimeAttackId) {
      addIssue(issues, 'attack-id-mismatch', `skill.attackIds[${index}]`, {
        attackId: nativeAttackId ?? runtimeAttackId ?? undefined,
        expected: nativeAttackId,
        actual: runtimeAttackId,
      });
    }
  }

  action.rows.forEach((row, rowIndex) => {
    const expectedNext = action.rows[rowIndex + 1]?.attackId ?? 0;
    if (row.nextAttackId !== 0 && !attackIds.has(row.nextAttackId)) {
      addIssue(issues, 'external-attack-link', `action.rows[${rowIndex}].nextAttackId`, {
        attackId: row.attackId,
        relatedAttackId: row.nextAttackId,
        actual: row.nextAttackId,
      });
    } else if (row.nextAttackId !== expectedNext) {
      addIssue(issues, 'broken-attack-link', `action.rows[${rowIndex}].nextAttackId`, {
        attackId: row.attackId,
        relatedAttackId: row.nextAttackId,
        expected: expectedNext,
        actual: row.nextAttackId,
      });
    }
  });

  let previousImpactStart = -1;
  let previousImpactOffset = -1;
  for (const [rowIndex, row] of action.rows.entries()) {
    const rowBase = `action.rows[${rowIndex}]`;
    const runtimeImpactOffsets = mir4NativeRuntimeImpactOffsets(action, row);
    validateNativeAttackFacets(issues, row, rowIndex, action.skillId, skill);
    validateNativeDamageProjection(issues, row, rowIndex, action.skillId);
    const rawFiniteFields = [
      ['viewTarget', row.viewTarget],
      ['targetType', row.targetType],
      ['authorialTargetValue', row.authorialTargetValue],
      ['impactType', row.impactType],
      ['geometry.angleDegrees', row.geometry.angleDegrees],
      ['geometry.nativeOffset.x', row.geometry.nativeOffset.x],
      ['geometry.nativeOffset.y', row.geometry.nativeOffset.y],
      ['geometry.nativeOffset.z', row.geometry.nativeOffset.z],
      ['geometry.rotationDegrees', row.geometry.rotationDegrees],
    ] as const;
    for (const [field, value] of rawFiniteFields) {
      validateFiniteValue(issues, `${rowBase}.${field}`, value, 'native', row.attackId);
    }
    const rawNonNegativeFields = [
      ['targetDistance.nativeMin', row.targetDistance.nativeMin],
      ['targetDistance.nativeMax', row.targetDistance.nativeMax],
      ['geometry.nativeDistanceMin', row.geometry.nativeDistanceMin],
      ['geometry.nativeDistanceMax', row.geometry.nativeDistanceMax],
      ['geometry.nativeWidth', row.geometry.nativeWidth],
      ['geometry.nativeHeight', row.geometry.nativeHeight],
    ] as const;
    for (const [field, value] of rawNonNegativeFields) {
      validateScalar(issues, `${rowBase}.${field}`, value, 'native', row.attackId);
    }
    if (row.targetDistance.nativeMin > row.targetDistance.nativeMax) {
      addIssue(issues, 'range-mismatch', `${rowBase}.targetDistance.nativeMin`, {
        attackId: row.attackId,
        expected: row.targetDistance.nativeMax,
        actual: row.targetDistance.nativeMin,
      });
    }
    if (
      nativeRangePolicy &&
      row.attackId === nativeRangePolicy.firstAttackId &&
      row.targetDistance.nativeMax !== nativeRangePolicy.targetDistanceMaxNative
    ) {
      addIssue(issues, 'range-mismatch', `${rowBase}.targetDistance.nativeMax`, {
        attackId: row.attackId,
        expected: nativeRangePolicy.targetDistanceMaxNative,
        actual: row.targetDistance.nativeMax,
      });
    }
    if (row.geometry.nativeDistanceMin > row.geometry.nativeDistanceMax) {
      addIssue(issues, 'range-mismatch', `${rowBase}.geometry.nativeDistanceMin`, {
        attackId: row.attackId,
        expected: row.geometry.nativeDistanceMax,
        actual: row.geometry.nativeDistanceMin,
      });
    }

    if (!validFiniteNonNegative(row.impactStartMs)) {
      addIssue(issues, 'invalid-timing', `${rowBase}.impactStartMs`, {
        attackId: row.attackId,
        actual: String(row.impactStartMs),
      });
    } else {
      if (row.impactStartMs < previousImpactStart) {
        addIssue(issues, 'decreasing-timing', `${rowBase}.impactStartMs`, {
          attackId: row.attackId,
          expected: previousImpactStart,
          actual: row.impactStartMs,
        });
      }
      if (row.impactStartMs > action.attackAnimationMs) {
        addIssue(issues, 'timing-outside-animation', `${rowBase}.impactStartMs`, {
          attackId: row.attackId,
          expected: action.attackAnimationMs,
          actual: row.impactStartMs,
        });
      }
      previousImpactStart = row.impactStartMs;
    }

    if (!['none', 'target', 'direct', 'forward'].includes(row.movement.kind)) {
      addIssue(issues, 'unresolved-native-attack-facet', `${rowBase}.movement.kind`, {
        attackId: row.attackId,
        actual: row.movement.kind,
      });
    } else if (
      row.movement.kind === 'direct' &&
      action.skillId !== 4106 &&
      action.skillId !== 4112
    ) {
      addIssue(issues, 'unsupported-direct-movement', `${rowBase}.movement.kind`, {
        attackId: row.attackId,
        actual: row.movement.kind,
      });
    }
    if (
      row.movement.kind === 'none' &&
      (row.movement.nativeRange !== 0 ||
        row.movement.delayMs !== 0 ||
        row.movement.durationMs !== 0)
    ) {
      addIssue(issues, 'unresolved-native-attack-facet', `${rowBase}.movement`, {
        attackId: row.attackId,
        expected: 'zero-none-movement',
      });
    }
    validateScalar(
      issues,
      `${rowBase}.movement.nativeRange`,
      Math.abs(row.movement.nativeRange),
      'native',
      row.attackId,
    );
    if (!validFiniteNonNegative(row.movement.delayMs)) {
      addIssue(issues, 'invalid-timing', `${rowBase}.movement.delayMs`, {
        attackId: row.attackId,
        actual: String(row.movement.delayMs),
      });
    }
    if (!validFiniteNonNegative(row.movement.durationMs)) {
      addIssue(issues, 'invalid-timing', `${rowBase}.movement.durationMs`, {
        attackId: row.attackId,
        actual: String(row.movement.durationMs),
      });
    }
    if (
      validFiniteNonNegative(row.movement.delayMs) &&
      validFiniteNonNegative(row.movement.durationMs) &&
      (action.skillId === 4112
        ? row.movement.delayMs + row.movement.durationMs
        : row.impactStartMs + row.movement.delayMs + row.movement.durationMs) >
        action.attackAnimationMs
    ) {
      addIssue(issues, 'timing-outside-animation', `${rowBase}.movement.durationMs`, {
        attackId: row.attackId,
        expected: action.attackAnimationMs,
        actual:
          action.skillId === 4112
            ? row.movement.delayMs + row.movement.durationMs
            : row.impactStartMs + row.movement.delayMs + row.movement.durationMs,
      });
    }
    const exactGreaterHealDeadTarget =
      action.skillId === 3504 &&
      row.targetSubtype === 'dead-only' &&
      (row.attackId === 350403 || row.attackId === 350404);
    if (row.targetSubtype !== 'alive-only' && !exactGreaterHealDeadTarget) {
      addIssue(issues, 'unsupported-target-subtype', `${rowBase}.targetSubtype`, {
        attackId: row.attackId,
        expected: 'alive-only',
        actual: row.targetSubtype,
      });
    }
    const expectedRawSubtype =
      row.targetSubtype === 'dead-only' ? 'TARGET_SUBTYPE::DeadOnly' : 'TARGET_SUBTYPE::AliveOnly';
    if (row.nativeBehavior.rawTargetSubtype !== expectedRawSubtype) {
      addIssue(
        issues,
        'raw-target-subtype-mismatch',
        `${rowBase}.nativeBehavior.rawTargetSubtype`,
        {
          attackId: row.attackId,
          expected: expectedRawSubtype,
          actual: row.nativeBehavior.rawTargetSubtype,
        },
      );
    }

    runtimeImpactOffsets.forEach((offset, impactIndex) => {
      const path = `${rowBase}.impactOffsetsMs[${impactIndex}]`;
      if (!validFiniteNonNegative(offset)) {
        addIssue(issues, 'invalid-timing', path, {
          attackId: row.attackId,
          actual: String(offset),
        });
        return;
      }
      if (offset < previousImpactOffset) {
        addIssue(issues, 'decreasing-timing', path, {
          attackId: row.attackId,
          expected: previousImpactOffset,
          actual: offset,
        });
      }
      if (offset < row.impactStartMs || offset > action.attackAnimationMs) {
        addIssue(issues, 'timing-outside-animation', path, {
          attackId: row.attackId,
          expected: action.attackAnimationMs,
          actual: offset,
        });
      }
      previousImpactOffset = offset;
    });
  }

  let allocationMode: Mir4SkillExecutionDamageAllocation | null = null;
  const componentsByAttackId = new Map<
    number,
    NonNullable<typeof skill.damage>['components'][number][]
  >();
  if (skill.damage !== null) {
    if (
      skill.damage.allocationMode === 'per-impact' ||
      skill.damage.allocationMode === 'row-total-impact-vector' ||
      skill.damage.allocationMode === 'row-total-final-contact'
    ) {
      allocationMode = skill.damage.allocationMode;
    } else {
      addIssue(issues, 'unsupported-damage-allocation', 'skill.damage.allocationMode', {
        actual: skill.damage.allocationMode,
      });
    }
    skill.damage.components.forEach((component, componentIndex) => {
      const componentBase = `skill.damage.components[${componentIndex}]`;
      validateId(issues, `${componentBase}.attackId`, component.attackId, 'runtime');
      validateIntegerValue(
        issues,
        `${componentBase}.damageType`,
        component.damageType,
        'runtime',
        0,
        component.attackId,
      );
      validateIntegerValue(
        issues,
        `${componentBase}.damageAttribute`,
        component.damageAttribute,
        'runtime',
        0,
        component.attackId,
      );
      validateScalar(
        issues,
        `${componentBase}.coefficient`,
        component.coefficient,
        'runtime',
        component.attackId,
      );
      validateScalar(
        issues,
        `${componentBase}.levelUpCoefficient`,
        component.levelUpCoefficient,
        'runtime',
        component.attackId,
      );
      const siblingComponents = componentsByAttackId.get(component.attackId) ?? [];
      if (siblingComponents.some((sibling) => sibling.damageType === component.damageType)) {
        addIssue(
          issues,
          'duplicate-damage-component',
          `skill.damage.components[${componentIndex}].attackId`,
          { attackId: component.attackId, actual: component.attackId },
        );
      } else {
        siblingComponents.push(component);
        componentsByAttackId.set(component.attackId, siblingComponents);
      }
      if (!validFiniteInteger(component.impactCount) || component.impactCount <= 0) {
        addIssue(
          issues,
          'invalid-runtime-value',
          `skill.damage.components[${componentIndex}].impactCount`,
          {
            attackId: component.attackId,
            actual: issueNumber(component.impactCount),
          },
        );
      }
    });
    validateScalar(
      issues,
      'skill.damage.aggregateCoefficient',
      skill.damage.aggregateCoefficient,
      'runtime',
    );
    validateScalar(
      issues,
      'skill.damage.aggregateLevelUpCoefficient',
      skill.damage.aggregateLevelUpCoefficient,
      'runtime',
    );
    const aggregateCoefficient = skill.damage.components.reduce(
      (total, component) => total + component.coefficient,
      0,
    );
    if (aggregateCoefficient !== skill.damage.aggregateCoefficient) {
      addIssue(
        issues,
        'damage-aggregate-coefficient-mismatch',
        'skill.damage.aggregateCoefficient',
        {
          expected: aggregateCoefficient,
          actual: skill.damage.aggregateCoefficient,
        },
      );
    }
    const aggregateLevelUpCoefficient = skill.damage.components.reduce(
      (total, component) => total + component.levelUpCoefficient,
      0,
    );
    if (aggregateLevelUpCoefficient !== skill.damage.aggregateLevelUpCoefficient) {
      addIssue(
        issues,
        'damage-aggregate-level-up-coefficient-mismatch',
        'skill.damage.aggregateLevelUpCoefficient',
        {
          expected: aggregateLevelUpCoefficient,
          actual: skill.damage.aggregateLevelUpCoefficient,
        },
      );
    }
  }

  const nativeDamageRows = action.rows.filter(rowHasDamage);
  const unresolvedMultiImpactRow = nativeDamageRows.find((row) => row.impactOffsetsMs.length > 1);
  const multiImpactPolicy = mir4NativeRuntimeMultiImpactPolicy(action.skillId);
  if (
    allocationMode !== null &&
    unresolvedMultiImpactRow !== undefined &&
    multiImpactPolicy?.allocationMode !== allocationMode
  ) {
    addIssue(issues, 'unsupported-damage-allocation', 'skill.damage.allocationMode', {
      attackId: unresolvedMultiImpactRow.attackId,
      expected: multiImpactPolicy?.allocationMode ?? 'typed-multi-impact-ruling',
      actual: allocationMode,
    });
  }
  if (nativeDamageRows.length > 0 && skill.damage === null) {
    addIssue(issues, 'runtime-damage-missing', 'skill.damage', {
      actual: null,
    });
  }
  if (nativeDamageRows.length === 0 && skill.damage !== null) {
    addIssue(issues, 'runtime-damage-unexpected', 'skill.damage');
  }

  const matchedComponents = new Set<NonNullable<typeof skill.damage>['components'][number]>();
  const rowPlans: Mir4SkillExecutionRowPlan[] = [];
  const nativeDamageOffsets: number[] = [];
  for (const [rowIndex, row] of action.rows.entries()) {
    const runtimeImpactOffsets = mir4NativeRuntimeImpactOffsets(action, row);
    const components = componentsByAttackId.get(row.attackId) ?? [];
    const damaging = rowHasDamage(row);
    if (damaging) nativeDamageOffsets.push(...runtimeImpactOffsets);
    if (damaging && components.length === 0) {
      addIssue(issues, 'damage-component-missing', `skill.damage.components`, {
        attackId: row.attackId,
      });
    }
    if (!damaging && components.length > 0) {
      addIssue(issues, 'damage-component-unexpected', 'skill.damage.components', {
        attackId: row.attackId,
      });
    }

    const contacts: Mir4SkillExecutionContactPlan[] = [];
    if (damaging && components.length > 0) {
      const dualDamage = exactRuntimeDualDamageRow(skill, row);
      for (const component of components) {
        matchedComponents.add(component);
        const nativeChannel =
          component.damageType === 1
            ? row.nativeBehavior.physicalDamage
            : component.damageType === 2
              ? row.nativeBehavior.magicDamage
              : null;
        if (nativeChannel === null || !channelHasValue(nativeChannel)) {
          addIssue(issues, 'damage-type-mismatch', `skill.damage.components`, {
            attackId: row.attackId,
            expected: row.damage.type,
            actual: component.damageType,
          });
        }
        if (component.damageAttribute !== row.damage.attribute) {
          addIssue(issues, 'damage-attribute-mismatch', `skill.damage.components`, {
            attackId: row.attackId,
            expected: row.damage.attribute,
            actual: component.damageAttribute,
          });
        }
        const expectedCoefficient = nativeChannel?.coefficient ?? row.damage.coefficient;
        const expectedLevelUpCoefficient =
          nativeChannel?.levelUpCoefficient ?? row.damage.levelUpCoefficient;
        if (component.coefficient !== expectedCoefficient) {
          addIssue(issues, 'damage-coefficient-mismatch', `skill.damage.components`, {
            attackId: row.attackId,
            expected: expectedCoefficient,
            actual: component.coefficient,
          });
        }
        if (component.levelUpCoefficient !== expectedLevelUpCoefficient) {
          addIssue(issues, 'damage-level-up-coefficient-mismatch', 'skill.damage.components', {
            attackId: row.attackId,
            expected: expectedLevelUpCoefficient,
            actual: component.levelUpCoefficient,
          });
        }
        if (component.impactCount !== runtimeImpactOffsets.length) {
          addIssue(issues, 'damage-impact-count-mismatch', 'skill.damage.components', {
            attackId: row.attackId,
            expected: runtimeImpactOffsets.length,
            actual: component.impactCount,
          });
        }
        if (!dualDamage && components.length > 1) {
          addIssue(issues, 'unresolved-dual-damage-channel', 'skill.damage.components', {
            attackId: row.attackId,
          });
        }
        if (allocationMode !== null) {
          runtimeImpactOffsets.forEach((offsetMs, sourceImpactIndex) => {
            const contactScaleBasisPoints =
              allocationMode === 'row-total-final-contact'
                ? sourceImpactIndex === runtimeImpactOffsets.length - 1
                  ? 10_000
                  : 0
                : (multiImpactPolicy?.contactCoefficientScaleBasisPoints?.[sourceImpactIndex] ??
                  10_000);
            contacts.push({
              sourceImpactIndex,
              offsetMs,
              damage: {
                damageType: component.damageType,
                damageAttribute: component.damageAttribute,
                coefficient: Math.floor((component.coefficient * contactScaleBasisPoints) / 10_000),
                levelUpCoefficient: Math.floor(
                  (component.levelUpCoefficient * contactScaleBasisPoints) / 10_000,
                ),
                componentImpactCount: component.impactCount,
                allocationMode,
              },
            });
          });
        }
      }
    }

    rowPlans.push({
      sourceRowIndex: rowIndex,
      attackId: row.attackId,
      mainAttack: row.mainAttack,
      nextAttackId: row.nextAttackId,
      impactStartMs: row.impactStartMs,
      motion:
        row.movement.kind === 'target' ||
        row.movement.kind === 'direct' ||
        row.movement.kind === 'forward'
          ? {
              kind: row.movement.kind,
              nativeRange: row.movement.nativeRange,
              delayMs: row.movement.delayMs,
              durationMs: row.movement.durationMs,
            }
          : null,
      projectile: mir4NativeRuntimeProjectilePolicy(action.skillId, row.attackId),
      target: {
        viewTarget: row.viewTarget,
        nativeDistanceMin: row.targetDistance.nativeMin,
        nativeDistanceMax: row.targetDistance.nativeMax,
        targetType: row.targetType,
        authorialTargetValue: row.authorialTargetValue,
        targetSubtype: row.targetSubtype,
        impactType: row.impactType,
      },
      geometry: {
        ...row.geometry,
        nativeOffset: { ...row.geometry.nativeOffset },
      },
      guide: mir4NativeRuntimeGuidePolicy(action.skillId, row.attackId),
      nativeCombat: {
        attackRage: mir4NativeRuntimeAttackRageGain(action.skillId, row.attackId),
        hitRage: mir4NativeRuntimeHitRagePolicy(action.skillId, row.attackId),
        aggro: mir4NativeRuntimeAggroPolicy(action.skillId, row.attackId),
      },
      contacts,
    });
  }

  if (skill.damage !== null) {
    for (const component of skill.damage.components) {
      if (!matchedComponents.has(component)) {
        addIssue(issues, 'damage-component-unexpected', 'skill.damage.components', {
          attackId: component.attackId,
        });
      }
    }
  }

  if (nativeDamageOffsets.length > 0) {
    if (skill.impactOffsetsMs === undefined) {
      addIssue(issues, 'runtime-impact-offsets-missing', 'skill.impactOffsetsMs', {
        expected: nativeDamageOffsets.join(','),
        actual: null,
      });
    } else {
      let previousRuntimeOffset = -1;
      skill.impactOffsetsMs.forEach((offset, index) => {
        const path = `skill.impactOffsetsMs[${index}]`;
        if (!validFiniteNonNegative(offset)) {
          addIssue(issues, 'invalid-timing', path, { actual: String(offset) });
        } else {
          if (offset < previousRuntimeOffset) {
            addIssue(issues, 'decreasing-timing', path, {
              expected: previousRuntimeOffset,
              actual: offset,
            });
          }
          if (offset > skill.attackAnimationMs) {
            addIssue(issues, 'timing-outside-animation', path, {
              expected: skill.attackAnimationMs,
              actual: offset,
            });
          }
          previousRuntimeOffset = offset;
        }
      });
      const offsetCount = Math.max(nativeDamageOffsets.length, skill.impactOffsetsMs.length);
      for (let index = 0; index < offsetCount; index += 1) {
        const nativeOffset = nativeDamageOffsets[index] ?? null;
        const runtimeOffset = skill.impactOffsetsMs[index] ?? null;
        if (nativeOffset !== runtimeOffset) {
          addIssue(issues, 'impact-offset-mismatch', `skill.impactOffsetsMs[${index}]`, {
            expected: nativeOffset,
            actual: runtimeOffset,
          });
        }
      }
    }
  } else if (skill.impactOffsetsMs !== undefined && skill.impactOffsetsMs.length > 0) {
    addIssue(issues, 'impact-offset-mismatch', 'skill.impactOffsetsMs', {
      expected: '',
      actual: skill.impactOffsetsMs.join(','),
    });
  }

  if (issues.length > 0) return fail(issues);
  const assetPresentation = mir4NativeSkillAssetPresentationEvidence(action.skillId);
  const plan = freezePlan({
    source: 'runtime-approved',
    skillId: action.skillId,
    cooldownMs: action.cooldownMs,
    skillCostType: action.skillCostType,
    skillCost: action.skillCost,
    attackAnimationMs: action.attackAnimationMs,
    endCutAnimationMs: action.endCutAnimationMs,
    requiredClassLevel: action.requiredClassLevel,
    runtimeUnlock: { ...skill.unlock },
    sourceHitCount: action.hitCount,
    requiresTarget: skill.requiresTarget,
    nativeSkill: nativeSourceFacets,
    presentation: {
      ...(assetPresentation?.presentation ?? action.presentation),
    },
    range: {
      runtimePixels: runtimeRangePixels,
      nativeMin: action.indicator.nativeMin,
      nativeMax: action.indicator.nativeMax,
      ...(nativeRangePolicy
        ? {
            nativeContactDistanceMax: nativeRangePolicy.targetDistanceMaxNative,
            nativeTraceStopPadding: nativeRangePolicy.traceStopPaddingNative,
            nativeTargetHeight: nativeRangePolicy.targetHeightNative,
            blockingCheck: nativeRangePolicy.blockingCheck,
          }
        : {}),
    },
    damageAllocation: allocationMode,
    totem: mir4NativeRuntimeTotemPlan(action.skillId),
    rows: rowPlans,
  });
  return Object.freeze({ ok: true as const, plan });
}
