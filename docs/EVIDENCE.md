# Phosphor evidence log

Append-only, newest first. Each entry records what was executed and observed, labelled `FORMAL`, `EMPIRICAL`, `REPORTED` or `SPECULATIVE`. Entries are bounded observations, not certifications. Reference and limits: [docs](README.md).

## 2026-10-08 — Review bug batch (D53–D55) and CC-mix beat evaluation (D63)

- `INCREMENTAL / EMPIRICAL`: live test of production in fresh installed Chrome found every default clip on one palette, one linear transition, peak energy barely distinct from mid, and these show bugs: firing a clip reset energy to the clip's 0.5 (undoing autopilot build/breakdown/drop; auto-flash never reached), opening the control window paused autopilot for 32 bars, drafts in the autopilot pool, older saved sets (the owner's migrated "Living systems" set) lacking Pulse Geometry and Fractal Flight, and Escape on the fullscreen stage both blacking out and exiting fullscreen, after which the stage showed its start overlay.
- Fixes: energy is show state; load actions carry `energy` (show level) and `baseEnergy` (the clip's authored level, the engine's curve origin). Autopilot anchors each breakdown/build/drop chain and settles back 32 bars after the drop (8 simulated cycles: max 0.8, back to 0.5 before each breakdown; without the anchor it ratcheted to 1.0). The safe look's 0.15 resumes the prior level on the next clip. Page 1 holds every type of the six gated families; drafts sit on **Lab** with autopilot off; **Add missing families** fills empty Lab slots. Opening/importing no longer pauses autopilot. The stage locks Escape (`navigator.keyboard.lock`) and never re-shows UI after starting; the control pill reports **Stage not fullscreen** and a click on the stage returns.
- `scripts/family-timing.mjs` previously reached its `--level` only because a trigger reset show energy, with base = level, so energy curves never moved parameters during timing. It now sets show energy and auditions at the authored energy, so curves apply at peak. **The six gated families' rig timings predate this and must be re-run on the rig.**
- Local Chrome smoke on the built `dist`: control start showed "random · next in 31 bars"; Lab page and 24 gated clips on page 1; energy 1.0 survived six consecutive triggers; Escape → blackout with fullscreen kept; `exitFullscreen()` → overlay stayed hidden, pill "Stage not fullscreen · click the stage", one click → fullscreen and "Stage live"; an injected 10-family set listed the 7 missing families and the action placed them (Pulse/Flight autopilot-on). The suspected dropped Tapestry trigger did not reproduce (seven triggers at energy 1.0 all landed). Synthetic CDP Escape exercises the page path, not Chrome's own exit without the lock.
- Independent review: no blockers; its findings (timing runner, energy ratchet, safe-look leak, gated types missing from page 1, restored energy overwritten by `begin`, vacuous failed-family tests) were fixed with regression tests.
- **Beat tracking on CC DJ mixes (D63):** five Toucan Music netlabel mixes from Internet Archive (`metadata.licenseurl` CC BY-NC / BY-NC-ND / BY-NC-SA; 624 MB, MD5-verified, kept outside the repo in `~/Music/phosphor-cc-mixes/`), first 30 min each with `npm run beat:eval`. Scored beats: 5,947 / 5,951 within 20 ms, but only 33 % of emitted beats are scorable, and tou2017 07:00–07:30 has four scored beats at 115–116 ms (the printed "100 %" is rounded). Lock stays asserted through tracker tempo excursions to ~101–105 and 148–150 BPM; eight-beat relock and 32-bar landing are not measurable without annotations (tou2019 coasted 129 beats at constant tempo). Verdict: targets **not met / not measurable**; per D63, selecting the line input now switches the clock to manual tempo, while demo and files keep following. Single-label, software-assembled corpus. Tuning leads: rounding hides misses, lock is sticky, repeated ~101.7 BPM false-period attractor, long unscored windows (tou2016 19:00–23:30, tou2017 20:30–27:30).
- Verification: 149 unit tests passed, four opt-in probes skipped; `npm run test:browser` passed all 14 checks (software GPU, no timing gates); typecheck, build and distribution check passed.

## 2026-10-08 — Cached release blocked local controls and live grid clicks

