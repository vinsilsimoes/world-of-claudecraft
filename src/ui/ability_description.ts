// The localized ability DESCRIPTION prose every tooltip surface shows, plus the
// placeholder values spliced into it.
//
// Extracted from hud.ts (the monolith ratchet): the description is resolved from
// the RESOLVED ability and the caller's scaling alone, never from the Hud's
// private mutable state, so it is a sibling module the coordinator consumes.
// Both callers (the ability tooltip and the aura tooltip's ability-description
// injector) go through abilityDisplayDescription, and the field CHOICE is a pure
// core (abilityDescriptionField) a vitest drives directly.

import {
  mir4ActionBurnTooltipDamage,
  mir4ActionHealTooltipHealing,
  mir4SkillIdFromAction,
} from '../sim/mir4/action_abilities';
import { mir4NativePeriodicDamagePlan } from '../sim/mir4/native_periodic_damage';
import { mir4NativeRuntimeChillDebuff } from '../sim/mir4/native_skill_chill_debuff';
import { mir4NativeExpulsionCirclePolicy } from '../sim/mir4/native_skill_expulsion_circle';
import { mir4NativeGreaterHealPolicy } from '../sim/mir4/native_skill_greater_heal';
import { mir4NativeGuardianCirclePolicy } from '../sim/mir4/native_skill_guardian_circle';
import type { ResolvedAbility } from '../sim/sim';
import {
  type AbilityEffect,
  FAERIE_FIRE_ARMOR_PCT,
  SUNDER_ARMOR_PCT_PER_STACK,
} from '../sim/types';
import {
  type AbilityScaling,
  abilityBuffValue,
  abilityDamageBonus,
  abilityDurationValue,
  abilityOverTimeEffect,
  abilityPrimaryEffect,
  abilitySecondaryEffect,
  abilityTemporalHourglassValues,
  auraBuffDisplayValue,
} from './ability_damage';
import type { AuraEffectInput } from './aura_effect';
import { type AbilitySpecNoteField, tEntity, tEntityOptional } from './entity_i18n';
import { formatNumber, type InterpolationValues, t } from './i18n';

