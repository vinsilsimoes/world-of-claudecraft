import {
  freezeMir4NativeSkillAction,
  type Mir4NativeSkillAttackRow,
} from './native_skill_action_types';
import { MIR4_NATIVE_ARBALIST_SKILL_ACTIONS } from './native_skill_actions_arbalist';

const SKILL_ID = 4112;

const directAction = MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.find(
  (action) => action.skillId === SKILL_ID,
);

if (!directAction) throw new Error('missing direct Cloaking action evidence');

/**
 * SKILL.AttackLink stops at 411202 even though that row links to the exact
 * zero-damage recovery state 411203. Keep the terminator in the reviewed
 * action graph so movement and animation closure are proven rather than
 * silently inferred by the browser runtime.
 */
const RECOVERY_TERMINATOR: Mir4NativeSkillAttackRow = {
  attackId: 411203,
  nativeBehavior: {
    source: 'SKILL_ATTACK.json',
    attackUseType: 1,
    rawTargetSubtype: 'TARGET_SUBTYPE::AliveOnly',
    impactSpawnType: 0,
    strikeDelay: 0,
    projectile: null,
    totem: null,
    buffIds: [],
    ccBuffIds: [],
    superIgnore: 0,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 0,
    attackRagePoint: 0,
    hitRagePoint: 240,
    aggroRate: 8000,
    damageType: 0,
    damageAttribute: 0,
    physicalDamage: {
      coefficient: 0,
      levelUpCoefficient: 0,
      additive: 0,
      levelUpAdditive: 0,
    },
    magicDamage: {
      coefficient: 0,
      levelUpCoefficient: 0,
      additive: 0,
      levelUpAdditive: 0,
    },
    monsterScaleApply: false,
  },
  mainAttack: 3,
  nextAttackId: 0,
  impactStartMs: 400,
  movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
  viewTarget: 2,
  targetDistance: { nativeMin: 0, nativeMax: 1200 },
  targetType: 2,
  authorialTargetValue: 1,
  targetSubtype: 'alive-only',
  impactType: 2,
  impactOffsetsMs: [500],
  geometry: {
    angleDegrees: 360,
    nativeDistanceMin: 0,
    nativeDistanceMax: 500,
    nativeWidth: 0,
    nativeHeight: 500,
    nativeOffset: { x: 0, y: 0, z: 0 },
    rotationDegrees: 0,
  },
  damage: { type: 0, coefficient: 0, levelUpCoefficient: 0, attribute: 0 },
  reaction: {
    kind: 'none',
    stance: 'none',
    value: 0,
    nativeHeight: 0,
    valueEx: 0,
    durationMs: 0,
    probabilityPercent: 0,
    direction: 0,
  },
  guideEffectId: 0,
};

export const MIR4_NATIVE_REVIEWED_CLOAKING_ACTION = freezeMir4NativeSkillAction({
  ...directAction,
  nativeBehavior: directAction.nativeBehavior,
  rows: [...directAction.rows, RECOVERY_TERMINATOR],
});
