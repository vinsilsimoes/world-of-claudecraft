import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { mir4NativeBashResolution } from '../../src/sim/mir4/native_skill_bash';
import {
  applyMir4NativeObliterateShellKnockdown,
  mir4NativeObliterateShellConditionalDamageBasisPoints,
  mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints,
  mir4NativeObliterateShellPolicy,
} from '../../src/sim/mir4/native_skill_obliterate_shell';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_061): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Obliterate Shell Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(
  sim: Sim,
  suffix: string,
  x: number,
  z: number,
  options: { boss?: boolean } = {},
): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `obliterate_shell_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    boss: options.boss ?? false,
    mir4PhysicalDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4109 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

describe('MIR4 Obliterate Shell integrated runtime', () => {
  it.each([1_000, 2_000])(
    'matches the tooltip total to both queued contacts at %i Attack Power',
    (power) => {
      const sim = makeArbalist();
      sim.player.attackPower = power;
      const target = spawnTarget(sim, 'tooltip', sim.player.pos.x, sim.player.pos.z + 4);
      expect(castMir4Skill(sim.ctx, sim.playerId, 4109, target.id)).toEqual({ ok: true });
      const damage = (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4109 && !impact.effectOnly)
        .reduce((total, impact) => total + impact.rawDamage, 0);
      expect(damage).toBe(power * 2.2);
      expect(mir4ActionRawDamage('mir4_skill_4109', 1, power, 0)).toBe(damage);
    },
  );

  it('rebuilds the second contact after one enemy leaves and another enters the line', () => {
    const sim = makeArbalist();
    const origin = { ...sim.player.pos };
    const leaving = spawnTarget(sim, 'leaving', origin.x, origin.z + 4);
    const entering = spawnTarget(sim, 'entering', origin.x + 4, origin.z + 6);
    for (const target of [leaving, entering]) {
      target.mir4Effects = { active: [], controlImmuneUntil: Number.POSITIVE_INFINITY };
    }
    expect(castMir4Skill(sim.ctx, sim.playerId, 4109, leaving.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.479;
    updateMir4PendingImpacts(sim.ctx);
    expect(leaving.hp).toBe(leaving.maxHp);
    sim.time = 0.48;
    updateMir4PendingImpacts(sim.ctx);
    const firstHp = leaving.hp;
    expect(firstHp).toBeLessThan(leaving.maxHp);
    expect(entering.hp).toBe(entering.maxHp);
    leaving.pos.x = origin.x + 4;
    entering.pos.x = origin.x;
    sim.time = 0.52;
    updateMir4PendingImpacts(sim.ctx);
    expect(leaving.hp).toBe(firstHp);
    expect(entering.hp).toBeLessThan(entering.maxHp);
    const secondHp = entering.hp;
    updateMir4PendingImpacts(sim.ctx);
    expect(entering.hp).toBe(secondHp);
  });

  it('pins the exact rank 1, 5, 8, and 10 milestones', () => {
    expect(mir4NativeObliterateShellPolicy(1)).toMatchObject({
      bashDamageBasisPoints: 5_000,
      monsterKnockdownChanceBasisPoints: 10_000,
      playerKnockdownChanceBasisPoints: 1_000,
      bossSkillDamageBasisPoints: 0,
      stunnedAllDamageBasisPoints: 0,
      playerMultiTargetChanceRule: 'client-passed-unused',
    });
    expect(mir4NativeObliterateShellPolicy(5)).toMatchObject({
      bashDamageBasisPoints: 6_500,
      playerKnockdownChanceBasisPoints: 3_000,
      bossSkillDamageBasisPoints: 3_000,
      stunnedAllDamageBasisPoints: 4_000,
    });
    expect(mir4NativeObliterateShellPolicy(8)).toMatchObject({
      bashDamageBasisPoints: 8_000,
      playerKnockdownChanceBasisPoints: 6_000,
      bossSkillDamageBasisPoints: 6_000,
      stunnedAllDamageBasisPoints: 8_000,
    });
    expect(mir4NativeObliterateShellPolicy(10)).toMatchObject({
      bashDamageBasisPoints: 10_000,
      playerKnockdownChanceBasisPoints: 10_000,
      bossSkillDamageBasisPoints: 9_000,
      stunnedAllDamageBasisPoints: 12_000,
    });
  });

  it('admits the three native rows without the legacy circular fallback', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(4109);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4109,
      attackAnimationMs: 1_000,
      endCutAnimationMs: 900,
      requiresTarget: true,
      range: { nativeContactDistanceMax: 1_200, blockingCheck: true },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([410901, 410902, 410903]);
    expect(authority?.plan?.rows[0]?.contacts).toHaveLength(0);
    expect(authority?.plan?.rows[1]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 480,
        damage: expect.objectContaining({ coefficient: 11_000, levelUpCoefficient: 250 }),
      }),
    ]);
    expect(authority?.plan?.rows[2]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 520,
        damage: expect.objectContaining({ coefficient: 11_000, levelUpCoefficient: 250 }),
      }),
    ]);
  });

  it('approaches to the native trace stop and schedules Focus plus two damage contacts', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 18);
    sim.player.targetId = target.id;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4109', sim.playerId, target.id)).toEqual(
      {
        ok: true,
        queued: true,
      },
    );
    let ticks = 0;
    while (!sim.player.cooldowns.has('4109') && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4109)
        .map((impact) => [
          impact.effectOnly ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ])
        .sort((left, right) => Number(left[1]) - Number(right[1])),
    ).toEqual([
      ['arbalist-focus', 380],
      [410902, 480],
      [410903, 520],
    ]);
  });

  it('re-resolves both 20-by-4-yard frontal strips against at most eight targets', () => {
    const sim = makeArbalist(41_061);
    const origin = { ...sim.player.pos };
    const targets = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(
        sim,
        `strip_${index}`,
        origin.x + (index === 0 ? 0 : index % 2 ? 1.8 : -1.8),
        origin.z + 4 + index,
      ),
    );
    const behind = spawnTarget(sim, 'behind', origin.x, origin.z - 2);
    const side = spawnTarget(sim, 'side', origin.x + 2.6, origin.z + 8);
    for (const target of targets) {
      target.mir4Effects = { active: [], controlImmuneUntil: Number.POSITIVE_INFINITY };
    }
    sim.player.targetId = targets[0]!.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4109, targets[0]!.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events = tickMany(sim, 12);

    for (const target of targets.slice(0, 8)) {
      expect(
        events.filter((event) => event.type === 'damage' && event.targetId === target.id),
      ).toHaveLength(2);
    }
    for (const target of [targets[8]!, behind, side]) {
      expect(events.some((event) => event.type === 'damage' && event.targetId === target.id)).toBe(
        false,
      );
    }
  });

  it('grants one Focus stack at 380ms and applies the 2.1 second knockdown only on 410902', () => {
    const sim = makeArbalist(41_061);
    const target = spawnTarget(sim, 'control', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 4109, target.id)).toEqual({ ok: true });
    forceContacts(sim);

    tickMany(sim, 8);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1 });
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).not.toBe(true);
    tickMany(sim, 2);
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_4109_knockdown'),
    ).toMatchObject({ kind: 'knockdown', duration: 2.1 });
    expect(
      applyMir4NativeObliterateShellKnockdown(sim.ctx, sim.player, target, 410903, 10, 0),
    ).toBe(false);
  });

  it('uses exact uncapped rank chance plus general and PvP knockdown status lanes', () => {
    expect(mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints(1)).toBe(1_000);
    expect(
      mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints(
        5,
        { 119: 200, 127: 300 },
        { 120: 100, 128: 250 },
      ),
    ).toBe(3_150);
    expect(mir4NativeObliterateShellPlayerKnockdownChanceBasisPoints(10)).toBe(10_000);
  });

  it('adds the exact boss and stunned damage packages and preserves Bash on Marked targets', () => {
    const sim = makeArbalist(41_061);
    const target = spawnTarget(sim, 'conditions', sim.player.pos.x, sim.player.pos.z + 4, {
      boss: true,
    });

    expect(mir4NativeObliterateShellConditionalDamageBasisPoints(sim.ctx, target, 4109, 10)).toBe(
      19_000,
    );
    target.mir4Effects = {
      active: [
        {
          effectId: 'test-stun',
          kind: 'stun',
          remaining: 3,
          duration: 3,
          magnitude: 0,
          sourceId: sim.player.id,
        },
        {
          effectId: 'mir4_native_buff_40010_31',
          kind: 'native-status-boost',
          remaining: 10,
          duration: 10,
          magnitude: -25,
          sourceId: sim.player.id,
          nativeStatusId: 31,
        },
      ],
      controlImmuneUntil: 0,
    };
    expect(mir4NativeObliterateShellConditionalDamageBasisPoints(sim.ctx, target, 4109, 10)).toBe(
      31_000,
    );
    expect(mir4NativeBashResolution(sim.ctx, sim.player, target, 4109, 10)).toMatchObject({
      triggered: true,
      skillBonusBasisPoints: 10_000,
      damageMultiplierBasisPoints: 20_000,
    });
  });
});
