import { describe, expect, it, vi } from 'vitest';
import { Mir4SelfWireCache } from '../../server/mir4_host';
import { Mir4ClientFacet } from '../../src/net/mir4_client_facet';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob, createPlayer } from '../../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { serializeMir4WirePlayerState } from '../../src/sim/mir4/persistence';
import {
  interruptMir4SkillActionMotion,
  updateMir4SkillActions,
} from '../../src/sim/mir4/skill_action_scheduler';
import {
  mir4SkillActivationOwnsMotion,
  requestMir4SkillActivation,
} from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import {
  dist2d,
  type Entity,
  type Mir4ClassKey,
  PLAYER_INTEREST_DROP_RADIUS,
  TICK_RATE,
} from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(cls: Mir4ClassKey, seed: number, level: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: `Skill Foundation ${cls}`,
    gameProfile: MIR4_GAME_PROFILE,
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(level);
  placePlayerInOpenField(sim);
  sim.rebucket(sim.player);
  if (!sim.player.mir4) throw new Error(`missing MIR4 stats for ${cls}`);
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.player.resource = sim.player.maxResource;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offset: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `skill_foundation_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z - offset),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  sim.player.targetId = target.id;
  return target;
}

function placeTargetAtOffset(sim: Sim, target: Entity, offset: number): void {
  target.pos = sim.groundPos(sim.player.pos.x, sim.player.pos.z - offset);
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.leashAnchor = { ...target.pos };
  sim.rebucket(target);
}

function parseWire(json: string | null): Record<string, unknown> {
  if (!json) throw new Error('missing MIR4 self wire payload');
  return JSON.parse(json) as Record<string, unknown>;
}

describe('MIR4 skill action foundation regressions', () => {
  it('reconciles one cached wire lifecycle through approach, action, interruption, and end-cut', () => {
    const sim = makeSim('warrior', 40_102, 120);
    const target = spawnTarget(sim, 10, 'wire_lifecycle');
    const meta = sim.meta(sim.playerId);
    if (!meta || !sim.player.mir4) throw new Error('missing warrior wire harness');

    const serialize = vi.fn(serializeMir4WirePlayerState);
    const cache = new Mir4SelfWireCache(serialize);
    const clientEntity = createPlayer(700, 'warrior', { x: 0, y: 0, z: 0 }, 'Wire Client');
    clientEntity.level = sim.player.level;
    const client = new Mir4ClientFacet(
      () => {},
      async () => true,
    );
    const encode = (): string =>
      cache.encode(MIR4_GAME_PROFILE, meta, sim.player.mir4, sim.player.mir4UltGauge) ?? '';
    const apply = (wire: Record<string, unknown>): void => client.applySnapshot(wire, clientEntity);

    const idleJson = encode();
    expect(parseWire(idleJson)).not.toHaveProperty('mir4SkillActivation');
    expect(encode()).toBe(idleJson);
    expect(serialize).toHaveBeenCalledOnce();
    apply(parseWire(idleJson));
    expect(client.mir4PlayerState()?.mir4SkillActivation).toBeUndefined();

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    const approachWire = parseWire(encode());
    expect(approachWire.mir4SkillActivation).toEqual({ phase: 'approach' });
    expect(serialize).toHaveBeenCalledTimes(2);
    apply(approachWire);
    expect(client.mir4PlayerState()?.mir4SkillActivation).toEqual({ phase: 'approach' });

    placeTargetAtOffset(sim, target, 2);
    sim.tick();
    const action = meta.mir4SkillAction;
    if (!action) throw new Error('native action did not commit');
    expect(meta.mir4SkillActivation).toBeUndefined();
    expect(action.motionInterrupted).toBe(false);
    const actionWire = parseWire(encode());
    expect(actionWire.mir4SkillActivation).toEqual({ phase: 'action' });
    expect(serialize).toHaveBeenCalledTimes(3);
    apply(actionWire);
    expect(client.mir4PlayerState()?.mir4SkillActivation).toEqual({ phase: 'action' });

    client.applySnapshot(
      { ...actionWire, mir4SkillActivation: { phase: 'future-version' } },
      clientEntity,
    );
    expect(client.mir4PlayerState()?.mir4SkillActivation).toEqual({ phase: 'action' });

    interruptMir4SkillActionMotion(sim.ctx, sim.playerId);
    expect(meta.mir4SkillAction).toBe(action);
    expect(action.motionInterrupted).toBe(true);
    const interruptedJson = encode();
    const interruptedWire = parseWire(interruptedJson);
    expect(interruptedWire).not.toHaveProperty('mir4SkillActivation');
    expect(serialize).toHaveBeenCalledTimes(4);
    apply(interruptedWire);
    expect(client.mir4PlayerState()?.mir4SkillActivation).toBeUndefined();

    const endCutTick = action.startedTick + Math.ceil((action.endCutMs * TICK_RATE) / 1_000);
    sim.tickCount = endCutTick - 1;
    updateMir4SkillActions(sim.ctx);
    expect(meta.mir4SkillAction).toBe(action);
    expect(encode()).toBe(interruptedJson);
    expect(serialize).toHaveBeenCalledTimes(4);

    sim.tickCount = endCutTick;
    updateMir4SkillActions(sim.ctx);
    expect(meta.mir4SkillAction).toBeUndefined();
    const completedJson = encode();
    expect(completedJson).toBe(interruptedJson);
    expect(serialize).toHaveBeenCalledTimes(5);
    apply(parseWire(completedJson));
    expect(client.mir4PlayerState()?.mir4SkillActivation).toBeUndefined();
  });

  it('hands a promoted charge from approach into its exact native action', () => {
    const sim = makeSim('lancer', 45_202, 56);
    const target = spawnTarget(sim, 30, 'catalog_less_charge');
    const meta = sim.meta(sim.playerId);
    if (!meta) throw new Error('missing lancer activation harness');
    const resourceBefore = sim.player.resource;

    expect(mir4NativeSkillActionById(5202)).not.toBeNull();
    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_5202', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(meta.mir4SkillActivation?.abilityId).toBe('mir4_skill_5202');

    placeTargetAtOffset(sim, target, 10);
    expect(() => sim.tick()).not.toThrow();

    expect(sim.player.cooldowns.has('5202')).toBe(true);
    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(meta.mir4SkillActivation).toBeUndefined();
    expect(meta.mir4SkillAction?.skillId).toBe(5202);
    expect(mir4SkillActivationOwnsMotion(meta, sim.tickCount)).toBe(true);

    for (let tick = 0; tick < 24; tick += 1) expect(() => sim.tick()).not.toThrow();
    expect(meta.mir4SkillActivation).toBeUndefined();
    expect(meta.mir4SkillAction).toBeUndefined();
    expect(meta.mir4SkillActivationClaimedThroughTick).toBeUndefined();
    expect(mir4SkillActivationOwnsMotion(meta, sim.tickCount)).toBe(false);
  });
});
