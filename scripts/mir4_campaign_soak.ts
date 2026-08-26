// Accelerated, deterministic MIR4 campaign homologation. Five fresh characters
// use the same player commands and autonomous systems as the local server, but
// advance simulation ticks without wall-clock waits. No quest state, evidence,
// level, currency or inventory is mutated by this runner.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleMir4Command } from '../server/mir4_commands';
import {
  advanceMir4AutomationRoute,
  type Mir4AutomationRouteState,
} from '../src/sim/auto_quest/route';
import { GATHER_NODES } from '../src/sim/content/gather_nodes';
import {
  MIR4_QUESTS_ARC,
  MIR4_QUESTS_MAIN,
  MIR4_QUESTS_SIDE,
} from '../src/sim/content/mir4/arc_campaign';
import { setActiveWorldContent } from '../src/sim/data';
import { MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
} from '../src/sim/mir4/arc_stage_kinds';
import { mir4GatherProgressionSourceForNode } from '../src/sim/mir4/training_resources';
import { buildMir4WocCampaignWorld } from '../src/sim/mir4/woc_comparison_world';
import { Sim } from '../src/sim/sim';
import {
  type CharacterState,
  type Entity,
  GATHER_CAST_ID,
  INTERACT_RANGE,
  PLAYER_INTEREST_DROP_RADIUS,
  type PlayerMeta,
} from '../src/sim/types';
import { WORLD_SEED } from '../src/sim/world_seed';
import {
  hasMir4NearbyHostile,
  type MIR4_PLAYTEST_ROSTER,
  planMir4EscortIntervention,
  planMir4GrindingEngagement,
  planMir4ProgressionActions,
  planMir4SurvivalIntervention,
  planMir4ThreatBattleMode,
  planMir4ThreatIntervention,
  planMir4TutorialEngagement,
  planMir4VendorRestock,
  selectMir4PlaytestRoster,
} from './lib/mir4_bot_playtest.mjs';
import {
  isForwardMir4SoakProgress,
  isMir4MainJourneyTraveling,
  isMir4PowerGrindXpProgress,
  isMir4SameQuestStageProgress,
  mir4SoakStageAllowsPowerGrind,
  nextMir4PowerGrindTarget,
  restoredMir4PowerGrindTarget,
  selectMir4NativeGatherTarget,
  selectMir4StrengtheningQuest,
  shouldEndMir4PowerGrindForMainStage,
  shouldEscalateMir4TravelThreatToPowerGrind,
  shouldKeepMir4MainQuestGrindRoute,
  shouldResumeMir4JourneyAfterTravelThreatKill,
  shouldResumeMir4MainQuest,
  shouldRunMir4SurvivalIntervention,
  shouldSkipStalledMir4NativeGatherRoute,
  shouldSkipStalledMir4StrengtheningQuest,
  shouldStartMir4PowerGrind,
} from './lib/mir4_campaign_soak.mjs';

const TICKS_PER_SECOND = 20;
const MAX_TICKS = positiveInteger('MAX_TICKS', 1_200_000);
const STALL_TICKS = positiveInteger('STALL_TICKS', 20_000);
// One deliberate player decision per second. At 4 Hz the bot repeatedly
// cancelled Auto Journey to re-enter combat before either action settled,
// producing false strength failures that a human player did not experience.
const POLICY_TICKS = positiveInteger('POLICY_TICKS', TICKS_PER_SECOND);
const REPORT_EVERY_TICKS = positiveInteger('REPORT_EVERY_TICKS', 20_000);
const TARGET_LEVEL = optionalPositiveInteger('TARGET_LEVEL');
const OUTPUT_DIR = resolve(process.env.REPORT_DIR ?? 'tmp/mir4-campaign-homologation');
const RESUME_FILE = process.env.RESUME_FILE ? resolve(process.env.RESUME_FILE) : null;
const TRACE_ESCORT = process.env.TRACE_ESCORT === '1';
const TRACE_OBJECTIVE = process.env.TRACE_OBJECTIVE === '1';
const TRACE_ESCORT_EVERY_TICKS = positiveInteger('TRACE_ESCORT_EVERY_TICKS', 100);
const TRAVEL_THREAT_STRENGTH_TEST_TICKS = 600;
const NATIVE_GATHER_HARVESTS_PER_LEVEL = 2;
const NATIVE_GATHER_MAX_DETOUR_YARDS = 140;
const SELECTED_ROSTER = selectMir4PlaytestRoster(process.env.SOAK_CLASSES);
const MAIN_QUEST_IDS = new Set(MIR4_QUESTS_MAIN.map((quest) => quest.questId));
const MAIN_QUEST_ORDER = MIR4_QUESTS_MAIN.map((quest) => quest.questId);
const QUEST_BY_ID = new Map(MIR4_QUESTS_ARC.map((quest) => [quest.questId, quest] as const));

type RosterEntry = (typeof MIR4_PLAYTEST_ROSTER)[number];
type AnyRecord = Record<string, any>;

interface BotRuntime {
  roster: RosterEntry;
  pid: number;
  tutorialSeeking: boolean;
  lastFingerprint: string;
  bestProgress: {
    completed: number;
    activeQuestId: string | null;
    stageIndex: number;
    stageProgress: number;
  };
  lastProgressTick: number;
  lastObservedXp: number;
  lastObservedLevel: number;
  lastObservedKills: number;
  grindingUntilLevel: number | null;
  grindPreviousMapOnly: boolean;
  grindStarts: number;
  nativeGatherTargetLevel: number | null;
  nativeGatherTargetNodeId: string | null;
  nativeGatherRoute: Mir4AutomationRouteState | undefined;
  nativeGatherHarvests: number;
  nativeGatherVisitedNodeIds: Set<string>;
  strengtheningQuestId: string | null;
  strengtheningSelectedAtTick: number | null;
  skippedStrengtheningQuestIds: Set<string>;
  resumedMainQuestId: string | null;
  travelInterventionQuestId: string | null;
  travelInterventionStartedTick: number | null;
  completedAtTick: number | null;
  deaths: number;
  recoveries: number;
  stageAdvances: number;
  questCompletions: number;
  visitedMaps: Set<string>;
  timeline: Array<Record<string, unknown>>;
}

