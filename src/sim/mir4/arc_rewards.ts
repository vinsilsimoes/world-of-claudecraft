// Authoritative reward ledger for the imported campaign contracts. Logical
// item ids remain progression tokens. Equipment milestones grant only the
// existing Aeldrune runtime catalog and its native presentation.

import { bagCapacity, fitsAll } from '../bags';
import { MIR4_QUESTS_ARC, type Mir4ArcQuest } from '../content/mir4/arc_campaign';
import type { Mir4ClassId } from '../content/mir4/classes';
import { MIR4_EQUIPMENT_CATALOG } from '../content/mir4/equipment_catalog';
import { MIR4_STARTER_LOADOUT_BY_CLASS } from '../content/mir4/items';
import { MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS } from '../content/mir4/starter_quest_equipment';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import {
  MIR4_EMPTY_MATERIALS,
  MIR4_MATERIAL_IDS,
  type Mir4Materials,
  mir4UnequipSlot,
} from './equipment';
import { mir4ModifiedProgressionReward } from './status_effects';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4ArcRewardState {
  items?: Record<string, number>;
  recipes?: string[];
  systems?: string[];
  cosmetics?: string[];
  tickets?: Record<string, number>;
  guarantees?: Record<string, number>;
  claimedGrantIds?: string[];
  professionXp?: number;
  recipeFragments?: number;
  cityReputation?: number;
  /** Version 2 separates quest XP from the one-billion inventory stack cap. */
  xpLedgerVersion?: number;
}

interface RewardMeta {
  copper: number;
  mir4Materials?: Mir4Materials;
  mir4ArcRewards?: Mir4ArcRewardState;
}

const MAX_COUNT = 1_000_000_000;
const XP_LEDGER_VERSION = 2;
const M01_Q03_WEAPON_GRANT_ID = 'tutorial-m01-q03-recovered-weapon';
const M01_Q03_WEAPON_PRESENTED_GRANT_ID = 'tutorial-m01-q03-recovered-weapon-presented';
const M04_Q03_ENHANCEMENT_RECOVERY_GRANT_ID = 'tutorial-m04-q03-enhancement-recovery';
export const MIR4_ARC_DYNAMIC_GRANT_IDS = Object.freeze([
  M01_Q03_WEAPON_GRANT_ID,
  M01_Q03_WEAPON_PRESENTED_GRANT_ID,
  M04_Q03_ENHANCEMENT_RECOVERY_GRANT_ID,
  ...Array.from({ length: 5 }, (_, classIndex) => classIndex + 1).flatMap((classId) => [
    ...MIR4_M01_EQUIPMENT_REWARD_QUEST_IDS.map(
      (questId) => `campaign-equipment-${questId.toLowerCase()}-class-${classId}`,
    ),
    ...Array.from(
      { length: 6 },
      (_, rankIndex) => `campaign-equipment-rank-${rankIndex + 1}-class-${classId}`,
    ),
  ]),
]);
const MIR4_NATIVE_ACCEPT_ITEMS = new Set(['copper_mining_pick', 'gathering_sickle']);
const materialKeyById = new Map<number, keyof Mir4Materials>(
  Object.entries(MIR4_MATERIAL_IDS).map(([key, id]) => [id, key as keyof Mir4Materials]),
);
const allowed = {
  items: new Set<string>(),
  recipes: new Set<string>(),
  systems: new Set<string>(),
  cosmetics: new Set<string>(),
  tickets: new Set<string>(),
  guarantees: new Set<string>(),
  grantIds: new Set<string>(),
};
allowed.items.add('profession-salvaged-parts');
for (const grantId of MIR4_ARC_DYNAMIC_GRANT_IDS) allowed.grantIds.add(grantId);
for (const item of MIR4_EQUIPMENT_CATALOG) allowed.items.add(String(item.itemId));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveCount(value: unknown): number {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0
    ? Math.min(MAX_COUNT, Math.floor(numeric))
    : 0;
}

