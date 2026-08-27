// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMir4PotionThresholdController } from '../src/ui/hud/action_bar/mir4_potion_threshold_controller';

describe('MIR4 potion threshold controller', () => {
  beforeEach(() => document.body.replaceChildren());

  it('previews slider movement but commits only the final change', () => {
    const root = document.createElement('div');
    const health = document.createElement('div');
    const mana = document.createElement('div');
    root.append(health, mana);
    document.body.appendChild(root);
    const setThreshold = vi.fn();
    buildMir4PotionThresholdController({
      root,
      slots: [
        { seat: health, kind: 'health' },
        { seat: mana, kind: 'mana' },
      ],
      thresholds: () => ({ health: 50, mana: 35 }),
      setThreshold,
      hideTooltip: vi.fn(),
    });

    health.querySelector<HTMLButtonElement>('.potion-health-config')?.click();
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) throw new Error('threshold slider missing');
    slider.value = '60';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(setThreshold).not.toHaveBeenCalled();
    expect(root.querySelector('output')?.textContent).toContain('60');

    slider.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setThreshold).toHaveBeenCalledTimes(1);
    expect(setThreshold).toHaveBeenCalledWith('health', 60);
  });
});
