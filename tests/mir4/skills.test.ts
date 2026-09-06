import { describe, expect, it } from 'vitest';
import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  MIR4_SKILLS,
  mir4SkillById,
  mir4SkillsForClass,
} from '../../src/sim/content/mir4';
import { mir4CoefficientDamage, mir4SkillManaCost } from '../../src/sim/mir4/math';
import { mir4NativePainstrikeGalePolicy } from '../../src/sim/mir4/native_skill_painstrike_gale';

// Pins are literal source-project values (F:\Dev\Survival-Game
// server/mir4-combat-data.js, mir4-skill-execution-contract-v1.js,
// mir4-authorial-skills-v1.js).

const WARRIOR_LEVEL_1 = { attackPower: 50, manaCostStat: 204 };

describe('the mir4 skill catalog shape', () => {
  it('has complete official regular-skill kits for all five classes', () => {
    expect(MIR4_SKILLS).toHaveLength(60);
    expect(new Set(MIR4_SKILLS.map((s) => s.skillId)).size).toBe(60);
    for (let classId = 1; classId <= 5; classId++) {
      const kit = mir4SkillsForClass(classId as 1 | 2 | 3 | 4 | 5);
      const expectedSlots = Array.from({ length: 12 }, (_, index) => index + 1);
      expect(kit).toHaveLength(expectedSlots.length);
      expect(kit.map((s) => s.slot).sort((a, b) => a - b)).toEqual(expectedSlots);
      expect(kit.some((s) => s.roles.includes('aoe'))).toBe(true);
    }
    expect(mir4SkillById(9999)).toBeNull();
  });
  it('records the official progression curve for every homologated class', () => {
    const officialCurve = [
      { kind: 'initial-deck' },
      { kind: 'initial-deck' },
      { kind: 'initial-deck' },
      { kind: 'initial-deck' },
      { kind: 'level', level: 5 },
      { kind: 'level', level: 8 },
      { kind: 'level', level: 16 },
      { kind: 'level', level: 24 },
      { kind: 'level', level: 32 },
      { kind: 'level', level: 40 },
      { kind: 'level', level: 48 },
      { kind: 'level', level: 56 },
    ];
    for (const classId of [1, 2, 3, 4, 5] as const) {
      expect(mir4SkillsForClass(classId).map((skill) => skill.unlock)).toEqual(officialCurve);
    }
    expect(MIR4_SKILL_GLOBAL_COOLDOWN_MS).toBe(1000);
  });
  it('keeps the homologated Sorcerer rows on native catalog data without authorial catalog skills', () => {
    const authorial = MIR4_SKILLS.filter((s) => s.provenance === 'authorial-v1');
    expect(authorial).toEqual([]);
    expect(mir4SkillById(2301)?.sourceRuntimeStatus).toBe('official-client-catalog');
    expect(mir4SkillById(2501)?.sourceRuntimeStatus).toBe('official-client-catalog');
    expect(mir4SkillById(3301)?.sourceRuntimeStatus).toBe('official-client-catalog');
    expect(mir4SkillById(3506)?.sourceRuntimeStatus).toBe('official-client-catalog');
    expect(MIR4_AUTHORIAL_SKILL_POLICIES[4103]?.damage.levelOneDamage).toBe(115);
    expect(MIR4_AUTHORIAL_SKILL_POLICIES[4103]?.mpCost).toBe(42);
  });
});

