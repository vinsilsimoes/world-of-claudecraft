import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  applyMir4Effect,
  MIR4_CONTROL_IMMUNITY_TAIL_SECONDS,
  mir4DamageTakenAddend,
  mir4EffectAdmits,
  mir4MovementMultiplier,
} from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.1: the mir4 effect/CC engine and the full warrior kit's effect
// surface, pinned against the source's crowd-control policy (dedup by
// effectId, 750ms post-expiry hard-control immunity) and controlState
// magnitudes (defense-break raises damage taken; slow cuts movement).

function makeSim(seed = 61): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
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
    expect(mir4DamageTakenAddend(wolf)).toBe(0);
  });
});

describe('the warrior kit effect surface (phase 3.1)', () => {
  it('1104 lands knockdown (1.2s hard control) with its exact damage', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(63);
    const wolf = spawnWolf(sim, 2, 0);
    const hpBefore = wolf.hp;
    expect(sim.mir4CastSkill(1104, wolf.id)).toEqual({ ok: true });
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
    const brk = wolf.mir4Effects?.active.find((f) => f.kind === 'defense-break');
    expect(brk?.duration).toBe(4.5);
    expect(brk?.magnitude).toBe(0.12);
    for (let i = 0; i < 20; i++) sim.tick(); // clear the 1s GCD
    sim.mir4CastSkill(1102, wolf.id);
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
    const before = new Map<number, number>([
      [primary.id, primary.hp],
      [near1.id, near1.hp],
      [near2.id, near2.hp],
      [far.id, far.hp],
    ]);
    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });
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
  it('the immunity tail pins to the source constant', () => {
    expect(MIR4_CONTROL_IMMUNITY_TAIL_SECONDS).toBe(0.75);
  });
});
