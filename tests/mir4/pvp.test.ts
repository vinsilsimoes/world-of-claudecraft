import { describe, expect, it, vi } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';

function liveDuel() {
  const world = { ...buildMir4ArcWorld(1), camps: [] };
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 93,
    noPlayer: true,
    playerClass: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
  const warrior = sim.addPlayer('warrior', 'Aldric');
  const elementalist = sim.addPlayer('elementalist', 'Elyra');
  const a = sim.entities.get(warrior);
  const b = sim.entities.get(elementalist);
  if (!a || !b) throw new Error('MIR4 duel roster missing');
  // PvP starts at level 20. Normalize only the health budget so this remains
  // a deterministic TTK contract instead of a level-one regeneration test.
  sim.setPlayerLevel(20, warrior);
  sim.setPlayerLevel(20, elementalist);
  a.pos.x = 0;
  a.pos.z = 20;
  b.pos.x = 2;
  b.pos.z = 20;
  sim.duelRequest(elementalist, warrior);
  sim.duelAccept(elementalist);
  for (let tick = 0; tick < 80 && sim.duelFor(warrior)?.state !== 'active'; tick += 1) {
    sim.tick();
  }
  // Let the active-duel transition finish its one-time stat refresh before
  // applying the normalized TTK health pool.
  sim.tick();
  const liveA = sim.entities.get(warrior)!;
  const liveB = sim.entities.get(elementalist)!;
  liveA.maxHp = 1_000;
  liveA.hp = liveA.maxHp;
  liveB.maxHp = 1_000;
  liveB.hp = liveB.maxHp;
  sim.players.get(warrior)!.inventory = [];
  sim.players.get(elementalist)!.inventory = [];
  return { sim, warrior, elementalist };
}

