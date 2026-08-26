// Pure campaign pacing projection for the Aeldrune MMORPG profile. This
// module turns the canonical level table, authored quest rewards, and live
// monster XP into measurable chapter budgets without mutating the simulation.

import {
  MIR4_QUESTS_MAIN,
  MIR4_QUESTS_SIDE,
  type Mir4ArcQuest,
} from '../content/mir4/arc_campaign';
import { mir4ArcNormalXp } from '../content/mir4/arc_mobs';
import { mir4LevelRow } from '../content/mir4/class_levels';
import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import { mir4ArcStageGoal } from './arc_quests';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS,
  mir4ArcEncounterGrade,
  mir4ArcEncounterXpMultiplier,
} from './arc_stage_kinds';
import { MIR4_LEVEL_COL } from './stats';

export const MIR4_CAMPAIGN_PACING = Object.freeze({
  // The equipped five-class tick matrix measures 3.1s to 9.8s at levels 100
  // and 200. The 6.5s planning value is slightly above its 6.03s mean and does
  // not manufacture a multi-year curve from an inflated combat assumption.
  secondsPerNormalEquivalentKill: 6.5,
  minutesPerAuthoredQuest: 8,
  casualHoursPerDay: 2,
  daysPerYear: 365,
});

export interface Mir4CampaignEquipmentTarget {
  catalogRank: number;
  enhancementLevel: number;
}

export interface Mir4CampaignBandBalance {
  sequence: number;
  levelMin: number;
  levelMax: number;
  requiredXp: bigint;
  mainQuestXp: bigint;
  sideQuestXp: bigint;
  authoredCombatXp: bigint;
  mainQuestCount: number;
  sideQuestCount: number;
  combatStageCount: number;
  authoredCombatGoal: number;
  interventionStageCount: number;
  normalXp: number;
  normalEquivalentKills: number;
  equipment: Mir4CampaignEquipmentTarget;
}

function questXp(quest: Readonly<Mir4ArcQuest>): bigint {
  return BigInt(Math.max(0, Math.floor(quest.xp ?? 0)));
}

function questsForMap(quests: readonly Mir4ArcQuest[], mapId: string): readonly Mir4ArcQuest[] {
  return quests.filter((quest) => quest.mapId === mapId);
}

function ceilDivision(dividend: bigint, divisor: bigint): bigint {
  if (dividend <= 0n) return 0n;
  return (dividend + divisor - 1n) / divisor;
}

const MIR4_INTERVENTION_STAGE_KINDS: ReadonlySet<string> = new Set([
  'collect-quest-wallet',
  'defend-anchor',
  'guardian-resolution',
  'interrupt-ritual',
  'optional-elite-resolution',
  'selective-hunt',
  'short-dungeon-clear',
  'survive-zone',
]);

/**
 * The imported campaign names ranks 7 through 12, while the runtime owns six
 * class-specific visual sets and enhancement levels 0 through 15. Late ranks
 * therefore mean the sixth set at increasingly stronger enhancement levels.
 */
export function mir4CampaignEquipmentTarget(targetGearRank: number): Mir4CampaignEquipmentTarget {
  const admittedRank = Math.max(1, Math.floor(targetGearRank));
  if (admittedRank <= 6) return { catalogRank: admittedRank, enhancementLevel: 0 };
  const enhancementByRank: Readonly<Record<number, number>> = {
    7: 3,
    8: 5,
    9: 8,
    10: 10,
    11: 13,
    12: 15,
  };
  return {
    catalogRank: 6,
    enhancementLevel: enhancementByRank[Math.min(12, admittedRank)] ?? 15,
  };
}

export function mir4CampaignBandBalance(sequence: number): Mir4CampaignBandBalance {
  const index = Math.max(0, Math.min(MIR4_WORLD_ARC.length - 1, Math.floor(sequence) - 1));
  const map = MIR4_WORLD_ARC[index];
  if (!map) throw new Error('MIR4 campaign has no world maps');
  let requiredXp = 0n;
  for (let level = map.levelMin; level <= Math.min(199, map.levelMax); level += 1) {
    const row = mir4LevelRow(1, level);
    if (row) requiredXp += BigInt(row[MIR4_LEVEL_COL.reqExp]);
  }
  const mainQuests = questsForMap(MIR4_QUESTS_MAIN, map.mapId);
  const sideQuests = questsForMap(MIR4_QUESTS_SIDE, map.mapId);
  const stages = [...mainQuests, ...sideQuests].flatMap((quest) => quest.stages);
  const combatStages = stages.filter((stage) => MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind));
  const mainQuestXp = mainQuests.reduce((sum, quest) => sum + questXp(quest), 0n);
  const sideQuestXp = sideQuests.reduce((sum, quest) => sum + questXp(quest), 0n);
  const normalXp = mir4ArcNormalXp(map.sequence);
  const authoredCombatXp = stages.reduce((sum, stage) => {
    if (MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS.has(stage.kind)) {
      return sum + BigInt(normalXp * 20);
    }
    if (!MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) return sum;
    const grade = mir4ArcEncounterGrade(stage);
    const encounterCount = mir4ArcStageGoal(stage);
    return sum + BigInt(normalXp * mir4ArcEncounterXpMultiplier(grade) * encounterCount);
  }, 0n);
  const remainingXp = requiredXp - mainQuestXp - sideQuestXp - authoredCombatXp;
  const normalEquivalentKills = Number(ceilDivision(remainingXp, BigInt(normalXp)));
  return {
    sequence: map.sequence,
    levelMin: map.levelMin,
    levelMax: map.levelMax,
    requiredXp,
    mainQuestXp,
    sideQuestXp,
    authoredCombatXp,
    mainQuestCount: mainQuests.length,
    sideQuestCount: sideQuests.length,
    combatStageCount: combatStages.length,
    authoredCombatGoal: combatStages.reduce(
      (sum, stage) => sum + Math.max(1, Math.floor(stage.goal ?? 1)),
      0,
    ),
    interventionStageCount: stages.filter((stage) => MIR4_INTERVENTION_STAGE_KINDS.has(stage.kind))
      .length,
    normalXp,
    normalEquivalentKills,
    equipment: mir4CampaignEquipmentTarget(map.targetGearRank),
  };
}

export function mir4CampaignProgressionEstimate(): {
  bands: readonly Mir4CampaignBandBalance[];
  totalNormalEquivalentKills: number;
  totalActiveHours: number;
  casualYearsAtTwoHoursPerDay: number;
} {
  const bands = MIR4_WORLD_ARC.map((map) => mir4CampaignBandBalance(map.sequence));
  const totalNormalEquivalentKills = bands.reduce(
    (sum, band) => sum + band.normalEquivalentKills,
    0,
  );
  const authoredQuestCount = bands.reduce(
    (sum, band) => sum + band.mainQuestCount + band.sideQuestCount,
    0,
  );
  const totalActiveHours =
    (totalNormalEquivalentKills * MIR4_CAMPAIGN_PACING.secondsPerNormalEquivalentKill) / 3600 +
    (authoredQuestCount * MIR4_CAMPAIGN_PACING.minutesPerAuthoredQuest) / 60;
  const casualYearsAtTwoHoursPerDay =
    totalActiveHours / (MIR4_CAMPAIGN_PACING.casualHoursPerDay * MIR4_CAMPAIGN_PACING.daysPerYear);
  return { bands, totalNormalEquivalentKills, totalActiveHours, casualYearsAtTwoHoursPerDay };
}
