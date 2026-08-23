import { afterAll, describe, expect, it } from 'vitest';
import { pickMir4AutoBattleSkill } from '../../src/sim/auto_battle/rotation';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  MIR4_HP_POTION_HEAL_BPS,
  MIR4_MP_POTION_RESTORE,
  mir4UsePotion,
} from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.5: the rotation cascade (survival -> aoe -> debuff -> execution ->
// single-target), the warrior setup/payoff flip, and auto-potion.

function makeSim(seed = 101, playerClassMir4: Mir4ClassKey = 'warrior'): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4,
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function teleport(sim: Sim, x: number, z: number): void {
  const p = sim.entities.get(sim.playerId) as Entity;
  const g = sim.groundPos(x, z);
  p.pos.x = g.x;
  p.pos.y = g.y;
  p.pos.z = g.z;
}

function pinWolf(sim: Sim, wolf: Entity): void {
  const p = sim.entities.get(sim.playerId)!;
  const g = sim.groundPos(p.pos.x + 2, p.pos.z + 0.5);
  wolf.pos.x = g.x;
  wolf.pos.y = g.y;
  wolf.pos.z = g.z;
}

function wolves(sim: Sim, dead = false): Entity[] {
  return [...sim.entities.values()].filter(
    (e) => e.kind === 'mob' && e.templateId === 'mir4_forest_wolf' && e.dead === dead,
  );
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('potions', () => {
  it('HP potion restores exactly 5% of max on its 1s cooldown', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'hp')).toBe(false); // full HP refuses
    p.hp = 1000;
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'hp')).toBe(true);
    expect(p.hp).toBe(1000 + Math.floor((4000 * MIR4_HP_POTION_HEAL_BPS) / 10_000)); // +200
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'hp')).toBe(false); // cooldown
  });
  it('MP potion restores the flat 120 on its 5s cooldown', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(102);
    const p = sim.entities.get(sim.playerId)!;
    p.resource = 100;
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'mp')).toBe(true);
    expect(p.resource).toBe(100 + MIR4_MP_POTION_RESTORE);
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'mp')).toBe(false); // cooldown
  });
});

