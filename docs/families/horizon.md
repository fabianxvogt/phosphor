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

- **0 · Star:** a star on a 20M orbit trails a long cool debris spiral around a larger lens. A faint pre-existing inner gas disk now makes the shadow legible throughout the breakdown.
- **1 · Infall:** the star dissolves; the same stream widens and winds inward into a turbulent, warming ring; the camera closes gently from 34M to 32M.
- **2 · Horizon:** a full disk to 19M, opaque and Doppler-beamed, with cool outer filaments and small hot patches; energy builds short, finite jets. Camera radius is 30M, with an 8% close-pass modulation rather than the former 42% dive.

Development morphs density, temperature, stream width/reach, opacity, camera distance, inclination and jets; it never crossfades.

Five extra looks:

| Look              | Development | Character                                              |
| ----------------- | ----------- | ------------------------------------------------------ |
| Edge of Night     | 2           | Nearly edge-on (the Interstellar view), strong beaming |
| Polar Crown       | 1.7         | View from high above, jet toward the camera            |
| Quiet Lens        | 0.3         | High inclination, dense stars, slow                    |
| Ember Ring        | 1.25        | Turbulent warming ring, mild beaming                   |
| Relativistic Gale | 2           | Fast, turbulent, full beaming, strong jets             |

## Energy, rhythm and camera

- **Energy:** disk rotation ×0.65–1.35, turbulence ±0.3 with an energy-dependent fine-octave weight, jet length (9–24M), knot contrast and jet presence, star twinkle depth, camera orbit ×0.75–1.4. Ladder mean luminance stays nearly flat (Blazing Horizon 0.055 / 0.061 / 0.061).
- **Gestures:**
  - **Hot spot** (4 beats) flares at 7.5M as it orbits; at state 0 the star flares.
  - **Photon ring** (8 beats) brightens the ring.
  - **Jet knot** (16-beat legacy default) ejects a stronger, narrower bright knot along both jets.
  - **Photon relay** (slot 3) circles the critical-impact rim with an accent flare and a soft wake. `u_rhythmCount.w` chooses one of eight launch sectors; the envelope drives travel, and the hit broadens only the leading edge. It remains visible at every development, without requiring jets.
- **Kick:** a 2.5% FOV punch.
- **Camera:** slow orbit about the spin axis. Inclination moves to a seeded value at every 8-bar phrase (`u_beat / 32`, smooth over the last 40%) and is clamped to 0.05–1.25 rad. Roll stays below 0.04 rad. The r3 camera stays above 26M and its development-driven radius range is below 24%; the former one-bar dive is removed. Short-side projection includes an additional square/portrait fit. Jet extent is capped at 0.25 camera radii; small continuous off-centre drift does not cut or reset.

## Continuity and endlessness

A 7-texel state integrates 24-bit phases:

- camera azimuth;
- disk flow and its wrap counter;
- jet knots;
- twinkle;
- star orbit;
- hot-spot orbit.

Energy changes rates, never positions. The disk pattern uses two flow layers in material coordinates (`θ + Ω(r)·t`, sheared within ±15M of time), reseeded at zero weight with a counter-derived seed and cross-faded with constant variance. This stays endless without unbounded shear. No `u_time` is used; the counter wraps after 2^24 flow periods (about 1.7 years). Development never touches the state or the seed.

## Historical cost (pre-r3)

Native M3 Pro (`profile-families --types`, whole frame including post), measured with Metamorphosis in the same run as the control. Values are **INDICATIVE**: the GPU was shared with other lanes.

| Resolution | Star   | Infall | Horizon | Metamorphosis (same run) | Ratio    |
| ---------- | ------ | ------ | ------- | ------------------------ | -------- |
| 1080p      | 2.8 ms | 3.3 ms | 4.3 ms  | 1.9–2.4 ms               | 1.3–2.0× |
| 4K         | 8.6 ms | 9.8 ms | 12.5 ms | 4.5–4.9 ms               | 1.8–2.7× |

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

| Resolution             | Tidal Star | Infall Spiral | Blazing Horizon |
| ---------------------- | ---------- | ------------- | --------------- |
| 1080p baseline → final | 2.4 → 2.3  | 2.6 → 2.5     | 3.2 → 3.3       |
| 4K baseline → final    | 8.1 → 7.1  | 8.7 → 8.3     | 10.7 → 11.0     |

Every paired state is within +5%; timing noise/other fleet GPU users prevent a venue-cadence claim. Zero GL errors/non-finite values. Added regression coverage for portrait projection, bounded jet extent/early rejection and the reduced noise budget; existing CPU Schwarzschild tests retained. Reviewed the energy ladder, Edge of Night, Phosphor, Ember and Glacier (portrait). Historical implementer self-rating: **9/10**, superseded by the independent r3 baseline (L5 / overall4). This was not an independent acceptance score.

