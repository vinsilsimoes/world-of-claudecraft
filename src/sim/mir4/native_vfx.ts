// Presentation adapter for MIR4 skills. Mechanics and ids remain MIR4, while
// every rendered particle, rig gesture and sound palette is selected from an
// existing Aeldrune ability cue. No source-project asset is used.

import type { Mir4SkillDef } from '../content/mir4';
import type { SimEvent } from '../types';

type SpellFxEvent = Extract<SimEvent, { type: 'spellfx' }>;

export interface Mir4NativeVfxCue {
  ability: string;
  school: string;
  fx: SpellFxEvent['fx'];
}

const MIR4_NATIVE_VFX: Readonly<Record<number, Mir4NativeVfxCue>> = {
  1101: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1102: { ability: 'storm_bolt', school: 'physical', fx: 'projectile' },
  1103: { ability: 'charge', school: 'physical', fx: 'projectile' },
  1104: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  1201: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1301: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  1302: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1304: { ability: 'charge', school: 'physical', fx: 'projectile' },
  1401: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1501: { ability: 'whirlwind', school: 'physical', fx: 'nova' },
  1502: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  1601: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  2101: { ability: 'fireball', school: 'fire', fx: 'projectile' },
  2103: { ability: 'immolate', school: 'fire', fx: 'projectile' },
  2111: { ability: 'frostbolt', school: 'frost', fx: 'projectile' },
  2201: { ability: 'flamestrike', school: 'fire', fx: 'nova' },
  2202: { ability: 'ice_block', school: 'frost', fx: 'nova' },
  2203: { ability: 'blizzard', school: 'frost', fx: 'nova' },
  2204: { ability: 'combustion', school: 'fire', fx: 'selfCast' },
  2301: { ability: 'lightning_bolt', school: 'nature', fx: 'projectile' },
  2303: { ability: 'chain_lightning', school: 'nature', fx: 'projectile' },
  2501: { ability: 'shadow_bolt', school: 'shadow', fx: 'nova' },
  2502: { ability: 'shadow_bolt', school: 'shadow', fx: 'projectile' },
  2503: { ability: 'power_word_shield', school: 'holy', fx: 'selfCast' },
  3101: { ability: 'stormstrike', school: 'holy', fx: 'selfCast' },
  3103: { ability: 'chain_lightning', school: 'arcane', fx: 'projectile' },
  3104: { ability: 'earthquake', school: 'holy', fx: 'nova' },
  3201: { ability: 'earth_shock', school: 'nature', fx: 'nova' },
  3203: { ability: 'stormstrike', school: 'physical', fx: 'selfCast' },
  3301: { ability: 'earthbind', school: 'arcane', fx: 'nova' },
  3404: { ability: 'elemental_mastery', school: 'holy', fx: 'selfCast' },
  3501: { ability: 'power_word_shield', school: 'nature', fx: 'nova' },
  3503: { ability: 'renew', school: 'holy', fx: 'selfCast' },
  3504: { ability: 'chain_heal', school: 'holy', fx: 'selfCast' },
  3505: { ability: 'flame_shock', school: 'shadow', fx: 'projectile' },
  3506: { ability: 'frost_shock', school: 'arcane', fx: 'projectile' },
  4101: { ability: 'aimed_shot', school: 'physical', fx: 'projectile' },
  4102: { ability: 'multi_shot', school: 'physical', fx: 'projectile' },
  4103: { ability: 'arcane_shot', school: 'arcane', fx: 'projectile' },
  4104: { ability: 'rain_of_fire', school: 'nature', fx: 'nova' },
  4105: { ability: 'frost_trap', school: 'frost', fx: 'nova' },
  4106: { ability: 'concussive_shot', school: 'physical', fx: 'projectile' },
  4107: { ability: 'fireball', school: 'fire', fx: 'projectile' },
  4108: { ability: 'volley', school: 'physical', fx: 'nova' },
  4109: { ability: 'arcane_shot', school: 'fire', fx: 'projectile' },
  4110: { ability: 'aimed_shot', school: 'physical', fx: 'projectile' },
  4111: { ability: 'trueshot_aura', school: 'physical', fx: 'selfCast' },
  4112: { ability: 'prowl', school: 'physical', fx: 'selfCast' },
  5101: { ability: 'mortal_strike', school: 'physical', fx: 'selfCast' },
  5102: { ability: 'whirlwind', school: 'physical', fx: 'nova' },
  5103: { ability: 'chain_lightning', school: 'nature', fx: 'nova' },
  5104: { ability: 'whirlwind', school: 'physical', fx: 'nova' },
  5201: { ability: 'storm_bolt', school: 'physical', fx: 'projectile' },
  5202: { ability: 'charge', school: 'physical', fx: 'projectile' },
  5205: { ability: 'aimed_shot', school: 'physical', fx: 'projectile' },
  5301: { ability: 'charge', school: 'physical', fx: 'projectile' },
  5303: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  5304: { ability: 'siphon_life', school: 'shadow', fx: 'projectile' },
  5401: { ability: 'thunder_clap', school: 'physical', fx: 'nova' },
  5403: { ability: 'power_word_shield', school: 'nature', fx: 'nova' },
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
