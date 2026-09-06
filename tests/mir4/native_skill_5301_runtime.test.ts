import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { mir4NativeDoubleStrikeConditionalDamageBasisPoints } from '../../src/sim/mir4/native_skill_double_strike';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 53_010,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Double Strike Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `double_strike_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const sin = Math.sin(sim.player.facing);
  const cos = Math.cos(sim.player.facing);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(
      sim.player.pos.x + sin * forward + cos * side,
      sim.player.pos.z + cos * forward - sin * side,
    ),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5301) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function applyChill(sim: Sim, target: Entity, stacks: number): void {
  expect(
    applyMir4Effect(sim.ctx, target, {
      effectId: 'mir4_native_buff_20020',
      kind: 'native-status-boost',
      durationSeconds: 10,
      magnitude: -25 * stacks,
      nativeStatusId: 45,
      nativeStacks: stacks,
      name: 'Chill',
      sourceId: sim.player.id,
    }),
  ).toEqual({ ok: true });
}

function resolveFixedContact(sim: Sim, target: Entity, skillLevel: number): number {
  const healthBefore = target.hp;
  sim.player.mir4PendingImpacts = [
    {
      dueAt: sim.time,
      sourceId: sim.playerId,
      targetId: target.id,
      rawDamage: 100_000,
      channel: 'physical',
      attackKind: 'skill',
      name: 'Double Strike',
      gaugeGain: 0,
      spiritProcEligible: false,
      skillId: 5301,
      skillLevel,
      attackId: 530102,
      sourceImpactIndex: 0,
      forceHit: true,
      forceCritical: false,
      attackAnimationStarted: true,
    },
  ];
  updateMir4PendingImpacts(sim.ctx);
  return healthBefore - target.hp;
}

describe('MIR4 Lancer 5301 Double Strike integrated runtime', () => {
  it('schedules the three physical contacts at their exact native moments', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 5, 0, 'anchor');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5301, target.id)).toEqual({ ok: true });
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4SkillGuide',
        sourceId: sim.playerId,
        skillId: 5301,
        attackId: 530102,
        shape: 'direct',
        lengthYards: 6,
        widthYards: 6,
        aliveMs: 500,
        scalingMs: 300,
      }),
    );
    const impacts = (sim.player.mir4PendingImpacts ?? []).filter(
      (impact) => impact.skillId === 5301 && !impact.effectOnly,
    );
    expect(impacts).toHaveLength(3);
    expect(impacts.map((impact) => Math.round((impact.dueAt - sim.time) * 1_000))).toEqual([
      400, 1_040, 1_200,
    ]);
    expect(impacts.every((impact) => impact.channel === 'physical')).toBe(true);
  });

  it('advances 3.5 yards, crosses 1.2 yards beyond the selected target and turns back', () => {
    const sim = makeLancer();
    const start = { ...sim.player.pos };
    const target = spawnTarget(sim, 5, 0, 'movement');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5301, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    for (let tick = 0; tick < 21; tick += 1) sim.tick();
    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(6.2, 5);

    sim.time = 1.2;
    updateMir4PendingImpacts(sim.ctx);
    const targetDx = target.pos.x - sim.player.pos.x;
    const targetDz = target.pos.z - sim.player.pos.z;
    expect(
      Math.sin(sim.player.facing) * targetDx + Math.cos(sim.player.facing) * targetDz,
    ).toBeGreaterThan(0);
  });

  it('rebuilds the frontal strip, caps each contact at 8 targets and applies both knock-backs', () => {
    const sim = makeLancer();
    const primary = spawnTarget(sim, 5, 0, 'primary');
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) =>
        spawnTarget(sim, 5.2 + index * 0.05, -2 + index * 0.5, String(index)),
      ),
    ];
    sim.player.targetId = primary.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5301, primary.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];
    const contactTargetCounts: number[] = [];

    for (const time of [0.4, 1.04, 1.2]) {
      const healthBefore = new Map(targets.map((target) => [target.id, target.hp]));
      sim.time = time;
      updateMir4PendingImpacts(sim.ctx);
      contactTargetCounts.push(
        targets.filter((target) => target.hp < (healthBefore.get(target.id) ?? target.hp)).length,
      );
      events.push(...sim.drainEvents());
    }

    expect(contactTargetCounts[0]).toBe(8);
    expect(contactTargetCounts.every((count) => count <= 8)).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5301,
        attackId: 530101,
        stance: 'hit-02',
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5301,
        attackId: 530103,
        stance: 'hit-02',
      }),
    );
  });

  it('applies the exact Chill-stack damage packages and no bonus without Chill', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 5, 0, 'chill');
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 10)).toBe(10_000);

    applyChill(sim, target, 1);
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 5)).toBe(12_000);
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 8)).toBe(15_000);
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 10)).toBe(19_000);
    const chill = target.mir4Effects?.active[0];
    if (!chill) throw new Error('missing Chill effect');
    chill.nativeStacks = 2;
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 10)).toBe(20_000);
    chill.nativeStacks = 3;
    expect(mir4NativeDoubleStrikeConditionalDamageBasisPoints(target, 10)).toBe(21_000);
  });

  it('feeds Bash and the Chill-stack package through the real damage resolver', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim, 5, 0, 'live-damage');
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Lancer metadata');
    meta.mir4SkillLevels = { 5101: 1, 5301: 1 };

    const ordinaryDamage = resolveFixedContact(sim, target, 10);
    target.hp = target.maxHp;
    applyChill(sim, target, 3);
    const chilledDamage = resolveFixedContact(sim, target, 10);

    expect(ordinaryDamage).toBeGreaterThan(0);
    expect(chilledDamage / ordinaryDamage).toBeCloseTo(4.2, 2);
  });
});
