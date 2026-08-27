import { describe, expect, it } from 'vitest';
import {
  MIR4_AUTO_BATTLE_ACQUIRE_YARDS,
  updateMir4AutoBattle,
} from '../../src/sim/auto_battle/core';
import {
  blockMir4AutoBattleTarget,
  MIR4_AUTO_BATTLE_BLACKLIST_SECONDS,
  MIR4_AUTO_BATTLE_STALL_TICKS,
  type Mir4AutoBattleTargetMemory,
  mir4AutoBattleTargetBlocked,
  observeMir4AutoBattlePursuit,
} from '../../src/sim/auto_battle/target_memory';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS, RUN_SPEED } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

// The Phase 2 auto battle tail: the sim acquires, pursues, rotates, kills,
// and walks home with zero client input, reusing the mir4 cast gates.

function makeSim(seed = 3131, playerClassMir4: Mir4ClassKey = 'warrior'): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4,
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
}

function spawnTankWolf(sim: Sim, x: number, z: number, id: string): Entity {
  const wolf = createMob(
    sim.nextId++,
    {
      ...MIR4_MOBS.mir4_forest_wolf,
      id,
      hpBase: 5000,
      hpPerLevel: 0,
      dmgBase: 1,
      dmgPerLevel: 0,
      moveSpeed: 0,
    } as never,
    1,
    sim.groundPos(x, z),
  );
  wolf.wanderTimer = 999999;
  sim.addEntity(wolf);
  return wolf;
}

function spawnWolf(sim: Sim, offset: number): Entity {
  const p = sim.entities.get(sim.playerId);
  if (!p) throw new Error('player missing');
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + offset, p.pos.z),
  );
  sim.addEntity(wolf);
  return wolf;
}

function resolveScheduledAction(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
  updateMir4PendingImpacts(sim.ctx);
}

