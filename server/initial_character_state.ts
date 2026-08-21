import type { GameProfile } from '../src/sim/game_profile';
import { activateWorldForGameProfile } from '../src/sim/game_profile_world';
import { mir4ClassKeyArg, mir4ShellClassFor } from '../src/sim/mir4/stats';
import { type CharacterState, Sim } from '../src/sim/sim';
import type { PlayableClass } from '../src/sim/types';
import { WORLD_SEED } from '../src/sim/world_seed';

export function initialCharacterState(
  cls: PlayableClass,
  name: string,
  skin: number,
  gameProfile: GameProfile,
): CharacterState {
  const shell = mir4ShellClassFor(cls, gameProfile);
  const sim = new Sim({
    seed: WORLD_SEED,
    playerClass: shell,
    playerClassMir4: mir4ClassKeyArg(cls),
    playerName: name,
    gameProfile,
    world: activateWorldForGameProfile(gameProfile),
  });
  sim.setPlayerSkin(sim.playerId, skin);
  const character = sim.serializeCharacter(sim.playerId);
  if (!character) throw new Error('failed to serialize initial character');
  return character;
}
