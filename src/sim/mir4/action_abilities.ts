// Profile adapter from the MIR4 skill catalog to the existing World of
// Aeldrune ability model. This is content/model adaptation only: the action
// bar, spellbook, cooldown painter, keybinds and tooltips remain the existing UI.

import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_CLASS_COMBAT_SPECS,
  type Mir4ClassId,
  type Mir4SkillDef,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
  mir4SkillsForClass,
} from '../content/mir4';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import type { ResolvedAbility } from '../sim';
import type { AbilityDef, Entity } from '../types';
import { MIR4_BURN_TICK_SECONDS } from './effects';
import {
  mir4AuthorialSkillRankDamage,
  mir4CoefficientDamage,
  mir4SkillDamageAfterBoost,
  mir4SkillManaCost,
  mir4SkillRankScaledInteger,
} from './math';
import { mir4NativeSkillActivationRanges } from './native_skill_activation_range';
import { mir4NativeBlastingCharmPolicy } from './native_skill_blasting_charm';
import { mir4NativeBurstShellPolicy } from './native_skill_burst_shell';
import { mir4NativeExpulsionCirclePolicy } from './native_skill_expulsion_circle';
import { mir4NativeGuardianCirclePolicy } from './native_skill_guardian_circle';
import { mir4NativeHealPerPulse, mir4NativeHealPolicy } from './native_skill_heal';
import { mir4NativeRuntimeMagicShieldPolicy } from './native_skill_magic_shield';
import { mir4NativePiercingBladesPolicy } from './native_skill_piercing_blades';
import { mir4NativeRuntimeSmiteDefenseDebuff } from './native_skill_smite_defense_debuff';
import { mir4NativeSoaringSlashPolicy } from './native_skill_soaring_slash';
import { mir4NativeTaiChiPolicy } from './native_skill_tai_chi';
import { mir4NativeRuntimeUninterruptibleBuff } from './native_skill_uninterruptible';
import { mir4NativeUltimateExecutionPlan } from './native_ultimate_runtime';
import { mir4RuntimeSkillExecutionPlan } from './runtime_skill_execution';
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4SkillUnlockLevel,
} from './skill_progression';
import { mir4ApplyRate } from './status_values';

const ACTION_PREFIX = 'mir4_skill_';
const ULTIMATE_PREFIX = 'mir4_ultimate_';

/**
 * The shared ability tooltip has no hostile target yet, so it cannot know
 * whether STATUS 95 will use the PvE or PvP cap. Keep the metadata's authored
 * cooldown and disclose both contextual caps instead of presenting a false
 * "current" value.
 */
export const MIR4_COOLDOWN_TOOLTIP_DISCLOSURE =
  'The cooldown shown above is the base cooldown. Skill Cooldown Reduction can lower it by up to 40% in PvE or 30% in PvP.';

export function refreshMir4KnownAbilities(
  entity: Entity,
  meta: { known: ResolvedAbility[]; mir4SkillLevels?: Record<number, number> },
): void {
  if (!entity.mir4) return;
  meta.known = mir4ActionAbilities(
    entity.mir4.classId as Mir4ClassId,
    entity.level,
    meta.mir4SkillLevels,
    entity.mir4.manaCostStat,
  );
}

const ENGLISH_NAMES: Readonly<Record<number, string>> = {
  1101: 'Berserk',
  1102: 'Void Slash',
  1103: 'Barbaric Charge',
  1104: 'Splitting Slash',
  1201: 'Iron Shackle',
  1301: 'Riposte',
  1302: "Lion's Roar",
  1304: 'Body Check',
  1401: 'Ground Smash',
  1501: 'Gale Slash',
  1502: 'Unbreakable Stance',
  1601: 'Crescent Strike',
  2101: 'Flame Orb',
  2103: 'Immolate',
  2111: 'Frost Orb',
  2201: 'Flame Strike',
  2202: 'Frozen Block',
  2203: 'Blizzard',
  2204: 'Phoenix Embrace',
  2301: 'Thunderstorm',
  2303: 'Chain Lightning',
  2501: 'Dark Vortex',
  2502: 'Soul Devour',
  2503: 'Magic Shield',
  3101: 'Sunbeam Sword',
  3103: 'Piercing Blades',
  3104: 'Rain of Blades',
  3201: 'Tai Chi',
  3203: 'Soaring Slash',
  3301: 'Moonlight Orb',
  3404: 'Expulsion Circle',
  3501: 'Guardian Circle',
  3503: 'Heal',
  3504: 'Greater Heal',
  3505: 'Blasting Charm',
  3506: 'Moonlight Wave',
  4101: 'Quick Shot',
  4102: 'Illusion Arrow',
  4103: 'Burst Shell',
  4104: 'Venom Mist Shell',
  4105: 'Ice Cage',
  4106: 'Painstrike Gale',
  4107: 'Flash Arrow',
  4108: 'Heavenly Bow',
  4109: 'Obliterate Shell',
  4110: 'Seeking Bolt',
  4111: "Mind's Eye",
  4112: 'Cloaking',
  5101: 'Crescent Blade',
  5102: 'Dragon Tail',
  5103: 'Ascending Dragon',
  5104: 'Nirvana Kick',
  5201: 'Ravaging Blow',
  5202: 'Blitz Strike',
  5205: 'Piercing Spear',
  5301: 'Double Strike',
  5303: 'Crushing Blow',
  5304: 'Absorption',
  5401: 'Sweeping Storm',
  5403: 'Wind Wall',
};

