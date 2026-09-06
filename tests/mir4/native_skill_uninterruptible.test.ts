import { afterAll, describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import {
  mir4NativeRuntimeUninterruptibleBuff,
  mir4NativeSourceUninterruptibleBuffMatchesRow,
} from '../../src/sim/mir4/native_skill_uninterruptible';
import { Sim } from '../../src/sim/sim';
import type { Aura, Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 15_011,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Uninterruptible Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  sim.player.level = 5;
  sim.player.resource = sim.player.maxResource;
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_1501_uninterruptible_target',
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
    sim.groundPos(sim.player.pos.x + 5, sim.player.pos.z),
  );
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 Warrior 1501 native uninterruptible buff', () => {
  it('admits only the exact 150101 -> BUFF 11031 source row', () => {
    const spec = mir4NativeRuntimeUninterruptibleBuff(1501);
    expect(spec).toEqual({
      skillId: 1501,
      attackId: 150101,
      buffId: 11031,
      effectId: 'mir4_native_buff_11031',
      kind: 'control-immunity',
      durationMs: 2_000,
      applyTo: 'source',
      applyPhase: 'action-start',
    });
    expect(mir4NativeRuntimeUninterruptibleBuff(1104)).toBeNull();
    const action = spec && mir4NativeSkillActionById(1501);
    const row = action?.rows[0];
    if (!row) throw new Error('Missing native 150101 row');
    expect(mir4NativeSourceUninterruptibleBuffMatchesRow(row)).toBe(true);
    expect(
      mir4NativeSourceUninterruptibleBuffMatchesRow({
        ...row,
        nativeBehavior: { ...row.nativeBehavior, buffIds: [] },
      }),
    ).toBe(false);
  });

  it('applies at action start and rejects MIR4 and classic crowd control for two seconds', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;

    expect(sim.mir4CastSkill(1501, target.id)).toEqual({ ok: true });
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_11031',
        kind: 'control-immunity',
        duration: 2,
        remaining: 2,
        sourceId: sim.playerId,
      }),
    );
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'hostile_stun',
        kind: 'stun',
        durationSeconds: 1,
        name: 'Hostile Stun',
        sourceId: target.id,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
    const classicStun: Aura = {
      id: 'classic_hostile_stun',
      name: 'Classic Hostile Stun',
      kind: 'stun',
      remaining: 1,
      duration: 1,
      value: 0,
      sourceId: target.id,
      school: 'physical',
    };
    expect(sim.ctx.tryApplyAura?.(sim.player, classicStun)).toBe(false);
  });
});
