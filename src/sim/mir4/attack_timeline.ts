// Pure MIR4 timing for basic attacks and ultimates. Ordinary skills preserve
// the port's original immediate resolution and use their existing VFX gesture.

const SINGLE_CONTACT_FRACTION = 0.625;
const FIRST_MULTI_CONTACT_FRACTION = 0.3;
const LAST_MULTI_CONTACT_FRACTION = 0.8;

export function mir4ContactOffsetsMs(animationMs: number, impactCount: number): number[] {
  const duration = Math.max(1, Math.round(animationMs));
  const count = Math.max(1, Math.floor(impactCount));
  if (count === 1) return [Math.round(duration * SINGLE_CONTACT_FRACTION)];

  const first = duration * FIRST_MULTI_CONTACT_FRACTION;
  const span = duration * (LAST_MULTI_CONTACT_FRACTION - FIRST_MULTI_CONTACT_FRACTION);
  return Array.from({ length: count }, (_, index) =>
    Math.round(first + (span * index) / (count - 1)),
  );
}

export function mir4AnimationDurationForContactsMs(offsetsMs: readonly number[]): number {
  if (offsetsMs.length === 0) return 1;
  const lastContact = Math.max(1, ...offsetsMs);
  const contactFraction =
    offsetsMs.length === 1 ? SINGLE_CONTACT_FRACTION : LAST_MULTI_CONTACT_FRACTION;
  return Math.max(1, Math.round(lastContact / contactFraction));
}
