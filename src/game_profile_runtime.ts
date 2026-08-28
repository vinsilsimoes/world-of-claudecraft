import { type GameProfile, MIR4_GAME_PROFILE, requireGameProfile } from './game_profile';

export function browserGameProfile(
  value: unknown = import.meta.env.VITE_GAME_PROFILE,
  editorAeldrunePlaytest = typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('editorPlaytest') === 'aeldrune',
): GameProfile {
  // The editor is hosted by the same Vite process as the game. Developers may
  // legitimately run that process with the repository's classic default, but an
  // Aeldrune Playtest must select ONE coherent profile before profile-gated UI
  // modules initialize. The matching handoff payload is still validated and
  // consumed separately in game/editor_playtest.ts.
  return editorAeldrunePlaytest
    ? MIR4_GAME_PROFILE
    : requireGameProfile(value, 'VITE_GAME_PROFILE');
}
