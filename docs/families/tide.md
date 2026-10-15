# Moon Tide · Mondflut

**EXPLORATORY / EMPIRICAL**, worlds wave 4, family **103**, renderer `tide`, world `moon-tide`. A new material: a dark, reflective ocean at night, not an underwater particle world. No engine changes.

## Signature mathematics

Six seeded, persistent directional Gerstner waves. For wave `i`, `ωᵢ = 0.35 nᵢ`, `n = [2,3,4,5,7,10]`, and **`kᵢ = ωᵢ² / 9.81`**. Longer waves travel faster: phase speed `ω/k`; group speed `ω/(2k)`. The speed control reparametrizes physical time; it does not replace the dispersion law with a shared phase velocity.

The material surface is

```
X(q) = q + Σ Q Aᵢ dᵢ cos(kᵢ dᵢ·q + φᵢ)
H(q) = Σ Aᵢ sin(kᵢ dᵢ·q + φᵢ), Q = 0.65
```

The six amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]` scale continuously from ×0.48 to ×2.35 with Calm → Swell and by the height fader (≤1.3). At the **entire schema maximum**, `Σ Q k A = 0.5530875468 < 1`; the symmetric horizontal Jacobian has minimum eigenvalue ≥0.4469124532. Thus the horizontal map cannot fold or self-intersect. Development never alters wave IDs, seeded directions or initial phases.

Two Newton iterations invert `X(q)` for each exact world-space surface sample. Wave 5 extends the **data-only** precompute to 512×513 RGBA32F: row 0 holds six wave coefficients; the remaining 512² entries hold **combined wave + bowl height, two analytic gradient components, and crest compression**. Intersection candidates and final normals interpolate this geometry data, rather than repeating 18 wave evaluations at each solver step. Foam, lighting, spray and colour still run at full output resolution. The roughly 4 MiB table refreshes every frame, including paused edits. Without float targets the exact analytic path remains available.

The table covers −128…128 world units with explicit bilinear interpolation (spacing 0.501 m). The polar core (r≤6) and exterior remain analytic, with smooth transition bands at r=6…8 and |x/z|=126…127.5. Intersection and normal queries use the same transition, avoiding a tiny height discontinuity. A 27,000-point CPU sweep over three seeds, all development states and maximum wave height measures **0.02485 m height error and 0.01586 unit-normal error**; a separate bowl sweep retains its <3 cm / <0.025 normal bounds. This is a geometry approximation, not a bit-identical cache or cached colour image. The previous wave-4 GPU image-error figures applied only to the bowl cache and do not qualify the new combined table.

A capped 15-step safeguarded **Illinois regula-falsi** intersection solves the water height. Conservative ray-specific slabs include the closest projected distance to the throat and the table cell diagonal; they avoid solving all outer-ocean rays against the deepest possible sea floor. Normals pull the material height gradient through the inverse horizontal Jacobian rather than repeating four height queries per pixel.

### The peak: Maelstrom

The ocean's vertical coordinate develops into a **42-unit depression**, with a raised shoulder and five meandering, rotating spiral ridges. Its base is

```
-42 exp(-r²/190) + 3.8 exp(-((r-23)/7)²)
```

and the ridge phase is `5θ + 0.44r - 2f + 0.28 sin(3θ - 0.12r + f)`. An inner smooth window removes the angular singularity. All angular and clock harmonics are integers, so neither the atan seam nor phase wrapping jumps. Analytic radial/angular derivatives shade the bowl. Since this only adds height, it does not invalidate the Gerstner no-fold bound.

**Choice:** the maelstrom gives a much larger peak silhouette and a dramatic crane reveal while remaining a reversible single-valued ocean. A breaking barrel would require overturning geometry, hidden surfaces and more fragile camera clearance; it would contradict this heightfield's deliberate no-fold guarantee. The bowl is an authored deformation, **not** a Navier–Stokes vortex solution.

## Light and depth

Fresnel sky reflection, a compact moon plus a rough moon-glitter path, faint lunar surface mottling, sparse stars, distant horizon haze, soft directional key, grazing rim and trough darkening. All colour comes from palette uniforms and white/black mixtures.

**Round 2 foam:** actual Gerstner crest compression gates smoothly domain-warped **quintic gradient-noise ridges**, not thresholded value-noise cells. Two lacy scales and separate wind-aligned filaments break up the crests. `fwidth` softens ridge/crest thresholds and actual world-space pixel footprints fade unresolved detail; derivatives stay outside the divergent water branch. There are no shaded square foam candidates.

Living foam emits chiefly in secondary, with rare accent/primary hot knots. Local kick ignition flickers along existing crests, bounded to <1.4× its un-kicked value at a hot point; it does not flash the frame. The five inward spiral bands get thin luminous cores and a glowing funnel lip. Reflection falls exponentially down the throat, while a faint secondary/accent pool glows below. Native float-picture readback at 12 h measured **9.75 in Swell and 10.08 in Maelstrom**, with about 4–5% of pixels above 1: living light, not the moon, is the brightest feature.

Sparse Gaussian spray points conserve integrated flux when widened by their pixel footprint and vanish before candidate-cell borders. Three water-occluded annular spindrift strata float 5.5 / 7.2 / 8.9 units above the vortex lip region, with independent periodic gusts and parallax. This is analytic suspended spray, not a particle or fluid simulation. Wave 5 fills the former hollow neon lace with aerated patches and darker bubble pockets, adds lunar body scattering, and reduces the broad living-light contribution so its fine edges remain the emissive detail.

## States and looks

States share **seed 10301 and all non-development parameters**.

| EN | DE | Development | Character |
| --- | --- | --- | --- |
| Calm | Stille | 0 | Low glassy swell, moon path, faint living foam |
| Swell | Dünung | 1 | Tall crossing swells, wind detail, igniting crests |
| Maelstrom | Mahlstrom | 2 | Vast luminous funnel; camera cranes above the shoulder |
| Silver Passage | Silberpassage | 0.2 | Low moon, low viewpoint, long gentle waves |
| Living Breakers | Lebendige Brecher | 1 | Maximum wave height, turbulent crests, low viewpoint |
| Spiral Cathedral | Spiralkathedrale | 2 | High crane over the full vortex |
| Far Lantern | Ferne Laterne | 0.65 | Higher moon and viewpoint, smaller swell |
| Undertow | Sog | 1.7 | Low approach to the forming funnel, faster flow |

## Energy, rhythm and camera

Energy is orthogonal: motion speed ×0.7–1.3 (1.86× range), wind-normal/foam detail, spindrift activity and camera drift rate. It does **not** multiply brightness, wave amplitudes or development. High audio contributes at most 0.06 to wind detail.

- **Crest packet / Schaumwoge**, 4 beats: wakes a travelling packet on existing foam crests.
- **Spiral ridge / Spiralgrat**, 8 beats: accents the existing spiral ridge locally.
- **Incoming tide / Ankommende Flut**, 16 beats: a broad ring crosses the vortex shoulder.

The camera follows a slow closed coastal sway (±5 units horizontally, ±3 units in distance), then cranes continuously into a **full slow orbit** of the vortex at radius 43–47, closer than before. No roll. Minimum eye height starts at 4.8 and rises to 6.4 in Swell; the peak is 35 + 12×eye ±2 units high. Cartesian interpolation of the coastal and orbital paths stays periodic even at fractional development. CPU tests check the conservative clearance envelope, radius and intermediate-development wrap. The vortex fills roughly two-thirds of the short side in the review film. Kick FOV modulation remains bounded to **2.2%**.

## Endless time

Three integrated engine clocks: base wave phase (period 2π), camera phase (2π), spiral flow (2π). Rate-dependent terms read `u_clock` behind `PHOSPHOR_LATE`, declared in both the picture and data-pass shader. Every use is periodic in those exact periods, including capillary normal detail. No cumulative coordinates or growing sine arguments. Energy/fader changes change velocity, not phase. Development does not reset clocks or seed.

## Wave 5 rework and cost

All world/state/look IDs, names, seeds, schema keys and presets remain unchanged.
No engine changes. Three filmed rounds: **surface-data reuse** (same silhouette,
much less repeated inversion), **aerated foam** (filled breaking patches rather
than hollow uniform nets), **layered spindrift** (three depths and gusts instead
of one flat layer). The final boundary polish makes height/normal cache blends
identical. Honest rating **8.5/10**: clear and dramatic arc, materially cheaper;
foam still looks like authored bioluminescence rather than photographic foam,
and the thin spray is not a breaking-wave particle simulation.

M3 Pro whole-frame p50 ms including post (shared GPU):

| Output | Calm baseline → final | Swell baseline → final | Maelstrom baseline → final |
| --- | --- | --- | --- |
| 1920×1080 | 3.8 → 2.4 | 5.1 → 2.7 | 8.9 → 3.5 |
| 3840×2160 | 12.0 → 9.1 | 19.3 → 9.7 | 29.5 → 12.6 |

The final 4K peak is 57% cheaper in these separate probes. A supplementary
four-block alternating comparison (more severe contention in two blocks)
gives 1080p 3.55→2.85 / 4.65→3.15 / 6.90→3.70 ms and 4K
13.50→9.30 / 14.75→12.05 / 25.60→19.30 ms. Every state is cheaper
under both comparisons, but no claim of a guaranteed 4K/two-world 60 Hz venue
cadence follows from the quiet 12.6 ms sample. Baseline/final films and strips:
`output/tide/{baseline,final}/moon-tide.{mp4,png}` in the fleet lane output.
Final also contains all-look energy ladder, 4K/1080p/portrait stills, Glacier
Living Breakers, Ember portrait, early/late/fallback compilation and reverse
identity checks. CPU tests and native 3600/4096/43200 s time checks pass;
zero GL errors/non-finite values. `scripts/check-tide.mjs` now accepts `--ladder`
instead of requiring one hard-coded evidence directory.

## Historical wave-4 cost (native Apple M3 Pro, ANGLE Metal)

Synchronous whole-frame throughput, **including post**, not display cadence. Shared-machine indicative numbers, final three states:

| Resolution | Calm p50 / p95 | Swell p50 / p95 | Maelstrom p50 / p95 |
| --- | --- | --- | --- |
| 1920×1080 | 3.1 / 3.9 ms | 4.5 / 5.0 ms | 6.9 / 7.2 ms |
| 3840×2160 | 14.0 / 16.3 ms | 16.3 / 16.8 ms | 24.9 / 25.9 ms |

Round-2 delivery probe: 48 samples/state at energy 0.95, including post, on the shared M3 Pro. 1080p meets the ≤8 ms family budget, including measured p95. Earlier un-cached peak probes were 8.0 / 8.8 ms at 1080p. **4K Maelstrom is not a 60 Hz two-world-crossfade budget**; the 4K probe deliberately exits 1 against its default 16.67 ms threshold. No resolution cap, engine downgrade or cached colour image is used. JSON: `artifacts/performance/tide-r2-final-{1080,4k}/profile.json`.

## Verification

- `node --test tests/tide.test.mjs tests/time.test.mjs`: 21 passing tests. Preserved exact dispersion/group velocity, full-schema Gerstner no-fold bound, two-step inverse and analytic normal checks; added gradient-lace C1/C2 seams, resolution filtering, HDR/local kick bounds, Gaussian flux, bowl-cache error, ray slabs, deeper bowl and orbital continuity. All eight presets still validate and retain continuous-world identity.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-tide.mjs --rig --port 48331 --out artifacts/films/tide-r2-verification`: explicit early/late and no-precompute shader compilation, 1080p/4K/portrait, low energy, 3600 s and 43200 s, reverse sweep with unchanged seed/slot; zero GL errors/non-finite uniforms.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --families tide --port 48331`: no seams at 3600/4096/43200 s, no excessive energy or fader-rate departure at 2 h; actual late variant verified.
- Final 30-second, 960×540 world film (Glacier) and extra-look film (Living Breakers / Ember), plus Phosphor world film: `artifacts/films/tide-r2-final/`. Contact strips, full-frame Swell/Maelstrom stills and the native 4K still were opened and reviewed. Earlier filmed revisions remain in `tide-r2-round1` through `tide-r2-round4`.
- Eight-look energy ladder: `artifacts/contact/tide-final/index.html`; opened overview: `artifacts/films/tide-r2-verification/energy-ladder.png`.
- `node --test tests/*.test.mjs`: 667 pass, 9 skip, 0 fail. `npm test`: 673 pass, 15 skip, 0 fail. `npm run typecheck` and DE/EN native browser i18n checks pass. No catalog preview/curation tests were edited.

## Limits

This is a small analytic spectrum, not an FFT sea. The heightfield cannot overturn. The vortex and foam remain stylized: the lace is materially smoother and luminous but can read as a living-light network rather than photographic aerated foam. No refraction-through-water, multiple scattering, foam advection or airborne particle simulation. The mist consists of thin analytic strata. The sampled surface cache is not bit-identical to its analytic fallback, especially in narrow highlights. Regula-falsi is bounded and may not choose the very nearest root in steep overlapping silhouettes. Very distant foam becomes a band-limited average. Portrait crops the shoulder rather than shrinking the ocean. The moon leaves the frame during the peak crane. The wave-5 4K peak fits a single 60 Hz frame in the throughput probe, not necessarily a crossfade or display-cadence budget. No claim of venue qualification.