interface ResumeBotEntry {
  characterState: CharacterState;
  runnerState?: {
    grindingUntilLevel?: number | null;
    nativeGatherTargetLevel?: number | null;
    nativeGatherHarvests?: number;
    nativeGatherVisitedNodeIds?: string[];
  };
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

function optionalPositiveInteger(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

function player(sim: Sim, pid: number): Entity {
  const value = sim.entities.get(pid);
  if (!value) throw new Error(`missing player entity ${pid}`);
  return value;
}

function meta(sim: Sim, pid: number): PlayerMeta {
  const value = sim.players.get(pid);
  if (!value) throw new Error(`missing player metadata ${pid}`);
  return value;
}

function selfSnapshot(sim: Sim, pid: number): AnyRecord {
  const entity = player(sim, pid);
  const playerMeta = meta(sim, pid);
  return {
    id: pid,
    lv: entity.level,
    xp: playerMeta.xp,
    copper: playerMeta.copper,
    hp: entity.hp,
    mhp: entity.maxHp,
    dead: entity.dead,
    gh: entity.ghost,
    pcd: entity.potionCdRemaining,
    x: entity.pos.x,
    z: entity.pos.z,
    castingAbility: entity.castingAbility,
    gatherCastNodeId: entity.gatherCastNodeId,
    inCombat: entity.inCombat,
    inv: playerMeta.inventory,
    mir4: sim.mir4PlayerState(pid),
  };
}

function visibleEntities(sim: Sim, pid: number): Map<number, AnyRecord> {
  const origin = player(sim, pid).pos;
  return new Map(
    [...sim.entities.values()]
      .filter((entity) => Math.hypot(entity.pos.x - origin.x, entity.pos.z - origin.z) <= 120)
      .map((entity) => [
        entity.id,
        {
          id: entity.id,
          kind: entity.kind,
          hp: entity.hp,
          dead: entity.dead,
          x: entity.pos.x,
          z: entity.pos.z,
          hostile: entity.hostile,
          runScoped: entity.runScoped,
          summonedAdd: entity.summonedAdd,
          targetId: entity.targetId,
          aggroTargetId: entity.aggroTargetId,
          vendorItems: entity.vendorItems,
        },
      ]),
  );
}

function applyInput(sim: Sim, pid: number, action: AnyRecord): void {
  const playerMeta = meta(sim, pid);
  Object.assign(playerMeta.moveInput, {
    forward: action.mi?.f === 1,
    backward: action.mi?.b === 1,
    left: action.mi?.l === 1,
    right: action.mi?.r === 1,
    jump: action.mi?.j === 1,
  });
  if (typeof action.facing === 'number' && Number.isFinite(action.facing)) {
    player(sim, pid).facing = action.facing;
  }
}

function applyAction(sim: Sim, bot: BotRuntime, action: AnyRecord): void {
  if (action.t === 'input') {
    applyInput(sim, bot.pid, action);
    return;
  }
  if (action.cmd === 'mir4') {
    handleMir4Command(sim, action, bot.pid);
    return;
  }
  if (action.cmd === 'use' && typeof action.item === 'string') {
    sim.useItem(action.item, bot.pid);
    return;
  }
  if (action.cmd === 'harvest_node' && typeof action.node === 'string') {
    sim.harvestNode(action.node, action.confirmUse === true, bot.pid);
    return;
  }
  if (
    action.cmd === 'buy' &&
    Number.isSafeInteger(action.npcId) &&
    typeof action.item === 'string'
  ) {
    sim.buyItem(action.npcId, action.item, { count: action.count }, bot.pid);
    return;
  }
  if (action.cmd === 'release') {
    sim.releaseSpirit(bot.pid);
    return;
  }
  if (action.cmd === 'resurrect_healer') {
    if (sim.resurrectAtSpiritHealer(bot.pid)) bot.recoveries += 1;
  }
}

function applyCampaignProgressionActions(
  sim: Sim,
  bot: BotRuntime,
  self: AnyRecord,
  needsAutoBattle: boolean,
): void {
  if (needsAutoBattle && self.mir4?.autoBattle?.mode !== 'battle') {
    applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: true });
  } else if (!needsAutoBattle && self.mir4?.autoBattle?.mode === 'battle') {
    applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: false });
  }
  planMir4ProgressionActions(self, bot.roster)
    .filter((action: AnyRecord) => action.m !== 'auto')
    .forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
}

function applyFragileObjectiveIntervention(
  sim: Sim,
  bot: BotRuntime,
  self: AnyRecord,
  nearbyEntities: Map<number, AnyRecord>,
  activeStage: AnyRecord | null,
): boolean {
  if (!activeStage || !MIR4_ARC_INTERACT_STAGE_KINDS.has(activeStage.kind)) return false;
  const intervention = planMir4ThreatIntervention(self, nearbyEntities, bot.roster);
  planMir4ThreatBattleMode(self, intervention.length > 0).forEach((action: AnyRecord) => {
    applyAction(sim, bot, action);
  });
  if (intervention.length > 0) {
    intervention.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    return true;
  }
  // A threat approach is ordinary player input. Release that key before
  // Auto Mission retries the fragile collection cast, or the shared motion
  // kernel correctly cancels the cast forever as "player moved".
  applyInput(sim, bot.pid, { mi: {} });
  return false;
}

function resetNativeGathering(bot: BotRuntime, targetLevel: number | null): void {
  bot.nativeGatherTargetLevel = targetLevel;
  bot.nativeGatherTargetNodeId = null;
  bot.nativeGatherRoute = undefined;
  bot.nativeGatherHarvests = 0;
  bot.nativeGatherVisitedNodeIds.clear();
}

/** Run a bounded physical gathering detour during one strengthening level.
 * Movement is ordinary forward input over the shared collision/path route;
 * interaction is the same authoritative harvest_node command as the client.
 * Nothing here grants proficiency, items, Darksteel, or Training materials. */
function driveNativeGathering(
  sim: Sim,
  bot: BotRuntime,
  self: AnyRecord,
  nearbyEntities: Map<number, AnyRecord>,
  tick: number,
): boolean {
  const targetLevel = bot.grindingUntilLevel;
  if (targetLevel === null) return false;
  if (bot.nativeGatherTargetLevel !== targetLevel) {
    resetNativeGathering(bot, targetLevel);
  }
  if (bot.nativeGatherHarvests >= NATIVE_GATHER_HARVESTS_PER_LEVEL) {
    return false;
  }

  if (self.castingAbility === GATHER_CAST_ID && self.gatherCastNodeId) {
    applyInput(sim, bot.pid, { mi: {} });
    return true;
  }

  let node = bot.nativeGatherTargetNodeId
    ? GATHER_NODES.find((candidate) => candidate.id === bot.nativeGatherTargetNodeId)
    : undefined;
  if (node && sim.nodeRespawnSecondsFor(node.id, bot.pid) !== null) {
    const reward = mir4GatherProgressionSourceForNode(node);
    bot.nativeGatherHarvests += 1;
    bot.nativeGatherVisitedNodeIds.add(node.id);
    bot.nativeGatherTargetNodeId = null;
    bot.nativeGatherRoute = undefined;
    bot.lastProgressTick = tick;
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'native-gather-complete',
      nodeId: node.id,
      nodeType: node.type,
      zoneId: node.zoneId,
      progressionReward: reward,
      proficiency: { ...meta(sim, bot.pid).gatheringProficiency },
      mir4Materials: { ...meta(sim, bot.pid).mir4Materials },
      darksteel: meta(sim, bot.pid).mir4Currencies.darksteel,
    });
    node = undefined;
    if (bot.nativeGatherHarvests >= NATIVE_GATHER_HARVESTS_PER_LEVEL) {
      return false;
    }
  }

  if (!node) {
    const preferredType = bot.nativeGatherHarvests % 2 === 0 ? 'herb' : 'ore';
    const candidate = selectMir4NativeGatherTarget({
      nodes: GATHER_NODES.filter((entry) => entry.tier <= 1).map((entry) => ({
        id: entry.id,
        type: entry.type,
        x: entry.pos.x,
        z: entry.pos.z,
        ready: sim.nodeRespawnSecondsFor(entry.id, bot.pid) === null,
      })),
      position: self,
      preferredType,
      excludedNodeIds: [...bot.nativeGatherVisitedNodeIds],
      maxDistanceYards: NATIVE_GATHER_MAX_DETOUR_YARDS,
    });
    if (!candidate) return false;
    node = GATHER_NODES.find((entry) => entry.id === candidate.id);
    if (!node) return false;
    bot.nativeGatherTargetNodeId = node.id;
    bot.nativeGatherRoute = undefined;
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'native-gather-selected',
      nodeId: node.id,
      nodeType: node.type,
      zoneId: node.zoneId,
      distance: Math.hypot(node.pos.x - self.x, node.pos.z - self.z),
    });
  }

  // Collection takes control only after a reachable, ready native node exists.
  // Turning Journey off before this point made an out-of-range scan oscillate
  // between the selected side quest and the default Main Quest every policy
  // tick, without walking either route.
  if (self.mir4?.mir4AutoQuest) {
    applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
  }
  planMir4ThreatBattleMode(self, false).forEach((action: AnyRecord) => {
    applyAction(sim, bot, action);
  });

  const intervention = planMir4ThreatIntervention(
    self,
    nearbyEntities,
    bot.roster,
    self.mir4?.autoBattle?.acquireRadiusYards ?? 30,
  );
  if (intervention.length > 0) {
    intervention.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    return true;
  }
  if (self.inCombat || self.castingAbility) {
    applyInput(sim, bot.pid, { mi: {} });
    return true;
  }

  const distance = Math.hypot(node.pos.x - self.x, node.pos.z - self.z);
  if (distance <= INTERACT_RANGE - 0.5) {
    applyInput(sim, bot.pid, { mi: {} });
    applyAction(sim, bot, { cmd: 'harvest_node', node: node.id });
    return true;
  }

  const next = advanceMir4AutomationRoute(
    WORLD_SEED,
    { x: self.x, z: self.z },
    node.pos,
    bot.nativeGatherRoute,
    sim.riftCollisionToken,
    undefined,
    false,
    sim.ctx.worldContent.roads,
    sim.ctx.worldContent.zones,
    true,
  );
  bot.nativeGatherRoute = next.route;
  if (shouldSkipStalledMir4NativeGatherRoute(next.route.stalledTicks)) {
    bot.nativeGatherVisitedNodeIds.add(node.id);
    bot.nativeGatherTargetNodeId = null;
    bot.nativeGatherRoute = undefined;
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'native-gather-unreachable',
      nodeId: node.id,
      nodeType: node.type,
      zoneId: node.zoneId,
      distance,
    });
    applyInput(sim, bot.pid, { mi: {} });
    return true;
  }
  applyInput(sim, bot.pid, {
    mi: { f: 1 },
    facing: Math.atan2(next.waypoint.x - self.x, next.waypoint.z - self.z),
  });
  return true;
}

