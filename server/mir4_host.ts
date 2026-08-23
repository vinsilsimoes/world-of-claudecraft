import type { Mir4ClassId } from '../src/sim/content/mir4/classes';
import { MIR4_WORLD_ARC } from '../src/sim/content/mir4/world_arc';
import { type GameProfile, MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import { activateWorldForGameProfile } from '../src/sim/game_profile_world';
import type { Mir4PersistenceMeta } from '../src/sim/mir4/persistence';
import { serializeMir4PlayerState } from '../src/sim/mir4/persistence';
import { mir4WireRevision } from '../src/sim/mir4/wire_revision';
import type { Entity } from '../src/sim/types';

export type { GameProfile } from '../src/sim/game_profile';
export function gameProfileWorldConfig(profile: GameProfile) {
  return { gameProfile: profile, world: activateWorldForGameProfile(profile) };
}

type Mir4Serializer = typeof serializeMir4PlayerState;

interface CachedMir4Snapshot {
  classId: number;
  revision: number;
  ultimateGauge: number;
  campaignMapKey: string;
  json: string;
}

export class Mir4SelfWireCache {
  private readonly cache = new WeakMap<Mir4PersistenceMeta, CachedMir4Snapshot>();

  constructor(private readonly serialize: Mir4Serializer = serializeMir4PlayerState) {}

  encode(
    profile: GameProfile,
    meta: Mir4PersistenceMeta,
    mir4: Entity['mir4'],
    ultimateGauge = 0,
    campaignMapIds: readonly string[] = [],
  ): string | null {
    if (profile !== MIR4_GAME_PROFILE || !mir4) return null;
    const gauge = Math.max(0, Math.min(100, Math.floor(ultimateGauge)));
    const revision = mir4WireRevision(meta);
    const campaignMapKey = campaignMapIds.join('|');
    const cached = this.cache.get(meta);
    if (
      cached?.revision === revision &&
      cached.classId === mir4.classId &&
      cached.ultimateGauge === gauge &&
      cached.campaignMapKey === campaignMapKey
    )
      return cached.json;
    const json = JSON.stringify({
      classId: mir4.classId,
      fullCampaignAvailable: campaignMapIds.length === MIR4_WORLD_ARC.length,
      campaignMapIds,
      ultimateGauge: gauge,
      ...this.serialize(meta, mir4.classId as Mir4ClassId),
      ...(meta.mir4NarrativeDialogue ? { mir4NarrativeDialogue: meta.mir4NarrativeDialogue } : {}),
    });
    this.cache.set(meta, {
      classId: mir4.classId,
      revision,
      ultimateGauge: gauge,
      campaignMapKey,
      json,
    });
    return json;
  }
}

const MIR4_SELF_WIRE_CACHE = new Mir4SelfWireCache();

export function mir4SelfSnapshotJson(
  profile: GameProfile,
  meta: Mir4PersistenceMeta,
  mir4: Entity['mir4'],
  ultimateGauge = 0,
  campaignMapIds: readonly string[] = [],
): string | null {
  return MIR4_SELF_WIRE_CACHE.encode(profile, meta, mir4, ultimateGauge, campaignMapIds);
}
