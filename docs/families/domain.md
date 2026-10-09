# Domain Colouring (82) — `scene-domain.mjs`

A complex function f on the plane: hue by arg f (a seamless three-colour wheel from the palette), light by log |f|. Lines of constant phase and constant log modulus form a conformal grid with square cells. Log-modulus bands flow, so zeros send rings outward and poles swallow them.

## Signature detail

- **Conformality.** Phase lines and modulus lines cross at right angles and make square cells everywhere except at zeros, poles and critical points (Cauchy–Riemann; tested on ζ).
- **The argument principle.** Around a zero the colours turn one way, around a pole the other. Tested: the phase of ζ winds +1 around ½ + 14.1347i and −1 around the pole at s = 1.
- **Riemann zeta along its critical line.** Computed in the shader by Borwein's accelerated alternating (Dirichlet eta) series with 40 terms. The view travels up and down Re s = ½ to t ≈ 40. The nontrivial zeros line up on the line; near the start the pole at s = 1 shows. Tested: ζ(2) = π²/6, ζ(−1) = −1/12, ζ(−2) = 0, and the first six zeros vanish on the line but not beside it. Far left of the strip, float precision limits the series, so the picture fades there.
- **Rational functions.** Three zeros and three poles orbit, and every 8 beats they trade places (over one beat), reversing their colour wheels.
- **Möbius net.** g = (z − p)/(z − q) draws the Steiner circles (bipolar coordinates). A loxodromic twist turns them into spirals between the two fixed points.
- **Iterated z² + c.** The n-th iterate is a polynomial of degree 2ⁿ, and its 2ⁿ zeros crowd toward the Julia set. n climbs 1 → 6 every 8 beats.

## Variants (`variant`)

| variant | Function                               |
| ------- | -------------------------------------- |
| 0       | Rational: 3 orbiting zeros and 3 poles |
| 1       | Riemann zeta along the critical line   |
| 2       | Möbius net with loxodromic twist       |
| 3       | n-th iterate of z² + c                 |

## Looks

Zeros and Poles, Pole Dance, Conformal Grid, Critical Line, Zeta Bands, Steiner Net, Loxodrome Flow, Julia Polynomial, Degree Doubling.

## Energy, beat, endless

- Energy: motion ×0.5 → ×2, band flow ×0.5 → ×2, glow −0.1 → +0.25.
- Audio: flow ← low (0.06), glow ← onset (0.12), grid ← high (0.08). The shared punch/pulse is 0.6/1.
- Endless: orbits, the zeta journey (ping-pong), the Möbius drift and the degree cycle all loop.

## Cost

One analytic pass, `maxRenderWidth` 1600. Zeta: 40 complex terms per pixel (one exp, one log, one sin/cos pair each), about 1–2 ms on the reference GPU. The others are cheaper.

## Tests (`tests/domain.test.mjs`)

Zeta values (ζ(2), ζ(−1), the trivial zero), zeros on the critical line, orthogonal square grid, winding numbers at a zero and at the pole, presets validate and cover all four functions.
