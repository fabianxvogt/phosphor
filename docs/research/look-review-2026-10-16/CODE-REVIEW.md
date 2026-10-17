# Night code review

Reviewer: **openai-codex/gpt-6.1-sol**.

Reviewed `55cb7cc..main` at **7c6257ba8c409e8bac108fda8b8d8030d12e4ba0**, using bounded source diffs and target-module reads, not generated previews/capture archives. Also inspected unmerged owned-code deltas on `r3/garden` (f272180; owned delta unchanged from ede6a5f), `r3/laser-grid` (61bcc00), `r3/moon-tide` (15f7b43), `r3/mycelium` (e56a3b2), and `r3/unfolding` (1d3549c). These branches are moving; this is not a review of future/dirty edits. No aesthetic scores.

**Orchestrator: no critical/P0 or high/P1 finding identified. Three medium/P2 findings follow.**

## Findings

### [P2] New Living relay silently drops legitimate sequencer hits

**`scene-abyss.mjs:822–825`**, with the authored restrained loop at `scene-abyss.mjs:1210–1240` and gain in `engine-rhythm.mjs:10–12,58–59`.

The latch requires `u_rhythmHit.w > .5`, but hit is an amplitude, not a Boolean. CPU reproduction using `defaultPattern(abyss.rhythm, "restrained")` and `sampleSceneRhythm` gives hits **0.364 / 0.2184 at energy 0.5**: neither launches a relay. Even at energy 1, the loop produces **0.65 / 0.39**, so the second authored hit never launches. Moreover, accepted counts are then 1,3,5,…, so `mod(count,2)` always selects the same side, defeating the promised alternating relay. Driving at energy 0.1 also launches none of its four hits.

Recognize positive scheduled impulses independently of their velocity/gain, then apply that amplitude to the effect. Add actual latch-behaviour coverage for quiet/ordinary steps, not just sampler metadata tests.

### [P2] Leaf endpoint evaluates a fractional power of a negative sine

**`scene-mycelium.mjs:252,344–350`**; endpoint generation: **`mycelium-geometry.mjs:943–952,978`**. Also remains in the inspected unmerged Mycelium branch.

`leafWidth` computes `pow(sin(3.14159265 * clamp(u,0,1)), .75)` without guarding the base. The new mesh includes `u=1` on every leaf. In float32, the constant becomes **3.1415927410125732**; its sine is approximately **−8.742278e−8**. GLSL `pow` on a negative base is undefined, and can produce NaN positions for the terminal triangles and normal probes. A CPU float32 arithmetic reproduction yields NaN; this is a numerical-domain finding, not a GPU-render reproduction.

Clamp the sine's base nonnegative (or define the endpoint explicitly), and cover endpoint vertex outputs with a shader-side finite check. Existing CPU leaf math uses double-precision π, so its finite mesh tests do not exercise this failure.

### [P2] Adding slot 3 loses dormant tracks or rejects a previously valid locked set at capacity

**`rhythm.mjs:158–180`**, exposed by the new fourth descriptors, e.g. **`scene-abyss.mjs:1202–1241`**.

Concrete CPU reproduction: build a valid old Abyss pattern with its three known tracks plus **29 distinct valid unknown tracks**. This is the supported 32-track limit. Validate it against the new four-effect definition:

- Auto mode returns 32 tracks but silently discards the last dormant track (`future-28`), because refreshed known tracks precede dormant tracks and `.slice(0, MAX_TRACKS)` truncates them.
- The same input in locked mode throws **“Too many rhythm tracks”** while appending the new descriptor, so the older show cannot import.

The validator code itself predates this diff; the newly added descriptors activate this compatibility defect. Preserve stored dormant/locked data when introducing defaults, rather than truncating or making a formerly valid show unloadable. Current tests cover dormant preservation only below capacity.

## Checks and results

- Rhythm/control/show/engine/world CPU tests: **95 passed, 1 GPU-only test skipped**, zero failures.
- 27 changed family suites plus `tests/time.test.mjs`: **373 passed, 2 opt-in tests skipped**, zero failures.
- `tests/pipeline-flash.test.mjs`: **8 passed**, zero failures.
- `npm run typecheck`: passed. Note `checkJs:false`; this does not validate GLSL numerical domains.
- Static translation check: **2,637 EN/DE keys each**, identical key sets; every current scene rhythm preset name, effect label and effect description exists in both dictionaries.
- Imported the base commit's authored world library in memory: all **27** worlds upgrade exactly to current authored definitions; a performer-edited description remains intact.
- `rhythm.mjs`, `family-rhythm.mjs`, `control-rhythm.mjs`, `engine-rhythm.mjs`, engine, stage, preview control and **`flash-limiter.mjs` are unchanged** from the base. Added shader effects remain upstream of the existing compositor/limiter; no new production bypass found.
- `scripts/family-timing.mjs:24–45,114,126–146`: requested dimensions are bounded/validated, passed to the stage viewport, recorded separately, and compared with reported actual render dimensions before a positive verdict. No finding in this change; native size/performance measurement was not rerun.

## Limits / operational disclosure

No source edits, staging, commits, pushes, fleet calls or worktree changes. **An incorrectly selected `npm run test:i18n` was invoked before recognizing it is a browser/artifact-writing harness, violating the output-only restriction:** it wrote its usual `artifacts/i18n/` PNG evidence and timed out after reporting DE success; EN is unverified. It used the default headless SwiftShader path, not a native-GPU rig. It was not rerun, and its artifacts were not modified further. Other tests above were CPU-only/opt-in-GPU-skipped.

Unmerged deltas received static review, not branch-local test execution. No native shader compilation, transform-feedback finite-value audit, context-loss/resource soak, 12-hour rendered continuity run or performance certification was performed. CPU/non-finite-upload telemetry cannot establish that calculations _inside_ GLSL stay finite. Existing limiter coverage is full-frame mitigation, not spatial/red-flash venue certification. Lane reports already disclose 4K budget misses for Magma, Soap Foam and Nebula; those measurements were not independently reproduced here.
