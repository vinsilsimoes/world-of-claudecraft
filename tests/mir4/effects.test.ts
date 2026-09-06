import { afterAll, describe, expect, it, vi } from 'vitest';
import { VEILBOUND_MARCH_ID } from '../../src/sim/combat/paladin_veilbound_state';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { MOBS, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  applyMir4Effect,
  MIR4_CONTROL_IMMUNITY_TAIL_SECONDS,
  MIR4_HARD_CONTROL_BUDGET_IMMUNITY_SECONDS,
  MIR4_HARD_CONTROL_BUDGET_SECONDS,
  MIR4_HARD_CONTROL_BUDGET_WINDOW_SECONDS,
  MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER,
  MIR4_HARD_CONTROL_REAPPLY_WINDOW_SECONDS,
  mir4AttackMultiplier,
  mir4BurnDamagePerTick,
  mir4DamageTakenAddend,
  mir4DefenseMultiplier,
  mir4EffectAdmits,
  mir4HardControlled,
  mir4MovementMultiplier,
  mir4MovementMultiplierFromShared,
  mir4Rooted,
  mir4Silenced,
  updateMir4Effects,
} from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

// Phase 3.1: the mir4 effect/CC engine and the full warrior kit's effect
// surface, pinned against the source's crowd-control policy (dedup by
// effectId, 750ms post-expiry hard-control immunity) and controlState
// magnitudes (defense-break lowers defense; slow cuts movement).

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
  sim.player.level = 120;
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
  sim.player.level = 120;
  return sim;
}

function spawnTankWolf(sim: Sim, x: number, z: number, id: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
    hpBase: 5000,
    hpPerLevel: 0,
    moveSpeed: 0,
  };
  sim.mir4RuntimeMobTemplates.set(id, template);
  const wolf = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  wolf.wanderTimer = 999999;
  sim.addEntity(wolf);
  return wolf;
}

function spawnRuntimeDefenseMob(sim: Sim, x: number, z: number, id: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
    minLevel: 40,
    maxLevel: 40,
    statAnchorLevel: 40,
    hpBase: 5_000,
    hpPerLevel: 0,
    moveSpeed: 0,
    mir4PhysicalDefense: 100,
    mir4MagicDefense: 100,
    mir4Dodge: 0,
    mir4AvoidCritical: 0,
  };
  sim.mir4RuntimeMobTemplates.set(id, template);
  const mob = createMob(sim.nextId++, template, 40, sim.groundPos(x, z));
  mob.wanderTimer = 999999;
  sim.addEntity(mob);
  return mob;
}

function giveMobMir4Defenses(
  sim: Sim,
  target: Entity,
  physicalDefense: number,
  magicDefense: number,
): void {
  target.mir4 = {
    ...sim.player.mir4!,
    statusValues: Object.freeze({}),
    dodge: 0,
    avoidCritical: 0,
    physicalDefense,
    magicDefense,
    penetrationDefenseBps: 0,
    pvpDamageReductionBps: 0,
    monsterDamageReductionBps: 0,
    bossDamageReductionBps: 0,
    allDamageReductionBps: 0,
    skillDamageReductionBps: 0,
  };
}

function resolveContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
  updateMir4PendingImpacts(sim.ctx);
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 effect engine', () => {
  it('pins every temporal hard-control contract to literal values', () => {
    expect(MIR4_CONTROL_IMMUNITY_TAIL_SECONDS).toBe(0.75);
    expect(MIR4_HARD_CONTROL_REAPPLY_WINDOW_SECONDS).toBe(6);
    expect(MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER).toBe(0.7);
    expect(MIR4_HARD_CONTROL_BUDGET_WINDOW_SECONDS).toBe(8);
    expect(MIR4_HARD_CONTROL_BUDGET_SECONDS).toBe(3);
    expect(MIR4_HARD_CONTROL_BUDGET_IMMUNITY_SECONDS).toBe(2.5);
  });

  it('changes hard-control reapplication exactly at 6 seconds', () => {
    const reappliedDuration = (elapsedSeconds: number): number => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(6_000 + Math.round(elapsedSeconds * 1_000));
      const wolf = spawnWolf(sim, 2, 0);
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'window_first',
        kind: 'stun',
        durationSeconds: 0.1,
        name: 'Window First',
        sourceId: sim.playerId,
      });
      sim.time = elapsedSeconds;
      wolf.auras = [];
      wolf.mir4Effects!.active = [];
      wolf.mir4Effects!.controlImmuneUntil = 0;
      wolf.mir4Effects!.controlImmunityByEffectId = undefined;
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'window_second',
        kind: 'freeze',
        durationSeconds: 1,
        name: 'Window Second',
        sourceId: sim.playerId,
      });
      return wolf.mir4Effects!.active.find((effect) => effect.effectId === 'window_second')!
        .duration;
    };

    expect(reappliedDuration(5.999)).toBeCloseTo(0.7, 10);
    expect(reappliedDuration(6)).toBe(1);
    expect(reappliedDuration(6.001)).toBe(1);
  });

  it('enforces the 3-second budget only inside the 8-second rolling window', () => {
    const immunityTail = (elapsedSeconds: number, secondDuration: number): number => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(8_000 + Math.round(elapsedSeconds * 1_000 + secondDuration * 100));
      const wolf = spawnWolf(sim, 2, 0);
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'budget_first',
        kind: 'stun',
        durationSeconds: 2.5,
        name: 'Budget First',
        sourceId: sim.playerId,
      });
      sim.time = elapsedSeconds;
      wolf.auras = [];
      wolf.mir4Effects!.active = [];
      wolf.mir4Effects!.controlImmuneUntil = 0;
      wolf.mir4Effects!.controlImmunityByEffectId = undefined;
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'budget_second',
        kind: 'knockdown',
        durationSeconds: secondDuration,
        name: 'Budget Second',
        sourceId: sim.playerId,
      });
      const applied = wolf.mir4Effects!.active.find(
        (effect) => effect.effectId === 'budget_second',
      )!;
      return wolf.mir4Effects!.controlImmuneUntil - (elapsedSeconds + applied.duration);
    };

    expect(immunityTail(7, 0.499)).toBeCloseTo(0.75, 10);
    expect(immunityTail(7, 0.5)).toBeCloseTo(2.5, 10);
    expect(immunityTail(7, 0.501)).toBeCloseTo(2.5, 10);
    expect(immunityTail(7.999, 0.5)).toBeCloseTo(2.5, 10);
    expect(immunityTail(8, 0.5)).toBeCloseTo(0.75, 10);
    expect(immunityTail(8.001, 0.5)).toBeCloseTo(0.75, 10);
  });

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
    expect(mir4DamageTakenAddend(wolf)).toBe(0);
    expect(mir4DefenseMultiplier(wolf)).toBeCloseTo(0.88, 10);
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
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(wolf.auras.some((aura) => aura.id === 'immune_mir4_slow')).toBe(false);
    expect(
      wolf.mir4Effects?.active.some((effect) => effect.effectId === 'immune_mir4_slow') ?? false,
    ).toBe(false);
    const sharedMultiplier = sim.moveSpeedMult(wolf);
    expect(sharedMultiplier).toBe(1);
    expect(mir4MovementMultiplierFromShared(wolf, sharedMultiplier)).toBe(sharedMultiplier);
  });
  it('observes rejection through the append-only aura fallback host contract', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(62011);
    const wolf = spawnWolf(sim, 3, 0);
    sim.ctx.tryApplyAura = undefined;
    sim.ctx.applyAura = () => undefined;

    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'fallback_rejected_slow',
        kind: 'slow',
        durationSeconds: 3,
        magnitude: 0.35,
        name: 'Rejected by fallback host',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(wolf.mir4Effects?.active ?? []).toHaveLength(0);
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
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
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

  it('expires the MIR4 bag and classic control mirror on the same tick', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6211);
    const wolf = spawnWolf(sim, 3, 0);
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'atomic_short_root',
        kind: 'root',
        durationSeconds: 0.2,
        name: 'Atomic Short Root',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });

    for (let tick = 0; tick < 4; tick += 1) sim.tick();

    expect(wolf.auras.some((aura) => aura.id === 'atomic_short_root')).toBe(false);
    expect(
      wolf.mir4Effects?.active.some((effect) => effect.effectId === 'atomic_short_root') ?? false,
    ).toBe(false);
    expect(mir4Rooted(wolf)).toBe(false);
  });

  it('rejects MIR4 hard control and root against a ccImmune target', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(622);
    const wolf = spawnWolf(sim, 3, 0);
    wolf.ccImmune = true;

    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'immune_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'Immune Stun',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'immune_root',
        kind: 'root',
        durationSeconds: 1,
        name: 'Immune Root',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        effectId: 'allowed_slow',
        kind: 'slow',
        durationSeconds: 1,
        magnitude: 0.2,
        name: 'Allowed Slow',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
  });

  it('honors template CC and slow immunity before creating a MIR4 effect bag', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6221);
    const mogger = createMob(
      sim.nextId++,
      MOBS.mogger,
      6,
      sim.groundPos(sim.player.pos.x + 3, sim.player.pos.z),
    );
    const thunzharr = createMob(
      sim.nextId++,
      MOBS.thunzharr_waking_peak,
      20,
      sim.groundPos(sim.player.pos.x + 6, sim.player.pos.z),
    );
    sim.addEntity(mogger);
    sim.addEntity(thunzharr);
    expect(mogger.ccImmune).toBeUndefined();
    expect(thunzharr.slowImmune).toBeUndefined();

    for (const kind of ['stun', 'knockdown', 'dazed', 'freeze', 'root'] as const) {
      expect(
        applyMir4Effect(sim.ctx, mogger, {
          effectId: `template_immune_${kind}`,
          kind,
          durationSeconds: 1,
          name: `Template Immune ${kind}`,
          sourceId: sim.playerId,
        }),
      ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    }
    expect(
      applyMir4Effect(sim.ctx, thunzharr, {
        effectId: 'template_immune_slow',
        kind: 'slow',
        durationSeconds: 1,
        magnitude: 0.5,
        name: 'Template Immune Slow',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(mogger.mir4Effects).toBeUndefined();
    expect(thunzharr.mir4Effects).toBeUndefined();
  });

  it('honors active stasis before creating MIR4 hard control state', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6222);
    sim.player.auras.push({
      id: 'ice_block',
      name: 'Ice Block',
      kind: 'stasis',
      remaining: 5,
      duration: 5,
      value: 0,
      sourceId: sim.playerId,
      school: 'frost',
    });

    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'stasis_rejected_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'Rejected Stun',
        sourceId: sim.playerId + 1,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    expect(sim.player.mir4Effects).toBeUndefined();
    expect(sim.player.auras.some((aura) => aura.id === 'stasis_rejected_stun')).toBe(false);
  });

  it('applies temporal hard-control DR and the rolling-budget immunity tail', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(623);
    const wolf = spawnWolf(sim, 3, 0);
    wolf.hostile = false;
    const first = {
      effectId: 'dr_first',
      kind: 'stun' as const,
      durationSeconds: 2,
      name: 'First Control',
      sourceId: sim.playerId,
    };
    expect(applyMir4Effect(sim.ctx, wolf, first)).toEqual({ ok: true });
    for (let i = 0; i < 56; i++) sim.tick();

    const secondAppliedAt = sim.ctx.time;
    expect(
      applyMir4Effect(sim.ctx, wolf, {
        ...first,
        effectId: 'dr_second',
        kind: 'freeze',
        name: 'Second Control',
      }),
    ).toEqual({ ok: true });
    const second = wolf.mir4Effects?.active.find((effect) => effect.effectId === 'dr_second');
    expect(second?.duration).toBeCloseTo(2 * MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER, 10);
    expect(wolf.mir4Effects?.controlImmuneUntil).toBeCloseTo(
      secondAppliedAt +
        2 * MIR4_HARD_CONTROL_REAPPLY_MULTIPLIER +
        MIR4_HARD_CONTROL_BUDGET_IMMUNITY_SECONDS,
      10,
    );
  });

  it('treats root as movement-only control and silence as a skill-only lockout', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const rooted = makeSim(624);
    const rootedTarget = spawnTankWolf(
      rooted,
      rooted.player.pos.x + 2,
      rooted.player.pos.z,
      'root_semantics_target',
    );
    rootedTarget.swingTimer = 999;
    expect(
      applyMir4Effect(rooted.ctx, rooted.player, {
        effectId: 'movement_only_root',
        kind: 'root',
        durationSeconds: 10,
        name: 'Movement Only Root',
        sourceId: rootedTarget.id,
      }),
    ).toEqual({ ok: true });
    expect(mir4Rooted(rooted.player)).toBe(true);
    expect(mir4HardControlled(rooted.player)).toBe(false);
    expect(mir4MovementMultiplier(rooted.player)).toBe(0);
    expect(rooted.mir4BasicAttack(rootedTarget.id)).toEqual({ ok: true });
    for (let i = 0; i < 20; i++) rooted.tick();
    expect(rooted.mir4CastSkill(1102, rootedTarget.id)).toEqual({ ok: true });

    const silenced = makeSim(625);
    const silencedTarget = spawnTankWolf(
      silenced,
      silenced.player.pos.x + 2,
      silenced.player.pos.z,
      'silence_semantics_target',
    );
    expect(
      applyMir4Effect(silenced.ctx, silenced.player, {
        effectId: 'mir4_silence',
        kind: 'silence',
        durationSeconds: 10,
        name: 'MIR4 Silence',
        sourceId: silencedTarget.id,
      }),
    ).toEqual({ ok: true });
    expect(mir4Silenced(silenced.player)).toBe(true);
    expect(silenced.player.auras.some((aura) => aura.kind === 'silence')).toBe(true);
    expect(silenced.mir4CastSkill(1102, silencedTarget.id)).toEqual({
      ok: false,
      reason: 'silenced',
    });
    silenced.player.level = 100;
    silenced.player.mir4UltGauge = 100;
    expect(silenced.mir4UltimateCast(silencedTarget.id)).toEqual({
      ok: false,
      reason: 'silenced',
    });
    expect(silenced.mir4BasicAttack(silencedTarget.id)).toEqual({ ok: true });

    const nativeSilence = makeSim(6251);
    const nativeTarget = spawnTankWolf(
      nativeSilence,
      nativeSilence.player.pos.x + 2,
      nativeSilence.player.pos.z,
      'native_silence_target',
    );
    nativeSilence.ctx.applyAura(nativeSilence.player, {
      id: 'woc_dungeon_silence',
      name: 'Dungeon Silence',
      kind: 'silence',
      remaining: 5,
      duration: 5,
      value: 0,
      sourceId: nativeTarget.id,
      school: 'shadow',
    });
    expect(mir4Silenced(nativeSilence.player)).toBe(true);
    expect(nativeSilence.mir4CastSkill(1102, nativeTarget.id)).toEqual({
      ok: false,
      reason: 'silenced',
    });
    expect(nativeSilence.mir4BasicAttack(nativeTarget.id)).toEqual({ ok: true });
  });

  it('keeps burn separate from vulnerability and applies blind to player attacks', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const clean = makeSim(626);
    const cleanTarget = spawnTankWolf(
      clean,
      clean.player.pos.x + 2,
      clean.player.pos.z,
      'clean_blind_target',
    );
    vi.spyOn(clean.rng, 'next').mockReturnValue(0.5);
    expect(clean.mir4BasicAttack(cleanTarget.id)).toEqual({ ok: true });
    resolveContacts(clean);
    const cleanDamage = cleanTarget.maxHp - cleanTarget.hp;

    const blinded = makeSim(626);
    const blindedTarget = spawnTankWolf(
      blinded,
      blinded.player.pos.x + 2,
      blinded.player.pos.z,
      'blinded_target',
    );
    vi.spyOn(blinded.rng, 'next').mockReturnValue(0.5);
    applyMir4Effect(blinded.ctx, blinded.player, {
      effectId: 'player_blind',
      kind: 'blind',
      durationSeconds: 5,
      magnitude: 0.5,
      name: 'Player Blind',
      sourceId: blindedTarget.id,
    });
    applyMir4Effect(blinded.ctx, blindedTarget, {
      effectId: 'not_vulnerability',
      kind: 'burn',
      durationSeconds: 5,
      magnitude: 0.8,
      name: 'Burn',
      sourceId: blinded.playerId,
    });
    expect(mir4AttackMultiplier(blinded.player)).toBe(0.5);
    expect(mir4DamageTakenAddend(blindedTarget)).toBe(0);
    expect(blinded.mir4BasicAttack(blindedTarget.id)).toEqual({ ok: true });
    resolveContacts(blinded);
    const blindedDamage = blindedTarget.maxHp - blindedTarget.hp;

    expect(cleanDamage).toBeGreaterThan(0);
    expect(blindedDamage).toBeGreaterThan(0);
    expect(blindedDamage).toBeLessThan(cleanDamage);
  });

  it('ticks burn from Spell Power four times without making the target vulnerable', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(627);
    const target = spawnTankWolf(sim, sim.player.pos.x + 2, sim.player.pos.z, 'burn_target');
    target.swingTimer = 999;
    sim.player.spellPower = 100;
    target.maxHp = 5_000;
    target.hp = target.maxHp;
    const perTick = mir4BurnDamagePerTick(sim.player, 0.08);

    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'ember_spear_burn',
        kind: 'burn',
        durationSeconds: 4.5,
        magnitude: 0.08,
        name: 'Orbe Flamejante',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    for (let tick = 0; tick < 90; tick += 1) sim.tick();

    expect(perTick).toBe(8);
    expect(target.maxHp - target.hp).toBe(perTick * 4);
    expect(mir4DamageTakenAddend(target)).toBe(0);
  });

  it('applies capped HP/MP drain on direct contact and never on periodic burn', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6271);
    const target = spawnTankWolf(
      sim,
      sim.player.pos.x + 2,
      sim.player.pos.z,
      'drain_contact_target',
    );
    target.maxHp = 20_000;
    target.hp = target.maxHp;
    sim.player.attackPower = 1_000;
    sim.player.spellPower = 1_000;
    sim.player.hp = Math.floor(sim.player.maxHp / 2);
    sim.player.resource = 0;
    sim.player.mir4!.statusValues = {
      ...sim.player.mir4!.statusValues,
      80: 99_999,
      81: 99_999,
    };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    const targetHpBefore = target.hp;
    const playerHpBefore = sim.player.hp;

    expect(sim.mir4BasicAttack(target.id)).toEqual({ ok: true });
    resolveContacts(sim);

    const landedDamage = targetHpBefore - target.hp;
    expect(landedDamage).toBeGreaterThan(0);
    expect(sim.player.hp - playerHpBefore).toBe(Math.floor(landedDamage * 0.2));
    expect(sim.player.resource).toBe(Math.floor(landedDamage * 0.15));

    sim.player.hp = playerHpBefore;
    sim.player.resource = 0;
    applyMir4Effect(sim.ctx, target, {
      effectId: 'drain_forbidden_burn',
      kind: 'burn',
      durationSeconds: 2.5,
      magnitude: 0.1,
      name: 'Drain-forbidden Burn',
      sourceId: sim.playerId,
    });
    const burn = target.mir4Effects!.active.find(
      (effect) => effect.effectId === 'drain_forbidden_burn',
    )!;
    burn.tickRemaining = 0;
    const hpBeforeBurn = target.hp;
    updateMir4Effects(sim.ctx);
    updateMir4PendingImpacts(sim.ctx);

    expect(target.hp).toBeLessThan(hpBeforeBurn);
    expect(sim.player.hp).toBe(playerHpBefore);
    expect(sim.player.resource).toBe(0);
  });

  it('resolves every burn tick through live magic defense without hit or critical rolls', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(628);
    const target = spawnTankWolf(sim, sim.player.pos.x + 2, sim.player.pos.z, 'armored_burn');
    sim.player.spellPower = 100;
    giveMobMir4Defenses(sim, target, 0, 5);
    target.maxHp = 5_000;
    target.hp = target.maxHp;
    target.leashAnchor = { ...target.pos };
    const originalLeashAnchor = { ...target.leashAnchor };
    // A real burn follows a direct skill contact, so the mob is already
    // engaged before its first periodic tick. Keep this fixture in that state
    // to distinguish direct-hit leash refresh from ordinary combat entry.
    target.aiState = 'chase';
    target.aggroTargetId = sim.playerId;
    target.inCombat = true;
    target.pos.x += 20;
    const rng = vi.spyOn(sim.rng, 'next');

    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'armored_burn_effect',
        kind: 'burn',
        durationSeconds: 4.5,
        magnitude: 0.08,
        name: 'Armored Burn',
        sourceId: sim.playerId,
      }),
    ).toEqual({ ok: true });
    for (let tick = 0; tick < 90; tick += 1) {
      updateMir4Effects(sim.ctx);
      updateMir4PendingImpacts(sim.ctx);
    }

    // floor(8 * 100 / (100 + 5)) = 7, four deterministic contacts.
    expect(target.maxHp - target.hp).toBe(28);
    expect(target.leashAnchor).toEqual(originalLeashAnchor);
    expect(rng).not.toHaveBeenCalled();
  });

  it('defense break increases live damage against a runtime mob without synthetic player state', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const baseline = makeSim(629);
    const baselineTarget = spawnRuntimeDefenseMob(
      baseline,
      baseline.player.pos.x + 2,
      baseline.player.pos.z,
      'baseline_defense',
    );
    expect(baselineTarget.mir4).toBeUndefined();
    vi.spyOn(baseline.rng, 'next').mockReturnValue(0.99);
    expect(baseline.mir4CastSkill(1102, baselineTarget.id)).toEqual({ ok: true });
    resolveContacts(baseline);
    const baselineDamage = baselineTarget.maxHp - baselineTarget.hp;

    const broken = makeSim(630);
    const brokenTarget = spawnRuntimeDefenseMob(
      broken,
      broken.player.pos.x + 2,
      broken.player.pos.z,
      'broken_defense',
    );
    expect(brokenTarget.mir4).toBeUndefined();
    vi.spyOn(broken.rng, 'next').mockReturnValue(0.99);
    expect(
      applyMir4Effect(broken.ctx, brokenTarget, {
        effectId: 'test_defense_break',
        kind: 'defense-break',
        durationSeconds: 4,
        magnitude: 0.12,
        name: 'Defense Break',
        sourceId: broken.playerId,
      }),
    ).toEqual({ ok: true });
    expect(broken.mir4CastSkill(1102, brokenTarget.id)).toEqual({ ok: true });
    resolveContacts(broken);
    const brokenDamage = brokenTarget.maxHp - brokenTarget.hp;

    expect(mir4DefenseMultiplier(brokenTarget)).toBeCloseTo(0.88, 10);
    expect(baselineDamage).toBeGreaterThan(0);
    expect(brokenDamage).toBeGreaterThan(baselineDamage);
  });
});

