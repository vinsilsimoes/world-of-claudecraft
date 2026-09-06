import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';
import { pt_BR } from '../../src/ui/i18n.locales/pt_BR';

describe('MIR4 Illusion Arrow tooltip', () => {
  it('describes the reviewed English runtime without stale prototype behavior', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4102.description).toBe(
      'Deals {damage} total Physical damage over 5 hits to up to 8 enemies within 10 yards around you. The second and fourth hits knock enemies slightly away. Grants 1 Focus, and you are immune to Knockdown and Stun while casting. At ranks 5/8/10, Evasion increases by 150/300/500 for 5 sec, critical hits gain 10%/20%/50% Skill ATK DMG, and damage against monsters increases by 15%/30%/50%.',
    );
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4102.description).not.toContain('65%');
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4102.description).not.toContain(
      '3 other enemies',
    );
  });

  it('uses the official Portuguese name and the same mechanical contract', () => {
    expect(pt_BR['entities.abilities.mir4_skill_4102.name']).toBe('Seta da Ilusão');
    const text = pt_BR['entities.abilities.mir4_skill_4102.description'] ?? '';
    expect(text).toContain('5 golpes');
    expect(text).toContain('até 8 inimigos');
    expect(text).toContain('10 jardas');
    expect(text).toContain('150/300/500');
    expect(text).toContain('15%/30%/50%');
  });
});