describe('the rotation cascade', () => {
  it('pins every priority phase to a literal winning skill', () => {
    const setup = (
      seed: number,
      cls: Mir4ClassKey,
      configure: (sim: Sim, player: Entity, target: Entity) => void,
      extraTargets = 0,
    ) => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(seed, cls);
      teleport(sim, 1.5, -10.5);
      const player = sim.player;
      const target = createMob(
        sim.nextId++,
        {
          ...MIR4_MOBS.mir4_forest_wolf,
          id: `phase_target_${seed}`,
          hpBase: 5000,
          hpPerLevel: 0,
          moveSpeed: 0,
        } as never,
        1,
        sim.groundPos(player.pos.x + 2, player.pos.z),
      );
      sim.addEntity(target);
      for (let index = 0; index < extraTargets; index++) {
        const extra = createMob(
          sim.nextId++,
          {
            ...MIR4_MOBS.mir4_forest_wolf,
            id: `phase_extra_${seed}_${index}`,
            hpBase: 5000,
            hpPerLevel: 0,
            moveSpeed: 0,
          } as never,
          1,
          sim.groundPos(player.pos.x + 2.5, player.pos.z + index - 0.5),
        );
        sim.addEntity(extra);
      }
      configure(sim, player, target);
      return pickMir4AutoBattleSkill(sim.ctx, player, target, {
        anchorX: player.pos.x,
        anchorZ: player.pos.z,
        acquireRadiusYards: 30,
      })?.skillId;
    };

    expect(setup(1031, 'warrior', (_sim, player) => (player.hp = player.maxHp * 0.4))).toBe(1304);
    expect(setup(1032, 'warrior', () => undefined, 2)).toBe(1401);
    expect(setup(1033, 'warrior', () => undefined)).toBe(1102);
    expect(setup(1034, 'lancer', (_sim, _player, target) => (target.hp = target.maxHp * 0.3))).toBe(
      5104,
    );
    expect(
      setup(1035, 'warrior', (_sim, player) => {
        player.cooldowns.set('1102', 10);
        player.cooldowns.set('1304', 10);
      }),
    ).toBe(1104);
  });

  it('filters candidates outside the Auto Battle anchor before tracing line of sight', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(1036);
    teleport(sim, 1.5, -10.5);
    const player = sim.player;
    const target = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'los_budget_target',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(player.pos.x + 2, player.pos.z),
    );
    sim.addEntity(target);
    const outsideAnchor = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'los_budget_outside_anchor',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(player.pos.x + 5, player.pos.z),
    );
    sim.addEntity(outsideAnchor);

    const checked: Entity[] = [];
    const hasLineOfSight = sim.ctx.hasLineOfSight;
    sim.ctx.hasLineOfSight = (source, candidate) => {
      checked.push(candidate);
      return hasLineOfSight(source, candidate);
    };

    pickMir4AutoBattleSkill(sim.ctx, player, target, {
      anchorX: player.pos.x,
      anchorZ: player.pos.z,
      acquireRadiusYards: 3,
    });

    expect(checked).toContain(target);
    expect(checked).not.toContain(outsideAnchor);
    expect(
      checked.every(
        (candidate) =>
          Math.hypot(candidate.pos.x - player.pos.x, candidate.pos.z - player.pos.z) <= 3 &&
          Math.hypot(candidate.pos.x - target.pos.x, candidate.pos.z - target.pos.z) <= 7,
      ),
    ).toBe(true);
  });

  it('filters candidates outside the skill radius before tracing line of sight', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(1038);
    teleport(sim, 1.5, -10.5);
    const player = sim.player;
    const target = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'skill_radius_target',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(player.pos.x + 2, player.pos.z),
    );
    sim.addEntity(target);
    const outsideSkillRadius = createMob(
      sim.nextId++,
      {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: 'outside_skill_radius',
        hpBase: 5000,
        hpPerLevel: 0,
        moveSpeed: 0,
      } as never,
      1,
      sim.groundPos(player.pos.x + 20, player.pos.z),
    );
    sim.addEntity(outsideSkillRadius);

    const checked: Entity[] = [];
    const hasLineOfSight = sim.ctx.hasLineOfSight;
    sim.ctx.hasLineOfSight = (source, candidate) => {
      checked.push(candidate);
      return hasLineOfSight(source, candidate);
    };

    pickMir4AutoBattleSkill(sim.ctx, player, target, {
      anchorX: player.pos.x,
      anchorZ: player.pos.z,
      acquireRadiusYards: 30,
    });

    expect(checked).toContain(target);
    expect(checked).not.toContain(outsideSkillRadius);
    expect(
      checked.every(
        (candidate) =>
          Math.hypot(candidate.pos.x - target.pos.x, candidate.pos.z - target.pos.z) <= 7,
      ),
    ).toBe(true);
  });

  it('does not scan the skill deck while the global cooldown blocks every skill', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(1037);
    teleport(sim, 1.5, -10.5);
    const player = sim.player;
    player.gcdRemaining = 0.5;

    const mir4State = player.mir4;
    let characterStateReads = 0;
    Object.defineProperty(player, 'mir4', {
      configurable: true,
      get: () => {
        characterStateReads++;
        return mir4State;
      },
    });

    expect(
      pickMir4AutoBattleSkill(sim.ctx, player, player, {
        anchorX: player.pos.x,
        anchorZ: player.pos.z,
        acquireRadiusYards: 30,
      }),
    ).toBeNull();
    expect(characterStateReads).toBe(0);
  });

  it('warrior setup order: 1102 first, then 1304, 1104, 1401 across GCDs', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(103);
    teleport(sim, 1.5, -10.5); // near Tarek, away from camps
    // One tanky wolf close: nearby count 1 (aoe never fires) and it survives
    // the full four-cast sweep; a tight radius keeps the camps out of reach.
    const tanky = {
      ...MIR4_MOBS.mir4_forest_wolf,
      id: 'test_tank_wolf',
      hpBase: 5000,
      hpPerLevel: 0,
    };
    const w = createMob(
      sim.nextId++,
      tanky as never,
      1,
      sim.groundPos(
        sim.entities.get(sim.playerId)!.pos.x + 2,
        sim.entities.get(sim.playerId)!.pos.z + 0.5,
      ),
    );
    sim.addEntity(w);
    sim.setMir4AutoBattleMode('battle');
    sim.players.get(sim.playerId)!.autoBattle!.acquireRadiusYards = 6;
    // Collect the cast order from the damage events' ability names (the
    // cooldown map races: early 25s cooldowns expire before sampling).
    // 1401 (Esmagamento Terrestre) is aoe-only with minTargets 3: against a
    // single target the server cascade never admits it, exactly like the
    // source's selectAutoHuntAction.
    const names = ['Golpe de Vácuo', 'Placagem', 'Golpe Lacerante'];
    const seen: string[] = [];
    for (let t = 0; t < 400 && seen.length < 3; t++) {
      pinWolf(sim, w);
      for (const ev of sim.tick()) {
        if (ev.type === 'damage' && ev.targetId === w.id) {
          const ability = (ev as { ability?: unknown }).ability;
          if (typeof ability === 'string' && names.includes(ability) && !seen.includes(ability)) {
            seen.push(ability);
          }
        }
      }
    }
    expect(seen).toEqual(names); // the setup order, exactly
  });
  it('auto-potion fires at <=50% HP during the battle', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(104);
    teleport(sim, 1.5, -10.5);
    const p = sim.entities.get(sim.playerId)!;
    p.hp = 1500; // 37.5%: below the 50% threshold
    const w = createMob(
      sim.nextId++,
      MIR4_MOBS.mir4_forest_wolf as never,
      1,
      sim.groundPos(p.pos.x + 2, p.pos.z + 0.5),
    );
    sim.addEntity(w);
    sim.setMir4AutoBattleMode('battle');
    sim.tick();
    expect(p.hp).toBe(1500 + 200); // the exact 5% potion fired
    expect(p.cooldowns.has('mir4_potion_hp')).toBe(true);
  });
});
