# Polyhedral Folding — Origami Storm

## r4: connected paper, not debris

Model: **openai-codex/gpt-6.1-sol**. The independent r3 review scored L6 / G8.5 / E6.5, Overall6.5. This revision deliberately replaces the old disconnected Platonic fan-triangle storm. It is a **kinematic connected-paper construction**, not a cloth solver or a claim of rigid/isometric origami. The old exact Platonic closure implementation is superseded; do not apply its former formal-closure claims to this renderer.

### Algorithm

Nine immutable bands share **19 longitudinal cross-sections** each. Each section has a median valley, two broad paper faces and folded-back hems. Alternating section displacement and a median offset create mountain/valley chevrons; adjacent panels use identical section coordinates, so neither development nor an accent tears a seam. Triangles provide actual facet normals, calculated from world-space derivatives, rather than normal-only fake creases. End taper gives each sheet a cut-paper silhouette.

Development blends each section from a shallow suspended sheet into an open coil, then a taller helical band. This blend changes panel dimensions: it is not a physical rigid-fold simulation. Three large bands form the authored silhouette around a **dark open cavity**. Six much smaller, dimmer bands supply depth and storm scale without confetti. Seed changes the shared angular registration. Energy controls the small-band population with a continuous size ramp, orbit/swirl speeds, and bounded paper width. There is no development-triggered flash.

| State      | Composition                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sheet (0)  | Three separate shallow-fold sheets at unequal heights/depths; matte lime/periwinkle faces, turned-back edges and projected floor shadows.                                   |
| Fold (1)   | The same connected sheets curl into open pleated coils. Inner backs and outer faces remain distinguishable.                                                                 |
| Shards (2) | Legacy state name retained for saved sets; now three sweeping helical paper bands with a visible hollow centre and a few dim satellite sheets. No disconnected shard field. |

All eight preset names, seeds, schema keys, state names, rhythm IDs, and non-development preset values remain compatible. `worlds.mjs` archives the previous definition in append-only HISTORY. The legacy `streak` control now adjusts paper width rather than metallic tails; `light` lights inner faces, not a source sprite; `density` controls small connected bands. Catalog and new DE/EN descriptions describe the new construction.

### Material, depth and camera

Palette-derived front/back dyed paper, a raking diffuse key, modest fill, dark median valleys and quiet hems. No metallic specular and no luminous bottom ball. Rare accent light belongs to selected edges and the struck median crease. Grounding retains cast silhouettes and a broad, restrained palette reflection. Shadow-plane separation is intentionally larger than a tiny epsilon to avoid scanline z-fighting on the engine's 16-bit depth buffer; it is an inexpensive projection, not a shadow map. There is no paper-on-paper shadow map.

The orbit stays at radius15.5, height9 (+2 for crane), outside the paper field. Development changes the aim/lens smoothly, not camera radius. The integrated swirl turns opposite the camera so the silhouette does not appear frozen. Camera and swirl phases remain 24-bit integrated state clocks, periodic in whole turns; raw late `u_time` does not drive geometry. Perspective, distant attenuation, scale separation, face occlusion and floor shadows provide depth. Portrait/square use short-side projection.

### Four gestures

- **Edge flash**, slot0: a count-selected paper cohort catches brief local edge accents.
- **Fold breath**, slot1: crosswise folds open/close by up to0.22 radians.
- **Core flare**, slot2: reflected light grazes resolved inner faces; no visible core sprite.
- **Crease snap / Falzschlag**, slot3: count modulo3 selects an entire coherent band (and its small companions). Its angular span compresses42%, pleat depth grows, and the crosswise V closes by0.83 radians. `smoothstep(.12,.38,envelope)` gives a fast closure, a held profile and a release. Colour is a secondary narrow seam cue; the CPU test checks average structural displacement exceeding one world unit.

Presets remain **Paper hush / Crease dance / Thousand cranes**, at **3.75 / 8 / 15 family hits per bar**. Existing syncopations and longer-loop core fills are retained. Slot3 zero-based steps: restrained6,20 of32 eighths; driving2,13 of16 eighths; accented2,10,22,30 of32 sixteenths. Durations0.9/0.9/0.7 beats provide a visible held closure. No new polyrhythm was requested; original longer-loop fills remain.

### Film iterations

`artifacts/look-review/origami-r4-round{1,2,3,4}/`: round1 revealed roofing-like regularity, overlapping bands and cropped crown; round2 contained the crown, tapered ends and separated sheets, but the middle state was small; round3 enlarged Fold, added chevrons/hems and improved diffuse face readability; round4 separated band radii/pigment and reversed swirl relative to camera. Full-size stills were read alongside every sheet. Final shadow correction removes depth-buffer striping.

Final reviewer evidence: **`artifacts/look-review/origami-r4/`** (`origami-sheet.png`, `origami-rhythm.png`, film, grids, full-size quiet/peak and a30fps event strip). The high-rate strip establishes a held structural profile that half-beat sheets alone cannot time. Extra warm-palette Paper Lanterns film: `artifacts/look-review/origami-r4-extra/`. Native matrix: `artifacts/origami-r4-verify-final/`.

### Cost and verification

**7,782 vertices ×8 floats**, including exact projected copies, versus r3's23,184×28. No hinge-array loop, extra render pass, engine change or catalog-preview rebake. Native M3 Pro whole-frame synchronous throughput including post (not venue cadence):

| Resolution | Sheet/Fold/Shards p50, ms | p95, ms         |
| ---------- | ------------------------- | --------------- |
| 1920×1080  | 1.6 / 1.8 / 1.8           | 2.2 / 2.0 / 2.1 |
| 3840×2160  | 4.5 / 4.7 / 4.6           | 4.8 / 5.1 / 5.1 |

Full-source interleaved ABBA comparison against merged main1ef13ce: 1080p p50 deltas **−15.0/−10.5/+5.6%** (peak1.8→1.9ms); 4K **−15.1/−8.3/−2.2%**. An earlier contended1080p peak measured+15.8%. Paired p95 spikes reach16.2ms: short throughput probes do not guarantee display cadence. The required shared pair was attempted but timed out: its routing replaces scene modules, not `fold-geometry.mjs`, and cannot load the old scene against the re-authored helper. The family-owned verifier routes **both** source files; no shared tool was edited to hide this limitation.

`npm test`: **1013 passed,22 skipped,0 failed**; typecheck, build, DE/EN native i18n pass. Seven family tests cover shared sections/hems, shadow correspondence, finite/bounded geometry across six seeds, reversal/continuity, phase wraps, outside camera, structural signature displacement and authored grids. Native verification covers45 palette×development×energy cases (phosphor/ember/glacier;0.1/0.5/0.9 energy; time43,200),241 reversal frames without slot reset, portrait/square/4K, frozen signature off/on and120 limiter-enabled RAF frames. Zero GL errors/non-finite uploads; all low-energy cases exceed2.5% lit pixels. The shared flash limiter is untouched; offline film is not photosensitivity certification.

**Self-assessment: L7.5, provisional Overall8.0, not an independent pass.** Material, continuity and signature event are substantially clearer; quiet framing remains simple, paper interpenetration can occur, and this is not physically rigid origami. Satellite detail and pink highlights remain intentionally subordinate. Multi-hour external-display endurance is unmeasured.
