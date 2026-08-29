// Barrel for the mir4-gameplay-port content datasets. Public surface only:
// the class roster + level table, the skill catalog + authorial policies, and
// the tile conversion. Pure data plus pure accessors; inert until the profile
// wiring (Phase 2+) consumes it. Never spread into ../data.ts classic tables.

export {
  MIR4_ARC_ESCORT_PROFILES,
  type Mir4ArcEscortProfile,
  mir4ArcEscortProfile,
} from './arc_escort_profiles';
export {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  type Mir4AuthorialDamagePolicy,
  type Mir4AuthorialSkillPolicy,
} from './authorial_policies';
export {
  MIR4_LEVEL_COLUMNS,
  MIR4_LEVEL_ROWS,
  MIR4_MAX_LEVEL,
  type Mir4LevelRow,
  mir4LevelRow,
} from './class_levels';
export {
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_CLASS_IDS,
  MIR4_CLASSES,
  MIR4_TILES_TO_YARDS,
  MIR4_WARRIOR_DRAGON_FLAME_HEAL_BPS,
  type Mir4BasicSpec,
  type Mir4ClassCombatSpec,
  type Mir4ClassDef,
  type Mir4ClassId,
  type Mir4ClassKey,
  type Mir4CombatRole,
  type Mir4DamageChannel,
  type Mir4RangeBand,
  type Mir4UltimateSpec,
  mir4ClassById,
  mir4ClassByKey,
  mir4ClassRangeYards,
} from './classes';
export {
  aggregateMir4PassiveBonuses,
  MIR4_CLASS_PASSIVES,
  MIR4_PASSIVE_UNLOCK_LEVELS,
  type Mir4PassiveBonus,
  type Mir4PassiveDef,
} from './passives';
export {
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  MIR4_SKILL_LEVEL_CAPS,
  type Mir4SkillDamage,
  type Mir4SkillDamageComponent,
  type Mir4SkillProvenance,
} from './skills';
export {
  MIR4_SKILLS,
  type Mir4SkillDef,
  type Mir4SkillEffect,
  mir4SkillById,
  mir4SkillsForClass,
} from './skills_runtime';
export {
  MIR4_STATUS_REGISTRY,
  type Mir4StatusCategory,
  type Mir4StatusDefinition,
  type Mir4StatusValueFormat,
  mir4StatusDefinition,
} from './statuses';
