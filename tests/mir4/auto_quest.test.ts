import { afterAll, describe, expect, it } from 'vitest';
import { updateMir4AutoQuest } from '../../src/sim/auto_quest/core';
import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld, mir4ArcBands } from '../../src/sim/content/mir4/arc_world';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4ArcStageAnchor } from '../../src/sim/mir4/arc_quest_runtime';
import { creditMir4ArcTutorialReceipt } from '../../src/sim/mir4/arc_receipts';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { advanceMir4Experience } from '../../src/sim/mir4/stats';
import { MIR4_ARC_PORTALS } from '../../src/sim/mir4/travel';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS, RUN_SPEED } from '../../src/sim/types';
import { WORLD_SEED } from '../../src/sim/world_seed';

// The auto-quest journey: one click, and the sim walks the whole M01-Q01
// loop by itself (giver -> accept -> sites -> inspect -> giver -> turn in),
// pausing for manual input like the auto battle.

function makeSim(seed = 21): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function teleport(sim: Sim, x: number, z: number): void {
  const p = sim.entities.get(sim.playerId) as Entity;
  const grounded = sim.groundPos(x, z);
  p.pos.x = grounded.x;
  p.pos.y = grounded.y;
  p.pos.z = grounded.z;
}

function spawnQuestTestWolf(sim: Sim, x: number, z: number): Entity {
  const wolf = createMob(sim.nextId++, MIR4_MOBS.mir4_forest_wolf as never, 1, sim.groundPos(x, z));
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 auto-quest journey', () => {
  it('runs the whole Primeiros Rastros loop unattended', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    // Start from the far side of the hunting grounds so every leg walks.
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest?.phase).toBe('to-giver');

    let guard = 0;
    while (meta.mir4AutoQuest && guard++ < 4000) sim.tick();

    expect(guard).toBeLessThan(4000); // it finished, it did not stall
    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('done');
    expect(meta.counters.questProgress).toBe(3);
    expect(meta.counters.questsCompleted).toBe(1);
    // The authored quest reward is deterministic; the transient target used
    // by this journey does not have a five-copper loot grant.
    expect(meta.copper).toBe(200);
    const expected = advanceMir4Experience(1, 0, 1432);
    expect(sim.entities.get(sim.playerId)!.level).toBe(expected.level);
  });

  it('suspends on manual input and resumes, like the auto battle', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(22);
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    meta.moveInput.forward = true;
    sim.tick();
    expect(meta.mir4AutoQuest?.suspended).toBe(true);
    const xWhileHeld = sim.entities.get(sim.playerId)!.pos.x;
    sim.tick();
    expect(sim.entities.get(sim.playerId)!.pos.x).toBe(xWhileHeld); // frozen
    meta.moveInput.forward = false;
    sim.tick();
    expect(meta.mir4AutoQuest?.suspended).toBe(false);
  });

  it('resumes Journey and Battle with exactly one locomotion owner', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 221,
      playerClass: 'warrior',
      playerName: 'SingleMotionOwner',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q02',
      stageIndex: 1,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q02': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 1,
      suspended: true,
    };
    sim.setMir4AutoBattle(true);
    meta.autoBattle!.suspended = true;
    spawnQuestTestWolf(sim, sim.player.pos.x + 8, sim.player.pos.z);
    const originalMoveToward = sim.ctx.moveToward;
    let playerMoves = 0;
    sim.ctx.moveToward = (entity, destination, speed, ignoreObstacles) => {
      if (entity.id === sim.playerId) playerMoves++;
      return originalMoveToward(entity, destination, speed, ignoreObstacles);
    };

    sim.tick();

    expect(meta.mir4AutoQuest?.suspended).toBe(false);
    expect(meta.autoBattle?.suspended).toBe(false);
    expect(playerMoves).toBe(1);
  });

  it('approaches a covered quest target and retaliates without enabling Auto Battle', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 880,
      playerClass: 'warrior',
      playerName: 'CoveredJourneyTarget',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q03',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q03': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q03',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    // The authored village inn blocks direct sight across this short approach.
    teleport(sim, 2605, -4);
    const target = spawnQuestTestWolf(sim, 2631, -4);
    target.maxHp = 5000;
    target.hp = target.maxHp;
    target.moveSpeed = 0;
    target.wanderTimer = 999999;
    const key = `${sim.playerId}:M01-Q03:4`;
    sim.mir4ArcEncounterRuns.set(key, {
      key,
      ownerPid: sim.playerId,
      questId: 'M01-Q03',
      stageIndex: 4,
      entityId: target.id,
    });
    expect(sim.ctx.hasLineOfSight(sim.player, target)).toBe(false);
    const before = { ...sim.player.pos };
    const originalMoveToward = sim.ctx.moveToward;
    let playerMoves = 0;
    sim.ctx.moveToward = (entity, destination, speed, ignoreObstacles) => {
      if (entity.id === sim.playerId) playerMoves++;
      return originalMoveToward(entity, destination, speed, ignoreObstacles);
    };

    sim.tick();

    expect(playerMoves).toBe(1);
    expect(Math.hypot(sim.player.pos.x - before.x, sim.player.pos.z - before.z)).toBeGreaterThan(0);
    expect(target.hp).toBe(target.maxHp);
    for (let tick = 0; tick < 400; tick++) sim.tick();
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(meta.mir4TargetCombat?.targetId).toBe(target.id);

    sim.setMir4AutoBattle(true);
    let guard = 0;
    while (target.hp === target.maxHp && guard++ < 400) sim.tick();
    expect(guard).toBeLessThan(400);
    expect(target.hp).toBeLessThan(target.maxHp);
  });

  it('clears the seeded M01-Q05 defense wave at its authored regional site', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 20061,
      playerClass: 'warrior',
      playerName: 'Q05CoveredDefense',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q05',
      stageIndex: 3,
      stageProgress: 2,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q05': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q05',
      phase: 'to-site',
      siteIndex: 3,
      suspended: false,
    };
    const stage = mir4ArcQuest('M01-Q05')!.stages[3]!;
    const anchor = mir4ArcStageAnchor('M01-Q05', stage, progress.stageProgress)!;
    teleport(sim, anchor.x, anchor.z - 5);

    sim.tick();

    const run = sim.mir4ArcEncounterRuns.get(`${sim.playerId}:M01-Q05:3`);
    const target = run ? sim.entities.get(run.entityId) : undefined;
    expect(target?.templateId).toBe('mir4_quest_m01-q05_3_2_moss_skeleton');
    expect(target?.hp).toBe(target?.maxHp);
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');
    sim.setMir4AutoBattle(true);
    let guard = 1;
    while (progress.stageIndex === 3 && guard++ < 200) sim.tick();

    expect(guard).toBeLessThan(200);
    expect(progress.stageIndex).toBe(4);
  });

  it.each(['stun', 'root', 'incapacitate'] as const)(
    'does not let Auto Journey move while the player is under %s control',
    (kind) => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(222);
      teleport(sim, -30, 18);
      sim.setMir4AutoQuest(true);
      sim.player.auras.push({
        id: `test_journey_${kind}`,
        name: 'Test journey control',
        kind,
        remaining: 2,
        duration: 2,
        value: 0,
        sourceId: 999,
        school: 'physical',
      });
      const before = { ...sim.player.pos };

      sim.tick();

      expect(sim.player.pos.x).toBe(before.x);
      expect(sim.player.pos.z).toBe(before.z);
    },
  );

  it('lets a rooted player accept an in-range quest without allowing movement', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(2222);
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, 1.5, -10);
    sim.setMir4AutoQuest(true);
    sim.player.auras.push({
      id: 'test_journey_interact_root',
      name: 'Test journey interaction root',
      kind: 'root',
      remaining: 2,
      duration: 2,
      value: 0,
      sourceId: 999,
      school: 'physical',
    });
    const before = { ...sim.player.pos };

    sim.tick();

    expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('active');
    expect(sim.player.pos.x).toBe(before.x);
    expect(sim.player.pos.z).toBe(before.z);
  });

  it('does not age or replace a journey route while root forbids movement', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(2223);
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    sim.player.auras.push({
      id: 'long_journey_root',
      name: 'Long Journey Root',
      kind: 'root',
      remaining: 10,
      duration: 10,
      value: 0,
      sourceId: 999,
      school: 'physical',
    });
    const before = { ...sim.player.pos };

    for (let tick = 0; tick < 50; tick += 1) updateMir4AutoQuest(sim.ctx);

    expect(meta.mir4AutoQuest?.route).toBeUndefined();
    expect(sim.player.pos.x).toBe(before.x);
    expect(sim.player.pos.z).toBe(before.z);
  });

  it.each(['stun', 'incapacitate'] as const)(
    'does not accept an in-range quest while the player is under %s control',
    (kind) => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(2221);
      const meta = sim.players.get(sim.playerId)!;
      teleport(sim, 1.5, -10);
      sim.setMir4AutoQuest(true);
      sim.player.auras.push({
        id: `test_journey_interact_${kind}`,
        name: 'Test journey interaction control',
        kind,
        remaining: 2,
        duration: 2,
        value: 0,
        sourceId: 999,
        school: 'physical',
      });

      sim.tick();

      expect(meta.mir4Quests?.mir4_m01_q01).toBeUndefined();
      expect(meta.mir4AutoQuest?.phase).toBe('to-giver');
      expect(meta.counters.questProgress).toBe(0);

      sim.player.auras = [];
      sim.tick();
      expect(meta.mir4Quests?.mir4_m01_q01?.state).toBe('active');
      expect(meta.mir4AutoQuest?.phase).toBe('to-site');
    },
  );

  it('shares the MIR4 hard-control gate even when no classic aura is mirrored', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(223);
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'test_journey_freeze',
        kind: 'freeze',
        durationSeconds: 2,
        name: 'Test journey freeze',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
    sim.player.auras = sim.player.auras.filter((aura) => aura.id !== 'test_journey_freeze');
    expect(sim.player.auras.some((aura) => aura.kind === 'stun')).toBe(false);
    const before = { ...sim.player.pos };

    sim.tick();

    expect(sim.player.pos.x).toBe(before.x);
    expect(sim.player.pos.z).toBe(before.z);
  });

  it('applies the live movement-speed multiplier while Auto Journey is slowed', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(224);
    teleport(sim, -30, 18);
    sim.setMir4AutoQuest(true);
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'test_journey_slow',
        kind: 'slow',
        durationSeconds: 2,
        magnitude: 0.35,
        name: 'Test journey slow',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'test_journey_slow_second',
        kind: 'slow',
        durationSeconds: 2,
        magnitude: 0.3,
        name: 'Test second journey slow',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
    const originalMoveToward = sim.ctx.moveToward;
    let committedSpeed: number | undefined;
    sim.ctx.moveToward = (entity, destination, speed, ignoreObstacles) => {
      if (entity.id === sim.playerId) committedSpeed = speed;
      return originalMoveToward(entity, destination, speed, ignoreObstacles);
    };

    sim.tick();

    expect(committedSpeed).toBeCloseTo(RUN_SPEED * 0.65 * 0.7, 10);
  });

  it('the status line tracks the journey for the HUD poll', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(23);
    expect(sim.mir4QuestStatusText()).toBe('Auto quest off');
    sim.setMir4AutoQuest(true);
    expect(sim.mir4QuestStatusText()).toContain('walking to Tarek');
  });

  it('selects the canonical campaign quest regardless of restored JSON key order', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 25,
      playerClass: 'warrior',
      playerName: 'Ordered',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 1,
        stageProgress: 0,
        state: 'active',
      },
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 1,
        stageProgress: 0,
        state: 'active',
      },
    };

    sim.setMir4AutoQuest(true);

    expect(meta.mir4AutoQuest?.questId).toBe('M01-Q01');
  });

  it('continues the main campaign before active repeatable contracts', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 251,
      playerClass: 'warrior',
      playerName: 'CampaignFirst',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(5);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 3,
        stageProgress: 1,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 3,
        stageProgress: 1,
        state: 'done',
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
      },
      'M01-R02': {
        questId: 'M01-R02',
        stageIndex: 1,
        stageProgress: 0,
        state: 'active',
      },
    };

    sim.setMir4AutoQuest(true);

    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q03',
      phase: 'to-giver',
    });
  });

  it('keeps an explicitly selected side quest focused while a main quest is active', () => {
    const world = buildMir4ArcWorld(8);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 252,
      playerClass: 'warrior',
      playerName: 'SideFocus',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    sim.setPlayerLevel(72);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M08-Q04': {
        questId: 'M08-Q04',
        stageIndex: 2,
        stageProgress: 0,
        state: 'active',
      },
      'M08-S01': {
        questId: 'M08-S01',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
      },
    };

    sim.setMir4AutoQuest(true, 'M08-S01');
    sim.tick();

    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M08-S01',
      phase: 'to-site',
      manualSelection: true,
    });
  });

  it('heals a persisted future main journey back to the true next campaign quest', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2515,
      playerClass: 'warrior',
      playerName: 'StaleFutureMain',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Stale-future player metadata missing');
    sim.setPlayerLevel(5);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q03',
      phase: 'to-giver',
      siteIndex: 0,
      suspended: false,
    };

    sim.tick();
    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q02',
      phase: 'to-giver',
    });

    let guard = 0;
    while ((meta.mir4ArcQuests['M01-Q02']?.stageIndex ?? -1) < 1 && guard++ < 4000) sim.tick();

    expect(guard).toBeLessThan(4000);
    expect(meta.mir4ArcQuests['M01-Q02']).toMatchObject({
      questId: 'M01-Q02',
      stageIndex: 1,
      state: 'active',
    });
  });

  it('returns from the M02 hub to the authored M01 giver before accepting M01-Q03', () => {
    const world = { ...buildMir4ArcWorld(2), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2514,
      playerClass: 'warrior',
      playerName: 'WrongBandGiver',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(5);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
    };
    // Live repro: the player was stranded beside the duplicate M02 campaign
    // NPCs while M01-Q03 still required Ilyra in the M01 band.
    const bands = mir4ArcBands();
    teleport(sim, bands[1]!.hub.x, bands[1]!.hub.z);
    sim.setMir4AutoQuest(true);
    const authoredGiver = world.npcs[mir4ArcQuest('M01-Q03')!.giverNpcId];
    if (!authoredGiver) throw new Error('M01-Q03 authored giver missing');

    sim.tick();
    expect(meta.mir4AutoQuest?.route).toMatchObject({
      goalX: MIR4_ARC_PORTALS[0]!.b.x,
      goalZ: MIR4_ARC_PORTALS[0]!.b.z,
    });

    let guard = 1;
    while (!meta.mir4ArcQuests['M01-Q03'] && guard++ < 4000) sim.tick();

    expect(guard).toBeLessThan(4000);
    expect(meta.mir4ArcQuests['M01-Q03']).toMatchObject({
      questId: 'M01-Q03',
      stageIndex: 1,
      state: 'active',
    });
    expect(sim.player.pos.x).toBeGreaterThanOrEqual(bands[0]!.xMin);
    expect(sim.player.pos.x).toBeLessThan(bands[0]!.xMax);
    expect(sim.player.pos.z).toBeGreaterThanOrEqual(bands[0]!.zMin);
    expect(sim.player.pos.z).toBeLessThan(bands[0]!.zMax);
  });

  it('selects Q05 below its recommended level instead of blocking the main campaign', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2512,
      playerClass: 'warrior',
      playerName: 'LevelGate',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q03': {
        questId: 'M01-Q03',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q04': {
        questId: 'M01-Q04',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 2,
        stageProgress: 0,
        state: 'ready',
      },
    };

    sim.setPlayerLevel(7);
    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q05',
      phase: 'to-giver',
    });

    sim.setMir4AutoQuest(false);
    sim.setPlayerLevel(8);
    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q05',
      phase: 'to-giver',
    });
  });

  it('returns a ready noticeboard repeatable to its authored map board', () => {
    const baseWorld = buildMir4ArcWorld(1);
    const firstMainGiver = mir4ArcQuest('M01-Q01')!.giverNpcId;
    const world = {
      ...baseWorld,
      camps: [],
      npcs: Object.fromEntries(
        Object.entries(baseWorld.npcs).filter(([npcId]) => npcId !== firstMainGiver),
      ),
    };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2513,
      playerClass: 'warrior',
      playerName: 'BoardReturn',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId);
    const quest = mir4ArcQuest('M01-R01');
    const board = world.services?.noticeboards?.[0];
    if (!meta) throw new Error('Noticeboard-return player metadata missing');
    if (!quest) throw new Error('M01-R01 quest missing');
    if (!board) throw new Error('M01 authored noticeboard missing');
    sim.utcDay = '2026-08-21';
    sim.setPlayerLevel(7);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q03': {
        questId: 'M01-Q03',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q04': {
        questId: 'M01-Q04',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q05': {
        questId: 'M01-Q05',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q06': {
        questId: 'M01-Q06',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: quest.stages.length,
        stageProgress: 0,
        state: 'ready',
      },
    };
    const remoteSite = mir4ArcBands()[0]!.sites[5]!.pos;
    teleport(sim, remoteSite.x, remoteSite.z);

    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-R01',
      phase: 'return',
    });
    sim.tick();
    expect(meta.mir4AutoQuest?.route).toMatchObject({
      goalX: board.x,
      goalZ: board.z,
    });

    let guard = 1;
    while (meta.mir4ArcQuests['M01-R01']?.state !== 'done' && guard++ < 2000) sim.tick();

    expect(guard).toBeLessThan(2000);
    expect(meta.mir4ArcQuests['M01-R01']).toMatchObject({
      state: 'done',
      completedDay: '2026-08-21',
    });
    expect(meta.copper).toBe(400);
    expect(meta.mir4ArcRewards?.items?.['regional-craft-cache-m01']).toBe(1);
  });

  it('keeps a saved main journey below its recommended level', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2513,
      playerClass: 'warrior',
      playerName: 'SavedLevelGate',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(7);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q03': {
        questId: 'M01-Q03',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-Q04': {
        questId: 'M01-Q04',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done',
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 2,
        stageProgress: 0,
        state: 'ready',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q05',
      phase: 'to-giver',
      siteIndex: 0,
      suspended: false,
    };

    sim.tick();

    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q05',
      phase: 'to-giver',
    });
  });

  it('heals a persisted repeatable journey back onto the unfinished main campaign', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2511,
      playerClass: 'warrior',
      playerName: 'PersistedCampaignFirst',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(5);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 3,
        stageProgress: 1,
        state: 'done',
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 3,
        stageProgress: 1,
        state: 'done',
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 1,
        stageProgress: 1,
        state: 'ready',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-R01',
      phase: 'return',
      siteIndex: 1,
      suspended: false,
    };

    sim.tick();

    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q03',
      phase: 'to-giver',
    });
  });

  it('stops Auto Journey when the selected campaign quest is complete', () => {
    const world = buildMir4ArcWorld(1);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 252,
      playerClass: 'warrior',
      playerName: 'Continuous',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    sim.setPlayerLevel(3);
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 3,
        stageProgress: 1,
        state: 'done',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q01',
      phase: 'return',
      siteIndex: 3,
      suspended: false,
    };

    sim.tick();

    expect(meta.mir4AutoQuest).toBeUndefined();
  });

  it.each([
    ['M01-Q02', 3, { kind: 'use-health-potion' }],
    ['M01-Q03', 3, { kind: 'equip-item' }],
  ] as const)(
    'waits at main quest %s until its concrete tutorial action arrives',
    (questId, stageIndex, receipt) => {
      const world = buildMir4ArcWorld(1);
      setActiveWorldContent(world);
      const sim = new Sim({
        seed: 253,
        playerClass: 'warrior',
        playerName: 'NoTechnicalStall',
        gameProfile: 'mir4-gameplay-port',
        world,
      });
      const meta = sim.players.get(sim.playerId)!;
      meta.mir4ArcQuests = {
        [questId]: { questId, stageIndex, stageProgress: 0, state: 'active' },
      };
      meta.mir4AutoQuest = {
        questId,
        phase: 'to-site',
        siteIndex: stageIndex,
        suspended: false,
      };
      const progress = meta.mir4ArcQuests[questId]!;
      const stage = mir4ArcQuest(questId)!.stages[stageIndex]!;
      const anchor = mir4ArcStageAnchor(questId, stage, 0)!;
      teleport(sim, anchor.x, anchor.z);

      sim.tick();

      expect(progress.stageIndex).toBe(stageIndex);
      expect(creditMir4ArcTutorialReceipt(meta, receipt)).toBe(true);
      expect(progress.stageIndex).toBe(stageIndex + 1);
    },
  );

  it('attacks the authored quest target without enabling the separate Auto Battle tool', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 254,
      playerClass: 'warrior',
      playerName: 'PowerGateOnly',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 4,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    const target = spawnQuestTestWolf(sim, sim.player.pos.x + 3.5, sim.player.pos.z);
    target.hp = target.maxHp = 5_000;
    target.moveSpeed = 0;
    target.wanderTimer = 999_999;
    const key = `${sim.playerId}:M01-Q02:4`;
    sim.mir4ArcEncounterRuns.set(key, {
      key,
      ownerPid: sim.playerId,
      questId: 'M01-Q02',
      stageIndex: 4,
      entityId: target.id,
    });

    sim.tick();

    expect(meta.autoBattle?.mode ?? 'off').toBe('off');
    expect(meta.mir4AutoQuest?.battleOwned).toBeUndefined();
    expect(meta.mir4TargetCombat).toMatchObject({ targetId: target.id, owner: 'journey' });
    expect(sim.player.autoAttack).toBe(true);
    const hpBefore = target.hp;
    let guard = 0;
    while (target.hp === hpBefore && guard++ < 40) sim.tick();
    expect(guard).toBeLessThan(40);
    expect(target.hp).toBeLessThan(hpBefore);
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');

    sim.setMir4AutoQuest(false);

    expect(meta.mir4TargetCombat).toBeUndefined();
    expect(sim.player.autoAttack).toBe(false);
  });

  it('releases journey-owned focused combat before changing the selected quest', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 25401,
      playerClass: 'warrior',
      playerName: 'QuestTransfer',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 4,
        stageProgress: 0,
        state: 'active',
      },
      'M01-S01': {
        questId: 'M01-S01',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    const target = spawnQuestTestWolf(sim, sim.player.pos.x + 3.5, sim.player.pos.z);
    const key = `${sim.playerId}:M01-Q02:4`;
    sim.mir4ArcEncounterRuns.set(key, {
      key,
      ownerPid: sim.playerId,
      questId: 'M01-Q02',
      stageIndex: 4,
      entityId: target.id,
    });
    sim.tick();
    expect(meta.mir4TargetCombat).toMatchObject({ targetId: target.id, owner: 'journey' });

    sim.setMir4AutoQuest(true, 'M01-S01');

    expect(meta.mir4AutoQuest?.questId).toBe('M01-S01');
    expect(meta.mir4TargetCombat).toBeUndefined();
    expect(sim.player.autoAttack).toBe(false);
  });

  it('keeps a player-owned focused attack when Auto Mission is stopped', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 25402,
      playerClass: 'warrior',
      playerName: 'PlayerOwnedFocus',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    const target = spawnQuestTestWolf(sim, sim.player.pos.x + 3, sim.player.pos.z);
    sim.player.targetId = target.id;
    sim.startAutoAttack();
    expect(meta.mir4TargetCombat).toMatchObject({ targetId: target.id, owner: 'player' });

    sim.setMir4AutoQuest(false);

    expect(meta.mir4TargetCombat).toMatchObject({ targetId: target.id, owner: 'player' });
    expect(sim.player.autoAttack).toBe(true);
  });

  it('cleans up orphaned journey combat after its Auto Mission cursor is gone', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 25403,
      playerClass: 'warrior',
      playerName: 'OrphanedJourneyFocus',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const target = spawnQuestTestWolf(sim, sim.player.pos.x + 3, sim.player.pos.z);
    sim.player.targetId = target.id;
    sim.player.autoAttack = true;
    meta.mir4TargetCombat = { targetId: target.id, owner: 'journey' };
    expect(meta.mir4AutoQuest).toBeUndefined();
    expect(meta.mir4NarrativeDialogue).toBeUndefined();

    sim.setMir4AutoQuest(false);

    expect(meta.mir4TargetCombat).toBeUndefined();
    expect(sim.player.autoAttack).toBe(false);
  });

  it('walks into the encounter envelope and cooperates with player-enabled Auto Battle', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2541,
      playerClass: 'warrior',
      playerName: 'CombatJourney',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    sim.setPlayerLevel(5);
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q03',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q03': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q03',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    sim.setMir4AutoBattle(true);
    const stage = mir4ArcQuest('M01-Q03')!.stages[4]!;
    const anchor = mir4ArcStageAnchor('M01-Q03', stage)!;
    teleport(sim, anchor.x, anchor.z - 20);

    let guard = 0;
    let sawBattle = false;
    while (progress.stageIndex === 4 && guard++ < 4000) {
      sim.tick();
      if (meta.autoBattle?.mode === 'battle') sawBattle = true;
    }

    expect(guard).toBeLessThan(4000);
    expect(progress.stageIndex).toBe(5);
    expect(sawBattle).toBe(true);
  });

  it('clears one campaign hunt through focused combat for each native class', () => {
    const classes = ['warrior', 'elementalist', 'taoist', 'arbalist', 'lancer'] as const;
    const quest = mir4ArcQuest('M01-Q02')!;
    const stage = quest.stages[4]!;
    const guards = classes.map((classKey, index) => {
      // A campaign encounter is character-owned. Exercise each class in its
      // own deterministic run instead of stacking five private quest mobs on
      // one coordinate and accidentally turning this into a focus-fire test.
      const world = { ...buildMir4ArcWorld(1), camps: [] };
      setActiveWorldContent(world);
      const sim = new Sim({
        seed: 2542 + index,
        playerClass: 'warrior',
        playerClassMir4: classKey,
        playerName: classKey,
        gameProfile: 'mir4-gameplay-port',
        idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
        world,
      });
      sim.setPlayerLevel(4);
      const progress = {
        questId: quest.questId,
        stageIndex: 4,
        stageProgress: 0,
        state: 'active' as const,
      };
      const meta = sim.players.get(sim.playerId)!;
      meta.mir4ArcQuests = { [quest.questId]: progress };
      meta.mir4AutoQuest = {
        questId: quest.questId,
        phase: 'to-site',
        siteIndex: 4,
        suspended: false,
      };
      const anchor = mir4ArcStageAnchor(quest.questId, stage)!;
      const player = sim.player;
      const grounded = sim.groundPos(anchor.x - 20, anchor.z);
      player.pos = { ...grounded };
      player.prevPos = { ...grounded };
      let guard = 0;
      let sawAuthoredBoar = false;
      while (progress.stageIndex === 4 && !player.dead && guard++ < 4_000) {
        sim.tick();
        const run = sim.mir4ArcEncounterRuns.get(`${sim.playerId}:${quest.questId}:4`);
        const target = run ? sim.entities.get(run.entityId) : undefined;
        if (target?.templateId.endsWith('_rabid_boar')) sawAuthoredBoar = true;
      }
      expect(player.dead, classKey).toBe(false);
      expect(progress.stageIndex, classKey).toBeGreaterThanOrEqual(5);
      expect(sawAuthoredBoar, classKey).toBe(true);
      expect(meta.autoBattle?.mode ?? 'off', classKey).toBe('off');
      return guard;
    });

    expect(Math.max(...guards)).toBeLessThan(1_200);
  });

  it('clears a short campaign dungeon through the authored guard and boss targets', () => {
    const world = buildMir4ArcWorld(4);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2544,
      playerClass: 'warrior',
      playerName: 'DungeonJourney',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    sim.setPlayerLevel(50);
    // This contract isolates routing and target hand-off. A naked character is
    // intentionally too weak for the guardian after the campaign pressure
    // pass, so keep the fixture alive without weakening the live encounter.
    sim.player.maxHp = 1_000_000;
    sim.player.hp = sim.player.maxHp;
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M04-Q05',
      stageIndex: 5,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M04-Q05': progress };
    meta.mir4AutoQuest = {
      questId: 'M04-Q05',
      phase: 'to-site',
      siteIndex: 5,
      suspended: false,
    };
    sim.setMir4AutoBattle(true);
    const stage = mir4ArcQuest('M04-Q05')!.stages[5]!;
    const anchor = mir4ArcStageAnchor('M04-Q05', stage, 0)!;
    teleport(sim, anchor.x, anchor.z);

    let guard = 0;
    let sawAuthoredTarget = false;
    while (progress.stageIndex === 5 && guard++ < 12_000) {
      sim.tick();
      const run = [...sim.mir4ArcDungeonRuns.values()][0];
      if (!run || sim.player.targetId === null) continue;
      if (run.guardIds.includes(sim.player.targetId) || run.bossId === sim.player.targetId) {
        sawAuthoredTarget = true;
      }
    }

    expect(guard).toBeLessThan(12_000);
    expect(progress.stageIndex).toBe(6);
    expect(sawAuthoredTarget).toBe(true);
    expect(sim.player.dead).toBe(false);
  });

  it('escorts the M04 ascent through all three authored switchback checkpoints', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: WORLD_SEED,
      playerClass: 'warrior',
      playerName: 'HighlandEscortJourney',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    sim.setPlayerLevel(50);
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M04-Q04',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M04-Q04': progress };
    meta.mir4AutoQuest = {
      questId: 'M04-Q04',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };
    sim.setMir4AutoBattle(true);
    const stage = mir4ArcQuest('M04-Q04')!.stages[2]!;
    const anchor = mir4ArcStageAnchor('M04-Q04', stage, 0, world.mir4ArcMapProjections)!;
    teleport(sim, anchor.x, anchor.z);

    let guard = 0;
    while (progress.stageIndex === 2 && guard++ < 8_000) sim.tick();

    const stalledHighlandRun = [...sim.mir4ArcEscortRuns.values()][0];
    expect(
      guard,
      JSON.stringify({
        progress,
        player: { x: sim.player.pos.x, z: sim.player.pos.z, hp: sim.player.hp },
        run: stalledHighlandRun,
        npc: stalledHighlandRun?.npcId == null ? null : sim.entities.get(stalledHighlandRun.npcId),
        ambushers: stalledHighlandRun?.ambushIds.map((id) => sim.entities.get(id)),
      }),
    ).toBeLessThan(8_000);
    expect(progress).toMatchObject({ stageIndex: 3, stageProgress: 0 });
    expect(sim.player.dead).toBe(false);
  });

  it('waits for an escortee and starts only after entering the safe interaction range', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2545,
      playerClass: 'warrior',
      playerName: 'EscortJourney',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M02-Q02',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M02-Q02': progress };
    meta.mir4AutoQuest = {
      questId: 'M02-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };
    const stage = mir4ArcQuest('M02-Q02')!.stages[2]!;
    const anchor = mir4ArcStageAnchor('M02-Q02', stage, 0)!;
    teleport(sim, anchor.x, anchor.z);

    sim.tick();

    const run = [...sim.mir4ArcEscortRuns.values()][0]!;
    const escortee = run.npcId === null ? null : sim.entities.get(run.npcId);
    expect(escortee).toBeDefined();
    expect(run.started).toBe(false);
    expect(progress.stageProgress).toBe(0);

    sim.player.pos = sim.groundPos(escortee!.pos.x + 5, escortee!.pos.z);
    sim.player.prevPos = { ...sim.player.pos };
    sim.rebucket(sim.player);
    sim.tick();

    expect(run.started).toBe(false);
    expect(progress.stageProgress).toBe(0);
  });

  it('walks to the escort materialization anchor when the native escortee is absent', () => {
    const world = buildMir4ArcWorld(9);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 25_451,
      playerClass: 'warrior',
      playerName: 'EscortMaterializationJourney',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M02-Q02': {
        questId: 'M02-Q02',
        stageIndex: 2,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4AutoQuest = {
      questId: 'M02-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };
    const stage = mir4ArcQuest('M02-Q02')!.stages[2]!;
    const anchor = mir4ArcStageAnchor('M02-Q02', stage, 0)!;
    teleport(sim, anchor.x + 70, anchor.z);
    const before = Math.hypot(sim.player.pos.x - anchor.x, sim.player.pos.z - anchor.z);

    sim.tick();

    expect(Math.hypot(sim.player.pos.x - anchor.x, sim.player.pos.z - anchor.z)).toBeLessThan(
      before,
    );
    expect(meta.mir4AutoQuest?.route).toMatchObject({ goalX: anchor.x, goalZ: anchor.z });
    expect([...sim.mir4ArcEscortRuns.values()][0]?.npcId).toBeNull();
  });

  it('follows the exact main escort when a repeatable escort run already exists', () => {
    const world = buildMir4ArcWorld(9);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 90_901,
      playerClass: 'warrior',
      playerName: 'ScopedEscortJourney',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    sim.setPlayerLevel(20);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
        selectedStageIndexes: [2, 0],
      },
    };
    const sideStage = mir4ArcQuest('M01-R01')!.stages[2]!;
    const sideAnchor = mir4ArcStageAnchor('M01-R01', sideStage, 0)!;
    teleport(sim, sideAnchor.x, sideAnchor.z);
    sim.tick();
    const sideRun = [...sim.mir4ArcEscortRuns.values()].find((run) => run.questId === 'M01-R01')!;
    expect(sideRun.npcId).not.toBeNull();

    const mainProgress = {
      questId: 'M02-Q02',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests['M02-Q02'] = mainProgress;
    meta.mir4AutoQuest = {
      questId: 'M02-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };
    const mainStage = mir4ArcQuest('M02-Q02')!.stages[2]!;
    const mainAnchor = mir4ArcStageAnchor('M02-Q02', mainStage, 0)!;
    teleport(sim, mainAnchor.x, mainAnchor.z);

    sim.tick(); // materializes the Main escort after Journey's phase

    const mainRun = [...sim.mir4ArcEscortRuns.values()].find((run) => run.questId === 'M02-Q02')!;
    const mainEscortee = mainRun.npcId === null ? null : sim.entities.get(mainRun.npcId);
    expect(mainEscortee).toBeDefined();
    expect(meta.mir4AutoQuest?.route).toMatchObject({
      goalX: mainAnchor.x,
      goalZ: mainAnchor.z,
    });
    expect(sideRun.started).toBe(false);

    sim.tick();

    expect(meta.mir4AutoQuest?.route).toMatchObject({
      goalX: mainEscortee!.pos.x,
      goalZ: mainEscortee!.pos.z,
    });
    expect(sideRun.started).toBe(false);
  });

  it('routes to escort ambushers and completes every guarded checkpoint unattended', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2547,
      playerClass: 'warrior',
      playerName: 'EscortCombatJourney',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    sim.setPlayerLevel(15);
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M02-Q02',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M02-Q02': progress };
    meta.mir4AutoQuest = {
      questId: 'M02-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };
    sim.setMir4AutoBattle(true);
    const stage = mir4ArcQuest('M02-Q02')!.stages[2]!;
    const anchor = mir4ArcStageAnchor('M02-Q02', stage, 0)!;
    teleport(sim, anchor.x, anchor.z);

    let guard = 0;
    let sawAmbushTarget = false;
    while (progress.stageIndex === 2 && guard++ < 12_000) {
      sim.tick();
      const run = [...sim.mir4ArcEscortRuns.values()][0];
      if (run && sim.player.targetId !== null && run.ambushIds.includes(sim.player.targetId)) {
        sawAmbushTarget = true;
      }
    }

    const stalledEscortRun = [...sim.mir4ArcEscortRuns.values()][0];
    expect(
      guard,
      JSON.stringify({
        progress,
        player: { x: sim.player.pos.x, z: sim.player.pos.z, hp: sim.player.hp },
        run: stalledEscortRun,
        npc: stalledEscortRun?.npcId == null ? null : sim.entities.get(stalledEscortRun.npcId),
        ambushers: stalledEscortRun?.ambushIds.map((id) => sim.entities.get(id)),
      }),
    ).toBeLessThan(12_000);
    expect(progress.stageIndex).toBe(3);
    expect(sawAmbushTarget).toBe(true);
    expect(sim.player.dead).toBe(false);
  });

  it('holds a survive-zone journey on anchor zero while timer progress rises', () => {
    const world = buildMir4ArcWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2546,
      playerClass: 'warrior',
      playerName: 'SurviveJourney',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const stage = mir4ArcQuest('M02-Q05')!.stages[3]!;
    const anchor = mir4ArcStageAnchor('M02-Q05', stage, 0)!;
    const shiftedProgress = Array.from({ length: 89 }, (_, index) => index + 1).find((value) => {
      const shifted = mir4ArcStageAnchor('M02-Q05', stage, value)!;
      return Math.hypot(shifted.x - anchor.x, shifted.z - anchor.z) > 8;
    });
    expect(shiftedProgress).toBeDefined();
    const progress = {
      questId: 'M02-Q05',
      stageIndex: 3,
      stageProgress: shiftedProgress!,
      state: 'active' as const,
      lastEvidenceAt: sim.time - 1,
    };
    meta.mir4ArcQuests = { 'M02-Q05': progress };
    meta.mir4AutoQuest = {
      questId: 'M02-Q05',
      phase: 'to-site',
      siteIndex: 3,
      suspended: false,
    };
    teleport(sim, anchor.x, anchor.z);
    sim.player.prevPos = { ...sim.player.pos };
    const before = { ...sim.player.pos };

    sim.tick();

    expect(Math.hypot(sim.player.pos.x - before.x, sim.player.pos.z - before.z)).toBeLessThan(0.01);
    expect(progress.stageProgress).toBe(shiftedProgress! + 1);

    sim.player.dead = true;
    sim.tick();

    expect(progress.stageProgress).toBe(0);
    expect(progress.lastEvidenceAt).toBeUndefined();
  });

  it('locks Auto Battle onto the authored quest encounter instead of a nearer stray mob', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2542,
      playerClass: 'warrior',
      playerName: 'QuestTargetPriority',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    sim.setPlayerLevel(5);
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q03',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q03': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q03',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    sim.setMir4AutoBattle(true);
    const stage = mir4ArcQuest('M01-Q03')!.stages[4]!;
    const anchor = mir4ArcStageAnchor('M01-Q03', stage)!;
    teleport(sim, anchor.x - 15, anchor.z);
    const stray = spawnQuestTestWolf(sim, sim.player.pos.x + 6, sim.player.pos.z);
    sim.player.targetId = stray.id;

    let guard = 0;
    while (progress.stageIndex === 4 && !sim.player.castingAbility && guard++ < 4000) sim.tick();

    // Journey killed its authored target, but deliberately leaves the nearby
    // stray alive. Its attacks can now interrupt the quest-item cast until the
    // player takes manual control and removes the threat.
    expect(sim.player.castingAbility).toBe('gathering');
    sim.ctx.dealDamage(sim.player, stray, stray.hp + 1, false, 'physical', null, 'hit');
    while (progress.stageIndex === 4 && guard++ < 4000) sim.tick();

    expect(guard).toBeLessThan(4000);
    expect(progress.stageIndex).toBe(5);
  });

  it('releases journey-owned battle before a ready quest can attack another mob', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2543,
      playerClass: 'warrior',
      playerName: 'ReadyStopsBattle',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-R01')!;
    meta.mir4ArcQuests = {
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: quest.stages.length,
        stageProgress: 1,
        state: 'ready',
      },
    };
    sim.setMir4AutoBattle(true);
    meta.mir4AutoQuest = {
      questId: 'M01-R01',
      phase: 'return',
      siteIndex: quest.stages.length,
      suspended: false,
      battleOwned: true,
    };
    const wolf = spawnQuestTestWolf(sim, sim.player.pos.x + 3, sim.player.pos.z);
    const hpBefore = wolf.hp;

    sim.tick();

    expect(meta.autoBattle?.mode).toBe('off');
    expect(meta.mir4AutoQuest?.battleOwned).not.toBe(true);
    expect(wolf.hp).toBe(hpBefore);
  });

  it('keeps a player-enabled Auto Battle independent from Auto Mission', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 255,
      playerClass: 'warrior',
      playerName: 'BattleOwnership',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q02',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q02': progress };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
    };
    sim.setMir4AutoBattle(true); // player-owned battle
    sim.tick();
    expect(meta.autoBattle?.mode).toBe('battle');
    expect(meta.mir4AutoQuest?.battleOwned).toBeUndefined();
    sim.setMir4AutoQuest(false);
    expect(meta.autoBattle?.mode).toBe('battle');
  });

  it('turns off legacy journey-owned battle and then honors explicit player control', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 2551,
      playerClass: 'warrior',
      playerName: 'BattleTakeover',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    const progress = {
      questId: 'M01-Q02',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active' as const,
    };
    meta.mir4ArcQuests = { 'M01-Q02': progress };
    sim.setMir4AutoBattle(true);
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 4,
      suspended: false,
      battleOwned: true,
    };
    sim.tick();
    expect(meta.autoBattle?.mode).toBe('off');
    expect(meta.mir4AutoQuest?.battleOwned).toBeUndefined();

    sim.setMir4AutoBattle(true);
    progress.stageIndex = 3;
    sim.tick();

    expect(meta.autoBattle?.mode).toBe('battle');
  });

  it('drives the full-campaign M01 contract through the existing auto-journey toggle', () => {
    // This regression owns route/quest coordination, not the deliberate
    // hostile-interruption gate covered by quest_objective_cast.test.ts.
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 24,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, world.playerStart.x, world.playerStart.z);
    sim.setMir4AutoQuest(true);
    expect(meta.mir4AutoQuest).toMatchObject({
      questId: 'M01-Q01',
      phase: 'to-giver',
    });
    let guard = 0;
    while (meta.mir4ArcQuests?.['M01-Q01']?.state !== 'done' && guard++ < 12_000) {
      sim.tick();
      if (meta.mir4ArcQuests?.['M01-Q01']?.stageIndex === 3) {
        sim.mir4AcknowledgeTutorial('M01-Q01');
      }
    }
    expect(guard).toBeLessThan(12_000);
    expect(meta.mir4ArcQuests?.['M01-Q01']?.state).toBe('done');
    sim.tick();
    expect(meta.mir4AutoQuest).toBeUndefined();
    expect(meta.copper).toBe(200);
  });

  it('keeps auto battle from pulling an active journey back to its old anchor', () => {
    const world = { ...buildMir4ArcWorld(1), camps: [] };
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 26,
      playerClass: 'warrior',
      playerName: 'Aldric',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world,
    });
    const meta = sim.players.get(sim.playerId)!;
    teleport(sim, world.playerStart.x, world.playerStart.z);
    sim.setMir4AutoQuest(true);
    sim.setMir4AutoBattle(true);

    let guard = 0;
    while (!meta.mir4ArcQuests?.['M01-Q01'] && guard++ < 800) {
      sim.tick();
      const dialogueId = meta.mir4NarrativeDialogue?.id;
      if (dialogueId) sim.mir4SkipNarrativeDialogue(dialogueId);
    }

    expect(guard).toBeLessThan(800);
    expect(meta.mir4ArcQuests?.['M01-Q01']?.state).toBe('active');
  });
});
