import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';

/** Static template immunity plus an active native self-buff such as BUFF 11031. */
export function mir4NativeControlImmune(target: Entity): boolean {
  return (
    target.ccImmune === true ||
    target.mir4Effects?.active.some(
      (effect) => effect.kind === 'control-immunity' && effect.remaining > CAST_COMPLETE_EPS,
    ) === true
  );
}
