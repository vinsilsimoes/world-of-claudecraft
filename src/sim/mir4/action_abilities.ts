// Profile adapter from the MIR4 skill catalog to the existing World of
// ClaudeCraft ability model. This is content/model adaptation only: the action
// bar, spellbook, cooldown painter, keybinds and tooltips remain the existing UI.

import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_CLASS_PASSIVES,
  MIR4_SKILL_LEVEL_CAPS,
  type Mir4ClassId,
  type Mir4SkillDef,
  mir4ClassById,
  mir4ClassRangeYards,
  mir4SkillById,
  mir4SkillsForClass,
} from '../content/mir4';
import type { ResolvedAbility } from '../sim';
import type { AbilityDef, Entity } from '../types';
import { mir4CoefficientDamage, mir4SkillDamageAfterBoost, mir4SkillManaCost } from './math';

const ACTION_PREFIX = 'mir4_skill_';
const ULTIMATE_PREFIX = 'mir4_ultimate_';
const PASSIVE_PREFIX = 'mir4_passive_';

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
  1102: 'Void Strike',
  1104: 'Lacerating Strike',
  1304: 'Tackle',
  1401: 'Ground Smash',
  1501: 'Gale Strike',
  2101: 'Prismatic Beam',
  2111: 'Ember Spear',
  2301: 'Smite Seal',
  2501: 'Evoked Core',
  2503: 'Magic Shield',
  3101: 'Seal Sequence',
  3104: 'Totem 1010',
  3301: 'Totem Seal II',
  3503: 'Heal',
  3506: 'Totem Seal I',
  4101: 'Burst 4101',
  4102: 'Sequence 4102',
  4103: 'Twin Echo',
  4106: 'Charge 4106',
  4107: 'Flare Arrow',
  5101: 'Thrust 5101',
  5104: 'Sweep 5104',
  5201: 'Strike 5201',
  5301: 'Chain 5301',
  5401: 'Raging Storm',
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

function effectSentence(skill: Mir4SkillDef): string {
  const effect = skill.effect;
  if (!effect) return '';
  const seconds = (effect.durationMs ?? 0) / 1000;
  switch (effect.effect) {
    case 'stun':
      return ` Stuns the target for ${seconds} sec.`;
    case 'knockdown':
      return ` Knocks the target down for ${seconds} sec.`;
    case 'dazed':
      return ` Dazes the target for ${seconds} sec.`;
    case 'root':
      return ` Roots the target for ${seconds} sec.`;
    case 'freeze':
      return ` Freezes the target for ${seconds} sec.`;
    case 'slow':
      return ` Slows the target by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'blind':
      return ` Reduces the target's damage by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'defense-break':
      return ` Increases damage taken by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'burn':
      return ` Increases damage taken by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'magic-shield':
      return `Reduces damage taken by ${percent(effect.magnitude ?? 0)} for ${seconds} sec.`;
    case 'heal-pulse': {
      const basisPoints = Number(effect.healMaxHpBasisPoints ?? 0);
      return `Restores ${basisPoints / 100}% of maximum health.`;
    }
    default:
      return '';
  }
}

function descriptionFor(skill: Mir4SkillDef): string {
  const utility = effectSentence(skill);
  if (skill.effect?.effect === 'magic-shield' || skill.effect?.effect === 'heal-pulse') {
    return utility;
  }
  const damage = skill.damage !== null || MIR4_AUTHORIAL_SKILL_POLICIES[skill.skillId];
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
  return text + utility;
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
  }
  return null;
}

function actionDef(skill: Mir4SkillDef, range: number, cost: number): AbilityDef {
  const selfUtility =
    skill.effect?.effect === 'magic-shield' || skill.effect?.effect === 'heal-pulse';
  return {
    id: mir4ActionId(skill.skillId),
    name: ENGLISH_NAMES[skill.skillId] ?? skill.displayName,
    class: 'warrior',
    cost,
    castTime: 0,
    cooldown: skill.cooldownMs / 1000,
    range: selfUtility ? 0 : range,
    school: skill.classId === 2 || skill.classId === 3 ? 'arcane' : 'physical',
    requiresTarget: !selfUtility,
    learnLevel: skill.unlock.kind === 'level' ? skill.unlock.level : 1,
    effects:
      skill.damage !== null || MIR4_AUTHORIAL_SKILL_POLICIES[skill.skillId]
        ? [{ type: 'directDamage', min: 0, max: 0 }]
        : [],
    description: descriptionFor(skill),
  };
}

function ultimateActionDef(classId: Mir4ClassId): AbilityDef {
  const spec = MIR4_CLASS_COMBAT_SPECS[classId].ultimate;
  const impacts = spec.impactOffsetMs.length;
  return {
    id: mir4UltimateActionId(classId),
    name: 'Ultimate',
    class: 'warrior',
    cost: 0,
    castTime: 0,
    cooldown: spec.cooldownMs / 1000,
    range: spec.rangePx / 16,
    school: spec.channel === 'magic' ? 'arcane' : 'physical',
    requiresTarget: true,
    learnLevel: 1,
    effects: [{ type: 'directDamage', min: 0, max: 0 }],
    description: `Deals $d damage over ${impacts} impacts. Requires a full Ultimate gauge.`,
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
    .filter((skill) => skill.unlock.kind === 'initial-deck' || level >= skill.unlock.level)
    .map((skill) => {
      const cap = MIR4_SKILL_LEVEL_CAPS[classId]?.[skill.skillId] ?? 1;
      const rank = Math.min(cap, Math.max(1, Math.floor(skillLevels?.[skill.skillId] ?? 1)));
      const cost = mir4SkillManaCost(manaCostStat, skill.skillCost, skill.skillCostType);
      const def = actionDef(skill, range, cost);
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
  const policy = MIR4_AUTHORIAL_SKILL_POLICIES[skillId];
  if (policy) {
    const physical = Math.floor((attackPower * (policy.damage.physicalCoefficient ?? 0)) / 10_000);
    const magic = Math.floor((spellPower * (policy.damage.magicCoefficient ?? 0)) / 10_000);
    return mir4SkillDamageAfterBoost(Math.max(1, physical + magic), skillDamageBps);
  }
  const skill = mir4SkillById(skillId);
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
