import { describe, expect, it } from 'vitest';
import { JumpInput } from '../src/game/jump_input';
import { consumePlayerJump, resetPlayerJump } from '../src/sim/player_jump';
import { type Entity, emptyMoveInput } from '../src/sim/types';

function player(aeldrune = true): Entity {
  return { mir4: aeldrune ? {} : undefined, onGround: true, jumping: false } as Entity;
}
const press = (jumpPress?: number) => ({
  ...emptyMoveInput(),
  jump: true,
  jumpPress,
  jumpPressBase: 0,
});
const jump = (p: Entity, token?: number, allowed = true, impulse = 6) =>
  consumePlayerJump(p, press(token), p.onGround, allowed, impulse);
function airborne(p: Entity): void {
  p.onGround = false;
  p.jumping = true;
}

describe('Aeldrune jump entitlement', () => {
  it('retains two fresh presses straddling uint16 wrap after long uninterrupted play', () => {
    const input = new JumpInput();
    for (let i = 0; i < 65535; i++) input.pressTap(i);
    const p = player();
    p.jumpInputPress = 65535;
    input.pressTap(65536);
    input.pressTap(65537);
    const move = { ...emptyMoveInput(), ...input.read(65537, false) };
    expect(consumePlayerJump(p, move, true, true, 6)).toBe(6);
    airborne(p);
    expect(consumePlayerJump(p, move, false, true, 6)).toBe(6);
    expect(consumePlayerJump(p, move, false, true, 6)).toBe(0);
  });
  it('does not interpret a canceled unseen press as a second live tap', () => {
    const p = player();
    jump(p, 1);
    const input = { ...press(3), jumpPressBase: 2 };
    expect(consumePlayerJump(p, input, true, true, 6)).toBe(6);
    airborne(p);
    expect(consumePlayerJump(p, input, false, true, 6)).toBe(0);
    expect(p.jumpCount).toBe(1);
  });
  it('preserves two coalesced presses across consecutive ticks, not two impulses in one tick', () => {
    const p = player();
    expect(jump(p, 2)).toBe(6);
    expect(p.jumpCount).toBe(1);
    airborne(p);
    expect(jump(p, 2)).toBe(6);
    expect(p.jumpCount).toBe(2);
    expect(jump(p, 2)).toBe(0);
    expect(jump(p, 3)).toBe(0);
  });

  it('never carries queued presses through a landing or a blocked tick', () => {
    const p = player();
    jump(p, 2);
    expect(jump(p, 2)).toBe(0); // immediate landing: no stale second jump
    jump(p, 4);
    airborne(p);
    expect(jump(p, 4, false)).toBe(0);
    expect(jump(p, 4)).toBe(0);
  });
  it('restarts the second impulse, never grants a third, and rearms only on landing', () => {
    const p = player();
    expect(jump(p, 1)).toBe(6);
    airborne(p);
    expect(jump(p, 1)).toBe(0);
    expect(jump(p, 2)).toBe(6);
    expect(jump(p, 3)).toBe(0);
    p.onGround = true;
    p.jumping = false;
    expect(jump(p, 3)).toBe(0);
    expect(jump(p, 4)).toBe(6);
  });

  it('keeps the first impulse even if a jump buff or mount changes in the air', () => {
    const p = player();
    expect(jump(p, 1, true, 7.5)).toBe(7.5);
    airborne(p);
    expect(jump(p, 2, true, 12)).toBe(7.5);
  });

  it('supports released/repressed boolean input without a revision, not a held button', () => {
    const p = player();
    expect(jump(p)).toBe(6);
    airborne(p);
    expect(jump(p)).toBe(0);
    consumePlayerJump(p, emptyMoveInput(), false, true, 6);
    expect(jump(p)).toBe(6);
    consumePlayerJump(p, emptyMoveInput(), false, true, 6);
    expect(jump(p)).toBe(0);
  });

  it('accepts revision wrap but never replays a revision after neutral input', () => {
    const p = player();
    expect(jump(p, 65535)).toBe(6);
    airborne(p);
    consumePlayerJump(p, emptyMoveInput(), false, true, 6);
    expect(jump(p, 65535)).toBe(0);
    expect(jump(p, 0)).toBe(6);
  });

  it('does not bank a blocked press to fire when root ends', () => {
    const p = player();
    expect(jump(p, 1)).toBe(6);
    airborne(p);
    expect(jump(p, 2, false)).toBe(0);
    expect(jump(p, 2)).toBe(0);
    expect(jump(p, 3)).toBe(6);
  });

  it('cannot start a double jump from falling or forced movement without a first jump', () => {
    const p = player();
    p.onGround = false;
    expect(jump(p, 1)).toBe(0);
    p.jumping = true;
    expect(jump(p, 2)).toBe(0);
  });

  it('treats a coyote jump as the first jump', () => {
    const p = player();
    p.onGround = false;
    expect(consumePlayerJump(p, press(1), true, true, 6)).toBe(6);
    p.jumping = true;
    expect(jump(p, 2)).toBe(6);
    expect(jump(p, 3)).toBe(0);
  });

  it('resets entitlement and consumes the current press on a transition', () => {
    const p = player();
    jump(p, 1);
    airborne(p);
    resetPlayerJump(p, press(2));
    expect(jump(p, 2)).toBe(0);
    expect(jump(p, 3)).toBe(0);
    p.onGround = true;
    expect(jump(p, 4)).toBe(6);
  });

  it('leaves classic held-ground jumps and single airborne arcs unchanged', () => {
    const p = player(false);
    expect(jump(p, 1)).toBe(6);
    airborne(p);
    expect(jump(p, 2)).toBe(0);
    p.onGround = true;
    expect(jump(p, 2)).toBe(6);
  });
});
