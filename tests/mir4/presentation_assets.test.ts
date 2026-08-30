import { describe, expect, it } from 'vitest';
import { abilityVfxFullSpec, abilityVfxSpec } from '../../src/render/ability_vfx_registry';
import { VISUALS, visualKeyFor } from '../../src/render/characters/manifest';
import {
  MIR4_ARC_NPC_IDENTITIES,
  MIR4_QUESTS_ARC,
  mir4ArcNpcTemplateId,
} from '../../src/sim/content/mir4/arc_campaign';
import { MIR4_CLASS_PASSIVES } from '../../src/sim/content/mir4/passives';
import { MIR4_SKILLS, mir4SkillsForClass } from '../../src/sim/content/mir4/skills_runtime';
import {
  MIR4_ACTION_ABILITY_DEFS,
  mir4ActionId,
  mir4UltimateActionId,
} from '../../src/sim/mir4/action_abilities';
import { stageMobSource } from '../../src/sim/mir4/arc_encounters';
import { MIR4_ARC_COMBAT_STAGE_KINDS } from '../../src/sim/mir4/arc_stage_kinds';
import {
  abilityIconRecipe,
  abilityImageUrl,
  hasExplicitAbilityIcon,
  MIR4_ABILITY_IMAGE_ALIASES,
} from '../../src/ui/icons';

