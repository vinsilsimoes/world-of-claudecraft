interface TarnRamp {
  readonly ax: number;
  readonly az: number;
  readonly ah: number;
  readonly bx: number;
  readonly bz: number;
  readonly bh: number;
  readonly wIn: number;
  readonly wOut: number;
}

export const GLACIER_TARN_RIM_SWITCHBACK = {
  ax: 32,
  az: 1641.6,
  ah: 3,
  bx: 24,
  bz: 1648,
  bh: 12,
  wIn: 3,
  wOut: 7,
} as const satisfies TarnRamp;

export const GLACIER_TARN_ICEMANTLE_RAMP = {
  ax: 34,
  az: 1640,
  ah: 3,
  bx: 42,
  bz: 1626,
  bh: 7,
  wIn: 3,
  wOut: 6,
} as const satisfies TarnRamp;

export const GLACIER_TARN_ICEMANTLE_APPROACH = {
  ax: 42,
  az: 1626,
  ah: 7,
  bx: 10,
  bz: 1600,
  bh: 9.5,
  wIn: 4,
  wOut: 9,
} as const satisfies TarnRamp;

interface RampBounds {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

function bounds(ramp: TarnRamp): RampBounds {
  return {
    x0: Math.min(ramp.ax, ramp.bx) - ramp.wOut,
    x1: Math.max(ramp.ax, ramp.bx) + ramp.wOut,
    z0: Math.min(ramp.az, ramp.bz) - ramp.wOut,
    z1: Math.max(ramp.az, ramp.bz) + ramp.wOut,
  };
}

const TARN_RIM_SWITCHBACK_BOUNDS = bounds(GLACIER_TARN_RIM_SWITCHBACK);
const TARN_ICEMANTLE_RAMP_BOUNDS = bounds(GLACIER_TARN_ICEMANTLE_RAMP);
const TARN_ICEMANTLE_APPROACH_BOUNDS = bounds(GLACIER_TARN_ICEMANTLE_APPROACH);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function applyRamp(
  x: number,
  z: number,
  height: number,
  ramp: TarnRamp,
  rampBounds: RampBounds,
  admits: (x: number, z: number, ramp: TarnRamp) => boolean = () => true,
): number {
  if (
    x < rampBounds.x0 ||
    x > rampBounds.x1 ||
    z < rampBounds.z0 ||
    z > rampBounds.z1 ||
    !admits(x, z, ramp)
  ) {
    return height;
  }
  const dx = ramp.bx - ramp.ax;
  const dz = ramp.bz - ramp.az;
  const t = Math.max(
    0,
    Math.min(1, ((x - ramp.ax) * dx + (z - ramp.az) * dz) / (dx * dx + dz * dz)),
  );
  const distance = Math.hypot(x - (ramp.ax + dx * t), z - (ramp.az + dz * t));
  if (distance >= ramp.wOut) return height;
  const natural = smoothstep(ramp.wIn, ramp.wOut, distance);
  const target = ramp.ah + (ramp.bh - ramp.ah) * t;
  return height * natural + target * (1 - natural);
}

function applyApproach(x: number, z: number, height: number): number {
  const ramp = GLACIER_TARN_ICEMANTLE_APPROACH;
  const b = TARN_ICEMANTLE_APPROACH_BOUNDS;
  if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return height;
  const dx = ramp.bx - ramp.ax;
  const dz = ramp.bz - ramp.az;
  const rawT = ((x - ramp.ax) * dx + (z - ramp.az) * dz) / (dx * dx + dz * dz);
  if (rawT < 0) return height;
  const t = Math.min(1, rawT);
  const distance = Math.hypot(x - (ramp.ax + dx * t), z - (ramp.az + dz * t));
  if (distance >= ramp.wOut) return height;
  const natural = smoothstep(ramp.wIn, ramp.wOut, distance);
  const target = ramp.ah + (ramp.bh - ramp.ah) * t;
  return height * natural + target * (1 - natural);
}

/** Applies the authored continuations from the original Tarn shore ramp. */
export function applyGlacierTarnExtensions(x: number, z: number, height: number): number {
  let out = applyRamp(
    x,
    z,
    height,
    GLACIER_TARN_RIM_SWITCHBACK,
    TARN_RIM_SWITCHBACK_BOUNDS,
    (px, _pz, ramp) => px <= ramp.ax,
  );
  out = applyRamp(
    x,
    z,
    out,
    GLACIER_TARN_ICEMANTLE_RAMP,
    TARN_ICEMANTLE_RAMP_BOUNDS,
    (px, pz, ramp) => px >= ramp.ax && pz <= ramp.az - (px - ramp.ax) * 0.5,
  );
  return applyApproach(x, z, out);
}
