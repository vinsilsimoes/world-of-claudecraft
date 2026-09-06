import { describe, expect, it } from 'vitest';
import { pickMir4AutoBattleSkill } from '../../src/sim/auto_battle/rotation';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob, createPlayer } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { updateMir4NativePeriodicDamage } from '../../src/sim/mir4/native_periodic_damage';
import {
  applyMir4NativeNirvanaKickFinalContact,
  mir4NativeNirvanaKickAutoConditionMet,
  mir4NativeNirvanaKickKnockdownChanceBasisPoints,
  mir4NativeNirvanaKickPersistentBossDamageBps,
  mir4NativeNirvanaKickPersistentMonsterDamageBps,
} from '../../src/sim/mir4/native_skill_nirvana_kick';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 51_040,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Nirvana Kick Runtime QA',
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

function spawnMob(sim: Sim, forward: number, side = 0): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `nirvana_kick_target_${sim.nextId}`,
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
  const target = createPlayer(sim.nextId++, 'warrior', sim.player.pos, 'Nirvana PvP Target');
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
    if (impact.skillId !== 5104) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Lancer 5104 Nirvana Kick integrated runtime', () => {
  it('admits Auto Battle only below the exact 30% target-health threshold', () => {
    const sim = makeLancer();
    const target = spawnMob(sim, 4);
    target.hp = target.maxHp * 0.3;
    expect(mir4NativeNirvanaKickAutoConditionMet(target)).toBe(false);
    target.hp -= 1;
    expect(mir4NativeNirvanaKickAutoConditionMet(target)).toBe(true);

    const disabled = [5201, 5101, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202];
    expect(
      pickMir4AutoBattleSkill(
        sim.ctx,
        sim.player,
        target,
        {
          anchorX: sim.player.pos.x,
          anchorZ: sim.player.pos.z,
          acquireRadiusYards: 30,
        },
        disabled,
      )?.skillId,
    ).toBe(5104);
    target.hp = target.maxHp * 0.3;
    expect(
      pickMir4AutoBattleSkill(
        sim.ctx,
        sim.player,
        target,
        {
          anchorX: sim.player.pos.x,
          anchorZ: sim.player.pos.z,
          acquireRadiusYards: 30,
        },
        disabled,
      ),
    ).toBeNull();
  });

  it('crosses one yard beyond the target, turns back and hits the selected target', () => {
    const sim = makeLancer();
    const start = { ...sim.player.pos };
    const target = spawnMob(sim, 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5104, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    for (let tick = 0; tick < 7; tick += 1) sim.tick();
    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(5, 5);

    for (let tick = 0; tick < 5; tick += 1) sim.tick();
    expect(target.hp).toBeLessThan(target.maxHp);
    const targetDx = target.pos.x - sim.player.pos.x;
    const targetDz = target.pos.z - sim.player.pos.z;
    expect(
      Math.sin(sim.player.facing) * targetDx + Math.cos(sim.player.facing) * targetDz,
    ).toBeGreaterThan(0);
  });

  it('rebuilds the 4.5-by-5-yard frontal path toward the target and caps it at 8 enemies', () => {
    const sim = makeLancer();
    const primary = spawnMob(sim, 4);
    const targets = [
      primary,
      ...Array.from({ length: 8 }, (_, index) => spawnMob(sim, 3.5, -2.1 + index * 0.6)),
    ];
    const outside = spawnMob(sim, 10, 0);
    sim.player.targetId = primary.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5104, primary.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.6;
    updateMir4PendingImpacts(sim.ctx);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8]?.hp).toBe(targets[8]?.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('uses the player chance ladder, debuffs failure and bleeds only after success', () => {
    const sim = makeLancer();
    const target = spawnHostilePlayer(sim, 4);

    expect(mir4NativeNirvanaKickKnockdownChanceBasisPoints(sim.player, target, 5)).toBe(3_000);
    expect(
      applyMir4NativeNirvanaKickFinalContact(
        sim.ctx,
        sim.player,
        target,
        510402,
        0,
        5,
        1_000,
        () => 9_999,
      ),
    ).toEqual({ knockedDown: false, failureResistanceDebuffApplied: true, bleedApplied: false });
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_50505_120',
        magnitude: -1_000,
        duration: 10,
      }),
    );

    if (target.mir4Effects) target.mir4Effects.active = [];
    expect(
      applyMir4NativeNirvanaKickFinalContact(
        sim.ctx,
        sim.player,
        target,
        510402,
        0,
        5,
        1_000,
        () => 2_999,
      ),
    ).toEqual({ knockedDown: true, failureResistanceDebuffApplied: false, bleedApplied: true });
    expect(target.mir4NativePeriodicDamage).toContainEqual(
      expect.objectContaining({ buffId: 50_519, skillLevel: 3, expiresAt: 2 }),
    );

    sim.time = 1.001;
    updateMir4NativePeriodicDamage(sim.ctx);
    expect(sim.player.mir4PendingImpacts).toContainEqual(
      expect.objectContaining({ rawDamage: 300, periodic: true, name: 'Nirvana Kick: Bleed' }),
    );
  });

  it('guarantees monster knockdown and emits the exact 3-second down reaction', () => {
    const sim = makeLancer();
    const target = spawnMob(sim, 4);
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5104, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    sim.time = 0.6;
    updateMir4PendingImpacts(sim.ctx);
    const events: SimEvent[] = sim.drainEvents();

    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_5104_knockdown', kind: 'knockdown', duration: 3 }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        targetId: target.id,
        skillId: 5104,
        attackId: 510402,
        durationMs: 3_000,
        stance: 'down-02',
      }),
    );
  });

  it('exposes the exact permanent monster and boss damage milestones', () => {
    const sim = makeLancer();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');

    meta.mir4SkillLevels = { 5104: 8 };
    expect(mir4NativeNirvanaKickPersistentMonsterDamageBps(sim.ctx, sim.player)).toBe(800);
    expect(mir4NativeNirvanaKickPersistentBossDamageBps(sim.ctx, sim.player)).toBe(1_000);
    meta.mir4SkillLevels[5104] = 10;
    expect(mir4NativeNirvanaKickPersistentMonsterDamageBps(sim.ctx, sim.player)).toBe(1_200);
    expect(mir4NativeNirvanaKickPersistentBossDamageBps(sim.ctx, sim.player)).toBe(1_500);
  });
});
