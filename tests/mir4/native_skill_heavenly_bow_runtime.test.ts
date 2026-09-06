import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_080): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Heavenly Bow Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number, z: number) {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `heavenly_bow_${suffix}`,
    hpBase: 10_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4PhysicalDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 10_000,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4108 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Heavenly Bow integrated runtime', () => {
  it('compiles the reviewed direct row and seven-contact Totem without fallback issues', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(4108);
    expect(authority?.issues).toEqual([]);
    expect(authority?.plan).toMatchObject({
      skillId: 4108,
      attackAnimationMs: 1133,
      endCutAnimationMs: 1020,
      requiresTarget: true,
      range: { blockingCheck: false },
      totem: { totemId: 1403, contacts: expect.arrayContaining([expect.any(Object)]) },
    });
    expect(authority?.plan?.rows.map((row) => row.attackId)).toEqual([410801, 410802]);
    expect(authority?.plan?.rows[1]?.contacts).toEqual([
      expect.objectContaining({
        offsetMs: 900,
        damage: expect.objectContaining({ coefficient: 6600 }),
      }),
    ]);
  });

  it('approaches to the 11.5-yard trace stop and schedules Focus plus all eight damage contacts', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 18);
    sim.player.targetId = target.id;
    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4108', sim.playerId, target.id)).toEqual(
      {
        ok: true,
        queued: true,
      },
    );
    let ticks = 0;
    while (!sim.player.cooldowns.has('4108') && ticks++ < 240) sim.tick();
    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(11.5);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4108)
        .map((impact) => [
          impact.effectOnly ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
        ])
        .sort((left, right) => Number(left[1]) - Number(right[1])),
    ).toEqual([
      ['arbalist-focus', 100],
      [410811, 555],
      [410812, 700],
      [410812, 800],
      [410802, 900],
      [410813, 900],
      [410813, 1000],
      [410814, 1100],
      [410814, 1200],
    ]);
  });

  it('resolves all eight contacts, grants Focus, applies Bash and resets cooldown on proc', () => {
    const sim = makeArbalist(41_081);
    const target = spawnTarget(sim, 'marked', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing Arbalist metadata');
    meta.mir4SkillLevels = { 4108: 10 };
    target.mir4Effects = { active: [], controlImmuneUntil: 0 };
    target.mir4Effects.active.push({
      effectId: 'mir4_native_buff_40010_31',
      kind: 'native-status-boost',
      remaining: 10,
      duration: 10,
      magnitude: -25,
      nativeStatusId: 31,
      sourceId: sim.playerId,
    });
    (sim.ctx.rng as { next: () => number }).next = () => 0;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4108, target.id)).toEqual({ ok: true });
    forceContacts(sim);
    const events = Array.from({ length: 25 }, () => sim.tick()).flat();
    expect(
      events.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === target.id &&
          event.ability === 'Arco Celestial',
      ),
    ).toHaveLength(8);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1 });
    expect(sim.player.cooldowns.has('4108')).toBe(false);
    expect(sim.player.procReadyAt.mir4_native_heavenly_bow_reload).toBeCloseTo(10.9, 5);
  });
});
