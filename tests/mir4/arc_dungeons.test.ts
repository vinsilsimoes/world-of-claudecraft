import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { DUNGEONS, dungeonAt, instanceOrigin, setActiveWorldContent } from '../../src/sim/data';
import {
  mir4ArcDungeonTargetForPlayer,
  updateMir4ArcDungeonEncounters,
} from '../../src/sim/mir4/arc_dungeons';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';
import { nearestOverworldGraveyard } from '../../src/sim/spirit';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

const CAMPAIGN_ROOM_ID = 'campaign_trial_room';

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function makeSim(world = buildMir4ArcWorld(4)): Sim {
  setActiveWorldContent(world);
  return new Sim({
    seed: 853,
    playerClass: 'warrior',
    playerName: 'Hunter',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

function shortDungeonProgress(): Mir4ArcQuestProgress {
  return {
    questId: 'M04-Q05',
    stageIndex: 5,
    stageProgress: 0,
    state: 'active',
  };
}

function placeAtStage(
  sim: Sim,
  pid: number,
  progress: Mir4ArcQuestProgress,
): { x: number; z: number } {
  const stage = required(mir4QuestCurrentStage(progress), 'campaign stage');
  const anchor = required(
    mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress),
    'campaign anchor',
  );
  const player = required(sim.entities.get(pid), 'player entity');
  player.pos = sim.groundPos(anchor.x, anchor.z);
  player.prevPos = { ...player.pos };
  sim.rebucket(player);
  return anchor;
}

function startRun(sim: Sim, pid = sim.playerId): Mir4ArcQuestProgress {
  const progress = shortDungeonProgress();
  required(sim.players.get(pid), 'player meta').mir4ArcQuests = { [progress.questId]: progress };
  placeAtStage(sim, pid, progress);
  updateMir4ArcDungeonEncounters(sim.ctx);
  return progress;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 campaign dungeon instances', () => {
  it('materializes the encounter inside an isolated native WoC room', () => {
    const sim = makeSim();
    const progress = shortDungeonProgress();
    required(sim.players.get(sim.playerId), 'player meta').mir4ArcQuests = {
      [progress.questId]: progress,
    };
    const returnPos = placeAtStage(sim, sim.playerId, progress);

    updateMir4ArcDungeonEncounters(sim.ctx);

    const player = sim.player;
    const dungeon = dungeonAt(player.pos.x);
    expect(dungeon).toMatchObject({
      id: CAMPAIGN_ROOM_ID,
      interior: 'sanctum',
      overworldDoor: false,
      internalOnly: true,
    });
    const run = required([...sim.mir4ArcDungeonRuns.values()][0], 'campaign dungeon run');
    expect(run.returnPos).toEqual(returnPos);
    const room = required(DUNGEONS[CAMPAIGN_ROOM_ID], 'campaign room definition');
    const origin = instanceOrigin(room.index, run.instanceSlot);
    const guards = run.guardIds.map((id) => required(sim.entities.get(id), `guard ${id}`));
    expect(guards).toHaveLength(3);
    expect(guards.every((guard) => Math.abs(guard.pos.x - origin.x) < 20)).toBe(true);
    expect(guards.every((guard) => Math.abs(guard.pos.z - origin.z) < 90)).toBe(true);
  });

  it('gives simultaneous players different physical instance slots', () => {
    const sim = makeSim();
    const secondPid = sim.addPlayer('warrior', 'Second Hunter');
    startRun(sim, sim.playerId);
    startRun(sim, secondPid);

    const runs = [...sim.mir4ArcDungeonRuns.values()].sort((a, b) => a.ownerPid - b.ownerPid);
    expect(runs).toHaveLength(2);
    const firstRun = required(runs[0], 'first campaign run');
    const secondRun = required(runs[1], 'second campaign run');
    expect(firstRun.instanceSlot).not.toBe(secondRun.instanceSlot);
    const first = required(sim.entities.get(firstRun.ownerPid), 'first player');
    const second = required(sim.entities.get(secondRun.ownerPid), 'second player');
    expect(Math.abs(first.pos.z - second.pos.z)).toBeGreaterThan(400);
    expect(dungeonAt(first.pos.x)?.id).toBe(CAMPAIGN_ROOM_ID);
    expect(dungeonAt(second.pos.x)?.id).toBe(CAMPAIGN_ROOM_ID);
  });

  it('returns the owner to the exact campaign anchor after the boss dies', () => {
    const sim = makeSim();
    const progress = shortDungeonProgress();
    required(sim.players.get(sim.playerId), 'player meta').mir4ArcQuests = {
      [progress.questId]: progress,
    };
    const returnPos = placeAtStage(sim, sim.playerId, progress);
    updateMir4ArcDungeonEncounters(sim.ctx);
    const run = required([...sim.mir4ArcDungeonRuns.values()][0], 'campaign dungeon run');

    for (const guardId of run.guardIds) {
      const guard = required(sim.entities.get(guardId), `guard ${guardId}`);
      sim.dealDamage(sim.player, guard, guard.hp + 1, false, 'physical', null, 'hit');
    }
    updateMir4ArcDungeonEncounters(sim.ctx);
    const bossId = required(run.bossId, 'campaign boss id');
    const boss = required(sim.entities.get(bossId), 'campaign boss');
    sim.dealDamage(sim.player, boss, boss.hp + 1, false, 'physical', null, 'hit');
    expect(progress.stageIndex).toBe(6);

    updateMir4ArcDungeonEncounters(sim.ctx);

    expect(sim.player.pos.x).toBeCloseTo(returnPos.x, 6);
    expect(sim.player.pos.z).toBeCloseTo(returnPos.z, 6);
    expect(dungeonAt(sim.player.pos.x)).toBeNull();
    expect(sim.mir4ArcDungeonRuns.size).toBe(0);
  });

  it('exposes a living guard and then the boss as the authored automation target', () => {
    const sim = makeSim();
    const progress = startRun(sim);
    const run = required([...sim.mir4ArcDungeonRuns.values()][0], 'campaign dungeon run');

    const first = required(
      mir4ArcDungeonTargetForPlayer(sim.ctx, sim.playerId, progress.questId, progress.stageIndex),
      'first automation target',
    );
    expect(run.guardIds).toContain(first.id);
    for (const guardId of run.guardIds) {
      const guard = required(sim.entities.get(guardId), `guard ${guardId}`);
      sim.dealDamage(sim.player, guard, guard.hp + 1, false, 'physical', null, 'hit');
    }
    updateMir4ArcDungeonEncounters(sim.ctx);

    const boss = required(
      mir4ArcDungeonTargetForPlayer(sim.ctx, sim.playerId, progress.questId, progress.stageIndex),
      'boss automation target',
    );
    expect(boss.id).toBe(run.bossId);
  });

  it('routes the existing dungeon-exit interaction to the saved return point', () => {
    const sim = makeSim();
    const progress = shortDungeonProgress();
    required(sim.players.get(sim.playerId), 'player meta').mir4ArcQuests = {
      [progress.questId]: progress,
    };
    const returnPos = placeAtStage(sim, sim.playerId, progress);
    updateMir4ArcDungeonEncounters(sim.ctx);
    const run = required([...sim.mir4ArcDungeonRuns.values()][0], 'campaign dungeon run');
    const instance = required(
      sim.instances.find(
        (candidate) =>
          candidate.dungeonId === CAMPAIGN_ROOM_ID && candidate.slot === run.instanceSlot,
      ),
      'campaign instance',
    );
    const exitId = required(instance.exitId, 'campaign exit id');
    const exit = required(sim.entities.get(exitId), 'campaign exit');
    sim.player.pos = { ...exit.pos };
    sim.player.prevPos = { ...exit.pos };
    sim.rebucket(sim.player);
    sim.player.targetId = exit.id;

    sim.interact();

    expect(sim.player.pos.x).toBeCloseTo(returnPos.x, 6);
    expect(sim.player.pos.z).toBeCloseTo(returnPos.z, 6);
    updateMir4ArcDungeonEncounters(sim.ctx);
    expect(dungeonAt(sim.player.pos.x)).toBeNull();
    expect(sim.mir4ArcDungeonRuns.get(run.key)?.reentryArmed).toBe(false);
  });

  it('persists the outdoor return point instead of an ephemeral instance coordinate', () => {
    const sim = makeSim();
    const progress = shortDungeonProgress();
    required(sim.players.get(sim.playerId), 'player meta').mir4ArcQuests = {
      [progress.questId]: progress,
    };
    const returnPos = placeAtStage(sim, sim.playerId, progress);
    updateMir4ArcDungeonEncounters(sim.ctx);

    expect(sim.serializeCharacter(sim.playerId)?.pos).toEqual(returnPos);
  });

  it('releases a dead owner at the graveyard nearest the outdoor campaign anchor', () => {
    const world = buildMir4ArcWorld(4);
    const sim = makeSim(world);
    const progress = shortDungeonProgress();
    required(sim.players.get(sim.playerId), 'player meta').mir4ArcQuests = {
      [progress.questId]: progress,
    };
    const returnPos = placeAtStage(sim, sim.playerId, progress);
    updateMir4ArcDungeonEncounters(sim.ctx);
    const corpsePos = { ...sim.player.pos };
    const expected = nearestOverworldGraveyard(
      returnPos.x,
      returnPos.z,
      world.services?.graveyards,
      world.playerStart,
    );

    sim.player.dead = true;
    sim.player.hp = 0;
    sim.releaseSpirit();

    expect(sim.player.ghost).toBe(true);
    expect(sim.player.corpsePos).toEqual(corpsePos);
    expect(sim.player.pos.x).toBeCloseTo(expected.x, 6);
    expect(sim.player.pos.z).toBeCloseTo(expected.z, 6);
    expect(dungeonAt(sim.player.pos.x)).toBeNull();
  });
});
