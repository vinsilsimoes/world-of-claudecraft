import { afterAll, describe, expect, it } from 'vitest';
import { mir4LevelRow } from '../../src/sim/content/mir4';
import { MIR4_MOBS, mir4MobStats } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { advanceMir4Experience } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// The slice equipment + loot: the warrior starter weapon's EXACT source
// attributes ([20,+75],[28,+5],[44,+10]) applied on top of the level table,
// and wolf kills paying copper through the classic loot pipeline.

function makeSim(seed = 31): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function teleport(sim: Sim, x: number, z: number): void {
  const p = sim.entities.get(sim.playerId) as Entity;
  const grounded = sim.groundPos(x, z);
  p.pos.x = grounded.x;
  p.pos.y = grounded.y;
  p.pos.z = grounded.z;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the mir4 slice equipment', () => {
  it('equips the starter weapon with its exact source attributes', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    expect(p.attackPower).toBe(50); // bare-handed level 1
    expect(sim.mir4EquipStarterWeapon()).toBe('Starter weapon equipped.');
    expect(p.attackPower).toBe(50 + 75);
    expect(p.mir4?.accuracy).toBe(0 + 5);
    expect(sim.mir4EquipStarterWeapon()).toBe('Already equipped.');
    expect(sim.mir4UnequipWeapon()).toBe('Weapon unequipped.');
    expect(p.attackPower).toBe(50);
    expect(sim.mir4UnequipWeapon()).toBe('Nothing equipped.');
  });

  it('the weapon survives the level-up recalc (gear never desyncs)', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(32);
    sim.mir4EquipStarterWeapon();
    const p = sim.entities.get(sim.playerId)!;
    // Quest turn-in drives a real multi-level jump through the mir4 funnel.
    sim.mir4TalkOrInspect(); // accept (player spawns beside Tarek)
    teleport(sim, 0, -6);
    sim.mir4TalkOrInspect();
    teleport(sim, 14, 6);
    sim.mir4TalkOrInspect();
    teleport(sim, -18, 2);
    sim.mir4TalkOrInspect();
    teleport(sim, 1.5, -10.5);
    expect(sim.mir4TalkOrInspect()).toBe('Primeiros Rastros complete.');
    const expected = advanceMir4Experience(1, 0, 1432);
    const row = mir4LevelRow(1, expected.level)!;
    expect(p.level).toBe(expected.level);
    expect(p.attackPower).toBe(row[5] + 75); // column 5: physicalAttack
    expect(p.mir4?.accuracy).toBe(row[9] + 5); // column 9: accuracy
  });

  it('wolf kills pay copper through the classic loot pipeline', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(33);
    const wolf = createMob(
      sim.nextId++,
      MIR4_MOBS.mir4_forest_wolf as never,
      1,
      sim.groundPos(
        sim.entities.get(sim.playerId)!.pos.x + 2,
        sim.entities.get(sim.playerId)!.pos.z,
      ),
    );
    sim.addEntity(wolf);
    expect(wolf.maxHp).toBe(mir4MobStats(1).maxHp);
    sim.castMir4Skill(1102, sim.playerId, wolf.id); // 125 of 127
    sim.tick();
    sim.mir4BasicAttack(sim.playerId, wolf.id); // lethal
    expect(wolf.dead).toBe(true);
    // Copper rides the corpse: looting pays the rolled band (2x[0.6..1.4] = 2).
    expect(sim.lootCorpse(wolf.id, sim.playerId)).toBe(true);
    expect(sim.players.get(sim.playerId)?.copper).toBe(2);
  });
});
