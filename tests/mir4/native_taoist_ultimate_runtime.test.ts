import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible } from '../../src/sim/mir4/effects';
import { mir4NativeUltimateExecutionPlan } from '../../src/sim/mir4/native_ultimate_runtime';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed = 33_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Light Ray Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.mir4UltGauge = 100;
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
  sim.player.mir4.manaCostStat = 100;
  sim.player.mir4.accuracy = 1_000_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, z: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `light_ray_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 1_000_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Taoist native ultimate runtime', () => {
  it('compiles Light Ray from the exact nine-row native action', () => {
    const plan = mir4NativeUltimateExecutionPlan(3);

    expect(plan).toMatchObject({
      classId: 3,
      skillId: 3303,
      requiredGauge: 100,
      skillCostType: 2,
      skillCost: 7000,
      cooldownMs: 10_000,
      attackAnimationMs: 4000,
      endCutAnimationMs: 3100,
      channel: 'magic',
      sourceInvincibility: {
        attackId: 330301,
        buffId: 36010,
        applyAtMs: 20,
        durationMs: 3000,
        effectId: 'mir4_native_buff_36010',
      },
      sourceControlImmunity: {
        attackId: 330301,
        buffId: 31051,
        applyAtMs: 20,
        durationMs: 5000,
        effectId: 'mir4_native_buff_31051',
      },
      totem: null,
      attackIds: [330301, 330302, 330303, 330304, 330305, 330306, 330307, 330309, 330310],
    });
    expect(plan?.contacts).toEqual([
      {
        attackId: 330303,
        sourceImpactIndex: 0,
        offsetMs: 1060,
        coefficient: 5000,
        damageComponents: [
          { channel: 'physical', coefficient: 2000 },
          { channel: 'magic', coefficient: 3000 },
        ],
      },
      {
        attackId: 330303,
        sourceImpactIndex: 1,
        offsetMs: 1260,
        coefficient: 5000,
        damageComponents: [
          { channel: 'physical', coefficient: 2000 },
          { channel: 'magic', coefficient: 3000 },
        ],
      },
      {
        attackId: 330305,
        sourceImpactIndex: 0,
        offsetMs: 1660,
        coefficient: 5000,
        damageComponents: [
          { channel: 'physical', coefficient: 2000 },
          { channel: 'magic', coefficient: 3000 },
        ],
      },
      {
        attackId: 330305,
        sourceImpactIndex: 1,
        offsetMs: 1860,
        coefficient: 5000,
        damageComponents: [
          { channel: 'physical', coefficient: 2000 },
          { channel: 'magic', coefficient: 3000 },
        ],
      },
      {
        attackId: 330306,
        sourceImpactIndex: 0,
        offsetMs: 2200,
        coefficient: 11000,
        damageComponents: [
          { channel: 'physical', coefficient: 4000 },
          { channel: 'magic', coefficient: 7000 },
        ],
      },
      {
        attackId: 330309,
        sourceImpactIndex: 0,
        offsetMs: 2600,
        coefficient: 13000,
        damageComponents: [
          { channel: 'physical', coefficient: 5000 },
          { channel: 'magic', coefficient: 8000 },
        ],
      },
      {
        attackId: 330310,
        sourceImpactIndex: 0,
        offsetMs: 2800,
        coefficient: 12000,
        damageComponents: [
          { channel: 'physical', coefficient: 5000 },
          { channel: 'magic', coefficient: 7000 },
        ],
      },
    ]);
  });

  it('spends the native gauge and mana, then schedules both channels on the exact seven-contact timeline', () => {
    const sim = makeTaoist();
    const target = spawnTarget(sim, 4, 0, 'timeline');
    const startedAt = sim.time;

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(sim.player.resource).toBe(99_930);
    expect(sim.player.cooldowns.get('mir4_ult')).toBe(10);
    expect(
      sim.player.mir4PendingImpacts?.map((impact) => ({
        attackId: impact.attackId,
        sourceImpactIndex: impact.sourceImpactIndex,
        dueMs: Math.round((impact.dueAt - startedAt) * 1000),
        rawDamage: impact.rawDamage,
        effectOnly: impact.effectOnly ?? false,
        channel: impact.channel,
        contactKey: impact.nativeContactKey ?? null,
      })),
    ).toEqual([
      {
        attackId: 330301,
        sourceImpactIndex: 0,
        dueMs: 20,
        rawDamage: 0,
        effectOnly: true,
        channel: 'magic',
        contactKey: null,
      },
      ...[
        [330303, 0, 1060, 200, 'physical'],
        [330303, 0, 1060, 300, 'magic'],
        [330303, 1, 1260, 200, 'physical'],
        [330303, 1, 1260, 300, 'magic'],
        [330305, 0, 1660, 200, 'physical'],
        [330305, 0, 1660, 300, 'magic'],
        [330305, 1, 1860, 200, 'physical'],
        [330305, 1, 1860, 300, 'magic'],
        [330306, 0, 2200, 400, 'physical'],
        [330306, 0, 2200, 700, 'magic'],
        [330309, 0, 2600, 500, 'physical'],
        [330309, 0, 2600, 800, 'magic'],
        [330310, 0, 2800, 500, 'physical'],
        [330310, 0, 2800, 700, 'magic'],
      ].map(([attackId, sourceImpactIndex, dueMs, rawDamage, channel]) => ({
        attackId,
        sourceImpactIndex,
        dueMs,
        rawDamage,
        effectOnly: false,
        channel,
        contactKey: `${sim.player.id}:ultimate:0:${target.id}:contact:${attackId}:${sourceImpactIndex}`,
      })),
    ]);

    sim.time = startedAt + 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_31051',
        kind: 'control-immunity',
        duration: 5,
      }),
    );
  });

  it('rebuilds each forward area contact and caps it at ten hostiles', () => {
    const sim = makeTaoist(33_031);
    const targets = Array.from({ length: 11 }, (_, index) =>
      spawnTarget(sim, 3 + (index % 5) * 0.3, (index % 2) * 0.3, `cap_${index}`),
    );
    const behind = spawnTarget(sim, -3, 0, 'behind');
    const hpBefore = new Map([...targets, behind].map((target) => [target.id, target.hp]));
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.5);

    const firstTarget = targets[0];
    const excludedTarget = targets[10];
    if (!firstTarget || !excludedTarget) throw new Error('missing Light Ray cap fixtures');
    expect(sim.mir4UltimateCast(firstTarget.id)).toEqual({ ok: true });
    sim.time += 1.06;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.filter((target) => target.hp < (hpBefore.get(target.id) ?? 0))).toHaveLength(10);
    expect(excludedTarget.hp).toBe(hpBefore.get(excludedTarget.id));
    expect(behind.hp).toBe(hpBefore.get(behind.id));
  });

  it('applies the native knock-back, attack-back and final knock-down once per hybrid contact', () => {
    const knockbackSim = makeTaoist(33_032);
    const knockbackTarget = spawnTarget(knockbackSim, 4, 0, 'knockback');
    vi.spyOn(knockbackSim.ctx.rng, 'next').mockReturnValue(0);

    expect(knockbackSim.mir4UltimateCast(knockbackTarget.id)).toEqual({ ok: true });
    knockbackSim.drainEvents();
    knockbackSim.time += 1.06;
    updateMir4PendingImpacts(knockbackSim.ctx);
    expect(
      knockbackSim.drainEvents().filter((event) => event.type === 'mir4HitReaction'),
    ).toHaveLength(1);

    const attackBackSim = makeTaoist(33_033);
    const attackBackTarget = spawnTarget(attackBackSim, 4, 0, 'attack_back');
    vi.spyOn(attackBackSim.ctx.rng, 'next').mockReturnValue(0);
    expect(attackBackSim.mir4UltimateCast(attackBackTarget.id)).toEqual({ ok: true });
    attackBackSim.drainEvents();
    attackBackSim.time += 1.66;
    updateMir4PendingImpacts(attackBackSim.ctx);
    expect(
      attackBackSim
        .drainEvents()
        .filter((event) => event.type === 'mir4HitReaction' && event.attackId === 330305),
    ).toHaveLength(1);

    const knockdownSim = makeTaoist(33_034);
    const knockdownTarget = spawnTarget(knockdownSim, 4, 0, 'knockdown');
    vi.spyOn(knockdownSim.ctx.rng, 'next').mockReturnValue(0);
    expect(knockdownSim.mir4UltimateCast(knockdownTarget.id)).toEqual({ ok: true });
    knockdownSim.time += 2.6;
    updateMir4PendingImpacts(knockdownSim.ctx);
    expect(knockdownTarget.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_3303_knockdown',
        kind: 'knockdown',
        duration: 3,
      }),
    );
  });
});
