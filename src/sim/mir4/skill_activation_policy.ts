import {
  mir4ActionId,
  mir4ClassIdFromUltimateAction,
  mir4SkillIdFromAction,
  mir4UltimateActionId,
} from './action_abilities';

export type Mir4SkillTargetMode = 'selected-hostile' | 'none';

export interface Mir4SkillActivationPolicy {
  readonly abilityId: string;
  readonly targetMode: Mir4SkillTargetMode;
  readonly approach: 'until-in-range' | 'none';
  readonly faceOnCommit: boolean;
}

// Explicit per-skill activation inventory. These rows intentionally describe
// activation only; impact geometry remains in skills_runtime.ts. The two
// Sorcerer actor-area rows (2201/2202) retain the currently homologated input
// contract until a restorable native client can settle the Targeting-table
// ambiguity with a live replay.
const TARGETED_SKILL_IDS = [
  1102, 1302, 1301, 1101, 1103, 1104, 1501, 1201, 1601, 1304, 1401, 2101, 2111, 2501, 2301, 2203,
  2303, 2502, 2103, 3506, 3101, 3301, 3104, 3103, 3201, 3505, 3203, 4101, 4106, 4102, 4103, 4107,
  4108, 4105, 4109, 4104, 4110, 5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304,
  5202,
] as const;

const TARGETLESS_SKILL_IDS = [
  1502, 2503, 2201, 2204, 2202, 3503, 3501, 3404, 3504, 4111, 4112,
] as const;

const rows: Mir4SkillActivationPolicy[] = [
  ...TARGETED_SKILL_IDS.map((skillId) => ({
    abilityId: mir4ActionId(skillId),
    targetMode: 'selected-hostile' as const,
    approach: 'until-in-range' as const,
    faceOnCommit: true,
  })),
  ...TARGETLESS_SKILL_IDS.map((skillId) => ({
    abilityId: mir4ActionId(skillId),
    targetMode: 'none' as const,
    approach: 'none' as const,
    faceOnCommit: false,
  })),
  ...([1, 2, 3, 4, 5] as const).map((classId) => ({
    abilityId: mir4UltimateActionId(classId),
    targetMode: 'selected-hostile' as const,
    approach: 'until-in-range' as const,
    faceOnCommit: true,
  })),
];

export const MIR4_SKILL_ACTIVATION_POLICIES: readonly Mir4SkillActivationPolicy[] = Object.freeze(
  rows.map((row) => Object.freeze(row)),
);

const POLICY_BY_ACTION = new Map(
  MIR4_SKILL_ACTIVATION_POLICIES.map((policy) => [policy.abilityId, policy]),
);

export function mir4SkillActivationPolicy(abilityId: string): Mir4SkillActivationPolicy | null {
  return POLICY_BY_ACTION.get(abilityId) ?? null;
}

/** Closed-namespace check used by the action router. */
export function isMir4SkillActivationAction(abilityId: string): boolean {
  return (
    mir4SkillIdFromAction(abilityId) !== null || mir4ClassIdFromUltimateAction(abilityId) !== null
  );
}
