import { describe, expect, it } from "vitest";
import { classAbilityNamesEn } from "../../src/ui/i18n.catalog/abilities";

describe("MIR4 Cloaking tooltip", () => {
  it("describes movement, decoy, threat reset and every official rank band", () => {
    expect(
      classAbilityNamesEn.entities.abilities.mir4_skill_4112.description,
    ).toBe(
      "Leaves a decoy at your starting position, surges 10 yards forward, and enters Cloaking for up to 2 sec. After 0.72 sec, the decoy deals 90% Physical ATK plus 2% per additional skill rank to up to 8 enemies within 3.5 yards and Knocks them Back 0.3 yards. Cloaking ends Auto-Battle and drops monster threat. When Cloaking ends, increases Skill ATK DMG by 20% for 2 sec. At rank 5, Cloaking lasts up to 3 sec, restores 10% Max HP, and the exit bonus becomes 30%. At rank 8, Cloaking lasts up to 4 sec, restores 20% Max HP, and the exit bonus becomes 50%; the skill can be used while Silenced, and Cloaking grants 25% All DMG Reduction, 20% Knockdown Resistance, and 1 yard per second of Move Speed. At rank 10, Cloaking lasts up to 5 sec, restores 30% Max HP, and the exit bonus becomes 80%; its defenses become 50% All DMG Reduction, 50% Knockdown Resistance, 50% Stun Resistance, and 3 yards per second of Move Speed.",
    );
  });
});
