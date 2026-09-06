import { describe, expect, it } from "vitest";
import {
  mir4ActionId,
  mir4ActionRawDamage,
} from "../../src/sim/mir4/action_abilities";
import { classAbilityNamesEn } from "../../src/ui/i18n.catalog/abilities";

describe("MIR4 Lancer 5403 Wind Wall tooltip fidelity", () => {
  it("uses the same five-contact hybrid allocation as live combat", () => {
    expect(mir4ActionRawDamage(mir4ActionId(5403), 1, 1_000, 1_000)).toBe(
      2_200,
    );
    expect(mir4ActionRawDamage(mir4ActionId(5403), 10, 1_000, 1_000)).toBe(
      2_649,
    );
  });

  it("describes every combat-facing base effect and rank milestone", () => {
    expect(classAbilityNamesEn.entities.abilities.mir4_skill_5403).toEqual({
      name: "Wind Wall",
      description:
        "Twirls the spear into a wall of wind, striking up to 8 enemies in front of you over 5 contacts for {damage} total Physical and Spell damage. You are immune to control effects for 1.5 sec while casting. Grants 20% All Damage Reduction for 5 sec and 15% +3% per rank Bash Damage Reduction for 15 sec. Grants 5%/15%/20%/30% Monster Damage Reduction for 8/8/12/15 sec at ranks 1/5/8/10 and 20%/30% Boss Damage Reduction for 12/15 sec at ranks 8/10. At ranks 5/8/10, party members gain 30%/50%/70% All Damage Reduction for 4/6/8 sec, 20%/35%/50% Boss Damage Reduction for 6 sec, and 20/60/100 Spell Attack while a qualifying Lancer remains in the party.",
    });
  });
});
