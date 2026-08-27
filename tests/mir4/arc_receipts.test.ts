import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_QUESTS_ARC, mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ResolveLayer, mir4RollLayer } from '../../src/sim/mir4/affixes';
import {
  acknowledgeMir4ArcTutorial,
  creditMir4ArcTutorialReceipt,
  type Mir4ArcTutorialReceipt,
} from '../../src/sim/mir4/arc_receipts';
import {
  ensureMir4ArcTutorialGrants,
  grantMir4ArcAcceptGrants,
} from '../../src/sim/mir4/arc_rewards';
import { redeemMir4CollectionTicket } from '../../src/sim/mir4/collection_tickets';
import { MIR4_HP_POTION_HEAL_BPS } from '../../src/sim/mir4/combat';
import { mir4Craft } from '../../src/sim/mir4/crafting';
import { MIR4_EMPTY_MATERIALS, mir4Enhance } from '../../src/sim/mir4/equipment';
import { equipMir4Mount } from '../../src/sim/mir4/mount_commands';
import { combineMir4Spirits, equipMir4Spirit } from '../../src/sim/mir4/spirit_commands';
import { MIR4_ARC_PORTALS } from '../../src/sim/mir4/travel';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { buildMir4InventoryView } from '../../src/ui/mir4_inventory_view';

