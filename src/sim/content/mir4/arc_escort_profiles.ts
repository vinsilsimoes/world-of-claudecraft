// Player-facing identities for campaign escortees. Quest targets remain stable
// evidence ids; the profile supplies the person represented by the native 3D
// runtime shell.

export interface Mir4ArcEscortProfile {
  questId: string;
  stageIndex: number;
  name: string;
}

export const MIR4_ARC_ESCORT_PROFILES: readonly Mir4ArcEscortProfile[] = Object.freeze([
  Object.freeze({
    questId: 'M02-Q02',
    stageIndex: 2,
    name: 'Ivo Juncofirme',
  }),
]);

const PROFILE_BY_STAGE = new Map(
  MIR4_ARC_ESCORT_PROFILES.map(
    (profile) => [`${profile.questId}:${profile.stageIndex}`, profile] as const,
  ),
);

export function mir4ArcEscortProfile(
  questId: string,
  stageIndex: number,
): Mir4ArcEscortProfile | null {
  return PROFILE_BY_STAGE.get(`${questId}:${stageIndex}`) ?? null;
}
