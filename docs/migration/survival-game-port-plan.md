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
  save namespaces (`mir4-gameplay-port-v1` vs `woc-classic-v1`), parse/require/match
  helpers. Re-exported for the client as `src/game_profile.ts`, resolved at runtime
  from `VITE_GAME_PROFILE` by `src/game_profile_runtime.ts`.
- `SimConfig.gameProfile` (defaults `woc-classic`) and a `gameProfile` marker on
  `CharacterState`: MIR4 saves stamp it, classic saves stay byte-compatible, and
  `Sim.addPlayer` rejects a cross-profile load before restoring gameplay state.
- `server/game_profile_db.ts`: singleton `game_profile_guard` table binds a
  database to its first-boot profile; a MIR4 process refuses to boot against an
  adopted classic database. `server/initial_character_state.ts` stamps new
  characters.
- Wire: `ONLINE_WORLD_LAYOUT_VERSION = 8` in `src/world_api.ts`; the first auth
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
- **Phase 4: equipment systems.** Inventory extension, refinement, enchantment,
  blessings, material wallet, transactional server validation.
- **Phase 5: world and narrative.** Procedural zones for the m01..m20 arc, quest
  chains, NPCs, bosses, portals, regional progression, mounts/spirits.
- **Phase 6: finish.** HUD/tooltip/i18n completeness, balance passes, multiplayer
  and load tests, full gate.

## Phase 2 vertical slice spec

**Status (part 1 + auto battle, shipped):** the combat core runs in the real
Sim (`src/sim/mir4/combat.ts`, `stats.ts`; commits `402d3569b`..`200ac4f56`)
with pinned tests under `tests/mir4/`, plus the sim-side auto battle
(`src/sim/auto_battle/core.ts`: 36yd anchor acquisition, `moveToward`
pursuit, rotation tail, anchor return, manual-input suspend/resume with
re-anchor). A TEMPORARY browser bridge (`src/game/mir4_slice_input.ts`,
keys G/H/B, profile-gated) exercises it offline. Still open for part 2:
the Vila do Vau procedural zone behind a profile-gated world bootstrap
(mir4 camps need the ctor camp loop to resolve `MIR4_MOBS`; the
`MOBS[templateId]` unguarded-read sweep), quest M01-Q01, loot + one
equippable feeding `recalcMir4PlayerStats`, and MP regen are DONE
(commits `00c2b50ff`..`b58680670`, plus the auto-quest journey and the
temporary HUD panel). Remaining for part 2: the `IWorld` mir4 facet +
`ClientWorld` mirror + parity pin + WS commands (replacing the bridge
and exposing the radius setting). Procedure notes: the command universe
is governed (`COMMAND_NAMES` append-only, `WorldFacet` tags,
tests/command_schema + world_api_parity + schema_wiring), and
server/game.ts sits 5 lines under its monolith ceiling, so the WS
dispatch must ride a small `server/mir4_commands.ts` delegate.

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
