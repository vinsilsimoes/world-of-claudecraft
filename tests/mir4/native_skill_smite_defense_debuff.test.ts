import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4DefenseMultiplier } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeSkillSmiteDefenseDebuff,
  compileMir4NativeSkillSmiteDefenseDebuff,
  MIR4_NATIVE_1501_SMITE_EVIDENCE,
  mir4NativeRuntimeSmiteDefenseDebuff,
} from '../../src/sim/mir4/native_skill_smite_defense_debuff';
import type { Entity } from '../../src/sim/types';

describe('MIR4 Warrior 1501 native Smite defense debuff', () => {
  it('compiles the exact 101002 -> BUFF 10020 chain', () => {
    const action = mir4NativeSkillActionById(1501);
    if (!action) throw new Error('Missing native 1501 action');

    expect(MIR4_NATIVE_1501_SMITE_EVIDENCE.skillCostRows).toHaveLength(10);
    expect(compileMir4NativeSkillSmiteDefenseDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 1501,
        contactAttackIds: [150101, 150102, 150103, 150104, 150105],
        passiveId: 101002,
        buffId: 10020,
        effectId: 'mir4_native_buff_10020',
        kind: 'physical-defense-reduction',
        durationMs: 5_000,
        magnitude: 0.25,
        probabilityBasisPoints: 10_000,
      },
    });
  });

  it('admits every native damage row, but no neighboring attack ID', () => {
    for (const attackId of [150101, 150102, 150103, 150104, 150105]) {
      expect(mir4NativeRuntimeSmiteDefenseDebuff(1501, attackId, 1)).toMatchObject({
        skillId: 1501,
        buffId: 10020,
      });
    }
    expect(mir4NativeRuntimeSmiteDefenseDebuff(1501, 150106, 1)).toBeNull();
    expect(mir4NativeRuntimeSmiteDefenseDebuff(1104, 110402, 1)).toBeNull();
  });

  it('refreshes one BuffId and reduces physical defense only', () => {
    const target = {
      id: 200,
      dead: false,
      auras: [],
      mir4Effects: undefined,
    } as unknown as Entity;
    const source = { id: 100 } as Entity;
    const spec = mir4NativeRuntimeSmiteDefenseDebuff(1501, 150101, 1);
    if (!spec) throw new Error('Missing native 1501 Confuse spec');
    const ctx = {
      time: 0,
      entities: new Map([
        [source.id, source],
        [target.id, target],
      ]),
      applyAura() {},
    } as unknown as Parameters<typeof applyMir4NativeSkillSmiteDefenseDebuff>[0];

    expect(applyMir4NativeSkillSmiteDefenseDebuff(ctx, source, target, spec)).toBe(true);
    expect(mir4DefenseMultiplier(target, 'physical')).toBeCloseTo(0.75, 10);
    expect(mir4DefenseMultiplier(target, 'magic')).toBe(1);
    const effect = target.mir4Effects?.active[0];
    if (!effect) throw new Error('Missing applied native 10020 effect');
    effect.remaining = 1;
    expect(applyMir4NativeSkillSmiteDefenseDebuff(ctx, source, target, spec)).toBe(true);
    expect(target.mir4Effects?.active).toHaveLength(1);
    expect(target.mir4Effects?.active[0]?.remaining).toBe(5);
  });
});
