import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  mir4NativeImpactType2RuntimeAttack,
  mir4NativeImpactType2Targets,
} from '../../src/sim/mir4/native_impact_type2_targets';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 923,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Impact Type 2 Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  return sim;
}

function spawnAt(sim: Sim, dx: number, dz: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `native_impact_type2_target_${sim.nextId}`,
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
    sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z + dz),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 native ImpactType 2 runtime target policy', () => {
  it('admits only the two Barbaric Charge damage rows', () => {
    expect(mir4NativeImpactType2RuntimeAttack(1103, 110105)).toBe(false);
    expect(mir4NativeImpactType2RuntimeAttack(1103, 110106)).toBe(true);
    expect(mir4NativeImpactType2RuntimeAttack(1103, 110107)).toBe(true);
    expect(mir4NativeImpactType2RuntimeAttack(1102, 110202)).toBe(false);
    expect(mir4NativeImpactType2RuntimeAttack(1401, 140101)).toBe(false);
    expect(mir4NativeImpactType2RuntimeAttack(1401, 140102)).toBe(true);
  });

  it('shifts the Ground Smash circle forward and stops at eight targets', () => {
    const sim = makeSim();
    sim.player.facing = Math.PI / 2;
    const behindShiftedCircle = spawnAt(sim, -4.1, 0);
    const targets = Array.from({ length: 9 }, (_, index) => spawnAt(sim, 2 + index * 0.1, 0));

    expect(
      mir4NativeImpactType2Targets(sim.ctx, sim.player, 1401, 140102)?.map((target) => target.id),
    ).toEqual(targets.slice(0, 8).map((target) => target.id));
    expect(behindShiftedCircle.hp).toBe(behindShiftedCircle.maxHp);
  });

  it('rebuilds the actor-centered list in entity order and stops at ten targets', () => {
    const sim = makeSim();
    const targets = Array.from({ length: 11 }, (_, index) => spawnAt(sim, 2 + index * 0.1, 0));

    expect(
      mir4NativeImpactType2Targets(sim.ctx, sim.player, 1103, 110106)?.map((target) => target.id),
    ).toEqual(targets.slice(0, 10).map((target) => target.id));
  });

  it('returns an authoritative empty list for an admitted row with no live hostile in range', () => {
    const sim = makeSim();
    spawnAt(sim, 7, 0);

    expect(mir4NativeImpactType2Targets(sim.ctx, sim.player, 1103, 110107)).toEqual([]);
  });

  it('returns null for a row outside the exact admitted policy', () => {
    const sim = makeSim();
    expect(mir4NativeImpactType2Targets(sim.ctx, sim.player, 1103, 110105)).toBeNull();
  });
});
