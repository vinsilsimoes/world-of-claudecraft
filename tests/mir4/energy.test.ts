import { afterEach, describe, expect, it } from 'vitest';
import { mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { setActiveWorldContent } from '../../src/sim/data';
import { updateMir4ArcObjectiveEntities } from '../../src/sim/mir4/arc_quest_runtime';
import {
  MIR4_ENERGY_BASE_REWARD,
  MIR4_ENERGY_CAP,
  MIR4_ENERGY_CAST_SECONDS,
  MIR4_ENERGY_SITE_ITEM_ID,
} from '../../src/sim/mir4/energy';
import { sanitizeMir4PlayerState } from '../../src/sim/mir4/persistence';
import { MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX } from '../../src/sim/mir4/quest_objective_cast';
import { buildMir4WocComparisonWorld } from '../../src/sim/mir4/woc_comparison_world';
import { Sim } from '../../src/sim/sim';
import { GATHER_CAST_ID } from '../../src/sim/types';

function makeSim(): Sim {
  const world = { ...buildMir4WocComparisonWorld(1), camps: [] };
  setActiveWorldContent(world);
  return new Sim({
    seed: 86,
    playerClass: 'warrior',
    playerName: 'Meditante',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
}

function energySite(sim: Sim) {
  const site = [...sim.entities.values()].find(
    (entity) => entity.kind === 'object' && entity.objectItemId === MIR4_ENERGY_SITE_ITEM_ID,
  );
  if (!site) throw new Error('M01 Energy Gathering Site was not materialized');
  return site;
}

afterEach(() => setActiveWorldContent(null));

describe('MIR4 Energy gathering', () => {
  it('authors one physical site at the projected M01 Moss Cemetery', () => {
    const world = buildMir4WocComparisonWorld(1);
    const region = world.mir4ArcMapProjections?.find(
      (projection) => projection.mapId === 'm01-vila-do-vau',
    );
    const mossCemetery = region?.controlPoints?.[6]?.target;
    const sites = world.groundObjects.filter(
      (object) => object.itemId === MIR4_ENERGY_SITE_ITEM_ID,
    );

    expect(sites).toEqual([
      {
        itemId: MIR4_ENERGY_SITE_ITEM_ID,
        name: 'Energy Gathering Site',
        positions: [mossCemetery],
      },
    ]);
  });

  it('channels through the native gather lane and applies status 92 to its duration', () => {
    const sim = makeSim();
    const site = energySite(sim);
    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };
    sim.player.mir4!.statusValues = { ...sim.player.mir4!.statusValues, 92: 2_500 };

    expect(sim.pickUpObject(site.id)).toBe(true);
    expect(MIR4_ENERGY_CAST_SECONDS).toBe(5);
    expect(sim.player.castingAbility).toBe(GATHER_CAST_ID);
    expect(sim.player.castTotal).toBe(4);

    for (let tick = 0; tick < 79; tick++) sim.tick();
    expect(sim.players.get(sim.playerId)?.mir4Currencies?.energy ?? 0).toBe(0);
    sim.tick();

    expect(sim.players.get(sim.playerId)?.mir4Currencies).toEqual({ darksteel: 0, energy: 1 });
    expect(sim.entities.has(site.id)).toBe(true);
    expect(site.lootable).toBe(true);
  });

  it('pins the official cap, base duration and range checks without a status bonus', () => {
    const sim = makeSim();
    const site = energySite(sim);
    expect(MIR4_ENERGY_CAP).toBe(5_000_000);
    sim.player.pos = { x: site.pos.x + 7, y: site.pos.y, z: site.pos.z };
    sim.player.prevPos = { ...sim.player.pos };
    expect(sim.pickUpObject(site.id)).toBe(false);

    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };
    expect(sim.pickUpObject(site.id)).toBe(true);
    expect(sim.player.castTotal).toBe(5);

    sim.player.pos = { x: site.pos.x + 7, y: site.pos.y, z: site.pos.z };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.castRemaining = 0;
    sim.tick();
    expect(sim.players.get(sim.playerId)?.mir4Currencies?.energy ?? 0).toBe(0);
  });

  it('applies status 86 to the reward and preserves Darksteel', () => {
    const sim = makeSim();
    const site = energySite(sim);
    const meta = sim.players.get(sim.playerId)!;
    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };
    sim.player.mir4!.statusValues = { ...sim.player.mir4!.statusValues, 86: 10_000 };
    meta.mir4Currencies = { darksteel: 125, energy: 10 };

    expect(MIR4_ENERGY_BASE_REWARD).toBe(1);
    expect(sim.pickUpObject(site.id)).toBe(true);
    for (let tick = 0; tick < 100; tick++) sim.tick();

    expect(meta.mir4Currencies).toEqual({ darksteel: 125, energy: 12 });
  });

  it('saturates an amplified reward at the official Energy cap', () => {
    const sim = makeSim();
    const site = energySite(sim);
    const meta = sim.players.get(sim.playerId)!;
    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };
    sim.player.mir4!.statusValues = { ...sim.player.mir4!.statusValues, 86: 10_000 };
    meta.mir4Currencies = { darksteel: 0, energy: MIR4_ENERGY_CAP - 1 };

    expect(sim.pickUpObject(site.id)).toBe(true);
    for (let tick = 0; tick < 100; tick++) sim.tick();

    expect(meta.mir4Currencies.energy).toBe(5_000_000);
  });

  it('keeps a campaign objective ahead of the overlapping M01 Energy site', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q04')!;
    const stageIndex = quest.stages.findIndex((stage) => stage.kind === 'inspect-clues');
    meta.mir4ArcQuests = {
      [quest.questId]: {
        questId: quest.questId,
        stageIndex,
        stageProgress: 0,
        state: 'active',
      },
    };
    updateMir4ArcObjectiveEntities(sim.ctx);
    const objective = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'object' &&
        entity.ownerId === sim.playerId &&
        entity.templateId.startsWith(`mir4_objective_${sim.playerId}_`),
    );
    if (!objective) throw new Error('M01-Q04 clue was not materialized');
    const site = energySite(sim);
    expect(Math.hypot(site.pos.x - objective.pos.x, site.pos.z - objective.pos.z)).toBeLessThan(6);
    sim.player.pos = { ...objective.pos };
    sim.player.prevPos = { ...objective.pos };
    sim.player.targetId = null;

    sim.interact();

    expect(sim.player.gatherCastNodeId).toBe(
      `${MIR4_QUEST_OBJECTIVE_CAST_NODE_PREFIX}${objective.id}`,
    );
  });

  it('is interrupted by any real incoming damage without consuming the site or granting Energy', () => {
    const sim = makeSim();
    const site = energySite(sim);
    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };

    expect(sim.pickUpObject(site.id)).toBe(true);
    sim.ctx.dealDamage(null, sim.player, 1, false, 'shadow', null, 'resist');

    expect(sim.player.castingAbility).toBeNull();
    expect(sim.player.gatherCastNodeId).toBe('');
    expect(sim.players.get(sim.playerId)?.mir4Currencies?.energy ?? 0).toBe(0);
    expect(sim.entities.has(site.id)).toBe(true);
    for (let tick = 0; tick < 100; tick++) sim.tick();
    expect(sim.players.get(sim.playerId)?.mir4Currencies?.energy ?? 0).toBe(0);
  });

  it('ignores a zero event but interrupts when an incoming hit is fully absorbed', () => {
    const sim = makeSim();
    const site = energySite(sim);
    sim.player.pos = { ...site.pos };
    sim.player.prevPos = { ...site.pos };
    expect(sim.pickUpObject(site.id)).toBe(true);

    sim.ctx.dealDamage(null, sim.player, 0, false, 'shadow', null, 'miss');
    expect(sim.player.castingAbility).toBe(GATHER_CAST_ID);

    sim.player.auras.push({
      id: 'energy-test-absorb',
      name: 'Energy Test Absorb',
      kind: 'absorb',
      remaining: 30,
      duration: 30,
      value: 1_000,
      sourceId: sim.player.id,
      school: 'arcane',
    });
    const hpBefore = sim.player.hp;
    sim.ctx.dealDamage(null, sim.player, 50, false, 'shadow', null, 'hit');

    expect(sim.player.hp).toBe(hpBefore);
    expect(sim.player.castingAbility).toBeNull();
    expect(sim.player.gatherCastNodeId).toBe('');
  });

  it('migrates old Darksteel-only saves and bounds hostile Energy values', () => {
    expect(
      sanitizeMir4PlayerState({ mir4Currencies: { darksteel: 12 } }, 1).mir4Currencies,
    ).toEqual({ darksteel: 12, energy: 0 });
    expect(
      sanitizeMir4PlayerState(
        {
          mir4Currencies: {
            darksteel: 3.9,
            energy: MIR4_ENERGY_CAP + 1,
            injected: 999,
          },
        },
        1,
      ).mir4Currencies,
    ).toEqual({ darksteel: 3, energy: MIR4_ENERGY_CAP });
  });
});
