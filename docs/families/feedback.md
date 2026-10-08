# Feedback Chapel sign-off packet

2026-10-08 · `family/feedback` · **INCREMENTAL / EMPIRICAL** · Technical checks complete; draft until owner art approval and real-GPU timing.

## Types and authored looks

- **0 — Halo:** breathing concentric annuli; repeated lateral chapels compose wide walls. Preset: Quiet Apse (Clean Recovery is the short-trail alternative).
- **1 — Portal:** off-axis nested triangular portals travel towards a dark vanishing point. Preset: Prism Descent.
- **2 — Weave:** full-frame horizontal/vertical interlaced ribbons, with alternating over/under crossings and shear. Preset: Votive Loom.
- **3 — Procession:** staggered columns of hollow votive tiles descend at independent column speeds. Presets: Molten Reliquary, Evolving Tunnel.
All six existing preset names, seeds and bounded parameter values are retained; `geometry` selects 0–3. Portable authored presets pass the unit suite.

## Distinctness

**PASS at the specified 480×270 sheet.** Before: all six within-family pairs failed (0.031–0.099). After: every pair ≥ 0.25; full 69-type cross-family sheet has **no pair below 0.25 involving feedback**.
| Type | Within-family distances to later types | Nearest cross-family type / distance |
| --- | --- | --- |
| 0 Halo | 0–1 .629; 0–2 .629; 0–3 .561 | Evolution Garden, planting 12 / .294 |
| 1 Portal | 1–2 .485; 1–3 .288 | Interference Rituals, composition 3 / .394 |
| 2 Weave | 2–3 .540 | Interference Rituals, composition 3 / .450 |
| 3 Procession | — | Interference Rituals, composition 1 / .403 |
Additional-resolution caveat: 1280×360 flags Portal/Procession at .204; 640×360 and 480×480 flag no within-family pairs. This is an owner-review risk, not hidden by the standard-sheet result.

## Energy ladder

**Technical ladder PASS; owner ordering/art judgement pending.** All 18 authored PNGs inspected. Fifteen-frame motion differences (0.1/.5/.9): Halo .0019/.0142/.0929; Portal .0083/.0341/.0619; Weave .0058/.0228/.0526; Procession .0043/.0136/.0363.
| Type / representative preset | Mean luminance .1 / .5 / .9 | Edge density .1 / .5 / .9 | Ladder verdict |
| --- | --- | --- | --- |
| Halo / Quiet Apse | .030 / .063 / .080 | .015 / .038 / .055 | PASS: more rings, faster breathing/travel, stronger separation/kick. |
| Portal / Prism Descent | .142 / .192 / .196 | .0165 / .0157 / .0263 | PASS structure/motion: deeper nesting and faster travel; low/mid edge proxy dips slightly. |
| Weave / Votive Loom | .134 / .154 / .151 | .020 / .023 / .030 | PASS: finer crossings, faster shear, crisper contrast/kick. |
| Procession / Molten Reliquary | .163 / .193 / .171 | .007 / .015 / .036 | PASS: more tiles, faster column flow, sharper holes/kick. |
Energy drives injector motion/detail independently of audio/persistence; signed transport retains direction. Shorter high-energy trails increase separation, not a brightness multiplier. Mean luminance need not rise: master remains the brightness control. Owner must judge Portal's low/mid ordering.

## Aspect

**PASS:** all four types inspected at 640×360, 1280×360 and 480×480; circles remain circular, the portal's vanishing point remains visible, weave/tile spacing stays native, and wide halos repeat instead of stretching. No aspect-induced letterboxing/lost subject; Halo retains an intentional dark surround. All 12 captures: GL/non-finite zero.

## Correctness and history

**PASS:** `npm test` (131 passed, 0 failed, 2 opt-in browser checks skipped); `npm run build` (47 assets); `node scripts/test-browser.mjs --only lab --port 48123` (all 104 looks nonblank, WebGL 0, non-finite 0, textures accounted; energy extremes, odd aspects and fades passed).
`node tests/feedback-gate.test.mjs --port 48123`: **PASS**, both executed checks. Each type: cut equals a second fresh reset pixel-for-pixel; two-beat fade (1 s at 120 BPM) remains nonblank and returns from 14/14 to 10/10 accounted textures; GL/non-finite zero.
Twelve-second energy-.9 witness: zero near-white pixels; subsequent motion .055/.089/.095/.063 (types 0–3). Clean Recovery also moves (.072). This is not a soak.
Shared beat **PASS**: offbeat→kick punch .0021→.0692, pulse .0102→.3366; isolated rendered differences .300/.196/.212/.233. Injection weight .8 uses the shared gesture/history path; no audio is needed.
Convex feedback: pigment ≤ .86/channel, history/injection weights sum to ≤ 1; RGBA8 rounding bounds stored channels by 220/255. Graded output/beat effects are not fed back. Contact-summary check also passed with `--port 48123 --cross artifacts/contact/feedback-cross-types`.

## Contact sheets (absolute local paths; metrics.json alongside each)

Regenerated from `main` after the merge (the lane worktree was removed).

- Types: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-types/index.html`
- All authored ladders: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-ladder/index.html`
- 640×360: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-640x360/index.html`
- 1280×360: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-1280x360/index.html`
- 480×480: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-480x480/index.html`
- Cross-family: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-cross-types/index.html`
- Cut/fade/kick gallery: `/Users/fabian/Development/phosphor/artifacts/contact/feedback-behaviour/index.html`

## Owner-only acceptance and known limits

Judge four different structures, correctly ordered ladders (especially Portal low/mid), musical usefulness, and wide/square framing including the ultra-wide near pair. Art sign-off has not been executed.

**Rig timing PASS (2026-10-08, parent):** `npm run timing -- --rig --family feedback`, Chrome on the M3 Pro (ANGLE Metal, built-in display), 1920×1080, energy 0.95, 30 s per type, while four headless lanes loaded the CPU (load average ≈ 22): p50 16.7 ms and p99 17.6 / 18.0 / 17.6 / 17.7 ms for types 0–3, max 25.5 ms, GPU errors 0, non-finite 0, no step reduction or downgrade.
Headless software rendering is correctness evidence, not art approval, rig timing, endurance or photosensitivity certification. Cuts deliberately start fresh; fades mix independent histories. Historical geometry 3 is now Procession, not the former radial mixed-stroke look. No engine/compositor/contract changes were needed.
