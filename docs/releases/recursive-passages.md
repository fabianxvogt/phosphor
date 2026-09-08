# Recursive passages and flight navigation

2026-09-08. **Local implementation; not published or independently accepted.** Classification: **INCREMENTAL / EMPIRICAL** product repair. No mathematical novelty claim. Public Site v6 remains the historical release; the owner's rejection of its distant-object flight remains valid.

## Behavior

The renderer now places the camera within a five-level recursive sponge that repeats across all three axes. `fractal-navigation.mjs` contains the CPU clearance model and GPU world definition. Its positive distance denotes empty space. Camera coordinates wrap at the six-unit period; this is repeated geometry with finite detail, not an infinitely unique environment.

The camera retains position, yaw and pitch. Forward/reverse translation follows the heading; strafing and vertical travel use separate controls. Drag and arrows change orientation. Hold buttons and keyboard travel stop on release; Cruise is explicit. Pause, blackout, scene changes, window blur, editing focus and reopen clear movement. Conservative bounded steps approach surfaces, and reverse can retreat from the stopping boundary. Reset returns to the entrance. Narrowing a passage around the camera triggers entrance recovery.

Portable sets and cue snapshots retain the viewpoint. Reopening and cue restoration are stationary; Cruise starts explicitly. Old v6 sets migrate to the new entrance. Old fractal frame plans are rejected rather than reinterpreted as the replacement world. New plans record the current pose and constant cruise/turn controls, excluding preceding manual camera actions. Frame rendering restores the prior saved pose and pauses the stage.

## Verification

**Final local source check: 33/33 tests passed** (`npm test`, 27.60 seconds in the last run). Source tests cover three-axis periodicity, open passages and a known solid point, heading displacement, reverse/strafe/rise, bounded collision steps and retreat, malformed pose rejection, exact pose round trips, cue snapshots, old-frame rejection, keyboard release, window blur, paused input and text-entry protection. The existing session, scene, effect and output tests remain required. Build copies the new module into the existing static distribution.

Actual browser inspection covered Cathedral Drift, Ember Nervure and Glass Orbit, and confirmed the opening recursive enclosure and a changed view after Forward, Look right and Rise. Save set and page reload retained the scene and returned with Cruise off. This is parent inspection, not independent or human artistic acceptance.

The reproducible renderer probe is `tests/fractal-browser.html` with `tests/fractal-browser.mjs`, served through the normal local development server. It is excluded from `dist`. On **Mac15,6 / macOS 26.5.1**, the in-app Chromium user agent reported Chrome 152 and WebKit WebGL:

| Observation | Result |
| --- | --- |
| Renderer size / route | 480×300; 300 fixed simulation frames, ten simulated seconds |
| Actual animation-frame interval | Median 8.3 ms; p95 9.2 ms in this bounded probe |
| Sampled route | Forward to junction, turn, lateral heading travel, reverse to junction, rise |
| Distinct sampled images | 5; returning to the same pose reproduced the same image hash |
| Minimum clearance at six sampled poses | 0.8699999999999892 units |
| PNG | 224,436 bytes; valid eight-byte PNG signature |
| WebM | 733,677 bytes; valid four-byte EBML signature |
| WebGL context loss / restore | Same-frame hash after rebuilding GPU resources |

These intervals measure the standalone bounded renderer run, not sustained full-instrument performance. The route advances at fixed simulation steps, so ten simulated seconds do not assert a ten-second video duration. Media signatures prove container creation, not complete codec, playback or app-level capture acceptance.

An additional actual instrument recording used Record → Cruise → Look right / Reverse → Stop. The downloaded synthetic clip `phosphor-fractal-1788849051702.webm` is 7,076,723 bytes with a valid EBML signature. The browser decoded it as **960×600, 53.30 seconds**. This demonstrates local app capture and a decodable artifact; it does not establish audio, every codec, or public deployment behavior. The recording remains outside Git.

## Release gates still open

1. Independent correctness and visual review against the final exact source, including input ownership, migration, collision retreat, real output and context restoration. The required Development OMP `l1_session` tool is absent from the current desktop task; no substitute reviewers were launched.
2. Broader app-level output (including PNG folder output and audio), narrow viewport, sustained named-device and performer acceptance. The source tests and short renderer probe do not clear these broader gates.
3. After acceptance: publish the reviewed source/distribution to the existing owner destinations, verify terminal deployment and public assets, and update this record with the actual source and release IDs. No new destination, spending, automation or research work is implied.

## Parent repair findings

The first candidate introduced floating-point drift when normalizing already-bounded saved coordinates. Validation now preserves those numbers exactly. A conservative collision stop initially prevented reverse movement at the stopping boundary; a bounded retreat regression found and fixed it. A source-shape check required validation to stay together before session application; camera clearance validation now resides in the transactional validator. A quick pointer tap could occur entirely between animation frames; it now provides a bounded nudge if the hold did not already move the camera.

The offline route has its own saved Cruise value: window blur or the live paused render loop cannot alter a folder-render trajectory. A regression exercises blur between successive exported frames.
