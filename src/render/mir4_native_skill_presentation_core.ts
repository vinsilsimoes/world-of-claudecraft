interface Mir4NativePresentationContactBase {
  readonly attackId: number;
  readonly offsetMs: number;
  readonly damageCoefficient: number;
}

export type Mir4NativePresentationContact = Mir4NativePresentationContactBase &
  (
    | {
        readonly shape: 'direct';
        readonly minReachYards?: number;
        readonly reachYards: number;
        readonly widthYards: number;
      }
    | {
        readonly shape: 'circle';
        readonly centerOffsetYards: number;
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'sector';
        readonly centerOffsetYards?: number;
        readonly radiusYards: number;
        readonly angleDegrees: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'target-circle';
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'fixed-circle';
        readonly x: number;
        readonly y: number;
        readonly z: number;
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'chain';
        readonly fromEntityId: number;
        readonly toEntityId: number;
        readonly jumpRadiusYards: number;
        readonly heightYards: number;
      }
  );

export interface Mir4NativePresentationSourcePose {
  x: number;
  y: number;
  z: number;
  facing: number;
}

interface Mir4NativePresentationContactVisualBase {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly power: number;
}

export type Mir4NativePresentationContactVisual = Mir4NativePresentationContactVisualBase &
  (
    | { readonly shape: 'direct'; readonly slashScale: number }
    | {
        readonly shape: 'circle';
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'sector';
        readonly facing: number;
        readonly radiusYards: number;
        readonly angleDegrees: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'target-circle';
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'fixed-circle';
        readonly radiusYards: number;
        readonly heightYards: number;
      }
    | {
        readonly shape: 'chain';
        readonly fromEntityId: number;
        readonly toEntityId: number;
      }
  );

export interface Mir4NativePresentationContactRange {
  readonly start: number;
  readonly end: number;
}

export interface Mir4NativeSkillFacingLock {
  readonly facing: number;
  readonly until: number;
}

/** Half-width 1.15 is the pooled horizontal slash primitive's native span. */
const HORIZONTAL_SLASH_HALF_SPAN = 1.15;

/**
 * Aeldrune characters expose normalized body height instead of MIR4 socket
 * transforms. The standing head height is already calibrated at 0.86.
 */
export function mir4NativeSkillSourceSocketHeightFraction(socketName: string): number | null {
  if (socketName === 'head') return 0.86;
  if (socketName === 'Hand_L' || socketName === 'Hand_R') return 0.62;
  return null;
}

export function mir4NativeSkillPresentationContactRange(
  previousElapsedMs: number,
  elapsedMs: number,
  contacts: readonly Mir4NativePresentationContact[],
): Mir4NativePresentationContactRange {
  let start = 0;
  while (start < contacts.length && contacts[start].offsetMs <= previousElapsedMs) start += 1;
  let end = start;
  while (end < contacts.length && contacts[end].offsetMs <= elapsedMs) end += 1;
  return { start, end };
}

export function mir4NativeSkillContactVisual(
  contact: Mir4NativePresentationContact,
  baseDamageCoefficient: number,
  source: Mir4NativePresentationSourcePose,
  target?: Mir4NativePresentationSourcePose,
): Mir4NativePresentationContactVisual {
  const anchor =
    contact.shape === 'target-circle' || contact.shape === 'chain'
      ? (target ?? source)
      : contact.shape === 'fixed-circle'
        ? contact
        : source;
  const forwardOffset =
    contact.shape === 'direct'
      ? ((contact.minReachYards ?? 0) + contact.reachYards) * 0.5
      : contact.shape === 'circle'
        ? contact.centerOffsetYards
        : contact.shape === 'sector'
          ? (contact.centerOffsetYards ?? 0)
          : 0;
  const facing =
    contact.shape === 'fixed-circle'
      ? 0
      : contact.shape === 'target-circle'
        ? (target ?? source).facing
        : source.facing;
  const position = {
    x: anchor.x + Math.sin(facing) * forwardOffset,
    y: anchor.y,
    z: anchor.z + Math.cos(facing) * forwardOffset,
    power: baseDamageCoefficient > 0 ? contact.damageCoefficient / baseDamageCoefficient : 1,
  };
  if (contact.shape === 'sector') {
    return {
      ...position,
      shape: 'sector',
      facing: source.facing,
      radiusYards: contact.radiusYards,
      angleDegrees: contact.angleDegrees,
      heightYards: contact.heightYards,
    };
  }
  if (
    contact.shape === 'circle' ||
    contact.shape === 'target-circle' ||
    contact.shape === 'fixed-circle'
  ) {
    return {
      ...position,
      shape: contact.shape,
      radiusYards: contact.radiusYards,
      heightYards: contact.heightYards,
    };
  }
  if (contact.shape === 'chain') {
    return {
      ...position,
      shape: 'chain',
      fromEntityId: contact.fromEntityId,
      toEntityId: contact.toEntityId,
    };
  }
  return {
    ...position,
    shape: 'direct',
    slashScale: contact.widthYards / (HORIZONTAL_SLASH_HALF_SPAN * 2),
  };
}

