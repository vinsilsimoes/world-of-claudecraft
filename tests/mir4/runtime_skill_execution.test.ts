import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 live skill execution authority', () => {
  it('promotes warrior 1102 only through its fully reconciled immutable plan', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1102);

    expect(authority).not.toBeNull();
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(1102));
    expect(authority?.plan).toMatchObject({
      skillId: 1102,
      attackAnimationMs: 1500,
      endCutAnimationMs: 1300,
      sourceHitCount: 3,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([
      110201, 110202, 110203, 110204,
    ]);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Object.isFrozen(authority?.plan)).toBe(true);
  });

  it('promotes warrior 1103 only through its fully reconciled immutable plan', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1103);

    expect(authority?.action.skillId).toBe(1103);
    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(1103));
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1103,
      attackAnimationMs: 1667,
      endCutAnimationMs: 1500,
      sourceHitCount: 4,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([110105, 110106, 110107]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(2);
    expect(mir4SkillById(1103)?.hitCount).toBe(4);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Object.isFrozen(authority?.plan)).toBe(true);
  });

  it('reconciles the proven 1104 damage, Down02, and Smite facets', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1104);

    expect(authority?.plan).not.toBeNull();
    expect(authority?.issues).toEqual([]);
    const unresolvedPaths = authority?.issues.map((issue) => issue.path) ?? [];
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.primaryDamage');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.damageType');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.darkChange');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.abilities[3]');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.passiveIds');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.autoLearnPassiveIds');
    expect(unresolvedPaths).not.toContain('action.nativeBehavior.smiteBuffIds');
    expect(unresolvedPaths).not.toContain('skill.effect');
    expect(unresolvedPaths).not.toContain('action.rows[1].reaction');
  });

  it('promotes warrior 1304 only after reconciling its exact native super-state fields', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1304);

    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(1304));
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1304,
      attackAnimationMs: 1200,
      endCutAnimationMs: 1000,
      sourceHitCount: 1,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([130401, 130402]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
  });

  it('promotes warrior 1401 only through its shifted native circle and Down03 plan', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1401);

    expect(authority?.plan).toBe(mir4RuntimeSkillExecutionPlan(1401));
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 1401,
      attackAnimationMs: 1933,
      endCutAnimationMs: 1300,
      sourceHitCount: 1,
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([140101, 140102]);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
  });

  it('preserves native-only ultimate recovery without promoting it to an approved plan', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(1403);

    expect(authority?.action.skillId).toBe(1403);
    expect(authority?.plan).toBeNull();
    expect(authority?.issues).toEqual([
      {
        code: 'direct-evidence-not-runtime-approved',
        path: 'skill',
        actual: null,
      },
    ]);
  });

  it('returns no authority when either native action or runtime skill is absent', () => {
    expect(mir4RuntimeSkillExecutionAuthority(999_999)).toBeNull();
    expect(mir4RuntimeSkillExecutionPlan(999_999)).toBeNull();
  });
});