/** The tooltip's number format for every ability figure (damage, seconds, costs). */
export function formatAbilityNumber(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

// Builds the {damage} value for an ability tooltip. The selected effect is
// rank- and talent-resolved before this formatter sees it, so custom flat
// effects such as Litany display Hexcraft's modifier without inventing a
// second damage path in the HUD coordinator.
export function abilityEffectText(res: ResolvedAbility, scaling?: AbilityScaling): string {
  const suffix = (eff: AbilityEffect) => {
    const bonus = scaling ? abilityDamageBonus(res, eff, scaling) : 0;
    return bonus > 0
      ? ` ${t('hudChrome.abilityScaling.bonus', { value: formatAbilityNumber(bonus) })}`
      : '';
  };
  const primary = abilityPrimaryEffect(res);
  if (primary && scaling && mir4SkillIdFromAction(res.def.id) !== null) {
    return formatAbilityNumber(abilityDamageBonus(res, primary, scaling));
  }
  if (primary) {
    switch (primary.type) {
      case 'directDamage':
      case 'aoeDamage':
      case 'aoeHeal':
      case 'chainHeal':
      case 'aoeRoot':
      case 'chainDamage':
      case 'groundAoE':
      case 'drainTick':
      case 'valkyrsCalling':
      case 'hunterStampede':
        return abilityAmountRange(primary.min, primary.max) + suffix(primary);
      case 'heal':
        return primary.casterMaxHpPct === undefined
          ? abilityAmountRange(primary.min, primary.max) + suffix(primary)
          : formatAbilityNumber(primary.casterMaxHpPct * 100);
      case 'repositionToAim':
        return primary.landingAoe
          ? abilityAmountRange(primary.landingAoe.min, primary.landingAoe.max)
          : '';
      case 'consumeAura':
        if (primary.deal) {
          return abilityAmountRange(primary.deal.min, primary.deal.max) + suffix(primary);
        }
        if (primary.heal) {
          return abilityAmountRange(primary.heal.min, primary.heal.max) + suffix(primary);
        }
        return '';
      case 'weaponDamage':
      case 'weaponStrike':
        return formatAbilityNumber(primary.bonus);
      case 'sunder':
        return formatAbilityNumber(
          SUNDER_ARMOR_PCT_PER_STACK *
            (primary.full || primary.perCombo ? primary.maxStacks : 1) *
            100,
        );
      case 'faerieFire':
        return formatAbilityNumber(FAERIE_FIRE_ARMOR_PCT * 100);
      case 'lifeTap':
        return formatAbilityNumber(primary.hp);
      case 'finisherDamage':
        return (
          t('abilityUi.tooltip.finisherDamage', {
            base: formatAbilityNumber(primary.base),
            perCombo: formatAbilityNumber(primary.perCombo),
          }) + suffix(primary)
        );
      case 'hunterBloodhook':
        return (
          formatAbilityNumber(primary.bleedTotal * (primary.damageMult ?? 1)) + suffix(primary)
        );
      case 'afflictionLitany':
        return formatAbilityNumber(primary.damage);
    }
  }

  const secondary = abilitySecondaryEffect(res);
  if (!secondary) return '';
  switch (secondary.type) {
    case 'dot':
      if (secondary.perCombo !== undefined) {
        return (
          t('abilityUi.tooltip.finisherDamage', {
            base: formatAbilityNumber(secondary.total),
            perCombo: formatAbilityNumber(secondary.perCombo),
          }) + suffix(secondary)
        );
      }
      return formatAbilityNumber(secondary.total) + suffix(secondary);
    case 'hot':
      return formatAbilityNumber(secondary.total) + suffix(secondary);
    case 'absorb':
      return secondary.casterMaxHpPct === undefined
        ? formatAbilityNumber(secondary.amount) + suffix(secondary)
        : formatAbilityNumber(secondary.casterMaxHpPct * 100);
    case 'imbue':
      return formatAbilityNumber(secondary.bonus);
    default:
      return '';
  }
}

function abilityAmountRange(min: number, max: number): string {
  if (min === max) return formatAbilityNumber(min);
  return t('abilityUi.tooltip.damageRange', {
    min: formatAbilityNumber(min),
    max: formatAbilityNumber(max),
  });
}

/** Maps custom ability effects onto the same localized, resolved effect lines
 *  their active auras use. The HUD renders this beside the static ability prose,
 *  so every locale receives the live rank and talent values without duplicating
 *  interpolation tokens across translated ability descriptions. */
export function abilityEffectAuraInput(effect: AbilityEffect): AuraEffectInput | null {
  if (effect.type !== 'afflictionLitany') return null;
  return {
    kind: 'affliction_litany',
    value: effect.damage,
    value2: effect.radius,
    value3: effect.maxTargets,
  };
}

// Builds the `$o` over-time string (a hybrid's dot/hot TOTAL) the same way
// abilityEffectText builds `$d`, including the "(+N)" scaling callout (which the
// bonus helper zeroes for hybrid riders, matching combat's no-double-dip rule).
function abilityOverTimeText(res: ResolvedAbility, scaling?: AbilityScaling): string {
  const eff = abilityOverTimeEffect(res);
  if (!eff) return '';
  const b = scaling ? abilityDamageBonus(res, eff, scaling) : 0;
  const bonus =
    b > 0 ? ` ${t('hudChrome.abilityScaling.bonus', { value: formatAbilityNumber(b) })}` : '';
  if (eff.type === 'dot' && eff.perCombo !== undefined) {
    return (
      t('abilityUi.tooltip.finisherDamage', {
        base: formatAbilityNumber(eff.total),
        perCombo: formatAbilityNumber(eff.perCombo),
      }) + bonus
    );
  }
  return formatAbilityNumber(eff.total) + bonus;
}

/** Which description field the RESOLVED ability should read: the stealth-free
 *  variant once a talent has retired the stealth gate (Cheap Trick on Gut Punch),
 *  the base description otherwise. Pure: the caller resolves the field through
 *  i18n and falls back to 'description' when the active locale has not filled the
 *  variant. */
export function abilityDescriptionField(
  res: ResolvedAbility,
): 'description' | 'descriptionNoStealth' {
  return res.def.requiresStealth === true && res.ignoreStealthRequirement === true
    ? 'descriptionNoStealth'
    : 'description';
}

// Fills every description placeholder from the RESOLVED ability: {damage} ($d)
// the primary hit, {overTime} ($o) a hybrid's dot/hot total, {buff} ($b) the
// first buff's value, {duration} ($t) the first timed effect's duration. All are
// rank- and talent-resolved, so the prose can never drift from what a cast does.
// `auraOverride`'s `$b` comes from an already-APPLIED aura's own (kind, value)
// instead of `res`: `res` is only ever resolved from the VIEWER's known
// abilities (talents included), so on another player's buff it must not
// override the real applied strength (e.g. Pact Deepened doubling Fiendhide's
// armor for its owner, which must still read doubled on every other screen).
export function abilityDisplayDescription(
  res: ResolvedAbility,
  damageText: string,
  scaling?: AbilityScaling,
  auraOverride?: { kind: string; value: number },
  spec?: string | null,
): string {
  const buff = auraOverride ? auraBuffDisplayValue(auraOverride) : abilityBuffValue(res);
  const duration = abilityDurationValue(res);
  const hourglass = abilityTemporalHourglassValues(res);
  const mir4SkillId = mir4SkillIdFromAction(res.def.id);
  const mir4Burn = scaling ? mir4ActionBurnTooltipDamage(res.def.id, scaling.spellPower) : null;
  const mir4Heal = scaling
    ? mir4ActionHealTooltipHealing(
        res.def.id,
        res.rank,
        scaling.spellPower,
        scaling.mir4SpellAttackBonus,
        scaling.mir4SkillHealingBps,
      )
    : null;
  const immolatePeriodic =
    scaling && mir4SkillId === 2103
      ? mir4NativePeriodicDamagePlan(20_012, res.rank, scaling.spellPower)
      : null;
  const immolatePeriodicDamage =
    immolatePeriodic?.entries.reduce((total, entry) => total + entry.rawDamage, 0) ?? null;
  const chill =
    mir4SkillId === 2301 ? mir4NativeRuntimeChillDebuff(mir4SkillId, 230113, res.rank) : null;
  const guardianCircle = mir4SkillId === 3501 ? mir4NativeGuardianCirclePolicy(res.rank) : null;
  const greaterHeal = mir4SkillId === 3504 ? mir4NativeGreaterHealPolicy(res.rank) : null;
  const expulsionCircle = mir4SkillId === 3404 ? mir4NativeExpulsionCirclePolicy(res.rank) : null;
  // {rage} splices the RESOLVED gainResource total, so a talent that raises the
  // granted amount (Blood Offering on Blood Toll) shows in the tooltip.
  const rageGained = res.effects.reduce(
    (sum, eff) => sum + (eff.type === 'gainResource' ? eff.amount : 0),
    0,
  );
  const rageText = rageGained > 0 ? formatAbilityNumber(rageGained) : '';
  const values: InterpolationValues = {
    damage: damageText,
    overTime: abilityOverTimeText(res, scaling),
    buff: buff === null ? '' : formatAbilityNumber(buff),
    duration: duration === null ? '' : formatAbilityNumber(duration),
    healing: hourglass === null ? '' : formatAbilityNumber(hourglass.healing),
    selfCooldownRecovery:
      hourglass === null ? '' : formatAbilityNumber(hourglass.selfCooldownRecovery),
    allyCooldownRecovery:
      hourglass === null ? '' : formatAbilityNumber(hourglass.allyCooldownRecovery),
    hostilePveDuration: hourglass === null ? '' : formatAbilityNumber(hourglass.hostilePveDuration),
    hostilePvpDuration: hourglass === null ? '' : formatAbilityNumber(hourglass.hostilePvpDuration),
    groundDuration: hourglass === null ? '' : formatAbilityNumber(hourglass.groundDuration),
    burnPerTick:
      immolatePeriodicDamage === null
        ? mir4Burn === null
          ? ''
          : formatAbilityNumber(mir4Burn.perTick)
        : formatAbilityNumber(immolatePeriodicDamage),
    burnTotal: mir4Burn === null ? '' : formatAbilityNumber(mir4Burn.total),
    healPerPulse: mir4Heal === null ? '' : formatAbilityNumber(mir4Heal.perPulse),
    healTotal: mir4Heal === null ? '' : formatAbilityNumber(mir4Heal.total),
    chillDuration: chill === null ? '' : formatAbilityNumber(chill.durationMs / 1_000),
    guardianPhysicalDefense:
      guardianCircle === null ? '' : formatAbilityNumber(guardianCircle.basePhysicalDefense),
    guardianBashDamageReduction:
      guardianCircle === null
        ? ''
        : formatAbilityNumber(guardianCircle.baseBashDamageReductionBasisPoints / 100),
    expulsionSpellDefense:
      expulsionCircle === null ? '' : formatAbilityNumber(expulsionCircle.baseSpellDefense),
    greaterHealFlat: greaterHeal === null ? '' : formatAbilityNumber(greaterHeal.flatHealing),
    rage: rageText,
  };
  // Cheap Trick retires Gut Punch's stealth requirement. When the RESOLVED ability
  // has dropped it, prefer the stealth-free description variant so the prose stops
  // contradicting the (talent-aware) requirement line, the same way the cost/cast
  // lines already prefer resolved values. A locale that has not TRANSLATED the
  // variant yet resolves null (tEntityOptional declines the English fill) and gets
  // its own base description instead of one English sentence mid-tooltip.
  const stealthFreeVariant =
    abilityDescriptionField(res) === 'descriptionNoStealth'
      ? tEntityOptional({ kind: 'ability', id: res.def.id, field: 'descriptionNoStealth', values })
      : null;
  const text =
    stealthFreeVariant ??
    tEntity({ kind: 'ability', id: res.def.id, field: 'description', values });
  const cooldownDisclosure = t('hudChrome.mir4.skillCooldownDisclosure');
  const disclosedText =
    mir4SkillIdFromAction(res.def.id) === null || text.endsWith(cooldownDisclosure)
      ? text
      : `${text} ${cooldownDisclosure}`;
  // Spec-aware teaching line: a shared button explains its interaction ONLY
  // for the player's current spec, so a new player never reads another
  // spec's rules on their own tooltip.
  const note = spec ? res.def.specNotes?.[spec] : undefined;
  if (!note) return disclosedText;
  return `${disclosedText} ${tEntity({
    kind: 'ability',
    id: res.def.id,
    field: `specNote_${spec}` as AbilitySpecNoteField,
  })}`;
}
