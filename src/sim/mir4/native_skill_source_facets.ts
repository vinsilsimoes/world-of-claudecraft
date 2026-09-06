import { mir4NativeSkillActionById } from '../content/mir4';
import { MIR4_NATIVE_CHILL_EVIDENCE } from './native_skill_chill_debuff';
import { mir4NativeGeneratedPresentationFacets } from './native_skill_generated_presentation_facets';
import { mir4NativeGeneratedPassiveEligibility } from './native_skill_passive_eligibility';
import {
  MIR4_NATIVE_2101_QUELL_EVIDENCE,
  MIR4_NATIVE_2103_QUELL_EVIDENCE,
  MIR4_NATIVE_2201_QUELL_EVIDENCE,
  MIR4_NATIVE_3101_QUELL_EVIDENCE,
} from './native_skill_quell_debuff';
import {
  MIR4_NATIVE_1104_SMITE_EVIDENCE,
  MIR4_NATIVE_1401_SMITE_EVIDENCE,
} from './native_skill_smite_debuff';
import {
  MIR4_NATIVE_1501_SMITE_EVIDENCE,
  MIR4_NATIVE_1601_SMITE_EVIDENCE,
} from './native_skill_smite_defense_debuff';

export interface Mir4NativeRuntimeAbilityFacet {
  readonly slotIndex: number;
  readonly type: number;
  readonly value: number;
  readonly levelUpValue: number;
  readonly time: number;
  readonly active: false;
  /** The SKILL tuple is either inert or descriptive metadata for a row BUFF. */
  readonly inactiveReason: 'zero-type' | 'zero-value' | 'attack-row-buff-metadata';
  readonly sourceAttackId?: number;
  readonly sourceBuffId?: number;
}

export interface Mir4NativeRuntimeSkillSourceFacets {
  readonly skillId: number;
  readonly darkChange: {
    readonly nativeMode: number;
    readonly presentationOnly: true;
    readonly clientOption: 'G_SkillDarkChange';
  };
  readonly abilities: readonly Mir4NativeRuntimeAbilityFacet[];
  /** SKILL.Passive references; never an implicit grant or an inherent class passive. */
  readonly passiveEligibilityIds: readonly number[];
  readonly smiteBuffIds: readonly number[];
  readonly autoLearnPassiveIds: readonly number[];
  readonly skillModPassiveIds: readonly number[];
}

export interface Mir4NativeRuntimeSkillPresentationFacets {
  readonly darkChange: Mir4NativeRuntimeSkillSourceFacets['darkChange'];
  readonly abilities: readonly Mir4NativeRuntimeAbilityFacet[];
}

const SHARED_WARRIOR_PASSIVE_REFERENCES = Object.freeze([
  204001, 204002, 204003, 204004, 204005, 204006, 205001, 205002, 205003, 205004, 205005, 205006,
  205007, 205008, 205009, 205010, 205011, 205012, 204013, 204014, 204015, 204016, 204017, 204018,
  205013, 205014, 205015, 205016, 205017, 205018, 224001, 224002, 224003, 224004, 224005, 224006,
  224013, 224014, 224015, 224016, 224017, 224018, 225001, 225002, 225003, 225004, 225005, 225006,
  225007, 225008, 225009, 225010, 225011, 225012, 225013, 225014, 225015, 225016, 225017, 225018,
  400172, 400292, 400313, 400373, 400393, 400514, 400534, 400543, 400573, 400594, 400614, 400623,
  400634, 204025, 204030, 204032, 204033, 204035, 204036, 204037, 204038, 205025, 205030, 205032,
  205033, 205035, 205036, 205037, 205038,
]);

