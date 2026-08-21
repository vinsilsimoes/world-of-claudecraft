import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ArcStageAnchor, updateMir4ArcQuestTravel } from '../../src/sim/mir4/arc_quest_runtime';
import { mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
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

afterAll(() => setActiveWorldContent(null));

describe('MIR4 authoritative campaign host', () => {
  it('accepts at the exact native 3D NPC and credits travel only inside the authored anchor', () => {
    const sim = makeSim();
    const tarek = [...sim.entities.values()].find(
      (entity) => entity.templateId === 'mir4_tarek_duas_pontes',
    )!;
    sim.talkToNpc(tarek.id);
    const meta = sim.players.get(sim.playerId)!;
    const progress = meta.mir4ArcQuests?.['M01-Q01'];
    expect(progress).toBeDefined();
    if (!progress) throw new Error('M01-Q01 was not accepted');
    expect(progress).toMatchObject({ stageIndex: 1, stageProgress: 0, state: 'active' });
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
      (entity) => entity.templateId === 'mir4_tarek_duas_pontes',
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
      (entity) => entity.templateId === 'mir4_maela_do_vau',
    )!;
    sim.talkToNpc(maela.id);
    expect(meta.mir4ArcQuests['M01-Q02']).toBeDefined();
    expect(meta.mir4ArcRewards?.items?.['potion-minor-bound']).toBe(3);
  });

  it('reuses the shared Interact key and requires every authored 3D clue anchor', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q01': progress };
    const player = sim.entities.get(sim.playerId)!;
    sim.interact();
    expect(progress.stageProgress).toBe(0);
    for (let clue = 0; clue < 3; clue++) {
      const stage = mir4QuestCurrentStage(progress)!;
      const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
      player.pos.x = anchor.x;
      player.pos.z = anchor.z;
      player.prevPos = { ...player.pos };
      sim.interact();
    }
    expect(progress.stageIndex).toBe(3);
    expect(progress.stageProgress).toBe(0);
    expect(meta.counters.questProgress).toBe(3);
  });

  it('accepts optional contracts through the same native NPC without leaking later maps', () => {
    const sim = makeSim();
    const orin = [...sim.entities.values()].find(
      (entity) => entity.templateId === 'mir4_orin_sete_marcas',
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
