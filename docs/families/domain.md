# Domain Colouring (82) — `scene-domain.mjs`

**INCREMENTAL / EMPIRICAL**, rework 2026-10-14 ([look audit](../research/look-audit-2026-10-14.md) proposal #3, not vetoed by the owner). The family is not GATED. All 9 look ids, schema keys, presets, variants and rhythm effects are unchanged. **The picture changes intentionally**, and the catalog previews were rebaked.

A complex function f as an analytic landscape. The height of an oblique terrain is H·tanh(log|f| / 1.3): zeros sink as dark pits, poles rise as luminous spires. Lines of constant phase (coloured through `palette`) and of constant log modulus (the terrain's level lines) form the conformal grid; the modulus lines flow from the pits up into the spires.

| Before | After |
| ------ | ----- |
| Full-frame pastel colour wheel (mean luminance 0.187 at energy 0.1, the highest in the catalog) | Dark lit terrain; 0.020 at energy 0.1 (max 0.036) |
| Flat, top-down | Ray-marched heightfield, oblique gliding camera, fog, rim light, contact darkening in the pits |
| Hue fills by phase | Phase as thin palette-coloured lines (1.5 px at 1080p, scaled with resolution) |
| Zeros and poles as glow blobs | Pits and spires; only the spire tips glow (log|f| > 2), zeros stay dark |
| Zeta seen flat, with hard black bars | The camera trucks along the critical line; the row of zeros spans the frame and Re s < 0 rises behind into the dark |
| Energy raised glow | Energy raises the relief, adds half-step phase lines and widens the view; family-mean luminance 0.020 / 0.019 / 0.018 at 0.1 / 0.5 / 0.9 |

## Signature detail and exactness

- **Conformality.** Phase and modulus lines cross at right angles everywhere except at zeros, poles and critical points (Cauchy–Riemann; tested on ζ).
- **The argument principle.** Around a zero the phase colours turn one way, around a pole the other. Tested: ζ winds +1 around ½ + 14.1347i and −1 around s = 1.
- **Exact normals.** The terrain is lit from ∇log|f| = (Re f′/f, −Im f′/f), computed exactly per variant: Σ 1/(z − a) − Σ 1/(z − b) for rational and Möbius, ζ′/ζ = η′/η − D′/D for zeta (D = 1 − 2^{1−s}), and the chain rule for the iterate. Tested against numerical derivatives.
- **Riemann zeta.** Borwein's accelerated eta series with 40 terms. Tested: ζ(2), ζ(−1), ζ(−2) = 0; the six zeros in view vanish on the line, not beside it; along Re s = ½ the terrain has exactly six local minima for 12 < t < 39, each within 0.01 of a known zero; the pole is a spire; 40 terms agree with 80 to 2% up to Im s = 50 (the flight reaches about 50 at the far edge). A per-frame cache (384 × 1024 RGBA32F `precompute`) holds ζ over the visible region and only guides the march; the shading at every hit evaluates ζ and ζ′/ζ exactly. Without float render targets the march evaluates ζ directly with 6 steps.
- **Iterated z² + c.** Height log|fⁿ|/2ⁿ⁻¹ keeps the basin's scale as n steps, and the two heights blend over a beat. Tested: winding number 2ⁿ (2ⁿ pits) for n = 1…6, exact derivative.

## Variants and looks

| variant | Function | Camera |
| ------- | -------- | ------ |
| 0 | Rational: 3 orbiting zeros and 3 poles that trade places every 8 beats | orbit around the origin |
| 1 | Riemann zeta | sideways truck along the critical line, t ≈ 16 → 30 and back |
| 2 | Möbius net (a pit and a spire, Steiner circles, loxodromic twist) | orbit |
| 3 | n-th iterate of z² + c, n = 1…6 on structure events | orbit |

Looks: Zeros and Poles, Pole Dance, Conformal Grid, Critical Line, Zeta Bands, Steiner Net, Loxodrome Flow, Julia Polynomial, Degree Doubling.

## Energy, beat, endless

- Energy: motion ×0.5 → ×2, band flow ×0.5 → ×2, zoom ×1.12 → ×0.88 (more of the function in view); `u_level` raises the relief (H = 0.13 → 0.2 of the view span), adds half-step phase lines and steepens the orbit camera. The glow energy curve was removed.
- Audio: flow ← low (0.06), glow ← onset (0.12), grid ← high (0.08). The kick punches the lens by ≤ 2%. Shared punch/pulse 0.6/1.
- Endless: orbits, the zeta ping-pong, the Möbius drift and the degree cycle all loop.

## Cost

Native M3 Pro, whole frame including post (`profile-families.mjs --types`, quiet GPU, 2026-10-14): p50 3.2–4.6 ms at 1080p against 2.0–2.3 ms for the `metamorphosis` control (ratio ≤ 2.2); before 1.7–2.6 ms. At 4K: 10.3–15.6 ms against 4.8–5.3 ms control; the old shader measured 4.7–7.8 ms in the same run. The march takes 18 quadratically spaced samples (dense near the slab top, where spires are thinnest) plus 6 bisections; per-frame orbit and Möbius points are hoisted out of the march.

## Limits

- At 4K the terrain costs about twice the old flat shader (iterate and zeta are the most expensive).
- The nearest pole spires are very thin and can show slight slicing when the camera passes close.
- Zeta still fades to black for Re s < −0.9 (float precision of the series), visible as a dark band behind the cliff.
- The orbit camera and phases still use `mod(u_time, 3600)` and jump once an hour, as before.

## Tests (`tests/domain.test.mjs`)

Zeta values; zeros on the critical line; orthogonal square grid; winding numbers; exact ζ′/ζ; terrain pits at the zeros and the pole spire; series accuracy over the flight; rational pits, spires and normals; iterate pit count and derivative; energy keys; presets validate and cover all four functions. `PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs` renders the cache and fallback paths on the native GPU.
