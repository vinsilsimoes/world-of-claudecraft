import { describe, expect, it } from 'vitest';
import { abilityVfxFullSpec, abilityVfxSpec } from '../../src/render/ability_vfx_registry';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { mir4NativeVfxCue } from '../../src/sim/mir4/native_vfx';

describe('MIR4 skill VFX routing', () => {
  it('maps every active gameplay skill to a shipping ability specification', () => {
    const skills = ([1, 2, 3, 4, 5] as const).flatMap((classId) => mir4SkillsForClass(classId));
    expect(skills).toHaveLength(60);
    for (const skill of skills) {
      const cue = mir4NativeVfxCue(skill);
      expect(abilityVfxSpec(cue.ability), `${skill.skillId} compact VFX`).toBeDefined();
      expect(abilityVfxFullSpec(cue.ability), `${skill.skillId} full VFX`).toBeDefined();
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

  it('keeps every homologated Warrior action on its own Aeldrune presentation id', () => {
    const skills = ([1, 5] as const).flatMap((classId) => mir4SkillsForClass(classId));
    for (const skill of skills.filter((candidate) => candidate.classId === 1)) {
      expect(mir4NativeVfxCue(skill).ability).toBe(`mir4_skill_${skill.skillId}`);
    }
    for (const skillId of [5201, 5301]) {
      expect(mir4NativeVfxCue(skills.find((skill) => skill.skillId === skillId)!).fx).toBe(
        'projectile',
      );
    }
  });
});
