# Living Mycelium

**EXPLORATORY / EMPIRICAL**, r4, 2026-10-16. Family `mycelium`, number 99. Artistic biology, not a calibrated fungal model. World/state identities, eight preset names, seeds, parameter values and chemistry continuity remain unchanged. The r3 world-description migration remains in `worlds.mjs` HISTORY; r4 needs no additional migration.

## Algorithm

`mycelium-geometry.mjs` builds a deterministic, periodic 2.4 m forest floor once per seed. Correlated tip growth, negative autotropism, lateral branching, dichotomy and anastomosis produce a looped network. Multi-source Dijkstra supplies true nutrient distances; sink demand on the shortest-path tree sets Murray-law radii (`r³ ∝ flow`). Seed 211 retains 31,780 nodes and 2,399 fusion edges, now supporting **100 mushrooms at 34 sites** rather than 45 mushrooms. Mushroom bases remain actual graph nodes.

The original bounded Gray–Scott substrate, exact nearest chemistry stencil, extinct-region spore recovery and `gray-scott-uv16-v1` continuity token are unchanged. Development never regenerates topology or resets chemistry.

## r4 visual response to independent review

- A **3 cm crane**, 17→14 cm, stays floor-facing (pitch −0.53→−0.42 radians). The network remains the hero into the forest, rather than vanishing during a ground-level upward camera move. Closed meander, fog, litter occlusion, distant trunks and parallax remain.
- Dense multi-size fruiting clusters overlap at different depths. Fruiting begins earlier (primordia from development 0.82 plus seeded stagger) and grows continuously into the canopy. All six seeds retain conservative **>3.2 cm** camera clearance across development, scale and altitude; bases also stay >3.5 cm off the path. CPU growth/camera mirrors are updated.
- Cords have larger Murray radii, rounded cores, soft tissue halos and fine young hairs. Pixel-scaled width caps suppress the enormous flattened streaks from near or grazing-angle segments. Energy reveals additional fine lateral cohorts as well as advancing the growth front, changing foraging and adding transport trains; it is not a global brightness control.
- The broad flat ground-pool instance is removed: one mesh instance instead of two. Thread curves remain the actual generated biology, not artificial connectors.
- Cap crowns are darker with broad seeded tissue variation and irregular margins. Gills face the flight direction, have perturbed lamellar spacing, and emit underneath; stems have fine moist longitudinal highlights. Surface mottling was simplified after a filmed round looked camouflage-like.

| State      | Development grammar                                                                           |
| ---------- | --------------------------------------------------------------------------------------------- |
| Understory | Partial fans, substantial soft cords, dark litter; energy opens fine lateral cohorts.         |
| Tide       | Full fused network and weight-bearing rhizomorphs, first primordia rooted at transport sinks. |
| City       | Dense overlapping cap clusters, luminous undersides and spores; floor stays in view.          |

All colours derive from palette uniforms. Yellow-green primary, violet secondary and rare pink relay are the authored roles, not hard-coded RGB. Extra looks remain Spore Floor, Night Membrane, Tide Turning, Street Plan and Bloom Quarter. Minimum thread radius is 0.9 px at 1080p and scales with resolution; the cord width cap and halo scale too.

## Rhythm

Preset names remain **Dormant threads**, **Root signals**, **Spore chorus**. Existing IDs and slots are unchanged.

- x `reaction-front`: small tip flares. Driving now has a **12-sixteenth / three-beat** loop against the four-bar relay; accented has sixteenth-heavy fills. These stay smaller than the relay.
- y `chemical-band`: a selected-colony geodesic wave, reduced in amplitude so it does not wash out the signature.
- z `feed`: unchanged sparse bounded substrate feeds and selected-cluster spore answers.
- w `signal-relay` (**Signal relay / Signalstaffel**): a narrow accent head and fading trail move along graph distance. The same coordinate continues **up stem height and outward from the gill attachment**. A longer gill-only arrival tail retains the response while the head moves on; cap crowns do not receive the same broad tint. Uses envelope, hit and count. No development-triggered events or full-screen white; shared limiter untouched.

Relay zero-based sixteenth positions: restrained **0,30**, duration 3 beats; driving **0,36,54**, duration 2.4; accented **0,30,40,54**, duration 2.3. All envelopes settle before the next event including the seam. Full-family average hits/bar: **3.3 / 13.9 / 17.8**. Most added hits are tiny, non-structural tip accents.

## Cost and verification

Seed 211: **680,202 stored vertices / 65.3 MB**, one instance. More canopy geometry, but no second full thread/pool pass. Seed generation remains a cold-start cost.

Native ANGLE Metal / M3 Pro synchronous throughput including post, milliseconds (shared GPU; not venue cadence):

| State      | 1080p p50/p95 | 4K p50/p95  | Corrected ABBA p50 delta 1080p / 4K |
| ---------- | ------------- | ----------- | ----------------------------------- |
| Understory | 3.5 / 3.7     | 8.8 / 9.5   | −7.9% / −11.8%                      |
| Tide       | 3.7 / 4.1     | 10.2 / 11.0 | −8.1% / −4.7%                       |
| City       | 4.7 / 5.0     | 13.7 / 14.8 | +7.7% / +19.6%                      |

Absolute p50 budgets pass. City regression is real: +0.3 ms at 1080p / +1.9 ms at 4K in the paired run. The required shared pair probe was run, but its reference route omits `mycelium-geometry.mjs` and mixes main's shader with r4 topology. **Use `scripts/verify-mycelium.mjs --rig --pair --port 48460` for the corrected ABBA**, routing both owned files from main `b3510f13bc16ebdcd14a2d0c7723708daa75ca6e`.

- `npm test`: **964 pass, 21 opt-in skips, zero failures**; targeted family/world-rhythm/pipeline-flash **52/52**. Typecheck and native DE/EN i18n pass. Owned files pass Prettier.
- Limiter-enabled verifier: **25 cases**, three energies/state, five extra looks, portrait, 43,200-second time and reversal. Zero GL errors, non-finite uploads or float pixels; mesh identity retained. Low-energy raw channel >0.04 coverage: **15.3 / 20.2 / 40.7%**, with dimmer structure across the frame.
- Four saved film rounds `artifacts/look-review/mycelium-r4-round{1,2,3,4}/`, then final tissue-halo refinement and re-filming. Final **`artifacts/look-review/mycelium-r4/`** contains film, still sheet, rhythm sheet and grids. Three alternate palette films are in `mycelium-r4-palettes/`; they precede only the last halo refinement. Verifier stills/JSON: `artifacts/mycelium-r4-verify/`.

## Honest remaining limits

Self-assessment **L7.5 / G8.5 / E8 → Overall8**, not independent acceptance. The full floor and gill arrival are substantially clearer, but extreme portrait foreground caps still show mesh faceting, early-state fine strands remain stylised, and some grazing-angle cord ends are visibly straight. No true subsurface scattering or depth of field. City costs more at 4K. Independent re-review is needed; no score is written to research tables. Catalog previews are deliberately not rebaked by this lane.
