import type { MoveInput } from '../types';

/** Any deliberate locomotion/turn/swim command returns motion ownership to the player. */
export function mir4ManualMovementActive(input: MoveInput): boolean {
  return (
    input.forward ||
    input.back ||
    input.strafeLeft ||
    input.strafeRight ||
    input.turnLeft ||
    input.turnRight ||
    input.jump ||
    input.dive ||
    input.surface
  );
}
