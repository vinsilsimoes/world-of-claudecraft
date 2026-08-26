// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { Mir4MountCodexWindow } from '../src/ui/mir4_mount_codex_window';
import type { IWorld } from '../src/world_api';

function harness() {
  const state: Mir4PlayerUiState = {
    classId: 1,
    ultimateGauge: 0,
    mir4ArcRewards: { tickets: { 'mount-ticket-dawn': 100_000 } },
    mir4Mounts: {
      owned: { 'meadow-courser': 1, 'amber-bear': 12 },
      equippedMountId: 'meadow-courser',
      pending: [{ id: 'mount-pending-epic', mountId: 'eclipse-lion', grade: 4 }],
    },
  };
  const methods = {
    mir4RedeemTicket: vi.fn(),
    mir4EquipMount: vi.fn(),
    mir4ConfirmMount: vi.fn(),
    mir4ConfirmAllMounts: vi.fn(),
    mir4CombineMounts: vi.fn(),
  };
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port' },
    mir4PlayerState: () => state,
    ...methods,
  } as unknown as IWorld;
  const root = document.createElement('section');
  root.id = 'mount-sanctuary-window';
  root.className = 'window panel';
  document.body.appendChild(root);
  const mountPreview = vi.fn();
  const window = new Mir4MountCodexWindow({
    root: () => root,
    world: () => world,
    closeOthers: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
    mountPreview,
  });
  return { window, root, state, methods, mountPreview };
}

