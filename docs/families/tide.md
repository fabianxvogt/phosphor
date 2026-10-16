# Moon Tide · Mondflut

**INCREMENTAL / EMPIRICAL**, world-polish wave 6 (2026-10-16) over worlds wave 4/5, family **103**, renderer `tide`, world `moon-tide`. A dark, reflective ocean at night. The polish makes **bioluminescent breaking foam** the signature: it lights the Swell, and the same crests wind into the arms of the Maelstrom. No engine changes.

## Signature mathematics

Six seeded, persistent directional Gerstner waves. For wave `i`, `ωᵢ = 0.35 nᵢ`, `n = [2,3,4,5,7,10]`, and **`kᵢ = ωᵢ² / 9.81`**. Longer waves travel faster: phase speed `ω/k`; group speed `ω/(2k)`. The amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]` scale continuously from ×0.48 to ×2.35 with Calm → Swell and by the height fader (≤1.3). At the schema maximum, `Σ Q k A = 0.5530875468 < 1`, so the horizontal Gerstner map cannot fold. **Wave 6 follow-up:** the swell runs obliquely *toward* the coastal camera (mode 0 at 58.5°, spread `[0,−.32,.38,−.55,.8,−1.05]` rad plus ±0.15 seeded jitter). Breaking faces and glowing lips face the viewer, and crests sweep diagonally across the frame. The first wave-6 delivery (away from the camera) showed mostly back slopes.

**Breaking foam (new).** The foam is driven by the analytic signal of the wind sea, `z = Σ cᵢ e^{iφᵢ}` over modes 1–4 (56, 31, 20, 10 m) with steepness weights `cᵢ = Aᵢ (nᵢ/5)²`. For a single mode, `arg z` is exactly the wave phase and `|z|` its amplitude; for the sum, `|z|` is the group envelope and `arg z` the local phase. The time since the crest passed is `age = π/2 − arg z (mod 2π)`. The foam left behind is the decaying sum of all earlier crest passages, `Σₘ e^{−(age+2πm)/κ}`. In closed form, after subtracting the floor that remains just before the next crest:

```
F(age) = (e^{−age/κ} − e^{−2π/κ}) / (1 − e^{−2π/κ})     (1 at the crest, 0 before the next)
```

A gate decides where the sea breaks: `smoothstep(θ, θ+0.5, |z|/0.6242)`. The threshold θ = 1.45 → 0.65 falls with energy. The gate is also weighted by the long-swell crest (short waves break preferentially on swell crests) and, in the vortex, by distance to the funnel. Where `arg z` is undefined (`|z|→0`), the gate is exactly 0, so the foam stays continuous through phase dislocations; a CPU test refines every steep 3 cm step to 0.3 mm and finds no jump. Calm can never break: its full-schema envelope is ≤ 0.624, below the lowest threshold of 0.65. The front is one-sided, sharp ahead of the crest (0.035 rad) and longer behind it (0.14 rad), and widened by the phase footprint. **Follow-up:** the lip carries tumbling knots that travel along it (periodic in the wave clock) and fine whitewater streaks. The lip lights the wave face ahead of it (`e^{behind/0.3}`, continuous at the crest), and that face carries cascading streaks. A **seeded shoal** at about 30 m in front of the coast lowers the breaking threshold by up to 0.55: big swells steepen and break over it, so the near field usually holds a large breaker. Its place is fixed by the seed; its effect scales with swell height (zero in Calm, so Calm still never breaks) and yields to the maelstrom. The texture is evaluated only where breaking is non-zero and fades out continuously across the peak. The trailing foam is a soft streak texture in material coordinates (≈1.1 × 3 m streaks, combed along the travel direction), torn open as `F` decays and resolved to its mean when unresolved.

**Vortex twist (new).** The maelstrom winds the *same* ocean: the waves are sampled at `y = R(φ(r)) x`, `φ = −3.5 · smoothstep(1.0, 1.6, dev) · e^{−r²/900}`. **Handoff schedule:** the twist winds the existing crests first (development 1.0–1.6), the camera cranes during 1.1–1.9, and the bowl deepens during 1.2–2.0. In the sweep you see the Swell's crests spiral up from the coastal view before the funnel opens, rather than a new picture fading in. The twist preserves radius, so it is a bijection; the heightfield stays single-valued and the no-fold bound is untouched. Gradients are pulled back exactly through `Jᵀ = Rᵀ + ∇φ (R J₉₀ x)ᵀ` (CPU finite-difference test). The twist's handedness matches the bowl's spiral ridges, so the Swell's crests and their foam visibly spiral into the funnel with development and unwind on reversal.

Two Newton iterations invert `X(q)`. The data-only precompute is 1024×513 RGBA32F in two banks. The **left bank** holds wave + bowl height, two analytic gradient components and crest compression. The **right bank (new)** holds `(Im z, Re z, q)`: the swell's analytic signal and the material coordinate, so foam texture rides the water. The table covers −128…128 m (0.501 m spacing). The polar core r ≤ 6 and the table border stay on the exact path, with blends between them. Lighting, foam, glints and colour still run at full output resolution; no colour image is cached. Without float targets, the exact analytic path is used.

A safeguarded **Illinois regula-falsi** solve finds the water height inside conservative ray-specific slabs. **Wave 6:** its iteration cap follows the engine step budget: `ceil(15 · u_raySteps/96)` gives 15 / 10 / 7 iterations for the governor's 96 / 64 / 40. The full budget is bit-identical to before. CPU residuals on the slab test are 0.046 / 0.046 / 0.17 m.

### The peak: Maelstrom

The vertical coordinate develops a **42 m depression** with a raised shoulder and five meandering, rotating spiral ridges. The base is `−42 e^{−r²/190} + 3.8 e^{−((r−23)/7)²}`, and the ridge phase is `5θ + 0.44r − 2f + 0.28 sin(3θ − 0.12r + f)`, with integer harmonics so the atan seam and the clock wrap are exact. This is an authored deformation, not a Navier–Stokes vortex.

## Light, colour and depth

- **Moonlight is cold** (secondary → white). The moon is larger (0.042 rad), with limb darkening, maria shaded only on the disc and a two-scale halo. A thin cloud bank sits near the horizon with silver edges near the moon. Stars are round.
- **Calm water (follow-up):** the matte key-light lift is gone on open water; it remains only for Swell faces and funnel walls. The water body is near-black. Slopes tilted toward the low moon carry broad soft bands (`smoothstep(0, 0.08, n·moon)` weighted by Fresnel), and perspective packs them toward the horizon. **Far normals:** where the footprint exceeds 0.15–0.5 m inside the moon lobe, the C0 bilinear table normal blends into an analytic six-mode normal with each mode Gaussian-filtered by the footprint, which removes the cell grid from the far moon path. This is skipped at the full maelstrom (cost), where the faint grid remains.
- **Glitter:** the old single capillary train striped the moon path. Wave 6 uses three crossing capillary trains in world coordinates, plus a micro-facet glint field: one tilted facet per 0.22 m cell of material coordinates, plus a 1.1 m octave for the far path (off at the full peak), with a ±0.14 shimmer, a Gaussian point that conserves its flux when subpixel and fades into the broad lobes. The result is a wide moon path of separate sparkles.
- **Biolight is primary:** the breaking front glows hot and fades into the streak foam, with a soft scattering pool around each crest. The white-hot core sits on the brightest groups. **Accent** marks only the hottest breaking points and the eye core.
- **Calm sparks:** rare plankton flashes where small crests compress (a crest-compression gate). These are also the glowing droplets thrown from breaking fronts. They are the first hint of the Swell's light.
- **Throat:** reflected moonlight still falls off exponentially down the funnel. A glowing eye at (0, −36, 0) lights the walls from below (Lambert term × e^{−d/13} + rim), with an accent core and a primary glow at the bottom. Arms carry crisp cores, a broad one-sided glowing band and the white-hot core. Three spindrift strata orbit the lip at 1/2/3 whole turns per flow period, in the arms' sense of rotation, and are occluded by the water.

## States and looks

States share **seed 10301 and every non-development parameter** (moon elevation is now 0.20 so the moon sits inside the pitched frame).

| EN | DE | Development | Character |
| --- | --- | --- | --- |
| Calm | Stille | 0 | Near-black water, moonlit swell bands toward the horizon, sparkling moon path, rare biolight sparks |
| Swell | Dünung | 1 | Large diagonal breakers over the near shoal: lit face, tumbling glowing lip, fading streak foam |
| Maelstrom | Mahlstrom | 2 | Same crests wound into spiral arms that pour into a glowing eye |
| Silver Passage | Silberpassage | 0.2 | Moon on the horizon behind cloud edges, camera near the water, rough glitter road |
| Living Breakers | Lebendige Brecher | 1 | Highest waves, camera just above the crest envelope, heavy biolight |
| Spiral Cathedral | Spiralkathedrale | 2 | Overhead crane (eye 1): a top-down spiral mandala around the eye |
| Far Lantern | Ferne Laterne | 0.65 | Higher moon and viewpoint, smaller swell, first crests igniting |
| Undertow | Sog | 1.7 | Low on the lip (eye 0), looking across the forming throat |

## Energy, rhythm and camera

Energy is orthogonal and visible in a still: breaking threshold (0.1: a few groups; 0.9: whitecaps across the sea), foam persistence κ 0.6 → 2.4 rad, spark/spray density, swirl speed (flow clock × (0.6 + 0.8·level)), wave speed ×0.7–1.3 and camera drift. It never changes brightness, amplitudes or development.

- **Crest packet / Schaumwoge**, 4 beats: a wave group whose envelope moves at the **group velocity of mode 3** (envelope wavenumber `2k₃/5` per unit clock, so `c = n/(2k)`). The crests overtake it while it lights the breaking fronts.
- **Spiral ridge / Spiralgrat**, 8 beats: a surge of biolight runs down the arms into the eye, and the wall light swells.
- **Incoming tide / Ankommende Flut**, 16 beats: a tide ring rolls out from the eye across the shoulder.

Kick: the field of view changes by at most 2.2%, and hot fronts brighten by at most 30%, locally.

**Camera:** the camera cranes on its own schedule (development 1.1–1.9; C1 at both ends). The coastal camera sits 0.5 + 2.6·eye m above the global crest envelope. It is pitched about 12° down so the horizon lies near the upper third and the sea fills about two thirds of the frame. It dollies ±12 m sideways with a slight yaw. The vortex crane and orbit are unchanged at eye 0.25–0.7. Eye above 0.7 cranes overhead (radius −20 m, +10 m); eye below 0.25 drops toward the lip (−22 m). No roll. CPU tests check clearance over development × eye × height × phase, the periodic wrap at intermediate development and the overhead clearance.

## Endless time

Three integrated engine clocks: wave phase, camera phase and spiral flow, each with period 2π. The flow rate now includes energy, so it switches to the late clock on the first change. Every use is periodic in those exact periods: capillary harmonics 5/6/7, glint twinkle 3/4, spindrift turns 1/2/3, and the gesture envelope Ω = 1. Development never resets clocks or seed. GPU checks at 3600 / 4096 / 43 200 s pass (below).

## Wave-6 polish: evidence and cost

Rounds (films under `.claude/worktrees/moon-tide/artifacts/films/`, worktree only):

1. `r1`: twist, analytic-signal foam with a Voronoi lace. The lace read as **snakeskin/honeycomb** and was rejected.
2. `r2`: mottle noise, which read as flat camouflage blobs (the wave-5 failure) and was rejected.
3. `r4`: long streaks hung like a fringe. The real problem was that the foam signal was dominated by the 126 m swell, so the near field had no crests. Switched the signal to the 56–10 m wind sea with steepness weights.
4. `r7`–`r9`: swell-crest modulation, calmer far water around the vortex, the overhead and lip looks, and stronger arms.
5. `r10`: holds at development 0.5 / 1.5, a 2 → 0 reversal, Ember / Glacier / Ultraviolet palettes, 540×960 portrait, five extra-look films.
6. `r14`–`final3`: cost cuts, a one-sided front, and capillaries moved from the table to world coordinates.

Pop scan (blurred frame-difference peaks over all `r10` films): the only spikes are periodic every 4 beats, and difference images show they are the bounded kick zoom moving the moon rim and glints, not foam. No foam pops.

**Before/after** at the same film times (3 s Calm, 15 s Swell, 27 s Maelstrom): `artifacts/films/before-after-t{3,15,27}.png`. The baseline film is `artifacts/films/moon-tide.mp4` and the final is `artifacts/films/final3/moon-tide.mp4`.

**Cost.** The paired runs used `profile-rework-pair.mjs --reference main`, interleaved, while four other lanes were rendering on the same M3 Pro. Absolute numbers were 2–3× the quiet values and are not meaningful.

| State | 1080p ratio | 4K ratio (three runs) |
| --- | ---: | ---: |
| Calm | 0.88 | 0.95 / 0.82 / 0.84 |
| Swell | 0.88 | 0.95 / 0.95 / 0.94 |
| Maelstrom | 1.02 | 1.04 / 1.18 / 1.03 |

The savings come from skipping the moon-maria noise off the disc (it was evaluated three times per pixel), running spindrift only in the vortex, and gating glints and sparks. One rejected step: log-polar wall spindrift alone cost +22% in the 4K Maelstrom (likely register pressure) and was replaced by orbiting the existing strata. Quiet main was 12.4 ms p50 at 4K Maelstrom in wave 5; with a median ratio of ~1.04, the polish is estimated at about 13 ms. That is an estimate under the 16 ms budget, not a quiet measurement. Contended absolute probes: `artifacts/perf/final-{1080,2160}/`.

**Accuracy.** Table-versus-exact CPU sweep over three seeds, development 0…2 and height 1.3: height error ≤ 0.046 m. The unit-normal error was 0.016 before the twist and is now 0.102 at development 2, where the twist compresses the 4 m mode near the throat. The breaking-front phase error is ≤ 0.025 rad on the open sea and 0.067 rad in the twisted peak. These are bounded by tests, not hidden.

## Wave-6 follow-up (L0 review of `b7d5e5c`: Calm/Swell ≈ 6, Maelstrom ≈ 8)

The round was filmed in `artifacts/films/w7r1`–`w7r7` and finalised in `w7/` (worktree only):

- world sweep;
- 30 s holds of Calm and Swell;
- Ember palette;
- 2 → 0 reversal;
- `before-after.png` at 3 / 15 / 17 / 27 s (original, `b7d5e5c`, follow-up).

Rejected or adjusted along the way:

- Lowering the lip's HDR fixed clipping into flat slime, but it starved the maelstrom's wound fronts. Lip strength is now development-weighted, so the maelstrom keeps its `b7d5e5c` strength.
- A far-field normal over all far pixels cost about 13% in the 4K maelstrom. It is now gated to the moon lobe outside the full peak.

Pop scan: spikes appear only every 4 beats; they are the kick zoom.

Cost: `profile-rework-pair.mjs --reference b7d5e5c` at 4K, two runs, shared GPU: Calm 1.31 / 1.10, Swell 1.35 / 1.18, **Maelstrom 0.95 / 1.03**. In the same conditions, the 4K maelstrom ran 18.9 ms against main's 16.6–18.4 ms. With main at 12.4 ms when quiet, that is about 13 ms quiet: an estimate under the 16 ms budget, not a quiet measurement. At 1080p against main: 3.6 / 4.0 / 6.0 ms p50 (ratios 1.12 / 1.11 / 1.13; that run predates the maelstrom cost gates). Calm and Swell remain far inside both budgets.

`check-tide` passes: late, early and fallback compile; zero GL errors; zero non-finite values; no time seams. Calm at energy 0.1 is lit over 23% of the frame (minimum 7%); its lower-half lit fraction fell from 1.0 to 0.14 by design, because the water is now near-black.

## Historical wave-5 final round: coherent breaking fronts (superseded by wave 6)

Follow-up to `eb076589`, 2026-10-16. Moon Tide only; exact spectrum,
geometry, clocks, camera, state/look/preset IDs, seeds and schema are unchanged.
`engine.mjs` is **not edited**.

Five filmed visual drafts plus a final film after the slope-cache optimization:

1. Remove all gradient-noise lace, per-pixel wind filaments and fuzzy spiral
   modulation. Directional-slope crests and smooth asymmetric funnel bands.
2. Reject compression contours: smooth, but they outlined whitecaps as rings.
3. Reject a single-mode carrier: cleaner, but read as sparse wires in perspective.
4. Add broad rolling streaks inside the spiral wakes; keep leading edges clean.
5. Final: exact four-mode directional derivative, compression flare, one-sided
   wake and scattering halo. This follows actual crossing swells, not a texture.
6. Performance polish: share the signed slope as data in a second table bank,
   then re-film and re-check native 1080p/4K stills and native-pixel crops.

The per-pixel derivative draft was **12.8% slower** in paired 4K Swell and was
not accepted. The final data-bank version passes every state's +5% limit:

| State | Paired 1080p previous → final | Paired 4K previous → final |
| --- | ---: | ---: |
| Calm | 3.20 → 3.10 ms | 9.50 → 9.15 ms |
| Swell | 3.45 → 3.25 ms | 10.20 → 10.20 ms |
| Maelstrom | 3.75 → 3.85 ms | 12.70 → 12.85 ms |

Native M3 Pro / ANGLE Metal, whole-frame synchronous p50 including post,
energy 0.95; four alternating baseline/current blocks, 30 measured frames
per block. Worst increase **2.67%**. These adjacent comparisons reduce shared
fleet contention; they do not qualify venue cadence. Separate-run baseline
1080p: 3.0/2.9/3.6; final 3.6/3.7/4.2 ms. Baseline 4K: 8.7/9.2/11.5;
final 9.2/10.0/12.4 ms. The slower separate 1080p probe is retained honestly;
the interleaved comparison establishes the relative-cost gate.

Evidence: fleet `rework-sea-sky/output/final-round/`, baseline/final world
films and strips, full-size 1080p/4K stills and native-pixel `near`/`crop`
views, round strips, all-eight-look ladder, Glacier breakers, Ember portrait,
native-resolution motion films, fallback/late/reversal verification and
3600/4096/43200-second checks. Rating **8/10**, not the previous over-lenient
8.5: the hairy patch regression is removed, but the analytic funnel still
looks authored rather than photographic churning whitewater. The scattering
pool is a local lighting approximation, not ray-traced refraction or foam
transport. Calm remains foam-free.

## Historical wave-5 rework and cost

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

## Historical wave-5 follow-up: restore filtered foam

Follow-up to `d634a4e`, 2026-10-15. The 512×513 combined geometry table,
exact fallback, Gerstner identities, no-fold bound, vortex shape, clock
identities and every saved world/look/preset remain unchanged.

Three filmed improvements plus a final verification film:

1. Remove filled aeration lobes; restore **open gradient-noise lace**.
   Calm foam is exactly zero, and its crest spray is gated by swell too.
   Filter the combined two-octave signed lace field, rather than only the
   first octave. Filter wind-streak phase before the divergent water branch.
2. Stretch lace along the wind (`0.42×1.50` coordinates), emphasize long
   filaments and impose a conservative world-pixel-footprint threshold floor.
   Unresolved streak contrast decays analytically; no candidate-cell outlines.
3. Calm capillary normal detail is reduced to a quarter, preserving a glassy
   moon path. Faint lunar scattering follows the lace, never fills noise lobes.

Full-resolution 1080p and 4K stills **and native-pixel crops were opened** for
all three states, before and after. Swell's foreground now has soft,
wind-stretched, open filaments rather than filled hard-edged patches. Calm
has no visible foam at energy 0.1. Peak remains a stylized luminous vortex,
not photographic breaking whitewater.

Native M3 Pro whole-frame p50, four alternating previous-final/current blocks:

| State | 1080p previous → current | 4K previous → current |
| --- | ---: | ---: |
| Calm | 2.80 → 2.80 ms | 8.40 → 8.35 ms |
| Swell | 2.90 → 2.90 ms | 8.75 → 8.70 ms |
| Maelstrom | 3.60 → 3.55 ms | 11.10 → 11.20 ms |

Worst increase **0.90%**; the previous surface-table speedup is retained.
Separate-run baseline 1080p 2.9/2.8/3.4 and 4K 8.3/8.7/11.0 ms;
final 1080p 2.7/2.8/3.4 and 4K 9.0/9.4/11.8 (later contended replay
9.3/10.2/13.1). Adjacent paired comparisons are the +5% acceptance measure,
not a claim that shared-GPU absolute timings are invariant.

Evidence under fleet `rework-sea-sky/output/next/`:
`baseline/tide/moon-tide.{mp4,png}` → `final/tide/moon-tide.{mp4,png}`;
`{baseline,final}/stills/tide-{0,1,2}-{1080,2160}-{full,crop}.png`;
`final/paired/comparison.json`; final all-look ladder, Glacier Living Breakers
and Ember portrait films. Superseded round strips are retained; superseded
movies were deleted after final review to save disk. Native early/late/
no-precompute compilation, reversal and time checks pass. Honest rating
**8.5/10** against the filmed Liquid Chrome/Event Horizon references: the
regression is fixed, but bright peak filaments remain deliberately authored.

## Historical wave-4 cost (native Apple M3 Pro, ANGLE Metal)

Synchronous whole-frame throughput, **including post**, not display cadence. Shared-machine indicative numbers, final three states:

| Resolution | Calm p50 / p95 | Swell p50 / p95 | Maelstrom p50 / p95 |
| --- | --- | --- | --- |
| 1920×1080 | 3.1 / 3.9 ms | 4.5 / 5.0 ms | 6.9 / 7.2 ms |
| 3840×2160 | 14.0 / 16.3 ms | 16.3 / 16.8 ms | 24.9 / 25.9 ms |

Round-2 delivery probe: 48 samples/state at energy 0.95, including post, on the shared M3 Pro. 1080p meets the ≤8 ms family budget, including measured p95. Earlier un-cached peak probes were 8.0 / 8.8 ms at 1080p. **4K Maelstrom is not a 60 Hz two-world-crossfade budget**; the 4K probe deliberately exits 1 against its default 16.67 ms threshold. No resolution cap, engine downgrade or cached colour image is used. JSON: `artifacts/performance/tide-r2-final-{1080,4k}/profile.json`.

## Verification (wave 6)

- `node --test tests/tide.test.mjs`: 19 pass (follow-up adds the shoal gate, far-normal filter, knot periodicity, twist/bowl/crane schedules). New CPU references:
  - analytic-signal phase/amplitude identity;
  - closed-form persistence against a 400-term decaying sum;
  - foam continuity through dislocations and the crest wrap, with refinement;
  - Calm never breaks over the full schema;
  - twist bijection and exact pullback against finite differences;
  - group-velocity gesture;
  - foam-bank phase/material error;
  - governor step budget 15/10/7 residuals;
  - camera clearance over development × eye × height × phase.

  Retained: dispersion, no-fold bound, inverse/normal, bowl seams, cache bounds, clocks, presets.
- `npm test` (port 48346): 912 pass, 21 skip, **1 expected failure**. `catalog-palette` "every authored catalogue look has a matching baked preview" fails because the tide presets changed (moon 0.2, re-authored looks); previews are rebaked by L0 at integration. `npm run typecheck` passes. `scripts/test-i18n.mjs --native-gpu` passes DE/EN; the software-rendered run timed out on the busy machine.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-tide.mjs --rig --port 48347 --out artifacts/films/tide-verification-final`:
  - early, late and no-precompute fallback compile;
  - Calm 1080p at energy 0.1 (lower half 100% lit, no black frame), Swell 1080p, Maelstrom 4K, portraits;
  - Swell at 3600 s, Maelstrom at 43 200 s;
  - time seams at 3600/4096/7200 s: none;
  - zero GL errors, zero non-finite values.
