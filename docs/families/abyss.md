# Bioluminescent Abyss

**INCREMENTAL / EMPIRICAL**, 2026-10-14. Family 92, the mesh + particle world behind **Abyssal Bloom**. Authored animation, not a marine-biology or fluid simulation: medusae pulse on analytic curves, plankton glow is a simulated disturbance memory, and water does not flow.

## Algorithm and signature detail

One seed fixes a periodic stretch of deep water (64 units along z) that the camera glides through. The signature detail is **light made by animals**:

- **Medusae** (40 large, 144 in six swarms): parametric bells whose contraction travels from apex to margin (fast squeeze, slow relaxation), with a bright scalloped margin, margin lights, radial canals, four gonad lobes (accent in a quarter of the large animals), a fresnel rim and a light ring that rides the contraction. Large animals trail 12 tentacles and 4 frilled oral arms, swarm animals 6 tentacles; all are screen-space ribbons at least about 1.4 px wide at 1080p.
- **Plankton** (about 32k points): each texel of the 256² simulation stores a 16-bit glow that rises where the camera's bow wave, a contracting bell or a **light wave** passes and then decays. Clouds gather from scattered positions (Sparks) into swirling swarms (Swarms) and partly settle over the reef (Reef).
- **Reef** (150 patches): tube worms with plume crowns, sea pens whose feathers carry upward waves of light (as real sea pens do), and gorgonian fans drawn as additive lace with binary-branching veins and cross-links. Patches grow in seeded birth order.
- **Water**: marine snow with bokeh near the lens, siphonophore chains with a travelling light wave, anglerfish lures (accent), shafts of light from far above, a caustic network on the seabed and fog to near-black.

Medusae, swarms, chains, shafts and plankton are placed by a seeded integer hash that GLSL and [abyss-geometry.mjs](../../abyss-geometry.mjs) evaluate identically (lowbias32), so the simulation can find the bells without the mesh. The reef is seeded on the CPU and baked into the buffer. Development never touches the buffer.

## States (world Abyssal Bloom, seed 61)

| Development | State | Form |
| --- | --- | --- |
| 0 | Sparks | Near-total darkness, marine snow, single blinking plankton, five lone medusae drifting past. |
| 1 | Swarms | Every large medusa has lit up (jellyfish bloom), siphonophore chains, plankton clouds that light where disturbed, first swarm members. |
| 2 | Reef | The camera sinks and tilts towards a glowing reef forest; full swarms pulse on the beat, light waves ripple through plankton, reef and seabed, shafts and caustics from above. |

In between, medusae light up in birth order, plankton visibly gathers, reef patches grow from their roots and the camera lowers continuously. `reefGrowth` and `jellyReveal` are the CPU mirrors (pure functions, so reversal retraces the same frames; a paused 0.5 → 1.7 → 0.5 redraw is pixel-identical on the GPU).

## Looks

First Sparks, Medusa Bloom and Lantern Reef are the three states (identical seed and non-development parameters). Extra looks: **Siphonophore Drift** (early bloom, slow current, gaze up), **Midnight Swarm** (dense beat-locked swarms), **Sea Pen Meadow** (low gaze over the reef, strong glow), **Ghost Bells** (slow, sparse, faint) and **Abyssal Storm** (fast current, full swarms, strong reactivity). Eight looks.

## Camera and depth

A closed path through the periodic water (x and y are integer-frequency sines of depth) looks 3.5 units ahead; at Reef it lowers 0.25 units and pitches down 19°. `gaze` tilts ±13°. Integrated 32-bit clocks (travel, pulse, sway) make energy change speeds without jumps and stay exact for a whole night. Every object is shifted by whole periods into the window around the camera; the wrap happens behind the camera (chains, which are long, 9 units behind). Depth cues: parallax, fog to near-black water whose colour depends on view direction (surface light above at Reef, reef haze below the horizon), translucent additive organisms, fresnel rims, glow pools and caustics on the seabed, scale cues from snow to giant bells, bokeh near the lens.

## Energy and rhythm

Energy moves `current` (glide and sway speed ×0.6–1.5), `pulse` (bell rate ×0.6–1.6), `swarm` (+0.6 swarm density: more swarm members light up between Swarms and Reef), `reactivity` (bow-wave radius, wave speed and plankton response ×0.5–1.6) and `sway`. Brightness is not an energy target. Light waves start on every 8th, 4th or 2nd beat at low, mid and high energy (from Reef side of development 1.1), four can run at once. The beat latch is counted from the show's beat clock, so it works with or without the rhythm sequencer. Kick: field of view punch of 2%; beat-locked swarms contract and flash on every beat at Reef. Family gestures: **Bell beat** (4 beats, all bells contract together), **Plankton wave** (8 beats, an extra light wave), **Reef cascade** (16 beats, a light front sweeps outwards across crowns, sea pens and fans).

## Engine extension (optional, backwards compatible)

- `geometry.additiveFrom`: vertices from this index on are drawn with additive blending, depth tested without depth writes (translucent organisms over an opaque reef). Absent means unchanged behaviour.
- `particles.depth`: particles are depth tested against the opaque mesh (no writes). Absent means unchanged behaviour.

Both restore GL state; `tests/browser/abyss-layers.test.mjs` checks state restoration and that each option changes the picture (`PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_ABYSS_GPU=1`).

## Cost

About 586k vertices (316k opaque reef/seabed, 270k additive), 65 536 points, one 256² simulation pass per tick (plankton test 40 bells and four waves). Geometry creation takes about 0.25 s of CPU per seed (cached per seed). Throughput: see Verification.

## Safety and endlessness

`tests/abyss.test.mjs` checks for six seeds that the tallest reef vertex stays more than 0.5 units below the lowest camera height and that every medusa (bell, tentacle spread and sway at maximum sway, current trail and drift) and every chain stays more than 0.5 units sideways from the camera path over its whole z range. Nothing dies out: form is a function of development, plankton glow is re-excited continuously, clocks wrap exactly; the only `u_time` use (blink slots) is wrapped at 4096 s.

## Verification

- `node --test tests/abyss.test.mjs`: registration and continuous-world detection, preset bounds, deterministic finite seeded buffer with a seed-independent opaque split, lowbias32 against a BigInt reference, development-independent identity, continuous/monotone growth and reveal with the state counts, periodicity, camera clearance, constant loop caps.
- GPU probe (native headless rig): zero GL errors and non-finite values, paused reversal pixel identity, normal frames after 8 h of scene time, energy-0.1 statistics per state (see the lane report).
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family abyss --rig`. Films: `node scripts/world-film.mjs --world deep-sea --rig` and `--look "abyss:Abyssal Storm" --from 2 --to 2`.

## Limits

Medusae may pass through each other inside a swarm; tentacles do not collide with the reef; plankton is lit only by the large bells, not by swarm members. The GLSL/JS hash mirror is exercised by the CPU clearance tests, not by a GPU readback. Multi-hour Stage endurance and 4K display cadence are unmeasured.
