# Wallpaper Groups (76) — `scene-wallpaper.mjs`

All 17 plane symmetry groups, made with Frank Farris' wave-function method (_Creating Symmetry_, 2015). A lattice-periodic complex function f(X, Y) = Σ a_j·exp(2πi(n_j X + m_j Y)), with X, Y in lattice coordinates, is averaged over the group's operations X → A·X + t, taken from the International Tables for Crystallography: F = Σ_k f(A_k X + t_k). F then has exactly that symmetry, including its mirrors, glides and 2-, 3-, 4- and 6-fold centres. The picture is a domain colouring of F: hue by phase, light by modulus, and contour rings of log |F| that run outward on the beat.

## Signature detail

- **Exact crystallographic symmetry, one look per group**, from p1 (translations only) to p6m (the snowflake). Tested: every operation is an isometry of its lattice, and F is invariant under every operation and every lattice translation for all 17 groups. p6m is six-fold, p4 four-fold, and p1 has no rotation.
- **Zeros on the rotation centres.** Where F vanishes all hues meet in a point. The group forces such zeros onto many of its rotation centres, so the pinned colour wheels mark the symmetry elements.
- **Change without breaking symmetry.** Every wave term turns its phase at its own speed, and every 16 beats (scaled by `morph`) the coefficients re-roll with a smooth crossfade. The pattern never stops changing, and the symmetry never breaks.

## Variants (`group`)

p1, p2 (oblique lattice); pm, pg, pmm, pmg, pgg (rectangular); cm, cmm (centred rectangular); p4, p4m, p4g (square); p3, p3m1, p31m, p6, p6m (hexagonal, 120° basis as in the Tables).

## Looks

p6m Snowflake, p4m Tiles, p4g Pinwheels, p3 Triskelion, p31m Lace, p3m1 Kaleidoscope, p6 Spirals, p4 Turnstiles, cmm Diamonds, pgg Weave, pmg Ribbons, pmm Panels, cm Feathers, pg Footprints, pm Mirrors, p2 Pinwheel Field, p1 Drift.

## Energy, beat, endless

- Energy: flow ×0.5 → ×2, morph −0.2 → +0.3, rings −0.1 → +0.2.
- Audio: flow ← low (0.06), rings ← high (0.1), turn ← onset (0.05). The beat shifts the hue a little and drives the rings outward. The shared punch/pulse is 0.6/1.
- Endless: new coefficient generations every 16 beats (seeded, so a look stays the same look), plus a slow pan and turn.

## Cost

One analytic pass, `maxRenderWidth` 1600. Per pixel, terms (≤ 8) × operations (≤ 12) × 2 generations of one sine/cosine pair, at most 192. Estimated 1–2 ms on the reference GPU for p6m with 8 terms.

## Tests (`tests/wallpaper.test.mjs`)

17 distinct groups; isometries of their lattices; exact invariance of F under each group's operations and lattice translations; six-fold p6m, four-fold p4, no rotation in p1; one look per group; presets validate.
