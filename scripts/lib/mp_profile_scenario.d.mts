import type { GameProfile } from './world_auth.mjs';

export interface MultiplayerScenarioCharacter {
  readonly namePrefix: string;
  readonly classKey: string;
  readonly mir4ClassId: number | null;
  readonly starterItemId: number | null;
  readonly starterArmorItemId: number | null;
}

export interface MultiplayerProfileScenario {
  readonly profile: GameProfile;
  readonly primary: MultiplayerScenarioCharacter;
  readonly secondary: MultiplayerScenarioCharacter;
}

export function multiplayerScenarioForProfile(profile: GameProfile): MultiplayerProfileScenario;
