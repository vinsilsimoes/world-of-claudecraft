import type { AbilityVfxArchetype, AbilityVfxFullSpec, AbilityVfxSpec } from './ability_vfx_core';

interface Mir4VfxProfile {
  archetype: AbilityVfxArchetype;
  palette: string;
  tint: string;
  accent: string;
  rim: string;
}

const sorcerer = (
  archetype: AbilityVfxArchetype,
  palette: string,
  tint: string,
): Mir4VfxProfile => ({ archetype, palette, tint, accent: '#e7bcff', rim: '#f8efff' });
const taoist = (archetype: AbilityVfxArchetype, palette: string, tint: string): Mir4VfxProfile => ({
  archetype,
  palette,
  tint,
  accent: '#d9f6ff',
  rim: '#fff7cf',
});
const arbalist = (
  archetype: AbilityVfxArchetype,
  palette: string,
  tint: string,
): Mir4VfxProfile => ({ archetype, palette, tint, accent: '#ffe07b', rim: '#f5fbff' });
const lancer = (archetype: AbilityVfxArchetype, palette: string, tint: string): Mir4VfxProfile => ({
  archetype,
  palette,
  tint,
  accent: '#8ee8ff',
  rim: '#fff2b0',
});

// Every MIR4 action has an Aeldrune-owned visual profile. The profile may reuse
// pooled renderer primitives, but never aliases a classic WoC ability id.
const PROFILES: Readonly<Record<string, Mir4VfxProfile>> = {
  mir4_skill_2101: sorcerer('nova', 'fire', '#ff7b32'),
  mir4_skill_2111: sorcerer('cc', 'frost', '#9ce6ff'),
  mir4_skill_2501: sorcerer('bolt', 'arcane', '#a66bff'),
  mir4_skill_2301: sorcerer('bolt', 'storm', '#69cfff'),
  mir4_skill_2503: sorcerer('buff', 'frost', '#d9f7ff'),
  mir4_skill_2203: sorcerer('nova', 'frost', '#7edcff'),
  mir4_skill_2303: sorcerer('bolt', 'storm', '#79aaff'),
  mir4_skill_2201: sorcerer('burst', 'fire', '#ff993b'),
  mir4_skill_2502: sorcerer('bolt', 'arcane', '#d477ff'),
  mir4_skill_2103: sorcerer('dot', 'fire', '#ff5530'),
  mir4_skill_2204: sorcerer('buff', 'fire', '#ffb044'),
  mir4_skill_2202: sorcerer('nova', 'frost', '#b8f3ff'),
  mir4_ultimate_2: sorcerer('nova', 'fire', '#ff4f18'),

  mir4_skill_3506: taoist('bolt', 'storm', '#bfefff'),
  mir4_skill_3101: taoist('strike', 'holy', '#ffe26f'),
  mir4_skill_3301: taoist('cc', 'arcane', '#d7b4ff'),
  mir4_skill_3104: taoist('nova', 'physical', '#e8f4ff'),
  mir4_skill_3503: taoist('heal', 'nature', '#7ee68e'),
  mir4_skill_3103: taoist('strike', 'physical', '#c9eeff'),
  mir4_skill_3501: taoist('buff', 'holy', '#fff0a0'),
  mir4_skill_3201: taoist('nova', 'storm', '#8fd9ff'),
  mir4_skill_3505: taoist('burst', 'fire', '#ff8d45'),
  mir4_skill_3203: taoist('strike', 'storm', '#9eeaff'),
  mir4_skill_3404: taoist('buff', 'holy', '#edfaff'),
  mir4_skill_3504: taoist('heal', 'holy', '#fff2a8'),
  mir4_ultimate_3: taoist('nova', 'holy', '#d6f7ff'),

  mir4_skill_4101: arbalist('bolt', 'physical', '#e1ecf5'),
  mir4_skill_4106: arbalist('strike', 'blood', '#ff5f56'),
  mir4_skill_4102: arbalist('bolt', 'arcane', '#cb8cff'),
  mir4_skill_4103: arbalist('burst', 'fire', '#ff9a38'),
  mir4_skill_4107: arbalist('bolt', 'holy', '#ffe377'),
  mir4_skill_4108: arbalist('nova', 'storm', '#8bcfff'),
  mir4_skill_4111: arbalist('buff', 'arcane', '#f0bdff'),
  mir4_skill_4105: arbalist('cc', 'frost', '#a7eaff'),
  mir4_skill_4109: arbalist('burst', 'blood', '#ff6852'),
  mir4_skill_4104: arbalist('nova', 'nature', '#8ce562'),
  mir4_skill_4110: arbalist('bolt', 'physical', '#ffe6a0'),
  mir4_skill_4112: arbalist('buff', 'shadow', '#9f87c9'),
  mir4_ultimate_4: arbalist('nova', 'holy', '#ffd84f'),

  mir4_skill_5201: lancer('strike', 'storm', '#86dfff'),
  mir4_skill_5101: lancer('strike', 'physical', '#d8f2ff'),
  mir4_skill_5104: lancer('strike', 'fire', '#ff9852'),
  mir4_skill_5301: lancer('strike', 'physical', '#edf7ff'),
  mir4_skill_5401: lancer('nova', 'storm', '#72d9ff'),
  mir4_skill_5102: lancer('strike', 'fire', '#ffb44d'),
  mir4_skill_5103: lancer('strike', 'storm', '#a8eaff'),
  mir4_skill_5303: lancer('strike', 'physical', '#c8d8e8'),
  mir4_skill_5403: lancer('buff', 'storm', '#c3f4ff'),
  mir4_skill_5205: lancer('bolt', 'physical', '#fff0a2'),
  mir4_skill_5304: lancer('heal', 'shadow', '#d07cff'),
  mir4_skill_5202: lancer('dash', 'storm', '#73d8ff'),
  mir4_ultimate_5: lancer('nova', 'storm', '#55cfff'),
};

