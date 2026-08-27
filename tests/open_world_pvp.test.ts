import { describe, expect, it } from 'vitest';
import { recalcMir4ProfilePlayerStats } from '../src/sim/mir4/profile_player';
import { Sim } from '../src/sim/sim';

function makePlayers() {
  const sim = new Sim({
    seed: 881,
    playerClass: 'warrior',
    playerName: 'Attacker',
    gameProfile: 'mir4-gameplay-port',
  });
  const attacker = sim.player;
  const victimId = sim.addPlayer('taoist', 'Victim');
  const victim = sim.entities.get(victimId)!;
  attacker.level = 20;
  victim.level = 20;
  return { sim, attacker, victim };
}

describe('Aeldrune open-world PvP and infamy', () => {
  it('allows a selected player target only when both players reached level 20', () => {
    const { sim, attacker, victim } = makePlayers();
    attacker.targetId = victim.id;
    expect(sim.isHostileTo(attacker, victim)).toBe(true);
    victim.level = 19;
    expect(sim.isHostileTo(attacker, victim)).toBe(false);
  });

  it('marks an innocent killer at 500 fame and immediately applies the stat penalty', () => {
    const { sim, attacker, victim } = makePlayers();
    const meta = sim.meta(attacker.id)!;
    meta.fame = 600;
    meta.pkMarked = false;
    attacker.targetId = victim.id;
    recalcMir4ProfilePlayerStats('mir4-gameplay-port', attacker, meta);
    const maxHpBefore = attacker.maxHp;

    sim.ctx.dealDamage(attacker, victim, victim.hp + 1, false, 'physical', null, 'hit');

    expect(meta.fame).toBe(500);
    expect(meta.pkMarked).toBe(true);
    expect(attacker.pkMarked).toBe(true);
    expect(attacker.maxHp).toBe(Math.floor(maxHpBefore / 2));
  });

  it('recovers fame for killing a PK and for an equal-or-higher-level monster', () => {
    const { sim, attacker, victim } = makePlayers();
    const attackerMeta = sim.meta(attacker.id)!;
    const victimMeta = sim.meta(victim.id)!;
    attackerMeta.fame = 1_000;
    attackerMeta.pkMarked = true;
    victimMeta.fame = 500;
    victimMeta.pkMarked = true;
    victim.pkMarked = true;
    attacker.targetId = victim.id;

    sim.ctx.dealDamage(attacker, victim, victim.hp + 1, false, 'physical', null, 'hit');
    expect(attackerMeta.fame).toBe(1_050);

    const mob = [...sim.entities.values()].find(
      (entity) => entity.kind === 'mob' && entity.ownerId === null && entity.hostile,
    );
    if (!mob) throw new Error('test world must contain a hostile monster');
    attacker.level = mob.level;
    sim.ctx.handleDeath(mob, attacker);
    expect(attackerMeta.fame).toBe(1_051);
  });

  it('keeps the fame consequence after a landed hit even if selection and party change', () => {
    const { sim, attacker, victim } = makePlayers();
    const meta = sim.meta(attacker.id)!;
    attacker.targetId = victim.id;
    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');

    attacker.targetId = null;
    sim.partyInvite(victim.id, attacker.id);
    sim.partyAccept(victim.id);
    sim.ctx.handleDeath(victim, attacker);

    expect(meta.fame).toBe(1_900);
  });

  it('auto-retaliates against a player aggressor without charging the defender for the kill', () => {
    const { sim, attacker, victim } = makePlayers();
    attacker.targetId = victim.id;
    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');

    expect(victim.targetId).toBe(attacker.id);
    expect(victim.autoAttack).toBe(true);
    expect(victim.openWorldPvpDefenseRights?.get(attacker.id)).toBeGreaterThan(sim.time);

    sim.ctx.dealDamage(victim, attacker, attacker.hp + 1, false, 'physical', null, 'hit');
    expect(sim.meta(victim.id)?.fame).toBe(2_000);
  });

  it('does not grant the original aggressor a waiver when the defender hits back', () => {
    const { sim, attacker, victim } = makePlayers();
    attacker.targetId = victim.id;
    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');
    sim.ctx.dealDamage(victim, attacker, 1, false, 'physical', null, 'hit');

    expect(attacker.openWorldPvpDefenseRights?.has(victim.id) ?? false).toBe(false);
    sim.ctx.dealDamage(attacker, victim, victim.hp + 1, false, 'physical', null, 'hit');
    expect(sim.meta(attacker.id)?.fame).toBe(1_900);
  });

  it('expires self-defence rights instead of allowing a much later free kill', () => {
    const { sim, attacker, victim } = makePlayers();
    attacker.targetId = victim.id;
    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');
    victim.openWorldPvpDefenseRights?.set(attacker.id, sim.time - 1);

    sim.ctx.dealDamage(victim, attacker, attacker.hp + 1, false, 'physical', null, 'hit');
    expect(sim.meta(victim.id)?.fame).toBe(1_900);
  });

  it('stops automatic retaliation when its self-defence window expires', () => {
    const { sim, attacker, victim } = makePlayers();
    attacker.targetId = victim.id;
    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');
    victim.openWorldPvpDefenseRights?.set(attacker.id, sim.time - 1);

    sim.tick();

    expect(victim.autoAttack).toBe(false);
    expect(sim.meta(victim.id)?.mir4TargetCombat).toBeUndefined();
  });

  it('keeps independent self-defence rights against multiple aggressors', () => {
    const { sim, attacker, victim } = makePlayers();
    const secondId = sim.addPlayer('arbalist', 'Second Aggressor');
    const second = sim.entities.get(secondId)!;
    second.level = 20;
    attacker.targetId = victim.id;
    second.targetId = victim.id;

    sim.ctx.dealDamage(attacker, victim, 1, false, 'physical', null, 'hit');
    sim.ctx.dealDamage(second, victim, 1, false, 'physical', null, 'hit');

    expect(victim.openWorldPvpDefenseRights?.has(attacker.id)).toBe(true);
    expect(victim.openWorldPvpDefenseRights?.has(second.id)).toBe(true);
    expect(victim.targetId).toBe(attacker.id);
    sim.ctx.dealDamage(victim, attacker, attacker.hp + 1, false, 'physical', null, 'hit');
    expect(sim.meta(victim.id)?.fame).toBe(2_000);
  });

  it('does not recover fame from zero-XP objectives or training dummies', () => {
    const { sim, attacker } = makePlayers();
    const meta = sim.meta(attacker.id)!;
    meta.fame = 1_000;
    meta.pkMarked = true;
    const mob = [...sim.entities.values()].find(
      (entity) => entity.kind === 'mob' && entity.ownerId === null && entity.hostile,
    );
    if (!mob) throw new Error('test world must contain a hostile monster');
    mob.templateId = 'spider_egg';
    mob.level = attacker.level;

    sim.ctx.handleDeath(mob, attacker);

    expect(meta.fame).toBe(1_000);

    const dummy = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'mob' && entity.ownerId === null && entity.hostile && entity.id !== mob.id,
    );
    if (!dummy) throw new Error('test world must contain a second hostile monster');
    dummy.templateId = 'training_dummy';
    dummy.level = attacker.level;
    sim.ctx.handleDeath(dummy, attacker);
    expect(meta.fame).toBe(1_000);
  });

  it('persists fame and the PK mark across a character reload', () => {
    const { sim, attacker } = makePlayers();
    const meta = sim.meta(attacker.id)!;
    meta.fame = 400;
    meta.pkMarked = true;
    attacker.pkMarked = true;
    const state = sim.serializeCharacter(attacker.id)!;

    expect(state).toMatchObject({ fame: 400, pkMarked: true });

    const restored = new Sim({
      seed: 882,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      noPlayer: true,
    });
    const restoredId = restored.addPlayer('warrior', 'Restored', { state });
    expect(restored.meta(restoredId)).toMatchObject({ fame: 400, pkMarked: true });
    expect(restored.entities.get(restoredId)?.pkMarked).toBe(true);
  });

  it('does not change fame for a jail fight', () => {
    const { sim, attacker, victim } = makePlayers();
    const meta = sim.meta(attacker.id)!;
    attacker.targetId = victim.id;
    attacker.jailed = true;
    victim.jailed = true;

    sim.ctx.dealDamage(attacker, victim, victim.hp + 1, false, 'physical', null, 'hit');

    expect(meta.fame).toBe(2_000);
    expect(meta.pkMarked).toBe(false);
  });
});
