# Julia quality A/B

Date: 2026-09-16  
Classification: **INCREMENTAL** · **EMPIRICAL**

The first live browser comparison explains the softness in the supplied Focus screenshot: the selected Full profile renders Julia at `960×600`, then enlarges it to a `1417×885` Focus stage (`1.5× CSS upscale`). The same Chrome rehearsal with the opt-in HD profile renders at `1920×1200` and downsizes to that stage (`0.7× CSS downscale`). The HD capture was visibly sharper at recursive boundaries and fine orbit-trap filaments.

## Evidence

- Browser: local Chrome rehearsal at `http://localhost:48101/`.
- Viewport: `1719×987`; Focus stage: `1417×885`.
- Julia scene: Dendrite preset.
- Full: `Julia · WebGL native 960×600`; Focus scale `1.5× CSS upscale`.
- HD: `Julia · WebGL native 1920×1200`; Focus scale `0.7× CSS downscale`.
- Bounded smoke readout: approximately `0.2ms` median / `0.3ms` p95, within the selected target in both profiles. This is not a sustained benchmark or device certification.

Focus now exposes a one-click `Use HD` action when a non-HD Julia frame is visibly enlarged. The action is opt-in, updates the quality selector and renderer readout, and keeps the CPU fallback honest when WebGL is unavailable. Focus also requests a bounded 640×400 CPU detail pass for Full-profile Julia, reducing the fallback enlargement from 2× to 1.5× at the standard preview size without changing the normal Full render budget. Its visibility is refreshed even when Focus toggles without a resize, so the quality correction cannot remain stale or hidden. Rehearsal Preflight also exposes `Run Full / HD A/B` when Julia is selected. It performs three synchronous preview draws at Full and three at HD, records each renderer path, display scale, median/p95 timing, and target status, then restores the active profile and live state. Saving a rehearsal report carries this bounded evidence as `phosphor-quality-ab-v1`; it contains no pixels, media, or device fingerprint.

## Limits and next test

This pass establishes the render-size cause and adds a bounded Focus-only CPU detail correction; it does not establish long-run thermal behavior, recording stability, or performer preference. Next, run the probe and a sustained rehearsal on the reference device, export the report, and compare its p95 tail and observed sharpness before changing shader parameters or fallback budgets.
