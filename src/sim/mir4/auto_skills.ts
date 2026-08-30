// Per-skill automation preferences shared by Auto Battle and focused target
// combat. The player stores only opt-outs, so every newly learned MIR4 skill
// starts enabled just like the 2D source client. Manual casts never read this
// state.

import { mir4SkillById } from '../content/mir4';
import type { Mir4ClassId } from '../content/mir4/classes';
import type { SimContext } from '../sim_context';
import { mir4SkillUnlockLevel } from './skill_progression';
import { markMir4WireDirty } from './wire_revision';

export interface Mir4AutoSkillPreferences {
  mir4DisabledAutoSkills?: number[];
}

function belongsToClass(skillId: number, classId: Mir4ClassId): boolean {
  return mir4SkillById(skillId)?.classId === classId;
}

export function sanitizeMir4DisabledAutoSkills(
  value: unknown,
  classId: Mir4ClassId,
): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const valid = new Set<number>();
  for (const raw of value) {
    if (!Number.isSafeInteger(raw) || !belongsToClass(raw as number, classId)) continue;
    valid.add(raw as number);
  }
  const result = [...valid].sort((a, b) => a - b);
  return result.length > 0 ? result : undefined;
}

export function mir4AutoSkillEnabled(
  preferences: Mir4AutoSkillPreferences | null | undefined,
  skillId: number,
): boolean {
  return !preferences?.mir4DisabledAutoSkills?.includes(skillId);
}

/** Change one class skill's automation preference. Manual use remains available. */
export function setMir4AutoSkillEnabled(
  ctx: SimContext,
  pid: number,
  skillId: number,
  enabled: boolean,
): boolean {
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  const classId = player?.mir4?.classId as Mir4ClassId | undefined;
  const skill = mir4SkillById(skillId);
  if (!meta || !player || classId === undefined || skill?.classId !== classId) return false;
  if (player.level < mir4SkillUnlockLevel(skill)) return false;

  const disabled = new Set(meta.mir4DisabledAutoSkills ?? []);
  const wasEnabled = !disabled.has(skillId);
  if (wasEnabled === enabled) return true;
  if (enabled) disabled.delete(skillId);
  else disabled.add(skillId);
  meta.mir4DisabledAutoSkills = disabled.size > 0 ? [...disabled].sort((a, b) => a - b) : undefined;
  markMir4WireDirty(meta);
  return true;
}
