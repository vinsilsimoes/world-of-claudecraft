import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { provisionDiagnosticsCollectionTickets } from '../src/game/diagnostics_playtest_kit';
import { Sim } from '../src/sim/sim';
import { EMPTY_TEST_WORLD } from './sim_shared';

function diagnosticsChat(chat = vi.fn()) {
  return { chat, player: { name: 'Diagnostics' } };
}

describe('diagnostics playtest kit', () => {
  it('tops up both MIR4 collection ticket families for the auto diagnostics account', () => {
    const chat = vi.fn();

    const provisioned = provisionDiagnosticsCollectionTickets(
      diagnosticsChat(chat),
      new URLSearchParams('diagnostics=1&diagnosticsAuto=1'),
      true,
    );

    expect(provisioned).toBe(true);
    expect(chat.mock.calls).toEqual([['/dev mounts'], ['/dev spirits']]);
  });

  it('provisions all four ticket balances through the real MIR4 Sim command path', () => {
    const sim = new Sim({
      seed: 92,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Diagnostics',
      gameProfile: 'mir4-gameplay-port',
      devCommands: true,
      world: EMPTY_TEST_WORLD,
    });

    expect(
      provisionDiagnosticsCollectionTickets(
        sim,
        new URLSearchParams('diagnostics=1&diagnosticsAuto=1'),
        true,
      ),
    ).toBe(true);
    expect(sim.mir4PlayerState()?.mir4ArcRewards?.tickets).toMatchObject({
      'mount-ticket-dawn': 100_000,
      'mount-ticket-twilight': 100_000,
      'spirit-ticket-dawn': 100_000,
      'spirit-ticket-sunset': 100_000,
    });
  });

  it('is wired inside startOffline before the world enters the game shell', () => {
    const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    const start = source.indexOf('async function startOffline(');
    const end = source.indexOf('// Online flow:', start);
    const body = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(body).toContain(
      'provisionDiagnosticsCollectionTickets(sim, startupParams, import.meta.env.DEV);',
    );
    expect(body.indexOf('provisionDiagnosticsCollectionTickets(')).toBeLessThan(
      body.indexOf('void startGame('),
    );
  });

  it.each([
    ['production build', 'diagnostics=1&diagnosticsAuto=1', false],
    ['manual diagnostics', 'diagnostics=1', true],
    ['auto flag without diagnostics', 'diagnosticsAuto=1', true],
    ['disabled diagnostics value', 'diagnostics=0&diagnosticsAuto=1', true],
    ['disabled auto value', 'diagnostics=1&diagnosticsAuto=0', true],
    ['ordinary offline play', '', true],
  ])('does not provision the fixture for %s', (_label, search, dev) => {
    const chat = vi.fn();

    const provisioned = provisionDiagnosticsCollectionTickets(
      diagnosticsChat(chat),
      new URLSearchParams(search),
      dev,
    );

    expect(provisioned).toBe(false);
    expect(chat).not.toHaveBeenCalled();
  });

  it('does not provision another development character that reuses the diagnostics query', () => {
    const chat = vi.fn();

    const provisioned = provisionDiagnosticsCollectionTickets(
      { chat, player: { name: 'Editor Tester' } },
      new URLSearchParams('diagnostics=1&diagnosticsAuto=1'),
      true,
    );

    expect(provisioned).toBe(false);
    expect(chat).not.toHaveBeenCalled();
  });
});
