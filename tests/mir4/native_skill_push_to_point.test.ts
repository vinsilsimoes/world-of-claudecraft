import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4NativePushToPointDestination,
  mir4NativePushToPointReactionMatchesRow,
  mir4NativeRuntimePushToPointReaction,
} from '../../src/sim/mir4/native_skill_push_to_point';

function nativeRow(skillId: number, attackId: number) {
  const row = mir4NativeSkillActionById(skillId)?.rows.find((entry) => entry.attackId === attackId);
  if (!row) throw new Error(`Missing native MIR4 attack row ${attackId}`);
  return row;
}

describe('MIR4 native PushToPoint reaction', () => {
  it('admits only the exact Warrior 1103 first damage contact', () => {
    expect(mir4NativeRuntimePushToPointReaction(1103, 110105)).toBeNull();
    expect(mir4NativeRuntimePushToPointReaction(1103, 110106)).toEqual({
      kind: 'push-to-point',
      stance: 'hit-01',
      durationMs: 200,
      moveDurationMs: 100,
      anchorOffsetYards: 1,
      heightYards: 0,
    });
    expect(mir4NativeRuntimePushToPointReaction(1103, 110107)).toBeNull();
  });

  it('admits Iron Shackle row 120102 as its exact two-yard Stun01 pull', () => {
    expect(mir4NativeRuntimePushToPointReaction(1201, 120101)).toBeNull();
    expect(mir4NativeRuntimePushToPointReaction(1201, 120102)).toEqual({
      kind: 'push-to-point',
      stance: 'stun-01',
      durationMs: 600,
      moveDurationMs: 300,
      anchorOffsetYards: 2,
      heightYards: 0,
    });
    expect(mir4NativeRuntimePushToPointReaction(1201, 120103)).toBeNull();
  });

  it('admits Dragon Flame row 140302 as its exact five-yard Hit01 anchor', () => {
    expect(mir4NativeRuntimePushToPointReaction(1403, 140301)).toBeNull();
    expect(mir4NativeRuntimePushToPointReaction(1403, 140302)).toEqual({
      kind: 'push-to-point',
      stance: 'hit-01',
      durationMs: 700,
      moveDurationMs: 200,
      anchorOffsetYards: 5,
      heightYards: 0,
    });
    expect(mir4NativeRuntimePushToPointReaction(1403, 140303)).toBeNull();
  });

  it('fails closed when any recovered reaction field drifts', () => {
    const row = nativeRow(1103, 110106);
    expect(mir4NativePushToPointReactionMatchesRow(row)).toBe(true);
    expect(
      mir4NativePushToPointReactionMatchesRow({
        ...row,
        reaction: { ...row.reaction, value: row.reaction.value + 1 },
      }),
    ).toBe(false);
    expect(
      mir4NativePushToPointReactionMatchesRow({
        ...row,
        reaction: { ...row.reaction, durationMs: row.reaction.durationMs + 1 },
      }),
    ).toBe(false);
  });

  it('places the target one yard from the source along their original ray', () => {
    expect(
      mir4NativePushToPointDestination({ x: 10, z: 20, facing: 0 }, { x: 13, z: 24 }, 1),
    ).toEqual({ x: 10.6, z: 20.8 });
  });

  it('uses source facing when source and target occupy the same point', () => {
    const destination = mir4NativePushToPointDestination(
      { x: 10, z: 20, facing: Math.PI / 2 },
      { x: 10, z: 20 },
      1,
    );
    expect(destination.x).toBeCloseTo(11, 8);
    expect(destination.z).toBeCloseTo(20, 8);
  });
});
