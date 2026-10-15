# Density Waves (Spiral Nebula)

**INCREMENTAL / EMPIRICAL**, 2026-10-14. Family #87 and the continuous world **Spiral Nebula** (Dust → Spiral → Nova). Authored astrophysical choreography on one persistent particle population, not an N-body or hydrodynamics simulation.

## Algorithm and signature detail

131 071 stars (one per texel of a 512×256 state texture; texel 0 is the clock). Every star's identity (population, radius rank, azimuth, cloud coordinate, shell direction, tone) comes from its index and the seed only; [nebula-model.mjs](../../nebula-model.mjs) is the CPU reference, [scene-nebula.mjs](../../scene-nebula.mjs) the GLSL.

- **Dust — Zel'dovich cosmic web.** Each star has a Lagrangian coordinate q in a flattened cloud and sits at x = q + D·S(q), S = −∇Φ for eight seeded plane-wave potential modes. Where det(I + D·∂S/∂q) → 0 the map folds into caustics; stars there are lit by the exact Zel'dovich density 1/|det J|, so sheets and filaments glow. The modes drift slowly.
- **Spiral — kinematic density waves.** Each disk star moves on its own ellipse; the ellipse orientation turns with radius (Kalnajs/Lin–Shu kinematic picture). Nothing places stars on arms: two trailing arms appear where neighbouring orbits crowd (orbit phase u ≈ −π/4 mod π) and stars stream through them, because orbital speed (flat rotation curve) differs from the pattern speed. Young, light stars and glowing gas mark the crests; inter-arm stars are old and dim; a narrow dimmed lane sits on the concave side.
- **Nova — collapse, ignition, remnant.** The core collapses and flares; then the same stars ride out on a shell whose directions keep the arms' imprint. The same potential modes, sampled on the sphere, gather the shell into filaments (tangential Zel'dovich caustics, lit by their compression) and Rayleigh–Taylor fingers (radial). Sedov–Taylor fronts F = 2.35·c^(2/5) sweep outward every 12 s at speed 1 and light what they cross in the accent. Bulge stars become the compact remnant; a quarter of them stream out along two precessing pulsar jets (6 s flow, re-entering at the core only while unlit).

**State.** The only per-star state is ψ, an extra azimuth integrated by the simulation: dψ/dt = p·(1 − n)·(Ω(a) − Ω_cloud) − (1 − p)·k·ψ. Condensation spins the cloud up to its orbital speeds (an angular-momentum picture); Nova freezes the record; dispersal relaxes ψ the short way home so the cosmic web reassembles exactly. ψ and the clock are 32-bit fixed-point words in RGBA8 (uint wrap); every global cycle (camera, pattern speed, cloud turn, shock period, drift) is an integer count per 1440 s period, so phases stay exact over a night.

## World states and looks

Spiral Nebula uses seed 3141 with identical parameters at development 0 / 1 / 2: **Drifting Dust**, **Grand Spiral**, **Supernova Shell**. Each star's progress is staggered by its radius rank (inner stars condense first; the shock reaches inner stars first), so in-between values are real geometry: a core igniting inside the web, arms half wound, a galaxy blowing out from its centre. Reversal unwinds the galaxy back into the web.

Extra looks: **Cosmic Web** (seed 1618, strong growth, low camera), **Edge-on Lanes** (seed 2718, near edge-on, tighter arms), **Open Whirlpool** (seed 577, face-on, open arms), **Remnant Bloom** (seed 4669, close remnant with stronger fronts).

## Wave 2 polish (2026-10-14)

- **Framing:** the camera sits about 14 % closer and higher by default, so the galaxy and the shell fill roughly 70–85 % of the short side.
- **Core:** bulge stars dim toward the dense centre, and the background core glow is halved, so the core stays warm instead of a white blob at high energy.
- **Absorbing dust:** the last 24 texel rows (12 288 particles) are absorbers drawn after every star with the new optional `particles.blend = "absorb"`. They darken the arms' concave lanes in Spiral, give the densest web filaments dark cores in Dust, and thin out as the nova blows.
- **Low energy:** Dust and every state keep 74 % of stars at energy 0.1, up from 52 %.

## Energy, camera, rhythm

- Energy: visible density 74 % → 100 % (threshold per star, faded, never popping), dust turbulence, motion speed (×0.6–1.5 via the integrated clock, so changes never jump), web growth (×0.85–1.15) and shock strength. Not brightness: a mild compensation keeps overall light similar while density changes.
- Camera: perspective orbit (96 s), slow height swing (160 s) and dolly (240 s), framing per state; depth fades far stars toward the secondary colour, near stars grow. Kick widens the focal length by ≤ 2 %. Distant background stars give parallax and scale.
- Gestures: **Arm light** (4 beats; arm crests, web knots, shell filaments), **Core flare** (8; bulge or remnant in the accent), **Shock ripple** (16; a light shell running outward through the same stars).
- Faders: Motion speed, Cosmic web, Shock fronts. Audio: low → web growth, onset → shock, high → starlight (small).

