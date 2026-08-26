// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { Mir4SpiritCodexWindow } from '../src/ui/mir4_spirit_codex_window';
import type { IWorld } from '../src/world_api';

function harness() {
  const state: Mir4PlayerUiState = {
    classId: 1,
    ultimateGauge: 0,
    mir4ArcRewards: { tickets: { 'spirit-ticket-dawn': 100_000 } },
    mir4Spirits: {
      owned: {
        'spirit-common-01': 1,
        'spirit-uncommon-01': 12,
        'spirit-rare-01': 1,
      },
      equippedSpiritId: 'spirit-rare-01',
      pending: [{ id: 'pending-epic-01', spiritId: 'spirit-epic-01', grade: 4 }],
    },
  };
  const methods = {
    mir4RedeemTicket: vi.fn(),
    mir4EquipSpirit: vi.fn(),
    mir4ConfirmSpirit: vi.fn(),
    mir4ConfirmAllSpirits: vi.fn(),
    mir4CombineSpirits: vi.fn(),
  };
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port' },
    mir4PlayerState: () => state,
    ...methods,
  } as unknown as IWorld;
  const root = document.createElement('section');
  root.id = 'spirit-sanctuary-window';
  root.className = 'window panel';
  document.body.appendChild(root);
  const mountPreview = vi.fn();
  const window = new Mir4SpiritCodexWindow({
    root: () => root,
    world: () => world,
    closeOthers: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
    mountPreview,
  });
  return { window, root, state, methods, mountPreview };
}

