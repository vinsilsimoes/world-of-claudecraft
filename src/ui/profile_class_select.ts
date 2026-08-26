import { MIR4_CLASSES, mir4ClassByKey } from '../sim/content/mir4/classes';
import { mir4SkillsForClass } from '../sim/content/mir4/skills';
import type { GameProfile } from '../sim/game_profile';
import { classesForGameProfile } from '../sim/game_profile_roster';
import { mir4SkillUnlockLevel } from '../sim/mir4/skill_progression';
import { mir4ShellClassFor } from '../sim/mir4/stats';
import type { Mir4ClassKey, PlayableClass, PlayerClass } from '../sim/types';
import type { TranslationKey } from './i18n';

export interface ProfileClassOption {
  key: PlayableClass;
  shellClass: PlayerClass;
  labelKey: TranslationKey;
  ariaKey: TranslationKey;
}

export interface Mir4ClassDetailsView {
  key: Mir4ClassKey;
  labelKey: TranslationKey;
  damageKey: TranslationKey;
  rangeKey: TranslationKey;
  weaponKey: TranslationKey;
  rangeYards: number;
  startingSkills: number;
}

export function profileClassOptions(profile: GameProfile): ProfileClassOption[] {
  return classesForGameProfile(profile).map((key) => ({
    key,
    shellClass: mir4ShellClassFor(key, profile),
    labelKey: `classes.${key}` as TranslationKey,
    ariaKey: `classes.${key}Aria` as TranslationKey,
  }));
}

export function mir4ClassDetailsView(key: Mir4ClassKey): Mir4ClassDetailsView {
  const def = mir4ClassByKey(key) ?? MIR4_CLASSES[0];
  if (!def) throw new Error('MIR4 class catalog is empty');
  const rangeKey =
    def.rangeBand === 'medium-range'
      ? 'classDetails.mir4.range.medium'
      : def.rangeBand === 'long-range'
        ? 'classDetails.mir4.range.long'
        : def.rangeBand === 'melee-extended'
          ? 'classDetails.mir4.range.extended'
          : 'classDetails.mir4.range.melee';
  return {
    key,
    labelKey: `classes.${key}` as TranslationKey,
    damageKey: `classDetails.mir4.damage.${def.damageChannel}` as TranslationKey,
    rangeKey,
    weaponKey: `classDetails.mir4.weapons.${def.weapon}` as TranslationKey,
    rangeYards: def.rangeTiles * 2,
    startingSkills: mir4SkillsForClass(def.classId).filter(
      (skill) => mir4SkillUnlockLevel(skill.slot) <= 1,
    ).length,
  };
}
