import { afterAll, describe, expect, it } from 'vitest';

import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
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
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';
import { Sim } from '../../src/sim/sim';
import { terrainHeight, waterLevelAt } from '../../src/sim/world';
import { WORLD_SEED } from '../../src/sim/world_seed';

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
  it('authors Caminho Seguro as a named escort along three distinct dry-road checkpoints', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    const quest = mir4ArcQuest('M02-Q02');
    if (!quest) throw new Error('M02-Q02 is required');
    const approach = quest.stages[1];
    const escort = quest.stages[2];
    const guardian = quest.stages[3];
    const evidence = quest.stages[4];
    if (!approach || !escort || !guardian || !evidence)
      throw new Error('Caminho Seguro stages are required');

    const approachAnchor = mir4ArcStageAnchor(
      quest.questId,
      approach,
      0,
      world.mir4ArcMapProjections,
    );
    const checkpoints = [0, 1, 2].map((index) =>
      mir4ArcStageAnchor(quest.questId, escort, index, world.mir4ArcMapProjections),
    );
    const guardianAnchor = mir4ArcStageAnchor(
      quest.questId,
      guardian,
      0,
      world.mir4ArcMapProjections,
    );
    const evidenceAnchor = mir4ArcStageAnchor(
      quest.questId,
      evidence,
      0,
      world.mir4ArcMapProjections,
    );

    expect(approachAnchor).toEqual({ x: -398, z: 292 });
    expect(checkpoints).toEqual([
      { x: -390, z: 300 },
      { x: -360, z: 324 },
      { x: -360, z: 362 },
    ]);
    expect(guardianAnchor).toEqual({ x: -360, z: 362 });
    expect(evidenceAnchor).toEqual({ x: -360, z: 362 });
    expect(approach.text).toContain('Ivo Juncofirme');
    expect(approach.text).toContain('margem seca');
    expect(escort.text).toContain('Ivo Juncofirme');
    expect(escort.text).toContain('estrada seca');
    expect(escort.text).not.toMatch(/escolha a rota|reparad/iu);
    expect(guardian.text).toContain('Posto das Duas Pontes');
    expect(evidence.text).toContain('cada parada da patrulha');
    const dialogue = quest.dialogue.map((line) => (typeof line === 'string' ? line : line.text));
    expect(dialogue).toHaveLength(3);
    expect(dialogue[0]).toContain('Ivo Juncofirme');
    expect(dialogue[1]).toContain('três pontos da emboscada');
    expect(dialogue[2]).toContain('Ivo chegou vivo');
    expect(quest.dialogue).toContainEqual(
      expect.objectContaining({ speaker: 'Neris da Centelha' }),
    );

    const route = [approachAnchor, ...checkpoints].filter(
      (point): point is { x: number; z: number } => point !== null,
    );
    for (let leg = 1; leg < route.length; leg += 1) {
      const from = route[leg - 1];
      const to = route[leg];
      if (!from || !to) throw new Error(`Caminho Seguro route leg ${leg} is incomplete`);
      expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(10);
      const samples = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) * 2);
      for (let sample = 0; sample <= samples; sample += 1) {
        const ratio = sample / samples;
        const x = from.x + (to.x - from.x) * ratio;
        const z = from.z + (to.z - from.z) * ratio;
        const water = waterLevelAt(x, z, WORLD_SEED);
        if (!Number.isFinite(water)) continue;
        expect(
          terrainHeight(x, z, WORLD_SEED),
          `dry escort route leg ${leg} at ${x.toFixed(2)},${z.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(water + 0.2);
      }
    }
  });

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
    expect(npc.name).toBe('Ivo Juncofirme');
    expect(sim.mir4RuntimeMobTemplates.get(npc.templateId)?.canSwim).toBe(false);
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
      expect(ambushers).toHaveLength(1);
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
    let previousNpcPosition = { ...npc.pos };
    for (let tick = 0; tick < 5_000 && progress.stageIndex === 2; tick++) {
      sim.player.pos = { ...npc.pos };
      updateMir4ArcEscorts(sim.ctx);
      expect(
        Math.hypot(npc.pos.x - previousNpcPosition.x, npc.pos.z - previousNpcPosition.z),
      ).toBeLessThan(1);
      previousNpcPosition = { ...npc.pos };
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

  it('navigates every projected checkpoint on the original WoC map without a straight-line wedge', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: WORLD_SEED,
      playerClass: 'warrior',
      playerClassMir4: 'elementalist',
      playerName: 'WoC Escort Tester',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    sim.setPlayerLevel(15);
    const progress = {
      questId: 'M02-Q02',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M02-Q02': progress };
    const stage = mir4QuestCurrentStage(progress)!;
    const first = mir4ArcStageAnchor(progress.questId, stage, 0, world.mir4ArcMapProjections)!;
    sim.player.pos = sim.groundPos(first.x, first.z);
    updateMir4ArcEscorts(sim.ctx);
    const npc = escortee(sim)!;
    sim.player.pos = { ...npc.pos };
    expect(tryStartMir4ArcEscort(sim.ctx, sim.player)).toBe(true);

    let guard = 0;
    while (progress.stageIndex === 2 && guard++ < 5_000) {
      const run = [...sim.mir4ArcEscortRuns.values()][0];
      const liveNpc = run?.npcId == null ? null : sim.entities.get(run.npcId);
      if (liveNpc) {
        const water = waterLevelAt(liveNpc.pos.x, liveNpc.pos.z, WORLD_SEED);
        if (Number.isFinite(water)) {
          expect(
            terrainHeight(liveNpc.pos.x, liveNpc.pos.z, WORLD_SEED),
            `escort entered water at ${liveNpc.pos.x.toFixed(2)},${liveNpc.pos.z.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(water + 0.2);
        }
        sim.player.pos = { ...liveNpc.pos };
      }
      for (const id of run?.ambushIds ?? []) {
        const ambusher = sim.entities.get(id);
        if (ambusher) ambusher.dead = true;
      }
      updateMir4ArcEscorts(sim.ctx);
    }

    const stalledRun = [...sim.mir4ArcEscortRuns.values()][0];
    const stalledNpc = stalledRun?.npcId == null ? null : sim.entities.get(stalledRun.npcId);
    expect(
      guard,
      JSON.stringify({
        checkpoint: stalledRun?.checkpoint,
        npc: stalledNpc ? { x: stalledNpc.pos.x, z: stalledNpc.pos.z } : null,
      }),
    ).toBeLessThan(5_000);
    expect(progress).toMatchObject({ stageIndex: 3, stageProgress: 0 });
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

  it('gives the player a reasonable reaction window before ambushers can kill the escortee', () => {
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
    updateMir4ArcEscorts(sim.ctx);
    expect([...sim.mir4ArcEscortRuns.values()][0]?.ambushIds).toHaveLength(1);

    for (let tick = 0; tick < 160; tick++) sim.tick();

    expect(npc.dead).toBe(false);
    expect(npc.hp).toBeGreaterThan(0);
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

  it('selects the living escort ambusher and rejects it after death', () => {
    const sim = makeEscortSim();
    sim.setPlayerLevel(21);
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
    expect(ambushers).toHaveLength(1);

    expect(mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, 'M02-Q02', 2)?.id).toBe(
      ambushers[0]!.id,
    );
    ambushers[0]!.dead = true;
    expect(mir4ArcEscortTargetForPlayer(sim.ctx, sim.playerId, 'M02-Q02', 2)).toBeNull();
  });

  it('scopes escortee, start and ambush selection to the exact quest stage', () => {
    const sim = makeEscortSim();
    sim.setPlayerLevel(21);
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
    expect(mainRun.ambushIds).toHaveLength(1);
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
