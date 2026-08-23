// Authoritative reward ledger for the imported campaign contracts. Logical
// item ids remain progression tokens. Equipment milestones grant only the
// existing World of ClaudeCraft runtime catalog and its native presentation.

import { MIR4_QUESTS_ARC, type Mir4ArcQuest } from '../content/mir4/arc_campaign';
import { MIR4_EQUIPMENT_CATALOG } from '../content/mir4/equipment_catalog';
import type { PlayerMeta } from '../sim';
import type { SimContext } from '../sim_context';
import { MIR4_EMPTY_MATERIALS, MIR4_MATERIAL_IDS, type Mir4Materials } from './equipment';
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
}

interface RewardMeta {
  copper: number;
  mir4Materials?: Mir4Materials;
  mir4ArcRewards?: Mir4ArcRewardState;
}

const MAX_COUNT = 1_000_000_000;
const M01_Q03_WEAPON_GRANT_ID = 'tutorial-m01-q03-recovered-weapon';
const EQUIPMENT_MILESTONE_RANK = new Map<string, number>([
  ['M01-Q06', 1],
  ['M02-Q06', 2],
  ['M03-Q06', 3],
  ['M05-Q06', 4],
  ['M07-Q06', 5],
  ['M09-Q06', 6],
]);
const M01_Q03_WEAPON_BY_CLASS = new Map(
  MIR4_EQUIPMENT_CATALOG.filter((item) => item.equipSlot === 1 && item.catalogRank === 1).map(
    (item) => [item.classId, item.itemId] as const,
  ),
);
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
allowed.grantIds.add(M01_Q03_WEAPON_GRANT_ID);
for (const item of MIR4_EQUIPMENT_CATALOG) allowed.items.add(String(item.itemId));
for (let classId = 1; classId <= 5; classId += 1) {
  for (let rank = 1; rank <= 6; rank += 1) {
    allowed.grantIds.add(`campaign-equipment-rank-${rank}-class-${classId}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveCount(value: unknown): number {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0
    ? Math.min(MAX_COUNT, Math.floor(numeric))
    : 0;
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

function ownsEquipmentReward(meta: PlayerMeta, itemId: number): boolean {
  const instance = meta.mir4EquipmentInstances?.[itemId];
  return instance && !instance.destroyed
    ? true
    : (meta.mir4ArcRewards?.items?.[String(itemId)] ?? 0) > 0;
}

function grantMir4ArcEquipmentMilestone(
  ctx: SimContext,
  meta: PlayerMeta,
  questId: string,
): boolean {
  const rank = EQUIPMENT_MILESTONE_RANK.get(questId);
  const classId = ctx.entities.get(meta.entityId)?.mir4?.classId;
  if (rank === undefined || classId === undefined) return false;
  const grantId = `campaign-equipment-rank-${rank}-class-${classId}`;
  if (!claimOnce(meta, grantId)) return false;
  for (const item of MIR4_EQUIPMENT_CATALOG) {
    if (item.classId !== classId || item.catalogRank !== rank) continue;
    if (!ownsEquipmentReward(meta, item.itemId)) grantItem(meta, item.itemId, 1);
  }
  return true;
}

/** Backfills native catalog sets for characters that cleared a milestone
 * before equipment progression was connected to the imported campaign. */
export function ensureMir4ArcEquipmentMilestones(ctx: SimContext, meta: PlayerMeta): boolean {
  let changed = false;
  for (const [questId] of EQUIPMENT_MILESTONE_RANK) {
    if (meta.mir4ArcQuests?.[questId]?.state !== 'done') continue;
    if (grantMir4ArcEquipmentMilestone(ctx, meta, questId)) changed = true;
  }
  return changed;
}

function grantM01Q03RecoveredWeapon(ctx: SimContext, meta: PlayerMeta): boolean {
  const classId = ctx.entities.get(meta.entityId)?.mir4?.classId;
  const itemId = M01_Q03_WEAPON_BY_CLASS.get(classId as 1 | 2 | 3 | 4 | 5);
  if (itemId === undefined || !claimOnce(meta, M01_Q03_WEAPON_GRANT_ID)) return false;
  grantItem(meta, itemId, 1);
  return true;
}

/** Repairs characters that accepted M01-Q03 before its recovered-weapon grant
 * existed. The claim id makes this safe to run from the authoritative tick. */
export function ensureMir4ArcTutorialGrants(ctx: SimContext, meta: PlayerMeta): boolean {
  const progress = meta.mir4ArcQuests?.['M01-Q03'];
  if (progress?.state !== 'active' || progress.stageIndex < 3) return false;
  return grantM01Q03RecoveredWeapon(ctx, meta);
}

export function grantMir4ArcAcceptGrants(
  ctx: SimContext,
  meta: PlayerMeta,
  quest: Mir4ArcQuest,
): void {
  const accept = quest.onAcceptGrants;
  for (const row of itemRows(accept.items)) {
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
        ctx.addItem('minor_healing_potion', quantity, meta.entityId, { callerLogs: true });
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
    meta.copper = Math.min(Number.MAX_SAFE_INTEGER, meta.copper + positiveCount(row.quantity));
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
  grantMir4ArcEquipmentMilestone(ctx, meta, quest.questId);
  const xp = positiveCount(rewards.xp ?? quest.xp);
  if (xp > 0) ctx.grantXp(xp, meta);
  const copper = positiveCount(rewards.copper ?? quest.copper);
  const formula =
    typeof rewards.copperFormula === 'string'
      ? rewards.copperFormula.match(/^(\d+)\*mapSequence\^2$/)
      : null;
  const sequence = Number(quest.mapId.slice(1, 3));
  const formulaCopper = formula ? positiveCount(Number(formula[1]) * sequence * sequence) : 0;
  if (copper + formulaCopper > 0) {
    meta.copper = Math.min(Number.MAX_SAFE_INTEGER, meta.copper + copper + formulaCopper);
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
  };
  for (const key of Object.keys(result) as (keyof Mir4ArcRewardState)[]) {
    if (result[key] === undefined) delete result[key];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
