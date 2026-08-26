import { afterAll, describe, expect, it, vi } from 'vitest';
import { VEILBOUND_MARCH_ID } from '../../src/sim/combat/paladin_veilbound_state';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  applyMir4Effect,
  MIR4_CONTROL_IMMUNITY_TAIL_SECONDS,
  mir4DamageTakenAddend,
  mir4EffectAdmits,
  mir4MovementMultiplier,
  mir4MovementMultiplierFromShared,
} from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

// Phase 3.1: the mir4 effect/CC engine and the full warrior kit's effect
// surface, pinned against the source's crowd-control policy (dedup by
// effectId, 750ms post-expiry hard-control immunity) and controlState
// magnitudes (defense-break raises damage taken; slow cuts movement).

function makeSim(seed = 61): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  sim.mir4UnequipSlot(1);
  sim.mir4UnequipSlot(5);
  sim.player.level = 40;
  return sim;
}

function spawnWolf(sim: Sim, dx: number, dz: number): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + dx, p.pos.z + dz),
  );
  sim.addEntity(wolf);
  return wolf;
}

function makeClassSim(seed: number, playerClassMir4: Mir4ClassKey): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4,
    playerName: 'AreaTester',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  sim.player.level = 40;
  return sim;
}

function spawnTankWolf(sim: Sim, x: number, z: number, id: string): Entity {
  const wolf = createMob(
    sim.nextId++,
    {
      ...MIR4_MOBS.mir4_forest_wolf,
      id,
      hpBase: 5000,
      hpPerLevel: 0,
      moveSpeed: 0,
    } as never,
    1,
    sim.groundPos(x, z),
  );
  wolf.wanderTimer = 999999;
  sim.addEntity(wolf);
  return wolf;
}

function resolveContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
  updateMir4PendingImpacts(sim.ctx);
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 effect engine', () => {
  it('dedups by effectId and arms the 750ms hard-control immunity tail', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const wolf = spawnWolf(sim, 2, 0);
    const spec = {
      effectId: 'test_stun',
      kind: 'stun' as const,
      durationSeconds: 0.9,
      name: 'Test Stun',
      sourceId: sim.playerId,
    };
    expect(applyMir4Effect(sim.ctx, wolf, spec)).toEqual({ ok: true });
    expect(applyMir4Effect(sim.ctx, wolf, spec).ok).toBe(false); // dedup
    // Hard control mirrors into the classic stun aura for the shared AI.
    expect(wolf.auras.some((a) => a.kind === 'stun')).toBe(true);
    // Burn the 0.9s stun off; the 0.75s tail still blocks hard control...
    for (let i = 0; i < 18; i++) sim.tick();
    expect(wolf.mir4Effects?.active.length).toBe(0);
    expect(wolf.mir4Effects?.controlImmuneUntil ?? 0).toBeGreaterThan(sim.ctx.time);
    expect(mir4EffectAdmits(wolf, 'other_stun', 'knockdown', sim.ctx.time).ok).toBe(false);
    // ...but a debuff (no hard control) lands fine during the tail.
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'test_break',
        kind: 'defense-break',
        durationSeconds: 4,
        magnitude: 0.12,
        name: 'Break',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    expect(mir4DamageTakenAddend(wolf)).toBe(0.12);
  });
  it('slow cuts movement through the multiplier; magnitude compounds nothing else', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(62);
    const wolf = spawnWolf(sim, 3, 0);
    expect(mir4MovementMultiplier(wolf)).toBe(1);
    applyMir4Effect(sim.ctx, wolf, {
      effectId: 'test_slow',
      kind: 'slow',
      durationSeconds: 3.2,
      magnitude: 0.35,
      name: 'Slow',
      sourceId: sim.playerId,
    });
    expect(mir4MovementMultiplier(wolf)).toBeCloseTo(0.65, 10);
    expect(wolf.auras.find((aura) => aura.id === 'test_slow')?.value).toBeCloseTo(0.65, 10);
    expect(mir4DamageTakenAddend(wolf)).toBe(0);
  });
  it('does not reapply a MIR4 slow that the shared slow-immunity aura rejected', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6201);
    const wolf = spawnWolf(sim, 3, 0);
    wolf.auras.push({
      id: 'test_slow_immunity',
      name: 'Slow Immunity',
      kind: 'slow_immunity',
      remaining: 3,
      duration: 3,
      value: 1,
      sourceId: wolf.id,
      school: 'physical',
    });
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'immune_mir4_slow',
        kind: 'slow',
        durationSeconds: 3,
        magnitude: 0.35,
        name: 'Rejected Slow Mirror',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    expect(wolf.auras.some((aura) => aura.id === 'immune_mir4_slow')).toBe(false);
    const sharedMultiplier = sim.moveSpeedMult(wolf);
    expect(sharedMultiplier).toBe(1);
    expect(mir4MovementMultiplierFromShared(wolf, sharedMultiplier)).toBe(sharedMultiplier);
  });
  it('does not reapply slow products during Veilbound March', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6202);
    const wolf = spawnWolf(sim, 3, 0);
    wolf.auras.push(
      {
        id: 'classic_slow_before_march',
        name: 'Classic Slow',
        kind: 'slow',
        remaining: 3,
        duration: 3,
        value: 0.5,
        sourceId: sim.playerId,
        school: 'physical',
      },
      {
        id: VEILBOUND_MARCH_ID,
        name: 'Veilbound March',
        kind: 'buff_speed',
        remaining: 3,
        duration: 3,
        value: 1,
        sourceId: wolf.id,
        school: 'holy',
      },
    );
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'march_mir4_slow',
        kind: 'slow',
        durationSeconds: 3,
        magnitude: 0.35,
        name: 'March Slow',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    const sharedMultiplier = sim.moveSpeedMult(wolf);
    expect(sharedMultiplier).toBe(1);
    expect(mir4MovementMultiplierFromShared(wolf, sharedMultiplier)).toBe(sharedMultiplier);
  });
  it('migrates a legacy active hard-control tail without extending its deadline', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(621);
    const wolf = spawnWolf(sim, 3, 0);
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'legacy_deadline_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'Legacy deadline stun',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    const originalDeadline = wolf.mir4Effects?.controlImmuneUntil;
    expect(originalDeadline).toBe(1.75);
    if (!wolf.mir4Effects) throw new Error('legacy effect bag missing');
    wolf.mir4Effects.controlImmunityByEffectId = undefined;

    sim.tick();

    expect(wolf.mir4Effects?.controlImmuneUntil).toBe(originalDeadline);
  });
});

