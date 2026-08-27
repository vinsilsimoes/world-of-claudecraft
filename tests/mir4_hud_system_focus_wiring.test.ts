import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const hudSource = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');

describe('MIR4 HUD system focus wiring', () => {
  it('initializes the shared focus manager before MIR4 system windows capture their bridges', () => {
    const focusManager = hudSource.indexOf('private readonly focusManager = new FocusManager();');
    const mir4Systems = hudSource.indexOf(
      'private readonly mir4Systems = new Mir4HudSystems(document, {',
    );

    expect(focusManager).toBeGreaterThanOrEqual(0);
    expect(mir4Systems).toBeGreaterThan(focusManager);
  });
});
