// Presentation adapter for MIR4 skills. Mechanics and ids remain MIR4, while
// every rendered particle, rig gesture and sound palette is selected from an
// existing World of ClaudeCraft ability cue. No source-project asset is used.

import type { Mir4SkillDef } from '../content/mir4';
import type { SimEvent } from '../types';

type SpellFxEvent = Extract<SimEvent, { type: 'spellfx' }>;

export interface Mir4NativeVfxCue {
  ability: string;
  school: string;
  fx: SpellFxEvent['fx'];
}

const MIR4_NATIVE_VFX: Readonly<Record<number, Mir4NativeVfxCue>> = {
  1102: { ability: 'storm_bolt', school: 'physical', fx: 'projectile' },
  1104: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  1304: { ability: 'charge', school: 'physical', fx: 'projectile' },
  1401: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1501: { ability: 'whirlwind', school: 'physical', fx: 'nova' },
  2101: { ability: 'arcane_missiles', school: 'arcane', fx: 'projectile' },
  2111: { ability: 'fireball', school: 'fire', fx: 'projectile' },
  2301: { ability: 'smite', school: 'holy', fx: 'selfCast' },
  2501: { ability: 'ice_lance', school: 'frost', fx: 'projectile' },
  2503: { ability: 'power_word_shield', school: 'holy', fx: 'selfCast' },
  3101: { ability: 'lightning_bolt', school: 'nature', fx: 'projectile' },
  3104: { ability: 'smite', school: 'holy', fx: 'selfCast' },
  3301: { ability: 'thunder_clap', school: 'arcane', fx: 'nova' },
  3503: { ability: 'renew', school: 'holy', fx: 'selfCast' },
  3506: { ability: 'earthbind', school: 'nature', fx: 'nova' },
  4101: { ability: 'aimed_shot', school: 'physical', fx: 'projectile' },
  4102: { ability: 'multi_shot', school: 'physical', fx: 'projectile' },
  4103: { ability: 'arcane_shot', school: 'arcane', fx: 'projectile' },
  4106: { ability: 'concussive_shot', school: 'physical', fx: 'projectile' },
  4107: { ability: 'fireball', school: 'fire', fx: 'projectile' },
  5101: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  5104: { ability: 'whirlwind', school: 'physical', fx: 'nova' },
  5201: { ability: 'storm_bolt', school: 'physical', fx: 'projectile' },
  5301: { ability: 'charge', school: 'physical', fx: 'projectile' },
  5401: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
};

export function mir4NativeVfxCue(skill: Readonly<Mir4SkillDef>): Mir4NativeVfxCue {
  return (
    MIR4_NATIVE_VFX[skill.skillId] ?? {
      ability: skill.classId === 2 || skill.classId === 3 ? 'arcane_shot' : 'mortal_strike',
      school: skill.classId === 2 || skill.classId === 3 ? 'arcane' : 'physical',
      fx: skill.classId === 2 || skill.classId === 4 ? 'projectile' : 'selfCast',
    }
  );
}
