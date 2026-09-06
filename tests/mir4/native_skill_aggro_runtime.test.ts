import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  mir4NativeAggroThreatFromRate,
  mir4NativeRuntimeAggroPolicy,
  mir4NativeRuntimeAggroThreat,
} from '../../src/sim/mir4/native_skill_aggro';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 925,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Aggro Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) if (entity.kind === 'mob') entity.dead = true;
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.level = 20;
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_aggro_target',
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
    sim.groundPos(sim.player.pos.x + 3, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  sim.player.targetId = target.id;
  return target;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 native AggroRate runtime', () => {
  it('admits exactly the three proven damage rows at 10000 basis points', () => {
    expect(mir4NativeRuntimeAggroPolicy(1102, 110201)).toBeNull();
    for (const attackId of [110202, 110203, 110204]) {
      expect(mir4NativeRuntimeAggroPolicy(1102, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
    }
    expect(mir4NativeRuntimeAggroPolicy(1103, 110105)).toEqual({
      nativeRateBasisPoints: 10_000,
      appliesOnLandedDamageContact: false,
    });
    for (const attackId of [110106, 110107]) {
      expect(mir4NativeRuntimeAggroPolicy(1103, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
    }
    expect(mir4NativeRuntimeAggroPolicy(1104, 110401)).toBeNull();
    expect(mir4NativeRuntimeAggroPolicy(1104, 110402)).toEqual({
      nativeRateBasisPoints: 10_000,
      appliesOnLandedDamageContact: true,
    });
    expect(mir4NativeRuntimeAggroPolicy(1304, 130401)).toBeNull();
    expect(mir4NativeRuntimeAggroPolicy(1304, 130402)).toEqual({
      nativeRateBasisPoints: 10_000,
      appliesOnLandedDamageContact: true,
    });
    expect(mir4NativeRuntimeAggroPolicy(1401, 140101)).toBeNull();
    expect(mir4NativeRuntimeAggroPolicy(1401, 140102)).toEqual({
      nativeRateBasisPoints: 10_000,
      appliesOnLandedDamageContact: true,
    });
    for (const attackId of [150101, 150102, 150103, 150104, 150105]) {
      expect(mir4NativeRuntimeAggroPolicy(1501, attackId)).toEqual({
        nativeRateBasisPoints: 10_000,
        appliesOnLandedDamageContact: true,
      });
    }
    for (const attackId of [310101, 310103]) {
      expect(mir4NativeRuntimeAggroPolicy(3101, attackId)).toEqual({
        nativeRateBasisPoints: 7000,
        appliesOnLandedDamageContact: true,
      });
    }
    expect(mir4NativeRuntimeAggroPolicy(3101, 310102)).toBeNull();
    expect(mir4NativeRuntimeAggroPolicy(3101, 310104)).toBeNull();
  });

  it('uses integer truncation, per-skill rate modifiers, and the native minimum of one', () => {
    expect(mir4NativeAggroThreatFromRate(333, 5_000)).toBe(166);
    expect(mir4NativeAggroThreatFromRate(333, 5_000, 1_000, 500)).toBe(183);
    expect(mir4NativeAggroThreatFromRate(0, 10_000)).toBe(1);
    expect(mir4NativeRuntimeAggroThreat(1102, 110202, 333)).toBe(333);
    expect(mir4NativeRuntimeAggroThreat(1102, 110201, 333)).toBeNull();
  });

  it('replaces classic stance threat with native per-contact threat', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);
    sim.player.auras.push({
      id: 'native-aggro-classic-multiplier-sentinel',
      kind: 'buff_threat',
      name: 'Must not modify MIR4 native threat',
      remaining: 30,
      duration: 30,
      stacks: 1,
      value: 3,
      sourceId: sim.playerId,
      school: 'physical',
    });
    const hpBefore = target.hp;
    const threatBefore = target.threat.get(sim.playerId) ?? 0;

    expect(sim.mir4CastSkill(1102, target.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) sim.tick();

    const landedDamage = hpBefore - target.hp;
    expect(landedDamage).toBeGreaterThan(0);
    // The shared wild-mob AI seeds one point when the first contact starts
    // combat. The three native damage contacts then add exactly their landed
    // damage, unaffected by the 3x classic threat aura above.
    expect((target.threat.get(sim.playerId) ?? 0) - threatBefore).toBe(landedDamage + 1);
  });
});
