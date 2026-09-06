import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible } from '../../src/sim/mir4/effects';
import {
  mir4NativeArbalistFocusCriticalBonus,
  updateMir4NativeArbalistFocus,
} from '../../src/sim/mir4/native_skill_quick_shot';
import { mir4NativeUltimateExecutionPlan } from '../../src/sim/mir4/native_ultimate_runtime';
import { mir4SkillManaCost } from '../../src/sim/mir4/math';
import { mir4ModifiedManaCost } from '../../src/sim/mir4/status_effects';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { updateMir4SkillActions } from '../../src/sim/mir4/skill_action_scheduler';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_130): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Arrow Rain Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.mir4UltGauge = 100;
  sim.player.maxResource = 1_000_000;
  sim.player.resource = 1_000_000;
  sim.player.attackPower = 1_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, dx: number, dz: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `arrow_rain_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z + dz),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 10_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Arbalist 4113 Arrow Rain integrated runtime', () => {
  it('compiles the exact setup and five-contact action plan', () => {
    expect(mir4NativeUltimateExecutionPlan(4)).toEqual({
      classId: 4,
      skillId: 4113,
      requiredGauge: 100,
      skillCostType: 2,
      skillCost: 7000,
      cooldownMs: 10_000,
      attackAnimationMs: 2933,
      endCutAnimationMs: 2560,
      channel: 'physical',
      sourceInvincibility: {
        attackId: 411301,
        buffId: 24031,
        applyAtMs: 300,
        durationMs: 3000,
        effectId: 'mir4_native_buff_24031',
        name: 'Arrow Rain',
      },
      sourceFocus: { attackId: 411301, buffId: 41010, applyAtMs: 300 },
      sourceControlImmunity: null,
      totem: null,
      contacts: [
        { attackId: 411302, sourceImpactIndex: 0, offsetMs: 539, coefficient: 13_000 },
        { attackId: 411303, sourceImpactIndex: 0, offsetMs: 913, coefficient: 13_000 },
        { attackId: 411304, sourceImpactIndex: 0, offsetMs: 1283, coefficient: 13_000 },
        { attackId: 411305, sourceImpactIndex: 0, offsetMs: 1644, coefficient: 13_000 },
        { attackId: 411306, sourceImpactIndex: 0, offsetMs: 2010, coefficient: 13_000 },
      ],
      attackIds: [411301, 411302, 411303, 411304, 411305, 411306],
    });
  });

  it('spends the exact resources and applies Invincible plus one Focus at 300 ms', () => {
    const sim = makeArbalist(41_131);
    const target = spawnTarget(sim, 'setup', 2, 0);
    const resourceBefore = sim.player.resource;
    const mir4 = sim.player.mir4;
    if (!mir4) throw new Error('missing MIR4 player stats');
    const expectedCost = mir4ModifiedManaCost(
      mir4SkillManaCost(mir4.manaCostStat, 7000, 2),
      mir4.statusValues,
    );
    const startedAt = sim.time;

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(sim.player.resource).toBe(resourceBefore - expectedCost);
    expect(sim.player.cooldowns.get('mir4_ult')).toBe(10);
    expect(
      sim.player.mir4PendingImpacts?.map((impact) => [
        impact.attackId,
        Math.round((impact.dueAt - startedAt) * 1000),
        impact.effectOnly ?? false,
        impact.rawDamage,
      ]),
    ).toEqual([
      [411301, 300, true, 0],
      [411302, 539, false, 1300],
      [411303, 913, false, 1300],
      [411304, 1283, false, 1300],
      [411305, 1644, false, 1300],
      [411306, 2010, false, 1300],
    ]);

    sim.time = startedAt + 0.3;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
    expect(mir4NativeArbalistFocusCriticalBonus(sim.player)).toBe(0);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_41010', nativeStacks: 1 }),
    );
    sim.player.inCombat = false;
    updateMir4NativeArbalistFocus(sim.ctx);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_41010', nativeStacks: 1 }),
    );
  });

  it('approaches a remote selected target to the native 11.5-yard trace stop', () => {
    const sim = makeArbalist(41_132);
    const target = spawnTarget(sim, 'approach', 30, 0);
    sim.player.targetId = target.id;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_ultimate_4', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation?.phase).toBe('approach');

    for (let tick = 0; tick < 300 && (sim.player.mir4UltGauge ?? 0) > 0; tick += 1) sim.tick();
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(dist2d(sim.player.pos, target.pos)).toBeGreaterThanOrEqual(11.4);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
  });

  it('recedes one yard on each authored wave while preserving cast facing', () => {
    const sim = makeArbalist(41_133);
    const target = spawnTarget(sim, 'motion', 2, 0);
    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    const start = { ...sim.player.pos };
    expect(sim.player.facing).toBeCloseTo(Math.PI / 2, 8);

    for (let tick = 0; tick < 45; tick += 1) {
      sim.tickCount += 1;
      updateMir4SkillActions(sim.ctx);
    }
    expect(sim.player.pos.x).toBeCloseTo(start.x - 5, 2);
    expect(sim.player.pos.z).toBeCloseTo(start.z, 2);
  });

  it('rebuilds every wave as an actor-centered forward sector capped at ten enemies', () => {
    const sim = makeArbalist(41_134);
    const forward = Array.from({ length: 11 }, (_, index) =>
      spawnTarget(sim, `forward_${index}`, 2 + index * 0.1, index * 0.03),
    );
    const behind = spawnTarget(sim, 'behind', -2, 0);
    const side = spawnTarget(sim, 'side', 0, 10);
    const hpBefore = new Map(forward.map((target) => [target.id, target.hp]));
    const behindHp = behind.hp;
    const sideHp = side.hp;
    const selected = forward[0];
    if (!selected) throw new Error('missing selected target');

    expect(sim.mir4UltimateCast(selected.id)).toEqual({ ok: true });
    sim.player.facing = 0;
    sim.time += 0.54;
    updateMir4PendingImpacts(sim.ctx);

    expect(forward.filter((target) => target.hp < (hpBefore.get(target.id) ?? 0))).toHaveLength(10);
    expect(behind.hp).toBe(behindHp);
    expect(side.hp).toBe(sideHp);
  });

  it('applies only the two authored knock-backs and generic hit reactions on later waves', () => {
    const sim = makeArbalist(41_135);
    const target = spawnTarget(sim, 'reaction', 2, 0);
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    const startX = target.pos.x;

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    const startedAt = sim.time;
    sim.drainEvents();

    sim.time = startedAt + 0.539;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.pos.x).toBeCloseTo(startX + 0.4, 8);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 4113,
        attackId: 411302,
        stance: 'hit-01',
      }),
    );

    sim.time = startedAt + 0.913;
    updateMir4PendingImpacts(sim.ctx);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 4113,
        attackId: 411303,
        stance: 'hit-01',
      }),
    );

    sim.time = startedAt + 1.283;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.pos.x).toBeCloseTo(startX + 0.6, 8);
  });
});
