import { afterAll, describe, expect, it } from 'vitest';
import { mir4LevelRow } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { initMir4Player } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.6: the 25 class passives (summed bps over table+gear, unlocking at
// 20/30/40/50/60) and skill ranks (coefficient + rank * levelUpCoefficient).

function makeClassSim(cls: Mir4ClassKey, seed = 111): Sim {
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

function setLevel(sim: Sim, level: number): void {
  const p = sim.entities.get(sim.playerId) as Entity;
  p.level = level;
  initMir4Player(sim.ctx, sim.playerId);
}

function spawnWolf(sim: Sim): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const tanky = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'test_tank_wolf',
    hpBase: 5000,
    hpPerLevel: 0,
  };
  const wolf = createMob(
    sim.nextId++,
    tanky as never,
    1,
    sim.groundPos(p.pos.x + 2, p.pos.z + 0.5),
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

describe('class passives', () => {
  it('a level-19 warrior carries none: pure table values', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior');
    setLevel(sim, 19);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(1, 19)!;
    expect(p.maxHp).toBe(row[3]);
    expect(p.attackPower).toBe(row[5]);
  });
  it('level 20 unlocks Armadura Pesada: maxHp +8% exactly', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 112);
    setLevel(sim, 20);
    const p = sim.entities.get(sim.playerId)!;
    const base = mir4LevelRow(1, 20)![3];
    expect(p.maxHp).toBe(base + Math.floor((base * 800) / 10_000));
  });
  it('level 60 stacks every unlocked sum per status, applied once', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 113);
    setLevel(sim, 60);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(1, 60)!;
    // maxHp: 800 + 400 + 500 = 1700 bps; PA: 600 + 400 = 1000 bps.
    expect(p.maxHp).toBe(row[3] + Math.floor((row[3] * 1700) / 10_000));
    expect(p.attackPower).toBe(row[5] + Math.floor((row[5] * 1000) / 10_000));
    expect(p.mir4?.physicalDefense).toBe(row[7] + Math.floor((row[7] * 1300) / 10_000));
  });
  it('the taoist level-60 six-stat passive lands on every column', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('taoist', 114);
    setLevel(sim, 60);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(3, 60)!;
    expect(p.maxHp).toBe(row[3] + Math.floor((row[3] * 1200) / 10_000)); // 20:400 + 50:400 + 60:400
    expect(p.spellPower).toBe(row[6] + Math.floor((row[6] * 800) / 10_000)); // 400+400
    expect(p.attackPower).toBe(row[5] + Math.floor((row[5] * 800) / 10_000));
  });
});

describe('skill ranks', () => {
  it('1102 at level 2 with the starter weapon: 102+102+114 = 318', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 115);
    sim.mir4EquipStarterWeapon();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4SkillLevels = { 1102: 2 };
    const wolf = spawnWolf(sim);
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: true });
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(318); // vs 312 at level 1: the levelUp coefficients
  });
  it('1102 at rank 5 applies four native level-up coefficient steps', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 116);
    sim.mir4EquipStarterWeapon();
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 1102: 5 };
    const wolf = spawnWolf(sim);
    const hp = wolf.hp;
    sim.mir4CastSkill(1102, wolf.id);
    resolveContacts(sim);
    expect(hp - wolf.hp).toBe(337);
  });
});
