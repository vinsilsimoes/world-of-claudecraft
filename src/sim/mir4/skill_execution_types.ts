import type {
  Mir4NativeSkillAction,
  Mir4NativeSkillGeometry,
  Mir4NativeSkillPresentation,
  Mir4NativeTargetSubtype,
} from '../content/mir4/native_skill_action_types';
import type { Mir4SkillDef } from '../content/mir4/skills_runtime';
import type { Mir4NativeRuntimeProjectilePolicy } from './native_skill_projectile';
import type { Mir4NativeRuntimeSkillSourceFacets } from './native_skill_source_facets';
import type { Mir4NativeTotemRuntimePlan } from './native_skill_totem_runtime';

export type Mir4SkillExecutionPlanSource = 'runtime-approved' | 'direct-evidence-only';

export interface Mir4RuntimeApprovedSkillExecutionInput {
  readonly source: 'runtime-approved';
  readonly action: Mir4NativeSkillAction;
  readonly skill: Mir4SkillDef;
}

export interface Mir4DirectEvidenceSkillExecutionInput {
  readonly source: 'direct-evidence-only';
  readonly action: Mir4NativeSkillAction;
  readonly skill?: Mir4SkillDef;
}

export type Mir4SkillExecutionPlanInput =
  | Mir4RuntimeApprovedSkillExecutionInput
  | Mir4DirectEvidenceSkillExecutionInput;

export type Mir4SkillExecutionIssueCode =
  | 'direct-evidence-not-runtime-approved'
  | 'invalid-native-value'
  | 'invalid-runtime-value'
  | 'skill-id-mismatch'
  | 'cooldown-mismatch'
  | 'skill-cost-type-mismatch'
  | 'skill-cost-mismatch'
  | 'attack-animation-mismatch'
  | 'hit-count-mismatch'
  | 'unlock-level-mismatch'
  | 'targeting-mismatch'
  | 'runtime-range-unresolved'
  | 'range-mismatch'
  | 'attack-id-mismatch'
  | 'duplicate-attack-id'
  | 'external-attack-link'
  | 'broken-attack-link'
  | 'invalid-timing'
  | 'decreasing-timing'
  | 'timing-outside-animation'
  | 'runtime-impact-offsets-missing'
  | 'impact-offset-mismatch'
  | 'unsupported-direct-movement'
  | 'unsupported-target-subtype'
  | 'raw-target-subtype-mismatch'
  | 'unresolved-runtime-skill-facet'
  | 'unresolved-native-skill-facet'
  | 'unresolved-native-attack-facet'
  | 'unresolved-attack-use-type'
  | 'unresolved-projectile'
  | 'unresolved-totem'
  | 'unresolved-buff-reference'
  | 'unresolved-super-state'
  | 'unresolved-hit-reaction'
  | 'unresolved-dual-damage-channel'
  | 'unresolved-additive-damage'
  | 'native-damage-projection-mismatch'
  | 'runtime-damage-missing'
  | 'runtime-damage-unexpected'
  | 'duplicate-damage-component'
  | 'damage-component-missing'
  | 'damage-component-unexpected'
  | 'damage-type-mismatch'
  | 'damage-attribute-mismatch'
  | 'damage-coefficient-mismatch'
  | 'damage-level-up-coefficient-mismatch'
  | 'damage-impact-count-mismatch'
  | 'unsupported-damage-allocation'
  | 'damage-aggregate-coefficient-mismatch'
  | 'damage-aggregate-level-up-coefficient-mismatch';

export type Mir4SkillExecutionIssueValue = string | number | boolean | null;

export interface Mir4SkillExecutionIssue {
  readonly code: Mir4SkillExecutionIssueCode;
  readonly path: string;
  readonly attackId?: number;
  readonly relatedAttackId?: number;
  readonly expected?: Mir4SkillExecutionIssueValue;
  readonly actual?: Mir4SkillExecutionIssueValue;
}

export type Mir4SkillExecutionDamageAllocation =
  | 'per-impact'
  | 'row-total-impact-vector'
  /** Every authored timestamp remains a visual arrow contact, but the native
   * server emits one damage packet on the last timestamp of each row. */
  | 'row-total-final-contact';

export interface Mir4SkillExecutionDamagePlan {
  readonly damageType: number;
  readonly damageAttribute: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly componentImpactCount: number;
  readonly allocationMode: Mir4SkillExecutionDamageAllocation;
}

export interface Mir4SkillExecutionContactPlan {
  readonly sourceImpactIndex: number;
  readonly offsetMs: number;
  readonly damage: Mir4SkillExecutionDamagePlan;
}

export interface Mir4SkillExecutionMotionPlan {
  readonly kind: 'target' | 'direct' | 'forward';
  readonly nativeRange: number;
  readonly delayMs: number;
  readonly durationMs: number;
}

