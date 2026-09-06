// Status-backed control success and resistance projection. The effect engine
// owns immunity and duration; this module only selects the official general
// and PvP/monster status lanes used by a chance-bearing effect profile.

import type { Mir4EffectKind } from '../types';
import { type Mir4TargetKind, mir4StunChanceBps } from './math';
import { type Mir4StatusRecord, mir4StatusRecordValue } from './status_values';

export type Mir4ControlFamily = 'stun' | 'debilitation' | 'silence' | 'knockdown';

const CONTROL_STATUS_IDS: Readonly<
  Record<
    Mir4ControlFamily,
    {
      general: readonly [number, number];
      pvp: readonly [number, number];
      monster: readonly [number, number];
    }
  >
> = {
  stun: { general: [48, 49], pvp: [121, 122], monster: [129, 130] },
  debilitation: { general: [50, 51], pvp: [123, 124], monster: [131, 132] },
  silence: { general: [52, 53], pvp: [125, 126], monster: [133, 134] },
  knockdown: { general: [119, 120], pvp: [127, 128], monster: [135, 136] },
};

function contextualControlValue(
  record: Mir4StatusRecord | undefined,
  pair: readonly [number, number],
  contextPair: readonly [number, number],
  lane: 0 | 1,
): number {
  return (
    mir4StatusRecordValue(record, pair[lane]) + mir4StatusRecordValue(record, contextPair[lane])
  );
}

export function mir4ControlFamilyOf(kind: Mir4EffectKind): Mir4ControlFamily | null {
  if (kind === 'stun') return 'stun';
  if (kind === 'knockdown') return 'knockdown';
  if (kind === 'silence') return 'silence';
  if (kind === 'dazed' || kind === 'root' || kind === 'freeze' || kind === 'slow') {
    return 'debilitation';
  }
  return null;
}

export function mir4ControlChanceFromStatuses(
  baseBps: number,
  family: Mir4ControlFamily,
  attacker: Mir4StatusRecord | undefined,
  defender: Mir4StatusRecord | undefined,
  targetKind: Mir4TargetKind,
  temporaryResistanceBps = 0,
): number {
  const ids = CONTROL_STATUS_IDS[family];
  const contextIds = targetKind === 'player' ? ids.pvp : ids.monster;
  const success = contextualControlValue(attacker, ids.general, contextIds, 0);
  const resistance =
    contextualControlValue(defender, ids.general, contextIds, 1) +
    Math.trunc(temporaryResistanceBps);
  // The shared chance helper accepts non-negative lanes. Native debuffs such
  // as Blasting Charm expose signed resistance, so transpose each negative
  // lane to the opposite side while preserving base + success - resistance.
  const chance = mir4StunChanceBps(
    baseBps,
    Math.max(0, success) + Math.max(0, -resistance),
    Math.max(0, resistance) + Math.max(0, -success),
  );
  return targetKind === 'player' ? Math.min(9_500, chance) : chance;
}

export function mir4ControlDurationMs(
  baseDurationMs: number,
  family: Mir4ControlFamily,
  attacker: Mir4StatusRecord | undefined,
  defender?: Mir4StatusRecord,
  targetKind: Mir4TargetKind = 'monster',
  temporaryResistanceBps = 0,
  temporaryDurationBoostBps = 0,
): number {
  const statusId =
    family === 'stun' ? 153 : family === 'debilitation' ? 154 : family === 'silence' ? 155 : 0;
  const boost =
    (statusId === 0 ? 0 : mir4StatusRecordValue(attacker, statusId)) +
    Math.trunc(temporaryDurationBoostBps);
  const ids = CONTROL_STATUS_IDS[family];
  const contextIds = targetKind === 'player' ? ids.pvp : ids.monster;
  const resistance =
    contextualControlValue(defender, ids.general, contextIds, 1) +
    Math.trunc(temporaryResistanceBps);
  const maximumMultiplierBps = targetKind === 'player' ? 12_500 : 15_000;
  const durationMultiplierBps = Math.max(
    3_500,
    Math.min(maximumMultiplierBps, 10_000 + boost - resistance),
  );
  return Math.max(0, Math.floor((Math.max(0, baseDurationMs) * durationMultiplierBps) / 10_000));
}
