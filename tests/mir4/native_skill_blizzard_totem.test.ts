import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import { mir4NativeTotemEvidenceById } from '../../src/sim/content/mir4/native_skill_totem_evidence';
import type { Mir4NativeTotemCatalogEntry } from '../../src/sim/content/mir4/native_skill_totem_types';
import { mir4SkillById } from '../../src/sim/content/mir4/skills_runtime';
import { mir4NativeRuntimeImpactTimingPolicy } from '../../src/sim/mir4/native_skill_blizzard_timing';
import { compileMir4BlizzardTotemRuntimePlan } from '../../src/sim/mir4/native_skill_blizzard_totem';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';

function sourcePair() {
  const action = mir4NativeDirectSkillActionEvidenceById(2203);
  const entry = mir4NativeTotemEvidenceById(1008);
  if (!action || !entry) throw new Error('Missing Blizzard source evidence');
  return { action, entry };
}

describe('MIR4 Blizzard persistent-area Totem', () => {
  it('promotes the native direct plus Totem graph as one executable seven-impact action', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(2203);
    const totem = mir4NativeRuntimeTotemPlan(2203);

    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).not.toBeNull();
    expect(authority?.plan?.sourceHitCount).toBe(7);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)[0]?.offsetMs).toBe(1600);
    expect(totem?.contacts).toHaveLength(6);
    expect(totem?.aggregateCoefficient).toBe(21_600);
    expect(totem?.aggregateLevelUpCoefficient).toBe(420);
  });

  it('preserves all six field contacts, source coefficients, frost attribute, area, and reaction chance', () => {
    const { action, entry } = sourcePair();
    const plan = compileMir4BlizzardTotemRuntimePlan(action, entry);

    expect(plan.contacts.map((contact) => contact.attackId)).toEqual([
      220311, 220311, 220312, 220313, 220313, 220314,
    ]);
    expect(plan.contacts.map((contact) => contact.offsetMs)).toEqual([
      555, 750, 950, 1150, 1550, 1750,
    ]);
    expect(plan.contacts.map((contact) => contact.coefficient)).toEqual([
      3450, 3450, 3900, 3450, 3450, 3900,
    ]);
    expect(plan.contacts.map((contact) => contact.levelUpCoefficient)).toEqual([
      65, 65, 80, 65, 65, 80,
    ]);
    expect(plan.contacts.map((contact) => [
      contact.damageAttribute,
      contact.area.radiusMaxYards,
      contact.area.heightYards,
      contact.area.targetCap,
      contact.reaction.probabilityPercent,
    ])).toEqual(Array.from({ length: 6 }, () => [2, 7, 4, 10, 10]));
  });

  it('keeps the fixed cast anchor, six-second lifetime, and no-repeat boundary explicit', () => {
    const plan = mir4NativeRuntimeTotemPlan(2203);

    expect(plan?.reconstruction).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2203.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 6000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    });
    expect(plan?.spawnOffsetMs).toBe(100);
    expect(plan?.attackDelayMs).toBe(8000);
    expect(plan?.repeatBeforeExpiry).toBe(false);
    expect(plan?.ownerSnapshot).toEqual({
      damagePower: 'owner-spell-power-at-cast',
      combatPower: 'owner-at-spawn',
      accuracyNative: 3000,
      criticalNative: 2500,
      criticalOutcomeNative: 12000,
    });
  });

  it('labels the ambiguous direct timestamp and keeps it inside the cast', () => {
    const { action } = sourcePair();
    const direct = action.rows.find((row) => row.attackId === 220302);
    if (!direct) throw new Error('Missing Blizzard direct row');

    expect(mir4NativeRuntimeImpactTimingPolicy(action, direct)).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2203.row-local-impact-time-v1',
      skillId: 2203,
      attackId: 220302,
      sourceImpactStartMs: 900,
      sourceImpactTimeMs: 700,
      offsetsMs: [1600],
      unresolvedNativeFact: 'native-impact-time-reference-frame',
    });
  });

  it('admits only the immutable reviewed source and fails closed on Totem drift', () => {
    const { action, entry } = sourcePair();
    const skill = mir4SkillById(2203);
    if (!skill) throw new Error('Missing Blizzard runtime skill');
    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.totem).toEqual(mir4NativeRuntimeTotemPlan(2203));
    expect(Object.isFrozen(result.plan.totem)).toBe(true);
    expect(Object.isFrozen(result.plan.totem?.contacts)).toBe(true);

    const changed = structuredClone(entry) as Mir4NativeTotemCatalogEntry;
    Object.assign(changed.attackRows[0] as object, {
      reaction: { ...changed.attackRows[0].reaction, probabilityPercent: 11 },
    });
    expect(() => compileMir4BlizzardTotemRuntimePlan(action, changed)).toThrow(
      'AttackID 220311 reaction chance',
    );
  });
});
