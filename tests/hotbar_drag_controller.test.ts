// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import { HOTBAR_ATTACK_MIME, profileUsesFixedAttackSlot } from '../src/ui/hud/action_bar/hotbar';
import {
  flashActionButton,
  handleAttackMarkerDrag,
} from '../src/ui/hud/action_bar/hotbar_drag_controller';

function dragEvent(types: string[]) {
  const dataTransfer = { types, dropEffect: 'none' };
  const preventDefault = vi.fn();
  return {
    dataTransfer,
    event: { dataTransfer, preventDefault } as unknown as DragEvent,
    preventDefault,
  };
}

afterEach(() => vi.useRealTimers());

describe('hotbar drag controller', () => {
  it('makes the first visible MIR4 skill slot assignable even when the classic setting is on', () => {
    expect(profileUsesFixedAttackSlot(MIR4_GAME_PROFILE, true)).toBe(false);
    expect(profileUsesFixedAttackSlot('woc-classic', true)).toBe(true);
    expect(profileUsesFixedAttackSlot('woc-classic', false)).toBe(false);
  });

  it('highlights and restores only the fixed attack destination', () => {
    const button = document.createElement('button');
    const over = dragEvent([HOTBAR_ATTACK_MIME]);
    const restore = vi.fn();

    expect(handleAttackMarkerDrag(over.event, button, 0, 'over', restore)).toBe(true);
    expect(over.preventDefault).toHaveBeenCalledOnce();
    expect(over.dataTransfer.dropEffect).toBe('move');
    expect(button.classList.contains('drop-target')).toBe(true);

    const drop = dragEvent([HOTBAR_ATTACK_MIME]);
    expect(handleAttackMarkerDrag(drop.event, button, 0, 'drop', restore)).toBe(true);
    expect(button.classList.contains('drop-target')).toBe(false);
    expect(restore).toHaveBeenCalledOnce();

    expect(handleAttackMarkerDrag(dragEvent([]).event, button, 0, 'drop', restore)).toBe(false);
    expect(restore).toHaveBeenCalledOnce();
  });

  it('applies and expires the shared used-button flash', () => {
    vi.useFakeTimers();
    const button = document.createElement('button');
    flashActionButton(button);
    expect(button.classList.contains('used')).toBe(true);
    vi.advanceTimersByTime(100);
    flashActionButton(button);
    vi.advanceTimersByTime(80);
    expect(button.classList.contains('used')).toBe(true);
    vi.advanceTimersByTime(100);
    expect(button.classList.contains('used')).toBe(false);
  });
});
