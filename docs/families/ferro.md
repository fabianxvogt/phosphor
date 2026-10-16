# Liquid Chrome · Flüssiges Chrom

World `liquid-chrome`, renderer `ferro`, family **101**. A mirror pool develops a magnetic crown, then lifts into a floating liquid-metal sculpture. Eight saved looks, all schema keys, seeds, state names and rhythm IDs are preserved. The three world states retain seed 10101 and identical non-development parameters.

## Mathematics and identity

The Rosensweig instability's capillary/gravity wavelength is
`λc = 2π √(σ / (ρg))`. With σ = 0.028 N/m, ρ = 1210 kg/m³ and g = 9.81 m/s², λc = **9.650097 mm**. The material chart uses spacing 0.28, equivalent to 0.034464633 m/unit. This is an instability-inspired geometric model, not magnetohydrodynamics.

The triangular lattice is the nearer of two rectangular cosets with period `(a, √3a)` and a half-period offset. Each site has six neighbours at 60°. Carrier directions map through `n.xz / (1 + √(n.y² + 0.025))`: a C1 equatorial fold rather than an `abs(y)` normal crease. It retains mirrored hemispheres and is not globally geodesic.

The squared conical profile `max(0, 1 − distance/0.139)²` has fixed site identities. A deterministic site cohort controls energy-dependent population: dormant peaks grow continuously from 12% to full height, never sliding or reseeding. Development grows the crown and deforms its regularized ellipsoid carrier from a shallow pool to a slightly elongated body `(1.10, 1.0, 0.92)`. Seven persistent analytic satellite spheres grow out of the same lifted body on closed orbits.

## Round-3 look work

The independent baseline was **L 3.5 / overall 3.0**, not the earlier self-rating of 8.7. Before and three filmed iterations were opened and critiqued. The main problem was underlit chrome appearing as disconnected green outlines on black.

- A graduated silver reflection window, dark mullions and a continuous silver horizon now reveal curved valleys between the narrow palette strips. These are **reflected environment radiance**, not Lambertian paint or emissive contours. Conductor F0 remains 0.88.
- The environment retains black gaps; accent stays on a narrow strip and selected tip reflections. Neutral silver mixes are palette/white only, with no fixed RGB lighting.
- One near-field SDF visibility probe and a cheap carrier-normal environment bounce darken valleys. The duplicate far probe was removed.
- The mirror basin retains a real SDF reflection, now stronger, with soft spatial floor illumination and a broad dim edge instead of a bright hairline ellipse.
- Top-state focal length grows to 2.30 rather than 2.05; the moving camera remains radius 7.1, stable, continuous and outside all bounded geometry. The portrait fit is unchanged. Kick focal punch remains **2.2%**.

## States and looks

| English       | German           | Development / character                                                   |
| ------------- | ---------------- | ------------------------------------------------------------------------- |
| Pool          | Spiegel          | 0 · broad liquid lens with moving studio reflections and pressure ripples |
| Crown         | Krone            | 1 · energy-populated hexagonal magnetic peaks                             |
| Sculpture     | Skulptur         | 2 · lifted asymmetric chrome body and orbiting droplets                   |
| Obsidian Lens | Obsidianlinse    | 0.25 · high camera, broad strips, quiet motion                            |
| Needle Garden | Nadelgarten      | 1 · strong field, high camera, narrow strips                              |
| Mercury Moon  | Quecksilbermond  | 2 · low view, softer peaks, large satellites                              |
| Black Magnet  | Schwarzer Magnet | 1.45 · partially lifted crown, narrow strips                              |
| Silver Orbit  | Silberumlauf     | 2 · strong peaks, high camera, broad strips                               |

No preset or world-definition migration is required: saved definitions are unchanged; only the renderer and additive fourth gesture changed.

## Energy and rhythm

Energy changes the fixed-site population, fluid speed ×0.7–1.35, orbit speed ×0.8–1.3, body breathing and satellite size, **not lighting gain**. Low audio perturbs field by at most 0.07 of its parameter range.

Existing gestures are stronger: **Spike swell** adds up to 38% peak amplitude plus pool ripples; **Field breath** adds up to 12% vertical stretch; **Droplet orbit** moves satellites outward by at most 0.45 world units. Authored strengths remain bounded, and structural tracks never exceed two hits per bar.

### Slot 3: Magnetic strike · Magnetschlag

`magnetic-strike` reads `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w`. The smooth envelope lifts the same lattice sites toward one of four alternating magnetic poles. Maximum local growth is +85%; the other hemisphere receives a smaller response. The hit floor preserves a newly delivered strike after a lost render frame without replaying history. Pole selection only changes between completed envelopes. At zero envelope the exact original surface returns.

The same event bends Pool reflections and sends a local palette-coloured pressure ring across the basin. No full-screen flash, scene reset or additional ray trace is introduced. The expanded estimator bound includes the maximum event displacement. All host presentation remains behind the unchanged shared flash limiter.

