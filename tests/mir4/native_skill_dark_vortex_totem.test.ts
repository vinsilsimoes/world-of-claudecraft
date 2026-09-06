import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import { mir4NativeTotemEvidenceById } from '../../src/sim/content/mir4/native_skill_totem_evidence';
import type { Mir4NativeTotemCatalogEntry } from '../../src/sim/content/mir4/native_skill_totem_types';
import { mir4SkillById } from '../../src/sim/content/mir4/skills_runtime';
import {
  compileMir4DarkVortexTotemRuntimePlan,
  mir4NativeRuntimeTotemPlan,
} from '../../src/sim/mir4/native_skill_totem_runtime';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';

function sourcePair() {
  const action = mir4NativeDirectSkillActionEvidenceById(2501);
  const entry = mir4NativeTotemEvidenceById(1009);
  if (!action || !entry) throw new Error('Missing Dark Vortex source evidence');
  return { action, entry };
}

describe('MIR4 Dark Vortex persistent-area Totem', () => {
  it('compiles the exact six-hit skill total from one direct and five Totem contacts', () => {
    const { action, entry } = sourcePair();
    const plan = compileMir4DarkVortexTotemRuntimePlan(action, entry);

    expect(plan.contacts.map((contact) => contact.attackId)).toEqual([
      250111, 250112, 250113, 250114, 250115,
    ]);
    expect(plan.contacts.map((contact) => contact.offsetMs)).toEqual([
      1100, 1300, 1500, 1700, 1800,
    ]);
    expect(plan.contacts.map((contact) => contact.coefficient)).toEqual([
      4000, 4000, 4000, 5000, 5000,
    ]);
    expect(plan.contacts.map((contact) => contact.levelUpCoefficient)).toEqual([
      80, 80, 80, 90, 90,
    ]);
    expect(plan.aggregateCoefficient + 4000).toBe(26_000);
    expect(plan.aggregateLevelUpCoefficient + 80).toBe(500);
    expect(action.hitCount).toBe(6);
  });

  it('admits Dark Vortex only with its immutable direct plus Totem execution plan', () => {
    const { action } = sourcePair();
    const skill = mir4SkillById(2501);
    if (!skill) throw new Error('Missing Dark Vortex runtime skill');

    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.rows[1]?.contacts).toHaveLength(1);
    expect(result.plan.rows[1]?.contacts[0]?.offsetMs).toBe(720);
    expect(result.plan.totem).toEqual(mir4NativeRuntimeTotemPlan(2501));
    expect(Object.isFrozen(result.plan.totem)).toBe(true);
  });

  it('keeps the two missing server facts explicit and never labels the reconstruction native', () => {
    const plan = mir4NativeRuntimeTotemPlan(2501);

    expect(plan?.reconstruction).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2501.totem-anchor-lifetime-v1',
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
  });

  it('uses a fresh PvE-only host-order target list around the fixed vortex origin', () => {
    const plan = mir4NativeRuntimeTotemPlan(2501);

    expect(plan?.targetSelection).toEqual({
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    });
    for (const contact of plan?.contacts ?? []) {
      expect(contact.area).toMatchObject({
        impactType: 2,
        radiusMinYards: 0,
        radiusMaxYards: 4.5,
        heightYards: 3,
        targetCap: 6,
        nativeOffset: { x: 0, y: 0, z: 150 },
      });
    }
  });

  it('pins the alternating pull/push contacts and final knockdown', () => {
    const plan = mir4NativeRuntimeTotemPlan(2501);

    expect(plan?.contacts.map((contact) => contact.reaction)).toEqual([
      {
        kind: 'knock-back',
        stance: 'hit-01',
        nativeValue: 20,
        moveDistanceYards: 0.2,
        moveDurationMs: 200,
        durationMs: 600,
        probabilityPercent: 100,
        direction: 0,
      },
      {
        kind: 'knock-back',
        stance: 'hit-01',
        nativeValue: -20,
        moveDistanceYards: -0.2,
        moveDurationMs: 200,
        durationMs: 400,
        probabilityPercent: 100,
        direction: 0,
      },
      {
        kind: 'knock-back',
        stance: 'hit-01',
        nativeValue: 20,
        moveDistanceYards: 0.2,
        moveDurationMs: 200,
        durationMs: 300,
        probabilityPercent: 100,
        direction: 0,
      },
      {
        kind: 'knock-back',
        stance: 'hit-01',
        nativeValue: -10,
        moveDistanceYards: -0.1,
        moveDurationMs: 100,
        durationMs: 100,
        probabilityPercent: 100,
        direction: 0,
      },
      {
        kind: 'knock-down',
        stance: 'down-02',
        nativeValue: 300,
        moveDistanceYards: 3,
        moveDurationMs: 900,
        durationMs: 2100,
        probabilityPercent: 100,
        direction: 0,
      },
    ]);
  });

  it('retains native Totem-owned roll stats while owner power remains the damage snapshot', () => {
    const plan = mir4NativeRuntimeTotemPlan(2501);

    expect(plan?.ownerSnapshot).toEqual({
      damagePower: 'owner-spell-power-at-cast',
      combatPower: 'owner-at-spawn',
      accuracyNative: 3000,
      criticalNative: 1300,
      criticalOutcomeNative: 12000,
    });
    expect(plan?.combatResolution).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1',
      mapping: 'native-fixed-fields-to-bounded-outcomes',
      hitChanceBps: 9950,
      criticalChanceBps: 1300,
      criticalMultiplierBps: 22000,
      unresolvedNativeFacts: [
        'native-accuracy-admission-modifier-selectors',
        'native-critical-admission-modifier-selectors',
        'native-critical-outcome-branch-arithmetic',
      ],
    });
  });

  it('fails closed if any reviewed source identity drifts', () => {
    const { action, entry } = sourcePair();
    const changed = structuredClone(entry) as Mir4NativeTotemCatalogEntry;
    Object.assign(changed.attackRows[2] as object, {
      damage: { ...changed.attackRows[2].damage, coefficient: 4001 },
    });

    expect(() => compileMir4DarkVortexTotemRuntimePlan(action, changed)).toThrow(
      'AttackID 250113 coefficient',
    );
    expect(mir4NativeRuntimeTotemPlan(9999)).toBeNull();
    expect(Object.isFrozen(mir4NativeRuntimeTotemPlan(2501))).toBe(true);
    expect(Object.isFrozen(mir4NativeRuntimeTotemPlan(2501)?.contacts)).toBe(true);
  });
});
