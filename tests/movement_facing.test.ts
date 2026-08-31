import { describe, expect, it } from 'vitest';
import { updateFollowCameraYaw } from '../src/game/camera_follow';
import { mir4AutomationOwnsMotion } from '../src/game/mir4_motion_ownership';
import { MovementFacingController } from '../src/game/movement_facing';
import { SelfFacingSmoother } from '../src/render/facing_smooth';
import { DUNGEON_X_THRESHOLD } from '../src/sim/data';
import { createPlayer } from '../src/sim/entity';
import { moveSpeedMult, type PlayerMotionDeps, stepPlayerMotion } from '../src/sim/player_motion';
import type { MoveInput } from '../src/sim/types';
import { groundHeight } from '../src/sim/world';

const idle = (overrides: Partial<MoveInput> = {}): MoveInput => ({
  forward: false,
  back: false,
  strafeLeft: false,
  strafeRight: false,
  turnLeft: false,
  turnRight: false,
  jump: false,
  dive: false,
  surface: false,
  ...overrides,
});

describe('Aeldrune manual travel-facing', () => {
  it.each([
    ['forward', { forward: true }, 0],
    ['back', { back: true }, -Math.PI],
    ['left', { strafeLeft: true }, Math.PI / 2],
    ['right', { strafeRight: true }, -Math.PI / 2],
    ['forward-left', { forward: true, strafeLeft: true }, Math.PI / 4],
    ['forward-right', { forward: true, strafeRight: true }, -Math.PI / 4],
    ['back-left', { back: true, strafeLeft: true }, (3 * Math.PI) / 4],
    ['back-right', { back: true, strafeRight: true }, (-3 * Math.PI) / 4],
  ] as const)('faces %s travel and walks forward along that heading', (_, keys, yaw) => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    const move = idle(keys);
    expect(facing.update(move, 0, true, false, false, null)).toBeCloseTo(yaw);
    expect(facing.applyTo(move)).toBe(move);
    expect(move).toEqual(idle({ forward: true }));
    expect(facing.releaseFacing).toBeNull();
  });

  it('keeps held S travelling backward for many frames without camera feedback', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    let camYaw = 0;
    let lastInterpFacing: number | null = 0;
    let z = 0;
    for (let frame = 0; frame < 120; frame++) {
      const move = idle({ back: true });
      const heading = facing.update(move, camYaw, true, false, false, null);
      expect(heading).toBeCloseTo(-Math.PI);
      if (heading === null) throw new Error('S must provide a travel heading');
      facing.applyTo(move);
      // The existing motion kernel uses facing + forward. Leaving back set here
      // would reverse the new heading a second time and walk toward the camera's front.
      z += Math.cos(heading) * (Number(move.forward) - Number(move.back));
      const camera = updateFollowCameraYaw({
        camYaw,
        interpFacing: heading,
        lastInterpFacing,
        frameDt: 1 / 60,
        moving: true,
        mouselook: false,
        orbiting: false,
        cameraDriven: facing.holdsCameraYaw,
      });
      camYaw = camera.camYaw;
      lastInterpFacing = camera.lastInterpFacing;
    }
    expect(z).toBeCloseTo(-120);
    expect(camYaw).toBe(0);
  });

  it('turns the real motion-kernel actor toward S travel and keeps W camera-relative', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    // Flat instanced floor keeps outdoor collision sliding out of this test.
    const startX = DUNGEON_X_THRESHOLD + 20;
    const actor = createPlayer(
      1,
      'warrior',
      { x: startX, y: groundHeight(startX, 0, 42), z: 0 },
      'Mover',
    );
    const deps: PlayerMotionDeps = {
      seed: 42,
      moveSpeedMult: (entity) => moveSpeedMult(entity, 0),
      resolveMove: (_x, _z, x, z) => ({ x, z }),
      resolvedAbility: () => null,
      cancelCast: () => {},
      standUp: () => {},
      dealDamage: () => {},
    };
    for (let tick = 0; tick < 20; tick++) {
      const move = idle({ back: true });
      const heading = facing.update(move, 0, true, false, false, null);
      if (heading === null) throw new Error('S must provide a travel heading');
      actor.prevPos = { ...actor.pos };
      actor.facing = heading;
      stepPlayerMotion(deps, actor, facing.applyTo(move));
    }
    expect(actor.pos.z).toBeLessThan(-5);
    expect(actor.pos.x).toBeCloseTo(startX);
    expect(actor.facing).toBeCloseTo(-Math.PI);
    const backPosition = actor.pos.z;
    const forward = idle({ forward: true });
    const heading = facing.update(forward, 0, true, false, false, null);
    if (heading === null) throw new Error('W must provide a travel heading');
    actor.prevPos = { ...actor.pos };
    actor.facing = heading;
    stepPlayerMotion(deps, actor, facing.applyTo(forward));
    expect(actor.pos.z).toBeGreaterThan(backPosition);
    expect(actor.facing).toBe(0);
  });

  it('releases the last travel heading, not the camera heading, exactly once', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    facing.update(idle({ back: true }), 0, true, false, false, null);
    expect(facing.update(idle(), 0.4, true, false, false, null)).toBeNull();
    expect(facing.releaseFacing).toBeCloseTo(-Math.PI);
    facing.update(idle(), 0.5, true, false, false, null);
    expect(facing.releaseFacing).toBeNull();
  });

  it('does not rotate the camera when a delayed facing snapshot arrives after release', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    facing.update(idle({ back: true }), 0, true, false, false, null);
    facing.update(idle(), 0, true, false, false, null);
    let lastInterpFacing = 0;
    for (const interpFacing of [0.2, 1.1, 2.8, Math.PI]) {
      const camera = updateFollowCameraYaw({
        camYaw: 0,
        interpFacing,
        lastInterpFacing,
        frameDt: 1 / 60,
        moving: false,
        mouselook: false,
        orbiting: false,
        cameraDriven: facing.holdsCameraYaw,
      });
      expect(camera.camYaw).toBe(0);
      lastInterpFacing = camera.lastInterpFacing;
    }
  });

  it('uses camera yaw as the reference even after the character has turned around', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    expect(facing.update(idle({ back: true }), 0.6, true, false, false, null)).toBeCloseTo(
      0.6 - Math.PI,
    );
    expect(facing.update(idle({ forward: true }), 0.6, true, false, false, null)).toBeCloseTo(0.6);
    expect(facing.update(idle({ back: true }), 0.8, true, true, false, null)).toBeCloseTo(
      0.8 - Math.PI,
    );
  });

  it('preserves jump and swim intent during direction remapping', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    const move = idle({ back: true, jump: true, dive: true, surface: true, swimSteer: 0.6 });
    facing.update(move, 0, true, false, false, null);
    facing.applyTo(move);
    expect(move).toEqual(
      idle({ forward: true, jump: true, dive: true, surface: true, swimSteer: 0.6 }),
    );
  });

  it('leaves opposing keys neutral instead of manufacturing a forward step', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    const move = idle({ forward: true, back: true, strafeLeft: true, strafeRight: true });
    const original = { ...move };
    expect(facing.update(move, 1, true, false, false, null)).toBeNull();
    facing.applyTo(move);
    expect(move).toEqual(original);
  });

  it('yields to explicit controller headings without rotating them a second time', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    facing.update(idle({ back: true }), 0, true, false, false, null);
    const move = idle({ forward: true, strafeRight: true });
    const original = { ...move };
    expect(facing.update(move, 2, true, false, false, -0.3)).toBeNull();
    expect(facing.releaseFacing).toBeNull();
    facing.applyTo(move);
    expect(move).toEqual(original);
  });

  it('discards manual facing and its release while death or stun blocks input', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    facing.update(idle({ back: true }), 0, true, false, false, null);
    expect(facing.update(idle({ back: true }), 1, true, false, true, null)).toBeNull();
    expect(facing.releaseFacing).toBeNull();
    expect(facing.update(idle(), 1, true, false, false, null)).toBeNull();
    expect(facing.releaseFacing).toBeNull();
  });

  it('sends neutral horizontal input until the client observes stun recovery', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    facing.update(idle({ back: true }), 0, true, false, false, null);
    for (let frame = 0; frame < 5; frame++) {
      const move = idle({ back: true, turnLeft: true, jump: true });
      expect(facing.update(move, 0, true, false, true, null)).toBeNull();
      // Some of these frames can occur AFTER the server removes the stun.
      // Raw back=true would reverse the actor's already-turned -PI heading.
      expect(facing.applyTo(move)).toEqual(idle({ jump: true }));
    }
    const resumed = idle({ back: true });
    expect(facing.update(resumed, 0, true, false, false, null)).toBeCloseTo(-Math.PI);
    expect(facing.applyTo(resumed)).toEqual(idle({ forward: true }));
  });

  it('holds only the visual yaw after a short S tap until the delayed echo arrives', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    const visual = new SelfFacingSmoother();
    let shown = 0;
    for (let frame = 0; frame < 30; frame++) {
      const input = idle({ back: frame < 6 });
      const active = facing.update(input, 0, true, false, false, null);
      const wireFacing = active ?? facing.releaseFacing;
      const authoritative = frame < 12 ? 0 : -3.14; // the wire rounds yaw to 0.01 rad
      const next = visual.step(shown, authoritative, wireFacing, 1 / 60, 'travel', 200, true);
      expect(next).toBeLessThanOrEqual(shown + 0.002); // allow only the quantized seam
      shown = next;
      if (frame > 6) {
        // Release has been consumed: a display hold must not keep owning the
        // wire, movement, camera, auto-mission or combat heading.
        expect(wireFacing).toBeNull();
        expect(facing.applyTo(input)).toEqual(idle());
      }
    }
    expect(shown).toBeCloseTo(-3.14, 6);
  });

  it('does not take facing from click movement, auto-mission or auto-battle while idle', () => {
    const facing = new MovementFacingController('mir4-gameplay-port');
    expect(facing.update(idle(), 1.4, true, true, false, null)).toBeNull();
    const clickMove = idle({ forward: true });
    facing.applyTo(clickMove);
    expect(clickMove).toEqual(idle({ forward: true }));
    expect(mir4AutomationOwnsMotion(true, false, idle())).toBe(true);
    expect(mir4AutomationOwnsMotion(false, true, idle())).toBe(true);
    const manual = idle({ back: true });
    facing.update(manual, 0, true, false, false, null);
    facing.applyTo(manual);
    expect(mir4AutomationOwnsMotion(true, true, manual)).toBe(false);
  });
});

describe('classic camera-facing remains unchanged', () => {
  it('retains backpedal flags and the legacy final camera-yaw commit', () => {
    const facing = new MovementFacingController('woc-classic');
    const move = idle({ back: true });
    expect(facing.update(move, 0.6, true, false, false, null)).toBe(0.6);
    facing.applyTo(move);
    expect(move).toEqual(idle({ back: true }));
    expect(facing.update(idle(), 0.7, true, false, false, null)).toBeNull();
    expect(facing.releaseFacing).toBe(0.7);
    expect(facing.holdsCameraYaw).toBe(false);
  });

  it('preserves mouselook and keyboard turns in classic controls', () => {
    const facing = new MovementFacingController('woc-classic');
    const move = idle({ turnLeft: true, back: true });
    expect(facing.update(move, 0.6, false, false, false, null)).toBeNull();
    expect(facing.applyTo(move)).toEqual(idle({ turnLeft: true, back: true }));
    expect(facing.update(idle(), 0.8, false, true, false, null)).toBe(0.8);
    expect(facing.update(idle(), 0.9, false, false, false, null)).toBeNull();
    expect(facing.releaseFacing).toBe(0.9);
  });
});
