// Profile-scoped MIR4 character persistence. This module is the only JSONB
// boundary for MIR4 player metadata: it deep-clones writes and validates reads
// before they can affect quests, automation, skills, equipment, or materials.

import type { Mir4AutoBattleState } from '../auto_battle/core';
import type { Mir4AutoQuestState } from '../auto_quest/core';
import { mir4ArcQuest } from '../content/mir4/arc_campaign';
import type { Mir4ClassId } from '../content/mir4/classes';
import type { Mir4EquipmentItemDef } from '../content/mir4/equipment_catalog';
import { MIR4_ITEMS, mir4EquipmentDefinition } from '../content/mir4/items';
import { MIR4_QUESTS } from '../content/mir4/quests';
import { mir4SkillById } from '../content/mir4/skills';
import type { Mir4AchievementClears, Mir4Currencies } from './achievements';
import { MIR4_AFFIXES } from './affixes';
import type { Mir4ArcQuestProgress } from './arc_quests';
import { type Mir4ArcRewardState, sanitizeMir4ArcRewards } from './arc_rewards';
import { sanitizeMir4DisabledAutoSkills } from './auto_skills';
import { type Mir4CodexState, sanitizeMir4CodexState } from './codex';
import { type Mir4DungeonTicketState, sanitizeMir4DungeonTickets } from './dungeon_tickets';
import { MIR4_ENERGY_CAP } from './energy';
import type { Mir4Equipment, Mir4EquipmentInstanceState, Mir4Materials } from './equipment';
import { MIR4_EMPTY_MATERIALS } from './equipment';
import { type Mir4MountState, sanitizeMir4MountState } from './mounts';
import type { Mir4NarrativeDialogueState } from './narrative_dialogue';
import type { Mir4QuestProgress } from './quest';
import type { Mir4SkillEvolutionResources } from './skill_evolution';
import { MIR4_SKILL_MAX_LEVEL } from './skill_progression';
import { type Mir4SpiritState, sanitizeMir4SpiritState } from './spirits';
import type { Mir4TargetCombatState } from './target_combat';
import { type Mir4TrainingState, sanitizeMir4TrainingState } from './training';
import { markMir4CodexWireDirty, markMir4WireDirty } from './wire_revision';

export interface Mir4PersistedPlayerState {
  autoBattle?: Mir4AutoBattleState;
  /** Skill ids explicitly excluded from both automatic combat rotations. */
  mir4DisabledAutoSkills?: number[];
  mir4Quests?: Record<string, Mir4QuestProgress>;
  mir4ArcQuests?: Record<string, Mir4ArcQuestProgress>;
  mir4ArcRewards?: Mir4ArcRewardState;
  mir4DungeonTickets?: Mir4DungeonTicketState;
  mir4AutoQuest?: Mir4AutoQuestState;
  mir4SkillLevels?: Record<number, number>;
  mir4SkillResources?: Mir4SkillEvolutionResources;
  mir4AchievementClears?: Mir4AchievementClears;
  mir4Currencies?: Mir4Currencies;
  mir4Equipment?: Mir4Equipment;
  mir4EquipmentInstances?: Record<number, Mir4EquipmentInstanceState>;
  mir4Materials?: Mir4Materials;
  mir4Mounts?: Mir4MountState;
  mir4Spirits?: Mir4SpiritState;
  mir4Codex?: Mir4CodexState;
  mir4Training?: Mir4TrainingState;
  mir4UltGauge?: number;
  mir4SpiritSkillCooldownRemaining?: number;
}

export interface Mir4PersistenceMeta extends Mir4PersistedPlayerState {
  /** Session-only Auto Mission story gate. Deliberately omitted by the
   * persistence serializer and restored fresh from the live quest state. */
  mir4NarrativeDialogue?: Mir4NarrativeDialogueState;
  /** Session-only ordinary Attack contract. Auto Battle is persisted
   * separately; a reconnect never resumes an old selected target. */
  mir4TargetCombat?: Mir4TargetCombatState;
}