| Preset               | Signature loop                                                                                | All-track density |
| -------------------- | --------------------------------------------------------------------------------------------- | ----------------- |
| **Still mercury**    | Two-bar sixteenth loop, steps 1 and 27; strength 0.60, duration 0.8 beats                     | 2.5 hits/bar      |
| **Magnetic breath**  | Two-bar eighth loop, steps 1/3/5/7/9/11/14/15; strength 0.90, duration 0.42 beats             | 7.5 hits/bar      |
| **Chrome resonance** | Two-bar sixteenth loop, steps 1/4/7/9/11/15/17/19/22/25/28/31; strength 1, duration 0.4 beats | 10 hits/bar       |

Step numbers are one-based. Separate slower swell, breathing and satellite phrases cross these figures. Each of the four gestures has an independently authored restrained/driving/accented loop and DE/EN text.

## Endlessness and cost

Three 2π engine clocks integrate fluid phase, camera azimuth and studio orbit. All uses are periodic harmonics; authored time products remain in the first-hour branch and late programs use integrated phases. Development/reversal never resets the slot or identity.

The primary estimator has a constant cap of 128 and honours `u_raySteps`. Conservative ellipsoid bounds reject empty rays. Negative overshoots receive seven bisections before normals. One full-resolution primary ray, pixel-scaled tetrahedral normals and angularly filtered reflection cards avoid temporal noise or reduced-resolution colour rendering.

Apple M3 Pro / Chrome / ANGLE Metal, 30 synchronous whole-frame samples including post. Fleet contention varies; these are not venue-cadence qualifications.

| State     | 1080p p50 / p95 | 4K p50 / p95   | 1080p ABBA pair p50 delta vs main |
| --------- | --------------- | -------------- | --------------------------------- |
| Pool      | 2.6 / 3.3 ms    | 6.3 / 6.8 ms   | ≈0%                               |
| Crown     | 3.6 / 4.4 ms    | 11.7 / 13.9 ms | +6.5%                             |
| Sculpture | 5.3 / 6.1 ms    | 15.3 / 17.4 ms | +10.8%                            |

The absolute p50 targets (8/16 ms) pass. The pair probe's stricter +5% relative gate **fails** for Crown/Sculpture; larger framing and magnetic geometry consume more GPU work. No GL, GPU or non-finite errors. 4K p95 still exceeds 16 ms; preserve this limitation rather than calling it venue-safe.

## Verification and evidence

All paths below are relative to `.claude/worktrees/liquid-chrome-r3/`.

- `npm test`: **967 passed, 21 opt-in skips, zero failures** (988 total); `npm run typecheck` passes.
- `node --test tests/ferro.test.mjs tests/world-rhythm.test.mjs tests/pipeline-flash.test.mjs`: **50/50 pass**. CPU physical/lattice references, 401-point forward/reverse continuity, equatorial derivative, energy-site monotonicity, overshoot refinement, camera bounds, preset validation, slot-3 pole growth bounds, mute behaviour, distinct loops and density floors.
- Build and native `test:i18n` pass for DE/EN. Prettier passes the changed scene, family tests, verifier, docs and plan. Existing dictionary-wide and shared CATALOG table formatting warnings are left untouched to keep translation edits additive and respect row ownership; all three warnings were reproduced on the baseline sources.
- `scripts/verify-ferro.mjs --rig --port 48622`: **162 late-time cases** across nine developments × energies 0.1/0.5/0.9 × Glacier/Ember/Phosphor × 3600/43200 s; native late program compiled, all frames nonempty, zero GL/non-finite errors. Additional **162 live forward/reverse frames** preserve the same slot and time. Three energy sheets, three portrait states and a 4K still: `artifacts/films/ferro-r3-verification/`.
- Eight-look, three-energy native ladder: `artifacts/films/ferro-r3-ladder/`.
- Before: `artifacts/look-review/liquid-chrome-r3-before/`; look iterations: `liquid-chrome-r3-round1/`, `-round2/` (also Ember), `-round3/` (Glacier); rhythm review: `-rhythm/`.
- **Final reviewer evidence:** `artifacts/look-review/liquid-chrome-r3/liquid-chrome-{sheet,rhythm}.png`, `liquid-chrome.mp4`, `grids.md`.
- Native profiles: `artifacts/performance/ferro-r3-{1080,4k,pair}/profile.json`.

## Still weak

Self-assessed look **7.5/10**, not an independent pass. The low-energy lens and Crown remain austere, the floating form can still resemble a regular spiked object, and grazing tips retain occasional subpixel glints. The studio is implicit rather than a richly populated environment. Real multiple-bounce reflection, fluid mass conservation and physical magnetic dynamics are outside this bounded analytic model. 4K contention headroom is limited.
