import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { mir4ArcQuest } from '../../src/sim/content/mir4/quests_arc';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  ensureMir4ArcEquipmentMilestones,
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
    grantMir4ArcAcceptGrants(sim.ctx, meta, potionQuest);
    grantMir4ArcAcceptGrants(sim.ctx, meta, potionQuest);
    expect(meta.mir4ArcRewards?.items).toEqual({ 'potion-minor-bound': 3 });
    expect(sim.countItem('minor_healing_potion')).toBe(3);

    grantMir4ArcAcceptGrants(sim.ctx, meta, mir4ArcQuest('M03-Q01')!);
    expect(meta.mir4Materials?.moonStone).toBe(5);
  });

  it('grants each class its recovered rank-one weapon when M01-Q03 is accepted', () => {
    const classes = [
      ['warrior', 991010101],
      ['elementalist', 991010201],
      ['taoist', 991010301],
      ['arbalist', 991010401],
      ['lancer', 991010501],
    ] as const;

    for (const [playerClass, itemId] of classes) {
      const sim = makeSim(playerClass);
      const meta = sim.players.get(sim.playerId)!;
      const quest = mir4ArcQuest('M01-Q03')!;
      grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
      grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
      expect(meta.mir4ArcRewards?.items?.[String(itemId)], playerClass).toBe(1);
    }
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

  it('grants native catalog loadouts at campaign milestones and repairs old saves once', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q06': { questId: 'M01-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
      'M02-Q06': { questId: 'M02-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
      'M03-Q06': { questId: 'M03-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
      'M05-Q06': { questId: 'M05-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
      'M07-Q06': { questId: 'M07-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
      'M09-Q06': { questId: 'M09-Q06', stageIndex: 6, stageProgress: 0, state: 'done' },
    };

    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(true);
    expect(meta.mir4ArcRewards?.items).toMatchObject({
      '991010106': 1,
      '991020106': 1,
      '991030106': 1,
      '991040106': 1,
      '991050106': 1,
      '991060106': 1,
      '991070106': 1,
      '991080106': 1,
    });
    expect(meta.mir4ArcRewards?.claimedGrantIds).toContain('campaign-equipment-rank-6-class-1');
    expect(ensureMir4ArcEquipmentMilestones(sim.ctx, meta)).toBe(false);
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
