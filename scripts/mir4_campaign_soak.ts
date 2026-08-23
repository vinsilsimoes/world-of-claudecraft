// Accelerated, deterministic MIR4 campaign homologation. Five fresh characters
// use the same player commands and autonomous systems as the local server, but
// advance simulation ticks without wall-clock waits. No quest state, evidence,
// level, currency or inventory is mutated by this runner.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleMir4Command } from '../server/mir4_commands';
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
import { buildMir4WocCampaignWorld } from '../src/sim/mir4/woc_comparison_world';
import { Sim } from '../src/sim/sim';
import {
  type CharacterState,
  type Entity,
  PLAYER_INTEREST_DROP_RADIUS,
  type PlayerMeta,
} from '../src/sim/types';
import {
  type MIR4_PLAYTEST_ROSTER,
  planMir4GrindingEngagement,
  planMir4ProgressionActions,
  planMir4ThreatIntervention,
  planMir4TutorialEngagement,
  selectMir4PlaytestRoster,
} from './lib/mir4_bot_playtest.mjs';
import {
  isForwardMir4SoakProgress,
  isMir4PowerGrindXpProgress,
  mir4SoakStageAllowsPowerGrind,
  selectMir4StrengtheningQuest,
  shouldResumeMir4MainQuest,
  shouldStartMir4PowerGrind,
} from './lib/mir4_campaign_soak.mjs';

