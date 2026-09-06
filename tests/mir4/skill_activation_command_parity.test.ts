import { describe, expect, it } from 'vitest';
import { handleMir4Command } from '../../server/mir4_commands';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { mir4AttackMultiplier, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey, SimEvent } from '../../src/sim/types';
import { dist2d, PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const VOID_SLASH_ID = 1102;
const VOID_SLASH_ACTION = mir4ActionId(VOID_SLASH_ID);
const VOID_SLASH_COOLDOWN_ID = String(VOID_SLASH_ID);

interface ActivationScenario {
  sim: Sim;
  captured: Entity;
  bystander: Entity;
  slot: number;
}

function makeSim(cls: Mir4ClassKey, seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Activation Parity Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  // Keep command-route parity isolated from terrain height. The native hit
  // volume has its own dedicated vertical-boundary coverage.
  placePlayerInOpenField(sim, sim.playerId, { x: -100, z: -400 });
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim, id: string, offsetX: number, offsetZ: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
    hpBase: 50_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  const target = createMob(
    sim.nextId++,
    template as never,
    1,
    sim.groundPos(sim.player.pos.x + offsetX, sim.player.pos.z + offsetZ),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function makeActivationScenario(seed: number): ActivationScenario {
  const sim = makeSim('warrior', seed);
  const captured = spawnTarget(sim, 'activation_parity_captured', 0, -10);
  const bystander = spawnTarget(sim, 'activation_parity_bystander', 6, 0);
  const slot = sim.known.findIndex((ability) => ability.def.id === VOID_SLASH_ACTION);
  if (slot < 0) throw new Error('missing Void Slash action-bar slot');
  sim.player.targetId = captured.id;
  sim.player.facing = Math.PI;
  sim.drainEvents();
  return { sim, captured, bystander, slot };
}

function activateThroughHotbar(scenario: ActivationScenario): void {
  scenario.sim.castAbilityBySlot(scenario.slot);
}

function activateThroughMir4Command(scenario: ActivationScenario): void {
  handleMir4Command(
    scenario.sim,
    { m: 'cast', skill: VOID_SLASH_ID, target: scenario.captured.id },
    scenario.sim.playerId,
  );
}

function activationState(scenario: ActivationScenario) {
  return scenario.sim.players.get(scenario.sim.playerId)?.mir4SkillActivation;
}

function tickInParity(
  hotbar: ActivationScenario,
  command: ActivationScenario,
): [SimEvent[], SimEvent[]] {
  const hotbarEvents = hotbar.sim.tick();
  const commandEvents = command.sim.tick();
  expect(commandEvents).toEqual(hotbarEvents);
  expect(command.sim.player.pos).toEqual(hotbar.sim.player.pos);
  expect(command.sim.player.resource).toBe(hotbar.sim.player.resource);
  expect(activationState(command)).toEqual(activationState(hotbar));
  return [hotbarEvents, commandEvents];
}

describe('MIR4 skill activation command parity', () => {
  it('queues, captures, approaches, and commits identically through both targeted routes', () => {
    const hotbar = makeActivationScenario(25_101);
    const command = makeActivationScenario(25_101);
    const resourceBefore = hotbar.sim.player.resource;
    const capturedHpBefore = hotbar.captured.hp;
    const bystanderHpBefore = hotbar.bystander.hp;
    const start = { ...hotbar.sim.player.pos };

    activateThroughHotbar(hotbar);
    activateThroughMir4Command(command);

    const immediateHotbarEvents = hotbar.sim.drainEvents();
    const immediateCommandEvents = command.sim.drainEvents();
    expect(immediateCommandEvents).toEqual(immediateHotbarEvents);
    expect(immediateHotbarEvents).toEqual([]);
    expect(activationState(command)).toEqual(activationState(hotbar));
    expect(activationState(hotbar)).toMatchObject({
      phase: 'approach',
      abilityId: VOID_SLASH_ACTION,
      targetId: hotbar.captured.id,
    });
    for (const scenario of [hotbar, command]) {
      expect(scenario.sim.player.resource).toBe(resourceBefore);
      expect(scenario.sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
      expect(scenario.captured.hp).toBe(capturedHpBefore);
      expect(scenario.bystander.hp).toBe(bystanderHpBefore);
    }

    const [firstHotbarEvents] = tickInParity(hotbar, command);
    expect(firstHotbarEvents).toEqual([]);
    expect(dist2d(start, hotbar.sim.player.pos)).toBeGreaterThan(0);
    expect(hotbar.sim.player.resource).toBe(resourceBefore);
    expect(hotbar.sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(activationState(hotbar)?.targetId).toBe(hotbar.captured.id);

    const hotbarEvents: SimEvent[] = [];
    const commandEvents: SimEvent[] = [];
    let ticks = 1;
    while (!hotbar.sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID) && ticks < 160) {
      const [nextHotbarEvents, nextCommandEvents] = tickInParity(hotbar, command);
      hotbarEvents.push(...nextHotbarEvents);
      commandEvents.push(...nextCommandEvents);
      ticks += 1;
    }

    expect(ticks).toBeLessThan(160);
    expect(commandEvents).toEqual(hotbarEvents);
    expect(command.sim.player.cooldowns).toEqual(hotbar.sim.player.cooldowns);
    expect(activationState(hotbar)).toBeUndefined();
    expect(activationState(command)).toBeUndefined();
    expect(hotbar.sim.player.resource).toBeLessThan(resourceBefore);
    expect(command.sim.player.resource).toBe(hotbar.sim.player.resource);
    expect(
      hotbarEvents.filter(
        (event) =>
          event.type === 'mir4AttackStart' &&
          event.action === 'skill' &&
          event.ability === VOID_SLASH_ACTION,
      ),
    ).toHaveLength(1);
    for (const scenario of [hotbar, command]) {
      expect(scenario.sim.player.mir4PendingImpacts ?? []).not.toHaveLength(0);
      expect(
        (scenario.sim.player.mir4PendingImpacts ?? []).every(
          (impact) => impact.targetId === scenario.captured.id,
        ),
      ).toBe(true);
      expect(scenario.bystander.hp).toBe(bystanderHpBefore);
    }

    for (let tick = 0; tick < 40; tick += 1) tickInParity(hotbar, command);
    expect(hotbar.captured.hp).toBeLessThan(capturedHpBefore);
    expect(command.captured.hp).toBe(hotbar.captured.hp);
    expect(hotbar.bystander.hp).toBe(bystanderHpBefore);
    expect(command.bystander.hp).toBe(bystanderHpBefore);
  });

  it('commits a targetless skill immediately through both routes without arming pursuit', () => {
    const hotbar = makeSim('elementalist', 25_102);
    const command = makeSim('elementalist', 25_102);
    for (const sim of [hotbar, command]) {
      sim.setPlayerLevel(48);
      placePlayerInOpenField(sim);
      sim.drainEvents();
    }
    const slot = hotbar.known.findIndex((ability) => ability.def.id === mir4ActionId(2204));
    if (slot < 0) throw new Error('missing Phoenix Embrace action-bar slot');
    const action = hotbar.known[slot];
    if (!action) throw new Error('missing Phoenix Embrace action');
    const resourceBefore = hotbar.player.resource;
    const positionBefore = { ...hotbar.player.pos };

    hotbar.castAbilityBySlot(slot);
    handleMir4Command(command, { m: 'cast', skill: 2204 }, command.playerId);

    expect(command.drainEvents()).toEqual(hotbar.drainEvents());
    expect(command.player.resource).toBe(hotbar.player.resource);
    expect(hotbar.player.resource).toBe(resourceBefore - action.cost);
    expect(command.player.cooldowns).toEqual(hotbar.player.cooldowns);
    expect(hotbar.player.cooldowns.get('2204')).toBe(54);
    expect(hotbar.players.get(hotbar.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(command.players.get(command.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(hotbar.player.targetId).toBeNull();
    expect(command.player.targetId).toBeNull();
    expect(hotbar.player.pos).toEqual(positionBefore);
    expect(command.player.pos).toEqual(positionBefore);
    expect(mir4NativeStatusBonus(hotbar.player, 22)).toBe(0);
    expect(mir4NativeStatusBonus(command.player, 22)).toBe(0);
    hotbar.time = 0.85;
    command.time = 0.85;
    updateMir4PendingImpacts(hotbar.ctx);
    updateMir4PendingImpacts(command.ctx);
    expect(mir4NativeStatusBonus(hotbar.player, 22)).toBe(25);
    expect(mir4NativeStatusBonus(command.player, 22)).toBe(25);
    expect(mir4AttackMultiplier(hotbar.player)).toBe(1);
    expect(mir4AttackMultiplier(command.player)).toBe(1);
  });

  it('reports the same authoritative refusal through the hotbar and MIR4 command routes', () => {
    const hotbar = makeSim('warrior', 25_103);
    const command = makeSim('warrior', 25_103);
    const slot = hotbar.known.findIndex((ability) => ability.def.id === VOID_SLASH_ACTION);
    if (slot < 0) throw new Error('missing Void Slash action-bar slot');
    hotbar.player.targetId = null;
    command.player.targetId = null;
    hotbar.drainEvents();
    command.drainEvents();

    hotbar.castAbilityBySlot(slot);
    handleMir4Command(command, { m: 'cast', skill: VOID_SLASH_ID }, command.playerId);

    expect(command.drainEvents()).toEqual(hotbar.drainEvents());
    expect(command.player.resource).toBe(hotbar.player.resource);
    expect(command.player.cooldowns).toEqual(hotbar.player.cooldowns);
  });
});
