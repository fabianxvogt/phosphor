# Newton Basins (68) — `scene-newton.mjs`

Newton's root-finding method runs on every pixel of the complex plane, z ← z − a·p(z)/p′(z). A pixel takes the colour of the root it converges to, and its light grows with how long it took. The basins are dark and calm, and the borders between them glow.

## Signature detail

- **The border is fractal and has the Wada property.** At every border point all basins meet, so the colours braid into ever smaller beads around each other (tested on the CPU: around a border crossing of z³ − 1, all three basins appear in a tiny disc).
- **The roots shine as small stars.** They are the attractors the whole picture flows into. Moving them moves the fractal smoothly, because with known roots p′/p = Σ 1/(z − r_k), so a Newton step is z − a/Σ 1/(z − r_k), and Halley's is z − 2·S1/(S1² + S2).

## Variants (`method`)

| method | Variant                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0      | z³ − 1, turning: the classic three-fold Newton fractal                                                                                                 |
| 1      | Five wandering roots on independent orbits                                                                                                             |
| 2      | Halley's method on four wandering roots: cubic convergence, rounder "flowers"                                                                          |
| 3      | Nova: c = pixel, starting at the critical point z = 1; Newton's answer to the Mandelbrot set                                                           |
| 4      | Roots of unity zⁿ − 1 whose degree glides 3 → 8 → 3. The extra root grows out of root 0 while the others spread to the next polygon, so it never jumps |

`relax` a ≠ 1 (relaxed Newton) bends the beads into spirals (a > 1) or lace (a < 1).

## Looks

Three Roots, Wada Beads (zoomed onto the border), Wandering Five, Relaxed Spirals, Halley's Flowers, Nova, Nova Tendrils, Unity Star, Under-relaxed Lace.

## Energy, beat, endless

- Energy: root drift ×0.4 → ×2.2, spin ×0.4 → ×2.4, border glow +0.5, iteration rings +0.3.
- Audio: relaxation ← low (0.06), glow ← high (0.12). The shared punch/pulse is 1/1.
- Endless: roots move on bounded periodic orbits; the camera breathes (zoom ±35 %) and spins; time is wrapped with `mod(u_time, 3600)`.

## Cost

One analytic pass, `maxRenderWidth` 1280. Per pixel: up to 96 iterations (looks use 40–80), each with ≤ 8 root terms (one complex reciprocal each), and most pixels exit in under 10 steps. Estimated 1–3 ms on the reference GPU.

## Tests (`tests/newton.test.mjs`)

Root neighbourhoods converge to their own root. The roots-sum step equals z − p/p′ for z³ − 1. A Wada point is found on the border of z³ − 1. Halley converges, roots stay finite and inside the frame at hour-scale times, and the presets validate.