function makeSim(maps = 1): Sim {
  const world = buildMir4ArcWorld(maps);
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
    sim.player.hp = Math.floor(sim.player.maxHp * 0.5);
    const before = sim.player.hp;
    sim.useItem('minor_healing_potion');
    expect(meta.mir4ArcQuests['M01-Q02']?.stageIndex).toBe(4);
    expect(sim.player.hp).toBe(
      before + Math.floor((sim.player.maxHp * MIR4_HP_POTION_HEAL_BPS) / 10_000),
    );
    expect(sim.player.potionCooldownUntil - sim.time).toBe(1);
  });

  it('credits the potion tutorial when a full-health player tries its slotted potion', () => {
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
    const potionCount = sim.countItem('minor_healing_potion');
    sim.addItem('minor_healing_potion', 1);

    expect(sim.player.hp).toBe(sim.player.maxHp);
    sim.useItem('minor_healing_potion');

    expect(meta.mir4ArcQuests['M01-Q02']?.stageIndex).toBe(4);
    expect(sim.countItem('minor_healing_potion')).toBe(potionCount + 1);
    expect(sim.player.potionCooldownUntil).toBeLessThanOrEqual(sim.time);
  });

  it('does not credit the potion tutorial for an unknown item', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q02');

    sim.useItem('missing_potion');

    expect(progress.stageIndex).toBe(3);
  });

  it('does not credit the potion tutorial without the health potion', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q02');
    sim.removeItem('minor_healing_potion', sim.countItem('minor_healing_potion'));

    sim.useItem('minor_healing_potion');

    expect(progress.stageIndex).toBe(3);
  });

  it('does not credit a full-health potion attempt while its cooldown is active', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q02');
    const potionCount = sim.countItem('minor_healing_potion');
    sim.addItem('minor_healing_potion', 1);
    const cooldownUntil = sim.time + 30;
    sim.player.potionCooldownUntil = cooldownUntil;

    sim.useItem('minor_healing_potion');

    expect(progress.stageIndex).toBe(3);
    expect(sim.countItem('minor_healing_potion')).toBe(potionCount + 1);
    expect(sim.player.potionCooldownUntil).toBe(cooldownUntil);
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
    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toMatchObject({
      ok: true,
      level: 1,
    });
    expect(meta.mir4ArcQuests['M01-Q06']?.stageIndex).toBe(3);
    expect(mir4Enhance(sim.ctx, sim.playerId, 991010101)).toMatchObject({
      ok: true,
      level: 2,
    });
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

  it('moves the recovered starter weapon into bags before requiring the real equip action', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId);
    const quest = mir4ArcQuest('M01-Q03');
    if (!meta || !quest) throw new Error('M01-Q03 tutorial fixture is incomplete');
    const starterWeaponId = 200201000;
    grantMir4ArcAcceptGrants(sim.ctx, meta, quest);
    const progress = armTutorial(sim, 'M01-Q03');

    expect(meta.mir4Equipment?.[1]).toBe(starterWeaponId);
    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(true);
    expect(meta.mir4Equipment?.[1]).toBeUndefined();
    expect(meta.mir4EquipmentInstances?.[starterWeaponId]).toEqual({
      itemId: starterWeaponId,
      enhancement: 0,
    });
    expect(progress.stageIndex).toBe(3);
    const tutorialState = sim.mir4PlayerState();
    if (!tutorialState) throw new Error('M01-Q03 tutorial state is unavailable');
    expect(buildMir4InventoryView(tutorialState).equipment.map((item) => item.itemId)).toContain(
      starterWeaponId,
    );

    expect(sim.mir4EquipItem(starterWeaponId)).toBe('Arma Inicial do Guerreiro equipped.');
    expect(meta.mir4Equipment?.[1]).toBe(starterWeaponId);
    expect(progress.stageIndex).toBe(4);
    expect(ensureMir4ArcTutorialGrants(sim.ctx, meta)).toBe(false);
    expect(meta.mir4Equipment?.[1]).toBe(starterWeaponId);
  });

  it('credits portal travel only after the existing positional portal teleports the player', () => {
    const sim = makeSim(2);
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

    meta.mir4ArcRewards.items = { 'bound-spirit-replica': 4 };
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
    const tutorialStageIndex = progress.stageIndex;
    expect(equipMir4Mount(sim.ctx, sim.playerId, 'meadow-courser')).toEqual({
      ok: false,
      reason: 'not-owned',
    });
    expect(progress.stageIndex).toBe(tutorialStageIndex);
    const result = redeemMir4CollectionTicket(sim.ctx, sim.playerId, 'mount-ticket-dawn');
    expect(result.ok).toBe(true);
    if (!result.ok || !result.mountId) return;
    expect(progress.stageIndex).toBe(tutorialStageIndex);
    expect(equipMir4Mount(sim.ctx, sim.playerId, result.mountId)).toMatchObject({
      ok: true,
      status: 'equipped',
    });
    expect(sim.player.mountCastKey).not.toBe('');
    expect(progress.stageIndex).toBeGreaterThan(2);
  });

  it('has a concrete gameplay receipt or explicit existing-window acknowledgement for every lesson', () => {
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
      const progress = {
        questId: quest.questId,
        stageIndex,
        stageProgress: 0,
        state: 'active' as const,
      };
      const meta = sim.players.get(sim.playerId)!;
      meta.mir4ArcQuests = { [quest.questId]: progress };
      const receiptSatisfied = receipts.some((receipt) =>
        creditMir4ArcTutorialReceipt(meta, receipt),
      );
      expect(
        receiptSatisfied || acknowledgeMir4ArcTutorial(meta, quest.questId),
        `${quest.questId}: ${stage.lesson}`,
      ).toBe(true);
    }
  });

  it('does not let opening a window bypass equipment or crafting gameplay lessons', () => {
    const sim = makeSim();
    for (const questId of ['M01-Q03', 'M01-Q04', 'M01-Q06']) {
      const progress = armTutorial(sim, questId);
      const stageIndex = progress.stageIndex;
      expect(acknowledgeMir4ArcTutorial(sim.players.get(sim.playerId)!, questId)).toBe(false);
      expect(progress.stageIndex).toBe(stageIndex);
    }
  });

  it('keeps Auto Journey waiting at a tutorial until the taught action or window is used', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q01');
    const stageIndex = progress.stageIndex;
    sim.setMir4AutoQuest(true);
    for (let tick = 0; tick < 20; tick++) sim.tick();
    expect(progress.stageIndex).toBe(stageIndex);
    expect(sim.mir4AutoQuestActive()).toBe(true);
    expect(acknowledgeMir4ArcTutorial(sim.players.get(sim.playerId)!, 'M01-Q01')).toBe(true);
    expect(progress.stageIndex).toBe(stageIndex + 1);
  });

  it('fails closed when a valid receipt does not match the current authored lesson', () => {
    const sim = makeSim();
    const progress = armTutorial(sim, 'M01-Q03');
    const stageIndex = progress.stageIndex;
    expect(
      creditMir4ArcTutorialReceipt(sim.players.get(sim.playerId)!, {
        kind: 'combine-spirit',
      }),
    ).toBe(false);
    expect(progress.stageIndex).toBe(stageIndex);
  });
});
