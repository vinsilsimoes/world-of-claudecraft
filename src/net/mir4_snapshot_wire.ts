// MIR4 self-snapshot decoder. The online client treats malformed additions as
// an ignored delta, never as authority to clear or grant profile state.

import { type GameProfile, MIR4_GAME_PROFILE } from '../game_profile';
import type { KnownAbility } from '../sim/content/classes';
import { mir4LevelRow } from '../sim/content/mir4';
import type { Mir4ClassId } from '../sim/content/mir4/classes';
import { MIR4_WORLD_ARC } from '../sim/content/mir4/world_arc';
import { mir4ActionAbilities } from '../sim/mir4/action_abilities';
import {
  type Mir4NarrativeDialogueState,
  sanitizeMir4NarrativeDialogue,
} from '../sim/mir4/narrative_dialogue';
import { type Mir4PersistedPlayerState, sanitizeMir4PlayerState } from '../sim/mir4/persistence';
import { MIR4_LEVEL_COL, mir4ClassKeyForId, recalcMir4PlayerStats } from '../sim/mir4/stats';
import type { Entity } from '../sim/types';

export interface Mir4SnapshotState extends Mir4PersistedPlayerState {
  classId: Mir4ClassId;
  /** Derived from the self Entity, not decoded from the MIR4 wire payload. */
  playerLevel?: number;
  /** Authoritative host capability, projected on the MIR4 self payload. */
  fullCampaignAvailable?: boolean;
  campaignMapIds?: readonly string[];
  ultimateGauge: number;
  mir4NarrativeDialogue?: Mir4NarrativeDialogueState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMir4ClassId(value: unknown): value is Mir4ClassId {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

export function decodeMir4Snapshot(value: unknown): Mir4SnapshotState | null {
  if (!isRecord(value) || !isMir4ClassId(value.classId)) return null;
  const receivedMapIds = Array.isArray(value.campaignMapIds)
    ? new Set(value.campaignMapIds.filter((entry): entry is string => typeof entry === 'string'))
    : null;
  const narrativeDialogue = sanitizeMir4NarrativeDialogue(value.mir4NarrativeDialogue);
  // Omission authoritatively clears the transient. A present-but-malformed
  // addition invalidates the whole delta so it cannot erase a valid prior
  // dialogue (or partially mutate any other MIR4 state).
  if (Object.hasOwn(value, 'mir4NarrativeDialogue') && !narrativeDialogue) {
    return null;
  }
  return {
    classId: value.classId,
    ...(typeof value.fullCampaignAvailable === 'boolean'
      ? { fullCampaignAvailable: value.fullCampaignAvailable }
      : {}),
    ...(receivedMapIds
      ? {
          campaignMapIds: MIR4_WORLD_ARC.map((map) => map.mapId).filter((mapId) =>
            receivedMapIds.has(mapId),
          ),
        }
      : {}),
    ultimateGauge: Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(value.ultimateGauge) ? Math.floor(Number(value.ultimateGauge)) : 0,
      ),
    ),
    ...sanitizeMir4PlayerState(value, value.classId),
    ...(narrativeDialogue ? { mir4NarrativeDialogue: narrativeDialogue } : {}),
  };
}

export function applyMir4SnapshotDelta(
  value: unknown,
  entity: Entity,
  previous: Mir4SnapshotState | null,
): Mir4SnapshotState | null {
  const decoded = decodeMir4Snapshot(value);
  if (!decoded) return previous ? { ...previous, playerLevel: entity.level } : previous;
  entity.mir4UltGauge = decoded.ultimateGauge;
  recalcMir4PlayerStats(
    entity,
    mir4ClassKeyForId(decoded.classId),
    entity.level,
    decoded.mir4Equipment,
    decoded.mir4EquipmentInstances,
    decoded.mir4Spirits,
    decoded.mir4Mounts,
  );
  return { ...decoded, playerLevel: entity.level };
}

export function mir4SnapshotActionAbilities(
  profile: GameProfile | undefined,
  snapshot: Mir4SnapshotState | null,
  level: number,
): KnownAbility[] | null {
  if (profile !== MIR4_GAME_PROFILE || !snapshot) return null;
  const row = mir4LevelRow(snapshot.classId, level);
  return mir4ActionAbilities(
    snapshot.classId,
    level,
    snapshot.mir4SkillLevels,
    row?.[MIR4_LEVEL_COL.manaCost] ?? 0,
  );
}
