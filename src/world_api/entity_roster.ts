import type { GameProfile } from '../sim/game_profile';
import type { Entity, MoveInput, PlayerClass, WorldContent } from '../sim/types';

export interface IWorldEntityRoster {
  // `world` is optional for the classic host. Injected profiles keep it on both
  // offline and online clients so renderer streaming uses the same zone authority
  // as terrain/collision and the authoritative server.
  cfg: {
    seed: number;
    playerClass: PlayerClass;
    gameProfile?: GameProfile;
    world?: WorldContent;
  };
  entities: Map<number, Entity>;
  playerId: number;
  player: Entity;
  moveInput: MoveInput;
  // the realm (world/shard) this character lives on; '' in offline play
  realm: string;
  // whether this session's ACCOUNT holds a staff/admin role. Advert only: every
  // admin-gated action is re-checked server-side, so a forged true opens inert
  // UI. Offline play is true (the player owns the world).
  accountAdmin: boolean;
}