function questStats(state: AnyRecord | null): {
  completed: number;
  activeQuestId: string | null;
  stageIndex: number;
  stageProgress: number;
  fingerprint: string;
} {
  const progresses = state?.mir4ArcQuests ?? {};
  let completed = 0;
  for (const questId of MAIN_QUEST_IDS) {
    if (progresses[questId]?.state === 'done') completed += 1;
  }
  const autoQuestId = state?.mir4AutoQuest?.questId;
  const activeQuestId =
    typeof autoQuestId === 'string'
      ? autoQuestId
      : (MIR4_QUESTS_MAIN.find((quest) => progresses[quest.questId]?.state === 'active')?.questId ??
        null);
  const progress = activeQuestId ? progresses[activeQuestId] : null;
  const stageIndex = Number(progress?.stageIndex ?? 0);
  const stageProgress = Number(progress?.stageProgress ?? 0);
  return {
    completed,
    activeQuestId,
    stageIndex,
    stageProgress,
    fingerprint: `${completed}:${activeQuestId ?? '-'}:${stageIndex}:${stageProgress}`,
  };
}

function currentMainQuestId(state: AnyRecord | null): string | null {
  const progresses = state?.mir4ArcQuests ?? {};
  return (
    MIR4_QUESTS_MAIN.find((quest) => progresses[quest.questId]?.state !== 'done')?.questId ?? null
  );
}

function recordProgress(sim: Sim, bot: BotRuntime, tick: number): void {
  const state = sim.mir4PlayerState(bot.pid) as AnyRecord | null;
  const stats = questStats(state);
  const playerMeta = meta(sim, bot.pid);
  const playerEntity = player(sim, bot.pid);
  const currentXp = playerMeta.xp;
  const currentLevel = playerEntity.level;
  const currentKills = playerMeta.counters.kills;
  if (
    shouldResumeMir4JourneyAfterTravelThreatKill({
      interventionQuestId: bot.travelInterventionQuestId,
      previousKills: bot.lastObservedKills,
      currentKills,
    })
  ) {
    // One road kill is the manual intervention Auto Mission deliberately does
    // not own. Resume the journey immediately instead of waiting for a dense,
    // fast-respawning grind camp to become globally empty — it never should.
    const journeyQuestId = bot.travelInterventionQuestId!;
    bot.travelInterventionQuestId = null;
    bot.travelInterventionStartedTick = null;
    bot.lastProgressTick = tick;
    applyInput(sim, bot.pid, { mi: {} });
    applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: false });
    applyAction(sim, bot, {
      cmd: 'mir4',
      m: 'quest',
      on: true,
      questId: journeyQuestId,
    });
  }
  if (currentLevel !== bot.lastObservedLevel) {
    const target =
      playerEntity.targetId === null ? null : sim.entities.get(playerEntity.targetId ?? -1);
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'level-change',
      questId: stats.activeQuestId,
      fromLevel: bot.lastObservedLevel,
      level: currentLevel,
      xp: currentXp,
      killsSincePreviousLevel: Math.max(0, currentKills - bot.lastObservedKills),
      targetTemplateId: target?.templateId ?? null,
    });
  }
  if (isMir4PowerGrindXpProgress(bot.lastObservedXp, currentXp, bot.grindingUntilLevel)) {
    bot.lastProgressTick = tick;
  }
  bot.lastObservedXp = currentXp;
  bot.lastObservedLevel = currentLevel;
  bot.lastObservedKills = currentKills;
  if (stats.activeQuestId) {
    const mapId = QUEST_BY_ID.get(stats.activeQuestId)?.mapId;
    if (mapId) bot.visitedMaps.add(mapId);
  }
  if (isForwardMir4SoakProgress(bot.bestProgress, stats, MAIN_QUEST_ORDER)) {
    bot.bestProgress = {
      completed: stats.completed,
      activeQuestId: stats.activeQuestId,
      stageIndex: stats.stageIndex,
      stageProgress: stats.stageProgress,
    };
    bot.lastProgressTick = tick;
    bot.travelInterventionStartedTick = null;
  }
  if (stats.fingerprint === bot.lastFingerprint) return;
  const previous = bot.lastFingerprint.split(':');
  const previousCompleted = Number(previous[0] ?? 0);
  const previousQuestId = previous[1] === '-' ? null : previous[1];
  const previousStage = Number(previous[2] ?? 0);
  const previousStageProgress = Number(previous[3] ?? 0);
  const sameQuestForward = isMir4SameQuestStageProgress(
    {
      completed: previousCompleted,
      activeQuestId: previousQuestId,
      stageIndex: previousStage,
      stageProgress: previousStageProgress,
    },
    stats,
  );
  if (sameQuestForward) bot.lastProgressTick = tick;
  if (stats.completed > previousCompleted)
    bot.questCompletions += stats.completed - previousCompleted;
  if (stats.completed > previousCompleted || sameQuestForward) bot.stageAdvances += 1;
  bot.lastFingerprint = stats.fingerprint;
  bot.timeline.push({
    tick,
    seconds: tick / TICKS_PER_SECOND,
    questId: stats.activeQuestId,
    stageIndex: stats.stageIndex,
    stageProgress: stats.stageProgress,
    completed: stats.completed,
    level: player(sim, bot.pid).level,
  });
  if (bot.timeline.length > 2_000) bot.timeline.shift();
  if (stats.completed === MAIN_QUEST_IDS.size && bot.completedAtTick === null) {
    bot.completedAtTick = tick;
  }
}

