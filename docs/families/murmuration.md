# Starling Flock (Dusk Murmuration)

**INCREMENTAL / EMPIRICAL**, 2026-10-14. Family #88 and the continuous world **Dusk Murmuration** (Loose → Surge → Formation). A stylised flock: forces are authored to look like a murmuration. It is not a calibrated model of starling behaviour.

## Algorithm and signature detail

32 767 birds simulated on the GPU. Each bird has four RGBA8 texels holding 16-bit position, velocity, startle timer T and bank angle, written with unbiased stochastic rounding; texel 0 is an exact 32-bit clock. The birds are drawn as banking, flapping bird meshes through the existing geometry path: twelve vertices per bird, read from the state texture, with a minimum projected size of about 2.6 px at 1080p. [murmuration-model.mjs](../../murmuration-model.mjs) is the CPU mirror of the per-bird step; [scene-murmuration.mjs](../../scene-murmuration.mjs) is the shader.

- **Topological neighbours.** Every bird keeps the same eight neighbours for ever: its neighbours on a 256×128 torus lattice. Starlings are reported to track about seven topological neighbours (Ballerini et al. 2008). Alignment, rest-length springs and short-range separation act only between lattice neighbours, so the flock is one crumpled sheet that fills space without collapsing.
- **Startle waves (signature).** The lattice is an excitable medium. A resting bird fires when a neighbour fired on the previous step, then stays refractory for 1 s. A wave therefore crosses the flock one neighbour per step, about 60 lattice cells per second. Firing birds roll and catch the light, so a bright band races across the cloud or round the vortex. Waves are triggered by the falcon, by an automatic seeded startle every 4.5 s in Surge and Formation, and by the Startle-wave and Falcon-strike rhythm tracks.
- **Development blends forces, never positions.**
  - **Loose:** weak coupling; small lattice groups share a wandering heading over a wide sky.
  - **Surge:** each bird is sprung to its home in a circulating, breathing blob. A drifting plane-wave displacement field folds the blob, as in the Zel'dovich picture; the folds are the dense bands. A falcon (the only accent) dives through every 9 s and punches a hole that closes again.
  - **Formation:** springs to persistent slots taken from the lattice coordinate. The slots form a vortex torus (birds circulate and roll), a trefoil ribbon and a two-strand twister. Formations cross-fade on a 240 s cycle that the `cycle` parameter sets.

## Light, camera, energy

- **Sky:** a dusk sky with a black zenith, a palette afterglow band on a stable horizon and a sun just below it. The band brightens toward the sun's azimuth and deepens toward the top state.
- **Birds:** lit by a raised key from the set sun (the alpenglow on birds high above). Front-lit birds sparkle with palette sheen; backlit birds silhouette with translucent rims. A sky fill keeps the flock legible facing away from the sun.
- **Depth:** density glow, and aerial-perspective fog toward the sky colour.
- **Camera:** it orbits the flock's moving home from a low eye (120 s), with the horizon in the lower third. At Formation it dives every 48 s through the vortex wall to the inside of the ring, with a wider lens. Birds near the lens shrink rather than fill the screen. The kick widens the lens by at most 2 %.
- **Energy:** visible birds 55 % → 100 % (fading by size), motion speed through the integrated clock, falcon strength, fold depth.
- **Faders:** Motion speed, Falcon, Formation.

## Looks

The world uses seed 1207 at development 0/1/2: **Evening Roost**, **Surging Cloud**, **Vortex Mill**. The extra looks are **Falcon Hour**, **Knotted Ribbon**, **Twister** and **High Cloud**.

## Cost and endlessness

The simulation is one full-texture pass over 1024×128 texels per tick. Each texel computes its whole bird: 36 texel fetches, a 6-mode fold field and 3 formation shapes. The mesh is 393 k vertices. All cycles are integer counts per 1440 s; a bird that leaves the sky or turns non-finite returns home. See the report for the indicative timings: GPU contention from parallel lanes made the absolute numbers unreliable.

## Verification

`tests/murmuration.test.mjs` covers:
- preset and world validity;
- fixed, symmetric topological neighbours;
- development jumps never move a bird faster than its speed limit;
- startle waves fire at exactly the lattice distance plus one step and every bird fires once;
- Surge keeps a volume (no collapsed strand), and Formation converges to slots (mean error < 0.5);
- the torus slot geometry and the tilt is a rotation;
- the clock arithmetic, and that the shader constants follow the model.

The films are from `node scripts/world-film.mjs --world murmuration --rig` and `--look "murmuration:Knotted Ribbon" --from 1 --to 2`; the ladder is from `node scripts/contact.mjs --dist . --sheet ladder --family murmuration --rig`.

## Limits

- No spatial neighbour search: birds that are not lattice neighbours can overlap.
- The GLSL is a hand port of the CPU step; the tests exercise the model, while the films and ladder exercise the shader.
- Shading is per triangle with no anti-aliasing, so distant birds alias slightly.
