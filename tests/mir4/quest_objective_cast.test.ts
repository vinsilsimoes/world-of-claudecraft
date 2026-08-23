import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  MIR4_QUEST_OBJECTIVE_CAST_SECONDS,
  updateMir4ArcObjectiveEntities,
} from '../../src/sim/mir4/arc_quest_runtime';
import { MIR4_QUEST_OBJECTIVE_CAST_ID } from '../../src/sim/mir4/quest_objective_cast';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  const world = { ...buildMir4ArcWorld(1), camps: [] };
  setActiveWorldContent(world);
  return new Sim({
    seed: 9042,
    playerClass: 'warrior',
    playerName: 'Coletora',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
}

function prepareClue(sim: Sim) {
  const meta = sim.players.get(sim.playerId)!;
  const progress = {
    questId: 'M01-Q01',
    stageIndex: 2,
    stageProgress: 0,
    state: 'active' as const,
  };
  meta.mir4ArcQuests = { 'M01-Q01': progress };
  updateMir4ArcObjectiveEntities(sim.ctx);
  const objective = [...sim.entities.values()].find(
    (entity) => entity.kind === 'object' && entity.ownerId === sim.playerId,
  );
  if (!objective) throw new Error('quest objective was not materialized');
  sim.player.pos = { ...objective.pos };
  sim.player.prevPos = { ...objective.pos };
  return { meta, progress, objective };
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 physical quest-object collection', () => {
  it('uses the existing cast bar for five seconds before granting evidence', () => {
    const sim = makeSim();
    const { progress, objective } = prepareClue(sim);

    expect(sim.pickUpObject(objective.id)).toBe(true);
    expect(sim.player.castingAbility).toBe(MIR4_QUEST_OBJECTIVE_CAST_ID);
    expect(MIR4_QUEST_OBJECTIVE_CAST_SECONDS).toBe(5);
    expect(sim.player.castTotal).toBe(5);
    expect(sim.player.castRemaining).toBe(5);
    expect(sim.player.castTotal).toBe(MIR4_QUEST_OBJECTIVE_CAST_SECONDS);
    expect(progress.stageProgress).toBe(0);
    expect(sim.entities.has(objective.id)).toBe(true);

    for (let tick = 0; tick < 99; tick++) sim.tick();
    expect(progress.stageProgress).toBe(0);
    sim.tick();

    expect(progress.stageProgress).toBe(1);
    expect(sim.entities.has(objective.id)).toBe(false);
  });

  it('cancels on damage, retries under Auto Mission, and never enables Auto Battle', () => {
    const sim = makeSim();
    const { meta, progress, objective } = prepareClue(sim);
    meta.mir4AutoQuest = {
      questId: 'M01-Q01',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };

    sim.tick();
    expect(sim.player.castingAbility).toBe(MIR4_QUEST_OBJECTIVE_CAST_ID);
    const hostile = createMob(sim.nextId++, MIR4_MOBS.mir4_forest_wolf as never, 1, {
      ...sim.player.pos,
    });
    sim.addEntity(hostile);
    // Source-less damage represents hazards/periodic effects. It must obey
    // the same interruption rule as a creature hit.
    sim.ctx.dealDamage(null, sim.player, 1, false, 'physical', null, 'hit');

    expect(sim.player.castingAbility).toBeNull();
    expect(progress.stageProgress).toBe(0);
    expect(sim.entities.has(objective.id)).toBe(true);
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');

    sim.tick();
    expect(sim.player.castingAbility).toBe(MIR4_QUEST_OBJECTIVE_CAST_ID);
    expect(sim.player.castTotal).toBe(5);
    expect(sim.player.castRemaining).toBe(5);
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');

    // DamageEventKind has no "periodic" token; use a non-hit/block event to
    // pin that objective interruption is independent of the combat kind.
    sim.ctx.dealDamage(null, sim.player, 1, false, 'shadow', null, 'resist');
    expect(sim.player.castingAbility).toBeNull();
    sim.tick();
    expect(sim.player.castingAbility).toBe(MIR4_QUEST_OBJECTIVE_CAST_ID);
    expect(sim.player.castRemaining).toBe(5);

    // Auto Mission does not evade or retaliate. Repeated hostile damage keeps
    // cancelling each retry and can kill the player with the objective still
    // incomplete.
    sim.ctx.dealDamage(hostile, sim.player, sim.player.hp + 1, false, 'physical', null, 'hit');
    sim.tick();
    expect(sim.player.dead).toBe(true);
    expect(sim.player.castingAbility).toBeNull();
    expect(progress.stageProgress).toBe(0);
    expect(meta.autoBattle?.mode ?? 'off').toBe('off');
  });
});