function drivePolicy(sim: Sim, bot: BotRuntime, tick: number): void {
  const self = selfSnapshot(sim, bot.pid);
  const recovery = planMir4ProgressionActions(self, bot.roster).filter(
    (action: AnyRecord) => action.cmd === 'release' || action.cmd === 'resurrect_healer',
  );
  if (recovery.length > 0) {
    // Death is evidence that the current strength test failed, not campaign
    // progress. Begin the next one-level strength trial immediately; a player
    // who dies faster than the one-second policy cadence must not be trapped
    // in an endless resurrect-and-retry loop before the stall timer can fire.
    const deathMainQuestId = currentMainQuestId(self.mir4);
    const deathMainQuest = deathMainQuestId ? QUEST_BY_ID.get(deathMainQuestId) : null;
    const deathProgress = deathMainQuestId ? self.mir4?.mir4ArcQuests?.[deathMainQuestId] : null;
    const deathAuthoredStageIndex =
      deathProgress?.selectedStageIndexes?.[deathProgress.stageIndex] ?? deathProgress?.stageIndex;
    const deathStage =
      deathMainQuest && deathAuthoredStageIndex !== undefined
        ? deathMainQuest.stages[deathAuthoredStageIndex]
        : null;
    if (
      bot.grindingUntilLevel === null &&
      deathMainQuestId !== null &&
      mir4SoakStageAllowsPowerGrind(deathStage?.kind)
    ) {
      bot.grindingUntilLevel = nextMir4PowerGrindTarget(
        self.lv,
        deathMainQuest?.levelRange?.[0] ?? 1,
      );
      bot.grindPreviousMapOnly = false;
      bot.grindStarts += 1;
      bot.lastProgressTick = tick;
      bot.timeline.push({
        tick,
        seconds: tick / TICKS_PER_SECOND,
        kind: 'death-power-grind',
        questId: deathMainQuestId,
        fromLevel: self.lv,
        targetLevel: bot.grindingUntilLevel,
      });
    }
    recovery.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    if (bot.grindingUntilLevel !== null && self.mir4?.mir4AutoQuest) {
      applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
    }
    return;
  }
  const nearbyEntities = visibleEntities(sim, bot.pid);
  const restock = planMir4VendorRestock(self, nearbyEntities);
  if (restock.length > 0) {
    restock.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    return;
  }
  const stats = questStats(self.mir4);
  const activeQuest = stats.activeQuestId ? QUEST_BY_ID.get(stats.activeQuestId) : null;
  const activeProgress = stats.activeQuestId
    ? self.mir4?.mir4ArcQuests?.[stats.activeQuestId]
    : null;
  const activeAuthoredStageIndex =
    activeProgress?.selectedStageIndexes?.[activeProgress.stageIndex] ?? activeProgress?.stageIndex;
  const activeStage =
    activeQuest && activeAuthoredStageIndex !== undefined
      ? activeQuest.stages[activeAuthoredStageIndex]
      : null;
  const needsAutoBattle = Boolean(activeStage && MIR4_ARC_COMBAT_STAGE_KINDS.has(activeStage.kind));
  if (activeStage && MIR4_ARC_ESCORT_STAGE_KINDS.has(activeStage.kind)) {
    const escortIntervention = planMir4EscortIntervention(self, nearbyEntities, bot.roster);
    if (escortIntervention.length > 0) {
      escortIntervention.forEach((action: AnyRecord) => {
        applyAction(sim, bot, action);
      });
      return;
    }
  }
  const mainQuestId = currentMainQuestId(self.mir4);
  const mainQuest = mainQuestId ? QUEST_BY_ID.get(mainQuestId) : null;
  const mainProgress = mainQuestId ? self.mir4?.mir4ArcQuests?.[mainQuestId] : null;
  const mainAuthoredStageIndex =
    mainProgress?.selectedStageIndexes?.[mainProgress.stageIndex] ?? mainProgress?.stageIndex;
  const mainStage =
    mainQuest && mainAuthoredStageIndex !== undefined
      ? mainQuest.stages[mainAuthoredStageIndex]
      : null;
  const recommendedLevel = mainQuest?.levelRange?.[0] ?? 1;
  const mainAutoQuest = meta(sim, bot.pid).mir4AutoQuest;
  const mainJourneyTraveling = isMir4MainJourneyTraveling({
    mainQuestId,
    autoQuestId: mainAutoQuest?.questId,
    routeWaypointCount: mainAutoQuest?.route?.waypoints.length ?? 0,
  });
  const activeJourneyTraveling = Boolean(
    mainAutoQuest?.questId && (mainAutoQuest.route?.waypoints.length ?? 0) > 0,
  );
  if (bot.travelInterventionQuestId !== null) {
    if (bot.grindingUntilLevel !== null && self.lv >= bot.grindingUntilLevel) {
      bot.grindingUntilLevel = null;
      bot.grindPreviousMapOnly = false;
      bot.travelInterventionQuestId = null;
      bot.travelInterventionStartedTick = null;
      bot.lastProgressTick = tick;
      applyInput(sim, bot.pid, { mi: {} });
      if (self.mir4?.autoBattle?.mode === 'battle') {
        applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: false });
      }
      if (mainQuestId) {
        applyAction(sim, bot, {
          cmd: 'mir4',
          m: 'quest',
          on: true,
          questId: mainQuestId,
        });
      }
      return;
    }
    const interventionShowsInsufficientStrength =
      bot.grindingUntilLevel === null &&
      shouldEscalateMir4TravelThreatToPowerGrind({
        tick,
        startedTick: bot.travelInterventionStartedTick,
        playerLevel: self.lv,
        recommendedLevel,
        attemptTicks: TRAVEL_THREAT_STRENGTH_TEST_TICKS,
      });
    if (interventionShowsInsufficientStrength) {
      bot.grindingUntilLevel = nextMir4PowerGrindTarget(self.lv, recommendedLevel);
      bot.grindPreviousMapOnly = true;
      bot.grindStarts += 1;
      bot.travelInterventionQuestId = null;
      bot.travelInterventionStartedTick = null;
      bot.lastProgressTick = tick;
      bot.timeline.push({
        tick,
        seconds: tick / TICKS_PER_SECOND,
        kind: 'travel-threat-power-grind',
        questId: mainQuestId,
        fromLevel: self.lv,
        targetLevel: bot.grindingUntilLevel,
      });
    } else {
      const travelThreatIntervention = planMir4ThreatIntervention(
        self,
        nearbyEntities,
        bot.roster,
        self.mir4?.autoBattle?.acquireRadiusYards ?? 30,
      );
      if (travelThreatIntervention.length > 0) {
        if (self.mir4?.mir4AutoQuest) {
          applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
        }
        if (self.mir4?.autoBattle?.mode !== 'battle') {
          applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: true });
        }
        travelThreatIntervention.forEach((action: AnyRecord) => {
          applyAction(sim, bot, action);
        });
        return;
      }
      applyInput(sim, bot.pid, { mi: {} });
      if (self.mir4?.autoBattle?.mode === 'battle') {
        applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: false });
      }
      applyAction(sim, bot, {
        cmd: 'mir4',
        m: 'quest',
        on: true,
        questId: bot.travelInterventionQuestId,
      });
      bot.travelInterventionQuestId = null;
      bot.lastProgressTick = tick;
      return;
    }
  }
  // Auto Mission remains travel-only. A human tester would separately turn
  // on the Auto Battle tool after an aggressive camp commits to attacking,
  // then resume the journey when the immediate threat is gone. The campaign
  // bot must make that same intervention or repeated knockback can look like
  // an impassable road even for a vastly overpowered character.
  if (activeJourneyTraveling) {
    const travelThreatIntervention = planMir4ThreatIntervention(
      self,
      nearbyEntities,
      bot.roster,
      self.mir4?.autoBattle?.acquireRadiusYards ?? 30,
    );
    if (travelThreatIntervention.length > 0) {
      bot.travelInterventionQuestId = mainAutoQuest?.questId ?? mainQuestId;
      bot.travelInterventionStartedTick ??= tick;
      if (self.mir4?.mir4AutoQuest) {
        applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
      }
      if (self.mir4?.autoBattle?.mode !== 'battle') {
        applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: true });
      }
      travelThreatIntervention.forEach((action: AnyRecord) => {
        applyAction(sim, bot, action);
      });
      return;
    }
  }
  if (
    bot.grindingUntilLevel === null &&
    mainQuestId !== null &&
    mir4SoakStageAllowsPowerGrind(mainStage?.kind) &&
    shouldStartMir4PowerGrind({
      tick,
      lastProgressTick: bot.lastProgressTick,
      stallTicks: STALL_TICKS,
      policyTicks: POLICY_TICKS,
      playerLevel: self.lv,
      recommendedLevel,
      traveling: mainJourneyTraveling,
    })
  ) {
    // Re-test the real mission after each earned level. The authored level is
    // a recommendation, not an artificial gate, and the minimum sufficient
    // strength may be lower depending on class, equipment and consumables.
    bot.grindingUntilLevel = nextMir4PowerGrindTarget(self.lv, recommendedLevel);
    bot.grindPreviousMapOnly = false;
    bot.grindStarts += 1;
    bot.lastProgressTick = tick;
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'power-grind',
      questId: stats.activeQuestId,
      fromLevel: self.lv,
      targetLevel: bot.grindingUntilLevel,
    });
  }
  if (
    shouldEndMir4PowerGrindForMainStage({
      grindingUntilLevel: bot.grindingUntilLevel,
      activeQuestId: stats.activeQuestId,
      mainQuestId,
      mainStageKind: mainStage?.kind,
    })
  ) {
    bot.grindingUntilLevel = null;
    bot.grindPreviousMapOnly = false;
    bot.lastProgressTick = tick;
    applyInput(sim, bot.pid, { mi: {} });
    if (mainQuestId && self.mir4?.mir4AutoQuest?.questId !== mainQuestId) {
      applyAction(sim, bot, {
        cmd: 'mir4',
        m: 'quest',
        on: true,
        questId: mainQuestId,
      });
    }
    return;
  }
  if (bot.grindingUntilLevel !== null) {
    if (self.lv >= bot.grindingUntilLevel) {
      bot.grindingUntilLevel = null;
      bot.grindPreviousMapOnly = false;
      bot.lastProgressTick = tick;
      applyInput(sim, bot.pid, { mi: {} });
      if (mainQuestId && self.mir4?.mir4AutoQuest?.questId !== mainQuestId) {
        applyAction(sim, bot, {
          cmd: 'mir4',
          m: 'quest',
          on: true,
          questId: mainQuestId,
        });
      }
    } else {
      if (driveNativeGathering(sim, bot, self, nearbyEntities, tick)) {
        return;
      }
      let strengtheningQuestId = mainQuest
        ? selectMir4StrengtheningQuest({
            sideQuests: MIR4_QUESTS_SIDE,
            progresses: self.mir4?.mir4ArcQuests ?? {},
            currentMainMapId: mainQuest.mapId,
            playerLevel: self.lv,
            includeCurrentMap: true,
            preferPreviousMap: bot.grindPreviousMapOnly,
            excludedQuestIds: [...bot.skippedStrengtheningQuestIds],
          })
        : null;
      if (strengtheningQuestId && bot.strengtheningQuestId !== strengtheningQuestId) {
        bot.strengtheningQuestId = strengtheningQuestId;
        bot.strengtheningSelectedAtTick = tick;
      }
      if (
        strengtheningQuestId &&
        shouldSkipStalledMir4StrengtheningQuest({
          tick,
          selectedAtTick: bot.strengtheningSelectedAtTick,
          lastProgressTick: bot.lastProgressTick,
          attemptTicks: Math.min(STALL_TICKS, Math.max(POLICY_TICKS, 600)),
        })
      ) {
        bot.skippedStrengtheningQuestIds.add(strengtheningQuestId);
        bot.timeline.push({
          tick,
          seconds: tick / TICKS_PER_SECOND,
          kind: 'strengthening-route-skipped',
          questId: strengtheningQuestId,
        });
        bot.strengtheningQuestId = null;
        bot.strengtheningSelectedAtTick = null;
        strengtheningQuestId = null;
        applyInput(sim, bot.pid, { mi: {} });
        if (self.mir4?.mir4AutoQuest) {
          applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
        }
      }
      if (strengtheningQuestId) {
        applyInput(sim, bot.pid, { mi: {} });
        if (self.mir4?.mir4AutoQuest?.questId !== strengtheningQuestId) {
          applyAction(sim, bot, {
            cmd: 'mir4',
            m: 'quest',
            on: true,
            questId: strengtheningQuestId,
          });
        }
        if (
          self.mir4?.mir4AutoQuest?.questId === strengtheningQuestId &&
          applyFragileObjectiveIntervention(
            sim,
            bot,
            self,
            nearbyEntities,
            activeStage as AnyRecord | null,
          )
        ) {
          return;
        }
        applyCampaignProgressionActions(sim, bot, self, needsAutoBattle);
        return;
      }
      if (
        shouldResumeMir4MainQuest({
          strengtheningQuestId,
          autoQuestId: self.mir4?.mir4AutoQuest?.questId,
          mainQuestId,
          resumedMainQuestId: bot.resumedMainQuestId,
          // Auto Battle does not roam beyond its local acquisition radius. If
          // that camp is empty, resume the main route after one strength-test
          // window so the player finds a new fight instead of idling forever.
          grindStalled:
            tick - bot.lastProgressTick >= Math.min(STALL_TICKS, Math.max(POLICY_TICKS, 600)),
        })
      ) {
        bot.resumedMainQuestId = mainQuestId;
        bot.lastProgressTick = tick;
        applyInput(sim, bot.pid, { mi: {} });
        applyAction(sim, bot, {
          cmd: 'mir4',
          m: 'quest',
          on: true,
          questId: mainQuestId,
        });
        return;
      }
      const hasVisibleGrindTarget = hasMir4NearbyHostile(
        self,
        nearbyEntities,
        self.mir4?.autoBattle?.acquireRadiusYards ?? 30,
      );
      if (
        shouldKeepMir4MainQuestGrindRoute({
          resumedMainQuestId: bot.resumedMainQuestId,
          autoQuestId: self.mir4?.mir4AutoQuest?.questId,
          mainQuestId,
          hasVisibleGrindTarget,
        })
      ) {
        applyInput(sim, bot.pid, { mi: {} });
        if (self.mir4?.autoBattle?.mode === 'battle') {
          applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: false });
        }
        return;
      }
      if (
        bot.resumedMainQuestId === mainQuestId &&
        self.mir4?.mir4AutoQuest?.questId === mainQuestId &&
        hasVisibleGrindTarget
      ) {
        bot.resumedMainQuestId = null;
      }
      if (self.mir4?.mir4AutoQuest) applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
      if (self.mir4?.autoBattle?.mode !== 'battle') {
        applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: true });
      }
      const grindActions = planMir4GrindingEngagement(
        self,
        nearbyEntities,
        self.mir4?.autoBattle?.acquireRadiusYards,
      );
      if (grindActions.length === 0) applyInput(sim, bot.pid, { mi: {} });
      else
        grindActions.forEach((action: AnyRecord) => {
          applyAction(sim, bot, action);
        });
      return;
    }
  }
  const survivalRouteWaypoint = mainAutoQuest?.route?.waypoints[0];
  const survivalRouteWaypointDistance = survivalRouteWaypoint
    ? Math.hypot(survivalRouteWaypoint.x - self.x, survivalRouteWaypoint.z - self.z)
    : null;
  if (
    shouldRunMir4SurvivalIntervention({
      stageKind: activeStage?.kind,
      grindingUntilLevel: bot.grindingUntilLevel,
      routeWaypointDistance: survivalRouteWaypointDistance,
    })
  ) {
    const encounter = stats.activeQuestId
      ? sim.mir4ArcEncounterRuns.get(`${bot.pid}:${stats.activeQuestId}:${stats.stageIndex}`)
      : undefined;
    const survivalIntervention = planMir4SurvivalIntervention(
      self,
      nearbyEntities,
      bot.roster,
      encounter?.entityId,
    );
    if (survivalIntervention.length > 0) {
      survivalIntervention.forEach((action: AnyRecord) => {
        applyAction(sim, bot, action);
      });
      return;
    }
  }
  const potionProgress = self.mir4?.mir4ArcQuests?.['M01-Q02'];
  const needsNearbyEntities = potionProgress?.state === 'active' && potionProgress.stageIndex === 3;
  const tutorial = planMir4TutorialEngagement(
    self,
    needsNearbyEntities ? nearbyEntities : new Map(),
    bot.roster,
  );
  if (tutorial.length > 0) {
    bot.tutorialSeeking = true;
    tutorial.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    return;
  }
  if (
    applyFragileObjectiveIntervention(
      sim,
      bot,
      self,
      nearbyEntities,
      activeStage as AnyRecord | null,
    )
  ) {
    return;
  }
  if (bot.tutorialSeeking) {
    applyInput(sim, bot.pid, { mi: {} });
    bot.tutorialSeeking = false;
  }
  applyCampaignProgressionActions(sim, bot, self, needsAutoBattle);
}

