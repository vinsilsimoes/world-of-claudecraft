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
  let potionThresholds = { health: 50, mana: 35 };
  let canUseItem = false;
  const useItem = vi.fn();
  const setMir4AutoPotionThreshold = vi.fn((kind: 'health' | 'mana', percent: number) => {
    potionThresholds = { ...potionThresholds, [kind]: percent };
  });
  const setAutoCollect = vi.fn((on: boolean) => {
    autoCollect = on;
  });
  const setMir4AutoBattle = vi.fn((on: boolean) => {
    autoBattle = on;
  });
  const host = document.createElement('div');
  const actionBar = document.createElement('div');
  const mobileCollect = document.createElement('button');
  const attachTooltip = vi.fn();
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
      mir4AutoPotionThresholds: () => potionThresholds,
      setMir4AutoPotionThreshold,
      useItem,
    } as unknown as IWorld,
    autoCollectActive: () => autoCollect,
    setAutoCollect,
    keyCap: (action) => (action === 'toggleAutoBattle' ? 'F9' : 'F10'),
    iconBackground: (key) => key,
    canUseItem: () => canUseItem,
    afterUseItem: vi.fn(),
    flash: vi.fn(),
    attachTooltip,
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
    setMir4AutoPotionThreshold,
    attachTooltip,
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

  it('configures each automatic potion threshold from its tooltip control', () => {
    const test = harness();
    test.controller?.paint(
      worldInput([
        { itemId: 'minor_healing_potion', count: 2 },
        { itemId: 'minor_mana_potion', count: 3 },
      ]),
    );

    const healthButton = test.host.querySelector<HTMLButtonElement>('.potion-health');
    const tooltip = test.attachTooltip.mock.calls.find(
      ([element]) => element === healthButton,
    )?.[1];
    expect(tooltip?.()).toContain('50%');
    expect(tooltip?.()).toContain('Automatically use this potion');
    expect(tooltip?.()).not.toContain('During Auto Battle');

    test.host.querySelector<HTMLButtonElement>('.potion-health-config')?.click();
    const panel = test.host.querySelector<HTMLElement>('.mir4-potion-threshold-popover');
    const slider = panel?.querySelector<HTMLInputElement>('input[type="range"]');
    expect(panel?.hidden).toBe(false);
    expect(slider?.value).toBe('50');

    if (!slider) throw new Error('health potion threshold slider missing');
    slider.value = '65';
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    expect(test.setMir4AutoPotionThreshold).toHaveBeenLastCalledWith('health', 65);

    test.host.querySelector<HTMLButtonElement>('.potion-mana-config')?.click();
    expect(panel?.querySelector<HTMLInputElement>('input[type="range"]')?.value).toBe('35');
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