const ULTIMATE_ENGLISH_NAMES: Readonly<Record<Mir4ClassId, string>> = {
  1: 'Dragon Flame',
  2: 'Dragon Tornado',
  3: 'Ray of Light',
  4: 'Arrow Rain',
  5: 'Dragon Spear',
};

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function effectSentenceFor(
  skill: Mir4SkillDef,
  effect: NonNullable<Mir4SkillDef['effect']>,
  rank = 1,
): string {
  const scalesControlEffect =
    skill.damage === null &&
    !(
      skill.provenance === 'authorial-v1' &&
      MIR4_AUTHORIAL_SKILL_POLICIES[skill.skillId] !== undefined
    ) &&
    effect.effect !== 'magic-shield' &&
    effect.effect !== 'heal-pulse';
  const durationMs = scalesControlEffect
    ? mir4SkillRankScaledInteger(effect.durationMs ?? 0, rank)
    : (effect.durationMs ?? 0);
  const seconds = durationMs / 1000;
  switch (effect.effect) {
    case 'stun':
      return ` Stuns the target for ${seconds} sec.`;
    case 'knockdown':
      return `${effect.chargeToTarget ? ' Charges to the target.' : ''}${effect.pullToActor ? ' Pulls nearby enemies toward you.' : ''} Knocks ${effect.areaRadiusPx || effect.areaShape ? 'each enemy hit' : 'the target'} down for ${seconds} sec.`;
    case 'dazed':
      return `${effect.pushFromActorYards ? ` Pushes each enemy hit ${effect.pushFromActorYards} yards away.` : ''} Dazes the target for ${seconds} sec.`;
    case 'root':
      return ` Roots the target for ${seconds} sec.`;
    case 'freeze':
      return ` Freezes the target for ${seconds} sec.`;
    case 'slow':
      return ` Slows the target by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'blind':
      return ` Reduces the target's damage by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'defense-break': {
      const appliesToArea =
        effect.areaRadiusPx !== undefined && effect.maxSecondaryTargets !== undefined;
      const stacking =
        ' Defense Breaks stack multiplicatively, but Defense cannot fall below 20% of its original value.';
      return appliesToArea
        ? ` Each enemy hit has its Physical and Magic Defense reduced by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.${stacking}`
        : ` Reduces the target's Physical and Magic Defense by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.${stacking}`;
    }
    case 'burn': {
      const ticks = Math.floor(seconds / MIR4_BURN_TICK_SECONDS);
      const victim = effect.areaRadiusPx ? 'each enemy hit' : 'the target';
      return ` Burns ${victim} for {burnPerTick} base damage every ${MIR4_BURN_TICK_SECONDS} sec (${ticks} ticks, {burnTotal} total before mitigation). Damage is based on your Spell Power when the Burn is applied.`;
    }
    case 'magic-shield': {
      const shield = mir4NativeRuntimeMagicShieldPolicy(rank);
      if (!shield) return '';
      return ` Creates a Magic Shield for ${shield.durationMs / 1_000} sec, reducing all damage taken by ${shield.damageReductionBasisPoints / 100}%. It disappears after preventing ${shield.absorptionLimit} damage or taking ${shield.hitLimit} hits. Bash Damage Reduction is increased by ${shield.bashDamageReductionBasisPoints / 100}%.`;
    }
    case 'heal-pulse': {
      if (skill.skillId !== 3503) return '';
      return 'Restores {healPerPulse} health per second for 5 sec ({healTotal} total) to you and up to 4 party members within 30 yards. Healing increases with Spell Power. You are immune to control effects for 2 sec. At rank 5, immediately restores 10% of your maximum health and 15% to party members. At rank 8, those amounts become 25% and 35%; Heal can be cast while Silenced, removes Silence, cleanses Debilitation from you and has a 50% chance to cleanse it from party members, and grants 10% Boss Damage Reduction for 30 sec. At rank 10, the immediate amounts become 40% and 50%, the party cleanse is guaranteed and also removes Stun, and Boss Damage Reduction becomes 20% for 60 sec.';
    }
    case 'pull':
      return ' Pulls each enemy hit toward you.';
    case 'damage-boost':
      return ` Increases ${effect.subject === 'party' ? 'party damage' : 'your damage'} by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'defense-boost':
      return ` Increases ${effect.subject === 'party' ? "the party's" : 'your'} Physical and Magic Defense by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'dodge-boost':
      if (effect.minimumRank !== undefined && effect.rank10Magnitude !== undefined) {
        return ` At rank ${effect.minimumRank}, increases your Dodge by ${effect.magnitude ?? 0}; at rank 10, by ${effect.rank10Magnitude} for ${seconds} sec.`;
      }
      return ` Increases your Dodge by ${effect.magnitude ?? 0} for ${seconds} sec.`;
    case 'self-heal': {
      const rank8Heal = Number(effect.healMaxHpBasisPoints ?? 0) / 100;
      if (effect.minimumRank === undefined && effect.rank10HealMaxHpBasisPoints === undefined) {
        return ` Restores ${rank8Heal}% of your maximum health.`;
      }
      const rank10Heal = Number(effect.rank10HealMaxHpBasisPoints ?? 0) / 100;
      return ` At rank 8, restores ${rank8Heal}% of your maximum health; at rank 10, restores ${rank10Heal}%.`;
    }
    default:
      return '';
  }
}

