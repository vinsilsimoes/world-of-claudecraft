// Session-only target memory for MIR4 Auto Battle. The simulation clock owns
// blacklist expiry, so the same seed and inputs abandon and reacquire on the
// same tick in every host. No route or blacklist field is persisted.

/** Two seconds without any player displacement proves this pursuit is stalled. */
export const MIR4_AUTO_BATTLE_STALL_TICKS = 40;
/** A rejected target gets a bounded retry window instead of a permanent ban. */
export const MIR4_AUTO_BATTLE_BLACKLIST_SECONDS = 8;

export interface Mir4AutoBattlePursuitMemory {
  targetId: number;
  lastX: number;
  lastZ: number;
  stalledTicks: number;
}

export interface Mir4AutoBattleTargetMemory {
  pursuit?: Mir4AutoBattlePursuitMemory;
  blockedUntilByTargetId?: Record<string, number>;
}

export function observeMir4AutoBattlePursuit(
  previous: Mir4AutoBattlePursuitMemory | undefined,
  targetId: number,
  current: { x: number; z: number },
): { pursuit: Mir4AutoBattlePursuitMemory; stalled: boolean } {
  if (!previous || previous.targetId !== targetId) {
    return {
      pursuit: {
        targetId,
        lastX: current.x,
        lastZ: current.z,
        stalledTicks: 0,
      },
      stalled: false,
    };
  }
  const moved = Math.hypot(current.x - previous.lastX, current.z - previous.lastZ);
  const stalledTicks = moved < 0.01 ? previous.stalledTicks + 1 : 0;
  return {
    pursuit: {
      targetId,
      lastX: current.x,
      lastZ: current.z,
      stalledTicks,
    },
    stalled: stalledTicks >= MIR4_AUTO_BATTLE_STALL_TICKS,
  };
}

export function blockMir4AutoBattleTarget(
  memory: Mir4AutoBattleTargetMemory,
  targetId: number,
  now: number,
): void {
  if (!memory.blockedUntilByTargetId) memory.blockedUntilByTargetId = {};
  memory.blockedUntilByTargetId[String(targetId)] = now + MIR4_AUTO_BATTLE_BLACKLIST_SECONDS;
  memory.pursuit = undefined;
}

export function mir4AutoBattleTargetBlocked(
  memory: Mir4AutoBattleTargetMemory,
  targetId: number,
  now: number,
): boolean {
  const blocked = memory.blockedUntilByTargetId;
  if (!blocked) return false;
  const key = String(targetId);
  const until = blocked[key];
  if (until === undefined) return false;
  if (until > now) return true;
  delete blocked[key];
  if (Object.keys(blocked).length === 0) memory.blockedUntilByTargetId = undefined;
  return false;
}

export function pruneMir4AutoBattleTargetBlocks(
  memory: Mir4AutoBattleTargetMemory,
  now: number,
): void {
  const blocked = memory.blockedUntilByTargetId;
  if (!blocked) return;
  for (const [targetId, until] of Object.entries(blocked)) {
    if (until <= now) delete blocked[targetId];
  }
  if (Object.keys(blocked).length === 0) memory.blockedUntilByTargetId = undefined;
}
