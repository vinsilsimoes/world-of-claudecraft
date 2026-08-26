import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
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
  it('offers only rank-one equipment for the active class', () => {
    for (const [, classId] of CLASS_CASES) {
      const offers = mir4VillageEquipmentOffers(classId);
      expect(offers, `class ${classId}`).toHaveLength(8);
      expect(offers.every((offer) => offer.item.classId === classId)).toBe(true);
      expect(offers.every((offer) => offer.item.catalogRank === 1)).toBe(true);
      expect(new Set(offers.map((offer) => offer.item.equipSlot))).toEqual(
        new Set([1, 2, 3, 4, 5, 6, 7, 8]),
      );
    }
  });

  it('unlocks only the equipment reached by the current M01 progression', () => {
    const q1 = { state: 'done' as const };
    const q2 = { state: 'active' as const };

    expect(
      mir4VillageEquipmentOffersForProgress(4, { 'M01-Q01': q1 }).map(
        (offer) => offer.item.equipSlot,
      ),
    ).toEqual([8]);
    expect(
      mir4VillageEquipmentOffersForProgress(4, { 'M01-Q01': q1, 'M01-Q02': q2 }).map(
        (offer) => offer.item.equipSlot,
      ),
    ).toEqual([5, 8]);
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
        (candidate) => candidate.item.equipSlot === 8,
      )!;
      const meta = sim.players.get(sim.playerId)!;
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

  it('rejects remote, wrong-class and unaffordable purchases', () => {
    const sim = makeSim();
    const merchant = [...sim.entities.values()].find(
      (entity) => entity.kind === 'npc' && entity.templateId === MIR4_VILLAGE_PROVISIONER_NPC_ID,
    )!;
    const arbalist = mir4VillageEquipmentOffers(4).find(
      (candidate) => candidate.item.equipSlot === 8,
    )!;
    const warrior = mir4VillageEquipmentOffers(1).find(
      (candidate) => candidate.item.equipSlot === 8,
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
    meta.copper = 0;
    expect(mir4BuyVillageEquipment(sim.ctx, sim.playerId, merchant.id, arbalist.item.itemId)).toBe(
      'not-enough-copper',
    );
  });
});
