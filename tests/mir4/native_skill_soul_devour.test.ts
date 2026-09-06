import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import { mir4NativeTotemEvidenceById } from '../../src/sim/content/mir4/native_skill_totem_evidence';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeImpactType1Targets } from '../../src/sim/mir4/native_impact_type1_targets';
import { compileMir4SoulDevourTotemRuntimePlan } from '../../src/sim/mir4/native_skill_soul_devour_totem';
import { mir4NativeRuntimeTotemPlan } from '../../src/sim/mir4/native_skill_totem_runtime';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function sourcePair() {
  const action = mir4NativeDirectSkillActionEvidenceById(2502);
  const entry = mir4NativeTotemEvidenceById(1011);
  if (!action || !entry) throw new Error('Missing Soul Devour source evidence');
  return { action, entry };
}

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Soul Devour Runtime QA',
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

function spawnTarget(sim: Sim, x: number, z = 0, suffix = String(sim.nextId)): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `soul_devour_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  sim.addEntity(target);
  return target;
}

function moveRelativeToPlayer(sim: Sim, target: Entity, x: number, z = 0): void {
  target.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z);
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.leashAnchor = { ...target.pos };
  sim.rebucket(target);
}

describe('MIR4 Soul Devour native execution', () => {
  it('compiles the exact five-hit direct plus Totem graph', () => {
    const { action, entry } = sourcePair();
    const plan = compileMir4SoulDevourTotemRuntimePlan(action, entry);

    expect(plan.contacts.map((contact) => contact.attackId)).toEqual([
      260211, 260212, 260213, 260214,
    ]);
    expect(plan.contacts.map((contact) => contact.offsetMs)).toEqual([1100, 1300, 1500, 1700]);
    expect(plan.contacts.map((contact) => contact.coefficient)).toEqual([
      5000, 5000, 5000, 5000,
    ]);
    expect(plan.contacts.map((contact) => contact.levelUpCoefficient)).toEqual([
      100, 100, 100, 100,
    ]);
    expect(plan.aggregateCoefficient + 4000).toBe(24_000);
    expect(plan.aggregateLevelUpCoefficient + 100).toBe(500);
    expect(action.hitCount).toBe(5);
  });

  it('pins the expanding target volumes and source-authored reactions', () => {
    const plan = mir4NativeRuntimeTotemPlan(2502);

    expect(plan?.contacts.map((contact) => [
      contact.area.radiusMaxYards,
      contact.area.heightYards,
      contact.area.targetCap,
      contact.reaction.kind,
      contact.reaction.moveDistanceYards,
      contact.reaction.durationMs,
    ])).toEqual([
      [3.5, 3, 6, 'knock-back', 0.1, 600],
      [4.5, 3, 6, 'attack-back', 0, 400],
      [6, 3, 6, 'knock-back', 0.1, 100],
      [7, 3, 6, 'knock-back', 0.1, 100],
    ]);
  });

  it('admits only the reviewed immutable graph and explicit fixed-anchor reconstruction', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(2502);
    const plan = mir4NativeRuntimeTotemPlan(2502);

    expect(authority?.issues).toEqual([]);
    expect(authority?.plan?.sourceHitCount).toBe(5);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)).toHaveLength(1);
    expect(authority?.plan?.rows.flatMap((row) => row.contacts)[0]?.offsetMs).toBe(1140);
    expect(authority?.plan?.rows[0]?.projectile).toMatchObject({
      attackId: 250201,
      releaseOffsetMs: 800,
      effectId: 2040045,
      socketName: 'Hand_L',
      movement: 'target-homing',
    });
    expect(authority?.plan?.totem).toEqual(plan);
    expect(plan?.spawnOffsetMs).toBe(800);
    expect(plan?.reconstruction).toEqual({
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2502.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 6000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    });
    expect(Object.isFrozen(plan?.contacts)).toBe(true);
  });

  it('rebuilds the direct ImpactType 1 list around the target current position', () => {
    const sim = makeSorcerer(25_021);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const byOldPosition = spawnTarget(sim, 3.5, 0, 'old');
    const byNewPosition = spawnTarget(sim, 12.5, 0, 'new');
    moveRelativeToPlayer(sim, anchor, 12);

    expect(
      mir4NativeImpactType1Targets(sim.ctx, sim.player, anchor, 2502, 250202)?.map(
        (target) => target.id,
      ),
    ).toEqual([anchor.id, byNewPosition.id]);
    expect(byOldPosition.id).not.toBe(byNewPosition.id);
  });

  it('schedules and resolves all five contacts without requiring the original target to remain', () => {
    const sim = makeSorcerer(25_022);
    const anchor = spawnTarget(sim, 3, 0, 'anchor');
    const fieldTarget = spawnTarget(sim, 9.5, 0, 'field');
    sim.player.targetId = anchor.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 2502, anchor.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2502 && !impact.effectOnly)
        .map((impact) => [
          impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1000),
          impact.nativeTotem?.totemId ?? null,
        ]),
    ).toEqual([
      [250202, 1140, null],
      [260211, 1100, 1011],
      [260212, 1300, 1011],
      [260213, 1500, 1011],
      [260214, 1700, 1011],
    ]);

    moveRelativeToPlayer(sim, anchor, 15);
    sim.time = 1.1;
    updateMir4PendingImpacts(sim.ctx);
    expect(fieldTarget.hp).toBe(fieldTarget.maxHp);
    sim.time = 1.7;
    updateMir4PendingImpacts(sim.ctx);
    expect(fieldTarget.hp).toBeLessThan(fieldTarget.maxHp);
  });
});
