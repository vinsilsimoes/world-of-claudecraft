import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { updateMir4ArcDungeonEncounters } from '../../src/sim/mir4/arc_dungeons';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(): Sim {
  const world = buildMir4ArcWorld(3);
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

afterAll(() => setActiveWorldContent(null));

function placeAtStage(sim: Sim, progress: Mir4ArcQuestProgress): void {
  const stage = mir4QuestCurrentStage(progress)!;
  const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
  const player = sim.entities.get(sim.playerId)!;
  player.pos.x = anchor.x;
  player.pos.z = anchor.z;
  player.prevPos = { ...player.pos };
}

function placePlayerAtStage(sim: Sim, pid: number, progress: Mir4ArcQuestProgress): void {
  const stage = mir4QuestCurrentStage(progress)!;
  const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
  const player = sim.entities.get(pid)!;
  player.pos.x = anchor.x;
  player.pos.z = anchor.z;
  player.prevPos = { ...player.pos };
}

describe('MIR4 campaign encounter materializer', () => {
  it('spawns a native-family runtime target and credits its authoritative death', () => {
    const sim = makeSim();
    sim.setPlayerLevel(25);
    const progress: Mir4ArcQuestProgress = {
      questId: 'M03-Q04',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M03-Q04': progress };
    placeAtStage(sim, progress);
    sim.tick();
    const target = [...sim.entities.values()].find((entity) =>
      entity.templateId.startsWith('mir4_quest_m03-q04_3_0_owlbear_cub'),
    )!;
    expect(target).toMatchObject({ kind: 'mob', hostile: true, runScoped: true });
    expect(target.maxHp).toBeGreaterThan(0);
    sim.dealDamage(sim.player, target, target.hp + 1, false, 'physical', null, 'hit');
    expect(progress.stageProgress).toBe(1);
  });

  it('normalizes authored guardian names while keeping a native humanoid visual shell', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q06',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M01-Q06': progress };
    placeAtStage(sim, progress);
    sim.tick();
    const guardian = [...sim.entities.values()].find((entity) =>
      entity.templateId.endsWith('_alfa_do_vau'),
    )!;
    expect(guardian.name).toBe('Alfa do Vau');
    expect(guardian.mobBoss).toBe(true);
    expect(sim.mir4RuntimeMobTemplates.get(guardian.templateId)?.mir4BossDamageReductionBps).toBe(
      250,
    );
    sim.dealDamage(sim.player, guardian, guardian.hp + 1, false, 'physical', null, 'hit');
    expect(progress.stageIndex).toBe(5);
  });

  it('gates a short-dungeon boss behind three native seal guardians', () => {
    const sim = makeSim();
    sim.setPlayerLevel(32);
    const progress: Mir4ArcQuestProgress = {
      questId: 'M04-Q05',
      stageIndex: 5,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M04-Q05': progress };
    placeAtStage(sim, progress);
    updateMir4ArcDungeonEncounters(sim.ctx);
    const guards = [...sim.entities.values()].filter((entity) =>
      entity.templateId.startsWith('mir4_dungeon_guard_m04-q05_5_'),
    );
    expect(guards).toHaveLength(3);
    expect(guards.every((entity) => entity.hostile && entity.runScoped)).toBe(true);
    expect(guards.every((entity) => !entity.mobBoss)).toBe(true);
    expect(
      [...sim.entities.values()].some((entity) =>
        entity.templateId.endsWith('_campaign_dungeon_m04_root_crypt_v1'),
      ),
    ).toBe(false);
    for (const guard of guards) {
      sim.dealDamage(sim.player, guard, guard.hp + 1, false, 'physical', null, 'hit');
    }
    expect(progress.stageIndex).toBe(5);
    updateMir4ArcDungeonEncounters(sim.ctx);
    const boss = [...sim.entities.values()].find((entity) =>
      entity.templateId.endsWith('_campaign_dungeon_m04_root_crypt_v1'),
    )!;
    expect(boss).toMatchObject({ hostile: true, runScoped: true, mobBoss: true });
    expect(sim.mir4RuntimeMobTemplates.get(boss.templateId)?.mir4BossDamageReductionBps).toBe(500);
    expect(boss.maxHp).toBeGreaterThan(guards[0]!.maxHp);
    sim.dealDamage(sim.player, boss, boss.hp + 1, false, 'physical', null, 'hit');
    expect(progress.stageIndex).toBe(6);
  });

  it('keeps simultaneous player encounter runs independent', () => {
    const sim = makeSim();
    const secondPid = sim.addPlayer('warrior', 'Second Hunter');
    const firstProgress: Mir4ArcQuestProgress = {
      questId: 'M04-Q05',
      stageIndex: 5,
      stageProgress: 0,
      state: 'active',
    };
    const secondProgress: Mir4ArcQuestProgress = { ...firstProgress };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M04-Q05': firstProgress };
    sim.players.get(secondPid)!.mir4ArcQuests = { 'M04-Q05': secondProgress };
    placePlayerAtStage(sim, sim.playerId, firstProgress);
    placePlayerAtStage(sim, secondPid, secondProgress);

    updateMir4ArcDungeonEncounters(sim.ctx);

    const guards = [...sim.entities.values()].filter((entity) =>
      entity.templateId.startsWith('mir4_dungeon_guard_m04-q05_5_'),
    );
    expect(guards).toHaveLength(6);
    expect(guards.filter((guard) => guard.aggroTargetId === sim.playerId)).toHaveLength(3);
    expect(guards.filter((guard) => guard.aggroTargetId === secondPid)).toHaveLength(3);
  });

  it('resolves the repeatable dungeon-or-public-event stage through its native dungeon arm', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-R02',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active',
      selectedStageIndexes: [2, 0],
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M01-R02': progress };
    placeAtStage(sim, progress);

    updateMir4ArcDungeonEncounters(sim.ctx);
    const guards = [...sim.entities.values()].filter((entity) =>
      entity.templateId.startsWith('mir4_dungeon_guard_m01-r02_0_'),
    );
    expect(guards).toHaveLength(3);
    for (const guard of guards) {
      sim.dealDamage(sim.player, guard, guard.hp + 1, false, 'physical', null, 'hit');
    }
    updateMir4ArcDungeonEncounters(sim.ctx);
    const boss = [...sim.entities.values()].find((entity) =>
      entity.templateId.startsWith('mir4_quest_m01-r02_0_0_'),
    )!;
    expect(boss).toMatchObject({ hostile: true, runScoped: true });
    sim.dealDamage(sim.player, boss, boss.hp + 1, false, 'physical', null, 'hit');

    expect(progress).toMatchObject({ stageIndex: 1, stageProgress: 0, state: 'active' });
    expect(mir4QuestCurrentStage(progress)?.kind).toBe('inspect-and-resolve-elite');
  });

  it('drops encounter entities and dynamic templates when their owner leaves the stage', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M03-Q04',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M03-Q04': progress };
    placeAtStage(sim, progress);
    sim.tick();
    expect(sim.mir4ArcEncounterRuns.size).toBe(1);
    expect(sim.mir4RuntimeMobTemplates.size).toBe(1);

    progress.state = 'done';
    sim.tick();

    expect(sim.mir4ArcEncounterRuns.size).toBe(0);
    expect(sim.mir4RuntimeMobTemplates.size).toBe(0);
  });
});
