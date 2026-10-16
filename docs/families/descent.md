# Fractal Descent

**EXPLORATORY / EMPIRICAL**, 2026-10-14, waves 1–2 of the worlds expansion (lane L3). It is a new family (`descent`, number 93) behind the world **Endless Descent**. Fractal Flight is untouched, so its look ids, images and timings stay the same.

## Algorithm and signature detail

This is a raymarched distance field: a Menger-sponge free space (crosses carved at scales 2/3^k) plus one **coarse hall carving** a level above it, on a six-unit lattice. The hall is three anisotropic prisms per cell: the street the camera flies along (x), cross streets (z) and vertical shafts (y). Development changes only the hall's half-sizes, so the space itself morphs and nothing crossfades.

- **0 · Corridor:** the hall equals the sponge's own corridor (`opening / 3`). Unlike Flight it is nearly dark: a dim headlight, one dark stone for every recursion level, and sunlight falling through the ceiling's own vertical holes as volumetric shafts and floor patches, which are the hero.
- **1 · Cavern:** the hall grows into a pillared multi-storey cavern. The pillars and thin floors are still carved by the sponge. Sunlit patterns cover the floor, and god rays fall only through the large hall shafts, so the volume stays crisp.
- **2 · City:** floor and ceiling heights grow exponentially, so the pillars become endless towers.
  - **Windows:** the towers' sponge holes become windows, and seeded floors of them light up.
  - **Decks:** about half of the blocks carry perforated megastructure decks every 18 units above the flight; below it the city opens into a lit abyss.
  - **Avenues:** every third block is an avenue, and the gaze swings slowly to alternate sides (period 36 units) to look down its deep vista.
  - **Gateways and bridges:** some blocks have gateways across the street or closed bridges between towers.
  - **Depth:** the haze glows from the lit depths and uplights tower undersides (aerial perspective), so towers read as layered silhouettes.

The signature detail is the recursive square aperture, at every scale from tower block to window. All lighting serves it. Sunlight is tested analytically: the point is projected along the light to just above the ceiling (or one block up in the city), and the openings are checked there. Surface sun uses the hall and the two coarsest vertical sponge shafts. Beams use the coarsest sponge holes in the corridor and only the hall shafts in the open states. The scattering density does not depend on the fog, and beams fade in from about one unit ahead of the lens, so flying through a shaft never veils the frame.

## States and looks

The world uses `Sponge Corridor` (0), `Pillared Cavern` (1) and `Endless City` (2). All three use seed 9301 and identical non-development parameters, so `continuousDevelopment()` recognises them.

The five extra looks:

- **Ember Gallery** (0.4): the corridor halfway to a gallery.
- **Quiet Vault** (1): a slow pillar hall.
- **Lantern Arcology** (2): a dense lit city.
- **Skyfall Streets** (1.6): towers still joined by distant floors, fast and fully banked.
- **Narrow Lattice** (0.25): a narrower, finer corridor.

## Energy, rhythm and camera

- **Energy** controls integrated speed (×0.65–1.3, about 2×), recursion depth (+1.8 levels), fog depth and how many windows are lit. Brightness stays nearly constant across the 0.1/0.5/0.9 ladder.
- **Gestures:**
  - **Window cohort** (4 beats) lights one seeded quarter of the windows.
  - **Kick floor band:** in the city, one floor band of windows answers every kick and climbs one storey per beat, using the shared bounded kick envelope.
  - **Flight impulse** (legacy 8-beat descriptor, motion) increases integrated forward speed by at most 60%; it never settles backwards.
  - **Seam surge** (legacy 16-beat descriptor) flares recursive near-miss edges and aperture bevels, including the city.
  - **Ignition wave** (slot 3) lights the city floor by floor, alternating up from the abyss and down from above; in the halls it lights aperture rings away from the lens. See the authored presets below.
- **Kick:** the FOV punch is 2.5%.
- **Camera:**
  - **Travel:** the flight moves along +x with sway and bob scaled to the guaranteed free core of the camera's street.
  - **Banking:** at most 0.16 rad into the turn.
  - **City pitch:** the camera pitches slightly down in the city.
  - **City vistas:** the gaze swings up to about 31° to alternate sides, peaking in each avenue.
  - **Free core:** per-block variation only widens the camera's street, and gateways stay above the bob. `tests/descent.test.mjs` checks the clearance (at least 0.2 units in the narrowest variant) for every development, opening and travel phase.

