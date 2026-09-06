import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  compileMir4NativeImpactType2CircleGeometry,
  mir4ImpactType2CircleIntersectsSphere,
  selectMir4NativeImpactType2CircleCandidates,
} from '../../src/sim/mir4/native_impact_type2_geometry';

function barbaricChargeRow(attackId: 110106 | 110107) {
  const row = mir4NativeDirectSkillActionEvidenceById(1103)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row) throw new Error(`Missing native Barbaric Charge row ${attackId}`);
  return row;
}

function groundSmashRow() {
  const row = mir4NativeDirectSkillActionEvidenceById(1401)?.rows.find(
    (candidate) => candidate.attackId === 140102,
  );
  if (!row) throw new Error('Missing native Ground Smash row 140102');
  return row;
}

describe('MIR4 native ImpactType 2 full-circle geometry', () => {
  it.each([110106, 110107] as const)(
    'compiles Barbaric Charge row %i as its exact actor-centered target volume',
    (attackId) => {
      expect(compileMir4NativeImpactType2CircleGeometry(barbaricChargeRow(attackId))).toEqual({
        attackId,
        radiusMinYards: 0,
        radiusMaxYards: 6,
        heightYards: 4,
        targetCap: 10,
        forwardOffsetYards: 0,
      });
    },
  );

  it('compiles Ground Smash as a five-yard circle shifted 1.5 yards forward', () => {
    expect(compileMir4NativeImpactType2CircleGeometry(groundSmashRow())).toEqual({
      attackId: 140102,
      radiusMinYards: 0,
      radiusMaxYards: 5,
      heightYards: 4,
      targetCap: 8,
      forwardOffsetYards: 1.5,
    });
  });

  it('expands the outer radius by the candidate body sphere', () => {
    const geometry = compileMir4NativeImpactType2CircleGeometry(barbaricChargeRow(110106));
    const actor = { x: 0, y: 0, z: 0 };

    expect(
      mir4ImpactType2CircleIntersectsSphere(geometry, actor, {
        x: 6.49,
        y: 0,
        z: 0,
        radiusYards: 0.5,
      }),
    ).toBe(true);
    expect(
      mir4ImpactType2CircleIntersectsSphere(geometry, actor, {
        x: 6.51,
        y: 0,
        z: 0,
        radiusYards: 0.5,
      }),
    ).toBe(false);
  });

  it('applies the native upward-height gate before the spherical radius test', () => {
    const geometry = compileMir4NativeImpactType2CircleGeometry(barbaricChargeRow(110106));
    const actor = { x: 0, y: 0, z: 0 };

    expect(
      mir4ImpactType2CircleIntersectsSphere(geometry, actor, {
        x: 0,
        y: 4.01,
        z: 0,
        radiusYards: 1,
      }),
    ).toBe(false);
  });

  it('preserves caller order, eligibility, and the native ten-target cap', () => {
    const geometry = compileMir4NativeImpactType2CircleGeometry(barbaricChargeRow(110107));
    const candidates = Array.from({ length: 14 }, (_, index) => ({
      id: index + 1,
      x: 1 + index * 0.05,
      y: 0,
      z: 0,
      radiusYards: 0.5,
      hostile: index !== 2,
    }));

    expect(
      selectMir4NativeImpactType2CircleCandidates(
        geometry,
        { x: 0, y: 0, z: 0 },
        candidates,
        (candidate) => candidate.hostile,
      ).map((candidate) => candidate.id),
    ).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('rejects a non-circle ImpactType 2 row instead of assigning guessed cone semantics', () => {
    const row = barbaricChargeRow(110106);
    expect(() =>
      compileMir4NativeImpactType2CircleGeometry({
        ...row,
        geometry: { ...row.geometry, angleDegrees: 180 },
      }),
    ).toThrow('must use a 360-degree native circle');
  });
});