describe('MIR4 Mount codex window', () => {
  it('renders all Mounts in a dedicated system window with WoC 3D previews', () => {
    const test = harness();
    test.window.open();

    expect(test.root.style.display).toBe('flex');
    expect(test.root.querySelectorAll('[data-mount-id]')).toHaveLength(85);
    expect(test.root.textContent).toContain('Mount Sanctuary');
    expect(test.root.textContent).toContain('Album Bonuses');
    expect(test.root.querySelectorAll('.mir4-album-stats > span')).toHaveLength(14);
    expect(test.mountPreview).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.stringMatching(/^mount_/),
      'meadow-courser',
    );
  });

  it('routes summon 1/10/100, confirmation, equip and combine-all to authoritative commands', () => {
    const test = harness();
    test.window.open('summon');
    for (const count of [1, 10, 100]) {
      test.root.querySelector<HTMLButtonElement>(`[data-ticket-count="${count}"]`)?.click();
    }
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(1, 'mount-ticket-dawn', 1);
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(2, 'mount-ticket-dawn', 10);
    expect(test.methods.mir4RedeemTicket).toHaveBeenNthCalledWith(3, 'mount-ticket-dawn', 100);

    test.window.open('collection');
    test.root.querySelector<HTMLButtonElement>('[data-mount-id="eclipse-lion"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-mount-action]')?.click();
    expect(test.methods.mir4ConfirmMount).toHaveBeenCalledWith('mount-pending-epic');

    test.root.querySelector<HTMLButtonElement>('[data-mount-id="amber-bear"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-mount-action]')?.click();
    expect(test.methods.mir4EquipMount).toHaveBeenCalledWith('amber-bear');

    test.window.open('fusion');
    test.root.querySelector<HTMLButtonElement>('[data-combine-grade="3"]')?.click();
    expect(test.methods.mir4CombineMounts).toHaveBeenCalledWith(3);
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combineAll?.textContent).toContain('Combine All (3)');
    combineAll?.click();
    expect(test.methods.mir4CombineMounts).toHaveBeenLastCalledWith(3, true);
  });

  it('separates pending Mounts into a confirmation tab with one-click confirm-all', () => {
    const test = harness();
    test.state.mir4Mounts?.pending?.push({
      id: 'mount-pending-epic-duplicate',
      mountId: 'eclipse-lion',
      grade: 4,
    });

    test.window.open('confirmations');

    expect(test.root.querySelector('[data-tab="confirmations"]')?.textContent).toContain(
      'Confirmations (2)',
    );
    expect(test.root.querySelectorAll('[data-confirm-mount-id]')).toHaveLength(2);
    expect(test.root.textContent).toContain('Possible new album entry:');
    expect(
      test.root
        .querySelector('[data-confirm-mount-id="mount-pending-epic"]')
        ?.getAttribute('aria-label'),
    ).toMatch(/^Confirm Mount: .+/);
    test.root
      .querySelector<HTMLButtonElement>('[data-confirm-mount-id="mount-pending-epic"]')
      ?.click();
    expect(test.methods.mir4ConfirmMount).toHaveBeenCalledWith('mount-pending-epic');

    test.root.querySelector<HTMLButtonElement>('[data-confirm-all-mounts]')?.click();
    expect(test.methods.mir4ConfirmAllMounts).toHaveBeenCalledOnce();
  });

  it('disables only Twilight summon batches that exceed pending capacity', () => {
    const test = harness();
    test.state.mir4ArcRewards = { tickets: { 'mount-ticket-twilight': 100 } };
    test.state.mir4Mounts ??= {};
    test.state.mir4Mounts.pending = Array.from({ length: 79 }, (_, index) => ({
      id: `mount-pending-1-${index + 1}`,
      mountId: 'eclipse-lion',
      grade: 4,
    }));
    test.window.open('summon');

    expect(test.root.querySelector<HTMLButtonElement>('[data-ticket-count="10"]')?.disabled).toBe(
      false,
    );
    expect(test.root.querySelector<HTMLButtonElement>('[data-ticket-count="100"]')?.disabled).toBe(
      true,
    );
    expect(test.root.textContent).toContain('49 pending confirmation slots available');
  });

  it('disables only summon amounts above the authoritative Mount ticket balance', () => {
    const test = harness();
    test.state.mir4ArcRewards = { tickets: { 'mount-ticket-dawn': 10 } };
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

  it('explains when pending capacity blocks high-grade Mount fusion', () => {
    const test = harness();
    test.state.mir4Mounts ??= {};
    test.state.mir4Mounts.owned = { 'amber-bear': 8 };
    test.state.mir4Mounts.pending = Array.from({ length: 128 }, (_, index) => ({
      id: `mount-pending-1-${index + 1}`,
      mountId: 'eclipse-lion',
      grade: 4,
    }));
    test.window.open('fusion');

    const combine = test.root.querySelector<HTMLButtonElement>('[data-combine-grade="3"]');
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combine?.disabled).toBe(true);
    expect(combineAll?.disabled).toBe(true);
    expect(combine?.getAttribute('aria-describedby')).toBe('mir4-mount-fusion-capacity-3');
    expect(test.root.textContent).toContain(
      '0 pending confirmation slots available; each attempt reserves one.',
    );
  });

  it('caps combine-all to the available Mount confirmation capacity', () => {
    const test = harness();
    test.state.mir4Mounts ??= {};
    test.state.mir4Mounts.owned = { 'amber-bear': 8 };
    test.state.mir4Mounts.pending = Array.from({ length: 127 }, (_, index) => ({
      id: `mount-pending-1-${index + 1}`,
      mountId: 'eclipse-lion',
      grade: 4,
    }));
    test.window.open('fusion');

    expect(test.root.querySelector<HTMLButtonElement>('[data-combine-grade="3"]')?.disabled).toBe(
      false,
    );
    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combineAll?.disabled).toBe(false);
    expect(combineAll?.textContent).toContain('Combine All (1)');
    expect(test.root.textContent).toContain(
      '1 pending confirmation slots available; each attempt reserves one.',
    );
  });

  it('enables combine-all at exact capacity and restores keyboard focus after rebuilds', () => {
    const test = harness();
    test.state.mir4Mounts ??= {};
    test.state.mir4Mounts.owned = { 'amber-bear': 8 };
    test.state.mir4Mounts.pending = Array.from({ length: 126 }, (_, index) => ({
      id: `mount-pending-1-${index + 1}`,
      mountId: 'eclipse-lion',
      grade: 4,
    }));
    test.window.open('fusion');

    const combineAll = test.root.querySelector<HTMLButtonElement>('[data-combine-all-grade="3"]');
    expect(combineAll?.disabled).toBe(false);
    combineAll?.focus();
    combineAll?.click();

    expect(test.methods.mir4CombineMounts).toHaveBeenCalledWith(3, true);
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe('combine-all:3');
  });

  it('keeps Mount tabs keyboard-complete and focus inside after collection actions', () => {
    const test = harness();
    test.window.open('collection');
    const collection = test.root.querySelector<HTMLButtonElement>('[data-tab="collection"]');
    expect(document.activeElement).toBe(collection);
    expect(collection?.tabIndex).toBe(0);
    expect(test.root.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      'mir4-mount-tab-collection',
    );

    collection?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const summon = test.root.querySelector<HTMLButtonElement>('[data-tab="summon"]');
    expect(document.activeElement).toBe(summon);
    expect(summon?.tabIndex).toBe(0);

    test.root.querySelector<HTMLButtonElement>('[data-tab="collection"]')?.click();
    test.root.querySelector<HTMLButtonElement>('[data-mount-id="amber-bear"]')?.click();
    const action = test.root.querySelector<HTMLButtonElement>('[data-mount-action]');
    action?.focus();
    action?.click();
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe('action:amber-bear');
  });
});
