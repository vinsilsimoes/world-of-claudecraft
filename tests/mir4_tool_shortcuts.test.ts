import { describe, expect, it, vi } from 'vitest';
import { handleMir4ToolShortcut } from '../src/game/mir4_tool_shortcuts';
import type { GameProfile } from '../src/sim/game_profile';

function harness(profile: GameProfile = 'mir4-gameplay-port') {
  let autoCollect = false;
  let autoBattle = false;
  const settings = {
    get: vi.fn(() => autoCollect),
    set: vi.fn((_key: 'walkByAutoloot', value: boolean) => {
      autoCollect = value;
    }),
  };
  const world = {
    cfg: { gameProfile: profile },
    mir4AutoBattleActive: vi.fn(() => autoBattle),
    setMir4AutoBattle: vi.fn((value: boolean) => {
      autoBattle = value;
    }),
  };
  return { settings, world };
}

describe('MIR4 tool shortcuts', () => {
  it('toggles auto collect through the existing autoloot setting', () => {
    const { settings, world } = harness();
    expect(handleMir4ToolShortcut('toggleAutoCollect', world, settings)).toBe(true);
    expect(settings.set).toHaveBeenCalledWith('walkByAutoloot', true);
  });

  it('toggles auto battle only for the MIR4 gameplay profile', () => {
    const mir4 = harness();
    expect(handleMir4ToolShortcut('toggleAutoBattle', mir4.world, mir4.settings)).toBe(true);
    expect(mir4.world.setMir4AutoBattle).toHaveBeenCalledWith(true);

    const classic = harness('woc-classic');
    expect(handleMir4ToolShortcut('toggleAutoBattle', classic.world, classic.settings)).toBe(false);
    expect(classic.world.setMir4AutoBattle).not.toHaveBeenCalled();
  });

  it('leaves both MIR4 tool actions to the classic dispatcher', () => {
    const { settings, world } = harness('woc-classic');
    expect(handleMir4ToolShortcut('toggleAutoCollect', world, settings)).toBe(false);
    expect(handleMir4ToolShortcut('toggleAutoBattle', world, settings)).toBe(false);
    expect(settings.set).not.toHaveBeenCalled();
    expect(world.setMir4AutoBattle).not.toHaveBeenCalled();
  });

  it('leaves unrelated actions to the normal dispatcher', () => {
    const { settings, world } = harness();
    expect(handleMir4ToolShortcut('spellbook', world, settings)).toBe(false);
    expect(settings.set).not.toHaveBeenCalled();
    expect(world.setMir4AutoBattle).not.toHaveBeenCalled();
  });
});
