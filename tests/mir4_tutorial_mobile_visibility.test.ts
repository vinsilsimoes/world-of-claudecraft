import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mobileCss = readFileSync(new URL('../src/styles/hud.mobile.css', import.meta.url), 'utf8');

describe('MIR4 tutorial guidance on mobile landscape', () => {
  it('keeps the quest tracker visible and scrollable on short landscape screens', () => {
    expect(mobileCss).toMatch(
      /@media \(orientation: landscape\)[\s\S]*?body\.mobile-touch #quest-tracker \{\s*display: block;[\s\S]*?overflow-y: auto;/,
    );
  });
});
