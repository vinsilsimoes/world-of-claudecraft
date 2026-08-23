import { hasStreamerLink } from '../src/sim/account_flair';
import { MOBS } from '../src/sim/data';
import { publicInstanceView } from '../src/sim/item_instance_transfer';
import type { Entity } from '../src/sim/types';

/** Append render-only identity fields that change only with an entity's visual identity. */
export function appendEntityPresentationIdentity(
  out: Record<string, unknown>,
  entity: Entity,
): void {
  if (entity.kind === 'mob' && MOBS[entity.templateId] === undefined) {
    if (entity.mobFamily) out.mfr = entity.mobFamily;
    if (entity.mobElite) out.mel = 1;
    if (entity.mobBoss) out.mbs = 1;
  }
  if (entity.skinCatalog === 'mech') out.cat = 'mech';
  if (entity.skin) out.sk = entity.skin;
  if (entity.mountKey) out.mnt = entity.mountKey;
  if (entity.mainhandItemId) out.mh = entity.mainhandItemId;
  if (entity.offhandItemId) out.oh = entity.offhandItemId;
  if (entity.weaponSkinId) out.wsk = entity.weaponSkinId;
  if (
    Number.isInteger(entity.mir4VisualClassId) &&
    Number(entity.mir4VisualClassId) >= 1 &&
    Number(entity.mir4VisualClassId) <= 5
  ) {
    out.mvc = entity.mir4VisualClassId;
    out.mva = Math.max(0, Math.min(15, Math.floor(entity.mir4VisualArmorMask ?? 0)));
  }
}

/** Complete rarely-changing entity identity projection for the snapshot cache. */
export function entityIdentityFields(entity: Entity): Record<string, unknown> {
  const out: Record<string, unknown> = {
    k: entity.kind,
    tid: entity.templateId,
    nm: entity.name,
    lv: entity.level,
  };
  appendEntityPresentationIdentity(out, entity);
  if (entity.kind === 'player') {
    const equipment = entity.equippedItems;
    for (const _ in equipment) {
      out.eq = equipment;
      break;
    }
    let publicInstances: Record<string, unknown> | undefined;
    for (const [slot, instance] of Object.entries(entity.equippedInstances)) {
      if (!instance) continue;
      const publicInstance = publicInstanceView(instance);
      for (const _ in publicInstance) {
        if (publicInstances === undefined) publicInstances = {};
        publicInstances[slot] = publicInstance;
        break;
      }
    }
    if (publicInstances) out.eqi = publicInstances;
  }
  if (entity.holderTier) out.ht = entity.holderTier;
  if (entity.holderBalance) out.hb = Math.round(entity.holderBalance);
  if (entity.discordTier) out.dt = entity.discordTier;
  if (entity.discordAvatar) out.dav = entity.discordAvatar;
  if (entity.discordName) out.dnm = entity.discordName;
  if (entity.discordJoined) out.dj = entity.discordJoined;
  if (entity.discordRole) out.dr = entity.discordRole;
  if (entity.devTier) out.dvt = entity.devTier;
  if (entity.devMergedPrs) out.dvc = entity.devMergedPrs;
  if (entity.githubLogin) out.dgl = entity.githubLogin;
  if (entity.curatorRank) {
    out.crk = entity.curatorRank;
    if (entity.relicsOwned) out.cro = entity.relicsOwned;
    if (entity.relicsTotal) out.crt = entity.relicsTotal;
  }
  if (entity.aiAccount) out.ai = 1;
  if (entity.cheaterMark) out.chm = 1;
  if (entity.streamerLinks && hasStreamerLink(entity.streamerLinks)) out.slk = entity.streamerLinks;
  if (entity.guild) out.gd = entity.guild;
  if (entity.title) out.title = entity.title;
  if (entity.border) out.border = entity.border;
  if (entity.dungeonId) out.dgn = entity.dungeonId;
  if (entity.riftTier) out.rt = entity.riftTier;
  if (entity.objectItemId) out.obj = entity.objectItemId;
  if (entity.scale !== 1) out.sc = entity.scale;
  if (entity.color !== 0xffffff) out.c = entity.color;
  return out;
}

/** Append short-lived presentation state that belongs on the per-tick entity delta. */
export function appendEntityPresentationDynamic(
  out: Record<string, unknown>,
  entity: Entity,
): void {
  if (entity.mir4Shield && entity.mir4Shield.remaining > 0) {
    out.msh = [Math.round(entity.mir4Shield.remaining * 100) / 100, entity.mir4Shield.magnitude];
  }
}
