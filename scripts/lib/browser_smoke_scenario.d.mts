import type { GameProfile } from './world_auth.mjs';

export interface BrowserSmokeScenario {
  readonly profile: GameProfile;
  readonly classKey: string;
  readonly movementKey: string;
  readonly target: {
    readonly exactTemplateId: string | null;
    readonly templatePrefix: string | null;
  };
  readonly combatMode: 'classic' | 'mir4';
  readonly questMode: 'dialog' | 'tracker';
}

export function browserSmokeScenarioForProfile(profile: GameProfile): BrowserSmokeScenario;
