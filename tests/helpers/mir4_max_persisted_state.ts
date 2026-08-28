import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_CLASS_IDS, MIR4_CLASSES, type Mir4ClassId } from '../../src/sim/content/mir4/classes';
import { MIR4_CODEX_COLLECTIONS } from '../../src/sim/content/mir4/codex';
import { MIR4_EQUIPMENT_CATALOG } from '../../src/sim/content/mir4/equipment_catalog';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import { MIR4_QUESTS } from '../../src/sim/content/mir4/quests';
import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/quests_arc';
import { MIR4_SPIRITS_CATALOG } from '../../src/sim/content/mir4/spirits_catalog';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { mir4AffixPoolFor } from '../../src/sim/mir4/affixes';
import { MIR4_ARC_DYNAMIC_GRANT_IDS } from '../../src/sim/mir4/arc_rewards';
import {
  MIR4_EMPTY_MATERIALS,
  type Mir4EquipmentInstanceState,
} from '../../src/sim/mir4/equipment';
import { MIR4_MOUNT_PENDING_LIMIT } from '../../src/sim/mir4/mounts';
import { MIR4_SKILL_MAX_LEVEL } from '../../src/sim/mir4/skill_progression';
import { MIR4_SPIRIT_PENDING_LIMIT } from '../../src/sim/mir4/spirits';
import { type CharacterState, Sim } from '../../src/sim/sim';

export interface MaxMir4PersistedStateFixture {
  state: CharacterState;
  ownerSnapshot: unknown;
  selectedClassId: Mir4ClassId;
  classItemCounts: Readonly<Record<Mir4ClassId, number>>;
  classItemCount: number;
  arcQuestCount: number;
  mountCount: number;
  spiritCount: number;
}

function requiredFirst<T>(values: readonly T[], label: string): T {
  const value = values[0];
  if (value === undefined) throw new Error(`missing ${label}`);
  return value;
}

function requiredCycled<T>(values: readonly T[], index: number, label: string): T {
  if (values.length === 0) throw new Error(`missing ${label}`);
  const value = values[index % values.length];
  if (value === undefined) throw new Error(`missing ${label} at ${index}`);
  return value;
}

function boundedEntropy(label: string, index: number, length: number): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';
  let state = 2_166_136_261;
  for (const char of `${label}:${index}`) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16_777_619) >>> 0;
  }
  let result = '';
  for (let offset = 0; offset < length; offset += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    result += alphabet[(state >>> 0) % alphabet.length];
  }
  return result;
}

function maximumAffixPairs(
  item: (typeof MIR4_EQUIPMENT_CATALOG)[number],
): readonly (readonly [number, number])[] {
  return mir4AffixPoolFor(item.classId, item.equipSlot)
    .map((def) => {
      const amount =
        def.unit === 'basis-points' ? def.max : def.max * (1 + 25 + item.tier + item.grade);
      return [def.statusId, amount] as const;
    })
    .sort((left, right) => JSON.stringify(right).length - JSON.stringify(left).length);
}

/**
 * Deterministic maximum MIR4 profile projection over a freshly serialized
 * character, shared by the byte-budget and real-PostgreSQL proofs. This is
 * deliberately not a maximum of every classic-only bank/social container:
 * those systems are profile-gated out of the MIR4 product.
 */