function effectSentence(skill: Mir4SkillDef, rank = 1): string {
  return [skill.effect, ...(skill.additionalEffects ?? [])]
    .filter((effect): effect is NonNullable<Mir4SkillDef['effect']> => effect !== null)
    .map((effect) => effectSentenceFor(skill, effect, rank))
    .join('');
}

function nativeRuntimeEffectSentence(skill: Mir4SkillDef, rank: number): string {
  if (skill.skillId !== 1501) return '';
  const sourceImmunity = mir4NativeRuntimeUninterruptibleBuff(skill.skillId);
  const defenseDebuff = mir4NativeRuntimeSmiteDefenseDebuff(skill.skillId, 150101, rank);
  if (!sourceImmunity || !defenseDebuff) return '';
  return ` You are immune to control effects for ${sourceImmunity.durationMs / 1_000} sec. Each contact reduces the Physical Defense of enemies hit by ${percent(defenseDebuff.magnitude)} for ${defenseDebuff.durationMs / 1_000} sec.`;
}

function secondaryAreaSentence(effect: NonNullable<Mir4SkillDef['effect']>): string {
  const targets = effect.maxSecondaryTargets ?? 0;
  const damagePercent = (effect.secondaryDamageBasisPoints ?? 0) / 100;
  if (effect.areaShape === 'frontal-strip') {
    const length = Number(effect.areaLengthPx ?? 0) / 16;
    const width = Number(effect.areaWidthPx ?? 0) / 16;
    const article = length === 8 ? 'an' : 'a';
    return ` Up to ${targets} other enemies in ${article} ${length}-yard-long, ${width}-yard-wide frontal strip take ${damagePercent}% damage.`;
  }
  const radius = Number(effect.areaRadiusPx ?? 0) / 16;
  if (effect.areaOrigin === 'actor') {
    return ` Up to ${targets} other enemies within ${radius} yards of you take ${damagePercent}% damage.`;
  }
  if (effect.areaOrigin === 'forward') {
    const offset = Number(effect.areaForwardOffsetPx ?? 0) / 16;
    return ` Up to ${targets} other enemies within ${radius} yards of a point ${offset} yards in front of you take ${damagePercent}% damage.`;
  }
  return ` Up to ${targets} other enemies within ${radius} yards of the target take ${damagePercent}% damage.`;
}