describe('MIR4 presentation reuses the native WoC asset inventory', () => {
  it('renders all five logical classes with distinct existing WoC character bodies', () => {
    const keys = [1, 2, 3, 4, 5].map((classId) =>
      visualKeyFor({
        kind: 'player',
        templateId: 'warrior',
        mir4: { classId },
      } as never),
    );

    expect(keys).toEqual([
      'player_warrior',
      'player_mage',
      'player_shaman',
      'player_hunter',
      'player_paladin',
    ]);
    expect(new Set(keys).size).toBe(5);
    expect(keys.every((key) => VISUALS[key] !== undefined)).toBe(true);
  });

  it('uses the wire presentation class for a remote MIR4 player', () => {
    expect(
      visualKeyFor({
        kind: 'player',
        templateId: 'warrior',
        mir4VisualClassId: 2,
      } as never),
    ).toBe('player_mage');
  });

  it('distributes campaign NPCs across the existing WoC role silhouettes', () => {
    const keys = MIR4_ARC_NPC_IDENTITIES.map((npc) =>
      visualKeyFor({
        kind: 'npc',
        templateId: mir4ArcNpcTemplateId(npc.id),
        name: npc.name,
      } as never),
    );

    expect(new Set(keys).size).toBeGreaterThanOrEqual(7);
    expect(keys.every((key) => VISUALS[key] !== undefined)).toBe(true);
    expect(keys.filter((key) => key === 'npc_villager').length).toBeLessThan(keys.length / 2);
  });

  it('classifies NPC roles from their unique name without map-name contamination', () => {
    const tarek = visualKeyFor({
      kind: 'npc',
      templateId: 'mir4_m15_caldeira_de_cinerita_tarek_duas_pontes',
      name: 'Tarek Duas-Pontes',
    } as never);
    const tarekWithoutMap = visualKeyFor({
      kind: 'npc',
      templateId: 'mir4_runtime_tarek_duas_pontes',
      name: 'Tarek Duas-Pontes',
    } as never);
    expect(tarek).toBe(tarekWithoutMap);
    expect(
      visualKeyFor({
        kind: 'npc',
        templateId: 'mir4_lenna',
        name: 'Guarda Lenna',
      } as never),
    ).toBe('npc_knight');
    expect(
      visualKeyFor({
        kind: 'npc',
        templateId: 'mir4_sera',
        name: 'Almirante Sera',
      } as never),
    ).toBe('npc_knight');
    expect(
      visualKeyFor({
        kind: 'npc',
        templateId: 'mir4_ada',
        name: 'Carpinteira Ada',
      } as never),
    ).toBe('npc_smith');
    expect(
      visualKeyFor({
        kind: 'npc',
        templateId: 'mir4_pavio',
        name: 'Guia Pavio',
      } as never),
    ).toBe('npc_scout');
    expect(
      visualKeyFor({
        kind: 'npc',
        templateId: 'mir4_mirena',
        name: 'Rainha Mirena',
      } as never),
    ).toBe('npc_knight');
  });

  it('maps every campaign combat source to a real WoC monster instead of mob_bandit', () => {
    const sources = MIR4_QUESTS_ARC.flatMap((quest) =>
      quest.stages.flatMap((stage, stageIndex) => {
        if (!MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) return [];
        const source = stageMobSource(stage, 0);
        return source
          ? [
              {
                source,
                templateId: `mir4_quest_${quest.questId.toLowerCase()}_${stageIndex}_0_test`,
              },
            ]
          : [];
      }),
    );
    const keys = sources.map(({ source, templateId }) =>
      visualKeyFor({ kind: 'mob', templateId, name: source } as never),
    );

    expect(sources.length).toBeGreaterThan(100);
    expect(new Set(keys).size).toBeGreaterThanOrEqual(18);
    expect(keys).not.toContain('mob_bandit');
    expect(keys.every((key) => VISUALS[key] !== undefined)).toBe(true);
  });

  it('maps field, qualified and escort-ambush MIR4 mobs to native monster bodies', () => {
    const keys = [
      visualKeyFor({
        kind: 'mob',
        templateId: 'mir4_forest_wolf',
        name: 'Forest Wolf',
      } as never),
      visualKeyFor({
        kind: 'mob',
        templateId: 'mir4_m01-vila-do-vau_forest_wolf',
        name: 'Forest Wolf',
      } as never),
      visualKeyFor({
        kind: 'mob',
        templateId: 'mir4_escort_ambush_m02-q02_2_0_1',
        name: 'Reed Wolf',
      } as never),
    ];

    expect(keys).not.toContain('mob_bandit');
    expect(keys.every((key) => VISUALS[key] !== undefined)).toBe(true);

    expect(
      visualKeyFor({
        kind: 'mob',
        templateId: 'mir4_escort_m02-q02_2_42',
        name: 'Maela Reedwalker',
      } as never),
    ).toMatch(/^npc_/);
    expect(
      visualKeyFor({
        kind: 'mob',
        templateId: 'mir4_escort_ambush_m02-q02_2_0_43',
        name: 'Road Ambusher',
      } as never),
    ).toMatch(/^(mob_bruiser|mob_dark_caster|skel_rogue)$/);
  });

  it('gives every M01 ecology role an intentional native silhouette', () => {
    const visual = (mobId: string, name: string) =>
      visualKeyFor({
        kind: 'mob',
        templateId: `mir4_m01-vila-do-vau_${mobId}`,
        name,
      } as never);

    expect(visual('forest_wolf', 'Lobo')).toBe('mob_wolf');
    expect(visual('rabid_boar', 'Javali Enfurecido')).toBe('mob_boar');
    expect(visual('bandit_cutthroat', 'Salteador')).toBe('mob_bruiser');
    expect(visual('moss_skeleton', 'Esqueleto de Musgo')).toBe('skel_warrior');
    expect(visual('briar_guard', 'Guarda de Espinhos')).toBe('mob_wildheart_ravager');
    expect(visual('dire_wolf', 'Lobo Sinistro')).toBe('greyjaw');
  });

  it('gives every MIR4 skill and ultimate an explicit visual identity', () => {
    const abilityIds = [
      ...MIR4_SKILLS.map((skill) => mir4ActionId(skill.skillId)),
      ...([1, 2, 3, 4, 5] as const).map((classId) => mir4UltimateActionId(classId)),
    ];
    expect(MIR4_ABILITY_IMAGE_ALIASES).toEqual({});
    const recipes = abilityIds.map((id) => {
      expect(abilityImageUrl(id), id).toBeNull();
      expect(hasExplicitAbilityIcon(id), id).toBe(true);
      return JSON.stringify(abilityIconRecipe(id));
    });
    expect(new Set(recipes).size).toBe(abilityIds.length);
  });

  it('gives all five class kits authored VFX and a direct class-rig animation', () => {
    const classVisuals = {
      1: 'player_warrior',
      2: 'player_mage',
      3: 'player_shaman',
      4: 'player_hunter',
      5: 'player_paladin',
    } as const;

    for (const classId of [1, 2, 3, 4, 5] as const) {
      const abilityIds = [
        ...mir4SkillsForClass(classId).map((skill) => mir4ActionId(skill.skillId)),
        mir4UltimateActionId(classId),
      ];
      const clips = VISUALS[classVisuals[classId]].clips.attackByAbility ?? {};
      for (const id of abilityIds) {
        expect(abilityVfxSpec(id), `${id} compact VFX`).toBeDefined();
        expect(abilityVfxFullSpec(id), `${id} full VFX`).toBeDefined();
        expect(clips[id], `${id} rig animation`).toBeTruthy();
      }
    }
  });

  it('does not expose the removed prototype passives as MIR4 actions', () => {
    const passiveIds = MIR4_ACTION_ABILITY_DEFS.filter((def) => def.passive).map((def) => def.id);

    expect(Object.values(MIR4_CLASS_PASSIVES).flat()).toEqual([]);
    expect(passiveIds).toEqual([]);
  });
});
