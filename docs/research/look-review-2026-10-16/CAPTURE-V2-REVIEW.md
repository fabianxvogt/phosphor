# Capture v2 — independent protocol review

**Parent resolution:** the non-default-FPS P2 below is fixed: both `world-film.mjs` and `capture-clock.mjs` reject rates that do not divide the 60 Hz simulation tick exactly. The regression now reproduces the renderer's actual repeated whole-tick loop at 20/30/60 fps, and a CLI test verifies 24 fps is rejected before browser launch (3/3 CPU tests pass). The required 30 fps artifacts and the default-clock proof below are unchanged.

Reviewer: OpenAI coding assistant. Scope: the four specified script/test files, `docs/research/look-review-2026-10-16/RUBRIC.md`, and `artifacts/look-review/unfolding-v2/unfolding-evidence.json`; existing films/sheets were CPU-decoded solely to verify provenance, not judge art. No implementer reports read, scores assigned, source edits, staging, commits, GPU runs, or fleet calls.

## Verdict

**The current 30 fps / 126 BPM capture v2 is correctly held and bar-aligned. No blocking finding for the supplied Unfolding evidence.** One non-default-FPS test/clock gap follows.

### Finding — P2: parameterized tests do not model the actual capture loop

Locations: `scripts/world-film.mjs:159–168`, `scripts/capture-clock.mjs:1–2,19–20`, `tests/capture-clock.test.mjs:5–18`.

The helper/tests assume `beat(n) = (n+1)·bpm/(60·fps)`. The renderer actually advances `round(60/fps)` whole 60 Hz ticks per saved image. These agree at 30 and 60 fps, but not at the explicitly tested 24 fps.

**Reproduced counterexample:** at 24 fps / 126 BPM, the helper selects image 91 for beat 8; the test computes beat 8.05 and passes. The actual loop executes three ticks per image, placing image 91 at beat **9.66**. Image **76** is the actual first image on/after beat 8 (beat 8.085).

**Action:** add a CPU regression that reproduces the renderer's tick loop rather than reusing the helper's idealized equation. Either reject unsupported FPS consistently, derive picks from the actual tick schedule, or make the rendering schedule honor arbitrary FPS. This is a pre-existing renderer generalization issue exposed by the new parameterized tests; the wrapper fixes FPS at 30, so it does **not** invalidate these artifacts.

## Alignment proof at the required clock

`world-film.mjs:153,159–171` resets the film beat to zero, advances twice by `126/60/60 = 0.035` before each save, then presents. Thus zero-based saved image `n` represents beat `(n+1)·0.07`, not `n·0.07`.

For target `T = 8 + i/2`, the first eligible image is `ceil(T/0.07) − 1` (with the helper's small rounding tolerance). For every supplied pick, direct simulation of the repeated floating-point additions verified that the previous image is before its target and the chosen image is on/after it.

| Strip cell (1-based) | Target beat | Saved image (0-based) | Rendered beat |
| --- | ---: | ---: | ---: |
| 1 — bar start | 8 | 114 | 8.05 |
| 9 — bar start | 12 | 171 | 12.04 |
| 17 — bar start | 16 | 228 | 16.03 |
| 24 | 19.5 | 278 | 19.53 |

All 24 evidence indices exactly equal `rhythmFramePicks()`. Quantization delay is 0–28.571 ms, below one 33.333 ms image interval; these are first-after samples, not exact simultaneous beat exposures. Targets span three bars `[8,20)` sampled every half beat, with bar starts at cells 1/9/17 and whole beats at odd-numbered cells.

## Hold, warm-up, and actual artifacts

- Resolving the final world state through the same exported definitions gives `metamorphosis:Open Blossom`, development **2**, matching `heldDevelopment: 2` in the evidence JSON.
- `look-review-capture.mjs:104–111` requests an independent 12-second film with `--from 2 --to 2 --energy 0.85`. `world-film.mjs:127–135,161–164` therefore supplies development 2 and energy 0.85 for every saved image, independently of the sweep formula.
- The held run starts its film clock at zero and simulates the first eight beats before the first selected image: two full four-beat bars of warm-up. The zero-time compilation warm-up is separate and does not supply those bars.
- CPU `ffprobe`: held film is 360 images / 12 seconds / 30 fps; look film is 900 images / 30 seconds / 30 fps; both 960×540. Both include every required image.
- CPU reconstruction using the recorded indices and the script's exact scale/tile filters matched the saved rhythm PNG **pixel-for-pixel in decoded RGB**. Reconstructing the 12-still look sheet from images 0,75,…,825 also matched exactly. This confirms the strip is sourced from the held film, not the development-sweep film.

## Disclosure and grading

The scoped diff in commit `d24d3a2` preserves the original look-arc calculation and sheet selection. The new energy override is inactive for the ordinary look film.

`RUBRIC.md:18` explicitly discloses that v1 sampled 62% into a still-changing development sweep, was not bar-aligned, and cannot support definitive historical exact-beat/causal-motion claims. It preserves historical reviews and calls for held-v2 rechecking. The rubric diff changes capture documentation only: anchors, weights **0.6/0.15/0.25**, nearest-half rounding, and pass thresholds **Overall ≥8 and L ≥7.5** are unchanged. This is a capture-method correction, not relaxed grading or an automatic renewal of old passes.

## Tests and residual uncertainty

- `node --test tests/capture-clock.test.mjs`: **2 passed, 0 failed**. The finding above explains the limit of those passing tests.
- Independent CPU checks: default-clock loop simulation, all metadata indices, final-development resolution, encoded film metadata, and exact sheet reconstruction passed.
- The JSON records requested settings, not measured per-image engine uniforms or a capture commit/hash. Static code plus matching artifacts supports this protocol review but cannot independently certify historical runtime state or GPU backend.
- “Held final development” means overriding the world's first preset's development parameter, not loading every parameter from the last preset. That matches the continuous-world film method; it is not a full-final-preset assertion.
- Two bars are demonstrably simulated; convergence of every renderer's temporal history and engine-internal event scheduling were not audited beyond the scoped capture loop. Half-beat stills cannot prove continuous motion quality or visibility of every sixteenth-note event.
- The rubric correctly discloses disabled asynchronous flash approval in offline films. These checks establish neither live photosensitivity compliance nor native-stage performance.
