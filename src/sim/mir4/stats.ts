// Player-stat derivation and XP progression for the mir4-gameplay-port
// profile: the bridge between the ported level table
// (src/sim/content/mir4/class_levels.ts) and the fork's Entity fields.
// All numbers come from the source table; nothing here is invented. The
// mir4 recalcer is the ONE derivation path for mir4 players, mirroring the
// classic rule that recalcPlayerStats is the one place derived stats are
// computed (src/sim/CLAUDE.md); classic characters never reach this module.

import { mir4LevelRow } from '../content/mir4';
import type { GameProfile } from '../game_profile';
import { pkStat } from '../pvp/infamy';
import type { Entity, Mir4ClassKey, PlayerClass } from '../types';
import type { Mir4CodexState } from './codex';
import { deriveMir4PlayerStats } from './derived_stats';
import type { Mir4MountState } from './mounts';
import { mir4NativeEquipmentPresentation } from './native_equipment_visuals';
import type { Mir4SpiritState } from './spirits';
import type { Mir4TrainingState } from './training';

// Column indexes into MIR4_LEVEL_ROWS tuples (see MIR4_LEVEL_COLUMNS).
export const MIR4_LEVEL_COL = {
  reqExp: 2,
  maxHp: 3,
  maxMana: 4,
  physicalAttack: 5,
  magicAttack: 6,
  physicalDefense: 7,
  magicDefense: 8,
  accuracy: 9,
  dodge: 10,
  critical: 11,
  avoidCritical: 12,
  criticalOutcome: 13,
  manaCost: 20,
} as const;

/**
 * The full PlayerClass-or-Mir4ClassKey -> classId mapping. The slice runs all
 * five classes: the four mir4-only keys ride the warrior shell through the
 * classic derivations (see sim.ts addPlayer, "D1"), with the true identity
 * carried on Entity.mir4.classId.
 */
export function mir4ClassIdForPlayerClass(cls: PlayerClass | Mir4ClassKey): number {
  switch (cls) {
    case 'warrior':
      return 1;
    case 'elementalist':
      return 2;
    case 'taoist':
      return 3;
    case 'arbalist':
      return 4;
    case 'lancer':
      return 5;
    default:
      throw new Error(`mir4-gameplay-port does not host the classic class '${cls}'`);
  }
}

/** The five mir4 roster keys hosts may offer under the profile. */
export const MIR4_PLAYER_CLASS_KEYS: readonly Mir4ClassKey[] = [
  'warrior',
  'elementalist',
  'taoist',
  'arbalist',
  'lancer',
];

export function isMir4ClassKey(cls: string): cls is Mir4ClassKey {
  return (MIR4_PLAYER_CLASS_KEYS as readonly string[]).includes(cls);
}

/**
 * The classic shell for an incoming class key: mir4-only keys ride the warrior
 * shell (talents/recalc/render placeholders); classic classes pass through.
 * A mir4-only key under the CLASSIC profile fails closed.
 */
export function mir4ShellClassFor(
  cls: PlayerClass | Mir4ClassKey,
  profile: GameProfile,
): PlayerClass {
  if (isPlayerClassKey(cls)) return cls;
  if (profile !== 'mir4-gameplay-port') {
    throw new Error(`mir4 class '${cls}' is not hostable under the ${profile} profile`);
  }
  return 'warrior';
}

function isPlayerClassKey(cls: string): cls is PlayerClass {
  return !isMir4ClassKey(cls) || cls === 'warrior';
}

/** The roster key for a classId (1..5); the mirror of the key->id mapping. */
export function mir4ClassKeyForId(classId: number): Mir4ClassKey {
  switch (classId) {
    case 1:
      return 'warrior';
    case 2:
      return 'elementalist';
    case 3:
      return 'taoist';
    case 4:
      return 'arbalist';
    case 5:
      return 'lancer';
    default:
      throw new Error(`unknown mir4 classId ${classId}`);
  }
}

/**
 * The class a later recalc should derive from: the entity's OWN mir4 identity
 * when it has one (mir4-only classes ride the warrior shell in templateId, so
 * the templateId alone would resolve the wrong table), else the explicit key,
 * else the templateId.
 */
