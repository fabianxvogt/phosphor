# Event Horizon

**EXPLORATORY / EMPIRICAL**, 2026-10-14, worlds wave 2 (lane for family 89). A new family (`horizon`, number 89) behind the world **Event Horizon** (DE: Ereignishorizont), picked by the owner.

## Algorithm and signature detail

A Schwarzschild black hole (units M = 1) traced ray by ray. Every pixel's light ray lies in one plane through the hole; in that plane the null geodesic obeys the Binet equation `u'' + u = 3u²` (`u = 1/r`, primes are the orbit angle φ).

- **Integrator (FORMAL check, CPU mirror):** Encke-style RK4. The flat part `u'' = -u` (a straight line) is an exact rotation of `(u, u')`; RK4 integrates only the `3u²` perturbation in the co-rotating frame. Straight rays therefore stay exactly straight at any step size. Steps are `min(0.6/(1+18u), 0.5·max(u,0.02)/|u'|)`: large in the weak field, fine near the photon sphere and for nearly radial rays.
- **Camera:** a static observer at radius R. Initial conditions `b = R sinψ / √(1-2/R)`, `u' = -u √(1-2u) cot ψ`.
- **Escape:** at the root `u = 0`, computed in the co-rotating frame (`atan(z.x, -z.y)`); that angle is the exact asymptotic sky direction. Capture at the horizon `u = 1/2`.
- **Disk:** a thin equatorial disk. Its crossings sit at known orbit angles `φ_n + kπ`, so up to three images (direct, far side arching over the shadow, underside arching below it, higher orders toward the photon ring) are found by Hermite interpolation. Gas moves on Keplerian circles (`β = √(1/(r-2))`); the redshift factor `g = √(1-3/r) / (1 - β·n) / √(1-2/R)` drives Doppler beaming and colour (temperature `T ∝ r^-3/4 (1-√(6/r))^1/4`, Novikov–Thorne-like, ISCO at 6M with faint plunging gas inside).
- **Photon ring:** accent at `b = √27 M`, antialiased by `fwidth(b)`.
- **Jets:** Gaussian tubes along the spin axis, integrated analytically along each path chord (erf), Doppler-weighted, lensed like everything else (the counter-jet bends around the hole).
- **Sky:** analytic lookup at the asymptotic direction: two cube-face star layers whose width follows the lensed pixel footprint (flux-conserving, so demagnified stars near the shadow fade instead of flickering) and a seeded galactic band of value noise.

The signature detail is the lensing itself: the far side of the disk arching over and under the shadow, the one-sided Doppler brightness, the photon ring and the star field streaming around the Einstein ring as the camera orbits.

## Precompute path (geodesic table)

All rays share one camera radius, so a geodesic depends only on its impact parameter. A per-frame `precompute` pass (129 × 512 RGBA32F) tabulates `(u, u')` at 128 orbit angles (Δφ = 3.2π/127) for 512 impact parameters on an asinh scale around √27 M. Rows 0–255 are captured rays and 256–511 escaping ones, so no interpolation ever straddles the shadow edge. Column 128 holds the end angle, the capture flag and the deflection. Each pixel interpolates rows linearly and columns with cubic Hermite (≈8 texel fetches); jets use every third column of the nearest row. Crossings whose samples hit the horizon sentinel integrate directly. Without float render targets the same integrator runs per pixel (fallback, visually equivalent). The GPU `asinh` cancels catastrophically for large negative arguments, so the shader uses a symmetric form.

## States and looks

The world uses `Tidal Star` (0), `Infall Spiral` (1) and `Blazing Horizon` (2): seed 8901, identical non-development parameters.

- **0 · Star:** a calm star field, a faint lens (Einstein arcs, thin photon ring) and a dim star on a 20M orbit, tidally stretched, trailing a logarithmic debris spiral (its lensed image wraps under the shadow).
- **1 · Infall:** the star dissolves; the stream widens and winds inward into a turbulent, warming ring; the camera closes from 46M to 34M.
- **2 · Horizon:** a full blazing disk to 19M, opaque, strongly Doppler-beamed; jets build with energy; the camera sits at 27M with one close pass per orbit down to about 15.7M.

Development morphs density, temperature, stream width/reach, opacity, camera distance, inclination and jets; it never crossfades.

Five extra looks:

| Look | Development | Character |
| --- | --- | --- |
| Edge of Night | 2 | Nearly edge-on (the Interstellar view), strong beaming |
| Polar Crown | 1.7 | View from high above, jet toward the camera |
| Quiet Lens | 0.3 | High inclination, dense stars, slow |
| Ember Ring | 1.25 | Turbulent warming ring, mild beaming |
| Relativistic Gale | 2 | Fast, turbulent, full beaming, strong jets |

## Energy, rhythm and camera

- **Energy:** disk rotation ×0.65–1.35, turbulence ±0.3 with an energy-dependent fine-octave weight, jet length (9–24M), knot contrast and jet presence, star twinkle depth, camera orbit ×0.75–1.4. Ladder mean luminance stays nearly flat (Blazing Horizon 0.055 / 0.061 / 0.061).
- **Gestures:**
  - **Hot spot** (4 beats) flares at 7.5M as it orbits; at state 0 the star flares.
  - **Photon ring** (8 beats) brightens the ring.
  - **Jet knot** (16 beats) ejects one bright knot along both jets.
