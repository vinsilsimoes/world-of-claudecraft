import { describe, expect, it } from 'vitest';
import {
  mir4NativeTotemAttackerStats,
  mir4NativeTotemDamageOverrides,
} from '../../src/sim/mir4/native_skill_totem_combat';
import type { Mir4PendingImpact } from '../../src/sim/types';
import { mir4ResolveDamage } from '../../src/sim/mir4/math';

const NATIVE_TOTEM = {
  totemId: 1009,
  origin: { x: 2, y: 0, z: 3 },
  expiresAt: 6.1,
  combatResolution: {
    accuracy: 3_000,
    critical: 1_300,
    criticalOutcome: 12_000,
    hitChanceBps: 9_950,
    criticalChanceBps: 1_300,
    criticalMultiplierBps: 22_000,
    policyId: 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1',
    nativeClaim: false,
  },
} satisfies NonNullable<Mir4PendingImpact['nativeTotem']>;

describe('MIR4 native Totem combat ownership', () => {
  it('uses Totem-owned accuracy, critical, and outcome without replacing owner context stats', () => {
    expect(
      mir4NativeTotemAttackerStats(
        {
          accuracy: 17,
          critical: 19,
          criticalOutcome: 21,
          skillDamageBps: 450,
          monsterDamageBps: 300,
        },
        NATIVE_TOTEM,
      ),
    ).toEqual({
      accuracy: 3_000,
      critical: 1_300,
      criticalOutcome: 12_000,
      skillDamageBps: 450,
      monsterDamageBps: 300,
    });
  });

  it('projects bounded hit, critical, and critical-damage outcomes explicitly', () => {
    const overrides = mir4NativeTotemDamageOverrides(NATIVE_TOTEM);
    expect(overrides).toEqual({
      hitChanceBpsOverride: 9_950,
      criticalChanceBpsOverride: 1_300,
      criticalMultiplierBpsOverride: 22_000,
    });
    expect(
      mir4ResolveDamage({
        rawDamage: 100,
        attacker: { accuracy: 0, critical: 0, criticalOutcome: 0 },
        defender: { dodge: 999_999, avoidCritical: 999_999, criticalDamageReduction: 999_999 },
        hitRoll: 9_949,
        criticalRoll: 1_299,
        ...(overrides ?? {}),
      }),
    ).toMatchObject({
      hit: true,
      hitChanceBps: 9_950,
      critical: true,
      criticalChanceBps: 1_300,
      criticalMultiplierBps: 22_000,
    });
  });

  it('fails closed to the owner stats if the authorial adapter identity drifts', () => {
    const owner = { accuracy: 17, critical: 19, criticalOutcome: 21 };
    const changed = structuredClone(NATIVE_TOTEM) as NonNullable<
      Mir4PendingImpact['nativeTotem']
    >;
    Object.assign(changed.combatResolution as object, { policyId: 'unknown' });
    expect(mir4NativeTotemAttackerStats(owner, changed)).toEqual(owner);
    expect(mir4NativeTotemDamageOverrides(changed)).toBeNull();
  });
});
