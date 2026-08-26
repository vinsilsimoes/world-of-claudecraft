// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { Mir4GrowthWindow } from '../src/ui/mir4_growth_window';
import type { IWorld } from '../src/world_api';

function harness() {
  const state: Mir4PlayerUiState = {
    classId: 1,
    ultimateGauge: 0,
    mir4Currencies: { darksteel: 0, energy: 200 },
    mir4Materials: {
      ...MIR4_EMPTY_MATERIALS,
      herbLeaf: 10,
      reishi: 10,
      herbRoot: 10,
      unihornSlice: 10,
      flowerOil: 10,
      centuryFruit: 10,
      greaterYangPill: 1,
      greaterYinPill: 1,
      lesserYangPill: 1,
      lesserYinPill: 1,
    },
  };
  const methods = {
    mir4TrainConstitution: vi.fn(),
    mir4TrainInnerForce: vi.fn(),
    mir4TrainSolitude: vi.fn(),
  };
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port' },
    mir4PlayerState: () => state,
    ...methods,
  } as unknown as IWorld;
  const root = document.createElement('section');
  root.id = 'training-window';
  root.className = 'window panel';
  document.body.appendChild(root);
  const window = new Mir4GrowthWindow({
    root: () => root,
    world: () => world,
    closeOthers: vi.fn(),
    captureFocus: () => null,
    restoreFocus: vi.fn(),
  });
  return { window, root, state, methods };
}

describe('MIR4 grouped Training window', () => {
  it('opens on Constitution and routes its revision-guarded branch command', () => {
    const test = harness();
    test.window.open();
    expect(test.root.textContent).toContain('Training');
    expect(test.root.textContent).toContain('Constitution');
    expect(test.root.textContent).not.toContain('Muscle Strength Manual');
    expect(test.root.querySelectorAll('[data-growth-branch]')).toHaveLength(7);
    test.root.querySelector<HTMLButtonElement>('[data-growth-branch="3"]')?.click();
    expect(test.methods.mir4TrainConstitution).toHaveBeenCalledWith(3, 0);
    expect(test.methods.mir4TrainInnerForce).not.toHaveBeenCalled();
  });

  it('switches to Inner Force inside the same system window and shows crafting costs', () => {
    const test = harness();
    test.window.open();
    test.root.querySelector<HTMLButtonElement>('[data-growth-tab="innerForce"]')?.click();
    expect(test.root.textContent).toContain('Inner Force');
    expect(test.root.textContent).toContain('Muscle Strength Manual');
    expect(test.root.textContent).toContain('Greater Yang Pill');
    expect(test.root.querySelectorAll('[data-growth-branch]')).toHaveLength(4);
    test.root.querySelector<HTMLButtonElement>('[data-growth-branch="2"]')?.click();
    expect(test.methods.mir4TrainInnerForce).toHaveBeenCalledWith(2, 0);
    expect(test.methods.mir4TrainConstitution).not.toHaveBeenCalled();
  });

  it('opens Solitude Training as a third system and routes its own command', () => {
    const test = harness();
    test.state.playerLevel = 70;
    test.state.mir4Currencies = { darksteel: 1_000, energy: 0 };
    test.state.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      ...test.state.mir4Materials,
      noirsoulHerbRare: 1,
      unihornRare: 5,
    };
    test.window.open();
    test.root.querySelector<HTMLButtonElement>('[data-growth-tab="solitude"]')?.click();
    expect(test.root.textContent).toContain('Solitude Training');
    expect(test.root.textContent).toContain('Conception Vessel');
    expect(test.root.textContent).toContain('Rare Noirsoul Herb');
    expect(test.root.querySelectorAll('[data-growth-branch]')).toHaveLength(8);
    test.root.querySelector<HTMLButtonElement>('[data-growth-branch="1"]')?.click();
    expect(test.methods.mir4TrainSolitude).toHaveBeenCalledWith(1, 0);
  });

  it('refreshes Solitude affordability when only Darksteel changes', () => {
    const test = harness();
    test.state.playerLevel = 70;
    test.state.mir4Currencies = { darksteel: 1_000, energy: 0 };
    test.state.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      noirsoulHerbRare: 1,
      unihornRare: 5,
    };
    test.window.open('solitude');
    expect(test.root.querySelector('.mir4-growth-balance b')?.textContent).toBe('1,000');
    expect(test.root.querySelector<HTMLButtonElement>('[data-growth-branch="1"]')?.disabled).toBe(
      false,
    );

    test.state.mir4Currencies.darksteel = 0;
    test.window.refreshIfChanged();
    expect(test.root.querySelector('.mir4-growth-balance b')?.textContent).toBe('0');
    expect(test.root.querySelector<HTMLButtonElement>('[data-growth-branch="1"]')?.disabled).toBe(
      true,
    );
  });

  it('implements the keyboard and accessibility contract for its three tabs', () => {
    const test = harness();
    test.window.open();
    const constitution = test.root.querySelector<HTMLButtonElement>(
      '[data-growth-tab="constitution"]',
    );
    expect(constitution?.tabIndex).toBe(0);
    expect(constitution?.getAttribute('aria-controls')).toBe('training-window-panel');
    for (const tab of test.root.querySelectorAll<HTMLElement>('[role="tab"]')) {
      expect(document.getElementById(tab.getAttribute('aria-controls') ?? '')).not.toBeNull();
    }
    expect(test.root.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      'training-window-tab-constitution',
    );

    constitution?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const innerForce = test.root.querySelector<HTMLButtonElement>('[data-growth-tab="innerForce"]');
    expect(innerForce?.getAttribute('aria-selected')).toBe('true');
    expect(innerForce?.tabIndex).toBe(0);
    expect(document.activeElement).toBe(innerForce);

    innerForce?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(
      test.root
        .querySelector<HTMLButtonElement>('[data-growth-tab="solitude"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });
});
