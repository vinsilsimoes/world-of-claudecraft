<!-- docs/migration/: the Survival-Game -> mir4-gameplay-port program. Living plan:
     authority matrix, migration matrix, standing decisions, phases, slice specs.
     When code and this doc disagree, re-verify against code and update the doc. -->

# Survival-Game port plan (`mir4-gameplay-port`)

This is the living program doc for rebuilding the gameplay of the MIR4-like 2D RPG
at `F:\Dev\Survival-Game` (external to this repository; call it "the source
project") on top of this repository's architecture. The source project's own
docs (`F:\Dev\Survival-Game\docs\mir4-browser-checkpoint-2026-07-23.md`,
`mir4-browser-vertical-slice.md`, `mir4-browser-all-class-catalog.md`) are the
narrative record; its `server/` modules are the behavioral reference.

## Authority matrix

| Concern | Source of truth |
|---|---|
| Architecture, engine, net protocol, DB, persistence, auth, build, tests, deployment | This repository (root `CLAUDE.md` invariants and seams) |
| Classes, skills, formulas, combat resources, progression, items, refinement, enchantments, blessings, auto battle, auto mission, narrative, quests, NPCs, monsters, rewards, map concepts, region order | The source project (`F:\Dev\Survival-Game`) |
| Final implementation | This repository's patterns: one `src/sim/` system behind `SimContext`, data-as-code in `src/sim/content/`, `IWorld` facets, authoritative server |

Preserve the source project's intended behavior, not its code. Never copy its
monoliths (`server/authoritative-state.js` is a dispatch giant; extract the rule
modules instead). Never copy its client engine, renderer, or TMX pipeline.
The same boundary applies to presentation assets: source sprites, tilesets,
atlases, maps, portraits, icons, animations, audio, video, fonts and authoring
files are behavioral or compositional reference only and never enter this tree,
the build, or a derived conversion.

## What the source project is

Node CommonJS browser game: Canvas 2D client (`js/`, ~100 classic scripts loaded
by `index.html`), an authoritative Node server (`server/authoritative-server.js`,
tick 20 Hz, hand-rolled WebSocket, SSE fallback) and two SQLite databases
(`server/persistence.js`, `server/account-store.js`). Its world content flows
through a fail-closed pipeline: design contracts
(`F:\Dev\Survival-Game\docs\game-design\MMO-WORLD-GENERATOR-CONTRACT-L1-200-V1.json`
and sibling contracts) plus 20 approved TMX maps
(`F:\Dev\Survival-Game\assets\epic-rpg-world\generated\mmo-world-m{01..20}-*-v1-source.tmx`)
compiled by `F:\Dev\Survival-Game\tools\map-authoring\compile_mmo_world_runtime.py`
into `F:\Dev\Survival-Game\server\data\mir4-mmo-world-runtime-v1.json`, which only
the server loads (deep-frozen by `server/mir4-mmo-world-content-v1.js`).

Key source modules (behavioral reference for the port):

| Domain | Source module |
|---|---|
| 5 classes, level table 1-250, effective stats, Combat Power | `server/mir4-character-core-data.js` + `server/data/mir4-character-core-v1.json` |
| Class combat identity and range bands | `server/mir4-class-combat-identity-v1.js`, `server/mir4-class-combat-range-v1.js` |
| Class passives (5 per class, unlock 20/30/40/50/60) | `js/mir4-class-passives-v1.js` |
| Skill catalog (25 skills, 5 per class) | `server/mir4-combat-data.js` (`CLASS_CATALOG`), `server/mir4-skill-execution-contract-v1.js` (`ROLE_BY_SKILL`, `EFFECT_PROFILES`), `server/mir4-authorial-skills-v1.js` (7 rebuilt skills, `nativeClaim:false`) |
| Damage math (hit/crit/defense/penetration, bps) | `server/mir4-authoritative-damage-v1.js` |
| Auto battle (brain FSM + rotation admission) | `server/automation-brain-v1.js`, `server/mir4-auto-hunt-rotation-v1.js`, `server/mir4-p3c-automation-v1.js`, per-class planners `server/mir4-p4-*-actions-v1.js` |
| Auto mission ("Quest Journey") | `js/quest-journey.js`, `js/mmo-world-client.js`, `mmo.*` command handlers in `server/authoritative-state.js` |
| Equipment catalog (240 items, 8 slots x 5 classes x 6 ranks) | `server/data/authorial-equipment-catalog-v1.json` validated by `server/mir4-authorial-equipment-catalog-v1.js` |
| Refinement / enchantment / blessing | `server/mir4-authorial-equipment-v1.js` (`enhance()`, `rollLayer`, `resolveLayer`) |
| MMO quests, zones, portals, lore (m01..m20) | `server/data/mir4-mmo-world-runtime-v1.json` + `server/mir4-mmo-world-campaign-v1.js` |
| Monster spawn/stat formula | `server/mir4-mmo-world-encounters-v1.js` |
| Mounts (85, 6 grades, combine 20%) / Spirits | `server/mir4-mount-summon-v1.js`, `server/mir4-spirit-summon-v1.js` |

The five classes (ids 1..5, product keys `warrior`, `elementalist`, `taoist`,
`arbalist`, `lancer`) are the final roster for this profile. The classic roster
stays available under `woc-classic` only; the MIR4 profile must never expose it
and vice versa (character creation gating is a port obligation, see phases).

## Foundation already in this repository

The `mir4-gameplay-port` profile foundation is merged ahead of this plan:

- `src/sim/game_profile.ts`: closed `GAME_PROFILES` vocabulary, `MIR4_GAME_PROFILE`,
  save namespaces (`mir4-gameplay-port-v2` vs `woc-classic-v1`), parse/require/match
  helpers. Re-exported for the client as `src/game_profile.ts`, resolved at runtime
  from `VITE_GAME_PROFILE` by `src/game_profile_runtime.ts`.
- `SimConfig.gameProfile` (defaults `woc-classic`) and a `gameProfile` marker on
  `CharacterState`: MIR4 saves stamp it, classic saves stay byte-compatible, and
  `Sim.addPlayer` rejects a cross-profile load before restoring gameplay state.
- `server/game_profile_db.ts`: singleton `game_profile_guard` table binds a
  database to its first-boot profile; a MIR4 process refuses to boot against an
  adopted classic database. `server/initial_character_state.ts` stamps new
  characters.
- Wire: `ONLINE_WORLD_LAYOUT_VERSION = 9` in `src/world_api.ts`; the first auth
  frame carries the profile and both handshake directions fail closed
  (`server/ws_auth.ts`).
- Env: `GAME_PROFILE` / `VITE_GAME_PROFILE` (see `.env.example`, `docker-compose.yml`).
- Pinned by `tests/game_profile*.test.ts`, `tests/server/game_profile_db*.test.ts`,
  `tests/server/initial_character_state.test.ts`, the ws_auth cases in
  `tests/server/ws_auth.test.ts`, and `tests/env_protocol.test.ts`.

## Migration matrix

| Domain | Origin (source project) | Destination (this repo) | Strategy |
|---|---|---|---|
| 5 classes + passives | character-core data + passives | `src/sim/content/mir4/` records + creation gating in the entity path | ADAPT |
| 25 skills + effect profiles | combat-data catalog + execution contract | `src/sim/content/mir4/` records + `src/sim/combat/` systems | ADAPT |
| Damage formulas (bps) | `mir4-authoritative-damage-v1.js` | pure module under `src/sim/mir4/` with pinned-value tests | ADAPT |
| Auto battle | automation brain + rotation + client controller | `src/sim/auto_battle/` system behind `SimContext` (runs in Sim: offline, server, headless; client only toggles via `IWorld`) | ADAPT (locomotion model differs: Sim-side A*) |
| Auto mission | quest-journey + `mmo.*` handlers | `src/sim/auto_quest/` system over real quest state + `IWorld` facet | ADAPT |
| Items (240) + slots | authorial equipment catalog | extend `src/sim/content/items.ts` (no second inventory) | EXTEND |
| Refine/enchant/bless | `mir4-authorial-equipment-v1.js` | sim progression/equipment module + server `RouteDef` where a REST surface is needed | EXTEND |
| Quests + narrative m01..m20 | compiled runtime JSON | declarative quest/zone records in `src/sim/content/mir4/` (dialog text becomes i18n keys) | ADAPT |
| 20 maps | approved TMX (semantic reference only) | procedural zones (content records + seed terrain + camps + portals), same topology/progression/rhythm | REBUILD (never load TMX at runtime) |
| Monsters | encounters formula + native catalog rows | `src/sim/content/mir4/` mob records + `src/sim/mob/` behavior | ADAPT |
| Mounts / spirits | summon modules | `src/sim/content/mounts.ts` + `src/sim/pet/` | ADAPT |
| Level/XP 1-250 | LEVEL table JSON | profile-scoped tuning beside `XP_TABLE` in `src/sim/types.ts` | REPLACE (profile-scoped) |
| Accounts, auth, DB, wire, build, gate | this repo | unchanged | REUSE |

Content obligations from root `CLAUDE.md` apply to every new mob/quest/item/zone
record in this profile too: wiki regen, deeds for conquerable content, Reliquary
pages for conquerable uniques, item art, i18n keys, `src/ui/world_entity_i18n.ts`
names. Plan them into each slice, do not defer them to the end.

## Standing decisions

1. **Formulas are profile-scoped.** The root invariant "gameplay math follows
   real classic-era MMO formulas" governs `woc-classic`. Under
   `mir4-gameplay-port`, the ported source-project formulas (basis points,
   coefficient `/10000` scaling, `100/(100+effDef)` mitigation) are the rule, and
   the source project's observed values are the pin. Never "correct" a MIR4
   number to a classic formula, and never invent balance numbers the source does
   not support. Pinned value tests (for example skill 1102 damage at attack 50)
   are the guard.
2. **The authorial layer is canon.** Where the source project rebuilt a skill
   without native evidence (`mir4-authorial-skills-v1.js`, `nativeClaim:false`)
   or blocked one (`SKILL_RUNTIME_PENDING`), the port takes the source project's
   shipped behavior as the rule. Gaps stay gaps: a mechanic the source never
   shipped ships as absent, not approximated.
3. **Space conversion: 1 source tile = 2 yards (working default).** Source ranges
   are tiles (melee 2, elementalist 4, arbalist 6) clamped per class; the port
   converts once at content definition time (melee 4 yd, medium 8 yd, long
   12 yd). Adjust the single constant if playtesting says so; never mix units.
4. **i18n: English source, locales as usual.** All source-project PT-BR strings
   become English `t()` keys in `src/ui/i18n.catalog/`; PT-BR is a locale fill.
   The repo's M16 wordy-name rule applies to the PT-BR fills.
5. **Roster gating.** Character creation under `mir4-gameplay-port` offers the
   five source classes only. The classic classes remain in the content tables
   for `woc-classic`; the gate is at creation/UI surfaces, not by deleting
   classic content.
6. **Class vocabulary.** One map, decided once: product keys
   (`warrior/elementalist/taoist/arbalist/lancer`) are the ported ids; the
   source's Topaz weight-column aliases (`magician/assassin/berserker`) exist
   only inside a comment where a Combat Power weight table needs them.
7. **No 2D source assets.** No binary or authoring asset from
   `F:\Dev\Survival-Game` may be copied, converted, traced, embedded, served, or
   referenced at runtime. Gameplay rules, numeric data, narrative structure and
   product flows may be adapted. Presentation uses an existing target-native
   World of ClaudeCraft asset or a newly authored 3D/UI asset with its own
   provenance through this repository's shipping pipeline.
8. **Closed target toolchain.** Implementation uses only tools, dependencies,
   scripts and asset workflows already available in World of ClaudeCraft. When
   the source project used a tool that also exists here, preserve the useful
   authoring/validation procedure through this repository's equivalent command.
   A source-only tool or pipeline is reference material, not permission to add a
   new engine, dependency or build step. Any expansion requires an explicit
   product decision before implementation.
9. **Existing equipment is the visual shell.** The shared Character and Bags
   windows continue to render equipment models, icons and presentation assets
   already owned by World of ClaudeCraft. MIR4 item ids remain the
   authoritative gameplay identity and supply class requirements, tier, grade,
   enhancement, attributes and effects. No 2D equipment asset or separate MIR4
   inventory/paperdoll is introduced.
10. **Mouse Camera is the only camera scheme.** Fresh and persisted profiles
    always run with Mouse Camera enabled. The existing Key Bindings window does
    not offer a Classic Camera toggle and world entry does not show a camera-mode
    chooser. The persisted key remains only as a compatibility seam; loading or
    writing a historical `false` value normalizes it to `true`.

### Asset and toolchain release gate

- MIR4 runtime code must not reference the source project's `assets/` tree,
  TMX files, sprite sheets or source-only authoring outputs.
- Every new MIR4 model, texture, icon, VFX or sound must be created or already
  owned inside World of ClaudeCraft, record its independent provenance and pass
  the repository's existing size, format, visual and performance audits.
- 3D world assets use the existing procedural Three.js -> GLB workflow and its
  optimize/fingerprint/test stages. UI and audio use the existing repository
  converters and conformance checks; no parallel asset pipeline is introduced.
- A package or lockfile change is not an ordinary migration step. It blocks the
  slice until the tool is proven necessary and explicitly approved.

### MIR4 v2 activation gate

The first durable MIR4 gameplay state is intentionally incompatible with the
earlier marker-only `mir4-gameplay-port-v1` save namespace and online layout 8.
Before changing an existing MIR4 database guard to `mir4-gameplay-port-v2`, drain
every old process and active session, verify the aggregate `GROUP BY class`
preflight contains only the five MIR4 product keys, then update the singleton
guard inside the schema advisory lock. Once v2 has written a character, rollback
to a v1 binary is forbidden: v1 would omit the new state on its next autosave.
The same forward-only rule applies inside v2 after the dungeon-ticket wallet is
enabled: an older v2 binary does not preserve that unknown field when it rewrites
the character blob. Drain the old local/server process before starting this build;
do not run mixed versions against one database and do not roll back after a save.
Fresh databases adopt v2 directly; a stale namespace fails boot closed.

## Phases

- **Phase 0 (done with this doc):** commit the game-profile foundation, gate it,
  and record the standing decisions (root `CLAUDE.md` points here for the
  profile-scoped formula rule).
- **Phase 1: canonical datasets.** Extract classes, skills, formulas, items,
  quests from the source project into `src/sim/content/mir4/` records and
  `src/sim/mir4/math.ts`, each with pinned-value tests against the source's
  observed numbers.
- **Phase 2: vertical slice** (spec below) proving the architecture end to end.
- **Phase 3: classes and combat.** All five classes, 25 skills, passives, auto
  battle priorities, placeholder VFX/SFX, offline/online parity.

### Phase 3 execution checklist (from the deep source audit)

Source evidence base: server/mir4-{durable-combat,impact-execution,combat-data,
authoritative-damage-v1,regional-skill-runtime-v1,crowd-control-policy-v1,
auto-hunt-rotation-v1,class-passives js}, docs/mir4-browser-all-class-catalog.md.

Key audit facts that shape the port:
- Impact timing is authored offsets (dueAt = cast + offsetMs; warrior basic
  [280], ultimates e.g. [520,760,1020]); native impactTimes are metadata-only.
- `impactCount` on authorial policies is PRESENTATION cardinality, never a
  damage multiplier; damage = floor(atk*(coef+(lvl-1)*levelUp)/10000) per
  component, allocation per-impact (default) or row-total-impact-vector (3101).
- Effect mechanics that actually multiply in the source: defense-break/burn
  raise damageTaken (+magnitude), blind cuts the MOB's attack, slow cuts
  movement, magic-shield 0.22 cuts actor damage taken; hard CC zeroes
  movement/attack and grants 750ms post-expiry immunity (effectId dedup).
  Vigor(41010)/Smite(20020) buffs are tracked-but-inert in the source: port
  them as tracked state, NOT as damage modifiers (gap stays a gap).
- Per-class basics: coef 6000/5200(magic)/4600/4300/3900, ranges 80-138px,
  cadences 650-840ms; ultimate gauge gains 12/10/9/8/7 per basic impact,
  ultimate at 100 (totals 36000/42000/28500/32400/24200, CDs 30-36s); evade
  specs per class (distance/cd/window).
- Rotation cascade (exact): survival<=45% HP -> aoe (nearby >= max(3,
  minTargets)) -> debuff (effect present) -> execution (5104 <=30% target HP)
  -> single-target -> basic-filler; CC admission re-checked per cast; warrior
  flips setup {1102,1304,1104,1401} to payoff when the target is dazed.
- Potions: HP 5% max (1s cd), MP 120 flat (5s cd); auto-potion thresholds
  HP 50% / MP 35%.
- Passives: 5 per class at levels 20/30/40/50/60, pure bps multipliers on the
  effective status, applied after level+gear with proportional hp/mp rescale.
- Skill level 2: only the SKILL_LEVEL_CAPS_BY_CLASS ids, behind server gates
  (cost 3200 copper + 400 effect points + 3 tomes); dano uses levelUpCoefficient.
- Mob side: attack cadence ~1s with authored impact offsets (native Valley Bat
  440/740/1040ms), damage = atk * blind-mult, resolved against the PLAYER's
  status 24/26 through the same 100/(100+def) mitagation; wolfkin/skeleton
  pressure profiles; XP should move from our current flat 22 (native catalog)
  to the m01 map combatXpModel (normal 34 / elite 170 / boss 680, cap 4092).

Ordered slices (each independently committable):
3.1 effect/CC engine + full warrior kit (1104/1304/1401/1501 effects, AoE
    secondaries, delayed impacts via delayedEvents, 750ms CC immunity).
3.2 basic/ultimate/gauge specs as data + warrior ultimate executing.
3.3 D1 multi-class hosting decision (PlayerClass union vs templateId routing;
    investigate classic CLASSES/guide obligations first) + creation gating.
3.4 remaining four kits executing (incl. authorial hybrid math + tracked
    buffs, 2503 shield, 3503 heal, 4106 stun PvE/PvP chances).
3.5 rotation cascade per class + warrior setup/payoff + auto-potion.
3.6 passives (data + recalc integration + rescale) + L2 evolution data/gates.
3.7 mob attack pipeline mir4 + m01 combatXpModel + boss contextual wiring.
3.8 offline/online parity pass + placeholder VFX event surface.
- **Phase 4: equipment systems.** Inventory extension, refinement, enchantment,
  blessings, material wallet, transactional server validation.
- **Phase 5: world and narrative.** Procedural zones for the m01..m20 arc, quest
  chains, NPCs, bosses, portals, regional progression, mounts/spirits.
- **Phase 6: finish.** HUD/tooltip/i18n completeness, balance passes, multiplayer
  and load tests, full gate.

## Phase 2 vertical slice spec

### Execution ledger (2026-08-21)

“Complete” below means the feature reached every required maturity layer, not
merely that a dataset or unit-tested sim function exists.

| Slice | Dataset | Sim | Host | Persisted/online | Existing UI | E2E | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| Profile/world/roster | yes | yes | yes | yes | yes | yes | active; PostgreSQL 16 and two-browser release proof passed |
| M01 combat + five kits | yes | yes | yes | yes | yes | yes | active; all five classes boot through the existing entry shell with MIR4-only actions and the shared WoC action bar |
| L2 skill evolution | yes | yes | yes | yes | existing Spellbook + Deeds | yes | active; browser proof upgrades skill 1102 and spends the three authoritative resources |
| M01 quest/auto journey | yes | yes | yes | yes | tracker + log | yes | active; smoke proof accepts M01-Q01 and activates auto journey through the existing tracker |
| Equipment/refine/enchant/bless/craft | yes | yes | yes | yes | yes | yes | active; existing Crafting window drives every authoritative operation |
| m01..m20 procedural world/mobs/travel | yes | yes | yes | n/a | zone map + atlas + portals | yes | active; full-campaign four-tier browser and live-Sim portal traversal pass |
| 230-quest arc | yes | yes | yes | yes | tracker + Quest Log + Crafting | yes | active; exhaustive sim coverage plus real M04 short-dungeon browser completion |
| Native mount adaptation | yes | yes | yes | yes | Bags + Character + native Mount runtime | yes | active; ticket redemption and equip use the existing Bags and native runtime model |
| Spirits | yes | yes | yes | yes | Bags + Character | yes | active; ticket redemption and equip pass through the existing Bags window |

Current implementation estimate: **100%**. Every migration slice in the ledger
has reached its required dataset, simulation, host, persistence/online, existing-
UI and E2E maturity layers. This percentage measures implementation of the
agreed migration roadmap only. It does not by itself declare production release
readiness or waive operational migration, device-performance, moderation,
content-quality, rollout and live-observability gates.

The profile host now resolves and activates the same `buildMir4ArcWorld()` for
offline, headless and server execution. Native class keys cross creation, DB,
join and snapshot boundaries. MIR4 save state is sanitized, versioned under
`mir4-gameplay-port-v2`, restored online, and echoed authoritatively; the
one-shot v1-to-v2 migration is dry-run by default. The PostgreSQL 16
migration/load proof is recorded below; production activation still requires
the documented operational drain before applying a v1-to-v2 migration.
Current-release save, acquire and delete paths share the explicit lock order
`characters` -> `character_leases`: acquire materializes an ownership/realm-
scoped `FOR KEY SHARE` parent lock before its `INSERT ... ON CONFLICT`, while
saves and deletion take the stronger parent row lock before touching the exact
lease. Saves revalidate holder, nonce and wall-clock expiry after the lease lock,
then renew it. Multi-statement market/mail/guild-bank escrows renew that same
holder+nonce again immediately before `COMMIT`, so a long transaction cannot
publish an already-expired lease. The global heartbeat uses `SKIP LOCKED`; a
busy save renews its own row instead of holding every other session's renewal
behind it. This protects v2 writers; it does not replace the operational
requirement to drain every already-running v1 process before the one-shot
migration.

The temporary `src/game/mir4_slice_input.ts` panel has been removed. The five
class kits are adapted into the existing `ResolvedAbility` model, so the current
action bars, keybinds, cooldown painter, procedural target-native icons and
spellbook render them. Tooltips use the live MIR4 coefficient formulas and have
English source plus PT-BR fills. The existing fixed Attack slot is relabeled as
Auto Battle and toggles the authoritative automation state. The existing class
resource meter presents the authoritative 0..100 Ultimate gauge, and each
class's Ultimate is an ordinary spellbook/action-bar entry routed to the MIR4
admission rules. The same spellbook presents the 25 level-gated passives as
informational, non-assignable rows with their exact basis-point benefits. M01
progress uses the existing quest tracker; activating its row toggles the
authoritative auto journey by mouse or keyboard. The existing Quest Log now
renders the same authoritative M01 state, clue progress, exact XP/copper
rewards, return objective and auto-journey toggle online and offline. It does
not expose a fake abandon action while that server verb is absent. No parallel
MIR4 HUD exists.

The source-backed boss contextual lane is now live in the same authoritative
damage resolver. STATUS 41 (`AddAtkBossDamage`) is derived from the level table
and logical equipment on its 10,000-point percentage scale, appears in the
existing Character window, and affects only entities carrying the shared WoC
`mobBoss` classification. Ordinary elites remain neutral. Campaign
`guardian-resolution` targets carry the original regional 250 bps reduction,
while isolated dungeon bosses carry the source-definition 500 bps reduction.
`tests/mir4/action_abilities.test.ts`, `tests/mir4/derived_stats.test.ts` and
`tests/mir4/arc_encounters.test.ts` pin the live cast result, source stat and
both boss categories without introducing any source-project visual asset.

The same Spellbook rows now expose the source-backed rank-1-to-rank-2
evolution gate only for the sealed per-class skill ids. The authoritative verb
checks the expected current rank, debits exactly 3,200 copper, 400 Effect
Points and three Skill Tomes atomically, refreshes the shared ability rank, and
persists/reconciles the two logical resource balances and skill level online.
No source-project icon or item model is introduced. The campaign currently has
no source-backed Effect Point or Skill Tome reward row. Effect Points are now
obtainable through the original runtime's admitted level-achievement group:
the authoritative level 5 and level 10 claims grant their exact copper,
Darksteel and Effect Point rewards in strict grade order. The existing Book of
Deeds root, launchers, focus behavior, card chrome and procedural WoC crest are
adapted to that MIR4 provider; the classic Deeds provider remains unchanged.
Online claims use the shared request-id command outcome channel. The reused
Deeds control remains disabled while a valid request awaits its authoritative
snapshot, but re-enables on transport refusal, disconnect/command timeout or a
bounded missing-echo timeout; request tokens prevent an older timeout from
clearing a retry of the same achievement.
The source runtime exposes Skill Tomes only as an evolution debit and contains
no shipping producer. The port therefore keeps the observed achievement reward
row byte-for-byte separate from an explicit authorial bridge:
`MIR4_ACHIEVEMENT_PORT_BONUSES` grants exactly three logical Skill Tomes when
the level-10 grade is claimed. The same existing Deeds card presents that bonus
and its live balance. Together with the source-backed 500 Effect Points and a
normal campaign copper reward, this closes one complete claim-to-L2 transition
without a
development grant, an invented drop table or any source-project item asset.
The bonus is persisted, snapshot-reconciled and visible to headless/RL through
the already versioned `mir4SkillResources` state; it is deliberately documented
as port authorship rather than mislabelled as an observed 2D producer.

`src/ui/profile_feature_gate.ts` is the current Keep/Adapt/Hide matrix. Generic
and already-adapted surfaces stay visible; classic-only launchers/windows are
hidden in the MIR4 profile until their data provider is adapted. This prevents
classic talents, Reliquary, professions, PvP, dungeons, WOC Store and other
wrong content from leaking into the profile. Deeds is also removed only at the
launcher/window level because it now paints authoritative MIR4 achievements;
its classic HUD tracker remains hidden. Character and Bags have been removed
from that hide list too: their existing roots,
paperdoll/grid layout, runtime equipment visuals, focus behavior and tooltips
consume the authoritative MIR4 projection. The current slice supports equipping
and unequipping all eight slots, live derived stats/Combat Power, owned
equipment, and the six-material wallet. Refinement, enchantment, blessing and
crafting now reuse the existing Crafting window and its tab/recipe vocabulary.
The four profile tabs expose exact success chances, destruction/ward rules,
roll-preview accept/keep, current live effects, material costs and the two
ported recipes through server-validated verbs. Effects without a live combat
consumer are labeled inactive instead of being presented as working. Each later
slice removes selectors from the gate only when that same existing window
becomes authoritative for MIR4.

Visibility is not the authority boundary. `src/sim/game_profile_commands.ts`
classifies all 213 append-only wire commands into an explicit MIR4 shared
allowlist and a classic-only set. The server refuses hidden classic providers
before any Sim verb, heavy-snapshot dirty flag or cadence re-arm can run; the
classic profile likewise refuses the MIR4 envelope. A partition test fails
closed whenever a future command is added without an explicit profile decision,
and behavioral server tests cover representative quest, profession, talent,
native-Mount and PvP probes alongside admitted shared inventory and MIR4 verbs.

All rendered equipment remains a native World of ClaudeCraft runtime shell:
existing 3D models, item icons, animations and paperdoll integration are reused
unchanged. The migrated layer supplies only logical identity, stats, effects,
enhancement, affixes and progression. No source-project equipment asset is
copied, converted or loaded at runtime.

Fresh characters now receive the exact two logical `CLASS_CREATE` equipment
records for their native class: the class weapon in slot 1 and body armor in
slot 5. Their ten source-backed ids and status rows drive combat, defense and
Combat Power, while the existing WoC weapon shell, class armor set, item icon,
paperdoll and tooltip remain the only rendered presentation. The grant occurs
only for genuinely new profile state; a restored character is never silently
re-equipped after a deliberate unequip. Legacy saves that stored the starter
weapon under the old `weapon` key normalize to slot 1 and receive only the
matching owned instance needed to preserve that historical equipment. The
starter re-equip verb also requires an owned, non-destroyed instance, preventing
missing or terminal equipment from being minted through the compatibility path.

The existing Map window and minimap are also adapted rather than replaced. Its
continent canvas now builds a target-native 4x5 atlas from the active m01..m20
world records, uses localized region names, highlights the current map and
opens the existing per-zone detail when a cell is selected. The same canvas is
focusable: arrow keys move by painted region geometry, Home/End select the
visual endpoints, Enter/Space opens the selected zone, and the existing live
summary announces its localized name and level band. It deliberately
does not draw the classic continent plate or any asset from the 2D project.
Atlas selection remains inspection only. Actual travel reuses the existing
authoritative positional portal runtime: the 19 reciprocal m01..m20 links are
derived from the source map order but use newly authored 3D band entrances and
grounded landing points. The same links appear as passage markers on the shared
zone map and minimap. Classic WoC portals are profile-gated out of MIR4.

The 3D world surface is now generated from the active `WorldContent`, not from
the source TMX geometry and not from the classic WoC atlas. A deterministic
seeded heightfield resolves each active biome, blends adjacent bands, flattens
roads/hubs/camps, carves declared lakes and raises native side rims. All 20
bands are dry at their hubs, camps and portal landings. The data-as-code recipes
in `src/sim/content/mir4/arc_world_dressing.ts` assign every campaign map a
distinct target-native visual theme, at least one terrain signature and a
curated landmark composition. Lakes, docks and mines are added only where the
theme needs them. Every referenced model resolves through the existing WoC prop
registry, so buildings, ships, ruins, shrines, crystals, flora and dungeon
pieces keep the shipping renderer, collision and asset pipeline. No 2D asset is
copied or loaded. `tests/mir4/arc_world_dressing.test.ts` pins recipe coverage,
native asset resolution, world bounds and clearance from roads, hubs and combat
camps. It validates a lake's complete rendered basin footprint rather than only
its nominal authoring radius. The current composition is a differentiated
procedural production base, not a claim that every map and graphics tier has
received final art-direction approval.

The near-terrain residency grid, macro-normal UV projection and far-vista tile
planner now derive their bounds from those active zones. This removes the old
`z=2460` classic-atlas cutoff and covers the final MIR4 band through `z=4000`.
Injected worlds stay on the existing cooperative main-thread terrain builder
because the classic worker protocol does not carry `WorldContent`; silently
sampling the worker's built-in world would be incorrect. The classic profile
keeps its existing worker path and byte-pinned geometry. The full MIR4 far
surface plans 12 native tiles (78,732 vertices at the High spacing); a local
Node build measured 1.807 seconds before browser upload, within the existing
four-second entry fallback but still subject to device/browser load profiling
in the release gate.

The full arc now gives camp mobs map-qualified template ids, so a family reused
in multiple maps resolves the correct level band, damage, XP and loot instead
of the first occurrence. All 35 authored stage kinds are routed through
authoritative talk, position, combat, Interact or receipt evidence, and a census
test fails if a generated stage kind is ever left unwired. The campaign test in
`tests/mir4/arc_stage_kinds.test.ts` also advances every authored stage in quest
order and proves each stage independently accepts its selected authoritative
evidence, so a supported kind cannot hide an unreachable record. Profession stages
reuse the existing Crafting window and consume the server-owned logical
material ledger atomically. Every one of the 30 system lessons has either a
real gameplay receipt (consumable, equipment, refinement, affix resolution,
portal, Spirit or Mount) or a native 3D Interact terminal. The full quest and
reward state is sanitized, persisted and included in the authoritative owner
snapshot.

Escort stages no longer advance from the player merely touching three points.
They materialize a non-hostile native WoC entity through the shared movement,
collision, threat, healing and snapshot runtime; the escort walks three guarded
checkpoints, pauses for native ambush mobs, follows the existing auto-journey
controller and restarts the current stage on death. Short-dungeon/public-event
stages now claim a per-player slot in an engine-only native Sanctum room, move
the owner and three seal guardians into instance-local space, then materialize
the elite objective boss there. The existing WoC renderer, collision, exit
object, death handling and empty-slot lifecycle are reused. Completion or the
native exit returns the player to the exact outdoor anchor, and saves record
that outdoor return rather than the ephemeral instance coordinate. The room is
absent from public dungeon, developer and wiki catalogues and uses no asset or
geometry from the source project.

The 25 active class skills no longer use the temporary generic flourish. Each
logical skill maps to a shipping WoC ability presentation cue, reusing the
existing particle, character-gesture and spatial-audio pipeline. Damage,
cooldowns, effects and skill identity remain MIR4-authoritative; the alias is
presentation-only and imports no source-project visual or audio asset. The
fixed barrier-shell pool reserves local-player readability under saturation:
a local MIR4 shield may replace one remote shell, while remote flashes and
held shells cannot evict the protected local cue.

Spirit summon, confirmation, equip, collection thresholds, 4-to-1 combination,
derived stats and special combat effects are live through the existing Bags and
Character surfaces. The 85 logical Mount identities, six grades, exact ticket
odds, collection thresholds, equipped defenses/speed and 4-to-1 combination are
also authoritative, persisted and reconciled online. Their appearance is chosen
deterministically from native World of ClaudeCraft reins/models and continues to
use the existing summon channel, animation and motion runtime; native speed does
not stack with the migrated grade effect. No source model is imported.

Collectible presentation is localized by stable logical id rather than by
transporting source prose into the UI. English is authored in the canonical
catalogue, PT-BR preserves the 85 Mount, 30 Spirit and 30 Spirit-skill source
names, and the five non-Latin M16 locales provide native-script translations.
The existing Bags and Character painters resolve those keys at render time;
catalogue-wide tests prove that every collectible also resolves a native WoC
visual and every Spirit resolves its special skill.

Headless/RL now shares the same source-backed Achievement verbs and owner
progression: two stable claim actions enforce grade order, the observation tail
reports grade/Darksteel/Effect Points/Skill Tomes without changing shape by
class, and the
episode info request is profile-aware. Partial Ultimate gauge and the remaining
Spirit-special cooldown are persisted as bounded profile state (the cooldown is
stored as a duration, never a cross-session clock deadline), so reconnect cannot
erase either combat resource. Destroyed logical equipment instances are terminal
and cannot be re-equipped through their historical reward receipt.

The external release proof is complete. The existing `scripts/mp_integration.mjs`
WebSocket integration rig is now profile-aware: its MIR4 scenario creates native
Elementalist and Lancer characters, reconstructs delta-elided MIR4 owner state,
checks authoritative AUTO battle and quest-journey echoes, proves classic
abilities remain blocked, and compares the profile state after reconnect. Its
pure profile and snapshot reconstruction helpers are unit-tested.
`scripts/mp_browser.mjs` uses the same scenario selector
and real character-creation/HUD DOM: in MIR4 it checks the native class id, the
existing action bar's Auto Battle toggle, the classic Talents gate, mutual
visibility, movement and chat, and now exits nonzero on any failed assertion.
The required `MIR4 PostgreSQL 16 proof` CI job owns that execution:
after the migration/load cases, it builds the profile client/server, boots the
server against the same disposable PostgreSQL 16 service and runs both
multiplayer scripts. No hosted database or separate paid service is required;
GitHub Actions supplies the disposable service and Chromium.

CI run [32477064316](https://github.com/vinsilsimoes/world-of-claudecraft/actions/runs/32477064316)
passed this proof on PostgreSQL 16. The maximum-state probe persisted four
concurrent 86,975-byte character projections in 24.77 ms and produced 145,888
diagnostic WAL bytes. The 1,000-session cycle renewed all 1,000 leases, completed
its heartbeat in 9.74 ms and the full four-worker save cycle in 2,440.85 ms
(p50 9.22 ms, p95 14.28 ms, p99 18.57 ms, maximum 22.57 ms). The real WebSocket
scenario passed 32 assertions with no failures. Two independent Chromium
processes then entered Ford Village through the shipping shell and passed all
10 assertions: mutual visibility, authoritative MIR4 class, the existing WoC
Auto Battle control and state, hidden classic Talents launcher, remote WASD
movement, chat delivery and zero page errors. The retained artifact contains
both screenshots and the server log; visual inspection confirms the existing
WoC 3D world/UI and no camera-mode chooser or 2D asset surface.

Local verification for this execution includes the complete serial
`tests/mir4/` suite, the focused profile, world,
renderer-streaming, UI/command-outcome, architecture and monolith regressions,
`npx tsc --noEmit`, `npm run ci:changed`, the security gate, the
server/headless/environment builds and both the default and
`VITE_GAME_PROFILE=mir4-gameplay-port` client bundles. A manual in-app-browser
pass entered Offline through the existing WoC shell, confirmed that character
creation exposes exactly Warrior, Elementalist, Taoist, Arbalist and Lancer,
then entered as Lancer with the native action bar, Ultimate gauge, MIR4 stats
and localized M01 zone. `Ford Village` in the English client is the intended
localized name for `Vila do Vau`, not classic-world leakage. The pass exposed
and then verified the fix for a real renderer boundary defect: visible-zone
streaming, constrained-memory eviction and terrain/water rebuilds now source
zones from `sim.cfg.world`, with `tests/renderer_world_content_seam.test.ts`
pinning the seam. No classic zone-residency warning recurred after the fix.
The same real-client path also caught a profile-boundary resurrection defect:
release and shrine revive were applying the classic 100 HP/100 MP baseline to
MIR4 characters. Stat recomputation now dispatches through the active profile;
`tests/mir4/multiclass.test.ts` covers death, release and revive for all five
classes, and the browser Lancer returned to its 4000 HP/600 MP level-1 pools.
A follow-up Taoist session toggled Auto Battle off, on and off again through the
existing action-bar button. The live `queued` state followed every click and the
browser console remained free of errors. That pass also found that the toggle
state was visual-only for assistive technology. The shared action-bar view and
painter now expose `aria-pressed` for Attack/Auto Battle, clear the attribute
when slot zero becomes a normal action, and use the existing write-elision
facet for both desktop and mobile. The paired action-bar and painter-host tests
pin the toggle semantics and attribute removal.

The repository's existing `scripts/smoke_browser.mjs` is now profile-aware
instead of carrying a second MIR4-only browser harness. Its pure scenario
selector keeps the established classic Warrior, wolf, combat and Eastbrook
quest path, while the MIR4 branch selects Elementalist through the same entry
shell, resolves an M01 hostile, uses the authoritative MIR4 combat facade and
activates auto journey through the existing quest-tracker row. Real Chromium
runs passed for both profiles. The MIR4 run proved profile activation, movement,
the native 3D world with 313 live entities, combat, death, XP, loot, acceptance
of `M01-Q01` from the native Tarek NPC and the tracker click that starts auto
journey. The classic run still proved movement, combat, loot and acceptance of
`q_wolves`. This closes the local offline smoke gap without claiming the
PostgreSQL-backed multiplayer column.
The follow-up visual pass rendered M01 as dry native terrain with seeded hills,
trees, rocks, WoC buildings, lamps, NPCs and camp dressing; the former global
water sheet was absent. The same browser session used the existing development
teleport command to stream M12 and M20 through the real renderer. M12 showed its
inland harbor basin, native ship and port dressing, while M20 showed its night
palette, native city silhouettes and campaign hub. This pass exposed a far-vista
classification defect where any inland lake could turn the entire horizon apron
into ocean seabed. `src/render/far_terrain_core.ts` now classifies custom water as
edge-connected only when the full declared basin footprint reaches the active
world boundary, with regression coverage in
`tests/mir4/far_terrain_render.test.ts`. Deterministic renderer tests additionally
stream a mesh over the final campaign hub, pin its normal-map UVs to `[0,1]`, and
prove that the far-vista plan encloses the complete campaign plus its horizon
margin.

A campaign-wide baseline pass subsequently streamed every hub from M01 through
M20 in sequence through the real low-tier WebGL renderer. All twenty maps loaded
at their declared coordinates without a crash, preserved the MIR4 player pools,
and showed the intended progression using only native WoC presentation assets:
settlements and temperate trails, crypt and fortress interiors, marsh and harbor,
desert and necropolis, caldera and forge, tundra and pass, then the Night Veil and
Eclipse Bastille endgame palette. The pass found one remaining lazy-load race:
background zone prewarm could discover `training_dummy` before its deliberately
deferred GLB was ready. `src/render/characters/lazy_assets.ts` now owns the shared
Mech/Training Dummy lazy-load policy; the renderer resolves aliases through the
actual visual key, defers that template without marking it warm and retries
through its existing view cooldown. A later Medium entry exposed the adjacent
profile leak: zone prewarm still sourced classic `CAMPS` and `NPCS` even when the
renderer held an injected MIR4 `WorldContent`. The pure
`zone_prewarm_templates_core.ts` seam now accepts that active content and the
renderer passes `sim.cfg.world`, so classic entities are not compiled into a
MIR4 traversal. The monolith
ratchet was lowered with the extraction, `tests/training_dummy_preload.test.ts`
pins both native Training Dummy aliases, and
`tests/zone_prewarm_templates_core.test.ts` pins profile-world isolation. A clean
Medium entry after both fixes produced no asset warning.
The live-Sim travel regression also walks every one of the 19 reciprocal portal
links in order and proves that the authoritative tick reaches all 20 distinct
zones, from Vila do Vau through Eclipse Bastille, without relying on direct
state mutation for the transition itself.

The baseline art-differentiation follow-up is also complete for the previously
similar M09 to M11 and M13 to M14 groups. Their native dressing recipes now pin
dominant silhouettes instead of relying on palette alone: luminous flora for
M09, oversized fungal shelters for M10, boats/dock furniture for M11, crystal
outcrops for M13 and graves/broken masonry for M14. The added records reuse only
shipping `PROP_ASSET_DEFS`; the shared lane/camp-clearance test remains green and
`tests/mir4/arc_world_dressing.test.ts` prevents those five vocabularies from
collapsing back together. A clean browser pass rendered all five affected hubs
without asset errors. Cross-tier acceptance is now complete: isolated real-client
sessions on Low, Medium, High and Ultra each streamed all twenty hubs from M01 to
M20, reported the exact expected zone and coordinate after every teleport, and
reached Eclipse Bastille without a crash or asset error. Medium, High and Ultra
M20 captures also confirmed the expected increase in native WoC foliage,
lighting, shadows and scene density without changing actionable HUD information.

The classic golden-trace parity gate also remains intact. Mob family, elite and
boss fields introduced for dynamic-campaign nameplates are immutable render/wire
mirrors, so `tests/parity/trace.ts` classifies them with the other presentation
fields and `tests/parity/harness.test.ts` pins that decision explicitly. The full
`tests/parity/` suite passes without updating a golden: classic state hashes, event
digests and shared-RNG fingerprints therefore remain unchanged by the migration.

The final lease/save/delete regression band adds 246 passing tests across the
lease SQL shape, server join/takeover, WebSocket authentication, market/mail and
guild-bank escrow paths. TypeScript and the server bundle also pass after the
lock-order and final-renewal changes. A contended acquire now calculates its
expiry with `clock_timestamp()` inside the `ON CONFLICT` arm after the row-lock
wait, rather than reusing the earlier attempted-insert timestamp.
`tests/character_lease_pg_integration.test.ts` is the opt-in disposable-database
proof for that TTL, heartbeat `SKIP LOCKED`, both delete/acquire orderings and
stale-save rejection. Its five cases require `TEST_DATABASE_URL`; they are
not run on this Windows host, but execute in the required staged PostgreSQL 16
job rather than being inferred from mocks.
`tests/mir4_save_v2_pg_integration.test.ts` now provides the matching disposable
PostgreSQL 16 harness for the profile itself: v1 dry-run/apply, active-lease and
native-roster refusal, the lease-table migration fence, both deterministic
save/takeover queue orderings, expiry while a save waits, four concurrent
maximum MIR4 profile projections and a 1,000-session autosave cycle at the
production concurrency of four. That cycle times the production heartbeat
before its four save workers, and requires all 1,000 leases to renew. The eight
cases report only aggregate JSONB bytes, timing percentiles and diagnostic
cluster-wide WAL bytes (never character data), enforce
the 128 KiB fresh-character MIR4 projection budget and require the full cycle to
finish inside 30 seconds without an expired lease. Disposable database names are
unique per process and cleanup failures are test failures. The dedicated
`MIR4 PostgreSQL 16 proof` CI job supplies PostgreSQL 16 and sets a fail-closed
guard, so these files cannot silently skip on a required PR, merge-queue or
release-candidate run. The same job now follows them with the real WebSocket and
browser multiplayer scenarios. Run 32477064316 executed and passed the complete
chain; the local host does not need its own PostgreSQL or Docker installation.

The opt-in WoC Chromium suite is now a local passing proof: `npm run
test:browser` executed the complete configured browser matrix covering
accessibility, keyboard focus, mobile layout, canvas and WebGL. Asset provenance received a
separate byte-level audit: SHA-256 comparison of all 65,576 files under the
source project's `assets/` tree against all 5,284 files under the 3D project's
`public/`, `electron/`, `android/`, `ios/` and `build/` delivery roots found zero
identical files. The reusable `scripts/mir4_asset_isolation_audit.mjs` command
performs this name/extension-independent comparison and fails on any match; its
equal-size candidate selection, byte verdict and fail-closed CLI are pinned by
`tests/mir4_asset_byte_isolation.test.ts`, while the walker rejects symlinks
that resolve outside an audited root. The checked-in text/path isolation
test independently scans every runtime surface and public path for source-tree,
TMX, tile-set and known 2D-pack references.

The final clean day-loop gate also passes on the complete migration worktree.
`$env:GATE_WORKER_TIER='low'; npm run gate:fast` completed all five selected steps in
4,382.55 seconds with 1,868 passing and 12 skipped test files (1,880 total),
27,496 passing tests, two expected failures and 103 skips. The same final state passes
`npx tsc --noEmit`, `npm run build`, `npm run build:server`,
`npm run build:env`, `npm run build:bot` and `git diff --check`. A second
generation pass over the 58 tracked i18n, wiki, SFX and media-manifest artifacts
also produced identical SHA-256 values, proving the worktree artifacts are
deterministic and current relative to their generators. This closes the
deterministic local regression gate; staged run 32477064316 supplies the matching
Linux, PostgreSQL and real-browser evidence.

Within that final state, the exact five-class starter-loadout integration also
passed the complete MIR4 suite (74 passing files, one skipped; 377 passing
tests, eight skipped), a 46-test focused creation/save/UI/snapshot/command band,
and a 19-test headless observation/info band. TypeScript, both multiplayer
scenario syntax checks and `git diff --check` also pass. The multiplayer scenario now
asserts both exact starter slots and instances across creation and reconnect;
its live PostgreSQL-backed execution passed in run 32477064316.

The formal contribution evidence now passes in both environments. Locally,
`npm run gate:fast` completed the full deterministic suite described above.
Externally, CI run 32477064316 passed changed-file lint, browser regressions,
typecheck and all builds, the PostgreSQL 16 proof, eight balanced PR test shards
and both long-simulation lanes. Release-only jobs were correctly skipped for the
ordinary feature PR. The measured shard timings from that green run are checked
into `scripts/ci_shard_weights.generated.json` for subsequent CI balancing.

The final E2E closure is recorded by CI run 32486719723. It passed changed-file
lint, security/i18n/typecheck/build checks, browser regressions, all eight PR
test shards, both long-simulation lanes and the complete PostgreSQL 16 proof.
The database job persisted four maximum projections at 86,975 bytes each with
145,808 diagnostic WAL bytes in 19.61 ms, then renewed all 1,000 leases and
saved all 1,000 sessions at concurrency four in 1,894.46 ms (p50 7.16 ms,
p95 10.28 ms, p99 14.28 ms, max 17.7 ms). Its live product proofs completed
32/32 WebSocket assertions, 10/10 two-client Chromium assertions, the existing
MIR4 smoke path with 10.2 units of real keyboard movement and no page errors,
and 44/44 existing-UI feature assertions across all five classes. The latter
drives Spellbook evolution, refinement, enchantment, blessing, crafting,
Mount/Spirit redemption and equip, Character presentation, M04 isolated
short-dungeon combat and campaign return without adding a parallel MIR4 UI or
copying any 2D asset. Artifact `mir4-external-proof-32486719723` retains the
server/Vite logs and browser screenshots for 14 days.

### Native WoC asset adoption and physical objectives (2026-08-21)

The target-native asset inventory is now reproducible through the existing WoC
pipeline rather than a hand-maintained list. Run
`node scripts/asset_pipeline/pipeline.mjs library --full`; the searchable visual
catalogue is emitted to `tmp/asset_pipeline/library/index.html`. The current
inventory contains 1,313 GLB/skin entries: 89 creatures, 31 player bodies, 14
enemy bodies, one modular body, one form, 205 biome pieces, 379 dungeon pieces,
179 props, 12 quest objects, 135 resources, 69 tools, 103 weapons, nine mounts,
23 foliage entries, four settlement/city entries, three battleground entries,
41 character skins and 15 mech chromas. The headless catalogue renderer now
uses the repository's shared KTX2 transcoder wiring; a clean full pass rendered
all 1,313 entries with zero errors. No source-project asset participates.

The first MIR4 presentation assignment slice is active:

- the five MIR4 classes select five existing WoC character bodies instead of
  sharing the Warrior shell;
- every unique campaign NPC identity deterministically selects an existing WoC
  silhouette from role rules plus an eight-silhouette fallback pool;
- dynamic quest and dungeon monsters select native WoC families by authored
  name/identity (animal, undead, elemental, demon, humanoid, construct and boss
  vocabularies), with a 22-family deterministic fallback and no generic Bandit
  fallback;
- all 25 class skills and five ultimates resolve shipping painted WoC skill art
  instead of the procedural placeholder;
- all 14 campaign interaction verbs materialize an authoritative, player-owned
  ground object using native quest/resource/tool GLBs (clues, cog/device, maps,
  keys, waypoint crystal, compass, herbs, blueprints, journals, supplies,
  evidence and repair tools). Proximity alone no longer completes these stages:
  the exact live entity must be reached and interacted with, then it is consumed
  and the logical quest evidence is granted.

The local real-boundary proof created a fresh Warrior and Elementalist through
login, PostgreSQL 16 and WebSocket, completed a duel, then ran auto journey for
180 seconds. Both completed M01-Q01 and M01-Q02, including three physical clue
interactions, evidence reconstruction and lore registration; they reached level
5 with 24/27 quest-stage advances, zero deaths, zero simulation/connection
errors and no playtest findings. The report is reproducible under
`tmp/mir4-bot-playtests/assetqa1-*.json`.

This closes inventory and baseline placeholder removal, not final art direction.
The quest-by-quest baseline matrix is now generated for all 230 quests and 1,204
stages by `scripts/mir4_campaign_homologation.ts`. It reports 80 unique physical
NPC identities, 20 maps, 38 native WoC character asset URLs and zero missing
routes, tutorial guidance records, NPC references or presentation assignments.
The reviewable JSON and CSV live under `tmp/mir4-campaign-homologation/` and are
regenerated rather than hand-maintained. Final art direction still requires a
human-quality visual pass for silhouette repetition, objective readability,
item art, VFX and SFX. Those refinements must keep using the same catalogue and
pipelines; they do not authorize source-project assets or a second renderer.

### Campaign homologation and autonomous progression (2026-08-21)

The full-campaign laboratory now creates one fresh character for each of the
five MIR4 classes in the real `Sim`, enables the shipping Auto Journey and Auto
Battle commands, drives only ordinary player verbs, detects a per-stage stall
and writes a persistence-checked report through
`scripts/mir4_campaign_soak.ts`. The short calibration pass completed M01-Q01
for all five characters and reached M01-Q03 without a route failure; class
clear-speed differences were retained instead of normalized. The runner uses
the same `PLAYER_INTEREST_DROP_RADIUS` mob-idle policy as the local server.

The campaign audit also closed four content deadlocks that were unrelated to
player combat strength:

- M10-Q03 now grants exactly four quest-bound Spirit replicas; its 20% tutorial
  fusion consumes only those replicas, returns one on failure and never mutates
  the real Spirit collection or tickets;
- M11-Q05, M15-Q05, M17-Q06 and M19-Q06 each grant one craft input, its Copper
  cost and a one-use guarantee for the required +7, +8, +9 or +10 step, so a
  mandatory tutorial cannot destroy the player's native-shell weapon;
- M13-Q03 grants the inputs for its required advanced-crafting receipt; and
- M14-Q05 accepts the documented decision to retain an already-suitable item
  after the player reviews the existing Blessing window, so no absent material
  can deadlock the main chain.

A real local browser proof then resumed the persistent Warrior at M07-Q05. The
existing Equipment Workshop opened on the directed tabs, crafted the granted
Solar Scroll, raised the equipped native WoC Pitted Shortsword from +5 to +6,
advanced the tutorial, and closed the three-wave defense under Auto Battle.
Auto Journey immediately selected the next main quest, the character reached
level 63, and the browser console remained free of warnings and errors. The
remaining homologation gate is the long M01-to-M20 soak for all five classes,
followed by targeted fixes for any newly observed strength or content blocker;
the short calibration is not represented as that final gate.

### World-art priority, physical limits and authored-map passes (2026-08-22)

Maps are now the highest-priority content program. The 20-region generator is a
functional campaign carrier, but the repeated site stamp, sparse landmark layer
and rectangular perimeter silhouettes do not yet meet the intended world quality.
The target is not a copy of another game's geometry. The art-direction reference
is its level-design language: distant landmarks that orient the player, named
subareas with distinct silhouettes, several ways into and out of dangerous
spaces, strong vertical identity, and terrain that tells the truth about where a
character can walk. Blizzard's public level-design retrospective specifically
calls out an early Nagrand that was attractive but too open and empty, and narrow
canyons that became traps until they were widened, divided into subareas and
given more entrances. The Highmountain preview likewise describes one dominant
mountain fantasy, real-world reference and a deliberate sense of ascent.

The physical-boundary contract is now explicit:

- An open-looking field is traversable. No generated invisible rectangle may
  stop a player or mob.
- An impassable limit must be visible as steep terrain, deep water, a wall, a
  closed gate or another authored 3D obstacle. Rendering, player movement, mob
  reachability and pathfinding consume the same terrain/collider fact.
- A rectangular content extent must not continue as a raised plateau into the
  void. Its current physical ridge has a finite shoulder and a guaranteed
  unwalkable face; authored map passes replace the rectangular footprint with
  visible mountains, water, walls and gates without weakening that guarantee.
- Every required route, quest anchor, camp and portal stays on dry, walkable
  ground. Any apparent pass through the surrounding geography is either a real
  traversable route or is visually closed.

The first infrastructure slice applies the physical contract globally to
injected world terrain. The hidden global OBB perimeter is removed; visible
terrain supplies the unwalkable slope and decays outside the map. The original
M02 Reed Trail scaffold was useful for proving asymmetric roads, water margins
and low-quality terrain parity, but was explicitly rejected as production
content. The authored M02 described below replaces that scaffold; neither
version is a template for generating the remaining eighteen regions.

The boundary hardening pass can check every side and corner of the development
scaffolding,
keeps fully and partially shared edges continuous, promotes custom-rim chunks to
dense low-quality geometry before gap LOD selection, and keeps all 100 hostile
camp footprints outside the ridge shoulder. Auto Journey consumes the authored
road graph, including portal landing direction, rather than cutting straight
through water or immediately re-entering a portal. Existing WoC arches mark both
sides of every map transition. Floating boats share their visual waterline with
their runtime colliders, and measured collider footprints replace oversized
invisible circles. World layout epoch 11 rejects mixed geometry bundles and
recovers legacy MIR4 save and corpse coordinates at the safe authored start.
The RL observation keeps a continuous campaign axis by combining map ordinal
with local north/south position, so the bent continent no longer collapses late
maps onto the same normalized global Z value.

#### Map authoring constitution

No production map is generated in bulk. The campaign table may retain spatial
scaffolding for simulation tests, but the player-facing world includes only maps
that pass their own authored gate. Work finishes one map before starting the
next.

Every map must have:

1. A map-specific blueprint derived from its quests, story, level band and
   progression pressure. Size follows content and traversal rhythm; it is not a
   fixed six-site rectangle.
2. Between six and ten named points of interest. Only the main-quest locations
   are mandatory; exploration, services, shortcuts, resources, events and
   optional danger make the remainder.
3. A coherent biome with deliberate relief, drainage, vegetation, sight lines,
   skyline and natural limits. An open field remains traversable. A blocked
   route visibly explains why it is blocked.
4. Architecture that follows ecology and history. Intact human construction
   belongs to settlements, roads, defenses or an explicitly occupied human
   camp. Wildlife lairs do not receive random houses, stalls or towers. Ruins,
   salvage and ancient structures appear only where the story explains them.
   Before layout begins, narrative review classifies habitation as city,
   settlement, outpost, dispersed or none. `isCity: false` never implies a
   smaller town: it defaults to dispersed contacts or no habitation. An isolated
   chapel, tower, refuge or mission camp is one landmark, not permission to add
   a civic cluster. Only M04, M08, M12, M16 and M20 are city maps in the current
   arc; every other inhabited map must earn each structure from its own story.
5. A route graph with loops, alternate approaches and optional discoveries,
   not a single road that walks the quest list in order.
6. Quest interactions that physically exist in the landscape. Clues, cargo,
   devices, defense anchors and guardian wards are interactable objects; arrival
   alone never substitutes for the action.
7. An encounter plan for population, patrols, aggro overlap, respawn, safe
   observation shelves and the player-power thresholds at which Auto Journey
   should require manual intervention.
8. An art pass and browser playtest covering arrival composition, landmarks,
   close-range prop cohesion, collision honesty, camera behavior and combat
   frame time. The next map remains frozen until this gate passes.
9. An artistic-tooling pass using the available level-art, Three.js, 3D asset
   and browser-playtest skills. Suitable open-source GitHub projects may improve
   editing, placement, optimization and validation, but they never generate the
   authored layout or replace map-specific artistic judgment. Every visible
   asset must participate in one shared environmental grammar instead of reading
   as an isolated prop.

#### Approved authored map: M01 Vila do Vau

M01 passed user review and remains frozen. M02 is also approved, while M03 is
under review. Its authored blueprint expands
the previous 280 by 240 stamp into a 460 by 520 river valley and defines ten
points of interest: the village, wolf-trail clearing, boar meadow, broken
caravan, five-lights stone circle, moss cemetery, defended bridge, root cave,
guardian grove and two-bridges lookout. Six distinct mission spaces follow the
level 1 to 10 main line; three optional exploration sites create shortcuts and
foreshadow the buried Root Beacon.

The blueprint assigns every point an ecology, architectural language, narrative
role and gameplay role. The village contains all intact civic buildings and all
nine local NPCs. Wildlife spaces use natural or ancient dressing only. Human
salvage is confined to the bandit caravan, while defensive structures belong to
the bridge and lookout. Nine authored road paths form east, west and central
loops. The camp plan now matches quest semantics exactly: wolves, boars,
bandits, moss skeletons, briar guards and dire wolves occupy their corresponding
spaces instead of inheriting the first five entries of a generic mob list. Each
encounter also owns its exact level band from 1 to 10 and resolves to an
appropriate existing WoC creature model instead of the shared placeholder.

The first close-range art pass separates human-lit village lanes from unlit
wilderness trails, pushes the outer ridge beyond every mission arena, rings the
alpha encounter with authored oaks and grounds the existing WoC bridge asset
between two shaped banks. The river leaves a visible dry ford at the tutorial
crossing and a separate narrow bridge corridor at the defended crossing. Roads,
water and terrain agree on both routes, so neither crossing depends on an
invisible blocker. The existing map window now renders the authored world's
own coordinate space instead of clamping it to the classic WoC atlas. It shows
the real relief, lakes and road graph, anchors all ten POIs with cartography
dots and deterministically separates overlapping labels. The same authored POI
names appear directly in the HUD.

The production order remains blueprint, implementation, full quest/art
playtest and user review for one map at a time. No "twenty-map macro pass"
remains in the plan.

#### Approved authored map: M02 Trilha dos Juncos

M02 now replaces its former three-route scaffold with a 640 by 440 authored
wetland built directly from the six level 11 to 20 main quests. Ten named
points of interest cover the defended Posto das Duas Pontes, three-flame reed
ritual, scout crossing, cargo landing, four memory islands, old beacon, sunken
depot, seasonal shortcut, three tide shelters and the guardian root. Nine road
graphs form west-bank, memory-island, shelter and guardian loops instead of a
single quest-order corridor. Two actual plank bridges occupy dry causeways
between visible water banks.

The six hunting grounds use distinct WoC runtime creatures and exact quest
bands: thorn imps at 11-12, bandits at 13-14, moss skeletons at 15, rabid boars
at 16-17, owlbear cubs at 18-19 and briar guards at 20. Intact Fenbridge
architecture is confined to the raised settlement and maintained crossings.
Wildlife spaces contain natural banks, one capsized supply run and no arbitrary
human buildings; memory islands use drowned ritual props; rescue tents belong
only to the flood shelters; root walls define the guardian sanctuary. Four
campaign NPCs and five uniquely named residents live inside the defended post.

The physical gate samples every authored road against the runtime water query,
including both dry crossings, and rejects solid props or campfires that overlap
a route. The integrated atlas renders all ten POIs, lakes and loops. A local
browser pass on the integrated Intel GPU held approximately 54-57 FPS at the
post and guardian root and approximately 55 FPS at the scout crossing on Low,
rather than reproducing the former 10 FPS combat cliff. Auto Battle stayed
inside its search radius at the safe post, then acquired and fought only nearby
hostiles when the diagnostic entry started inside the camp.

The close-range asset pass now applies each reused GLB's original WoC runtime
normalization before the M02 placement multiplier. Fenbridge buildings retain
their native dimensions; tents, sluice posts, dead trees, willows, shrines and
root walls agree with their physical footprint; rectangular buildings and
palisades use oriented boxes instead of oversized invisible circles. Every NPC
is outside those solid footprints. The two bridge banks render as one merged
water surface with the authored causeways physically cut out, eliminating both
stacked lake discs and the water sheet that previously covered dry ground.

All M02 objective stages now resolve to the visible landmark that explains the
action rather than to a generic hashed point. The automated interaction reach
is the same authoritative six-yard reach as manual Interact, so the three final
root wards are operated from the reachable edge of their solid scenery instead
of routing into the root collider. A deterministic run completed all thirteen
M02 interaction stages without camps, and the dedicated guardian-root
regression advances the formerly stuck stage through the real Auto Journey
tick. The atlas derives navigation from the active physical world, displays the
approved M01 return passage and the admitted M03 forward passage, and cannot
expose the unfinished M04 portal from a stale twenty-map save.

M02 passed user review and is frozen beside M01. A developer-only diagnostic
URL can start at an authored map hub or POI for isolated local playtests;
production entry, progress and saves never use that override.

#### Approved authored map: M03 Bosque do Vale

M03 is a 724 by 610 ancient twilight-forest valley authored around the complete
level 21 to 30 main line. It deliberately stops repeating M01's daylight vale:
the map has a green hunter refuge, a violet twilight forest and a cold,
haunted eastern gorge. A visual-only biome paint connects those three districts
without changing the authored heightfield, collision or traversal physics. Its
ten POIs are Abrigo das Silvas, Ruínas da Marca Apagada,
Jardim das Ervas Feridas, Campanário Partido, Covil da Vigia de Plumas,
Encruzilhada dos Quatro Totens, Garganta do Uivo, Gruta do Orvalho Azul, Ponte
da Raiz Fendida and Mirante do Farol da Raiz. Eleven road graphs connect those
places through quest routes, shortcuts and alternate approaches; two physical
plank bridges cross visible forest streams, and seven water bodies break the
valley into distinct navigation spaces.

The refuge is one hunter shelter with a spring well, not a settlement. Four
contacts remain at that safe recovery point; five others occupy story-specific
observation posts along the forest routes, including the herb approach, the old
bell road and the totem ascent. The remaining landscapes use only natural,
ancient, corrupted or guardian vocabulary. Six dense aggressive camps escalate
from nine level 21-22 wolves to twelve level 30 dire wolves. One hundred and six
hand-authored WoC prop placements, two ancient ruin rings and twenty-three
terrain stamps provide the close-range art pass without importing an external
or 2D asset. Living oaks and restrained refuge dressing stay around the shelter;
luminous mushrooms, amethyst
outcrops and a mixed living-dead canopy identify the central wilds; dead crowns,
exposed root walls and the Star Heart crystal mark the final guardian ground.
Both crystal cave mouths face
their player approaches, remain physically traversable and use visible compound
boulder shells instead of a solid invisible circle across the entrance or a
walk-through visual mound. Settlement and
ruin assets reuse their native WoC presentation normalization, with matching
physical footprints.

The final Garganta do Uivo is no longer an open field. Its combat floor is
lowered between two visible root ridges more than ten yards above the arena,
with two western approaches and the eastern map-exit corridor left open. Four
large root walls and three ward shrines define the boss space without an
invisible perimeter. Runtime terrain tests pin both ridges continuously and the
open exit. Actual Sim Auto Journey runs operate all three M03-Q06 wards and,
with seed 20061, complete the full return from the gorge to Selene. The two
campaign branches around the first bridge are continuously dry and remain below
the player climb limit.

Twenty-seven exact interaction points cover thirteen authored objective plans
for clues, sequences, tracks, defense preparation, evidence reconstruction and
guardian wards. The integrated world projects each POI, NPC and hostile camp
exactly once, has no overlap with any frozen source-data scaffold and admits
only the M01-M02 and M02-M03 travel links. There is no M04 portal landmark or
active trigger. The browser art pass reviewed the green refuge, twilight garden
and cold gorge on the local Intel integrated GPU with the diagnostic overlays
active. M03 remains admitted, but its habitation pass was reopened after the
refuge was reduced from a compact settlement to one hunter shelter and five
mission contacts were distributed through the forest. That revised composition
requires the next user visual review before M03 is frozen again.

#### Current approval candidate: M04 Ruínas da Encosta

M04 replaces its generated level-band scaffold with an 860 by 760 highland
city and ruin complex built around the complete level 31 to 40 main line. Its
eleven named POIs are Passo da Lente, Muros sem Dono, Vau Dourado, Pedreira da
Raiz, Muralha da Noite, Estrada das Três Voltas, Cidadela do Regente, Cripta da
Raiz, Aqueduto do Vento, Farol da Raiz Invertida and Ponte da Fenda. Twelve
branched road graphs connect the arrival pass, city, quarry, northern wall,
switchbacks, citadel, crypt, aqueduct, final beacon and exit. No route leg
depends on an invisible boundary, and the physical path gate validates every
leg in both directions against collision, water depth and climb slope. The
quarry and crypt use open doorway colliders with solid flanking masonry, while
the final bridge crosses a physically lowered cleft instead of continuous flat
ground.

Four connected visual districts prevent M04 from repeating the prior forests.
The inhabited terraces use warm amber stone and civic silhouettes; the quarry
and crypt form a cold root undercroft; the outer ramparts and aqueduct use an
exposed gale palette; the finale becomes an ember-lit inverted-root arena. The
paint is presentation-only, so these local identities do not alter traversal
physics. Recent human architecture exists only in defended Vau Dourado and the
Regent's citadel. Military tents belong to occupied walls and switchbacks.
Wildlife shelves contain natural geology or ancient infrastructure with a
clear historical reason, never arbitrary houses.

The authored population uses 78 aggressive enemies across six level-matched
camps, from level 31 bandits to level 40 skeleton spearmen. The survival step
at the northern wall now materializes an aggressive Alfa da Muralha instead of
waiting in an empty circle. Six exact creature presentations and the named
encounters resolve to existing WoC runtime models. Sixteen uniquely named
residents live within the defended city terraces, including four campaign
NPCs, while 133 hand-placed WoC props and fourteen terrain stamps establish the
city, defenses, quarry, crypt and final arena without any 2D or external game
asset.

All thirteen M04 contracts are grounded in the same authored landscape, not
only the six main quests. Forty-one objective plans with ninety-one physical
points place clues, hunts, repairs, civilian preparation, defenses, supply
escorts, resource work, service inspections, crafting stations, dungeon entry
and beacon certification at their visible landmarks. Every point is physically
reachable with the production world seed, including the six short local legs
off the authored road graph. The three-point ascent
escort completes through the real Auto Journey runtime, and profession
receipts return to the visible Vau Dourado workshop instead of a hashed quest
clearing. The Root Crypt remains a deliberate short-instance boundary; Auto
Journey reaches its entrance and dungeon entry still requires the player's
explicit confirmation.

M01 through M03 remain frozen, and M05 is not admitted into the playable
world. M04 advances to final browser art, combat-performance and quest-flow
approval before any work begins on M05.

#### Art and tooling research

Concept images may be generated as non-shipping art references. Shipping
geometry still uses the WoC 3D vocabulary and its deterministic GLB pipeline;
no concept bitmap becomes terrain or a 2D game asset.

The official Three.js repository includes a scene editor and transform controls
that are useful references for a later developer-only placement overlay. The
project already depends on Three.js and glTF Transform; the latter already owns
the deterministic GLB optimization path, so no duplicate asset framework is
needed. `three-mesh-bvh` is a possible future acceleration for terrain raycasts
and spatial validation if profiling the larger authored map proves the current
queries insufficient. Blender remains the appropriate open-source tool for
manual mesh and terrain art when the runtime height-stamp vocabulary cannot
produce the required silhouette. None of these projects is added merely because
it exists; each adoption needs a measured repository gap, license review and a
focused integration test.

Asset procurement is intentionally gated after the physical and greybox passes:
topology, routes and honest limits need no purchase. If the existing catalogue
cannot supply the required silhouettes, the current shortlist is:

- **Best first environment purchase:** Daniel Mistage's *STYLIZED Fantasy
  Village* (currently USD 50), over 800 modular village/environment assets with
  FBX/Blend sources and four atlases. Use for denser human settlements only
  after GLB conversion/budget validation.
- **Best direct-GLB organic settlement option:** Standout7's *LOKIT Elf Village
  Modular Pack* (free subset; currently USD 15/29.99 tiers), with GLB/glTF,
  atlas-based materials and CC0 terms. Use for forest and mystical villages.
- **Dungeon gap, no purchase required:** Sigil's Vault *Modular Dungeon Kit
  v1.0*, name-your-price/CC0, 90+ GLB/FBX modules on one trim sheet. Evaluate
  only if the existing KayKit castle/dungeon vocabulary cannot distinguish the
  underground maps.

Do not buy an Unreal-only bundle, an AI-assisted pack with inconsistent pivots,
or a pack with ambiguous redistribution terms for this web pipeline. No external
asset is purchased, downloaded or imported until the user approves the exact
pack; every approved source must still pass the repository GLB optimization,
fingerprint, collision, attribution/license and browser-budget gates.

Research references: [Blizzard Artcraft: Level Design Part
4](https://worldofwarcraft.blizzard.com/en-us/news/16595426), [Blizzard
Highmountain zone
preview](https://worldofwarcraft.blizzard.com/en-us/news/20241588), [STYLIZED
Fantasy Village](https://daniel-mistage.itch.io/stylized-fantasy-village),
[LOKIT Elf Village](https://standout7.itch.io/lokit-elf-village), and [Modular
Dungeon Kit v1.0](https://sigilsvault.itch.io/modular-dungeon-kit-v10).
Open-source tooling references: [Three.js editor](https://github.com/mrdoob/three.js/tree/dev/editor),
[Three.js transform controls](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/controls),
[glTF Transform](https://github.com/donmccurdy/glTF-Transform),
[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh), and the
[official Blender mirror](https://github.com/blender/blender).

### Historical Phase 2 seed, superseded by the execution ledger

The following was the original narrow vertical-slice target. It is retained as
decision history and is not the current remaining scope.

Class `warrior` only, profile `mir4-gameplay-port`, one procedural zone:

1. Character creation with source level-1 stats (4000 HP, 600 MP, PA 50) and the
   five-class gate.
2. Skills 1102 and 1104 plus basic attack, bps formulas ported with pinned-value
   tests (1102: 36 MP, 25 s cooldown, 3 impacts, 40+40+45 at PA 50, 900 ms stun).
3. A zone modeled on m01 "Vila do Vau": one safe hub with one quest NPC, one
   hunting zone with one monster family (source spawn formula, normal grade),
   one exit portal stub.
4. One quest in the M01-Q01 shape: talk, hunt N, turn-in, declarative record.
5. Loot and one equippable item whose attributes enter the stat calculation.
6. Minimal auto battle: toggle via `IWorld`, target acquisition, the
   survival/single-target/basic-filler rotation tail, pursuit via `pathfind.ts`,
   anchor return; all inside `src/sim/auto_battle/`.
7. Persistence in the mir4 save namespace offline, Postgres behind the profile
   guard online, and a parity test across both world implementations.

Acceptance for the slice: `npx vitest run` green on new tests,
`tests/world_api_parity.test.ts` updated for any new facet member,
`tests/architecture.test.ts` and `tests/monolith_budget.test.ts` green, and
`node scripts/gate_select.mjs` passing.

## Non-goals

- No second simulation, inventory, combat loop, quest manager, server, or
  renderer. No TMX loader, no 2D renderer, no tile layer over Three.js.
- No silent rebalancing: numbers change only with a documented decision here.
- No classic-profile regressions: every change must stay inert under
  `woc-classic` (the foundation's fail-closed seams are the pattern).
