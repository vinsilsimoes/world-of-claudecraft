# Aeldrune MIR4 class parity

## Goal

Aeldrune uses the existing World of ClaudeCraft models, animations, VFX and equipment silhouettes while matching the combat identity of MIR4 classes as closely as the current runtime safely supports. No MIR4 art, audio or extracted asset is shipped.

## Official references

The implementation is based on the official MIR4 class creation guide, official skill tome catalog, official class balance notes and official class announcements:

- [Original playable class roster](https://forum.mir4global.com/post/348?lang=en)
- [Official skill names by class](https://forum.mir4global.com/post/67?lang=en&sorttype=1)
- [All class balance and class identity changes](https://forum.mir4global.com/post/1421?lang=en&sorttype=1)
- [Arbalist class announcement](https://forum.mir4global.com/post/344?lang=es&loaded=1)
- [Darkist class announcement](https://forum.mir4global.com/post/1224?lang=en)
- [Lionheart class announcement](https://forum.mir4global.com/post/2160?lang=en&sorttype=1)

## Shipped roster identity

| Stable key     | Product class | Combat role                     | Runtime presentation        | Signature action |
| -------------- | ------------- | ------------------------------- | --------------------------- | ---------------- |
| `warrior`      | Warrior       | Durable frontline control       | WoC warrior and knight set  | Dragon Flame     |
| `elementalist` | Sorcerer      | Long range magic artillery      | WoC mage and mage set       | Dragon Tornado   |
| `taoist`       | Taoist        | Hybrid support and area control | WoC shaman and druid set    | Ray of Light     |
| `arbalist`     | Arbalist      | Long range physical marksman    | WoC hunter and ranger set   | Arrow Rain       |
| `lancer`       | Lancer        | Mobile hybrid melee control     | WoC paladin and paladin set | Dragon Spear     |

The internal `elementalist` key remains unchanged because it is stored in character records and network payloads. Only its product name changes to Sorcerer. Class ids, item ids, creation anchors and saved equipment remain compatible.

## Active skill mapping

Each class has twelve regular skills in official MIR4 order plus its signature Ultimate. The runtime reproduces the official combat identity with deterministic Aeldrune mechanics and existing WoC assets.

| Class    | Aeldrune skill sequence                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warrior  | Void Slash, Splitting Slash, Body Check, Ground Smash, Gale Slash, Lion's Roar, Riposte, Iron Shackle, Crescent Strike, Berserk, Barbaric Charge, Unbreakable Stance          |
| Sorcerer | Flame Orb, Frost Orb, Dark Vortex, Thunderstorm, Magic Shield, Blizzard, Chain Lightning, Flame Strike, Soul Devour, Immolate, Phoenix Embrace, Frozen Block                  |
| Taoist   | Moonlight Wave, Sunbeam Sword, Moonlight Orb, Rain of Blades, Heal, Piercing Blades, Guardian Circle, Tai Chi, Blasting Charm, Soaring Slash, Expulsion Circle, Greater Heal  |
| Arbalist | Quick Shot, Painstrike Gale, Illusion Arrow, Burst Shell, Flash Arrow, Heavenly Bow, Mind's Eye, Ice Cage, Obliterate Shell, Venom Mist Shell, Seeking Bolt, Cloaking         |
| Lancer   | Ravaging Blow, Crescent Blade, Nirvana Kick, Double Strike, Sweeping Storm, Dragon Tail, Ascending Dragon, Crushing Blow, Wind Wall, Piercing Spear, Absorption, Blitz Strike |

Taoist Heal restores the caster and up to four nearby party members in the same party or raid subgroup. Warrior Dragon Flame restores ten percent of maximum health when committed. The class selection screen describes the actual role, range, damage channel and tradeoffs instead of showing only the weapon.

## Deliberate Aeldrune rules

- Every class follows the original MIR4 class-level requirements: four creation skills, then levels 5, 8, 16, 24, 32, 40, 48 and 56.
- Class Ultimates are available from level 1 and still require their own full combat gauge.
- The prototype's five invented class passives are not part of the official active kits and are not exposed or applied.
- Every active skill advances through Aeldrune ranks 1 to 15 and consumes the existing knowledge tome progression.
- Existing characters keep their class key, equipment, skill ranks, hotbar and progression.
- WoC runtime assets remain the only visual and audio source.

These rules are product decisions already established for Aeldrune and take precedence over MIR4 tier and asset behavior.

## Roster expansion gate

Official MIR4 now also includes Darkist and Lionheart, with Spirit Summoner introduced later. They must not be exposed as selectable Aeldrune classes until each class has all of the following:

1. A complete level table through the Aeldrune cap.
2. Six class specific equipment ranks for every slot.
3. Twelve regular skills, one signature Ultimate and deterministic Auto Battle behavior.
4. A distinct WoC native presentation with weapon and attack animation coverage.
5. Persistence, wire, creation, Codex, crafting, loot and campaign balance tests.

This gate prevents a newly listed class from falling back to Warrior stats, Warrior gear or placeholder visuals.
