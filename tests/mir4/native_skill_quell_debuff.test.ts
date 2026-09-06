import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4/native_skill_actions';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4AttackMultiplier } from '../../src/sim/mir4/effects';
import {
  compileMir4NativeSkillQuellDebuff,
  MIR4_NATIVE_2101_QUELL_EVIDENCE,
  MIR4_NATIVE_3101_QUELL_EVIDENCE,
  mir4NativeRuntimeQuellDebuff,
} from '../../src/sim/mir4/native_skill_quell_debuff';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(seed = 21_010): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'elementalist',
    playerName: 'Native Flame Orb Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, {
    x: DUNGEON_X_THRESHOLD + 100,
    z: 1_000,
  });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.level = 20;
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'native_2101_quell_target',
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
    sim.groundPos(sim.player.pos.x + 10, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function tickMany(sim: Sim, count: number): void {
  for (let tick = 0; tick < count; tick += 1) sim.tick();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 2101 native Quell evidence', () => {
  it('compiles the exact 103001 -> BUFF 30010 chain', () => {
    const action = mir4NativeSkillActionById(2101);
    if (!action) throw new Error('Missing native 2101 action');

    expect(MIR4_NATIVE_2101_QUELL_EVIDENCE.skillCostRows).toHaveLength(10);
    expect(compileMir4NativeSkillQuellDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 2101,
        contactAttackId: 210102,
        passiveId: 103001,
        buffId: 30010,
        effectId: 'mir4_native_buff_30010',
        kind: 'spell-attack-reduction',
        durationMs: 5_000,
        magnitude: 0.25,
        probabilityBasisPoints: 10_000,
      },
    });
    expect(compileMir4NativeSkillQuellDebuff(action, 10)).toMatchObject({
      ok: true,
      debuff: { durationMs: 14_000, magnitude: 0.25 },
    });
  });

  it('fails closed for a changed native source tuple', () => {
    const action = mir4NativeSkillActionById(2101);
    if (!action) throw new Error('Missing native 2101 action');
    expect(
      compileMir4NativeSkillQuellDebuff(
        {
          ...action,
          nativeBehavior: { ...action.nativeBehavior, smiteBuffIds: [30011] },
        },
        1,
      ),
    ).toEqual({ ok: false, path: 'action.nativeBehavior.smiteBuffIds' });
  });

  it('admits only the damaging Flame Orb contact', () => {
    expect(mir4NativeRuntimeQuellDebuff(2101, 210101, 1)).toBeNull();
    expect(mir4NativeRuntimeQuellDebuff(2101, 210102, 1)).toMatchObject({
      buffId: 30010,
      passiveId: 103001,
    });
    expect(mir4NativeRuntimeQuellDebuff(2111, 211102, 1)).toBeNull();
  });
});

describe('MIR4 2201 native Quell evidence', () => {
  it('uses the shared 103001 -> BUFF 30010 chain on the first damaging contact', () => {
    const action = mir4NativeSkillActionById(2201);
    if (!action) throw new Error('Missing native 2201 action');

    expect(compileMir4NativeSkillQuellDebuff(action, 1)).toMatchObject({
      ok: true,
      debuff: {
        skillId: 2201,
        contactAttackId: 220102,
        passiveId: 103001,
        buffId: 30010,
        durationMs: 5_000,
        magnitude: 0.25,
      },
    });
    expect(mir4NativeRuntimeQuellDebuff(2201, 220101, 1)).toBeNull();
    expect(mir4NativeRuntimeQuellDebuff(2201, 220102, 1)).toMatchObject({ buffId: 30010 });
    expect(mir4NativeRuntimeQuellDebuff(2201, 220103, 1)).toBeNull();
    expect(mir4RuntimeSkillExecutionAuthority(2201)?.issues).toEqual([]);
  });
});

describe('MIR4 3101 native Quell evidence', () => {
  it('compiles the physical first contact through Taoist cost group 302', () => {
    const action = mir4NativeSkillActionById(3101);
    if (!action) throw new Error('Missing native 3101 action');

    expect(MIR4_NATIVE_3101_QUELL_EVIDENCE.skillCostRows).toHaveLength(10);
    expect(compileMir4NativeSkillQuellDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 3101,
        contactAttackId: 310101,
        passiveId: 103001,
        buffId: 30010,
        effectId: 'mir4_native_buff_30010',
        kind: 'spell-attack-reduction',
        durationMs: 5_000,
        magnitude: 0.25,
        probabilityBasisPoints: 10_000,
      },
    });
    expect(mir4NativeRuntimeQuellDebuff(3101, 310101, 10)).toMatchObject({
      durationMs: 14_000,
    });
    expect(mir4NativeRuntimeQuellDebuff(3101, 310102, 10)).toBeNull();
  });
});

describe('MIR4 2101 native Quell runtime', () => {
  it('lands at the 780 ms damage contact and reduces only spell output', () => {
    const sim = makeSim();
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;

    expect(sim.mir4CastSkill(2101, target.id)).toEqual({ ok: true });
    tickMany(sim, 15);
    expect(target.mir4Effects?.active ?? []).not.toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_30010' }),
    );
    tickMany(sim, 1);

    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_30010',
        kind: 'spell-attack-reduction',
        duration: 5,
        remaining: 5,
        magnitude: 0.25,
        sourceId: sim.playerId,
      }),
    );
    expect(mir4AttackMultiplier(target, 'physical')).toBe(1);
    expect(mir4AttackMultiplier(target, 'magic')).toBeCloseTo(0.75, 10);
    expect(mir4RuntimeSkillExecutionAuthority(2101)?.issues).toEqual([]);
  });
});