function variation(abilityId: string): number {
  let value = 0;
  for (const char of abilityId) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value % 7;
}

function compact(abilityId: string, profile: Mir4VfxProfile): AbilityVfxSpec {
  const v = variation(abilityId);
  const isArea = ['nova', 'burst', 'cc', 'heal', 'buff'].includes(profile.archetype);
  return {
    c: profile.tint,
    p: profile.palette,
    pw: 1.05 + v * 0.055,
    sp: 20 + v * 4,
    ...(isArea ? { rg: 0.9 + v * 0.08, vr: 1 as const } : {}),
    ...(profile.archetype === 'bolt'
      ? { b: { v: 18 + v * 2, h: 0.8 + v * 0.05, vl: 1 + (v % 3) } }
      : {}),
    ...(profile.palette === 'fire' || profile.palette === 'physical' ? { db: 1 as const } : {}),
    ...(profile.palette === 'shadow' || profile.palette === 'nature' ? { sm: 1 as const } : {}),
    li: 0.7 + v * 0.08,
    lg: 0.75 + v * 0.16,
    ...(abilityId.startsWith('mir4_ultimate_') ? { fin: 1 as const, spin: 1 as const } : {}),
    a: profile.archetype,
  };
}

function full(abilityId: string, profile: Mir4VfxProfile): AbilityVfxFullSpec {
  const v = variation(abilityId);
  const areaRadius = 4.5 + v * 0.45;
  const ultimate = abilityId.startsWith('mir4_ultimate_');
  return {
    archetype: profile.archetype,
    palette: profile.palette,
    tint: profile.tint,
    accent: profile.accent,
    rim: profile.rim,
    power: (ultimate ? 1.65 : 1.05) + v * 0.055,
    windupStyle:
      profile.archetype === 'bolt'
        ? 'orb'
        : profile.archetype === 'buff' || profile.archetype === 'heal'
          ? 'runes'
          : profile.archetype === 'dash' || profile.archetype === 'strike'
            ? 'weapon'
            : 'compression',
    motifs:
      profile.archetype === 'heal'
        ? ['fountain']
        : profile.archetype === 'buff'
          ? ['barrier']
          : profile.archetype === 'cc'
            ? ['chains']
            : profile.archetype === 'nova'
              ? ['crescents']
              : undefined,
    motifAt: profile.archetype === 'buff' || profile.archetype === 'heal' ? 'caster' : 'target',
    linger: 0.75 + v * 0.16,
    ...(profile.archetype === 'bolt'
      ? {
          bolt: {
            speed: 18 + v * 2,
            headScale: 0.8 + v * 0.05,
            style: profile.palette === 'physical' ? ('arrow' as const) : ('comet' as const),
            core: profile.tint,
            accent: profile.accent,
            volley: 1 + (v % 3),
            tracer: true,
          },
        }
      : {}),
    ...(profile.archetype === 'strike' || profile.archetype === 'dash'
      ? {
          strike: {
            swings: 1 + (v % 3),
            arc: (v % 2 === 0 ? 'thrust' : 'sweep') as 'thrust' | 'sweep',
            groundSlam: v % 3 === 0,
          },
        }
      : {}),
    ...(profile.archetype === 'nova' || profile.archetype === 'heal'
      ? { nova: { radius: areaRadius } }
      : {}),
    ...(profile.archetype === 'cc' ? { cc: { style: 'tendrils' as const } } : {}),
    ...(profile.archetype === 'buff'
      ? { buff: { style: 'raise' as const, orbit: profile.tint, shellDur: 0.8 + v * 0.1 } }
      : {}),
    impact: {
      trail: profile.archetype === 'strike' || profile.archetype === 'dash' ? 'sweep' : undefined,
      sparks: 20 + v * 4,
      light: 0.7 + v * 0.08,
      flipbook: profile.palette === 'fire' || profile.palette === 'storm',
      ring: ['nova', 'burst', 'cc', 'heal', 'buff'].includes(profile.archetype)
        ? 0.9 + v * 0.08
        : false,
      vRing: ['nova', 'burst', 'cc'].includes(profile.archetype),
      debris: profile.palette === 'physical' || profile.palette === 'fire',
      smoke: profile.palette === 'shadow' || profile.palette === 'nature',
    },
    finisher: ultimate,
    screenFx: ultimate,
  };
}

export function mir4ClassVfxSpec(abilityId: string): AbilityVfxSpec | undefined {
  const profile = PROFILES[abilityId];
  return profile ? compact(abilityId, profile) : undefined;
}

export function mir4ClassVfxFullSpec(abilityId: string): AbilityVfxFullSpec | undefined {
  const profile = PROFILES[abilityId];
  return profile ? full(abilityId, profile) : undefined;
}
