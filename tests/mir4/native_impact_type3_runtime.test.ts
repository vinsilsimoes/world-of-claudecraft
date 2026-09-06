import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 918,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Impact Type 3 Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  // The generic instance band is a collider-free, level plane. Keeping this
  // horizontal fixture flat prevents native height gating from masquerading
  // as a forward-range failure; vertical sphere intersection is tested in the
  // pure geometry suite.
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnAt(sim: Sim, dx: number, dz: number): Entity {
  const player = sim.player;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_impact_type3_target',
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
    sim.groundPos(player.pos.x + dx, player.pos.z + dz),
  );
  target.pos.y = player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 1102 native ImpactType 3 runtime selection', () => {
  it('rebuilds the target list at contact time instead of locking the cast target', () => {
    const sim = makeSim();
    const primary = spawnAt(sim, 3, 0);
    const replacement = spawnAt(sim, 6, 0);
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1102));
    primary.pos.x += 20;
    primary.prevPos = { ...primary.pos };
    const events = tickMany(sim, 20);

    expect(primary.hp).toBe(primary.maxHp);
    expect(replacement.hp).toBeLessThan(replacement.maxHp);
    expect(
      events.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === replacement.id &&
          event.ability === 'Corte do Vazio',
      ),
    ).toHaveLength(3);
  });

  it('expands the forward reach from 4.5 to 6.5 to 8.5 yards across the three contacts', () => {
    const sim = makeSim();
    const primary = spawnAt(sim, 3, 0);
    const near = spawnAt(sim, 6, 0);
    const middle = spawnAt(sim, 8.1, 0);
    const far = spawnAt(sim, 10, 0);
    const outside = spawnAt(sim, 12, 0);
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1102));
    tickMany(sim, 11);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(middle.hp).toBe(middle.maxHp);

    tickMany(sim, 3);
    expect(middle.hp).toBeLessThan(middle.maxHp);
    expect(far.hp).toBe(far.maxHp);

    tickMany(sim, 4);
    expect(far.hp).toBeLessThan(far.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('keeps native insertion order and stops each contact at TargetValue eight', () => {
    const sim = makeSim();
    const primary = spawnAt(sim, 3, 0);
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) => spawnAt(sim, 5, -2.1 + index * 0.6)),
    ];
    const cappedOut = targets.at(8);
    if (!cappedOut) throw new Error('ninth native target fixture is missing');
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1102));
    tickMany(sim, 11);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(cappedOut.hp).toBe(cappedOut.maxHp);
  });
});

describe('MIR4 1104 native ImpactType 3 runtime selection', () => {
  it('advances three yards and resolves the contact from the moved actor pose', () => {
    const sim = makeSim();
    const startX = sim.player.pos.x;
    const primary = spawnAt(sim, 3, 0);
    const insideStrip = spawnAt(sim, 8, 2.5);
    const outsideSide = spawnAt(sim, 8, 3.3);
    const behindStart = spawnAt(sim, -1, 0);
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 11);

    expect(sim.player.pos.x).toBeGreaterThan(startX + 2.5);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(insideStrip.hp).toBeLessThan(insideStrip.maxHp);
    expect(outsideSide.hp).toBe(outsideSide.maxHp);
    expect(behindStart.hp).toBe(behindStart.maxHp);
    expect(primary.mir4Effects?.active.find((effect) => effect.kind === 'knockdown')?.duration).toBe(
      3,
    );
    expect(
      insideStrip.mir4Effects?.active.find((effect) => effect.kind === 'knockdown')?.duration,
    ).toBe(3);
  });

  it('stops the live forward-strip target list at the native TargetValue eight', () => {
    const sim = makeSim();
    const primary = spawnAt(sim, 3, 0);
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) => spawnAt(sim, 6, -2.1 + index * 0.6)),
    ];
    const cappedOut = targets.at(8);
    if (!cappedOut) throw new Error('ninth Splitting Slash target fixture is missing');
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 11);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(cappedOut.hp).toBe(cappedOut.maxHp);
  });
});

describe('MIR4 1304 native ImpactType 3 runtime selection', () => {
  it('resolves Body Check from its in-flight target movement pose', () => {
    const sim = makeSim();
    const startX = sim.player.pos.x;
    const primary = spawnAt(sim, 3, 0);
    const insideStrip = spawnAt(sim, 6, 2);
    const outsideSide = spawnAt(sim, 6, 3.2);
    const behindStart = spawnAt(sim, -1, 0);
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1304));
    tickMany(sim, 12);

    expect(sim.player.pos.x).toBeGreaterThan(startX);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(insideStrip.hp).toBeLessThan(insideStrip.maxHp);
    expect(outsideSide.hp).toBe(outsideSide.maxHp);
    expect(behindStart.hp).toBe(behindStart.maxHp);
  });
});
