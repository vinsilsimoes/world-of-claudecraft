import { afterAll, describe, expect, it } from 'vitest';
import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_EQUIPMENT_CATALOG } from '../../src/sim/content/mir4/equipment_catalog';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  ensureMir4ArcEquipmentMilestones,
  ensureMir4ArcTutorialGrants,
  ensureMir4ArcXpLedger,
  grantMir4ArcAcceptGrants,
  grantMir4ArcQuestRewards,
  sanitizeMir4ArcRewards,
} from '../../src/sim/mir4/arc_rewards';
import { Sim } from '../../src/sim/sim';
import { type Mir4ClassKey, PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(playerClass: Mir4ClassKey = 'warrior'): Sim {
  const world = buildMir4ArcWorld(3);
  setActiveWorldContent(world);
  return new Sim({
    seed: 831,
    playerClass: 'warrior',
    playerClassMir4: playerClass,
    playerName: 'Rewarder',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 campaign reward ledger', () => {
  it('grants exact accept items once and maps native material ids into the runtime wallet', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const potionQuest = mir4ArcQuest('M01-Q02')!;
    const starterPotions = sim.countItem('minor_healing_potion');
    grantMir4ArcAcceptGrants(sim.ctx, meta, potionQuest);
    grantMir4ArcAcceptGrants(sim.ctx, meta, potionQuest);
    expect(meta.mir4ArcRewards?.items).toEqual({ 'potion-minor-bound': 20 });
    expect(sim.countItem('minor_healing_potion')).toBe(starterPotions + 20);

    grantMir4ArcAcceptGrants(sim.ctx, meta, mir4ArcQuest('M03-Q01')!);
    expect(meta.mir4Materials?.moonStone).toBe(5);
  });

  it('provisions the native WoC mining and herbalism tools before Training materials matter', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q04')!;

    grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
    grantMir4ArcAcceptGrants(sim.ctx, meta, quest);

    expect(sim.countItem('copper_mining_pick')).toBe(1);
    expect(sim.countItem('gathering_sickle')).toBe(1);
    expect(meta.mir4ArcRewards?.items?.copper_mining_pick).toBeUndefined();
    expect(meta.mir4ArcRewards?.items?.gathering_sickle).toBeUndefined();
  });

  it('retries the two native tools atomically after enough bag space is freed', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q04')!;
    meta.bags = [null, null, null, null];
    meta.inventory = Array.from({ length: 16 }, () => ({
      itemId: 'worn_sword',
      count: 1,
    }));
    meta.mir4ArcQuests = {
      'M01-Q04': {
        questId: 'M01-Q04',
        stageIndex: 0,
        stageProgress: 0,
        state: 'active',
      },
    };

    grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
    expect(meta.inventory).toHaveLength(16);
    expect(sim.countItem('copper_mining_pick')).toBe(0);
    expect(sim.countItem('gathering_sickle')).toBe(0);
    expect(meta.mir4ArcRewards?.claimedGrantIds ?? []).not.toContain(
      'tutorial-m01-q04-mining-pick',
    );

    meta.inventory.pop();
    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(false);
    expect(meta.inventory).toHaveLength(15);
    meta.inventory.pop();
    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(true);
    expect(meta.inventory).toHaveLength(16);
    expect(sim.countItem('copper_mining_pick')).toBe(1);
    expect(sim.countItem('gathering_sickle')).toBe(1);

    const saved = sim.serializeCharacter(sim.playerId)!;
    const restored = new Sim({
      seed: 826,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Restored tools',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world: buildMir4ArcWorld(1),
      noPlayer: true,
    });
    const restoredPid = restored.addPlayer('warrior', 'Restored tools', {
      state: saved,
    });
    expect(restored.countItem('copper_mining_pick', restoredPid)).toBe(1);
    expect(restored.countItem('gathering_sickle', restoredPid)).toBe(1);
  });

  it('recovers only each class starter weapon when M01-Q03 is accepted', () => {
    const classes = [
      ['warrior', 200201000],
      ['elementalist', 200202000],
      ['taoist', 200203000],
      ['arbalist', 200204000],
      ['lancer', 200205000],
    ] as const;

    for (const [playerClass, itemId] of classes) {
      const sim = makeSim(playerClass);
      const meta = sim.players.get(sim.playerId)!;
      const quest = mir4ArcQuest('M01-Q03')!;
      grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
      grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
      expect(meta.mir4EquipmentInstances?.[itemId], playerClass).toMatchObject({
        itemId,
        enhancement: 0,
      });
      expect(meta.mir4ArcRewards?.items?.[String(itemId)], playerClass).toBeUndefined();
    }
  });

  it('does not grant crafted equipment throughout the first main quests', () => {
    const classes = [
      ['warrior', 1],
      ['elementalist', 2],
      ['taoist', 3],
      ['arbalist', 4],
      ['lancer', 5],
    ] as const satisfies readonly (readonly [Mir4ClassKey, number])[];
    const questIds = ['M01-Q01', 'M01-Q02', 'M01-Q03', 'M01-Q04', 'M01-Q05', 'M01-Q06'];

    for (const [playerClass, classId] of classes) {
      const sim = makeSim(playerClass);
      const meta = sim.players.get(sim.playerId)!;
      for (const questId of questIds) {
        grantMir4ArcQuestRewards(sim.ctx, meta, mir4ArcQuest(questId)!);
      }

      const granted = MIR4_EQUIPMENT_CATALOG.filter(
        (item) => item.catalogRank === 1 && meta.mir4EquipmentInstances?.[item.itemId],
      );
      expect(granted, `${playerClass} class ${classId}`).toEqual([]);
    }
  });

  it('does not duplicate equipment bought before its early quest reward', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const itemId = 991080101;
    meta.mir4EquipmentInstances = {
      ...meta.mir4EquipmentInstances,
      [itemId]: { itemId, enhancement: 0 },
    };

    grantMir4ArcQuestRewards(sim.ctx, meta, mir4ArcQuest('M01-Q01')!);

    expect(meta.mir4EquipmentInstances[itemId]).toEqual({
      itemId,
      enhancement: 0,
    });
    expect(meta.mir4ArcRewards?.items?.[String(itemId)]).toBeUndefined();
  });

  it('does not recreate a destroyed crafted item from quest progress', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const itemId = 991080101;
    meta.mir4EquipmentInstances = {
      ...meta.mir4EquipmentInstances,
      [itemId]: { itemId, enhancement: 9, destroyed: true },
    };
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: mir4ArcQuest('M01-Q01')!.stages.length,
        stageProgress: 0,
        state: 'done',
      },
    };

    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);
    expect(meta.mir4EquipmentInstances[itemId]).toEqual({
      itemId,
      enhancement: 9,
      destroyed: true,
    });
    expect(meta.mir4ArcRewards?.items?.[String(itemId)]).toBeUndefined();
  });

  it('preserves legacy crafted-item ownership without minting replacement instances', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const bootsItemId = 991080101;
    const rankTwoWeaponId = 991010102;
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: mir4ArcQuest('M01-Q01')!.stages.length,
        stageProgress: 0,
        state: 'done',
      },
      'M02-Q06': {
        questId: 'M02-Q06',
        stageIndex: mir4ArcQuest('M02-Q06')!.stages.length,
        stageProgress: 0,
        state: 'done',
      },
    };
    meta.mir4EquipmentInstances = {
      [bootsItemId]: { itemId: bootsItemId, enhancement: 7, destroyed: true },
    };
    meta.mir4ArcRewards = {
      items: { [bootsItemId]: 1, [rankTwoWeaponId]: 1 },
      claimedGrantIds: ['campaign-equipment-m01-q01-class-1', 'campaign-equipment-rank-2-class-1'],
    };

    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);
    expect(meta.mir4EquipmentInstances[bootsItemId]).toEqual({
      itemId: bootsItemId,
      enhancement: 7,
      destroyed: true,
    });
    expect(meta.mir4EquipmentInstances[rankTwoWeaponId]).toBeUndefined();
    expect(meta.mir4ArcRewards.items).toEqual({
      [bootsItemId]: 1,
      [rankTwoWeaponId]: 1,
    });
    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);

    const saved = sim.serializeCharacter(sim.playerId)!;
    const restored = new Sim({
      seed: 827,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Restored equipment',
      gameProfile: 'mir4-gameplay-port',
      idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
      world: buildMir4ArcWorld(1),
      noPlayer: true,
    });
    const restoredPid = restored.addPlayer('warrior', 'Restored equipment', {
      state: saved,
    });
    const restoredMeta = restored.players.get(restoredPid)!;
    expect(restoredMeta.mir4EquipmentInstances?.[rankTwoWeaponId]).toBeUndefined();
    expect(restoredMeta.mir4ArcRewards?.items).toEqual({
      [bootsItemId]: 1,
      [rankTwoWeaponId]: 1,
    });
  });

  it('pays XP, copper, logical materials, unlocks and mount tickets from authored rewards', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const copperBefore = meta.copper;
    grantMir4ArcQuestRewards(sim.ctx, meta, mir4ArcQuest('M03-Q03')!);
    expect(meta.copper - copperBefore).toBe(5400);
    expect(meta.mir4ArcRewards).toMatchObject({
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
      items: {
        'material-ferro-tumular': 2,
        'material-tecido': 2,
      },
    });
    expect(meta.xp).toBeGreaterThan(0);
    expect(meta.ridingTrained).toBe(true);
  });

  it('does not apply the inventory stack cap to high-level campaign XP', () => {
    const sim = makeSim('elementalist');
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M15-S01')!;
    const xpBefore = meta.counters.xpGained;

    grantMir4ArcQuestRewards(sim.ctx, meta, quest);

    expect(quest.xp).toBe(32_497_786_564);
    expect(meta.counters.xpGained - xpBefore).toBe(quest.xp);
  });

  it('repairs the historical XP stack-cap underpayment exactly once', () => {
    const sim = makeSim('elementalist');
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M15-S01')!;
    meta.mir4ArcQuests = {
      [quest.questId]: {
        questId: quest.questId,
        stageIndex: quest.stages.length,
        stageProgress: 0,
        state: 'done',
      },
    };
    const xpBefore = meta.counters.xpGained;

    expect(ensureMir4ArcXpLedger(sim.ctx, meta)).toBe(true);
    expect(meta.counters.xpGained - xpBefore).toBe(quest.xp! - 1_000_000_000);
    expect(meta.mir4ArcRewards?.xpLedgerVersion).toBe(2);

    const repairedXp = meta.counters.xpGained;
    expect(ensureMir4ArcXpLedger(sim.ctx, meta)).toBe(false);
    expect(meta.counters.xpGained).toBe(repairedXp);
  });

  it('never grants catalog loadouts from campaign milestones', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q06': {
        questId: 'M01-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
      'M02-Q06': {
        questId: 'M02-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
      'M03-Q06': {
        questId: 'M03-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
      'M05-Q06': {
        questId: 'M05-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
      'M07-Q06': {
        questId: 'M07-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
      'M09-Q06': {
        questId: 'M09-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
    };

    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);
    for (const itemId of [
      991010106, 991020106, 991030106, 991040106, 991050106, 991060106, 991070106, 991080106,
    ]) {
      expect(meta.mir4EquipmentInstances?.[itemId]).toBeUndefined();
      expect(meta.mir4ArcRewards?.items?.[String(itemId)]).toBeUndefined();
    }
    expect(meta.mir4ArcRewards?.claimedGrantIds ?? []).not.toContain(
      'campaign-equipment-rank-6-class-1',
    );
    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);
  });

  it('repairs only the missing guaranteed attempts in the M04 enhancement tutorial', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const weaponItemId = 991010101;
    meta.mir4Equipment = { 1: weaponItemId };
    meta.mir4EquipmentInstances = {
      [weaponItemId]: { itemId: weaponItemId, enhancement: 1 },
    };
    meta.mir4Materials = {
      ...meta.mir4Materials!,
      sunStone: 3,
      solarScroll: 0,
    };
    meta.copper = 15_000;
    meta.mir4ArcQuests = {
      'M04-Q03': {
        questId: 'M04-Q03',
        stageIndex: 3,
        stageProgress: 0,
        state: 'active',
      },
    };

    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(true);
    expect(meta.mir4Materials.solarScroll).toBe(1);
    expect(meta.mir4ArcRewards?.claimedGrantIds).toContain('tutorial-m04-q03-enhancement-recovery');
    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(false);
    expect(meta.mir4Materials.solarScroll).toBe(1);

    expect(
      sanitizeMir4ArcRewards({
        claimedGrantIds: meta.mir4ArcRewards?.claimedGrantIds,
      }),
    ).toEqual({ claimedGrantIds: ['tutorial-m04-q03-enhancement-recovery'] });
  });

  it('does not add recovery scrolls when the authored M04 materials can reach +5', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const weaponItemId = 991010101;
    meta.mir4Equipment = { 1: weaponItemId };
    meta.mir4EquipmentInstances = {
      [weaponItemId]: { itemId: weaponItemId, enhancement: 2 },
    };
    meta.mir4Materials = {
      ...meta.mir4Materials!,
      sunStone: 3,
      solarScroll: 0,
    };
    meta.copper = 15_000;
    meta.mir4ArcQuests = {
      'M04-Q03': {
        questId: 'M04-Q03',
        stageIndex: 3,
        stageProgress: 0,
        state: 'active',
      },
    };

    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(false);
    expect(meta.mir4Materials.solarScroll).toBe(0);
    expect(meta.mir4ArcRewards?.claimedGrantIds ?? []).not.toContain(
      'tutorial-m04-q03-enhancement-recovery',
    );
  });

  it('drops injected ids and clamps malformed counts at the persistence boundary', () => {
    expect(
      sanitizeMir4ArcRewards({
        items: { 'material-tecido': 2.9, injected: 999 },
        systems: ['mount-summon', 'god-mode'],
        tickets: { 'mount-ticket-dawn': 1, forged: 100 },
        claimedGrantIds: ['campaign-mount-01', 'forged-grant'],
      }),
    ).toEqual({
      items: { 'material-tecido': 2 },
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
      claimedGrantIds: ['campaign-mount-01'],
    });
  });
});
