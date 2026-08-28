import { describe, expect, it, vi } from 'vitest';
import { updateMir4AutoBattle } from '../../src/sim/auto_battle/core';
import { MIR4_MOBS, mir4MobStats } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The Phase 2 vertical-slice combat core: a mir4-profile warrior executing the
// ported skill 1102 and the authorial basic attack against the ported forest
// wolf, with pinned source-observed values (see docs/migration/
// survival-game-port-plan.md). Everything runs through the real Sim: shared
// dealDamage, shared stun auras, shared cooldown/GCD fields, shared kill/XP
// funnels with the profile gate.

function makeSliceSim(seed = 4242): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    // The same invisible-idle-mob throttle the offline browser game uses, so
    // full-world ticks stay cheap in the grind below.
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
  });
}

function spawnWolf(sim: Sim, offset = 2): Entity {
  const p = sim.entities.get(sim.playerId);
  if (!p) throw new Error('slice player missing');
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + offset, p.pos.z),
  );
  // Combat timing fixtures isolate the requested player action. Runtime
  // retaliation has its own coverage and must not inject a second player hit.
  wolf.swingTimer = 999;
  sim.addEntity(wolf);
  return wolf;
}

/**
 * The tutorial wolf intentionally has zero Evasion and therefore cannot miss.
 * Contact-sequencing tests need an explicit contested defender while keeping
 * mitigation neutral so their literal damage remains about landed contacts.
 */
function giveWolfContestedEvasion(sim: Sim, wolf: Entity): void {
  const playerCombat = sim.player.mir4;
  if (!playerCombat) throw new Error('MIR4 player combat state missing');
  wolf.mir4 = {
    ...playerCombat,
    statusValues: Object.freeze({}),
    dodge: 1,
    avoidCritical: 0,
    physicalDefense: 0,
    magicDefense: 0,
    penetrationDefenseBps: 0,
    pvpDamageReductionBps: 0,
    monsterDamageReductionBps: 0,
    bossDamageReductionBps: 0,
    allDamageReductionBps: 0,
    skillDamageReductionBps: 0,
  };
}

function ticks(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.tick();
}

describe('the mir4 slice: creation and stats', () => {
  it('derives warrior level 1 with the exact source-backed starter loadout', () => {
    const sim = makeSliceSim();
    const p = sim.entities.get(sim.playerId);
    if (!p) throw new Error('player missing');
    expect(p.maxHp).toBe(4000);
    expect(p.resourceType).toBe('mana');
    expect(p.maxResource).toBe(600);
    expect(p.resource).toBe(600);
    expect(p.attackPower).toBe(125);
    expect(p.mir4?.manaCostStat).toBe(204);
    expect(p.mir4?.classId).toBe(1);
    expect(p.mir4?.physicalDefense).toBe(12);
    expect(p.mir4?.magicDefense).toBe(12);
    expect(p.mir4?.accuracy).toBe(5);
    expect(p.mir4?.skillDamageBps).toBe(10);
    expect(p.mir4?.criticalOutcome).toBe(10);
    expect(sim.players.get(sim.playerId)?.mir4Equipment).toEqual({
      1: 200201000,
      5: 301201000,
    });
  });
  it('the forest wolf spawns with the live MMORPG pressure numbers', () => {
    expect(mir4MobStats(1)).toEqual({ maxHp: 120, attack: 240 });
    expect(mir4MobStats(2)).toEqual({ maxHp: 135, attack: 267 });
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    expect(wolf.maxHp).toBe(120);
    expect(wolf.hp).toBe(120);
  });
});

