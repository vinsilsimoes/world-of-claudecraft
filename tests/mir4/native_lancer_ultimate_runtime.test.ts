import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible } from '../../src/sim/mir4/effects';
import { mir4NativeUltimateExecutionPlan } from '../../src/sim/mir4/native_ultimate_runtime';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(seed = 52_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Dragon Spear Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, {
    x: DUNGEON_X_THRESHOLD + 100,
    z: 2_900,
  });
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

function spawnTarget(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `dragon_spear_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4MagicDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + forward, sim.player.pos.z + side),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 10_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Lancer 5203 Dragon Spear integrated runtime', () => {
  it('compiles the exact setup and one-contact hybrid action plan', () => {
    expect(mir4NativeUltimateExecutionPlan(5)).toEqual({
      classId: 5,
      skillId: 5203,
      requiredGauge: 100,
      skillCostType: 2,
      skillCost: 7000,
      cooldownMs: 10_000,
      attackAnimationMs: 2405,
      endCutAnimationMs: 1910,
      channel: 'physical',
      sourceInvincibility: {
        attackId: 520301,
        buffId: 53012,
        applyAtMs: 20,
        durationMs: 2000,
        effectId: 'mir4_native_buff_53012',
        name: 'Dragon Spear',
      },
      sourceFocus: null,
      sourceControlImmunity: null,
      totem: null,
      contacts: [
        {
          attackId: 520302,
          sourceImpactIndex: 0,
          offsetMs: 1320,
          coefficient: 70_000,
          damageComponents: [
            { channel: 'physical', coefficient: 30_000 },
            { channel: 'magic', coefficient: 40_000 },
          ],
        },
      ],
      attackIds: [520301, 520302],
    });
  });

  it('spends the native resources and applies Invincibility at 20 ms', () => {
    const sim = makeLancer(52_031);
    const target = spawnTarget(sim, 2, 0, 'setup');
    const startedAt = sim.time;

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(sim.player.resource).toBe(99_930);
    expect(sim.player.cooldowns.get('mir4_ult')).toBe(10);
    expect(
      sim.player.mir4PendingImpacts?.map((impact) => ({
        attackId: impact.attackId,
        dueMs: Math.round((impact.dueAt - startedAt) * 1000),
        rawDamage: impact.rawDamage,
        effectOnly: impact.effectOnly ?? false,
        channel: impact.channel,
        contactKey: impact.nativeContactKey ?? null,
      })),
    ).toEqual([
      {
        attackId: 520301,
        dueMs: 20,
        rawDamage: 0,
        effectOnly: true,
        channel: 'physical',
        contactKey: null,
      },
      {
        attackId: 520302,
        dueMs: 1320,
        rawDamage: 3000,
        effectOnly: false,
        channel: 'physical',
        contactKey: `${sim.player.id}:ultimate:0:${target.id}:contact:520302:0`,
      },
      {
        attackId: 520302,
        dueMs: 1320,
        rawDamage: 4000,
        effectOnly: false,
        channel: 'magic',
        contactKey: `${sim.player.id}:ultimate:0:${target.id}:contact:520302:0`,
      },
    ]);

    sim.time = startedAt + 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_53012',
        kind: 'invincible',
        duration: 2,
      }),
    );
  });

  it('approaches a remote selected target to the native 15.1-yard trace stop', () => {
    const sim = makeLancer(52_032);
    const target = spawnTarget(sim, 30, 0, 'approach');
    sim.player.targetId = target.id;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_ultimate_5', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation?.phase).toBe('approach');

    for (let tick = 0; tick < 300 && (sim.player.mir4UltGauge ?? 0) > 0; tick += 1) sim.tick();
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(dist2d(sim.player.pos, target.pos)).toBeGreaterThanOrEqual(14.9);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(15.1);
  });

  it('rebuilds the 17 by 4.5 yard frontal strip and caps it at eight enemies', () => {
    const sim = makeLancer(52_033);
    const forward = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(sim, 2 + index * 0.1, (index % 2) * 0.1, `cap_${index}`),
    );
    const behind = spawnTarget(sim, -4, 0, 'behind');
    const side = spawnTarget(sim, 2, 5, 'side');
    const hpBefore = new Map([...forward, behind, side].map((target) => [target.id, target.hp]));
    const selected = forward[0];
    if (!selected) throw new Error('missing Dragon Spear target');
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.5);

    expect(sim.mir4UltimateCast(selected.id)).toEqual({ ok: true });
    sim.time += 1.32;
    updateMir4PendingImpacts(sim.ctx);

    expect(forward.filter((target) => target.hp < (hpBefore.get(target.id) ?? 0))).toHaveLength(8);
    expect(behind.hp).toBe(hpBefore.get(behind.id));
    expect(side.hp).toBe(hpBefore.get(side.id));
  });

  it('applies one three-second knockdown and four-yard hurl for the hybrid contact', () => {
    const sim = makeLancer(52_034);
    const target = spawnTarget(sim, 2, 0, 'reaction');
    const startX = target.pos.x;
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    sim.drainEvents();
    sim.time += 1.32;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.pos.x).toBeCloseTo(startX + 4, 8);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_5203_knockdown',
        kind: 'knockdown',
        duration: 3,
      }),
    );
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'mir4HitReaction' && event.attackId === 520302),
    ).toEqual([
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5203,
        stance: 'down-02',
        durationMs: 3000,
        moveDurationMs: 900,
        heightYards: 1,
      }),
    ]);
  });
});