describe('mir4 auto battle', () => {
  it('hunts a wolf down from outside melee range and pays the kill XP', () => {
    const sim = makeSim();
    const wolf = spawnWolf(sim, 8); // outside the 4yd band: pursuit is exercised
    sim.setMir4AutoBattleMode('battle');
    let guard = 0;
    while (!wolf.dead && guard++ < 1200) sim.tick();
    expect(wolf.dead).toBe(true);
    expect(sim.players.get(sim.playerId)?.xp).toBe(34);
    const p = sim.entities.get(sim.playerId)!;
    expect(p.targetId).toBe(wolf.id);
  });
  it('pursues before using the lancer starter area skill on a distant target', () => {
    const sim = makeSim(3132, 'lancer');
    placePlayerInOpenField(sim);
    const p = sim.player;
    const wolf = spawnTankWolf(sim, p.pos.x + 20, p.pos.z, 'distant_lancer_target');
    const before = { ...p.pos };
    sim.ctx.hasLineOfSight = () => true;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(Math.hypot(p.pos.x - before.x, p.pos.z - before.z)).toBeGreaterThan(0);
    expect(p.cooldowns.has('5201')).toBe(false);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(wolf.hp).toBe(wolf.maxHp);
  });
  it('is deterministic: same seed, same hunt, same end state', () => {
    const run = () => {
      const sim = makeSim(77);
      const wolf = spawnWolf(sim, 8);
      sim.setMir4AutoBattleMode('battle');
      let guard = 0;
      while (!wolf.dead && guard++ < 1200) sim.tick();
      const p = sim.entities.get(sim.playerId)!;
      return [wolf.dead, guard, p.hp, p.resource, p.pos.x.toFixed(3), p.pos.z.toFixed(3)];
    };
    expect(run()).toEqual(run());
  });
  it('covers one full 3D camp while keeping a fixed local anchor and honoring manual override', () => {
    const sim = makeSim(88);
    sim.setMir4AutoBattleMode('battle');
    const meta = sim.players.get(sim.playerId)!;
    expect(meta.autoBattle?.acquireRadiusYards).toBe(30);
    expect(MIR4_AUTO_BATTLE_ACQUIRE_YARDS).toBe(30);
    // Human movement input suspends the bot without switching it off...
    meta.moveInput.forward = true;
    sim.tick();
    expect(meta.autoBattle?.mode).toBe('battle');
    expect(meta.autoBattle?.suspended).toBe(true);
    // ...and releasing the keys resumes it, re-anchored where the player stands.
    const p = sim.entities.get(sim.playerId)!;
    p.pos.x += 5;
    meta.moveInput.forward = false;
    sim.tick();
    expect(meta.autoBattle?.suspended).toBe(false);
    expect(meta.autoBattle?.anchorX).toBe(p.pos.x);
  });
  it('acquires and hunts prey across the 3D camp dispersion', () => {
    const sim = makeSim(880);
    const wolf = spawnWolf(sim, 24);
    sim.setMir4AutoBattleMode('battle');
    let guard = 0;
    while (!wolf.dead && guard++ < 1600) sim.tick();
    expect(guard).toBeLessThan(1600);
    expect(wolf.dead).toBe(true);
  });
  it('routes around world collision instead of stalling on a straight pursuit', () => {
    const sim = makeSim(880);
    const wolf = spawnWolf(sim, 24);
    const p = sim.entities.get(sim.playerId)!;
    sim.setMir4AutoBattleMode('battle');

    // In the built-in terrain the direct eastward line stops at x=12.5. The
    // valid player path bends through z=1.5 before continuing to the target.
    for (let i = 0; i < 400 && !wolf.dead; i++) sim.tick();

    expect(p.pos.x).toBeGreaterThan(12.5);
    expect(wolf.hp).toBeLessThan(wolf.maxHp);
  });
  it('does not pursue or acquire a monster outside the activation radius', () => {
    const sim = makeSim(881);
    const p = sim.entities.get(sim.playerId)!;
    const anchor = { x: p.pos.x, z: p.pos.z };
    const wolf = spawnWolf(sim, MIR4_AUTO_BATTLE_ACQUIRE_YARDS + 0.5);

    sim.setMir4AutoBattleMode('battle');
    for (let i = 0; i < 300; i++) sim.tick();

    expect(wolf.dead).toBe(false);
    expect(p.targetId).toBeNull();
    expect(p.pos.x).toBeCloseTo(anchor.x, 5);
    expect(p.pos.z).toBeCloseTo(anchor.z, 5);
  });
  it('drops a retained friendly mob and acquires a nearby hostile instead', () => {
    const sim = makeSim(8811);
    const p = sim.entities.get(sim.playerId)!;
    const friendly = spawnWolf(sim, 2);
    friendly.hostile = false;
    const hostile = spawnWolf(sim, 8);
    p.targetId = friendly.id;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(p.targetId).toBe(hostile.id);
  });
  it('keeps the activation anchor fixed after the player has pursued local prey', () => {
    const sim = makeSim(882);
    const p = sim.entities.get(sim.playerId)!;
    const anchorX = p.pos.x;
    sim.setMir4AutoBattleMode('battle');
    p.pos.x += 5;
    const wolf = spawnWolf(sim, MIR4_AUTO_BATTLE_ACQUIRE_YARDS + 1);
    p.targetId = null;

    updateMir4AutoBattle(sim.ctx);

    expect(p.targetId).toBeNull();
    expect(wolf.dead).toBe(false);
    expect(Math.abs(p.pos.x - anchorX)).toBeLessThan(5);
  });
  it('never adds a pursuit step while Auto Journey owns locomotion', () => {
    const sim = makeSim(883);
    const p = sim.entities.get(sim.playerId)!;
    const meta = sim.players.get(sim.playerId)!;
    spawnWolf(sim, 8);
    sim.setMir4AutoBattleMode('battle');
    meta.mir4AutoQuest = {
      questId: 'M01-Q01',
      phase: 'to-site',
      siteIndex: 1,
      suspended: false,
    };
    const before = { ...p.pos };

    updateMir4AutoBattle(sim.ctx);

    expect(p.pos.x).toBeCloseTo(before.x, 8);
    expect(p.pos.z).toBeCloseTo(before.z, 8);
  });
  it('turns off cleanly and stops acting', () => {
    const sim = makeSim(99);
    const wolf = spawnWolf(sim, 3);
    wolf.swingTimer = 999;
    sim.setMir4AutoBattleMode('battle');
    sim.setMir4AutoBattleMode('off');
    const resourceBefore = sim.entities.get(sim.playerId)!.resource;
    for (let i = 0; i < 60; i++) sim.tick();
    expect(wolf.dead).toBe(false);
    expect(sim.entities.get(sim.playerId)!.resource).toBe(resourceBefore);
    expect(sim.players.get(sim.playerId)?.autoBattle?.mode).toBe('off');
  });

  it('rejects an unreachable water target and acquires reachable land prey', () => {
    const run = () => {
      const sim = makeSim(884);
      const p = sim.entities.get(sim.playerId)!;
      p.pos = sim.groundPos(-110, 109);
      const water = spawnTankWolf(sim, -100, 109, 'test_water_wolf');
      const land = spawnTankWolf(sim, -110, 130, 'test_land_wolf');
      sim.setMir4AutoBattleMode('battle');
      updateMir4AutoBattle(sim.ctx);
      const initialTargetId = p.targetId;
      let ticks = 0;
      while (ticks < 800 && land.hp === land.maxHp) {
        sim.tick();
        ticks++;
      }
      return {
        initialTargetId,
        landId: land.id,
        ticks,
        waterHp: water.hp,
        waterMaxHp: water.maxHp,
        landHp: land.hp,
        landMaxHp: land.maxHp,
        x: p.pos.x,
        z: p.pos.z,
      };
    };

    const result = run();
    expect(result.initialTargetId).toBe(result.landId);
    expect(result.waterHp).toBe(result.waterMaxHp);
    expect(result.landHp).toBeLessThan(result.landMaxHp);
    expect(run()).toEqual(result);
  });

  it('routes toward cover instead of attacking a target without line of sight', () => {
    const sim = makeSim(880);
    const p = sim.entities.get(sim.playerId)!;
    p.pos = sim.groundPos(27, 0);
    const wolf = spawnTankWolf(sim, 30, 0, 'test_cover_wolf');
    expect(sim.ctx.hasLineOfSight(p, wolf)).toBe(false);
    sim.setMir4AutoBattleMode('battle');
    const before = { ...p.pos };

    updateMir4AutoBattle(sim.ctx);

    expect(wolf.hp).toBe(wolf.maxHp);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
    expect([...p.cooldowns.keys()].some((key) => /^\d+$/.test(key))).toBe(false);
    expect(sim.players.get(sim.playerId)?.autoBattle?.route).toBeDefined();
    expect(Math.hypot(p.pos.x - before.x, p.pos.z - before.z)).toBeGreaterThan(0);
  });

  it('prefers visible local prey over a closer target hidden behind cover', () => {
    const sim = makeSim(8841);
    const p = sim.player;
    const hidden = spawnTankWolf(sim, p.pos.x + 5, p.pos.z, 'test_hidden_nearest');
    const visible = spawnTankWolf(sim, p.pos.x + 8, p.pos.z, 'test_visible_farther');
    const hasLineOfSight = sim.ctx.hasLineOfSight;
    sim.ctx.hasLineOfSight = (_attacker, target) => target.id !== hidden.id;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    sim.ctx.hasLineOfSight = hasLineOfSight;
    expect(p.targetId).toBe(visible.id);
  });

  it.each(['stun', 'root', 'incapacitate'] as const)(
    'does not move or attack while the player is under %s control',
    (kind) => {
      const sim = makeSim(885);
      const p = sim.entities.get(sim.playerId)!;
      const farWolf = spawnTankWolf(sim, p.pos.x + 8, p.pos.z, `test_${kind}_far_wolf`);
      const closeWolf = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, `test_${kind}_close_wolf`);
      p.auras.push({
        id: `test_${kind}`,
        name: 'Test control',
        kind,
        remaining: 2,
        duration: 2,
        value: 0,
        sourceId: farWolf.id,
        school: 'physical',
      });
      sim.setMir4AutoBattleMode('battle');
      const before = { ...p.pos };

      updateMir4AutoBattle(sim.ctx);

      expect(p.pos.x).toBe(before.x);
      expect(p.pos.z).toBe(before.z);
      expect(farWolf.hp).toBe(farWolf.maxHp);
      expect(closeWolf.hp).toBe(closeWolf.maxHp);
      expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
      expect([...p.cooldowns.keys()].some((key) => /^\d+$/.test(key))).toBe(false);
    },
  );

  it('applies the live movement-speed multiplier while pursuing under a slow', () => {
    const sim = makeSim(8851);
    const p = sim.entities.get(sim.playerId)!;
    const wolf = spawnTankWolf(sim, p.pos.x + 8, p.pos.z, 'test_slow_pursuit_wolf');
    expect(
      applyMir4Effect(sim.ctx, p, {
        effectId: 'test_auto_battle_slow',
        kind: 'slow',
        durationSeconds: 2,
        magnitude: 0.35,
        name: 'Test slow',
        sourceId: wolf.id,
      }),
    ).toEqual({ ok: true });
    expect(
      applyMir4Effect(sim.ctx, p, {
        effectId: 'test_auto_battle_slow_second',
        kind: 'slow',
        durationSeconds: 2,
        magnitude: 0.3,
        name: 'Test second slow',
        sourceId: wolf.id,
      }),
    ).toEqual({ ok: true });
    sim.setMir4AutoBattleMode('battle');
    const originalMoveToward = sim.ctx.moveToward;
    let committedSpeed: number | undefined;
    sim.ctx.moveToward = (entity, destination, speed, ignoreObstacles) => {
      if (entity.id === p.id) committedSpeed = speed;
      return originalMoveToward(entity, destination, speed, ignoreObstacles);
    };

    updateMir4AutoBattle(sim.ctx);

    expect(committedSpeed).toBeCloseTo(RUN_SPEED * 0.65 * 0.7, 10);
  });

  it('does not include a friendly escort-shaped mob in automated AoE damage', () => {
    const sim = makeSim(886);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 30;
    const primary = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'test_aoe_primary');
    const friendly = spawnTankWolf(sim, p.pos.x + 3, p.pos.z, 'test_friendly_escortee');
    friendly.hostile = false;
    const nearbyA = spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, 'test_aoe_near_a');
    const nearbyB = spawnTankWolf(sim, p.pos.x + 3, p.pos.z - 1, 'test_aoe_near_b');
    const friendlyHp = friendly.hp;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);
    resolveScheduledAction(sim);

    expect(p.cooldowns.has('1401')).toBe(true);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(nearbyA.hp).toBeLessThan(nearbyA.maxHp);
    expect(nearbyB.hp).toBeLessThan(nearbyB.maxHp);
    expect(friendly.hp).toBe(friendlyHp);
  });

  it.each([
    ['elementalist', 2503, 'shield'],
    ['taoist', 3503, 'heal'],
  ] as const)(
    'uses the level-40 %s self utility in its survival rotation',
    (cls, skillId, kind) => {
      const sim = makeSim(887, cls);
      const p = sim.entities.get(sim.playerId)!;
      p.level = 40;
      p.hp = Math.floor(p.maxHp * 0.45);
      // Automatic potion use now shares the canonical inventory-consumable
      // deadline with manual potion use. Keep the potion unavailable so this
      // case isolates the class survival skill rotation.
      p.potionCooldownUntil = sim.time + 10;
      if (skillId === 2503) p.cooldowns.set('2301', 10);
      const wolf = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, `test_${kind}_target`);
      sim.setMir4AutoBattleMode('battle');
      const hpBefore = p.hp;

      updateMir4AutoBattle(sim.ctx);
      resolveScheduledAction(sim);

      expect(p.cooldowns.has(String(skillId))).toBe(true);
      if (kind === 'shield') expect(p.mir4Shield?.remaining).toBeGreaterThan(0);
      else expect(p.hp).toBeGreaterThan(hpBefore);
      expect(wolf.hp).toBe(wolf.maxHp);
    },
  );

  it('uses a targetless AoE only when its real area contains enough hostiles', () => {
    const crowded = makeSim(888, 'elementalist');
    const crowdedPlayer = crowded.entities.get(crowded.playerId)!;
    crowdedPlayer.level = 30;
    spawnTankWolf(crowded, crowdedPlayer.pos.x + 2, crowdedPlayer.pos.z, 'crowded_primary');
    spawnTankWolf(crowded, crowdedPlayer.pos.x + 3, crowdedPlayer.pos.z + 1, 'crowded_a');
    spawnTankWolf(crowded, crowdedPlayer.pos.x + 3, crowdedPlayer.pos.z - 1, 'crowded_b');
    crowdedPlayer.cooldowns.set('2101', 10);
    crowded.setMir4AutoBattleMode('battle');
    updateMir4AutoBattle(crowded.ctx);
    expect(crowdedPlayer.cooldowns.has('2501')).toBe(true);

    const spread = makeSim(889, 'elementalist');
    const spreadPlayer = spread.entities.get(spread.playerId)!;
    spreadPlayer.level = 30;
    spawnTankWolf(spread, spreadPlayer.pos.x + 2, spreadPlayer.pos.z, 'spread_primary');
    spawnTankWolf(spread, spreadPlayer.pos.x + 15, spreadPlayer.pos.z, 'spread_a');
    spawnTankWolf(spread, spreadPlayer.pos.x + 20, spreadPlayer.pos.z, 'spread_b');
    spreadPlayer.cooldowns.set('2101', 10);
    spread.setMir4AutoBattleMode('battle');
    updateMir4AutoBattle(spread.ctx);
    expect(spreadPlayer.cooldowns.has('2501')).toBe(false);
  });

  it.each(['friendly', 'covered'] as const)(
    'does not count a %s entity toward targetless AoE admission',
    (rejectedKind) => {
      const sim = makeSim(rejectedKind === 'friendly' ? 8892 : 8893, 'elementalist');
      const p = sim.player;
      p.level = 30;
      spawnTankWolf(sim, p.pos.x + 2, p.pos.z, `${rejectedKind}_valid_primary`);
      spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, `${rejectedKind}_valid_secondary`);
      const rejected = spawnTankWolf(sim, p.pos.x + 3, p.pos.z - 1, `${rejectedKind}_rejected`);
      if (rejectedKind === 'friendly') rejected.hostile = false;
      else {
        const hasLineOfSight = sim.ctx.hasLineOfSight;
        sim.ctx.hasLineOfSight = (attacker, target) =>
          target.id !== rejected.id && hasLineOfSight(attacker, target);
      }
      p.cooldowns.set('2101', 10);
      sim.setMir4AutoBattleMode('battle');

      updateMir4AutoBattle(sim.ctx);

      expect(p.cooldowns.has('2501')).toBe(false);
    },
  );

  it('casts an actor-centered AoE on the nearby pack even when the retained target is far', () => {
    const sim = makeSim(8891, 'elementalist');
    const p = sim.player;
    p.level = 30;
    const retained = spawnTankWolf(sim, p.pos.x + 20, p.pos.z, 'retained_far_target');
    const nearA = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'actor_area_a');
    const nearB = spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, 'actor_area_b');
    const nearC = spawnTankWolf(sim, p.pos.x + 3, p.pos.z - 1, 'actor_area_c');
    const before = { x: p.pos.x, z: p.pos.z };
    p.targetId = retained.id;
    p.cooldowns.set('2101', 10);
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);
    resolveScheduledAction(sim);

    expect(p.cooldowns.has('2501')).toBe(true);
    expect(nearA.hp).toBeLessThan(nearA.maxHp);
    expect(nearB.hp).toBeLessThan(nearB.maxHp);
    expect(nearC.hp).toBeLessThan(nearC.maxHp);
    expect(retained.hp).toBe(retained.maxHp);
    expect({ x: p.pos.x, z: p.pos.z }).toEqual(before);
  });

  it('commits only the ultimate when the gauge is full', () => {
    const sim = makeSim(890);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 50;
    const wolf = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'test_ultimate_target');
    p.mir4UltGauge = 100;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(p.cooldowns.has('mir4_ult')).toBe(true);
    expect(['1102', '1104', '1304', '1401'].some((id) => p.cooldowns.has(id))).toBe(false);
    expect(p.mir4PendingImpacts).toHaveLength(3);
    expect(wolf.hp).toBe(wolf.maxHp);
  });

  it('keeps a full Ultimate gauge untouched below level 50', () => {
    const sim = makeSim(8901);
    const p = sim.player;
    spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'test_locked_ultimate_target');
    p.mir4UltGauge = 100;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(p.cooldowns.has('mir4_ult')).toBe(false);
    expect(p.mir4UltGauge).toBe(100);
    expect(p.cooldowns.has('1102') || p.cooldowns.has('mir4_basic')).toBe(true);
  });

  it.each([
    ['warrior', 4],
    ['elementalist', 8],
    ['taoist', 4],
    ['arbalist', 12],
    ['lancer', 6],
  ] as const)('uses the %s class range instead of forcing every class into melee', (cls, range) => {
    const sim = makeSim(891, cls);
    placePlayerInOpenField(sim);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 40;
    const wolf = spawnTankWolf(sim, p.pos.x + range, p.pos.z, `test_${cls}_range`);
    const before = { ...p.pos };
    const hasLineOfSight = sim.ctx.hasLineOfSight;
    sim.ctx.hasLineOfSight = () => true;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    sim.ctx.hasLineOfSight = hasLineOfSight;
    expect(p.pos.x).toBe(before.x);
    expect(p.pos.z).toBe(before.z);
    expect([...p.cooldowns.keys()].some((key) => /^\d+$/.test(key)) || wolf.hp < wolf.maxHp).toBe(
      true,
    );

    const outside = makeSim(8911, cls);
    placePlayerInOpenField(outside);
    const outsidePlayer = outside.entities.get(outside.playerId)!;
    outsidePlayer.level = 40;
    const outsideWolf = spawnTankWolf(
      outside,
      outsidePlayer.pos.x + range + 0.01,
      outsidePlayer.pos.z,
      `test_${cls}_outside_range`,
    );
    const outsideBefore = { ...outsidePlayer.pos };
    outside.ctx.hasLineOfSight = () => true;
    outside.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(outside.ctx);

    expect(
      Math.hypot(outsidePlayer.pos.x - outsideBefore.x, outsidePlayer.pos.z - outsideBefore.z),
    ).toBeGreaterThan(0);
    expect(outsideWolf.hp).toBe(outsideWolf.maxHp);
    expect(outsidePlayer.mir4PendingImpacts ?? []).toHaveLength(0);
    expect([...outsidePlayer.cooldowns.keys()].some((key) => /^\d+$/.test(key))).toBe(false);
  });

  it('includes exactly 30 yards in acquisition and rejects the first point beyond it', () => {
    const inside = makeSim(8912);
    const insidePlayer = inside.entities.get(inside.playerId)!;
    const edge = spawnTankWolf(
      inside,
      insidePlayer.pos.x + MIR4_AUTO_BATTLE_ACQUIRE_YARDS,
      insidePlayer.pos.z,
      'test_exact_acquisition_edge',
    );
    inside.ctx.hasLineOfSight = () => true;
    inside.setMir4AutoBattleMode('battle');
    updateMir4AutoBattle(inside.ctx);
    expect(insidePlayer.targetId).toBe(edge.id);

    const outside = makeSim(8913);
    const outsidePlayer = outside.entities.get(outside.playerId)!;
    spawnTankWolf(
      outside,
      outsidePlayer.pos.x + MIR4_AUTO_BATTLE_ACQUIRE_YARDS + 0.001,
      outsidePlayer.pos.z,
      'test_beyond_acquisition_edge',
    );
    outside.ctx.hasLineOfSight = () => true;
    outside.setMir4AutoBattleMode('battle');
    updateMir4AutoBattle(outside.ctx);
    expect(outsidePlayer.targetId).toBeNull();
  });

  it('treats MIR4 hard control as a no-action state even without its classic aura mirror', () => {
    const sim = makeSim(892);
    const p = sim.entities.get(sim.playerId)!;
    const wolf = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'test_mir4_control_target');
    p.ccImmune = true;
    expect(
      applyMir4Effect(sim.ctx, p, {
        effectId: 'test_mir4_freeze',
        kind: 'freeze',
        durationSeconds: 2,
        name: 'Test freeze',
        sourceId: wolf.id,
      }),
    ).toEqual({ ok: true });
    expect(p.auras.some((aura) => aura.kind === 'stun')).toBe(false);
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(wolf.hp).toBe(wolf.maxHp);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
  });

  it('declares a pursuit stalled on exactly the fortieth stationary observation', () => {
    expect(MIR4_AUTO_BATTLE_STALL_TICKS).toBe(40);
    let pursuit = observeMir4AutoBattlePursuit(undefined, 17, { x: 4, z: 9 }).pursuit;

    for (let observation = 1; observation < MIR4_AUTO_BATTLE_STALL_TICKS; observation++) {
      const result = observeMir4AutoBattlePursuit(pursuit, 17, { x: 4, z: 9 });
      pursuit = result.pursuit;
      expect(result.stalled).toBe(false);
    }

    const boundary = observeMir4AutoBattlePursuit(pursuit, 17, { x: 4, z: 9 });
    expect(boundary.pursuit.stalledTicks).toBe(MIR4_AUTO_BATTLE_STALL_TICKS);
    expect(boundary.stalled).toBe(true);
  });

  it('does not mistake sideways wall sliding for progress toward a target', () => {
    let pursuit = observeMir4AutoBattlePursuit(undefined, 19, { x: 0, z: 0 }, 12).pursuit;

    for (let tick = 1; tick <= MIR4_AUTO_BATTLE_STALL_TICKS; tick++) {
      const result = observeMir4AutoBattlePursuit(pursuit, 19, { x: tick * 0.02, z: 0 }, 12);
      pursuit = result.pursuit;
    }

    expect(pursuit.stalledTicks).toBe(MIR4_AUTO_BATTLE_STALL_TICKS);
  });

  it('expires a rejected target at exactly eight simulation seconds', () => {
    expect(MIR4_AUTO_BATTLE_BLACKLIST_SECONDS).toBe(8);
    const memory: Mir4AutoBattleTargetMemory = {
      pursuit: { targetId: 17, lastX: 4, lastZ: 9, stalledTicks: 40 },
    };
    const blockedAt = 12.5;

    blockMir4AutoBattleTarget(memory, 17, blockedAt);

    expect(memory.pursuit).toBeUndefined();
    expect(
      mir4AutoBattleTargetBlocked(
        memory,
        17,
        blockedAt + MIR4_AUTO_BATTLE_BLACKLIST_SECONDS - 0.001,
      ),
    ).toBe(true);
    expect(
      mir4AutoBattleTargetBlocked(memory, 17, blockedAt + MIR4_AUTO_BATTLE_BLACKLIST_SECONDS),
    ).toBe(false);
    expect(memory.blockedUntilByTargetId).toBeUndefined();
  });
});
