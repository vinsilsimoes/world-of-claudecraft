import { describe, expect, it } from 'vitest';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { MIR4_NATIVE_SORCERER_SKILL_ACTIONS } from '../../src/sim/content/mir4/native_skill_actions_sorcerer';
import { mir4NativeGeneratedMechanicalAction } from '../../src/sim/mir4/native_skill_generated_contract';
import { mir4NativeRuntimeMultiImpactPolicy } from '../../src/sim/mir4/native_skill_multi_impact';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';

const SORCERER_REGULAR_SKILL_IDS = Object.freeze([
  2101, 2111, 2501, 2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202,
]);

const ROW_TOTAL_SKILLS = new Set([2201, 2103]);

const BASIC_MISMATCH_CODES = new Set([
  'cooldown-mismatch',
  'skill-cost-type-mismatch',
  'skill-cost-mismatch',
  'attack-animation-mismatch',
  'hit-count-mismatch',
  'unlock-level-mismatch',
  'targeting-mismatch',
  'runtime-range-unresolved',
  'range-mismatch',
  'attack-id-mismatch',
  'runtime-damage-missing',
  'runtime-damage-unexpected',
  'damage-component-missing',
  'damage-component-unexpected',
  'damage-type-mismatch',
  'damage-attribute-mismatch',
  'damage-coefficient-mismatch',
  'damage-level-up-coefficient-mismatch',
  'damage-impact-count-mismatch',
  'damage-aggregate-coefficient-mismatch',
  'damage-aggregate-level-up-coefficient-mismatch',
  'runtime-impact-offsets-missing',
  'impact-offset-mismatch',
]);

describe('MIR4 Sorcerer generated native foundation', () => {
  it('admits all twelve regular actions to shared mechanical projectors', () => {
    for (const skillId of SORCERER_REGULAR_SKILL_IDS) {
      const action = MIR4_NATIVE_SORCERER_SKILL_ACTIONS.find(
        (candidate) => candidate.skillId === skillId,
      );
      expect(mir4NativeGeneratedMechanicalAction(skillId), `${skillId}`).toBe(action);
    }
  });

  it('derives the runtime header, targeting, damage rows and contacts from native evidence', () => {
    for (const skillId of SORCERER_REGULAR_SKILL_IDS) {
      const action = mir4NativeGeneratedMechanicalAction(skillId);
      const skill = mir4SkillById(skillId);
      if (!action || !skill) throw new Error(`Missing Sorcerer foundation ${skillId}`);

      expect(
        {
          cooldownMs: skill.cooldownMs,
          skillCostType: skill.skillCostType,
          skillCost: skill.skillCost,
          attackAnimationMs: skill.attackAnimationMs,
          hitCount: skill.hitCount,
          requiresTarget: skill.requiresTarget,
          attackIds: skill.attackIds,
          impactOffsetsMs: skill.impactOffsetsMs,
        },
        `${skillId} header`,
      ).toEqual({
        cooldownMs: action.cooldownMs,
        skillCostType: action.skillCostType,
        skillCost: action.skillCost,
        attackAnimationMs: action.attackAnimationMs,
        hitCount: action.hitCount,
        requiresTarget: skillId === 2201 || skillId === 2202 ? false : action.targeting,
        attackIds: action.rows.map((row) => row.attackId),
        impactOffsetsMs:
          skillId === 2203
            ? [1600]
            : action.rows
                .filter((row) => row.damage.type !== 0)
                .flatMap((row) => row.impactOffsetsMs),
      });

      const damageRows = action.rows.filter((row) => row.damage.type !== 0);
      if (damageRows.length === 0) {
        expect(skill.damage, `${skillId} no direct damage`).toBeNull();
      } else {
        expect(skill.damage, `${skillId} damage`).toEqual({
          components: damageRows.map((row) => ({
            attackId: row.attackId,
            damageType: row.damage.type,
            damageAttribute: row.damage.attribute,
            coefficient: row.damage.coefficient,
            levelUpCoefficient: row.damage.levelUpCoefficient,
            impactCount: row.impactOffsetsMs.length,
          })),
          aggregateCoefficient: damageRows.reduce(
            (total, row) => total + row.damage.coefficient,
            0,
          ),
          aggregateLevelUpCoefficient: damageRows.reduce(
            (total, row) => total + row.damage.levelUpCoefficient,
            0,
          ),
          allocationMode: ROW_TOTAL_SKILLS.has(skillId) ? 'row-total-impact-vector' : 'per-impact',
        });
      }
      if (skillId === 2503) {
        expect(skill.effect, `${skillId} reviewed native effect`).toEqual({
          effect: 'magic-shield',
          subject: 'actor',
          utility: 'shield',
        });
      } else {
        expect(skill.effect, `${skillId} legacy effect`).toBeNull();
      }
      expect(skill.additionalEffects, `${skillId} legacy additional effects`).toBeUndefined();
      expect(skill.minTargets, `${skillId} legacy target threshold`).toBeNull();
    }
  });

  it('leaves only semantic mechanics, not duplicated catalogue drift, as compile blockers', () => {
    for (const skillId of SORCERER_REGULAR_SKILL_IDS) {
      const authority = mir4RuntimeSkillExecutionAuthority(skillId);
      const basicIssues = (authority?.issues ?? []).filter((issue) =>
        BASIC_MISMATCH_CODES.has(issue.code),
      );
      expect(basicIssues, `${skillId} basic drift`).toEqual([]);
    }
  });

  it('admits exact scaled multi-impact totals and the reviewed Chain Lightning divergence', () => {
    expect(mir4NativeRuntimeMultiImpactPolicy(2201)?.allocationMode).toBe(
      'row-total-impact-vector',
    );
    expect(mir4NativeRuntimeMultiImpactPolicy(2103)?.allocationMode).toBe(
      'row-total-impact-vector',
    );
    expect(mir4NativeRuntimeMultiImpactPolicy(2303)?.allocationMode).toBe('per-impact');
    expect(
      mir4RuntimeSkillExecutionAuthority(2303)?.issues.some(
        (issue) => issue.code === 'unsupported-damage-allocation',
      ),
    ).toBe(false);
  });

  it('reconciles the reviewed magic summary channel without hiding unresolved ownership', () => {
    for (const skillId of [2101, 2111, 2301, 2203, 2303, 2201, 2103, 2202]) {
      expect(
        mir4RuntimeSkillExecutionAuthority(skillId)?.issues.some(
          (issue) => issue.code === 'unresolved-dual-damage-channel',
        ),
        `${skillId} reviewed magic summary`,
      ).toBe(false);
    }
    for (const skillId of [2501, 2503, 2502]) {
      expect(
        mir4RuntimeSkillExecutionAuthority(skillId)?.issues.some(
          (issue) => issue.code === 'unresolved-dual-damage-channel',
        ),
        `${skillId} reviewed skill damage ownership`,
      ).toBe(false);
    }
  });
});
