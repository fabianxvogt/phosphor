# Garden round 3

## Diagnosis

Baseline main sheet: self-assessment L=4.5; rubber rings and a giant cookie-cutter pot, not plants. Baseline SCORES.md is absent; baseline sheet/rhythm were read from main. Existing resumed r3 WIP reimplements the old read-only meadow diff, with a single-use nutrient hit rather than destructive autonomous wilt. Its first compile failed on reserved GLSL `patch`; renamed to `packet` before filming. Before capture: `artifacts/look-review/garden-r3-before`.

Current meadow self-assessment L=6.5: real depth and readable growth, but (1) thick flat black stem ribbons look like stakes, (2) flower tips form a serrated lathe cup rather than individual petals, (3) sky cloud stripes are too graphic, (4) roots are mostly missing in Roots, (5) rhythm reads mostly as overall brightness and lacks the promised pollen event. No independent passing claim.

## Phone moment

A rising pollen aurora sweeps through living flowers: nearby cups unfurl and throw curved golden pollen trails above a saturated dusk meadow. Each plant remains a measured local maximum of the same chemistry through reversal.

## Changes / rounds

1. Thin tapered stems, more organic separated petal edges and fuller root underglow; quieter dusk clouds. Capture/read.
2. Improve silhouette and depth from that film; refine energy-dependent opening and wind. Capture/read warm palette.
3. After `git merge main` brings World rhythm presets, strengthen local sap/cohort/feed response, add slot-3 **Pollen rising** with restrained/driving/accented authored loops. Capture/read default + third palette and portrait. Final film separate.

Keep world/family IDs, three state names, all eight preset names/seeds/params, schema keys and first three rhythm IDs. The renderer concept changes, so preserve the old authored world definition in append-only HISTORY, with a new world description. No shared renderer edits or engine change. Old worktree remains read-only. Old autonomous wilt rejected: it erases identity and repeats feed over an envelope; use single-hit nutrient seed instead.

## Signature

Slot 3 uses w envelope/hit/count: a selected spatial cohort launches a fan of rising, curved pollen trails, blooms open and nearby root pools glow. Event count changes the cohort; hit supplies launch impulse; envelope controls bounded lift. Two or more events per style, slow local saturated highlights, never a full-frame flash.

## Executed film rounds and decisions

- Read the main baseline and the resumed before sheet; no independent SCORES.md entry was present. Old garden worktree stayed read-only. Its chemistry-driven meadow renderer was selectively retained; its autonomous wilt was rejected.
- Round 1 (`garden-r3-round1`): identifiable field of buds, but thick black stakes and serrated cup rims. Thinned/tapered stems, split petals into six independent patches, increased curl and hero scale.
- Round 2 (`garden-r3-round2`, Ember): better plant material but over-graphic clouds, pale cores and dim roots. Quieted sky, saturated the ramp, added measured local root underglow.
- Merged main `0e7f2de` (World rhythm presets) before authoring rhythm. Preset names and the first three tracks retained.
- Round 3 (`garden-r3-round3`, Glacier): the first pollen was too much like fireworks and too broadly bright. Shortened/beaded the trails, reduced halo wash, then placed the patch deliberately in front of the camera so it cannot be invisible off-screen.
- Portrait/late verifier exposed giant foreground petals; continuous clearance retraction fixed them. The no-float path failed compilation on a missing decoder; replaced it with the exact two-byte expression and verified the real fallback.
- Cached continuous per-spot character in a third data row rather than recomputing noise for every plant vertex. Kept full output resolution. Updated single-hit feed to accept amplitudes below 0.5, and made root sap phases torus-periodic.
- Final default/Ember/Glacier captures and portrait reversal read. Honest self-assessment L=7, not an independent pass: low state remains sparse, distant cards/petal surfaces are too repetitive, and pollen is readable but not unforgettable. No claim of reaching 8.
- Native p50 stays inside 8/16 ms. ABBA pairs are +38–68% at 1080p / +29–76% at 4K vs terrain main; explicit conceptual-rework cost, not a +5% pair-gate pass.

## Cost / checks

Main risk: 4096 instances and detailed far images repeat expensive vertex work. Profile early, remove redundant per-vertex noise/integration work before reducing detail. Budgets 8 ms 1080p / 16 ms 4K p50; report pair delta under fleet load. Float-target fallback must keep a garden (not silently hide all flowers). Check low/mid/high energy, all looks, reversal, three palettes, portrait, late time, finite data, GL errors. Full tests/typecheck/i18n/format and family continuity/preset/slot-3 tests required.
