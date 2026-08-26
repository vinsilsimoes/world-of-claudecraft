// Presentation-only bridge between MIR4 Spirit identities and existing World
// of Aeldrune creature art. No extracted MIR4 asset is referenced here.

export interface Mir4SpiritPresentation {
  visualKey: string;
  portraitMobId: string;
}

export const MIR4_SPIRIT_PRESENTATIONS: Readonly<Record<string, Mir4SpiritPresentation>> = {
  'spirit-common-01': { visualKey: 'mob_glimmerwisp', portraitMobId: 'glimmerwisp' },
  'spirit-common-02': { visualKey: 'mob_duskwisp', portraitMobId: 'duskwisp' },
  'spirit-common-03': { visualKey: 'mob_ghost', portraitMobId: 'lily_wisp' },
  'spirit-common-04': { visualKey: 'mob_glub', portraitMobId: 'sporeling_gatherer' },
  'spirit-uncommon-01': { visualKey: 'mob_emberkin', portraitMobId: 'emberkin' },
  'spirit-uncommon-02': { visualKey: 'mob_mushroom_pixie', portraitMobId: 'mushroom_pixie' },
  'spirit-uncommon-03': { visualKey: 'mob_treant', portraitMobId: 'orchard_treant' },
  'spirit-uncommon-04': { visualKey: 'mob_spearjaw', portraitMobId: 'deepfen_spearjaw' },
  'spirit-rare-01': { visualKey: 'mob_fox', portraitMobId: 'gloam_fox' },
  'spirit-rare-02': { visualKey: 'mob_gravewing', portraitMobId: 'necromancy_gravewing' },
  'spirit-rare-03': { visualKey: 'mob_dragonkin_whelp', portraitMobId: 'dragonkin_whelp' },
  'spirit-rare-04': { visualKey: 'mob_water_elemental', portraitMobId: 'water_elemental' },
  'spirit-epic-01': { visualKey: 'mob_gloomshade', portraitMobId: 'gloomshade' },
  'spirit-epic-02': { visualKey: 'mob_demon_flying', portraitMobId: 'warlock_imp' },
  'spirit-epic-03': { visualKey: 'mob_veiled_stag', portraitMobId: 'veiled_stag' },
  'spirit-epic-04': { visualKey: 'skel_golem', portraitMobId: 'ancient_guardian' },
  'spirit-epic-05': { visualKey: 'mob_stag', portraitMobId: 'gilded_stag' },
  'spirit-epic-06': { visualKey: 'mob_nightkin', portraitMobId: 'nightkin_stargazer' },
  'spirit-legendary-01': { visualKey: 'mob_pyre_colossus', portraitMobId: 'pyre_colossus' },
  'spirit-legendary-02': {
    visualKey: 'mob_dragonkin_matriarch',
    portraitMobId: 'cindraleth_maw_matriarch',
  },
  'spirit-legendary-03': { visualKey: 'mob_aurelhorn', portraitMobId: 'aurelhorn' },
  'spirit-legendary-04': { visualKey: 'skel_warrior', portraitMobId: 'barrow_king' },
  'spirit-legendary-05': { visualKey: 'rift_ritualist', portraitMobId: 'rift_boss_ritualist' },
  'spirit-legendary-06': { visualKey: 'mob_yeti', portraitMobId: 'frostmane_yeti' },
  'spirit-mythical-01': {
    visualKey: 'mob_dragonkin_broodlord',
    portraitMobId: 'drakemaw_broodlord',
  },
  'spirit-mythical-02': { visualKey: 'mob_dark_caster', portraitMobId: 'sister_nhalia' },
  'spirit-mythical-03': { visualKey: 'skel_boss', portraitMobId: 'morthen' },
  'spirit-mythical-04': { visualKey: 'mob_demonalt', portraitMobId: 'warlock_voidwalker' },
  'spirit-mythical-05': { visualKey: 'mob_bull', portraitMobId: 'the_topiary_bull' },
  'spirit-mythical-06': { visualKey: 'mob_stable_horse', portraitMobId: 'stable_horse' },
};

export function mir4SpiritPresentation(spiritId: string): Mir4SpiritPresentation | null {
  return MIR4_SPIRIT_PRESENTATIONS[spiritId] ?? null;
}

export function mir4SpiritPortraitUrl(spiritId: string): string | null {
  const presentation = mir4SpiritPresentation(spiritId);
  return presentation ? `/ui/mobs/${encodeURIComponent(presentation.portraitMobId)}.webp` : null;
}
