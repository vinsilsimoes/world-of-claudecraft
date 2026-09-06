import { describe, expect, it, vi } from 'vitest';

vi.mock('../../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  revokeAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  acquireCharacterLease: vi.fn(async () => true),
  releaseCharacterLease: vi.fn(async () => {}),
  heartbeatCharacterLeases: vi.fn(async () => {}),
  releaseAllCharacterLeases: vi.fn(async () => {}),
}));

import { type ClientSession, GameServer } from '../../server/game';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';

function fakeWs() {
  const ws: any = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(),
    terminate: vi.fn(() => {
      ws.readyState = 3;
    }),
  };
  return ws;
}

function expectJoined(result: ClientSession | { error: string }): ClientSession {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('MIR4 skill activation linkdead lifecycle', () => {
  it('cancels a queued manual skill before the disconnected character can approach or spend', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const ws = fakeWs();
    const session = expectJoined(server.join(ws, 71, 7_101, 'Skilldrop', 'warrior', null));
    const meta = server.sim.meta(session.pid);
    if (!meta) throw new Error('missing joined MIR4 metadata');
    meta.mir4SkillActivation = {
      phase: 'approach',
      abilityId: 'mir4_skill_1102',
      targetId: 999_991,
      selectionBound: false,
      armedTick: server.sim.tickCount,
      instanceKey: server.sim.ctx.instanceKeyFor(session.pid),
    };
    meta.mir4SkillActivationClaimedThroughTick = server.sim.tickCount + 1;

    ws.readyState = 3;
    expect(server.socketClosed(session, ws)).toBe(true);

    expect(session.linkdead).toBe(true);
    expect(meta.mir4SkillActivation).toBeUndefined();
    expect(meta.mir4SkillActivationClaimedThroughTick).toBeUndefined();
  });

  it('interrupts committed action motion without refunding or cancelling pending contacts', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const ws = fakeWs();
    const session = expectJoined(server.join(ws, 72, 7_102, 'SkilldropAction', 'warrior', null));
    const player = server.sim.entities.get(session.pid);
    const meta = server.sim.meta(session.pid);
    if (!player?.mir4 || !meta) throw new Error('missing joined MIR4 player state');
    player.mir4.accuracy = 10_000;
    player.mir4.critical = 0;
    const template = {
      ...MIR4_MOBS.mir4_forest_wolf,
      id: 'linkdead_skill_action_target',
      hpBase: 1_000_000,
      hpPerLevel: 0,
      dmgBase: 0,
      dmgPerLevel: 0,
      moveSpeed: 0,
      aggroRadius: 0,
    };
    server.sim.mir4RuntimeMobTemplates.set(template.id, template);
    const target = createMob(server.sim.nextId++, template, 1, { ...player.pos });
    target.wanderTimer = Number.POSITIVE_INFINITY;
    server.sim.addEntity(target);
    const resourceBefore = player.resource;

    expect(server.sim.castMir4Skill(1102, session.pid, target.id)).toEqual({ ok: true });
    const resourceAfterCast = player.resource;
    const cooldownAfterCast = player.cooldowns.get('1102');
    const pendingBeforeDrop = player.mir4PendingImpacts?.length;
    const positionAtDrop = { ...player.pos };

    ws.readyState = 3;
    expect(server.socketClosed(session, ws)).toBe(true);

    expect(meta.mir4SkillAction?.motionInterrupted).toBe(true);
    expect(resourceAfterCast).toBeLessThan(resourceBefore);
    expect(player.resource).toBe(resourceAfterCast);
    expect(player.cooldowns.get('1102')).toBe(cooldownAfterCast);
    expect(player.mir4PendingImpacts).toHaveLength(pendingBeforeDrop ?? 0);

    for (let tick = 0; tick < 20; tick += 1) server.sim.tick();
    expect(player.pos).toEqual(positionAtDrop);
    expect(target.hp).toBeLessThan(target.maxHp);
  });
});
