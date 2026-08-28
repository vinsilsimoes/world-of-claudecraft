import { describe, expect, it, vi } from 'vitest';
import { bagCapacity } from '../../src/sim/bags';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { ITEMS, MOBS } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { rollLoot } from '../../src/sim/loot/loot_roll';
import { settleMir4KillLoot } from '../../src/sim/mir4/kill_loot';
import { type PlayerMeta, Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { worldBossLockoutId } from '../../src/sim/world_boss';

function mustPlayer(sim: Sim, pid: number): PlayerMeta {
  const player = sim.players.get(pid);
  if (!player) throw new Error(`missing player ${pid}`);
  return player;
}

function mustEntity(sim: Sim, id: number): Entity {
  const entity = sim.entities.get(id);
  if (!entity) throw new Error(`missing entity ${id}`);
  return entity;
}

function partyFixture() {
  const sim = new Sim({
    seed: 404,
    playerClass: 'warrior',
    noPlayer: true,
    gameProfile: MIR4_GAME_PROFILE,
    world: MIR4_SLICE_WORLD,
  });
  const first = sim.addPlayer('warrior', 'First');
  const second = sim.addPlayer('elementalist', 'Second');
  sim.partyInvite(second, first);
  sim.partyAccept(second);
  const mob = createMob(sim.nextId++, MOBS.forest_wolf, 1, { x: 0, y: 0, z: 0 });
  mob.dead = true;
  mob.respawnTimer = 30;
  mob.tappedById = first;
  mob.lootRecipientIds = [first, second];
  sim.addEntity(mob);
  return { sim, first, second, mob };
}

function fillBags(sim: Sim, pid: number): void {
  const meta = mustPlayer(sim, pid);
  const capacity = bagCapacity(meta.bags);
  const gearIds = Object.values(ITEMS)
    .filter((item) => item.kind === 'weapon' || item.kind === 'armor')
    .map((item) => item.id);
  for (let index = 0; meta.inventory.length < capacity; index += 1) {
    const itemId = gearIds[index % gearIds.length];
    if (!itemId) throw new Error('missing bag filler equipment');
    sim.addItem(itemId, 1, pid, { silent: true });
  }
}

describe('MIR4 kill loot settlement', () => {
  it('splits copper and rotates shared common items through the existing party policy', () => {
    const { sim, first, second, mob } = partyFixture();
    const firstMeta = mustPlayer(sim, first);
    const secondMeta = mustPlayer(sim, second);
    const firstCopper = firstMeta.copper;
    const secondCopper = secondMeta.copper;
    mob.loot = {
      copper: 4,
      items: [{ itemId: 'linen_scrap', count: 2 }],
    };
    mob.lootable = true;

    settleMir4KillLoot(sim.ctx, mob, firstMeta, false);

    expect(firstMeta.copper - firstCopper).toBe(2);
    expect(secondMeta.copper - secondCopper).toBe(2);
    expect(sim.countItem('linen_scrap', first)).toBe(1);
    expect(sim.countItem('linen_scrap', second)).toBe(1);
    expect(mob.loot).toBeNull();
    expect(mob.lootable).toBe(false);
    expect(mob.mir4CorpseVisible).toBe(true);
    expect(mob.mir4CorpseTimer).toBe(10.05);
    const acquisitionEvents = sim.events.filter(
      (event): event is Extract<SimEvent, { type: 'loot' }> =>
        event.type === 'loot' &&
        (event.text.startsWith('You receive:') || event.text.startsWith('You loot ')),
    );
    expect(acquisitionEvents).toHaveLength(4);
    expect(acquisitionEvents.every((event) => event.lootOrigin === 'monster-drop')).toBe(true);
  });

  it('grants personal world-boss slots once per live recipient and starts their lockouts', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.templateId = 'thunzharr_waking_peak';
    mob.loot = {
      copper: 0,
      items: [
        {
          itemId: 'linen_scrap',
          count: 1,
          personalFor: [second, first, second],
        },
      ],
    };
    mob.lootable = true;

    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), true);

    expect(sim.countItem('linen_scrap', first)).toBe(1);
    expect(sim.countItem('linen_scrap', second)).toBe(1);
    const lockout = worldBossLockoutId(mob.templateId);
    expect(mustPlayer(sim, first).raidLockouts.get(lockout)).toBeGreaterThan(0);
    expect(mustPlayer(sim, second).raidLockouts.get(lockout)).toBeGreaterThan(0);
    const personalDrops = sim.events.filter(
      (event): event is Extract<SimEvent, { type: 'loot' }> =>
        event.type === 'loot' && event.text.startsWith('You receive:'),
    );
    expect(personalDrops).toHaveLength(2);
    expect(personalDrops.every((event) => event.lootOrigin === 'monster-drop')).toBe(true);
  });

  it('keeps premium party loot in the existing need/greed flow without a corpse click', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };

    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);

    expect(mob.loot).toBeNull();
    expect(mob.lootable).toBe(false);
    expect(mob.mir4CorpseTimer).toBe(10.05);
    expect(mob.corpseTimer).toBe(30);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    expect(roll?.itemId).toBe('moggers_copper_cudgel');
    if (!roll) throw new Error('missing premium loot roll');
    sim.submitLootRoll(roll.id, 'greed', first);
    sim.submitLootRoll(roll.id, 'greed', second);
    expect(
      sim.countItem('moggers_copper_cudgel', first) +
        sim.countItem('moggers_copper_cudgel', second),
    ).toBe(1);
    expect(
      sim.events.some(
        (event) =>
          event.type === 'loot' &&
          event.text.startsWith('You receive:') &&
          event.lootOrigin === 'monster-drop',
      ),
    ).toBe(true);
  });

  it('grants a normal drop even when the credited player bag is already full', () => {
    const { sim, first, mob } = partyFixture();
    fillBags(sim, first);
    const capacity = bagCapacity(mustPlayer(sim, first).bags);
    expect(mustPlayer(sim, first).inventory).toHaveLength(capacity);
    mob.loot = { copper: 0, items: [{ itemId: 'linen_scrap', count: 1 }] };

    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);

    expect(sim.countItem('linen_scrap', first)).toBe(1);
    expect(mustPlayer(sim, first).inventory.length).toBeGreaterThan(capacity);
    expect(mob.loot).toBeNull();
    const fallbackDrop = sim.events.find(
      (event): event is Extract<SimEvent, { type: 'loot' }> =>
        event.type === 'loot' && event.text.startsWith('You receive: Linen Scrap'),
    );
    expect(fallbackDrop?.lootOrigin).toBe('monster-drop');
  });

  it('still presents a ten-second body when the kill rolled no rewards', () => {
    const { sim, first, mob } = partyFixture();
    mob.loot = null;
    mob.lootable = false;

    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);

    expect(mob.mir4CorpseVisible).toBe(true);
    expect(mob.mir4CorpseTimer).toBe(10.05);
    expect(mob.loot).toBeNull();
    expect(mob.lootable).toBe(false);
  });

  it('awards an all-pass premium roll after the ten-second body is already gone', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    if (!roll) throw new Error('missing premium loot roll');

    for (let tick = 0; tick < 201; tick += 1) sim.tick();
    expect(mob.mir4CorpseVisible).toBe(false);
    sim.submitLootRoll(roll.id, 'pass', first);
    sim.submitLootRoll(roll.id, 'pass', second);

    expect(sim.countItem('moggers_copper_cudgel', first)).toBe(1);
    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(0);
    expect(mob.loot).toBeNull();
    expect(mob.lootable).toBe(false);
    expect(
      sim.events.some(
        (event) =>
          event.type === 'loot' &&
          event.pid === first &&
          event.text.startsWith('You receive:') &&
          event.lootOrigin === 'monster-drop',
      ),
    ).toBe(true);
  });

  it('redirects an offline roll winner to a live eligible player without restoring corpse loot', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    if (!roll) throw new Error('missing premium loot roll');
    sim.submitLootRoll(roll.id, 'greed', first);
    sim.entities.delete(first);

    sim.submitLootRoll(roll.id, 'pass', second);

    expect(sim.countItem('moggers_copper_cudgel', first)).toBe(0);
    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(1);
    expect(mob.loot).toBeNull();
    expect(mob.lootable).toBe(false);
  });

  it('skips a disconnected all-pass fallback recipient even when they remain eligible', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    if (!roll) throw new Error('missing premium loot roll');

    sim.submitLootRoll(roll.id, 'pass', first);
    sim.entities.delete(first);
    sim.submitLootRoll(roll.id, 'pass', second);

    expect(sim.countItem('moggers_copper_cudgel', first)).toBe(0);
    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(1);
  });

  it('skips a leaving all-pass fallback recipient even while they are resolvable', () => {
    const { sim, first, second, mob } = partyFixture();
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    if (!roll) throw new Error('missing premium loot roll');

    sim.submitLootRoll(roll.id, 'pass', first);
    mustPlayer(sim, first).leaving = true;
    sim.submitLootRoll(roll.id, 'pass', second);

    expect(sim.countItem('moggers_copper_cudgel', first)).toBe(0);
    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(1);
  });

  it('never widens a departing roll to an ineligible party broadcast recipient', () => {
    const { sim, first, second, mob } = partyFixture();
    const outsider = sim.addPlayer('taoist', 'Outside Range');
    sim.partyInvite(outsider, first);
    sim.partyAccept(outsider);
    mob.lootRecipientIds = [first, second];
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);

    sim.preparePlayerLeave(first);
    sim.preparePlayerLeave(second);

    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(1);
    expect(sim.countItem('moggers_copper_cudgel', outsider)).toBe(0);
    expect(sim.ctx.pendingLootRolls.size).toBe(0);
    expect(
      sim.events.some(
        (event) =>
          event.type === 'loot' &&
          event.pid === second &&
          event.text.startsWith('You receive:') &&
          event.lootOrigin === 'monster-drop',
      ),
    ).toBe(true);
  });

  it('keeps an all-pass master-loot fallback inside the curated candidate subset', () => {
    const { sim, first, second, mob } = partyFixture();
    const third = sim.addPlayer('taoist', 'Third');
    sim.partyInvite(third, first);
    sim.partyAccept(third);
    sim.setPartyLootMaster(true, first, 'uncommon', first);
    mob.lootRecipientIds = [first, second, third];
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'moggers_copper_cudgel', count: 1 }],
    };
    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);
    const [roll] = [...sim.ctx.pendingLootRolls.values()];
    if (!roll) throw new Error('missing master-loot roll');

    sim.assignMasterLoot(roll.id, [second, third], first);
    sim.submitLootRoll(roll.id, 'pass', second);
    sim.submitLootRoll(roll.id, 'pass', third);

    expect(sim.countItem('moggers_copper_cudgel', first)).toBe(0);
    expect(sim.countItem('moggers_copper_cudgel', second)).toBe(1);
    expect(sim.countItem('moggers_copper_cudgel', third)).toBe(0);
    expect(
      sim.events.some(
        (event) =>
          event.type === 'loot' &&
          event.pid === second &&
          event.text.startsWith('You receive:') &&
          event.lootOrigin === 'monster-drop',
      ),
    ).toBe(true);
  });

  it('skips a leaving personal recipient and deep-clones instanced shared loot', () => {
    const { sim, first, second, mob } = partyFixture();
    mustPlayer(sim, second).leaving = true;
    const instance = { signer: 'Ayla', rolled: { stats: { str: 2 } } };
    mob.loot = {
      copper: 0,
      items: [
        { itemId: 'linen_scrap', count: 1, personalFor: [first, second] },
        { itemId: 'hide', count: 1, instance },
      ],
    };

    settleMir4KillLoot(sim.ctx, mob, mustPlayer(sim, first), false);

    expect(sim.countItem('linen_scrap', first)).toBe(1);
    expect(sim.countItem('linen_scrap', second)).toBe(0);
    const granted = mustPlayer(sim, first).inventory.find(
      (slot) => slot.itemId === 'hide' && slot.instance?.signer === 'Ayla',
    );
    expect(granted?.instance).toEqual(instance);
    expect(granted?.instance).not.toBe(instance);
    const directDrops = sim.events.filter(
      (event): event is Extract<SimEvent, { type: 'loot' }> =>
        event.type === 'loot' && event.text.startsWith('You receive:'),
    );
    expect(directDrops).toHaveLength(2);
    expect(directDrops.every((event) => event.lootOrigin === 'monster-drop')).toBe(true);
  });

  it('keeps an Aeldrune marker-only body free of WoC corpse-profession harvesting', () => {
    const { sim, first, mob } = partyFixture();
    const player = mustEntity(sim, first);
    player.pos = { ...mob.pos };
    player.prevPos = { ...mob.pos };
    mob.corpseTimer = 30;
    mob.mir4CorpseTimer = 10;
    mob.loot = null;
    mob.lootable = false;
    mob.mir4CorpseVisible = false;

    player.targetId = mob.id;
    sim.interact(first);
    expect(mob.harvestClaimedBy).toBeNull();

    mob.mir4CorpseVisible = true;
    sim.interact(first);
    expect(mob.harvestClaimedBy).toBeNull();
    expect(mob.corpseTimer).toBe(30);
    expect(mob.mir4CorpseTimer).toBe(10);
    expect(mob.lootable).toBe(false);
  });

  it('filters WoC profession and equipment rows before Aeldrune auto-loot settlement', () => {
    const { sim, first, mob } = partyFixture();
    const meta = mustPlayer(sim, first);

    rollLoot(sim.ctx, mob, meta, [meta]);

    expect(mob.loot?.copper).toBeGreaterThan(0);
    expect(mob.loot?.items).toEqual([]);
    settleMir4KillLoot(sim.ctx, mob, meta, false);
    expect(sim.countItem('wolf_fang', first)).toBe(0);
    expect(sim.countItem('milepost_boots', first)).toBe(0);
    expect(sim.countItem('wolfhide_satchel', first)).toBe(0);
  });

  it('grants a successful ready-made roll as missing class-specific Aeldrune equipment', () => {
    const { sim, first, mob } = partyFixture();
    const meta = mustPlayer(sim, first);
    mob.loot = null;
    mob.level = 1;
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValueOnce(0.005).mockReturnValueOnce(0);

    settleMir4KillLoot(sim.ctx, mob, meta, false);

    expect(meta.mir4EquipmentInstances?.[991010101]).toEqual({
      itemId: 991010101,
      enhancement: 0,
    });
    expect(meta.mir4Equipment?.[1]).not.toBe(991010101);
    expect(
      sim.events.some(
        (event) =>
          event.type === 'loot' &&
          event.pid === first &&
          event.text.includes('Espada Gasta') &&
          event.lootOrigin === 'monster-drop',
      ),
    ).toBe(true);
  });
});
