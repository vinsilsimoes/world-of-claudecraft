// Deterministic custom-world water meshing. Authored lakes may overlap and
// may contain dry causeways; one grid produces one draw surface without
// stacked discs, z-fighting, or a water sheet painted over physical ground.

export interface LocalWaterCircle {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export interface LocalWaterSurfaceData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly triangleCount: number;
}

function insideCircle(x: number, z: number, circle: LocalWaterCircle): boolean {
  const dx = x - circle.x;
  const dz = z - circle.z;
  return dx * dx + dz * dz < circle.radius * circle.radius;
}

/** Builds one non-indexed, upward-facing surface over the union of all water
 * circles. A triangle touching a dry crossing is omitted in full so the
 * visual shoreline never lies on top of the authoritative walkable causeway. */
export function localWaterSurfaceData(
  bodies: readonly LocalWaterCircle[],
  dryCrossings: readonly LocalWaterCircle[],
  cellSize = 2,
): LocalWaterSurfaceData {
  if (bodies.length === 0 || !(cellSize > 0)) {
    return {
      positions: new Float32Array(),
      normals: new Float32Array(),
      uvs: new Float32Array(),
      triangleCount: 0,
    };
  }
  const minX = Math.floor(Math.min(...bodies.map((body) => body.x - body.radius)) / cellSize);
  const maxX = Math.ceil(Math.max(...bodies.map((body) => body.x + body.radius)) / cellSize);
  const minZ = Math.floor(Math.min(...bodies.map((body) => body.z - body.radius)) / cellSize);
  const maxZ = Math.ceil(Math.max(...bodies.map((body) => body.z + body.radius)) / cellSize);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const inWater = (x: number, z: number): boolean =>
    bodies.some((body) => insideCircle(x, z, body));
  const inDryCrossing = (x: number, z: number): boolean =>
    dryCrossings.some((crossing) => insideCircle(x, z, crossing));
  const addTriangle = (triangle: readonly (readonly [number, number])[]): void => {
    const centerX = (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3;
    const centerZ = (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3;
    if (!inWater(centerX, centerZ)) return;
    if (inDryCrossing(centerX, centerZ)) return;
    if (triangle.some(([x, z]) => inDryCrossing(x, z))) return;
    for (const [x, z] of triangle) {
      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(x / 16, z / 16);
    }
  };
  for (let cellX = minX; cellX < maxX; cellX++) {
    const x0 = cellX * cellSize;
    const x1 = x0 + cellSize;
    for (let cellZ = minZ; cellZ < maxZ; cellZ++) {
      const z0 = cellZ * cellSize;
      const z1 = z0 + cellSize;
      addTriangle([
        [x0, z0],
        [x1, z1],
        [x1, z0],
      ]);
      addTriangle([
        [x0, z0],
        [x0, z1],
        [x1, z1],
      ]);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    triangleCount: positions.length / 9,
  };
}