function stalledBots(sim: Sim, bots: BotRuntime[], tick: number): BotRuntime[] {
  return bots.filter((bot) => {
    if (bot.completedAtTick !== null) return false;
    const stats = questStats(sim.mir4PlayerState(bot.pid) as AnyRecord | null);
    return stats.activeQuestId !== null && tick - bot.lastProgressTick >= STALL_TICKS;
  });
}

function traceEscort(sim: Sim, bot: BotRuntime, tick: number): void {
  if (!TRACE_ESCORT || tick % TRACE_ESCORT_EVERY_TICKS !== 0) return;
  const state = sim.mir4PlayerState(bot.pid) as AnyRecord | null;
  const questId = state?.mir4AutoQuest?.questId;
  const progress = typeof questId === 'string' ? state?.mir4ArcQuests?.[questId] : null;
  if (!progress) return;
  const run = sim.mir4ArcEscortRuns.get(`${bot.pid}:${questId}:${progress.stageIndex}`);
  if (!run) return;
  const npc = run.npcId === null ? null : sim.entities.get(run.npcId);
  const liveAmbushers = run.ambushIds.filter((id) => {
    const entity = sim.entities.get(id);
    return !!entity && !entity.dead;
  }).length;
  const liveAmbusher = run.ambushIds
    .map((id) => sim.entities.get(id))
    .find((entity) => entity && !entity.dead);
  const self = player(sim, bot.pid);
  console.log(
    `[escort ${tick}] ${questId} progress=${progress.stageProgress} checkpoint=${run.checkpoint} started=${run.started} waiting=${run.waitingCheckpoint} player=${self.pos.x.toFixed(1)},${self.pos.z.toFixed(1)} npc=${npc ? `${npc.pos.x.toFixed(1)},${npc.pos.z.toFixed(1)}` : '-'} npcHp=${npc ? Math.round(npc.hp) : '-'} live=${liveAmbushers} ambusher=${liveAmbusher ? `${liveAmbusher.pos.x.toFixed(1)},${liveAmbusher.pos.z.toFixed(1)} hp${Math.round(liveAmbusher.hp)}` : '-'}`,
  );
}

