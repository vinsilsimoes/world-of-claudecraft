import type { Mir4PendingImpact } from '../types';
import type { Mir4CombatStats } from './math';

/**
 * Replaces only the three fields proved to belong to the durable Totem.
 * Owner attack power and contextual bonuses remain on the already-snapshotted
 * contact. The source does not preserve the native admission helpers, so this
 * compatibility bridge deliberately identifies itself as authorial.
 */
export function mir4NativeTotemAttackerStats(
  ownerStats: Partial<Mir4CombatStats>,
  nativeTotem: NonNullable<Mir4PendingImpact['nativeTotem']>,
): Partial<Mir4CombatStats> {
  if (
    nativeTotem.combatResolution.policyId !==
      'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1' ||
    nativeTotem.combatResolution.nativeClaim !== false
  ) {
    return ownerStats;
  }
  return {
    ...ownerStats,
    accuracy: nativeTotem.combatResolution.accuracy,
    critical: nativeTotem.combatResolution.critical,
    criticalOutcome: nativeTotem.combatResolution.criticalOutcome,
  };
}

export function mir4NativeTotemDamageOverrides(
  nativeTotem: NonNullable<Mir4PendingImpact['nativeTotem']>,
): {
  hitChanceBpsOverride: number;
  criticalChanceBpsOverride: number;
  criticalMultiplierBpsOverride: number;
} | null {
  const resolution = nativeTotem.combatResolution;
  if (
    resolution.policyId !== 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1' ||
    resolution.nativeClaim !== false
  ) {
    return null;
  }
  return {
    hitChanceBpsOverride: resolution.hitChanceBps,
    criticalChanceBpsOverride: resolution.criticalChanceBps,
    criticalMultiplierBpsOverride: resolution.criticalMultiplierBps,
  };
}
