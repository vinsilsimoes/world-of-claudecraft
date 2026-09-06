import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  mir4NativeRuntimeAttackRageGain,
  mir4NativeRuntimeAttackRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(seed = 923): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Rage Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.level = 20;
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.player.mir4UltGauge = 0;
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_attack_rage_target',
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

describe('MIR4 native AttackRagePoint runtime', () => {
  it('admits only the three proven damage rows and converts native 100000 rage to percent', () => {
    expect(mir4NativeRuntimeAttackRageGain(1102, 110201)).toBeNull();
    expect(mir4NativeRuntimeAttackRageGain(1102, 110202)).toEqual({
      nativePoints: 499,
      gaugePercent: 0.499,
    });
    expect(mir4NativeRuntimeAttackRageGain(1102, 110203)).toEqual({
      nativePoints: 499,
      gaugePercent: 0.499,
    });
    expect(mir4NativeRuntimeAttackRageGain(1102, 110204)).toEqual({
      nativePoints: 544,
      gaugePercent: 0.544,
    });
    expect(mir4NativeRuntimeAttackRageGain(1103, 110105)).toBeNull();
    expect(mir4NativeRuntimeAttackRagePolicy(1103, 110105)).toEqual({
      nativePoints: 1037,
      appliesOnLandedDamageContact: false,
    });
    for (const attackId of [110106, 110107]) {
      expect(mir4NativeRuntimeAttackRagePolicy(1103, attackId)).toEqual({
        nativePoints: 768,
        appliesOnLandedDamageContact: true,
      });
      expect(mir4NativeRuntimeAttackRageGain(1103, attackId)).toEqual({
        nativePoints: 768,
        gaugePercent: 0.768,
      });
    }
    expect(mir4NativeRuntimeAttackRageGain(1104, 110401)).toBeNull();
    expect(mir4NativeRuntimeAttackRageGain(1104, 110402)).toEqual({
      nativePoints: 992,
      gaugePercent: 0.992,
    });
    expect(mir4NativeRuntimeAttackRageGain(1304, 130401)).toBeNull();
    expect(mir4NativeRuntimeAttackRageGain(1304, 130402)).toEqual({
      nativePoints: 947,
      gaugePercent: 0.947,
    });
    expect(mir4NativeRuntimeAttackRageGain(1401, 140101)).toBeNull();
    expect(mir4NativeRuntimeAttackRageGain(1401, 140102)).toEqual({
      nativePoints: 990,
      gaugePercent: 0.99,
    });
    const galeSlashRows = [
      [150101, 678],
      [150102, 634],
      [150103, 634],
      [150104, 499],
      [150105, 544],
    ] as const;
    for (const [attackId, nativePoints] of galeSlashRows) {
      expect(mir4NativeRuntimeAttackRagePolicy(1501, attackId)).toEqual({
        nativePoints,
        appliesOnLandedDamageContact: true,
      });
      expect(mir4NativeRuntimeAttackRageGain(1501, attackId)).toEqual({
        nativePoints,
        gaugePercent: nativePoints / 1_000,
      });
    }
    for (const attackId of [310101, 310103]) {
      expect(mir4NativeRuntimeAttackRagePolicy(3101, attackId)).toEqual({
        nativePoints: 813,
        appliesOnLandedDamageContact: true,
      });
      expect(mir4NativeRuntimeAttackRageGain(3101, attackId)).toEqual({
        nativePoints: 813,
        gaugePercent: 0.813,
      });
    }
    expect(mir4NativeRuntimeAttackRagePolicy(3101, 310102)).toBeNull();
    expect(mir4NativeRuntimeAttackRagePolicy(3101, 310104)).toBeNull();
  });

  it('adds each landed contact once and preserves the existing 0..100 gauge representation', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);

    expect(sim.mir4CastSkill(1102, target.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 20; tick += 1) sim.tick();

    expect(sim.player.mir4UltGauge).toBeCloseTo(1.542, 6);
  });
});
