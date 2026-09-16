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

Focus now exposes a one-click `Use HD` action when a non-HD Julia frame is visibly enlarged. The action is opt-in, updates the quality selector and renderer readout, and keeps the CPU fallback honest when WebGL is unavailable.

## Limits and next test

This pass establishes the render-size cause and confirms that native HD improves the observed browser image; it does not establish long-run thermal behavior, recording stability, or performer preference. Next, repeat the A/B on a named reference device with a sustained rehearsal and record the exported rehearsal report before changing shader parameters or fallback budgets.