export function mir4NativeSkillPresentationOwnsAbilityVfx(
  abilityId: string | null | undefined,
): boolean {
  return (
    abilityId === 'mir4_skill_1101' ||
    abilityId === 'mir4_skill_1102' ||
    abilityId === 'mir4_skill_1201' ||
    abilityId === 'mir4_skill_2101' ||
    abilityId === 'mir4_skill_2111' ||
    abilityId === 'mir4_skill_2201' ||
    abilityId === 'mir4_skill_2202' ||
    abilityId === 'mir4_skill_2203' ||
    abilityId === 'mir4_skill_2301' ||
    abilityId === 'mir4_skill_2303' ||
    abilityId === 'mir4_skill_2501' ||
    abilityId === 'mir4_skill_2503' ||
    abilityId === 'mir4_skill_3104' ||
    abilityId === 'mir4_skill_3201' ||
    abilityId === 'mir4_skill_3301' ||
    abilityId === 'mir4_skill_3506' ||
    abilityId === 'mir4_skill_3501' ||
    abilityId === 'mir4_skill_3503' ||
    abilityId === 'mir4_skill_3504' ||
    abilityId === 'mir4_skill_3505' ||
    abilityId === 'mir4_skill_3101' ||
    abilityId === 'mir4_skill_3103' ||
    abilityId === 'mir4_skill_3203' ||
    abilityId === 'mir4_skill_3404' ||
    abilityId === 'mir4_skill_4101' ||
    abilityId === 'mir4_skill_4102' ||
    abilityId === 'mir4_skill_4103' ||
    abilityId === 'mir4_skill_4104' ||
    abilityId === 'mir4_skill_4107' ||
    abilityId === 'mir4_skill_4108' ||
    abilityId === 'mir4_skill_4109' ||
    abilityId === 'mir4_skill_4110' ||
    abilityId === 'mir4_skill_4111' ||
    abilityId === 'mir4_skill_4112' ||
    abilityId === 'mir4_skill_4106' ||
    abilityId === 'mir4_skill_5101' ||
    abilityId === 'mir4_skill_5102' ||
    abilityId === 'mir4_skill_5103' ||
    abilityId === 'mir4_skill_5104' ||
    abilityId === 'mir4_skill_5301' ||
    abilityId === 'mir4_skill_5303' ||
    abilityId === 'mir4_skill_5401' ||
    abilityId === 'mir4_skill_5403' ||
    abilityId === 'mir4_skill_5201' ||
    abilityId === 'mir4_skill_5202' ||
    abilityId === 'mir4_skill_5205' ||
    abilityId === 'mir4_skill_5304' ||
    abilityId === 'mir4_ultimate_1' ||
    abilityId === 'mir4_ultimate_2' ||
    abilityId === 'mir4_ultimate_3' ||
    abilityId === 'mir4_ultimate_4' ||
    abilityId === 'mir4_ultimate_5'
  );
}

