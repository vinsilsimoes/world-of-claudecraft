import type { MoveInput } from '../sim/types';

export type Mir4AutomationMovementInput = Pick<
  MoveInput,
  'forward' | 'back' | 'strafeLeft' | 'strafeRight' | 'turnLeft' | 'turnRight'
>;

export interface Mir4AutomationSuspensionState {
  autoBattle?: { suspended?: boolean };
  mir4AutoQuest?: { suspended?: boolean };
}

export interface Mir4AutomationWorld {
  mir4AutoBattleActive(): boolean;
  mir4AutoQuestActive(): boolean;
  mir4PlayerState(): Mir4AutomationSuspensionState | null;
}

/** MIR4 automation owns both locomotion and facing until the player issues a
 * manual movement command. Camera orbit alone must not turn an auto-attacking
 * character away from its authoritative target. */
export function mir4AutomationOwnsMotion(
  autoBattleActive: boolean,
  autoQuestActive: boolean,
  input: Mir4AutomationMovementInput,
  automationSuspended = false,
): boolean {
  return (
    (autoBattleActive || autoQuestActive) &&
    !automationSuspended &&
    !input.forward &&
    !input.back &&
    !input.strafeLeft &&
    !input.strafeRight &&
    !input.turnLeft &&
    !input.turnRight
  );
}

export function mir4WorldAutomationOwnsMotion(
  world: Mir4AutomationWorld,
  input: Mir4AutomationMovementInput,
  state: Mir4AutomationSuspensionState | null = world.mir4PlayerState(),
): boolean {
  return mir4AutomationOwnsMotion(
    world.mir4AutoBattleActive(),
    world.mir4AutoQuestActive(),
    input,
    state?.autoBattle?.suspended === true || state?.mir4AutoQuest?.suspended === true,
  );
}

/** The predictor reproduces local input. Server-owned MIR4 automation has no
 * matching local intent, so predicting it as idle creates a correction pulse
 * on every snapshot. Those modes use authoritative interpolation instead. */
export function selfMotionPredictionEnabled(
  baseEnabled: boolean,
  automationOwnsMotion: boolean,
): boolean {
  return baseEnabled && !automationOwnsMotion;
}

/** A server-owned mover has no local intent to extrapolate. Rendering it with
 * the normal self lead reaches alpha 1.25 early, pauses, then advances again
 * on the next 20 Hz snapshot — the visible camera pulse. Use ordinary
 * snapshot interpolation while automation owns motion. */
export function selfAlphaLeadForMotionOwner(
  baseLead: number,
  automationOwnsMotion: boolean,
): number {
  return automationOwnsMotion ? 0 : baseLead;
}

/** Lead and fallback smoothing are separate decisions. Server-owned motion
 * needs zero lead to avoid snapshot pulses, but keeps the short fallback
 * smoother so predictor-to-authority ownership handoff cannot snap backward. */
export function selfFallbackSmoothingEnabled(
  alphaLead: number,
  automationOwnsMotion: boolean,
): boolean {
  return alphaLead > 0 || automationOwnsMotion;
}

export interface SelfMotionPredictionGate {
  spectating: boolean;
  movementFrozen: boolean;
  immobilized: boolean;
  instancedCollision: boolean;
  climbing: boolean;
  automationOwnsMotion: boolean;
}

export function selfMotionPredictionAllowed(gate: SelfMotionPredictionGate): boolean {
  return selfMotionPredictionEnabled(
    !gate.spectating &&
      !gate.movementFrozen &&
      !gate.immobilized &&
      !gate.instancedCollision &&
      !gate.climbing,
    gate.automationOwnsMotion,
  );
}

/** Allocation-free scalar adapter for the animation-frame firewall. */
export function selfMotionPredictionAllowedFor(
  spectating: boolean,
  movementFrozen: boolean,
  immobilized: boolean,
  instancedCollision: boolean,
  climbing: boolean,
  automationOwnsMotion: boolean,
): boolean {
  return selfMotionPredictionEnabled(
    !spectating && !movementFrozen && !immobilized && !instancedCollision && !climbing,
    automationOwnsMotion,
  );
}