const MATERIAL_KEYS = Object.keys(MIR4_EMPTY_MATERIALS) as (keyof Mir4Materials)[];
const QUEST_STATES = new Set<Mir4QuestProgress['state']>(['active', 'ready', 'done']);
const AUTO_QUEST_PHASES = new Set<Mir4AutoQuestState['phase']>([
  'to-giver',
  'to-site',
  'return',
  'done',
]);
const AFFIXES_BY_STATUS = new Map<number, (typeof MIR4_AFFIXES)[string][]>();
for (const def of Object.values(MIR4_AFFIXES)) {
  const statusId = def.statusId ?? 0;
  const definitions = AFFIXES_BY_STATUS.get(statusId) ?? [];
  definitions.push(def);
  AFFIXES_BY_STATUS.set(statusId, definitions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const MIR4_PERSISTED_COUNT_CAP = 1_000_000_000;

function safeCount(value: unknown, max = MIR4_PERSISTED_COUNT_CAP): number {
  const numeric = finiteNumber(value);
  if (numeric === null || numeric <= 0) return 0;
  return Math.min(max, Math.floor(numeric));
}

function sanitizeAutoBattle(value: unknown): Mir4AutoBattleState | undefined {
  if (!isRecord(value) || (value.mode !== 'off' && value.mode !== 'battle')) return undefined;
  const anchorX = finiteNumber(value.anchorX);
  const anchorZ = finiteNumber(value.anchorZ);
  const radius = finiteNumber(value.acquireRadiusYards);
  if (
    anchorX === null ||
    anchorZ === null ||
    radius === null ||
    Math.abs(anchorX) > 1_000_000 ||
    Math.abs(anchorZ) > 1_000_000 ||
    radius < 1 ||
    radius > 500 ||
    typeof value.suspended !== 'boolean'
  ) {
    return undefined;
  }
  return {
    mode: value.mode,
    anchorX,
    anchorZ,
    acquireRadiusYards: radius,
    suspended: value.suspended,
  };
}

function sanitizeQuests(value: unknown): Record<string, Mir4QuestProgress> | undefined {
  if (!isRecord(value)) return undefined;
  const quests: Record<string, Mir4QuestProgress> = {};
  for (const [questId, raw] of Object.entries(value)) {
    const def = MIR4_QUESTS[questId];
    if (!def || !isRecord(raw) || !QUEST_STATES.has(raw.state as Mir4QuestProgress['state'])) {
      continue;
    }
    const inspected = Array.isArray(raw.inspected)
      ? [
          ...new Set(
            raw.inspected.filter(
              (index): index is number =>
                Number.isInteger(index) && index >= 0 && index < def.sites.length,
            ),
          ),
        ].sort((a, b) => a - b)
      : [];
    const allInspected = inspected.length === def.sites.length;
    const rawState = raw.state as Mir4QuestProgress['state'];
    const state = rawState === 'active' || allInspected ? rawState : 'active';
    quests[questId] = { state, inspected };
  }
  return Object.keys(quests).length > 0 ? quests : undefined;
}

function sanitizeArcQuests(value: unknown): Record<string, Mir4ArcQuestProgress> | undefined {
  if (!isRecord(value)) return undefined;
  const quests: Record<string, Mir4ArcQuestProgress> = {};
  for (const [questId, raw] of Object.entries(value)) {
    if (!isRecord(raw) || raw.questId !== questId) continue;
    if (raw.state !== 'active' && raw.state !== 'ready' && raw.state !== 'done') continue;
    if (!Number.isInteger(raw.stageIndex) || !Number.isInteger(raw.stageProgress)) continue;
    const def = mir4ArcQuest(questId);
    if (!def) continue;
    const selectedStageIndexes = Array.isArray(raw.selectedStageIndexes)
      ? [
          ...new Set(
            raw.selectedStageIndexes.filter(
              (index): index is number =>
                Number.isInteger(index) && index >= 0 && index < def.stages.length,
            ),
          ),
        ]
      : undefined;
    const selected =
      def.objectivePoolSelection && selectedStageIndexes?.length === def.objectivePoolSelection
        ? selectedStageIndexes
        : undefined;
    if (def.objectivePoolSelection && !selected) continue;
    const stageCount = selected?.length ?? def.stages.length;
    const stageIndex = raw.stageIndex as number;
    if (stageIndex < 0 || stageIndex > stageCount) continue;
    if (raw.state === 'active' ? stageIndex >= stageCount : stageIndex !== stageCount) {
      continue;
    }
    const progress: Mir4ArcQuestProgress = {
      questId,
      stageIndex,
      stageProgress: Math.min(1_000_000, Math.max(0, raw.stageProgress as number)),
      state: raw.state,
      ...(selected ? { selectedStageIndexes: selected } : {}),
      ...(raw.state === 'done' &&
      typeof raw.completedDay === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.completedDay)
        ? { completedDay: raw.completedDay }
        : {}),
    };
    quests[questId] = progress;
  }
  return Object.keys(quests).length > 0 ? quests : undefined;
}

function sanitizeAutoQuest(
  value: unknown,
  quests: Record<string, Mir4QuestProgress> | undefined,
  arcQuests: Record<string, Mir4ArcQuestProgress> | undefined,
): Mir4AutoQuestState | undefined {
  if (!isRecord(value) || typeof value.questId !== 'string') return undefined;
  const def = MIR4_QUESTS[value.questId];
  const arcDef = mir4ArcQuest(value.questId);
  if (
    (!def && !arcDef) ||
    !AUTO_QUEST_PHASES.has(value.phase as Mir4AutoQuestState['phase']) ||
    value.phase === 'done' ||
    !Number.isInteger(value.siteIndex) ||
    (value.siteIndex as number) < 0 ||
    typeof value.suspended !== 'boolean'
  ) {
    return undefined;
  }
  const battleOwned = value.battleOwned === true;
  const manualSelection = value.manualSelection === true;
  if (arcDef) {
    const progress = arcQuests?.[value.questId];
    if (!progress) {
      if (value.phase !== 'to-giver') return undefined;
      return {
        questId: value.questId,
        phase: 'to-giver',
        siteIndex: 0,
        suspended: value.suspended,
        ...(battleOwned ? { battleOwned: true } : {}),
        ...(manualSelection ? { manualSelection: true } : {}),
      };
    }
    if (progress.state === 'done') return undefined;
    return {
      questId: value.questId,
      phase: progress.state === 'ready' ? 'return' : 'to-site',
      siteIndex: progress.stageIndex,
      suspended: value.suspended,
      ...(battleOwned ? { battleOwned: true } : {}),
      ...(manualSelection ? { manualSelection: true } : {}),
    };
  }
  if (!def || (value.siteIndex as number) > def.sites.length) return undefined;
  const progress = quests?.[value.questId];
  if (progress?.state === 'done') return undefined;
  let phase = value.phase as Mir4AutoQuestState['phase'];
  if (!progress && phase !== 'to-giver') phase = 'to-giver';
  if (progress?.state === 'ready') phase = 'return';
  return {
    questId: value.questId,
    phase,
    siteIndex: value.siteIndex as number,
    suspended: value.suspended,
    ...(battleOwned ? { battleOwned: true } : {}),
    ...(manualSelection ? { manualSelection: true } : {}),
  };
}

function sanitizeSkillLevels(
  value: unknown,
  classId: Mir4ClassId,
): Record<number, number> | undefined {
  if (!isRecord(value)) return undefined;
  const levels: Record<number, number> = {};
  for (const [rawSkillId, rawLevel] of Object.entries(value)) {
    const skillId = Number(rawSkillId);
    const skill = mir4SkillById(skillId);
    if (
      !skill ||
      skill.classId !== classId ||
      typeof rawLevel !== 'number' ||
      !Number.isInteger(rawLevel) ||
      rawLevel <= 1 ||
      rawLevel > MIR4_SKILL_MAX_LEVEL
    ) {
      continue;
    }
    levels[skillId] = rawLevel;
  }
  return Object.keys(levels).length > 0 ? levels : undefined;
}

function sanitizeSkillResources(value: unknown): Mir4SkillEvolutionResources | undefined {
  if (!isRecord(value)) return undefined;
  return {
    effectPoints: safeCount(value.effectPoints),
    skillTomes: safeCount(value.skillTomes),
  };
}

function sanitizeAchievementClears(value: unknown): Mir4AchievementClears | undefined {
  if (!isRecord(value)) return undefined;
  const grade = finiteNumber(value['201']);
  if (grade === null || !Number.isInteger(grade) || grade < 1 || grade > 2) return undefined;
  return { 201: grade };
}

function sanitizeCurrencies(value: unknown): Mir4Currencies | undefined {
  if (!isRecord(value)) return undefined;
  return {
    darksteel: safeCount(value.darksteel),
    energy: safeCount(value.energy, MIR4_ENERGY_CAP),
  };
}

function sanitizeAffixPairs(
  value: unknown,
  maxPairs: number,
  item: Mir4EquipmentItemDef,
): readonly (readonly [number, number])[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pairs: [number, number][] = [];
  for (const raw of value) {
    if (!Array.isArray(raw) || raw.length !== 2) continue;
    const statusId = raw[0];
    const amount = raw[1];
    const matchingDefs = AFFIXES_BY_STATUS.get(statusId) ?? [];
    const maximum = matchingDefs.reduce((highest, def) => {
      const valueCap =
        def.unit === 'basis-points' ? def.max : def.max * (1 + 25 + item.tier + item.grade);
      return Math.max(highest, valueCap);
    }, 0);
    if (
      !Number.isInteger(statusId) ||
      maximum === 0 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > maximum
    ) {
      continue;
    }
    pairs.push([statusId, Math.floor(amount)]);
    if (pairs.length === maxPairs) break;
  }
  return pairs.length > 0 ? pairs : undefined;
}

function sanitizeEquipmentInstances(
  value: unknown,
  classId: Mir4ClassId,
): Record<number, Mir4EquipmentInstanceState> | undefined {
  if (!isRecord(value)) return undefined;
  const instances: Record<number, Mir4EquipmentInstanceState> = {};
  for (const [rawItemId, raw] of Object.entries(value)) {
    const itemId = Number(rawItemId);
    const def = mir4EquipmentDefinition(itemId);
    if (!def || def.classId !== classId || !isRecord(raw) || raw.itemId !== itemId) continue;
    const rawEnhancement = finiteNumber(raw.enhancement);
    const enhancement =
      rawEnhancement !== null && rawEnhancement >= 0 && rawEnhancement <= def.maxEnhancementLevel
        ? Math.floor(rawEnhancement)
        : 0;
    const instance: Mir4EquipmentInstanceState = {
      itemId,
      enhancement,
    };
    if (raw.destroyed === true) instance.destroyed = true;
    if (isRecord(raw.affixes)) {
      const enchantment = sanitizeAffixPairs(raw.affixes.enchantment, 2, def);
      const blessing = sanitizeAffixPairs(raw.affixes.blessing, 3, def);
      if (enchantment || blessing) instance.affixes = { enchantment, blessing };
    }
    if (isRecord(raw.pendingRoll)) {
      const layer = raw.pendingRoll.layer;
      const rollId = raw.pendingRoll.rollId;
      const affixes = sanitizeAffixPairs(
        raw.pendingRoll.affixes,
        layer === 'blessing' ? 3 : 2,
        def,
      );
      if (
        (layer === 'enchantment' || layer === 'blessing') &&
        typeof rollId === 'string' &&
        rollId.length > 0 &&
        rollId.length <= 128 &&
        affixes
      ) {
        instance.pendingRoll = { rollId, layer, affixes };
      }
    }
    instances[itemId] = instance;
  }
  return Object.keys(instances).length > 0 ? instances : undefined;
}

function sanitizeEquipment(
  value: unknown,
  classId: Mir4ClassId,
  instances: Record<number, Mir4EquipmentInstanceState> | undefined,
): Mir4Equipment | undefined {
  if (!isRecord(value)) return undefined;
  const equipment: Mir4Equipment = {};
  for (let slot = 1; slot <= 8; slot += 1) {
    const itemId = value[String(slot)];
    if (!Number.isInteger(itemId)) continue;
    const def = mir4EquipmentDefinition(itemId as number);
    if (
      !def ||
      def.classId !== classId ||
      def.equipSlot !== slot ||
      instances?.[itemId as number]?.destroyed
    ) {
      continue;
    }
    equipment[slot] = itemId as number;
  }
  if (classId === 1 && equipment[1] === undefined && value.weapon === 200201000) {
    equipment[1] = 200201000;
  }
  return Object.keys(equipment).length > 0 ? equipment : undefined;
}

function ensureStarterEquipmentInstances(
  equipment: Mir4Equipment | undefined,
  instances: Record<number, Mir4EquipmentInstanceState> | undefined,
): Record<number, Mir4EquipmentInstanceState> | undefined {
  const normalized = { ...instances };
  for (const itemId of Object.values(equipment ?? {})) {
    if (itemId !== undefined && MIR4_ITEMS[itemId] && !normalized[itemId]) {
      normalized[itemId] = { itemId, enhancement: 0 };
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function sanitizeMaterials(value: unknown): Mir4Materials | undefined {
  if (!isRecord(value)) return undefined;
  const wallet = { ...MIR4_EMPTY_MATERIALS };
  for (const key of MATERIAL_KEYS) wallet[key] = safeCount(value[key]);
  return wallet;
}

function sanitizeMir4PlayerStateProjection(
  value: unknown,
  classId: Mir4ClassId,
  includeCodex: boolean,
): Mir4PersistedPlayerState {
  if (!isRecord(value)) return {};
  const autoBattle = sanitizeAutoBattle(value.autoBattle);
  const mir4DisabledAutoSkills = sanitizeMir4DisabledAutoSkills(
    value.mir4DisabledAutoSkills,
    classId,
  );
  const mir4Quests = sanitizeQuests(value.mir4Quests);
  const mir4ArcQuests = sanitizeArcQuests(value.mir4ArcQuests);
  const mir4ArcRewards = sanitizeMir4ArcRewards(value.mir4ArcRewards);
  const mir4DungeonTickets = sanitizeMir4DungeonTickets(value.mir4DungeonTickets);
  const mir4AutoQuest = sanitizeAutoQuest(value.mir4AutoQuest, mir4Quests, mir4ArcQuests);
  const mir4SkillLevels = sanitizeSkillLevels(value.mir4SkillLevels, classId);
  const mir4SkillResources = sanitizeSkillResources(value.mir4SkillResources);
  const mir4AchievementClears = sanitizeAchievementClears(value.mir4AchievementClears);
  const mir4Currencies = sanitizeCurrencies(value.mir4Currencies);
  const sanitizedEquipmentInstances = sanitizeEquipmentInstances(
    value.mir4EquipmentInstances,
    classId,
  );
  const mir4Equipment = sanitizeEquipment(
    value.mir4Equipment,
    classId,
    sanitizedEquipmentInstances,
  );
  const mir4EquipmentInstances = ensureStarterEquipmentInstances(
    mir4Equipment,
    sanitizedEquipmentInstances,
  );
  const mir4Materials = sanitizeMaterials(value.mir4Materials);
  const mir4Mounts = sanitizeMir4MountState(value.mir4Mounts);
  const mir4Spirits = sanitizeMir4SpiritState(value.mir4Spirits);
  const mir4Training = sanitizeMir4TrainingState(value.mir4Training);
  // The combat snapshot has a much higher invalidation cadence than the Codex.
  // Its dedicated wire projection must not even sanitize/walk the album state.
  const mir4Codex = includeCodex ? sanitizeMir4CodexState(value.mir4Codex) : undefined;
  const rawUltGauge = finiteNumber(value.mir4UltGauge);
  const mir4UltGauge = rawUltGauge === null ? undefined : Math.max(0, Math.min(100, rawUltGauge));
  const rawSpiritCooldown = finiteNumber(value.mir4SpiritSkillCooldownRemaining);
  const mir4SpiritSkillCooldownRemaining =
    rawSpiritCooldown === null || rawSpiritCooldown <= 0
      ? undefined
      : Math.min(60, rawSpiritCooldown);
  return {
    ...(autoBattle ? { autoBattle } : {}),
    ...(mir4DisabledAutoSkills ? { mir4DisabledAutoSkills } : {}),
    ...(mir4Quests ? { mir4Quests } : {}),
    ...(mir4ArcQuests ? { mir4ArcQuests } : {}),
    ...(mir4ArcRewards ? { mir4ArcRewards } : {}),
    ...(mir4DungeonTickets ? { mir4DungeonTickets } : {}),
    ...(mir4AutoQuest ? { mir4AutoQuest } : {}),
    ...(mir4SkillLevels ? { mir4SkillLevels } : {}),
    ...(mir4SkillResources ? { mir4SkillResources } : {}),
    ...(mir4AchievementClears ? { mir4AchievementClears } : {}),
    ...(mir4Currencies ? { mir4Currencies } : {}),
    ...(mir4Equipment ? { mir4Equipment } : {}),
    ...(mir4EquipmentInstances ? { mir4EquipmentInstances } : {}),
    ...(mir4Materials ? { mir4Materials } : {}),
    ...(mir4Mounts ? { mir4Mounts } : {}),
    ...(mir4Spirits ? { mir4Spirits } : {}),
    ...(mir4Training ? { mir4Training } : {}),
    ...(mir4Codex ? { mir4Codex } : {}),
    ...(mir4UltGauge !== undefined ? { mir4UltGauge } : {}),
    ...(mir4SpiritSkillCooldownRemaining !== undefined ? { mir4SpiritSkillCooldownRemaining } : {}),
  };
}

export function sanitizeMir4PlayerState(
  value: unknown,
  classId: Mir4ClassId,
): Mir4PersistedPlayerState {
  return sanitizeMir4PlayerStateProjection(value, classId, true);
}

function healLegacyAutoJourneyState(serialized: Mir4PersistedPlayerState): void {
  // Legacy Auto Journey builds temporarily owned Auto Battle while resolving
  // combat. A successful save through this build heals that old session by
  // stripping both the transient ownership marker and its battle mode. This
  // cannot retroactively protect a row before the new build has loaded/saved it.
  if (serialized.mir4AutoQuest?.battleOwned && serialized.autoBattle?.mode === 'battle') {
    delete serialized.autoBattle;
  }
  if (serialized.mir4AutoQuest?.battleOwned) {
    delete serialized.mir4AutoQuest.battleOwned;
  }
}

export function serializeMir4PlayerState(
  meta: Mir4PersistenceMeta,
  classId: Mir4ClassId,
): Mir4PersistedPlayerState {
  const serialized = sanitizeMir4PlayerState(meta, classId);
  healLegacyAutoJourneyState(serialized);
  return serialized;
}

/** Combat-wire projection. Codex rides its own revisioned self delta. */
export function serializeMir4WirePlayerState(
  meta: Mir4PersistenceMeta,
  classId: Mir4ClassId,
): Omit<Mir4PersistedPlayerState, 'mir4Codex'> {
  const wire = sanitizeMir4PlayerStateProjection(meta, classId, false);
  healLegacyAutoJourneyState(wire);
  return wire;
}

export function restoreMir4PlayerState(
  meta: Mir4PersistenceMeta,
  state: unknown,
  classId: Mir4ClassId,
): Mir4PersistedPlayerState {
  const restored = sanitizeMir4PlayerState(state, classId);
  meta.autoBattle = restored.autoBattle;
  meta.mir4DisabledAutoSkills = restored.mir4DisabledAutoSkills;
  meta.mir4Quests = restored.mir4Quests;
  meta.mir4ArcQuests = restored.mir4ArcQuests;
  meta.mir4ArcRewards = restored.mir4ArcRewards;
  meta.mir4DungeonTickets = restored.mir4DungeonTickets;
  meta.mir4AutoQuest = restored.mir4AutoQuest;
  meta.mir4SkillLevels = restored.mir4SkillLevels;
  meta.mir4SkillResources = restored.mir4SkillResources;
  meta.mir4AchievementClears = restored.mir4AchievementClears;
  meta.mir4Currencies = restored.mir4Currencies;
  meta.mir4Equipment = restored.mir4Equipment;
  meta.mir4EquipmentInstances = restored.mir4EquipmentInstances;
  meta.mir4Materials = restored.mir4Materials;
  meta.mir4Mounts = restored.mir4Mounts;
  meta.mir4Spirits = restored.mir4Spirits;
  meta.mir4Training = restored.mir4Training;
  meta.mir4Codex = restored.mir4Codex;
  meta.mir4NarrativeDialogue = undefined;
  markMir4CodexWireDirty(meta);
  markMir4WireDirty(meta);
  return restored;
}