## Continuity and endlessness

A one-texel RGBA8 state holds the travel phase (period six units) and a 16-bit wrap counter. Block randoms are keyed by `floor(x / 6) + counter`, so wraps are invisible and the city does not repeat every block. The counter recurs after 65,535 wraps (about 390,000 units). At that point the block pattern changes once: after about 24 hours at the maximum fader and energy, or about 5 days at default speed. Development never resets the state, the seed or the camera phase. Only `u_time` drives the beam shimmer, and it is wrapped with `mod`. Stills checked at 8 hours of scene time are unchanged in character.

## Cost

| Measure           | Value                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| March cap         | `min(96, u_raySteps)`                                                                                                                       |
| Detail cap        | per ray, at 1.6 output pixels up to 1080 short-side pixels, growing to 3.2 px at 2160                                                       |
| Surface tolerance | 0.6 px (same 1440-line rule)                                                                                                                |
| Sky probe         | alternate march steps, cached block hash; open halls use segment midpoints and cap lit segment length; skipped where the city has no shafts |
| Normals           | analytic, one evaluation (every face is axis-aligned)                                                                                       |
| Shading at hits   | 1 normal + 3 AO + 1 shadow evaluation; AO and shadow probes cap the recursion to their radius                                               |

The detail cap stops recursion with fractional fading; this also removes far shimmer. Above 1080 short-side pixels it grows with resolution, so 4K avoids near-sub-pixel recursive slits. The fine-detail cutoff is an intentional wave-5 look change, not reduced render resolution. Full-size 4K stills and crops were inspected.

The step bound against neighbouring blocks uses the narrowest block variant, which is a provable subset of free space. It is evaluated only when the block-face clamp binds.

Wave 2 cost was measured on the shader alone: the visual draw, interleaved 48 times per variant in one page against the wave-1 shader, at 3840×2160, energy 0.95, minimum time. This is **INDICATIVE**: the GPU was shared with other lanes (load average about 90–100), so whole-frame `profile-families` numbers swung by 2–4× and are not reported.

| Development (two camera phases) | Wave 1       | Wave 2              |
| ------------------------------- | ------------ | ------------------- |
| Corridor                        | 17.0 ms      | 15.1 ms (−11%)      |
| Cavern                          | 31.4–31.8 ms | 29.8–30.2 ms (−5%)  |
| City                            | 30.6–30.8 ms | 25.5–25.9 ms (−16%) |

That is despite the new decks, avenues, vistas and shafts. At 1080p, shader cost is unchanged to −7%.

For context, the integration's idle serial measurement of wave 1 (whole frame) was 7.6 / 9.8 / 9.5 ms at 1080p and 31.9 / 42.6 / 42.3 ms at 4K.

Toggle profiling at 4K shows where the remaining cavern time goes:

- **Light shafts:** about 17%. Fewer probes did not help measurably, and a separate fixed-stride beam loop was slower; both were discarded.
- **Hit shading:** about 15%.
- **The march itself:** the rest.

In the city, about 20% goes to block-face stepping. A looser face margin would let rays penetrate towers beside avenues, so it was rejected.

## Verification

- `tests/descent.test.mjs` checks:
  - the camera's free-space clearance (CPU mirror plus source checks);
  - wrap-counter continuity under 16-bit quantisation;
  - style limits;
  - preset bounds;
  - world continuity;
  - gesture periods.
