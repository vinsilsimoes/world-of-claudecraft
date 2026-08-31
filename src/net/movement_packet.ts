import type { MoveInput } from '../sim/types';

export interface PendingTransientInput {
  jump: boolean;
  jumpPress?: number;
  jumpPressBase?: number;
  turnLeft: boolean;
  turnRight: boolean;
}

export function movementInputSignature(mi: MoveInput, facing: number | null): string {
  return [
    mi.forward ? 1 : 0,
    mi.back ? 1 : 0,
    mi.turnLeft ? 1 : 0,
    mi.turnRight ? 1 : 0,
    mi.strafeLeft ? 1 : 0,
    mi.strafeRight ? 1 : 0,
    mi.jump ? 1 : 0,
    mi.dive ? 1 : 0,
    mi.surface ? 1 : 0,
    mi.swimSteer ?? 1,
    mi.jumpPress ?? '',
    mi.jumpPressBase ?? '',
    facing === null ? '' : Math.round(facing * 10000),
  ].join(',');
}

/** Additive wire field; old inputs omit jp and retain their boolean semantics. */
export function encodeMovementInput(
  mi: MoveInput,
  pending?: PendingTransientInput,
): Record<string, number> {
  const wire: Record<string, number> = {
    f: mi.forward ? 1 : 0,
    b: mi.back ? 1 : 0,
    tl: mi.turnLeft || pending?.turnLeft ? 1 : 0,
    tr: mi.turnRight || pending?.turnRight ? 1 : 0,
    sl: mi.strafeLeft ? 1 : 0,
    sr: mi.strafeRight ? 1 : 0,
    j: mi.jump || pending?.jump ? 1 : 0,
    dv: mi.dive ? 1 : 0,
    sf: mi.surface ? 1 : 0,
  };
  const press = mi.jump ? mi.jumpPress : pending?.jumpPress;
  if (press !== undefined) wire.jp = press;
  const base = mi.jump ? mi.jumpPressBase : pending?.jumpPressBase;
  if (base !== undefined && press !== undefined) wire.jb = base;
  if (mi.swimSteer !== undefined && mi.swimSteer !== 1) wire.ss = mi.swimSteer;
  return wire;
}