describe('the warrior kit effect surface (phase 3.1)', () => {
  it('1104 lands knockdown (1.2s hard control) with its exact damage', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(63);
    const wolf = spawnWolf(sim, 2, 0);
    const hpBefore = wolf.hp;
    expect(sim.mir4CastSkill(1104, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    // 21000 coefficient at PA 50: floor(50*21000/10000) = 105, one impact.
    expect(hpBefore - wolf.hp).toBe(105);
    const knockdown = wolf.mir4Effects?.active.find((f) => f.kind === 'knockdown');
    expect(knockdown?.duration).toBe(1.2);
    expect(wolf.auras.some((a) => a.kind === 'stun')).toBe(true);
  });
  it('1304 lands defense-break (+12% taken) and the next 1102 hits 12% harder', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(64);
    const wolf = spawnWolf(sim, 2, 0);
    sim.mir4CastSkill(1304, wolf.id); // 22000 coef: 110 damage + break 4.5s
    resolveContacts(sim);
    const brk = wolf.mir4Effects?.active.find((f) => f.kind === 'defense-break');
    expect(brk?.duration).toBe(4.5);
    expect(brk?.magnitude).toBe(0.12);
    for (let i = 0; i < 20; i++) sim.tick(); // clear the 1s GCD
    sim.mir4CastSkill(1102, wolf.id);
    resolveContacts(sim);
    // 17 hp left; the buffed 1102 (floor(125*1.12) = 140) overkills: the
    // taken-addend math is pinned by the +12% engine test, here it kills.
    expect(wolf.dead).toBe(true);
  });
  it('1401 hits the primary and AoE-cleaves up to 3 nearby wolves at 7000bps', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(65);
    const primary = spawnWolf(sim, 2, 0);
    const near1 = spawnWolf(sim, 3.5, 1);
    const near2 = spawnWolf(sim, 0.5, 1);
    const far = spawnWolf(sim, 30, 20); // outside the 7yd (112px) radius
    for (const wolf of [primary, near1, near2, far]) {
      wolf.maxHp = 5_000;
      wolf.hp = wolf.maxHp;
    }
    const before = new Map<number, number>([
      [primary.id, primary.hp],
      [near1.id, near1.hp],
      [near2.id, near2.hp],
      [far.id, far.hp],
    ]);
    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });
    resolveContacts(sim);
    // Primary: 25000 coef = 125 + knockdown 0.8s.
    expect(before.get(primary.id)! - primary.hp).toBe(125);
    expect(
      primary.mir4Effects?.active.some((f) => f.kind === 'knockdown' && f.duration === 0.8),
    ).toBe(true);
    // Each secondary: floor(125 * 7000/10000) = 87.
    expect(before.get(near1.id)! - near1.hp).toBe(87);
    expect(before.get(near2.id)! - near2.hp).toBe(87);
    expect(far.hp).toBe(before.get(far.id));
  });
  it('requires line of sight for admission and for every AoE secondary', () => {
    const sim = makeClassSim(651, 'warrior');
    const p = sim.player;
    p.pos = sim.groundPos(27, 0);
    const primary = spawnTankWolf(sim, 27, 2, 'visible_primary');
    const visible = spawnTankWolf(sim, 27, -2, 'visible_secondary');
    const covered = spawnTankWolf(sim, 30, 0, 'covered_secondary');
    const originalHasLineOfSight = sim.ctx.hasLineOfSight;
    sim.ctx.hasLineOfSight = (_attacker, target) => target.id !== covered.id;
    expect(sim.ctx.hasLineOfSight(p, primary)).toBe(true);
    expect(sim.ctx.hasLineOfSight(p, visible)).toBe(true);
    expect(sim.ctx.hasLineOfSight(p, covered)).toBe(false);
    const draws = vi.spyOn(sim.rng, 'next').mockReturnValue(0.5);

    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });
    resolveContacts(sim);

    sim.ctx.hasLineOfSight = originalHasLineOfSight;
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(visible.hp).toBeLessThan(visible.maxHp);
    expect(visible.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(true);
    expect(covered.hp).toBe(covered.maxHp);
    expect(covered.mir4Effects?.active ?? []).toHaveLength(0);
    expect(draws).toHaveBeenCalledTimes(4);
  });
  it('rejects distant AoE candidates before tracing their line of sight', () => {
    const sim = makeClassSim(6511, 'warrior');
    const p = sim.player;
    const primary = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'los_budget_primary');
    spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, 'los_budget_secondary');
    const distant = spawnTankWolf(sim, p.pos.x + 100, p.pos.z, 'los_budget_distant');
    const checkedIds: number[] = [];
    sim.ctx.hasLineOfSight = (_attacker, target) => {
      checkedIds.push(target.id);
      return true;
    };

    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });

    expect(checkedIds).not.toContain(distant.id);
  });
  it.each([
    ['elementalist', 2501, 'freeze', 8],
    ['taoist', 3506, 'root', 7],
    ['arbalist', 4103, 'blind', 7.5],
    ['lancer', 5201, 'stun', 7],
  ] as const)(
    'casts the %s actor-centered AoE %i without a selected target',
    (cls, skillId, effectKind, radius) => {
      const sim = makeClassSim(652 + skillId, cls);
      const p = sim.player;
      const primary = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, `${skillId}_primary`);
      const secondary = spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, `${skillId}_secondary`);
      const friendly = spawnTankWolf(sim, p.pos.x + 3, p.pos.z - 1, `${skillId}_friendly`);
      friendly.hostile = false;
      const outside = spawnTankWolf(sim, p.pos.x + radius + 0.01, p.pos.z, `${skillId}_outside`);
      sim.ctx.hasLineOfSight = () => true;

      expect(sim.mir4CastSkill(skillId)).toEqual({ ok: true });
      resolveContacts(sim);

      expect(p.cooldowns.has(String(skillId))).toBe(true);
      expect(primary.hp).toBeLessThan(primary.maxHp);
      expect(secondary.hp).toBeLessThan(secondary.maxHp);
      expect(primary.mir4Effects?.active.some((effect) => effect.kind === effectKind)).toBe(true);
      expect(secondary.mir4Effects?.active.some((effect) => effect.kind === effectKind)).toBe(true);
      expect(friendly.hp).toBe(friendly.maxHp);
      expect(friendly.mir4Effects?.active ?? []).toHaveLength(0);
      expect(outside.hp).toBe(outside.maxHp);
      expect(outside.mir4Effects?.active ?? []).toHaveLength(0);
    },
  );
  it.each([
    ['elementalist', 2501, 'freeze', 8],
    ['taoist', 3506, 'root', 7],
    ['arbalist', 4103, 'blind', 7.5],
    ['lancer', 5201, 'stun', 7],
  ] as const)(
    'includes the exact %s actor-area boundary for skill %i',
    (cls, skillId, effectKind, radius) => {
      const sim = makeClassSim(1652 + skillId, cls);
      const p = sim.player;
      const edge = spawnTankWolf(sim, p.pos.x + radius, p.pos.z, `${skillId}_exact_edge`);
      const outside = spawnTankWolf(
        sim,
        p.pos.x + radius + 0.01,
        p.pos.z,
        `${skillId}_beyond_edge`,
      );
      sim.ctx.hasLineOfSight = () => true;

      expect(sim.mir4CastSkill(skillId)).toEqual({ ok: true });
      resolveContacts(sim);

      expect(edge.mir4Effects?.active.some((effect) => effect.kind === effectKind)).toBe(true);
      expect(outside.hp).toBe(outside.maxHp);
      expect(outside.mir4Effects?.active ?? []).toHaveLength(0);
    },
  );
  it('includes a hostile player, but never a friendly player, in targeted AoE fan-out', () => {
    const sim = makeClassSim(653, 'warrior');
    const p = sim.player;
    const primary = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, 'player_fanout_primary');
    const hostilePid = sim.addPlayer('elementalist', 'HostileSecondary');
    const friendlyPid = sim.addPlayer('taoist', 'FriendlySecondary');
    const hostile = sim.entities.get(hostilePid)!;
    const friendly = sim.entities.get(friendlyPid)!;
    hostile.pos = sim.groundPos(p.pos.x + 3, p.pos.z + 1);
    friendly.pos = sim.groundPos(p.pos.x + 3, p.pos.z - 1);
    const originalIsHostileTo = sim.ctx.isHostileTo;
    sim.ctx.isHostileTo = (attacker, target) =>
      attacker.id === p.id && (target.id === primary.id || target.id === hostile.id);
    const hostileHp = hostile.hp;
    const friendlyHp = friendly.hp;

    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });
    resolveContacts(sim);

    sim.ctx.isHostileTo = originalIsHostileTo;
    expect(hostile.hp).toBeLessThan(hostileHp);
    expect(friendly.hp).toBe(friendlyHp);
  });
  it('the immunity tail pins to the source constant', () => {
    expect(MIR4_CONTROL_IMMUNITY_TAIL_SECONDS).toBe(0.75);
  });
});
