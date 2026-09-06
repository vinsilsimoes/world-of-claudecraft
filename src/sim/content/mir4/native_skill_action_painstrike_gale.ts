import {
  freezeMir4NativeSkillAction,
  type Mir4NativeSkillAttackRow,
} from './native_skill_action_types';
import { MIR4_NATIVE_ARBALIST_SKILL_ACTIONS } from './native_skill_actions_arbalist';

const SKILL_ID = 4106;

const directAction = MIR4_NATIVE_ARBALIST_SKILL_ACTIONS.find(
  (action) => action.skillId === SKILL_ID,
);

if (!directAction) throw new Error('missing direct Painstrike Gale action evidence');

/**
 * SKILL.AttackLink stops at 410602, but that row links to an exact third
 * SKILL_ATTACK state. The official packet capture emits no 410603 attack
 * packet because it is a zero-damage recovery terminator; it still belongs
 * in the action graph so the compiler can prove the chain closes at zero.
 */
const RECOVERY_TERMINATOR: Mir4NativeSkillAttackRow = {
  attackId: 410603,
  nativeBehavior: {
    source: 'SKILL_ATTACK.json',
    attackUseType: 0,
    rawTargetSubtype: 'TARGET_SUBTYPE::AliveOnly',
    impactSpawnType: 0,
    strikeDelay: 0,
    projectile: null,
    totem: null,
    buffIds: [],
    ccBuffIds: [],
    superIgnore: 0,
    superArmor: 9000,
    actType: 0,
    ccUserCheck: 0,
    attackRagePoint: 1160,
    hitRagePoint: 240,
    aggroRate: 0,
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
  impactStartMs: 800,
  movement: { kind: 'none', nativeRange: 0, delayMs: 0, durationMs: 0 },
  viewTarget: 0,
  targetDistance: { nativeMin: 0, nativeMax: 1400 },
  targetType: 1,
  authorialTargetValue: 5,
  targetSubtype: 'alive-only',
  impactType: 3,
  impactOffsetsMs: [1000],
  geometry: {
    angleDegrees: 360,
    nativeDistanceMin: 0,
    nativeDistanceMax: 600,
    nativeWidth: 0,
    nativeHeight: 500,
    nativeOffset: { x: 100, y: 0, z: 0 },
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
    probabilityPercent: 100,
    direction: 0,
  },
  guideEffectId: 0,
};

export const MIR4_NATIVE_REVIEWED_PAINSTRIKE_GALE_ACTION = freezeMir4NativeSkillAction({
  ...directAction,
  nativeBehavior: directAction.nativeBehavior,
  rows: [...directAction.rows, RECOVERY_TERMINATOR],
});