export function buildMaxMir4PersistedState(): MaxMir4PersistedStateFixture {
  const classItemCounts = Object.fromEntries(
    MIR4_CLASS_IDS.map((classId) => [
      classId,
      MIR4_EQUIPMENT_CATALOG.filter((item) => item.classId === classId).length,
    ]),
  ) as Record<Mir4ClassId, number>;
  const selectedClassId = MIR4_CLASS_IDS.reduce((largest, candidate) =>
    classItemCounts[candidate] > classItemCounts[largest] ? candidate : largest,
  );
  const selectedClass = requiredFirst(
    MIR4_CLASSES.filter((entry) => entry.classId === selectedClassId),
    `MIR4 class ${selectedClassId}`,
  );
  const classItems = MIR4_EQUIPMENT_CATALOG.filter((item) => item.classId === selectedClassId);
  const equipment = Object.fromEntries(
    Array.from({ length: 8 }, (_, offset) => {
      const slot = offset + 1;
      const item = classItems.filter((candidate) => candidate.equipSlot === slot).at(-1);
      if (!item) throw new Error(`missing class-${selectedClassId} slot ${slot}`);
      return [slot, item.itemId];
    }),
  );
  const equippedItemIds = new Set(Object.values(equipment));
  const instances: Record<number, Mir4EquipmentInstanceState> = Object.fromEntries(
    classItems.map((item, index) => {
      const affixes = maximumAffixPairs(item);
      return [
        item.itemId,
        {
          itemId: item.itemId,
          enhancement: item.maxEnhancementLevel,
          pendingRoll: {
            rollId: boundedEntropy('equipment-roll', index, 128),
            layer: 'blessing' as const,
            affixes: affixes.slice(0, 3),
          },
          affixes: { enchantment: affixes.slice(0, 2), blessing: affixes.slice(0, 3) },
          ...(equippedItemIds.has(item.itemId) ? {} : { destroyed: true }),
        },
      ];
    }),
  );
  const sim = new Sim({
    seed: 8021,
    playerClass: 'warrior',
    playerClassMir4: selectedClass.key,
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 size-budget player');
  meta.autoBattle = {
    mode: 'battle',
    anchorX: 999_999,
    anchorZ: -999_999,
    acquireRadiusYards: 500,
    suspended: true,
  };
  meta.mir4SkillLevels = Object.fromEntries(
    mir4SkillsForClass(selectedClassId).map((skill) => [skill.skillId, MIR4_SKILL_MAX_LEVEL]),
  );
  meta.mir4DisabledAutoSkills = mir4SkillsForClass(selectedClassId).map((skill) => skill.skillId);
  meta.mir4SkillResources = { effectPoints: 1_000_000_000, skillTomes: 1_000_000_000 };
  meta.mir4AchievementClears = { 201: 2 };
  meta.mir4Currencies = { darksteel: 1_000_000_000, energy: 5_000_000 };
  meta.mir4Quests = Object.fromEntries(
    Object.values(MIR4_QUESTS).map((quest) => [
      quest.id,
      { state: 'done' as const, inspected: quest.sites.map((_, index) => index) },
    ]),
  );
  meta.mir4ArcQuests = Object.fromEntries(
    MIR4_QUESTS_ARC.map((quest, index) => {
      const selectedStageIndexes = quest.objectivePoolSelection
        ? Array.from({ length: quest.objectivePoolSelection }, (_, stageIndex) => stageIndex)
        : undefined;
      const stageCount = selectedStageIndexes?.length ?? quest.stages.length;
      return [
        quest.questId,
        {
          questId: quest.questId,
          stageIndex: index === 0 ? 0 : stageCount,
          stageProgress: index === 0 ? 1_000_000 : 0,
          state: index === 0 ? ('active' as const) : ('done' as const),
          ...(selectedStageIndexes ? { selectedStageIndexes } : {}),
          ...(index === 0 ? {} : { completedDay: '9999-12-31' }),
        },
      ];
    }),
  );
  meta.mir4AutoQuest = {
    questId: requiredFirst(MIR4_QUESTS_ARC, 'MIR4 arc quest').questId,
    phase: 'to-site',
    siteIndex: 0,
    suspended: true,
  };
  const rewardIds = new Set<string>();
  const collectRewardIds = (value: unknown): void => {
    if (typeof value === 'string') {
      rewardIds.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) collectRewardIds(entry);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        rewardIds.add(key);
        collectRewardIds(entry);
      }
    }
  };
  for (const quest of MIR4_QUESTS_ARC) {
    collectRewardIds(quest.onAcceptGrants);
    collectRewardIds(quest.rewards);
  }
  for (const grantId of MIR4_ARC_DYNAMIC_GRANT_IDS) rewardIds.add(grantId);
  const rewardIdList = [...rewardIds];
  const rewardCounts = Object.fromEntries(rewardIdList.map((id) => [id, 1_000_000_000]));
  meta.mir4ArcRewards = {
    items: rewardCounts,
    recipes: rewardIdList,
    systems: rewardIdList,
    cosmetics: rewardIdList,
    tickets: rewardCounts,
    guarantees: rewardCounts,
    claimedGrantIds: rewardIdList,
    professionXp: 1_000_000_000,
    recipeFragments: 1_000_000_000,
    cityReputation: 1_000_000_000,
  };
  meta.mir4Equipment = equipment;
  meta.mir4EquipmentInstances = instances;
  const maximumMaterials = { ...MIR4_EMPTY_MATERIALS };
  for (const key of Object.keys(maximumMaterials) as (keyof typeof maximumMaterials)[]) {
    maximumMaterials[key] = 1_000_000_000;
  }
  meta.mir4Materials = maximumMaterials;
  meta.mir4Training = {
    version: 1,
    constitution: [5, 5, 5, 5, 5, 5, 5],
    innerForce: [5, 5, 5, 5],
    solitude: { conceptionVessel: [10, 10, 10, 10, 10, 10, 10, 10] },
  };
  const pendingMounts = MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade >= 4);
  meta.mir4Mounts = {
    owned: Object.fromEntries(MIR4_MOUNTS_CATALOG.map((mount) => [mount.id, 1_000_000])),
    discovered: MIR4_MOUNTS_CATALOG.map((mount) => mount.id),
    equippedMountId: requiredFirst(MIR4_MOUNTS_CATALOG, 'MIR4 mount').id,
    pending: Array.from({ length: MIR4_MOUNT_PENDING_LIMIT }, (_, index) => {
      const mount = requiredCycled(pendingMounts, index, 'grade 4+ MIR4 mount');
      return {
        id: boundedEntropy('mount-pending', index, 96),
        mountId: mount.id,
        grade: mount.grade,
      };
    }),
    nextPendingId: 1_000_000_000,
  };
  const pendingSpirits = MIR4_SPIRITS_CATALOG.filter((spirit) => spirit.grade >= 4);
  meta.mir4Spirits = {
    owned: Object.fromEntries(MIR4_SPIRITS_CATALOG.map((spirit) => [spirit.id, 1_000_000])),
    discovered: MIR4_SPIRITS_CATALOG.map((spirit) => spirit.id),
    equippedSpiritId: requiredFirst(MIR4_SPIRITS_CATALOG, 'MIR4 spirit').id,
    pending: Array.from({ length: MIR4_SPIRIT_PENDING_LIMIT }, (_, index) => {
      const spirit = requiredCycled(pendingSpirits, index, 'grade 4+ MIR4 spirit');
      return {
        id: boundedEntropy('spirit-pending', index, 96),
        spiritId: spirit.id,
        grade: spirit.grade,
      };
    }),
    nextPendingId: Number.MAX_SAFE_INTEGER,
  };
  meta.mir4Codex = {
    version: 1,
    registered: Object.fromEntries(
      MIR4_CODEX_COLLECTIONS.filter((collection) => collection.registration === 'manual').map(
        (collection) => [
          collection.id,
          Object.fromEntries(
            collection.requirements
              .filter((requirement) => requirement.kind === 'material')
              .map((requirement) => [requirement.id, requirement.requiredCount]),
          ),
        ],
      ),
    ),
  };
  sim.player.mir4UltGauge = 100;
  meta.mir4SpiritSkillReadyAt = sim.time + 60;
  const state = sim.serializeCharacter(sim.playerId);
  if (!state) throw new Error('missing MIR4 size-budget save');
  return {
    state,
    ownerSnapshot: sim.mir4PlayerState(),
    selectedClassId,
    classItemCounts,
    classItemCount: classItems.length,
    arcQuestCount: MIR4_QUESTS_ARC.length,
    mountCount: MIR4_MOUNTS_CATALOG.length,
    spiritCount: MIR4_SPIRITS_CATALOG.length,
  };
}
