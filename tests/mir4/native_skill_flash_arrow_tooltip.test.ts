import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Flash Arrow tooltip', () => {
  it('describes the reviewed direct shot, field pulses and rank effects', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4107.description).toBe(
      'Fires a flash arrow at the selected target, dealing {damage} Physical damage to up to 5 enemies within 4.5 yards and creating a 6-yard flash field for 6 sec. The field releases 6 non-damaging pulses. Every direct hit or pulse reduces Accuracy by 50 plus 10 per skill rank for 1 sec. Grants 1 Focus. At ranks 1/5/8/10, the direct hit Marks enemies for 5/8/10/10 sec, reducing CRIT EVA by 25. At ranks 5/8/10, it also reduces Accuracy by 50/100/200 for 5 sec and CRIT by 100/200/400 for 8 sec. At ranks 8/10, it applies Darkness for 10 sec, stacking up to 3 times. Against enemies in Darkness, it has a 40-50%/60-70%/80-100% chance at ranks 5/8/10 to Blind for 2/3/5 sec, based on Darkness stacks.',
    );
  });
});