const TICKS_PER_SECOND = 20;
const MAX_TICKS = positiveInteger('MAX_TICKS', 1_200_000);
const STALL_TICKS = positiveInteger('STALL_TICKS', 20_000);
const POLICY_TICKS = positiveInteger('POLICY_TICKS', 5);
const REPORT_EVERY_TICKS = positiveInteger('REPORT_EVERY_TICKS', 20_000);
const OUTPUT_DIR = resolve(process.env.REPORT_DIR ?? 'tmp/mir4-campaign-homologation');
const RESUME_FILE = process.env.RESUME_FILE ? resolve(process.env.RESUME_FILE) : null;
const TRACE_ESCORT = process.env.TRACE_ESCORT === '1';
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
  grindingUntilLevel: number | null;
  grindStarts: number;
  resumedMainQuestId: string | null;
  completedAtTick: number | null;
  deaths: number;
  recoveries: number;
  stageAdvances: number;
  questCompletions: number;
  visitedMaps: Set<string>;
  timeline: Array<Record<string, unknown>>;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
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
  const currentXp = meta(sim, bot.pid).xp;
  if (isMir4PowerGrindXpProgress(bot.lastObservedXp, currentXp, bot.grindingUntilLevel)) {
    bot.lastProgressTick = tick;
  }
  bot.lastObservedXp = currentXp;
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
  }
  if (stats.fingerprint === bot.lastFingerprint) return;
  if (bot.grindingUntilLevel !== null) bot.lastProgressTick = tick;
  const previous = bot.lastFingerprint.split(':');
  const previousCompleted = Number(previous[0] ?? 0);
  const previousStage = Number(previous[2] ?? 0);
  if (stats.completed > previousCompleted)
    bot.questCompletions += stats.completed - previousCompleted;
  if (stats.completed > previousCompleted || stats.stageIndex !== previousStage)
    bot.stageAdvances += 1;
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
  const needsAutoBattle = Boolean(
    activeStage &&
      (MIR4_ARC_COMBAT_STAGE_KINDS.has(activeStage.kind) ||
        MIR4_ARC_ESCORT_STAGE_KINDS.has(activeStage.kind)),
  );
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
    })
  ) {
    bot.grindingUntilLevel = recommendedLevel;
    bot.grindStarts += 1;
    bot.lastProgressTick = tick;
    bot.timeline.push({
      tick,
      seconds: tick / TICKS_PER_SECOND,
      kind: 'power-grind',
      questId: stats.activeQuestId,
      fromLevel: self.lv,
      targetLevel: recommendedLevel,
    });
  }
  if (bot.grindingUntilLevel !== null) {
    if (self.lv >= bot.grindingUntilLevel) {
      bot.grindingUntilLevel = null;
      bot.lastProgressTick = tick;
      applyInput(sim, bot.pid, { mi: {} });
      if (mainQuestId && self.mir4?.mir4AutoQuest?.questId !== mainQuestId) {
        applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: true, questId: mainQuestId });
      }
    } else {
      const strengtheningQuestId = mainQuest
        ? selectMir4StrengtheningQuest({
            sideQuests: MIR4_QUESTS_SIDE,
            progresses: self.mir4?.mir4ArcQuests ?? {},
            currentMainMapId: mainQuest.mapId,
            playerLevel: self.lv,
          })
        : null;
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
        applyCampaignProgressionActions(sim, bot, self, needsAutoBattle);
        return;
      }
      if (
        shouldResumeMir4MainQuest({
          strengtheningQuestId,
          autoQuestId: self.mir4?.mir4AutoQuest?.questId,
          mainQuestId,
          resumedMainQuestId: bot.resumedMainQuestId,
        })
      ) {
        bot.resumedMainQuestId = mainQuestId;
        bot.grindingUntilLevel = null;
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
      if (self.mir4?.mir4AutoQuest) applyAction(sim, bot, { cmd: 'mir4', m: 'quest', on: false });
      if (self.mir4?.autoBattle?.mode !== 'battle') {
        applyAction(sim, bot, { cmd: 'mir4', m: 'auto', on: true });
      }
      const grindActions = planMir4GrindingEngagement(
        self,
        visibleEntities(sim, bot.pid),
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
  const potionProgress = self.mir4?.mir4ArcQuests?.['M01-Q02'];
  const needsNearbyEntities = potionProgress?.state === 'active' && potionProgress.stageIndex === 3;
  const tutorial = planMir4TutorialEngagement(
    self,
    needsNearbyEntities ? visibleEntities(sim, bot.pid) : new Map(),
    bot.roster,
  );
  if (tutorial.length > 0) {
    bot.tutorialSeeking = true;
    tutorial.forEach((action: AnyRecord) => {
      applyAction(sim, bot, action);
    });
    return;
  }
  if (activeStage && MIR4_ARC_INTERACT_STAGE_KINDS.has(activeStage.kind)) {
    const intervention = planMir4ThreatIntervention(
      self,
      visibleEntities(sim, bot.pid),
      bot.roster,
    );
    if (intervention.length > 0) {
      intervention.forEach((action: AnyRecord) => {
        applyAction(sim, bot, action);
      });
      return;
    }
    // A threat approach is ordinary player input. Release that key before
    // Auto Mission retries the fragile collection cast, or the shared motion
    // kernel correctly cancels the cast forever as "player moved".
    applyInput(sim, bot.pid, { mi: {} });
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
  if (!TRACE_ESCORT || tick % 100 !== 0) return;
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
  console.log(
    `[escort ${tick}] ${questId} progress=${progress.stageProgress} checkpoint=${run.checkpoint} started=${run.started} waiting=${run.waitingCheckpoint} npcHp=${npc ? Math.round(npc.hp) : '-'} live=${liveAmbushers}`,
  );
}

async function loadResumeStates(): Promise<Map<string, CharacterState>> {
  if (!RESUME_FILE) return new Map();
  const parsed = JSON.parse(await readFile(RESUME_FILE, 'utf8')) as AnyRecord;
  const result = new Map<string, CharacterState>();
  for (const entry of parsed.players ?? []) {
    if (typeof entry?.classKey !== 'string' || !entry.characterState) continue;
    result.set(entry.classKey, entry.characterState as CharacterState);
  }
  if (result.size === 0) throw new Error('RESUME_FILE does not contain character states');
  return result;
}

async function writeCheckpoint(sim: Sim, bots: BotRuntime[], tick: number): Promise<void> {
  const checkpoint = {
    schemaVersion: 1,
    seed: 73_041,
    ticks: tick,
    players: bots.map((bot) => ({
      classKey: bot.roster.classKey,
      characterState: sim.serializeCharacter(bot.pid),
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
    seed: 90_000 + bot.roster.classId,
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

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const resumeStates = await loadResumeStates();
  // Exercise the selected production topology: the full MIR4 story and
  // progression transplanted onto the original WoC overworld.
  const world = buildMir4WocCampaignWorld();
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 73_041,
    playerClass: 'warrior',
    gameProfile: MIR4_GAME_PROFILE,
    world,
    noPlayer: true,
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
  const bots: BotRuntime[] = SELECTED_ROSTER.map((roster: RosterEntry) => {
    const restoredState = resumeStates.get(roster.classKey);
    const pid = sim.addPlayer(
      roster.classKey,
      `${roster.namePrefix}Soak`,
      restoredState ? { state: restoredState } : undefined,
    );
    const initial = questStats(sim.mir4PlayerState(pid) as AnyRecord | null);
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
      grindingUntilLevel: null,
      grindStarts: 0,
      resumedMainQuestId: null,
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
      }
    }
    if (bots.every((bot) => bot.completedAtTick !== null)) {
      stopReason = 'campaign-complete';
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
      characterState: sim.serializeCharacter(bot.pid),
      timeline: bot.timeline,
    };
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    seed: 73_041,
    ticks: tick,
    simulatedSeconds: tick / TICKS_PER_SECOND,
    stopReason,
    campaignComplete: stopReason === 'campaign-complete',
    mainQuestCount: MAIN_QUEST_IDS.size,
    settings: { maxTicks: MAX_TICKS, stallTicks: STALL_TICKS, policyTicks: POLICY_TICKS },
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
  if (!report.campaignComplete) process.exitCode = 2;
}

main().catch((error) => {
  setActiveWorldContent(null);
  console.error(error);
  process.exitCode = 1;
});
