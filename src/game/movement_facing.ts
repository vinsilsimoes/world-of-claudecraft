import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import type { MoveInput } from '../sim/types';
import { isCameraDrivenFacingActive } from './camera_driven_facing';
import { wrapAngle } from './camera_follow';
import { mouselookReleaseFacing } from './mouselook_release';

/** Local input, not a predicted outcome. Aeldrune uses camera-relative travel:
 * turn toward the requested direction and walk forward along it. The camera
 * never follows that turn, including delayed server echoes after key release.
 * Classic controls keep their original strafe/backpedal and mouselook rules. */
export class MovementFacingController {
  readonly travelFacing: boolean;
  private facing: number | null = null;
  private blocked = false;
  releaseFacing: number | null = null;

  constructor(profile: GameProfile | undefined) {
    this.travelFacing = profile === MIR4_GAME_PROFILE;
  }

  get holdsCameraYaw(): boolean {
    return this.travelFacing || this.facing !== null;
  }

  reset(): void {
    this.facing = null;
    this.releaseFacing = null;
    this.blocked = false;
  }

  /** Call once per input frame. The caller latches releaseFacing until its
   * offline tick or online input flush consumes it, even on a zero-tick frame. */
  update(
    input: MoveInput,
    camYaw: number,
    mouseCamera: boolean,
    mouselook: boolean,
    blocked: boolean,
    controllerFacing: number | null,
  ): number | null {
    const previous = this.facing;
    this.releaseFacing = null;
    if (blocked || (this.travelFacing && controllerFacing !== null)) {
      this.reset();
      this.blocked = blocked;
      return null;
    }
    this.blocked = false;
    if (this.travelFacing) {
      const x = Number(input.strafeRight) - Number(input.strafeLeft);
      const z = Number(input.forward) - Number(input.back);
      this.facing = x !== 0 || z !== 0 ? wrapAngle(camYaw - Math.atan2(x, z)) : null;
      if (this.facing === null) this.releaseFacing = previous;
    } else {
      const moving = input.forward || input.back || input.strafeLeft || input.strafeRight;
      const active = isCameraDrivenFacingActive(mouseCamera, moving, mouselook, false);
      this.facing = active ? camYaw : null;
      this.releaseFacing = mouselookReleaseFacing(previous !== null, active, camYaw);
    }
    return this.facing;
  }

  /** Input.readMoveInput returns a caller-owned copy. Remap only that copy,
   * before click-move composition; never remap a scripted controller heading.
   * Facing + forward use the existing wire/kernel and normal running speed in
   * every direction. Leaving back set would reverse the heading a second time. */
  applyTo(input: MoveInput): MoveInput {
    if (this.travelFacing && (this.blocked || this.facing !== null)) {
      // Do not resume raw backpedal against an already-reversed travel heading
      // when the server's stun ends before the client receives that snapshot.
      input.forward = !this.blocked;
      input.back = false;
      input.strafeLeft = false;
      input.strafeRight = false;
      input.turnLeft = false;
      input.turnRight = false;
    }
    return input;
  }
}
