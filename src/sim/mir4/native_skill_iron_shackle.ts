export interface Mir4NativeIronShacklePersistentBonuses {
  readonly monsterDamageBasisPoints: number;
  readonly allDamageReductionBasisPoints: number;
}

export interface Mir4NativeIronShackleDamageAmplification {
  readonly sourceAttackId: 120102;
  readonly buffId: 10511;
  readonly durationMs: number;
  readonly magnitudeBasisPoints: number;
}

export interface Mir4NativeIronShackleFinalStun {
  readonly sourceAttackId: 120103;
  readonly buffId: 10521;
  readonly durationMs: 1_000;
  readonly chanceBasisPoints: 10_000;
}

export interface Mir4NativeIronShacklePolicy {
  readonly skillLevel: number;
  readonly persistent: Mir4NativeIronShacklePersistentBonuses;
  readonly damageAmplification: Mir4NativeIronShackleDamageAmplification | null;
  readonly finalStun: Mir4NativeIronShackleFinalStun | null;
}

const NONE = Object.freeze({
  monsterDamageBasisPoints: 0,
  allDamageReductionBasisPoints: 0,
});

/**
 * Exact persistent milestones from PASSIVE rows 110811/12, 110821/22 and
 * 110831/32. Native values are per-mille, converted here to runtime bps.
 */
export function mir4NativeIronShacklePersistentBonuses(
  skillLevel: number,
): Mir4NativeIronShacklePersistentBonuses {
  const rank = Math.max(1, Math.min(10, Math.trunc(skillLevel)));
  if (rank < 5) return NONE;
  if (rank < 8) {
    return Object.freeze({ monsterDamageBasisPoints: 400, allDamageReductionBasisPoints: 200 });
  }
  if (rank < 10) {
    return Object.freeze({ monsterDamageBasisPoints: 800, allDamageReductionBasisPoints: 400 });
  }
  return Object.freeze({ monsterDamageBasisPoints: 1_200, allDamageReductionBasisPoints: 600 });
}

/**
 * Exact rank gates recovered from SKILL_SPECIAL_ABILITY 29-32:
 * rank 8 adds BUFF 10511 after row 120102; rank 10 upgrades it and adds
 * BUFF_ATTACK 10121 (Stun01) after row 120103.
 */
export function mir4NativeRuntimeIronShacklePolicy(
  skillLevel: number,
): Mir4NativeIronShacklePolicy {
  const rank = Math.max(1, Math.min(10, Math.trunc(skillLevel)));
  const damageAmplification =
    rank < 8
      ? null
      : Object.freeze({
          sourceAttackId: 120102 as const,
          buffId: 10511 as const,
          durationMs: rank >= 10 ? 8_000 : 6_000,
          magnitudeBasisPoints: rank >= 10 ? 3_500 : 2_500,
        });
  const finalStun =
    rank < 10
      ? null
      : Object.freeze({
          sourceAttackId: 120103 as const,
          buffId: 10521 as const,
          durationMs: 1_000 as const,
          chanceBasisPoints: 10_000 as const,
        });
  return Object.freeze({
    skillLevel: rank,
    persistent: mir4NativeIronShacklePersistentBonuses(rank),
    damageAmplification,
    finalStun,
  });
}
