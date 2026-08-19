import { describe, expect, it } from 'vitest';
import {
  MIR4_AUTHORIAL_SKILL_POLICIES,
  MIR4_SKILL_GLOBAL_COOLDOWN_MS,
  MIR4_SKILLS,
  mir4SkillById,
  mir4SkillsForClass,
} from '../../src/sim/content/mir4';
import { mir4CoefficientDamage, mir4SkillManaCost } from '../../src/sim/mir4/math';

// Pins are literal source-project values (F:\Dev\Survival-Game
// server/mir4-combat-data.js, mir4-skill-execution-contract-v1.js,
// mir4-authorial-skills-v1.js).

const WARRIOR_LEVEL_1 = { attackPower: 50, manaCostStat: 204 };

describe('the mir4 skill catalog shape', () => {
  it('is 25 unique skills, five per class, one AoE role each', () => {
    expect(MIR4_SKILLS).toHaveLength(25);
    expect(new Set(MIR4_SKILLS.map((s) => s.skillId)).size).toBe(25);
    for (let classId = 1; classId <= 5; classId++) {
      const kit = mir4SkillsForClass(classId as 1 | 2 | 3 | 4 | 5);
      expect(kit).toHaveLength(5);
      expect(kit.map((s) => s.slot).sort()).toEqual([1, 2, 3, 4, 5]);
      expect(kit.some((s) => s.roles.includes('aoe'))).toBe(true);
    }
    expect(mir4SkillById(9999)).toBeNull();
  });
  it('slot 5 unlocks at level 5; the shared GCD is 1000 ms', () => {
    for (const skill of MIR4_SKILLS) {
      if (skill.slot === 5) expect(skill.unlock).toEqual({ kind: 'level', level: 5 });
      else expect(skill.unlock).toEqual({ kind: 'initial-deck' });
    }
    expect(MIR4_SKILL_GLOBAL_COOLDOWN_MS).toBe(1000);
  });
  it('the seven authorial skills carry their canon policies', () => {
    const authorial = MIR4_SKILLS.filter((s) => s.provenance === 'authorial-v1');
    expect(authorial.map((s) => s.skillId).sort()).toEqual([
      2301, 2501, 3301, 3506, 4103, 5104, 5201,
    ]);
    expect(Object.keys(MIR4_AUTHORIAL_SKILL_POLICIES).map(Number).sort()).toEqual(
      authorial.map((s) => s.skillId).sort(),
    );
    for (const policy of Object.values(MIR4_AUTHORIAL_SKILL_POLICIES)) {
      expect(policy.nativeClaim).toBe(false);
      expect(policy.autoBattleEligible).toBe(true);
    }
    expect(MIR4_AUTHORIAL_SKILL_POLICIES[4103]?.damage.levelOneDamage).toBe(115);
    expect(MIR4_AUTHORIAL_SKILL_POLICIES[4103]?.mpCost).toBe(42);
  });
});

describe('pinned skills (warrior 1102, taoist 3101, arbalist 4106)', () => {
  it('1102 Golpe de Vacuo: cost, cooldown, three-impact damage, 900ms stun', () => {
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
    expect(skill?.roles).toEqual(['debuff', 'single-target']);
    expect(skill?.effect).toMatchObject({ effect: 'stun', durationMs: 900 });
    const components = skill?.damage?.components ?? [];
    expect(components.map((c) => c.coefficient)).toEqual([8000, 8000, 9000]);
    expect(skill?.damage?.allocationMode).toBe('per-impact');
    // per-impact at PA 50: floor(50*coef/10000) per component = 40+40+45
    expect(
      components.map((c) => mir4CoefficientDamage(WARRIOR_LEVEL_1.attackPower, c.coefficient)),
    ).toEqual([40, 40, 45]);
  });
  it('3101 Sequencia de Selo: row-total-impact-vector splits per impact', () => {
    const skill = mir4SkillById(3101);
    expect(skill?.classId).toBe(3);
    expect(skill?.cooldownMs).toBe(16_000);
    expect(skill?.hitCount).toBe(7);
    expect(skill?.damage?.allocationMode).toBe('row-total-impact-vector');
    expect(skill?.minTargets).toBe(3);
    expect(skill?.effect).toMatchObject({
      effect: 'defense-break',
      durationMs: 4000,
      magnitude: 0.1,
      areaRadiusPx: 104,
      maxSecondaryTargets: 3,
      secondaryDamageBasisPoints: 6500,
    });
    // 4 components of coefficient 5000 at PA 50: 25 + floor(25/2)*2 * 3 = 97
    const total = (skill?.damage?.components ?? []).reduce((sum, c) => {
      const coefficientDamage = mir4CoefficientDamage(50, c.coefficient);
      return sum + Math.floor(coefficientDamage / c.impactCount) * c.impactCount;
    }, 0);
    expect(total).toBe(97);
  });
  it('4106 Investida: 2000ms stun, 100% PvE / 10% PvP, single 17000 component', () => {
    const skill = mir4SkillById(4106);
    expect(skill?.classId).toBe(4);
    expect(skill?.cooldownMs).toBe(20_000);
    expect(skill?.roles).toEqual(['survival-utility', 'single-target']);
    expect(skill?.effect).toMatchObject({
      effect: 'stun',
      durationMs: 2000,
      pveChanceBasisPoints: 10_000,
      pvpChanceBasisPoints: 1000,
    });
    expect(skill?.damage?.components).toHaveLength(1);
    expect(mir4CoefficientDamage(50, skill!.damage!.components[0]!.coefficient)).toBe(85);
  });
  it('1501 Golpe de Vendaval: the warrior level-5 supplemental kit entry', () => {
    const skill = mir4SkillById(1501);
    expect(skill?.classId).toBe(1);
    expect(skill?.slot).toBe(5);
    expect(skill?.unlock).toEqual({ kind: 'level', level: 5 });
    expect(skill?.cooldownMs).toBe(44_000);
    expect(skill?.skillCost).toBe(3400);
    expect(skill?.browserRangePx).toBe(104);
    expect(skill?.damage).toBeNull(); // the source ships no damage block for supplemental rows
  });
});