function traceObjective(sim: Sim, bot: BotRuntime, tick: number): void {
  if (!TRACE_OBJECTIVE || tick % 100 !== 0) return;
  const self = player(sim, bot.pid);
  const state = sim.mir4PlayerState(bot.pid) as AnyRecord | null;
  const questId = state?.mir4AutoQuest?.questId;
  const progress = typeof questId === 'string' ? state?.mir4ArcQuests?.[questId] : null;
  if (!progress) return;
  const objective = [...sim.entities.values()]
    .filter(
      (entity) =>
        entity.kind === 'object' &&
        entity.ownerId === bot.pid &&
        entity.templateId.startsWith('mir4_objective_'),
    )
    .sort(
      (left, right) =>
        Math.hypot(left.pos.x - self.pos.x, left.pos.z - self.pos.z) -
        Math.hypot(right.pos.x - self.pos.x, right.pos.z - self.pos.z),
    )[0];
  const nearbyHostiles = [...sim.entities.values()].filter(
    (entity) =>
      entity.kind === 'mob' &&
      !entity.dead &&
      sim.isHostileTo(self, entity) &&
      Math.hypot(entity.pos.x - self.pos.x, entity.pos.z - self.pos.z) <= 30,
  );
  const attackingHostiles = nearbyHostiles.filter((entity) => entity.targetId === self.id).length;
  const encounter = sim.mir4ArcEncounterRuns.get(`${bot.pid}:${questId}:${progress.stageIndex}`);
  const encounterMob = encounter ? sim.entities.get(encounter.entityId) : undefined;
  const route = meta(sim, bot.pid).mir4AutoQuest?.route;
  console.log(
    `[objective ${tick}] ${questId}#${progress.stageIndex}:${progress.stageProgress} at=${self.pos.x.toFixed(1)},${self.pos.z.toFixed(1)} hp=${Math.round(self.hp)} cast=${self.castingAbility ?? '-'} node=${self.gatherCastNodeId || '-'} target=${self.targetId ?? '-'} encounter=${encounterMob ? `${encounterMob.id}@${encounterMob.pos.x.toFixed(1)},${encounterMob.pos.z.toFixed(1)} hp=${Math.round(encounterMob.hp)}` : '-'} objective=${objective ? `${objective.id}@${objective.pos.x.toFixed(1)},${objective.pos.z.toFixed(1)} d=${Math.hypot(objective.pos.x - self.pos.x, objective.pos.z - self.pos.z).toFixed(1)}` : '-'} hostiles30=${nearbyHostiles.length}/${attackingHostiles} route=${route?.waypoints?.[0] ? `${route.waypoints[0].x.toFixed(1)},${route.waypoints[0].z.toFixed(1)}` : '-'}`,
  );
}

