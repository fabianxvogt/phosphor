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
| 0 | Sparks | Near-total darkness, marine snow, blinking plankton, five lone medusae drifting past; the other large medusae and the swarms glow faintly far away and go dark as the camera nears. |
| 1 | Swarms | Every large medusa has lit up (jellyfish bloom), siphonophore chains, plankton clouds that light where disturbed, first swarm members. |
| 2 | Reef | The camera sinks and tilts towards a glowing reef forest; medusae settle into a lower band just above the reef; full swarms pulse on the beat, light waves ripple through plankton, reef and seabed, shafts and caustics from above. |

In between, medusae light up in birth order, plankton visibly gathers, reef patches grow from their roots and the camera lowers continuously; from development 1.2 the medusae and swarm centres settle (y → −0.25 + 0.35·(y − 0.8)), so the tilted Reef camera keeps near bells inside the top of the frame. `reefGrowth`, `jellyReveal` and `settleY` are the CPU mirrors (pure functions, so reversal retraces the same frames; a paused 0.5 → 1.7 → 0.5 redraw is pixel-identical on the GPU).

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

About 586k vertices (316k opaque reef/seabed, 270k additive), 65 536 points, one 256² simulation pass per tick (plankton test 40 bells and four waves). Geometry creation takes about 0.25 s of CPU per seed (cached per seed).

The fill cost is mostly the opaque seabed shader, not the translucent overdraw (measured by removing parts, 4K, A/B in one browser): seabed ≈ 0.8–1.1 ms (caustics ≈ 0.5, light-wave rings ≈ 0.5), fans, shafts, bells or particles alone ≤ 0.3 ms each. Polish 2026-10-15: the light-wave origins are written once per trigger into state texels 10–13 instead of being re-hashed per pixel; the seabed evaluates the exact rings only where a per-vertex envelope (shell width 1.4 instead of 0.55, conservative for the 0.67 grid) is lit; caustics skip fogged seabed and are evaluated per vertex for tubes and sea-pen leaves (their input is the constant root); `pow` in the caustic became multiplications; fully fogged seabed returns the water colour; shafts are trimmed to the 80 % of their width where the profile is non-zero. Interleaved A/B at 4K: Reef 7.5–8.1 → 7.0–7.6 ms (−0.3 to −0.5 ms, about −5 %), Sparks −0.1 to −0.3 ms.

Whole-frame throughput (`profile-families.mjs --types --frames 30`, M3 Pro, control Living Forms in the same run; the GPU was quieter than in the wave-2 run, so compare ratios):

| Output | Sparks | Swarms | Reef | Control |
| --- | --- | --- | --- | --- |
| 1920×1080 p50 / p95 | 2.2 / 2.5 ms | 2.7 / 2.9 ms | 3.0 / 3.2 ms | 1.5 / ≤ 1.8 ms |
| 3840×2160 p50 / p95 | 4.6 / 4.8 ms | 5.3 / 5.4 ms | 6.0 / 6.1 ms | 3.4–3.8 / ≤ 4.1 ms |

4K ratio to the control: 1.3–1.7× (Reef 1.6–1.7×; before the polish, HEAD in the same run: Reef 6.1 ms). The 8.0–8.3 ms reported in wave 2 was measured on a GPU shared with four other lanes (control 4.6–5.6 ms then); Reef stays under 8 ms at 4K here.

## Safety and endlessness

`tests/abyss.test.mjs` checks for six seeds that the tallest reef vertex stays more than 0.5 units below the lowest camera height and that every medusa (bell, tentacle spread and sway at maximum sway, current trail and drift) and every chain stays more than 0.5 units sideways from the camera path over its whole z range. Nothing dies out: form is a function of development, plankton glow is re-excited continuously, clocks wrap exactly; the only `u_time` use (blink slots) uses raw time in the long-show variant (the authored pre-hour source retains its 4096 s wrap).

## Verification

- `node --test tests/abyss.test.mjs`: registration and continuous-world detection, preset bounds, deterministic finite seeded buffer with a seed-independent opaque split, lowbias32 against a BigInt reference, development-independent identity, continuous/monotone growth and reveal with the state counts, continuous Reef settling (identity below development 1.2, settled bells between −1.6 and 0.45), periodicity, camera clearance, constant loop caps.
- GPU probe (native headless rig, 480×270): zero GL errors and non-finite values; a paused 0.5 → 1.7 → 0.5 redraw is pixel-identical (0 differing values; 1.7 differs); frames after 8 h of scene time render normally. Energy 0.1 (mean / peak / pixels above 25, 8-bit): First Sparks 2.1 / 255 / 1.1 % (before the 2026-10-15 polish 1.5 / 254 / 0.5 %; still a dark breakdown, now with distant medusae, a far swarm, brighter marine snow and more plankton blinks), Medusa Bloom 7.9 / 255 / 6.4 %, Lantern Reef 22.7 / 255 / 26.8 %, Ghost Bells 4.6 / 255 / 3.1 %.
- Engine options: `PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_ABYSS_GPU=1 node --test tests/browser/abyss-layers.test.mjs`.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family abyss --rig`. Films: `node scripts/world-film.mjs --world deep-sea --rig` and `--look "abyss:Abyssal Storm" --from 2 --to 2`.

## Wave 5 rework — 2026-10-15

No world, state, look, schema, preset or seed identifiers changed; no engine changes.
Three visual rounds: (1) enlarge the five lone bells from radius 0.9–1.05 to
1.25–1.45 and lower their anchors, (2) replace the broad plastic-white bell
fill with a restrained raking key, darker mesoglea and brighter radial canals;
reduce the fan membrane and seabed/caustic fill, (3) place the first seeded
sentinel 12 units ahead of the initial camera, so the breakdown opens on a
complete animal rather than a distant speck. Clearance was re-tested after
moving the larger animals slightly farther sideways. A fourth cost pass adds
a conservative axial broad phase before the plankton simulation evaluates a
bell (3 × maximum radius + 0.7 drift); CPU tests prove the rejection bound.

Native M3 Pro p50 ms, state order Sparks / Swarms / Reef:

| Output | Initial baseline | Final | Adjacent baseline replay (`deaaae1`) |
| --- | --- | --- | --- |
| 1080p | 2.1 / 2.5 / 3.1 | 2.5 / 2.7 / 3.1 | 2.4 / 2.9 / 3.4 |
| 4K | 4.7 / 5.7 / 7.3 | 5.4 / 6.0 / 7.0 | 6.0 / 8.7 / 7.9 |

The five-lane shared GPU varied substantially; adjacent replay is the fairer
comparison (worst increase +4.2%, Sparks at 1080p), not a claim that the first
baseline became intrinsically slower. Raw runs are retained in the lane
output. Films: `output/abyss/{baseline,final}/deep-sea.{mp4,png}`;
final includes the all-look energy ladder, Glacier Abyssal Storm and an Ember
portrait sweep. Reviewed strips and full-size ladder stills. Honest rating:
**8.5/10** — much stronger living glass and first read, but the landscape
breakdown remains intentionally sparse and the reef still has illustrative
branching fans. No claim of collision simulation or venue cadence.

## Limits

Medusae may pass through each other inside a swarm; tentacles do not collide with the reef (settled Reef medusae hang their tentacles into the reef forest); distant Sparks medusae fade out as the camera approaches them rather than lighting up; plankton is lit only by the large bells, not by swarm members. The GLSL/JS hash mirror is exercised by the CPU clearance tests, not by a GPU readback. Multi-hour Stage endurance and 4K display cadence are unmeasured.
