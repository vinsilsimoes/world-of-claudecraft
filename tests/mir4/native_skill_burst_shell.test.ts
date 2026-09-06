import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import { applyMir4NativeBurstShellContact, MIR4_NATIVE_BURST_SHELL_RANK_EVIDENCE, mir4NativeBurstShellMonsterDamageBasisPoints, mir4NativeBurstShellPolicy } from '../../src/sim/mir4/native_skill_burst_shell';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed: number): Sim {
  return new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Burst Shell QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
}

function spawnTarget(sim: Sim) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'burst_shell_unit_target',
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Burst Shell native rank effects', () => {
  it('pins the sealed evidence and exact rank 1/5/8/10 milestones', () => {
    expect(MIR4_NATIVE_BURST_SHELL_RANK_EVIDENCE.provenance).toEqual({
      specialAbilitySha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
      passiveSha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
      buffSha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
    });
    expect(mir4NativeBurstShellPolicy(1)).toMatchObject({
      defense: { passiveLevel: 1, physicalDefenseFlat: -50, spellDefenseFlat: -50 },
      burn: null,
      damageAmplification: null,
      monsterDamageBoostBasisPoints: 0,
    });
    expect(mir4NativeBurstShellPolicy(5)).toMatchObject({
      defense: { passiveLevel: 4, physicalDefenseFlat: -80, spellDefenseFlat: -80 },
      burn: null,
      damageAmplification: null,
    });
    expect(mir4NativeBurstShellPolicy(8)).toMatchObject({
      defense: { passiveLevel: 6, physicalDefenseFlat: -100, spellDefenseFlat: -100 },
      burn: { passiveLevel: 1, physicalAttackBasisPoints: 1000 },
      damageAmplification: {
        passiveLevel: 1,
        nativeDamageReductionValue: -100,
        resolvedDamageReductionBasisPoints: -1000,
      },
      monsterDamageBoostBasisPoints: 800,
    });
    expect(mir4NativeBurstShellPolicy(10)).toMatchObject({
      defense: { passiveLevel: 16, physicalDefenseFlat: -200, spellDefenseFlat: -200 },
      burn: { passiveLevel: 2, physicalAttackBasisPoints: 2000 },
      damageAmplification: {
        passiveLevel: 2,
        nativeDamageReductionValue: -250,
        resolvedDamageReductionBasisPoints: -2500,
      },
      monsterDamageBoostBasisPoints: 1200,
    });
  });

  it('applies both defense lanes, physical-attack burn and damage amplification on 410311', () => {
    const sim = makeArbalist(4103);
    const target = spawnTarget(sim);
    sim.player.attackPower = 1000;
    const result = applyMir4NativeBurstShellContact(
      sim.ctx,
      sim.player,
      target,
      410311,
      10,
      1000,
    );
    expect(result).toEqual({
      applied: true,
      physicalDefenseReduced: true,
      spellDefenseReduced: true,
      burning: true,
      damageAmplified: true,
    });
    expect(mir4NativeStatusBonus(target, 24)).toBe(-200);
    expect(mir4NativeStatusBonus(target, 26)).toBe(-200);
    expect(mir4NativeStatusBonus(target, 47)).toBe(-2500);
    expect(target.mir4NativePeriodicDamage).toEqual([
      expect.objectContaining({
        buffId: 40505,
        skillId: 4103,
        attackId: 410311,
        skillLevel: 2,
        entries: [{ buffIndex: 2002, channel: 'physical', rawDamage: 200 }],
      }),
    ]);
  });

  it('keeps monster damage restricted to Burst Shell and its rank milestones', () => {
    const sim = makeArbalist(4104);
    const target = spawnTarget(sim);
    expect(mir4NativeBurstShellMonsterDamageBasisPoints(4103, target, 1)).toBe(10_000);
    expect(mir4NativeBurstShellMonsterDamageBasisPoints(4103, target, 8)).toBe(10_800);
    expect(mir4NativeBurstShellMonsterDamageBasisPoints(4103, target, 10)).toBe(11_200);
    expect(mir4NativeBurstShellMonsterDamageBasisPoints(4102, target, 10)).toBe(10_000);
  });
});
