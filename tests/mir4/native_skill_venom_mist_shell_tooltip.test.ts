import { describe, expect, it } from "vitest";
import { mir4ActionRawDamage } from "../../src/sim/mir4/action_abilities";
import { classAbilityNamesEn } from "../../src/ui/i18n.catalog/abilities";

describe("MIR4 Venom Mist Shell tooltip", () => {
  it.each([1_000, 2_000])(
    "shows the same nine-hit total as combat at %i Attack Power",
    (power) => {
      expect(mir4ActionRawDamage("mir4_skill_4104", 1, power, 0)).toBe(
        power * 2.75,
      );
    },
  );

  it("describes the native projectile, field, Focus, debuffs, block, and passive", () => {
    expect(
      classAbilityNamesEn.entities.abilities.mir4_skill_4104.description,
    ).toBe(
      "Launches a curved poison shell at the selected target, dealing {damage} total Physical damage over 9 hits: one 6-yard impact followed by 8 pulses from a 4.5-yard poison field, with each hit affecting up to 6 enemies. Grants 1 Focus. At ranks 1/5/8/10, the direct hit Marks enemies and applies Darkness for 5/8/10/10 sec. Mark reduces CRIT EVA by 25, while each Darkness stack reduces Silence Resistance by 25%, stacking up to 3 times. At ranks 5/8/10, the direct hit reduces Skill Healing by 30%/40%/50% for 10/15/20 sec. At ranks 8/10, it has a 50%/90% chance to apply an additional Darkness stack and prevents new Invincible effects for 10/20 sec; this restriction cannot be removed. At rank 10, it also reduces HP Potion Recovery by 10% for 20 sec. Learning ranks 8/10 grants 10%/15% Boss Damage Reduction.",
    );
  });
});
