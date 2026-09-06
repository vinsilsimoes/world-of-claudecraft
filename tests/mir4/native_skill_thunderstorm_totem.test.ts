import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import { mir4NativeTotemEvidenceById } from '../../src/sim/content/mir4/native_skill_totem_evidence';
import type { Mir4NativeTotemCatalogEntry } from '../../src/sim/content/mir4/native_skill_totem_types';
import { mir4SkillById } from '../../src/sim/content/mir4/skills_runtime';
import {
  compileMir4ThunderstormTotemRuntimePlan,
  mir4NativeRuntimeTotemPlan,
} from '../../src/sim/mir4/native_skill_totem_runtime';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';

function sourcePair() {
  const action = mir4NativeDirectSkillActionEvidenceById(2301);
  const entry = mir4NativeTotemEvidenceById(1001);
  if (!action || !entry) throw new Error('Missing Thunderstorm source evidence');
  return { action, entry };
}

describe('MIR4 Thunderstorm persistent-area Totem', () => {
  it('preserves one telegraph and four rapid magic contacts from the native chain', () => {
    const { action, entry } = sourcePair();
    const plan = compileMir4ThunderstormTotemRuntimePlan(action, entry);

    expect(plan.telegraphs).toEqual([
      {
        attackId: 230112,
        offsetMs: 800,
        area: {
          impactType: 2,
          radiusMinYards: 0,
          radiusMaxYards: 7,
          heightYards: 4,
          targetCap: 10,
          nativeOffset: { x: 0, y: 0, z: 0 },
        },
      },
    ]);
    expect(plan.contacts.map((contact) => contact.attackId)).toEqual([
      230113, 230114, 230115, 230116,
    ]);
    expect(plan.contacts.map((contact) => contact.offsetMs)).toEqual([900, 950, 1000, 1050]);
    expect(plan.contacts.map((contact) => contact.coefficient)).toEqual([
      7300, 7300, 7300, 7300,
    ]);
    expect(plan.contacts.map((contact) => contact.levelUpCoefficient)).toEqual([
      150, 150, 150, 150,
    ]);
    expect(plan.aggregateCoefficient).toBe(29_200);
    expect(plan.aggregateLevelUpCoefficient).toBe(600);
    expect(action.hitCount).toBe(5);
  });

  it('admits Thunderstorm only with its immutable direct plus Totem execution plan', () => {
    const { action } = sourcePair();
    const skill = mir4SkillById(2301);
    if (!skill) throw new Error('Missing Thunderstorm runtime skill');

    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.rows.every((row) => row.contacts.length === 0)).toBe(true);
    expect(result.plan.totem).toEqual(mir4NativeRuntimeTotemPlan(2301));
    expect(Object.isFrozen(result.plan.totem)).toBe(true);
    expect(Object.isFrozen(result.plan.totem?.telegraphs)).toBe(true);
  });

  it('keeps the fixed target anchor, four-second lifetime, and no-repeat boundary explicit', () => {
    const plan = mir4NativeRuntimeTotemPlan(2301);

    expect(plan?.reconstruction).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2301.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 4000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    });
    expect(plan?.spawnOffsetMs).toBe(100);
    expect(plan?.attackDelayMs).toBe(6000);
    expect(plan?.repeatBeforeExpiry).toBe(false);
    expect(plan?.targetSelection).toEqual({
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    });
  });

  it('uses the exact changing radius, cap, lightning attribute, and generic hit reaction', () => {
    const plan = mir4NativeRuntimeTotemPlan(2301);
    if (!plan || plan.skillId !== 2301) throw new Error('Missing Thunderstorm runtime plan');

    expect(plan.contacts.map((contact) => [
      contact.area.radiusMaxYards,
      contact.area.heightYards,
      contact.area.targetCap,
      contact.damageAttribute,
    ])).toEqual([
      [7, 4, 10, 3],
      [7, 4, 10, 3],
      [7, 4, 10, 3],
      [3.5, 4, 8, 3],
    ]);
    expect(plan.contacts.map((contact) => contact.reaction)).toEqual(
      Array.from({ length: 4 }, () => ({
        kind: 'hit',
        stance: 'hit-01',
        nativeValue: 0,
        moveDistanceYards: 0,
        moveDurationMs: 0,
        durationMs: 200,
        probabilityPercent: 100,
        direction: 0,
      })),
    );
  });

  it('retains Totem-owned combat fields and fails closed on reviewed source drift', () => {
    const plan = mir4NativeRuntimeTotemPlan(2301);
    expect(plan?.ownerSnapshot).toEqual({
      damagePower: 'owner-spell-power-at-cast',
      combatPower: 'owner-at-spawn',
      accuracyNative: 3000,
      criticalNative: 1300,
      criticalOutcomeNative: 12000,
    });

    const { action, entry } = sourcePair();
    const changed = structuredClone(entry) as Mir4NativeTotemCatalogEntry;
    Object.assign(changed.attackRows[3] as object, {
      damage: { ...changed.attackRows[3].damage, coefficient: 7301 },
    });
    expect(() => compileMir4ThunderstormTotemRuntimePlan(action, changed)).toThrow(
      'AttackID 230115 coefficient',
    );
  });
});