const SHARED_WARRIOR_ABILITIES = Object.freeze(
  [0, 0, 0, 20].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

const SHARED_WARRIOR_DARK_CHANGE = Object.freeze({
  nativeMode: 1,
  presentationOnly: true as const,
  clientOption: 'G_SkillDarkChange' as const,
});
const SHARED_WARRIOR_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SHARED_WARRIOR_ABILITIES,
});
const PAINSTRIKE_GALE_ABILITIES = Object.freeze(
  [0, 1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const ICE_CAGE_ABILITIES = Object.freeze(
  [0, 1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const ICE_CAGE_PASSIVE_REFERENCES = Object.freeze(
  SHARED_WARRIOR_PASSIVE_REFERENCES.flatMap((passiveId) =>
    passiveId === 400543 ? [400493, 400498, passiveId] : [passiveId],
  ),
);
const ICE_CAGE_SOURCE_FACETS = Object.freeze({
  skillId: 4105,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: ICE_CAGE_ABILITIES,
  passiveEligibilityIds: ICE_CAGE_PASSIVE_REFERENCES,
  smiteBuffIds: Object.freeze([]) as readonly number[],
  autoLearnPassiveIds: Object.freeze([]) as readonly number[],
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const ICE_CAGE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: ICE_CAGE_ABILITIES,
});
const PAINSTRIKE_GALE_SOURCE_FACETS = Object.freeze({
  skillId: 4106,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: PAINSTRIKE_GALE_ABILITIES,
  passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
  smiteBuffIds: Object.freeze([]) as readonly number[],
  autoLearnPassiveIds: Object.freeze([]) as readonly number[],
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const PAINSTRIKE_GALE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: PAINSTRIKE_GALE_ABILITIES,
});
const FLASH_ARROW_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 28,
    value: 50,
    levelUpValue: 10,
    time: 0,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 410702,
    sourceBuffId: 41071,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const FLASH_ARROW_SOURCE_FACETS = Object.freeze({
  skillId: 4107,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: FLASH_ARROW_ABILITIES,
  passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
  smiteBuffIds: Object.freeze([]) as readonly number[],
  autoLearnPassiveIds: Object.freeze([]) as readonly number[],
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const FLASH_ARROW_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: FLASH_ARROW_ABILITIES,
});
const FLAME_ORB_ABILITIES = Object.freeze(
  [2, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const IRON_SHACKLE_ABILITIES = Object.freeze(
  [0, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const IRON_SHACKLE_SOURCE_FACETS = Object.freeze({
  skillId: 1201,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: IRON_SHACKLE_ABILITIES,
  passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
  smiteBuffIds: Object.freeze([]) as readonly number[],
  autoLearnPassiveIds: Object.freeze([]) as readonly number[],
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const IRON_SHACKLE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: IRON_SHACKLE_ABILITIES,
});
const LION_ROAR_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 20,
    value: 80,
    levelUpValue: 30,
    time: 10,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 130202,
    sourceBuffId: 13021,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const RIPOSTE_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 47,
    value: 24,
    levelUpValue: 4,
    time: 3,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 130101,
    sourceBuffId: 13011,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const RIPOSTE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: RIPOSTE_ABILITIES,
});
const LION_ROAR_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: LION_ROAR_ABILITIES,
});
const GROUND_SMASH_ABILITIES = Object.freeze(
  [0, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const GROUND_SMASH_DARK_CHANGE = Object.freeze({
  nativeMode: 3,
  presentationOnly: true as const,
  clientOption: 'G_SkillDarkChange' as const,
});
const GROUND_SMASH_PRESENTATION_FACETS = Object.freeze({
  darkChange: GROUND_SMASH_DARK_CHANGE,
  abilities: GROUND_SMASH_ABILITIES,
});
const EMPTY_PASSIVE_IDS = Object.freeze([]) as readonly number[];

function flameOrbPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(2101);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(MIR4_NATIVE_2101_QUELL_EVIDENCE.passive.passiveId)
  ) {
    throw new Error('Missing reviewed Flame Orb passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

function flameStrikePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(2201);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(MIR4_NATIVE_2201_QUELL_EVIDENCE.passive.passiveId)
  ) {
    throw new Error('Missing reviewed Flame Strike passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

function immolatePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(2103);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(MIR4_NATIVE_2103_QUELL_EVIDENCE.passive.passiveId)
  ) {
    throw new Error('Missing reviewed Immolate passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const FLAME_ORB_SOURCE_FACETS = Object.freeze({
  skillId: 2101,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: FLAME_ORB_ABILITIES,
  passiveEligibilityIds: flameOrbPassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_2101_QUELL_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_2101_QUELL_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_2101_QUELL_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const FLAME_STRIKE_SOURCE_FACETS = Object.freeze({
  skillId: 2201,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: FLAME_ORB_ABILITIES,
  passiveEligibilityIds: flameStrikePassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_2201_QUELL_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_2201_QUELL_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_2201_QUELL_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const IMMOLATE_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 2004,
    value: 60,
    levelUpValue: 12,
    time: 0,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 210302,
    sourceBuffId: 20012,
  }),
  ...[1, 2].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
  Object.freeze({
    slotIndex: 3,
    type: 0,
    value: 0,
    levelUpValue: 0,
    time: 20,
    active: false as const,
    inactiveReason: 'zero-type' as const,
  }),
]);
const IMMOLATE_SOURCE_FACETS = Object.freeze({
  skillId: 2103,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: IMMOLATE_ABILITIES,
  passiveEligibilityIds: immolatePassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_2103_QUELL_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_2103_QUELL_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_2103_QUELL_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const IMMOLATE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: IMMOLATE_ABILITIES,
});

const SUNBEAM_SWORD_ABILITIES = Object.freeze(
  [10, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function sunbeamSwordPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3101);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(MIR4_NATIVE_3101_QUELL_EVIDENCE.passive.passiveId)
  ) {
    throw new Error('Missing reviewed Sunbeam Sword passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const SUNBEAM_SWORD_SOURCE_FACETS = Object.freeze({
  skillId: 3101,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SUNBEAM_SWORD_ABILITIES,
  passiveEligibilityIds: sunbeamSwordPassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_3101_QUELL_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_3101_QUELL_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_3101_QUELL_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const SUNBEAM_SWORD_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SUNBEAM_SWORD_ABILITIES,
});

function piercingBladesPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3103);
  if (!policy || !policy.passiveEligibilityIds.includes(103001)) {
    throw new Error('Missing reviewed Piercing Blades passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const PIERCING_BLADES_ABILITIES = Object.freeze(
  [0, 0, 0, 0].map((_time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

const PIERCING_BLADES_SOURCE_FACETS = Object.freeze({
  skillId: 3103,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: PIERCING_BLADES_ABILITIES,
  passiveEligibilityIds: piercingBladesPassiveReferences(),
  smiteBuffIds: Object.freeze([30010]),
  autoLearnPassiveIds: Object.freeze([103001]),
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const PIERCING_BLADES_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: PIERCING_BLADES_ABILITIES,
});

const RAIN_OF_BLADES_ABILITIES = Object.freeze(
  [0, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function rainOfBladesPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3104);
  if (!policy || !policy.passiveEligibilityIds.includes(101002)) {
    throw new Error('Missing reviewed Rain of Blades passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const RAIN_OF_BLADES_SOURCE_FACETS = Object.freeze({
  skillId: 3104,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: RAIN_OF_BLADES_ABILITIES,
  passiveEligibilityIds: rainOfBladesPassiveReferences(),
  smiteBuffIds: Object.freeze([10020, 20020]),
  autoLearnPassiveIds: Object.freeze([101002, 102001]),
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const RAIN_OF_BLADES_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: RAIN_OF_BLADES_ABILITIES,
});

const HEAL_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 2027,
    value: 36,
    levelUpValue: 2,
    time: 5,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350301,
    sourceBuffId: 35014,
  }),
  Object.freeze({
    slotIndex: 1,
    type: 2021,
    value: 100,
    levelUpValue: 0,
    time: 0,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350301,
    sourceBuffId: 35014,
  }),
  ...[2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: slotIndex === 3 ? 20 : 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const HEAL_SOURCE_FACETS = Object.freeze({
  skillId: 3503,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: HEAL_ABILITIES,
  passiveEligibilityIds: Object.freeze([204025, 205025]),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const HEAL_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: HEAL_ABILITIES,
});

const GREATER_HEAL_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 2027,
    value: 120,
    levelUpValue: 5,
    time: 0,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350402,
    sourceBuffId: 35015,
  }),
  Object.freeze({
    slotIndex: 1,
    type: 2021,
    value: 0,
    levelUpValue: 0,
    time: 0,
    active: false as const,
    inactiveReason: 'zero-value' as const,
  }),
  Object.freeze({
    slotIndex: 2,
    type: 2022,
    value: 10,
    levelUpValue: 0,
    time: 0,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350402,
    sourceBuffId: 35015,
  }),
  Object.freeze({
    slotIndex: 3,
    type: 0,
    value: 0,
    levelUpValue: 0,
    time: 20,
    active: false as const,
    inactiveReason: 'zero-type' as const,
  }),
]);
const GREATER_HEAL_SOURCE_FACETS = Object.freeze({
  skillId: 3504,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: GREATER_HEAL_ABILITIES,
  passiveEligibilityIds: Object.freeze([204025, 205025]),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const GREATER_HEAL_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: GREATER_HEAL_ABILITIES,
});

const GUARDIAN_CIRCLE_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 24,
    value: 25,
    levelUpValue: 5,
    time: 60,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350103,
    sourceBuffId: 35011,
  }),
  Object.freeze({
    slotIndex: 1,
    type: 0,
    value: 10,
    levelUpValue: 2,
    time: 60,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 350103,
    sourceBuffId: 35010,
  }),
  ...[2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: slotIndex === 3 ? 20 : 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);

function guardianCirclePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3501);
  if (
    policy?.passiveEligibilityIds[0] !== 204001 ||
    !policy.passiveEligibilityIds.includes(204025) ||
    !policy.passiveEligibilityIds.includes(205025)
  ) {
    throw new Error('Missing reviewed Guardian Circle passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const GUARDIAN_CIRCLE_SOURCE_FACETS = Object.freeze({
  skillId: 3501,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: GUARDIAN_CIRCLE_ABILITIES,
  passiveEligibilityIds: guardianCirclePassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const GUARDIAN_CIRCLE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: GUARDIAN_CIRCLE_ABILITIES,
});

const EXPULSION_CIRCLE_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 26,
    value: 25,
    levelUpValue: 5,
    time: 60,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 340401,
    sourceBuffId: 35012,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: slotIndex === 3 ? 20 : 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);

function expulsionCirclePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3404);
  if (
    policy?.passiveEligibilityIds[0] !== 204025 ||
    !policy.passiveEligibilityIds.includes(205025)
  ) {
    throw new Error('Missing reviewed Expulsion Circle passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const EXPULSION_CIRCLE_SOURCE_FACETS = Object.freeze({
  skillId: 3404,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: EXPULSION_CIRCLE_ABILITIES,
  passiveEligibilityIds: expulsionCirclePassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const EXPULSION_CIRCLE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: EXPULSION_CIRCLE_ABILITIES,
});

const TAI_CHI_ABILITIES = Object.freeze(
  [0, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function taiChiPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3201);
  if (
    policy?.passiveEligibilityIds[0] !== 204001 ||
    !policy.passiveEligibilityIds.includes(204025) ||
    !policy.passiveEligibilityIds.includes(205025)
  ) {
    throw new Error('Missing reviewed Tai Chi passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const TAI_CHI_SOURCE_FACETS = Object.freeze({
  skillId: 3201,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: TAI_CHI_ABILITIES,
  passiveEligibilityIds: taiChiPassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const TAI_CHI_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: TAI_CHI_ABILITIES,
});

const BLASTING_CHARM_ABILITIES = Object.freeze(
  [5, 0, 0, 20].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function blastingCharmPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3505);
  if (
    policy?.passiveEligibilityIds[0] !== 204001 ||
    !policy.passiveEligibilityIds.includes(204025) ||
    !policy.passiveEligibilityIds.includes(205025)
  ) {
    throw new Error('Missing reviewed Blasting Charm passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const BLASTING_CHARM_SOURCE_FACETS = Object.freeze({
  skillId: 3505,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: BLASTING_CHARM_ABILITIES,
  passiveEligibilityIds: blastingCharmPassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const BLASTING_CHARM_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: BLASTING_CHARM_ABILITIES,
});

const SOARING_SLASH_ABILITIES = Object.freeze(
  [10, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function soaringSlashPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(3203);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(101002) ||
    !policy.passiveEligibilityIds.includes(102001) ||
    !policy.passiveEligibilityIds.includes(706005)
  ) {
    throw new Error('Missing reviewed Soaring Slash passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const SOARING_SLASH_SOURCE_FACETS = Object.freeze({
  skillId: 3203,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SOARING_SLASH_ABILITIES,
  passiveEligibilityIds: soaringSlashPassiveReferences(),
  smiteBuffIds: Object.freeze([10020, 20020]),
  autoLearnPassiveIds: Object.freeze([101002, 102001]),
  skillModPassiveIds: Object.freeze([]) as readonly number[],
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const SOARING_SLASH_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SOARING_SLASH_ABILITIES,
});

const THUNDERSTORM_ABILITIES = Object.freeze(
  [2, 0, 0, 0].map((time, slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);
const THUNDERSTORM_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: THUNDERSTORM_ABILITIES,
});

function thunderstormPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(2301);
  if (
    !policy ||
    !policy.passiveEligibilityIds.includes(MIR4_NATIVE_CHILL_EVIDENCE.passive.passiveId)
  ) {
    throw new Error('Missing reviewed Thunderstorm passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const THUNDERSTORM_SOURCE_FACETS = Object.freeze({
  skillId: 2301,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: THUNDERSTORM_ABILITIES,
  passiveEligibilityIds: thunderstormPassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_CHILL_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_CHILL_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_CHILL_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

function chainLightningPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(2303);
  if (!policy || !policy.passiveEligibilityIds.includes(102001)) {
    throw new Error('Missing reviewed Chain Lightning passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const CHAIN_LIGHTNING_SOURCE_FACETS = Object.freeze({
  skillId: 2303,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SHARED_WARRIOR_ABILITIES,
  passiveEligibilityIds: chainLightningPassiveReferences(),
  smiteBuffIds: Object.freeze([20020]),
  autoLearnPassiveIds: Object.freeze([102001]),
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const CRESCENT_BLADE_ABILITIES = Object.freeze(
  [0, 1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function crescentBladePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(5101);
  if (!policy || !policy.passiveEligibilityIds.includes(102001)) {
    throw new Error('Missing reviewed Crescent Blade passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const CRESCENT_BLADE_SOURCE_FACETS = Object.freeze({
  skillId: 5101,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
  passiveEligibilityIds: crescentBladePassiveReferences(),
  smiteBuffIds: Object.freeze([20020]),
  autoLearnPassiveIds: Object.freeze([102001]),
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const CRESCENT_BLADE_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
});

function doubleStrikePassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(5301);
  if (!policy?.passiveEligibilityIds.includes(102001)) {
    throw new Error('Missing reviewed Double Strike passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const DOUBLE_STRIKE_SOURCE_FACETS = Object.freeze({
  skillId: 5301,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
  passiveEligibilityIds: doubleStrikePassiveReferences(),
  smiteBuffIds: Object.freeze([20020]),
  autoLearnPassiveIds: Object.freeze([102001]),
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

function crushingBlowPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(5303);
  if (!policy?.passiveEligibilityIds.includes(151129)) {
    throw new Error('Missing reviewed Crushing Blow passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const CRUSHING_BLOW_SOURCE_FACETS = Object.freeze({
  skillId: 5303,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
  passiveEligibilityIds: crushingBlowPassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const CRUSHING_BLOW_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
});

function piercingSpearPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(5205);
  if (!policy?.passiveEligibilityIds.includes(151129)) {
    throw new Error('Missing reviewed Piercing Spear passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const PIERCING_SPEAR_SOURCE_FACETS = Object.freeze({
  skillId: 5205,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
  passiveEligibilityIds: piercingSpearPassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const PIERCING_SPEAR_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: CRESCENT_BLADE_ABILITIES,
});

const NIRVANA_KICK_ABILITIES = Object.freeze(
  [0, 1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
);

function nirvanaKickPassiveReferences(): readonly number[] {
  const policy = mir4NativeGeneratedPassiveEligibility(5104);
  if (!policy || !policy.passiveEligibilityIds.includes(151129)) {
    throw new Error('Missing reviewed Nirvana Kick passive eligibility source');
  }
  return policy.passiveEligibilityIds;
}

const NIRVANA_KICK_SOURCE_FACETS = Object.freeze({
  skillId: 5104,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: NIRVANA_KICK_ABILITIES,
  passiveEligibilityIds: nirvanaKickPassiveReferences(),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const NIRVANA_KICK_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: NIRVANA_KICK_ABILITIES,
});

function sealedSourceFacets(skillId: number): Mir4NativeRuntimeSkillSourceFacets {
  return Object.freeze({
    skillId,
    darkChange: SHARED_WARRIOR_DARK_CHANGE,
    abilities: SHARED_WARRIOR_ABILITIES,
    passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
    smiteBuffIds: EMPTY_PASSIVE_IDS,
    autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
    skillModPassiveIds: EMPTY_PASSIVE_IDS,
  });
}

function smitePassiveReferences(
  passiveId: number,
  externalEligibilityOnlyPassiveIds: readonly number[],
): readonly number[] {
  const progressionTail = SHARED_WARRIOR_PASSIVE_REFERENCES.indexOf(204025);
  if (progressionTail < 0) throw new Error('Missing Warrior progression-passive tail');
  return Object.freeze([
    passiveId,
    ...SHARED_WARRIOR_PASSIVE_REFERENCES.slice(0, progressionTail),
    ...externalEligibilityOnlyPassiveIds,
    ...SHARED_WARRIOR_PASSIVE_REFERENCES.slice(progressionTail),
  ]);
}

function cutterPassiveReferences(): readonly number[] {
  return smitePassiveReferences(
    MIR4_NATIVE_1104_SMITE_EVIDENCE.passive.passiveId,
    MIR4_NATIVE_1104_SMITE_EVIDENCE.externalEligibilityOnlyPassiveIds,
  );
}

const CUTTER_SOURCE_FACETS = Object.freeze({
  skillId: 1104,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: SHARED_WARRIOR_ABILITIES,
  passiveEligibilityIds: cutterPassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_1104_SMITE_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_1104_SMITE_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_1104_SMITE_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const GROUND_SMASH_SOURCE_FACETS = Object.freeze({
  skillId: 1401,
  darkChange: GROUND_SMASH_DARK_CHANGE,
  abilities: GROUND_SMASH_ABILITIES,
  passiveEligibilityIds: cutterPassiveReferences(),
  smiteBuffIds: MIR4_NATIVE_1401_SMITE_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_1401_SMITE_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_1401_SMITE_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const LION_ROAR_SOURCE_FACETS = Object.freeze({
  skillId: 1302,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: LION_ROAR_ABILITIES,
  passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const RIPOSTE_SOURCE_FACETS = Object.freeze({
  skillId: 1301,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: RIPOSTE_ABILITIES,
  passiveEligibilityIds: SHARED_WARRIOR_PASSIVE_REFERENCES,
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const GALE_SLASH_SOURCE_FACETS = Object.freeze({
  skillId: 1501,
  darkChange: GROUND_SMASH_DARK_CHANGE,
  abilities: GROUND_SMASH_ABILITIES,
  passiveEligibilityIds: smitePassiveReferences(
    MIR4_NATIVE_1501_SMITE_EVIDENCE.passive.passiveId,
    MIR4_NATIVE_1501_SMITE_EVIDENCE.externalEligibilityOnlyPassiveIds,
  ),
  smiteBuffIds: MIR4_NATIVE_1501_SMITE_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_1501_SMITE_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_1501_SMITE_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const CRESCENT_STRIKE_SOURCE_FACETS = Object.freeze({
  skillId: 1601,
  darkChange: GROUND_SMASH_DARK_CHANGE,
  abilities: GROUND_SMASH_ABILITIES,
  passiveEligibilityIds: smitePassiveReferences(
    MIR4_NATIVE_1601_SMITE_EVIDENCE.passive.passiveId,
    MIR4_NATIVE_1601_SMITE_EVIDENCE.externalEligibilityOnlyPassiveIds,
  ),
  smiteBuffIds: MIR4_NATIVE_1601_SMITE_EVIDENCE.skill.smiteBuffIds,
  autoLearnPassiveIds: MIR4_NATIVE_1601_SMITE_EVIDENCE.skill.autoLearnPassiveIds,
  skillModPassiveIds: MIR4_NATIVE_1601_SMITE_EVIDENCE.skill.skillModPassiveIds,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;

const UNBREAKABLE_STANCE_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 29,
    value: 60,
    levelUpValue: 10,
    time: 20,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 150202,
    sourceBuffId: 15011,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const UNBREAKABLE_STANCE_DARK_CHANGE = Object.freeze({
  nativeMode: 3,
  presentationOnly: true as const,
  clientOption: 'G_SkillDarkChange' as const,
});
const UNBREAKABLE_STANCE_SOURCE_FACETS = Object.freeze({
  skillId: 1502,
  darkChange: UNBREAKABLE_STANCE_DARK_CHANGE,
  abilities: UNBREAKABLE_STANCE_ABILITIES,
  passiveEligibilityIds: Object.freeze([204025, 205025]),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const UNBREAKABLE_STANCE_PRESENTATION_FACETS = Object.freeze({
  darkChange: UNBREAKABLE_STANCE_DARK_CHANGE,
  abilities: UNBREAKABLE_STANCE_ABILITIES,
});

const BERSERK_ABILITIES = Object.freeze([
  Object.freeze({
    slotIndex: 0,
    type: 44,
    value: 12,
    levelUpValue: 2,
    time: 15,
    active: false as const,
    inactiveReason: 'attack-row-buff-metadata' as const,
    sourceAttackId: 110101,
    sourceBuffId: 11012,
  }),
  ...[1, 2, 3].map((slotIndex) =>
    Object.freeze({
      slotIndex,
      type: 0,
      value: 0,
      levelUpValue: 0,
      time: 0,
      active: false as const,
      inactiveReason: 'zero-type' as const,
    }),
  ),
]);
const BERSERK_SOURCE_FACETS = Object.freeze({
  skillId: 1101,
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: BERSERK_ABILITIES,
  passiveEligibilityIds: Object.freeze([204025, 205025]),
  smiteBuffIds: EMPTY_PASSIVE_IDS,
  autoLearnPassiveIds: EMPTY_PASSIVE_IDS,
  skillModPassiveIds: EMPTY_PASSIVE_IDS,
}) satisfies Mir4NativeRuntimeSkillSourceFacets;
const BERSERK_PRESENTATION_FACETS = Object.freeze({
  darkChange: SHARED_WARRIOR_DARK_CHANGE,
  abilities: BERSERK_ABILITIES,
});

const RUNTIME_SOURCE_FACETS = new Map<number, Mir4NativeRuntimeSkillSourceFacets>([
  [1101, BERSERK_SOURCE_FACETS],
  [1102, sealedSourceFacets(1102)],
  [1103, sealedSourceFacets(1103)],
  [1104, CUTTER_SOURCE_FACETS],
  [1201, IRON_SHACKLE_SOURCE_FACETS],
  [1301, RIPOSTE_SOURCE_FACETS],
  [1302, LION_ROAR_SOURCE_FACETS],
  [1304, sealedSourceFacets(1304)],
  [1401, GROUND_SMASH_SOURCE_FACETS],
  [1501, GALE_SLASH_SOURCE_FACETS],
  [1601, CRESCENT_STRIKE_SOURCE_FACETS],
  [1502, UNBREAKABLE_STANCE_SOURCE_FACETS],
  [2101, FLAME_ORB_SOURCE_FACETS],
  [2103, IMMOLATE_SOURCE_FACETS],
  [2201, FLAME_STRIKE_SOURCE_FACETS],
  [2301, THUNDERSTORM_SOURCE_FACETS],
  [2303, CHAIN_LIGHTNING_SOURCE_FACETS],
  [3101, SUNBEAM_SWORD_SOURCE_FACETS],
  [3103, PIERCING_BLADES_SOURCE_FACETS],
  [3104, RAIN_OF_BLADES_SOURCE_FACETS],
  [3201, TAI_CHI_SOURCE_FACETS],
  [3203, SOARING_SLASH_SOURCE_FACETS],
  [3404, EXPULSION_CIRCLE_SOURCE_FACETS],
  [3501, GUARDIAN_CIRCLE_SOURCE_FACETS],
  [3503, HEAL_SOURCE_FACETS],
  [3504, GREATER_HEAL_SOURCE_FACETS],
  [3505, BLASTING_CHARM_SOURCE_FACETS],
  [3506, sealedSourceFacets(3506)],
  [4106, PAINSTRIKE_GALE_SOURCE_FACETS],
  [4105, ICE_CAGE_SOURCE_FACETS],
  [4107, FLASH_ARROW_SOURCE_FACETS],
  [5101, CRESCENT_BLADE_SOURCE_FACETS],
  [5104, NIRVANA_KICK_SOURCE_FACETS],
  [5301, DOUBLE_STRIKE_SOURCE_FACETS],
  [5303, CRUSHING_BLOW_SOURCE_FACETS],
  [5205, PIERCING_SPEAR_SOURCE_FACETS],
]);

const RUNTIME_PRESENTATION_FACETS = new Map<number, Mir4NativeRuntimeSkillPresentationFacets>([
  [1101, BERSERK_PRESENTATION_FACETS],
  [1102, SHARED_WARRIOR_PRESENTATION_FACETS],
  [1103, SHARED_WARRIOR_PRESENTATION_FACETS],
  [1104, SHARED_WARRIOR_PRESENTATION_FACETS],
  [1201, IRON_SHACKLE_PRESENTATION_FACETS],
  [1301, RIPOSTE_PRESENTATION_FACETS],
  [1302, LION_ROAR_PRESENTATION_FACETS],
  [1304, SHARED_WARRIOR_PRESENTATION_FACETS],
  [1401, GROUND_SMASH_PRESENTATION_FACETS],
  [1501, GROUND_SMASH_PRESENTATION_FACETS],
  [1601, GROUND_SMASH_PRESENTATION_FACETS],
  [1502, UNBREAKABLE_STANCE_PRESENTATION_FACETS],
  [2103, IMMOLATE_PRESENTATION_FACETS],
  [2301, THUNDERSTORM_PRESENTATION_FACETS],
  [2303, SHARED_WARRIOR_PRESENTATION_FACETS],
  [3101, SUNBEAM_SWORD_PRESENTATION_FACETS],
  [3103, PIERCING_BLADES_PRESENTATION_FACETS],
  [3104, RAIN_OF_BLADES_PRESENTATION_FACETS],
  [3201, TAI_CHI_PRESENTATION_FACETS],
  [3203, SOARING_SLASH_PRESENTATION_FACETS],
  [3404, EXPULSION_CIRCLE_PRESENTATION_FACETS],
  [3501, GUARDIAN_CIRCLE_PRESENTATION_FACETS],
  [3503, HEAL_PRESENTATION_FACETS],
  [3504, GREATER_HEAL_PRESENTATION_FACETS],
  [3505, BLASTING_CHARM_PRESENTATION_FACETS],
  [3506, SHARED_WARRIOR_PRESENTATION_FACETS],
  [4106, PAINSTRIKE_GALE_PRESENTATION_FACETS],
  [4105, ICE_CAGE_PRESENTATION_FACETS],
  [4107, FLASH_ARROW_PRESENTATION_FACETS],
  [5101, CRESCENT_BLADE_PRESENTATION_FACETS],
  [5104, NIRVANA_KICK_PRESENTATION_FACETS],
  [5303, CRUSHING_BLOW_PRESENTATION_FACETS],
  [5205, PIERCING_SPEAR_PRESENTATION_FACETS],
]);

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Independently admit source facets whose recovered client consumer is purely
 * presentational. This lets a skill preserve DarkChange and zero-typed
 * ability tuples without pretending that its external passive references or
 * automatic-learning behavior have also been implemented.
 */
export function mir4NativeRuntimeSkillPresentationFacets(
  skillId: number,
): Mir4NativeRuntimeSkillPresentationFacets | null {
  const expected = RUNTIME_PRESENTATION_FACETS.get(skillId);
  if (!expected) return mir4NativeGeneratedPresentationFacets(skillId);
  const behavior = mir4NativeSkillActionById(skillId)?.nativeBehavior;
  if (
    !behavior ||
    behavior.darkChange !== expected.darkChange.nativeMode ||
    behavior.abilities.length !== expected.abilities.length ||
    behavior.abilities.some((ability, index) => {
      const admitted = expected.abilities[index];
      return (
        admitted === undefined ||
        ability.type !== admitted.type ||
        ability.value !== admitted.value ||
        ability.levelUpValue !== admitted.levelUpValue ||
        ability.time !== admitted.time
      );
    })
  ) {
    return null;
  }
  return expected;
}

/**
 * Source-sealed SKILL facets that do not create combat effects.
 *
 * The native table has four parallel Ability tuples. A type of zero supplies no
 * dispatch discriminator, so the fourth tuple's otherwise orphaned time value
 * is preserved but inactive. The separate SKILL.Passive, AutoLearnPassive and
 * Skill_MODPassive arrays also matter: Air Slash references 89 external
 * passives while AutoLearnPassive is empty for Air Slash. Cutter is the one
 * admitted exception here: its exact 101001 -> 10010 Smite chain has a
 * dedicated runtime consumer, while 706005 remains eligibility-only.
 *
 * DarkChange is exposed by the extracted client as the user-facing battle
 * option `G_SkillDarkChange`; its raw mode is presentation metadata, not a
 * damage, status or control operation. Its value remains uninterpreted here.
 */
export function mir4NativeRuntimeSkillSourceFacets(
  skillId: number,
): Mir4NativeRuntimeSkillSourceFacets | null {
  const expectedFacets = RUNTIME_SOURCE_FACETS.get(skillId);
  if (!expectedFacets) return null;
  const behavior = mir4NativeSkillActionById(skillId)?.nativeBehavior;
  if (
    !behavior ||
    behavior.darkChange !== expectedFacets.darkChange.nativeMode ||
    behavior.abilities.length !== expectedFacets.abilities.length ||
    behavior.abilities.some((ability, index) => {
      const expected = expectedFacets.abilities[index];
      return (
        expected === undefined ||
        ability.type !== expected.type ||
        ability.value !== expected.value ||
        ability.levelUpValue !== expected.levelUpValue ||
        ability.time !== expected.time
      );
    }) ||
    !sameNumbers(behavior.passiveIds, expectedFacets.passiveEligibilityIds) ||
    !sameNumbers(behavior.smiteBuffIds, expectedFacets.smiteBuffIds) ||
    !sameNumbers(behavior.autoLearnPassiveIds, expectedFacets.autoLearnPassiveIds) ||
    !sameNumbers(behavior.skillModPassiveIds, expectedFacets.skillModPassiveIds)
  ) {
    return null;
  }
  return expectedFacets;
}
