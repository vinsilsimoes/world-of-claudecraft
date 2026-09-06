import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4NativeControlAdmissionBasisPoints,
  mir4NativeExpectedSuperState,
  mir4NativeRuntimeSuperState,
  mir4NativeSuperStateMatchesRow,
} from '../../src/sim/mir4/native_skill_super_state';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4ActiveSkillSuperArmorNative } from '../../src/sim/mir4/skill_action_scheduler';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function row(skillId: number, attackId: number) {
  const found = mir4NativeSkillActionById(skillId)?.rows.find(
    (entry) => entry.attackId === attackId,
  );
  if (!found) throw new Error(`Missing native MIR4 attack row ${attackId}`);
  return found;
}

describe('MIR4 native super-state policy', () => {
  it('preserves the exact 1103 client admission inputs and inert CCUserCheck field', () => {
    expect(mir4NativeRuntimeSuperState(1103, 110106)).toEqual({
      skillId: 1103,
      attackId: 110106,
      superIgnore: 1_000,
      superArmor: 0,
      actType: 0,
      ccUserCheck: 0,
      controlApplicationBasisPoints: 10_000,
      ccUserCheckRuntime: 'client-passed-unused',
    });
    expect(mir4NativeRuntimeSuperState(1103, 110107)).toEqual({
      skillId: 1103,
      attackId: 110107,
      superIgnore: 100,
      superArmor: 0,
      actType: 0,
      ccUserCheck: 1_000,
      controlApplicationBasisPoints: 1_000,
      ccUserCheckRuntime: 'client-passed-unused',
    });
    expect(mir4NativeRuntimeSuperState(1103, 110105)).toBeNull();
    const guaranteed = mir4NativeRuntimeSuperState(1103, 110106);
    const final = mir4NativeRuntimeSuperState(1103, 110107);
    if (!guaranteed || !final) throw new Error('Missing 1103 native super state');
    expect(mir4NativeControlAdmissionBasisPoints(guaranteed)).toBe(10_000);
    expect(mir4NativeControlAdmissionBasisPoints(final)).toBe(1_000);
    expect(mir4NativeControlAdmissionBasisPoints(final, 100)).toBe(0);
  });

  it('preserves Body Check contact admission as the same native ten-percent control lane', () => {
    expect(mir4NativeRuntimeSuperState(1304, 130402)).toEqual({
      skillId: 1304,
      attackId: 130402,
      superIgnore: 100,
      superArmor: 0,
      actType: 0,
      ccUserCheck: 1_000,
      controlApplicationBasisPoints: 1_000,
      ccUserCheckRuntime: 'client-passed-unused',
    });
    expect(mir4NativeRuntimeSuperState(1304, 130401)).toBeNull();
    expect(mir4NativeSuperStateMatchesRow(row(1304, 130402))).toBe(true);
  });

  it('preserves Ground Smash CCUserCheck as inert metadata without inventing admission chance', () => {
    expect(mir4NativeExpectedSuperState(1401, 140102)).toMatchObject({
      skillId: 1401,
      attackId: 140102,
      superIgnore: 0,
      superArmor: 0,
      actType: 0,
      ccUserCheck: 1_000,
      runtimeAdmission: false,
    });
    expect(mir4NativeSuperStateMatchesRow(row(1401, 140102))).toBe(true);
    expect(mir4NativeRuntimeSuperState(1401, 140102)).toBeNull();
  });

  it('preserves Gale Slash row SuperArmor while its explicit buff owns runtime immunity', () => {
    for (const attackId of [150101, 150102, 150103, 150104, 150105]) {
      expect(mir4NativeExpectedSuperState(1501, attackId)).toMatchObject({
        skillId: 1501,
        attackId,
        superIgnore: 0,
        superArmor: 9_000,
        actType: 0,
        ccUserCheck: 0,
        runtimeAdmission: false,
      });
      expect(mir4NativeSuperStateMatchesRow(row(1501, attackId))).toBe(true);
      expect(mir4NativeRuntimeSuperState(1501, attackId)).toBeNull();
    }
  });

  it('projects active-row SuperArmor directly from the committed action timeline', () => {
    const sim = new Sim({
      seed: 15_020,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Super Armor Timeline QA',
      gameProfile: 'mir4-gameplay-port',
      world: EMPTY_TEST_WORLD,
    });
    placePlayerInOpenField(sim);
    sim.setPlayerLevel(120);
    sim.player.resource = 100_000;
    expect(castMir4Skill(sim.ctx, sim.playerId, 1502)).toEqual({ ok: true });
    expect(mir4ActiveSkillSuperArmorNative(sim.ctx, sim.player)).toBe(9_000);

    for (let tick = 0; tick < 3; tick += 1) sim.tick();
    expect(mir4ActiveSkillSuperArmorNative(sim.ctx, sim.player)).toBe(0);
  });

  it('fails closed when any recovered row field changes', () => {
    const exact = row(1103, 110107);
    expect(mir4NativeSuperStateMatchesRow(exact)).toBe(true);
    expect(
      mir4NativeSuperStateMatchesRow({
        ...exact,
        nativeBehavior: { ...exact.nativeBehavior, ccUserCheck: 0 },
      }),
    ).toBe(false);
  });
});
