import { describe, expect, it } from 'vitest';
import { mir4ActionRawDamage, mir4UltimateActionId } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { pt_BR } from '../../src/ui/i18n.locales/pt_BR';

describe('MIR4 Light Ray tooltip', () => {
  it('adds the exact Physical and Spell damage channels', () => {
    expect(mir4ActionRawDamage(mir4UltimateActionId(3), 1, 1_000, 2_000)).toBe(9_000);
  });

  it('describes the extracted contacts, frontal reach, cap, and source protections', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_ultimate_3).toEqual({
      name: 'Ray of Light',
      description:
        'Strikes up to 10 enemies in a 16-yard frontal path over 7 contacts for {damage} combined Physical and Spell damage. Grants Invincibility for 3 sec and Control Immunity for 5 sec. Requires a full Ultimate gauge.',
    });
  });

  it('keeps the Portuguese tooltip equally explicit and removes the stale three-impact claim', () => {
    const description = pt_BR['entities.abilities.mir4_ultimate_3.description'];

    expect(description).toBe(
      'Atinge até 10 inimigos em uma trajetória frontal de 16 jardas ao longo de 7 contatos, causando {damage} de dano Físico e Mágico combinados. Concede Invencibilidade por 3 s e Imunidade a Controle por 5 s. Requer o medidor de ultimate cheio.',
    );
    expect(description).not.toContain('3 impactos');
  });
});
