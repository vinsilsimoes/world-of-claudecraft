// MIR4 self-snapshot decoder. The online client treats malformed additions as
// an ignored delta, never as authority to clear or grant profile state.

import { type GameProfile, MIR4_GAME_PROFILE } from '../game_profile';
import type { KnownAbility } from '../sim/content/classes';
import { mir4LevelRow } from '../sim/content/mir4';
import type { Mir4ClassId } from '../sim/content/mir4/classes';
import { MIR4_WORLD_ARC } from '../sim/content/mir4/world_arc';
import { mir4ActionAbilities } from '../sim/mir4/action_abilities';
import { sanitizeMir4DisabledAutoSkills } from '../sim/mir4/auto_skills';
import { type Mir4CodexState, sanitizeMir4CodexState } from '../sim/mir4/codex';
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
  if (Object.hasOwn(value, 'mir4DisabledAutoSkills')) {
    if (!Array.isArray(value.mir4DisabledAutoSkills)) return null;
    const disabledAutoSkills = new Set(
      sanitizeMir4DisabledAutoSkills(value.mir4DisabledAutoSkills, value.classId) ?? [],
    );
    if (
      value.mir4DisabledAutoSkills.some(
        (skillId) => !Number.isSafeInteger(skillId) || !disabledAutoSkills.has(skillId as number),
      )
    ) {
      return null;
    }
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
  const next: Mir4SnapshotState = {
    ...decoded,
    ...(previous?.mir4Codex ? { mir4Codex: previous.mir4Codex } : {}),
    playerLevel: entity.level,
  };
  entity.mir4UltGauge = decoded.ultimateGauge;
  recalcMir4SnapshotPlayerStats(entity, next);
  return next;
}

/** Rebuilds the client Entity from the fully merged aggregate + dedicated Codex deltas. */
export function recalcMir4SnapshotPlayerStats(entity: Entity, snapshot: Mir4SnapshotState): void {
  recalcMir4PlayerStats(
    entity,
    mir4ClassKeyForId(snapshot.classId),
    entity.level,
    snapshot.mir4Equipment,
    snapshot.mir4EquipmentInstances,
    snapshot.mir4Spirits,
    snapshot.mir4Mounts,
    snapshot.mir4Codex,
    snapshot.mir4ArcRewards?.items,
    snapshot.mir4Training,
  );
}

export function applyMir4CodexSnapshotDelta(
  value: unknown,
  previous: Mir4CodexState | undefined,
): Mir4CodexState | undefined {
  if (value === undefined) return previous;
  if (value === null) return undefined;
  return sanitizeMir4CodexState(value) ?? previous;
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
