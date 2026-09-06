import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 10): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Tai Chi Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
  sim.player.mir4.accuracy = 1_000_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3201: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `tai_chi_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 1_000_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function addPartyMember(sim: Sim, x: number): Entity {
  const memberId = sim.addPlayer('warrior', 'Tai Chi Ally');
  const member = sim.entities.get(memberId);
  if (!member) throw new Error('missing party member');
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3201 Tai Chi integrated runtime', () => {
  it('schedules its exact setup contacts and resolves their native timing', () => {
    const sim = makeTaoist(32_010);
    const target = spawnTarget(sim, 'primary', 5);
    const ally = addPartyMember(sim, 2);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3201, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 3201 && impact.effectOnly)
        .map((impact) => [impact.attackId, impact.nativeSetup, Math.round(impact.dueAt * 1_000), impact.targetId]),
    ).toEqual([
      [320101, 'taoist-tai-chi-control-immunity', 20, sim.playerId],
      [320102, 'taoist-tai-chi-source-rank-effects', 490, sim.playerId],
      [320107, 'taoist-tai-chi-party-recovery', 1440, sim.playerId],
      [320107, 'taoist-tai-chi-party-recovery', 1440, ally.id],
    ]);

    resolveAt(sim, 0.019);
    expect(Boolean(sim.player.mir4Effects?.active.some((effect) => effect.kind === 'control-immunity'))).toBe(false);
    resolveAt(sim, 0.02);
    expect(sim.player.mir4Effects?.active.some((effect) => effect.kind === 'control-immunity')).toBe(true);
    resolveAt(sim, 0.49);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(800);
    expect(mir4NativeStatusBonus(target, 45)).toBe(-20);
    resolveAt(sim, 1.34);
    expect(target.mir4Effects?.active.some((effect) => effect.effectId === 'mir4_3201_knockdown')).toBe(true);
    resolveAt(sim, 1.44);
    expect(mir4NativeStatusBonus(ally, 148)).toBe(5_000);
  });

  it('rebuilds the live full-circle target set and caps every damage row at eight enemies', () => {
    const sim = makeTaoist(32_011, 1);
    const targets = Array.from({ length: 9 }, (_, index) => spawnTarget(sim, `area_${index}`, 2 + index * 0.4));

    expect(castMir4Skill(sim.ctx, sim.playerId, 3201, targets[0]!.id)).toEqual({ ok: true });
    resolveAt(sim, 1.34);

    expect(targets.slice(0, 8).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[8]!.hp).toBe(targets[8]!.maxHp);
    expect(targets.slice(0, 8).every((target) => target.mir4Effects?.active.some((effect) => effect.kind === 'knockdown'))).toBe(true);
  });
});
