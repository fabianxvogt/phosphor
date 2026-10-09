# Ripple Tank (72) — `scene-ripple.mjs`

The discrete wave equation u_tt = c²∇²u on a 400×225 grid: leapfrog in time, five-point Laplacian, Courant number 0.5, four steps per frame. Sponge borders 24 cells wide absorb whatever leaves the tank. The 400×451 RGBA8 state holds u and u_prev (16 bit each, range ±4), a time-averaged intensity ⟨u²⟩ (16 bit) and one meta texel (source phase, last beat). The picture mixes the moving wavefronts (crests in the primary colour, troughs in the secondary) with the standing pattern they leave behind.

## Signature detail

- **Interference fringes behind the slits.** A plane wave through two slits leaves dark nodal lines where the path difference is λ/2 and bright ones where it is λ. Tested on the CPU with the shader's exact update: at the predicted near-field positions the centre is more than 4× and the first order more than 3× brighter than the first dark fringe. One slit is wider than λ and shows its own diffraction minima. Six slits make a grating with sharp orders.
- **A lens made of slower water.** Inside a biconvex region the wave speed drops to 1/n (n = 1.2 … 2.2). The fronts bend and meet in a focus.
- **Phased array.** 6–16 emitters, each delayed by k·2π·d·sin θ/λ, steer one beam that sweeps over 32 beats. With emitters more than λ/2 apart, extra grating lobes appear: the reason real arrays keep d < λ/2.
- **Rhythm as waves.** The source amplitude pulses with the kick, so every beat leaves as a wave train. With raindrops on, every beat drops a ring and random small drops interfere.

## Variants (`variant`)

| variant | Variant                                                             |
| ------- | ------------------------------------------------------------------- |
| 0       | Slits: 1 (wide), 2 … 6 slits `gap` cells apart in a wall            |
| 1       | Raindrops on open water                                             |
| 2       | Lens: plane wave through a slower-wave biconvex lens                |
| 3       | Phased array: 4 + 2·count emitters `gap` cells apart, beam sweeping |

## Looks

Double Slit, Single Slit, Grating, Kick Rain, Monsoon, Glass Lens, Dense Lens, Phased Array, Grating Lobes, Sonar Rain.

## Energy, beat, endless

- Energy: raindrops +0.3, glow −0.1 → +0.25, standing pattern +0.15 → −0.15 (more raw waves at high energy).
- Audio: raindrops ← onset (0.15), glow ← high (0.08), wavelength ← low (0.04). The shared punch/pulse is 0.6/0.8.
- Endless: the sources drive for ever (the phase accumulates in the meta texel, so wavelength changes never jump); the sponge removes the energy; the array keeps sweeping.

## Cost

Simulation: 400×451 texels × 4 steps per frame, five texel reads each. Visual: one pass with 8 bilinear texel reads (plus up to 16 emitter glows). Well under 1 ms on the reference GPU.

## Tests (`tests/ripple.test.mjs`)

A CPU mirror of the shader update: double-slit fringe positions match the path-difference prediction, and the field stays inside the ±4 storage range. The soft line source makes a plane wave of the requested amplitude. Slit, lens and phased-array geometry (successive delays 2π·d·sin θ/λ). Presets validate and cover all four tanks.
