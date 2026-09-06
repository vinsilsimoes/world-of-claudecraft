import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible } from '../../src/sim/mir4/effects';
import { updateMir4NativePeriodicDamage } from '../../src/sim/mir4/native_periodic_damage';
import {
  MIR4_NATIVE_ULTIMATE_SKILL_IDS,
  mir4NativeUltimateExecutionPlan,
} from '../../src/sim/mir4/native_ultimate_runtime';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed = 14_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Dragon Flame Tester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.setPlayerLevel(120);
  sim.player.mir4UltGauge = 100;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.player.attackPower = 1_000;
  sim.player.resource = 1_000_000;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `dragon_flame_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z + dz),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 native ultimate runtime', () => {
  it('maps each class to its one directly extracted ultimate', () => {
    expect(MIR4_NATIVE_ULTIMATE_SKILL_IDS).toEqual({
      1: 1403,
      2: 2403,
      3: 3303,
      4: 4113,
      5: 5203,
    });
  });

  it('compiles Dragon Flame from the exact native four-contact action', () => {
    const plan = mir4NativeUltimateExecutionPlan(1);

    expect(plan).toMatchObject({
      classId: 1,
      skillId: 1403,
      requiredGauge: 100,
      cooldownMs: 10_000,
      attackAnimationMs: 3_433,
      endCutAnimationMs: 2_950,
      sourceInvincibility: { attackId: 140301, applyAtMs: 20, durationMs: 3_000 },
    });
    expect(plan?.contacts).toEqual([
      { attackId: 140302, sourceImpactIndex: 0, offsetMs: 780, coefficient: 15_000 },
      { attackId: 140303, sourceImpactIndex: 0, offsetMs: 1_500, coefficient: 15_500 },
      { attackId: 140303, sourceImpactIndex: 1, offsetMs: 1_720, coefficient: 15_500 },
      { attackId: 140304, sourceImpactIndex: 0, offsetMs: 2_560, coefficient: 20_000 },
    ]);
  });

  it('uses only the native timeline, cooldown and source buff without invented healing', () => {
    const sim = makeWarrior();
    const target = spawnTarget(sim, 2, 0, 'primary');
    sim.player.hp -= 1_000;
    const hpBefore = sim.player.hp;
    const startedAt = sim.time;
    sim.drainEvents();

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.player.hp).toBe(hpBefore);
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(sim.player.cooldowns.get('mir4_ult')).toBe(10);
    expect(
      sim.player.mir4PendingImpacts?.map((impact) => ({
        attackId: impact.attackId,
        sourceImpactIndex: impact.sourceImpactIndex,
        effectOnly: impact.effectOnly ?? false,
        dueMs: Math.round((impact.dueAt - startedAt) * 1_000),
        rawDamage: impact.rawDamage,
      })),
    ).toEqual([
      {
        attackId: 140301,
        sourceImpactIndex: 0,
        effectOnly: true,
        dueMs: 20,
        rawDamage: 0,
      },
      {
        attackId: 140302,
        sourceImpactIndex: 0,
        effectOnly: false,
        dueMs: 780,
        rawDamage: 1_500,
      },
      {
        attackId: 140303,
        sourceImpactIndex: 0,
        effectOnly: false,
        dueMs: 1_500,
        rawDamage: 1_550,
      },
      {
        attackId: 140303,
        sourceImpactIndex: 1,
        effectOnly: false,
        dueMs: 1_720,
        rawDamage: 1_550,
      },
      {
        attackId: 140304,
        sourceImpactIndex: 0,
        effectOnly: false,
        dueMs: 2_560,
        rawDamage: 2_000,
      },
    ]);

    sim.time = startedAt + 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
  });

  it('rebuilds each contact from the native forward circle instead of only the selected target', () => {
    const sim = makeWarrior(14_031);
    const selected = spawnTarget(sim, 2, 0, 'selected');
    const insideForwardCircle = spawnTarget(sim, 8, 0, 'inside');
    const behindOutsideCircle = spawnTarget(sim, -4, 0, 'outside');
    const insideHp = insideForwardCircle.hp;
    const outsideHp = behindOutsideCircle.hp;

    expect(sim.mir4UltimateCast(selected.id)).toEqual({ ok: true });
    sim.time += 2.57;
    updateMir4PendingImpacts(sim.ctx);

    expect(insideForwardCircle.hp).toBeLessThan(insideHp);
    expect(behindOutsideCircle.hp).toBe(outsideHp);
  });

  it('applies Dragon Flame push, aggregated knock-back, and final knock-down on their contacts', () => {
    const sim = makeWarrior(14_032);
    const target = spawnTarget(sim, 2, 0, 'reactions');
    const sourceX = sim.player.pos.x;
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    const startedAt = sim.time;
    sim.drainEvents();

    sim.time = startedAt + 0.78;
    updateMir4PendingImpacts(sim.ctx);
    const firstContact = sim.drainEvents();
    expect(target.pos.x).toBeCloseTo(sourceX + 5, 8);
    expect(firstContact).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1403,
        attackId: 140302,
        stance: 'hit-01',
        durationMs: 700,
        moveDurationMs: 200,
      }),
    );

    sim.time = startedAt + 1.5;
    updateMir4PendingImpacts(sim.ctx);
    const secondContact = sim.drainEvents();
    expect(target.pos.x).toBeCloseTo(sourceX + 6.2, 8);
    expect(secondContact).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1403,
        attackId: 140303,
        stance: 'hit-01',
        durationMs: 1_000,
        moveDurationMs: 200,
      }),
    );

    sim.time = startedAt + 1.72;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.pos.x).toBeCloseTo(sourceX + 6.2, 8);
    expect(sim.drainEvents().some((event) => event.type === 'mir4HitReaction')).toBe(false);

    const finalDestination = sim.ctx.resolveMove(
      target.pos.x,
      target.pos.z,
      target.pos.x + 5,
      target.pos.z,
      PLAYER_BODY_RADIUS,
      target,
    );
    sim.time = startedAt + 2.56;
    updateMir4PendingImpacts(sim.ctx);
    const finalContact = sim.drainEvents();
    expect(target.pos.x).toBeCloseTo(finalDestination.x, 8);
    expect(target.pos.z).toBeCloseTo(finalDestination.z, 8);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_1403_knockdown',
        kind: 'knockdown',
        duration: 3,
      }),
    );
    expect(finalContact).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1403,
        attackId: 140304,
        stance: 'down-02',
        durationMs: 3_000,
        moveDurationMs: 900,
        heightYards: 3,
      }),
    );
  });

  it('attaches native Dragon Breath only after the final contact lands', () => {
    const sim = makeWarrior(14_033);
    const target = spawnTarget(sim, 2, 0, 'dragon-breath');
    const startedAt = sim.time;
    updateMir4NativePeriodicDamage(sim.ctx);

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    sim.time = startedAt + 2.56;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.mir4NativePeriodicDamage).toMatchObject([
      {
        buffId: 14_011,
        sourceId: sim.player.id,
        skillId: 1_403,
        attackId: 140_304,
        skillLevel: 1,
        entries: [
          { buffIndex: 2_002, channel: 'physical', rawDamage: 100 },
          { buffIndex: 2_001, channel: 'physical', rawDamage: 10 },
        ],
      },
    ]);
    expect(target.mir4NativePeriodicDamage?.[0]?.expiresAt).toBeCloseTo(startedAt + 7.56, 8);

    const hpAfterFinalContact = target.hp;
    sim.time = startedAt + 3.001;
    updateMir4NativePeriodicDamage(sim.ctx);
    updateMir4PendingImpacts(sim.ctx);

    expect(target.hp).toBeLessThan(hpAfterFinalContact);
  });
});
