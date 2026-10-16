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

## r4

Independent r3: L6.5/G7.5/E6, overall 6.5. Keep the continuous chemical meadow, blue/lime/rare-pink hierarchy, buds→cups→blossoms, smooth flight and named polyrhythmic grids. Reused worktree and merged main before work; pre-existing untracked garden-wip.patch is untouched.

Priority response before building:

1. Pollen: select a narrow camera-relative patch, count moves it between hits. Replace hairline ribbons with soft screen-sized curved drifting motes; selected blooms flare pink and unfurl; ground ring expands from the same focus.
2. Breakdown: enlarge sleeping buds without opening them; add persistent backlit, tapered grass geometry throughout the foreground. Replace reflective oil pools with matte moss/chemical root texture and subtle fireflies.
3. Hierarchy/framing: dim/narrow the horizon, retain layered clouds and add parallax ridges. A bounded smooth crane starts above sleeping buds and lowers among mature stems; phase breathing is continuous and development reverses safely.
4. Secondary gestures: expose a travelling sap front separately from the pollen envelope; run it up stems and petal margins, not through a global brightness multiplier. Cohort explicitly flexes selected petals.
5. Peak: strengthen sparse clustered hero size/height/species variation, veins and rims; reduce broad lime emission and clamp near-camera saturated highlights. Keep blue petal bodies.
6. Wedges: remove smooth reflective ground bands that project into radial wedges; check opaque/distant geometry and clipping in the film, retaining only matte ground and properly tapered grass.

Three mandatory change/capture/read/critique rounds, then final default capture, two extra palettes, all-look energy/portrait/reversal/late/fallback verifier, full tests/i18n/typecheck/format and 1080p/4K/pair profiling. Density targets ≥6/8 driving/accented across tracks; preserve 2/3/4-bar accented polyrhythm and sparse signature. No shared renderer changes.

### r4 executed film critiques

- Round 1 (`garden-r4-round1`): read sheet + rhythm. Pollen now dots/ring rather than scratches and reflections/wedges are absent, but the low peak camera made a bright canopy stripe above too much dark stem space; sky became too black. Not acceptable.
- Round 2 (`garden-r4-round2`): read both sheets. Raised the peak eye and varied pitch, restored a deep blue sky, stronger grass and pink petal opening. Signature local patch is visible, but normal flowers remain too bright/flat and closed buds have serrated rims. Overfilled experimental grids rejected: original syncopated patterns already meet density.
- Round 3 (`garden-r4-round3`): read both sheets. Added tapered bud tips, botanical vein/midrib texture and directional material, but over-darkened the whole plant; low buds lost their luminous sleeping identity. Ring/patch now coherent; small motes do not read as rain.
- Round 4 (`garden-r4-round4`): read both sheets. Restored saturated blue bud emission, shortened/dimmed grass, enlarged only the pollen-selected blossoms, made the pink cluster/ring unmistakable and raised margin-wave strength. Distinct pointed cup and curled open forms, hero veins and saturated throats remain readable. Final patch bound reduced .24→.21 to stay below one-third landscape frame width. Still weaker: lower-energy foreground is deliberately dim and far cards repeat. Self-assessment L7.5; independent acceptance is not claimed.
- Read portrait, reversal and 12-hour verifier frames: no giant camera-entry petals, no wedges, identity retained. Cost at 1080p 3.9–4.5 ms p50, at 4K 8.0–10.8 ms; all under absolute budgets. Initial i18n ran against missing/stale dist and timed out; built then reran native DE/EN successfully. Profiling brief's singular `--family` is unsupported; used documented `--families`.

## Cost / checks

Main risk: 4096 instances and detailed far images repeat expensive vertex work. Profile early, remove redundant per-vertex noise/integration work before reducing detail. Budgets 8 ms 1080p / 16 ms 4K p50; report pair delta under fleet load. Float-target fallback must keep a garden (not silently hide all flowers). Check low/mid/high energy, all looks, reversal, three palettes, portrait, late time, finite data, GL errors. Full tests/typecheck/i18n/format and family continuity/preset/slot-3 tests required.
