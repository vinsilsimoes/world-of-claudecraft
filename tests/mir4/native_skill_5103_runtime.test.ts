import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeAscendingDragonContact,
  mir4NativeAscendingDragonPersistentMonsterDamageBps,
  mir4NativeAscendingDragonPolicy,
} from '../../src/sim/mir4/native_skill_ascending_dragon';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function setup() {
  const sim = new Sim({
    seed: 51_030,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Ascending Dragon QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  sim.player.facing = 0;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'ascending_dragon_target',
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 4,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    120,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + 3),
  );
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return { sim, target };
}

describe('MIR4 Lancer 5103 Ascending Dragon runtime', () => {
  it('schedules the six hybrid hits at the three native contact times without moving the caster', () => {
    const { sim, target } = setup();
    const start = { ...sim.player.pos };
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5103, target.id)).toEqual({ ok: true });
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5103,
    );
    expect(impacts).toHaveLength(6);
    expect(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000))).toEqual([
      580, 580, 960, 960, 1240, 1240,
    ]);
    expect(impacts.map((impact) => impact.channel)).toEqual([
      'physical',
      'magic',
      'physical',
      'magic',
      'physical',
      'magic',
    ]);
    for (let tick = 0; tick < 42; tick += 1) sim.tick();
    expect(sim.player.pos).toEqual(start);
  });

  it('projects every rank milestone from the native special-ability graph', () => {
    expect(mir4NativeAscendingDragonPolicy(1)).toMatchObject({
      chill: { durationMs: 5_000 },
      monsterMoveSpeed: null,
      severeCold: null,
      persistentMonsterDamageBasisPoints: 0,
    });
    expect(mir4NativeAscendingDragonPolicy(5)).toMatchObject({
      chill: { durationMs: 8_000 },
      monsterMoveSpeed: { nativeMagnitude: -50, durationMs: 5_000 },
      severeCold: {
        chancesByChillStacks: [3_000, 3_500, 4_000],
        durationMs: 2_000,
      },
      persistentMonsterDamageBasisPoints: 400,
    });
    expect(mir4NativeAscendingDragonPolicy(8)).toMatchObject({
      chill: { durationMs: 10_000 },
      monsterMoveSpeed: { nativeMagnitude: -100, durationMs: 5_000 },
      severeCold: {
        chancesByChillStacks: [4_000, 4_500, 5_000],
        durationMs: 5_000,
      },
      persistentMonsterDamageBasisPoints: 800,
    });
    expect(mir4NativeAscendingDragonPolicy(10)).toMatchObject({
      chill: { durationMs: 10_000 },
      monsterMoveSpeed: { nativeMagnitude: -150, durationMs: 5_000 },
      severeCold: {
        chancesByChillStacks: [6_000, 6_500, 7_000],
        durationMs: 7_000,
      },
      persistentMonsterDamageBasisPoints: 1_200,
    });
  });

  it('stacks Chill, slows monsters and resolves Severe Cold from the resulting stack count', () => {
    const { sim, target } = setup();
    const noRoll = () => 9_999;
    expect(
      applyMir4NativeAscendingDragonContact(sim.ctx, sim.player, target, 510302, 0, 1, noRoll),
    ).toMatchObject({ chillStacks: 1, monsterMoveSpeedReduced: false, frozen: false });
    expect(
      applyMir4NativeAscendingDragonContact(sim.ctx, sim.player, target, 510302, 0, 1, noRoll),
    ).toMatchObject({ chillStacks: 2, monsterMoveSpeedReduced: false, frozen: false });
    expect(
      applyMir4NativeAscendingDragonContact(sim.ctx, sim.player, target, 510302, 0, 10, () => 0),
    ).toEqual({
      applied: true,
      chillStacks: 3,
      monsterMoveSpeedReduced: true,
      severeColdTriggered: true,
      frozen: true,
    });
    expect(mir4NativeStatusBonus(target, 45)).toBe(-75);
    expect(mir4NativeStatusBonus(target, 76)).toBe(-150);
    expect(
      target.mir4Effects?.active.find(
        (effect) => effect.effectId === 'mir4_native_buff_20517_freeze',
      ),
    ).toMatchObject({ kind: 'freeze', duration: 7, remaining: 7 });
  });

  it('keeps monster-only movement reduction out of PvP and honors Severe Cold failure', () => {
    const { sim } = setup();
    const target = sim.addPlayer('warrior', 'PvP target');
    const playerTarget = sim.entities.get(target);
    if (!playerTarget) throw new Error('missing PvP target');
    playerTarget.pos = sim.groundPos(sim.player.pos.x, sim.player.pos.z + 3);
    playerTarget.prevPos = { ...playerTarget.pos };
    sim.rebucket(playerTarget);
    sim.duelRequest(target, sim.playerId);
    sim.duelAccept(target);
    for (let tick = 0; tick < 80 && sim.duelFor(sim.playerId)?.state !== 'active'; tick += 1) {
      sim.tick();
    }
    expect(sim.duelFor(sim.playerId)?.state).toBe('active');
    expect(
      applyMir4NativeAscendingDragonContact(
        sim.ctx,
        sim.player,
        playerTarget,
        510302,
        0,
        10,
        () => 9_999,
      ),
    ).toEqual({
      applied: true,
      chillStacks: 1,
      monsterMoveSpeedReduced: false,
      severeColdTriggered: false,
      frozen: false,
    });
    expect(mir4NativeStatusBonus(playerTarget, 76)).toBe(0);
  });

  it('reads the learned rank for the permanent Monster Damage bonus', () => {
    const { sim } = setup();
    const meta = sim.ctx.players.get(sim.playerId);
    if (!meta) throw new Error('missing player metadata');
    meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 5103: 5 };
    expect(mir4NativeAscendingDragonPersistentMonsterDamageBps(sim.ctx, sim.player)).toBe(400);
    meta.mir4SkillLevels = { ...meta.mir4SkillLevels, 5103: 10 };
    expect(mir4NativeAscendingDragonPersistentMonsterDamageBps(sim.ctx, sim.player)).toBe(1_200);
  });
});