async function loadResumeStates(): Promise<Map<string, ResumeBotEntry>> {
  if (!RESUME_FILE) return new Map();
  const parsed = JSON.parse(await readFile(RESUME_FILE, 'utf8')) as AnyRecord;
  const result = new Map<string, ResumeBotEntry>();
  for (const entry of parsed.players ?? []) {
    if (typeof entry?.classKey !== 'string' || !entry.characterState) continue;
    result.set(entry.classKey, {
      characterState: entry.characterState as CharacterState,
      ...(entry.runnerState && typeof entry.runnerState === 'object'
        ? { runnerState: entry.runnerState }
        : {}),
    });
  }
  if (result.size === 0) throw new Error('RESUME_FILE does not contain character states');
  return result;
}

async function writeCheckpoint(sim: Sim, bots: BotRuntime[], tick: number): Promise<void> {
  const checkpoint = {
    schemaVersion: 2,
    seed: WORLD_SEED,
    ticks: tick,
    players: bots.map((bot) => ({
      classKey: bot.roster.classKey,
      characterState: sim.serializeCharacter(bot.pid),
      runnerState: {
        grindingUntilLevel: bot.grindingUntilLevel,
        nativeGatherTargetLevel: bot.nativeGatherTargetLevel,
        nativeGatherHarvests: bot.nativeGatherHarvests,
        nativeGatherVisitedNodeIds: [...bot.nativeGatherVisitedNodeIds],
      },
    })),
  };
  await writeFile(
    resolve(OUTPUT_DIR, 'checkpoint.json'),
    `${JSON.stringify(checkpoint, null, 2)}\n`,
    'utf8',
  );
}

