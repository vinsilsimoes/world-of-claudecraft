import { describe, expect, it } from 'vitest';
import { classAbilityNamesEn } from '../../src/ui/i18n.catalog/abilities';

describe('MIR4 Ice Cage tooltip', () => {
  it('describes the reviewed eight-hit cage, Chill, controls and Darkness scaling', () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_4105.description).toBe(
      'Creates an ice cage at the selected target, dealing {damage} total Physical damage over 8 hits to up to 6 enemies within 5 yards and granting 1 Focus. The direct hit applies Chill for 5/8/10/10 sec at ranks 1/5/8/10, stacking up to 3 times and reducing Skill DMG Reduction by 25% per stack. Monsters also lose 0.5/0.5/1/1.5 yd/s of movement speed for 10 sec and, at ranks 5/8/10, have a 50%/100%/100% chance to Freeze for 3/3/5 sec. At ranks 5/8/10, Frostbite has a 10-30%/40-60%/60-80% chance based on Chill stacks to reduce movement speed by another 1 yd/s for 5/5/8 sec. At ranks 8/10, Severe Cold has a 20-30%/50-60% chance based on Chill stacks to Freeze for 3/5 sec, and the direct hit has a 20%/50% chance to disable Evasion for 10 sec. Against enemies with 2 or 3 Darkness stacks, all 8 hits deal 35% or 40% more damage at rank 8, and 60% or 70% more at rank 10.',
    );
  });
});