describe('MIR4 Spirit codex window', () => {
  it('renders the complete collection and mounts the selected WoC 3D visual', () => {
    const test = harness();
    test.window.open();

    expect(test.root.style.display).toBe('flex');
    expect(test.root.querySelectorAll('[data-spirit-id]')).toHaveLength(30);
    expect(test.root.textContent).toContain('Spirit Sanctuary');
    expect(test.root.textContent).toContain('Album Bonuses');
    expect(test.root.querySelectorAll('.mir4-album-stats > span')).toHaveLength(14);
    expect(test.mountPreview).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'mob_fox',
      'spirit-rare-01',
    );
    test.root.querySelector<HTMLButtonElement>('[data-spirit-id="spirit-common-01"]')?.click();
    expect(test.mountPreview).toHaveBeenLastCalledWith(
      expect.any(HTMLElement),
      'mob_glimmerwisp',
      'spirit-common-01',
    );
  });

  it('routes summon, equip, confirmation and enabled fusion through authoritative commands', () => {
    const test = harness();
    test.window.open('summon');
    const summonOne = test.root.querySelector<HTMLButtonElement>('[data-ticket-count="1"]');
    const summonTen = test.root.querySelector<HTMLButtonElement>('[data-ticket-count="10"]');
    const summonHundred = test.root.querySelector<HTMLButtonElement>('[data-ticket-count="100"]');
    expect(summonOne?.disabled).toBe(false);
    expect(summonTen?.disabled).toBe(false);
    expect(summonHundred?.disabled).toBe(false);
    expect(summonTen?.getAttribute('aria-label')).toContain('Dawn Spirit Ticket');
    expect(summonTen?.getAttribute('aria-label')).toContain('Summon (10)');
    summonOne?.click();
    summonTen?.click();
    summonHundred?.click();
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(1, 'spirit-ticket-dawn', 1);
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(2, 'spirit-ticket-dawn', 10);
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(3, 'spirit-ticket-dawn', 100);

    test.root.querySelector<HTMLButtonElement>('[data-tab="collection"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-spirit-id="spirit-common-01"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-spirit-action]')?.click();
    expect(test.methods.mir4EquipSpirit).toHaveBeenCalledWith('spirit-common-01');

    test.root.querySelector<HTMLButtonElement>('[data-spirit-id="spirit-epic-01"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-spirit-action]')?.click();
    expect(test.methods.mir4ConfirmSpirit).toHaveBeenCalledWith('pending-epic-01');

    test.window.open('fusion');
    const combine = test.root.querySelector<HTMLButtonElement>('[data-combine-grade="2"]');
    expect(combine?.disabled).toBe(false);
    expect(combine?.getAttribute('aria-label')).toContain('Grade 2');
    combine?.click();
    expect(test.methods.mir4CombineSpirits).toHaveBeenCalledWith(2);
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="2"]');
    expect(combineAll?.disabled).toBe(false);
    expect(combineAll?.textContent).toContain('Combine All (3)');
    expect(combineAll?.getAttribute('aria-label')).toContain('Grade 2');
    combineAll?.click();
    expect(test.methods.mir4CombineSpirits).toHaveBeenLastCalledWith(2, true);
  });

  it('separates pending Spirits into a confirmation tab with one-click confirm-all', () => {
    const test = harness();
    test.state.mir4Spirits?.pending?.push({
      id: 'pending-epic-02',
      spiritId: 'spirit-epic-02',
      grade: 4,
    });

    test.window.open('confirmations');

    expect(test.root.querySelector('[data-tab="confirmations"]')?.textContent).toContain(
      'Confirmations (2)',
    );
    expect(test.root.querySelectorAll('[data-confirm-spirit-id]')).toHaveLength(2);
    expect(test.root.textContent).toContain('Possible new album entry:');
    expect(
      test.root
        .querySelector('[data-confirm-spirit-id="pending-epic-01"]')
        ?.getAttribute('aria-label'),
    ).toMatch(/^Confirm Spirit: .+/);
    test.root
      .querySelector<HTMLButtonElement>('[data-confirm-spirit-id="pending-epic-01"]')
      ?.click();
    expect(test.methods.mir4ConfirmSpirit).toHaveBeenCalledWith('pending-epic-01');

    test.root.querySelector<HTMLButtonElement>('[data-confirm-all-spirits]')?.click();
    expect(test.methods.mir4ConfirmAllSpirits).toHaveBeenCalledOnce();
  });

  it('disables only the summon amounts above the authoritative ticket balance', () => {
    const test = harness();
    test.state.mir4ArcRewards = { tickets: { 'spirit-ticket-dawn': 10 } };
    test.window.open('summon');

    expect(test.root.querySelector<HTMLButtonElement>('[data-ticket-count="1"]')?.disabled).toBe(
      false,
    );
    expect(test.root.querySelector<HTMLButtonElement>('[data-ticket-count="10"]')?.disabled).toBe(
      false,
    );
    expect(test.root.querySelector<HTMLButtonElement>('[data-ticket-count="100"]')?.disabled).toBe(
      true,
    );
  });

  it('disables Sunset batches that exceed pending capacity and explains why', () => {
    const test = harness();
    test.state.mir4ArcRewards = { tickets: { 'spirit-ticket-sunset': 100 } };
    test.state.mir4Spirits ??= {};
    test.state.mir4Spirits.pending = Array.from({ length: 207 }, (_, index) => ({
      id: `spirit-pending-1-${index + 1}`,
      spiritId: 'spirit-epic-01',
      grade: 4,
    }));
    test.window.open('summon');

    expect(
      test.root.querySelector<HTMLButtonElement>(
        '[data-ticket="spirit-ticket-sunset"][data-ticket-count="10"]',
      )?.disabled,
    ).toBe(false);
    expect(
      test.root.querySelector<HTMLButtonElement>(
        '[data-ticket="spirit-ticket-sunset"][data-ticket-count="100"]',
      )?.disabled,
    ).toBe(true);
    expect(test.root.textContent).toContain('49 pending confirmation slots available');
  });

  it('explains when pending capacity blocks high-grade fusion', () => {
    const test = harness();
    test.state.mir4Spirits ??= {};
    test.state.mir4Spirits.owned = { 'spirit-rare-01': 8 };
    test.state.mir4Spirits.pending = Array.from({ length: 256 }, (_, index) => ({
      id: `spirit-pending-1-${index + 1}`,
      spiritId: 'spirit-epic-01',
      grade: 4,
    }));
    test.window.open('fusion');

    const combine = test.root.querySelector<HTMLButtonElement>('[data-combine-grade="3"]');
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combine?.disabled).toBe(true);
    expect(combineAll?.disabled).toBe(true);
    expect(combine?.getAttribute('aria-describedby')).toBe('mir4-spirit-fusion-capacity-3');
    expect(test.root.textContent).toContain(
      '0 pending confirmation slots available; each attempt reserves one.',
    );
  });

  it('caps combine-all to the available Spirit confirmation capacity', () => {
    const test = harness();
    test.state.mir4Spirits ??= {};
    test.state.mir4Spirits.owned = { 'spirit-rare-01': 8 };
    test.state.mir4Spirits.pending = Array.from({ length: 255 }, (_, index) => ({
      id: `spirit-pending-1-${index + 1}`,
      spiritId: 'spirit-epic-01',
      grade: 4,
    }));
    test.window.open('fusion');

    const combine = test.root.querySelector<HTMLButtonElement>('[data-combine-grade="3"]');
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combine?.disabled).toBe(false);
    expect(combineAll?.disabled).toBe(false);
    expect(combineAll?.textContent).toContain('Combine All (1)');
    expect(test.root.textContent).toContain(
      '1 pending confirmation slots available; each attempt reserves one.',
    );
  });

  it('enables combine-all at the exact pending capacity and restores its focus', () => {
    const test = harness();
    test.state.mir4Spirits ??= {};
    test.state.mir4Spirits.owned = { 'spirit-rare-01': 8 };
    test.state.mir4Spirits.pending = Array.from({ length: 254 }, (_, index) => ({
      id: `spirit-pending-1-${index + 1}`,
      spiritId: 'spirit-epic-01',
      grade: 4,
    }));
    test.window.open('fusion');

    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combineAll?.disabled).toBe(false);
    combineAll?.focus();
    combineAll?.click();

    expect(test.methods.mir4CombineSpirits).toHaveBeenCalledWith(3, true);
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe('combine-all:3');
  });

  it('keeps focus inside after rebuilds and exposes keyboard-complete tabs', () => {
    const test = harness();
    test.window.open('collection');
    const collection = test.root.querySelector<HTMLButtonElement>('[data-tab="collection"]');
    expect(document.activeElement).toBe(collection);
    expect(collection?.tabIndex).toBe(0);
    expect(test.root.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      'mir4-spirit-tab-collection',
    );
    for (const tab of test.root.querySelectorAll<HTMLElement>('[role="tab"]')) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBe('mir4-spirit-panel');
      expect(test.root.querySelector(`#${panelId}`)).not.toBeNull();
    }

    collection?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const summon = test.root.querySelector<HTMLButtonElement>('[data-tab="summon"]');
    expect(document.activeElement).toBe(summon);
    expect(summon?.tabIndex).toBe(0);
    expect(collection?.isConnected).toBe(false);

    test.root.querySelector<HTMLButtonElement>('[data-tab="collection"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-spirit-id="spirit-common-01"]')?.click();
    const action = test.root.querySelector<HTMLButtonElement>('[data-spirit-action]');
    action?.focus();
    action?.click();
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe('action:spirit-common-01');
  });
});
