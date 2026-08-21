import { type GameProfile, MIR4_GAME_PROFILE } from './game_profile';
import { ALL_CLASSES, type Mir4ClassKey, type PlayableClass } from './types';

export const MIR4_PROFILE_CLASSES: readonly Mir4ClassKey[] = [
  'warrior',
  'elementalist',
  'taoist',
  'arbalist',
  'lancer',
];

export function classesForGameProfile(profile: GameProfile): readonly PlayableClass[] {
  return profile === MIR4_GAME_PROFILE ? MIR4_PROFILE_CLASSES : ALL_CLASSES;
}

export function isClassForGameProfile(
  value: unknown,
  profile: GameProfile,
): value is PlayableClass {
  return (
    typeof value === 'string' &&
    (classesForGameProfile(profile) as readonly string[]).includes(value)
  );
}

export function assertClassForGameProfile(
  value: unknown,
  profile: GameProfile,
  source = 'class',
): asserts value is PlayableClass {
  if (isClassForGameProfile(value, profile)) return;
  throw new Error(`${source} '${String(value)}' is not valid for game profile ${profile}`);
}
