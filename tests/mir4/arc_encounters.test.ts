import { afterAll, describe, expect, it } from 'vitest';
import { isBlocked } from '../../src/sim/colliders';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_QUESTS_MAIN } from '../../src/sim/content/mir4/quests_arc';
import { setActiveWorldContent } from '../../src/sim/data';
import { updateMir4ArcDungeonEncounters } from '../../src/sim/mir4/arc_dungeons';
import {
  encounterTemplate,
  stageMobSource,
  updateMir4ArcEncounters,
} from '../../src/sim/mir4/arc_encounters';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import {
  type Mir4ArcQuestProgress,
  mir4ArcStageGoal,
  mir4CreditQuestKill,
  mir4QuestCurrentStage,
} from '../../src/sim/mir4/arc_quests';
import { MIR4_ARC_COMBAT_STAGE_KINDS } from '../../src/sim/mir4/arc_stage_kinds';
import { mir4WireRevision } from '../../src/sim/mir4/wire_revision';
import { resolveMobTemplate } from '../../src/sim/mob/template';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { WORLD_SEED } from '../../src/sim/world_seed';

function makeSim(seed = 853, maps = 3): Sim {
  const world = buildMir4ArcWorld(maps);
  setActiveWorldContent(world);
  return new Sim({
    seed,
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

const MAIN_COMBAT_KILL_CASES = MIR4_QUESTS_MAIN.flatMap((quest) =>
  quest.stages.flatMap((stage, stageIndex) => {
    if (!MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) return [];
    const goal = mir4ArcStageGoal(stage);
    return Array.from({ length: goal }, (_, attempt) => ({
      quest,
      stage,
      stageIndex,
      attempt,
      source: stageMobSource(stage, attempt)!,
    }));
  }),
);

describe('MIR4 campaign encounter materializer', () => {
  it('enumerates every authored Main combat kill receipt', () => {
    expect(
      new Set(
        MAIN_COMBAT_KILL_CASES.map(({ quest, stageIndex }) => `${quest.questId}:${stageIndex}`),
      ).size,
    ).toBe(113);
    expect(MAIN_COMBAT_KILL_CASES).toHaveLength(301);
  });

  it.each(MAIN_COMBAT_KILL_CASES)(
    'credits $quest.questId stage $stageIndex attempt $attempt from $source',
    ({ quest, stage, stageIndex, attempt, source }) => {
      const progress: Mir4ArcQuestProgress = {
        questId: quest.questId,
        stageIndex,
        stageProgress: attempt,
        state: 'active',
      };
      const template = encounterTemplate(quest.questId, stageIndex, attempt, source);
      expect(template).not.toBeNull();

      const result = mir4CreditQuestKill(progress, template!.id);

      const completesStage = attempt + 1 === mir4ArcStageGoal(stage);
      expect(result).toBe(
        completesStage
          ? stageIndex + 1 === quest.stages.length
            ? 'ready'
            : 'advanced'
          : 'progress',
      );
      expect(progress.stageIndex).toBe(completesStage ? stageIndex + 1 : stageIndex);
      expect(progress.stageProgress).toBe(completesStage ? 0 : attempt + 1);
    },
  );

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

  it('materializes Alfa da Muralha as a real threat during the M04 survival stage', () => {
    const sim = makeSim(40_403, 4);
    sim.setPlayerLevel(35);
    const progress: Mir4ArcQuestProgress = {
      questId: 'M04-Q03',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M04-Q03': progress };
    placeAtStage(sim, progress);

    updateMir4ArcEncounters(sim.ctx);

    const run = sim.mir4ArcEncounterRuns.get(`${sim.playerId}:M04-Q03:4`)!;
    const guardian = sim.entities.get(run.entityId)!;
    expect(guardian).toMatchObject({
      kind: 'mob',
      name: 'Alfa da Muralha',
      hostile: true,
      runScoped: true,
    });
    expect(guardian.templateId).toContain('m04-q03_4_0_alfa_da_muralha');
    expect(resolveMobTemplate(guardian.templateId, sim.mir4RuntimeMobTemplates)).toBe(
      sim.mir4RuntimeMobTemplates.get(guardian.templateId),
    );
    expect(progress).toMatchObject({ stageIndex: 4, stageProgress: 0 });

    const startingHp = sim.player.hp;
    for (let tick = 0; tick < 100; tick++) sim.tick();
    expect(guardian.aggroTargetId).toBe(sim.playerId);
    expect(sim.player.hp).toBeLessThan(startingHp);
  });

  it('requires a physical owner-only pickup for collect-quest-wallet kills', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q02',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M01-Q02': progress };
    placeAtStage(sim, progress);
    sim.tick();
    const runKey = `${sim.playerId}:M01-Q02:4`;
    const run = sim.mir4ArcEncounterRuns.get(runKey)!;
    const target = sim.entities.get(run.entityId)!;

    sim.dealDamage(sim.player, target, target.hp + 1, false, 'physical', null, 'hit');

    expect(progress).toMatchObject({ stageIndex: 4, stageProgress: 0 });
    const drop = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'object' &&
        entity.ownerId === sim.playerId &&
        entity.templateId.startsWith(`mir4_quest_drop_${sim.playerId}_m01-q02_4_0_`),
    );
    expect(drop).toMatchObject({
      lootable: true,
      objectItemId: 'mir4_object_supply_crate',
      pos: target.pos,
    });
    if (!drop) throw new Error('physical quest drop missing');

    updateMir4ArcEncounters(sim.ctx);
    expect(sim.mir4ArcEncounterRuns.has(runKey)).toBe(false);
    expect(
      [...sim.entities.values()].filter(
        (entity) => entity.kind === 'mob' && entity.templateId.includes('mir4_quest_m01-q02_4_'),
      ),
    ).toHaveLength(0);

    const intruderPid = sim.addPlayer('elementalist', 'Drop Intruder');
    sim.entities.get(intruderPid)!.pos = { ...drop.pos };
    expect(sim.pickUpObject(drop.id, intruderPid)).toBe(false);
    expect(progress.stageProgress).toBe(0);

    sim.player.pos = { ...drop.pos };
    sim.player.prevPos = { ...drop.pos };
    expect(sim.pickUpObject(drop.id)).toBe(true);
    expect(progress).toMatchObject({ stageIndex: 4, stageProgress: 0 });
    expect(sim.entities.has(drop.id)).toBe(true);
    expect(sim.player.castingAbility).toBe('gathering');
    sim.player.castRemaining = 0;
    sim.tick();
    expect(progress).toMatchObject({ stageIndex: 4, stageProgress: 1 });
    expect(sim.entities.has(drop.id)).toBe(false);

    placeAtStage(sim, progress);
    updateMir4ArcEncounters(sim.ctx);
    expect(sim.mir4ArcEncounterRuns.has(runKey)).toBe(true);
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

  it('keeps the M01-Q05 wave spawn at its collision-free authored defense site', () => {
    expect(WORLD_SEED).toBe(20061);
    const sim = makeSim(WORLD_SEED);
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q05',
      stageIndex: 3,
      stageProgress: 2,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M01-Q05': progress };
    placeAtStage(sim, progress);
    const stage = mir4QuestCurrentStage(progress)!;
    const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
    const authoredSpawn = { x: anchor.x + 8, z: anchor.z };

    expect(anchor).toEqual({ x: 2628.4852813742386, z: 183.48528137423858 });
    expect(authoredSpawn).toEqual({ x: 2636.4852813742386, z: 183.48528137423858 });
    expect(isBlocked(WORLD_SEED, authoredSpawn.x, authoredSpawn.z, PLAYER_BODY_RADIUS)).toBe(false);

    updateMir4ArcEncounters(sim.ctx);

    const run = sim.mir4ArcEncounterRuns.get(`${sim.playerId}:M01-Q05:3`)!;
    const guardian = sim.entities.get(run.entityId)!;
    expect(sim.mir4ArcEncounterRuns.size).toBe(1);
    expect(run).toMatchObject({
      ownerPid: sim.playerId,
      questId: 'M01-Q05',
      stageIndex: 3,
    });
    expect(guardian.templateId).toBe('mir4_quest_m01-q05_3_2_guarda_do_seixo');
    expect(
      [...sim.entities.values()].filter((entity) => entity.templateId === guardian.templateId),
    ).toHaveLength(1);
    expect(guardian.pos).toMatchObject(authoredSpawn);
    expect(guardian.spawnPos).toEqual(guardian.pos);
    expect(
      Math.hypot(guardian.pos.x - authoredSpawn.x, guardian.pos.z - authoredSpawn.z),
    ).toBeLessThan(1);
    expect(isBlocked(WORLD_SEED, guardian.pos.x, guardian.pos.z, PLAYER_BODY_RADIUS)).toBe(false);
  });

  it('credits every accented ritual guardian death before materializing the next focus', () => {
    const sim = makeSim();
    sim.setPlayerLevel(58);
    const progress: Mir4ArcQuestProgress = {
      questId: 'M06-Q05',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    sim.players.get(sim.playerId)!.mir4ArcQuests = { 'M06-Q05': progress };
    placeAtStage(sim, progress);

    for (let focus = 0; focus < 3; focus++) {
      sim.tick();
      const run = [...sim.mir4ArcEncounterRuns.values()][0]!;
      const guardian = sim.entities.get(run.entityId)!;
      expect(guardian.templateId).toContain(`_3_${focus}_acolito_carmesim`);
      sim.dealDamage(sim.player, guardian, guardian.hp + 1, false, 'physical', null, 'hit');
      if (focus < 2) expect(progress.stageProgress).toBe(focus + 1);
    }

    expect(progress).toMatchObject({ stageIndex: 4, stageProgress: 0, state: 'active' });
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
    expect(sim.players.get(sim.playerId)?.mir4DungeonTickets).toBeUndefined();
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

    const revisionBeforeAdmission = mir4WireRevision(sim.players.get(sim.playerId)!);
    updateMir4ArcDungeonEncounters(sim.ctx);
    expect(mir4WireRevision(sim.players.get(sim.playerId)!)).toBeGreaterThan(
      revisionBeforeAdmission,
    );
    expect(sim.players.get(sim.playerId)?.mir4DungeonTickets).toMatchObject({
      ticketType: 3,
      count: 1,
    });
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

  it('suspends Auto Journey and reports an exhausted repeatable-dungeon wallet once', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-R02',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active',
      selectedStageIndexes: [2, 0],
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M01-R02': progress };
    meta.mir4DungeonTickets = { ticketType: 3, count: 0, resetAtMs: 0 };
    meta.mir4AutoQuest = {
      questId: 'M01-R02',
      phase: 'to-site',
      siteIndex: 0,
      suspended: false,
    };
    placeAtStage(sim, progress);
    sim.drainEvents();

    updateMir4ArcDungeonEncounters(sim.ctx);

    expect(meta.mir4AutoQuest.suspended).toBe(true);
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'error')
        .map((event) => event.text),
    ).toEqual(['No MIR4 dungeon tickets remain. Daily reset: 05:00.']);
    expect(sim.mir4ArcDungeonRuns.size).toBe(0);
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
