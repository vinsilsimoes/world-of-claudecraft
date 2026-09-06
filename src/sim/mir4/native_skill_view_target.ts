import { mir4NativeSkillActionById } from '../content/mir4';
import type { Entity } from '../types';

const RUNTIME_VIEW_TARGET_ROWS = new Map<number, ReadonlySet<number>>([
  [5104, new Set([510402])],
  [5202, new Set([520202])],
  [5203, new Set([520302])],
  [5301, new Set([530103])],
  [5401, new Set([540102, 540103, 540104, 540105, 540106])],
]);

/** Apply only a reviewed ViewTarget=2 turn toward the retained cast target. */
export function applyMir4NativeViewTargetFacing(
  source: Entity,
  target: Entity | undefined,
  skillId: number,
  attackId: number,
): boolean {
  if (!target || !RUNTIME_VIEW_TARGET_ROWS.get(skillId)?.has(attackId)) return false;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (row?.viewTarget !== 2) return false;
  const dx = target.pos.x - source.pos.x;
  const dz = target.pos.z - source.pos.z;
  if (Math.hypot(dx, dz) <= Number.EPSILON) return false;
  source.facing = Math.atan2(dx, dz);
  return true;
}
