# Strange Attractors (#65, `attractor`)

Chaotic ODE flows and one chaotic map, traced by 65,535 GPU particles. Every particle is integrated exactly in the simulation pass and drawn as an additive point through a slowly orbiting perspective camera, over trails from the faded previous frame.

## Algorithm

- **Flows** (Lorenz, Rössler, Aizawa, Thomas, Halvorsen): classical fourth-order Runge–Kutta with a **fixed step `h` per system**. A 24-bit step accumulator in the global texel turns integration speed into a whole number of RK4 steps per tick (at most 10). So the simulated map is the same at every speed: the chaos checks in the tests apply to exactly what runs, speed changes never jump, and a kick surge cannot destabilise the integrator. The vertex pass draws the leftover fraction of a step (`p + frac·h·f(p)`), so motion stays smooth even at one step every 17 ticks.
- **Map** (Clifford, `x' = sin(a y) + c cos(a x)`, `y' = sin(b x) + d cos(b y)`): one iteration per hop. Each cluster flips its own coin per tick (speed · 7 hops/s), so the dust sparkles asynchronously while a cluster always hops as one. The third coordinate keeps the pre-image `x` (a delay coordinate). Face-on it is the classic picture; when the camera tilts, overlapping folds separate in depth.

### State layout

The state is RGBA8, 256 × 512, with **two texels per particle**: row `r` holds `x, y` and row `r + 256` holds `z, age`, each as a 16-bit fraction of the system's box. Both texels run the same integration from the same inputs and each keeps its own half, so the three coordinates stay consistent. Re-reading the quantized state every tick means no error accumulates between the halves.

A 16-bit box fraction resolves about 1/1000 of the attractor per axis. Positions use unbiased stochastic rounding, and ages are rounded deterministically so that every member of a cluster stays in step. Particle 0 holds global state: a 24-bit camera orbit phase and the 24-bit step accumulator.

The engine draws `w·h` = 131,072 points. Vertices 0–65,535 are the particles. Of vertices 65,536–131,071, only the leader of each young cluster draws (a soft halo on the comet head); the rest are clipped at once.

## Signature detail

1. **The shape reads instantly.** The dust density *is* the attractor:
   - Lorenz's two lobes, in the classic x–z view, sway ±49°.
   - Rössler's flat spiral band, with the fold lifting out of it.
   - Aizawa's sphere with its axial tube.
   - Thomas and Halvorsen: the camera orbits their three-fold symmetry axis (1,1,1), so Thomas shows the triskelion weave and Halvorsen the three-bladed propeller.
   - Clifford dust.

   Dust colour is the local flow speed (or map jump), so slow lobe rims and fast crossings separate.
2. **Sensitive dependence on initial conditions, made visible.** Particles live in clusters of 512 that respawn together as one tight ball (≈ 2 px) around a random particle that is already on the attractor, tagged with a palette colour. The ball rides along as a bright comet with a soft halo. It is squeezed onto the unstable direction, stretches into a filament, and finally smears around the whole attractor while its colour fades into the dust. For the map, a cluster hops as one bright dot that splits into 2, 4, 8… sparks as the iterates separate. `comets` sets how often clusters are reborn (lifetimes of 56 s down to 10 s at speed 1, ±25 %).

## Variants (`system`)

| # | System | Parameters (morph range at depth 1) | Step `h` | View |
| --- | --- | --- | --- | --- |
| 0 | Lorenz | σ 10, ρ 27.5–34, β 2.34–2.94 (classic 10, 28, 8/3 at depth 0) | 0.005 | x–z butterfly, sways ±0.85 rad; close-ups dive into C+ along its spiral-plane normal |
| 1 | Rössler | a = b = 0.2, c 6.07–6.57 | 0.03 | orbit, 29° from above; fold height drawn at 0.55 |
| 2 | Aizawa | a 0.979–0.993; b–f 0.7, 0.6, 3.5, 0.25, 0.1 | 0.015 | orbit around the tube axis |
| 3 | Thomas | b = 0.1914 (fixed) | 0.08 | orbit down the (1,1,1) axis, 75° |
| 4 | Halvorsen | a 1.380–1.416 | 0.006 | orbit around (1,1,1) |
| 5 | Clifford | three species picked by `seed mod 3`, each morphing along a line in (a,b,c,d) | map | looking down at 76°, the dust rotating |

### Why the morph ranges are narrow

Morph ranges were scanned at the simulated step with several initial conditions. Where the attractor turns periodic or loses stability, the range stops:

- **Lorenz:** ρ stays above the Hopf point ρ_H = σ(σ+β+3)/(σ−β−1) ≤ 26.3, so C± never become stable.
- **Rössler:** c sits in the widest window-free band near the classic 5.7, between windows at 5.98–6.0 and 6.65–6.8. The band around 5.7 also holds a small coexisting periodic orbit at this step.
- **Aizawa:** a window at 0.995 and a stable fixed point above a = 1.06.
- **Halvorsen:** a window at 1.375, periodic above a = 1.6 (the often-quoted 1.89 is periodic), and orbits escape to infinity below about 1.3.
- **Thomas:** windows are dense around b ≈ 0.19 (0.1895, 0.19235, 0.1928, 0.1945 at h = 0.08, including the often-quoted 0.19 itself), so b is fixed.
- **Clifford:** lines were searched so that λ > 0.12 from five initial conditions every 0.002 along the line; the amplitude is 85 % of the safe length.

## Looks