- Films: world (`final3`), holds at 0.5/1.5, reversal 2→0, three palettes, portrait, five extra looks (`r10`), energy ladders (`artifacts/contact/tide-r9`).

## Limits

- **Physics:** a small analytic spectrum, not an FFT sea. The heightfield cannot overturn, so there is no barrel. The vortex is authored, and the foam is a stylized bioluminescent model (exact persistence of an assumed decay, no foam advection, no spray particles).
- **Swell framing:** the shoal makes near-field breakers frequent but not constant; at low energy, frames between groups still occur.
- **Camera drop:** the crane is a pure function of development, so a one-bar 1 → 2 drop moves the camera about 35 m in under 2 s. That is fast but C1, with no jerk; the shader has no temporal state to slow it.
- **Foam colour:** the foam is a single primary hue; real whitewater would add more white scatter.
- **Sky:** the cloud bank is subtle at 960 px.
- **Specular artifacts:** the faint 0.5 m table-cell structure in the far moon lobe is removed by the analytic far normal, except at the full maelstrom, where that normal is skipped for cost.
- **Funnel accuracy:** the twist raises the table normal error in the throat to about 0.10.
- **Performance:** measured only under heavy fleet contention. The 4K peak cost is estimated at about 13 ms quiet from paired ratios, not measured quietly. The reduced governor budgets (64/40) are checked on the CPU only, not filmed. No venue qualification is claimed.
