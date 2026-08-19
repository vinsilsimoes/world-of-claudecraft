import type { GameProfile } from '../src/sim/game_profile';
import { type CharacterState, Sim } from '../src/sim/sim';
import type { PlayerClass } from '../src/sim/types';
import { WORLD_SEED } from '../src/sim/world_seed';

export function initialCharacterState(
  cls: PlayerClass,
  name: string,
  skin: number,
  gameProfile: GameProfile,
): CharacterState {
  const sim = new Sim({
    seed: WORLD_SEED,
    playerClass: cls,
    playerName: name,
    gameProfile,
  });
  sim.setPlayerSkin(sim.playerId, skin);
  const character = sim.serializeCharacter(sim.playerId);
  if (!character) throw new Error('failed to serialize initial character');
  return character;
}
