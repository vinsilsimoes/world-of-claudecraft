import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_EQUIPMENT_CATALOG } from '../../src/sim/content/mir4/equipment_catalog';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  MIR4_VILLAGE_PROVISIONER_NPC_ID,
  mir4BuyVillageEquipment,
  mir4VillageEquipmentOffers,
  mir4VillageEquipmentOffersForProgress,
} from '../../src/sim/mir4/starter_vendor';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

const CLASS_CASES = [
  ['warrior', 1],
  ['elementalist', 2],
  ['taoist', 3],
  ['arbalist', 4],
  ['lancer', 5],
] as const satisfies readonly (readonly [Mir4ClassKey, number])[];

function makeSim(playerClass: Mir4ClassKey = 'arbalist'): Sim {
  const world = buildMir4ArcWorld(1);
  setActiveWorldContent(world);
  return new Sim({
    seed: 825,
    playerClass: 'warrior',
    playerClassMir4: playerClass,
    playerName: 'Vendor Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 village provisioner', () => {
  it('offers only the separate starter weapon and armor for the active class', () => {
    const craftedIds = new Set(MIR4_EQUIPMENT_CATALOG.map((item) => item.itemId));
    for (const [, classId] of CLASS_CASES) {
      const offers = mir4VillageEquipmentOffers(classId);
      expect(offers, `class ${classId}`).toHaveLength(2);
      expect(offers.every((offer) => offer.item.classId === classId)).toBe(true);
      expect(offers.every((offer) => offer.item.catalogRank === 1)).toBe(true);
      expect(new Set(offers.map((offer) => offer.item.equipSlot))).toEqual(new Set([1, 5]));
      expect(offers.every((offer) => !craftedIds.has(offer.item.itemId))).toBe(true);
    }
  });

  it('keeps starter replacements available independently of campaign progress', () => {
    const q1 = { state: 'done' as const };
    const q2 = { state: 'active' as const };

    expect(
      mir4VillageEquipmentOffersForProgress(4, { 'M01-Q01': q1 }).map(
        (offer) => offer.item.equipSlot,
      ),
    ).toEqual([1, 5]);
    expect(
      mir4VillageEquipmentOffersForProgress(4, {
        'M01-Q01': q1,
        'M01-Q02': q2,
      }).map((offer) => offer.item.equipSlot),
    ).toEqual([1, 5]);
  });

  it('sells one missing class item for every class only while the player is beside Sara', () => {
    for (const [playerClass, classId] of CLASS_CASES) {
      const sim = makeSim(playerClass);
      const player = sim.entities.get(sim.playerId) as Entity;
      const merchant = [...sim.entities.values()].find(
        (entity) => entity.kind === 'npc' && entity.templateId === MIR4_VILLAGE_PROVISIONER_NPC_ID,
      );
      expect(merchant).toBeDefined();
      const offer = mir4VillageEquipmentOffers(classId).find(
        (candidate) => candidate.item.equipSlot === 5,
      )!;
      const meta = sim.players.get(sim.playerId)!;
      delete meta.mir4EquipmentInstances?.[offer.item.itemId];
      delete meta.mir4Equipment?.[5];
      meta.mir4ArcQuests = {
        'M01-Q01': {
          questId: 'M01-Q01',
          stageIndex: 0,
          stageProgress: 0,
          state: 'active',
        },
      };
      meta.copper = offer.copper;
      player.pos = { ...merchant!.pos };

      expect(
        mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant!.id, offer.item.itemId),
        playerClass,
      ).toBe('purchased');
      expect(meta.copper).toBe(0);
      expect(meta.mir4EquipmentInstances?.[offer.item.itemId]).toEqual({
        itemId: offer.item.itemId,
        enhancement: 0,
      });
      expect(mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant!.id, offer.item.itemId)).toBe(
        'already-owned',
      );
    }
  });

  it('lets a nearby player buy the healing and mana potions advertised by Sara', () => {
    const sim = makeSim('warrior');
    const player = sim.entities.get(sim.playerId)!;
    const merchant = [...sim.entities.values()].find(
      (entity) => entity.kind === 'npc' && entity.templateId === MIR4_VILLAGE_PROVISIONER_NPC_ID,
    );
    expect(merchant?.vendorItems).toEqual(
      expect.arrayContaining(['minor_healing_potion', 'minor_mana_potion']),
    );
    player.pos = { ...merchant!.pos };
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 10_000;
    const healingBefore = sim.countItem('minor_healing_potion');
    const manaBefore = sim.countItem('minor_mana_potion');

    sim.buyItem(merchant!.id, 'minor_healing_potion');
    sim.buyItem(merchant!.id, 'minor_mana_potion');

    expect(sim.countItem('minor_healing_potion')).toBe(healingBefore + 1);
    expect(sim.countItem('minor_mana_potion')).toBe(manaBefore + 1);
    expect(meta.copper).toBe(9_992);
  });

  it('rejects remote, wrong-class and unaffordable purchases', () => {
    const sim = makeSim();
    const merchant = [...sim.entities.values()].find(
      (entity) => entity.kind === 'npc' && entity.templateId === MIR4_VILLAGE_PROVISIONER_NPC_ID,
    )!;
    const arbalist = mir4VillageEquipmentOffers(4).find(
      (candidate) => candidate.item.equipSlot === 5,
    )!;
    const warrior = mir4VillageEquipmentOffers(1).find(
      (candidate) => candidate.item.equipSlot === 5,
    )!;
    const player = sim.entities.get(sim.playerId)!;
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.copper = 1_000_000;

    expect(mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant.id, arbalist.item.itemId)).toBe(
      'out-of-range',
    );
    player.pos = { ...merchant.pos };
    expect(mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant.id, warrior.item.itemId)).toBe(
      'wrong-class',
    );
    delete meta.mir4EquipmentInstances?.[arbalist.item.itemId];
    delete meta.mir4Equipment?.[5];
    meta.copper = 0;
    expect(mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant.id, arbalist.item.itemId)).toBe(
      'not-enough-copper',
    );
  });
});
