import { describe, expect, it } from 'vitest';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';

describe('MIR4 Rain of Blades native direct and Totem plan', () => {
  it('compiles one hybrid direct contact and two hybrid phantom contacts', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(3104);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).not.toBeNull();

    const direct = authority?.plan?.rows.find((row) => row.attackId === 310402);
    expect(
      direct?.contacts.map((contact) => ({
        offsetMs: contact.offsetMs,
        sourceImpactIndex: contact.sourceImpactIndex,
        damage: contact.damage,
      })),
    ).toEqual([
      {
        offsetMs: 1000,
        sourceImpactIndex: 0,
        damage: {
          damageType: 1,
          damageAttribute: 0,
          coefficient: 6000,
          levelUpCoefficient: 130,
          componentImpactCount: 1,
          allocationMode: 'per-impact',
        },
      },
      {
        offsetMs: 1000,
        sourceImpactIndex: 0,
        damage: {
          damageType: 2,
          damageAttribute: 0,
          coefficient: 3000,
          levelUpCoefficient: 60,
          componentImpactCount: 1,
          allocationMode: 'per-impact',
        },
      },
    ]);

    const totem = mir4NativeRuntimeTotemPlan(3104);
    expect(totem).toMatchObject({
      skillId: 3104,
      spawnAttackId: 310401,
      totemId: 1010,
      spawnOffsetMs: 100,
      attackDelayMs: 6000,
      repeatBeforeExpiry: false,
      aggregateCoefficient: 21_000,
      aggregateLevelUpCoefficient: 410,
      aggregateDamage: {
        physical: { coefficient: 13_000, levelUpCoefficient: 270 },
        magic: { coefficient: 8_000, levelUpCoefficient: 140 },
      },
    });
    expect(
      totem?.contacts.map(({ attackId, offsetMs, damageComponents, area, reaction }) => ({
        attackId,
        offsetMs,
        damageComponents,
        radius: area.radiusMaxYards,
        targetCap: area.targetCap,
        reaction: {
          kind: reaction.kind,
          stance: reaction.stance,
          durationMs: reaction.durationMs,
        },
      })),
    ).toEqual([
      {
        attackId: 310411,
        offsetMs: 480,
        damageComponents: [
          { damageType: 1, damageAttribute: 0, coefficient: 6000, levelUpCoefficient: 130 },
          { damageType: 2, damageAttribute: 0, coefficient: 4000, levelUpCoefficient: 70 },
        ],
        radius: 6,
        targetCap: 8,
        reaction: { kind: 'hit', stance: 'hit-01', durationMs: 300 },
      },
      {
        attackId: 310412,
        offsetMs: 680,
        damageComponents: [
          { damageType: 1, damageAttribute: 0, coefficient: 7000, levelUpCoefficient: 140 },
          { damageType: 2, damageAttribute: 0, coefficient: 4000, levelUpCoefficient: 70 },
        ],
        radius: 6,
        targetCap: 8,
        reaction: { kind: 'hit', stance: 'hit-01', durationMs: 300 },
      },
    ]);
  });
});
