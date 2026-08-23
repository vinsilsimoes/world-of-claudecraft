import { describe, expect, it } from 'vitest';
import { mir4MobVisualKey } from '../../src/render/characters/mir4_presentation_core';

describe('M04 native WoC monster presentation', () => {
  it.each([
    ['bandit_cutthroat', 'Salteador', 'mob_wildheart_stalker'],
    ['moss_skeleton', 'Esqueleto de Musgo', 'skel_warrior'],
    ['briar_guard', 'Guarda de Espinhos', 'mob_wildheart_ravager'],
    ['dire_wolf', 'Lobo Sinistro', 'greyjaw'],
    ['forest_wolf', 'Lobo', 'mob_wolf'],
    ['crypt_rat', 'Rato da Cripta', 'mob_grix'],
    ['skeleton_spearman', 'Lanceiro Esqueleto', 'skel_warrior'],
  ])('maps %s to the explicit %s body', (mobId, name, expected) => {
    expect(mir4MobVisualKey(`mir4_m04-ruinas-da-encosta_${mobId}`, name)).toBe(expected);
  });

  it.each([
    ['mir4_guardian_m04-q01_4', 'Carrasco da Encosta', 'mob_bruiser'],
    ['mir4_survival_m04-q03_4', 'Alfa da Muralha', 'greyjaw'],
    ['mir4_guardian_m04-q04_4', 'Mestre das Chaves', 'mob_dark_caster'],
    ['mir4_dungeon_guard_m04-q05_5_1', 'Lanceiro Verde', 'skel_warrior'],
    ['mir4_guardian_m04-q06_3', 'ancient_briar_colossus', 'mob_treant'],
  ])('maps the named encounter %s to %s', (templateId, name, expected) => {
    expect(mir4MobVisualKey(templateId, name)).toBe(expected);
  });
});
