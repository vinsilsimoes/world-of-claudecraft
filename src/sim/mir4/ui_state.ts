// Host-neutral, authoritative read model for MIR4 UI providers. Offline builds
// it from PlayerMeta through the persistence sanitizer; online receives the
// exact same shape in the self snapshot.

import type { Mir4ClassId } from '../content/mir4/classes';
import type { GameProfile } from '../game_profile';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { Entity } from '../types';
import type { Mir4NarrativeDialogueState } from './narrative_dialogue';
import {
  type Mir4PersistedPlayerState,
  type Mir4PersistenceMeta,
  serializeMir4PlayerState,
} from './persistence';

export interface Mir4PlayerUiState extends Mir4PersistedPlayerState {
  classId: Mir4ClassId;
  /** Derived from the authoritative Entity. It is never persisted in MIR4 JSON. */
  playerLevel?: number;
  /** Host capability only. It is projected to UI state but never persisted. */
  fullCampaignAvailable?: boolean;
  /** Exact progressively approved campaign maps exposed by this host. */
  campaignMapIds?: readonly string[];
  ultimateGauge: number;
  /** Session-only authoritative story gate for Auto Mission. */
  mir4NarrativeDialogue?: Mir4NarrativeDialogueState;
}

export function projectMir4PlayerUiState(
  profile: GameProfile,
  meta: Mir4PersistenceMeta | undefined,
  mir4: Entity['mir4'],
  playerLevel = 1,
  fullCampaignAvailable = false,
  ultimateGauge = 0,
  campaignMapIds: readonly string[] = [],
): Mir4PlayerUiState | null {
  if (profile !== MIR4_GAME_PROFILE || !meta || !mir4) return null;
  return {
    classId: mir4.classId as Mir4ClassId,
    playerLevel: Math.max(1, Math.floor(playerLevel)),
    fullCampaignAvailable,
    campaignMapIds: [...campaignMapIds],
    ultimateGauge: Math.max(0, Math.min(100, Math.floor(ultimateGauge))),
    ...serializeMir4PlayerState(meta, mir4.classId as Mir4ClassId),
    ...(meta.mir4NarrativeDialogue
      ? { mir4NarrativeDialogue: { ...meta.mir4NarrativeDialogue } }
      : {}),
  };
}
