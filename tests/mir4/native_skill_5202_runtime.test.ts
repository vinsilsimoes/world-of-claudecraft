import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob, createPlayer } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  applyMir4NativeBlitzStrikeFinalContact,
  mir4NativeBlitzStrikeKnockdownChanceBasisPoints,
  mir4NativeBlitzStrikePersistentSkillDamageReductionBps,
} from '../../src/sim/mir4/native_skill_blitz_strike';
import { updateMir4NativePeriodicDamage } from '../../src/sim/mir4/native_periodic_damage';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 52_020,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Blitz Strike Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.player.attackPower = 1_000;
  sim.drainEvents();
  return sim;
}

function pointFromLancer(sim: Sim, forward: number, side = 0): { x: number; z: number } {
  const sin = Math.sin(sim.player.facing);
  const cos = Math.cos(sim.player.facing);
  return {
    x: sim.player.pos.x + sin * forward + cos * side,
    z: sim.player.pos.z + cos * forward - sin * side,
  };
}

function spawnMob(sim: Sim, forward: number, side = 0, suffix = 'mob'): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `blitz_strike_target_${suffix}_${sim.nextId}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const point = pointFromLancer(sim, forward, side);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(point.x, point.z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function spawnHostilePlayer(sim: Sim, forward: number, suffix: string): Entity {
  const point = pointFromLancer(sim, forward);
  const target = createPlayer(
    sim.nextId++,
    'warrior',
    sim.groundPos(point.x, point.z),
    `Blitz PvP ${suffix}`,
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.level = 120;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 5202) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5202 Blitz Strike integrated runtime', () => {
  it('crosses the selected target, turns back, then hurls it 11 yards behind the caster', () => {
    const sim = makeLancer();
    const sourceStart = { ...sim.player.pos };
    const target = spawnMob(sim, 4);
    const targetStart = { ...target.pos };
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5202, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events: SimEvent[] = [];
    for (let tick = 0; tick < 12; tick += 1) events.push(...sim.tick());

    expect(Math.hypot(sim.player.pos.x - sourceStart.x, sim.player.pos.z - sourceStart.z)).toBeCloseTo(
      5.2,
      5,
    );
    expect(Math.hypot(target.pos.x - targetStart.x, target.pos.z - targetStart.z)).toBeCloseTo(11, 5);
    const behindX = target.pos.x - sim.player.pos.x;
    const behindZ = target.pos.z - sim.player.pos.z;
    expect(Math.sin(sim.player.facing) * behindX + Math.cos(sim.player.facing) * behindZ).toBeLessThan(
      0,
    );
    expect(
      events.filter((event) => event.type === 'damage' && event.targetId === target.id),
    ).toHaveLength(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        targetId: target.id,
        skillId: 5202,
        attackId: 520202,
        durationMs: 3_000,
        stance: 'down-02',
      }),
    );
  });

  it('rebuilds the 6.5-by-4-yard frontal path and caps it at 8 enemies', () => {
    const sim = makeLancer();
    const primary = spawnMob(sim, 4, 0, 'primary');
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) =>
        spawnMob(sim, 5 + index * 0.05, -1.8 + index * 0.45, String(index)),
      ),
    ];
    const outside = spawnMob(sim, 5, 2.2, 'outside');
    sim.player.targetId = primary.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5202, primary.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.6;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8]?.hp).toBe(targets[8]?.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('uses the player chance ladder and debuffs a failed Knockdown', () => {
    const sim = makeLancer();
    const target = spawnHostilePlayer(sim, 4, 'failure');

    expect(mir4NativeBlitzStrikeKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(3_000);
    expect(
      applyMir4NativeBlitzStrikeFinalContact(
        sim.ctx,
        sim.player,
        target,
        520202,
        0,
        5,
        1_000,
        () => 9_999,
      ),
    ).toEqual({
      knockedDown: false,
      failureResistanceDebuffApplied: true,
      bleedApplied: false,
      concussionTriggered: false,
      stunned: false,
    });
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_50505_120',
        magnitude: -1_000,
        duration: 10,
      }),
    );
  });

  it('adds Concussion and Bleed after a successful rank-5 player Knockdown', () => {
    const sim = makeLancer();
    const target = spawnHostilePlayer(sim, 4, 'success');
    const rolls = [0, 0];

    expect(
      applyMir4NativeBlitzStrikeFinalContact(
        sim.ctx,
        sim.player,
        target,
        520202,
        0,
        5,
        1_000,
        () => rolls.shift() ?? 9_999,
      ),
    ).toEqual({
      knockedDown: true,
      failureResistanceDebuffApplied: false,
      bleedApplied: true,
      concussionTriggered: true,
      stunned: true,
    });
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_5202_knockdown',
        kind: 'knockdown',
        duration: 5,
      }),
    );
    expect(target.mir4NativePeriodicDamage).toContainEqual(
      expect.objectContaining({ buffId: 50_519, skillId: 5202, skillLevel: 1, expiresAt: 2 }),
    );

    sim.time = 1.001;
    updateMir4NativePeriodicDamage(sim.ctx);
    expect(sim.player.mir4PendingImpacts).toContainEqual(
      expect.objectContaining({ rawDamage: 200, periodic: true, name: 'Blitz Strike: Bleed' }),
    );
  });

  it('exposes the exact permanent Skill Damage Reduction milestones', () => {
    const sim = makeLancer();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');

    meta.mir4SkillLevels = { 5202: 5 };
    expect(mir4NativeBlitzStrikePersistentSkillDamageReductionBps(sim.ctx, sim.player)).toBe(300);
    meta.mir4SkillLevels[5202] = 8;
    expect(mir4NativeBlitzStrikePersistentSkillDamageReductionBps(sim.ctx, sim.player)).toBe(600);
    meta.mir4SkillLevels[5202] = 10;
    expect(mir4NativeBlitzStrikePersistentSkillDamageReductionBps(sim.ctx, sim.player)).toBe(1_000);
  });
});
