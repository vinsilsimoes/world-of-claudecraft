// Source-backed MIR4 skill evolution. The imported browser runtime admits one
// transition (rank 1 -> 2) for a sealed per-class skill set and charges the
// same three logical resources on every class. Presentation remains in WoC's
// existing Spellbook; this module owns only projection and authoritative
// mutation so offline, online and headless hosts share the exact same gate.

import { MIR4_SKILL_LEVEL_CAPS } from '../content/mir4/skills';
import type { SimContext } from '../sim_context';
import { refreshMir4KnownAbilities } from './action_abilities';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4SkillEvolutionResources {
  effectPoints: number;
  skillTomes: number;
}

export const MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES: Readonly<Mir4SkillEvolutionResources> = {
  effectPoints: 0,
  skillTomes: 0,
};

export const MIR4_SKILL_LEVEL_TWO_COST = {
  copper: 3_200,
  effectPoints: 400,
  skillTomes: 3,
} as const;

export type Mir4SkillEvolutionMissing = 'copper' | 'effect-points' | 'skill-tomes';

export interface Mir4SkillEvolutionView {
  skillId: number;
  currentLevel: number;
  nextLevel: number | null;
  maxLevel: 2;
  status: 'ready' | 'blocked' | 'maxed';
  canUpgrade: boolean;
  missing: Mir4SkillEvolutionMissing[];
  costs: typeof MIR4_SKILL_LEVEL_TWO_COST;
  balances: {
    copper: number;
    effectPoints: number;
    skillTomes: number;
  };
}

export type Mir4SkillUpgradeResult =
  | {
      ok: true;
      skillId: number;
      previousLevel: number;
      currentLevel: number;
    }
  | {
      ok: false;
      reason:
        | 'missing-player'
        | 'skill-not-upgradable'
        | 'stale-level'
        | 'maxed'
        | 'insufficient-resources';
    };

function nonNegativeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Project the source's level-two admission row for an existing class skill. */
export function mir4SkillEvolutionFor(
  classId: number,
  skillId: number,
  rawCurrentLevel: number,
  rawCopper: number,
  resources: Readonly<Mir4SkillEvolutionResources> | undefined,
): Mir4SkillEvolutionView | null {
  const cap = MIR4_SKILL_LEVEL_CAPS[classId]?.[skillId];
  if (cap !== 2) return null;
  const currentLevel = Math.min(cap, Math.max(1, Math.floor(rawCurrentLevel || 1)));
  const balances = {
    copper: nonNegativeCount(rawCopper),
    effectPoints: nonNegativeCount(resources?.effectPoints),
    skillTomes: nonNegativeCount(resources?.skillTomes),
  };
  const maxed = currentLevel >= cap;
  const missing: Mir4SkillEvolutionMissing[] = [];
  if (!maxed) {
    if (balances.copper < MIR4_SKILL_LEVEL_TWO_COST.copper) missing.push('copper');
    if (balances.effectPoints < MIR4_SKILL_LEVEL_TWO_COST.effectPoints) {
      missing.push('effect-points');
    }
    if (balances.skillTomes < MIR4_SKILL_LEVEL_TWO_COST.skillTomes) {
      missing.push('skill-tomes');
    }
  }
  const status = maxed ? 'maxed' : missing.length > 0 ? 'blocked' : 'ready';
  return {
    skillId,
    currentLevel,
    nextLevel: maxed ? null : currentLevel + 1,
    maxLevel: cap,
    status,
    canUpgrade: status === 'ready',
    missing,
    costs: MIR4_SKILL_LEVEL_TWO_COST,
    balances,
  };
}

/** Apply one optimistic-concurrency-guarded rank transition atomically. */
export function upgradeMir4Skill(
  ctx: SimContext,
  pid: number,
  skillId: number,
  expectedCurrentLevel: number,
): Mir4SkillUpgradeResult {
  const entity = ctx.entities.get(pid);
  const meta = ctx.players.get(pid);
  if (!entity?.mir4 || !meta) return { ok: false, reason: 'missing-player' };
  const rawCurrentLevel = meta.mir4SkillLevels?.[skillId] ?? 1;
  const evolution = mir4SkillEvolutionFor(
    entity.mir4.classId,
    skillId,
    rawCurrentLevel,
    meta.copper,
    meta.mir4SkillResources,
  );
  if (!evolution) return { ok: false, reason: 'skill-not-upgradable' };
  if (expectedCurrentLevel !== evolution.currentLevel) {
    return { ok: false, reason: 'stale-level' };
  }
  if (evolution.status === 'maxed') return { ok: false, reason: 'maxed' };
  if (!evolution.canUpgrade || evolution.nextLevel === null) {
    return { ok: false, reason: 'insufficient-resources' };
  }

  // All validation is complete before any live object is touched. Replacing
  // both bags instead of mutating aliases also keeps failed/retried commands
  // incapable of partially spending one leg of the cost.
  meta.copper = evolution.balances.copper - MIR4_SKILL_LEVEL_TWO_COST.copper;
  meta.mir4SkillResources = {
    effectPoints: evolution.balances.effectPoints - MIR4_SKILL_LEVEL_TWO_COST.effectPoints,
    skillTomes: evolution.balances.skillTomes - MIR4_SKILL_LEVEL_TWO_COST.skillTomes,
  };
  meta.mir4SkillLevels = {
    ...meta.mir4SkillLevels,
    [skillId]: evolution.nextLevel,
  };
  refreshMir4KnownAbilities(entity, meta);
  markMir4WireDirty(meta);
  return {
    ok: true,
    skillId,
    previousLevel: evolution.currentLevel,
    currentLevel: evolution.nextLevel,
  };
}
