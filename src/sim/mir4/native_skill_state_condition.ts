import { mir4NativeSkillActionById } from '../content/mir4';
import { mir4NativeGreaterHealPolicy } from './native_skill_greater_heal';
import { mir4NativeGuardianCirclePolicy } from './native_skill_guardian_circle';
import { mir4NativeRuntimeUnbreakableStancePolicy } from './native_skill_unbreakable_stance';

export interface Mir4NativeStateConditionPolicy {
  readonly skillId: 1502 | 3501 | 3504;
  readonly stateConditionUse: true;
  readonly usableWhileStunnedFromRank: 8;
  readonly conditionalBuffId: 10117 | 30306;
}

const UNBREAKABLE_STANCE = Object.freeze({
  skillId: 1502 as const,
  stateConditionUse: true as const,
  usableWhileStunnedFromRank: 8 as const,
  conditionalBuffId: 10117 as const,
});

const GUARDIAN_CIRCLE = Object.freeze({
  skillId: 3501 as const,
  stateConditionUse: true as const,
  usableWhileStunnedFromRank: 8 as const,
  conditionalBuffId: 30306 as const,
});

const GREATER_HEAL = Object.freeze({
  skillId: 3504 as const,
  stateConditionUse: true as const,
  usableWhileStunnedFromRank: 8 as const,
  conditionalBuffId: 30306 as const,
});

export function mir4NativeRuntimeStateConditionPolicy(
  skillId: number,
): Mir4NativeStateConditionPolicy | null {
  if (skillId === GUARDIAN_CIRCLE.skillId) {
    const action = mir4NativeSkillActionById(skillId);
    const rank8 = mir4NativeGuardianCirclePolicy(8);
    if (!action?.nativeBehavior.stateConditionUse || rank8?.usableWhileStunned !== true) {
      return null;
    }
    return GUARDIAN_CIRCLE;
  }
  if (skillId === GREATER_HEAL.skillId) {
    const action = mir4NativeSkillActionById(skillId);
    const rank8 = mir4NativeGreaterHealPolicy(8);
    if (!action?.nativeBehavior.stateConditionUse || rank8?.usableWhileStunned !== true) {
      return null;
    }
    return GREATER_HEAL;
  }
  if (skillId !== UNBREAKABLE_STANCE.skillId) return null;
  const action = mir4NativeSkillActionById(skillId);
  const rank8 = mir4NativeRuntimeUnbreakableStancePolicy(8);
  if (
    !action?.nativeBehavior.stateConditionUse ||
    rank8?.usableWhileStunned !== true ||
    rank8.whileStunned[0]?.buffId !== UNBREAKABLE_STANCE.conditionalBuffId
  ) {
    return null;
  }
  return UNBREAKABLE_STANCE;
}
