export const ONLINE_WORLD_AUTH_TYPE: 'auth-world-12';

export const ONLINE_WORLD_INCOMPATIBLE_MESSAGE: 'Game and server versions are incompatible. Reload or update, then try again.';

export const GAME_PROFILES: readonly ['woc-classic', 'mir4-gameplay-port'];
export type GameProfile = (typeof GAME_PROFILES)[number];
export const DEFAULT_GAME_PROFILE: 'woc-classic';

export function parseGameProfile(value: unknown): GameProfile | null;
export function requireGameProfile(value: unknown, source?: string): GameProfile;

export interface WorldAuthMessage {
  readonly t: typeof ONLINE_WORLD_AUTH_TYPE;
  readonly token: string;
  readonly character: number;
  readonly gameProfile: GameProfile;
}

export function worldAuthMessage(
  token: string,
  character: number,
  gameProfile?: GameProfile,
): WorldAuthMessage;

export interface ChatCommandMessage {
  readonly t: 'cmd';
  readonly cmd: 'chat';
  readonly text: string;
}

export function chatCommandMessage(text: string): ChatCommandMessage;