describe('the warrior kit effect surface (phase 3.1)', () => {
  it('1104 lands its native 3s knockdown window with its exact damage', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(63);
    const wolf = spawnWolf(sim, 2, 0);
    const hpBefore = wolf.hp;
    expect(sim.mir4CastSkill(1104, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    // 21000 coefficient at PA 50: floor(50*21000/10000) = 105, one impact.
    expect(hpBefore - wolf.hp).toBe(105);
    const knockdown = wolf.mir4Effects?.active.find((f) => f.kind === 'knockdown');
    expect(knockdown?.duration).toBe(3);
    expect(wolf.auras.some((a) => a.kind === 'stun')).toBe(true);
  });
  it('keeps the native 1104 control window fixed at rank 15', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(6300);
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 1104: 15 };
    const wolf = spawnTankWolf(
      sim,
      sim.player.pos.x + 2,
      sim.player.pos.z,
      'native_1104_rank15_control',
    );

    expect(sim.mir4CastSkill(1104, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);

    const knockdown = wolf.mir4Effects?.active.find((effect) => effect.kind === 'knockdown');
    expect(knockdown?.duration).toBe(3);
  });
  it('routes default-chance control skills through live anti-control stats', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(631);
    const wolf = spawnWolf(sim, 2, 0);
    giveMobMir4Defenses(sim, wolf, 0, 0);
    wolf.mir4!.statusValues = Object.freeze({ 120: 10_000 });
    const hpBefore = wolf.hp;

    expect(sim.mir4CastSkill(1104, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);

    expect(hpBefore - wolf.hp).toBe(105);
    expect(wolf.mir4Effects?.active.some((effect) => effect.kind === 'knockdown') ?? false).toBe(
      false,
    );
    expect(wolf.auras.some((aura) => aura.kind === 'stun')).toBe(false);
  });
  it('resolves a newly contested default control through the shared RNG stream', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const neutral = makeSim(6311);
    const neutralWolf = spawnWolf(neutral, 2, 0);
    const neutralDraws = vi.spyOn(neutral.rng, 'next').mockReturnValue(0.5);
    expect(neutral.mir4CastSkill(1104, neutralWolf.id)).toEqual({ ok: true });
    resolveContacts(neutral);

    const contested = makeSim(6311);
    const contestedWolf = spawnWolf(contested, 2, 0);
    giveMobMir4Defenses(contested, contestedWolf, 0, 0);
    contestedWolf.mir4!.statusValues = Object.freeze({ 120: 500 });
    const contestedDraws = vi.spyOn(contested.rng, 'next').mockReturnValue(0.5);
    expect(contested.mir4CastSkill(1104, contestedWolf.id)).toEqual({ ok: true });
    resolveContacts(contested);

    expect(neutralDraws).toHaveBeenCalledTimes(2);
    expect(contestedDraws).toHaveBeenCalledTimes(neutralDraws.mock.calls.length + 1);
  });
  it('1304 charges into a three-second knock-down without applying the old Defense Break', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(64);
    const wolf = spawnWolf(sim, 2, 0);
    wolf.pos.y = sim.player.pos.y;
    wolf.prevPos = { ...wolf.pos };
    sim.player.facing = Math.PI / 2;
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    expect(sim.mir4CastSkill(1304, wolf.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 11; tick += 1) sim.tick();
    const knockdown = wolf.mir4Effects?.active.find((effect) => effect.kind === 'knockdown');
    expect(knockdown?.duration).toBe(3);
    expect(wolf.mir4Effects?.active.some((effect) => effect.kind === 'defense-break')).toBe(false);
  });
  it('1401 applies full native contact damage and 2.49s knock-down in its shifted circle', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(65);
    const primary = spawnWolf(sim, 2, 0);
    const near1 = spawnWolf(sim, 3.5, 1);
    const near2 = spawnWolf(sim, 0.5, 1);
    const far = spawnWolf(sim, 30, 20); // outside the 7yd (112px) radius
    for (const wolf of [primary, near1, near2, far]) {
      wolf.maxHp = 5_000;
      wolf.hp = wolf.maxHp;
      wolf.pos.y = sim.player.pos.y;
      wolf.prevPos = { ...wolf.pos };
    }
    sim.player.facing = Math.PI / 2;
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);
    const before = new Map<number, number>([
      [primary.id, primary.hp],
      [near1.id, near1.hp],
      [near2.id, near2.hp],
      [far.id, far.hp],
    ]);
    expect(sim.mir4CastSkill(1401, primary.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 13; tick += 1) sim.tick();
    // Native attack 140102 deals the full 25000 coefficient to every admitted target.
    expect(before.get(primary.id)! - primary.hp).toBe(125);
    expect(
      primary.mir4Effects?.active.some((f) => f.kind === 'knockdown' && f.duration === 2.49),
    ).toBe(true);
    expect(before.get(near1.id)! - near1.hp).toBe(125);
    expect(before.get(near2.id)! - near2.hp).toBe(125);
    expect(far.hp).toBe(before.get(far.id));
  });
  it('requires line of sight for admission without erasing committed PvE area contacts', () => {
    const sim = makeClassSim(651, 'warrior');
    const p = sim.player;
    p.pos = sim.groundPos(27, 0);
    const primary = spawnTankWolf(sim, 27, 2, 'visible_primary');
    const visible = spawnTankWolf(sim, 27, -0.5, 'visible_secondary');
    const covered = spawnTankWolf(sim, 30, 0, 'covered_secondary');
    for (const target of [primary, visible, covered]) {
      target.pos.y = p.pos.y;
      target.prevPos = { ...target.pos };
    }
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
    expect(covered.hp).toBeLessThan(covered.maxHp);
    expect(covered.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(true);
    expect(draws).toHaveBeenCalledTimes(6);
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
  it.each([['elementalist', 2201, 'hit-react', 7.5]] as const)(
    'casts the %s actor-centered AoE %i without a selected target',
    (cls, skillId, effectKind, radius) => {
      const sim = makeClassSim(652 + skillId, cls);
      const p = sim.player;
      const primary = spawnTankWolf(sim, p.pos.x + 2, p.pos.z, `${skillId}_primary`);
      const secondary = spawnTankWolf(sim, p.pos.x + 3, p.pos.z + 1, `${skillId}_secondary`);
      const friendly = spawnTankWolf(sim, p.pos.x + 3, p.pos.z - 1, `${skillId}_friendly`);
      friendly.hostile = false;
      const outside = spawnTankWolf(sim, p.pos.x + radius + 1, p.pos.z, `${skillId}_outside`);
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
  it('queues approach to a distant lancer target without committing the targeted skill', () => {
    const sim = makeClassSim(5853, 'lancer');
    const p = sim.player;
    const distant = spawnTankWolf(sim, p.pos.x + 20, p.pos.z, '5201_distant_only');
    const resourceBefore = p.resource;

    expect(sim.mir4CastSkill(5201, distant.id)).toEqual({ ok: true, queued: true });
    expect(sim.ctx.players.get(p.id)?.mir4SkillActivation).toMatchObject({
      phase: 'approach',
      abilityId: 'mir4_skill_5201',
      targetId: distant.id,
    });
    expect(p.resource).toBe(resourceBefore);
    expect(p.cooldowns.has('5201')).toBe(false);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
  });
  it.each([['elementalist', 2201, 'hit-react', 7.5]] as const)(
    'includes the exact %s actor-area boundary for skill %i',
    (cls, skillId, effectKind, radius) => {
      const sim = makeClassSim(1652 + skillId, cls);
      const p = sim.player;
      const edge = spawnTankWolf(
        sim,
        p.pos.x + radius + PLAYER_BODY_RADIUS,
        p.pos.z,
        `${skillId}_exact_edge`,
      );
      const outside = spawnTankWolf(
        sim,
        p.pos.x + radius + PLAYER_BODY_RADIUS + 0.001,
        p.pos.z,
        `${skillId}_beyond_edge`,
      );
      edge.pos.y = p.pos.y;
      edge.prevPos = { ...edge.pos };
      outside.pos.y = p.pos.y;
      outside.prevPos = { ...outside.pos };
      vi.spyOn(sim.rng, 'next').mockReturnValue(0);
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
