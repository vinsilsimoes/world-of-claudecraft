import { describe, expect, it } from 'vitest';
import { localWaterSurfaceData } from '../src/render/local_water_surface_core';
import { M02_TRILHA_DOS_JUNCOS_BLUEPRINT } from '../src/sim/content/mir4/m02_trilha_dos_juncos_world';
import { LAKE_BLEND_RADIUS_MULT } from '../src/sim/world';

describe('local custom-world water surface', () => {
  it('merges overlapping lake footprints and cuts both authored causeways dry', () => {
    const bodies = M02_TRILHA_DOS_JUNCOS_BLUEPRINT.lakes.map((lake) => ({
      ...lake,
      radius: lake.radius * LAKE_BLEND_RADIUS_MULT,
    }));
    const crossings = M02_TRILHA_DOS_JUNCOS_BLUEPRINT.dryCrossings;
    const surface = localWaterSurfaceData(bodies, crossings, 2);

    expect(surface.triangleCount).toBeGreaterThan(1_000);
    expect(surface.positions).toHaveLength(surface.triangleCount * 9);
    expect(surface.normals).toHaveLength(surface.triangleCount * 9);
    expect(surface.uvs).toHaveLength(surface.triangleCount * 6);

    for (let offset = 0; offset < surface.positions.length; offset += 9) {
      const vertices = [0, 3, 6].map((vertexOffset) => ({
        x: surface.positions[offset + vertexOffset],
        z: surface.positions[offset + vertexOffset + 2],
      }));
      const samples = [
        ...vertices,
        {
          x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
          z: (vertices[0].z + vertices[1].z + vertices[2].z) / 3,
        },
      ];
      for (const crossing of crossings) {
        for (const sample of samples) {
          expect(Math.hypot(sample.x - crossing.x, sample.z - crossing.z)).toBeGreaterThanOrEqual(
            crossing.radius,
          );
        }
      }
    }
  });

  it('fails closed for empty water or an invalid cell size', () => {
    expect(localWaterSurfaceData([], [], 2).triangleCount).toBe(0);
    expect(localWaterSurfaceData([{ x: 0, z: 0, radius: 4 }], [], 0).triangleCount).toBe(0);
  });
});
