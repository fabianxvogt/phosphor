# Decision log

Decisions from the owner interview on 2026-10-08. Each entry records the decision and the reason. Later decisions that change an entry add a new entry rather than editing the old one. Plan and gates: [roadmap](../ROADMAP.md).

## Purpose and setting

- **D1 · Use:** VJ for other people's DJ sets. *Why:* this is the first real use; tempo, track changes and screens are not under the owner's control.
- **D2 · Control mix:** improvise, play prepared material and run hands-off, with hands-off carrying most of a night. *Why:* nobody fires clips from a trackpad for eight hours.
- **D3 · First show:** 1–3 months; planning date 2026-12-17 until a real date exists, freeze two weeks before. **Date fixed, scope flexes.** *Why:* gig dates do not move, and a few excellent families beat many unfinished ones.
- **D4 · Night length:** 4–8 hours. *Why:* sets the endurance gate at eight hours unattended.
- **D5 · Hardware:** laptop only, no MIDI controller; MIDI learn stays for later. *Why:* owner's choice; the keyboard becomes the controller.

## Output and platform

- **D6 · Output:** HDMI straight to the screen; Phosphor is the whole show; browser-only (Chrome). *Why:* no Syphon/Spout/NDI needed, so no native wrapper.
- **D7 · Screens:** any aspect ratio. Math and raymarch families compose natively; simulation families cover-crop from a fixed grid. Quality tiers become a ≈2.1 MP pixel budget. A framing test pattern helps the line check. *Why:* club LED walls are rarely 16:9.
- **D8 · Output window owns the show:** it renders at native resolution and owns show state, audio input, beat tracking and autopilot; the control window is a remote with a preview. *Why:* no stream delay on blackout, paced by the projector's 60 Hz instead of the laptop's 120 Hz, and a control-window crash or reload leaves the picture untouched.
- **D9 · Crash recovery:** grid, current clip, tempo and shared controls restore automatically; back on screen in ≤ 10 s with ≤ 2 clicks (Chrome's window-management API places the output). Autosave on edits only, never during playback. *Why:* a 3 a.m. reload must not end the night; playback is not an edit.
- **D10 · Preflight:** before Show mode, the app checks input level, beat lock, output screen, framing pattern and wake lock; a manual list covers mains power, Do Not Disturb, sleep and Chrome's "Warn before quitting". *Why:* a page cannot block Cmd+Q.

## Playing

- **D11 · Clip grid** instead of a linear score. *Why:* nobody can pre-compose cues for a DJ set they don't control.
- **D12 · Linear score retired:** cue timeline, keyframes and MIDI transport are removed; old v2 cues convert to grid clips. *Why:* less surface; the non-finite keyframe bug lives there.
- **D13 · Grid shape:** 4×8 per page on keyboard rows 1–8, Q–I, A–K and Y/Z–comma by physical position, eight pages, triggers quantized to the beat by default (or bar, or immediate), per-clip fade. *Why:* the keyboard is the controller.
- **D14 · Key map:** Shift+1–8 pages; Esc blackout; Shift+Esc safe look; Space tap; Enter downbeat; ←/→ beat nudge; ↑/↓ energy; 9 half speed, 0 double speed (again for normal); P autopilot; O freeze; hold L flash; Show/Prep switches only by button with confirmation. Labels follow the active keyboard layout. *Why:* panic and tempo stay off the grid keys.
- **D15 · Autopilot is the default:** plays autopilot-allowed clips on the current page, changes every 32 bars (16/32/64) on a bar line, avoids the last six clips; on a build raises energy, on a drop cuts to a higher-energy clip on the downbeat, on a breakdown lowers energy and halves speed, then switches to a calmer clip after eight bars. It may change clip, energy, speed trim and mirror, never master, blackout, flash or page. Manual input takes over; control returns after 32 idle bars. *Why:* pages become the owner's steering wheel for the night.
- **D16 · Show and Prep modes.** *Why:* a stray click in Show mode must not wreck a look.

## Controls

- **D17 · Shared controls:** master, energy, speed trim, hue, zoom, mirror, flash. Energy replaces audio-reactivity amount. *Why:* the same keys and faders mean the same thing in every family.
- **D18 · Family controls:** three per family on stage, all eight in Prep.
- **D19 · What a clip stores:** family, all parameters, seed, palette, base energy, fade, quantize, autopilot flag, thumbnail. Shared controls are not stored. *Why:* shared controls behave like a mixer strip.
- **D20 · Manual audio routing removed.** *Why:* family energy curves and shared beat responses define how each family reacts.

## Timing

- **D21 · Audio source:** design for a line feed from the DJ mixer via a USB interface; the microphone is a fallback where tap carries sync. *Why:* beat tracking through a mic in a loud room is unreliable.
- **D22 · Beat detection scope:** automatic tempo and beat phase; downbeat by key; builds, drops and breakdowns from loudness; no automatic phrase detection in v1. Techno/house, 4/4, 100–150 BPM with half/double folding. *Why:* downbeat and phrase detection are hard; 4/4 club music is the tractable case.
- **D23 · Own beat tracker:** low-band onset detection, tempo estimate, phase lock and coasting through breakdowns, in an AudioWorklet. *Why:* essentia.js (AGPL) and aubio (GPL) conflict with the MIT license; small MIT libraries estimate tempo without phase.
- **D24 · Manual path is required:** tap, downbeat and nudge must fully work alone; auto tracking ships only if it meets its targets on the owner's mixes. *Why:* the show cannot depend on the riskiest feature.

## Visuals

- **D25 · Generative only:** no logos, text or video. *Why:* stays out of general VJ-software scope.
- **D26 · Energy range:** every family except Aquarium reaches from very low to very high energy. *Why:* owner requirement for nights that move between warm-up and peak time.
- **D27 · Energy fader:** each family defines an energy curve; clips store a base energy; owner and autopilot push it live. Energy moves motion speed, beat response, density/detail and contrast; brightness stays on master; flashes unlock only in the top ~20 % and go through the limiter. Acceptance: an energy ladder at 0.1 / 0.5 / 0.9 the owner orders correctly at a glance. *Why:* drops can be played inside a clip, not only by switching clips.
- **D28 · Shared beat responses:** kick-driven camera punch, zoom kick, palette pulse and injection burst live in the engine; each family declares which it supports; energy scales their strength. *Why:* only Interference and Tapestry respond to the beat today.
- **D29 · Flashes:** a shared flash control behind a limiter of about three flashes per second, on by default and locked during a show. *Why:* beat-synced flashes are a club staple; photosensitivity risk is real.
- **D30 · Types:** a type is a structurally different version of a family (geometry, camera, motion grammar or layout), not a palette or parameter tweak. Three to four types per family, each spanning the full energy range. *Why:* owner requirement: types within a family must be more distinct and diverse.
- **D31 · Distinctness check:** per-family sheet of all types at the same palette and mid energy, rendered in grayscale; a structural metric (spatial frequency, edge density, symmetry, motion) flags near pairs, also across families; owner signs off. *Why:* colour must not fake difference.
- **D32 · Families:** 16 in total. Kept: Cathedral, Feedback, Interference, Tapestry, Melt, Acid. Acid absorbs Evolution Garden as a "garden" type; breeding stays as the general prep tool. Magnetic and Phase are reworked and return. Aquarium returns as the only calm-only family. New: v6 ports Fractal Flight, Julia Observatory, Fourth Dimension, Hyperbolic Loom; plus Pulse Geometry, Particle Swarm, Light Beams. Oscilloscope and Terrain are optional. *Why:* owner asked for all missing families; club gaps are hard-edged geometry, particles, beams and flythroughs.
- **D33 · Port approach:** v6 families are rebuilt as GPU scenes on contract v3, porting the idea rather than Canvas2D code. Fractal Flight's manual flying becomes authored camera paths, one per type. *Why:* WASD clashes with the keyboard grid; autopilot needs autonomous motion.
- **D34 · Authoring:** Claude breeds candidates along the energy axis and renders contact sheets; the owner picks and fine-tunes. *Why:* Claude does the search, the owner makes the artistic calls.

## Scope and process

- **D35 · Cut:** linear score and keyframes, WebM and frame-sequence export (PNG snapshots stay), MIDI clock, manual audio routing, Safari and Firefox, Milestone 3, further demo work. *Why:* none serves VJing other people's sets.
- **D36 · Required for the first show:** output-window renderer, keyboard grid, Show/Prep, tap/downbeat/nudge, energy fader and beat responses, flash limiter, crash recovery, preflight, telemetry, cover-crop for any screen, bar-count autopilot; at least six families through the gate, two strong at peak time. Auto beat tracking, build/drop autopilot and native odd-screen composition ship only if ready.
- **D37 · Family order:** (1) Cathedral, Interference, Feedback, Tapestry; (2) Pulse Geometry, Fractal Flight; (3) Melt, Acid; (4) Light Beams, Particle Swarm; (5) Julia, Fourth Dimension, Hyperbolic Loom; (6) Magnetic and Phase reworks, Aquarium. *Why:* peak-time value first, then readiness.
- **D38 · Gates:** family gate and show gate as defined in the roadmap. *Why:* explicit, measurable definitions of done.
- **D39 · Codebase:** keep `engine.mjs`, scene files and set validation; replace `app.js` with tested modules (show state, beat tracker, autopilot, output renderer, control UI) rather than refactoring in place. *Why:* much of `app.js` serves cut features.
- **D40 · Unmerged lanes:** review and merge `lane/test-harness`, then `lane/image-pipeline`, then `lane/app-core`, and build on top; score/transport parts are removed later with the score. *Why:* they already contain the flash limiter, contact sheets, soak runner, telemetry and live-show bug fixes.
- **D41 · Process:** platform changes one at a time on `main`; after contract v3, families in parallel branches, each merged only after passing its gate. CI covers unit tests, synthetic beat tests and headless render smoke; mixes, soaks and sign-off stay local. *Why:* platform contracts must settle before families build on them.
- **D42 · Schedule:** as in the roadmap, with a checkpoint on 2026-11-11 (fewer than three group 1 families passing → group 2 leaves first-show scope; Melt and Acid move up).
- **D43 · v6 set import:** only if the owner has v6 sets worth keeping; otherwise skipped.
