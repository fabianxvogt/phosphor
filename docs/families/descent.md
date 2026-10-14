# Fractal Descent

**EXPLORATORY / EMPIRICAL**, 2026-10-14, wave 1 of the worlds expansion (lane L3). It is a new family (`descent`, number 93) behind the world **Endless Descent**. Fractal Flight is untouched, so its look ids, images and timings stay the same.

## Algorithm and signature detail

This is a raymarched distance field: a Menger-sponge free space (crosses carved at scales 2/3^k) plus one **coarse hall carving** a level above it, on a six-unit lattice. The hall is three anisotropic prisms per cell: the street the camera flies along (x), cross streets (z) and vertical shafts (y). Development changes only the hall's half-sizes, so the space itself morphs and nothing crossfades.

- **0 · Corridor:** the hall equals the sponge's own corridor (`opening / 3`). This is Flight's square corridor, now lit by sunlight falling through the vertical holes of the ceiling.
- **1 · Cavern:** the hall grows into a pillared multi-storey cavern. The pillars and thin floors are still carved by the sponge, and light falls through the shafts and floor holes as volumetric beams with sunlit patches on the floor.
- **2 · City:** floor and ceiling heights grow exponentially, so the pillars become endless towers. Their sponge holes become windows; seeded floors of windows light up. Some blocks have gateways across the street or closed bridges between towers.

The signature detail is the recursive square aperture, at every scale from tower block to window. All lighting serves it. Sunlight is tested analytically: the point is projected along the light to just above the ceiling (or one block up in the city), then the hall and the two coarsest vertical sponge shafts are checked there. The same test gives surface sun and the in-scattered beams.

## States and looks

The world uses `Sponge Corridor` (0), `Pillared Cavern` (1) and `Endless City` (2). All three use seed 9301 and identical non-development parameters, so `continuousDevelopment()` recognises them.

The five extra looks:

- **Ember Gallery** (0.4): the corridor halfway to a gallery.
- **Quiet Vault** (1): a slow pillar hall.
- **Lantern Arcology** (2): a dense lit city.
- **Skyfall Streets** (1.6): towers still joined by distant floors, fast and fully banked.
- **Narrow Lattice** (0.25): a narrower, finer corridor.

## Energy, rhythm and camera

- **Energy** controls integrated speed (×0.65–1.3, about 2×), recursion depth (+1.8 levels), fog depth and how many windows are lit. Brightness stays nearly constant across the 0.1/0.5/0.9 ladder.
- **Gestures:**
  - **Window cohort** (4 beats) lights one seeded quarter of the windows.
  - **Flight impulse** (8 beats, motion) pushes travel a bounded distance.
  - **Seam surge** (16 beats) flares the recursive near-miss edges.
- **Kick:** the FOV punch is 2.5%.
- **Camera:**
  - **Travel:** the flight moves along +x with sway and bob scaled to the guaranteed free core of the camera's street.
  - **Banking:** at most 0.16 rad into the turn.
  - **City pitch:** the camera pitches slightly down in the city.
  - **Free core:** per-block variation only widens the camera's street, and gateways stay above the bob. `tests/descent.test.mjs` checks the clearance (at least 0.2 units in the narrowest variant) for every development, opening and travel phase.

## Continuity and endlessness

A one-texel RGBA8 state holds the travel phase (period six units) and a 16-bit wrap counter. Block randoms are keyed by `floor(x / 6) + counter`, so wraps are invisible and the city does not repeat every block. The counter recurs after 65,535 wraps (about 390,000 units). At that point the block pattern changes once: after about 24 hours at the maximum fader and energy, or about 5 days at default speed. Development never resets the state, the seed or the camera phase. Only `u_time` drives the beam shimmer, and it is wrapped with `mod`. Stills checked at 8 hours of scene time are unchanged in character.

## Cost

| Measure | Value |
| --- | --- |
| March cap | `min(96, u_raySteps)` |
| Detail cap | per-ray, at about 1.5 output pixels |
| Surface tolerance | 0.6 px |
| Sky probe | every second step, cached block hash |
| Shading at hits | 4 normal + 4 AO + 1 shadow samples |

The detail cap stops recursion with fractional fading; this also removes far shimmer. The step bound against neighbouring blocks uses the narrowest block variant, which is a provable subset of free space, so only steps close to a block face are clamped.

The table shows **INDICATIVE** native M3 Pro numbers (`profile-families --types`, whole frame including post), taken while other lanes shared the GPU (load average about 100). Each value is the minimum p50 over repeated runs, with Flight measured in the same run for comparison:

| Resolution | Corridor | Cavern | City | Flight paths (same run) |
| --- | --- | --- | --- | --- |
| 1080p | 7.1 ms | 8.2 ms | 9.5 ms | 6.0 / 9.1 / 6.5 / 6.2 ms |
| 4K | 24.4 ms | 33.5 ms | 34.4 ms | 20.7 / 32.6 / 21.6 / 20.4 ms |

In an earlier, quieter window (a near-final shader), 1080p measured 5.2 / 7.3 / 7.4 ms against Flight's 4.6 / 6.9 / 4.6 / 4.6 ms. Cavern and City therefore cost about as much as Flight's Corkscrew and roughly 1.3–1.5× its corridor. They sit at the 8 ms 1080p budget in quiet conditions, and above 33 ms at 4K like the other raymarched headliners.

## Verification

- `tests/descent.test.mjs` checks:
  - the camera's free-space clearance (CPU mirror plus source checks);
  - wrap-counter continuity under 16-bit quantisation;
  - style limits;
  - preset bounds;
  - world continuity;
  - gesture periods.
- Review film: `PHOSPHOR_HEADLESS_RIG=1 node scripts/world-film.mjs --world descent --rig`.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family descent --rig`. It shows zero GL errors and non-finite values, and no black frames; mean luminance at 0.1 is 0.011–0.033.

## Limits

- Window lights are the lit inner faces of one horizontal tunnel per sponge window: a stylisation, not interiors.
- Beams are an analytic single-scatter approximation, and their brightness hold between alternate steps can soften thin shafts.
- Shadows from finer sponge levels are short-range only (one SDF sample).
- At 4K, the City is the most expensive state.
- Owner art review of the films is outstanding.
