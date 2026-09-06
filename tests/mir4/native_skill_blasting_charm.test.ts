import { describe, expect, it } from 'vitest';
import { mir4ControlChanceFromStatuses, mir4ControlDurationMs } from '../../src/sim/mir4/control';
import {
  applyMir4NativeBlastingCharmContact,
  mir4NativeBlastingCharmPolicy,
} from '../../src/sim/mir4/native_skill_blasting_charm';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(): Sim {
  const sim = new Sim({
    seed: 35_050,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Blasting Charm Policy QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.drainEvents();
  return sim;
}

describe('MIR4 Taoist 3505 Blasting Charm policy', () => {
  it('pins the exact rank 1, 5, 8 and 10 debuff ladders', () => {
    expect(mir4NativeBlastingCharmPolicy(1)).toMatchObject({
      skillId: 3505,
      skillLevel: 1,
      contactAttackId: 350502,
      darkness: { buffId: 30020, silenceResistanceBasisPoints: -250, durationMs: 8_000 },
      physicalDefense: { buffId: 30505, flat: -50, durationMs: 15_000 },
      monsterAllDamageReductionBasisPoints: 0,
      characterMonsterDamageReductionBasisPoints: 0,
      characterPvpDamageReductionBasisPoints: 0,
      controlResistance: null,
    });
    expect(mir4NativeBlastingCharmPolicy(5)).toMatchObject({
      darkness: { durationMs: 10_000 },
      physicalDefense: { durationMs: 15_000 },
      monsterAllDamageReductionBasisPoints: -1_500,
      characterMonsterDamageReductionBasisPoints: -1_500,
      characterPvpDamageReductionBasisPoints: 0,
      contextualReductionDurationMs: 15_000,
      controlResistance: null,
    });
    expect(mir4NativeBlastingCharmPolicy(8)).toMatchObject({
      darkness: { durationMs: 12_000 },
      physicalDefense: { durationMs: 20_000 },
      monsterAllDamageReductionBasisPoints: -2_000,
      characterMonsterDamageReductionBasisPoints: -2_000,
      characterPvpDamageReductionBasisPoints: -1_500,
      contextualReductionDurationMs: 20_000,
      controlResistance: {
        debilitationBasisPoints: -1_500,
        silenceBasisPoints: -1_500,
        stunBasisPoints: -1_000,
        durationMs: 30_000,
      },
    });
    expect(mir4NativeBlastingCharmPolicy(10)).toMatchObject({
      darkness: { durationMs: 15_000 },
      physicalDefense: { durationMs: 30_000 },
      monsterAllDamageReductionBasisPoints: -3_000,
      characterMonsterDamageReductionBasisPoints: -3_000,
      characterPvpDamageReductionBasisPoints: -2_000,
      contextualReductionDurationMs: 30_000,
      controlResistance: {
        debilitationBasisPoints: -3_000,
        silenceBasisPoints: -3_000,
        stunBasisPoints: -2_000,
      },
    });
  });

  it('feeds negative Stun, Debilitation, and Silence resistance into control chance and duration', () => {
    expect(mir4ControlChanceFromStatuses(5_000, 'stun', undefined, undefined, 'monster', -2_000))
      .toBe(7_000);
    expect(
      mir4ControlChanceFromStatuses(
        5_000,
        'debilitation',
        undefined,
        undefined,
        'monster',
        -3_000,
      ),
    ).toBe(8_000);
    expect(
      mir4ControlDurationMs(10_000, 'silence', undefined, undefined, 'monster', -3_000),
    ).toBe(13_000);
  });

  it('applies monster and character-only branches without crossing them', () => {
    const sim = makeTaoist();
    const monster = {
      ...sim.player,
      id: 80_001,
      kind: 'mob',
      ownerId: null,
      dead: false,
      mir4Effects: undefined,
      auras: [],
    } as Entity;
    const character = {
      ...sim.player,
      id: 80_002,
      kind: 'player',
      ownerId: null,
      dead: false,
      mir4Effects: undefined,
      auras: [],
    } as Entity;
    const originalHostility = sim.ctx.isHostileTo;
    sim.ctx.isHostileTo = () => true;
    try {
      expect(
        applyMir4NativeBlastingCharmContact(
          sim.ctx,
          sim.player,
          monster,
          350502,
          0,
          10,
        ),
      ).toBe(true);
      expect(
        applyMir4NativeBlastingCharmContact(
          sim.ctx,
          sim.player,
          character,
          350502,
          0,
          10,
        ),
      ).toBe(true);
    } finally {
      sim.ctx.isHostileTo = originalHostility;
    }

    expect(mir4NativeStatusBonus(monster, 47)).toBe(-3_000);
    expect(mir4NativeStatusBonus(monster, 42)).toBe(0);
    expect(mir4NativeStatusBonus(monster, 39)).toBe(0);
    expect(mir4NativeStatusBonus(character, 47)).toBe(0);
    expect(mir4NativeStatusBonus(character, 42)).toBe(-3_000);
    expect(mir4NativeStatusBonus(character, 39)).toBe(-2_000);
    for (const target of [monster, character]) {
      expect(mir4NativeStatusBonus(target, 24)).toBe(-50);
      expect(mir4NativeStatusBonus(target, 49)).toBe(-2_000);
      expect(mir4NativeStatusBonus(target, 51)).toBe(-3_000);
      expect(mir4NativeStatusBonus(target, 53)).toBe(-3_250);
    }
  });
});