export interface Mir4SkillExecutionTargetPlan {
  readonly viewTarget: number;
  readonly nativeDistanceMin: number;
  readonly nativeDistanceMax: number;
  readonly targetType: number;
  readonly authorialTargetValue: number;
  readonly targetSubtype: Mir4NativeTargetSubtype;
  readonly impactType: number;
}

interface Mir4SkillExecutionGuidePlanBase {
  readonly nativeApplyType: 0;
  readonly applyTo: 'self';
  readonly guideEffectId: number;
  readonly materialPathId: number;
  readonly materialAssetPath: string;
  readonly aliveMs: number;
  readonly scalingMs: number;
  readonly materialScalarCurve: 'inside-linear-grow-then-hold';
  readonly indicatorIndex: number;
  readonly colors: {
    readonly primary: readonly [number, number, number];
    readonly secondary: readonly [number, number, number];
    readonly emissive: readonly [number, number, number];
  };
}

export type Mir4SkillExecutionGuidePlan = Mir4SkillExecutionGuidePlanBase &
  (
    | {
        readonly guideEffectType: 3;
        readonly guideShape: 'direct';
        readonly indicatorNativeLength: number;
        readonly indicatorNativeWidth: number;
      }
    | {
        readonly guideEffectType: 2;
        readonly guideShape: 'circle';
        readonly indicatorNativeRadius: number;
      }
    | {
        readonly guideEffectType: 1;
        readonly guideShape: 'sector';
        readonly indicatorNativeAngle: number;
        readonly indicatorNativeRadius: number;
        readonly indicatorNativeOffset: number;
      }
  );

export interface Mir4SkillExecutionRowPlan {
  readonly sourceRowIndex: number;
  readonly attackId: number;
  readonly mainAttack: number;
  readonly nextAttackId: number;
  readonly impactStartMs: number;
  readonly motion: Mir4SkillExecutionMotionPlan | null;
  readonly projectile: Mir4NativeRuntimeProjectilePolicy | null;
  readonly target: Mir4SkillExecutionTargetPlan;
  readonly geometry: Mir4NativeSkillGeometry;
  readonly guide: Mir4SkillExecutionGuidePlan | null;
  readonly nativeCombat: {
    readonly attackRage: { readonly nativePoints: number; readonly gaugePercent: number } | null;
    readonly hitRage: {
      readonly nativePoints: number;
      readonly appliesOnLandedPlayerHit: boolean;
    } | null;
    readonly aggro: { readonly nativeRateBasisPoints: number } | null;
  };
  readonly contacts: readonly Mir4SkillExecutionContactPlan[];
}

export interface Mir4SkillExecutionRangePlan {
  /** Authoritative runtime admission range, in the browser catalogue's pixel scale. */
  readonly runtimePixels: number | null;
  /** Raw native indicator values, preserved without assigning enum semantics. */
  readonly nativeMin: number;
  readonly nativeMax: number;
  /** Dynamic native contact-range policy; present only after its consumer is proven. */
  readonly nativeContactDistanceMax?: number;
  readonly nativeTraceStopPadding?: number;
  readonly nativeTargetHeight?: number;
  readonly blockingCheck?: boolean;
}

export interface Mir4SkillExecutionPlan {
  readonly source: 'runtime-approved';
  readonly skillId: number;
  readonly cooldownMs: number;
  readonly skillCostType: number;
  readonly skillCost: number;
  readonly attackAnimationMs: number;
  readonly endCutAnimationMs: number;
  readonly requiredClassLevel: number;
  readonly runtimeUnlock: Mir4SkillDef['unlock'];
  /** Evidence only. Contact cardinality comes from row impact vectors, never this value. */
  readonly sourceHitCount: number;
  readonly requiresTarget: boolean;
  readonly nativeSkill: Mir4NativeRuntimeSkillSourceFacets | null;
  /** Extracted presentation evidence carried only by a fully compiled action. */
  readonly presentation: Mir4NativeSkillPresentation;
  readonly range: Mir4SkillExecutionRangePlan;
  readonly damageAllocation: Mir4SkillExecutionDamageAllocation | null;
  /** Reviewed durable-area graph spawned by a direct action row, when present. */
  readonly totem: Mir4NativeTotemRuntimePlan | null;
  readonly rows: readonly Mir4SkillExecutionRowPlan[];
}

export interface Mir4SkillExecutionPlanSuccess {
  readonly ok: true;
  readonly plan: Mir4SkillExecutionPlan;
}

export interface Mir4SkillExecutionPlanFailure {
  readonly ok: false;
  readonly issues: readonly Mir4SkillExecutionIssue[];
}

export type Mir4SkillExecutionPlanResult =
  | Mir4SkillExecutionPlanSuccess
  | Mir4SkillExecutionPlanFailure;
