// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import type { Mir4ClassId } from '../src/sim/content/mir4/classes';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { Mir4CodexWindow } from '../src/ui/mir4_codex_window';
import type { IWorld } from '../src/world_api';

function harness(level = 12, classId: Mir4ClassId = 1) {
  const state: Mir4PlayerUiState = {
    classId,
    playerLevel: level,
    ultimateGauge: 0,
    mir4Materials: { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 },
  };
  const methods = {
    mir4RegisterCodex: vi.fn(),
    mir4RegisterAllCodex: vi.fn(),
  };
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port' },
    mir4PlayerState: () => state,
    ...methods,
  } as unknown as IWorld;
  const root = document.createElement('section');
  root.id = 'codex-window';
  root.className = 'window panel';
  document.body.appendChild(root);
  let accept: (() => void) | null = null;
  const confirm = vi.fn((_title: string, _body: string, onAccept: () => void) => {
    accept = onAccept;
  });
  const window = new Mir4CodexWindow({
    root: () => root,
    world: () => world,
    closeOthers: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
    confirm,
  });
  return { window, root, state, methods, confirm, accept: () => accept };
}

describe('MIR4 Codex system window', () => {
  it('teaches the level gate before exposing collections', () => {
    const test = harness(11);
    test.window.open();
    expect(test.root.textContent).toContain('Reach level 12');
    expect(test.root.querySelectorAll('.mir4-codex-card')).toHaveLength(0);
  });

  it('renders six collections and confirms irreversible register-all', () => {
    const test = harness();
    test.window.open();
    expect(test.root.querySelectorAll('.mir4-codex-card')).toHaveLength(6);
    expect(test.root.textContent).toContain('permanently consume');
    expect(test.root.textContent).toContain('Warrior equipment: Weapon');
    const fieldCard = [...test.root.querySelectorAll<HTMLElement>('.mir4-codex-card')].find(
      (card) => card.textContent?.includes('Field Notes'),
    );
    fieldCard?.querySelector<HTMLButtonElement>('[data-register-all]')?.click();
    expect(test.confirm).toHaveBeenCalledOnce();
    expect(test.methods.mir4RegisterAllCodex).not.toHaveBeenCalled();
    test.accept()?.();
    expect(test.methods.mir4RegisterAllCodex).toHaveBeenCalledWith('field-notes');
  });

  it('supports filters, unit registration, active-class labels, and a generic close label', () => {
    const test = harness(12, 2);
    test.window.open();
    expect(test.root.textContent).toContain('Sorcerer equipment: Weapon');
    expect(
      test.root.querySelector<HTMLButtonElement>('[data-close]')?.getAttribute('aria-label'),
    ).toBe('Return to Game');

    test.root.querySelector<HTMLButtonElement>('[data-filter="manual"]')?.click();
    expect(test.root.querySelectorAll('.mir4-codex-card')).toHaveLength(2);
    test.root.querySelector<HTMLButtonElement>('[data-filter="automatic"]')?.click();
    expect(test.root.querySelectorAll('.mir4-codex-card')).toHaveLength(4);
    test.root.querySelector<HTMLButtonElement>('[data-filter="completed"]')?.click();
    expect(test.root.querySelectorAll('.mir4-codex-card')).toHaveLength(0);
    expect(
      test.root
        .querySelector<HTMLButtonElement>('[data-filter="completed"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    test.window.close();
    test.window.open();
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe('filter:completed');
    test.root.querySelector<HTMLButtonElement>('[data-filter="all"]')?.click();

    const registerOne = test.root.querySelector<HTMLButtonElement>('[data-register-one]');
    registerOne?.click();
    expect(test.methods.mir4RegisterCodex).not.toHaveBeenCalled();
    test.accept()?.();
    expect(test.methods.mir4RegisterCodex).toHaveBeenCalledWith(
      'field-notes',
      'knowledge-fragment',
      1,
      0,
    );
  });
});
