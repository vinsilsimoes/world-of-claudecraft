import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../src/styles/hud.mobile.css', import.meta.url), 'utf8');

describe('MIR4 Codex responsive contract', () => {
  it('stacks the collection grid and filter tabs at narrow desktop or mobile widths', () => {
    const narrow = css.match(/@media \(max-width: 600px\) \{[\s\S]*?\.mir4-spirit-tabs \{/);
    expect(narrow?.[0]).toMatch(/#codex-window[\s\S]*?max-height:/);
    expect(narrow?.[0]).toMatch(
      /\.mir4-codex-filters[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(narrow?.[0]).toMatch(
      /\.mir4-codex-list[\s\S]*?grid-template-columns: 1fr[\s\S]*?overflow-x: hidden/,
    );
  });

  it('keeps touch targets, safe areas, and forced-color selection visible', () => {
    const fixedHeightGroup = mobileCss.indexOf(
      'body.mobile-touch #mount-sanctuary-window,\n  body.mobile-touch #spirit-sanctuary-window,\n  body.mobile-touch #codex-window {',
    );
    const safeAreaOverride = mobileCss.indexOf(
      'body.mobile-touch #codex-window {\n    left: max(10px, env(safe-area-inset-left));',
    );
    expect(safeAreaOverride).toBeGreaterThan(fixedHeightGroup);
    expect(mobileCss).toMatch(
      /#codex-window[\s\S]*?left: max\(10px, env\(safe-area-inset-left\)\)[\s\S]*?bottom: max\(10px, env\(safe-area-inset-bottom\)\)/,
    );
    expect(mobileCss).toMatch(
      /\.mir4-codex-requirement button,[\s\S]*?min-height: 40px;[\s\S]*?min-width: 40px;/,
    );
    expect(css).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.mir4-codex-filters button\.sel[\s\S]*?outline: 2px solid Highlight/,
    );
    expect(css).not.toContain('rgba(255, 209, 0, 0.1)');
  });
});