export function mir4RecalcClassOf(p: Entity, classKey?: Mir4ClassKey): PlayerClass | Mir4ClassKey {
  if (p.mir4) return mir4ClassKeyForId(p.mir4.classId);
  return classKey ?? (p.templateId as PlayerClass);
}

/**
 * Recompute every mir4-derived Entity field from (classId, level, gear). The
 * equipment's applied attributes land on top of the level-table base so a
 * level-up or restore can never desync them.
 */
export function recalcMir4PlayerStats(
  e: Entity,
  cls: PlayerClass | Mir4ClassKey,
  level: number,
  equipment?: { weapon?: number; [slot: number]: number | undefined },
  instances?: Record<number, unknown>,
  spirits?: Mir4SpiritState,
  mounts?: Mir4MountState,
  codex?: Mir4CodexState,
  rewardItems?: Record<string, number>,
  training?: Mir4TrainingState,
): void {
  const classId = mir4ClassIdForPlayerClass(cls);
  const stats = deriveMir4PlayerStats(
    classId as 1 | 2 | 3 | 4 | 5,
    level,
    equipment,
    instances as never,
    spirits,
    mounts,
    codex,
    rewardItems,
    training,
  );
  const penalized = (value: number) => pkStat(value, e.pkMarked);
  e.maxHp = penalized(stats.maxHp);
  e.hp = Math.min(e.hp <= 0 ? e.maxHp : e.hp, e.maxHp);
  e.resourceType = 'mana';
  e.maxResource = penalized(stats.maxMana);
  e.resource = Math.min(e.resource, e.maxResource);
  // The classic AP field carries the mir4 physicalAttack stat (the combat
  // module's coefficient math reads it); spellPower mirrors magicAttack.
  e.attackPower = penalized(stats.physicalAttack);
  e.spellPower = penalized(stats.magicAttack);
  e.mir4 = {
    classId,
    statusValues: Object.freeze(
      Object.fromEntries(
        Object.entries(stats.statusValues).map(([statusId, value]) => [statusId, penalized(value)]),
      ),
    ),
    manaCostStat: stats.manaCost,
    accuracy: penalized(stats.accuracy),
    dodge: penalized(stats.dodge),
    critical: penalized(stats.critical),
    avoidCritical: penalized(stats.avoidCritical),
    criticalOutcome: penalized(stats.criticalOutcome),
    bossDamageBps: penalized(stats.bossDamageBps),
    bossDamageReductionBps: penalized(stats.bossDamageReductionBps),
    pvpDamageBps: penalized(stats.pvpDamageBps),
    pvpDamageReductionBps: penalized(stats.pvpDamageReductionBps),
    monsterDamageBps: penalized(stats.monsterDamageBps),
    monsterDamageReductionBps: penalized(stats.monsterDamageReductionBps),
    skillDamageBps: penalized(stats.skillDamageBps),
    skillDamageReductionBps: penalized(stats.skillDamageReductionBps),
    allDamageBps: penalized(stats.allDamageBps),
    allDamageReductionBps: penalized(stats.allDamageReductionBps),
    stunSuccessBps: penalized(stats.stunSuccessBps),
    stunResistanceBps: penalized(stats.stunResistanceBps),
    physicalDefense: penalized(stats.physicalDefense),
    magicDefense: penalized(stats.magicDefense),
    penetrationBps: penalized(stats.penetrationBps),
    penetrationDefenseBps: penalized(stats.penetrationDefenseBps),
    mountMoveSpeedBps: penalized(stats.mountMoveSpeedBps),
    mountBasicAttackSpeedBps: penalized(stats.mountBasicAttackSpeedBps),
  };
  const presentation = mir4NativeEquipmentPresentation(classId, equipment);
  e.mir4VisualClassId = presentation.classId;
  e.mir4VisualArmorMask = presentation.armorMask;
  e.mainhandItemId = presentation.mainhandItemId;
  e.offhandItemId = presentation.offhandItemId;
  // MIR4 logical gear owns the visible weapon shell. A classic account-level
  // weapon skin must not replace it or imply a stat-bearing classic item.
  e.weaponSkinId = null;
}

