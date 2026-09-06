import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  mir4NativeInertReactionMatchesRow,
  mir4NativeRuntimeInertReaction,
} from '../../src/sim/mir4/native_skill_inert_reaction';

function barbaricChargeSetupRow() {
  const row = mir4NativeDirectSkillActionEvidenceById(1103)?.rows.find(
    (candidate) => candidate.attackId === 110105,
  );
  if (!row) throw new Error('Missing native Barbaric Charge setup row');
  return row;
}

describe('MIR4 native inert hit-reaction metadata', () => {
  it('preserves the 1103 setup probability without creating a runtime reaction', () => {
    expect(mir4NativeRuntimeInertReaction(1103, 110105)).toEqual({
      skillId: 1103,
      attackId: 110105,
      probabilityPercent: 100,
      active: false,
      inactiveReason: 'zero-kind',
    });
  });

  it('treats reviewed Sorcerer projectile setup rows as inert despite probability metadata', () => {
    for (const [skillId, attackId] of [
      [2101, 210101],
      [2111, 211101],
    ] as const) {
      expect(mir4NativeRuntimeInertReaction(skillId, attackId)).toEqual({
        skillId,
        attackId,
        probabilityPercent: 100,
        active: false,
        inactiveReason: 'zero-kind',
      });
    }
  });

  it('matches only the exact zero-discriminator tuple', () => {
    const policy = mir4NativeRuntimeInertReaction(1103, 110105);
    const row = barbaricChargeSetupRow();
    if (!policy) throw new Error('Missing inert reaction policy');

    expect(mir4NativeInertReactionMatchesRow(row, policy)).toBe(true);
    expect(
      mir4NativeInertReactionMatchesRow(
        {
          ...row,
          reaction: { ...row.reaction, probabilityPercent: 99 },
        },
        policy,
      ),
    ).toBe(false);
  });

  it('does not suppress the real push or knock-down rows', () => {
    expect(mir4NativeRuntimeInertReaction(1103, 110106)).toBeNull();
    expect(mir4NativeRuntimeInertReaction(1103, 110107)).toBeNull();
    expect(mir4NativeRuntimeInertReaction(1102, 110201)).toBeNull();
    expect(mir4NativeRuntimeInertReaction(2101, 210102)).toBeNull();
    expect(mir4NativeRuntimeInertReaction(2111, 211102)).toBeNull();
  });
});
