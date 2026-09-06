// Generated from the source project server/mir4-authorial-skills-v1.js
// (AUTHORIAL_SKILL_POLICIES). DO NOT HAND-EDIT VALUES. These 7 policies are the
// canon combat rule for their skills (nativeClaim false, authorial rebuild); see
// docs/migration/survival-game-port-plan.md "Standing decisions".

import type { Mir4ClassId } from './classes';

export interface Mir4AuthorialDamagePolicy {
  /** 1 = physical, 2 = magic, 'hybrid' = the DamageType 3 authorial rebuild. */
  damageType: number | string;
  physicalAttack: number;
  magicAttack: number;
  physicalCoefficient?: number;
  magicCoefficient?: number;
  impactCount: number;
  allocationMode: string;
  levelOneDamage: number;
}

export interface Mir4AuthorialSkillPolicy {
  model: string;
  policyVersion: string;
  policyId: string;
  authority: string;
  nativeClaim: false;
  classId: Mir4ClassId;
  skillId: number;
  slot: number;
  label: string;
  damage: Mir4AuthorialDamagePolicy;
  mpCost: number;
  cooldownMs: number;
  rangePx: number;
  requiresTarget: boolean;
  castModes: readonly string[];
  autoBattleEligible: boolean;
  /** Verbatim long tail (resolvesNativeUnknowns, effects, buffs...) kept for fidelity. */
  [extra: string]: unknown;
}