describe('pinned skills (warrior 1102, taoist 3101, arbalist 4106)', () => {
  it('1102 Void Slash: cost, cooldown and three physical contacts without hard control', () => {
    const skill = mir4SkillById(1102);
    expect(skill).not.toBeNull();
    expect(skill?.classId).toBe(1);
    expect(skill?.slot).toBe(1);
    expect(skill?.cooldownMs).toBe(25_000);
    expect(skill?.skillCostType).toBe(2);
    expect(skill?.skillCost).toBe(1800);
    expect(
      mir4SkillManaCost(WARRIOR_LEVEL_1.manaCostStat, skill!.skillCost, skill!.skillCostType),
    ).toBe(36);
    expect(skill?.roles).toEqual(['aoe']);
    expect(skill?.effect).toBeNull();
    const components = skill?.damage?.components ?? [];
    expect(components.map((c) => c.coefficient)).toEqual([8000, 8000, 9000]);
    expect(skill?.damage?.allocationMode).toBe('per-impact');
    // per-impact at PA 50: floor(50*coef/10000) per component = 40+40+45
    expect(
      components.map((c) => mir4CoefficientDamage(WARRIOR_LEVEL_1.attackPower, c.coefficient)),
    ).toEqual([40, 40, 45]);
  });
  it('3101 Sunbeam Sword: exact seven-contact frontal sequence', () => {
    const skill = mir4SkillById(3101);
    expect(skill?.classId).toBe(3);
    expect(skill?.cooldownMs).toBe(16_000);
    expect(skill?.skillCost).toBe(1600);
    expect(skill?.attackAnimationMs).toBe(1833);
    expect(skill?.hitCount).toBe(7);
    expect(skill?.browserRangePx).toBe(112);
    expect(skill?.impactOffsetsMs).toEqual([380, 550, 750, 950, 1150, 1350, 1550]);
    expect(skill?.damage?.allocationMode).toBe('row-total-impact-vector');
    expect(skill?.minTargets).toBeNull();
    expect(skill?.effect).toBeNull();
    expect(skill?.roles).toEqual(['aoe', 'debuff']);
    expect(skill?.sourceRuntimeStatus).toBe('official-client-catalog');
    // 4 components of coefficient 5000 at PA 50: 25 + floor(25/2)*2 * 3 = 97
    const total = (skill?.damage?.components ?? []).reduce((sum, c) => {
      const coefficientDamage = mir4CoefficientDamage(50, c.coefficient);
      return sum + Math.floor(coefficientDamage / c.impactCount) * c.impactCount;
    }, 0);
    expect(total).toBe(97);
  });
  it('4106 Painstrike Gale: dedicated rank effects and single 17000 component', () => {
    const skill = mir4SkillById(4106);
    expect(skill?.classId).toBe(4);
    expect(skill?.cooldownMs).toBe(20_000);
    expect(skill?.roles).toEqual(['aoe', 'mobility', 'control']);
    expect(skill?.effect).toBeNull();
    expect(mir4NativePainstrikeGalePolicy(1)?.contact).toMatchObject({
      monsterStunDurationMs: 2_000,
      monsterStunChanceBasisPoints: 10_000,
      playerStunDurationMs: 1_000,
      playerStunChanceBasisPoints: 1_000,
    });
    expect(skill?.damage?.components).toHaveLength(1);
    expect(mir4CoefficientDamage(50, skill!.damage!.components[0]!.coefficient)).toBe(85);
  });
  it('1501 Gale Slash: the fifth Warrior action at level 5', () => {
    const skill = mir4SkillById(1501);
    expect(skill?.classId).toBe(1);
    expect(skill?.slot).toBe(5);
    expect(skill?.unlock).toEqual({ kind: 'level', level: 5 });
    expect(skill?.cooldownMs).toBe(44_000);
    expect(skill?.skillCost).toBe(3400);
    expect(skill?.browserRangePx).toBe(104);
    expect(skill?.hitCount).toBe(9);
    expect(skill?.damage).toEqual({
      components: [
        {
          attackId: 150101,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 9000,
          levelUpCoefficient: 180,
          impactCount: 3,
        },
        {
          attackId: 150102,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 8000,
          levelUpCoefficient: 160,
          impactCount: 2,
        },
        {
          attackId: 150103,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 8000,
          levelUpCoefficient: 160,
          impactCount: 2,
        },
        {
          attackId: 150104,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 6000,
          levelUpCoefficient: 150,
          impactCount: 1,
        },
        {
          attackId: 150105,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 7000,
          levelUpCoefficient: 150,
          impactCount: 1,
        },
      ],
      aggregateCoefficient: 38_000,
      aggregateLevelUpCoefficient: 800,
      allocationMode: 'row-total-impact-vector',
    });
  });
});
