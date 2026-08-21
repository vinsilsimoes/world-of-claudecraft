// Authoritative claims for the source-backed MIR4 player-level achievement
// group. State lives on PlayerMeta and every mutation is profile-scoped,
// deterministic and included in the shared MIR4 persistence projection.

import {
  type Mir4LevelAchievementDef,
  mir4AchievementPortBonus,
  mir4LevelAchievement,
} from '../content/mir4/achievements';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { MIR4_PERSISTED_COUNT_CAP } from './persistence';
import { MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES } from './skill_evolution';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4Currencies {
  darksteel: number;
}

export type Mir4AchievementClears = Record<number, number>;

export type Mir4AchievementClaimResult =
  | { ok: true; achievementId: number; groupGrade: number }
  | {
      ok: false;
      reason:
        | 'missing-player'
        | 'unknown-achievement'
        | 'not-cleared'
        | 'grade-order'
        | 'already-claimed';
    };

function saturatingCredit(current: number, reward: number, cap = MIR4_PERSISTED_COUNT_CAP): number {
  const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  if (safeCurrent >= cap) return safeCurrent;
  return Math.min(cap, safeCurrent + reward);
}

export function mir4AchievementClaimability(
  definition: Mir4LevelAchievementDef,
  level: number,
  clears: Readonly<Mir4AchievementClears> | undefined,
): 'claimed' | 'claimable' | 'locked' | 'grade-order' {
  const currentGrade = clears?.[definition.groupId] ?? 0;
  if (currentGrade >= definition.groupGrade) return 'claimed';
  if (definition.groupGrade !== currentGrade + 1) return 'grade-order';
  return level >= definition.requiredLevel ? 'claimable' : 'locked';
}

export function claimMir4Achievement(
  ctx: SimContext,
  pid: number,
  achievementId: number,
): Mir4AchievementClaimResult {
  const entity = ctx.entities.get(pid);
  const meta = ctx.players.get(pid);
  if (ctx.gameProfile !== MIR4_GAME_PROFILE || !entity?.mir4 || !meta) {
    return { ok: false, reason: 'missing-player' };
  }
  const definition = mir4LevelAchievement(achievementId);
  if (!definition) return { ok: false, reason: 'unknown-achievement' };

  const status = mir4AchievementClaimability(
    definition,
    Math.max(1, Math.floor(entity.level)),
    meta.mir4AchievementClears,
  );
  if (status === 'claimed') return { ok: false, reason: 'already-claimed' };
  if (status === 'grade-order') return { ok: false, reason: 'grade-order' };
  if (status === 'locked') return { ok: false, reason: 'not-cleared' };

  const resources = meta.mir4SkillResources ?? MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES;
  const portBonus = mir4AchievementPortBonus(definition.achievementId);
  const darksteel = meta.mir4Currencies?.darksteel ?? 0;
  meta.copper = saturatingCredit(meta.copper, definition.rewards.copper, Number.MAX_SAFE_INTEGER);
  meta.mir4Currencies = {
    darksteel: saturatingCredit(darksteel, definition.rewards.darksteel),
  };
  meta.mir4SkillResources = {
    effectPoints: saturatingCredit(resources.effectPoints, definition.rewards.effectPoints),
    skillTomes: saturatingCredit(resources.skillTomes, portBonus?.skillTomes ?? 0),
  };
  meta.mir4AchievementClears = {
    ...meta.mir4AchievementClears,
    [definition.groupId]: definition.groupGrade,
  };
  markMir4WireDirty(meta);
  return {
    ok: true,
    achievementId: definition.achievementId,
    groupGrade: definition.groupGrade,
  };
}
