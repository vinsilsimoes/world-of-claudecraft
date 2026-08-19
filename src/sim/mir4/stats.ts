// Player-stat derivation and XP progression for the mir4-gameplay-port
// profile: the bridge between the ported level table
// (src/sim/content/mir4/class_levels.ts) and the fork's Entity fields.
// All numbers come from the source table; nothing here is invented. The
// mir4 recalcer is the ONE derivation path for mir4 players, mirroring the
// classic rule that recalcPlayerStats is the one place derived stats are
// computed (src/sim/CLAUDE.md); classic characters never reach this module.

import { mir4LevelRow } from '../content/mir4';
import { MIR4_ITEMS } from '../content/mir4/items';
import type { Entity, Mir4PlayerCombatState, PlayerClass } from '../types';

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
 * PlayerClass -> mir4 classId. The slice runs warrior (1); the other four
 * unlock in Phase 3 when creation grows their kits, so mapping them here
 * before their combat exists would let a half-wired class into the world.
 */
export function mir4ClassIdForPlayerClass(cls: PlayerClass): number {
  if (cls === 'warrior') return 1;
  throw new Error(`mir4-gameplay-port does not host the classic class '${cls}' yet (Phase 3)`);
}

/**
 * Recompute every mir4-derived Entity field from (classId, level, gear). The
 * equipment's applied attributes land on top of the level-table base so a
 * level-up or restore can never desync them.
 */
export function recalcMir4PlayerStats(
  e: Entity,
  cls: PlayerClass,
  level: number,
  equipment?: { weapon?: number },
): void {
  const classId = mir4ClassIdForPlayerClass(cls);
  const row = mir4LevelRow(classId, level);
  if (!row) throw new Error(`mir4 level row missing for class ${classId} level ${level}`);
  e.maxHp = row[MIR4_LEVEL_COL.maxHp];
  e.hp = Math.min(e.hp <= 0 ? e.maxHp : e.hp, e.maxHp);
  e.resourceType = 'mana';
  e.maxResource = row[MIR4_LEVEL_COL.maxMana];
  // The classic AP field carries the mir4 physicalAttack stat (the combat
  // module's coefficient math reads it); spellPower mirrors magicAttack.
  e.attackPower = row[MIR4_LEVEL_COL.physicalAttack];
  e.spellPower = row[MIR4_LEVEL_COL.magicAttack];
  let accuracy = row[MIR4_LEVEL_COL.accuracy];
  // Equipped weapon attributes: only the status ids the combat bridge maps
  // (mir4/content/items.ts MIR4_APPLIED_STATUS_IDS) are applied.
  const weapon = equipment?.weapon;
  if (weapon !== undefined) {
    for (const attr of MIR4_ITEMS[weapon]?.attributes ?? []) {
      const [statusId, value] = attr;
      if (statusId === 20) e.attackPower += value;
      else if (statusId === 28) accuracy += value;
    }
  }
  e.mir4 = {
    classId,
    manaCostStat: row[MIR4_LEVEL_COL.manaCost],
    accuracy,
    dodge: row[MIR4_LEVEL_COL.dodge],
    critical: row[MIR4_LEVEL_COL.critical],
    avoidCritical: row[MIR4_LEVEL_COL.avoidCritical],
    criticalOutcome: row[MIR4_LEVEL_COL.criticalOutcome],
    physicalDefense: row[MIR4_LEVEL_COL.physicalDefense],
    magicDefense: row[MIR4_LEVEL_COL.magicDefense],
  };
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
    players?: Map<number, { mir4Equipment?: { weapon?: number } }>;
  },
  pid: number,
  state?: { hp?: number; resource?: number } | null,
): void {
  const p = ctx.entities.get(pid);
  if (!p) return;
  const meta = ctx.players?.get(pid);
  recalcMir4PlayerStats(p, p.templateId as PlayerClass, p.level, meta?.mir4Equipment);
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
