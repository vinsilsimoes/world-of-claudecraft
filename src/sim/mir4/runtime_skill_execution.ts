import {
  type Mir4NativeSkillAction,
  mir4NativeSkillActionById,
  mir4SkillById,
} from '../content/mir4';
import { compileMir4SkillExecutionPlan } from './skill_execution_plan';
import type { Mir4SkillExecutionIssue, Mir4SkillExecutionPlan } from './skill_execution_types';

export interface Mir4RuntimeSkillExecutionAuthority {
  readonly action: Mir4NativeSkillAction;
  /** Present only when every native/runtime facet compiled without a mismatch. */
  readonly plan: Mir4SkillExecutionPlan | null;
  /** Ordered fail-closed evidence explaining why the plan is not executable. */
  readonly issues: readonly Mir4SkillExecutionIssue[];
}

const AUTHORITY_BY_SKILL_ID = new Map<number, Mir4RuntimeSkillExecutionAuthority | null>();

/**
 * Resolve the one immutable authority used by live MIR4 skill execution.
 *
 * A native action remains available to the legacy compatibility path while a
 * skill is still being homologated. It is never promoted to an executable
 * plan unless the compiler reconciles every recovered native facet with the
 * Aeldrune runtime catalogue. This keeps unfinished skills explicit and makes
 * the completed plan, rather than duplicated hand-authored constants, the
 * source of truth for migrated runtime behavior.
 */
export function mir4RuntimeSkillExecutionAuthority(
  skillId: number,
): Mir4RuntimeSkillExecutionAuthority | null {
  if (AUTHORITY_BY_SKILL_ID.has(skillId)) {
    return AUTHORITY_BY_SKILL_ID.get(skillId) ?? null;
  }

  const action = mir4NativeSkillActionById(skillId);
  if (!action) {
    AUTHORITY_BY_SKILL_ID.set(skillId, null);
    return null;
  }

  const skill = mir4SkillById(skillId);
  if (!skill) {
    const authority = Object.freeze({
      action,
      plan: null,
      issues: Object.freeze([
        Object.freeze({
          code: 'direct-evidence-not-runtime-approved' as const,
          path: 'skill',
          actual: null,
        }),
      ]),
    });
    AUTHORITY_BY_SKILL_ID.set(skillId, authority);
    return authority;
  }

  const compiled = compileMir4SkillExecutionPlan({
    source: 'runtime-approved',
    action,
    skill,
  });
  const authority = Object.freeze({
    action,
    plan: compiled.ok ? compiled.plan : null,
    issues: compiled.ok ? Object.freeze([]) : compiled.issues,
  });
  AUTHORITY_BY_SKILL_ID.set(skillId, authority);
  return authority;
}

export function mir4RuntimeSkillExecutionPlan(skillId: number): Mir4SkillExecutionPlan | null {
  return mir4RuntimeSkillExecutionAuthority(skillId)?.plan ?? null;
}