- Review film: `PHOSPHOR_HEADLESS_RIG=1 node scripts/world-film.mjs --world descent --rig`.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family descent --rig`. It shows zero GL errors and non-finite values, and no black frames. Wave 2 is deliberately darker: mean luminance at 0.1 is 0.006–0.014.
- Analytic normals agree with four-sample finite differences on the large majority of hit pixels. In the 1080p check across corridor, cavern and city, 1.5–17% of hit pixels differ by more than 37°, at edges, block faces and step-limited rays; under 1% are opposite. Side-by-side stills are visually identical apart from slightly crisper edges.

## Limits

- Window lights are the lit inner faces of one horizontal tunnel per sponge window: a stylisation, not interiors.
- Beams are an analytic single-scatter approximation, and their brightness hold between alternate steps can soften thin shafts.
- Shadows from finer sponge levels are short-range only (one SDF sample).
- At 4K, the City is the most expensive state.
- Wave 2 frames are darker by design (dark-ground rule); they rely on the shared post chain and bloom for highlight punch.
- Some fine distant window edges remain step-limited; the analytic bevel is a lighting cue, not bevelled geometry.

## Wave 5 rework · 2026-10-15

All IDs, state/look names, schemas, seeds and preset parameters are unchanged. No world-definition or engine changes.

Four filmed/reviewed visual rounds:

1. Separate the palette-primary sunlight from cool structural fill (the old multiplicative tint made floor light muddy blue); lift the bounded headlight so the opening corridor reads. Replace four AO probes with three geometrically spaced radius-aware probes, precompute their recursion caps, filter fine detail earlier at 4K.
2. Add opposing cool rim/key light and depth uplight, reduce accent lamps from 12% to 3.5%, expand the five fixed-scale SDF candidates in original order (same suffix bound and first winner).
3. Add a cheap analytic raking bevel cue to resolved aperture corners, strengthen existing shaft scattering, raise the peak gaze slightly so the towers, not the floor void, carry the climax. Raise conservative march progress from 0.90 to 0.97 of the same distance bound.
4. Add stronger light from the city's depths, shade window light into the recursive tunnel instead of flat plaques, and correct projection/footprints to the short side in portrait.

Native headless M3 Pro stock profiler p50 ms (whole synchronous frame including post):

| Resolution             | Corridor    | Cavern      | City        |
| ---------------------- | ----------- | ----------- | ----------- |
| 1080p baseline → final | 4.7 → 4.1   | 6.7 → 5.4   | 5.4 → 5.0   |
| 4K baseline → final    | 17.4 → 13.7 | 22.7 → 18.5 | 20.8 → 18.4 |

A heavily contended intermediate final probe reached 32–40 ms at 4K; it is retained rather than hidden (`descent-contended-*`). To distinguish the shader from fleet load drift, an AB/BA native comparison alternated reference `deaaae1` and current frames in one browser (72 samples per side/state). It corroborates the savings: 1080p **4.8→4.2 / 6.5→5.7 / 5.8→5.1**; 4K **17.0→14.5 / 26.1→22.0 / 24.2→20.8**. Every state passes the baseline+5% rule. This is throughput, not venue cadence; 4K open states remain above 16 ms.

Added a 30,000-point CPU comparison of the pruned constant-scale map against the complete ordered candidate list (distance and material winner), plus source guards for the march factor, AO radii and short-side projection. Existing free-core clearance, fixed-point travel, preset/world identity and rhythm checks remain. All three space families pass the native 3600/4096/43200-second seam and rate-step audit; no GL or non-finite errors.

Reviewed the energy ladder, Quiet Vault, Phosphor/Ember/Glacier, portrait, native 4K states and full-size crops. Historical wave-5 self-rating (superseded by the independent r3 baseline): **8.5/10**. The spatial arc and light are stronger and cost is substantially lower; the hard recursive grid and a few step-limited distant edges still stop it short of a polished 9.

Evidence in fleet `rework-space/output/`: `descent-baseline/descent.{mp4,png}`, `descent-final/descent.{mp4,png}`, `descent-extra/`, `descent-ember/`, `descent-glacier-portrait/`, `descent-ladder/`, `stills-4k/`, `paired-1080.json`, `paired-2160.json`. Superseded films removed.

## Round 3 · 2026-10-16 continuation

**EMPIRICAL / EXPLORATORY**, implemented by openai-codex/gpt-6.1-sol, continuing the interrupted worker's dirty shader and existing films. Current main's independent baseline was **L4 / G2 / E1.5, Overall 3.0**. The older self-rating above was far too generous. Current self-assessed look: **7/10**, not an independent pass; the city has an identifiable climax, but early states remain repetitive and the default lime sunlight can still look olive.

### Look and energy grammar

The same recursive field, eight presets, seeds and world/state names remain unchanged. No world-definition migration is needed. City fog now depends on height: saturated secondary light rises from far below, tower undersides catch it, and lower storeys dissolve into it. Overhead decks remain, while the lower city opens into the abyss. A distance-filtered street grid supplies scale far below the towers. The view pitches down into the city without changing camera clearance.

Windows are coherent seeded storeys rather than independent speckle: mostly primary offices, some cool secondary floors, rare accent signals. Hot lips occur on a seeded 18% of aperture rims, not a uniform outline. Stronger sun patches and sparse recessed hall lamps keep the first state readable. Open-hall light shafts use midpoint sampling and capped illuminated segment lengths to avoid a blanket of luminous haze; probes remain alternate-step for cost.

Energy retains the approximately 2x base-speed range and increased recursive detail, adds lit floors and deeper abyss illumination. Development still changes only one continuous space. The kick FOV remains 2.5%, and the integrated flight impulse is forward-only, bounded to 1.6x instantaneous base speed.

### Authored rhythm

| Style      | Preset            | Family hits/bar |
| ---------- | ----------------- | --------------- |
| restrained | Empty avenues     | 2.25            |
| driving    | Window procession | 6.25            |
| accented   | Recursive rush    | 11.0            |

Slot 3 **Ignition wave / Lichtzündung** uses full-strength hits. Divide its envelope by the shared energy response, then use `1 - envelope` as an eased front: zero at the hit, one at completion. Event-count parity alternates the city's vertical direction. The front quantizes window ignition to each storey; behind it the light decays to the palette. In corridor/cavern it travels along the actual recursive aperture rings instead. All lighting remains local, with no full-screen white and no changes to the shared flash limiter.

- Restrained: four-bar eighth-note loop; steps 14 and 31 (zero-based), duration 2.5 beats.
- Driving: two-bar eighth-note loop; steps 3, 9, 14, duration 1.75 beats.
- Accented: two-bar sixteenth-note loop; steps 2, 11, 18, 26, duration 1.5 beats.

Window cohort and seam surge also flare resolved aperture lips; the camera track stays sparse. All styles retain independent syncopation, and the signature has at least two hits per loop.

### Verification and evidence

Family tests cover conservative camera clearance, forward fixed-point travel, unchanged preset/world continuity, four gesture slots, named style validation/density, bounded scheduled values, and a finite monotone eased ignition front at all energies. Shared world-rhythm and pipeline-flash tests pass. The custom `scripts/verify-descent.mjs` leaves the limiter enabled, yields for asynchronous approval, and rejects empty/nonfinite/GL-error frames.

Final review files: `artifacts/look-review/descent-r3/descent-{sheet,rhythm}.png`, `descent.mp4`, `grids.md`. Iteration films: `descent-r3-w1`, `descent-r3-w2`, `descent-r3-w3`. Supplemental evidence: `artifacts/look-review/descent-reversal-portrait/` (Ember, reverse 2→0), `artifacts/look-review/descent-extra/` (Quiet Vault, Glacier), `artifacts/stills/descent-final-late-ladder/` (Phosphor, energies 0.1/0.5/0.9, scene time 43200 seconds). Native profile JSON lives under `artifacts/performance/descent-final*`.

Native M3 Pro synchronous whole-frame throughput (shared fleet GPU; milliseconds, not venue cadence):

| State    | 1080p p50 / p95 | 4K p50 / p95 | ABBA Δ p50, 1080p repeat / 4K |
| -------- | --------------- | ------------ | ----------------------------- |
| Corridor | 4.6 / 4.8       | 19.3 / 20.0  | +6.7% / +4.6%                 |
| Cavern   | 7.3 / 8.4       | 26.0 / 26.8  | +3.2% / +3.4%                 |
| City     | 6.4 / 7.7       | 22.4 / 22.9  | +1.7% / +2.3%                 |

Reference was current main (resolved hashes are in each JSON). The first final 1080p ABBA run was +4.3% / +4.2% / +12.3%; repeat was +6.7% / +3.2% / +1.7%. Retained both rather than hiding fleet variance. Thus the strict +5% relative gate is **not cleanly met**; corridor remains a small regression (0.3 ms on repeat). All final stock 1080p states meet 8 ms p50, but **all 4K states exceed 16 ms**. No reduced-resolution or engine workaround was introduced. Initial every-step cavern beams cost +12–19%; alternate-step midpoint probes brought the final cavern pair delta below 5%.

Final `npm test`: **971 passed, 21 skipped, 0 failed** (992 total). Typecheck, native DE/EN i18n, build, distribution audit (151 assets), formatting on the family/script/test/doc/plan files, and `git diff --check` pass. Focused Descent/world-rhythm/flash suite: 46 passed. Final late ladder uses a fixed clip-energy anchor of 0.5 so it genuinely exercises the energy slopes; all nine frames have nonzero coverage and zero GL/GPU/nonfinite errors. Limiter-enabled stills and unmodified official review/profiling tools are complementary evidence, not a venue photosensitivity certification.

## Round 4 · architectural hierarchy and travelling ignition

Independent r3 review: **L6.5 / G8.5 / E7, Overall 7.0**. This revision addresses its four priorities without changing world/state/look IDs, seeds, schema, camera route, integrated travel or groove names. No saved-world migration is needed.

1. **Breakdowns:** selected coarse recessed apertures emit saturated primary/secondary inner light with limited spill. Six-unit architecture-attached threshold lights and a narrower field of view establish the main portal. Sun patches are quieter; intervening piers remain dark.
2. **Monumental recursion:** the coarsest carving grows to 1.2 times its former width; fine carving shrinks to 0.6. This changes the field itself into heavier piers with larger dominant openings, rather than merely dimming a tiled texture. Fine rims and windows are quieter and the distance footprint rises from 1.6 to 3.6 pixels (scaled above 1080 short-side pixels). Large seeded city chambers retain localized lime/lilac activity between events.
3. **Smooth haze:** removed the projected abyss street grid that caused the evenly spaced blue diagonal bands. Removed periodic dust modulation. Smooth height/depth haze and real ceiling-opening-occluded hall shafts remain; the city void has no projected screen.
4. **Ignition wave:** one advancing storey, adjacent facade spill and a short decaying wake replace the persistent passed-floor plateau. Every recursive scale uses the same 2/3-unit storey address. The primary leader precedes a localized accent wake; alternating vertical direction and hall aperture-ring travel remain. The driving duration is now **2.25 beats**, with unchanged eighth-note hits at steps **3, 9, 14** (zero-based). Restrained duration remains 2.5 beats, accented 1.5. Presets remain **Empty avenues / Window procession / Recursive rush**, at **2.25 / 6.25 / 11.0 family hits/bar**. No polyrhythm was requested by the reviewer, so placements are preserved.

Five filmed change/read/critique rounds are documented in `.claude/world-polish/plans/descent-r3.md`; individual early/peak frames were inspected alongside both sheets. Canonical reviewer evidence: `artifacts/look-review/descent-r4/` (`descent-sheet.png`, `descent-rhythm.png`, `descent.mp4`, `grids.md`, full-size stills). Self-assessed L7.5 / G8.5 / E8.5, rounded Overall 8, **not an independent acceptance**. The material remains angular and some sunlit lime surfaces still trend olive.

### r4 verification and cost

Tests add coarse/fine aperture hierarchy and no-striped-projection guards, common-storey addressing, and numerical narrow-leader/short-wake checks. Existing conservative field bounds, free-core clearance, travel continuity, density/preset validation and energy-normalized front tests remain. Full suite: **1005 passed, 21 skipped, zero failed**; typecheck, build/dist, native DE/EN UI and formatting pass. Initial software UI navigation timed out; native rerun passed.

Limiter-enabled native still probes cover all three states at energies 0.1/0.5/0.9, Phosphor at scene time 43200 and Glacier Quiet Vault in portrait. All 18 frames are nonempty with zero GL/GPU/nonfinite errors. Ember reverse-development film was inspected. Shared flash limiter and official film/profile tools are unchanged; offline films do not establish live photosensitivity compliance.

M3 Pro synchronous native throughput, including post, under fleet load:

| State    | 1080p p50 / p95 ms | 4K p50 / p95 ms | ABBA p50 delta vs main, 1080p / 4K |
| -------- | ------------------ | --------------- | ---------------------------------- |
| Corridor | 4.8 / 4.9          | 18.5 / 18.7     | +2.0% / +4.3%                      |
| Cavern   | 6.6 / 6.9          | 22.5 / 23.0     | -9.5% / -14.1%                     |
| City     | 5.6 / 5.9          | 19.6 / 22.9     | -14.3% / -12.8%                    |

All states meet the 1080p and relative +5% gates. **All 4K states remain above the absolute 16 ms budget**; no reduced-resolution or limiter workaround was introduced. JSON: `artifacts/performance/descent-r4-{1080,2160,pair1080,pair2160}/`. Native health sheets: `artifacts/stills/descent-r4-{late-ladder,glacier-portrait}/`; Ember reversal: `artifacts/look-review/descent-r4-reverse/`.