## Cost and endlessness

Indicative native-GPU throughput (`profile-families.mjs --types`, M3 Pro, whole synchronous frame incl. post; the GPU was shared with four other agent lanes, so treat numbers as relative to the control family Living Forms measured in the same run): 1920×1080 p50 1.8–2.0 ms, p95 ≤ 2.7 ms (control 1.6–1.8 / ≤ 2.5); 3840×2160 p50 5.1–6.7 ms, p95 ≤ 9.0 ms (control 4.8–5.4 / ≤ 7.2). Dust (state 0) is the most expensive at 4K: soft gas sprites are fill-bound, so their share (10 %) and size are capped. Earlier 65 535-point builds were ≈ 20 % cheaper at 4K; doubling the population removed visible graininess. Zero GL errors and no non-finite values in profile and ladder runs. No loops beyond eight potential modes; no `u_time` dependency, so nothing degrades late: the clock wraps exactly and ψ is bounded.

## Verification

`tests/nebula.test.mjs`: preset/world validity and continuous-world detection; identity is seed-only and positions are Lipschitz-continuous in development (0 → 2 in 0.005 steps) and in time at every development including the clock wrap; exact clock arithmetic; S = −∇Φ; wrap-free ellipse polar offset; a trailing two-armed m = 2 pattern emerges from orbit crowding and winds with radius; condensation spins up, Nova freezes ψ, and a 16-bar excursion to Nova and back reassembles the web (worst star < 0.01); Sedov–Taylor t^(2/5) scaling and outward fronts; shader constants follow the model. Films: `node scripts/world-film.mjs --world nebula --rig`, reverse sweep `--look "nebula:Supernova Shell" --to 0`, extra look `--look "nebula:Edge-on Lanes"`. Ladder: `node scripts/contact.mjs --dist . --sheet ladder --family nebula --rig`.

## Limits

Kinematic, not dynamical: no self-gravity or gas hydrodynamics. Dust now uses line-of-sight extinction, not draw-order absorption (see below). Its lane density is sampled once near the mid-plane along each emitter ray, so it approximates a thin disk rather than solving full spatial radiative transfer; the web has no cold opaque cores. Gas remains finite soft sprites, and fine stellar grain is visible in the small review film. The GLSL is a hand port of the CPU model; the tests exercise the model, the films and ladder exercise the shader. External-display cadence and multi-hour endurance are not claimed.

## Wave 5 rework · 2026-10-15

No engine change. All world/state/look IDs, names, seeds, preset parameters and schema are unchanged. The last 24 rows retain their legacy particle identities and state but stop drawing a screen overlay. Each emitter is attenuated by `exp(-tau)`, where tau is the exact finite-segment column of a normalised **sech²** vertical dust slab, weighted by the seeded two-arm lane field. Foreground emitters therefore exclude dust behind them, including the distant sky stars. Near-parallel rays have a finite analytic limit. This avoids sorting/readback/new renderer passes and removes 12,288 absorber sprites.

Visual rounds, each filmed/reviewed: (1) replace global dust compositing and intrinsic lane dimming with emitter-to-eye transmission; (2) shift light from tiny grains into broader gas sprites (the first 4%-large-sprite trial looked too puffy); (3) restore a denser lower-intensity gas population, add shell limb shading and palette-coloured front/back separation; (4) make the compressed shell filaments superlinear emissive highlights, dim the uncompressed interior, and move the starting cloud camera back so portrait has breathing room. The same Zel'dovich modes, ellipse trajectories, Sedov–Taylor fronts, fixed-point phases and shell geometry survive every round.

Native headless M3 Pro p50 ms, whole synchronous frame including post, same all-state command before/after:

| Resolution | Dust | Spiral | Nova |
| --- | --- | --- | --- |
| 1080p baseline → final | 1.9 → 1.6 | 1.8 → 1.7 | 2.0 → 1.6 |
| 4K baseline → final | 5.2 → 4.4 | 5.0 → 4.2 | 5.0 → 4.7 |

Zero GL/non-finite errors. New CPU tests compare the dust column to numerical integration, its parallel limit, ray reversal and foreground/background extinction; existing identity, continuity, potential gradient, spiral crowding and shock tests retained. Reviewed ladder, Edge-on Lanes, Phosphor/Ember/Glacier and portrait. Honest rating: **8.5/10** — stronger cloud light and shell climax, fixed foreground absorption, but the resolved stars still read too grainy in 540p to honestly claim 9. The cost ceiling took priority over a denser particle volume.

Evidence in fleet `rework-space/output/`: `nebula-baseline/nebula.{mp4,png}`, `nebula-final/nebula.{mp4,png}`, `nebula-extra/`, `nebula-ember/`, `nebula-glacier-portrait/`, `nebula-ladder/` and baseline/final profile JSONs. Superseded films removed.
