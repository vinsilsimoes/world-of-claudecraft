import { afterAll, describe, expect, it } from 'vitest';
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
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.5: the rotation cascade (survival -> aoe -> debuff -> execution ->
// single-target), the warrior setup/payoff flip, and auto-potion.

function makeSim(seed = 101): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
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
