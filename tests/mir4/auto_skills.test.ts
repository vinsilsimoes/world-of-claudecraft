import { describe, expect, it, vi } from 'vitest';
import { Mir4ClientFacet } from '../../src/net/mir4_client_facet';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import {
  mir4AutoSkillEnabled,
  sanitizeMir4DisabledAutoSkills,
} from '../../src/sim/mir4/auto_skills';
import { mir4WireRevision } from '../../src/sim/mir4/wire_revision';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSim(): Sim {
  return new Sim({
    seed: 9133,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
}

describe('MIR4 per-skill automatic use', () => {
  it('encodes the online preference change through the MIR4 command envelope', () => {
    const send = vi.fn();
    const facet = new Mir4ClientFacet(
      send,
      vi.fn(async () => true),
    );

    facet.setMir4AutoSkillEnabled(1102, false);

    expect(send).toHaveBeenCalledWith({
      cmd: 'mir4',
      m: 'autoSkill',
      skillId: 1102,
      enabled: false,
    });
  });

  it('defaults every class skill on and persists only explicit opt-outs', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');
    const revisionBefore = mir4WireRevision(meta);

    expect(mir4AutoSkillEnabled(sim.players.get(sim.playerId), 1102)).toBe(true);
    sim.setMir4AutoSkillEnabled(1102, false);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([1102]);
    expect(mir4AutoSkillEnabled(sim.players.get(sim.playerId), 1102)).toBe(false);
    expect(mir4WireRevision(meta)).toBe(revisionBefore + 1);

    sim.setMir4AutoSkillEnabled(1102, false);
    expect(mir4WireRevision(meta)).toBe(revisionBefore + 1);

    sim.setMir4AutoSkillEnabled(1102, true);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    expect(mir4WireRevision(meta)).toBe(revisionBefore + 2);
  });

  it('rejects an opt-out for a same-class skill that has not been unlocked yet', () => {
    const sim = makeSim();

    expect(sim.setMir4AutoSkillEnabled(1104, false)).toBe(false);
    expect(sim.setMir4AutoSkillEnabled(1501, false)).toBe(false);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    sim.player.level = 10;
    expect(sim.setMir4AutoSkillEnabled(1104, false)).toBe(true);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([1104]);
  });

  it('rejects foreign-class, duplicate, malformed, and oversized saved ids', () => {
    expect(sanitizeMir4DisabledAutoSkills([1104, 1102, 1102, 2101, -1, 1.5, '1102'], 1)).toEqual([
      1102, 1104,
    ]);
  });

  it('makes Auto Battle obey the same skill opt-out without disabling Auto Battle itself', () => {
    const sim = makeSim();
    sim.player.level = 5;
    const target = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'auto_skill_filter_target',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
    );
    target.wanderTimer = 999999;
    sim.addEntity(target);
    for (const skillId of [1102, 1104, 1304, 1401, 1501]) {
      sim.setMir4AutoSkillEnabled(skillId, false);
    }

    sim.setMir4AutoBattle(true);
    sim.tick();

    expect(sim.mir4AutoBattleActive()).toBe(true);
    expect(sim.player.cooldowns.has('mir4_basic')).toBe(true);
    expect([1102, 1104, 1304, 1401, 1501].some((id) => sim.player.cooldowns.has(String(id)))).toBe(
      false,
    );
  });

  it('keeps the Auto Battle rotation active when only one skill is opted out', () => {
    const sim = makeSim();
    sim.player.level = 30;
    sim.player.maxResource = 10_000;
    sim.player.resource = 10_000;
    const target = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'independent_auto_skill_target',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
    );
    target.wanderTimer = 999999;
    sim.addEntity(target);
    sim.setMir4AutoSkillEnabled(1102, false);

    sim.setMir4AutoBattle(true);
    sim.tick();

    expect(sim.player.cooldowns.has('1102')).toBe(false);
    expect([1104, 1304, 1401].some((skillId) => sim.player.cooldowns.has(String(skillId)))).toBe(
      true,
    );
  });
});
