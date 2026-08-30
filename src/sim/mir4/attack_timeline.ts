// Pure MIR4 timing for basic attacks, ultimates, and skills whose official
// client rows expose exact damage-contact offsets.

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

/**
 * Admit an exact client-authored skill timeline only when it has one offset
 * for every runtime damage contact and every contact fits the animation.
 * Returning null preserves the legacy immediate path for unhomologated kits.
 */
export function mir4ValidatedSkillContactOffsetsMs(
  offsetsMs: readonly number[] | undefined,
  animationMs: number,
  impactCount: number,
): readonly number[] | null {
  if (!offsetsMs || offsetsMs.length !== impactCount || impactCount <= 0) return null;
  const duration = Math.max(1, Math.round(animationMs));
  let previous = -1;
  const validated: number[] = [];
  for (const rawOffset of offsetsMs) {
    const offset = Math.round(rawOffset);
    if (!Number.isFinite(rawOffset) || offset < 0 || offset > duration || offset < previous) {
      return null;
    }
    validated.push(offset);
    previous = offset;
  }
  return validated;
}
