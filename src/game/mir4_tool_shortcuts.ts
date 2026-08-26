import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';

export type Mir4ToolShortcut = 'toggleAutoCollect' | 'toggleAutoBattle';

export interface Mir4ToolShortcutSettings {
  get(key: 'walkByAutoloot'): boolean;
  set(key: 'walkByAutoloot', value: boolean): void;
}

export interface Mir4ToolShortcutWorld {
  cfg: { gameProfile?: GameProfile };
  mir4AutoBattleActive(): boolean;
  setMir4AutoBattle(on: boolean): void;
}

export function handleMir4ToolShortcut(
  action: string,
  world: Mir4ToolShortcutWorld,
  settings: Mir4ToolShortcutSettings,
): action is Mir4ToolShortcut {
  if (world.cfg.gameProfile !== MIR4_GAME_PROFILE) return false;
  if (action === 'toggleAutoCollect') {
    settings.set('walkByAutoloot', !settings.get('walkByAutoloot'));
    return true;
  }
  if (action !== 'toggleAutoBattle') return false;
  world.setMir4AutoBattle(!world.mir4AutoBattleActive());
  return true;
}
