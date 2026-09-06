import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeFlashArrowContact,
  MIR4_NATIVE_FLASH_ARROW_RANK_EVIDENCE,
  mir4NativeFlashArrowPolicy,
} from '../../src/sim/mir4/native_skill_flash_arrow';
import { Sim } from '../../src/sim/sim';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function setup(seed = 4107) {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Flash Arrow QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'flash_arrow_target',
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
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  sim.addEntity(target);
  return { sim, target };
}

describe('MIR4 Flash Arrow native rank effects', () => {
  it('pins the sealed source tables and exact rank milestones', () => {
    expect(MIR4_NATIVE_FLASH_ARROW_RANK_EVIDENCE.provenance).toEqual({
      specialAbilitySha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
      passiveSha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
      buffSha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
    });
    expect(mir4NativeFlashArrowPolicy(1)).toMatchObject({
      baseAccuracy: { magnitude: -50, durationMs: 1000 },
      mark: { durationMs: 5000, criticalEvasion: -25 },
      directAccuracy: null,
      critical: null,
      darkness: null,
      blind: null,
    });
    expect(mir4NativeFlashArrowPolicy(5)).toMatchObject({
      baseAccuracy: { magnitude: -90 },
      mark: { durationMs: 8000 },
      directAccuracy: { magnitude: -50, durationMs: 5000 },
      critical: { magnitude: -100, durationMs: 8000 },
      darkness: null,
      blind: { durationMs: 2000, chancesByStacks: [4000, 4500, 5000] },
    });
    expect(mir4NativeFlashArrowPolicy(8)).toMatchObject({
      baseAccuracy: { magnitude: -120 },
      mark: { durationMs: 10000 },
      directAccuracy: { magnitude: -100 },
      critical: { magnitude: -200 },
      darkness: { durationMs: 10000, maxStacks: 3 },
      blind: { durationMs: 3000, chancesByStacks: [6000, 6500, 7000] },
    });
    expect(mir4NativeFlashArrowPolicy(10)).toMatchObject({
      baseAccuracy: { magnitude: -140 },
      directAccuracy: { magnitude: -200 },
      critical: { magnitude: -400 },
      blind: { durationMs: 5000, chancesByStacks: [8000, 9000, 10000] },
    });
  });

  it('applies the short Accuracy reduction on every field pulse without direct-only effects', () => {
    const { sim, target } = setup();
    expect(applyMir4NativeFlashArrowContact(sim.ctx, sim.player, target, 410711, 1)).toMatchObject({
      applied: true,
      baseAccuracyReduced: true,
      marked: false,
    });
    expect(mir4NativeStatusBonus(target, 28)).toBe(-50);
    expect(mir4NativeStatusBonus(target, 31)).toBe(0);
  });

  it('applies rank-10 direct effects, builds Darkness to three stacks and guarantees Blind', () => {
    const { sim, target } = setup(41_071);
    (sim.ctx.rng as { next: () => number }).next = () => 0.9999;
    for (let contact = 0; contact < 3; contact += 1) {
      applyMir4NativeFlashArrowContact(sim.ctx, sim.player, target, 410702, 10);
    }
    expect(mir4NativeStatusBonus(target, 28)).toBe(-340);
    expect(mir4NativeStatusBonus(target, 30)).toBe(-400);
    expect(mir4NativeStatusBonus(target, 31)).toBe(-25);
    expect(mir4NativeStatusBonus(target, 53)).toBe(-750);
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_30020_53'),
    ).toMatchObject({ nativeStacks: 3, duration: 10 });
    expect(
      target.mir4Effects?.active.find(
        (effect) => effect.effectId === 'mir4_native_buff_40528_blind',
      ),
    ).toMatchObject({ kind: 'blind', magnitude: 1, duration: 5 });
  });
});
