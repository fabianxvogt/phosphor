# Rhythm integration contract

Working agreement for the implementation of the approved 2026-10-11 interview. Application code is split by ownership; retain other workers' edits.

## Scene metadata and shader interface

`scene.rhythm` is an array of up to four effect descriptors: `{ id, slot, label, description, kind, variants?, defaults }`. `slot` is 0–3. `kind` is `accent`, `motion`, or `simulation`. `variants` optionally lists compatible values of `scene.type.key`. `defaults` is a track without `effect` (see below). Use meaningful family-specific IDs and labels. All existing families should declare at least two meaningful distinct gestures; typical slot 0 is selective display emphasis, slot 1 local motion/secondary emphasis, slot 2 slower structural change or simulation injection. Supply conservative useful defaults; no equal-count requirement.

Both shared GLSL headers expose `uniform vec4 u_rhythm, u_rhythmCount, u_rhythmHit;` and `uniform bool u_rhythmEnabled;`. `u_rhythm` holds envelope × strength × energy scaling. `u_rhythmCount` holds deterministic cumulative event indices for selecting a ribbon/root/branch/variant; `u_rhythmHit` holds newly crossed event strengths (not a continuously held envelope). Simulation hits must be consumed only once per simulation write sequence, not on every substep. `u_kick` becomes slot 0's envelope while rhythm is enabled; `u_beat` remains the unscaled music beat. Intrinsic fixed modulo beat changes should use the appropriate track event count instead. Ordinary continuous motion can retain musical beat/time.

## Pure pattern data / rhythm.mjs

Track: `{ effect, division, length, steps, strength, duration, muted }`. `division` is steps per beat: 1, 2 or 4. `length` is step count (1–256), `steps` has exactly `length` values in [0,1]; loop duration is length/division beats, capped at 64 beats. `strength` in [0,1], `duration` in beats [0.0625,8]. A step value is its accent strength; zero disables it.

Pattern: `{ mode: 'auto'|'locked', style: 'restrained'|'driving'|'accented', tracks }`.
Set: `set.rhythm = { global: Pattern, families: { [sceneId]: Pattern } }`.
Own look: optional `look.rhythm` Pattern override, null/absent means inherit family.

Required exports: `GLOBAL_EFFECTS`, `effectDefinitions(scene)` (returns scene.rhythm), `defaultPattern(definitions, style='driving')`, `initialRhythm(scenes)`, `validatePattern(value, definitions)`, `validateRhythm(value, scenes)`, `samplePattern(pattern, definitions, position, previousPosition, { style, variant }={})`.

Global descriptor slots: 0 `brightness`, 1 `zoom`, 2 `echo`, 3 `colour`. `samplePattern` returns `{ values, counts, hits, steps }` with four-element arrays keyed by slot, except `steps` may be per-effect current step indices. Position is music beat minus downbeat origin. Missing previousPosition suppresses catch-up injections. Bounded lost-frame handling emits at most one newest hit per track; it never replays an unbounded burst. Return zero values/hits for muted/unavailable effects; incompatible tracks remain stored. Counts identify triggered substructures rather than being multiplied by movement speed.

## Show / engine / UI boundary

`Show.command({ type:'rhythm', scope:'global'|'family'|'look', family?, look?, pattern, quantize:'now'|'step'|'bar' }, t)` validates/saves desired state and queues playback application. Step edits apply at next relevant subdivision; pattern/length changes on the next downbeat; strength/mute immediately. UI sets edited patterns to locked, and auto/reset explicitly release them. Repeated edits must coalesce per target without cancelling other targets.

`show.rhythmFrame(t)` returns `{ beat, origin, settings, overrides, style, enabled }`: applied settings, own-look overrides keyed by ID, phrase style, music clock coordinates, and enabled=false for safe look. `Show.status(t).rhythm` exposes desired/applied state and pending changes in a compact form suitable for the grid; document exact shape to the UI worker. Runtime snapshot/restore must preserve musical beat continuity and applied/pending patterns without losing saved edits.

Parent integrates `engine.setRhythmFrame(show.rhythmFrame(t))` before engine.advance in stage/local preview, passes `lookId` when loading slots, samples each slot with its own family/own-look pattern and variant, and applies global effects once in the compositor. Engine manages last sampled positions and per-simulation consumption. Standalone rendering defaults to authored patterns on its existing beat position, so previews/contact sheets are meaningful too.

UI owner implements `control-rhythm.mjs`, wiring in control.mjs/index.html/control.css. Keep current tokens/style and a stable keyboard-accessible grid with family section above global section. Grid uses actual performance status, not draft selection. Save own-look overrides explicitly and support an explicit draft preview path. Preserve cursor/focus while playheads update; scroll long loops and show bar/beat labels. Use the existing performer action path and existing set persistence/status handoff.

## Ownership

- Rhythm core worker: rhythm.mjs, show.mjs, show-clock.mjs, show-set.mjs, show-storage.mjs, relevant core tests.
- UI worker: control-rhythm.mjs, control.mjs, index.html, control.css, UI-specific tests.
- Family worker: existing scene-*.mjs except scene-contract.mjs; family effect descriptors, intrinsic shader mappings, family tests/docs.
- Parent: engine.mjs, scene-contract.mjs, compositor.mjs, stage.mjs, control-preview.mjs; integration, visual QA, catalog work, new-family studies after foundation, release verification.
