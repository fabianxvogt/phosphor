# Fractal instruments: implementation shortlist

Date: 2026-09-07. Classification: **EXPLORATORY**. This is literature-backed design research, not a benchmark or novelty claim. `REPORTED` identifies source claims; `FORMAL` identifies definitions or elementary deductions; `SPECULATIVE` identifies Phosphor design judgments. No new renderer was implemented in this lane.

## Recommendation

**SPECULATIVE:** Build a Julia orbit-trap instrument first, then an evolving fractal-flame instrument. Together they offer crystalline geometry and smoky organic forms, with much more expressive range than adding several near-identical escape-time presets. Add Newton basins as a mathematically rich sibling. Reserve ray-marched quaternion slices/Mandelbulbs for a measured GPU renderer milestone.

| Priority | Instrument | Artistic depth / useful controls | Browser cost and integration risk |
| --- | --- | --- | --- |
| 1 | Julia orbit traps | Filigree, eyes, circuitry; complex parameter, trap shape/position, zoom, symmetry, palette phase | Moderate; independent pixels, fixed iteration cap, low-resolution CPU prototype or fragment shader |
| 2 | Evolving fractal flames | Smoke, wings, luminous folds; transform weights, nonlinear variations, symmetry, camera, density, palette, parent selection | Moderate–high; stochastic histogram accumulation and progressive refinement; strongest connection to interactive evolution |
| 3 | Newton basin atlas + domain coloring | Moving roots reshape fractal boundaries; root positions, relaxation, contour density, basin palette | Moderate; simple per-pixel loop but singularities and nonconvergence need explicit treatment |
| 4 | Quaternion Julia slices | Alien solid cross-sections; four-dimensional constant, slice offset/orientation, camera, material | High; new ray marcher and projection/slicing controls; real 4D mathematical domain |
| 5 | Mandelbulb / folded 3D fractals | Monumental caverns, recursively detailed sculptures; power/folds, orbit material, light, camera | Highest initial integration risk; distance-estimator artifacts, precision and expensive nested loops |

The rankings and costs are **SPECULATIVE**, relative to this repository; none establish frame rates.

## 1. Julia orbit traps — best immediate addition

**FORMAL:** Iterate `z[n+1] = z[n]² + c` from the pixel coordinate. The filled Julia set contains initial points with bounded orbits; its boundary is the Julia set. A finite iteration budget can only report “not escaped within budget.” For arbitrary `c`, choose a justified escape radius, for example `R > max(2, |c|)`, rather than assuming radius 2 remains sufficient for unrestricted parameters.

