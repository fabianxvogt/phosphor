# Liquid Chrome · Flüssiges Chrom

World `liquid-chrome`, renderer `ferro`, family **101**. A continuous black liquid-metal studio sculpture, not a coloured diffuse/plastic surface. Eight authored looks; the first three share seed 10101 and identical non-development parameters.

## Mathematics and material

The Rosensweig instability selects the gravity/capillarity wavelength

`λc = 2π √(σ / (ρg))`.

The reference ferrofluid constants are σ = 0.028 N/m, ρ = 1210 kg/m³ and g = 9.81 m/s², giving **λc = 9.650097 mm**. Minimizing `σk + ρg/k` gives `kc = √(ρg/σ)`. Material-chart spacing is 0.28 units, with 0.034464633 m/unit converting it to λc. This is a geometric instability model, not a magnetohydrodynamic simulation.

The triangular lattice has basis `(a,0)`, `(a/2,√3a/2)`. The exact nearest site is the closer of two rectangular cosets with periods `(a,√3a)` and half-period offset. Each site has six equidistant neighbours at 60°. A fixed two-hemisphere stereographic chart `n.xz/(1+abs(n.y))` carries the same lattice on a deforming ellipsoid. The hemispheres meet continuously at the equator. The projection is not isometric: chart spacing is exact, physical spacing on the curved body varies. No fresh noise sites or spike identities appear during development.

A squared conical profile `max(0,1-d/0.139)²` displaces a signed ellipsoid distance estimate. Smoothstep carrier deformation opens a low dome into a lifted sphere; spike gain grows without replacing the chart. A regularized interior removes the ellipsoid estimator's central singularity without changing the exterior surface. The pool clips the carrier at y ≈ 0. Seven persistent satellite indices have continuous radii and closed orbits.

The conductor uses **F0 = 0.88**, Schlick grazing Fresnel and no coloured Lambertian lobe. Procedural reflected studio cards and palette-tinted light strips supply all colour (white/black mixes only). Broad diffusion cards describe curvature between sharp strips. Accent is confined to one narrow reflected strip. Valleys darken through a bounded cavity term; an analytic floor shadow anchors the object. The basin traces one real SDF reflection, not a second generic sphere. Tiny satellites use analytic sphere intersections.

## States and looks

| English | German | Development / character |
| --- | --- | --- |
| Pool | Spiegel | 0 · breathing black mirror dome |
| Crown | Krone | 1 · sharp hexagonal magnetic crown |
| Sculpture | Skulptur | 2 · lifted spiked sphere and orbiting chrome drops |
| Obsidian Lens | Obsidianlinse | 0.25 · high view, broad strips, quiet motion |
| Needle Garden | Nadelgarten | 1 · strong field, high view, narrow strips |
| Mercury Moon | Quecksilbermond | 2 · lower view, softer spikes, large satellite population |
| Black Magnet | Schwarzer Magnet | 1.45 · half-lifted crown, low camera, narrow lighting |
| Silver Orbit | Silberumlauf | 2 · stronger spikes, high view, broad lighting |

## Energy, rhythm and camera

Energy changes fluid speed ×0.7–1.35, camera speed ×0.8–1.3, body-breath amplitude and satellite size, **not light gain**. The low-frequency audio mapping perturbs the magnetic field by at most 0.07 of its parameter range. These are independent of development, including Pool.

- **Spike swell / Spitzenschwellung**, 4 beats: bounded +12% spike growth.
- **Field breath / Feldatmung**, 8 beats: +3.5% stretch of the same body.
- **Droplet orbit / Tropfenumlauf**, 16 beats: bounded outward satellite displacement.
- Kick: +11% spike height and **2.2%** focal punch, never a full-frame flash.

The camera runs a slow, closed studio orbit at radius 7.6, with a continuous development-dependent target and slight elevation breathing. No roll, cuts or geometry entry. Portrait uses short-side composition; the same sculpture stays inside the frame. Depth comes from perspective/parallax, conductor key/rim reflections, cavity occlusion/contact shadow and the many-small/few-large satellite scale cue.

## Endlessness and antialiasing

Two engine clocks integrate fluid phase and camera azimuth. Both are 2π-periodic; every use is an integer harmonic or sin/cos of that phase. The authored branch uses time products; the clock branch declares `lateClockGlsl` and takes over on the first rate change or at 3600 s. Development never touches clocks, seed or indices. No time wrap, accumulating simulation, finite journey or restart.

144 conservative distance-estimator steps maximum, bounded analytically by a sphere. Smooth reflection-card edges, pixel-scaled tetrahedral normals and two deterministic subpixel rays resolve glints; no temporal noise. One bounded reflected ray is traced only in visible pool pixels. No reduced-resolution colour pass, engine changes or external assets.

## Measured cost

Apple M3 Pro, Chrome/ANGLE Metal, `profile-families --types --families ferro`, 20 synchronous samples including post-processing. Shared fleet GPU; indicative throughput, not display-cadence qualification.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Pool | 2.5 / 7.9 ms | 7.6 / 12.5 ms |
| Crown | 3.3 / 3.5 ms | 12.5 / 13.3 ms |
| Sculpture | 4.1 / 4.6 ms | 14.5 / 15.3 ms |

The actual profiler option is plural `--families`; `--family` from the lane brief is not accepted by this revision. Zero GL errors and non-finite uploads in the measured runs.

## Verification

- `node --test tests/ferro.test.mjs`: physical wavelength/threshold, brute-force nearest-lattice comparison, six neighbours and 60° symmetry, translation invariance, exact shader-source pins, finite carrier field, 401-point forward/reverse development sweeps, boundary continuity, equator continuity, clock continuity, camera/kick bounds, rhythm channels and preset/world validation.
- `node scripts/verify-ferro.mjs --port 48301`: **108** native frames (nine development values × two energies × three palettes × 3600/43200 s), checks actual late-program compilation, GL errors, non-finite uploads and nonempty signatures; all three portrait states plus a 3840×2160 still.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --families ferro --port 48301`: 3600, 4096 and 43200 s seams plus energy/fader rate steps pass.
- `npm test`, `npm run typecheck`, `npm run test:i18n -- --port 48301 --native-gpu`.
- Final films and viewed contact strips: `artifacts/films/ferro-final/` (Glacier and Phosphor worlds; Ember Needle Garden look), `energy-ladder.png`; portrait/4K/late evidence under `artifacts/films/ferro-verification/`.

The brief forbids lane edits to `catalog-previews.mjs` and `catalog-curated.mjs`. Two shared catalog tests therefore allow only assigned wave-4 families 101–105 to await integration baking/curation. All existing preview hashes and editorial coverage stay exact; new entries become strict automatically when the generated data exists. No previews were generated or committed.

## Limits

Not a Navier–Stokes or magnetic-field solver; wavelength is physical in the reference material chart, not globally geodesic spacing. The lower hemisphere reuses the northern chart (an equatorial crease is possible). No recursive inter-spike reflections; the cavity term is approximate. Satellite drops have closed authored orbits, not mass-conserving shedding. Two-sample antialiasing cannot eliminate every subpixel tip glint. The intentionally dark Pool can be understated on a washed-out projector. 4K exceeds the 8 ms 1080p family budget, as reported above.
