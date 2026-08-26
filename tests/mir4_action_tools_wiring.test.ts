import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hud = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
const input = readFileSync(new URL('../src/game/input.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const shortcuts = readFileSync(
  new URL('../src/game/mir4_tool_shortcuts.ts', import.meta.url),
  'utf8',
);
const spellbook = readFileSync(new URL('../src/ui/spellbook_window.ts', import.meta.url), 'utf8');

describe('MIR4 action tool wiring', () => {
  it('routes both rebindable tool actions through input and main', () => {
    for (const action of ['toggleAutoBattle', 'toggleAutoCollect']) {
      expect(input).toContain(`case '${action}':`);
      expect(input).toContain(`this.cb.onUiKey('${action}')`);
      expect(shortcuts).toContain(`'${action}'`);
    }
    expect(main.match(/handleMir4ToolShortcut\(/g)).toHaveLength(2);
  });

  it('keeps auto battle outside the MIR4 spellbook and frees desktop slot zero', () => {
    expect(spellbook).toContain('if (!mir4Profile) this.appendAttackRow(list, view.attackOnBar)');
    expect(hud).toContain('this.sim.cfg.gameProfile !== MIR4_GAME_PROFILE');
    expect(hud).toContain('buildMir4ActionTools({');
  });
});
