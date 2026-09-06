import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import { mir4SkillById } from '../../src/sim/content/mir4/skills_runtime';
import {
  compileMir4NativeRuntimeSkillEffect,
  mir4NativeRuntimeSkillEffect,
} from '../../src/sim/mir4/native_skill_runtime_effect';

function cutterEvidence() {
  const action = mir4NativeDirectSkillActionEvidenceById(1104);
  const skill = mir4SkillById(1104);
  if (!action || !skill) throw new Error('Missing MIR4 skill 1104');
  return { action, skill };
}

function bodyCheckEvidence() {
  const action = mir4NativeDirectSkillActionEvidenceById(1304);
  const skill = mir4SkillById(1304);
  if (!action || !skill) throw new Error('Missing MIR4 skill 1304');
  return { action, skill };
}

function barbaricChargeEvidence() {
  const action = mir4NativeDirectSkillActionEvidenceById(1103);
  const skill = mir4SkillById(1103);
  if (!action || !skill) throw new Error('Missing MIR4 skill 1103');
  return { action, skill };
}

function groundSmashEvidence() {
  const action = mir4NativeDirectSkillActionEvidenceById(1401);
  const skill = mir4SkillById(1401);
  if (!action || !skill) throw new Error('Missing MIR4 skill 1401');
  return { action, skill };
}

describe('MIR4 native runtime skill-effect projection', () => {
  it('derives the exact 1103 final contact, actor circle, and control window', () => {
    const { action, skill } = barbaricChargeEvidence();

    expect(compileMir4NativeRuntimeSkillEffect(action, skill)).toEqual({
      ok: true,
      projection: {
        skillId: 1103,
        sourceAttackId: 110107,
        nativeTargetCap: 10,
        effect: {
          effect: 'knockdown',
          durationMs: 3_000,
        },
      },
    });
    expect(mir4NativeRuntimeSkillEffect(1103)).toMatchObject({
      sourceAttackId: 110107,
      nativeTargetCap: 10,
    });
  });

  it('derives the exact 1104 control window and forward target footprint', () => {
    const { action, skill } = cutterEvidence();

    expect(compileMir4NativeRuntimeSkillEffect(action, skill)).toEqual({
      ok: true,
      projection: {
        skillId: 1104,
        sourceAttackId: 110402,
        nativeTargetCap: 8,
        effect: {
          effect: 'knockdown',
          durationMs: 3_000,
          areaOrigin: 'actor',
          areaShape: 'frontal-strip',
          areaLengthPx: 112,
          areaWidthPx: 88,
          maxSecondaryTargets: 7,
          secondaryDamageBasisPoints: 10_000,
        },
      },
    });
    expect(mir4NativeRuntimeSkillEffect(1104)).toMatchObject({
      sourceAttackId: 110402,
      nativeTargetCap: 8,
    });
  });

  it('rejects changed runtime fields instead of silently broadening the policy', () => {
    const { action, skill } = cutterEvidence();
    const changed = {
      ...skill,
      effect: skill.effect ? { ...skill.effect, durationMs: 2_999 } : null,
    };

    expect(compileMir4NativeRuntimeSkillEffect(action, changed)).toEqual({
      ok: false,
      issues: [{ code: 'runtime-effect-mismatch', path: 'skill.effect' }],
    });
  });

  it('derives the exact 1304 charge, control window, and forward target footprint', () => {
    const { action, skill } = bodyCheckEvidence();

    expect(compileMir4NativeRuntimeSkillEffect(action, skill)).toEqual({
      ok: true,
      projection: {
        skillId: 1304,
        sourceAttackId: 130402,
        nativeTargetCap: 8,
        effect: {
          effect: 'knockdown',
          durationMs: 3_000,
          areaOrigin: 'actor',
          areaShape: 'frontal-strip',
          areaLengthPx: 128,
          areaWidthPx: 80,
          maxSecondaryTargets: 7,
          secondaryDamageBasisPoints: 10_000,
          chargeToTarget: true,
        },
      },
    });
    expect(mir4NativeRuntimeSkillEffect(1304)).toMatchObject({
      sourceAttackId: 130402,
      nativeTargetCap: 8,
    });
  });

  it('derives the shifted 1401 circle and its exact native control window', () => {
    const { action, skill } = groundSmashEvidence();

    expect(compileMir4NativeRuntimeSkillEffect(action, skill)).toEqual({
      ok: true,
      projection: {
        skillId: 1401,
        sourceAttackId: 140102,
        nativeTargetCap: 8,
        effect: {
          effect: 'knockdown',
          durationMs: 2_490,
        },
      },
    });
    expect(mir4NativeRuntimeSkillEffect(1401)).toMatchObject({
      sourceAttackId: 140102,
      nativeTargetCap: 8,
    });
  });

  it('rejects changed native geometry and keeps unrelated skills closed', () => {
    const { action, skill } = cutterEvidence();
    const changed = {
      ...action,
      rows: action.rows.map((row) =>
        row.attackId === 110402
          ? {
              ...row,
              geometry: { ...row.geometry, nativeWidth: row.geometry.nativeWidth + 1 },
            }
          : row,
      ),
    };

    expect(compileMir4NativeRuntimeSkillEffect(changed, skill)).toEqual({
      ok: false,
      issues: [{ code: 'native-effect-mismatch', path: 'action.rows[110402]' }],
    });
    expect(mir4NativeRuntimeSkillEffect(1102)).toBeNull();
  });

  it('removes the imported generic slow and minimum-target guess from Gale Slash', () => {
    const skill = mir4SkillById(1501);
    if (!skill) throw new Error('Missing MIR4 skill 1501');

    expect(skill.effect).toBeNull();
    expect(skill.minTargets).toBeNull();
    expect(mir4NativeRuntimeSkillEffect(1501)).toBeNull();
  });
});
