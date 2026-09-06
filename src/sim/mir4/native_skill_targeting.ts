/**
 * The cooked Sorcerer table marks these actor-centred area actions as
 * Targeting=true even though their admitted activation has no entity target.
 * Keep the compatibility interpretation narrow and fail closed for every
 * other skill/table mismatch.
 */
const ACTOR_AREA_TARGETING_OVERRIDES = new Set<number>([2201, 2202]);

export function mir4NativeRuntimeTargetingMatches(
  skillId: number,
  nativeTargeting: boolean,
  runtimeRequiresTarget: boolean,
): boolean {
  if (nativeTargeting === runtimeRequiresTarget) return true;
  return (
    ACTOR_AREA_TARGETING_OVERRIDES.has(skillId) &&
    nativeTargeting === true &&
    runtimeRequiresTarget === false
  );
}
