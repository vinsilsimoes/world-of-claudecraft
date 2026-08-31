import { describe, expect, it, vi } from 'vitest';

// Exercise the real client packet, server dispatch, simulation and snapshot paths.
// Only persistence is replaced: this is not the live PostgreSQL/browser proof.
vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
}));

import { GameServer } from '../server/game';
import { JumpInput } from '../src/game/jump_input';
import { encodeMovementInput } from '../src/net/movement_packet';
import { MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import { DT, emptyMoveInput } from '../src/sim/types';
import { broadcast, fakeWs, lastSnap } from './helpers/bare_client';

function fixture() {
  const server = new GameServer(undefined, MIR4_GAME_PROFILE);
  const transport = fakeWs();
  const session = server.join(transport.ws, 1, 1, 'Saltoteste', 'warrior', null, false, {});
  if ('error' in session) throw new Error(session.error);
  session.blockListLoaded = true;
  const player = server.sim.entities.get(session.pid);
  if (!player) throw new Error('Joined player missing from server simulation');
  player.onGround = true;
  player.prevPos = { ...player.pos };
  player.fallStartY = player.pos.y;
  const input = new JumpInput();
  let sequence = 0;
  const send = (now: number) => {
    const move = { ...emptyMoveInput(), ...input.read(now, false) };
    server.handleMessage(
      session,
      JSON.stringify({ t: 'input', seq: ++sequence, mi: encodeMovementInput(move) }),
    );
  };
  const press = (now: number) => {
    input.pressTap(now);
    send(now);
  };
  return { server, transport, session, player, input, press, send };
}

describe('double jump authoritative server pipeline', () => {
  it('relays both impulses through real dispatch and snapshots, and denies a third', () => {
    const { server, transport, session, player, press, send } = fixture();
    expect(server.sim.cfg.gameProfile).toBe(MIR4_GAME_PROFILE);
    expect(player.mir4).toBeDefined();
    press(0);
    server.sim.tick();
    const firstVelocity = player.vy;
    expect(firstVelocity).toBeGreaterThan(0);
    expect(player.jumpCount).toBe(1);
    for (let tick = 0; tick < 3; tick++) server.sim.tick();
    const secondStartY = player.pos.y;
    press(200);
    server.sim.tick();
    expect(player.vy).toBe(firstVelocity);
    expect(player.pos.y).toBeCloseTo(secondStartY + firstVelocity * DT, 8);
    expect(player.jumpCount).toBe(2);
    press(250);
    server.sim.tick();
    expect(player.vy).toBeLessThan(firstVelocity);
    expect(player.jumpCount).toBe(2);
    broadcast(server);
    const snap = lastSnap(transport.sent);
    expect(snap.self.ack).toBe(3);
    expect(snap.self.id).toBe(session.pid);
    expect(snap.self.y).toBeCloseTo(player.pos.y, 2);
    send(1000);
    for (let tick = 0; tick < 40; tick++) server.sim.tick();
    expect(player.onGround).toBe(true);
    press(2500);
    server.sim.tick();
    expect(player.jumpCount).toBe(1);
    expect(player.vy).toBe(firstVelocity);
  });

  it('keeps two presses received before one server tick without granting extra jumps', () => {
    const { server, player, press } = fixture();
    press(0);
    press(10);
    server.sim.tick();
    const firstVelocity = player.vy;
    expect(player.jumpCount).toBe(1);
    server.sim.tick();
    expect(player.jumpCount).toBe(2);
    expect(player.vy).toBe(firstVelocity);
    server.sim.tick();
    expect(player.vy).toBeLessThan(firstVelocity);
    expect(player.jumpCount).toBe(2);
  });

  it('does not resurrect a press cancelled before it reached the server', () => {
    const { server, player, input, press } = fixture();
    input.pressTap(0);
    input.clear();
    press(10);
    server.sim.tick();
    const firstVelocity = player.vy;
    server.sim.tick();
    expect(player.jumpCount).toBe(1);
    expect(player.vy).toBeLessThan(firstVelocity);
  });
});
