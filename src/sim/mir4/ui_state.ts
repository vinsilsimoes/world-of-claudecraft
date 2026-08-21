// Host-neutral, authoritative read model for MIR4 UI providers. Offline builds
// it from PlayerMeta through the persistence sanitizer; online receives the
// exact same shape in the self snapshot.

import type { Mir4ClassId } from '../content/mir4/classes';
import type { GameProfile } from '../game_profile';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { Entity } from '../types';
import {
  type Mir4PersistedPlayerState,
  type Mir4PersistenceMeta,
  serializeMir4PlayerState,
} from './persistence';

export interface Mir4PlayerUiState extends Mir4PersistedPlayerState {
  classId: Mir4ClassId;
  ultimateGauge: number;
}

export function projectMir4PlayerUiState(
  profile: GameProfile,
  meta: Mir4PersistenceMeta | undefined,
  mir4: Entity['mir4'],
  ultimateGauge = 0,
): Mir4PlayerUiState | null {
  if (profile !== MIR4_GAME_PROFILE || !meta || !mir4) return null;
  return {
    classId: mir4.classId as Mir4ClassId,
    ultimateGauge: Math.max(0, Math.min(100, Math.floor(ultimateGauge))),
    ...serializeMir4PlayerState(meta, mir4.classId as Mir4ClassId),
  };
}
