import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4NativeKnockbackReactionMatchesRow,
  mir4NativeRuntimeKnockbackReaction,
} from '../../src/sim/mir4/native_skill_knockback';

function nativeRow(skillId: number, attackId: number) {
  const row = mir4NativeSkillActionById(skillId)?.rows.find((entry) => entry.attackId === attackId);
  if (!row) throw new Error(`Missing native MIR4 attack row ${attackId}`);
  return row;
}

describe('MIR4 native knock-back reaction', () => {
  it('admits Iron Shackle row 120101 as its exact short outward reaction', () => {
    expect(mir4NativeRuntimeKnockbackReaction(1201, 120101)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 250,
      moveDurationMs: 100,
      moveDistanceYards: 0.1,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
  });

  it('admits the two exact Warrior 1501 rows and preserves the server row aggregation', () => {
    expect(mir4NativeRuntimeKnockbackReaction(1501, 150102)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 400,
      moveDurationMs: 200,
      moveDistanceYards: 0.8,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(1501, 150104)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 200,
      moveDurationMs: 100,
      moveDistanceYards: 0.2,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
  });

  it('admits Dragon Flame row 140303 as one aggregated two-contact knock-back', () => {
    expect(mir4NativeRuntimeKnockbackReaction(1403, 140303)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 1_000,
      moveDurationMs: 200,
      moveDistanceYards: 1.2,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(1403, 140302)).toBeNull();
    expect(mir4NativeRuntimeKnockbackReaction(1403, 140304)).toBeNull();
  });

  it('admits the exact Sorcerer knock-back rows without sharing their distinct distances', () => {
    expect(mir4NativeRuntimeKnockbackReaction(2101, 210102)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 100,
      moveDurationMs: 0,
      moveDistanceYards: 0.1,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(2503, 250301)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 300,
      moveDurationMs: 200,
      moveDistanceYards: 2,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(2503, 250302)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 300,
      moveDurationMs: 200,
      moveDistanceYards: 1.5,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(2503, 250303)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 400,
      moveDurationMs: 200,
      moveDistanceYards: 1.5,
      heightYards: 0,
      displacementDirection: 'radial',
      triggerSourceImpactIndex: 0,
    });
  });

  it('preserves Sunbeam Sword direction-1 pushes along the source facing', () => {
    expect(mir4NativeRuntimeKnockbackReaction(3101, 310101)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 200,
      moveDurationMs: 100,
      moveDistanceYards: 1,
      heightYards: 0,
      displacementDirection: 'source-facing',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(3101, 310103)).toEqual({
      kind: 'knock-back',
      stance: 'hit-01',
      durationMs: 400,
      moveDurationMs: 200,
      moveDistanceYards: 0.4,
      heightYards: 0,
      displacementDirection: 'source-facing',
      triggerSourceImpactIndex: 0,
    });
    expect(mir4NativeRuntimeKnockbackReaction(3101, 310102)).toBeNull();
    expect(mir4NativeRuntimeKnockbackReaction(3101, 310104)).toBeNull();
  });

  it('does not admit neighboring hit rows or another skill', () => {
    expect(mir4NativeRuntimeKnockbackReaction(1501, 150101)).toBeNull();
    expect(mir4NativeRuntimeKnockbackReaction(1501, 150103)).toBeNull();
    expect(mir4NativeRuntimeKnockbackReaction(1501, 150105)).toBeNull();
    expect(mir4NativeRuntimeKnockbackReaction(1103, 110106)).toBeNull();
  });

  it('fails closed when any recovered row field drifts', () => {
    const row = nativeRow(1501, 150102);
    expect(mir4NativeKnockbackReactionMatchesRow(row)).toBe(true);
    expect(
      mir4NativeKnockbackReactionMatchesRow({
        ...row,
        reaction: { ...row.reaction, value: row.reaction.value + 1 },
      }),
    ).toBe(false);
    expect(
      mir4NativeKnockbackReactionMatchesRow({
        ...row,
        impactOffsetsMs: row.impactOffsetsMs.slice(0, 1),
      }),
    ).toBe(false);
  });
});
