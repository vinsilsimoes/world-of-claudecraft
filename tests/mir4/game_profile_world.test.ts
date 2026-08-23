import { afterEach, describe, expect, it } from 'vitest';
import { ClientWorld } from '../../src/net/online';
import { BUILTIN_WORLD, getActiveWorldContent, setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { activateWorldForGameProfile, worldForGameProfile } from '../../src/sim/game_profile_world';
import type { WorldContent } from '../../src/sim/types';

class StubWebSocket {
  static readonly OPEN = 1;
  readyState = StubWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public readonly url: string) {}
  send(): void {}
  close(): void {}
}

function constructClient(profile: 'woc-classic' | typeof MIR4_GAME_PROFILE): ClientWorld {
  const globals = globalThis as Record<string, unknown>;
  const previousWebSocket = globals.WebSocket;
  const previousWindow = globals.window;
  globals.WebSocket = StubWebSocket;
  globals.window = { setInterval: () => 0, clearInterval: () => undefined };
  let client: ClientWorld;
  try {
    client = new ClientWorld('token', 1, 'warrior', 'http://localhost', 'seed', profile);
    client.close();
  } finally {
    globals.WebSocket = previousWebSocket;
    globals.window = previousWindow;
  }
  return client;
}

afterEach(() => setActiveWorldContent(null));

describe('game-profile world selection', () => {
  it('keeps the builtin world for the classic profile', () => {
    expect(worldForGameProfile('woc-classic')).toBeUndefined();
  });

  it('builds the requested MIR4 arc and makes the Sim registry agree with it', () => {
    const world = activateWorldForGameProfile(MIR4_GAME_PROFILE, {
      mir4MapCount: 2,
      mir4WocMap: false,
    });

    expect(world?.zones.map((zone) => zone.id)).toEqual([
      'mir4_m01-vila-do-vau',
      'mir4_m02-trilha-dos-juncos',
    ]);
    expect(getActiveWorldContent()).toBe(world);
  });

  it('activates the full MIR4 story transplant on the original WoC map by default', () => {
    const world = activateWorldForGameProfile(MIR4_GAME_PROFILE, {
      mir4MapCount: 4,
      mir4WocMap: true,
    });

    expect(world?.zones).toBe(BUILTIN_WORLD.zones);
    expect(world?.props.buildings).toBe(BUILTIN_WORLD.props.buildings);
    expect(world?.props.decorProps?.slice(0, BUILTIN_WORLD.props.decorProps?.length)).toEqual(
      BUILTIN_WORLD.props.decorProps,
    );
    expect(world?.mir4ArcMapProjections).toHaveLength(20);
    expect(world?.mir4ArcMapProjections?.at(0)?.mapId).toBe('m01-vila-do-vau');
    expect(world?.mir4ArcMapProjections?.at(-1)?.mapId).toBe('m20-bastilha-do-eclipse');
    expect(getActiveWorldContent()).toBe(world);
  });

  it('gives an explicit editor world precedence over profile defaults', () => {
    const editorWorld = { ...BUILTIN_WORLD, zones: [] } as WorldContent;

    expect(
      activateWorldForGameProfile(MIR4_GAME_PROFILE, {
        explicitWorld: editorWorld,
      }),
    ).toBe(editorWorld);
    expect(getActiveWorldContent()).toBe(editorWorld);
  });

  it('activates the same profile world at the online client host boundary', () => {
    const mir4 = constructClient(MIR4_GAME_PROFILE);
    expect(getActiveWorldContent().zones).toBe(BUILTIN_WORLD.zones);
    expect(getActiveWorldContent().mir4ArcMapProjections).toHaveLength(20);
    expect(mir4.cfg.world).toBe(getActiveWorldContent());

    const classic = constructClient('woc-classic');
    expect(getActiveWorldContent()).toBe(BUILTIN_WORLD);
    expect(classic.cfg.world).toBeUndefined();
  });
});
