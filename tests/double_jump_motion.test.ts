import { describe, expect, it } from 'vitest';
import { type SelfMotionFrame, SelfMotionPredictor } from '../src/render/self_motion';
import { moverHeight, resolveMovement } from '../src/sim/colliders';
import { sanitizeMoveInput } from '../src/sim/move_input';
import { moveSpeedMult, type PlayerMotionDeps, stepPlayerMotion } from '../src/sim/player_motion';
import { Sim } from '../src/sim/sim';
import { DT, type Entity, emptyMoveInput, type MoveInput } from '../src/sim/types';
import { groundHeight } from '../src/sim/world';
import { EMPTY_TEST_WORLD } from './sim_shared';

function fixture() {
  const sim = new Sim({
    seed: 42,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  const p = sim.player;
  p.pos = { x: 0, y: groundHeight(0, -40, 42), z: -40 };
  p.prevPos = { ...p.pos };
  p.fallStartY = p.pos.y;
  p.onGround = true;
  p.facing = 0;
  const deps: PlayerMotionDeps = {
    seed: 42,
    moveSpeedMult,
    resolveMove: (x, z, nx, nz, r, e, fences) =>
      resolveMovement(42, x, z, nx, nz, r, fences, undefined, moverHeight(e)),
    resolvedAbility: () => null,
    cancelCast() {},
    standUp() {},
    dealDamage() {},
  };
  const step = (input: MoveInput) => {
    p.prevPos = { ...p.pos };
    stepPlayerMotion(deps, p, input);
  };
  return { sim, p, deps, step };
}
const press = (jp: number) => sanitizeMoveInput({ j: 1, jp });

describe('double jump shared movement kernel', () => {
  it.each(['transition', 'disabled'] as const)(
    'never replays the old press after predictor %s',
    (mode) => {
      const { p } = fixture();
      const predictor = new SelfMotionPredictor(42);
      const frame: SelfMotionFrame = {
        enabled: true,
        moveInput: press(1),
        displayFacing: 0,
        echoMs: 100,
        jitterMs: 0,
        alpha: 1,
        frameDt: DT,
        snapAgeMs: 0,
        snapIntervalMs: 50,
      };
      predictor.step(p, frame);
      if (mode === 'transition') predictor.step(p, frame, true);
      else predictor.step(p, { ...frame, enabled: false });
      predictor.step(p, frame);
      const scratch = (predictor as unknown as { actor: Entity }).actor;
      expect(scratch.onGround).toBe(true);
      expect(scratch.jumpCount).toBe(0);
      predictor.step(p, { ...frame, moveInput: press(2) });
      expect(scratch.jumpCount).toBe(1);
    },
  );
  it('preserves ordinary ghost traversal without granting an extra air jump', () => {
    const { p, step } = fixture();
    p.dead = true;
    p.ghost = true;
    step(press(1));
    expect(p.vy).toBeCloseTo(5.2);
    expect(p.onGround).toBe(false);
    step(press(2));
    expect(p.vy).toBeCloseTo(4.4);
  });
  it.each([3, 9])('relaunches at current height on tick %i, ascending or descending', (delay) => {
    const { p, step } = fixture();
    step(press(1));
    const firstVy = p.vy;
    for (let i = 0; i < delay; i++) step(press(1));
    const before = p.pos.y;
    step(press(2));
    expect(p.vy).toBe(firstVy);
    expect(p.pos.y).toBeCloseTo(before + firstVy * DT, 10);
    step(press(3));
    expect(p.vy).toBeCloseTo(firstVy - 16 * DT, 10);
    expect(p.jumpCount).toBe(2);
  });

  it('steers and reverses horizontal travel during the double-jump arc without extra speed', () => {
    const { p, step } = fixture();
    step({ ...press(1), forward: true });
    expect(p.vz).toBeGreaterThan(0);
    step({ ...press(2), forward: true });
    p.facing = Math.PI;
    for (let i = 0; i < 9; i++) step({ ...press(2), forward: true });
    expect(p.onGround).toBe(false);
    expect(p.vz).toBeLessThan(0);
    expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(7);
  });

  it('keeps server Sim and local kernel prediction identical through both jumps and landing', () => {
    const { sim, p, deps } = fixture();
    const actor = { ...p, pos: { ...p.pos }, prevPos: { ...p.prevPos } };
    for (let tick = 0; tick < 35; tick++) {
      const input = tick < 5 ? press(1) : tick < 10 ? press(2) : press(3);
      Object.assign(sim.players.get(p.id)!.moveInput, input);
      actor.prevPos = { ...actor.pos };
      stepPlayerMotion(deps, actor, input);
      sim.tick();
      expect(actor.pos, `position tick ${tick}`).toEqual(p.pos);
      expect(actor.vy, `vertical velocity tick ${tick}`).toBe(p.vy);
      expect(actor.jumpCount, `budget tick ${tick}`).toBe(p.jumpCount);
    }
    expect(p.onGround).toBe(true);
  });

  it('does not grant a new impulse while rooted in the air', () => {
    const { p, step } = fixture();
    step(press(1));
    p.auras = [{ kind: 'root' } as Entity['auras'][number]];
    step(press(2));
    expect(p.vy).toBeCloseTo(4.4);
    p.auras = [];
    step(press(2));
    expect(p.vy).toBeCloseTo(3.6);
    step(press(3));
    expect(p.vy).toBeCloseTo(5.2);
  });

  it('threads the second physical press into the online display predictor without touching authority', () => {
    const { p } = fixture();
    const predictor = new SelfMotionPredictor(42);
    const frame: SelfMotionFrame = {
      enabled: true,
      moveInput: press(1),
      displayFacing: 0,
      echoMs: 100,
      jitterMs: 0,
      alpha: 1,
      frameDt: DT,
      snapAgeMs: 0,
      snapIntervalMs: 50,
    };
    predictor.step(p, frame);
    const scratch = (predictor as unknown as { actor: Entity }).actor;
    expect(scratch.jumpCount).toBe(1);
    predictor.step(p, frame);
    predictor.step(p, { ...frame, moveInput: press(2) });
    expect(scratch.jumpCount).toBe(2);
    expect(scratch.vy).toBeCloseTo(5.2);
    predictor.step(p, { ...frame, moveInput: press(3) });
    expect(scratch.vy).toBeCloseTo(4.4);
    expect(p.onGround).toBe(true);
    expect(p.jumpCount).toBeUndefined();
    expect(emptyMoveInput().jump).toBe(false);
  });
});
