import { describe, expect, it } from 'vitest';
import { MIR4_MOBS, mir4MobStats } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
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
  sim.addEntity(wolf);
  return wolf;
}

function ticks(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.tick();
}

describe('the mir4 slice: creation and stats', () => {
  it('derives warrior level 1 from the ported table', () => {
    const sim = makeSliceSim();
    const p = sim.entities.get(sim.playerId);
    if (!p) throw new Error('player missing');
    expect(p.maxHp).toBe(4000);
    expect(p.resourceType).toBe('mana');
    expect(p.maxResource).toBe(600);
    expect(p.resource).toBe(600);
    expect(p.attackPower).toBe(50);
    expect(p.mir4?.manaCostStat).toBe(204);
    expect(p.mir4?.classId).toBe(1);
    expect(p.mir4?.criticalOutcome).toBe(0);
  });
  it('the forest wolf spawns with the source formula numbers', () => {
    expect(mir4MobStats(1)).toEqual({ maxHp: 127, attack: 7 });
    expect(mir4MobStats(2)).toEqual({ maxHp: 151, attack: 9 });
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    expect(wolf.maxHp).toBe(127);
    expect(wolf.hp).toBe(127);
  });
});

describe('the mir4 slice: skill 1102 and the basic attack', () => {
  it('1102 spends 36 MP, arms its cooldown + GCD, deals 40+40+45, stuns 900ms', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    const result = sim.castMir4Skill(1102, sim.playerId, wolf.id);
    expect(result).toEqual({ ok: true });
    const p = sim.entities.get(sim.playerId)!;
    expect(p.resource).toBe(600 - 36);
    expect(p.cooldowns.has('1102')).toBe(true);
    expect(p.cooldowns.get('1102')).toBe(25);
    expect(p.gcdRemaining).toBe(1);
    // 0/0 accuracy/dodge = guaranteed contact; 0 crit = no crits; 0 defense =
    // passthrough: the pinned 125 total.
    expect(wolf.hp).toBe(127 - 125);
    expect(wolf.auras.some((a) => a.kind === 'stun')).toBe(true);
    expect(wolf.auras.find((a) => a.kind === 'stun')?.duration).toBe(0.9);
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
    expect(sim.castMir4Skill(1102, sim.playerId, near.id)).toEqual({ ok: true });
    expect(sim.castMir4Skill(1104, sim.playerId, near.id)).toEqual({ ok: false, reason: 'on-gcd' });
    ticks(sim, 21); // 1.05s: GCD gone, 1102 still on its 25s cooldown
    expect(sim.castMir4Skill(1102, sim.playerId, near.id)).toEqual({
      ok: false,
      reason: 'on-cooldown',
    });
    expect(sim.mir4BasicAttack(near.id)).toEqual({ ok: true });
  });
  it('the basic attack deals floor(PA * 6000 / 10000) = 30 on its own cadence', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    ticks(sim, 1);
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(wolf.hp).toBe(127); // scheduled: nothing lands before the offset
    ticks(sim, 6); // 0.30s >= the authored 280ms offset
    expect(wolf.hp).toBe(127 - 30);
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({
      ok: false,
      reason: 'on-cooldown',
    });
    ticks(sim, 14); // 0.7s: past the 0.65s cadence (13 exact ticks leave a 0 floor)
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
  });
});

describe('the mir4 slice: kills, XP, and the level table', () => {
  it('a kill pays the flat 22 reward through the profile funnel', () => {
    const sim = makeSliceSim();
    const wolf = spawnWolf(sim);
    sim.castMir4Skill(1102, sim.playerId, wolf.id); // 125 of 127
    ticks(sim, 1);
    sim.mir4BasicAttack(wolf.id); // scheduled 30 -> dead
    ticks(sim, 6); // land the impact
    const meta = sim.players.get(sim.playerId);
    const p = sim.entities.get(sim.playerId)!;
    expect(wolf.dead).toBe(true);
    expect(meta?.xp).toBe(22);
    expect(p.level).toBe(1);
    expect(meta?.counters.xpGained).toBe(22);
  });
  it('110 XP crosses the level-2 bar and recalcs from the table', () => {
    const sim = makeSliceSim(777);
    const p = sim.entities.get(sim.playerId)!;
    for (let wolfIndex = 0; wolfIndex < 5; wolfIndex++) {
      const wolf = spawnWolf(sim, 2);
      // Burn the wolf down with basics only: 5 hits x 30 = 150 >= 127. Every
      // wolf spawns inside the warrior's 4yd band: an unharmed mir4 mob is
      // passive-until-attacked and never closes the distance on its own.
      for (let hit = 0; hit < 5 && !wolf.dead; hit++) {
        ticks(sim, 14);
        sim.mir4BasicAttack(wolf.id);
        ticks(sim, 7); // land the scheduled impact before re-checking
      }
      expect(wolf.dead).toBe(true);
    }
    expect(sim.players.get(sim.playerId)?.xp).toBe(10); // 5 x 22 = 110, minus 100
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(4240);
    expect(p.maxResource).toBe(610);
    expect(p.attackPower).toBe(58);
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
    ticks(sim, 1);
    sim.mir4BasicAttack(wolf.id);
    const state = sim.serializeCharacter(sim.playerId);
    if (!state) throw new Error('serialize failed');
    expect(state.gameProfile).toBe('mir4-gameplay-port');
    expect(state.level).toBe(1);

    const restored = makeSliceSim(556);
    const pid = restored.addPlayer('warrior', 'Aldric', { state });
    const p = restored.entities.get(pid)!;
    expect(p.level).toBe(1);
    expect(p.maxHp).toBe(4000);
    expect(p.attackPower).toBe(50);
    expect(p.resourceType).toBe('mana');
    expect(p.maxResource).toBe(600);
    expect(p.resource).toBe(600 - 36);
  });
});
