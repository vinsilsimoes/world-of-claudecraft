import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob, createPlayer } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  applyMir4NativeCrescentBladeFinalContact,
  mir4NativeCrescentBladeConditionalDamageBasisPoints,
  mir4NativeCrescentBladeKnockdownChanceBasisPoints,
} from '../../src/sim/mir4/native_skill_crescent_blade';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 51_010,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Crescent Blade Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnMob(sim: Sim, forward: number, side: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `crescent_blade_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const sin = Math.sin(sim.player.facing);
  const cos = Math.cos(sim.player.facing);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(
      sim.player.pos.x + sin * forward + cos * side,
      sim.player.pos.z + cos * forward - sin * side,
    ),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function spawnHostilePlayer(sim: Sim, forward: number): Entity {
  const target = createPlayer(sim.nextId++, 'warrior', sim.player.pos, 'Crescent PvP Target');
  target.pos = sim.groundPos(
    sim.player.pos.x + Math.sin(sim.player.facing) * forward,
    sim.player.pos.z + Math.cos(sim.player.facing) * forward,
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.level = 120;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5101) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5101 Crescent Blade integrated runtime', () => {
  it('advances 2.5 yards, then crosses to 1.8 yards beyond the selected target', () => {
    const sim = makeLancer();
    const start = { ...sim.player.pos };
    const target = spawnMob(sim, 4, 0, 'movement');
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5101, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    for (let tick = 0; tick < 6; tick += 1) sim.tick();
    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(2.5, 5);
    for (let tick = 0; tick < 22; tick += 1) sim.tick();
    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(5.8, 5);
  });

  it('rebuilds each offset sector at contact time and caps it at 8 enemies', () => {
    const sim = makeLancer();
    const targets = Array.from({ length: 9 }, (_, index) =>
      spawnMob(sim, 4.2 + index * 0.1, -2 + index * 0.5, String(index)),
    );
    const behind = spawnMob(sim, -3, 0, 'behind');
    sim.player.targetId = targets[0]?.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5101, targets[0]?.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.4;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8]?.hp).toBe(targets[8]?.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
  });

  it('guarantees monster knockdown and emits the native 3-second down reaction', () => {
    const sim = makeLancer();
    const target = spawnMob(sim, 4, 0, 'knockdown');
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5101, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 1.12;
    updateMir4PendingImpacts(sim.ctx);
    const events: SimEvent[] = sim.drainEvents();

    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_5101_knockdown',
        kind: 'knockdown',
        duration: 3,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        targetId: target.id,
        skillId: 5101,
        attackId: 510102,
        durationMs: 3_000,
        stance: 'down-02',
      }),
    );
  });

  it('uses the player chance ladder and applies BUFF 50505 only after failure', () => {
    const sim = makeLancer();
    const target = spawnHostilePlayer(sim, 4);

    expect(mir4NativeCrescentBladeKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(3_000);
    expect(
      applyMir4NativeCrescentBladeFinalContact(
        sim.ctx,
        sim.player,
        target,
        510102,
        0,
        5,
        () => 9_999,
      ),
    ).toEqual({ knockedDown: false, failureResistanceDebuffApplied: true });
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_50505_120',
        nativeStatusId: 120,
        magnitude: -1_000,
        duration: 10,
      }),
    );
    expect(mir4NativeCrescentBladeKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(4_000);

    if (target.mir4Effects) target.mir4Effects.active = [];
    expect(
      applyMir4NativeCrescentBladeFinalContact(
        sim.ctx,
        sim.player,
        target,
        510102,
        0,
        5,
        () => 2_999,
      ),
    ).toEqual({ knockedDown: true, failureResistanceDebuffApplied: false });
    expect(
      target.mir4Effects?.active.some((effect) => effect.effectId === 'mir4_native_buff_50505_120'),
    ).toBe(false);
  });

  it('adds the exact rank 8 and rank 10 monster and Chill-stack damage packages', () => {
    const sim = makeLancer();
    const target = spawnMob(sim, 4, 0, 'conditional-damage');
    expect(mir4NativeCrescentBladeConditionalDamageBasisPoints(target, 8)).toBe(15_000);
    target.mir4Effects = {
      active: [
        {
          effectId: 'mir4_native_buff_20020',
          kind: 'native-status-boost',
          remaining: 5,
          duration: 5,
          magnitude: -50,
          sourceId: sim.player.id,
          nativeStatusId: 45,
          nativeStacks: 2,
        },
      ],
      controlImmuneUntil: 0,
    };
    expect(mir4NativeCrescentBladeConditionalDamageBasisPoints(target, 8)).toBe(18_500);
    target.mir4Effects.active[0]!.nativeStacks = 3;
    expect(mir4NativeCrescentBladeConditionalDamageBasisPoints(target, 8)).toBe(19_000);
    expect(mir4NativeCrescentBladeConditionalDamageBasisPoints(target, 10)).toBe(27_000);
  });
});
