import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  compileMir4NativeImpactType3Geometry,
  mir4ImpactType3IntersectsCircle,
  selectMir4NativeImpactType3Candidates,
} from '../../src/sim/mir4/native_impact_type3_geometry';

function warrior1102Rows() {
  const action = mir4NativeDirectSkillActionEvidenceById(1102);
  if (!action) throw new Error('sealed native action 1102 is missing');
  return action.rows;
}

function warrior1102FirstDamageRow() {
  const row = warrior1102Rows().find((candidate) => candidate.attackId === 110202);
  if (!row) throw new Error('sealed native attack 110202 is missing');
  return row;
}

function taoist3101Rows() {
  const action = mir4NativeDirectSkillActionEvidenceById(3101);
  if (!action) throw new Error('sealed native action 3101 is missing');
  return action.rows;
}

describe('MIR4 native ImpactType 3 directional geometry', () => {
  it('compiles the exact 1102 setup and expanding contact rectangles', () => {
    expect(warrior1102Rows().map(compileMir4NativeImpactType3Geometry)).toEqual([
      {
        attackId: 110201,
        lengthYards: 8.5,
        widthYards: 5,
        heightYards: 4,
        targetCap: 8,
      },
      {
        attackId: 110202,
        lengthYards: 4.5,
        widthYards: 5,
        heightYards: 4,
        targetCap: 8,
      },
      {
        attackId: 110203,
        lengthYards: 6.5,
        widthYards: 5,
        heightYards: 4,
        targetCap: 8,
      },
      {
        attackId: 110204,
        lengthYards: 8.5,
        widthYards: 5,
        heightYards: 4,
        targetCap: 8,
      },
    ]);
  });

  it('compiles all four Sunbeam Sword rows as the same 8-by-5-yard capped strip', () => {
    expect(taoist3101Rows().map(compileMir4NativeImpactType3Geometry)).toEqual(
      [310101, 310102, 310103, 310104].map((attackId) => ({
        attackId,
        lengthYards: 8,
        widthYards: 5,
        heightYards: 4,
        targetCap: 8,
      })),
    );
  });

  it('uses a forward rectangle expanded only by the candidate circle radius', () => {
    const geometry = compileMir4NativeImpactType3Geometry(warrior1102FirstDamageRow());
    const actor = { x: 0, z: 0, facingRadians: 0 };

    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, { x: 0, z: 4.9, radiusYards: 0.5 }),
    ).toBe(true);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, { x: 2.9, z: 2, radiusYards: 0.5 }),
    ).toBe(true);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, { x: 2.8, z: 4.8, radiusYards: 0.5 }),
    ).toBe(true);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, { x: 2.9, z: 4.9, radiusYards: 0.5 }),
    ).toBe(false);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, { x: 0, z: -0.5, radiusYards: 0.5 }),
    ).toBe(true);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, {
        x: 0,
        z: -0.500_001,
        radiusYards: 0.5,
      }),
    ).toBe(false);
  });

  it('rotates the rectangle with the actor instead of using world axes', () => {
    const geometry = compileMir4NativeImpactType3Geometry(warrior1102FirstDamageRow());
    const actor = { x: 10, z: -4, facingRadians: Math.PI / 2 };

    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, {
        x: 14.9,
        z: -4,
        radiusYards: 0.5,
      }),
    ).toBe(true);
    expect(
      mir4ImpactType3IntersectsCircle(geometry, actor, {
        x: 10,
        z: 0.9,
        radiusYards: 0.5,
      }),
    ).toBe(false);
  });

  it('fails closed for a different impact type or invalid spatial evidence', () => {
    const source = warrior1102FirstDamageRow();

    expect(() => compileMir4NativeImpactType3Geometry({ ...source, impactType: 2 })).toThrow(
      'ImpactType 3',
    );
    expect(() =>
      compileMir4NativeImpactType3Geometry({
        ...source,
        geometry: { ...source.geometry, nativeWidth: -1 },
      }),
    ).toThrow('finite non-negative');
    expect(() =>
      mir4ImpactType3IntersectsCircle(
        compileMir4NativeImpactType3Geometry(source),
        { x: 0, z: 0, facingRadians: 0 },
        { x: 0, z: 1, radiusYards: -0.1 },
      ),
    ).toThrow('finite non-negative');
  });

  it('rebuilds an insertion-order target list at each contact and applies the native cap', () => {
    const geometry = compileMir4NativeImpactType3Geometry(warrior1102FirstDamageRow());
    const actor = { x: 0, y: 3, z: 0, facingRadians: 0 };
    const candidates = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      x: index === 9 ? 20 : 0,
      y: index === 10 ? 7.001 : 3,
      z: 1 + index * 0.1,
      radiusYards: 0.5,
      eligible: index !== 1,
    }));

    expect(
      selectMir4NativeImpactType3Candidates(
        geometry,
        actor,
        candidates,
        (candidate) => candidate.eligible,
      ).map((candidate) => candidate.id),
    ).toEqual([1, 3, 4, 5, 6, 7, 8, 9]);

    const moved = candidates.map((candidate) =>
      candidate.id === 1 ? { ...candidate, z: 12 } : candidate,
    );
    expect(
      selectMir4NativeImpactType3Candidates(
        geometry,
        actor,
        moved,
        (candidate) => candidate.eligible,
      ).map((candidate) => candidate.id),
    ).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('treats target cap zero as unlimited, matching the native sentinel', () => {
    const source = compileMir4NativeImpactType3Geometry(warrior1102FirstDamageRow());
    const geometry = { ...source, targetCap: 0 };
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      x: 0,
      y: 0,
      z: 1,
      radiusYards: 0,
    }));

    expect(
      selectMir4NativeImpactType3Candidates(
        geometry,
        { x: 0, y: 0, z: 0, facingRadians: 0 },
        candidates,
        () => true,
      ),
    ).toHaveLength(12);
  });

  it('uses one 3D body-sphere distance at a raised rectangle edge', () => {
    const geometry = compileMir4NativeImpactType3Geometry(warrior1102FirstDamageRow());
    const candidates = [
      { id: 1, x: 2.9, y: 0.3, z: 2, radiusYards: 0.5 },
      { id: 2, x: 2.9, y: 0.4, z: 2, radiusYards: 0.5 },
    ];

    expect(
      selectMir4NativeImpactType3Candidates(
        geometry,
        { x: 0, y: 0, z: 0, facingRadians: 0 },
        candidates,
        () => true,
      ).map((candidate) => candidate.id),
    ).toEqual([1]);
  });
});
