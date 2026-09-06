import { describe, expect, it } from "vitest";
import { mir4ActionRawDamage } from "../../src/sim/mir4/action_abilities";
import { classAbilityNamesEn } from "../../src/ui/i18n.catalog/abilities";

describe("MIR4 Seeking Bolt tooltip", () => {
  it.each([1_000, 2_000])(
    "shows the same single-hit rank-1 damage as combat at %i Attack Power",
    (power) => {
      expect(mir4ActionRawDamage("mir4_skill_4110", 1, power, 0)).toBe(
        power * 4.2,
      );
    },
  );

  it("describes its homing shot, casting immunity, Focus, and rank milestones", () => {
    expect(
      classAbilityNamesEn.entities.abilities.mir4_skill_4110.description,
    ).toBe(
      "Fires a homing bolt at a selected target from up to 25 yards away, dealing {damage} Physical damage in 1 hit and granting 1 Focus. You are immune to Knockdown and Stun for 1.5 sec while casting. At ranks 5/8/10, a Critical Hit has a 20%/50%/100% chance to trigger Soul Destruction and attempt to Stun for 2/3/4 sec. At ranks 8/10, this skill cannot be evaded, reduces the target's Evasion by 200/300 for 5/10 sec, and learning the rank grants your party 20/50 Accuracy.",
    );
  });
});
