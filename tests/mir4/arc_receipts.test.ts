import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_QUESTS_ARC, mir4ArcQuest } from '../../src/sim/content/mir4/quests_arc';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ResolveLayer, mir4RollLayer } from '../../src/sim/mir4/affixes';
import { mir4ArcObjectiveUsesInteract } from '../../src/sim/mir4/arc_quest_runtime';
import {
  creditMir4ArcTutorialReceipt,
  type Mir4ArcTutorialReceipt,
} from '../../src/sim/mir4/arc_receipts';
import { redeemMir4CollectionTicket } from '../../src/sim/mir4/collection_tickets';
import { mir4Craft } from '../../src/sim/mir4/crafting';
import { MIR4_EMPTY_MATERIALS, mir4Enhance } from '../../src/sim/mir4/equipment';
import { equipMir4Mount } from '../../src/sim/mir4/mount_commands';
import { combineMir4Spirits, equipMir4Spirit } from '../../src/sim/mir4/spirit_commands';
import { MIR4_ARC_PORTALS } from '../../src/sim/mir4/travel';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(): Sim {
  const world = buildMir4ArcWorld(1);
  setActiveWorldContent(world);
  const sim = new Sim({
    seed: 857,
    playerClass: 'warrior',
    playerName: 'Learner',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
  sim.players.get(sim.playerId)!.mir4ArcRewards = { items: { '991010101': 1 } };
  return sim;
}

afterAll(() => setActiveWorldContent(null));

function armTutorial(sim: Sim, questId: string) {
  const quest = mir4ArcQuest(questId)!;
  const stageIndex = quest.stages.findIndex((stage) => stage.kind === 'system-tutorial');
  if (stageIndex < 0) throw new Error(`${questId} has no system tutorial`);
  const progress = {
    questId,
    stageIndex,
    stageProgress: 0,
    state: 'active' as const,
  };
  sim.players.get(sim.playerId)!.mir4ArcQuests = { [questId]: progress };
  return progress;
}

describe('MIR4 campaign gameplay receipts', () => {
  it('credits the potion tutorial only after the native WoC consumable is actually used', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 3,
        stageProgress: 0,
        state: 'active',
      },
    };
    sim.addItem('minor_healing_potion', 1);
    sim.player.hp -= 20;
    sim.useItem('minor_healing_potion');
    expect(meta.mir4ArcQuests['M01-Q02']?.stageIndex).toBe(4);
  });

  it('waits for the exact +2 enhancement milestone before crediting its tutorial', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q06': {
        questId: 'M01-Q06',
        stageIndex: 3,
        stageProgress: 0,
        state: 'active',
      },
    };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, solarScroll: 2 };
    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toMatchObject({ ok: true, level: 1 });
    expect(meta.mir4ArcQuests['M01-Q06']?.stageIndex).toBe(3);
    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toMatchObject({ ok: true, level: 2 });
    expect(meta.mir4ArcQuests['M01-Q06']?.stageIndex).toBe(4);
  });

  it('routes equipment and crafting lessons through successful authoritative verbs', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const equip = armTutorial(sim, 'M01-Q03');
    expect(sim.mir4EquipItem(991010101)).toBe('Espada Gasta equipped.');
    expect(equip.stageIndex).toBeGreaterThan(2);

    const craft = armTutorial(sim, 'M01-Q04');
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, sunStone: 1 };
    meta.copper = 5_000;
    expect(mir4Craft(sim.ctx, sim.playerId, 'solar-scroll')).toEqual({
      ok: true,
      output: 'solarScroll',
      count: 1,
    });
    expect(craft.stageIndex).toBeGreaterThan(2);
  });

  it('credits portal travel only after the existing positional portal teleports the player', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M02-Q01');
    const portal = MIR4_ARC_PORTALS[0]!;
    sim.player.pos = sim.groundPos(portal.a.x, portal.a.z);
    sim.player.prevPos = { ...sim.player.pos };
    sim.tick();
    expect(progress.stageIndex).toBeGreaterThan(2);
    expect(sim.player.pos.z).toBeCloseTo(portal.b.landing.z, 5);
  });

  it('credits enchantment and blessing only after a pending roll is resolved', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const enchant = armTutorial(sim, 'M03-Q01');
    const enchantStageIndex = enchant.stageIndex;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const enchantRoll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(enchantRoll.ok).toBe(true);
    expect(enchant.stageIndex).toBe(enchantStageIndex);
    if (!enchantRoll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', enchantRoll.rollId, false),
    ).toEqual({ ok: true, accepted: false });
    expect(enchant.stageIndex).toBe(enchantStageIndex + 1);

    const blessing = armTutorial(sim, 'M04-Q04');
    const blessingStageIndex = blessing.stageIndex;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, dawnTear: 1 };
    const blessingRoll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'blessing');
    expect(blessingRoll.ok).toBe(true);
    if (!blessingRoll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'blessing', blessingRoll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    expect(blessing.stageIndex).toBe(blessingStageIndex + 1);
  });

  it('routes Spirit equip and 4-to-1 combination through the existing Bags actions', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = { systems: ['spirit-summon'] };
    meta.mir4Spirits = {
      owned: { 'spirit-common-01': 4 },
      discovered: ['spirit-common-01'],
    };
    const equip = armTutorial(sim, 'M02-Q04');
    expect(equipMir4Spirit(sim.ctx, sim.playerId, 'spirit-common-01')).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    expect(equip.stageIndex).toBeGreaterThan(2);

    const combine = armTutorial(sim, 'M10-Q03');
    expect(combineMir4Spirits(sim.ctx, sim.playerId, 1).ok).toBe(true);
    expect(combine.stageIndex).toBeGreaterThan(2);
  });

  it('credits the mount lesson only when native WoC reins start a valid summon', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const progress = armTutorial(sim, 'M03-Q04');
    meta.mir4ArcRewards = {
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
    };
    const result = redeemMir4CollectionTicket(sim.ctx, sim.playerId, 'mount-ticket-dawn');
    expect(result.ok).toBe(true);
    if (!result.ok || !result.mountId) return;
    expect(equipMir4Mount(sim.ctx, sim.playerId, result.mountId)).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    expect(sim.player.mountCastKey).not.toBe('');
    expect(progress.stageIndex).toBeGreaterThan(2);
  });

  it('has a concrete receipt or native Interact route for every authored system lesson', () => {
    const sim = makeSim();
    const receipts: readonly Mir4ArcTutorialReceipt[] = [
      { kind: 'use-health-potion' },
      { kind: 'enhance-item', level: 15 },
      { kind: 'equip-item' },
      { kind: 'craft-item' },
      { kind: 'portal-travel' },
      { kind: 'equip-spirit' },
      { kind: 'combine-spirit' },
      { kind: 'resolve-enchantment' },
      { kind: 'resolve-blessing' },
      { kind: 'summon-mount' },
    ];
    const tutorials = MIR4_QUESTS_ARC.flatMap((quest) =>
      quest.stages
        .map((stage, stageIndex) => ({ quest, stage, stageIndex }))
        .filter(({ stage }) => stage.kind === 'system-tutorial'),
    );
    expect(tutorials).toHaveLength(30);
    for (const { quest, stage, stageIndex } of tutorials) {
      if (mir4ArcObjectiveUsesInteract(stage)) continue;
      const progress = {
        questId: quest.questId,
        stageIndex,
        stageProgress: 0,
        state: 'active' as const,
      };
      const meta = sim.players.get(sim.playerId)!;
      meta.mir4ArcQuests = { [quest.questId]: progress };
      expect(
        receipts.some((receipt) => creditMir4ArcTutorialReceipt(meta, receipt)),
        `${quest.questId}: ${stage.lesson}`,
      ).toBe(true);
    }
  });

  it('fails closed when a valid receipt does not match the current authored lesson', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q03');
    const stageIndex = progress.stageIndex;
    expect(
      creditMir4ArcTutorialReceipt(sim.players.get(sim.playerId)!, { kind: 'combine-spirit' }),
    ).toBe(false);
    expect(progress.stageIndex).toBe(stageIndex);
  });
});
