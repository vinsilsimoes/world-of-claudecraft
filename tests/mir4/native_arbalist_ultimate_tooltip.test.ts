import { describe, expect, it } from 'vitest';
import { mir4ActionRawDamage, mir4UltimateActionId } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { pt_BR } from '../../src/ui/i18n.locales/pt_BR';

describe('MIR4 Arrow Rain tooltip', () => {
  it('uses Physical Attack across the five exact native contact coefficients', () => {
    expect(mir4ActionRawDamage(mir4UltimateActionId(4), 1, 1000, 100_000)).toBe(6500);
  });

  it('describes the widening sectors, movement, reactions and source buffs', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_ultimate_4).toEqual({
      name: 'Arrow Rain',
      description:
        'Fires 5 widening frontal waves, each striking up to 10 enemies for {damage} total Physical damage. The waves expand from 55 degrees and 21 yards to 120 degrees and 25 yards while you step 1 yard backward after each shot. The first and third waves Knock Back 0.4 and 0.2 yards. Grants Invincibility for 3 sec and 1 Focus. Requires a full Ultimate gauge.',
    });
  });

  it('keeps the Portuguese tooltip equally explicit and removes the stale three-impact claim', () => {
    const description = pt_BR['entities.abilities.mir4_ultimate_4.description'];
    expect(description).toBe(
      'Dispara 5 ondas frontais crescentes, cada uma atingindo até 10 inimigos e causando {damage} de dano Físico total. As ondas aumentam de 55 graus e 21 jardas para 120 graus e 25 jardas enquanto você recua 1 jarda após cada disparo. A primeira e a terceira ondas empurram 0,4 e 0,2 jarda. Concede Invencibilidade por 3 s e 1 Foco. Requer o medidor de ultimate cheio.',
    );
    expect(description).not.toContain('3 impactos');
  });
});
