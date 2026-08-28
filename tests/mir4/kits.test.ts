import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.4: the remaining four kits execute — magic channel components,
// the authorial hybrid math, the self utilities (2503 shield, 3503 heal),
// and the 4106 stun's PvE chance.

function makeClassSim(cls: Mir4ClassKey, seed = 91): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Teste',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  sim.mir4UnequipSlot(1);
  sim.mir4UnequipSlot(5);
  return sim;
}

function spawnWolf(sim: Sim, dx = 2): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + dx, p.pos.z),
  );
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

describe('magic-channel kits (damageType 2 rides spellPower)', () => {
  it('elementalist 2101 hits with MA 50: floor(50*18700/10000) = 93', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('elementalist');
    const wolf = spawnWolf(sim);
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(2101, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(93);
    expect(wolf.mir4Effects?.active.some((f) => f.kind === 'freeze')).toBe(true);
  });
});

describe('authorial skills (the 7 policy rebuilds)', () => {
  it('lancer 5201 hybrid: floor(50*10000/10000) + floor(50*14000/10000) = 120', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('lancer');
    const wolf = spawnWolf(sim);
    wolf.maxHp = 500;
    wolf.hp = 500;
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(5201, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(120);
    expect(wolf.mir4Effects?.active.some((f) => f.kind === 'stun')).toBe(true);
  });
  it('elementalist 2301: magic 20000 on MA 50 = 100 + blind', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('elementalist', 92);
    sim.player.level = 30;
    const wolf = spawnWolf(sim);
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(2301, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(100);
    expect(wolf.mir4Effects?.active.some((f) => f.kind === 'blind' && f.magnitude === 0.5)).toBe(
      true,
    );
  });
});

describe('self utilities', () => {
  it('2503 shields the caster for 10s at 0.22 and refuses while up', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('elementalist', 93);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 40;
    p.cooldowns.clear();
    p.gcdRemaining = 0;
    expect(sim.mir4CastSkill(2503)).toEqual({ ok: true }); // no target needed
    resolveContacts(sim);
    expect(p.mir4Shield).toMatchObject({ magnitude: 0.22 });
    for (let i = 0; i < 200; i++) sim.tick();
    expect(p.mir4Shield).toBeUndefined(); // 10s elapsed
  });
  it('uses the PvP cooldown cap for a self utility while a hostile player is selected', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('elementalist', 931);
    const p = sim.player;
    p.level = 40;
    p.mir4!.statusValues = { ...p.mir4!.statusValues, 95: 99_999 };
    const enemyId = sim.addPlayer('warrior', 'PvP cooldown target');
    const enemy = sim.entities.get(enemyId)!;
    enemy.pos = sim.groundPos(p.pos.x + 2, p.pos.z);
    const duel = { a: p.id, b: enemy.id, state: 'active' as const, timer: 0 };
    sim.duels.set(p.id, duel);
    sim.duels.set(enemy.id, duel);
    p.targetId = enemy.id;

    expect(sim.mir4CastSkill(2503)).toEqual({ ok: true });

    expect(p.cooldowns.get('2503')).toBeCloseTo(36.4, 10);
  });
  it('keeps an explicit monster cast on the PvE cooldown cap even with a hostile player selected', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('elementalist', 932);
    const p = sim.player;
    p.level = 40;
    p.mir4!.statusValues = { ...p.mir4!.statusValues, 95: 99_999 };
    const enemyId = sim.addPlayer('warrior', 'Selected PvP target');
    const enemy = sim.entities.get(enemyId)!;
    enemy.pos = sim.groundPos(p.pos.x + 2, p.pos.z);
    const duel = { a: p.id, b: enemy.id, state: 'active' as const, timer: 0 };
    sim.duels.set(p.id, duel);
    sim.duels.set(enemy.id, duel);
    p.targetId = enemy.id;
    const wolf = spawnWolf(sim);

    expect(sim.mir4CastSkill(2101, wolf.id)).toEqual({ ok: true });

    // 2101 has a 12-second authored cooldown. The explicit monster target is
    // authoritative, so the PvE 40% cap applies instead of the PvP 30% cap.
    expect(p.cooldowns.get('2101')).toBeCloseTo(7.2, 10);
    expect(p.targetId).toBe(enemy.id);
  });
  it('3503 heals 18% of max HP and refuses at full health', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('taoist', 94);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 40;
    p.cooldowns.clear();
    p.gcdRemaining = 0;
    expect(sim.mir4CastSkill(3503)).toEqual({ ok: false, reason: 'utility-not-ready' });
    p.hp = 1000;
    p.cooldowns.clear();
    p.gcdRemaining = 0;
    expect(sim.mir4CastSkill(3503)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(p.hp).toBe(1000 + Math.floor(4000 * 0.18)); // +720
  });

  it('rank 15 improves shield, healing, and the pure-control totem by 28%', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);

    const shieldSim = makeClassSim('elementalist', 941);
    shieldSim.player.level = 40;
    shieldSim.players.get(shieldSim.playerId)!.mir4SkillLevels = { 2503: 15 };
    expect(shieldSim.mir4CastSkill(2503)).toEqual({ ok: true });
    resolveContacts(shieldSim);
    expect(shieldSim.player.mir4Shield?.magnitude).toBe(0.2816);

    const healSim = makeClassSim('taoist', 942);
    healSim.player.level = 40;
    healSim.players.get(healSim.playerId)!.mir4SkillLevels = { 3503: 15 };
    healSim.player.hp = 1000;
    expect(healSim.mir4CastSkill(3503)).toEqual({ ok: true });
    resolveContacts(healSim);
    expect(healSim.player.hp).toBe(1000 + Math.floor(4000 * 0.2304));

    const totemSim = makeClassSim('taoist', 943);
    totemSim.player.level = 30;
    totemSim.players.get(totemSim.playerId)!.mir4SkillLevels = { 3104: 15 };
    const wolf = spawnWolf(totemSim);
    expect(totemSim.mir4CastSkill(3104)).toEqual({ ok: true });
    resolveContacts(totemSim);
    expect(wolf.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ kind: 'stun', duration: 1.792 }),
    );
  });
});

describe('the 4106 stun chance', () => {
  it('arbalist 4106: 85 damage and the PvE 100% stun always lands', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('arbalist', 95);
    sim.player.level = 30;
    const wolf = spawnWolf(sim, 3); // inside the arbalist 8yd band... 3yd ok
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(4106, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(85); // floor(50*17000/10000)
    expect(wolf.mir4Effects?.active.some((f) => f.kind === 'stun' && f.duration === 2)).toBe(true);
  });

  it('uses the PvP control profile against a player-owned pet', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('arbalist', 951);
    sim.player.level = 30;
    const enemyId = sim.addPlayer('warrior', 'PvP pet owner');
    const enemy = sim.entities.get(enemyId)!;
    const pet = spawnWolf(sim, 3);
    pet.ownerId = enemy.id;
    pet.hostile = false;
    const duel = { a: sim.playerId, b: enemy.id, state: 'active' as const, timer: 0 };
    sim.duels.set(sim.playerId, duel);
    sim.duels.set(enemy.id, duel);
    const next = sim.rng.next;
    sim.rng.next = () => 0.5;

    expect(sim.mir4CastSkill(4106, pet.id)).toEqual({ ok: true });
    resolveContacts(sim);

    sim.rng.next = next;
    expect(pet.mir4Effects?.active.some((effect) => effect.kind === 'stun') ?? false).toBe(false);
  });
});
