# Density Waves · Spiral Nebula / Spiralnebel

Family **87**, renderer/world ID `nebula`. Continuous **Dust → Spiral → Nova**. A persistent, seed-derived particle population supplies the resolved stars and 3D motion; full-resolution analytic radiance supplies the unresolved gas. This is authored astronomical choreography, not an N-body or hydrodynamics solver.

## Identity, mathematics and state

`nebula-model.mjs` is the CPU reference for the trajectories and radiance carriers.

- **Dust:** Zel'dovich displacement `x = q + D S(q)`, `S = −∇Φ`, with eight seeded plane-wave potential modes. Particle caustic light follows `1 / |det(I + D ∂S/∂q)|`. The unresolved emitting cloud uses four octaves of smooth, domain-warped scalar noise, with a finite radial falloff.
- **Spiral:** each star moves on an ellipse whose orientation winds with radius. The two trailing arms emerge from neighbouring-orbit crowding; orbital speed differs from pattern speed. The winding is 1.35× the earlier revision, keeping a substantial outer curl. Gas light follows the same seeded winding/pattern phase, with broad arms, fine feathering, dark concave lanes and a dense white/palette-primary bulge. Sparse **Gaussian HII knots with halos**, not hard thresholded noise patches, use the accent. Their tails fade to zero at cell boundaries; core width includes the projected pixel footprint.
- **Nova:** the core collapses and ignites; the same tracers advect into a shell with tangential Zel'dovich gathering, radial fingers and precessing pulsar jets. Sedov–Taylor fronts `F = 2.35 c^(2/5)` sweep outward. The unresolved shell expands continuously, with corrugated radius, fine variable-width filaments, bright limb and diffuse lit cavity. Jets and the old over-bright green caustic clumps are subdued.

The radiance cloud samples the closest point to the eye ray in the ellipsoidal metric `diag(1, 1/h, 1)`, with thickness `h = mix(.65, .035, smoothstep(0,1,development))`. It therefore **flattens geometrically**, rather than dissolving between screen pictures. The emitting shell grows from radius `.25 × 1.45` to `1.45`, with periodic angular corrugation `1 + .055 sin(5θ) + .028 cos(11θ)`. Its support and the cloud's negligible tails are bounded before the noise reads. During the explosion, remaining disk emission sits behind the growing shell while resolved tracers carry the collapse/expansion.

The RGBA8 state is still **512×256 = 131,072 texels**, with the first texel a 32-bit clock. Other texels store an extra azimuth ψ as a signed fixed-point turn. `dψ/dt = p(1−n)(Ω(a)−Ωcloud) − (1−p)kψ`. Nova freezes the record; dispersal relaxes it home. All global phases use integer cycle counts per 1,440 seconds, so the uint wrap is exact over 12 hours. There is no raw `u_time` product.

A fixed quarter of the original non-sky emitters is now the resolved tracer cohort. Only this cohort needs ψ integration; dormant identities retain their state. **All original sky identities remain visible**, distributed at radii 7–16 for real perspective depth, with a brightness/size hierarchy. No particles were added. The final 12,288 legacy absorber identities remain dormant, as in the preceding rework.

## Dust extinction and colour

No all-stars-last absorption overlay. Each particle emitter uses finite emitter-to-eye transmission through a normalized `sech²` vertical slab weighted by the spiral dust lanes. The integral has an exact tanh antiderivative and finite parallel-ray limit, so foreground stars exclude dust behind them. Gas has its own resolved dark lane modulation.

All colours derive from `u_primary`, `u_secondary`, `u_accent`, white or black. Secondary carries the cool gas, white/primary the bulge and hot stars, and accent is reserved for HII knots and rare remnant emission. Core/knots can exceed 1.0 on the float path for bloom. Energy changes tracer density, turbulence and integrated motion, with existing density/light compensation; it does not turn the entire sky into a flash.

## Camera, development and rhythm

A gentle **288-second** perspective orbit replaces the earlier 96-second orbit. Height swings over 160 seconds, dolly over 240. Default distance develops 4.5 → 3.5 → 3.7 world units; framing uses the **short side**, including portrait. The bright subject fills approximately 70–85% of that side, with softer gas outskirts. Kick changes focal length by at most 2%.

The existing three gestures remain: **Arm light** (4 beats: arm gas/stars and cloud knots), **Core flare** (8: bulge/remnant), **Shock ripple** (16: outward light through the stars). Faders and audio mappings are unchanged.

All world/look IDs, names, seeds, schema keys and authored preset parameters are stable. World states still share seed **3141** and differ only in development: **Drifting Dust**, **Grand Spiral**, **Supernova Shell**. Extra looks remain **Cosmic Web**, **Edge-on Lanes**, **Open Whirlpool**, **Remnant Bloom**. The world definition did not change; no HISTORY migration is required.