- `INCREMENTAL / EMPIRICAL`: the reported screenshots showed the older Show/Prep UI. Browser inspection found active cache `d68a4c606536af15`, whose `control.mjs` lacks the local-performance handler, alongside a newer waiting worker. Prior fresh-context smoke checks did not cover upgrading an existing offline client.
- The exact historical release (`d9fb1de`) reproduced both failures after deploying new assets at the same origin: no-stage Blackout left preview peak RGB 223 instead of zero; clicking Cathedral left the stage on Pulse. No page errors, so exception-only checks could not catch the delivery failure.
- The standalone updater is reachable through that legacy cache as a new path. It precaches the complete release, requests activation, then navigates only after activation and client claim. It does not clear saved sets or reload another window. The stage-blocking repro kept its original clip rendering. Independent reviews found that other legacy control tabs must also block activation: otherwise their unload handler could overwrite edits made in the new generation. The final guard admits only the requesting updater window.
- Installed-Chrome checks on current controls measured actual pixels: Hue, Zoom, Mirror and Energy each changed the output; Master zero and Blackout were exact black; Freeze held pixels within one RGB level of temporal grain. Actual simulation speed measured approximately 1.01 / 0.50 / 1.97 for normal / half / double. Held Flash reached a rendered flash envelope of 0.986 and released; Safe look restored a non-black Interference render. Random off kept the renderer's authored snapshot; Random on glided it; Autopilot changed the rendered family to Pulse.
- The multi-legacy-tab fixture exposed a pre-existing `renderDevices` exception when one old control received another old control's device request. This occurred before cutover in historical `control.mjs`; it is retained in the diagnostic output, not counted as an error of the updated client. New-generation page errors are checked separately.
- Production revision `6ba2c1aae39213b6` is live at [Phosphor](https://phosphor-performance.vercel.app/), with the [standalone updater](https://phosphor-performance.vercel.app/update.html). The cached-release repro fetched the new generation's actual production bytes: both multi-window guards passed, old saved clips survived, a newly saved edit survived reload, Blackout measured exact black and a grid click rendered Cathedral on the stage. A separate anonymous fresh-profile install and the complete pictured-control pixel/clock probe passed against the public URL with zero updated-client page errors. Actual stage and no-stage screenshots were inspected.
- Verification: 144 tests passed, four opt-in probes skipped; typecheck, build, distribution verification and formatting passed. These checks do not close the external-display endurance or real-DJ-mix gates.

## 2026-10-08 — Unified local/live controls and optional settings lock

- `INCREMENTAL / EMPIRICAL`: local performance reuses `Show` and the existing editor renderer; all performer controls act without a stage. Opening the stage transfers the current performed snapshot, including unsaved parameter tweaks. Configuration remains visible and editable with a stage; **Lock settings** is optional, stage-only, and disables configuration without blocking grid triggers, performer controls, audition or export.
- Installed-Chrome smoke exercised actual rendered output: local blackout and master zero produced exact black; safe look and recovery produced non-black output; freeze held geometry with at most one RGB level of temporal-grain difference. Stage handoff retained energy 0.83, speed 0.5, master 0.73, hue 0.27, zoom 1.3, mirror 3, the live family parameter, manual 126 BPM, freeze and disabled autopilot/Random.
- Live grid clicks triggered clips; clip and set edits reached the stage. Locking disabled clip/set/audio/MIDI configuration while leaving grid and performance usable; unlocking restored editing. Control reload left the stage playing. Stage closure cleared the lock and resumed the last reported live state locally, including blackout/recovery. Zero page errors. Local and locked screenshots inspected.
- The smoke exposed a disconnect race: local rendering could resume before the one-second fallback timer restored the last stage state. Restoration now precedes fallback ticks, actions and status reads; the previously failing acknowledged-blackout handoff passed on the packaged build.
- Independent Standards and Spec reviews found three additional boundaries. The Chrome repro failed before fixes: changing the stage page redirected an editor save and raised `Duplicate clip id`; editing Acid after closing a Magnetic-playing stage left Magnetic as the actual renderer; Space on the lock switch did not toggle it. After fixes, the original page received the edit, the other page's slot was unchanged, the actual renderer was Acid, and Space enabled the lock; zero repro failures. The editor now owns a stable save target and snapshot-only edits require a matching live clip and renderer scene.
- Verification: 144 tests passed, four opt-in probes skipped; typecheck, distribution/offline verification and formatting passed. These are functional checks, not external-display endurance or real-DJ-mix acceptance.
- Both independent reviews accepted the settled fixes with no remaining actionable findings. Deployed source `317c37a` / distribution `838254288d3f2312` to [production](https://phosphor-performance.vercel.app/) as Vercel deployment `dpl_J8aRh6p3jvcmtJX1xWUuto8bMnzY` (`READY`). Installed-Chrome checks against the public URL passed the complete local/live workflow and all three review-boundary repros, with zero page errors; deployed local-control screenshot inspected.

## 2026-10-08 — Demo sound without opening the stage

- `INCREMENTAL / EMPIRICAL`: the control window reuses `AudioEngine` for the 120 BPM demo, activated by the first click or key press. No audio context is created before interaction and no microphone is requested. Stage opening/status stops local sources, including an in-flight startup; the demo resumes after stage closure if still selected. Off persists across further gestures and the heartbeat; Demo beat re-enables it; local mute uses the existing monitor gain.
- Installed-Chrome smoke measured the real signal at nodes connected to `AudioContext.destination`, not just UI flags: local demo RMS 0.0713 with only the control window open; Off yielded exact zero and stayed silent after another grid click; mute reduced destination RMS below 0.00001; unmute restored signal. Repeated activation reused one local context.
- Stage handoff: local destination signal was zero while the stage produced RMS 0.0106; after closing the stage, the local demo resumed. Zero page errors. Measurement confirms a live speaker-output signal, not physical speaker volume or a human listening assessment.
- Verification: 144 tests passed, four opt-in browser probes skipped; typecheck, build, distribution/offline verification and format check passed. Distribution revision `d68a4c606536af15`.
- Deployed source `d9fb1de` to [production](https://phosphor-performance.vercel.app/) as `dpl_YEGG67up52aGtdpcdvhpdoPSMo3h` (READY). Fresh-Chrome public-URL smoke passed the same activation, Off, mute, stage-handoff and resume checks: local RMS 0.1513, stage RMS 0.0936, local silence during stage ownership, zero page errors.

## 2026-10-08 — Selected visual preview without a stage

- `INCREMENTAL / EMPIRICAL`: the main preview reuses the editor's rendered canvas at 480×270 / 30 Hz while no live stage stream is available. No extra WebGL engine or audio context is created. A connected stage takes over the monitor; closing it restores the selected clip.
- Installed-Chrome smoke against the source: initial visual visible with only the control window open; selecting Prismatic Nave changed the main preview; opening the stage switched to live video; closing it restored the local preview with no empty overlay. Zero page errors; screenshot inspected.
- Verification: 144 tests passed, four opt-in browser probes skipped; typecheck, build, distribution/offline verification and format check passed. Distribution revision `f53a4b9398c064a5`.
- Deployed source `4812543` to [production](https://phosphor-performance.vercel.app/) as Vercel deployment `dpl_28pSHnyVyZE9bUXomugKFvQWWK6m` (READY). The same fresh-Chrome smoke passed against the public URL: initial preview without a stage, selection change, live-stream handoff and local-preview restoration; zero page errors.

## 2026-10-08 — Current VJ instrument deployed to production

- Owner requested deployment of everything; published the complete verified application distribution, not local music or generated research artifacts. `INCREMENTAL / EMPIRICAL`.
- Source `166ffbe`; distribution revision `5bf07cc48a03e25f`. `npm run build` generated 47 reachable assets; `npm run check:dist` verified 46 distribution assets and the revisioned offline cache. [CI](https://github.com/fabianxvogt/phosphor/actions/runs/37778081169) passed tests, build, distribution verification, typecheck, browser smoke, contact renders and formatting.
- Vercel production deployment `dpl_9Ai7xFKeWRKkxbLWpsXDMYsvhFCj` is READY at [phosphor-performance.vercel.app](https://phosphor-performance.vercel.app/). Uploaded only `dist`, with `.env*`, `.vercel`, `.openai` and upload metadata excluded.
- Live production smoke in fresh installed Chrome: control opened the stage; demo audio locked at 120.06 BPM; keyboard `3` selected Prismatic Nave (slot 2); Escape enabled blackout and a second Escape restored it; control preview displayed the stage; zero page errors. The deployed tracker module returned HTTP 200 and contained the new kick-body and comb-phase implementation.
- Existing offline sessions may retain the previous build until all Phosphor windows close. Deployment does not certify real DJ-mix transitions, line input or external-display eight-hour endurance; those acceptance checks remain open.

## 2026-10-08 — Beat tracker follows the kick, not the bassline

- `EMPIRICAL` Diagnosis on the owner's tracks: once the bassline enters, beat-synchronous flux per band (against a fitted constant-tempo grid) peaks on the beat only between 150 Hz and 2 kHz; below 150 Hz it peaks on the off-beat (Track C) or a sixteenth before the beat (Track A), above 2 kHz on the off-beat (open hats). The old tracker listened mostly below 150 Hz and slid half a beat (Track C after a re-acquisition at 95 s) or wandered (Track A).
- Change (`beat-tracker.mjs`): onsets weighted toward a 150–2000 Hz kick-body band (sub 0.5, hats 0.15); phase corrections from a comb over the last eight beats instead of the single strongest onset; tempo from a straight line through the last 32 observed beats; acquisition searches tempo ±1 % jointly with phase (the autocorrelation estimate is coarse at 10 ms frames: 130.45 for a 131 BPM click track).
- `EMPIRICAL` Same evaluator before → after (`npm run beat:eval -- songs/*.mp3 --constant-tempo`; one-grid fit to the agreeing kick attacks, ≥ 497 anchors per track after the change):

  | Track | Tempo jumps > 1 BPM | Phase vs constant grid: median | ≤ 20 ms |
  | --- | --- | --- | --- |
  | Track A (126 BPM) | 29 → 0 | 120 → 1.1 ms | 27 % → 100 % |
  | Track B (124 BPM) | 8 → 0 | 13 → 2.9 ms | 71 % → 94 % |
  | Track C (129 BPM) | 14 → 0 | 226 → 1.5 ms | 15 % → 99 % |

  Tempo p10/p50/p90 is now exactly 126.0 / 124.0 / 129.0; first lock ~7 s unchanged. Synthetic suite 12/12 (tempo changes relock within 8 beats, 32-bar breakdown coasts within ±6 ms, 44.1 kHz, noise never locks). The demo beat rendered offline locks at 120.00 BPM with 0 ms phase error; in installed Chrome the stage locked the demo at 120.0 BPM within 8 s. In headless SwiftShader under heavy machine load the demo did not lock (timer-driven demo scheduling starves); not a tracker result.
- Still untested: DJ mixes (tempo changes between tracks, long breakdowns on real music, line input). Auto tracking meets its phase target on three produced tracks only.

## 2026-10-08 — Owner sign-off and first real-music beat check

- Owner approved all six group 1–2 packets (D51); with rig timing passed, Feedback, Tapestry, Cathedral, Interference, Pulse Geometry and Fractal Flight pass the family gate.
- `EMPIRICAL` `npm run beat:eval` on the owner's three produced tracks (MP3 via ffmpeg, local only, `songs/` ignored by Git). Tempos are steady and right; phase is not yet good enough:

  | Track | Length | First lock | Locked | Tempo p10/p50/p90 | Phase vs kick: median / p90 | ≤ 20 ms |
  | --- | --- | --- | --- | --- | --- | --- |
  | Track A (house) | 5.9 min | 6.8 s | 98.1 % | 125.4 / 126.0 / 126.8 | 53 / 107 ms | 26 % |
  | Track B (deep house) | 7.3 min | 6.9 s | 98.4 % | 123.8 / 124.0 / 124.2 | 10 / 74 ms | 68 % |
  | Track C (house) | 6.3 min | 7.1 s | 98.1 % | 128.7 / 129.0 / 129.4 | 27 / 99 ms | 41 % |
  | Synthetic kicks, 126 BPM (control) | 1.9 min | 6.7 s | 94.2 % | 126.0 | 8 / 11 ms | 99 % |

  Phase is measured against the strongest low-band attack within ±120 ms of each predicted beat, a heuristic reference (busy basslines can pull it off the kick); the synthetic control shows its own offset is ~8 ms. Tempo jumps above 1 BPM: 29, 8 and 14. Against the < 20 ms target, automatic tracking does not yet qualify (D24); listening files: `artifacts/beat/*.clicks.wav`. These are produced tracks, not DJ mixes: relock after tempo changes and holding through a 32-bar breakdown are not tested by them.

## 2026-10-08 — Groups 1 and 2: family-gate packets

- `EMPIRICAL` Six parallel lanes (Codex Sol 6.1 xhigh, one branch and worktree per family, headless SwiftShader, own ports) rebuilt failing types and wrote packets in `docs/families/`. Within-family grayscale distinctness at 480×270 (threshold 0.25), before → after: Feedback all six pairs 0.031–0.099 → min 0.288; Tapestry 3 near pairs → min 0.454; Cathedral 5 → min 0.262; Interference 2 → three types, min 0.331 (six compositions consolidated); Pulse 1 (0.238) → min 0.334; Flight 6 → min 0.377.
- `EMPIRICAL` Cross-family flags below 0.25 in each lane's all-family sheet: none for Feedback, Interference, Flight; Tapestry's Cascade (nearest Melt 0.138), Cathedral's Crystals and Roses (0.224–0.245), Pulse's tunnel (Hyperbolic 0.168–0.210). Each of these families keeps at least three unflagged types; the flags are listed for owner judgement.
- `EMPIRICAL` Every lane: `npm test` green, headless lab render of every look (non-blank, WebGL 0, non-finite 0, textures accounted), ladders at 0.1/0.5/0.9 inspected, 640×360 / 1280×360 / 480×480 renders inspected, shared kick response measured at energy 0.9.
- `EMPIRICAL` Real GPU, parent, one family at a time (`npm run timing -- --rig`, Chrome on the M3 Pro, built-in display, 1920×1080, energy 0.95, 30 s per type, with other CPU load on the machine): every type of all six families p50 16.7 ms and p99 17.6–19.7 ms, max ≤ 34.2 ms, GPU errors 0, non-finite 0, no ray-step reduction or downgrade.
- `EMPIRICAL` Interference narrowed its composition range (0–5 → 0–2): a saved show holding a removed value no longer validates. The loader now keeps such a save under `phosphor-set-v3-unreadable` instead of letting the next edit overwrite it (unit-tested).
- Not done: owner art sign-off for any family; external-display and 8-hour show-gate runs.

## 2026-10-08 — Default mode: demo beat, Random autopilot

- `EMPIRICAL` Installed Chrome 154 on the M3 Pro, no autoplay flag, fresh profile: clicking only **Open stage** in the control left the stage's audio context running with the demo beat playing (input level 0.054); four seconds after the stage click the tracker reported 120.0 BPM, locked, confidence 1. Chrome needs that one click: no page can start sound on load alone.
- `EMPIRICAL` Headless smoke (SwiftShader, 124 s, fresh profile): demo source and 120 BPM clock before any stage click; autopilot Random on; a regular change crossfaded over 4 s (8 beats at 120 BPM); within one 40 s Acid run seven continuous parameters drifted (e.g. feed 0.0285 → 0.0268, injection 0.345 → 0.253) while the type parameter stayed fixed; page errors 0.
- `EMPIRICAL` 137/137 unit tests, including: random changes are not page order and crossfade at least 8 beats, drift starts after the fade and repeats every 8 bars, no drift during a manual take-over, in-order mode walks slots 0–7 without drift, drift stays within ±12 % of each range and never moves stepped or type fields, largest per-frame step < 1 % of the widest range, a stage fader stops a glide, a fresh stage begins on a random clip and waits a full period before the next change.

## 2026-10-08 — Platform integration for the first show

- `EMPIRICAL` Merged `lane/image-pipeline` review fixes R1–R6 (flash tracking, black frames, context-loss fence, readback order); dead frame-sequence/offline export path removed (D35). 130/130 unit tests, typecheck, build and `check:dist` (46 assets) pass.
- `EMPIRICAL` Headless Chrome 156 (SwiftShader) `test:browser`: every look renders non-blank with WebGL error 0, non-finite 0 and textures accounted; every family fade returns to one slot; all 10 show checks pass. Two defects found and fixed on the way: Light Beams "Crossfire" aimed both banks off-screen (peak 6/255 before, 211 after; also failing at `aef4269`), and the control rebuilt the shared faders on every status message, so a slider could vanish under focus or pointer (the Esc-under-slider check timed out at `aef4269` too).
- `EMPIRICAL` Throwaway stage smoke (SwiftShader): a forced link failure of the on-screen Acid clip disabled Acid, cut the stage to a Magnetic clip on the same page, struck Acid's three cells through in the grid, and a later press on an Acid key scheduled nothing; page errors 0. Shader introspection marks only Cathedral and Fractal Flight as raymarched; a per-family step budget of 40 reached the engine on load. The stage reported fullscreen, wake lock and framing-pattern facts; the Show-mode confirmation listed every check not ok.
- `EMPIRICAL` Real GPU (Chrome, ANGLE Metal, M3 Pro, built-in display, other apps running): `npm run timing -- --rig --family cathedral --seconds 10` at 1920×1080, energy 0.95: all four geometry types p50 16.7 ms, p99 17.6 ms, GPU errors 0, no step reduction or downgrade. A 10 s smoke of the runner, not the 30 s gate run; Cathedral's types may still change in its lane.
- `EMPIRICAL` The stage/control soak runner (`6ab5c33` onward) judged GPU errors, non-finite inputs and downgrades after its crash-drill reload, i.e. on a fresh page; it now reads them before the reload. Soaks from that runner before this fix verified those counters only for the post-reload seconds.
- `EMPIRICAL` On the real GPU the control reported "stage already running" for the first two seconds after load (its status clock started at 0), so a quick Open stage click did nothing; fixed. Chrome logs repeated "READ-usage buffer was written, then fenced, but written again before being read back" performance warnings from the control window's preview engine; not yet investigated.

## 2026-10-08 — Milestone 1 start

- `EMPIRICAL` Critical review in four independent lanes (fork comparison, app code review, engine/shader review, live browser audit): 12/12 unit tests, build and `check:dist` pass; 24 presets inspected live on Chrome 154 / ANGLE Metal / M3 Pro with no console errors and WebGL error 0. Artist scores: Cathedral 4/5, Magnetic and Phase 2/5, the rest 3/5; no look is a finished hero look.
- `EMPIRICAL` Balanced 1280×720 on a 120 Hz panel, Adaptive off, 10 s per look: Opal Reliquary presentation median/p95 16.7/24.6 ms, Foil Ribbon Eclipse 16.7/17.4 ms. With Adaptive on, idle playback dropped Balanced → Low: the 16 ms render gate misreads 120 Hz callbacks (fix in Milestone 1).
- `EMPIRICAL` Confirmed in source: panic keys ignored while a slider has focus; repeated MIDI connect duplicates message delivery; unclamped keyframe offset can produce NaN snapshots; float seed upload erases seed variation above ~4.85e7; `pow()` on negative bases in Aquarium/Evolution/Magnetic. All scheduled in Milestone 1.
- Release topology: `codex/performance-v2-rebuild` renamed to `main` and made the GitHub default branch; the GitHub Pages mirror and its workflow are retired (Vercel is canonical); the Canvas2D v6 source (`apps/phosphor`) is frozen and tagged `archive/v6-canvas`.

## 2026-09-07 — v2 rebuild release

Recorded at the original release; Pages references are historical.

### Executed evidence

Reference browser: headless Chromium 150, ANGLE Metal on Apple M3 Pro, macOS arm64. Tests used real WebGL2 and readback, not a mocked renderer. Headless timings are not a physical-display/projector guarantee.

- Twelve Node contract/regression tests pass: all 62 authored scene snapshots survive portable-set roundtrip; full-capacity 256-cue/32-keyframe files reopen beyond the old 2 MB limit; imported ancestry drops unsupported properties so compact imports cannot expand into self-rejecting exports; invalid nested values reject before application; keyframe boundaries and palette interpolation; exact elementary-CA fixtures/wrap; deterministic bounded mutation with exact locks; ancestry/select/undo/cap128 and portable default-generated seeds; v1 migration without changing the backup; MIDI clock and Start/Stop/Continue parser behavior.
- Static build and recursive distribution check: 20 distribution assets, local imports, complete versioned offline asset list and substituted cache stamp.
- Actual browser rendering of all 62 looks at 1920×1080 output: no GPU errors, no blank output at the sampled checkpoint. This is not a proof that every parameter combination remains aesthetically useful forever.
- All 18 Acid/Aquarium/Evolution presets ran 300 seconds of accelerated fixed model time each. Endpoint images remained structured/nonblank/nonflat, GPU error zero. This is 90 minutes of aggregate model trajectories, **not** 90 minutes of real-time app endurance, thermal load, or recording.
- Six stateful families produced identical GPU state hashes after equivalent two-second trajectories presented at 60 and 120 Hz on the same GPU. Feedback intentionally depends on presentation history and is not included in that equality claim.
- Actual CA90 GPU history matched its CPU reference at all 512 cells, including seeds 97, 16,777,217 and 2,147,483,647. The maximum seed previously produced 16 incorrect cells because float transport rounded it; a dedicated unsigned uniform now preserves the full integer. Reverse playback increased history offset by 17 while leaving the generated head/count unchanged.
- Melt periodic endpoint images differed at zero pixels on the tested GPU with fixed options/palette; static mode and analytic model do not imply portable bit-exact video.
- Twenty-five cross-scene changes returned to one slot/five textures after completed fades; transitions are bounded to two slots/nine textures. Texture counts are engine-owned targets, not all browser/encoder allocations.
- Thirty rapid interrupted fades followed by completion returned to one slot/five textures with GPU error zero. Interruptions now freeze the current ungraded mix in an existing back buffer instead of snapping to the previous incoming scene; global effects still apply once. Mixed 960/1280 shading budgets introduce small localized resampling differences, not pixel-exact continuity.
- Pause held the output; quality resize preserved it. Blackout reached black and recovered. Source parameters stayed unchanged while demo audio modulated live features. Audio recorded through a separate branch remained live after recording stopped.
- Actual portable import of an HTML-like cue name remained literal text, produced no injected image/handler, and stayed inert after reload. Locked CA rule survived sibling breeding, save and reload with ancestry.
- A synthetic two-hour wall-clock jump in sequential playback landed at the correct cue and remaining duration, rather than restarting the next cue. It tests clock catch-up, **not** a two-hour live set.
- Context-loss extension: latest cue loaded while lost, then restoration rebuilt it with structured output and GPU error zero. Restoration restarts the seed; lost evolving state is not recovered.
- Actual clean-output window received 1280×720 muted video from the control canvas. Simulated hidden-parent visibility produced 116 output-driven callbacks in two seconds. The headless browser did not naturally hide the opener, so OS/window/projector throttling still needs rehearsal.
- Actual file-system writes through an OPFS directory/file handle: 120 PNG frames plus a frozen manifest, PNG dimensions 1280×720; real WebM approximately 2.88 MB decoded 1280×720 and left the main audio context/record track live. Cancellation retained one PNG and a one-frame manifest in a unique directory; its brightness stayed .92 while live brightness changed to .24. **Native chooser UI was bypassed**; user selection, external-disk behavior and permission persistence remain unobserved.
- All four editor tabs are fully visible in a two-column grid at 390 px, without horizontal document overflow. Cue labels/inputs wrap as associated groups rather than splitting “Energy” from its value. Desktop canvas aspect ratio remained 16:9 without stretching.
- Desktop workstation layout keeps preview/transport visible beside controls while scrolling. Built offline reload loaded all ten families from 21 cached URLs with GPU error zero; clean-output fullscreen hid its controls and continued 1280×720 video.
- Rejected-save loss was reproduced before correction. After correction, malformed raw data survived edits in a downloadable recovery key; a synthetic quota failure blocked autosave and retained the original. Paused cue duration editing preserved elapsed time: 7.7 bars remaining became 11.7 after adding four bars, then resumed at 11.6. Injected MIDI protocol messages exercised the app transport and shared-control edge path; this is not physical MIDI verification.
- Shortening an already-paused cue past its elapsed time then resuming advanced immediately to the next cue; a legitimate zero remaining duration no longer restarts that cue.
- At external 200 BPM versus manual 92, a four-beat fade now lasts 1.2 seconds and both demo scheduling/readout follow 200; clock loss returns to 92. With the demo interval deliberately disabled, frame-driven scheduling maintained real analyser energy/onsets rather than decaying to silence. These are runtime clock/scheduler probes, not physical MIDI or hidden-window certification.
- A valid 5,135,572-byte exported score was rejected by the old 2 MB import limit. The shared file reader now accepts the bounded schema up to 32 MB; actual import preserved all 256 cues/32 keyframes, including the last snapshot and offset. Filling native local storage until `QuotaExceededError`, then editing a cue, produced a clear export-required status and prevented a cancelable unload event. Native closing-dialog presentation was not exercised.

### Endurance and preparation limits

An actual two-hour offline/demo/clean-output run was started against cache generation `7096c69c59d0a941`, with a 92 BPM looping score and monitoring muted. After the elapsed-time barrier, CDP evaluation failed, diagnostics hung and killed the managed tab, and a fresh tab initially also timed out. Its in-page minute samples were not recoverable. **This is an inconclusive/failed verification attempt, not a passed two-hour soak.** Browser/tooling/shared-host failure versus application failure is unresolved; no frame, memory or scene-coverage totals are claimed.

After restarting the owned automation browser, a real 65-second rapid-score run covered all ten families: zero sampled GPU errors, at most two slots/nine textures, final Low quality, 33.4 ms frame median and 358.4 ms p95. Those timings do not clear the smooth-show gate. Native UI/browser/build operations also became substantially slower on the shared host; resource contention does not excuse an unverified show.

Inspection and synchronized GPU measurement identified a bounded preparation concern: `load` submitted 120 simulation ticks synchronously (Acid measured 149.8 ms in that probe). Preparation now submits at most six ticks per callback and holds automatic fading until ready; actual GPU checks exercised 114 remaining ticks → 19 paused callbacks → ready, then fade advancement on the next live tick. All 62 looks compile/render without GPU errors; feedback starts dim and evolves rather than being prewarmed as a field. Thirty rapid interruptions plus completion returned to one slot/five textures. Later host timings were incomparable, so no numerical latency improvement is claimed.
Focused engine review caught the export consumer capturing preparation as movie frames. The exporter now completes preparation with cancellable, yielded `advance(0, true)` calls before counted frame zero. Actual Phase export wrote 120 PNGs plus its manifest; the last frame decoded at 1280×720, GPU error was zero, and the first PNG's SHA-256 exactly matched a separately prepared reset renderer. The reviewer accepted the consumer correction. Native directory-picker UI remained bypassed with a real OPFS handle.

### Public deployment

The owner-requested rebuild is live on [Vercel](https://phosphor-performance.vercel.app/), with a [GitHub Pages mirror](https://fabianxvogt.github.io/phosphor/), from [`codex/performance-v2-rebuild`](https://github.com/fabianxvogt/phosphor/tree/codex/performance-v2-rebuild). The Vercel production project is `fabianxvogts-projects/phosphor-performance`, deployed from the reviewed static `dist` directory without a server or Git integration. No paid plan was enabled. The [Pages release workflow](https://github.com/fabianxvogt/phosphor/actions/runs/37693181313) passed tests/build/distribution/upload/deploy using Node24 and supported actions. The older ChatGPT Site and `codex/v1` source remain unchanged.

Actual public-site verification: all ten families rendered with GPU error zero and no browser errors; offline reload loaded ten families from 21 cached URLs in revision `b704c71109ee6927`; the 390 px surface had no horizontal overflow and all four tabs were visible. Clean output received muted, playing 1280×720 video, entered fullscreen and hid its controls.

A real 65.8-second public rapid-score run at 120 BPM, one-bar cues, original demo analysis and muted monitoring covered all ten families through normal animation callbacks: 3,923 rendered callbacks, final Balanced quality, frame median 16.7 ms and p95 16.8 ms, no sampled GPU errors, at most two slots/nine textures. These are actual callback timings, not synthetic `advance(1/60)` timings. This is a short hosted smoke, **not** a two-hour soak, a controlled performance comparison, or physical audio/MIDI/projector certification.

Vercel-specific checks passed against the unauthenticated production alias: all ten families rendered with GPU error zero and no browser errors, offline reload used 21 URLs in revision `b704c71109ee6927`, the 390 px surface had no horizontal overflow, and fullscreen output played muted 1280×720 video with its controls hidden. The 65.8-second timed run above was on the identical GitHub Pages build, not repeated on Vercel.

### Interrupted-transition refinement

Actual Acid → Interference half-fade interrupted by Cathedral, 320×180, brightness .72, bloom .2 and kaleidoscope 3. Differences compare the displayed frame immediately before and after interruption.

| Metric, channel range 0–255  | Before | After |
| ---------------------------- | -----: | ----: |
| Mean absolute channel change | 18.192 | 0.132 |
| Maximum channel change       |     80 |     1 |

### Measured ribbon refinement

Synchronized render-plus-readback cost, 1920×1080 output. Before: 12 samples per look. After: 60 samples after warmup; ribbons shade at 960×540 and upscale through the shared compositor. Different sample sizes and transient scheduling limit comparison; these are not sustained FPS claims.

| Look                | Before median ms | After median ms | After p95 ms |
| ------------------- | ---------------: | --------------: | -----------: |
| Velvet Woven Orbit  |             38.2 |             8.2 |         10.7 |
| Foil Ribbon Eclipse |             29.7 |             8.4 |         10.9 |

Other measured default looks had lower median synchronized costs than the uncapped ribbons; preset warmup and competing GPU work produced transient spikes. Keep Balanced as the default, retain the adaptive governor, and rehearse the actual cue sequence rather than extrapolating a microbenchmark into a guarantee.

The isolated live Foil Ribbon Eclipse run at 1920×1080 output delivered 888 rendered callbacks over 15 seconds: median interval 16.7 ms, p95 16.8 ms, no adaptive downgrade or GPU error. This short real-time run is not a thermal or multi-hour endurance result. Quality changes now reset timing history rather than inheriting measurements from the old budget.

### Independent review

Ten owner-requested Sol 6.1 medium workers implemented one scene each against a shared contract. Separate engine/offline/output and workflow reviews identified integration defects; fixes cover cue identity, manual override, clock/edge semantics, source ownership, recording bounds, export snapshots, cache generations, context recovery, hidden output and responsive layout. Focused final reviews reported no additional findings in interrupted-transition buffer ownership/global grading, shading budgets, source-worker cache behavior, effective tempo, demo scheduling/teardown and recording setup. Workflow review also exposed transport edges; runtime verification and fixes followed. Review is bounded evidence, not proof that the entire application contains no defects.

Final persistence review found retained, unsupported lineage properties could inflate pretty-printed exports beyond the import bound. Canonical field whitelisting fixes it; the regression failed before and passed after. Actual browser File/DOM ingestion of an 8 MB synthetic extension produced an 8,454-byte canonical set that reopened successfully, with structured output and GPU error zero. A separate security review reported no evidence-backed finding in its bounded import/DOM/audio/output/cache read set; this is not a security certification.

