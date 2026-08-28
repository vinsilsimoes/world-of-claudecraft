// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestEditor } from '../src/editor/quest_editor';

describe('quest spatial editor UI', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
  });

  it('places a collection objective from the map and persists the authored draft', () => {
    const onPositionMode = vi.fn();
    const onVisibilityChange = vi.fn();
    const editor = new QuestEditor(document.body, {
      projections: [],
      onOverlay: vi.fn(),
      onPositionMode,
      onFocus: vi.fn(),
      onVisibilityChange,
      toast: vi.fn(),
      error: vi.fn(),
    });

    editor.open();
    const stage = document.body.querySelectorAll<HTMLSelectElement>('select')[2];
    expect(stage).toBeTruthy();
    if (!stage) return;
    stage.value = '2';
    stage.dispatchEvent(new Event('change'));

    const position = Array.from(document.body.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Position',
    );
    expect(position).toBeTruthy();
    position?.click();
    expect(editor.isPositioning()).toBe(true);
    expect(editor.placeSelectedPoint({ x: 42, z: 64 })).toBe(true);

    const authored = editor
      .snapshotDocument()
      .plans.find((plan) => plan.questId === 'M01-Q01' && plan.stageIndex === 2);
    expect(authored?.points[0]).toEqual({ x: 42, z: 64 });
    expect(localStorage.getItem('aeldrune_quest_anchor_draft_v1')).toContain('"x":42');
    expect(onPositionMode).toHaveBeenCalledWith(true);
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
  });

  it('restores keyboard focus after changing a stage', () => {
    const editor = new QuestEditor(document.body, {
      projections: [],
      onOverlay: vi.fn(),
      onPositionMode: vi.fn(),
      onFocus: vi.fn(),
      onVisibilityChange: vi.fn(),
      toast: vi.fn(),
      error: vi.fn(),
    });
    editor.open();
    const stage = document.body.querySelectorAll<HTMLSelectElement>('select')[2];
    expect(stage).toBeTruthy();
    if (!stage) return;
    stage.value = '1';
    stage.dispatchEvent(new Event('change'));

    expect(document.activeElement).toBe(
      document.body.querySelectorAll<HTMLSelectElement>('select')[2],
    );
  });
});
