import { afterAll, describe, expect, it } from 'vitest';
import {
  MIR4_QUESTS_ARC,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  mir4ArcStageAnchor,
  updateMir4ArcObjectiveEntities,
  updateMir4ArcQuestTravel,
} from '../../src/sim/mir4/arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { MIR4_ARC_INTERACT_STAGE_KINDS } from '../../src/sim/mir4/arc_stage_kinds';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(): Sim {
  const world = buildMir4ArcWorld(3);
  setActiveWorldContent(world);
  return new Sim({
    seed: 839,
    playerClass: 'warrior',
    playerName: 'Journey',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

function completeQuestObjectCast(sim: Sim): void {
  expect(sim.player.castingAbility).toBe('gathering');
  sim.player.castRemaining = 0;
  sim.tick();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 authoritative campaign host', () => {
  it('accepts at the exact native 3D NPC and credits travel only inside the authored anchor', () => {
    const sim = makeSim();
    const tarek = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(mir4ArcQuest('M01-Q01')!.giverNpcId),
    )!;
    sim.talkToNpc(tarek.id);
    const meta = sim.players.get(sim.playerId)!;
    const progress = meta.mir4ArcQuests?.['M01-Q01'];
    expect(progress).toBeDefined();
    if (!progress) throw new Error('M01-Q01 was not accepted');
    expect(progress).toMatchObject({
      stageIndex: 1,
      stageProgress: 0,
      state: 'active',
    });
    expect(meta.counters.questProgress).toBe(1);

    sim.tick();
    expect(progress.stageIndex).toBe(1);
    const stage = mir4QuestCurrentStage(progress)!;
    const anchor = mir4ArcStageAnchor(progress.questId, stage)!;
    const player = sim.entities.get(sim.playerId)!;
    player.pos.x = anchor.x;
    player.pos.z = anchor.z;
    player.prevPos = { ...player.pos };
    sim.tick();
    expect(progress.stageIndex).toBe(2);
    expect(meta.counters.questProgress).toBe(2);
  });

  it('turns in an evidence-ready quest once and persists the exact reward', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 6,
        stageProgress: 0,
        state: 'active',
      },
    };
    const tarek = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(mir4ArcQuest('M01-Q01')!.turnInNpcId),
    )!;
    const copperBefore = meta.copper;
    const completedBefore = meta.counters.questsCompleted;
    sim.talkToNpc(tarek.id);
    expect(meta.mir4ArcQuests['M01-Q01']?.state).toBe('done');
    expect(meta.copper - copperBefore).toBe(200);
    expect(meta.counters.questsCompleted - completedBefore).toBe(1);
    const paid = JSON.stringify(meta.mir4ArcRewards?.items);
    sim.talkToNpc(tarek.id);
    expect(JSON.stringify(meta.mir4ArcRewards?.items)).toBe(paid);
    expect(meta.counters.questsCompleted - completedBefore).toBe(1);
    const maela = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(mir4ArcQuest('M01-Q02')!.giverNpcId),
    )!;
    sim.talkToNpc(maela.id);
    expect(meta.mir4ArcQuests['M01-Q02']).toBeDefined();
    expect(meta.mir4ArcRewards?.items?.['potion-minor-bound']).toBe(3);
  });

  it('reuses the shared Interact key and requires every authored 3D clue anchor', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active',
    };
    meta.mir4ArcQuests = { 'M01-Q01': progress };
    const player = sim.entities.get(sim.playerId)!;
    sim.interact();
    expect(progress.stageProgress).toBe(0);
    for (let clue = 0; clue < 3; clue++) {
      const stage = mir4QuestCurrentStage(progress)!;
      const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
      updateMir4ArcObjectiveEntities(sim.ctx);
      const objective = [...sim.entities.values()].find(
        (entity) =>
          entity.kind === 'object' &&
          entity.templateId.startsWith(`mir4_objective_${sim.playerId}_m01-q01_2_${clue}_`),
      );
      expect(objective).toMatchObject({
        kind: 'object',
        objectItemId: 'mir4_object_clue_magnifier',
        lootable: true,
        ownerId: sim.playerId,
      });
      expect(objective?.pos).toMatchObject(anchor);
      player.pos.x = anchor.x;
      player.pos.z = anchor.z;
      player.prevPos = { ...player.pos };
      sim.interact();
      completeQuestObjectCast(sim);
      expect(sim.entities.has(objective!.id)).toBe(false);
    }
    expect(progress.stageIndex).toBe(3);
    expect(progress.stageProgress).toBe(0);
    expect(meta.counters.questProgress).toBe(3);
  });

  it('routes exact-object pickup through quest evidence and rejects another player', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q01': progress };
    updateMir4ArcObjectiveEntities(sim.ctx);
    const objective = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'object' && entity.templateId.startsWith(`mir4_objective_${sim.playerId}_`),
    )!;
    sim.player.pos = { ...objective.pos };
    sim.player.prevPos = { ...objective.pos };

    sim.player.pos.x += 100;
    expect(sim.pickUpObject(objective.id, sim.playerId)).toBe(false);
    expect(progress.stageProgress).toBe(0);
    expect(sim.entities.has(objective.id)).toBe(true);
    sim.player.pos = { ...objective.pos };

    objective.lootable = false;
    expect(sim.pickUpObject(objective.id, sim.playerId)).toBe(false);
    expect(progress.stageProgress).toBe(0);
    objective.lootable = true;

    const intruderPid = sim.addPlayer('elementalist', 'Intruder');
    const intruder = sim.entities.get(intruderPid)!;
    intruder.pos = { ...objective.pos };
    intruder.prevPos = { ...objective.pos };

    expect(sim.pickUpObject(objective.id, intruderPid)).toBe(false);
    expect(progress.stageProgress).toBe(0);
    expect(sim.entities.has(objective.id)).toBe(true);
    expect(sim.countItem(objective.objectItemId!, intruderPid)).toBe(0);

    expect(sim.pickUpObject(objective.id, sim.playerId)).toBe(true);
    completeQuestObjectCast(sim);
    expect(progress.stageProgress).toBe(1);
    expect(sim.entities.has(objective.id)).toBe(false);
    expect(sim.countItem(objective.objectItemId!, sim.playerId)).toBe(0);
  });

  it('keeps one current objective and cleans stale lifecycle entities', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active',
    };
    meta.mir4ArcQuests = { 'M01-Q01': progress };

    updateMir4ArcObjectiveEntities(sim.ctx);
    updateMir4ArcObjectiveEntities(sim.ctx);
    const objectives = () =>
      [...sim.entities.values()].filter((entity) =>
        entity.templateId.startsWith(`mir4_objective_${sim.playerId}_`),
      );
    expect(objectives()).toHaveLength(1);
    const firstId = objectives()[0]!.id;

    progress.stageProgress = 1;
    updateMir4ArcObjectiveEntities(sim.ctx);
    expect(objectives()).toHaveLength(1);
    expect(objectives()[0]!.id).not.toBe(firstId);

    progress.state = 'done';
    updateMir4ArcObjectiveEntities(sim.ctx);
    expect(objectives()).toHaveLength(0);
    updateMir4ArcObjectiveEntities(sim.ctx);
    expect(objectives()).toHaveLength(0);
  });

  it('materializes and advances every one of the 14 physical interaction verbs', () => {
    for (const stageKind of MIR4_ARC_INTERACT_STAGE_KINDS) {
      const quest = MIR4_QUESTS_ARC.find((candidate) =>
        candidate.stages.some((stage) => stage.kind === stageKind),
      );
      expect(quest, stageKind).toBeDefined();
      if (!quest) continue;
      const stageIndex = quest.stages.findIndex((stage) => stage.kind === stageKind);
      const sim = makeSim();
      const meta = sim.players.get(sim.playerId)!;
      const progress = {
        questId: quest.questId,
        stageIndex,
        stageProgress: 0,
        state: 'active' as const,
      };
      meta.mir4ArcQuests = { [quest.questId]: progress };

      updateMir4ArcObjectiveEntities(sim.ctx);
      const objective = [...sim.entities.values()].find(
        (entity) =>
          entity.kind === 'object' &&
          entity.ownerId === sim.playerId &&
          entity.templateId.startsWith(`mir4_objective_${sim.playerId}_`),
      );
      expect(objective, stageKind).toBeDefined();
      if (!objective) continue;
      sim.player.pos = { ...objective.pos };
      sim.player.prevPos = { ...objective.pos };

      expect(sim.pickUpObject(objective.id), stageKind).toBe(true);
      completeQuestObjectCast(sim);
      expect(progress.stageIndex > stageIndex || progress.stageProgress > 0, stageKind).toBe(true);
      expect(sim.entities.has(objective.id), stageKind).toBe(false);
      expect(sim.countItem(objective.objectItemId!, sim.playerId), stageKind).toBe(0);
      const stage = quest.stages[stageIndex];
      const target = Array.isArray(stage?.target) ? stage?.target[0] : stage?.target;
      if (stageKind === 'gather-resource-patches' && typeof target === 'string') {
        expect(meta.mir4ArcRewards?.items?.[target], stageKind).toBe(1);
      }
    }
  });

  it('does not let manual Interact bypass a system tutorial receipt', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q02',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q02': progress };
    const stage = mir4QuestCurrentStage(progress)!;
    const anchor = mir4ArcStageAnchor(progress.questId, stage)!;
    sim.player.pos.x = anchor.x;
    sim.player.pos.z = anchor.z;
    sim.player.prevPos = { ...sim.player.pos };

    sim.interact();

    expect(progress.stageIndex).toBe(3);
    expect(progress.stageProgress).toBe(0);
  });

  it('repairs an existing M01-Q03 save by granting the recovered weapon at its tutorial', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q03': {
        questId: 'M01-Q03',
        stageIndex: 3,
        stageProgress: 0,
        state: 'active',
      },
    };

    updateMir4ArcQuestTravel(sim.ctx);
    updateMir4ArcQuestTravel(sim.ctx);

    expect(meta.mir4ArcRewards?.items?.['991010101']).toBe(1);
  });

  it('accepts the next main quest below its recommended level', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(7);
    meta.mir4ArcQuests = Object.fromEntries(
      ['M01-Q01', 'M01-Q02', 'M01-Q03', 'M01-Q04'].map((questId) => [
        questId,
        { questId, stageIndex: 7, stageProgress: 0, state: 'done' as const },
      ]),
    );
    const q05 = mir4ArcQuest('M01-Q05')!;
    const giver = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(q05.giverNpcId),
    )!;

    sim.talkToNpc(giver.id);

    expect(meta.mir4ArcQuests['M01-Q05']).toMatchObject({
      questId: 'M01-Q05',
      stageIndex: 1,
      state: 'active',
    });
  });

  it('accepts optional contracts through the same native NPC without leaking later maps', () => {
    const sim = makeSim();
    const orin = [...sim.entities.values()].find(
      (entity) => entity.templateId === mir4ArcNpcTemplateId(mir4ArcQuest('M01-S01')!.giverNpcId),
    )!;
    sim.talkToNpc(orin.id);
    const quests = sim.players.get(sim.playerId)!.mir4ArcQuests!;
    expect(quests['M01-S01']).toBeDefined();
    expect(quests['M02-S01']).toBeUndefined();
    expect(quests['M04-P01']).toBeUndefined();
  });

  it('credits survival once per authoritative second and pauses outside the anchor', () => {
    const sim = makeSim();
    const progress = {
      questId: 'M02-Q05',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active' as const,
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M02-Q05': progress };
    const stage = mir4QuestCurrentStage(progress)!;
    const anchor = mir4ArcStageAnchor(progress.questId, stage)!;
    sim.player.pos.x = anchor.x;
    sim.player.pos.z = anchor.z;
    sim.time = 0;
    updateMir4ArcQuestTravel(sim.ctx);
    sim.time = 1;
    updateMir4ArcQuestTravel(sim.ctx);
    expect(progress.stageProgress).toBe(1);
    sim.player.pos.x += 100;
    sim.time = 20;
    updateMir4ArcQuestTravel(sim.ctx);
    expect(progress.stageProgress).toBe(1);
    sim.player.pos.x = anchor.x;
    for (let second = 21; second <= 110; second++) {
      sim.time = second;
      updateMir4ArcQuestTravel(sim.ctx);
    }
    expect(progress.stageIndex).toBe(4);
  });

  it('reuses the native WoC noticeboard for deterministic daily repeatable contracts', () => {
    const sim = makeSim();
    sim.utcDay = '2026-08-20';
    const board = sim.noticeboardDefinitions[0]!;
    const ground = sim.groundPos(board.x, board.z);
    sim.player.pos = { ...ground };
    sim.player.prevPos = { ...ground };
    expect(sim.pickUpObject(board.entityId)).toBe(true);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'noticeboard',
        contractQuestId: 'M01-R01',
      }),
    );
    const meta = sim.players.get(sim.playerId)!;
    const progress = meta.mir4ArcQuests?.['M01-R01'];
    expect(progress).toBeDefined();
    if (!progress) throw new Error('M01-R01 was not accepted');
    expect(progress.selectedStageIndexes).toHaveLength(2);
    expect(new Set(progress.selectedStageIndexes).size).toBe(2);

    progress.stageIndex = 2;
    progress.stageProgress = 0;
    progress.state = 'ready';
    const copperBefore = meta.copper;
    expect(sim.pickUpObject(board.entityId)).toBe(true);
    expect(progress.state).toBe('done');
    expect(progress.completedDay).toBe('2026-08-20');
    expect(meta.copper - copperBefore).toBe(400);
    expect(meta.mir4ArcRewards?.items?.['regional-craft-cache-m01']).toBe(1);

    sim.utcDay = '2026-08-21';
    expect(sim.pickUpObject(board.entityId)).toBe(true);
    expect(meta.mir4ArcQuests?.['M01-R01']?.state).toBe('active');
    expect(meta.mir4ArcQuests?.['M01-R01']?.completedDay).toBeUndefined();
  });
});
