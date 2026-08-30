import { describe, expect, it } from 'vitest';
import { abilityVfxFullSpec, abilityVfxSpec } from '../../src/render/ability_vfx_registry';
import { VISUALS } from '../../src/render/characters/manifest';
import { MIR4_CLASS_PASSIVES, mir4SkillsForClass } from '../../src/sim/content/mir4';
import { mir4AbilityIdsForClass } from '../../src/sim/mir4/action_abilities';
import {
  abilityIconRecipe,
  hasExplicitAbilityIcon,
  MIR4_ABILITY_IMAGE_ALIASES,
} from '../../src/ui/icons';

const WARRIOR_SKILL_IDS = mir4SkillsForClass(1).map((skill) => `mir4_skill_${skill.skillId}`);
const WARRIOR_PRESENTATION_IDS = [...WARRIOR_SKILL_IDS, 'mir4_ultimate_1'] as const;

const LEGACY_WARRIOR_PASSIVE_IDS = [
  'mir4_passive_warrior-heavy-armor',
  'mir4_passive_warrior-weapon-mastery',
  'mir4_passive_warrior-iron-skin',
  'mir4_passive_warrior-fighting-spirit',
  'mir4_passive_warrior-indomitable-will',
] as const;

describe('Aeldrune Warrior presentation', () => {
  it('exposes only the thirteen real MIR4 Warrior actions', () => {
    expect(mir4AbilityIdsForClass(1)).toEqual(WARRIOR_PRESENTATION_IDS);
    expect(MIR4_CLASS_PASSIVES[1]).toEqual([]);
    for (const id of LEGACY_WARRIOR_PASSIVE_IDS) {
      expect(mir4AbilityIdsForClass(1), id).not.toContain(id);
    }
  });

  it('uses distinct procedural identities instead of classic WoC ability paintings', () => {
    const recipes = WARRIOR_PRESENTATION_IDS.map((id) => {
      expect(MIR4_ABILITY_IMAGE_ALIASES[id], id).toBeUndefined();
      expect(hasExplicitAbilityIcon(id), id).toBe(true);
      return JSON.stringify(abilityIconRecipe(id));
    });
    expect(new Set(recipes).size).toBe(WARRIOR_PRESENTATION_IDS.length);
  });

  it('does not ship invented standalone passive icons for the Warrior', () => {
    for (const id of LEGACY_WARRIOR_PASSIVE_IDS) {
      expect(hasExplicitAbilityIcon(id), id).toBe(false);
      expect(MIR4_ABILITY_IMAGE_ALIASES[id], id).toBeUndefined();
    }
  });

  it('ships an authored Aeldrune VFX composition for every active skill and the ultimate', () => {
    for (const id of [...WARRIOR_SKILL_IDS, 'mir4_ultimate_1']) {
      expect(abilityVfxSpec(id), `${id} compact`).toBeDefined();
      expect(abilityVfxFullSpec(id), `${id} full`).toBeDefined();
    }
  });

  it('maps every active skill directly to a valid Warrior rig clip', () => {
    const clips = VISUALS.player_warrior.clips.attackByAbility ?? {};
    for (const id of [...WARRIOR_SKILL_IDS, 'mir4_ultimate_1']) {
      expect(clips[id], id).toBeTruthy();
    }
  });
});
