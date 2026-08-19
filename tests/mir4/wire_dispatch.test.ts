import { afterAll, describe, expect, it } from 'vitest';
import { handleMir4Command } from '../../server/mir4_commands';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.8: the placeholder VFX hook on every admitted cast, and the WS
// envelope's server dispatch routed through the real Sim (the online half of
// the parity contract; the wire token itself is pinned by command_schema).

function makeSim(cls: Mir4ClassKey = 'warrior', seed = 131): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Teste',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function spawnWolf(sim: Sim): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + 2, p.pos.z + 0.5),
  );
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the placeholder VFX hook', () => {
  it('every admitted cast emits one spellfx keyed by the effect kind', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const wolf = spawnWolf(sim);
    const events: SimEvent[] = [];
    const origTick = sim.tick.bind(sim);
    sim.tick = () => {
      const drained = origTick();
      events.push(...drained);
      return drained;
    };
    sim.mir4CastSkill(1102, wolf.id);
    sim.tick(); // drain the emit buffer
    const fx = events.filter(
      (e) => e.type === 'spellfx' && e.school === 'mir4/stun' && e.sourceId === sim.playerId,
    );
    expect(fx).toHaveLength(1);
    expect((fx[0] as { fx?: string }).fx).toBe('flourish');
  });
  it('self utilities emit the selfCast flourish keyed to the caster', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('elementalist', 132);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 5;
    p.cooldowns.clear();
    p.gcdRemaining = 0;
    const events: SimEvent[] = [];
    const origTick = sim.tick.bind(sim);
    sim.tick = () => {
      const drained = origTick();
      events.push(...drained);
      return drained;
    };
    expect(sim.mir4CastSkill(2503)).toEqual({ ok: true });
    sim.tick(); // drain the emit buffer
    const fx = events.filter((e) => e.type === 'spellfx' && e.school === 'mir4/magic-shield');
    expect(fx).toHaveLength(1);
    expect((fx[0] as { targetId?: number }).targetId).toBe(p.id);
    expect((fx[0] as { fx?: string }).fx).toBe('selfCast');
  });
});

describe('the mir4 WS envelope dispatch', () => {
  it("routes the sub-actions onto the Sim's verbs with field validation", () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('warrior', 133);
    const wolf = spawnWolf(sim);
    const pid = sim.playerId;
    // auto: on; cast: 1102 at the wolf; basic: swing; equip; ultimate refused
    handleMir4Command(sim, { m: 'auto', on: true }, pid);
    expect(sim.mir4AutoBattleActive()).toBe(true);
    handleMir4Command(sim, { m: 'auto', on: false }, pid);
    expect(sim.mir4AutoBattleActive()).toBe(false);
    const hp = wolf.hp;
    handleMir4Command(sim, { m: 'cast', skill: 1102, target: wolf.id }, pid);
    expect(hp - wolf.hp).toBe(125); // the facet-order delegate resolved pid itself
    handleMir4Command(sim, { m: 'basic', target: wolf.id }, pid);
    handleMir4Command(sim, { m: 'equip' }, pid);
    expect(sim.mir4EquipStarterWeapon()).toBe('Already equipped.');
    // Invalid envelopes are dropped, never thrown.
    handleMir4Command(sim, { m: 'cast', skill: 'nope' }, pid);
    handleMir4Command(sim, {}, pid);
    handleMir4Command(sim, { m: 'unknown' }, pid);
    expect(true).toBe(true);
  });
  it('toggle quests routes to the journey', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('warrior', 134);
    handleMir4Command(sim, { m: 'quest', on: true }, sim.playerId);
    expect(sim.mir4AutoQuestActive()).toBe(true);
    handleMir4Command(sim, { m: 'quest', on: false }, sim.playerId);
    expect(sim.mir4AutoQuestActive()).toBe(false);
  });
});
