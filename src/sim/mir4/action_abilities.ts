// Profile adapter from the MIR4 skill catalog to the existing World of
// Aeldrune ability model. This is content/model adaptation only: the action
// bar, spellbook, cooldown painter, keybinds and tooltips remain the existing UI.

import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_CLASS_PASSIVES,
  MIR4_WARRIOR_DRAGON_FLAME_HEAL_BPS,
  type Mir4ClassId,
  type Mir4SkillDef,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
  mir4SkillsForClass,
} from '../content/mir4';
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
import {
  MIR4_SKILL_MAX_LEVEL,
  MIR4_ULTIMATE_UNLOCK_LEVEL,
  mir4SkillUnlockLevel,
} from './skill_progression';

const ACTION_PREFIX = 'mir4_skill_';
const ULTIMATE_PREFIX = 'mir4_ultimate_';
const PASSIVE_PREFIX = 'mir4_passive_';

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
  1101: 'Rampant',
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

const PASSIVE_ENGLISH_NAMES: Readonly<Record<string, string>> = {
  'warrior-heavy-armor': 'Heavy Armor',
  'warrior-weapon-mastery': 'Weapon Mastery',
  'warrior-iron-skin': 'Iron Skin',
  'warrior-fighting-spirit': 'Fighting Spirit',
  'warrior-indomitable-will': 'Indomitable Will',
  'elementalist-mana-well': 'Mana Well',
  'elementalist-arcane-intellect': 'Arcane Intellect',
  'elementalist-elemental-protection': 'Elemental Protection',
  'elementalist-channeling': 'Channeling',
  'elementalist-arcane-ascension': 'Arcane Ascension',
  'taoist-spiritual-vessel': 'Spiritual Vessel',
  'taoist-twin-paths': 'Twin Paths',
  'taoist-sacred-guard': 'Sacred Guard',
  'taoist-serene-mind': 'Serene Mind',
  'taoist-celestial-harmony': 'Celestial Harmony',
  'arbalist-eagle-eye': 'Eagle Eye',
  'arbalist-ballistic-mastery': 'Ballistic Mastery',
  'arbalist-nature-guard': "Nature's Guard",
  'arbalist-hunter-instinct': "Hunter's Instinct",
  'arbalist-perfect-shot': 'Perfect Shot',
  'lancer-war-conditioning': 'War Conditioning',
  'lancer-spear-mastery': 'Spear Mastery',
  'lancer-vanguard-armor': 'Vanguard Armor',
  'lancer-battle-rhythm': 'Battle Rhythm',
  'lancer-dragon-vanguard': "Dragon's Vanguard",
};

