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

export function mir4ControlFamilyOf(kind: Mir4EffectKind): Mir4ControlFamily | null {
  if (kind === 'stun') return 'stun';
  if (kind === 'knockdown') return 'knockdown';
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
): number {
  const ids = CONTROL_STATUS_IDS[family];
  const contextIds = targetKind === 'player' ? ids.pvp : ids.monster;
  const success =
    mir4StatusRecordValue(attacker, ids.general[0]) +
    mir4StatusRecordValue(attacker, contextIds[0]);
  const resistance =
    mir4StatusRecordValue(defender, ids.general[1]) +
    mir4StatusRecordValue(defender, contextIds[1]);
  return mir4StunChanceBps(baseBps, success, resistance);
}

export function mir4ControlDurationMs(
  baseDurationMs: number,
  family: Mir4ControlFamily,
  attacker: Mir4StatusRecord | undefined,
): number {
  const statusId =
    family === 'stun' ? 153 : family === 'debilitation' ? 154 : family === 'silence' ? 155 : 0;
  const boost = statusId === 0 ? 0 : mir4StatusRecordValue(attacker, statusId);
  return Math.max(0, Math.floor((Math.max(0, baseDurationMs) * (10_000 + boost)) / 10_000));
}
