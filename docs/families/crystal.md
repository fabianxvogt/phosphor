# Crystal Habit

**INCREMENTAL / EMPIRICAL**, 2026-10-14. Family 90, the mesh world behind **Crystal Cavern**. Authored geometric growth, not a crystal-growth simulation: there is no diffusion, supersaturation or facet kinetics.

## Algorithm and signature detail

A seed fixes one periodic cavern (length 36 units) and every crystal in it. The rock wall is an elliptical hall with a flat floor, displaced by integer-frequency sine terms so it is exactly periodic around and along the cavern. 56 nucleation sites carry one seed crystal each; around a site, 18–33 druse members choose one of four **habit directions** (the cluster axis plus three directions at a shared cone angle, 120° apart) and mostly the one that points away from the nucleus. Parallel crystals inside a druse are therefore a lattice property of their cluster, which is the signature detail: hexagonal prisms with pyramidal terminations, faceted lighting and parallel growth groups. 120 micro-druses (840 crystals) line the walls at the top state; 360 grains form the energy detail layer.

Every crystal is a 54-vertex hexagonal prism. Its root, axis, length, radius, birth order and kind are vertex attributes; the shader computes length and radius from development and draws flat facet normals analytically. Development never touches the buffer.

## States (world Crystal Cavern, seed 311)

| Development | State | Form |
| --- | --- | --- |
| 0 | Seeds | Dark cave; glowing nuclei (accent only in their hottest core) with light pools on the rock. |
| 1 | Lattice | Every druse member has nucleated in birth order, outward from its nucleus; parallel habit groups. |
| 2 | Hall | Druses lengthen and thicken, seed crystals become columns, micro-druses and a faceted druse lining cover the walls. |

`growth(kind, birth, development, detail)` in [crystal-geometry.mjs](../../crystal-geometry.mjs) is the CPU mirror of the shader function. It is a pure function, so reversal retraces the forward path exactly; the GPU check below confirms pixel identity. The wall lining uses per-cell thresholds on the same development value: a Voronoi cell on the (angle, depth) surface raises a hexagonal pyramid from a flat rock chip.

## Looks

Dormant Seeds, Quartz Lattice and Geode Hall are the three states (identical seed and non-development parameters). Extra looks: **Needle Grotto** (thin habit, side gaze, dense grains), **Amethyst Vault** (thick habit, slow, strong core glow), **Glacier Druse** (fast forward glide, heavy sparkle), **Ember Sprouts** (early sprouting seen at an angle) and **Cathedral Geode** (full hall, slow). Eight looks in total.

## Camera and depth

The camera follows a closed path through the periodic cavern (x and y are periodic functions of depth) and looks 2.6 units ahead, so its yaw follows the path; the horizon never rolls. At Hall the camera cranes up by 0.22 units. `gaze` turns the view up to 63° towards the right wall for tracking shots. A 2×1 simulation integrates travel and light-pulse phase as exact 24-bit integers, so energy changes speed without jumps and the phases stay exact after hours. Every mesh element is shifted by whole periods into the window around the camera, so the glide is endless without cuts; the wrap happens behind the camera and beyond full fog.

Depth cues: perspective parallax, fog to the palette dark (complete at 25 units), a key light from above, a lamp near the camera with distance falloff, fresnel rims, baked wall glow pools and contact occlusion (three integer states, interpolated), dark bases where prisms meet rock, dark grooves between lining crystals, and many small grains and lining cells against few large columns.

Wave 2 (2026-10-14): every cluster carries a hue drawn from a separate random stream (layouts are unchanged) and spans the palette from `u_secondary` to `u_primary`, so a hall holds several crystal colours. Each wall quad stores its nearest seed light; the shader draws a crisp point-light pool around every seed, so Seeds reads as glowing gems lighting dark rock, not a uniform wash. 520 drifting motes add depth and scale. The camera lamp is dimmer while the seeds are dormant. In Hall the lining is darker and coloured per cell, and its glints and apex lights scale with the energy-driven `detail`, so Hall stays darker at low energy.

Crystal shading: a dark tinted body, facet-flat key and lamp light, fresnel rim, thin-film tint from the palette, and an emissive core seen through a refracted view ray (the closest approach of the refracted ray to the crystal axis), so each facet shows the core displaced. Facet edges are `fwidth`-scaled (about 1.5 px at any output size) and fade on crystals too small to resolve.

## Energy and rhythm

Energy moves `drift` (glide speed ×0.7–1.4), `shimmer` (speed of light pulses climbing the crystals and a ±2% breathing), `sparkle` (fraction of facets that glint) and `detail` (grain density, +0.5 across the range). Brightness is not an energy target. Kick: field of view punch of 2%. Family gestures: **Facet glint** (4 beats), **Growth pulse** (8 beats, a band climbs every crystal from root to tip), **Seed beacons** (16 beats, seed crystals flare in accent).

## Safety and endlessness

Generation clamps every crystal so that its largest possible extent (Hall growth, habit 1.6, breathing 1.04, tip ratio 1.9) stays outside a 0.62-unit corridor around the camera path at every crane height; `tests/crystal.test.mjs` re-checks this with an independent dense path sampling for four seeds. Nothing dies out or saturates: form is a function of development only, and motion phases wrap exactly.

## Cost

About 2700 crystals, a 96×144 wall grid and 520 motes: ~231k vertices (18 floats each, ~17 MB). Indicative whole-frame throughput on the shared M3 Pro (other lanes running): **1080p 2.8–3.1 ms p50**, **4K 7.3–8.0 ms p50** (`scripts/profile-families.mjs --types/--presets --families crystal`). Geometry creation takes about 0.15–0.3 s of CPU per new seed on a loaded machine; the last buffer is cached so a second slot with the same seed reuses it.

## Verification

- `node --test tests/crystal.test.mjs`: registration and continuous-world detection, preset bounds, deterministic finite seeded geometry, buffer identity equal to `cavern()` (development is not an input), growth continuity/monotonicity/state values, wall and path periodicity, corridor clearance, 24-bit travel steps.
- GPU (native, headless rig): zero GL errors and non-finite values; paused redraws at development 0.5 → 1.7 → 0.5 are pixel-identical; frames after 8 hours of scene time render normally; Seeds at energy 0.1 has mean 14/255 with peak 245 (dark ground, bright signature).
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family crystal --rig`. Review films: `node scripts/world-film.mjs --world cavern --rig` and `--look "crystal:Needle Grotto"`.

## Limits

Authored growth, not physics: crystals may intersect each other inside a druse, and lining cells are shading, not geometry. Shared palette recolouring of catalog images is approximate. Multi-hour endurance on Stage and external-display 4K cadence are unmeasured.
