# Geometry research directions

Date: 2026-09-07. Classification: **EXPLORATORY**. Established mathematical mechanisms, proposed Phosphor instruments; no novelty claim. Sources are author papers, notes, or implementations. Performance estimates below are design judgments, not device measurements.

## Recommended order

| Priority | Instrument | Visual opportunity | Bounded implementation |
| --- | --- | --- | --- |
| 1 | Hyperspace Loom | A tesseract turning inside out, then richer 4D polytopes | Canvas2D projected edges; 16 vertices / 32 edges initially |
| 2 | Hopf Loom | Linked luminous rings forming nested toroidal fabrics | 24–64 fibers, 64–128 samples each; depth-aware line segments |
| 3 | Hyperbolic Cathedral | Escher-like tessellations moving through an infinite disk | Cache a bounded sampled field, or add a small WebGL shader path |
| 4 | Curved Worlds | Actual views from within spherical or hyperbolic space | Separate GPU renderer milestone with geodesic and distance tests |

These extend Phosphor's current sampled loops and Canvas2D renderer without pretending that its existing recursive corridor is intrinsically curved space. All four should share editable palettes, deterministic time, pause, capture, session persistence, and reduced-motion behavior.

## Hyperspace Loom

**REPORTED:** 4D rotation acts in planes. A double rotation combines independent rotations in orthogonal planes; projection then reveals motion unavailable to a rigid 3D object. Author examples: [Christopher Daly's mathematical visualizations](https://www.math.brown.edu/cdaly2/visualization.html) and [Sherif's WebGL tesseract implementation](https://github.com/tsherif/tesseract-explorer).

**FORMAL construction:** enumerate vertices in `{−1,+1}⁴`; connect two exactly when they differ in one coordinate. Apply `R_XW(a) R_YZ(b)` before projection. These rotations commute because their coordinate planes are disjoint. For a vertex `(x,y,z,w)`, use `(d*x,d*y,d*z)/(d-w)` with `d>2`: every unscaled vertex has norm 2, so all rotated `|w|≤2` and the denominator stays positive. Then apply the ordinary 3D camera. Projection distorts apparent edge length; 4D lengths remain invariant.

Proposed controls: two rotation rates, their ratio, projection depth, trail persistence, cell emphasis, line thickness. A rational rate ratio produces a periodic rotation; an irrational ratio has no exact joint period. A fixed rate sweep with bounded audio modulation is more legible than framewise random rotation. Keep projection and 3D cross-section as explicitly different modes if slicing is added later.

Acceptance: exactly 16 distinct vertices and 32 edges; every vertex degree 4; rotations preserve squared norms and edge lengths within tolerance; all projected coordinates finite at every control extreme; pause preserves geometry. Expand to a 24-cell only after this complete instrument passes capture/save/reopen checks.

## Hopf Loom

**REPORTED:** the Hopf fibration maps `S³` to `S²`, with circle fibers that can be displayed by stereographic projection. [David Lyons' introductory paper](https://arxiv.org/abs/2212.01642) provides the mathematical basis and quaternion interpretation.

**FORMAL construction:** for complex `(z₁,z₂)` with `|z₁|²+|z₂|²=1`, define `h=(2 Re(z₁ conjugate(z₂)), 2 Im(z₁ conjugate(z₂)), |z₁|²−|z₂|²)`. Multiplying both complex coordinates by `exp(it)` leaves `h` unchanged: this gives a fiber. Parameterize representatives by `z₁=cos(θ/2)`, `z₂=exp(iφ) sin(θ/2)`, then sample `t`. Project the four real coordinates stereographically with one fixed documented pole.

Proposed controls: number and distribution of base-sphere points, a 4D rotation, fiber reveal, tube thickness, orbit, and color indexed by base-sphere position. Moving a highlight along a fiber changes its illumination, not its geometric shape. Constant phase rotation of a fully drawn unmarked fiber is visually stationary: avoid a misleading "motion" slider. Clip/split segments near the stereographic pole; joining the two sides across infinity creates false chords. Thick luminous tubes can visually overlap even when mathematical centerlines are disjoint.

Acceptance: unit input and output norms; fiber-map phase invariance; sampled curve closure; finite projection outside explicit clipping region. Later numerical linking-number checks should converge toward absolute value 1 for distinct unclipped fibers; 2D screen crossings are insufficient evidence of linking.

## Hyperbolic Cathedral

**REPORTED:** in the Poincaré disk, geodesics are diameters or circles orthogonal to the boundary. Regular `{p,q}` tilings require `1/p+1/q<1/2`. Start with `{5,4}` and `{6,4}`. [Steve Trettel's derivation and folding algorithm](https://stevejtrettel.site/notes/2026/regular-polygons-disk-model/) constructs walls and folds pixels back into a central polygon using circle inversion. The even-`q` restriction matters for using that whole polygon as a reflection chamber; odd `q` requires a different chamber treatment. A triangle chamber with angles `π/p, π/q, π/2` is the general route. Formula for wall centers: radius squared `(1+cos(2π/q))/(cos(2π/q)+cos(2π/p))`; each wall-circle radius squared is one less.

Proposed controls: a small validated tiling menu, geodesic camera translation, motif, edge emphasis, palette, and pattern flow. Keep Euclidean kaleidoscope and hyperbolic geometry separately labeled. Budget the number of fold iterations and fade unresolved subpixel detail near the rim; do not silently call capped numerical output an infinite exact rendering.

Acceptance: wall orthogonality, reflection applied twice recovers a point, transformations retain points inside the disk, adjacent tiles meet without cracks, camera moves preserve hyperbolic distance, and unresolved pixels are counted. Benchmark a cached low-resolution implementation before promising full-resolution CPU animation.

## Curved Worlds

**REPORTED:** [Coulon, Matsumoto, Segerman and Trettel](https://arxiv.org/abs/2010.15801) develop actual geodesic ray marching, distance underestimators, quotient-space handling, and geometry-dependent lighting for all eight Thurston geometries. This is substantially more than warping a Euclidean image.

Proposed first scope: one hyperbolic `H³` scene with a few primitives, fixed step cap, reduced resolution, distance coloring, and a documented approximation for lighting. Spherical `S³` follows; Nil and Sol deserve independent milestones. Acceptance must check model constraints along geodesics, distance bounds used by marching, stable camera frames, convergence as step tolerances tighten, and real-device frame time. Phosphor should preserve its existing Canvas2D fallback during any GPU experiment.

## Initial falsifiable probe

**EMPIRICAL:** an isolated Python 3 double-precision probe on 2026-09-07 used 1,000 samples from seed 54 to evaluate the formulas above. Maximum errors: 4D squared-norm preservation `1.33e−15`; Hopf output squared norm `1.33e−15`; Hopf common-phase invariance `6.66e−16`; `{5,4}` reflection involution `1.49e−15`. This checks numerical identities, not an implemented renderer or sustained performance. The script was an ephemeral research probe; promote these properties into permanent tests with the corresponding implementation.

Proof status: elementary construction identities are stated above; no new theorem, formal proof-assistant result, runtime visual acceptance, or performance claim. Next test: implement the bounded tesseract with persistent parameters and evaluate its readability beside the current topology scene, then prototype Hopf fibers with explicit projection clipping.