- **Kick:** a 2.5% FOV punch.
- **Camera:** slow orbit about the spin axis. Inclination moves to a seeded value at every 8-bar phrase (`u_beat / 32`, smooth over the last 40%) and is clamped to 0.05–1.25 rad, so it never lies in the disk plane. Roll is at most 0.04 rad, the dolly breathes ±2.5%, and there is one close pass per orbit in the Horizon state. The camera stays at r ≥ 15.7M, far outside the horizon (2M) and the photon sphere (3M).

## Continuity and endlessness

A 7-texel state integrates 24-bit phases:

- camera azimuth;
- disk flow and its wrap counter;
- jet knots;
- twinkle;
- star orbit;
- hot-spot orbit.

Energy changes rates, never positions. The disk pattern uses two flow layers in material coordinates (`θ + Ω(r)·t`, sheared within ±15M of time), reseeded at zero weight with a counter-derived seed and cross-faded with constant variance. This stays endless without unbounded shear. No `u_time` is used; the counter wraps after 2^24 flow periods (about 1.7 years). Development never touches the state or the seed.

## Cost

Native M3 Pro (`profile-families --types`, whole frame including post), measured with Metamorphosis in the same run as the control. Values are **INDICATIVE**: the GPU was shared with other lanes.

| Resolution | Star | Infall | Horizon | Metamorphosis (same run) | Ratio |
| --- | --- | --- | --- | --- | --- |
| 1080p | 2.8 ms | 3.3 ms | 4.3 ms | 1.9–2.4 ms | 1.3–2.0× |
| 4K | 8.6 ms | 9.8 ms | 12.5 ms | 4.5–4.9 ms | 1.8–2.7× |

The per-pixel fallback measured 3.1 / 3.7 / 4.3 ms at 1080p (control 1.6 ms); the table path was about 30% faster in the same conditions. Zero GL errors and zero non-finite values.

## Verification

`tests/horizon.test.mjs` checks:

- the CPU mirror of the integrator, with source checks;
- weak-field deflection against `4M/b + 15πM²/4b²` within 1% for b = 40–640;
- the shadow edge at `√27 M` (bisection, ±2e-3);
- static-observer capture exactly at √27 M from 10–46M;
- Hermite crossings against a fine integration;
- table row inversion, no straddling, and table-versus-direct crossing radii within 2%;
- the camera never inside 15M;
- flow-layer reseeding only at zero weight;
- presets, world continuity, style limits and gesture periods.

Films: `PHOSPHOR_HEADLESS_RIG=1 node scripts/world-film.mjs --world horizon --rig` and `--look "horizon:Edge of Night" --from 1 --to 2`.

## Limits

- Schwarzschild only: no spin (Kerr), so the shadow is circular and the disk is not frame-dragged.
- The disk has zero thickness, and its turbulence is a stylised two-layer flow noise.
- Colour is palette temperature, not a blackbody spectrum.
- The camera is a static observer: orbital aberration is ignored.
- Jets use straight chords between table samples (every 0.24 rad).
- Near-critical rays are tabulated to 3.2π, and fourth and higher images are dropped (the photon ring glow stands in for them).
- The thin disk still reads as smooth sheared filaments, not a full turbulent volume.

## Wave 5 rework · 2026-10-15

All world/look names, seeds, schema and presets remain unchanged; no engine or world-definition change.

Visual rounds (each filmed and reviewed): (1) widen/brighten the tidal star and stream and make the photon ring palette-primary rather than a dim accent; (2) lower the ringlet amplitude/frequency, strengthen the density waves and gas contrast, remove the fourth primary noise octave; (3) taper the luminous jets to finite camera-relative lengths, reject invisible chords early, reserve jet accent for knots and lower background-star competition; (4) portrait review exposed the old height-based camera crop, now corrected to short-side projection/footprints. The peak disk is about 80% of the short side; finite jets no longer end at the frame boundary. The geodesic integrator, table, seeded phases and development geometry are unchanged.

Native headless M3 Pro synchronous throughput, all states, p50 ms (includes post). Initial 12-frame baseline: **2.3 / 2.3 / 2.8** at 1080p, **6.2 / 7.9 / 9.5** at 4K. Shared-machine load drifted; adjacent 60-frame reference/final runs give the more comparable acceptance pair:

| Resolution | Tidal Star | Infall Spiral | Blazing Horizon |
| --- | --- | --- | --- |
| 1080p baseline → final | 2.4 → 2.3 | 2.6 → 2.5 | 3.2 → 3.3 |
| 4K baseline → final | 8.1 → 7.1 | 8.7 → 8.3 | 10.7 → 11.0 |

Every paired state is within +5%; timing noise/other fleet GPU users prevent a venue-cadence claim. Zero GL errors/non-finite values. Added regression coverage for portrait projection, bounded jet extent/early rejection and the reduced noise budget; existing CPU Schwarzschild tests retained. Reviewed the energy ladder, Edge of Night, Phosphor, Ember and Glacier (portrait). Honest rating: **9/10** (stylised, not Kerr/volumetric astrophysics).

Evidence is in the fleet worker output `rework-space/output/`: `horizon-baseline/horizon.{mp4,png}`, `horizon-final/horizon.{mp4,png}`, `horizon-extra/`, `horizon-ember/`, `horizon-glacier-portrait/`, `horizon-ladder/`; superseded rounds deleted.
