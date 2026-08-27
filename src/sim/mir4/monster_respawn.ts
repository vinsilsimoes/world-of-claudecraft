// MIR4 is a grind profile: every ordinary in-place monster schedule resolves
// through this multiplier after the shared WoC policy has selected its current
// trash, rare, boss, explicit, or host-overridden delay.

export const MIR4_MONSTER_RESPAWN_SPEED_MULTIPLIER = 4;

export function mir4MonsterRespawnSeconds(currentSeconds: number): number {
  if (!Number.isFinite(currentSeconds)) return currentSeconds;
  return Math.max(0, currentSeconds / MIR4_MONSTER_RESPAWN_SPEED_MULTIPLIER);
}
