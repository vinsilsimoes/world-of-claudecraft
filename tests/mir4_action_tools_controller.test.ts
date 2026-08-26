// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionBarWorldInput } from '../src/ui/hud/action_bar/action_bar_view';
import { buildMir4ActionTools } from '../src/ui/hud/action_bar/mir4_action_tools_controller';
import type { PainterHostWriters } from '../src/ui/painter_host';
import type { IWorld } from '../src/world_api';

vi.mock('../src/game/audio', () => ({
  audio: { click: vi.fn() },
}));

const writers: PainterHostWriters = {
  setText: (element, value) => {
    element.textContent = value;
  },
  setDisplay: (element, value) => {
    element.style.display = value;
  },
  setTransform: (element, value) => {
    element.style.transform = value;
  },
  setWidth: (element, value) => {
    element.style.width = value;
  },
  setStyleProp: (element, property, value) => {
    element.style.setProperty(property, value);
  },
  toggleClass: (element, className, on) => {
    element.classList.toggle(className, on);
  },
  setAttr: (element, name, value) => {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  },
};

const worldInput = (inventory: ActionBarWorldInput['inventory']): ActionBarWorldInput => ({
  player: {
    id: 1,
    autoAttack: false,
    dead: false,
    resource: 100,
    resourceType: 'mana',
    savedMana: 0,
    cooldowns: new Map(),
    gcdRemaining: 0,
    potionCdRemaining: 0,
    queuedOnSwing: null,
    pos: { x: 0, y: 0, z: 0 },
    auras: [],
  },
  target: null,
  inventory,
  stealthed: false,
  entities: [],
});

function harness() {
  let autoCollect = false;
  let autoBattle = false;
  let canUseItem = false;
  const useItem = vi.fn();
  const setAutoCollect = vi.fn((on: boolean) => {
    autoCollect = on;
  });
  const setMir4AutoBattle = vi.fn((on: boolean) => {
    autoBattle = on;
  });
  const host = document.createElement('div');
  const actionBar = document.createElement('div');
  const mobileCollect = document.createElement('button');
  mobileCollect.id = 'mobile-auto-collect';
  host.appendChild(actionBar);
  document.body.append(host, mobileCollect);
  const controller = buildMir4ActionTools({
    writers,
    actionBar,
    world: {
      cfg: { gameProfile: 'mir4-gameplay-port' },
      mir4AutoBattleActive: () => autoBattle,
      setMir4AutoBattle,
      useItem,
    } as unknown as IWorld,
    autoCollectActive: () => autoCollect,
    setAutoCollect,
    keyCap: (action) => (action === 'toggleAutoBattle' ? 'F9' : 'F10'),
    iconBackground: (key) => key,
    canUseItem: () => canUseItem,
    afterUseItem: vi.fn(),
    flash: vi.fn(),
    attachTooltip: vi.fn(),
    itemTooltip: () => 'Potion',
    hideTooltip: vi.fn(),
  });
  const allowItems = () => {
    canUseItem = true;
  };
  return {
    controller,
    host,
    mobileCollect,
    setAutoCollect,
    setMir4AutoBattle,
    useItem,
    allowItems,
  };
}

describe('MIR4 action tools controller', () => {
  beforeEach(() => document.body.replaceChildren());

  it('routes desktop and touch toggles through the same authoritative seams', () => {
    const test = harness();
    expect(test.controller).toBeDefined();
    test.controller?.paint(worldInput([]));

    test.host.querySelector<HTMLButtonElement>('.auto-collect')?.click();
    test.host.querySelector<HTMLButtonElement>('.auto-battle')?.click();
    expect(test.setAutoCollect).toHaveBeenCalledWith(true);
    expect(test.setMir4AutoBattle).toHaveBeenCalledWith(true);

    test.controller?.paint(worldInput([]));
    expect(test.mobileCollect.getAttribute('aria-pressed')).toBe('true');
    test.mobileCollect.click();
    expect(test.setAutoCollect).toHaveBeenLastCalledWith(false);
  });

  it('blocks potion use while another transaction owns item actions', () => {
    const test = harness();
    test.controller?.paint(worldInput([{ itemId: 'minor_healing_potion', count: 2 }]));
    const potion = test.host.querySelector<HTMLButtonElement>('.potion-health');
    potion?.click();
    expect(test.useItem).not.toHaveBeenCalled();

    test.allowItems();
    potion?.click();
    expect(test.useItem).toHaveBeenCalledWith('minor_healing_potion');
  });

  it('relocalizes accessible labels without rebuilding the dock', () => {
    const test = harness();
    const root = test.host.querySelector<HTMLElement>('#mir4-action-tools');
    test.controller?.relocalize();
    expect(root?.getAttribute('role')).toBe('group');
    expect(root?.getAttribute('aria-label')).toBeTruthy();
    expect(test.mobileCollect.getAttribute('aria-label')).toBeTruthy();
  });
});
