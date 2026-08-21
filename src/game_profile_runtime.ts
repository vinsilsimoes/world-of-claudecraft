import { type GameProfile, requireGameProfile } from './game_profile';

export function browserGameProfile(
  value: unknown = import.meta.env.VITE_GAME_PROFILE,
): GameProfile {
  return requireGameProfile(value, 'VITE_GAME_PROFILE');
}
