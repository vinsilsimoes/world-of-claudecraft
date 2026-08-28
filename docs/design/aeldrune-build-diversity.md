# Aeldrune build diversity and combat-stat model

Status: living design and runtime contract

This document defines how Aeldrune turns character status sources into build choices. It applies to the `mir4-gameplay-port` profile only. The original MIR4 numeric status ids remain stable, but Aeldrune owns the balancing rules that combine them.

The goal is not to make all 164 registered status rows into item affixes. The goal is to make a smaller set of understandable decisions matter. A status belongs in the build system only when it changes behavior, enables a synergy, counters another investment, or spends power that could have been invested elsewhere.

## Research conclusions

The design follows patterns that have survived live-service iteration in several RPGs:

- Diablo IV moved excess Critical Strike and Vulnerable bonuses out of separate mandatory multiplicative buckets and into additive scaling. The reason was build diversity: independent universal multipliers became requirements rather than choices. See [Diablo IV patch 1.2.0](https://news.blizzard.com/en-us/article/24092662/diablo-iv-patch-notes-1-0-1-2).
- Diablo IV later made equipment damage multipliers additive with each other before the result forms one multiplier. See [Lord of Hatred system changes](https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near).
- Path of Exile separates plentiful additive `increased` modifiers from rarer multiplicative `more` modifiers. Strong multiplicative supports need conditions, restrictions, or opportunity cost. See the [Path of Exile mechanics Q&A](https://www.pathofexile.com/forum/view-thread/1693154) and [Expedition balance manifesto](https://www.pathofexile.com/forum/view-thread/3147157).
- World of Warcraft removed Amplify because a universally best secondary stat stays mandatory even with diminishing returns. It also adopted more extreme secondary-stat distributions so items have identities beyond item level. See [Stat Updates for Warlords of Draenor](https://worldofwarcraft.blizzard.com/en-us/news/14322443/dev-watercooler-stat-updates-for-warlords-of-draenor) and [Itemization in 6.2](https://worldofwarcraft.blizzard.com/en-us/news/19162236/dev-watercooler-itemization-in-62).
- Last Epoch separates avoiding a critical strike from reducing its bonus damage. This keeps anti-critical investment useful without allowing a critical strike to deal less than a normal hit. See [Last Epoch Critical Strikes](https://support.lastepoch.com/hc/en-us/articles/46361891709211-Critical-Strikes).
- Guild Wars 2 converts control against bosses into Defiance Bar damage. This preserves a role for control builds without allowing permanent boss stun. See [ArenaNet's Defiance design explanation](https://www.guildwars2.com/en/news/meet-the-wyvern-in-guild-wars-2-heart-of-thorns/).
- Repeated player control needs a visible temporal limit. Diablo Immortal reduces repeated control within a short window and grants temporary immunity after enough cumulative hard control. See [Harvest Season update](https://news.blizzard.com/en-us/article/24230694/celebrate-the-coming-of-the-harvest-season).

The shared lesson is that more statistics do not create more builds by themselves. Limited budgets, counter-stats, soft caps, and explicit losses create builds.

## Current runtime findings

Before this program, Aeldrune had 164 registered status rows, but only a subset had a runtime consumer and an even smaller subset had an acquisition source. Important technical gaps included:

- Equipment had one linear item per class, slot, and progression rank. The generated `balanceBudget` was not used to create lateral choices.
- Enchantment and blessing could roll penetration or penetration defense, but both were saved as status id `0`. The accumulator rejected that id, so these rolls had no combat effect and lost their identity after loading.
- Offensive and defensive context modifiers cancelled each other in one additive expression. This made a large offensive value erase an equally large defensive investment.
- Critical avoidance was direct rating subtraction instead of a distinct defensive layer.
- Penetration defense was hard-coded to zero in the live defender projection.
- Root behaved like a complete stun, silence had no effect kind, blind did not consistently affect players, and burn behaved like vulnerability rather than periodic damage.
- Mount, Spirit, Codex, album, and training bonuses all accumulated. They increased account power but did not require a build decision.
- Derived values were recalculated from persisted sources, which is correct. That property must remain.

## Build-relevant status families

The runtime should expose approximately 20 to 30 primary build decisions. Other registered statuses remain valid as derived values, system modifiers, or content rewards.

| Family | Offensive choice | Defensive counter | Intended identity |
| --- | --- | --- | --- |
| Attack | Physical Attack, Spell Attack | Physical Defense, Spell Defense | Channel commitment |
| Contact | Accuracy | Evasion | Reliable contact versus avoidance |
| Critical | Critical Chance, Critical Power | Critical Avoidance, Critical Guard | Burst versus burst protection |
| Armor break | Penetration | Penetration Defense | Defense breaker versus stable mitigation |
| Delivery | Basic Damage, Skill Damage | Basic Reduction, Skill Reduction | Rotation identity |
| Context | Monster, Boss, or PvP Damage | Matching reduction | Specialized content loadout |
| Control | Stun, Debilitation, Silence, Knockdown power | Matching resistance and Tenacity | Disruption versus agency |
| Sustain | HP drain, MP drain, recovery, potion power | Burst and healing pressure | Long-fight efficiency |
| Tempo | Attack Speed, Cooldown Reduction, MP efficiency | Resource pressure | More actions versus stronger actions |
| Utility | Movement, gathering, mining, reward bonuses | Opportunity cost only | World and economy specialization |

`All Damage` and `All Damage Reduction` are not ordinary item affixes. They are powerful broad modifiers reserved for limited, conditional effects.

## Rating curve

Ratings use a hyperbolic response:

```text
share(rating, K) = rating / (rating + K)
```

`K` is the half-effect rating for a status at the actor's level. At `rating = K`, the player receives half of that status family's maximum effect. At `2K`, the result is two thirds. At `3K`, it is three quarters.

Level scaling uses a named reference curve rather than one constant from level 1 through 200. Persisted values remain ratings. Percentages are derived at runtime and never written to a save.

For a desired result, a designer can solve the half-effect constant rather than guess it:

```text
K = targetRating * (effectCap / targetEffect - 1)
```

Every cap and half-effect constant must be a named value with a direct test.

## Damage pipeline

The authoritative first-slice order is:

```text
base damage
  = class attack value * skill coefficient + authored flat damage

additive offense
  = all applicable equipment, Spirit, mount, Codex, training,
    basic or skill, physical or magic, and content-context bonuses

pre-mitigation damage
  = base damage
    * additive-offense factor
    * critical factor

final damage
  = pre-mitigation damage
    * applicable damage-reduction factor
    * raw-defense factor after penetration
    * shields and absorbs
```

Rare conditional factors are a future content lane. They must not be inserted
between these steps unless they have a named contract and rounding tests. The
runtime deliberately rounds after offense, after critical, after reduction,
and after raw defense so local play, server play, and deterministic replays
produce the same integer damage.

Bonuses from different permanent systems do not become independent multipliers. For example, 10 percent skill damage from equipment, 8 percent from a Spirit, and 5 percent from Codex form one 23 percent additive bucket.

Multiplicative effects are reserved for a condition, internal cooldown, active window, or explicit disadvantage. No always-on universal multiplier belongs in an ordinary affix pool.

### Offensive and defensive buckets

Offense and reduction use separate diminishing-return curves, then multiply:

```text
offenseFactor = 1 + effectiveOffense
defenseFactor = 1 - effectiveReduction
contextFactor = offenseFactor * defenseFactor
```

This prevents offense from deleting an equal defensive investment by subtraction. It also guarantees that increasing a defensive status never increases incoming damage.

Initial tuning limits:

- Additive offensive effect: soft cap with a hard ceiling of +150 percent.
- General damage reduction from status buckets: hard ceiling of 70 percent in PvE.
- PvP context affixes target a narrow 10 to 15 percent specialist band before systemic PvP tuning; the aggregate safety ceilings remain +100 percent offense and 60 percent reduction so legacy progression is admitted without overflow.
- Final context factor: never below 25 percent and never above 250 percent.

## Critical model

Critical offense and defense are two-stage contests:

```text
baseCriticalChance = critical chance rating curve
criticalAvoidance = critical avoidance rating curve
finalCriticalChance = baseCriticalChance * (1 - criticalAvoidance)

criticalBonus = base bonus + critical power rating curve
criticalGuard = critical guard rating curve
criticalMultiplier = 1 + criticalBonus * (1 - criticalGuard)
```

Initial limits:

- PvE critical chance ceiling: 60 percent.
- PvE critical damage ceiling: 250 percent of a normal hit.
- PvP critical damage ceiling: 175 percent of a normal hit.
- Critical Guard only reduces the bonus portion. A critical hit can never deal less than a normal hit.

## Accuracy and evasion

Accuracy and evasion are converted independently, then compared symmetrically:

```text
hitChance = 95 percent
  + accuracy contribution
  - evasion contribution
```

The admitted result is clamped between 50 and 99.5 percent whenever the defender owns Evasion. Equivalent investment cancels. A defender with exactly zero Evasion cannot evade and therefore remains a guaranteed hit, regardless of the attacker's Accuracy; this also guarantees that adding a positive stat never makes its owner worse. Field monsters receive level/family/rank Evasion, so Accuracy is still an active PvE build choice. The harmless first tutorial creature is the sole authored zero-Evasion exception.

The eventual online implementation should use deterministic entropy per attacker-target pair to avoid long streaks while retaining server authority. Independent random rolls remain in the first runtime slice for wire and replay compatibility.

## Defense and penetration

The compatibility runtime still resolves raw defense with the established formula:

```text
damageAfterDefense = damage * 100 / (100 + effectiveDefense)
```

That formula is intentionally preserved for player and item defense in the first slice. Accuracy, Evasion, Critical, and Critical Guard already use level-aware curves. Converting player raw defense to a level-aware curve remains an encounter-calibration slice rather than an untested side effect of item work.

Monsters now receive a deterministic opposition profile without acquiring a
player save-state bag:

```text
baseMobDefense(level) = floor(150 * level / (level + 50))
mobDefense = baseMobDefense * rankFactor * familyChannelFactor
```

Normal, Veteran, and Guardian rank factors are 1.00, 1.15, and 1.40.
Family factors trade Physical Defense, Magic Defense, and Evasion: for example,
Beasts are tougher physically and more evasive but weaker to magic, while
Elementals invert the Physical/Magic relationship. These are lateral encounter
identities, not universal rank upgrades. Existing WoC template armor is
converted to the equivalent MIR4 Physical Defense rating at equal level; it
never leaks into Magic Defense:

```text
mir4EquivalentDefense = floor(100 * classicArmor / (85 * level + 400))
```

Generated campaign-monster HP is normalized by its neutral defense factor so
this new layer does not accidentally double time-to-kill. Explicit template
overrides, including zero, remain authoritative. Defense Break multiplies the
resulting live Physical and Magic Defense before penetration, so it works on
ordinary, dynamic, elite, and boss mobs without manufacturing `Entity.mir4`.

The target defense curve for that later slice is:

```text
mitigation = cap * defense / (defense + defenseK(level))

netPenetration =
  penetrationCurve(attacker)
  - penetrationDefenseCurve(defender)

effectiveDefense = defense * (1 - netPenetration)
```

Limits already enforced in the first runtime slice:

- PvE net penetration ceiling: 50 percent.
- PvP net penetration ceiling: 35 percent.

Targets for the defense-curve calibration slice:

- PvE mitigation ceiling: 75 percent.
- PvP mitigation ceiling: 60 percent.

Defense Break changes defense before mitigation. Penetration changes the effective defense after the rating is assembled. They are distinct mechanics.

## Control model

Control families have separate behavior:

- Stun, Knockdown, Freeze, and Dazed block movement and actions.
- Root blocks movement only.
- Silence blocks skills but permits basic attacks and movement.
- Slow reduces movement.
- Blind reduces contact reliability or outgoing damage.
- Defense Break reduces defense rather than increasing every damage bucket.
- Burn is periodic damage and is not vulnerability.

Control duration is:

```text
duration = baseDuration
  * clamp(1 + controlPower - tenacity, 0.35, 1.50)
  * repeatedControlFactor
```

Player targets use a narrower 1.25 maximum duration multiplier. Existing official status rows remain authored basis points; a future Tenacity rating occupies its own curve and cannot silently reinterpret saved values.

The first player-control implementation uses these readable rules:

- A repeated hard control inside six seconds has 70 percent duration.
- Three cumulative seconds of hard control inside eight seconds grants 2.5 seconds of control immunity.
- Active cleanses and expensive special effects can grant direct immunity. Ordinary equipment cannot.

Boss control will become Stagger in a later slice. The planned baseline is `100 * base control seconds`, a visible shared bar, a 3 to 5 second break window, and temporary post-break resistance.

## Item power budget

Each item has a fixed budget derived from slot, rank, rarity, and enhancement. A higher rarity raises the budget, but does not remove choice.

Items separate the budget into limited families:

- Base item identity: class channel and primary defense.
- Up to two offensive prefixes.
- Up to two defensive or utility suffixes.
- At most one build-defining special effect on eligible items.

Affix families compete for those positions. An item cannot roll raw attack, critical, penetration, speed, control, defense, anti-critical, tenacity, and sustain together.

An explicit drawback may refund no more than 60 percent of its removed budget. This prevents a build from selecting an irrelevant drawback for free power.

The runtime registry prices values in integer thousandths of a budget point. For example, 12 Maximum Health costs 1.000 point, 1 Physical Attack costs 1.000 point, and 10 basis points of Attack Speed costs 1.400 points. This gives generated variants a deterministic validator and prevents floating-point drift between server, local play, and tests. The current fixed catalog is not automatically redistributed yet. The first slice defines and validates the expanded mutually exclusive enchantment and blessing families, but live rolls remain on the rollback-compatible pool until the bridge release becomes the rollback floor. Catalog-wide budget validation belongs to the next content pass.

### Example archetypes

| Archetype | Prioritizes | Gives up |
| --- | --- | --- |
| Executor | Critical, Critical Power, Accuracy | HP, Tenacity, Critical Guard |
| Breaker | Penetration, Defense Break, Stagger | Critical and speed |
| Dominator | Control power and duration | Raw damage and defense |
| Unshaken | HP, Tenacity, Critical Guard | Damage and mobility |
| Duelist | Evasion, Basic Damage, Attack Speed | Armor and Skill Damage |
| Arcane Weaver | Spell Attack, Skill Damage, MP, cooldown | Basic Damage and Physical Defense |
| Scourge | Burn, periodic damage, duration | Critical scaling |

The first runtime slice expands mutually competing enchantment and blessing pools. Lateral fixed-item variants require crafting and Codex `any-of` support and are a later content slice.

## Power by source

Power sources have distinct responsibilities:

| Source | Responsibility | Build rule |
| --- | --- | --- |
| Level | Minimum viable HP, attack, defense, accuracy, and resources | Never defines the final build |
| Equipment | Main stat budget and lateral choices | Largest controllable share |
| Enhancement | Improves the equipped item's existing identity | Does not add new families |
| Mount | Travel plus one discipline | Attack Speed participates in the global cap |
| Spirit | Proc and build-defining interaction | One primary proc, shared family cooldowns |
| Codex and album | Small permanent account progression | Broad bonuses stay small; active pages are a later slice |
| Training | Earned progression and techniques | Limited active techniques are a later slice |

Existing mount movement and attack-speed values are product decisions already requested for Aeldrune. This program does not silently delete them. It makes attack speed pass through one global cap and records their contribution so later tuning can compare them with equipment.

### Recommended lateral choices by system

These changes preserve earned collection progress while making equipped or activated choices matter:

- Equipment: every slot receives a fixed budget and a limited prefix/suffix family. A critical weapon gives up penetration or control; a defensive chest gives up sustain or utility. Class-locked item channels remain intact.
- Mounts: keep the requested movement and basic-attack speed for every mount grade. Add one equal-budget discipline per identity: War for defense, Hunter for Accuracy and boss damage, Duel for Critical Evasion and control resistance, Arcane for Mana and cooldown. Only the equipped discipline is active.
- Spirits: replace the same-stat chassis inside a grade with equal-budget Assault, Guardian, Mystic, and Sustain identities. Keep the proc as the main identity and put related procs on shared internal cooldown families.
- Codex: keep small permanent discovery rewards. Add a limited active resonance page for build bonuses so completing everything does not activate every specialist multiplier at once. Completion must be recorded permanently before predecessor crafting consumes an item.
- Mount and Spirit albums: freeze an explicit item-id-to-reward table. The current position-based award rule can change old bonuses when a new upstream asset is inserted.
- Training: preserve every earned level. Let players equip a limited number of techniques derived from unlocked branches instead of making all branches simultaneously define the active build.
- Collections: remain account-wide horizontal goals, but their permanent raw power stays below equipment. Collection completion should unlock alternatives, cosmetics, crafting access, or active-page options more often than universal damage.

### Shared tempo and sustain caps

Every source is aggregated before these caps:

| Attribute | PvE cap | PvP cap |
| --- | ---: | ---: |
| Basic Attack Speed | 100% | 60% |
| Skill Cooldown Reduction | 40% | 30% |
| Health Drain | 20% | 8% |
| Mana Drain | 15% | 6% |

The mythical mount's requested 50 percent basic-attack speed therefore remains valuable but leaves only 10 percent additional headroom in PvP. That is an explicit tradeoff, not an uncapped multiplicative stack.

## Persistence and online compatibility

- Save sources, not final percentages.
- Recompute every effective status through the one aggregation and derivation funnel.
- Keep official status ids 1 through 164 stable.
- Keep authorial special affixes in a separately named internal namespace.
- Continue reading the legacy affix pair format.
- Do not change the deployed game-profile save namespace.
- Server and client rules must ship together because the client predicts from the same sources.

Legacy status-id `0` penetration rolls have already lost their original key. The compatibility policy infers weapon rolls as penetration and armor rolls as penetration defense. Mixed accessory slots use a conservative split, so this interpretation is deterministic but not lossless. During the bridge release, the persisted zero remains unchanged and live rolls use only ids understood by the previous production binary. The expanded pool and distinct internal ids can be activated only after the bridge release is the rollback floor.

This is a two-release compatibility protocol:

1. Bridge release: understand and preserve every V2 id, keep writing the V1-compatible live pool, and preserve legacy zero pairs byte-for-byte.
2. Activation release: enable V2 rolls only when rollback targets already understand the new ids. A rollback to a version older than the bridge is not a supported activation path.

## Runtime contribution ledger

Every source writes a contribution containing:

```ts
interface Mir4StatusContribution {
  statusId: number;
  value: number;
  sourceKind:
    | 'level'
    | 'gear'
    | 'affix'
    | 'mount'
    | 'spirit'
    | 'codex'
    | 'training'
    | 'passive';
  sourceId: string;
}
```

The ledger is runtime-only. It reproduces the same final official status map as direct aggregation. Special channels such as penetration, penetration protection, movement speed, and attack speed remain separately named derived fields rather than pretending to be official ids. Equipped and album values from the same Mount or Spirit system are currently grouped in one source row; splitting those rows is presentation work and does not change totals. The ledger enables future tooltips to explain raw value, effective value, cap, and source without duplicating combat logic in the UI.

## Balance matrix and acceptance criteria

The first slice provides deterministic formula, monotonicity, cap, campaign, and regression tests. The next headless matrix will cover levels 10, 20, and every ten levels through 200. Each comparison will use equal total budget and exercise normal monsters, veterans, guardians, bosses, and PvP.

Metrics:

- sustained DPS and short-window burst;
- effective health by physical and magic channel;
- time to kill and time to death;
- hard-control uptime and immunity uptime;
- mana sustainability;
- healing and drain contribution;
- movement and action cadence;
- percentage of final power contributed by each source.

Initial acceptance criteria:

- No generic affix is best in more than 70 percent of tested contexts.
- Equal-budget builds stay within 10 percent in the scenario each is intended to solve.
- No build leads damage, defense, control, and mobility at once.
- Critical Guard never makes a critical hit weaker than a normal hit.
- More defense never increases damage received.
- More Accuracy never lowers hit chance, and more Evasion never raises it.
- More control resistance never lengthens control.
- Hard control cannot remove player agency indefinitely.
- Every multiplicative modifier has a condition, cap, or explicit loss.
- Every item can explain what the player gains and what opportunity was spent.

## Delivery slices

### Slice 1: foundation in this branch

- Pure rating, bucket, cap, and budget rules.
- Runtime status contribution ledger.
- Deterministic runtime interpretation of ambiguous legacy penetration pairs without rewriting them during the rollback bridge.
- Wider mutually competing affix families staged behind the two-release compatibility protocol.
- Separate critical avoidance and Critical Guard behavior.
- Separate offensive and reduction buckets.
- Penetration defense in the live defender projection.
- Level-, family-, and rank-aware Physical Defense, Magic Defense, Evasion,
  and Critical Avoidance for runtime monsters, with explicit template
  overrides and the tutorial exception.
- Global cooldown-reduction, attack-speed, Health Drain, and Mana Drain caps.
- Correct HP-potion, MP-potion, and cooldown affix status channels.
- Correct root, silence, blind, and repeated-control semantics.
- Focused deterministic tests and existing campaign-balance regression tests.

### Slice 2: equipment variants and presentation

- Lateral variants that redistribute each generated item's existing `balanceBudget`.
- Crafting choice among variants without breaking predecessor recipes.
- Codex `any-of` requirements for equivalent variants.
- Status and item tooltips showing source, effective value, cap, gain, and loss.

### Slice 3: active account systems

- Mount disciplines.
- One primary Spirit plus support slots and family internal cooldowns.
- Limited Codex pages or constellations.
- Limited active training techniques and saved loadouts.

### Slice 4: encounter support

- Content-wide authored defense overrides and encounter calibration on top of
  the shared monster opposition profile.
- Boss Stagger bars.
- Deterministic hit entropy.
- Combat traces and a headless build matrix across levels 10 through 200.
- Final PvP critical, healing, control, and mitigation calibration.
