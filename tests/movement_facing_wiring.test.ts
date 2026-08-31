import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { codeWithoutLineComments } from './helpers/code_without_line_comments';

// The behavioral tests exercise the pure controls and renderer state. These
// pins cover their actual frame-loop adapters, which require a live WebGL HUD.
const read = (file: string): string =>
  codeWithoutLineComments(readFileSync(new URL(file, import.meta.url), 'utf8'));
const main = read('../src/main.ts');
const renderer = read('../src/render/renderer.ts');

describe('travel facing frame-loop integration', () => {
  it('selects by the real gameplay profile and normalizes input before click composition', () => {
    expect(main).toContain('new MovementFacingController(world.cfg.gameProfile)');
    const resolver = main.slice(
      main.indexOf('function resolveMove('),
      main.indexOf('function visualFacingFor('),
    );
    expect(resolver).toContain('cameraMovement.applyTo(input.readMoveInput())');
    expect(resolver).toContain('!cameraMovement.travelFacing && mouselook ? input.camYaw : null');
  });

  it('blocks manual heading on death/frozen input and on MIR4 stun', () => {
    expect(main).toMatch(
      /const facingBlocked\s*=\s*movementFrozen\(\)\s*\|\|\s*\(cameraMovement\.travelFacing\s*&&\s*isStunned\(world\.player\)\)/,
    );
    expect(main).toMatch(
      /cameraMovement\.update\([\s\S]*?input\.isMouselookActive\(\),\s*facingBlocked,\s*controllerFacing/,
    );
    expect(main).toMatch(
      /if \(facingBlocked \|\| renderFacing !== null \|\| controllerFacing !== null\)\s*\{\s*pendingReleaseFacing = null/,
    );
  });

  it('keeps camera follow independent and avoids applying the legacy diagonal offset twice', () => {
    expect(main).toContain('cameraDriven: cameraMovement.holdsCameraYaw');
    expect(main).toMatch(
      /!movementFrozen\(\) && !cameraMovement\.travelFacing\s*\? diagonalMovementVisualFacing/,
    );
  });

  it('passes the actual last mesh yaw into the profile-aware visual smoother', () => {
    expect(renderer).toMatch(
      /this\.selfFacing\.step\(\s*v\.group\.rotation\.y,\s*facing,\s*renderFacingOverride,\s*dt,\s*sim\.cfg\.gameProfile === 'mir4-gameplay-port' \? 'travel' : 'camera'/,
    );
  });

  it('allows release echo holding only for online manual non-spectating MIR4 input', () => {
    const online = main.slice(main.indexOf('const onlineRenderFacing ='));
    expect(online).toMatch(
      /renderer\.sync\([\s\S]*?cameraMovement\.travelFacing\s*&&\s*!facingBlocked\s*&&\s*!automationOwnsMotion\s*&&\s*net\.spectating === null/,
    );
    expect(renderer).toContain('allowFacingReleaseHold = false');
    expect(renderer).toContain(
      'allowFacingReleaseHold && !p.autoAttack && p.castingAbility === null',
    );
  });

  it('never streams visual echo corrections or feeds them into motion prediction', () => {
    expect(main).toContain('net.setMouselookFacing(netFacing)');
    expect(main).toMatch(
      /selfMotionFrameBuffer\.write\(\s*predictSelfMotion,\s*resolved\.mi,\s*netFacing \?\? interpServerFacing/,
    );
    expect(main).not.toContain('selfFacing.step(');
  });

  it('resets visual state for character changes and authoritative discontinuities', () => {
    expect(renderer).toMatch(
      /if \(this\.lastSelfId !== p\.id\) \{\s*this\.lastSelfId = p\.id;\s*this\.selfRenderPositionReady = false;\s*this\.selfFacing\.reset\(\)/,
    );
    expect(renderer).toContain('if (selfAuthoritativeDiscontinuity) this.selfFacing.reset();');
  });
});
