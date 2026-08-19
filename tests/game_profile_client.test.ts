import { describe, expect, it, vi } from 'vitest';
import { bareClient } from './helpers/bare_client';

function hello(gameProfile: unknown): string {
  return JSON.stringify({
    t: 'hello',
    pid: 1,
    seed: 20061,
    gameProfile,
  });
}

describe('ClientWorld game profile handshake', () => {
  it('accepts an exact profile echo', () => {
    const client = bareClient(1, {
      cfg: {
        seed: 20061,
        playerClass: 'warrior',
        gameProfile: 'mir4-gameplay-port',
      },
      connected: false,
    });
    const disconnect = vi.fn();
    client.onDisconnect = disconnect;

    (client as unknown as { onMessage(raw: string): void }).onMessage(hello('mir4-gameplay-port'));

    expect(client.connected).toBe(true);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('fails closed on a missing, unknown, or different profile echo', () => {
    for (const gameProfile of [
      undefined,
      '',
      'future-profile',
      'woc-classic',
      'MIR4-GAMEPLAY-PORT',
    ]) {
      const client = bareClient(1, {
        cfg: {
          seed: 20061,
          playerClass: 'warrior',
          gameProfile: 'mir4-gameplay-port',
        },
        connected: false,
      });
      const disconnect = vi.fn();
      client.onDisconnect = disconnect;

      (client as unknown as { onMessage(raw: string): void }).onMessage(hello(gameProfile));

      expect(client.connected).toBe(false);
      expect(disconnect).toHaveBeenCalledWith(
        'Game and server versions are incompatible. Reload or update, then try again.',
      );
    }
  });
});