## Data cache and cost

No engine change. The existing optional `precompute` API owns a **128×129 RGBA32F data table** (~258 KiB). Rows 0–127 contain the exact four scalar lattice corners packed in RGBA; row 128 contains camera basis and uniform seeded phase data. The image, dust edges, knots and filaments are still shaded **at full output resolution**. This is not a cached low-resolution colour image. Without float data targets, the shader evaluates the same scalar functions directly. The engine refreshes the data on every visual draw, including paused edits.

Native headless Chrome 155 / ANGLE Metal / Apple M3 Pro, synchronous whole-frame p50 including post, not venue cadence. Baseline is previous final commit `8c59e33863210d81df1182ea193cedc219aba70b`.

| Resolution, state order | Baseline → final p50 ms |
| --- | --- |
| 1080p Dust / Spiral / Nova | 1.8 / 1.7 / 1.8 → **1.8 / 1.7 / 1.8** |
| 4K Dust / Spiral / Nova | 4.9 / 4.8 / 4.6 → **5.0 / 4.6 / 4.5** |

Final p95: 1080p **2.4 / 2.1 / 2.5 ms**, 4K **5.7 / 5.4 / 5.6 ms**. Every state passes the previous cost +5% ceiling. Since fleet load varies, a second comparison alternated reference/current draws AB/BA in the same browser, 96 samples per side/state: 1080p **2.3/1.9/1.9 → 2.2/1.9/1.8**, 4K **5.5/5.3/5.0 → 5.4/5.1/4.8**. Zero GL/non-finite/errors.

## Visual iteration and evidence

Seven filmed improvement rounds after the previous final baseline:

1. Full-resolution gas, core, lanes and initial shell. Rejected the procedural sky: too busy and about 2× baseline 4K cost.
2. Existing sky stars instead; bounded/state-conditional gas evaluation; broader arms. Shell still too wire-like.
3. Scalar lattice cache; more luminous gas and irregular shell support. Spiral still read as a broad S.
4. Integrate only the fixed tracer cohort; quieter jets, reduced dust opacity, diffuse remnant light.
5. Cache uniform camera data as well; tighter winding and deeper/brighter sky. Alternating performance comparison passed.
6. Softer HII treatment and varying filament widths. 4K review still exposed flat pink threshold patches.
7. Explicit round Gaussian HII knots/halos with footprint filtering; another fine shell octave. Final films and all performance checks repeated.

Evidence root: fleet `rework-space/output/`. Baseline/final films and contact strips: `nebula-next-baseline/nebula.{mp4,png}` and `nebula-next-final/nebula.{mp4,png}`. Combined strip: `nebula-next-before-after.png`. Liquid Chrome comparison: `reference-chrome/liquid-chrome.{mp4,png}`. Extra look, three palettes, portrait, reverse film, seven-look energy ladder, 4K stills/crops, stock profiles, raw alternating samples and cache-fallback comparison are retained there. Superseded intermediate films are removed to save disk space.

## Verification and limits

`tests/nebula.test.mjs` retains potential-gradient, ellipse polar map, emergent trailing m=2 density-wave, fixed-point phase, development/time continuity, reversal, Sedov–Taylor, jet-wrap and finite dust-column tests. New checks cover cloud-metric minimization, continuous/bounded periodic shell support, unchanged particle budget, scalar-cache fallback source path, Gaussian knot support and sky depth. Tests find the world by ID, not registry position.

`node --test tests/nebula.test.mjs tests/time.test.mjs`: **22/22 pass**. Full main suite: **738 pass, 9 opt-in skips, 0 failures** (747 total). Typecheck, build and native-GPU German/English i18n browser smoke pass. Catalog assets were not regenerated.

Native checks cover all states and half-states at energy .1/.9, Phosphor/Ember/Glacier, portrait and 4K. Cached/direct frames differ by at most **1/255** per channel in the sampled five developments (mean < .00016/255), with zero GL errors. Native time-wrap/rate-step audit passes at 3,600, 4,096 and 43,200 seconds. External-display cadence and multi-hour endurance are not claimed.

**Honest rating: 8.5/10**, compared with the filmed Liquid Chrome reference and the retained Event Horizon film. The opening, spiral and light hierarchy are substantially stronger than the preceding particle-only rework. Still not a fully photographic 9: the nova is visibly a procedural emitting shell rather than turbulent volumetric gas, its angular corrugation can read as a regular lobed outline, the HII distribution is stylized, and the low-camera extra look is intentionally thin. The cheap ellipsoidal cloud/near-shell radiance is an approximation, not full radiative transfer or hydrodynamics.
