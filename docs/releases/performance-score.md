# Fractal Flight and reusable performance score — 2026-09-07

Status: PUBLIC PREVIEW, deployed as Site version 6. This record is separate from the historical Site version 5 evidence in [studio.md](studio.md). Classification: INCREMENTAL. No full-v1, device, sustained-performance, or performer-acceptance claim.

The exact deployed source is commit `fcfae369a72726dc3589db0e7d47b3a89798a8cd`; terminal deployment `appgdep_6a9e8e79c52c8191a49fc257d090ad3a` succeeded at the existing public URL. A public HTTP check returned 200, the page reported 14 families, and the served `mandelbox-flythrough.mjs` matched renderer SHA-256 `ea7b271962238cf81b4bf0606bad775b65cb3113ccb920df56bc94e4801c63e7`.

## Scope

The set workflow now captures each new cue's scene parameters, palette, and effect stack; validates those snapshots on import; and supports an explicit, scene-safe cue refresh. Older scene/preset-only cues remain readable. Playback pauses at the active cue, preserves consumed beat position, retimes remaining beats on BPM changes, completes once, and invalidates stale callbacks on removal/import/offline work. Graphics context loss preserves the cue position and paused context recovery redraws a preview. The portable-session workflow also exposes Restore previous set: it reloads the retained backup after repeated loads or a page reload, with download/export remaining the best-effort recovery path.

The UI includes an explicit `Load 24m score` action. It exports the current set first, then loads nine authored cues across Acid Mycelium, Magnetic Choir, and Topological Melt: 64 bars each at 96 BPM, exactly 24 minutes. The first Acid build cue is the initial visible state. Loading is opt-in and retains a backup of the prior set for `Restore previous set`, while also attempting an optional download.

## Fractal Flight integration

Fractal Flight is the fourteenth scene family: a seeded WebGL Mandelbox distance-field flight through a repeated 8-unit world. Its authored looks are Cathedral Drift, Ember Nervure, and Glass Orbit. The product-facing controls are Speed, Steering, Scale, and Surface glow; “Surface glow” is intentionally the honest label for the bounded material/detail control, not an exposed ray-iteration budget. Supported scale is 2.05–2.45, with fixed fold 1 and minimum radius 0.5. The renderer has a persistent error/recovery path when WebGL is unavailable.

The frozen experimental candidate uses the same positive control magnitude range 2.05–2.45 with a signed negative Mandelbox scale, fixed fold 1, and minimum radius 0.5. Its exterior camera retains the oblique route and independent CPU probes report origin clearance above 3.35 across travel 0–8, center hits at depths approximately 4.6–10.6, and non-empty 3×3 visibility across the tested scale samples. These are bounded source probes for the fixed app route, not sustained browser-performance claims or a claim that every schema scale was exhaustively validated.

## Evidence

`npm test` passes 29/29, including real apply/save-round-trip and playback assertions for authored snapshots, plus a regression assertion that all nine score cues have bounded scene, palette, and effect snapshots and total 576 bars. The independent acceptance probe passes snapshot round-trip, invalid import transactionality, pause/resume, live tempo, finite end/restart, edit/remove, and explicit score loading. `npm run build` and `npm run check:dist` pass, including the local `mandelbox-flythrough.mjs` import. Controlled Cathedral Drift browser captures at t0/t10/t30 passed with cue-set transport stopped; remaining Ember/Glass timed captures and native WebM export are unobserved. Browser/device recovery, native audio permissions, sustained frame-time, and performer reuse remain open checks.
