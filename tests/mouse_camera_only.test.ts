import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const options = readFileSync(new URL('../src/ui/options_window.ts', import.meta.url), 'utf8');

describe('Mouse Camera product policy', () => {
  it('does not mount or gate gameplay on a camera-mode chooser', () => {
    expect(main).not.toContain("from './ui/camera_prompt'");
    expect(main).not.toContain('maybeShowFirstRunCameraPrompt');
    expect(main).not.toContain('cameraPromptOpen()');
    expect(main).not.toContain('dismissCameraPrompt()');
  });

  it('does not expose Mouse Camera as an adjustable Key Bindings option', () => {
    expect(options).not.toContain("t('hud.options.mouseCamera'), 'mouseCamera'");
    expect(options).not.toMatch(/KEYBIND_PANEL_SETTING_KEYS[^;]*mouseCamera/s);
  });
});