function persistenceProof(
  world: ReturnType<typeof buildMir4WocCampaignWorld>,
  sim: Sim,
  bot: BotRuntime,
) {
  const saved = sim.serializeCharacter(bot.pid) as CharacterState | null;
  if (!saved) return { ok: false, reason: 'serialize returned null' };
  const restored = new Sim({
    seed: WORLD_SEED,
    playerClass: 'warrior',
    gameProfile: MIR4_GAME_PROFILE,
    world,
    noPlayer: true,
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
  const restoredPid = restored.addPlayer(bot.roster.classKey, `${bot.roster.namePrefix}Restore`, {
    state: JSON.parse(JSON.stringify(saved)) as CharacterState,
  });
  const before = questStats(sim.mir4PlayerState(bot.pid) as AnyRecord | null);
  const after = questStats(restored.mir4PlayerState(restoredPid) as AnyRecord | null);
  return {
    ok: before.fingerprint === after.fingerprint,
    before: before.fingerprint,
    after: after.fingerprint,
  };
}

function runtimeDiagnostics(sim: Sim, bot: BotRuntime): Record<string, unknown> {
  const entity = player(sim, bot.pid);
  const playerMeta = meta(sim, bot.pid);
  const target = entity.targetId == null ? null : sim.entities.get(entity.targetId);
  return {
    position: { x: entity.pos.x, z: entity.pos.z },
    hp: entity.hp,
    dead: entity.dead,
    targetId: entity.targetId ?? null,
    target: target
      ? {
          id: target.id,
          templateId: target.templateId,
          position: { x: target.pos.x, z: target.pos.z },
          hp: target.hp,
          dead: target.dead,
          lineOfSight: sim.ctx.hasLineOfSight(entity, target),
        }
      : null,
    castingAbility: entity.castingAbility ?? null,
    mir4Effects: entity.mir4Effects?.active.map((effect) => ({ ...effect })) ?? [],
    auras: entity.auras.map((aura) => ({
      kind: aura.kind,
      remaining: aura.remaining,
      sourceId: aura.sourceId,
    })),
    moveInput: { ...playerMeta.moveInput },
    narrativeDialogue: playerMeta.mir4NarrativeDialogue
      ? { ...playerMeta.mir4NarrativeDialogue }
      : null,
    autoQuestRoute: playerMeta.mir4AutoQuest?.route
      ? {
          ...playerMeta.mir4AutoQuest.route,
          waypoints: playerMeta.mir4AutoQuest.route.waypoints.map((waypoint) => ({ ...waypoint })),
        }
      : null,
  };
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const resumeStates = await loadResumeStates();
  // Exercise the selected production topology: the full MIR4 story and
  // progression transplanted onto the original WoC overworld.
  const world = buildMir4WocCampaignWorld();
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: WORLD_SEED,
    playerClass: 'warrior',
    gameProfile: MIR4_GAME_PROFILE,
    world,
    noPlayer: true,
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
  const bots: BotRuntime[] = SELECTED_ROSTER.map((roster: RosterEntry) => {
    const restored = resumeStates.get(roster.classKey);
    const restoredState = restored?.characterState;
    const pid = sim.addPlayer(
      roster.classKey,
      `${roster.namePrefix}Soak`,
      restoredState ? { state: restoredState } : undefined,
    );
    const initial = questStats(sim.mir4PlayerState(pid) as AnyRecord | null);
    const initialState = sim.mir4PlayerState(pid) as AnyRecord | null;
    const inferredGrindTarget = restoredMir4PowerGrindTarget({
      playerLevel: player(sim, pid).level,
      sideQuests: MIR4_QUESTS_SIDE,
      progresses: initialState?.mir4ArcQuests ?? {},
    });
    const hasSavedGrindTarget = Boolean(
      restored?.runnerState && Object.hasOwn(restored.runnerState, 'grindingUntilLevel'),
    );
    const savedGrindTarget = hasSavedGrindTarget
      ? restored?.runnerState?.grindingUntilLevel
      : restored?.runnerState?.nativeGatherTargetLevel;
    const hasLegacyNativeGrindTarget =
      !hasSavedGrindTarget && Number.isSafeInteger(savedGrindTarget);
    const restoredGrindTarget =
      hasSavedGrindTarget || hasLegacyNativeGrindTarget
        ? Number.isSafeInteger(savedGrindTarget) &&
          Number(savedGrindTarget) > player(sim, pid).level
          ? Number(savedGrindTarget)
          : null
        : inferredGrindTarget;
    const savedGatherLevel = restored?.runnerState?.nativeGatherTargetLevel;
    const savedGatherMatches =
      restoredGrindTarget !== null && savedGatherLevel === restoredGrindTarget;
    // Schema-1 checkpoints predate runner-state persistence. If both physical
    // professions have already advanced, regard that old run's bounded pair
    // as complete instead of re-harvesting on every resumed process.
    const inferredLegacyHarvests =
      restored &&
      restored?.runnerState === undefined &&
      meta(sim, pid).gatheringProficiency.herbalism > 0 &&
      meta(sim, pid).gatheringProficiency.mining > 0
        ? NATIVE_GATHER_HARVESTS_PER_LEVEL
        : 0;
    return {
      roster,
      pid,
      tutorialSeeking: false,
      lastFingerprint: initial.fingerprint,
      bestProgress: {
        completed: initial.completed,
        activeQuestId: initial.activeQuestId,
        stageIndex: initial.stageIndex,
        stageProgress: initial.stageProgress,
      },
      lastProgressTick: 0,
      lastObservedXp: meta(sim, pid).xp,
      lastObservedLevel: player(sim, pid).level,
      lastObservedKills: meta(sim, pid).counters.kills,
      grindingUntilLevel: restoredGrindTarget,
      grindPreviousMapOnly: false,
      grindStarts: 0,
      nativeGatherTargetLevel: savedGatherMatches
        ? restoredGrindTarget
        : inferredLegacyHarvests > 0
          ? restoredGrindTarget
          : null,
      nativeGatherTargetNodeId: null,
      nativeGatherRoute: undefined,
      nativeGatherHarvests: savedGatherMatches
        ? Math.min(
            NATIVE_GATHER_HARVESTS_PER_LEVEL,
            Math.max(0, restored?.runnerState?.nativeGatherHarvests ?? 0),
          )
        : inferredLegacyHarvests,
      nativeGatherVisitedNodeIds: new Set<string>(
        savedGatherMatches ? (restored?.runnerState?.nativeGatherVisitedNodeIds ?? []) : [],
      ),
      strengtheningQuestId: null,
      strengtheningSelectedAtTick: null,
      skippedStrengtheningQuestIds: new Set<string>(),
      resumedMainQuestId: null,
      travelInterventionQuestId: null,
      travelInterventionStartedTick: null,
      completedAtTick: null,
      deaths: 0,
      recoveries: 0,
      stageAdvances: 0,
      questCompletions: 0,
      visitedMaps: new Set<string>(),
      timeline: [],
    };
  });

  let stopReason = 'max-ticks';
  let tick = 0;
  for (; tick < MAX_TICKS; tick += 1) {
    if (tick % POLICY_TICKS === 0)
      bots.forEach((bot) => {
        drivePolicy(sim, bot, tick);
      });
    const wasDead = new Map(bots.map((bot) => [bot.pid, player(sim, bot.pid).dead]));
    sim.tick();
    for (const bot of bots) {
      if (!wasDead.get(bot.pid) && player(sim, bot.pid).dead) bot.deaths += 1;
    }
    if ((tick + 1) % POLICY_TICKS === 0) {
      for (const bot of bots) {
        recordProgress(sim, bot, tick + 1);
        traceEscort(sim, bot, tick + 1);
        traceObjective(sim, bot, tick + 1);
      }
    }
    if (bots.every((bot) => bot.completedAtTick !== null)) {
      stopReason = 'campaign-complete';
      tick += 1;
      break;
    }
    if (TARGET_LEVEL !== null && bots.every((bot) => player(sim, bot.pid).level >= TARGET_LEVEL)) {
      stopReason = 'target-level-reached';
      tick += 1;
      break;
    }
    const stalled = stalledBots(sim, bots, tick + 1);
    if (stalled.length > 0) {
      stopReason = `stalled:${stalled.map((bot) => bot.roster.classKey).join(',')}`;
      tick += 1;
      break;
    }
    if ((tick + 1) % REPORT_EVERY_TICKS === 0) {
      await writeCheckpoint(sim, bots, tick + 1);
      const status = bots
        .map((bot) => {
          const stats = questStats(sim.mir4PlayerState(bot.pid) as AnyRecord | null);
          const entity = player(sim, bot.pid);
          const grind = bot.grindingUntilLevel === null ? '' : ` grind->${bot.grindingUntilLevel}`;
          return `${bot.roster.classKey}=${stats.completed}/${MAIN_QUEST_IDS.size} ${stats.activeQuestId ?? '-'}#${stats.stageIndex} lv${entity.level} @${entity.pos.x.toFixed(1)},${entity.pos.z.toFixed(1)}${grind}`;
        })
        .join(' | ');
      console.log(`[${tick + 1} ticks] ${status}`);
    }
  }

  const players = bots.map((bot) => {
    const entity = player(sim, bot.pid);
    const state = sim.mir4PlayerState(bot.pid) as AnyRecord | null;
    const stats = questStats(state);
    const activeProgress = stats.activeQuestId ? state?.mir4ArcQuests?.[stats.activeQuestId] : null;
    return {
      classKey: bot.roster.classKey,
      classId: bot.roster.classId,
      completedMainQuests: stats.completed,
      totalMainQuests: MAIN_QUEST_IDS.size,
      activeQuestId: stats.activeQuestId,
      activeQuestTitle: stats.activeQuestId ? QUEST_BY_ID.get(stats.activeQuestId)?.title : null,
      activeStageIndex: stats.stageIndex,
      activeStageProgress: stats.stageProgress,
      activeStageKind:
        stats.activeQuestId && activeProgress
          ? QUEST_BY_ID.get(stats.activeQuestId)?.stages[stats.stageIndex]?.kind
          : null,
      level: entity.level,
      combatPower: state?.combatPower ?? null,
      copper: meta(sim, bot.pid).copper,
      mir4Currencies: { ...meta(sim, bot.pid).mir4Currencies },
      mir4Materials: { ...meta(sim, bot.pid).mir4Materials },
      gatheringProficiency: { ...meta(sim, bot.pid).gatheringProficiency },
      deaths: bot.deaths,
      recoveries: bot.recoveries,
      grindStarts: bot.grindStarts,
      grindingUntilLevel: bot.grindingUntilLevel,
      stageAdvances: bot.stageAdvances,
      questCompletions: bot.questCompletions,
      visitedMaps: [...bot.visitedMaps],
      ticksSinceProgress: tick - bot.lastProgressTick,
      completedAtTick: bot.completedAtTick,
      persistence: persistenceProof(world, sim, bot),
      runtimeDiagnostics: runtimeDiagnostics(sim, bot),
      characterState: sim.serializeCharacter(bot.pid),
      timeline: bot.timeline,
    };
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    seed: WORLD_SEED,
    ticks: tick,
    simulatedSeconds: tick / TICKS_PER_SECOND,
    stopReason,
    campaignComplete: stopReason === 'campaign-complete',
    targetLevel: TARGET_LEVEL,
    targetReached: stopReason === 'target-level-reached',
    mainQuestCount: MAIN_QUEST_IDS.size,
    settings: {
      maxTicks: MAX_TICKS,
      stallTicks: STALL_TICKS,
      policyTicks: POLICY_TICKS,
    },
    players,
  };
  await writeCheckpoint(sim, bots, tick);
  const output = resolve(OUTPUT_DIR, `soak-${Date.now()}.json`);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    JSON.stringify(
      {
        output,
        ...report,
        players: players.map(({ timeline: _, characterState: __, ...p }) => p),
      },
      null,
      2,
    ),
  );
  setActiveWorldContent(null);
  if (!report.campaignComplete && !report.targetReached) process.exitCode = 2;
}

main().catch((error) => {
  setActiveWorldContent(null);
  console.error(error);
  process.exitCode = 1;
});
