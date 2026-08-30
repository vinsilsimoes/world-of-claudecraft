import { afterAll, describe, expect, it } from 'vitest';
import { mir4LevelRow } from '../../src/sim/content/mir4';
import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/arc_campaign';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { initMir4Player } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Official class kits expose active skills plus an Ultimate. Aeldrune does not
// add a separate five-passive progression layer on top of those kits.

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
  sim.mir4RuntimeMobTemplates.set(tanky.id, tanky);
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
  it('does not reintroduce invented class-passive unlocks through quest rewards', () => {
    const unlocks = MIR4_QUESTS_ARC.flatMap((quest) => {
      const value = quest.rewards.systemUnlocks;
      return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
    });
    expect(unlocks.some((unlock) => unlock.startsWith('class-passive-level-'))).toBe(false);
  });

  it('a level-19 warrior carries none: pure table values', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior');
    setLevel(sim, 19);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(1, 19)!;
    expect(p.maxHp).toBe(row[3]);
    expect(p.attackPower).toBe(row[5]);
  });
  it('the Warrior has no standalone passive bonus at level 20', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 112);
    setLevel(sim, 20);
    const p = sim.entities.get(sim.playerId)!;
    const base = mir4LevelRow(1, 20)![3];
    expect(p.maxHp).toBe(base);
  });
  it('the Warrior has no standalone passive bonus at level 60', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('warrior', 113);
    setLevel(sim, 60);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(1, 60)!;
    expect(p.maxHp).toBe(row[3]);
    expect(p.attackPower).toBe(row[5]);
    expect(p.mir4?.physicalDefense).toBe(row[7]);
  });
  it.each([
    ['elementalist', 2],
    ['taoist', 3],
    ['arbalist', 4],
    ['lancer', 5],
  ] as const)('does not add invented passives to %s at level 60', (classKey, classId) => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim(classKey, 114 + classId);
    setLevel(sim, 60);
    const p = sim.entities.get(sim.playerId)!;
    const row = mir4LevelRow(classId, 60)!;
    expect(p.maxHp).toBe(row[3]);
    expect(p.attackPower).toBe(row[5]);
    expect(p.spellPower).toBe(row[6]);
    expect(p.mir4?.physicalDefense).toBe(row[7]);
    expect(p.mir4?.magicDefense).toBe(row[8]);
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
