import { afterAll, describe, expect, it } from 'vitest';

import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  mir4ArcEscorteeForPlayer,
  mir4ArcEscortTargetForPlayer,
  tryStartMir4ArcEscort,
  updateMir4ArcEscorts,
} from '../../src/sim/mir4/arc_escorts';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';

function makeEscortSim(): Sim {
  const world = buildMir4ArcWorld(9);
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 1_111,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Escort Tester',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
  sim.players.get(sim.playerId)!.mir4ArcQuests = {
    'M02-Q02': {
      questId: 'M02-Q02',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active',
    },
  };
  return sim;
}

function escortee(sim: Sim) {
  return [...sim.entities.values()].find((entity) =>
    entity.templateId.startsWith('mir4_escort_m02-q02_2'),
  );
}

function makeSupplyEscortSim(): Sim {
  const world = buildMir4ArcWorld(1);
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 2_222,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Supply Tester',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
  sim.players.get(sim.playerId)!.mir4ArcQuests = {
    'M01-R01': {
      questId: 'M01-R01',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active',
      selectedStageIndexes: [2, 0],
    },
  };
  return sim;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 native-runtime campaign escorts', () => {
  it('walks a visible native mob through three guarded checkpoints before credit', () => {
    const sim = makeEscortSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress = meta.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    sim.player.prevPos = { ...sim.player.pos };
    updateMir4ArcEscorts(sim.ctx);

    const npc = escortee(sim)!;
    expect(npc).toMatchObject({ kind: 'mob', hostile: false, questIds: ['M02-Q02'] });
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);

    for (let checkpoint = 0; checkpoint < 3; checkpoint++) {
      const waypoint = mir4ArcStageAnchor(progress.questId, stage, checkpoint)!;
      npc.pos = sim.groundPos(waypoint.x, waypoint.z);
      sim.player.pos = { ...npc.pos };
      updateMir4ArcEscorts(sim.ctx);
      const ambushers = [...sim.entities.values()].filter((entity) =>
        entity.templateId.startsWith(`mir4_escort_ambush_m02-q02_2_${checkpoint}`),
      );
      expect(ambushers).toHaveLength(2);
      expect(ambushers.every((entity) => entity.hostile && entity.runScoped)).toBe(true);
      for (const ambusher of ambushers) ambusher.dead = true;
      updateMir4ArcEscorts(sim.ctx);
    }

    expect(progress).toMatchObject({ stageIndex: 3, stageProgress: 0, state: 'active' });
    expect(escortee(sim)).toBeUndefined();
  });

  it('completes the three-checkpoint route through movement without teleporting the escortee', () => {
    const sim = makeEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = escortee(sim)!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);

    const reached: number[] = [];
    for (let tick = 0; tick < 5_000 && progress.stageIndex === 2; tick++) {
      sim.player.pos = { ...npc.pos };
      updateMir4ArcEscorts(sim.ctx);
      const run = [...sim.mir4ArcEscortRuns.values()][0];
      if (!run?.waitingCheckpoint || reached.includes(run.checkpoint)) continue;
      reached.push(run.checkpoint);
      for (const ambusherId of run.ambushIds) {
        const ambusher = sim.entities.get(ambusherId);
        if (ambusher) ambusher.dead = true;
      }
    }

    expect(reached).toEqual([0, 1, 2]);
    expect(progress).toMatchObject({ stageIndex: 3, stageProgress: 0, state: 'active' });
    expect(sim.entities.has(npc.id)).toBe(false);
  });

  it('restarts the current stage after the escortee dies', () => {
    const sim = makeEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = escortee(sim)!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);
    progress.stageProgress = 2;
    npc.dead = true;

    updateMir4ArcEscorts(sim.ctx);
    expect(progress).toMatchObject({ stageIndex: 2, stageProgress: 0, state: 'active' });
    expect(escortee(sim)).toBeUndefined();
    sim.time += 4;
    updateMir4ArcEscorts(sim.ctx);
    expect(escortee(sim)).toBeUndefined();
    sim.time += 1;
    updateMir4ArcEscorts(sim.ctx);
    expect(escortee(sim)).toMatchObject({ hostile: false });
  });

  it('keeps a started escortee friendly through mob upkeep and Auto Battle targeting', () => {
    const sim = makeEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = escortee(sim)!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);
    npc.hostile = true;
    expect(sim.isHostileTo(sim.player, npc)).toBe(false);
    const hpBefore = npc.hp;
    sim.player.targetId = npc.id;
    sim.setMir4AutoBattleMode('battle');

    sim.tick();

    expect(npc).toMatchObject({ dead: false, hostile: false, hp: hpBefore });
    expect(sim.isHostileTo(sim.player, npc)).toBe(false);
    expect(sim.player.targetId).not.toBe(npc.id);
  });

  it('releases the native escort shell and template after the quest leaves the stage', () => {
    const sim = makeEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    expect(sim.mir4ArcEscortRuns.size).toBe(1);
    expect(sim.mir4RuntimeMobTemplates.size).toBe(1);

    progress.state = 'done';
    updateMir4ArcEscorts(sim.ctx);

    expect(sim.mir4ArcEscortRuns.size).toBe(0);
    expect(sim.mir4RuntimeMobTemplates.size).toBe(0);
  });

  it('walks a supply escort, spawns one ambusher, and requires nearby owner credit', () => {
    const sim = makeSupplyEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M01-R01']!;
    const stage = mir4QuestCurrentStage(progress)!;
    expect(stage.kind).toBe('escort-supply-run');
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = [...sim.entities.values()].find((entity) =>
      entity.templateId.startsWith('mir4_escort_m01-r01_0'),
    )!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);

    const before = { ...npc.pos };
    updateMir4ArcEscorts(sim.ctx);
    expect(Math.hypot(npc.pos.x - before.x, npc.pos.z - before.z)).toBeGreaterThan(0);

    npc.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const ambushers = [...sim.entities.values()].filter((entity) =>
      entity.templateId.startsWith('mir4_escort_ambush_m01-r01_0_0'),
    );
    expect(ambushers).toHaveLength(1);
    ambushers[0]!.dead = true;
    sim.player.pos = sim.groundPos(npc.pos.x + 30, npc.pos.z);
    updateMir4ArcEscorts(sim.ctx);
    expect(progress.stageProgress).toBe(0);
    sim.player.pos = { ...npc.pos };
    updateMir4ArcEscorts(sim.ctx);
    expect(progress.stageProgress).toBe(1);
  });

  it('selects the nearest living escort ambusher with an entity-id tie break', () => {
    const sim = makeEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M02-Q02']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = escortee(sim)!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);
    npc.pos = sim.groundPos(first.x, first.z);
    sim.player.pos = { ...npc.pos };
    updateMir4ArcEscorts(sim.ctx);
    const run = [...sim.mir4ArcEscortRuns.values()][0]!;
    const ambushers = run.ambushIds.map((id) => sim.entities.get(id)!);
    expect(ambushers).toHaveLength(2);

    expect(mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, 'M02-Q02', 2)?.id).toBe(
      Math.min(...ambushers.map((ambusher) => ambusher.id)),
    );
    const higherId = ambushers.reduce((best, candidate) =>
      candidate.id > best.id ? candidate : best,
    );
    higherId.pos = sim.groundPos(sim.player.pos.x + 1, sim.player.pos.z);
    expect(mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, 'M02-Q02', 2)?.id).toBe(higherId.id);
    higherId.dead = true;
    expect(mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, 'M02-Q02', 2)?.id).not.toBe(
      higherId.id,
    );
  });

  it('scopes escortee, start and ambush selection to the exact quest stage', () => {
    const sim = makeEscortSim();
    const meta = sim.players.get(sim.playerId)!;
    const main = meta.mir4ArcQuests!['M02-Q02']!;
    const side = {
      questId: 'M01-R01',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active' as const,
      selectedStageIndexes: [2, 0],
    };
    meta.mir4ArcQuests!['M01-R01'] = side;
    const mainStage = mir4QuestCurrentStage(main)!;
    const sideStage = mir4QuestCurrentStage(side)!;
    const mainFirst = mir4ArcStageAnchor(main.questId, mainStage, 0)!;
    const sideFirst = mir4ArcStageAnchor(side.questId, sideStage, 0)!;

    sim.player.pos = sim.groundPos(sideFirst.x, sideFirst.z);
    updateMir4ArcEscorts(sim.ctx);
    sim.player.pos = sim.groundPos(mainFirst.x, mainFirst.z);
    updateMir4ArcEscorts(sim.ctx);
    const mainNpc = mir4ArcEscorteeForPlayer(sim.ctx, sim.playerId, main.questId, main.stageIndex)!;
    const sideNpc = mir4ArcEscorteeForPlayer(sim.ctx, sim.playerId, side.questId, side.stageIndex)!;
    expect(mainNpc.id).not.toBe(sideNpc.id);

    sim.player.pos = { ...mainNpc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player, main.questId, main.stageIndex)).toBe(true);
    expect(sim.mir4ArcEscortRuns.get(`${sim.playerId}:M02-Q02:2`)?.started).toBe(true);
    expect(sim.mir4ArcEscortRuns.get(`${sim.playerId}:M01-R01:0`)?.started).toBe(false);
    sim.player.pos = { ...sideNpc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player, side.questId, side.stageIndex)).toBe(true);

    mainNpc.pos = sim.groundPos(mainFirst.x, mainFirst.z);
    sideNpc.pos = sim.groundPos(sideFirst.x, sideFirst.z);
    updateMir4ArcEscorts(sim.ctx);
    const mainRun = sim.mir4ArcEscortRuns.get(`${sim.playerId}:M02-Q02:2`)!;
    const sideRun = sim.mir4ArcEscortRuns.get(`${sim.playerId}:M01-R01:0`)!;
    expect(mainRun.ambushIds).toHaveLength(2);
    expect(sideRun.ambushIds).toHaveLength(1);
    expect(
      mainRun.ambushIds.includes(
        mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, main.questId, main.stageIndex)!.id,
      ),
    ).toBe(true);
    expect(
      sideRun.ambushIds.includes(
        mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, side.questId, side.stageIndex)!.id,
      ),
    ).toBe(true);
  });

  it('times out and resets a stalled escort without granting progress', () => {
    const sim = makeSupplyEscortSim();
    const progress = sim.players.get(sim.playerId)!.mir4ArcQuests!['M01-R01']!;
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = [...sim.entities.values()].find((entity) =>
      entity.templateId.startsWith('mir4_escort_m01-r01_0'),
    )!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);
    progress.stageProgress = 2;

    sim.time += 301;
    updateMir4ArcEscorts(sim.ctx);

    expect(progress).toMatchObject({ stageIndex: 0, stageProgress: 0, state: 'active' });
    expect(sim.entities.has(npc.id)).toBe(false);
  });
});
