# Wallpaper Groups (76) — `scene-wallpaper.mjs`

**INCREMENTAL / EMPIRICAL**, rework 2026-10-14 ([look audit](../research/look-audit-2026-10-14.md) proposal #2, not vetoed by the owner). The family is not GATED. All 17 look ids, schema keys, presets, variants and rhythm effects are unchanged. **The picture changes intentionally**, and the catalog previews were rebaked.

All 17 plane symmetry groups, made with Frank Farris' wave-function method (_Creating Symmetry_, 2015). A lattice-periodic complex function f(X, Y) = Σ a_j·exp(2πi(n_j X + m_j Y)), with X, Y in lattice coordinates, is averaged over the group's operations X → A·X + t from the International Tables for Crystallography: F = Σ_k f(A_k X + t_k). F then has exactly that symmetry, including its mirrors, glides and 2-, 3-, 4- and 6-fold centres.

## Picture

- **Embossed relief.** The height is Re(F·e^{−iθ}) in units of its RMS, softly limited by tanh. θ turns once in 90 s, so crests and valleys slowly trade places; every θ keeps the symmetry. A slowly tilting, gliding, turning camera looks at the relief obliquely (pitch 25–41°, leaning further with energy), with fog toward the far plane.
- **Only crests are lit.** Key light from the upper left, a specular sheen and a rim; the valleys stay near black. The relief is lit from the exact analytic gradient, not screen derivatives.
- **Symmetry elements in thin accent.** Mirror axes (solid) and glide axes (dashed; dash = glide length) run straight across the floor and disappear under the crests. Rotation centres carry the Tables' symbols on the relief: lens (2), triangle (3), square (4), hexagon (6). Lines are 1.5 px at 1080p and scale with resolution. They light up for about 10 of every 32 beats; `cell` ("Symmetry axes and centres", formerly "Unit cell") sets their strength.
- **Terraces.** Level lines of the relief climb the crests on the beat (`rings`, now "Relief terraces").

| Before | After |
| ------ | ----- |
| Full-frame domain colouring (hue = phase, light = modulus), muddy purple | Lit relief on a dark ground; colour from secondary (flanks) to primary (crest tops) |
| Mean luminance 0.069 at energy 0.1 (max 0.113) | 0.031 (max 0.048) |
| Flat, top-down | Oblique ray-marched relief, parallax, fog |
| Faint unit-cell grid | Mirror and glide axes plus rotation-centre symbols, derived from the operations |
| Brightness varied with the random coefficients (some looks almost black) | Exact per-frame normalisation (below) |
| `cm Feathers` collapsed into stripes (the centring cancelled most terms) | Centred lattices draw only frequencies with n + m even |

## Signature detail and exactness

- **Exact symmetry.** Tested: every operation is an isometry of its lattice; F is invariant under every operation and lattice translation of all 17 groups.
- **Symmetry elements from the operations.** `symmetryElements()` derives reflection-line families (mirror when a coset member fixes the line pointwise, otherwise glide, with the glide length modulo the lattice) and rotation centres with their maximal order. Tested against the Tables' counts per conventional cell (for example p4m: 6 mirror families, 2 glide families, centres 2244; pgg: 4 glides, no mirrors). Every listed mirror and glide is an exact symmetry of F; glide axes are not mirrors; every centre has exactly its order.
- **Rotation centres are critical points.** ∇F(o) = R·∇F(o) for a rotation R ≠ 1 forces ∇F(o) = 0, so every centre sits on a peak, in a pit or on a saddle of the relief (tested numerically). The previous doc claimed that zeros sit on the centres; that is not forced for an invariant F and was removed.
- **Exact normalisation.** A per-frame data pass (`precompute`, 512 × 513 RGBA32F) stores one unit cell of (R, I, ∂R/∂X, ∂R/∂Y) and, in its last row, the cell means of |F|² and F². Both are exact by Parseval: the frequencies κ = Aᵀ·nm are integers in [−4, 4]² and are bucketed, mean |F|² = Σ|c_κ|², mean F² = Σ c_κ·c_{−κ}, and mean R² = (mean|F|² + Re(mean F²·e^{−2iθ}))/2. Without float render targets the shader evaluates F directly at the mid-height plane and approximates the mean as Σ|w|²/terms.

## Variants, looks, energy

- Variants (`group`): p1, p2 (oblique); pm, pg, pmm, pmg, pgg (rectangular); cm, cmm (centred rectangular); p4, p4m, p4g (square); p3, p3m1, p31m, p6, p6m (hexagonal, 120° basis as in the Tables).
- Looks: p6m Snowflake, p4m Tiles, p4g Pinwheels, p3 Triskelion, p31m Lace, p3m1 Kaleidoscope, p6 Spirals, p4 Turnstiles, cmm Diamonds, pgg Weave, pmg Ribbons, pmm Panels, cm Feathers, pg Footprints, pm Mirrors, p2 Pinwheel Field, p1 Drift.
- Energy: flow ×0.5 → ×2, morph −0.2 → +0.3, rings −0.1 → +0.2, cells across ×0.85 → ×1.2 (denser structure); `u_level` raises the relief and tilts the camera further. An exposure term holds brightness: the family-mean luminance is 0.031 / 0.033 / 0.033 at energy 0.1 / 0.5 / 0.9 (L.9/L.1 = 1.08). Individual looks still range 0.36–5.4 on the ladder because energy also moves flow and morph, so each column shows a different moment of the pattern (p4g Pinwheels at 0.1 is a dark, plateau-with-holes moment).
- Audio: flow ← low (0.06), rings ← high (0.1), turn ← onset (0.05). The kick punches the lens by ≤ 2%. Shared punch/pulse 0.6/1.
- Endless: new coefficient generations every 16 beats (seeded), the relief phase θ, and a lattice-periodic pan whose wrap is invisible.

## Cost

Native M3 Pro, whole frame including post (`profile-families.mjs --types`, quiet GPU, 2026-10-14): p50 3.1–3.8 ms at 1080p against 2.0–2.3 ms for the `metamorphosis` control (ratio ≤ 1.8); before the rework 2.9–6.0 ms (ratio ≤ 3.0). At 4K: 9.5–12.0 ms against 4.8–5.3 ms control; the old shader measured 9.4–17.3 ms in the same run. The data pass costs terms × operations × 2 sine/cosine pairs per texel at 512²; the visual pass marches 11 steps plus 4 bisections of periodic bilinear lookups.

## Limits

- Brightness still depends on the instantaneous pattern (see energy above).
- Phase spins, yaw and coefficient eras still use `mod(u_time, 3600)` and jump once an hour, as before.
- Axes and symbols are thin at preview resolution by design (they scale with output resolution).

## Tests (`tests/wallpaper.test.mjs`)

17 distinct groups; isometries; exact invariance under operations and lattice translations; six-fold p6m, four-fold p4, no rotation in p1; mirror/glide/centre counts per the Tables; every mirror and glide exact, glides not mirrors; centres of exact maximal order and critical points of F; centred lattices cancel n + m odd; energy keys; data-pass shape; one look per group; presets validate. `PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs` renders the data-pass and fallback paths on the native GPU.
