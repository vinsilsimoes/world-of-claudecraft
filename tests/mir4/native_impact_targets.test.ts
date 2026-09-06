import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4NativeApprovedImpactTargets } from '../../src/sim/mir4/native_impact_targets';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeFixture() {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 927,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Impact Gate Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) if (entity.kind === 'mob') entity.dead = true;
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_impact_gate_target',
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
  sim.addEntity(target);
  sim.player.facing = Math.PI / 2;
  return { sim, target };
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 compiler-approved native impact target gate', () => {
  it('routes Barbaric Charge through its live actor-centered type 2 target list', () => {
    const { sim, target } = makeFixture();
    expect(
      mir4NativeApprovedImpactTargets(sim.ctx, sim.player, 1103, 110106)?.map(
        (candidate) => candidate.id,
      ),
    ).toEqual([target.id]);
  });

  it('continues routing an approved ImpactType 3 row through its live native target list', () => {
    const { sim, target } = makeFixture();
    expect(
      mir4NativeApprovedImpactTargets(sim.ctx, sim.player, 1104, 110402)?.map(
        (candidate) => candidate.id,
      ),
    ).toEqual([target.id]);
  });

  it('routes Body Check through its compiler-approved live forward target list', () => {
    const { sim, target } = makeFixture();
    expect(
      mir4NativeApprovedImpactTargets(sim.ctx, sim.player, 1304, 130402)?.map(
        (candidate) => candidate.id,
      ),
    ).toEqual([target.id]);
  });
});