**REPORTED:** Orbit traps color an orbit using proximity to a chosen geometric shape. Trap position, shape, size, rotation, transfer and aggregation provide a broad artistic vocabulary. [Ultra Fractal's official orbit-trap documentation](https://www.ultrafractal.com/help/coloring/standard/orbittraps.html)

**SPECULATIVE:** Start with circle, cross and point traps. Accumulate minimum distance; store escape/iteration/trap scalars separately from RGB so recoloring does not require rerunning the orbit. Offer three playable controls first: **Shape**, **Orbit**, **Detail**; put `c`, iteration budget, trap transform and camera in advanced controls. Audio should move a bounded trap or palette slowly, with user-controlled depth; unrestricted beat-driven `c` changes can produce unpleasant hard topology changes. A short authored closed parameter path is a better performance preset than arbitrary random walks.

**Verification:** Test `c=0` fixtures inside/on/outside the unit circle; conjugation symmetry for real `c`; finite handling at zero distance; aspect-ratio preservation; bounded iterations; palette-only recoloring; exports and paused edits. Do not promise deep zoom with ordinary GPU precision.

## 2. Fractal flames — richest evolution candidate

**REPORTED:** Draves and Reckase extend iterated function systems with nonlinear variations, logarithmic density display and structural coloring. The algorithm samples an attractor, accumulates density and color, then maps the histogram to an image. [Original algorithm paper](https://flam3.com/flame_draves.pdf)

**REPORTED:** Electric Sheep establishes prior art for evolving this parameter space with audience selection. This would be an application of an established artistic algorithm, not an invention claim. [Draves, *The Electric Sheep Screen-Saver: A Case Study in Aesthetic Evolution*](https://draves.org/evomusart05/evomusart05draves.pdf)

**SPECULATIVE:** Give users a parent and four mutated siblings, with locks for palette, symmetry and composition. Use a small initial vocabulary: linear, sinusoidal, spherical and swirl. Keep fixed sample budgets, deterministic seeds, burn-in, bounded transform counts and finite-value rejection. Accumulate in a typed histogram and progressively refine while paused; clearly distinguish paused motion from optional render refinement. Reset accumulation after structural changes, but remap an unchanged density histogram for exposure/palette edits. A moving accumulator cannot simply retain old geometry indefinitely without ghosting.

**Verification:** Identical seeds/settings produce identical histograms; zero samples remain black; singular variations never inject NaN; counts are bounded; mutation preserves locks; reject blank/divergent candidates and provide retry. Random nonlinear maps need not be contractive or aesthetically useful. CPU/GPU throughput and sufficient live sample density remain open experiments. Consult the original implementation's license before any code reuse; deriving project code from documented formulas avoids silently importing an incompatible implementation. [Author's renderer repository](https://github.com/scottdraves/flam3)

## 3. Newton basin atlas — mathematical interaction

**FORMAL:** For `p(z) = product(z-r[j])`, Newton iteration is `z' = z - p(z)/p'(z)`. Color the converged root identity separately from convergence speed. Dragging roots makes the system understandable and expressive. A relaxation factor changes the dynamical system and must be labeled. Small derivative, divergence and iteration exhaustion are distinct outcomes; proximity to a known root or sufficiently small residual establishes a numerical stopping criterion, not universal convergence.

**REPORTED:** Domain coloring encodes complex argument and magnitude, and can visualize intermediate Newton and Julia iterates as well as final basins. It reveals roots and poles through phase structure. [Martin Pergler's original visualization notes and source](https://web.ncf.ca/fs039/mp/documents/ptr/index.html)

**SPECULATIVE:** Support three to six draggable roots, a basin/domain toggle and a cyclical editable palette. Preserve root-to-color identity as roots move. Test polynomial roots, the derivative-zero origin for `z³−1`, coalescing roots and phase wrap. This offers better interaction than exposing polynomial coefficients alone.

## 4. Three-dimensional distance-estimated fractals

**REPORTED:** A published rendering treatment covers quaternion Julia slices and Mandelbulbs using shaders and distance approximations. Its implementation uses HLSL/DXR; this is evidence for the technique, not browser performance. Mandelbulb spherical powering is a constructed three-dimensional analogue, not ordinary complex multiplication in 3D. [Da Silva et al., *Real-time rendering of complex fractals*](https://arxiv.org/abs/2102.01747)

**FORMAL / critical review:** Bounded orbits need not converge to a finite limit; the paper's informal wording must not become Phosphor's set definition. An estimated distance is not automatically an exact signed distance or a globally conservative safe step. A ray marcher needs bounded steps, finite guards, hit epsilon, a far limit and artifact tests; reducing steps can lose geometry rather than merely reduce smoothness.

**SPECULATIVE:** Start with quaternion slices to connect the user's fractal and 4D interests. A slice offset can be the primary performance gesture. Prototype separately with adaptive resolution and static-reference comparisons before connecting live audio. Continuous power changes and noninteger powers need a clearly specified spherical convention.

## Integration and next falsifiable test

**REPORTED, source inspection:** `app.js` currently owns a Canvas 2D stage, ten scene definitions, kind-based reset/step/draw dispatch, shared capture and offline frame output. `core.mjs` holds bounded simulation helpers. A GPU fractal should render into a separate canvas/texture and composite into the existing output contract; a canvas cannot simply switch from an established 2D context to WebGL. The scene count also appears in lifecycle probes and documentation and must be audited when expanding the library.

**SPECULATIVE:** Avoid a renderer rewrite for the first experiment. Implement a deterministic low-resolution orbit-trap kernel, then compare one CPU path and one fragment-shader path using identical parameters on the owner's reference device. Record median/p95 frame time at both output profiles, visible detail, and ten minutes of interaction/export behavior. Acceptance requires three distinct authored looks, working custom palettes, paused edits, save/reopen, still/video/offline export, and truthful quality controls. If this cannot sustain the existing output target, reduce sampling resolution explicitly before adding more expensive scenes.
