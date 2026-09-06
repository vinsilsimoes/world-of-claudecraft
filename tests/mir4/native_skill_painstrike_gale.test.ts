import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4';
import { mir4NativeRuntimeActivationRangePolicy } from '../../src/sim/mir4/native_skill_activation_range';
import {
  mir4NativePainstrikeGaleBuffsMatchRow,
  mir4NativePainstrikeGalePolicy,
} from '../../src/sim/mir4/native_skill_painstrike_gale';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Painstrike Gale native contract', () => {
  it('closes the exact three-row action and compiles it as live authority', () => {
    const action = mir4NativeSkillActionById(4106);
    expect(action?.rows.map((row) => [row.attackId, row.nextAttackId])).toEqual([
      [410601, 410602],
      [410602, 410603],
      [410603, 0],
    ]);
    expect(action?.rows.map((row) => row.movement)).toEqual([
      { kind: 'target', nativeRange: 30, delayMs: 0, durationMs: 250 },
      { kind: 'direct', nativeRange: -800, delayMs: 100, durationMs: 500 },
      { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
    ]);
    expect(action?.rows.map((row) => row.impactOffsetsMs)).toEqual([[20], [450], [1000]]);
    expect(action?.rows[0] && mir4NativePainstrikeGaleBuffsMatchRow(action.rows[0])).toBe(true);

    const authority = mir4RuntimeSkillExecutionAuthority(4106);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).not.toBeNull();
    expect(authority?.plan?.rows.map((row) => row.motion?.kind ?? 'none')).toEqual([
      'target',
      'direct',
      'none',
    ]);
  });

  it('uses the exact 14-yard native admission with the 100-unit trace padding', () => {
    expect(mir4NativeRuntimeActivationRangePolicy(4106)).toEqual({
      skillId: 4106,
      firstAttackId: 410601,
      targetDistanceMaxNative: 1_400,
      traceStopPaddingNative: 100,
      targetHeightNative: 400,
      blockingCheck: true,
    });
  });

  it.each([
    [1, 5_000, 1_000, 1_000, 2_000, null, null],
    [5, 8_000, 3_000, 1_000, 2_000, [-100, 5_000], null],
    [8, 10_000, 5_000, 1_000, 2_000, [-200, 5_000], [-200, 5_000]],
    [10, 10_000, 7_000, 2_000, 3_000, [-400, 8_000], [-400, 8_000]],
    [15, 10_000, 7_000, 2_000, 3_000, [-400, 8_000], [-400, 8_000]],
  ] as const)(
    'projects rank %i Mark, player/monster stun, and critical debuffs',
    (rank, markDurationMs, playerChanceBasisPoints, playerStunDurationMs, monsterStunDurationMs, criticalDamageReduction, criticalEvasion) => {
      const policy = mir4NativePainstrikeGalePolicy(rank);
      expect(policy?.contact).toMatchObject({
        attackId: 410602,
        applyAtMs: 450,
        markDurationMs,
        markCriticalEvasion: -25,
        playerStunChanceBasisPoints: playerChanceBasisPoints,
        playerStunDurationMs,
        monsterStunChanceBasisPoints: 10_000,
        monsterStunDurationMs,
      });
      expect(
        policy?.contact.criticalDamageReductionDebuff
          ? [
              policy.contact.criticalDamageReductionDebuff.magnitude,
              policy.contact.criticalDamageReductionDebuff.durationMs,
            ]
          : null,
      ).toEqual(criticalDamageReduction);
      expect(
        policy?.contact.criticalEvasionDebuff
          ? [
              policy.contact.criticalEvasionDebuff.magnitude,
              policy.contact.criticalEvasionDebuff.durationMs,
            ]
          : null,
      ).toEqual(criticalEvasion);
    },
  );
});
