import { describe, expect, it } from 'vitest';
import { encodeMovementInput, movementInputSignature } from '../src/net/movement_packet';
import { sanitizeMoveInput } from '../src/sim/move_input';
import { emptyMoveInput } from '../src/sim/types';

describe('physical jump press transport', () => {
  it('changes the signature for a second press even while the jump latch remains held', () => {
    const a = { ...emptyMoveInput(), jump: true, jumpPress: 1, jumpPressBase: 0 };
    const b = { ...a, jumpPress: 2 };
    expect(movementInputSignature(a, 0)).not.toBe(movementInputSignature(b, 0));
    expect(sanitizeMoveInput(encodeMovementInput(b))).toEqual(b);
  });

  it('retains a press through congestion, including revision zero, but not forced neutral', () => {
    const pending = { jump: true, jumpPress: 0, turnLeft: false, turnRight: true };
    expect(encodeMovementInput(emptyMoveInput(), pending)).toMatchObject({ j: 1, jp: 0, tr: 1 });
    expect(encodeMovementInput(emptyMoveInput())).not.toHaveProperty('jp');
    expect(encodeMovementInput({ ...emptyMoveInput(), jump: true, jumpPress: 2 }, pending).jp).toBe(
      2,
    );
  });

  it.each([-1, 65536, 1.2, Number.NaN, Infinity, '1', {}, null])(
    'rejects invalid revision %j',
    (jp) => {
      expect(sanitizeMoveInput({ j: 1, jp }).jumpPress).toBeUndefined();
    },
  );

  it('explicitly clears optional revisions when neutral input is merged into held state', () => {
    const held = { ...emptyMoveInput(), jump: true, jumpPress: 22 };
    Object.assign(held, sanitizeMoveInput({}));
    expect(held.jumpPress).toBeUndefined();
    expect(held.jump).toBe(false);
  });
});
