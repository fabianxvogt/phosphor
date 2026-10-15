# Fractal Descent

**EXPLORATORY / EMPIRICAL**, 2026-10-14, waves 1–2 of the worlds expansion (lane L3). It is a new family (`descent`, number 93) behind the world **Endless Descent**. Fractal Flight is untouched, so its look ids, images and timings stay the same.

## Algorithm and signature detail

This is a raymarched distance field: a Menger-sponge free space (crosses carved at scales 2/3^k) plus one **coarse hall carving** a level above it, on a six-unit lattice. The hall is three anisotropic prisms per cell: the street the camera flies along (x), cross streets (z) and vertical shafts (y). Development changes only the hall's half-sizes, so the space itself morphs and nothing crossfades.

- **0 · Corridor:** the hall equals the sponge's own corridor (`opening / 3`). Unlike Flight it is nearly dark: a dim headlight, one dark stone for every recursion level, and sunlight falling through the ceiling's own vertical holes as volumetric shafts and floor patches, which are the hero.
- **1 · Cavern:** the hall grows into a pillared multi-storey cavern. The pillars and thin floors are still carved by the sponge. Sunlit patterns cover the floor, and god rays fall only through the large hall shafts, so the volume stays crisp.
- **2 · City:** floor and ceiling heights grow exponentially, so the pillars become endless towers.
  - **Windows:** the towers' sponge holes become windows, and seeded floors of them light up.
  - **Decks:** about half of the blocks carry perforated megastructure decks every 18 units of height, far above and below the flight.
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
  - **Flight impulse** (8 beats, motion) pushes travel a bounded distance.
  - **Seam surge** (16 beats) flares the recursive near-miss edges.
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

| Measure | Value |
| --- | --- |
| March cap | `min(96, u_raySteps)` |
| Detail cap | per ray, at 1.6 output pixels up to 1080 short-side pixels, growing to 3.2 px at 2160 |
| Surface tolerance | 0.6 px (same 1440-line rule) |
| Sky probe | every second march step, cached block hash; skipped where the city has no shafts |
| Normals | analytic, one evaluation (every face is axis-aligned) |
| Shading at hits | 1 normal + 3 AO + 1 shadow evaluation; AO and shadow probes cap the recursion to their radius |

The detail cap stops recursion with fractional fading; this also removes far shimmer. Above 1080 short-side pixels it grows with resolution, so 4K avoids near-sub-pixel recursive slits. The fine-detail cutoff is an intentional wave-5 look change, not reduced render resolution. Full-size 4K stills and crops were inspected.

The step bound against neighbouring blocks uses the narrowest block variant, which is a provable subset of free space. It is evaluated only when the block-face clamp binds.

Wave 2 cost was measured on the shader alone: the visual draw, interleaved 48 times per variant in one page against the wave-1 shader, at 3840×2160, energy 0.95, minimum time. This is **INDICATIVE**: the GPU was shared with other lanes (load average about 90–100), so whole-frame `profile-families` numbers swung by 2–4× and are not reported.

| Development (two camera phases) | Wave 1 | Wave 2 |
| --- | --- | --- |
| Corridor | 17.0 ms | 15.1 ms (−11%) |
| Cavern | 31.4–31.8 ms | 29.8–30.2 ms (−5%) |
| City | 30.6–30.8 ms | 25.5–25.9 ms (−16%) |

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

| Resolution | Corridor | Cavern | City |
| --- | --- | --- | --- |
| 1080p baseline → final | 4.7 → 4.1 | 6.7 → 5.4 | 5.4 → 5.0 |
| 4K baseline → final | 17.4 → 13.7 | 22.7 → 18.5 | 20.8 → 18.4 |

A heavily contended intermediate final probe reached 32–40 ms at 4K; it is retained rather than hidden (`descent-contended-*`). To distinguish the shader from fleet load drift, an AB/BA native comparison alternated reference `deaaae1` and current frames in one browser (72 samples per side/state). It corroborates the savings: 1080p **4.8→4.2 / 6.5→5.7 / 5.8→5.1**; 4K **17.0→14.5 / 26.1→22.0 / 24.2→20.8**. Every state passes the baseline+5% rule. This is throughput, not venue cadence; 4K open states remain above 16 ms.

Added a 30,000-point CPU comparison of the pruned constant-scale map against the complete ordered candidate list (distance and material winner), plus source guards for the march factor, AO radii and short-side projection. Existing free-core clearance, fixed-point travel, preset/world identity and rhythm checks remain. All three space families pass the native 3600/4096/43200-second seam and rate-step audit; no GL or non-finite errors.

Reviewed the energy ladder, Quiet Vault, Phosphor/Ember/Glacier, portrait, native 4K states and full-size crops. Honest rating: **8.5/10**. The spatial arc and light are stronger and cost is substantially lower; the hard recursive grid and a few step-limited distant edges still stop it short of a polished 9.

Evidence in fleet `rework-space/output/`: `descent-baseline/descent.{mp4,png}`, `descent-final/descent.{mp4,png}`, `descent-extra/`, `descent-ember/`, `descent-glacier-portrait/`, `descent-ladder/`, `stills-4k/`, `paired-1080.json`, `paired-2160.json`. Superseded films removed.