| Look | System | What it shows |
| --- | --- | --- |
| Butterfly | Lorenz | The full butterfly, wide, swaying; comets braid between the lobes |
| Inside the Lobe | Lorenz | Close-up dive into C+: the nested spiral sheets of one lobe fill the screen, with long trails |
| Rössler Ribbon | Rössler | The spiral band seen from above, with the fold lifting and reinjecting |
| Aizawa Bloom | Aizawa | Sphere and axial tube, many comets wrapping the sphere |
| Thomas Weave | Thomas | The three-fold rosette seen down its symmetry axis, with long trails |
| Halvorsen Propeller | Halvorsen | Three interlocked lobes turning around the diagonal |
| Clifford Dust | Clifford (species 0) | Dense map dust: hopping comet sparks split into sprays |
| Comet Rain | Lorenz | Fast, sparse dust with short trails and frequent comets: divergence as the subject |

## Energy grammar (0.1 → 0.9, clip base 0.5)

| Parameter | Curve | Effect |
| --- | --- | --- |
| `speed` | × 0.55 → 1.6 | Integration speed (steps per second, map hops) |
| `density` | + 0.44 across the ladder | Visible particles (golden-ratio subset) |
| `trail` | + 0.12 | Trail length (fade of the previous frame) |
| `orbit` | × 0.45 → 1.8 | Camera orbit speed (integrated phase, no jumps) |
| `morph` | + 0.6 | Depth of the parameter excursion inside the verified range |

Per-particle light follows the picture's spread (∝ (1 − trail)^0.85 · density^−0.75 · zoom^0.8) and is resolution independent. So energy mostly changes structure and motion: more particles, longer streaks and more comets. Mean luminance still rises about 2–3× from 0.1 to 0.9, because faster motion draws longer streaks that cover more pixels.

**Beat:** `u_kick` is a velocity surge along the flow (speed × (1 + 2.2 · kick), scaled by show energy). It never pushes particles off the attractor, and comets lurch forward and stretch their trails. A 5 % camera dolly adds parallax under the shared punch (0.5) and pulse (0.5).

**Audio:** `speed` follows the low band (0.1) and `orbit` follows flux (0.06).

## Endless

- **Constant density.** Particles never die. A cluster's respawn copies a random particle's position, so it lands on the current attractor for every morph value.
- **Escape guard.** A particle that leaves its box or goes non-finite rejoins next to another particle. This matters for Halvorsen, whose basin is not the whole space.
- **Bounded morph.** All morph waves have whole periods (13 and 19 cycles) in 2400 s and use `mod(u_time, 2400)`. The camera phase and step accumulator are 24-bit wrapped fractions in the state, so neither grows with time.
- **No dead ends.** Morph ranges are restricted to verified chaotic bands. The tests sample every range, check boundedness under 16-bit storage with kicks, and check that Lorenz's C± stay unstable.

## Cost

Per tick, one simulation pass over 131,072 texels. Each texel does at most 10 RK4 steps of a ~20-flop vector field, plus 3 texel fetches; a reset pass also pre-rolls 48–144 steps. The particle pass draws 131,072 vertices, each with ≈ 200 ALU ops (one flow evaluation, camera trig and hashes); half are clipped after one compare. Points are 1.5 px at 540p (3 px at 1080p), and at most 128 halos of 16–32 px are drawn. The visual pass is one texture fetch per pixel.

Estimated well under 1 ms on the M3 Pro reference (≈ 50 MFLOP per tick in the simulation, ≈ 26 M ALU ops in the vertex stage). This was not measured on the rig. On SwiftShader at 320×180 a look renders at about 0.5 s per frame.

## Tests (`tests/attractor.test.mjs`)

- A CPU reference for every derivative and the map: textbook values, equilibria (Lorenz C±, Thomas and Halvorsen origin), the Lorenz and cyclic symmetries, and the fourth-order convergence of the RK4 step.
- The Lyapunov exponent stays positive and the trajectory stays inside its box:
  - at every look's morph extremes (depth 0 and 1, both waves at ±1);
  - in every ≈ 8-Lyapunov-time window of a full-depth morph sweep, replayed as the GPU runs it at the fastest speed. Windows are dense in Rössler, Aizawa and Halvorsen parameter space, so the test follows the sweep rather than fixed values: a narrow window crossed in passing is harmless, but a dwell or a wide window would show;
  - at 101 points along each Clifford species line, plus a dust-coverage check.
- A 12,000-tick mirror of the GPU tick for each system: accumulator, fixed steps, 16-bit stochastic rounding, morph swept 50× faster and kicks every half second. It must stay bounded and keep moving.
- Reset starts stay in the basin. The step accumulator never truncates the fastest speed. The packed formats fit (24-bit phase, ages, lifetimes). Presets validate, and the energy ladder is monotonic.
- An opt-in software-GPU probe (`node tests/attractor.test.mjs --port <port>`) renders every system and **replays one GPU tick on the CPU from the GPU's own state**. It decodes the 256 × 512 readback, re-applies the steps, morph and hop coins in JS, and requires the CPU and GPU to agree to within 2.5 quanta for ≥ 99.8 % of particles.

## Open points

- The morph is visible on Lorenz (size and lobe shape) and Clifford (the folds reshape), and subtle on Rössler, Aizawa and Halvorsen, whose chaotic bands are narrow. Thomas does not morph.
- Fast comets at low resolution show as dotted streaks (one point per frame). Long trails hide this.