function positiveExperience(value: unknown): number {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function itemRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

for (const quest of MIR4_QUESTS_ARC) {
  const rewards = quest.rewards;
  const accept = quest.onAcceptGrants;
  for (const row of [
    ...itemRows(rewards.materials),
    ...itemRows(rewards.items),
    ...itemRows(accept.items),
  ]) {
    if (typeof row.itemId === 'string' || typeof row.itemId === 'number') {
      allowed.items.add(String(row.itemId));
    }
    if (typeof row.grantId === 'string') allowed.grantIds.add(row.grantId);
  }
  for (const id of [...stringArray(rewards.recipeUnlocks), ...stringArray(accept.recipes)]) {
    allowed.recipes.add(id);
  }
  for (const id of stringArray(rewards.systemUnlocks)) allowed.systems.add(id);
  for (const id of stringArray(rewards.cosmetics)) allowed.cosmetics.add(id);
  for (const row of [...itemRows(rewards.accountGrants), ...itemRows(rewards.tickets)]) {
    if (typeof row.ticketId === 'string') allowed.tickets.add(row.ticketId);
    if (typeof row.grantId === 'string') allowed.grantIds.add(row.grantId);
  }
  for (const row of itemRows(accept.currencies)) {
    if (typeof row.grantId === 'string') allowed.grantIds.add(row.grantId);
  }
  for (const row of itemRows(accept.guarantees)) {
    if (typeof row.guaranteeId === 'string') allowed.guarantees.add(row.guaranteeId);
  }
  for (const stage of quest.stages) {
    if (
      !['gather-resource-patches', 'craft-receipt', 'refine-receipt', 'salvage-receipt'].includes(
        stage.kind,
      )
    )
      continue;
    const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
    for (const target of targets) if (typeof target === 'string') allowed.items.add(target);
  }
}

function addCount(
  map: Record<string, number> | undefined,
  id: string,
  amount: number,
): Record<string, number> {
  const next = map ?? {};
  next[id] = Math.min(MAX_COUNT, (next[id] ?? 0) + amount);
  return next;
}

function addUnique(values: string[] | undefined, additions: readonly string[]): string[] {
  return [...new Set([...(values ?? []), ...additions])].sort();
}

function rewardState(meta: RewardMeta): Mir4ArcRewardState {
  meta.mir4ArcRewards ??= {};
  return meta.mir4ArcRewards;
}

/**
 * Repairs characters that completed unique campaign quests while XP was
 * incorrectly clamped as though it were an item stack. The marker is written
 * even when no backpay is due, so fresh characters can never receive the same
 * quest XP twice after completing it under the corrected ledger.
 */
export function ensureMir4ArcXpLedger(ctx: SimContext, meta: PlayerMeta): boolean {
  const state = rewardState(meta);
  if (state.xpLedgerVersion === XP_LEDGER_VERSION) return false;

  let missingXp = 0;
  for (const progress of Object.values(meta.mir4ArcQuests ?? {})) {
    if (progress.state !== 'done') continue;
    const quest = MIR4_QUESTS_ARC.find((candidate) => candidate.questId === progress.questId);
    if (!quest || quest.repeatability !== 'once-per-character') continue;
    const authoredXp = positiveExperience(quest.rewards.xp ?? quest.xp);
    const underpayment = Math.max(0, authoredXp - Math.min(MAX_COUNT, authoredXp));
    missingXp = Math.min(Number.MAX_SAFE_INTEGER, missingXp + underpayment);
  }

  state.xpLedgerVersion = XP_LEDGER_VERSION;
  if (missingXp > 0) ctx.grantXp(missingXp, meta);
  return true;
}

export function grantMir4ArcLogicalItem(meta: RewardMeta, itemId: string, quantity: number): void {
  const count = positiveCount(quantity);
  if (count === 0 || !allowed.items.has(itemId)) return;
  const state = rewardState(meta);
  state.items = addCount(state.items, itemId, count);
}

export function spendMir4ArcLogicalItems(
  meta: RewardMeta,
  quantity: number,
  accepts: (itemId: string) => boolean,
): readonly Readonly<{ itemId: string; quantity: number }>[] | null {
  const items = meta.mir4ArcRewards?.items;
  let remaining = positiveCount(quantity);
  if (!items || remaining === 0) return remaining === 0 ? [] : null;
  const candidates = Object.keys(items).filter(accepts).sort();
  if (candidates.reduce((sum, itemId) => sum + (items[itemId] ?? 0), 0) < remaining) return null;
  const spent: { itemId: string; quantity: number }[] = [];
  for (const itemId of candidates) {
    if (remaining === 0) break;
    const amount = Math.min(items[itemId] ?? 0, remaining);
    if (amount <= 0) continue;
    items[itemId] -= amount;
    if (items[itemId] <= 0) delete items[itemId];
    spent.push({ itemId, quantity: amount });
    remaining -= amount;
  }
  if (Object.keys(items).length === 0) delete meta.mir4ArcRewards?.items;
  return spent;
}

function grantItem(meta: RewardMeta, itemId: string | number, quantity: number): void {
  const materialKey = typeof itemId === 'number' ? materialKeyById.get(itemId) : undefined;
  if (materialKey) {
    meta.mir4Materials ??= { ...MIR4_EMPTY_MATERIALS };
    const wallet = meta.mir4Materials;
    wallet[materialKey] = Math.min(MAX_COUNT, wallet[materialKey] + quantity);
    return;
  }
  const state = rewardState(meta);
  state.items = addCount(state.items, String(itemId), quantity);
}

function claimOnce(meta: RewardMeta, grantId: string | undefined): boolean {
  if (!grantId) return true;
  const state = rewardState(meta);
  if (state.claimedGrantIds?.includes(grantId)) return false;
  state.claimedGrantIds = addUnique(state.claimedGrantIds, [grantId]);
  return true;
}

/** Equipment rewards use the native instance ledger, the same representation
 * used by the vendor. Any legacy logical token is consumed during migration so
 * one catalog item can never exist in two persistent inventories at once. */
function grantNativeEquipmentReward(
  meta: PlayerMeta,
  itemId: number,
  grantIfMissing: boolean,
): boolean {
  const legacyItemKey = String(itemId);
  const items = meta.mir4ArcRewards?.items;
  const hasLegacyToken = (items?.[legacyItemKey] ?? 0) > 0;
  let changed = false;
  const instance = meta.mir4EquipmentInstances?.[itemId];
  if ((grantIfMissing || hasLegacyToken) && (!instance || instance.destroyed)) {
    meta.mir4EquipmentInstances = {
      ...meta.mir4EquipmentInstances,
      [itemId]: { itemId, enhancement: 0 },
    };
    changed = true;
  }
  if (!hasLegacyToken || !items) return changed;
  delete items[legacyItemKey];
  changed = true;
  if (Object.keys(items).length === 0 && meta.mir4ArcRewards) {
    delete meta.mir4ArcRewards.items;
  }
  return changed;
}

function grantPendingNativeAcceptItems(
  ctx: SimContext,
  meta: PlayerMeta,
  quest: Mir4ArcQuest,
): boolean {
  const claimed = new Set(meta.mir4ArcRewards?.claimedGrantIds ?? []);
  const pending = itemRows(quest.onAcceptGrants.items).flatMap((row) => {
    if (
      typeof row.itemId !== 'string' ||
      !MIR4_NATIVE_ACCEPT_ITEMS.has(row.itemId) ||
      typeof row.grantId !== 'string' ||
      claimed.has(row.grantId)
    ) {
      return [];
    }
    const count = positiveCount(row.quantity);
    return count > 0 ? [{ itemId: row.itemId, count, grantId: row.grantId }] : [];
  });
  if (pending.length === 0) return false;
  if (!fitsAll(meta.inventory, bagCapacity(meta.bags), pending)) return false;
  let changed = false;
  for (const row of pending) {
    if (!claimOnce(meta, row.grantId)) continue;
    ctx.addItem(row.itemId, row.count, meta.entityId, { callerLogs: true });
    changed = true;
  }
  return changed;
}

/** Crafted equipment is never backfilled from level or campaign progress.
 * Existing instances remain valid, but completed quests cannot mint a tier. */
export function ensureMir4ArcEquipmentMilestones(_ctx: SimContext, _meta: PlayerMeta): boolean {
  return false;
}

function grantM01Q03RecoveredWeapon(ctx: SimContext, meta: PlayerMeta): boolean {
  const classId = ctx.entities.get(meta.entityId)?.mir4?.classId as Mir4ClassId | undefined;
  const itemId = classId ? MIR4_STARTER_LOADOUT_BY_CLASS[classId]?.weapon : undefined;
  if (itemId === undefined) return false;
  const newlyClaimed = claimOnce(meta, M01_Q03_WEAPON_GRANT_ID);
  return grantNativeEquipmentReward(meta, itemId, newlyClaimed) || newlyClaimed;
}

/** Fresh characters use their starter weapon during the opening fights. When
 * M01-Q03 reaches its equipment lesson, move that recovered weapon into bags
 * exactly once so the player can perform the equip action the tutorial teaches. */
function presentM01Q03RecoveredWeapon(ctx: SimContext, meta: PlayerMeta): boolean {
  const progress = meta.mir4ArcQuests?.['M01-Q03'];
  if (meta.mir4ArcRewards?.claimedGrantIds?.includes(M01_Q03_WEAPON_PRESENTED_GRANT_ID)) {
    return false;
  }
  const stage = progress
    ? MIR4_QUESTS_ARC.find((quest) => quest.questId === progress.questId)?.stages[
        progress.stageIndex
      ]
    : undefined;
  if (progress?.state !== 'active' || stage?.kind !== 'system-tutorial') return false;
  const classId = ctx.entities.get(meta.entityId)?.mir4?.classId as Mir4ClassId | undefined;
  const itemId = classId ? MIR4_STARTER_LOADOUT_BY_CLASS[classId]?.weapon : undefined;
  if (
    itemId === undefined ||
    !meta.mir4EquipmentInstances?.[itemId] ||
    !claimOnce(meta, M01_Q03_WEAPON_PRESENTED_GRANT_ID)
  ) {
    return false;
  }
  if (meta.mir4Equipment?.[1] === itemId) mir4UnequipSlot(ctx, meta.entityId, 1);
  return true;
}

function recoverM04Q03EnhancementMaterials(meta: PlayerMeta): boolean {
  const progress = meta.mir4ArcQuests?.['M04-Q03'];
  if (progress?.state !== 'active' || progress.stageIndex !== 3) return false;
  const weaponItemId = meta.mir4Equipment?.[1];
  if (weaponItemId === undefined) return false;
  const enhancement = Math.max(
    0,
    Math.floor(meta.mir4EquipmentInstances?.[weaponItemId]?.enhancement ?? 0),
  );
  const attemptsNeeded = Math.max(0, 5 - enhancement);
  if (attemptsNeeded === 0) return false;
  const wallet = meta.mir4Materials ?? { ...MIR4_EMPTY_MATERIALS };
  const craftableScrolls = Math.min(wallet.sunStone, Math.floor(meta.copper / 5_000));
  const missingAttempts = Math.max(0, attemptsNeeded - wallet.solarScroll - craftableScrolls);
  if (missingAttempts === 0 || !claimOnce(meta, M04_Q03_ENHANCEMENT_RECOVERY_GRANT_ID)) {
    return false;
  }
  meta.mir4Materials = wallet;
  wallet.solarScroll = Math.min(MAX_COUNT, wallet.solarScroll + missingAttempts);
  return true;
}

/** Repairs characters that accepted M01-Q03 before its recovered-weapon grant
 * existed and M04-Q03 saves that can no longer reach the guaranteed +5
 * target. Claim ids make both repairs safe to run from the authoritative tick. */
export function ensureMir4ArcTutorialGrants(ctx: SimContext, meta: PlayerMeta): boolean {
  let changed = false;
  const recoveredWeaponProgress = meta.mir4ArcQuests?.['M01-Q03'];
  if (recoveredWeaponProgress?.state === 'active' && recoveredWeaponProgress.stageIndex >= 3) {
    if (grantM01Q03RecoveredWeapon(ctx, meta)) changed = true;
    if (presentM01Q03RecoveredWeapon(ctx, meta)) changed = true;
  }
  if (recoverM04Q03EnhancementMaterials(meta)) changed = true;
  const nativeToolsProgress = meta.mir4ArcQuests?.['M01-Q04'];
  const nativeToolsQuest = MIR4_QUESTS_ARC.find((quest) => quest.questId === 'M01-Q04');
  if (
    nativeToolsProgress &&
    nativeToolsQuest &&
    grantPendingNativeAcceptItems(ctx, meta, nativeToolsQuest)
  ) {
    changed = true;
  }
  return changed;
}

export function grantMir4ArcAcceptGrants(
  ctx: SimContext,
  meta: PlayerMeta,
  quest: Mir4ArcQuest,
): void {
  const rewardStatuses = ctx.entities.get(meta.entityId)?.mir4?.statusValues;
  const accept = quest.onAcceptGrants;
  grantPendingNativeAcceptItems(ctx, meta, quest);
  for (const row of itemRows(accept.items)) {
    if (typeof row.itemId === 'string' && MIR4_NATIVE_ACCEPT_ITEMS.has(row.itemId)) continue;
    if (
      (typeof row.itemId !== 'string' && typeof row.itemId !== 'number') ||
      !claimOnce(meta, typeof row.grantId === 'string' ? row.grantId : undefined)
    )
      continue;
    const quantity = positiveCount(row.quantity);
    if (quantity > 0) {
      grantItem(meta, row.itemId, quantity);
      if (
        row.itemId === 'potion-minor-bound' &&
        ctx.canAddItem('minor_healing_potion', quantity, meta.entityId)
      ) {
        ctx.addItem('minor_healing_potion', quantity, meta.entityId, {
          callerLogs: true,
        });
      }
    }
  }
  if (quest.questId === 'M01-Q03') grantM01Q03RecoveredWeapon(ctx, meta);
  const state = rewardState(meta);
  state.recipes = addUnique(state.recipes, stringArray(accept.recipes));
  for (const row of itemRows(accept.currencies)) {
    if (
      row.moneyId !== 2 ||
      !claimOnce(meta, typeof row.grantId === 'string' ? row.grantId : undefined)
    )
      continue;
    meta.copper = Math.min(
      Number.MAX_SAFE_INTEGER,
      meta.copper +
        mir4ModifiedProgressionReward(positiveCount(row.quantity), 'reward-copper', rewardStatuses),
    );
  }
  for (const row of itemRows(accept.guarantees)) {
    if (typeof row.guaranteeId !== 'string') continue;
    const uses = positiveCount(row.uses);
    if (uses > 0) state.guarantees = addCount(state.guarantees, row.guaranteeId, uses);
  }
}

export function grantMir4ArcQuestRewards(
  ctx: SimContext,
  meta: PlayerMeta,
  quest: Mir4ArcQuest,
): void {
  const rewards = quest.rewards;
  const rewardStatuses = ctx.entities.get(meta.entityId)?.mir4?.statusValues;
  // Campaign XP grows into the billions from the middle chapters onward. It is
  // a progression currency, not an inventory stack, so applying MAX_COUNT here
  // silently underpays every later quest. The authored table remains within the
  // exact JavaScript integer range used by advanceMir4Experience.
  const xp = positiveExperience(rewards.xp ?? quest.xp);
  if (xp > 0) ctx.grantXp(xp, meta);
  const copper = positiveCount(rewards.copper ?? quest.copper);
  const formula =
    typeof rewards.copperFormula === 'string'
      ? rewards.copperFormula.match(/^(\d+)\*mapSequence\^2$/)
      : null;
  const sequence = Number(quest.mapId.slice(1, 3));
  const formulaCopper = formula ? positiveCount(Number(formula[1]) * sequence * sequence) : 0;
  if (copper + formulaCopper > 0) {
    meta.copper = Math.min(
      Number.MAX_SAFE_INTEGER,
      meta.copper +
        mir4ModifiedProgressionReward(copper + formulaCopper, 'reward-copper', rewardStatuses),
    );
  }
  for (const row of [...itemRows(rewards.materials), ...itemRows(rewards.items)]) {
    if (typeof row.itemId !== 'string' && typeof row.itemId !== 'number') continue;
    const quantity = positiveCount(row.quantity);
    if (quantity > 0) grantItem(meta, row.itemId, quantity);
  }
  const state = rewardState(meta);
  state.recipes = addUnique(state.recipes, stringArray(rewards.recipeUnlocks));
  state.systems = addUnique(state.systems, stringArray(rewards.systemUnlocks));
  if (state.systems.includes('mount-summon')) meta.ridingTrained = true;
  state.cosmetics = addUnique(state.cosmetics, stringArray(rewards.cosmetics));
  for (const row of [...itemRows(rewards.accountGrants), ...itemRows(rewards.tickets)]) {
    if (
      typeof row.ticketId !== 'string' ||
      !claimOnce(meta, typeof row.grantId === 'string' ? row.grantId : undefined)
    )
      continue;
    const quantity = positiveCount(row.quantity);
    if (quantity > 0) state.tickets = addCount(state.tickets, row.ticketId, quantity);
  }
  state.professionXp = Math.min(
    MAX_COUNT,
    (state.professionXp ?? 0) + positiveCount(rewards.professionXp),
  );
  state.recipeFragments = Math.min(
    MAX_COUNT,
    (state.recipeFragments ?? 0) + positiveCount(rewards.recipeFragments),
  );
  state.cityReputation = Math.min(
    MAX_COUNT,
    (state.cityReputation ?? 0) + positiveCount(rewards.cityReputation),
  );
  markMir4WireDirty(meta);
}

function sanitizeCountMap(
  value: unknown,
  ids: ReadonlySet<string>,
): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, number> = {};
  for (const [id, raw] of Object.entries(value)) {
    const count = ids.has(id) ? positiveCount(raw) : 0;
    if (count > 0) result[id] = count;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function sanitizeSet(value: unknown, ids: ReadonlySet<string>): string[] | undefined {
  const result = [...new Set(stringArray(value).filter((id) => ids.has(id)))].sort();
  return result.length > 0 ? result : undefined;
}

export function sanitizeMir4ArcRewards(value: unknown): Mir4ArcRewardState | undefined {
  if (!isRecord(value)) return undefined;
  const result: Mir4ArcRewardState = {
    items: sanitizeCountMap(value.items, allowed.items),
    recipes: sanitizeSet(value.recipes, allowed.recipes),
    systems: sanitizeSet(value.systems, allowed.systems),
    cosmetics: sanitizeSet(value.cosmetics, allowed.cosmetics),
    tickets: sanitizeCountMap(value.tickets, allowed.tickets),
    guarantees: sanitizeCountMap(value.guarantees, allowed.guarantees),
    claimedGrantIds: sanitizeSet(value.claimedGrantIds, allowed.grantIds),
    professionXp: positiveCount(value.professionXp) || undefined,
    recipeFragments: positiveCount(value.recipeFragments) || undefined,
    cityReputation: positiveCount(value.cityReputation) || undefined,
    xpLedgerVersion: value.xpLedgerVersion === XP_LEDGER_VERSION ? XP_LEDGER_VERSION : undefined,
  };
  for (const key of Object.keys(result) as (keyof Mir4ArcRewardState)[]) {
    if (result[key] === undefined) delete result[key];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
