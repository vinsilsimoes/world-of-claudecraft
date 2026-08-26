import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4SkillIdFromAction } from '../../src/sim/mir4/action_abilities';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(seed = 6217): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
}

function spawnWolf(sim: Sim, offset: number, id: string, hpBase = 100): Entity {
  const player = sim.player;
  const wolf = createMob(
    sim.nextId++,
    {
      ...MIR4_MOBS.mir4_forest_wolf,
      id,
      hpBase,
      hpPerLevel: 0,
      moveSpeed: 0,
    } as never,
    1,
    sim.groundPos(player.pos.x + offset, player.pos.z),
  );
  wolf.wanderTimer = 999999;
  sim.addEntity(wolf);
  return wolf;
}

describe('MIR4 focused target combat', () => {
  it('automatically retaliates against the exact hostile attacker without enabling Auto Battle', () => {
    const sim = makeSim(6211);
    const attacker = spawnWolf(sim, 2, 'retaliation_attacker', 5000);
    spawnWolf(sim, 3, 'retaliation_bystander', 5000);

    sim.ctx.dealDamage(attacker, sim.player, 1, false, 'physical', null, 'hit');

    expect(sim.player.targetId).toBe(attacker.id);
    expect(sim.player.autoAttack).toBe(true);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat?.targetId).toBe(attacker.id);
    expect(sim.mir4AutoBattleActive()).toBe(false);
  });

  it('keeps an existing focused target when another hostile attacks', () => {
    const sim = makeSim(6210);
    const focused = spawnWolf(sim, 2, 'retaliation_existing_focus', 5000);
    const secondAttacker = spawnWolf(sim, 3, 'retaliation_second_attacker', 5000);
    sim.player.targetId = focused.id;
    sim.startAutoAttack();

    sim.ctx.dealDamage(secondAttacker, sim.player, 1, false, 'physical', null, 'hit');

    expect(sim.player.targetId).toBe(focused.id);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat?.targetId).toBe(focused.id);
  });

  it('does not retaliate against indirect damage', () => {
    const sim = makeSim(6209);
    const attacker = spawnWolf(sim, 2, 'retaliation_indirect_source', 5000);

    sim.ctx.dealDamage(
      attacker,
      sim.player,
      1,
      false,
      'physical',
      null,
      'hit',
      false,
      undefined,
      false,
    );

    expect(sim.player.targetId).toBeNull();
    expect(sim.player.autoAttack).toBe(false);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat).toBeUndefined();
  });

  it('uses enabled automatic skills on the captured target before falling back to basic attacks', () => {
    const sim = makeSim(6216);
    const selected = spawnWolf(sim, 2, 'automatic_skill_target', 5000);
    sim.player.targetId = selected.id;

    sim.startAutoAttack();
    sim.tick();

    expect(sim.player.cooldowns.has('1102')).toBe(true);
    expect(sim.player.targetId).toBe(selected.id);
    expect(sim.mir4AutoBattleActive()).toBe(false);
  });

  it('never spends a ready Ultimate during focused target combat', () => {
    const sim = makeSim(6213);
    const selected = spawnWolf(sim, 2, 'ultimate_exclusion_target', 5000);
    sim.player.mir4UltGauge = 100;
    sim.player.targetId = selected.id;

    sim.startAutoAttack();
    sim.tick();

    expect(sim.player.mir4UltGauge).toBe(100);
    expect(sim.player.cooldowns.has('mir4_ult')).toBe(false);
    expect(sim.player.cooldowns.has('1102')).toBe(true);
  });

  it('uses only the basic attack when every known skill automatic toggle is off', () => {
    const sim = makeSim(6215);
    const selected = spawnWolf(sim, 2, 'basic_only_target', 5000);
    for (const known of sim.known) {
      const skillId = mir4SkillIdFromAction(known.def.id);
      if (skillId !== null) sim.setMir4AutoSkillEnabled(skillId, false);
    }
    sim.player.targetId = selected.id;

    sim.startAutoAttack();
    sim.tick();

    expect(sim.player.cooldowns.has('mir4_basic')).toBe(true);
    expect(
      sim.known.some((known) => {
        const skillId = mir4SkillIdFromAction(known.def.id);
        return skillId !== null && sim.player.cooldowns.has(String(skillId));
      }),
    ).toBe(false);
  });

  it('skips only the opted-out skill and continues the focused rotation', () => {
    const sim = makeSim(6212);
    // Skill progression unlocks one action every ten levels; put the player at
    // the authored level where the alternative rotation entries are available.
    sim.player.level = 40;
    sim.player.maxResource = 10_000;
    sim.player.resource = 10_000;
    const selected = spawnWolf(sim, 2, 'independent_focused_skill_target', 5000);
    sim.setMir4AutoSkillEnabled(1102, false);
    sim.player.targetId = selected.id;

    sim.startAutoAttack();
    sim.tick();

    expect(sim.player.cooldowns.has('1102')).toBe(false);
    expect([1104, 1304, 1401].some((skillId) => sim.player.cooldowns.has(String(skillId)))).toBe(
      true,
    );
  });

  it('keeps a disabled automatic skill available for a manual cast', () => {
    const sim = makeSim(6214);
    const selected = spawnWolf(sim, 2, 'manual_skill_target', 5000);
    sim.player.targetId = selected.id;
    sim.setMir4AutoSkillEnabled(1102, false);

    sim.castAbility('mir4_skill_1102');

    expect(sim.player.cooldowns.has('1102')).toBe(true);
  });

  it('attacks only the selected target and stops instead of acquiring another enemy', () => {
    const sim = makeSim();
    const startX = sim.player.pos.x;
    const selected = spawnWolf(sim, 9, 'focused_target');
    const bystander = spawnWolf(sim, 3, 'bystander_target', 5000);
    sim.player.targetId = selected.id;

    sim.startAutoAttack();

    expect(sim.player.autoAttack).toBe(true);
    expect(sim.mir4AutoBattleActive()).toBe(false);
    let ticks = 0;
    while (!selected.dead && ticks++ < 600) sim.tick();
    expect(selected.dead).toBe(true);
    expect(sim.player.pos.x).toBeGreaterThan(startX);
    expect(sim.player.autoAttack).toBe(false);

    const bystanderHp = bystander.hp;
    for (let i = 0; i < 240; i++) sim.tick();
    expect(bystander.hp).toBe(bystanderHp);
  });

  it('stops focused combat when selection changes without carrying the attack to the new target', () => {
    const sim = makeSim(6218);
    const first = spawnWolf(sim, 2, 'first_target', 5000);
    const second = spawnWolf(sim, 3, 'second_target', 5000);
    sim.player.targetId = first.id;
    sim.startAutoAttack();

    sim.player.targetId = second.id;
    sim.tick();

    expect(sim.player.autoAttack).toBe(false);
    const secondHp = second.hp;
    for (let i = 0; i < 120; i++) sim.tick();
    expect(second.hp).toBe(secondHp);
  });

  it('lets Auto Battle resume target acquisition after the focused target dies', () => {
    const sim = makeSim(6219);
    const selected = spawnWolf(sim, 2, 'priority_target');
    const next = spawnWolf(sim, 5, 'automatic_target', 5000);
    sim.setMir4AutoBattle(true);
    sim.player.targetId = selected.id;
    sim.startAutoAttack();

    let ticks = 0;
    while (!selected.dead && ticks++ < 600) sim.tick();
    expect(selected.dead).toBe(true);
    expect(sim.mir4AutoBattleActive()).toBe(true);

    const nextHp = next.hp;
    for (let i = 0; i < 600 && next.hp === nextHp; i++) sim.tick();
    expect(next.hp).toBeLessThan(nextHp);
  });

  it('stopping focused combat does not switch off the independent Auto Battle tool', () => {
    const sim = makeSim(6220);
    const selected = spawnWolf(sim, 2, 'stop_target', 5000);
    sim.setMir4AutoBattle(true);
    sim.player.targetId = selected.id;
    sim.startAutoAttack();

    sim.stopAutoAttack();

    expect(sim.player.autoAttack).toBe(false);
    expect(sim.mir4AutoBattleActive()).toBe(true);
  });

  it('switching Auto Battle off does not cancel focused target combat', () => {
    const sim = makeSim(6221);
    const selected = spawnWolf(sim, 2, 'independent_target', 5000);
    sim.setMir4AutoBattle(true);
    sim.player.targetId = selected.id;
    sim.startAutoAttack();

    sim.setMir4AutoBattle(false);
    const hpBefore = selected.hp;
    for (let i = 0; i < 80 && selected.hp === hpBefore; i++) sim.tick();

    expect(sim.mir4AutoBattleActive()).toBe(false);
    expect(sim.player.autoAttack).toBe(true);
    expect(selected.hp).toBeLessThan(hpBefore);
  });
});
