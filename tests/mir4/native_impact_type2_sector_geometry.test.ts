import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import {
  compileMir4NativeImpactType2SectorGeometry,
  mir4ImpactType2SectorIntersectsSphere,
  selectMir4NativeImpactType2SectorCandidates,
} from '../../src/sim/mir4/native_impact_type2_sector_geometry';

function row(attackId: number) {
  const action = mir4NativeDirectSkillActionEvidenceById(4113);
  const value = action?.rows.find((candidate) => candidate.attackId === attackId);
  if (!value) throw new Error(`missing Arrow Rain row ${attackId}`);
  return value;
}

function crescentRow(attackId: 510101 | 510102) {
  const action = mir4NativeDirectSkillActionEvidenceById(5101);
  const value = action?.rows.find((candidate) => candidate.attackId === attackId);
  if (!value) throw new Error(`missing Crescent Blade row ${attackId}`);
  return value;
}

describe('MIR4 native angled ImpactType 2 geometry', () => {
  it('compiles the five widening Arrow Rain sectors from direct evidence', () => {
    expect(
      [411302, 411303, 411304, 411305, 411306].map((attackId) => {
        const geometry = compileMir4NativeImpactType2SectorGeometry(row(attackId));
        return [
          geometry.attackId,
          geometry.angleDegrees,
          geometry.radiusMaxYards,
          geometry.heightYards,
          geometry.targetCap,
        ];
      }),
    ).toEqual([
      [411302, 55, 21, 4, 10],
      [411303, 65, 22, 4, 10],
      [411304, 80, 23, 4, 10],
      [411305, 100, 24, 4, 10],
      [411306, 120, 25, 4, 10],
    ]);
  });

  it('admits forward body spheres, expands by body radius, and rejects behind targets', () => {
    const geometry = compileMir4NativeImpactType2SectorGeometry(row(411302));
    const origin = { x: 0, y: 0, z: 0, facing: 0 };
    const atDegrees = (degrees: number, distance: number, radiusYards = 0) => ({
      x: Math.sin((degrees * Math.PI) / 180) * distance,
      y: 0,
      z: Math.cos((degrees * Math.PI) / 180) * distance,
      radiusYards,
    });

    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(0, 20))).toBe(true);
    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(27.5, 20))).toBe(true);
    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(30, 20))).toBe(false);
    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(30, 20, 1))).toBe(
      true,
    );
    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(180, 1))).toBe(false);
    expect(mir4ImpactType2SectorIntersectsSphere(geometry, origin, atDegrees(0, 21.6, 0.5))).toBe(
      false,
    );
  });

  it('honors vertical rejection, rotation and deterministic TargetValue order', () => {
    const geometry = compileMir4NativeImpactType2SectorGeometry(row(411306));
    const origin = { x: 0, y: 0, z: 0, facing: Math.PI / 2 };
    expect(
      mir4ImpactType2SectorIntersectsSphere(geometry, origin, {
        x: 10,
        y: 4.1,
        z: 0,
        radiusYards: 0,
      }),
    ).toBe(false);

    const candidates = Array.from({ length: 12 }, (_, id) => ({
      id,
      x: 5 + id * 0.1,
      y: 0,
      z: 0,
      radiusYards: 0.5,
    }));
    expect(
      selectMir4NativeImpactType2SectorCandidates(
        geometry,
        origin,
        candidates,
        (candidate) => candidate.id !== 1,
      ).map((candidate) => candidate.id),
    ).toEqual([0, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('preserves and applies Crescent Blade negative one-yard forward offset', () => {
    const geometry = compileMir4NativeImpactType2SectorGeometry(crescentRow(510101));
    const origin = { x: 0, y: 0, z: 0, facing: 0 };
    expect(geometry).toMatchObject({
      angleDegrees: 160,
      radiusMaxYards: 7,
      heightYards: 5,
      targetCap: 8,
      forwardOffsetYards: -1,
    });
    expect(
      mir4ImpactType2SectorIntersectsSphere(geometry, origin, {
        x: 0,
        y: 0,
        z: 5.9,
        radiusYards: 0.5,
      }),
    ).toBe(true);
    expect(
      mir4ImpactType2SectorIntersectsSphere(geometry, origin, {
        x: 0,
        y: 0,
        z: 6.6,
        radiusYards: 0.5,
      }),
    ).toBe(false);
  });
});
