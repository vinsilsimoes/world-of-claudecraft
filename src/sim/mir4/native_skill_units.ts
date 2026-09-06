/**
 * Explicit Aeldrune homologation scale for MIR4 skill-space coordinates.
 *
 * This is a tested gameplay policy backed by the native radius/range ratios;
 * it does not claim that the source coordinate is a real-world centimetre.
 */
export const MIR4_NATIVE_UNITS_PER_YARD = 100;

/** Preserve the authored sign because negative movement ranges are meaningful evidence. */
export function mir4NativeDistanceToYards(nativeUnits: number): number {
  return nativeUnits / MIR4_NATIVE_UNITS_PER_YARD;
}
