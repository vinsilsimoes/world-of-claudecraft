import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync(new URL('../src/styles/hud.mobile.css', import.meta.url), 'utf8');
const hudCss = readFileSync(new URL('../src/styles/hud.css', import.meta.url), 'utf8');

describe('MIR4 tutorial guidance on mobile landscape', () => {
  it('keeps the quest tracker visible and scrollable on short landscape screens', () => {
    expect(mobileCss).toMatch(
      /body\.mobile-touch #quest-tracker\.mir4-tutorial-active \{\s*display: block;[\s\S]*?overflow-y: auto;/,
    );
  });

  it('renders the tutorial outline and pointer on launchers in the mobile systems grid', () => {
    expect(hudCss).toContain('#mobile-extra-grid .mir4-tutorial-target');
    expect(hudCss).toContain('#mobile-extra-grid .mir4-tutorial-target::after');
    expect(hudCss).toMatch(
      /#mobile-extra-grid \.mir4-tutorial-target \{[\s\S]*?position: relative;/,
    );
  });
});
