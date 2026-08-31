import type { Entity, MoveInput } from './types';

/** Consume intent even when jumping is denied. Neutral input never forgets the
 * last revision: re-sending a latched/network press cannot become another jump. */
function consumePress(p: Entity, input: MoveInput): number {
  const revision = input.jumpPress;
  const delta =
    revision === undefined
      ? Number(!p.jumpInputHeld)
      : p.jumpInputPress === undefined && revision === 0
        ? 1
        : (revision - (p.jumpInputPress ?? 0) + 65536) % 65536;
  // The cancellation baseline distinguishes two live taps from one tap after a
  // menu canceled an unseen press. Old clients without a baseline get one edge.
  const sinceCancel =
    revision === undefined || input.jumpPressBase === undefined
      ? 1
      : (revision - input.jumpPressBase + 65536) % 65536 || 65536;
  const live = Math.min(delta, sinceCancel);
  const fresh = !input.jump || live === 0 ? 0 : live === 2 ? 2 : 1;
  p.jumpInputHeld = input.jump;
  if (revision !== undefined) p.jumpInputPress = revision;
  return fresh;
}

/** Transient physics only, never inventory/progression or a client entitlement. */
export function resetPlayerJump(p: Entity, input: MoveInput): void {
  p.jumpCount = 0;
  p.jumpLaunchSpeed = 0;
  p.jumpQueued = false;
  consumePress(p, input);
}

/** Returns the new vertical speed, or zero for no impulse. Classic retains its
 * held-button single jump. Aeldrune requires a new physical press per impulse;
 * only a deliberate first jump earns one extra launch until the next landing. */
export function consumePlayerJump(
  p: Entity,
  input: MoveInput,
  groundOrCoyote: boolean,
  allowed: boolean,
  launchSpeed: number,
): number {
  if (!p.mir4) return input.jump && groundOrCoyote && allowed ? launchSpeed : 0;
  if (p.ghost) {
    resetPlayerJump(p, input);
    return input.jump && groundOrCoyote && allowed ? launchSpeed : 0;
  }
  if (p.onGround || !p.jumping) {
    p.jumpCount = 0;
    p.jumpLaunchSpeed = 0;
    p.jumpQueued = false;
  }
  const fresh = consumePress(p, input);
  const queued = p.jumpQueued;
  p.jumpQueued = false;
  if ((!fresh && !queued) || !allowed || p.dead) return 0;
  if (groundOrCoyote) {
    p.jumpCount = 1;
    p.jumpLaunchSpeed = launchSpeed;
    p.jumpQueued = fresh === 2;
    return launchSpeed;
  }
  if (p.jumping && p.jumpCount === 1 && (p.jumpLaunchSpeed ?? 0) > 0) {
    p.jumpCount = 2;
    return p.jumpLaunchSpeed ?? 0;
  }
  return 0;
}
