# Fourth Dimension (61) — `scene-fourspace.mjs`

Regular 4D polytopes (tesseract, 16-cell, 24-cell, 6×6 duoprism) rotated in four planes and projected 4D → 3D → 2D each frame. Edge topology is fixed per shape (`FOURSPACE_EDGES`, tested); a precompute pass projects vertices and edges once per frame for the per-pixel distance search.

## 2026-10-14 changes (intentional)

- **Integrated rotation.** The 4D rotation and 3D tumble angles are integrated in a 2×1 simulation (24-bit fractions of 200π; every multiplier × 100 is an integer, so wrapping is seamless). Energy and the faders change rotation speed and never jump the shape.
- **Light and depth (wave 2).** Each projected vertex also carries its 3D nearness. Edges are drawn as lit tubes (round body plus a specular streak) whose width (×0.6 → ×1.45) and light (×0.3 → ×1.15) follow nearness, so near edges come forward and far ones recede into the dark; vertices are small lit spheres; a faint ground glow replaces flat black. Colour still follows depth in w. Precompute gains a fourth row (endpoint nearness); the fallback path computes the same values.
- A sphere-shading overflow (pow of an unclamped normal far from a vertex → inf → NaN through the post chain) was caught in review and fixed by clamping before shading.

Look ids, parameters and edge order are unchanged; previews rebaked. Verified with the native-GPU precompute/fallback test (`PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs`) and the energy ladder.
