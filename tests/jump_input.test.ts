import { describe, expect, it } from 'vitest';
import { JumpInput } from '../src/game/jump_input';

describe('JumpInput physical press revisions', () => {
  it('starts neutral even at time zero and does not consume a press on reads', () => {
    const jump = new JumpInput();
    expect(jump.revision).toBe(0);
    expect(jump.read(0, false)).toStrictEqual({
      jump: false,
      jumpPress: undefined,
      jumpPressBase: undefined,
    });
    jump.pressKey('Space', 0);
    expect(jump.read(0, true)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
    expect(jump.read(0, true)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
  });

  it('keeps key taps for 150ms while detecting a repress inside the same latch', () => {
    const jump = new JumpInput();
    jump.pressKey('Space', 1000);
    jump.releaseKey('Space');
    expect(jump.read(1010, false)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
    jump.pressKey('Space', 1020);
    jump.releaseKey('Space');
    expect(jump.read(1020, false)).toEqual({ jump: true, jumpPress: 2, jumpPressBase: 0 });
    expect(jump.read(1170, false)).toEqual({ jump: true, jumpPress: 2, jumpPressBase: 0 });
    expect(jump.read(1171, false)).toStrictEqual({
      jump: false,
      jumpPress: undefined,
      jumpPressBase: undefined,
    });
    expect(jump.revision).toBe(2);
  });

  it('does not revise or renew the latch on duplicate keydown while held', () => {
    const jump = new JumpInput();
    jump.pressKey('Space', 1000);
    jump.pressKey('Space', 1200);
    expect(jump.read(1200, true)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
    jump.releaseKey('Space');
    expect(jump.read(1200, false)).toStrictEqual({
      jump: false,
      jumpPress: undefined,
      jumpPressBase: undefined,
    });
  });

  it('counts a second bound physical control even while the first is held', () => {
    const jump = new JumpInput();
    jump.pressKey('Space', 1000);
    jump.pressKey('Mouse4', 1010);
    expect(jump.read(1010, true)).toEqual({ jump: true, jumpPress: 2, jumpPressBase: 0 });
    jump.releaseKey('Mouse4');
    jump.pressKey('Mouse4', 1020);
    expect(jump.read(1020, true)).toEqual({ jump: true, jumpPress: 3, jumpPressBase: 0 });
  });

  it('keeps touch and gamepad edge taps for 220ms with no read consumption', () => {
    const jump = new JumpInput();
    jump.pressTap(1000);
    expect(jump.read(1000, false)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
    expect(jump.read(1000, false)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 0 });
    jump.pressTap(1010);
    expect(jump.read(1230, false)).toEqual({ jump: true, jumpPress: 2, jumpPressBase: 0 });
    expect(jump.read(1231, false)).toStrictEqual({
      jump: false,
      jumpPress: undefined,
      jumpPressBase: undefined,
    });
  });

  it('clears all held keys and taps without rewinding revisions', () => {
    const jump = new JumpInput();
    jump.pressKey('Space', 1000);
    jump.pressTap(1010);
    jump.clear();
    expect(jump.read(1010, false)).toStrictEqual({
      jump: false,
      jumpPress: undefined,
      jumpPressBase: undefined,
    });
    jump.pressKey('Space', 1020);
    expect(jump.read(1020, true)).toEqual({ jump: true, jumpPress: 3, jumpPressBase: 2 });
  });

  it('wraps the bounded revision from 65535 to zero on the next real press', () => {
    const jump = new JumpInput();
    for (let n = 0; n < 65535; n++) jump.pressTap(n);
    expect(jump.revision).toBe(65535);
    jump.pressTap(65535);
    expect(jump.read(65535, false)).toEqual({ jump: true, jumpPress: 0, jumpPressBase: 32769 });
    jump.pressTap(65536);
    expect(jump.read(65536, false)).toEqual({ jump: true, jumpPress: 1, jumpPressBase: 32770 });
  });

  it('overwrites an earlier press revision when assigning neutral input into a reused object', () => {
    const jump = new JumpInput();
    jump.pressKey('Space', 1000);
    const held = jump.read(1000, true);
    jump.releaseKey('Space');
    Object.assign(held, jump.read(1200, false));
    expect(held).toStrictEqual({ jump: false, jumpPress: undefined, jumpPressBase: undefined });
    expect(jump.revision).toBe(1);
  });

  it('marks a canceled first press as the baseline for the next live press', () => {
    const jump = new JumpInput();
    jump.pressTap(1000);
    jump.clear();
    jump.pressTap(1010);
    expect(jump.read(1010, false)).toEqual({ jump: true, jumpPress: 2, jumpPressBase: 1 });
    expect(jump.revision).toBe(2);
  });

  it('preserves a cancellation baseline across revision wraparound', () => {
    const jump = new JumpInput();
    for (let n = 0; n < 65535; n++) jump.pressTap(n);
    jump.clear();
    jump.pressTap(65535);
    expect(jump.read(65535, false)).toEqual({ jump: true, jumpPress: 0, jumpPressBase: 65535 });
  });
});
