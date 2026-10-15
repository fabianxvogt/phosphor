# Liquid Chrome · Flüssiges Chrom

World `liquid-chrome`, renderer `ferro`, family **101**. One continuous black liquid-metal sculpture: mirror pool → magnetic crown → floating chrome body. Eight authored looks; the three world states share seed 10101 and identical non-development parameters.

## Mathematics and identity

The Rosensweig instability selects the gravity/capillarity wavelength

`λc = 2π √(σ / (ρg))`.

Reference constants σ = 0.028 N/m, ρ = 1210 kg/m³ and g = 9.81 m/s² give **λc = 9.650097 mm**. Minimizing `σk + ρg/k` gives `kc = √(ρg/σ)`. Chart spacing is 0.28 units; 0.034464633 m/unit converts it to λc. This is a geometric instability model, not a magnetohydrodynamic simulation.

The triangular lattice has basis `(a,0)`, `(a/2,√3a/2)`. The exact nearest site is the closer of two rectangular cosets with periods `(a,√3a)` and half-period offset. Every site has six equidistant neighbours at 60°.

The normalized carrier direction `n` maps through `n.xz / (1 + √(n.y² + 0.025))`. This softened stereographic fold has **zero chart derivative at the equator**, unlike the previous `abs(n.y)` join: the reflected studio no longer exposes a normal crease. The hemispheres still mirror one another; this is not a globally isometric/geodesic lattice.

Each site's squared conical profile is `max(0,1-d/0.139)²`. A fixed site cohort `fract(dot(site,(0.754877666,0.569840296)))` controls its growth. Energy raises dormant sites continuously from 12% to full height with a smooth threshold; it never changes lattice spacing or moves/reseeds sites. Development deforms the carrier ellipsoid and grows spike amplitude. A regularized signed ellipsoid estimate removes its central singularity. The pool clips the carrier at y ≈ 0. Seven persistent analytic satellite spheres grow from zero radius on closed orbits.

## Composition, light and material

Pool is a larger, shallow mirror (radius 1.9), not an almost-black small dome. Radial surface waves `sin(17r − 2phase) exp(−0.45r²)` bend the reflected bars; their displacement is bounded at 0.036 units, with kick and spike-swell responses. A faint palette-lit basin rim frames it even at energy 0.1.

The conductor uses **F0 = 0.88**, Schlick grazing Fresnel and no coloured Lambertian lobe. Broad soft palette diffusion cards and a thin bright strip orbit independently of the fluid-motion fader; reflections keep travelling when motion is zero. White/black mixes and palette uniforms are the only colour sources. Accent stays on a narrow reflected strip and small directional tip highlights, not a broad surface wash.

Two short reflected-direction field probes estimate inter-spike visibility. An environment bounce about the carrier normal supplies low-frequency neighbouring-chrome light in occluded valleys; it is a bounded one-bounce approximation, not recursive ray tracing. The basin retains one real SDF reflection of the lifted body. Hidden floor pixels are never reflected/shaded. An analytic contact shadow anchors the sculpture.

## States and looks

| English | German | Development / character |
| --- | --- | --- |
| Pool | Spiegel | 0 · travelling studio bars and concentric magnetic ripples |
| Crown | Krone | 1 · energy-populated hexagonal magnetic crown |
| Sculpture | Skulptur | 2 · lifted spiked sphere and orbiting chrome drops |
| Obsidian Lens | Obsidianlinse | 0.25 · high view, broad strips, quiet motion |
| Needle Garden | Nadelgarten | 1 · strong field, high view, narrow strips |
| Mercury Moon | Quecksilbermond | 2 · lower view, softer spikes, larger satellites |
| Black Magnet | Schwarzer Magnet | 1.45 · half-lifted crown, low camera, narrow lighting |
| Silver Orbit | Silberumlauf | 2 · stronger spikes, high view, broad lighting |

## Energy, rhythm and camera

Energy changes fluid speed ×0.7–1.35, camera speed ×0.8–1.3, active spike population, body-breath amplitude and satellite size, **not light gain**. The low-frequency audio mapping perturbs the field by at most 0.07 of its parameter range. Pool retains motion/ripple detail independently of development.

- **Spike swell / Spitzenschwellung**, 4 beats: +12% spike growth and pool ripples.
- **Field breath / Feldatmung**, 8 beats: +3.5% body stretch.
- **Droplet orbit / Tropfenumlauf**, 16 beats: bounded outward satellite displacement.
- Kick: +11% spike height, bounded ripple displacement, **2.2%** focal punch; no flash.

The continuous camera orbit is radius 7.1, with development-dependent target and focal length 1.8→2.05. The lifted sculpture occupies approximately 70–80% of the short side at high energy. No roll, cuts or geometry entry. Portrait uses short-side composition. Perspective/parallax, changing key/rim reflections, cavity/contact occlusion, floor reflection and satellite scale cues establish depth.

## Endlessness and antialiasing

Three engine clocks integrate fluid phase, camera azimuth and independent studio orbit (0.065 rad/s). All are 2π-periodic; every use is an integer harmonic or sin/cos of that phase. The authored branch retains time products; `lateClockGlsl` selects integrated phases at the first rate change or at 3600 s. Development never changes clocks, seed or site indices.

128 bounded estimator steps maximum, enclosed by an expanded ellipsoid. One full-resolution primary ray replaces the previous duplicated full trace. Soft angular card edges and pixel-scaled tetrahedral normals filter glints without temporal noise. A negative estimator overshoot is bracketed for seven bisections **before normals are evaluated**, fixing stepped silhouettes on strong-field shallow crowns. No reduced-resolution colour pass, external assets or engine changes.

