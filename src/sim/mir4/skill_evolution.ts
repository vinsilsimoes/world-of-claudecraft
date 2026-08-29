// Aeldrune's authoritative MIR4 skill evolution. Regular class skills advance
// from rank 1 to rank 15 and consume one crafted Tome of Knowledge per step.
// Projection and mutation are shared by offline, online and headless hosts.

import { mir4SkillById } from '../content/mir4/skills_runtime';
import type { SimContext } from '../sim_context';
import { refreshMir4KnownAbilities } from './action_abilities';
import { MIR4_EMPTY_MATERIALS, type Mir4Materials } from './equipment';
import {
  MIR4_SKILL_MAX_LEVEL,
  type Mir4KnowledgeTomeCost,
  mir4KnowledgeTomeForUpgrade,
  mir4SkillUnlockLevel,
} from './skill_progression';
import { markMir4WireDirty } from './wire_revision';

/** Legacy achievement wallet retained for save compatibility. */
export interface Mir4SkillEvolutionResources {
  effectPoints: number;
  skillTomes: number;
}

export const MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES: Readonly<Mir4SkillEvolutionResources> = {
  effectPoints: 0,
  skillTomes: 0,
};

export type Mir4SkillEvolutionMissing = 'knowledge-tome';

export interface Mir4SkillEvolutionView {
  skillId: number;
  currentLevel: number;
  nextLevel: number | null;
  maxLevel: 15;
  status: 'ready' | 'blocked' | 'maxed';
  canUpgrade: boolean;
  missing: Mir4SkillEvolutionMissing[];
  cost: Mir4KnowledgeTomeCost | null;
  held: number;
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
        | 'skill-locked'
        | 'stale-level'
        | 'maxed'
        | 'insufficient-resources';
    };

function nonNegativeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Project one class-owned rank transition against the crafted material wallet. */
export function mir4SkillEvolutionFor(
  classId: number,
  skillId: number,
  rawCurrentLevel: number,
  materials: Readonly<Mir4Materials> | undefined,
): Mir4SkillEvolutionView | null {
  const skill = mir4SkillById(skillId);
  if (!skill || skill.classId !== classId) return null;
  const currentLevel = Math.min(
    MIR4_SKILL_MAX_LEVEL,
    Math.max(1, Math.floor(rawCurrentLevel || 1)),
  );
  const cost = mir4KnowledgeTomeForUpgrade(currentLevel);
  const held = cost ? nonNegativeCount(materials?.[cost.key]) : 0;
  const maxed = cost === null;
  const missing: Mir4SkillEvolutionMissing[] =
    !maxed && held < cost.count ? ['knowledge-tome'] : [];
  const status = maxed ? 'maxed' : missing.length > 0 ? 'blocked' : 'ready';
  return {
    skillId,
    currentLevel,
    nextLevel: maxed ? null : currentLevel + 1,
    maxLevel: MIR4_SKILL_MAX_LEVEL,
    status,
    canUpgrade: status === 'ready',
    missing,
    cost,
    held,
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
  const skill = mir4SkillById(skillId);
  if (!skill || skill.classId !== entity.mir4.classId) {
    return { ok: false, reason: 'skill-not-upgradable' };
  }
  if (entity.level < mir4SkillUnlockLevel(skill.slot)) {
    return { ok: false, reason: 'skill-locked' };
  }
  const rawCurrentLevel = meta.mir4SkillLevels?.[skillId] ?? 1;
  const evolution = mir4SkillEvolutionFor(
    entity.mir4.classId,
    skillId,
    rawCurrentLevel,
    meta.mir4Materials,
  );
  if (!evolution) return { ok: false, reason: 'skill-not-upgradable' };
  if (expectedCurrentLevel !== evolution.currentLevel) {
    return { ok: false, reason: 'stale-level' };
  }
  if (evolution.status === 'maxed' || evolution.cost === null) {
    return { ok: false, reason: 'maxed' };
  }
  if (!evolution.canUpgrade || evolution.nextLevel === null) {
    return { ok: false, reason: 'insufficient-resources' };
  }

  const wallet = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  wallet[evolution.cost.key] = evolution.held - evolution.cost.count;
  meta.mir4Materials = wallet;
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