/** The MP pool mirror on the Entity resource fields (call after recalc + restore). */
export function mir4SyncResourcePool(e: Entity): void {
  e.resource = Math.min(e.resource > 0 ? e.resource : e.maxResource, e.maxResource);
}

/**
 * The addPlayer hook for mir4-profile sims: (re)derives the entity's mir4
 * combat state from (class, level) and syncs the MP pool. Runs on fresh
 * creation and on save restore alike, since both end with a level on the
 * entity and the stats are pure functions of it. On restore the classic load
 * path may clamp hp/resource against the classic pools mid-load, so the saved
 * values are re-applied here AFTER the mir4 recalc.
 */
export function initMir4Player(
  ctx: {
    entities: Map<number, Entity>;
    players?: Map<
      number,
      {
        mir4Equipment?: { weapon?: number };
        mir4EquipmentInstances?: Record<number, unknown>;
        mir4Spirits?: Mir4SpiritState;
        mir4Mounts?: Mir4MountState;
        mir4Codex?: Mir4CodexState;
        mir4ArcRewards?: { items?: Record<string, number> };
        mir4Training?: Mir4TrainingState;
      }
    >;
  },
  pid: number,
  state?: { hp?: number; resource?: number } | null,
  classKey?: Mir4ClassKey,
): void {
  const p = ctx.entities.get(pid);
  if (!p) return;
  const meta = ctx.players?.get(pid);
  // The explicit key wins (mir4-only classes ride the warrior shell in
  // templateId, so it cannot be recovered from the entity alone).
  recalcMir4PlayerStats(
    p,
    classKey ?? mir4RecalcClassOf(p),
    p.level,
    meta?.mir4Equipment,
    meta?.mir4EquipmentInstances,
    meta?.mir4Spirits,
    meta?.mir4Mounts,
    meta?.mir4Codex,
    meta?.mir4ArcRewards?.items,
    meta?.mir4Training,
  );
  if (state && (state.hp !== undefined || state.resource !== undefined)) {
    if (state.hp !== undefined) {
      p.hp = Math.min(Math.max(1, Math.floor(state.hp)), p.maxHp);
    }
    if (state.resource !== undefined) {
      p.resource = Math.min(Math.max(0, Math.floor(state.resource)), p.maxResource);
    }
  } else {
    // Fresh creation: the classic creation path left the entity at the
    // CLASSIC pool (a level-1 warrior's ~100 hp), so fill to the mir4 pool.
    p.hp = p.maxHp;
    mir4SyncResourcePool(p);
  }
}

export interface Mir4ExperienceResult {
  level: number;
  xp: number;
  levelUps: number;
  atLevelCap: boolean;
}

/**
 * The source's applyRemainingExperience loop over the level table. reqExp is
 * compared as BigInt because level-250 values exceed Number.MAX_SAFE_INTEGER;
 * the running xp stays a safe integer in any realistic play range.
 */
export function advanceMir4Experience(
  level: number,
  xp: number,
  awarded: number,
  maxLevel = 250,
): Mir4ExperienceResult {
  let currentLevel = Math.max(1, Math.floor(level));
  let currentXp = Math.max(0, Math.floor(xp)) + Math.max(0, Math.floor(awarded));
  let levelUps = 0;
  while (currentLevel < maxLevel) {
    const row = mir4LevelRow(1, currentLevel); // reqExp is class-independent
    if (!row) break;
    const required = BigInt(row[MIR4_LEVEL_COL.reqExp]);
    if (BigInt(currentXp) < required) break;
    currentXp = Number(BigInt(currentXp) - required);
    currentLevel += 1;
    levelUps += 1;
  }
  return { level: currentLevel, xp: currentXp, levelUps, atLevelCap: currentLevel >= maxLevel };
}

/** The mir4 class key for addPlayer's hook (undefined for classic keys). */
export function mir4ClassKeyArg(cls: PlayerClass | Mir4ClassKey): Mir4ClassKey | undefined {
  return cls !== 'warrior' && isMir4ClassKey(cls) ? cls : undefined;
}
