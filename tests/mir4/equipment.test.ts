import { afterAll, describe, expect, it } from 'vitest';
import { mir4LevelRow } from '../../src/sim/content/mir4';
import { MIR4_MOBS, mir4MobStats } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { advanceMir4Experience } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
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

function makeClassSim(cls: Mir4ClassKey, seed: number): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
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
  it.each([
    ['warrior', 200201000, 301201000],
    ['elementalist', 200202000, 301202000],
    ['taoist', 200203000, 301203000],
    ['arbalist', 200204000, 301204000],
    ['lancer', 200205000, 301205000],
  ] as const)(
    'creates and persists the exact %s starter weapon and armor',
    (cls, weaponId, armorId) => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeClassSim(cls, 40 + (weaponId % 10));

      const meta = sim.players.get(sim.playerId);
      expect(meta?.mir4Equipment).toEqual({ 1: weaponId, 5: armorId });
      expect(meta?.mir4EquipmentInstances?.[weaponId]).toEqual({
        itemId: weaponId,
        enhancement: 0,
      });
      expect(meta?.mir4EquipmentInstances?.[armorId]).toEqual({
        itemId: armorId,
        enhancement: 0,
      });
      expect(sim.mir4EquipStarterWeapon()).toBe('Already equipped.');

      const saved = sim.serializeCharacter(sim.playerId);
      if (!saved) throw new Error('MIR4 starter equipment must serialize');
      const restoredHost = makeClassSim('warrior', 90 + (weaponId % 10));
      const restoredPid = restoredHost.addPlayer(cls, 'Restored', { state: saved });
      const restoredMeta = restoredHost.players.get(restoredPid);
      expect(restoredMeta?.mir4Equipment).toEqual({ 1: weaponId, 5: armorId });
      expect(restoredMeta?.mir4EquipmentInstances?.[weaponId]).toEqual({
        itemId: weaponId,
        enhancement: 0,
      });
      expect(restoredMeta?.mir4EquipmentInstances?.[armorId]).toEqual({
        itemId: armorId,
        enhancement: 0,
      });
      expect(restoredHost.mir4UnequipWeapon(restoredPid)).toBe('Weapon unequipped.');
      expect(restoredMeta?.mir4Equipment?.[1]).toBeUndefined();
      expect(restoredMeta?.mir4Equipment?.[5]).toBe(armorId);
    },
  );

  it('equips the starter weapon with its exact source attributes', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    expect(p.attackPower).toBe(50 + 75);
    expect(p.mir4?.physicalDefense).toBe(12);
    expect(p.mir4?.magicDefense).toBe(12);
    expect(p.mir4?.accuracy).toBe(5);
    expect(p.mir4?.skillDamageBps).toBe(10);
    expect(sim.mir4EquipStarterWeapon()).toBe('Already equipped.');
    expect(sim.mir4UnequipWeapon()).toBe('Weapon unequipped.');
    expect(p.attackPower).toBe(50);
    expect(p.mir4?.skillDamageBps).toBe(0);
    expect(sim.mir4UnequipWeapon()).toBe('Nothing equipped.');
  });

  it('re-equips only an owned, non-destroyed starter weapon', () => {
    const sim = makeSim(39);
    const meta = sim.players.get(sim.playerId)!;

    expect(sim.mir4UnequipWeapon()).toBe('Weapon unequipped.');
    expect(sim.mir4EquipStarterWeapon()).toBe('Starter weapon equipped.');
    expect(meta.mir4Equipment?.[1]).toBe(200201000);

    expect(sim.mir4UnequipWeapon()).toBe('Weapon unequipped.');
    const starter = meta.mir4EquipmentInstances?.[200201000];
    if (!starter) throw new Error('starter weapon instance missing');
    starter.destroyed = true;
    expect(sim.mir4EquipStarterWeapon()).toBe('Unknown item.');
    expect(meta.mir4Equipment?.[1]).toBeUndefined();
    expect(starter.destroyed).toBe(true);
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
    sim.mir4BasicAttack(wolf.id); // lethal (scheduled at the 280ms offset)
    for (let t = 0; t < 7 && !wolf.dead; t++) sim.tick();
    expect(wolf.dead).toBe(true);
    // Copper rides the corpse: looting pays the rolled band (2x[0.6..1.4] = 2).
    expect(sim.lootCorpse(wolf.id, sim.playerId)).toBe(true);
    expect(sim.players.get(sim.playerId)?.copper).toBe(2);
  });
});
