import { describe, expect, it, vi } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { sanitizeMir4PlayerState } from '../../src/sim/mir4/persistence';
import {
  MIR4_SOLITUDE_BRANCHES,
  MIR4_SOLITUDE_MATERIALS,
  mir4SolitudeAttempt,
  resolveMir4SolitudeOutcome,
} from '../../src/sim/mir4/solitude_training';
import { mir4ModifiedDropChance } from '../../src/sim/mir4/status_effects';
import { mir4TrainingStatusBonuses } from '../../src/sim/mir4/training';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  return new Sim({
    seed: 4_711,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
}

function playerMeta(sim: Sim) {
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('Test player metadata was not created');
  return meta;
}

function playerMir4Stats(sim: Sim) {
  const stats = sim.player.mir4;
  if (!stats) throw new Error('Test player MIR4 stats were not created');
  return stats;
}

function economicState(sim: Sim) {
  const meta = playerMeta(sim);
  return structuredClone({
    currencies: meta.mir4Currencies,
    materials: meta.mir4Materials,
    training: meta.mir4Training,
  });
}

function expectAtomicRejection(
  sim: Sim,
  expectedCode: string,
  action: () => { code: string },
): void {
  const before = economicState(sim);
  const next = vi.spyOn(sim.rng, 'next');
  expect(action().code).toBe(expectedCode);
  expect(next).not.toHaveBeenCalled();
  expect(economicState(sim)).toEqual(before);
}

describe('MIR4 source-backed Solitude Training', () => {
  it('pins every Conception Vessel branch and every exact source item id', () => {
    expect(
      MIR4_SOLITUDE_BRANCHES.map(({ statusId, unlockLevel, materialFamily, valuePerLevel }) => [
        statusId,
        unlockLevel,
        materialFamily,
        valuePerLevel,
      ]),
    ).toEqual([
      [40, 70, 'unihorn', 50],
      [42, 70, 'flowerOil', 50],
      [41, 70, 'greaterYangPill', 50],
      [43, 70, 'greaterYinPill', 50],
      [89, 75, 'flowerOil', 300],
      [82, 75, 'centuryFruit', 300],
      [84, 75, 'lesserYangPill', 300],
      [93, 75, 'lesserYinPill', 300],
    ]);
    expect(
      Object.fromEntries(
        Object.entries(MIR4_SOLITUDE_MATERIALS).map(([key, material]) => [
          key,
          material.sourceItemId,
        ]),
      ),
    ).toEqual({
      noirsoulHerbRare: 517000411,
      noirsoulHerbEpic: 517000412,
      noirsoulHerbLegendary: 517000413,
      unihornRare: 501000013,
      unihornEpic: 501000014,
      unihornLegendary: 501000015,
      flowerOilRare: 501000023,
      flowerOilEpic: 501000024,
      flowerOilLegendary: 501000025,
      centuryFruitRare: 501000043,
      centuryFruitEpic: 501000044,
      centuryFruitLegendary: 501000045,
      greaterYangPillRare: 517000103,
      greaterYangPillEpic: 517000104,
      greaterYangPillLegendary: 517000105,
      greaterYinPillRare: 517000203,
      greaterYinPillEpic: 517000204,
      greaterYinPillLegendary: 517000205,
      lesserYangPillRare: 517000303,
      lesserYangPillEpic: 517000304,
      lesserYangPillLegendary: 517000305,
      lesserYinPillRare: 517000403,
      lesserYinPillEpic: 517000404,
      lesserYinPillLegendary: 517000405,
    });
  });

  it('pins all ten exact cost and outcome rows', () => {
    expect(
      Array.from({ length: 10 }, (_, index) => {
        const attempt = mir4SolitudeAttempt(1, index + 1);
        if (!attempt) throw new Error(`Missing Solitude level ${index + 1}`);
        return [
          attempt.successBps,
          attempt.failBps,
          attempt.criticalFailBps,
          attempt.darksteelCost,
          attempt.requirements[0]?.count,
          attempt.requirements[1]?.count,
        ];
      }),
    ).toEqual([
      [7_000, 3_000, 0, 1_000, 1, 5],
      [5_000, 5_000, 0, 1_000, 1, 5],
      [4_000, 5_500, 500, 1_000, 1, 5],
      [3_500, 5_500, 1_000, 1_000, 1, 5],
      [3_000, 4_500, 2_500, 10_000, 1, 3],
      [2_500, 4_500, 3_000, 10_000, 1, 3],
      [2_000, 4_500, 3_500, 10_000, 1, 3],
      [1_500, 4_500, 4_000, 10_000, 1, 3],
      [1_000, 4_500, 4_500, 50_000, 1, 2],
      [500, 4_500, 5_000, 50_000, 1, 2],
    ]);
    expect(mir4SolitudeAttempt(1, 1)).toEqual({
      targetLevel: 1,
      statusValue: 50,
      darksteelCost: 1_000,
      successBps: 7_000,
      failBps: 3_000,
      criticalFailBps: 0,
      requirements: [
        { key: 'noirsoulHerbRare', count: 1 },
        { key: 'unihornRare', count: 5 },
      ],
    });
    expect(mir4SolitudeAttempt(2, 5)).toMatchObject({
      darksteelCost: 10_000,
      successBps: 3_000,
      failBps: 4_500,
      criticalFailBps: 2_500,
      requirements: [
        { key: 'noirsoulHerbEpic', count: 1 },
        { key: 'flowerOilEpic', count: 3 },
      ],
    });
    expect(mir4SolitudeAttempt(8, 10)).toMatchObject({
      statusValue: 3_000,
      darksteelCost: 50_000,
      successBps: 500,
      failBps: 4_500,
      criticalFailBps: 5_000,
      requirements: [
        { key: 'noirsoulHerbLegendary', count: 1 },
        { key: 'lesserYinPillLegendary', count: 2 },
      ],
    });
  });

  it('makes the fifth branch improve the live item-drop chance', () => {
    const statuses = mir4TrainingStatusBonuses(1, {
      version: 1,
      constitution: [0, 0, 0, 0, 0, 0, 0],
      innerForce: [0, 0, 0, 0],
      solitude: { conceptionVessel: [0, 0, 0, 0, 1, 0, 0, 0] },
    });

    expect(statuses.get(89)).toBe(300);
    expect(mir4ModifiedDropChance(0.25, Object.fromEntries(statuses))).toBeCloseTo(0.2575);
  });

  it('uses one roll band for success, neutral failure and critical failure', () => {
    const attempt = mir4SolitudeAttempt(1, 4);
    if (!attempt) throw new Error('Expected a valid level 4 Solitude attempt');
    expect(resolveMir4SolitudeOutcome(0.1, attempt)).toBe('success');
    expect(resolveMir4SolitudeOutcome(0.6, attempt)).toBe('failure');
    expect(resolveMir4SolitudeOutcome(0.95, attempt)).toBe('critical-failure');
    expect(resolveMir4SolitudeOutcome(0.349_999, attempt)).toBe('success');
    expect(resolveMir4SolitudeOutcome(0.35, attempt)).toBe('failure');
    expect(resolveMir4SolitudeOutcome(0.899_999, attempt)).toBe('failure');
    expect(resolveMir4SolitudeOutcome(0.9, attempt)).toBe('critical-failure');
  });

  it('projects all eight branch levels through the live Training status funnel', () => {
    expect(
      Object.fromEntries(
        mir4TrainingStatusBonuses(1, {
          version: 1,
          constitution: [0, 0, 0, 0, 0, 0, 0],
          innerForce: [0, 0, 0, 0],
          solitude: { conceptionVessel: [1, 2, 3, 4, 5, 6, 7, 8] },
        }),
      ),
    ).toEqual({ 40: 50, 41: 150, 42: 100, 43: 200, 82: 1_800, 84: 2_100, 89: 1_500, 93: 2_400 });
  });

  it('spends Darksteel and ranked materials atomically and applies a successful status', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    sim.setPlayerLevel(70);
    meta.mir4Currencies = { darksteel: 2_000, energy: 17 };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 1,
      unihornRare: 5,
    };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0.1);
    const before = playerMir4Stats(sim).monsterDamageBps;

    expect(sim.mir4TrainSolitude(1, 0)).toEqual({
      ok: true,
      code: 'success',
      previousLevel: 0,
      level: 1,
      darksteelSpent: 1_000,
    });
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_000, energy: 17 });
    expect(meta.mir4Materials).toMatchObject({ noirsoulHerbRare: 0, unihornRare: 0 });
    expect(meta.mir4Training?.solitude?.conceptionVessel).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(playerMir4Stats(sim).monsterDamageBps).toBe(before + 50);
  });

  it('keeps the level on normal failure and removes one on critical failure', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    meta.mir4Training = {
      version: 1,
      constitution: [0, 0, 0, 0, 0, 0, 0],
      innerForce: [0, 0, 0, 0],
      solitude: { conceptionVessel: [3, 0, 0, 0, 0, 0, 0, 0] },
    };
    meta.mir4Currencies = { darksteel: 2_000, energy: 0 };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 2,
      unihornRare: 10,
    };
    sim.setPlayerLevel(70);
    expect(playerMir4Stats(sim).monsterDamageBps).toBe(150);
    sim.drainEvents();
    const roll = vi.spyOn(sim.rng, 'next').mockReturnValueOnce(0.6).mockReturnValueOnce(0.95);

    expect(sim.mir4TrainSolitude(1, 3).code).toBe('failure');
    expect(meta.mir4Training.solitude?.conceptionVessel[0]).toBe(3);
    expect(playerMir4Stats(sim).monsterDamageBps).toBe(150);
    expect(meta.mir4Currencies.darksteel).toBe(1_000);
    expect(meta.mir4Materials).toMatchObject({ noirsoulHerbRare: 1, unihornRare: 5 });
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4SolitudeTrainingResult',
      pid: sim.playerId,
      branchId: 1,
      outcome: 'failure',
      previousLevel: 3,
      level: 3,
      chanceBps: 3_500,
    });
    expect(sim.mir4TrainSolitude(1, 3).code).toBe('critical-failure');
    expect(meta.mir4Training.solitude?.conceptionVessel[0]).toBe(2);
    expect(playerMir4Stats(sim).monsterDamageBps).toBe(100);
    expect(meta.mir4Currencies.darksteel).toBe(0);
    expect(meta.mir4Materials).toMatchObject({ noirsoulHerbRare: 0, unihornRare: 0 });
    expect(sim.drainEvents()).toContainEqual({
      type: 'mir4SolitudeTrainingResult',
      pid: sim.playerId,
      branchId: 1,
      outcome: 'critical-failure',
      previousLevel: 3,
      level: 2,
      chanceBps: 3_500,
    });
    expect(roll).toHaveBeenCalledTimes(2);
  });

  it('blocks locked levels and sanitizes hostile persisted Solitude arrays', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: 2_000, energy: 0 };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 1,
      unihornRare: 5,
    };
    expect(sim.mir4TrainSolitude(1, 0).code).toBe('level-locked');
    expect(meta.mir4Currencies.darksteel).toBe(2_000);

    expect(
      sanitizeMir4PlayerState(
        {
          mir4Training: {
            version: 1,
            constitution: [],
            innerForce: [],
            solitude: { conceptionVessel: [1.8, -2, 99, '4'] },
          },
        },
        1,
      ).mir4Training?.solitude,
    ).toEqual({ conceptionVessel: [1, 0, 10, 0, 0, 0, 0, 0] });
  });

  it('does not draw RNG or mutate state when revision or resources reject the attempt', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    sim.setPlayerLevel(70);
    meta.mir4Currencies = { darksteel: 999, energy: 3 };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS };
    const next = vi.spyOn(sim.rng, 'next');

    expect(sim.mir4TrainSolitude(1, 1).code).toBe('stale-level');
    expect(meta.mir4Currencies).toEqual({ darksteel: 999, energy: 3 });
    expect(sim.mir4TrainSolitude(1, 0).code).toBe('insufficient-darksteel');
    expect(meta.mir4Currencies).toEqual({ darksteel: 999, energy: 3 });
    meta.mir4Currencies.darksteel = 1_000;
    expect(sim.mir4TrainSolitude(1, 0).code).toBe('insufficient-materials');
    expect(next).not.toHaveBeenCalled();
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_000, energy: 3 });
    expect(meta.mir4Materials).toEqual(MIR4_EMPTY_MATERIALS);
    expect(meta.mir4Training).toBeUndefined();
  });

  it('rejects every remaining admission arm atomically, including each missing ingredient', () => {
    const classic = new Sim({ seed: 9, playerClass: 'warrior', gameProfile: 'woc-classic' });
    expectAtomicRejection(classic, 'unavailable', () => classic.mir4TrainSolitude(1, 0));

    const invalid = makeSim();
    invalid.setPlayerLevel(70);
    expectAtomicRejection(invalid, 'invalid-branch', () => invalid.mir4TrainSolitude(0, 0));

    const locked = makeSim();
    expectAtomicRejection(locked, 'level-locked', () => locked.mir4TrainSolitude(1, 0));

    const maxed = makeSim();
    maxed.setPlayerLevel(70);
    playerMeta(maxed).mir4Training = {
      version: 1,
      constitution: [0, 0, 0, 0, 0, 0, 0],
      innerForce: [0, 0, 0, 0],
      solitude: { conceptionVessel: [10, 0, 0, 0, 0, 0, 0, 0] },
    };
    expectAtomicRejection(maxed, 'max-level', () => maxed.mir4TrainSolitude(1, 10));

    const missingSecondary = makeSim();
    missingSecondary.setPlayerLevel(70);
    playerMeta(missingSecondary).mir4Currencies = { darksteel: 1_000, energy: 0 };
    playerMeta(missingSecondary).mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 1,
    };
    expectAtomicRejection(missingSecondary, 'insufficient-materials', () =>
      missingSecondary.mir4TrainSolitude(1, 0),
    );

    const missingHerb = makeSim();
    missingHerb.setPlayerLevel(70);
    playerMeta(missingHerb).mir4Currencies = { darksteel: 1_000, energy: 0 };
    playerMeta(missingHerb).mir4Materials = { ...MIR4_EMPTY_MATERIALS, unihornRare: 5 };
    expectAtomicRejection(missingHerb, 'insufficient-materials', () =>
      missingHerb.mir4TrainSolitude(1, 0),
    );
  });
});