function descriptionFor(skill: Mir4SkillDef, rank = 1): string {
  if (skill.skillId === 1103) {
    return `Charge to the target and strike up to 10 enemies within 6 yards of you twice for $d total damage. The first hit pushes them to the impact point. The final hit knocks them down for 3 sec. ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 2503) {
    return `Strike up to 8 enemies in three expanding circles around you for $d total Spell damage, knocking them back.${effectSentence(skill, rank)} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3103) {
    const policy = mir4NativePiercingBladesPolicy(rank);
    const skillLevel = policy?.skillLevel ?? 1;
    const bashBonus = skillLevel >= 10 ? 100 : skillLevel >= 8 ? 80 : skillLevel >= 5 ? 65 : 50;
    let text =
      `Deals $d total Physical damage over 5 hits to up to 8 enemies in a frontal 12-by-5-yard area. ` +
      `The first attack sequence knocks enemies back; the final sequence causes a brief hit reaction. ` +
      `Targets affected by Quell, Chaos, or Chill are Bashed for ${bashBonus}% bonus damage.`;
    if (policy?.stun) {
      text +=
        ` The first three hits Stun monsters for ${policy.stun.durationMs / 1_000} sec and have a ` +
        `${policy.stun.playerChanceBasisPoints / 100}% base chance to Stun players. ` +
        `Learning this rank grants ${policy.bossDamageBasisPoints / 100}% Boss ATK DMG.`;
    }
    if (policy?.skillDamageReductionLoss) {
      text +=
        ` The first three hits reduce Skill DMG Reduction by ` +
        `${policy.skillDamageReductionLoss.monsterBasisPoints / 100}% against monsters or ` +
        `${policy.skillDamageReductionLoss.playerBasisPoints / 100}% against players for ` +
        `${policy.skillDamageReductionLoss.durationMs / 1_000} sec.`;
    }
    if (policy && policy.bashDebilitationDurationMs > 0) {
      text +=
        ` When one of those hits Bashes, it also applies Chaos and Chill for ` +
        `${policy.bashDebilitationDurationMs / 1_000} sec, reducing PHYS ATK and Skill DMG Reduction by 25%.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3203) {
    const policy = mir4NativeSoaringSlashPolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `Deals $d total hybrid damage over 9 hits to up to 8 enemies in a frontal 12-by-4-yard area. ` +
      `Each hit applies Confuse and Chill for 5 sec and knocks enemies back. ` +
      `A target affected by either debilitation is Bashed for ` +
      `${policy.bashBonusBasisPoints / 100}% bonus damage.`;
    if (policy.refreshDebilitationDurationMs > 0) {
      text +=
        ` The first hit of the second wave refreshes Confuse and Chill to ` +
        `${policy.refreshDebilitationDurationMs / 1_000} sec.`;
    }
    if (policy.damagedArmor) {
      text +=
        ` Critical hits apply unremovable Damaged Armor, reducing Physical and Magic Defense by ` +
        `${policy.damagedArmor.defenseLoss} for ${policy.damagedArmor.durationMs / 1_000} sec.`;
    }
    if (policy.bothDebilitationsSkillDamageBasisPoints > 0) {
      text +=
        ` Targets suffering both Confuse and Chill take ` +
        `${policy.bothDebilitationsSkillDamageBasisPoints / 100}% additional Skill damage from this skill.`;
    }
    if (policy.criticalEvasionLoss) {
      text +=
        ` Targets suffering both Confuse and Quell also lose ${policy.criticalEvasionLoss.amount} ` +
        `Critical Evasion for ${policy.criticalEvasionLoss.durationMs / 1_000} sec.`;
    }
    if (policy.partySkillDamageReductionBasisPoints > 0) {
      text +=
        ` Learning this rank grants your party ` +
        `${policy.partySkillDamageReductionBasisPoints / 100}% Skill Damage Reduction.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3501) {
    const policy = mir4NativeGuardianCirclePolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `Deals $d Spell damage to up to ${policy.damageTargetCap} enemies within ` +
      `${policy.damageRadiusYards} yards of you. You and up to ${policy.partyTargetCap - 1} ` +
      `party members within ${policy.partyRadiusYards} yards gain ` +
      `${policy.basePhysicalDefense} Physical Defense and ` +
      `${policy.baseBashDamageReductionBasisPoints / 100}% Bash Damage Reduction for ` +
      `${policy.baseDurationMs / 1_000} sec.`;
    if (policy.milestone) {
      text +=
        ` Each affected member also gains ${policy.milestone.physicalDefense} Physical Defense, ` +
        `${policy.milestone.monsterDamageReductionBasisPoints / 100}% Monster Damage Reduction, ` +
        `${policy.milestone.bashDamageReductionBasisPoints / 100}% Bash Damage Reduction` +
        (policy.milestone.criticalDamageReductionBasisPoints > 0
          ? `, and ${policy.milestone.criticalDamageReductionBasisPoints / 100}% Critical Damage Reduction`
          : '') +
        ` for ${policy.milestone.durationMs / 1_000} sec.`;
    }
    if (policy.usableWhileStunned) {
      text +=
        ' Can be cast while Stunned and removes removable Stun from each affected member.' +
        ` Stun Resistance increases by ${policy.partyStunResistanceBasisPoints / 100}% for party members` +
        (policy.casterStunResistanceBasisPoints === policy.partyStunResistanceBasisPoints
          ? ''
          : ` and ${policy.casterStunResistanceBasisPoints / 100}% for you`) +
        ` for ${policy.stunResistanceDurationMs / 1_000} sec. MP Potion Recovery increases by ` +
        `${policy.mpPotionRecoveryBasisPoints / 100}% for ` +
        `${policy.mpPotionRecoveryDurationMs / 1_000} sec.`;
    }
    if (policy.lowestHealthAllDamageReductionBasisPoints > 0) {
      text +=
        ` The affected member with the lowest health percentage gains ` +
        `${policy.lowestHealthAllDamageReductionBasisPoints / 100}% All Damage Reduction for ` +
        `${policy.lowestHealthAllDamageReductionDurationMs / 1_000} sec.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3404) {
    const policy = mir4NativeExpulsionCirclePolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `You and up to ${policy.partyTargetCap - 1} party members within ` +
      `${policy.partyRadiusYards} yards gain ${policy.baseSpellDefense} Spell Defense for ` +
      `${policy.baseDurationMs / 1_000} sec.`;
    if (policy.milestone) {
      text +=
        ` Each affected member also gains ${policy.milestone.spellDefense} Spell Defense and ` +
        `${policy.milestone.skillDamageReductionPercentagePoints}% Skill Damage Reduction for ` +
        `${policy.milestone.durationMs / 1_000} sec, plus ` +
        `${policy.milestone.bossDamageReductionBasisPoints / 100}% Boss Damage Reduction for ` +
        `${policy.milestone.bossDurationMs / 1_000} sec.`;
    }
    if (policy.usableWhileSilenced) {
      text +=
        ' Can be cast while Silenced and removes removable Silence and Debilitation effects from each affected member.';
      if (
        policy.casterDebilitationResistanceBasisPoints === policy.casterSilenceResistanceBasisPoints
      ) {
        text += ` You gain ${policy.casterDebilitationResistanceBasisPoints / 100}% Debilitation and Silence Resistance`;
      } else {
        text +=
          ` You gain ${policy.casterDebilitationResistanceBasisPoints / 100}% Debilitation Resistance and ` +
          `${policy.casterSilenceResistanceBasisPoints / 100}% Silence Resistance`;
      }
      if (
        policy.partyDebilitationResistanceBasisPoints === policy.partySilenceResistanceBasisPoints
      ) {
        text += `, while other party members gain ${policy.partyDebilitationResistanceBasisPoints / 100}%`;
      } else {
        text +=
          `, while other party members gain ${policy.partyDebilitationResistanceBasisPoints / 100}% Debilitation Resistance and ` +
          `${policy.partySilenceResistanceBasisPoints / 100}% Silence Resistance`;
      }
      text += ` for ${policy.resistanceDurationMs / 1_000} sec.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3505) {
    const policy = mir4NativeBlastingCharmPolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `Launches a homing talisman at the target, then deals $d Spell damage to up to 5 enemies ` +
      `within 6 yards of it. Enemies hit suffer Darkness, reducing Silence Resistance by ` +
      `${Math.abs(policy.darkness.silenceResistanceBasisPoints) / 100}% for ` +
      `${policy.darkness.durationMs / 1_000} sec, and lose ` +
      `${Math.abs(policy.physicalDefense.flat)} Physical Defense for ` +
      `${policy.physicalDefense.durationMs / 1_000} sec.`;
    if (policy.monsterAllDamageReductionBasisPoints !== 0) {
      text +=
        ` Monsters lose ${Math.abs(policy.monsterAllDamageReductionBasisPoints) / 100}% All Damage Reduction, ` +
        `while players lose ${Math.abs(policy.characterMonsterDamageReductionBasisPoints) / 100}% Monster Damage Reduction` +
        (policy.characterPvpDamageReductionBasisPoints !== 0
          ? ` and ${Math.abs(policy.characterPvpDamageReductionBasisPoints) / 100}% PvP Damage Reduction`
          : '') +
        ` for ${policy.contextualReductionDurationMs / 1_000} sec.`;
    }
    if (policy.controlResistance) {
      text +=
        ` Enemies hit also lose ${Math.abs(policy.controlResistance.stunBasisPoints) / 100}% Stun Resistance and ` +
        `${Math.abs(policy.controlResistance.debilitationBasisPoints) / 100}% Debilitation and Silence Resistance ` +
        `for ${policy.controlResistance.durationMs / 1_000} sec.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 4103) {
    const policy = mir4NativeBurstShellPolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `Fires an explosive shell at the selected target, creating a device for 3 sec that deals ` +
      `$d total Physical damage over 5 explosions to up to 5 enemies within 8 yards. ` +
      `Grants 1 Focus. Enemies hit lose ${Math.abs(policy.defense.physicalDefenseFlat)} ` +
      `Physical and Spell Defense for ${policy.defense.durationMs / 1_000} sec.`;
    if (policy.burn && policy.damageAmplification) {
      text +=
        ` They also burn for ${policy.burn.physicalAttackBasisPoints / 100}% of your Physical Attack ` +
        `each second for ${policy.burn.durationMs / 1_000} sec and take ` +
        `${Math.abs(policy.damageAmplification.resolvedDamageReductionBasisPoints) / 100}% more damage, ` +
        `while this skill deals ${policy.monsterDamageBoostBasisPoints / 100}% more damage to monsters.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  if (skill.skillId === 3201) {
    const policy = mir4NativeTaiChiPolicy(rank);
    if (!policy) return MIR4_COOLDOWN_TOOLTIP_DISCLOSURE;
    let text =
      `Deals $d total hybrid damage over 6 contacts to up to ${policy.partyTargetCap} enemies around you. ` +
      `The first, third, and fifth contacts pull enemies inward; the final contact knocks monsters down with a ` +
      `${policy.monsterKnockdownChanceBasisPoints / 100}% base chance and players with a ` +
      `${policy.playerKnockdownChanceBasisPoints / 100}% base chance, then moves them outward. ` +
      `You are immune to Knockdown and Stun while casting.`;
    if (policy.permanentEvasion > 0) {
      text +=
        ` On use, gain ${policy.permanentEvasion} Evasion for 30 sec and an additional ` +
        `${policy.burstEvasion} Evasion for 5 sec. Enemies hit lose ` +
        `${policy.monsterSkillDamageAmplificationBasisPoints / 100}% Skill Damage Reduction if they are monsters or ` +
        `${policy.playerSkillDamageAmplificationBasisPoints / 100}% if they are players for 30 sec. ` +
        `You and up to ${policy.partyTargetCap - 1} party members within ${policy.partyRadiusYards} yards gain ` +
        `${policy.partySkillHealingBasisPoints / 100}% Skill Healing for 8 sec.`;
    }
    if (policy.brokenWeapon) {
      text +=
        ` A target with both Damaged Weapon and Damaged Armor has a ` +
        `${policy.brokenWeapon.chanceBasisPoints / 100}% chance to suffer Broken Weapon, reducing Physical Attack, ` +
        `Spell Attack, Accuracy, and Evasion by ${policy.brokenWeapon.amount} for ` +
        `${policy.brokenWeapon.durationMs / 1_000} sec; Broken Weapon cannot be removed.`;
    }
    if (policy.accuracyLoss) {
      text +=
        ` Enemies hit also lose ${policy.accuracyLoss.amount} Accuracy for ` +
        `${policy.accuracyLoss.durationMs / 1_000} sec.`;
    }
    return `${text} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
  }
  const utility = effectSentence(skill, rank);
  const nativeUtility = nativeRuntimeEffectSentence(skill, rank);
  const effects = [skill.effect, ...(skill.additionalEffects ?? [])].filter(
    (effect): effect is NonNullable<Mir4SkillDef['effect']> => effect !== null,
  );
  const selfUtility =
    skill.damage === null &&
    effects.length > 0 &&
    effects.every((effect) => effect.subject === 'actor' || effect.subject === 'party');
  if (selfUtility) {
    return utility;
  }
  const damage =
    skill.damage !== null ||
    (skill.provenance === 'authorial-v1' && MIR4_AUTHORIAL_SKILL_POLICIES[skill.skillId]);
  let text =
    skill.skillId === 1501
      ? 'Strike enemies around you 9 times for $d total damage.'
      : damage
        ? 'Deals $d damage to an enemy.'
        : 'Affects an enemy.';
  const area = skill.effect;
  if (
    damage &&
    (area?.areaRadiusPx !== undefined || area?.areaShape === 'frontal-strip') &&
    area.maxSecondaryTargets !== undefined &&
    area.secondaryDamageBasisPoints !== undefined
  ) {
    text += secondaryAreaSentence(area);
  }
  return `${text + utility + nativeUtility} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
}

export interface Mir4BurnTooltipDamage {
  readonly perTick: number;
  readonly ticks: number;
  readonly total: number;
}

export interface Mir4HealTooltipHealing {
  readonly perPulse: number;
  readonly pulses: number;
  readonly total: number;
}

/** Live amount produced by each native Heal pulse for the current character. */
export function mir4ActionHealTooltipHealing(
  abilityId: string,
  rank: number,
  spellPower: number,
  spellAttackBonus = 0,
  skillHealingBasisPoints = 0,
): Mir4HealTooltipHealing | null {
  if (mir4SkillIdFromAction(abilityId) !== 3503) return null;
  const policy = mir4NativeHealPolicy(rank);
  if (!policy) return null;
  const effectiveSpellAttack = Math.max(0, spellPower + spellAttackBonus);
  const perPulse = mir4ApplyRate(
    mir4NativeHealPerPulse(effectiveSpellAttack, rank),
    skillHealingBasisPoints,
  );
  return {
    perPulse,
    pulses: policy.pulseCount,
    total: perPulse * policy.pulseCount,
  };
}

/**
 * Live pre-mitigation Burn values for the current character. Combat snapshots
 * this exact authored Spell Power coefficient when the effect lands, then
 * resolves each tick against the target's defenses.
 */
export function mir4ActionBurnTooltipDamage(
  abilityId: string,
  spellPower: number,
): Mir4BurnTooltipDamage | null {
  const skillId = mir4SkillIdFromAction(abilityId);
  const skill = skillId === null ? null : mir4SkillById(skillId);
  const effect = skill?.effect;
  if (effect?.effect !== 'burn') return null;
  const ticks = Math.floor((effect.durationMs ?? 0) / 1000 / MIR4_BURN_TICK_SECONDS);
  if (ticks <= 0) return null;
  const perTick = Math.max(
    1,
    Math.floor(Math.max(0, spellPower) * Math.max(0, effect.magnitude ?? 0)),
  );
  return { perTick, ticks, total: perTick * ticks };
}

export function mir4ActionId(skillId: number): string {
  return `${ACTION_PREFIX}${skillId}`;
}

export function mir4SkillIdFromAction(abilityId: string): number | null {
  if (!abilityId.startsWith(ACTION_PREFIX)) return null;
  const value = Number(abilityId.slice(ACTION_PREFIX.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function mir4UltimateActionId(classId: Mir4ClassId): string {
  return `${ULTIMATE_PREFIX}${classId}`;
}

export function mir4ClassIdFromUltimateAction(abilityId: string): Mir4ClassId | null {
  if (!abilityId.startsWith(ULTIMATE_PREFIX)) return null;
  const value = Number(abilityId.slice(ULTIMATE_PREFIX.length));
  return Number.isInteger(value) && value >= 1 && value <= 5 ? (value as Mir4ClassId) : null;
}

export function mir4ClassIdFromActions(
  abilities: readonly Pick<ResolvedAbility, 'def'>[],
): Mir4ClassId | null {
  for (const ability of abilities) {
    const classId = mir4ClassIdFromUltimateAction(ability.def.id);
    if (classId !== null) return classId;
    const skillId = mir4SkillIdFromAction(ability.def.id);
    const skill = skillId === null ? null : mir4SkillById(skillId);
    if (skill) return skill.classId;
  }
  return null;
}

function actionDef(skill: Mir4SkillDef, range: number, cost: number, rank = 1): AbilityDef {
  const effects = [skill.effect, ...(skill.additionalEffects ?? [])].filter(
    (effect): effect is NonNullable<Mir4SkillDef['effect']> => effect !== null,
  );
  const selfUtility =
    skill.damage === null &&
    effects.length > 0 &&
    effects.every((effect) => effect.subject === 'actor' || effect.subject === 'party');
  const nativeActivation = mir4NativeSkillActivationRanges(skill.skillId, {
    targetBodyRadiusYards: PLAYER_BODY_RADIUS,
    skillDistanceBonusNative: 0,
  });
  return {
    id: mir4ActionId(skill.skillId),
    name: ENGLISH_NAMES[skill.skillId] ?? skill.displayName,
    class: 'warrior',
    cost,
    castTime: 0,
    cooldown: skill.cooldownMs / 1000,
    range: selfUtility
      ? 0
      : (nativeActivation?.directContactRangeYards ?? (skill.castRangePx ?? range * 16) / 16),
    school: skill.classId === 2 || skill.classId === 3 ? 'arcane' : 'physical',
    requiresTarget: skill.requiresTarget && !selfUtility,
    learnLevel: mir4SkillUnlockLevel(skill),
    effects:
      skill.damage !== null ||
      (skill.provenance === 'authorial-v1' && MIR4_AUTHORIAL_SKILL_POLICIES[skill.skillId])
        ? [{ type: 'directDamage', min: 0, max: 0 }]
        : [],
    description: descriptionFor(skill, rank),
  };
}

function ultimateActionDef(classId: Mir4ClassId): AbilityDef {
  const spec = MIR4_CLASS_COMBAT_SPECS[classId].ultimate;
  const nativePlan = mir4NativeUltimateExecutionPlan(classId);
  const nativeActivation = nativePlan
    ? mir4NativeSkillActivationRanges(nativePlan.skillId, {
        targetBodyRadiusYards: PLAYER_BODY_RADIUS,
        skillDistanceBonusNative: 0,
      })
    : null;
  const impacts = nativePlan?.contacts.length ?? spec.impactOffsetMs.length;
  return {
    id: mir4UltimateActionId(classId),
    name: ULTIMATE_ENGLISH_NAMES[classId],
    class: 'warrior',
    cost: 0,
    castTime: 0,
    cooldown: (nativePlan?.cooldownMs ?? spec.cooldownMs) / 1000,
    range: nativeActivation?.directContactRangeYards ?? spec.rangePx / 16,
    school: spec.channel === 'magic' ? 'arcane' : 'physical',
    requiresTarget: true,
    learnLevel: MIR4_ULTIMATE_UNLOCK_LEVEL,
    effects: [{ type: 'directDamage', min: 0, max: 0 }],
    description: `Deals $d damage over ${impacts} impacts. Requires a full Ultimate gauge. ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`,
  };
}

export const MIR4_ACTION_ABILITY_DEFS: readonly AbilityDef[] = ([1, 2, 3, 4, 5] as const)
  .flatMap((classId): AbilityDef[] => {
    const cls = mir4ClassById(classId);
    if (!cls) return [];
    const range = mir4ClassRangeYards(cls);
    return [
      ...mir4SkillsForClass(classId).map((skill) => actionDef(skill, range, 0)),
      ultimateActionDef(classId),
    ];
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const ACTION_DEF_INDEX = new Map(MIR4_ACTION_ABILITY_DEFS.map((def) => [def.id, def]));

export function mir4ActionAbilityDef(abilityId: string): AbilityDef | null {
  return ACTION_DEF_INDEX.get(abilityId) ?? null;
}

/** Complete spellbook order, including actions the character has not unlocked yet. */
export function mir4AbilityIdsForClass(classId: Mir4ClassId): string[] {
  return [
    ...mir4SkillsForClass(classId).map((skill) => mir4ActionId(skill.skillId)),
    mir4UltimateActionId(classId),
  ];
}

export function mir4ActionAbilities(
  classId: Mir4ClassId,
  level: number,
  skillLevels: Readonly<Record<number, number>> | undefined,
  manaCostStat: number,
): ResolvedAbility[] {
  const cls = mir4ClassById(classId);
  if (!cls) return [];
  const range = mir4ClassRangeYards(cls);
  const skills: ResolvedAbility[] = mir4SkillsForClass(classId)
    .filter((skill) => level >= mir4SkillUnlockLevel(skill))
    .map((skill) => {
      const rank = Math.min(
        MIR4_SKILL_MAX_LEVEL,
        Math.max(1, Math.floor(skillLevels?.[skill.skillId] ?? 1)),
      );
      const cost = mir4SkillManaCost(manaCostStat, skill.skillCost, skill.skillCostType);
      const def = actionDef(skill, range, cost, rank);
      return {
        def,
        rank,
        cost,
        castTime: 0,
        cooldown: def.cooldown,
        cooldownId: String(skill.skillId),
        effects: def.effects,
        threatFlat: 0,
        threatMult: 1,
      };
    });
  const ultimateDef = ultimateActionDef(classId);
  if (level >= MIR4_ULTIMATE_UNLOCK_LEVEL) {
    skills.push({
      def: ultimateDef,
      rank: 1,
      cost: 0,
      castTime: 0,
      cooldown: ultimateDef.cooldown,
      cooldownId: 'mir4_ult',
      effects: ultimateDef.effects,
      threatFlat: 0,
      threatMult: 1,
    });
  }
  return skills;
}

/** Raw pre-mitigation amount displayed by the existing live-scaling tooltip. */
export function mir4ActionRawDamage(
  abilityId: string,
  rank: number,
  attackPower: number,
  spellPower: number,
  skillDamageBps = 0,
): number | null {
  const ultimateClassId = mir4ClassIdFromUltimateAction(abilityId);
  if (ultimateClassId !== null) {
    const nativePlan = mir4NativeUltimateExecutionPlan(ultimateClassId);
    if (nativePlan) {
      return nativePlan.contacts.reduce((total, contact) => {
        const components = contact.damageComponents ?? [
          { channel: nativePlan.channel, coefficient: contact.coefficient },
        ];
        return (
          total +
          components.reduce((contactTotal, component) => {
            const power = component.channel === 'magic' ? spellPower : attackPower;
            return (
              contactTotal +
              mir4SkillDamageAfterBoost(
                mir4CoefficientDamage(power, component.coefficient),
                skillDamageBps,
              )
            );
          }, 0)
        );
      }, 0);
    }
    const spec = MIR4_CLASS_COMBAT_SPECS[ultimateClassId].ultimate;
    const power = spec.channel === 'magic' ? spellPower : attackPower;
    return (
      mir4SkillDamageAfterBoost(
        mir4CoefficientDamage(power, spec.perImpactCoefficient),
        skillDamageBps,
      ) * spec.impactOffsetMs.length
    );
  }
  const skillId = mir4SkillIdFromAction(abilityId);
  if (skillId === null) return null;
  const skill = mir4SkillById(skillId);
  const policy =
    skill?.provenance === 'authorial-v1' ? MIR4_AUTHORIAL_SKILL_POLICIES[skillId] : undefined;
  if (policy) {
    const physical = Math.floor((attackPower * (policy.damage.physicalCoefficient ?? 0)) / 10_000);
    const magic = Math.floor((spellPower * (policy.damage.magicCoefficient ?? 0)) / 10_000);
    return mir4SkillDamageAfterBoost(
      mir4AuthorialSkillRankDamage(Math.max(1, physical + magic), rank),
      skillDamageBps,
    );
  }
  const nativePlan = mir4RuntimeSkillExecutionPlan(skillId);
  if (nativePlan) {
    if (skillId === 2303) {
      const firstContact = nativePlan.rows[0]?.contacts[0];
      if (!firstContact) return null;
      const coefficient =
        firstContact.damage.coefficient +
        (Math.max(1, rank) - 1) * firstContact.damage.levelUpCoefficient;
      return mir4SkillDamageAfterBoost(
        mir4CoefficientDamage(spellPower, coefficient),
        skillDamageBps,
      );
    }
    const directTotal = nativePlan.rows.reduce(
      (total, row) =>
        total +
        row.contacts.reduce((rowTotal, contact) => {
          if (contact.damage.coefficient === 0 && contact.damage.levelUpCoefficient === 0) {
            return rowTotal;
          }
          const coefficient =
            contact.damage.coefficient +
            (Math.max(1, rank) - 1) * contact.damage.levelUpCoefficient;
          const power = contact.damage.damageType === 2 ? spellPower : attackPower;
          const contactDamage = mir4SkillDamageAfterBoost(
            mir4CoefficientDamage(power, coefficient),
            skillDamageBps,
          );
          return (
            rowTotal +
            (contact.damage.allocationMode === 'row-total-impact-vector'
              ? Math.floor(contactDamage / contact.damage.componentImpactCount)
              : contactDamage)
          );
        }, 0),
      0,
    );
    const totemTotal =
      nativePlan.totem?.contacts.reduce((total, contact) => {
        const components = contact.damageComponents ?? [contact];
        return (
          total +
          components.reduce((contactTotal, component) => {
            const coefficient =
              component.coefficient + (Math.max(1, rank) - 1) * component.levelUpCoefficient;
            const power = component.damageType === 2 ? spellPower : attackPower;
            return (
              contactTotal +
              mir4SkillDamageAfterBoost(mir4CoefficientDamage(power, coefficient), skillDamageBps)
            );
          }, 0)
        );
      }, 0) ?? 0;
    return directTotal + totemTotal;
  }
  if (!skill?.damage) return null;
  let total = 0;
  for (const component of skill.damage.components) {
    const coefficient =
      component.coefficient + (Math.max(1, rank) - 1) * component.levelUpCoefficient;
    const power = component.damageType === 2 ? spellPower : attackPower;
    const componentDamage = mir4SkillDamageAfterBoost(
      mir4CoefficientDamage(power, coefficient),
      skillDamageBps,
    );
    const impacts = Math.max(1, component.impactCount);
    const perImpact =
      skill.damage.allocationMode === 'row-total-impact-vector'
        ? Math.floor(componentDamage / impacts)
        : componentDamage;
    total += perImpact * impacts;
  }
  return total;
}