Historical evidence was in the fleet worker output `rework-space/output/`: `horizon-baseline/horizon.{mp4,png}`, `horizon-final/horizon.{mp4,png}`, `horizon-extra/`, `horizon-ember/`, `horizon-glacier-portrait/`, `horizon-ladder/`; superseded rounds deleted.

## Round 3 · 2026-10-16 — openai-codex/gpt-6.1-sol

Preserves IDs, seeds, eight looks, schema, state names, exact geodesic integrator and precompute dimensions. Authored world definition unchanged; no HISTORY migration needed. Main's rhythm preset commit was merged before the rhythm work. No shared limiter or engine changes.

Three filmed/read iterations: (1) larger lens and longer initial debris, restrained camera radius range, fourth gesture; (2) pulled framing back to prevent clipped star/jet tips, higher-frequency gas contrast and aspect fit; (3) a readable inner gas disk in the breakdown and cooler temperature mapping to separate the hot approaching patch from outer gas. Brightness is not used as an energy control. Every energy retains the same seeded space; energy changes flow speed, turbulence, fine structure and jet activity.

### Authored rhythms

| Style      | Name               | Family hits/bar |
| ---------- | ------------------ | --------------- |
| Restrained | Silent orbit       | 3.0             |
| Driving    | Photon waltz       | 7.7             |
| Accented   | Relativistic bloom | 16.3            |

Four independently looping tracks: a six-beat hotspot figure, photon syncopations, spaced jet launches and the slot-3 **Photon relay**. Compact relay patterns (zero-based indices): restrained `[3,14] / 16`, division 2; driving `[0,3,5,10,14] / 16`, division 2; accented `[0,3,6,10,12,18,20,23,27,30] / 32`, division 4. Counts rotate launch sectors; shorter tracks continue across phrase boundaries. Existing hotspot emission doubles, rim pulse is sector-weighted, and jet knots are stronger but spatially narrow. DE/EN strings are additive beside the existing family gestures.

### Measured cost and verification

Native M3 Pro, 40 synchronous frames/state including post, excluding asynchronous flash approval (not venue cadence):

| State           | 1080p p50/p95 ms | 4K p50/p95 ms |
| --------------- | ---------------- | ------------- |
| Tidal Star      | 2.7 / 3.1        | 8.4 / 8.8     |
| Infall Spiral   | 3.0 / 3.3        | 9.6 / 10.8    |
| Blazing Horizon | 3.5 / 4.0        | 11.6 / 12.2   |

ABBA pairing against main: p50 deltas **+3.7%, +7.1%, −2.9%** at 1080p; **+11.7%, +19.0%, +8.7%** at 4K. Absolute budgets pass; the relative +5% gate does **not** pass. The larger/always-present gas shades more pixels, and baseline p95 shows contention. This is reported, not excused as a passing optimization. Zero GL/non-finite/GPU errors.

- `npm test`: 985 pass, 21 opt-in browser skips, 0 failures; includes family, world-rhythm and pipeline-flash coverage.
- `npm run typecheck`, build and native-GPU DE/EN i18n: pass.
- `scripts/verify-horizon.mjs`: limiter-enabled health/captures at development 0/0.5/1/1.5/2 and energy 0.1/0.5/0.9; three palettes (Phosphor, Ember, Glacier), portrait 540×960, late time 43200s. 78 frames: no GL errors/non-finite uploads or mostly-empty frames. The script leaves flash approval enabled and yields for its fences.
- Edge of Night 2→0 reversal film: no cuts or resets; edge-on is still legible. Family tests cover smooth/reversible camera, presets and density targets, slot 3 and the unchanged CPU geodesic reference.
- Prettier checks pass for scene, family test, verification script and this document. Shared dictionaries retain existing non-Prettier layout; only two keys added per language.

Final reviewer evidence: `artifacts/look-review/horizon-r3/horizon-{sheet,rhythm}.png`, `horizon.mp4`, `grids.md`. Iterations: sibling `horizon-r3-before`, `horizon-r3-round1`, `horizon-r3-round2`, `horizon-r3-round3`. Limiter-enabled ladders: `artifacts/stills/horizon-{energy,ember,glacier-portrait,late}/`; reverse: `artifacts/look-review/horizon-r3-reverse/`. Timing JSONs: `artifacts/performance/horizon-r3-{1080,4k,pair1080,pair4k}/profile.json`.

**Remaining weaknesses / self-assessment:** L ≈7, not independent acceptance. Thin-disk emission still reads as polished filaments rather than thick turbulent plasma. Portrait has large sky margins, low-energy jets intentionally disappear, and the photon relay's local wake is clearer in motion than in a contact sheet. More physical thickness would need a separately budgeted renderer change; no such change is claimed here.
