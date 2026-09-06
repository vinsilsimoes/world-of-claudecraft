import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4/native_skill_actions';
import {
  applyMir4NativeSkillChillDebuff,
  compileMir4NativeSkillChillDebuff,
  MIR4_NATIVE_CHILL_EVIDENCE,
  mir4NativeRuntimeChillDebuff,
} from '../../src/sim/mir4/native_skill_chill_debuff';
import {
  mir4SkillDamageReductionBonusBps,
} from '../../src/sim/mir4/effects';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';

function entity(id: number): Entity {
  return {
    id,
    kind: id === 1 ? 'player' : 'mob',
    dead: false,
    pos: { x: 0, y: 0, z: 0 },
    prevPos: { x: 0, y: 0, z: 0 },
    vx: 0,
    vy: 0,
    vz: 0,
    facing: 0,
    radius: 0.5,
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    level: 1,
    name: `entity-${id}`,
    auras: [],
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

describe('MIR4 native Chill smite chain', () => {
  it('compiles the exact 102001 -> BUFF 20020 chain for all four Totem contacts', () => {
    const action = mir4NativeSkillActionById(2301);
    if (!action) throw new Error('Missing native 2301 action');

    expect(MIR4_NATIVE_CHILL_EVIDENCE.buff.BuffOverlap).toBe(3);
    expect(compileMir4NativeSkillChillDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 2301,
        contactAttackIds: [230113, 230114, 230115, 230116],
        passiveId: 102001,
        buffId: 20020,
        effectId: 'mir4_native_buff_20020',
        kind: 'native-status-boost',
        nativeStatusId: 45,
        durationMs: 5_000,
        nativeMagnitude: -25,
        probabilityBasisPoints: 10_000,
        overlap: {
          authority: 'authorial-browser-reconstruction',
          nativeClaim: false,
          policyId: 'mir4-authorial.buff-overlap-3-refresh-by-id-v1',
          resolution: 'refresh-by-buff-id',
        },
      },
    });
    expect(compileMir4NativeSkillChillDebuff(action, 10)).toMatchObject({
      ok: true,
      debuff: { durationMs: 14_000, nativeMagnitude: -25 },
    });
  });

  it('fails closed when the reviewed source chain drifts', () => {
    const action = mir4NativeSkillActionById(2301);
    if (!action) throw new Error('Missing native 2301 action');

    expect(
      compileMir4NativeSkillChillDebuff(
        {
          ...action,
          nativeBehavior: { ...action.nativeBehavior, autoLearnPassiveIds: [102002] },
        },
        1,
      ),
    ).toEqual({ ok: false, path: 'action.nativeBehavior.autoLearnPassiveIds' });
  });

  it('admits only Thunderstorm damage contacts', () => {
    expect(mir4NativeRuntimeChillDebuff(2301, 230112, 1)).toBeNull();
    for (const attackId of [230113, 230114, 230115, 230116]) {
      expect(mir4NativeRuntimeChillDebuff(2301, attackId, 1)).toMatchObject({
        buffId: 20020,
        nativeStatusId: 45,
      });
    }
    expect(mir4NativeRuntimeChillDebuff(2501, 250112, 1)).toBeNull();
  });

  it('applies and refreshes the native -25% Skill DMG Reduction contribution', () => {
    const source = entity(1);
    const target = entity(2);
    const ctx = { time: 10 } as SimContext;
    const spec = mir4NativeRuntimeChillDebuff(2301, 230113, 1);
    if (!spec) throw new Error('Missing native Chill runtime spec');

    expect(applyMir4NativeSkillChillDebuff(ctx, source, target, spec)).toBe(true);
    expect(mir4SkillDamageReductionBonusBps(target)).toBe(-2_500);
    expect(target.mir4Effects?.active[0]).toMatchObject({
      effectId: 'mir4_native_buff_20020',
      kind: 'native-status-boost',
      nativeStatusId: 45,
      duration: 5,
      remaining: 5,
      magnitude: -25,
      sourceId: source.id,
    });

    target.mir4Effects!.active[0]!.remaining = 1;
    expect(applyMir4NativeSkillChillDebuff(ctx, source, target, spec)).toBe(true);
    expect(target.mir4Effects?.active).toHaveLength(1);
    expect(target.mir4Effects?.active[0]?.remaining).toBe(5);
  });
});
