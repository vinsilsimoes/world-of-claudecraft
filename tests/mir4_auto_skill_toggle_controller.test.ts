// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionBarState } from '../src/ui/hud/action_bar/action_bar_view';
import { buildMir4AutoSkillToggleController } from '../src/ui/hud/action_bar/mir4_auto_skill_toggle_controller';
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

describe('MIR4 automatic skill toggle controller', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders one independent pressed control for a MIR4 skill and never casts the parent slot', () => {
    let disabled: number[] | undefined;
    let abilityId: string | null = 'mir4_skill_1102';
    const setEnabled = vi.fn((skillId: number, on: boolean) => {
      disabled = on ? undefined : [skillId];
    });
    const castParent = vi.fn();
    const slot = document.createElement('button');
    slot.addEventListener('click', castParent);
    document.body.append(slot);
    const controller = buildMir4AutoSkillToggleController({
      writers,
      world: {
        cfg: { gameProfile: 'mir4-gameplay-port' },
        mir4PlayerState: () => ({
          classId: 1,
          ultimateGauge: 0,
          mir4DisabledAutoSkills: disabled,
        }),
        setMir4AutoSkillEnabled: setEnabled,
      } as unknown as IWorld,
      slots: [{ button: slot }],
      abilityName: () => 'Void Strike',
      attachTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    });

    const actionBar = () =>
      ({ slots: [{ abilityId }] }) as unknown as Pick<ActionBarState, 'slots'>;
    controller?.paint(actionBar());
    const toggle = slot.parentElement?.querySelector<HTMLElement>('.mir4-auto-skill-toggle');
    expect(slot.contains(toggle ?? null)).toBe(false);
    expect(toggle?.tagName).toBe('BUTTON');
    expect(toggle?.style.display).not.toBe('none');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');

    toggle?.click();
    expect(setEnabled).toHaveBeenCalledWith(1102, false);
    expect(castParent).not.toHaveBeenCalled();

    controller?.paint(actionBar());
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');

    abilityId = 'mir4_ultimate_1';
    controller?.paint(actionBar());
    expect(toggle?.style.display).toBe('none');
  });

  it('supports keyboard toggling from the per-skill control', () => {
    const setEnabled = vi.fn();
    const slot = document.createElement('button');
    document.body.append(slot);
    const controller = buildMir4AutoSkillToggleController({
      writers,
      world: {
        cfg: { gameProfile: 'mir4-gameplay-port' },
        mir4PlayerState: () => ({ classId: 1, ultimateGauge: 0 }),
        setMir4AutoSkillEnabled: setEnabled,
      } as unknown as IWorld,
      slots: [{ button: slot }],
      abilityName: () => 'Void Strike',
      attachTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    });
    controller?.paint({
      slots: [{ abilityId: 'mir4_skill_1102' }],
    } as unknown as Pick<ActionBarState, 'slots'>);

    const toggle = slot.parentElement?.querySelector<HTMLElement>('.mir4-auto-skill-toggle');
    toggle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(setEnabled).not.toHaveBeenCalled();

    for (const key of ['Enter', ' ', 'Spacebar']) {
      setEnabled.mockClear();
      toggle?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(setEnabled).toHaveBeenCalledWith(1102, false);
    }
  });

  it('pins the production Hud mount and per-frame paint seams', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/ui/hud.ts'), 'utf8');

    expect(source).toContain('this.mir4AutoSkillToggles = buildMir4AutoSkillToggleController({');
    expect(source).toContain('button: slot.btn,');
    expect(source).toContain('this.mir4AutoSkillToggles?.paint(actionBarState);');
  });
});