describe('the mir4 slice: skill 1102 and the basic attack', () => {
  it('1102 spends 36 MP, arms its cooldown + GCD, deals 312, and stuns for 900ms', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    wolf.maxHp = 1_000;
    wolf.hp = 1_000;
    sim.drainEvents();
    const result = sim.castMir4Skill(1102, sim.playerId, wolf.id);
    expect(result).toEqual({ ok: true });
    const p = sim.entities.get(sim.playerId)!;
    expect(p.resource).toBe(600 - 36);
    expect(p.cooldowns.has('1102')).toBe(true);
    expect(p.cooldowns.get('1102')).toBe(25);
    expect(p.gcdRemaining).toBe(1);
    const impactEvents = sim.drainEvents();
    // The source starter adds 75 PA and 10 bps skill damage to the level-1
    // table, producing the shipping 100 + 100 + 112 impacts.
    expect(wolf.hp).toBe(1_000 - 312);
    expect(wolf.auras.some((a) => a.kind === 'stun')).toBe(true);
    expect(wolf.auras.find((a) => a.kind === 'stun')?.duration).toBe(0.9);
    const damageEvents = impactEvents.filter(
      (event): event is Extract<SimEvent, { type: 'damage' }> =>
        event.type === 'damage' && event.sourceId === p.id,
    );
    expect(damageEvents).toHaveLength(3);
    expect(damageEvents.every((event) => event.attackAnimationStarted !== true)).toBe(true);
    expect(impactEvents.some((event) => event.type === 'mir4AttackStart')).toBe(false);
  });
  it('lands all three 1102 contacts immediately and schedules no delayed duplicate', () => {
    const sim = makeSliceSim(4_242);
    const wolf = spawnWolf(sim);
    wolf.maxHp = 1_000;
    wolf.hp = 1_000;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });
    expect(wolf.hp).toBe(688);
    expect(wolf.auras.some((aura) => aura.kind === 'stun')).toBe(true);
    expect(
      (sim.player.mir4PendingImpacts ?? []).filter((impact) => impact.attackKind === 'skill'),
    ).toHaveLength(0);

    for (let tick = 0; tick < 24; tick++) sim.tick();
    expect(wolf.hp).toBe(688);
  });
  it('applies a multi-hit effect when an earlier contact lands and the final one misses', () => {
    const sim = makeSliceSim(4_243);
    const wolf = spawnWolf(sim);
    giveWolfContestedEvasion(sim, wolf);
    wolf.maxHp = 1_000;
    wolf.hp = 1_000;
    const draws = vi
      .spyOn(sim.rng, 'next')
      // hit/crit for impact one, hit/crit for impact two, miss/crit for three
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0.9999)
      .mockReturnValue(0.9999);
    const startedAt = sim.time;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });

    for (const offset of [0.45, 0.825, 1.2]) {
      sim.time = startedAt + offset;
      updateMir4PendingImpacts(sim.ctx);
    }

    expect(wolf.hp).toBe(800);
    expect(wolf.auras.some((aura) => aura.kind === 'stun')).toBe(true);
    expect(draws).toHaveBeenCalledTimes(6);
  });
  it('applies no multi-hit effect when every damage contact misses', () => {
    const sim = makeSliceSim(4_246);
    const wolf = spawnWolf(sim);
    giveWolfContestedEvasion(sim, wolf);
    wolf.maxHp = 1_000;
    wolf.hp = wolf.maxHp;
    const draws = vi.spyOn(sim.rng, 'next').mockReturnValue(0.9999);
    const startedAt = sim.time;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });

    for (const offset of [0.45, 0.825, 1.2]) {
      sim.time = startedAt + offset;
      updateMir4PendingImpacts(sim.ctx);
    }

    expect(wolf.hp).toBe(wolf.maxHp);
    expect(wolf.auras.some((aura) => aura.kind === 'stun')).toBe(false);
    expect(draws).toHaveBeenCalledTimes(6);
  });
  it('attempts the equipped spirit once on the first landed contact after an opening miss', () => {
    const sim = makeSliceSim(4_245);
    const wolf = spawnWolf(sim);
    giveWolfContestedEvasion(sim, wolf);
    wolf.maxHp = 2_000;
    wolf.hp = wolf.maxHp;
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('MIR4 player meta missing');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 1 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
    };
    const draws = vi
      .spyOn(sim.rng, 'next')
      // opening miss, second hit + successful spirit roll, third hit
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValue(0.9999);
    const startedAt = sim.time;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });

    for (const offset of [0.45, 0.825, 1.2]) {
      sim.time = startedAt + offset;
      updateMir4PendingImpacts(sim.ctx);
    }

    const spiritFx = sim
      .drainEvents()
      .filter((event) => event.type === 'spellfx' && event.school === 'mir4/spirit/bonus-damage');
    expect(spiritFx).toHaveLength(1);
    expect(meta.mir4SpiritSkillReadyAt).toBeCloseTo(startedAt + 6.55);
    expect(draws).toHaveBeenCalledTimes(7);
  });
  it('does not retry a failed spirit proc on later contacts of the same action', () => {
    const sim = makeSliceSim(4_247);
    const wolf = spawnWolf(sim);
    wolf.maxHp = 2_000;
    wolf.hp = wolf.maxHp;
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('MIR4 player meta missing');
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 1 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
    };
    const draws = vi
      .spyOn(sim.rng, 'next')
      // first hit + no crit + failed proc, then two ordinary landed hits
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9999)
      .mockReturnValue(0.9999);
    const startedAt = sim.time;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });

    for (const offset of [0.45, 0.825, 1.2]) {
      sim.time = startedAt + offset;
      updateMir4PendingImpacts(sim.ctx);
    }

    const spiritFx = sim
      .drainEvents()
      .filter((event) => event.type === 'spellfx' && event.school === 'mir4/spirit/bonus-damage');
    expect(spiritFx).toHaveLength(0);
    expect(meta.mir4SpiritSkillReadyAt).toBeUndefined();
    expect(draws).toHaveBeenCalledTimes(7);
  });
  it('keeps manual actions on the shared GCD without an extra skill contact lock', () => {
    const sim = makeSliceSim(4_244);
    const wolf = spawnWolf(sim);
    wolf.maxHp = 10_000;
    wolf.hp = wolf.maxHp;
    const p = sim.player;
    p.level = 50;
    p.mir4UltGauge = 100;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: false, reason: 'on-gcd' });
    expect(sim.mir4UltimateCast(wolf.id)).toEqual({ ok: false, reason: 'on-gcd' });

    sim.drainEvents();
    sim.setMir4AutoBattleMode('battle');
    const resumedEvents = Array.from({ length: 20 }, () => sim.tick()).flat();
    expect(resumedEvents.some((event) => event.type === 'mir4AttackStart')).toBe(true);
  });
  it('rejects a manual action on the GCD after an immediate auto-battle skill', () => {
    const sim = makeSliceSim(4_248);
    const wolf = spawnWolf(sim);
    wolf.maxHp = 10_000;
    wolf.hp = wolf.maxHp;
    sim.player.level = 10;
    sim.setMir4AutoBattleMode('battle');

    updateMir4AutoBattle(sim.ctx);

    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: false, reason: 'on-gcd' });
  });
  it('gates: range, wrong class, unknown skill, cooldown', () => {
    const sim = makeSliceSim();
    const far = spawnWolf(sim, 40);
    expect(sim.castMir4Skill(1102, sim.playerId, far.id)).toEqual({
      ok: false,
      reason: 'out-of-range',
    });
    expect(sim.castMir4Skill(9999, sim.playerId, far.id)).toEqual({
      ok: false,
      reason: 'unknown-skill',
    });
    expect(sim.castMir4Skill(3101, sim.playerId, far.id)).toEqual({
      ok: false,
      reason: 'wrong-class',
    });
    const near = spawnWolf(sim);
    near.maxHp = 1_000;
    near.hp = 1_000;
    expect(sim.castMir4Skill(1104, sim.playerId, near.id)).toEqual({
      ok: false,
      reason: 'not-unlocked',
    });
    expect(sim.castMir4Skill(1102, sim.playerId, near.id)).toEqual({ ok: true });
    sim.player.level = 10;
    expect(sim.castMir4Skill(1104, sim.playerId, near.id)).toEqual({ ok: false, reason: 'on-gcd' });
    ticks(sim, 25); // 1.25s: the final-contact lock is gone; cooldown remains
    expect(sim.castMir4Skill(1102, sim.playerId, near.id)).toEqual({
      ok: false,
      reason: 'on-cooldown',
    });
    expect(sim.mir4BasicAttack(near.id)).toEqual({ ok: true });
  });
  it('admits no skill, basic attack, or ultimate through blocked line of sight', () => {
    const sim = makeSliceSim(42421);
    const p = sim.player;
    p.pos = sim.groundPos(27, 0);
    const covered = spawnWolf(sim, 3);
    covered.maxHp = 5000;
    covered.hp = covered.maxHp;
    p.mir4UltGauge = 100;
    expect(sim.ctx.hasLineOfSight(p, covered)).toBe(false);
    const draws = vi.spyOn(sim.rng, 'next');
    const resourceBefore = p.resource;

    expect(sim.mir4CastSkill(1102, covered.id)).toEqual({ ok: false, reason: 'out-of-range' });
    expect(sim.mir4BasicAttack(covered.id)).toEqual({ ok: false, reason: 'out-of-range' });
    p.level = 50;
    expect(sim.mir4UltimateCast(covered.id)).toEqual({ ok: false, reason: 'out-of-range' });

    expect(covered.hp).toBe(covered.maxHp);
    expect(p.resource).toBe(resourceBefore);
    expect(p.mir4UltGauge).toBe(100);
    expect(p.cooldowns.has('1102')).toBe(false);
    expect(p.cooldowns.has('mir4_basic')).toBe(false);
    expect(p.cooldowns.has('mir4_ult')).toBe(false);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(draws).not.toHaveBeenCalled();
  });
  it('keeps the deterministic combat stream identical after a denied LoS attempt', () => {
    const run = (attemptThroughCover: boolean) => {
      const sim = makeSliceSim(42422);
      const p = sim.player;
      p.pos = sim.groundPos(27, 0);
      const wolf = spawnWolf(sim, 3);
      wolf.maxHp = 5000;
      wolf.hp = wolf.maxHp;
      if (attemptThroughCover) {
        expect(sim.ctx.hasLineOfSight(p, wolf)).toBe(false);
        expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({
          ok: false,
          reason: 'out-of-range',
        });
      }
      wolf.pos = sim.groundPos(27, 2);
      expect(sim.ctx.hasLineOfSight(p, wolf)).toBe(true);
      expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });
      return {
        hp: wolf.hp,
        resource: p.resource,
        effects: wolf.mir4Effects,
        nextDraw: sim.rng.next(),
      };
    };

    expect(run(true)).toEqual(run(false));
  });
  it('revalidates PvP LoS at a delayed impact without consuming combat RNG', () => {
    const sim = makeSliceSim(42423);
    const p = sim.player;
    const enemyId = sim.addPlayer('warrior', 'PvP impact target');
    const enemy = sim.entities.get(enemyId);
    if (!enemy) throw new Error('PvP impact target was not created');
    enemy.pos = sim.groundPos(p.pos.x + 2, p.pos.z);
    enemy.prevPos = { ...enemy.pos };
    const duel = { a: p.id, b: enemy.id, state: 'active' as const, timer: 0 };
    sim.duels.set(p.id, duel);
    sim.duels.set(enemy.id, duel);
    const originalHasLineOfSight = sim.ctx.hasLineOfSight;
    let visible = true;
    sim.ctx.hasLineOfSight = () => visible;
    expect(sim.mir4BasicAttack(enemy.id)).toEqual({ ok: true });
    const pending = p.mir4PendingImpacts?.[0];
    if (!pending) throw new Error('MIR4 basic impact was not scheduled');
    pending.dueAt = sim.ctx.time;
    visible = false;
    const draws = vi.spyOn(sim.rng, 'next');

    updateMir4PendingImpacts(sim.ctx);

    sim.ctx.hasLineOfSight = originalHasLineOfSight;
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(draws).not.toHaveBeenCalled();
  });
  it('revalidates PvP LoS for a player-controlled pet at delayed impact', () => {
    const sim = makeSliceSim(42424);
    const p = sim.player;
    const enemyId = sim.addPlayer('warrior', 'PvP pet owner');
    const enemy = sim.entities.get(enemyId);
    if (!enemy) throw new Error('PvP pet owner was not created');
    enemy.pos = sim.groundPos(p.pos.x + 3, p.pos.z);
    enemy.prevPos = { ...enemy.pos };
    const pet = spawnWolf(sim, 2);
    pet.ownerId = enemy.id;
    pet.hostile = false;
    const duel = { a: p.id, b: enemy.id, state: 'active' as const, timer: 0 };
    sim.duels.set(p.id, duel);
    sim.duels.set(enemy.id, duel);
    const originalHasLineOfSight = sim.ctx.hasLineOfSight;
    let visible = true;
    sim.ctx.hasLineOfSight = () => visible;
    expect(sim.mir4BasicAttack(pet.id)).toEqual({ ok: true });
    const pending = p.mir4PendingImpacts?.[0];
    if (!pending) throw new Error('MIR4 pet-target impact was not scheduled');
    pending.dueAt = sim.ctx.time;
    visible = false;

    updateMir4PendingImpacts(sim.ctx);

    sim.ctx.hasLineOfSight = originalHasLineOfSight;
    expect(pet.hp).toBe(pet.maxHp);
    expect(p.mir4PendingImpacts ?? []).toHaveLength(0);
  });
  it('the basic attack deals floor(125 * 6000 / 10000) = 75 on its own cadence', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    ticks(sim, 1);
    sim.drainEvents();
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4AttackStart',
      sourceId: sim.playerId,
      targetId: wolf.id,
      action: 'basic',
      pose: 'weapon',
      durationMs: 448,
    });
    expect(wolf.hp).toBe(120); // scheduled: nothing lands before the offset
    ticks(sim, 6); // 0.30s >= the authored 280ms offset
    expect(wolf.hp).toBe(120 - 75);
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({
      ok: false,
      reason: 'on-cooldown',
    });
    ticks(sim, 14); // 0.7s: past the 0.65s cadence (13 exact ticks leave a 0 floor)
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
  });
});