## Measured cost · round 2

Apple M3 Pro, Chrome/ANGLE Metal. `PHOSPHOR_HEADLESS_RIG=1 node scripts/profile-families.mjs --types --families ferro --port 48333 --frames 30`, plus `--width 3840 --height 2160`. Synchronous whole-frame throughput including post, not display-cadence qualification. Five lanes share the GPU.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Pool | 1.9 / 2.5 ms | 6.8 / 7.6 ms |
| Crown | 3.3 / 4.2 ms | 11.9 / 13.5 ms |
| Sculpture | 4.1 / 4.8 ms | 14.3 / 15.8 ms |

Both target budgets pass in the final 30-sample run. An earlier identical final-shader 20-sample run had Sculpture 14.7 / 17.6 ms: **4K p95 is not guaranteed under fleet contention**. The rejected double-ray iteration cost 28.7 ms at 4K. Reports: `artifacts/performance/ferro-r2-delivery-{1080,4k}/profile.json`. All measured GL/non-finite/error counters were zero.

## Verification and review evidence

- `node --test tests/ferro.test.mjs tests/time.test.mjs`: 19 passed. CPU wavelength/threshold, brute-force nearest lattice, six neighbours/60° symmetry, translation invariance, shader pins, finite carrier, 401-point forward/reverse development sweeps, boundary continuity, equatorial derivative continuity, energy-site monotonicity, overshoot bracketing, camera/kick bounds, clocks, rhythm and preset/world validation.
- `node --test tests/*.test.mjs`: 674 tests, 665 passed, nine opt-in skips, zero failures. `npm test`, `npm run typecheck`, build and native-GPU `npm run test:i18n -- --port 48333 --native-gpu` pass. No catalog tests or generated preview/curation sources were edited in round 2.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-ferro.mjs --port 48333`: 108 native frames across nine developments, energies 0.1/0.9, Glacier/Ember/Phosphor palettes, 3600/43200 s; actual late-program compilation, nonempty signatures, zero GL/non-finite errors. All three portrait states and a 4K still. Evidence: `artifacts/films/ferro-r2-delivery-verification/`.
- Headless native `check-time-wrap --rig --families ferro --port 48333`: 3600, 4096 and 43200 s seams plus energy/fader rate steps pass, zero errors. Evidence: `artifacts/films/ferro-r2-time/`.
- Baseline plus three improvement films and a fourth silhouette-polish review were opened as contact strips and full-size stills. Final world and Ember Needle Garden films/strips: `artifacts/films/ferro-r2-polished/`. Three-palette iteration evidence: `ferro-r2-round{1,2,3}/`. Eight-look energy ladder: `artifacts/films/ferro-r2-polished/ladder/`.

## Wave 5 rework · 15 October 2026

Saved identity is unchanged: all eight preset names, seeds, parameter values and schema keys, and the world definition are untouched. No engine/shared-file edits.

Three filmed improvement rounds addressed (1) plastic-white Crown patches by narrowing the studio cards and reducing the white ambient field, (2) flat reflected cards by shaping their radiance and tightening angular AA, and (3) lost dark-surface readability by restoring a bounded grazing rim and strengthening the real basin reflection. An additional portrait review exposed horizontal clipping of shallow crowns; an aspect-only focal fit (0.72→1) now leaves breathing room. No geometry, lattice or temporal mathematics changed.

The studio is now sparse negative-space lighting: the summed rectangular-card solid angle at maximum strip width is below 12% of the sphere. Broad cards are no longer a substitute for diffuse shading. Highlights still exceed 1; the body stays a dark conductor throughout the orbit. CPU regression covers the solid-angle budget, shaped-card source and portrait fit, alongside the existing wavelength/lattice/continuity tests.

Native headless Chrome / M3 Pro, 30 samples, all states, same commands before/after (shared GPU; synchronous throughput, not venue cadence):

| State | 1080p baseline → final p50 | 4K baseline → final p50 |
| --- | --- | --- |
| Pool | 2.2 → 2.3 ms | 7.4 → 7.7 ms |
| Crown | 3.7 → 3.6 ms | 13.3 → 13.6 ms |
| Sculpture | 4.6 → 4.3 ms | 16.6 → 17.2 ms |

Every median is within baseline +5%. Final 4K p95: 8.7 / 14.7 / 22.6 ms; fleet contention remains real. The aspect-only correction does not affect these landscape measurements.

Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-wave4/output/ferro/`. Baseline `baseline/liquid-chrome.{mp4,png}`, final `final/liquid-chrome.{mp4,png}`; additional Glacier world and Ember Needle Garden films, all-look ladder, portrait film and 108 late-time GPU cases under `final/`. Superseded intermediate films were removed to save disk. Honest rating: **8.7/10** — convincing dark chrome, but a few subpixel glints and deliberately quiet Pool lighting keep it shy of an unqualified 9.

## Limits

Not a Navier–Stokes or magnetic-field solver. Wavelength is physical in the reference chart, not globally geodesic. The C1 equatorial fold removes the crease but retains mirrored hemispherical structure. Neighbour reflection is a cheap carrier-normal/environment approximation, not geometric multiple-bounce transport. Satellites have authored orbits, not mass-conserving shedding. Single-ray antialiasing leaves occasional subpixel tip glints, especially in the narrow-strip strong-field looks. Broad cards can look slightly satin-like at intermediate development. Pool is deliberately calm, although now much more legible; dark projectors still need sensible black levels. 4K has limited contention headroom and is not venue-cadence-qualified.
