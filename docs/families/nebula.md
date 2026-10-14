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

Kinematic, not dynamical: no self-gravity, no gas physics, no real dust extinction (additive light cannot occlude, so dust lanes are only dimmed stars). The GLSL is a hand port of the CPU model; the tests exercise the model, the films and ladder exercise the shader. 4K cadence under an uncontended GPU, external-display cadence and multi-hour endurance are not yet measured.
