import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { pt_BR } from '../../src/ui/i18n.locales/pt_BR';

describe('MIR4 Lancer 5201 Ravaging Blow tooltip fidelity', () => {
  it('uses the same six-contact hybrid allocation as live combat', () => {
    expect(mir4ActionRawDamage(mir4ActionId(5201), 1, 1_000, 1_000)).toBe(2_799);
    expect(mir4ActionRawDamage(mir4ActionId(5201), 15, 1_000, 1_000)).toBe(3_497);
  });

  it('describes the native movement, strips, target cap and reaction without the old slow', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5201).toEqual({
      name: 'Ravaging Blow',
      description:
        'Advances 2 yards, then strikes up to 8 enemies in a 5-yard-wide frontal path over 6 impacts, dealing {damage} total Physical and Spell damage. The path reaches 7 yards for the first 5 impacts and 7.5 yards for the final impact. The fourth impact Knocks enemies Back 1 yard.',
    });
    expect(pt_BR['entities.abilities.mir4_skill_5201.name']).toBe('Ataque Devastador');
    expect(pt_BR['entities.abilities.mir4_skill_5201.description']).toBe(
      'Avança 2 jardas e atinge até 8 inimigos em uma trajetória frontal de 5 jardas de largura ao longo de 6 impactos, causando {damage} de dano Físico e Mágico total. A trajetória alcança 7 jardas nos 5 primeiros impactos e 7,5 jardas no impacto final. O quarto impacto empurra os inimigos por 1 jarda.',
    );
    expect(pt_BR['entities.abilities.mir4_skill_5201.description']).not.toContain('lent');
  });
});