/**
 * The simulation turns to the target at commit. Keep the visual body on that
 * exact yaw through the native end-cut instead of letting travel smoothing
 * show the old movement direction during the first contacts.
 */
export function mir4NativeSkillFacingLock(
  event: Mir4SkillPresentationEvent,
  nowSeconds: number,
): Mir4NativeSkillFacingLock | null {
  if (
    (event.profile !== 'warrior-overdrive' &&
      event.profile !== 'warrior-air-slash' &&
      event.profile !== 'warrior-iron-shackle' &&
      event.profile !== 'warrior-dragon-flame' &&
      event.profile !== 'sorcerer-flame-orb' &&
      event.profile !== 'sorcerer-frost-orb' &&
      event.profile !== 'sorcerer-blizzard' &&
      event.profile !== 'sorcerer-thunderstorm' &&
      event.profile !== 'sorcerer-dark-vortex' &&
      event.profile !== 'sorcerer-dragon-tornado' &&
      event.profile !== 'taoist-light-ray' &&
      event.profile !== 'sorcerer-magic-shield' &&
      event.profile !== 'sorcerer-chain-lightning' &&
      event.profile !== 'sorcerer-flame-strike' &&
      event.profile !== 'sorcerer-frozen-block' &&
      event.profile !== 'taoist-rain-of-blades' &&
      event.profile !== 'taoist-tai-chi' &&
      event.profile !== 'taoist-moonlight-orb' &&
      event.profile !== 'taoist-moonlight-wave' &&
      event.profile !== 'taoist-guardian-circle' &&
      event.profile !== 'taoist-heal' &&
      event.profile !== 'taoist-greater-heal' &&
      event.profile !== 'taoist-blasting-charm' &&
      event.profile !== 'taoist-piercing-blades' &&
      event.profile !== 'taoist-soaring-slash' &&
      event.profile !== 'taoist-expulsion-circle' &&
      event.profile !== 'taoist-sunbeam-sword' &&
      event.profile !== 'arbalist-quick-shot' &&
      event.profile !== 'arbalist-illusion-arrow' &&
      event.profile !== 'arbalist-burst-shell' &&
      event.profile !== 'arbalist-venom-mist-shell' &&
      event.profile !== 'arbalist-ice-cage' &&
      event.profile !== 'arbalist-flash-arrow' &&
      event.profile !== 'arbalist-heavenly-bow' &&
      event.profile !== 'arbalist-seeking-bolt' &&
      event.profile !== 'arbalist-obliterate-shell' &&
      event.profile !== 'arbalist-minds-eye' &&
      event.profile !== 'arbalist-cloaking' &&
      event.profile !== 'arbalist-painstrike-gale' &&
      event.profile !== 'arbalist-arrow-rain' &&
      event.profile !== 'lancer-crescent-blade' &&
      event.profile !== 'lancer-dragon-tail' &&
      event.profile !== 'lancer-ascending-dragon' &&
      event.profile !== 'lancer-nirvana-kick' &&
      event.profile !== 'lancer-double-strike' &&
      event.profile !== 'lancer-crushing-blow' &&
      event.profile !== 'lancer-sweeping-storm' &&
      event.profile !== 'lancer-wind-wall' &&
      event.profile !== 'lancer-ravaging-blow' &&
      event.profile !== 'lancer-dragon-spear' &&
      event.profile !== 'lancer-absorption' &&
      event.profile !== 'lancer-piercing-spear') ||
    !Number.isFinite(event.sourceFacing) ||
    !Number.isFinite(nowSeconds) ||
    event.endCutMs <= 0
  ) {
    return null;
  }
  return {
    facing: event.sourceFacing,
    until: nowSeconds + event.endCutMs / 1000,
  };
}

export function mir4NativeSkillFacingLockValue(
  lock: Mir4NativeSkillFacingLock | null | undefined,
  nowSeconds: number,
): number | null {
  return lock && Number.isFinite(nowSeconds) && nowSeconds < lock.until ? lock.facing : null;
}

import type { SimEvent } from '../sim/types';

type Mir4SkillPresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;
