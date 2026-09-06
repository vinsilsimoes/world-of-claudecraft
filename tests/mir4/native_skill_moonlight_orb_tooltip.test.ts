import { describe, expect, it } from 'vitest';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { pt_BR } from '../../src/ui/i18n.locales/pt_BR';

describe('MIR4 Moonlight Orb tooltip', () => {
  it('shows the direct strike plus eight field contacts as one exact total', () => {
    expect(mir4ActionRawDamage(mir4ActionId(3301), 1, 0, 1000)).toBe(2350);
    expect(mir4ActionRawDamage(mir4ActionId(3301), 15, 0, 1000)).toBe(3050);
  });

  it('describes the fixed orb, nine impacts, cap, and inward pulls without a fake root', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_3301).toEqual({
      name: 'Moonlight Orb',
      description:
        "Creates a lunar orb at the selected enemy's location. It deals {damage} total Spell damage over 9 impacts to up to 6 enemies within 5.5 yards. Four field impacts pull enemies toward the orb; the other field impacts briefly interrupt them. The direct impact applies Quell for 8/10/12/15 sec at ranks 1/5/8/10, reducing Spell ATK by 25%. At ranks 5/8/10, it also reduces Skill DMG Reduction by 10% for 15 sec, 15% for 30 sec, or 20% for 30 sec; grants 4%/8%/12% Monster ATK DMG; grants the party 20/60/100 PHYS and Spell DEF; and has a 35%/70%/100% chance against monsters or 20%/40%/60% against players to remove one enhancement. At ranks 8/10, it also applies Chaos for 10 sec, reducing PHYS ATK by 25%, and has a 40%/60% chance to remove Magic Shield or Stealth. Rank 10 also reduces Critical Evasion by 300 for 10 sec.",
    });
    expect(pt_BR['entities.abilities.mir4_skill_3301.name']).toBe('Esfera Lunar');
    expect(pt_BR['entities.abilities.mir4_skill_3301.description']).toBe(
      'Cria uma esfera lunar no local do inimigo selecionado. Ela causa {damage} de dano Mágico total em 9 impactos contra até 6 inimigos em um raio de 5,5 jardas. Quatro impactos do campo puxam os inimigos em direção à esfera; os demais impactos do campo os interrompem brevemente. O impacto direto aplica Supressão por 8/10/12/15 s nos graus 1/5/8/10, reduzindo o ATQ Mágico em 25%. Nos graus 5/8/10, também reduz a Redução de Dano de Habilidade em 10% por 15 s, 15% por 30 s ou 20% por 30 s; concede 4%/8%/12% de Dano contra Monstros; concede ao grupo 20/60/100 de DEF Física e Mágica; e tem 35%/70%/100% de chance contra monstros ou 20%/40%/60% contra jogadores de remover um aprimoramento. Nos graus 8/10, também aplica Caos por 10 s, reduzindo o ATQ Físico em 25%, e tem 40%/60% de chance de remover Escudo Mágico ou Furtividade. O grau 10 também reduz a Evasão Crítica em 300 por 10 s.',
    );
  });
});
