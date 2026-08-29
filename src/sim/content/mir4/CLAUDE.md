<!-- Area-scoped: src/sim/content/mir4/ only. Root + src/sim/ + src/sim/content/
     CLAUDE.md already loaded: determinism, dependency rules, data-as-code
     conventions, and the mir4 port plan live there and in
     docs/migration/survival-game-port-plan.md. -->

# src/sim/content/mir4/ - the mir4-gameplay-port datasets

Data-as-code ported from the source project (`F:\Dev\Survival-Game`), the
gameplay authority for the `mir4-gameplay-port` profile. Pure data plus pure
accessors; **inert until the profile wiring consumes it** (Phase 2+ of the port
plan). Behavior modules (combat execution, auto battle, progression) will live
under `src/sim/` system siblings (e.g. `src/sim/mir4/math.ts` for the pure
formulas), never here.

## Files
- `classes.ts`: the five-class roster (identity, weapon, channel, range band,
  creation kit). Hand-authored from the source identity/range/appearance
  modules and `mir4-character-core-v1.json` classCreates.
- `class_levels.ts`: GENERATED (see below). The 5 x 250 level table as source
  column tuples; `reqExp` stays a string because level-250 values exceed
  Number.MAX_SAFE_INTEGER.
- `skills.ts`: GENERATED. The 25-skill catalog (5 per class: deck slots 1..4
  plus the level-5 supplemental slot 5) with damage components, effect
  profiles, rotation roles, and provenance.
- `skills_runtime.ts`: hand-authored gameplay composition over the immutable
  extraction. The five complete 12-skill official class kits and Aeldrune
  progression live here; each class also has its Ultimate in the combat spec.
- `authorial_policies.ts`: GENERATED. The 7 authorial skill policies; per port
  plan Standing decision #2 these are the canon rule for their skills
  (`nativeClaim: false` authorial rebuilds of what the native catalog left
  fail-closed).
- `index.ts`: the public-surface barrel. Import from
  `../content/mir4` (or the barrel path), not the deep files.

## Regeneration
Generated files carry `DO NOT HAND-EDIT VALUES` headers. The one-off generator
lives outside the repo tree in the porting workspace (`tmp/gen_mir4_skills.mjs`
pattern: require the source project's runtime tables, validate cardinalities,
emit typed literals). If the source project ever changes, regenerate and re-pin
the tests below; never hand-patch a value.

## Rules
- Never spread these tables into `../data.ts` or any classic `content/` module:
  the classic tables must stay identical under both profiles, and mir4 content
  must not leak into `woc-classic`. The profile wiring owns when/how these load.
- No engine logic here; formulas live in `src/sim/mir4/math.ts` (a pure leaf).
- The PT-BR `name`/`displayName` fields are the source project's product names,
  kept as data. They become player-visible only through the Phase 2+ UI wiring,
  which authors the English i18n catalog source in the SAME change (root i18n
  rule; M16 wordy-name rule applies to the PT-BR fills).
- Tests: `tests/mir4/math.test.ts`, `tests/mir4/classes.test.ts`,
  `tests/mir4/skills.test.ts` and the per-class `*_complete_kit.test.ts` suites
  pin literal source-observed values. Adding or changing a record means
  updating the pin in the same change.
