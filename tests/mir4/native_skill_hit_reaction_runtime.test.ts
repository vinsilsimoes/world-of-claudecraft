import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  applyMir4NativeHitReaction,
  mir4HitReacting,
  mir4NativeRuntimeHitReaction,
} from '../../src/sim/mir4/native_skill_hit_reaction';
import { mir4HardControlled, updateMir4Effects } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(seed = 919): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Hit Reaction Test',
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
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const player = sim.player;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_hit_reaction_target',
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
    sim.groundPos(player.pos.x + 3, player.pos.z),
  );
  target.pos.y = player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  player.targetId = target.id;
  return target;
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 1102 native hit reaction runtime', () => {
  it('admits only the three proven damaging rows and keeps the setup row inert', () => {
    expect(mir4NativeRuntimeHitReaction(1102, 110201)).toBeNull();
    expect(mir4NativeRuntimeHitReaction(1102, 110202)).toEqual({
      durationMs: 200,
      stance: 'hit-01',
    });
    expect(mir4NativeRuntimeHitReaction(1102, 110203)).toEqual({
      durationMs: 200,
      stance: 'hit-01',
    });
    expect(mir4NativeRuntimeHitReaction(1102, 110204)).toEqual({
      durationMs: 200,
      stance: 'hit-01',
    });
    expect(mir4NativeRuntimeHitReaction(1103, 110301)).toBeNull();
    for (const attackId of [150101, 150103, 150105]) {
      expect(mir4NativeRuntimeHitReaction(1501, attackId)).toEqual({
        durationMs: 100,
        stance: 'hit-01',
      });
    }
    expect(mir4NativeRuntimeHitReaction(1501, 150102)).toBeNull();
    expect(mir4NativeRuntimeHitReaction(1501, 150104)).toBeNull();
  });

  it('refreshes one short action-denial state and emits one exact event per landed contact', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);

    expect(sim.mir4CastSkill(1102, target.id)).toEqual({ ok: true });
    const events = tickMany(sim, 20);
    const reactions = events.filter(
      (event): event is Extract<SimEvent, { type: 'mir4HitReaction' }> =>
        event.type === 'mir4HitReaction',
    );

    expect(reactions.map(({ attackId, durationMs, stance }) => ({
      attackId,
      durationMs,
      stance,
    }))).toEqual([
      { attackId: 110202, durationMs: 200, stance: 'hit-01' },
      { attackId: 110203, durationMs: 200, stance: 'hit-01' },
      { attackId: 110204, durationMs: 200, stance: 'hit-01' },
    ]);
    expect(reactions.every((event) => event.targetId === target.id && event.skillId === 1102)).toBe(
      true,
    );
    expect(target.mir4Effects?.active.filter((effect) => effect.kind === 'hit-react')).toHaveLength(
      1,
    );
    expect(mir4HitReacting(target)).toBe(true);
    expect(mir4HardControlled(target)).toBe(false);
    expect(target.mir4Effects?.controlImmuneUntil ?? 0).toBe(0);
  });

  it('blocks actions and movement for 200ms without creating hard-control immunity', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);
    const applied = applyMir4NativeHitReaction(sim.ctx, sim.player, {
      sourceId: target.id,
      skillId: 1102,
      attackId: 110202,
      durationMs: 200,
      stance: 'hit-01',
    });

    expect(applied).toBe(true);
    expect(sim.mir4BasicAttack(target.id)).toEqual({ ok: false, reason: 'controlled' });
    expect(sim.moveSpeedMult(sim.player)).toBe(0);
    expect(mir4HardControlled(sim.player)).toBe(false);
    expect(sim.player.mir4Effects?.controlImmuneUntil ?? 0).toBe(0);

    for (let tick = 0; tick < 4; tick += 1) updateMir4Effects(sim.ctx);
    expect(mir4HitReacting(sim.player)).toBe(false);
    expect(sim.mir4BasicAttack(target.id)).toEqual({ ok: true });
  });

  it('does not create a reaction event or state on an immune target', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);
    target.ccImmune = true;

    expect(
      applyMir4NativeHitReaction(sim.ctx, target, {
        sourceId: sim.player.id,
        skillId: 1102,
        attackId: 110202,
        durationMs: 200,
        stance: 'hit-01',
      }),
    ).toBe(false);
    expect(mir4HitReacting(target)).toBe(false);
    expect(sim.drainEvents().some((event) => event.type === 'mir4HitReaction')).toBe(false);
  });
});