function liveArbalistDuel(seed: number) {
  const world = { ...buildMir4ArcWorld(1), camps: [] };
  setActiveWorldContent(world);
  const sim = new Sim({
    seed,
    noPlayer: true,
    playerClass: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
  const arbalist = sim.addPlayer('arbalist', 'Arbalist');
  const warrior = sim.addPlayer('warrior', 'Warrior');
  const attacker = sim.entities.get(arbalist);
  const target = sim.entities.get(warrior);
  if (!attacker || !target) throw new Error('MIR4 lancer duel roster missing');
  attacker.level = 50;
  attacker.pos.x = 0;
  attacker.pos.z = 20;
  target.pos.x = 2;
  target.pos.z = 20;
  sim.duelRequest(arbalist, warrior);
  sim.duelAccept(arbalist);
  for (let tick = 0; tick < 80 && sim.duelFor(arbalist)?.state !== 'active'; tick += 1) {
    sim.tick();
  }
  return { sim, arbalist, warrior, attacker, target };
}

function resolveContacts(sim: Sim, sourceId: number): void {
  const source = sim.entities.get(sourceId);
  if (!source) throw new Error('MIR4 contact source missing');
  for (const impact of source.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 PvP through the shared duel rules', () => {
  it('finishes a normalized level-20 warrior versus elementalist duel within one minute', () => {
    const { sim, warrior, elementalist } = liveDuel();
    let ticks = 0;
    while (sim.duelFor(warrior) && ticks++ < 1_200) {
      if (ticks % 10 === 0) {
        castMir4Skill(sim.ctx, warrior, 1102, elementalist);
        sim.mir4BasicAttack(elementalist, warrior);
        castMir4Skill(sim.ctx, elementalist, 2101, warrior);
        sim.mir4BasicAttack(warrior, elementalist);
      }
      sim.tick();
    }

    expect(ticks).toBeLessThan(1_200);
    expect(sim.duelFor(warrior)).toBeNull();
  });

  it('admits ported attacks against an active opponent but never a friendly player', () => {
    const { sim, warrior, elementalist } = liveDuel();
    const target = sim.entities.get(elementalist);
    if (!target) throw new Error('duel target missing');
    expect(sim.duelFor(warrior)?.state).toBe('active');
    const startingHp = target.hp;

    expect(sim.mir4BasicAttack(elementalist, warrior)).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) sim.tick();
    expect(target.hp).toBeLessThan(startingHp);

    target.pos.x = 100;
    sim.tick();
    expect(sim.duelFor(warrior)).toBeNull();
    expect(sim.mir4BasicAttack(elementalist, warrior)).toEqual({
      ok: false,
      reason: 'no-target',
    });
  });

  it('cancels a delayed impact when the duel ends during its windup', () => {
    const { sim, warrior, elementalist } = liveDuel();
    const target = sim.entities.get(elementalist);
    if (!target) throw new Error('duel target missing');
    const startingHp = target.hp;

    expect(sim.mir4BasicAttack(elementalist, warrior)).toEqual({ ok: true });
    target.pos.x = 100;
    sim.tick();
    expect(sim.duelFor(warrior)).toBeNull();
    for (let tick = 0; tick < 20; tick += 1) sim.tick();

    expect(target.hp).toBe(startingHp);
  });

  it.each([
    [0.0999, true],
    [0.1, false],
  ] as const)(
    'uses the exact 10%% PvP stun boundary for 4106 at roll %s',
    (effectRoll, expectedStun) => {
      const { sim, arbalist, warrior, target } = liveArbalistDuel(94);
      expect(sim.duelFor(arbalist)?.state).toBe('active');
      const queuedDraws = [0.5, 0.5, effectRoll];
      const next = vi.spyOn(sim.rng, 'next').mockImplementation(() => queuedDraws.shift() ?? 0.5);

      expect(castMir4Skill(sim.ctx, arbalist, 4106, warrior)).toEqual({ ok: true });
      resolveContacts(sim, arbalist);

      expect(
        target.mir4Effects?.active.some(
          (effect) => effect.effectId === 'mir4_native_buff_40524' && effect.kind === 'stun',
        ) ?? false,
      ).toBe(expectedStun);
      expect(next).toHaveBeenCalledTimes(3);
    },
  );

  it('does not roll or apply 4106 control after its own damage ends the duel', () => {
    const { sim, arbalist, warrior, target } = liveArbalistDuel(95);
    target.hp = 1;
    const queuedDraws = [0.5, 0.5, 0];
    const next = vi.spyOn(sim.rng, 'next').mockImplementation(() => queuedDraws.shift() ?? 0.5);

    expect(castMir4Skill(sim.ctx, arbalist, 4106, warrior)).toEqual({ ok: true });
    resolveContacts(sim, arbalist);

    expect(sim.duelFor(arbalist)).toBeNull();
    expect(target.hp).toBe(1);
    expect(
      target.mir4Effects?.active.some(
        (effect) =>
          effect.kind === 'stun' ||
          effect.effectId === 'mir4_native_buff_40010_31' ||
          effect.effectId === 'mir4_native_buff_40510_33',
      ) ?? false,
    ).toBe(false);
    expect(target.auras.some((aura) => aura.id === 'mir4_native_buff_40524')).toBe(false);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('removes MIR4 and classic control together when distance ends the duel', () => {
    const { sim, arbalist, warrior, target } = liveArbalistDuel(96);
    const queuedDraws = [0.5, 0.5, 0];
    vi.spyOn(sim.rng, 'next').mockImplementation(() => queuedDraws.shift() ?? 0.5);
    expect(castMir4Skill(sim.ctx, arbalist, 4106, warrior)).toEqual({ ok: true });
    resolveContacts(sim, arbalist);
    expect(
      target.mir4Effects?.active.some((effect) => effect.effectId === 'mir4_native_buff_40524'),
    ).toBe(true);
    expect(target.auras.some((aura) => aura.id === 'mir4_native_buff_40524')).toBe(true);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'external_slow',
        kind: 'slow',
        durationSeconds: 4,
        magnitude: 0.2,
        name: 'External slow',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });

    target.pos.x = 100;
    sim.tick();

    expect(sim.duelFor(arbalist)).toBeNull();
    expect(target.mir4Effects?.active.map((effect) => effect.effectId)).toEqual(['external_slow']);
    expect(target.auras.some((aura) => aura.id === 'mir4_native_buff_40524')).toBe(false);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'external_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'External stun',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
  });

  it('clears an unattributed legacy control tail without deleting an external effect', () => {
    const { sim, arbalist, warrior, target } = liveArbalistDuel(97);
    const queuedDraws = [0.5, 0.5, 0];
    vi.spyOn(sim.rng, 'next').mockImplementation(() => queuedDraws.shift() ?? 0.5);
    expect(castMir4Skill(sim.ctx, arbalist, 4106, warrior)).toEqual({ ok: true });
    resolveContacts(sim, arbalist);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'legacy_external_slow',
        kind: 'slow',
        durationSeconds: 4,
        magnitude: 0.2,
        name: 'Legacy external slow',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
    const bag = target.mir4Effects;
    if (!bag) throw new Error('legacy MIR4 effect bag missing');
    expect(bag.controlImmuneUntil).toBeGreaterThan(sim.time);
    bag.active = bag.active.filter((effect) => effect.effectId !== 'mir4_native_buff_40524');
    bag.controlImmunityByEffectId = undefined;
    target.auras = target.auras.filter((aura) => aura.id !== 'mir4_native_buff_40524');

    target.pos.x = 100;
    sim.tick();

    expect(sim.duelFor(arbalist)).toBeNull();
    expect(target.mir4Effects?.active.map((effect) => effect.effectId)).toEqual([
      'legacy_external_slow',
    ]);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'legacy_external_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'Legacy external stun',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });
  });

  it('preserves an attributed external hard-control tail when the duel ends', () => {
    const { sim, arbalist, target } = liveArbalistDuel(98);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'external_preserved_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'External preserved stun',
        sourceId: 999,
      }),
    ).toEqual({ ok: true });

    target.pos.x = 100;
    sim.tick();

    expect(sim.duelFor(arbalist)).toBeNull();
    expect(
      target.mir4Effects?.active.some((effect) => effect.effectId === 'external_preserved_stun'),
    ).toBe(true);
    expect(target.auras.some((aura) => aura.id === 'external_preserved_stun')).toBe(true);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'external_refused_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'External refused stun',
        sourceId: 999,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
  });
});
