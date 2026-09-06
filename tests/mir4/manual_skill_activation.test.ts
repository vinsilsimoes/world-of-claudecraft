import { describe, expect, it, vi } from 'vitest';
import { MIR4_AUTO_BATTLE_STALL_TICKS } from '../../src/sim/auto_battle/target_memory';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4ActionAbilityDef } from '../../src/sim/mir4/action_abilities';
import {
  mir4AttackMultiplier,
  mir4NativeStatusBonus,
} from '../../src/sim/mir4/effects';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey, MoveInput, SimEvent } from '../../src/sim/types';
import { dist2d, PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const VOID_SLASH_SLOT = 0;
const VOID_SLASH_COOLDOWN_ID = '1102';
const VOID_SLASH_COST = 36;
const OUTSIDE_VOID_SLASH_RANGE = 10;
const INSIDE_VOID_SLASH_RANGE = 2;
const BARBARIC_CHARGE_ABILITY_ID = 'mir4_skill_1103';
const BARBARIC_CHARGE_COOLDOWN_ID = '1103';

type ManualInputFlag =
  | 'forward'
  | 'back'
  | 'strafeLeft'
  | 'strafeRight'
  | 'turnLeft'
  | 'turnRight'
  | 'jump'
  | 'dive'
  | 'surface';

const MANUAL_INPUT_FLAGS = [
  'forward',
  'back',
  'strafeLeft',
  'strafeRight',
  'turnLeft',
  'turnRight',
  'jump',
  'dive',
  'surface',
] as const satisfies readonly ManualInputFlag[];

function makeSim(cls: Mir4ClassKey = 'warrior', seed = 24_601): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Manual Skill Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim, offset: number, id: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
    hpBase: 50_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  const target = createMob(
    sim.nextId++,
    template as never,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z - offset),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function selectTarget(sim: Sim, target: Entity): void {
  sim.player.targetId = target.id;
  sim.player.facing = Math.PI;
}

function placeTargetInRange(sim: Sim, target: Entity): void {
  target.pos = sim.groundPos(sim.player.pos.x + INSIDE_VOID_SLASH_RANGE, sim.player.pos.z);
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.leashAnchor = { ...target.pos };
  sim.rebucket(target);
}

function placeTargetAtDistance(sim: Sim, target: Entity, distance: number): void {
  target.pos = sim.groundPos(sim.player.pos.x + distance, sim.player.pos.z);
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.leashAnchor = { ...target.pos };
  sim.rebucket(target);
}

function queueAndObserveApproach(
  sim: Sim,
  target: Entity,
): {
  resource: number;
  targetHp: number;
} {
  const resource = sim.player.resource;
  const targetHp = target.hp;
  const start = { ...sim.player.pos };

  sim.drainEvents();
  sim.castAbilityBySlot(VOID_SLASH_SLOT);

  expect(sim.drainEvents()).toEqual([]);
  expect(sim.player.resource).toBe(resource);
  expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
  expect(target.hp).toBe(targetHp);
  sim.tick();
  expect(dist2d(start, sim.player.pos)).toBeGreaterThan(0);
  expect(sim.player.resource).toBe(resource);
  expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
  expect(target.hp).toBe(targetHp);

  return { resource, targetHp };
}

function expectCanceledBeforeSpend(
  sim: Sim,
  target: Entity,
  resource: number,
  targetHp: number,
): void {
  if (!target.dead) placeTargetInRange(sim, target);
  const events: SimEvent[] = [];
  for (let tick = 0; tick < 5; tick += 1) events.push(...sim.tick());

  expect(sim.player.resource).toBe(resource);
  expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
  expect(target.hp).toBe(targetHp);
  expect(
    events.filter(
      (event) =>
        event.type === 'mir4AttackStart' &&
        event.action === 'skill' &&
        event.ability === 'mir4_skill_1102',
    ),
  ).toHaveLength(0);
}

describe('MIR4 manual skill activation through the action bar', () => {
  it('exposes Warrior 1102 full native direct-contact reach to action consumers', () => {
    expect(mir4ActionAbilityDef('mir4_skill_1102')?.range).toBe(6);
  });

  it('exposes Warrior 1103 full native direct-contact reach to action consumers', () => {
    expect(mir4ActionAbilityDef(BARBARIC_CHARGE_ABILITY_ID)?.range).toBe(12.5);
  });

  it('starts Warrior 1103 immediately inside its native direct-contact reach', () => {
    const sim = makeSim('warrior', 24_596);
    sim.setPlayerLevel(48);
    const target = spawnTarget(sim, 12.499, 'barbaric_charge_direct_contact');
    selectTarget(sim, target);

    expect(requestMir4SkillActivation(sim.ctx, BARBARIC_CHARGE_ABILITY_ID, sim.playerId)).toEqual({
      ok: true,
    });
    expect(sim.player.cooldowns.has(BARBARIC_CHARGE_COOLDOWN_ID)).toBe(true);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('queues Warrior 1103 at the strict direct boundary and commits at trace-stop reach', () => {
    const sim = makeSim('warrior', 24_597);
    sim.setPlayerLevel(48);
    const target = spawnTarget(sim, 12.5, 'barbaric_charge_native_boundaries');
    selectTarget(sim, target);

    expect(requestMir4SkillActivation(sim.ctx, BARBARIC_CHARGE_ABILITY_ID, sim.playerId)).toEqual({
      ok: true,
      queued: true,
    });
    expect(sim.player.cooldowns.has(BARBARIC_CHARGE_COOLDOWN_ID)).toBe(false);

    placeTargetAtDistance(sim, target, 11.501);
    sim.tick();
    expect(sim.player.cooldowns.has(BARBARIC_CHARGE_COOLDOWN_ID)).toBe(false);

    placeTargetAtDistance(sim, target, 11.5);
    sim.tick();
    expect(sim.player.cooldowns.has(BARBARIC_CHARGE_COOLDOWN_ID)).toBe(true);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('starts Warrior 1102 immediately inside its native direct-contact reach', () => {
    const sim = makeSim('warrior', 24_590);
    const target = spawnTarget(sim, 5.5, 'manual_native_direct_contact');
    selectTarget(sim, target);
    const start = { ...sim.player.pos };
    const resource = sim.player.resource;

    sim.castAbilityBySlot(VOID_SLASH_SLOT);

    expect(sim.player.pos).toEqual(start);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(true);
    expect(sim.player.resource).toBe(resource - VOID_SLASH_COST);
  });

  it('queues Warrior 1102 at the strict native direct-contact boundary', () => {
    const sim = makeSim('warrior', 24_591);
    const target = spawnTarget(sim, 6, 'manual_native_direct_boundary');
    selectTarget(sim, target);
    const start = { ...sim.player.pos };
    const resource = sim.player.resource;

    sim.castAbilityBySlot(VOID_SLASH_SLOT);

    expect(sim.player.pos).toEqual(start);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(sim.player.resource).toBe(resource);
    sim.tick();
    expect(dist2d(start, sim.player.pos)).toBeGreaterThan(0);
  });

  it('commits a queued Warrior 1102 only at the inclusive native trace-stop reach', () => {
    const sim = makeSim('warrior', 24_592);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_native_trace_stop');
    selectTarget(sim, target);
    const resource = sim.player.resource;
    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);

    placeTargetAtDistance(sim, target, 5.001);
    sim.tick();
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(sim.player.resource).toBe(resource);

    sim.tick();
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(true);
    expect(sim.player.resource).toBeLessThan(resource);
  });

  it('uses the native strict target-height boundary for Warrior 1102', () => {
    const admitted = makeSim('warrior', 24_593);
    const admittedTarget = spawnTarget(admitted, 2, 'manual_native_height_inside');
    admittedTarget.pos.y = admitted.player.pos.y + 3.999;
    admittedTarget.prevPos = { ...admittedTarget.pos };
    selectTarget(admitted, admittedTarget);
    admitted.castAbilityBySlot(VOID_SLASH_SLOT);
    expect(admitted.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(true);

    const boundary = makeSim('warrior', 24_594);
    const boundaryTarget = spawnTarget(boundary, 2, 'manual_native_height_boundary');
    boundaryTarget.pos.y = boundary.player.pos.y + 4;
    boundaryTarget.prevPos = { ...boundaryTarget.pos };
    selectTarget(boundary, boundaryTarget);
    const resource = boundary.player.resource;
    boundary.castAbilityBySlot(VOID_SLASH_SLOT);
    expect(boundary.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(boundary.player.resource).toBe(resource);
    expect(boundary.players.get(boundary.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: boundaryTarget.id,
    });
  });

  it('uses BlockingCheck to queue Warrior 1102 until line of sight is clear', () => {
    const sim = makeSim('warrior', 24_595);
    const target = spawnTarget(sim, 2, 'manual_native_blocking_check');
    selectTarget(sim, target);
    const resource = sim.player.resource;
    sim.ctx.hasLineOfSight = () => false;

    sim.castAbilityBySlot(VOID_SLASH_SLOT);

    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(sim.player.resource).toBe(resource);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: target.id,
    });

    sim.ctx.hasLineOfSight = () => true;
    sim.tick();

    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(true);
    expect(sim.player.resource).toBeLessThan(resource);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('queues one selected out-of-range hostile, approaches, faces, and casts exactly once', () => {
    const sim = makeSim('warrior', 24_601);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_activation_target');
    selectTarget(sim, target);
    const start = { ...sim.player.pos };
    const startDistance = dist2d(sim.player.pos, target.pos);
    const resource = sim.player.resource;
    const targetHp = target.hp;

    sim.drainEvents();
    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    const immediateEvents = sim.drainEvents();

    expect(immediateEvents).toEqual([]);
    expect(sim.player.pos).toEqual(start);
    expect(sim.player.resource).toBe(resource);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(target.hp).toBe(targetHp);

    const events: SimEvent[] = [];
    let ticks = 0;
    while (!sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID) && ticks++ < 160) {
      events.push(...sim.tick());
    }

    expect(ticks).toBeLessThan(160);
    expect(dist2d(start, sim.player.pos)).toBeGreaterThan(0);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThan(startDistance);
    expect(sim.player.facing).toBeCloseTo(
      Math.atan2(target.pos.x - sim.player.pos.x, target.pos.z - sim.player.pos.z),
      8,
    );
    // The ordinary per-tick resource regeneration runs after the queued cast
    // commits. The activation itself may spend no more than one skill cost.
    expect(sim.player.resource).toBeLessThan(resource);
    expect(sim.player.resource).toBeGreaterThanOrEqual(resource - VOID_SLASH_COST);

    for (let tick = 0; tick < 40; tick += 1) events.push(...sim.tick());
    expect(
      events.filter(
        (event) =>
          event.type === 'mir4AttackStart' &&
          event.action === 'skill' &&
          event.ability === 'mir4_skill_1102',
      ),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.type === 'damage' && event.ability === 'Corte do Vazio'),
    ).toHaveLength(3);
    expect(target.hp).toBeLessThan(targetHp);
  });

  it.each(MANUAL_INPUT_FLAGS)('cancels before spend when %s is pressed', (flag) => {
    const sim = makeSim('warrior', 24_700 + MANUAL_INPUT_FLAGS.indexOf(flag));
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, `manual_cancel_${flag}`);
    selectTarget(sim, target);
    const before = queueAndObserveApproach(sim, target);

    const input = sim.moveInput as MoveInput & Record<ManualInputFlag, boolean>;
    input[flag] = true;
    sim.tick();
    input[flag] = false;

    expectCanceledBeforeSpend(sim, target, before.resource, before.targetHp);
  });

  it('cancels when the captured target dies and never retargets a nearby hostile', () => {
    const sim = makeSim('warrior', 24_801);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_target_dies');
    const bystander = spawnTarget(sim, INSIDE_VOID_SLASH_RANGE, 'manual_target_dies_bystander');
    selectTarget(sim, target);
    const before = queueAndObserveApproach(sim, target);
    const bystanderHp = bystander.hp;

    target.dead = true;
    target.hp = 0;
    target.respawnTimer = Number.POSITIVE_INFINITY;
    sim.tick();

    expect(sim.player.targetId).toBe(target.id);
    expect(bystander.hp).toBe(bystanderHp);
    expectCanceledBeforeSpend(sim, target, before.resource, 0);
  });

  it('cancels on selection change instead of carrying the cast to the new target', () => {
    const sim = makeSim('warrior', 24_802);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_selection_old');
    const replacement = spawnTarget(sim, INSIDE_VOID_SLASH_RANGE, 'manual_selection_replacement');
    selectTarget(sim, target);
    const before = queueAndObserveApproach(sim, target);
    const replacementHp = replacement.hp;

    sim.player.targetId = replacement.id;
    sim.tick();

    expect(sim.player.targetId).toBe(replacement.id);
    expect(replacement.hp).toBe(replacementHp);
    expectCanceledBeforeSpend(sim, target, before.resource, before.targetHp);
  });

  it('cancels when the captured target stops being hostile and never acquires another', () => {
    const sim = makeSim('warrior', 24_803);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_hostility_lost');
    const bystander = spawnTarget(sim, INSIDE_VOID_SLASH_RANGE, 'manual_hostility_lost_bystander');
    selectTarget(sim, target);
    const before = queueAndObserveApproach(sim, target);
    const bystanderHp = bystander.hp;

    const originalIsHostileTo = sim.ctx.isHostileTo;
    sim.ctx.isHostileTo = (attacker, candidate) =>
      candidate.id === target.id ? false : originalIsHostileTo(attacker, candidate);
    sim.tick();

    expect(sim.player.targetId).toBe(target.id);
    expect(bystander.hp).toBe(bystanderHp);
    expectCanceledBeforeSpend(sim, target, before.resource, before.targetHp);
  });

  it('cancels an unreachable target on the shared forty-observation stall boundary', () => {
    const sim = makeSim('warrior', 24_804);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_unreachable_target');
    selectTarget(sim, target);
    const resource = sim.player.resource;
    const targetHp = target.hp;
    const moveToward = vi.fn();
    sim.ctx.moveToward = moveToward;

    sim.drainEvents();
    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    expect(sim.drainEvents()).toEqual([]);
    for (let tick = 0; tick <= MIR4_AUTO_BATTLE_STALL_TICKS; tick += 1) sim.tick();

    expect(moveToward).toHaveBeenCalledTimes(MIR4_AUTO_BATTLE_STALL_TICKS);
    expect(sim.player.resource).toBe(resource);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(target.hp).toBe(targetHp);
    placeTargetInRange(sim, target);
    expectCanceledBeforeSpend(sim, target, resource, targetHp);
  });

  it('casts targetless Phoenix Embrace immediately without a selection or pursuit', () => {
    const sim = makeSim('elementalist', 24_805);
    sim.setPlayerLevel(48);
    placePlayerInOpenField(sim);
    const phoenixSlot = sim.known.findIndex((ability) => ability.def.id === 'mir4_skill_2204');
    const resource = sim.player.resource;
    const position = { ...sim.player.pos };

    expect(phoenixSlot).toBeGreaterThanOrEqual(0);
    const phoenix = sim.known[phoenixSlot];
    if (!phoenix) throw new Error('missing Phoenix Embrace action-bar slot');
    expect(sim.player.targetId).toBeNull();
    sim.castAbilityBySlot(phoenixSlot);

    expect(sim.player.targetId).toBeNull();
    expect(sim.player.pos).toEqual(position);
    expect(sim.player.resource).toBe(resource - phoenix.cost);
    expect(sim.player.cooldowns.get('2204')).toBe(54);
    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(0);
    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(1);
    sim.time = 0.85;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(25);
    expect(mir4AttackMultiplier(sim.player)).toBe(1);
    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.players.get(sim.playerId)?.mir4TargetCombat).toBeUndefined();
    expect(sim.players.get(sim.playerId)?.autoBattle).toBeUndefined();
  });

  it('commits a targetless actor-area skill even when no hostile is nearby', () => {
    const sim = makeSim('warrior', 24_806);
    sim.setPlayerLevel(56);
    placePlayerInOpenField(sim);
    const stanceSlot = sim.known.findIndex((ability) => ability.def.id === 'mir4_skill_1502');
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');
    meta.mir4SkillLevels = { 1502: 8 };
    const resource = sim.player.resource;

    expect(stanceSlot).toBeGreaterThanOrEqual(0);
    expect(sim.player.targetId).toBeNull();
    sim.castAbilityBySlot(stanceSlot);

    expect(sim.player.cooldowns.get('1502')).toBe(52);
    expect(sim.player.resource).toBeLessThan(resource);
    const stanceImpacts = sim.player.mir4PendingImpacts ?? [];
    sim.time = Math.max(...stanceImpacts.map((impact) => impact.dueAt));
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 29)).toBe(130);
    expect(mir4NativeStatusBonus(sim.player, 43)).toBe(3_000);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('keeps an explicit command target captured when it was not the selected target', () => {
    const sim = makeSim('warrior', 24_807);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_explicit_target');
    sim.player.targetId = null;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: target.id,
      selectionBound: false,
    });

    let ticks = 0;
    while (!sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID) && ticks++ < 160) sim.tick();

    expect(ticks).toBeLessThan(160);
    expect(sim.player.targetId).toBeNull();
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(true);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('rebinds a duplicate request when its selection ownership changes', () => {
    const sim = makeSim('warrior', 24_814);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_rebound_target');
    sim.player.targetId = null;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: target.id,
      selectionBound: false,
    });

    sim.player.targetId = target.id;
    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', sim.playerId)).toEqual({
      ok: true,
      queued: true,
    });
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: target.id,
      selectionBound: true,
    });

    sim.player.targetId = null;
    sim.tick();
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
  });

  it('does not rotate toward an in-range target when atomic admission fails', () => {
    const sim = makeSim('warrior', 24_808);
    const target = spawnTarget(sim, INSIDE_VOID_SLASH_RANGE, 'manual_failed_facing');
    target.pos = sim.groundPos(sim.player.pos.x + INSIDE_VOID_SLASH_RANGE, sim.player.pos.z);
    target.prevPos = { ...target.pos };
    sim.rebucket(target);
    sim.player.targetId = target.id;
    sim.player.facing = 0;
    sim.player.resource = 0;

    sim.castAbilityBySlot(VOID_SLASH_SLOT);

    expect(sim.player.facing).toBe(0);
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('retains sole movement ownership through the queued commit tick', () => {
    const sim = makeSim('warrior', 24_809);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_commit_owner');
    selectTarget(sim, target);
    sim.setMir4AutoBattle(true);
    const originalMoveToward = sim.ctx.moveToward;
    const moveToward = vi.fn((...args: Parameters<typeof originalMoveToward>) =>
      originalMoveToward(...args),
    );
    sim.ctx.moveToward = moveToward;

    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    let commitTickMoveCalls = -1;
    for (let tick = 0; tick < 160; tick += 1) {
      moveToward.mockClear();
      sim.tick();
      if (sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)) {
        commitTickMoveCalls = moveToward.mock.calls.length;
        break;
      }
    }

    expect(commitTickMoveCalls).toBe(0);
    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
  });

  it('does not classify a moving line-of-sight detour as an unreachable target', () => {
    const sim = makeSim('warrior', 24_810);
    const target = spawnTarget(sim, OUTSIDE_VOID_SLASH_RANGE, 'manual_detour_target');
    selectTarget(sim, target);
    sim.ctx.moveToward = (player) => {
      player.pos.x += 0.1;
      return true;
    };

    sim.castAbilityBySlot(VOID_SLASH_SLOT);
    for (let tick = 0; tick <= MIR4_AUTO_BATTLE_STALL_TICKS + 2; tick += 1) sim.tick();

    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toMatchObject({
      targetId: target.id,
    });
    expect(sim.player.cooldowns.has(VOID_SLASH_COOLDOWN_ID)).toBe(false);
  });
});