describe('the mir4 slice: kills, XP, and the level table', () => {
  it('a kill pays the flat 34 reward through the profile funnel', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    sim.castMir4Skill(1102, sim.playerId, wolf.id); // starter-scaled 312, lethal
    ticks(sim, 24);
    const meta = sim.players.get(sim.playerId);
    const p = sim.entities.get(sim.playerId)!;
    expect(wolf.dead).toBe(true);
    expect(meta?.xp).toBe(34);
    expect(p.level).toBe(1);
    expect(meta?.counters.xpGained).toBe(34);
  });
  it('110 XP crosses the level-2 bar and recalcs from the table', () => {
    const sim = makeSliceSim(777);
    const p = sim.entities.get(sim.playerId)!;
    for (let wolfIndex = 0; wolfIndex < 5; wolfIndex++) {
      p.hp = p.maxHp;
      const wolf = spawnWolf(sim, 2);
      // Burn the wolf down with basics only: allow one deterministic miss beyond
      // the two starter hits needed for 120 HP. Every wolf spawns inside the
      // warrior's 4yd band: an unharmed mir4 mob is
      // passive-until-attacked and never closes the distance on its own.
      for (let hit = 0; hit < 6 && !wolf.dead; hit++) {
        ticks(sim, 14);
        sim.mir4BasicAttack(wolf.id);
        ticks(sim, 7); // land the scheduled impact before re-checking
      }
      expect(wolf.dead).toBe(true);
    }
    expect(sim.players.get(sim.playerId)?.xp).toBe(70); // 5 x 34 = 170, minus 100
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(4240);
    expect(p.maxResource).toBe(610);
    expect(p.attackPower).toBe(133);
    expect(p.mir4?.manaCostStat).toBe(239);
  });
  it('is deterministic: same seed, same script, same numbers', () => {
    const run = () => {
      const sim = makeSliceSim(99);
      const wolf = spawnWolf(sim);
      sim.castMir4Skill(1102, sim.playerId, wolf.id);
      ticks(sim, 13);
      sim.mir4BasicAttack(wolf.id);
      return [
        wolf.dead,
        sim.entities.get(sim.playerId)!.resource,
        sim.entities.get(sim.playerId)!.hp,
      ];
    };
    expect(run()).toEqual(run());
  });
});

describe('the mir4 slice: persistence round-trip', () => {
  it('serializes with the profile stamp and restores into a fresh mir4 Sim', () => {
    const sim = makeSliceSim(555);
    const wolf = spawnWolf(sim);
    sim.castMir4Skill(1102, sim.playerId, wolf.id);
    const state = sim.serializeCharacter(sim.playerId);
    if (!state) throw new Error('serialize failed');
    expect(state.gameProfile).toBe('mir4-gameplay-port');
    expect(state.level).toBe(1);
    expect(state.mir4Equipment).toEqual({ 1: 200201000, 5: 301201000 });
    expect(state.mir4EquipmentInstances).toEqual({
      200201000: { itemId: 200201000, enhancement: 0 },
      301201000: { itemId: 301201000, enhancement: 0 },
    });

    const restored = makeSliceSim(556);
    const pid = restored.addPlayer('warrior', 'Aldric', { state });
    const p = restored.entities.get(pid)!;
    expect(p.level).toBe(1);
    expect(p.maxHp).toBe(4000);
    expect(p.attackPower).toBe(125);
    expect(p.resourceType).toBe('mana');
    expect(p.maxResource).toBe(600);
    expect(p.resource).toBe(600 - 36);
  });
});
