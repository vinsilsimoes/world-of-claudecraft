import { describe, expect, it } from 'vitest';
import { ABILITY_VFX_FULL_SPECS } from '../../src/render/ability_vfx_full_specs';
import { ABILITY_VFX_SPECS } from '../../src/render/ability_vfx_specs';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { ABILITIES } from '../../src/sim/data';
import { mir4NativeVfxCue } from '../../src/sim/mir4/native_vfx';

describe('MIR4 skills reuse native WoC VFX and audio cues', () => {
  it('maps every active gameplay skill to a shipping native ability specification', () => {
    const skills = ([1, 2, 3, 4, 5] as const).flatMap((classId) => mir4SkillsForClass(classId));
    expect(skills).toHaveLength(60);
    for (const skill of skills) {
      const cue = mir4NativeVfxCue(skill);
      expect(ABILITIES[cue.ability], `${skill.skillId} ability`).toBeDefined();
      expect(ABILITY_VFX_SPECS[cue.ability], `${skill.skillId} compact VFX`).toBeDefined();
      expect(ABILITY_VFX_FULL_SPECS[cue.ability], `${skill.skillId} full VFX`).toBeDefined();
      expect(cue.school).not.toContain('mir4/');
      expect(cue.fx).not.toBe('flourish');
    }
  });

  it('uses native defensive and healing ceremonies for the two self utilities', () => {
    const skills = ([2, 3] as const).flatMap((classId) => mir4SkillsForClass(classId));
    expect(mir4NativeVfxCue(skills.find((skill) => skill.skillId === 2503)!)).toEqual({
      ability: 'power_word_shield',
      school: 'holy',
      fx: 'selfCast',
    });
    expect(mir4NativeVfxCue(skills.find((skill) => skill.skillId === 3503)!)).toEqual({
      ability: 'renew',
      school: 'holy',
      fx: 'selfCast',
    });
  });

  it('renders Moonlight Wave as a native ranged arcane strike', () => {
    const skill = mir4SkillsForClass(3).find((candidate) => candidate.skillId === 3506)!;
    expect(mir4NativeVfxCue(skill)).toEqual({
      ability: 'frost_shock',
      school: 'arcane',
      fx: 'projectile',
    });
  });

  it('never routes a victim-targeted dash or strike through a discarded selfCast cue', () => {
    const skills = ([1, 5] as const).flatMap((classId) => mir4SkillsForClass(classId));
    for (const skillId of [1103, 1304, 5201, 5301]) {
      expect(mir4NativeVfxCue(skills.find((skill) => skill.skillId === skillId)!).fx).toBe(
        'projectile',
      );
    }
  });
});
