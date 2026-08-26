import { describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { deriveMir4PlayerStats } from '../../src/sim/mir4/derived_stats';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { sanitizeMir4PlayerState } from '../../src/sim/mir4/persistence';
import {
  MIR4_CONSTITUTION_BRANCHES,
  MIR4_INNER_FORCE_BRANCHES,
  MIR4_TRAINING_FIRST_TIER_MAX_LEVEL,
  MIR4_TRAINING_UPGRADE_ENERGY_COST,
  mir4TrainingRequirements,
  mir4TrainingStatusBonuses,
} from '../../src/sim/mir4/training';
import { Sim } from '../../src/sim/sim';

function makeSim(classId: 1 | 2 | 3 | 4 | 5 = 1): Sim {
  const classKey = ['warrior', 'elementalist', 'taoist', 'arbalist', 'lancer'][classId - 1] as
    | 'warrior'
    | 'elementalist'
    | 'taoist'
    | 'arbalist'
    | 'lancer';
  return new Sim({
    seed: 8_504,
    playerClass: 'warrior',
    playerClassMir4: classKey,
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
}

function playerMeta(sim: Sim) {
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Training test player metadata');
  return meta;
}

function playerMir4Stats(sim: Sim) {
  const stats = sim.player.mir4;
  if (!stats) throw new Error('missing Training test MIR4 stats');
  return stats;
}

describe('MIR4 source-backed Training tier 1', () => {
  it('pins the seven Constitution and four Muscle Strength Manual branches', () => {
    expect(MIR4_CONSTITUTION_BRANCHES.map((branch) => branch.name)).toEqual([
      'Iron Skin',
      'Clever',
      'Insightful',
      'Awakened',
      'Agility',
      'Focused',
      'Strength',
    ]);
    expect(MIR4_INNER_FORCE_BRANCHES.map((branch) => branch.name)).toEqual([
      'Sky Palace',
      'Royal Decree',
      'Pulsing Sky',
      'Great Ruler',
    ]);
    expect(MIR4_TRAINING_FIRST_TIER_MAX_LEVEL).toBe(5);
    expect(MIR4_TRAINING_UPGRADE_ENERGY_COST).toBe(100);
    expect(mir4TrainingRequirements('constitution', 1, 1)).toEqual([
      { key: 'herbLeaf', count: 2 },
      { key: 'reishi', count: 2 },
    ]);
    expect(mir4TrainingRequirements('constitution', 7, 5)).toEqual([
      { key: 'herbRoot', count: 9 },
      { key: 'centuryFruit', count: 1 },
    ]);
    expect(mir4TrainingRequirements('innerForce', 4, 3)).toEqual([
      { key: 'lesserYinPill', count: 1 },
    ]);
  });

  it('derives the exact first-tier class-specific status rows without cumulative double counting', () => {
    expect(
      Object.fromEntries(
        mir4TrainingStatusBonuses(1, {
          version: 1,
          constitution: [5, 5, 5, 5, 5, 5, 5],
          innerForce: [5, 5, 5, 5],
        }),
      ),
    ).toEqual({
      1: 500,
      6: 100,
      20: 68,
      24: 60,
      26: 60,
      28: 20,
      29: 20,
      40: 25,
    });
    expect(
      Object.fromEntries(
        mir4TrainingStatusBonuses(2, {
          version: 1,
          constitution: [0, 0, 0, 0, 0, 0, 5],
          innerForce: [5, 0, 0, 0],
        }),
      ),
    ).toEqual({ 22: 68 });
  });

  it('spends Energy atomically, applies Constitution stats and rejects replayed revisions', () => {
    const sim = makeSim(1);
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: 77, energy: 200 };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      herbLeaf: 2,
      unihornSlice: 1,
    };
    const hpBefore = sim.player.maxHp;

    expect(sim.mir4TrainConstitution(3, 0)).toEqual({
      ok: true,
      code: 'success',
      level: 1,
      energySpent: 100,
      materialsSpent: { herbLeaf: 2, unihornSlice: 1 },
    });
    expect(meta.mir4Currencies).toEqual({ darksteel: 77, energy: 100 });
    expect(meta.mir4Materials).toMatchObject({ herbLeaf: 0, unihornSlice: 0 });
    expect(meta.mir4Training).toEqual({
      version: 1,
      constitution: [0, 0, 1, 0, 0, 0, 0],
      innerForce: [0, 0, 0, 0],
    });
    expect(sim.player.maxHp).toBe(hpBefore + 100);

    expect(sim.mir4TrainConstitution(3, 0)).toEqual({
      ok: false,
      code: 'stale-level',
      level: 1,
      energySpent: 0,
    });
    expect(meta.mir4Currencies.energy).toBe(100);
    expect(sim.player.maxHp).toBe(hpBefore + 100);
  });

  it('applies Inner Force to the live status funnel and never mutates on insufficient Energy', () => {
    const sim = makeSim(1);
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: 9, energy: 100 };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, greaterYinPill: 1 };
    const before = playerMir4Stats(sim).monsterDamageBps;

    expect(sim.mir4TrainInnerForce(2, 0)).toEqual({
      ok: true,
      code: 'success',
      level: 1,
      energySpent: 100,
      materialsSpent: { greaterYinPill: 1 },
    });
    expect(playerMir4Stats(sim).monsterDamageBps).toBe(before + 5);
    expect(sim.mir4TrainInnerForce(2, 1)).toEqual({
      ok: false,
      code: 'insufficient-energy',
      level: 1,
      energySpent: 0,
    });
    expect(meta.mir4Training?.innerForce).toEqual([0, 1, 0, 0]);
    expect(meta.mir4Currencies).toEqual({ darksteel: 9, energy: 0 });
    expect(meta.mir4Materials.greaterYinPill).toBe(0);
  });

  it('rejects a short material wallet without spending Energy or partial ingredients', () => {
    const sim = makeSim(1);
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: 0, energy: 500 };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, herbLeaf: 2, reishi: 1 };
    const before = structuredClone(meta.mir4Materials);

    expect(sim.mir4TrainConstitution(1, 0)).toEqual({
      ok: false,
      code: 'insufficient-materials',
      level: 0,
      energySpent: 0,
    });
    expect(meta.mir4Currencies.energy).toBe(500);
    expect(meta.mir4Materials).toEqual(before);
    expect(meta.mir4Training).toBeUndefined();
  });

  it('stops at the first promotion boundary until the next authored tier is shipped', () => {
    const sim = makeSim(1);
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: 0, energy: 1_000 };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, herbLeaf: 24, reishi: 24 };
    for (let level = 0; level < MIR4_TRAINING_FIRST_TIER_MAX_LEVEL; level += 1) {
      expect(sim.mir4TrainConstitution(1, level).ok).toBe(true);
    }

    expect(sim.mir4TrainConstitution(1, 5)).toEqual({
      ok: false,
      code: 'promotion-required',
      level: 5,
      energySpent: 0,
    });
    expect(meta.mir4Currencies.energy).toBe(500);
  });

  it('sanitizes hostile persisted arrays, drops unknown fields and keeps absence as level zero', () => {
    expect(sanitizeMir4PlayerState({}, 1).mir4Training).toBeUndefined();
    expect(
      sanitizeMir4PlayerState(
        {
          mir4Training: {
            version: 1,
            constitution: [1.9, -1, 9, Number.NaN, 2, 3, 4, 999],
            innerForce: [5, 6, '3', 2, 1],
            injected: { status: 1_000_000 },
          },
        },
        1,
      ).mir4Training,
    ).toEqual({
      version: 1,
      constitution: [1, 0, 5, 0, 2, 3, 4],
      innerForce: [5, 5, 0, 2],
    });
  });

  it('feeds Training into the same derived-stat projection used by UI and combat', () => {
    const base = deriveMir4PlayerStats(1, 1);
    const trained = deriveMir4PlayerStats(
      1,
      1,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        version: 1,
        constitution: [0, 0, 1, 0, 0, 0, 0],
        innerForce: [0, 0, 0, 0],
      },
    );

    expect(trained.maxHp).toBe(base.maxHp + 100);
    expect(trained.combatPower).toBeGreaterThan(base.combatPower);
  });
});
