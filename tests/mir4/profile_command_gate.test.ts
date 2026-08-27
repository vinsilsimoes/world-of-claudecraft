import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  setAccountWeaponSkinLoadout: vi.fn(async () => ({
    completedQuestIds: [],
    mechChromaIds: [],
    weaponSkinIds: [],
    weaponSkinLoadout: {},
  })),
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
}));

import { GameServer } from '../../server/game';
import { DEFAULT_GAME_PROFILE, MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import {
  gameProfileAllowsCommand,
  gameProfileAllowsWireCommand,
  MIR4_CLASSIC_ONLY_COMMANDS,
  MIR4_SHARED_COMMANDS,
} from '../../src/sim/game_profile_commands';
import { COMMAND_NAMES, type CommandName } from '../../src/world_api';
import { fakeWs } from '../helpers/bare_client';

afterEach(() => vi.restoreAllMocks());

describe('game-profile command authority', () => {
  it('classifies the append-only wire vocabulary exactly once and fails closed for MIR4', () => {
    const blocked: ReadonlySet<CommandName> = new Set(MIR4_CLASSIC_ONLY_COMMANDS);
    const shared: ReadonlySet<CommandName> = new Set(MIR4_SHARED_COMMANDS);
    const classified = [...new Set([...blocked, ...shared])].sort();

    expect(MIR4_CLASSIC_ONLY_COMMANDS).toHaveLength(100);
    expect(MIR4_SHARED_COMMANDS).toHaveLength(113);
    expect([...blocked].filter((command) => shared.has(command))).toEqual([]);
    expect(classified).toEqual([...COMMAND_NAMES].sort());
    for (const command of MIR4_CLASSIC_ONLY_COMMANDS) {
      expect(gameProfileAllowsCommand(MIR4_GAME_PROFILE, command), command).toBe(false);
    }
    for (const command of MIR4_SHARED_COMMANDS) {
      expect(gameProfileAllowsCommand(MIR4_GAME_PROFILE, command), command).toBe(true);
    }
  });

  it('keeps the MIR4 envelope closed on classic realms', () => {
    for (const command of COMMAND_NAMES) {
      expect(gameProfileAllowsCommand('woc-classic', command), command).toBe(command !== 'mir4');
    }
  });

  it('lets malformed and unknown tokens reach the host anomaly arm without executing a profile verb', () => {
    expect(gameProfileAllowsWireCommand(MIR4_GAME_PROFILE, 'future_unknown_command')).toBe(true);
    expect(gameProfileAllowsWireCommand(MIR4_GAME_PROFILE, null)).toBe(true);
    expect(gameProfileAllowsWireCommand(MIR4_GAME_PROFILE, 'setSpec')).toBe(false);
    expect(gameProfileAllowsWireCommand('woc-classic', 'mir4')).toBe(false);
  });

  it('rejects crafted classic providers before their Sim verbs run in a MIR4 realm', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const client = fakeWs();
    const session = server.join(client.ws, 1, 1, 'Profile Gate', 'warrior', null, false, {});
    if ('error' in session) throw new Error(session.error);

    const acceptQuest = vi.spyOn(server.sim, 'acceptQuest');
    const craftItem = vi.spyOn(server.sim, 'craftItem');
    const setSpec = vi.spyOn(server.sim, 'setSpec');
    const toggleMount = vi.spyOn(server.sim, 'toggleMountFor');
    const arenaQueue = vi.spyOn(server.sim, 'arenaQueueJoin');

    const frames = [
      { cmd: 'accept', quest: 'q_wolves' },
      { cmd: 'craft_item', recipe: 'worn_sword' },
      { cmd: 'setSpec', spec: 'arms' },
      { cmd: 'mount_toggle' },
      { cmd: 'arena_queue', format: '1v1' },
    ];
    for (const frame of frames) {
      server.handleMessage(session, JSON.stringify({ t: 'cmd', ...frame }));
    }

    expect(acceptQuest).not.toHaveBeenCalled();
    expect(craftItem).not.toHaveBeenCalled();
    expect(setSpec).not.toHaveBeenCalled();
    expect(toggleMount).not.toHaveBeenCalled();
    expect(arenaQueue).not.toHaveBeenCalled();
  });

  it('still admits the shared inventory surface and authoritative MIR4 envelope', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const client = fakeWs();
    const session = server.join(client.ws, 1, 1, 'Shared Gate', 'warrior', null, false, {});
    if ('error' in session) throw new Error(session.error);

    const sortInventory = vi.spyOn(server.sim, 'sortInventory');
    const autoBattle = vi.spyOn(server.sim, 'setMir4AutoBattle');
    const autoPotion = vi.spyOn(server.sim, 'setMir4AutoPotionThreshold');
    server.handleMessage(session, JSON.stringify({ t: 'cmd', cmd: 'inv_sort' }));
    server.handleMessage(session, JSON.stringify({ t: 'cmd', cmd: 'mir4', m: 'auto', on: true }));
    server.handleMessage(
      session,
      JSON.stringify({ t: 'cmd', cmd: 'mir4', m: 'autoPotion', kind: 'health', percent: 65 }),
    );
    server.handleMessage(
      session,
      JSON.stringify({ t: 'cmd', cmd: 'mir4', m: 'autoPotion', kind: 'mana', percent: 63 }),
    );

    expect(sortInventory).toHaveBeenCalledWith(session.pid);
    expect(autoBattle).toHaveBeenCalledWith(true, session.pid);
    expect(autoPotion).toHaveBeenCalledTimes(1);
    expect(autoPotion).toHaveBeenCalledWith('health', 65, session.pid);
  });

  it('rejects the MIR4 envelope before its Sim verb runs in a classic realm', () => {
    const server = new GameServer(undefined, DEFAULT_GAME_PROFILE);
    const client = fakeWs();
    const session = server.join(client.ws, 1, 1, 'Classic Gate', 'warrior', null, false, {});
    if ('error' in session) throw new Error(session.error);
    const autoBattle = vi.spyOn(server.sim, 'setMir4AutoBattle');
    autoBattle.mockClear();

    server.handleMessage(session, JSON.stringify({ t: 'cmd', cmd: 'mir4', m: 'auto', on: true }));

    expect(autoBattle).not.toHaveBeenCalled();
  });
});
