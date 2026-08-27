// Dedicated token bucket for persistent friend, block, and ignore mutations.
// These commands fan out into several PostgreSQL reads/writes plus refreshed
// snapshots. The generic command lane permits far more traffic than a human
// social UI needs, so one shared bucket bounds database pressure even when a
// hostile authenticated client alternates command types.

export const SOCIAL_MUTATION_BURST = 10;
export const SOCIAL_MUTATION_REFILL_PER_SECOND = 1;

export interface SocialMutationGuardState {
  tokens: number;
  lastRefillSec: number;
}

export function createSocialMutationGuard(nowSec: number): SocialMutationGuardState {
  return { tokens: SOCIAL_MUTATION_BURST, lastRefillSec: nowSec };
}

export function consumeSocialMutationToken(
  state: SocialMutationGuardState,
  nowSec: number,
): boolean {
  const elapsed = Math.max(0, nowSec - state.lastRefillSec);
  state.tokens = Math.min(
    SOCIAL_MUTATION_BURST,
    state.tokens + elapsed * SOCIAL_MUTATION_REFILL_PER_SECOND,
  );
  // Wall clocks can step backwards. Never move the refill anchor backwards,
  // otherwise the later return to the old time would mint free tokens.
  state.lastRefillSec = Math.max(state.lastRefillSec, nowSec);
  if (state.tokens < 1) return false;
  state.tokens -= 1;
  return true;
}
