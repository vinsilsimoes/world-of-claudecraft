const CLASSIC_SCENARIO = Object.freeze({
  profile: 'woc-classic',
  classKey: 'warrior',
  movementKey: 'w',
  target: Object.freeze({ exactTemplateId: 'forest_wolf', templatePrefix: null }),
  combatMode: 'classic',
  questMode: 'dialog',
});

const MIR4_SCENARIO = Object.freeze({
  profile: 'mir4-gameplay-port',
  classKey: 'elementalist',
  movementKey: 's',
  target: Object.freeze({ exactTemplateId: null, templatePrefix: 'mir4_m01-vila-do-vau_' }),
  combatMode: 'mir4',
  questMode: 'tracker',
});

/** Profile-specific inputs for the shared real-browser smoke path. */
export function browserSmokeScenarioForProfile(profile) {
  if (profile === 'mir4-gameplay-port') return MIR4_SCENARIO;
  if (profile === 'woc-classic') return CLASSIC_SCENARIO;
  throw new Error(`Unsupported browser smoke profile: ${String(profile)}`);
}
