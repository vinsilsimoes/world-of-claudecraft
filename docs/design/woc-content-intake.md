# WoC content intake

This runbook keeps World of ClaudeCraft as an evolving source of map technology,
dungeons, and assets without handing Aeldrune gameplay authority to upstream.

## Authority boundary

`composeAeldruneWorld` in `src/sim/mir4/woc_world_layers.ts` is the required
composition seam. It accepts WoC geometry and a separate Aeldrune gameplay layer.
The exhaustive key classification makes a new `WorldContent` field fail TypeScript
until its owner is selected.

WoC may supply roads, props, terrain edits, placements, blockers, biome paint,
water, and presentation models. Aeldrune always supplies zones after adaptation,
camps, NPCs, objectives, portals, services, player start, and campaign projections.

Dungeon ownership is explicit in `src/sim/mir4/dungeon_access_policy.ts`. Original
WoC dungeons are open and use Aeldrune grind tuning and rewards. MIR4 dungeons are
ticketed and use the MIR4 premium reward profile. A new dungeon remains unknown and
unavailable until it is reviewed and registered.

## Intake procedure

Create a temporary branch from the active Aeldrune release, fetch upstream, and run:

```sh
node scripts/woc_content_intake.mjs origin/main upstream/release/vX.Y.Z
```

Use `--json` for a machine-readable report. The command compares the upstream ref
from its merge base with Aeldrune and classifies every changed path:

- `asset-candidate`: provenance, load, visual, and budget review.
- `world-adaptation`: route, collision, water, quest, and performance review.
- `dungeon-adaptation`: explicit admission, tuning, rewards, and completion review.
- `engine-review`: shared runtime dependency review.
- `gameplay-blocked`: never copied automatically.
- `manual-review`: deletion, rename, or copy requiring save-id and provenance review.

Do not merge the intake branch directly into `main`. Import and adapt one classified
slice at a time, then merge it into the active Aeldrune release after its focused and
full gates pass.

## Acceptance checks

Every world intake keeps campaign objectives reachable, fixtures dry, visible and
physical collision aligned, required routes appropriate for their level, and current
spawn, respawn, aggro, XP, loot, and progression behavior unchanged unless separately
approved. Every dungeon intake proves its admission family, tuning profile, reward
profile, entry and exit route, completion, reset, and multiplayer behavior.

## Accepted adaptations

| WoC source | Aeldrune destination | Decision |
| --- | --- | --- |
| `69b49fea01609cd1a7eb4fc4a73c5f160269a62d` — `src/sim/eastbrook_harbor.ts`, `src/render/eastbrook_harbor.ts` | `src/sim/eastbrook_harbor.ts`, `src/render/eastbrook_harbor.ts` | Accepted as geometry only. The four-deck topology and shared render/collision design were retained, but absolute coordinates were adapted to Mirror Lake because importing WoC's relocated town would invalidate Vila do Vau quests and NPC routes. No WoC NPC, quest, camp, mob, reward, or progression data crossed the boundary. |
| `5490bf359c5da3070198f4e1f6a099690f956b41` — dungeon door teleport state | `src/sim/instances/dungeons.ts` | Accepted as an engine correctness fix. Entering either a native WoC dungeon or an Aeldrune scripted room, and leaving either kind, now clears the previous jump and fall state after teleportation. Dungeon admission, tickets, difficulty, encounters, loot, and rewards remain Aeldrune-owned. |
| `3afa0580d` — Nythraxis interactable view policy | `src/render/entity_view_policy_core.ts`, `src/render/renderer.ts`, `src/sim/quest_gated_entity.ts` | Accepted as dungeon presentation only. Interact-only instance objects such as heroic wardstones remain visible throughout the arena, while the same item in the open world keeps ordinary distance culling. Encounter logic, stats, combat and rewards were not imported. |
| `bbb8a943f`, `0fcbef8ac` — Nythraxis heroic failure enforcement | `src/sim/encounters/nythraxis.ts` | Accepted as encounter correctness. An unstacked heroic Soul Rend and a failed heroic Deathless Rage keep their authored lethal result even while the boss carries source-damage reductions; Deathless Rage also ignores the matching Veilbound Mark only for that heroic final hit. Normal-mode mitigation and stacked Soul Rend remain unchanged. No WoC reward or progression table was imported. |

The intake base inspected for this adaptation was `upstream/main` at
`d9f55fe7743bb0d8c5244fd9c096bbc2d264fa55`. A later upstream change to either
harbor source must return to `world-adaptation` review; it is not an automatic
overwrite of the adapted files.
