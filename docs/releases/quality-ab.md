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

Focus now exposes a one-click `Use HD` action when a non-HD Julia frame is visibly enlarged. The action is opt-in, updates the quality selector and renderer readout, and keeps the CPU fallback honest when WebGL is unavailable. Focus now requests a bounded 1440×900 WebGL backing surface for Full-profile Julia when available, then downsamples it into the normal 960×600 output; the CPU fallback uses a bounded 720×450 Full detail pass (or 960×600 when HD is explicitly selected). Both paths avoid indefinite viewport stretching without changing the normal Full output profile. Its visibility is refreshed even when Focus toggles without a resize, so the quality correction cannot remain stale or hidden. Rehearsal Preflight also exposes `Run Full / HD A/B` when Julia is selected. It performs three synchronous preview draws at Full and three at HD, records each renderer path, CSS display scale, bounded device-pixel ratio, median/p95 timing, and target status, then restores the active profile and live state. The recommendation uses physical display pixels, so a Retina screen cannot be mislabeled as a native Full fit when its `960×600` backing is being enlarged. Older reports without a density field remain valid as 1× evidence. Saving a rehearsal report carries this bounded evidence as `phosphor-quality-ab-v1`; it contains no pixels, media, or device fingerprint.

The CPU fallback now runs a small reusable luma edge lift over its existing bounded raster before the high-quality display enlargement. It reuses a size-matched scratch buffer, clamps the lift, preserves alpha, and leaves the WebGL path, raster dimensions, iteration budget, and beat mapping unchanged. This is a readability correction for soft fallback filaments, not added detail or a replacement for the explicit HD profile.

When the shared beat response is active, the fallback raises that edge amount from `.16` toward `.24` within the same clamp. The `high`-band mapping therefore gives Julia a restrained contour lift in addition to its existing motion/brightness response; GPU output and authored parameters remain unchanged.

When the quality guard recommends HD, the stage badge repeats `HD AVAILABLE` beside the profile label, so the correction remains visible even when the detailed Focus diagnostics are not in view. Selecting HD clears the badge hint after the native profile is active.

A follow-up local browser smoke on the same instrument now reports `Julia · WebGL 1440×900` and `1.5× WebGL backing upscale` in Focus at a `2142×1338` stage, instead of enlarging only the `960×600` output surface. Focus now caps the visible Julia output at its 960×600 output width (and keeps the viewport-height cap), so the supersampled backing is downsampled once rather than stretched a second time across the whole viewport. The A/B summary names that distinction too, showing backing-to-output dimensions such as `WEBGL 1440×900→960×600` when a Focus probe uses the bounded backing surface, plus an explicit `HD HIGHER DETAIL`, `HD REDUCES UPSCALE`, or `SAME BACKING DETAIL` recommendation derived from the captured backing and display scales. A density-aware probe appends the observed `DPR` to the compact summary and can recommend HD even when the CSS stage itself is exactly `960×600`; if the stage is resized or moved to a display with another density afterward, the evidence is marked `STALE` until a fresh probe is run, and the preflight line changes to the warning color so it cannot blend into a fresh result. A loaded report reuses this derived recommendation when no local probe is present, and the comparison card exposes it in its accessible summary; the local report cache also preserves the compact A/B evidence across reopen, keeping the handoff actionable without pretending to have fresh measurements. The frame-time readout stayed within the 60-target budget in this short smoke. This confirms the new path is active, not a sustained thermal or performer-quality result.

## Limits and next test

This pass establishes the render-size cause and adds bounded Focus-only WebGL and CPU detail corrections; it does not establish long-run thermal behavior, recording stability, or performer preference. Next, run the probe and a sustained rehearsal on the reference device, export the report, and compare its p95 tail and observed sharpness before changing shader parameters or fallback budgets.
