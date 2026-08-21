import type { Mir4ClassId } from '../src/sim/content/mir4/classes';
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
  ): string | null {
    if (profile !== MIR4_GAME_PROFILE || !mir4) return null;
    const gauge = Math.max(0, Math.min(100, Math.floor(ultimateGauge)));
    const revision = mir4WireRevision(meta);
    const cached = this.cache.get(meta);
    if (
      cached?.revision === revision &&
      cached.classId === mir4.classId &&
      cached.ultimateGauge === gauge
    )
      return cached.json;
    const json = JSON.stringify({
      classId: mir4.classId,
      ultimateGauge: gauge,
      ...this.serialize(meta, mir4.classId as Mir4ClassId),
    });
    this.cache.set(meta, { classId: mir4.classId, revision, ultimateGauge: gauge, json });
    return json;
  }
}

const MIR4_SELF_WIRE_CACHE = new Mir4SelfWireCache();

export function mir4SelfSnapshotJson(
  profile: GameProfile,
  meta: Mir4PersistenceMeta,
  mir4: Entity['mir4'],
  ultimateGauge = 0,
): string | null {
  return MIR4_SELF_WIRE_CACHE.encode(profile, meta, mir4, ultimateGauge);
}