export const MIR4_AUTHORIAL_SKILL_POLICIES: Readonly<Record<number, Mir4AuthorialSkillPolicy>> = {
  2301: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class2.skill2301.totem-smite-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 2,
    skillId: 2301,
    slot: 4,
    label: 'Totem strike (magic, immediate) with Smite',
    resolvesNativeUnknowns: [
      'totem AttackDelay/Cleartime/SkillTotemTime collapsed to immediate aggregate',
      'totem stat ownership resolved to the casting player',
      'SmiteBuffID 20020 applied as an authorial attacker damage bonus',
    ],
    nativeBlockerStatus: 'blocked-source-totem-target-buff-semantics',
    damage: {
      damageType: 2,
      physicalAttack: 50,
      magicAttack: 50,
      magicCoefficient: 20000,
      impactCount: 5,
      allocationMode: 'browser-immediate-aggregate',
      levelOneDamage: 100,
    },
    mpCost: 97,
    cooldownMs: 27000,
    rangePx: 117,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: [
      {
        buffId: 20020,
        label: 'Smite',
        applyType: 'authorial-magnitude',
        targetScope: 'attacker',
        damageBonusPercent: 10,
        durationSeconds: 8,
        stackable: false,
      },
    ],
    autoCondition: null,
    policySha256: '44243fcb8410481faf5d26e5f29a0f42889b8803a2a99dee1fb86a30b1083b1c',
  },
  2501: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class2.skill2501.totem-aggregate-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 2,
    skillId: 2501,
    slot: 3,
    label: 'Totem strike (magic, immediate)',
    resolvesNativeUnknowns: [
      'totem AttackDelay/Cleartime/SkillTotemTime collapsed to immediate aggregate',
      'totem stat ownership resolved to the casting player',
      'post-spawn target acquisition resolved to the cast target',
    ],
    nativeBlockerStatus: 'blocked-source-totem-timing-target-stat-ownership',
    damage: {
      damageType: 2,
      physicalAttack: 50,
      magicAttack: 50,
      magicCoefficient: 21000,
      impactCount: 6,
      allocationMode: 'browser-immediate-aggregate',
      levelOneDamage: 105,
    },
    mpCost: 73,
    cooldownMs: 18000,
    rangePx: 117,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: null,
    autoCondition: null,
    policySha256: 'bcb40edfb2e7c83ece2b26353b4aee041d707281912fddaf5c9b1794a7002166',
  },
  3301: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class3.skill3301.totem-aggregate-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 3,
    skillId: 3301,
    slot: 3,
    label: 'Totem strike (magic, immediate)',
    resolvesNativeUnknowns: [
      'totem AttackDelay/Cleartime collapsed to immediate aggregate',
      'spawn-to-first-attack and repeat scheduling collapsed to a single resolved hit',
      'MagicDamage distribution across multi-ImpactTime vectors aggregated',
      'TargetValue 1/6 selection resolved to the cast target',
    ],
    nativeBlockerStatus: 'blocked-source-totem-timing',
    damage: {
      damageType: 2,
      physicalAttack: 50,
      magicAttack: 50,
      magicCoefficient: 23000,
      impactCount: 9,
      allocationMode: 'browser-immediate-aggregate',
      levelOneDamage: 115,
    },
    mpCost: 48,
    cooldownMs: 24000,
    rangePx: 149,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: null,
    autoCondition: null,
    policySha256: '96fbc58f25b02cd2492e551c471b115ba5d192df6109c6730e714c315d80a775',
  },
  3506: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class3.skill3506.totem-aggregate-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 3,
    skillId: 3506,
    slot: 1,
    label: 'Totem strike (magic, immediate)',
    resolvesNativeUnknowns: [
      'totem AttackDelay/Cleartime collapsed to immediate aggregate',
      'spawn-to-first-attack and repeat scheduling collapsed to a single resolved hit',
      'MagicDamage distribution across multi-ImpactTime vectors aggregated',
    ],
    nativeBlockerStatus: 'blocked-source-totem-timing',
    damage: {
      damageType: 2,
      physicalAttack: 50,
      magicAttack: 50,
      magicCoefficient: 22000,
      impactCount: 5,
      allocationMode: 'browser-immediate-aggregate',
      levelOneDamage: 110,
    },
    mpCost: 53,
    cooldownMs: 21000,
    rangePx: 149,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: null,
    autoCondition: null,
    policySha256: '2fb0649ed1b50d00b195ec0cac92b5c0d46e1c315cd2da1f13aac3d2fdcc9479',
  },
  4103: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class4.skill4103.totem-aggregate-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 4,
    skillId: 4103,
    slot: 4,
    label: 'Totem strike (physical, immediate) with vigor',
    resolvesNativeUnknowns: [
      'totem damage composition reconciled to a single physical aggregate',
      'player-vs-totem stat ownership resolved to the casting player (PA 50)',
      'TargetValue=5 selection resolved to the cast target',
      'buff 41010 applied as an authorial attacker damage bonus',
    ],
    nativeBlockerStatus: 'blocked-source-totem-damage-composition',
    damage: {
      damageType: 1,
      physicalAttack: 50,
      magicAttack: 50,
      physicalCoefficient: 23000,
      magicCoefficient: 0,
      impactCount: 5,
      allocationMode: 'browser-immediate-aggregate',
      levelOneDamage: 115,
    },
    mpCost: 42,
    cooldownMs: 26000,
    rangePx: 149,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: [
      {
        buffId: 41010,
        label: 'Vigor',
        applyType: 'authorial-magnitude',
        targetScope: 'attacker',
        damageBonusPercent: 8,
        durationSeconds: 6,
        stackable: false,
      },
    ],
    autoCondition: null,
    policySha256: 'e749631f94d86535fa35071b890fc6f58a58eb41ff03b8bdbc3d8d3f2fc75511',
  },
  5104: {
    model: 'mir4-authorial-skill-policy-v1',
    policyVersion: 'mir4-authorial-combat-v1',
    policyId: 'mir4-authorial.class5.skill5104.auto-condition-v1',
    authority: 'authorial-browser-reconstruction',
    nativeClaim: false,
    classId: 5,
    skillId: 5104,
    slot: 3,
    label: 'Gap-closer strike (AUTO enabled via Less_HP gate)',
    resolvesNativeUnknowns: [
      'ConditionTarget=1 / ConditionType=1 read as Target / Less_HP (recovered client enums)',
      'ConditionRange=1000 interpreted authorially as a 30% HP threshold',
      'condition role defined as an AUTO admission gate (cast only when target HP < 30%)',
    ],
    nativeBlockerStatus: 'blocked-source-condition-semantics',
    damage: {
      damageType: 1,
      physicalAttack: 50,
      magicAttack: 50,
      physicalCoefficient: 16000,
      magicCoefficient: 0,
      impactCount: 2,
      allocationMode: 'browser-immediate-component-vector',
      levelOneDamage: 80,
    },
    mpCost: 36,
    cooldownMs: 18000,
    rangePx: 320,
    requiresTarget: true,
    targetDomain: 'pve',
    castModes: ['manual', 'auto'],
    autoBattleEligible: true,
    effects: null,
    autoCondition: {
      type: 'Less_HP',
      target: 'target',
      thresholdPercent: 30,
      nativeFieldMap: {
        ConditionTarget: 1,
        ConditionType: 1,
        ConditionRange: 1000,
        ConditionCheckTime: 30,
      },
    },
    policySha256: 'a4a897d942ed1e086b5db04079053cff2adc619f4616916476aedfb3fd060620',
  },
};
