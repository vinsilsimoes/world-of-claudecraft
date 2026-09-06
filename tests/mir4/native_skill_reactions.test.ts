import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import {
  mir4NativeServerCrowdControlMoveUnits,
  mir4NativeServerCrowdControlWindowMs,
} from '../../src/sim/mir4/native_skill_reactions';

function nativeRow(skillId: number, attackId: number) {
  const row = mir4NativeSkillActionById(skillId)?.rows.find((entry) => entry.attackId === attackId);
  if (!row) throw new Error(`Missing native MIR4 attack row ${attackId}`);
  return row;
}

describe('MIR4 native server crowd-control consumption', () => {
  it('adds ValueEx to CrowdControlTime instead of subtracting it', () => {
    expect(mir4NativeServerCrowdControlWindowMs(nativeRow(1103, 110107))).toBe(3000);
    expect(mir4NativeServerCrowdControlWindowMs(nativeRow(1104, 110402))).toBe(3000);
    expect(mir4NativeServerCrowdControlWindowMs(nativeRow(1403, 140302))).toBe(700);
  });

  it('multiplies the collapsed window and movement value by row impact cardinality', () => {
    const twoImpactRow = nativeRow(1403, 140303);
    expect(twoImpactRow.impactOffsetsMs).toHaveLength(2);
    expect(mir4NativeServerCrowdControlWindowMs(twoImpactRow)).toBe(1000);
    expect(mir4NativeServerCrowdControlMoveUnits(twoImpactRow)).toBe(120);
  });
});
