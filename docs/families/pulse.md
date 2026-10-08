# Pulse Geometry — family sign-off packet (2026-10-08)

**Gate: PASSED — owner art sign-off 2026-10-08 (D51), rig timing passed.** The lane's record below is unchanged.

**INCREMENTAL / EMPIRICAL; draft, not show-approved.** Worktree branch: `family/pulse`.
Owner art approval and real-GPU timing remain separate requirements (D26–D31, D44–D48).

## Types and authored looks

| Form | Structural description | Recommended preset |
| --- | --- | --- |
| 0 | Parallel emissive bars sweep along a seed-oriented axis, optionally turning. | Scanner Bars / Slow Gate |
| 1 | Log-depth nested square frames expand toward the camera, optionally rotating. | Square Tunnel / Ring Dive |
| 2 | One perspective ground plane scrolls beneath a high, off-centre vanishing point. | Horizon Grid |
| 3 | Solid radial blades with staggered moving tips extend to the screen edges; no rings. | Shard Crown |

## Distinctness (same palette, grayscale, mid energy)

Baseline tunnel/shards distance **0.238 failed**; solid blades replaced rings. A later tunnel/grid **0.205** flag was resolved by replacing the mirrored planes with an offset ground plane. Final family sheet: **four types, zero same-family near pairs**.

| Form | To 0 | To 1 | To 2 | To 3 | Nearest cross-family | Additional cross pairs <0.25 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | — | 0.334 | 0.374 | 0.636 | Melt `family 0`: 0.286 | None |
| 1 | 0.334 | — | 0.426 | 0.623 | Hyperbolic `tiling 3`: **0.168** | Hyperbolic `tiling 2`: 0.203; `tiling 0`: 0.210; Fourth Dimension `shape 3`: 0.221; Evolution `planting 9`: 0.231; `planting 12`: 0.234 |
| 2 | 0.374 | 0.426 | — | 0.681 | Fourth Dimension `shape 0`: 0.369 | None |
| 3 | 0.636 | 0.623 | 0.681 | — | Interference `composition 5`: 0.584 | None |

## Energy, beat and drift

The original negative thickness slope lost tunnel/grid detail at peak energy; the positive slope now preserves growing coverage/detail, and low-energy edges soften without a brightness multiplier.
Scene-local kick brightening was removed: shared punch/pulse weights remain 1.2; automatic flashes stay shared.
Beat snaps ease over 30 % rather than 12 % of the beat; zero travel stops scene motion, not the shared kick.
Ladder PNGs inspected for all six presets: every edge-density series rises at 0.1/0.5/0.9. Scanner Bars: **0.006/0.028/0.044**; Square Tunnel: **0.011/0.076/0.122**; Horizon Grid: **0.023/0.038/0.048**; Shard Crown: **0.002/0.017/0.036**. All four have ordered headless proxies; owner approval is pending.
Mean luminance, same order: bars **0.044/0.074/0.095**, tunnel **0.021/0.048/0.063**, grid **0.020/0.042/0.064**, shards **0.233/0.215/0.228**. Shards order by density/sharpness/motion, not mean brightness; ink peak and master are unchanged.
**Drift passed:** all 36 coherent ±12 % corner renders (six presets × three levels × two directions), non-blank/finite/error-free with textures accounted and uploaded travel/count ordered. Montage pairs are −12 %, +12 % at each level; integer form/count stay fixed.
**Shared kick passed:** at energy 0.9, normalized RGB differences from punch/pulse alone are **0.109 / 0.239 / 0.082 / 0.059** for forms 0–3. Limited-output traces: ≤3 automatic requests/s; maximum full-frame ≥0.1 linear-luminance transitions/s **0 / 0 / 0 / 2**, below the six-transition limit.

## Aspect and correctness

All four types use height-based isotropic coordinates; line/bar coverage adapts to the native aspect.
**Aspect proxy passed:** every type inspected at 640×360, 1280×360 and 480×480; isotropic geometry, subject retained, no letterbox bands. Grid sky is authored negative space. Each aspect sheet also has zero same-family near pairs.
`npm test`: **138/138 passed**. `npm run build`: **passed**, 47 reachable assets.
`npm run build && node scripts/test-browser.mjs --only lab --port 48125`: **passed** — all 104 looks non-blank, WebGL 0, non-finite 0, textures accounted, extremes/aspects/fades passed. Full Pulse probe and cross-signature extraction passed; its initial 600 s watchdog expired before the compact readback fix (full coverage retained; watchdog now 1800 s).

## Local evidence (absolute paths; copied into the main checkout's `artifacts/` at merge; not committed)

- Types: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-types/index.html`
- Ladder: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-ladder/index.html`
- 16:9: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-16x9/index.html`
- Ultra-wide: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-ultrawide/index.html`
- Square: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-square/index.html`
- Cross-family: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-cross-types/index.html`
- Probe: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-probe/metrics.json`; drift montage: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-probe/drift.png`
- Pair distances: `/Users/fabian/Development/phosphor/artifacts/contact/pulse-probe/distinctness.json`

## Owner judgement and limits

Judge structural variety (especially the six tunnel cross-family flags), every type's energy ordering, sustained peak-time comfort and drifted looks. Slow Gate is almost dark at 0.1; corner probes are not a long-running Random-mode soak.
**Rig timing PASS (2026-10-08, parent):** `npm run timing -- --rig --family pulse`, Chrome on the M3 Pro (ANGLE Metal, built-in display), 1920×1080, energy 0.95, 30 s per type, with one headless lane loading the CPU (load average ≈ 39): p50 16.7 ms, p99 17.6 ms for all four forms, max 26.0 ms, GPU errors 0, non-finite 0, no downgrade. Art sign-off has not been executed.
Contact captures intentionally disable the limiter and stay mid-beat; they cannot approve flash safety or timing.
The separate limited-output trace is only a short headless, 150 BPM, 1×-trim proxy, not photosensitivity certification.
No platform, contract, other scene, shared script or root gate-status document was changed.