const PASSIVE_STATUS_NAMES: Readonly<Record<number, string>> = {
  1: 'maximum health',
  6: 'maximum mana',
  20: 'physical attack',
  22: 'magic attack',
  24: 'physical defense',
  26: 'magic defense',
  28: 'accuracy',
  29: 'dodge',
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
      return `${effect.chargeToTarget ? ' Charges to the target.' : ''}${effect.pullToActor ? ' Pulls nearby enemies toward you.' : ''} Knocks ${effect.areaRadiusPx ? 'each enemy hit' : 'the target'} down for ${seconds} sec.`;
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
    case 'magic-shield':
      return `Reduces damage taken by ${percent(mir4SkillRankScaledInteger(Math.round((effect.magnitude ?? 0) * 10_000), rank) / 10_000)} for ${seconds} sec.`;
    case 'heal-pulse': {
      const basisPoints = Number(effect.healMaxHpBasisPoints ?? 0);
      const amount = mir4SkillRankScaledInteger(basisPoints, rank) / 100;
      const partyTargets = Math.max(1, Number(effect.maxPartyTargets ?? 1));
      const radius = Number(effect.partyRadiusPx ?? 0) / 16;
      return partyTargets > 1
        ? `Restores ${amount}% of maximum health to you and up to ${partyTargets - 1} party members within ${radius} yards.`
        : `Restores ${amount}% of maximum health.`;
    }
    case 'pull':
      return ' Pulls each enemy hit toward you.';
    case 'damage-boost':
      return ` Increases ${effect.subject === 'party' ? 'party damage' : 'your damage'} by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'defense-boost':
      return ` Increases ${effect.subject === 'party' ? "the party's" : 'your'} Physical and Magic Defense by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'dodge-boost':
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

function descriptionFor(skill: Mir4SkillDef, rank = 1): string {
  const utility = effectSentence(skill, rank);
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
  let text = damage ? 'Deals $d damage to an enemy.' : 'Affects an enemy.';
  const area = skill.effect;
  if (
    damage &&
    area?.areaRadiusPx !== undefined &&
    area.maxSecondaryTargets !== undefined &&
    area.secondaryDamageBasisPoints !== undefined
  ) {
    text += ` Up to ${area.maxSecondaryTargets} other enemies within ${area.areaRadiusPx / 16} yards take ${area.secondaryDamageBasisPoints / 100}% damage.`;
  }
  return `${text + utility} ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`;
}

export interface Mir4BurnTooltipDamage {
  readonly perTick: number;
  readonly ticks: number;
  readonly total: number;
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
  return {
    id: mir4ActionId(skill.skillId),
    name: ENGLISH_NAMES[skill.skillId] ?? skill.displayName,
    class: 'warrior',
    cost,
    castTime: 0,
    cooldown: skill.cooldownMs / 1000,
    range: selfUtility ? 0 : (skill.castRangePx ?? range * 16) / 16,
    school: skill.classId === 2 || skill.classId === 3 ? 'arcane' : 'physical',
    requiresTarget: skill.requiresTarget && !selfUtility,
    learnLevel: mir4SkillUnlockLevel(skill.slot),
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
  const impacts = spec.impactOffsetMs.length;
  return {
    id: mir4UltimateActionId(classId),
    name: ULTIMATE_ENGLISH_NAMES[classId],
    class: 'warrior',
    cost: 0,
    castTime: 0,
    cooldown: spec.cooldownMs / 1000,
    range: spec.rangePx / 16,
    school: spec.channel === 'magic' ? 'arcane' : 'physical',
    requiresTarget: true,
    learnLevel: MIR4_ULTIMATE_UNLOCK_LEVEL,
    effects: [{ type: 'directDamage', min: 0, max: 0 }],
    description: `Deals $d damage over ${impacts} impacts.${
      classId === 1
        ? ` Restores ${MIR4_WARRIOR_DRAGON_FLAME_HEAL_BPS / 100}% of your maximum health.`
        : ''
    } Requires a full Ultimate gauge. ${MIR4_COOLDOWN_TOOLTIP_DISCLOSURE}`,
  };
}

function passiveDescription(bonuses: readonly { statusId: number; basisPoints: number }[]): string {
  const parts = bonuses.map(
    (bonus) =>
      `${PASSIVE_STATUS_NAMES[bonus.statusId] ?? `status ${bonus.statusId}`} by ${bonus.basisPoints / 100}%`,
  );
  const benefit =
    parts.length <= 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')}${parts.length > 2 ? ',' : ''} and ${parts.at(-1)}`;
  return `Increases ${benefit}.`;
}

function passiveActionDef(
  classId: Mir4ClassId,
  passive: (typeof MIR4_CLASS_PASSIVES)[Mir4ClassId][number],
): AbilityDef {
  return {
    id: `${PASSIVE_PREFIX}${passive.id}`,
    name: PASSIVE_ENGLISH_NAMES[passive.id] ?? passive.name,
    class: 'warrior',
    cost: 0,
    castTime: 0,
    cooldown: 0,
    range: 0,
    school: classId === 2 || classId === 3 ? 'arcane' : 'physical',
    requiresTarget: false,
    learnLevel: passive.level,
    passive: true,
    effects: [],
    description: passiveDescription(passive.bonuses),
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
      ...MIR4_CLASS_PASSIVES[classId].map((passive) => passiveActionDef(classId, passive)),
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
    ...MIR4_CLASS_PASSIVES[classId].map((passive) => `${PASSIVE_PREFIX}${passive.id}`),
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
    .filter((skill) => level >= mir4SkillUnlockLevel(skill.slot))
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
  for (const passive of MIR4_CLASS_PASSIVES[classId]) {
    if (level < passive.level) continue;
    const def = passiveActionDef(classId, passive);
    skills.push({
      def,
      rank: 1,
      cost: 0,
      castTime: 0,
      cooldown: 0,
      effects: [],
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
