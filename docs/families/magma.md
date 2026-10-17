# Magma Rift · Magmariss

**EXPLORATORY / EMPIRICAL.** Family `magma`, number **104**, world `magma-rift`.

## Current r5 changes (2026-10-17)

**Performance blocker addressed locally; independent look acceptance still pending.** The serialized main baseline recorded Rivers at 8.1 ms. This lane removes repeated work structurally, without lowering native resolution, ray-step budgets, output dimensions or flash protection.

- **Geological material:** physical crust now uses two intersecting, seed-derived fault planes per persistent slab. Their negative-only relief and exact piecewise gradient use the already resolved plate data instead of four lattice hashes on every Newton step. Shading reuses that physical gradient. Matte fine grain remains once per bank pixel; the nested sine-rope normal is removed. Thin sharp secondary contacts replace broad rounded cell AO. Through-slab heat and broad bank spill are reduced; heat belongs under the lips, not on cool tops.
- **Framing and escarpments:** the peak is deliberately offset rather than drifting back through centre. Two angular, asymmetric ridge systems overlap the outer wall; a taller near escarpment catches localized vent-facing light. Integer angular fault harmonics close at the wrap. Sampled CPU height/gradient checks stay inside the existing 11.5 / 4.13 march allowances (empirical, not a global proof). Detail intersections are clamped behind their conservative top bound.
- **Liquid hierarchy:** a sustained narrow hot core reaches 56% of fountain height before breaking into the preserved spray packets. Cooler saturated margins surround it. Reduced lake/fountain spill and darker lake crust separate the liquid from pink illumination. The leading branching channel, yellow packets, secondary embers and later ash persist.
- **Causal signature:** rift-pressure still approaches the vent first. The cached drainage profile now supplies localized lake exposure during that passage, and a bounded throat-heating phase bridges ground arrival to the rising packet. A signed-frame feeder prototype made artificial spokes and was rejected. No annular or screen-wide flash was added.

All world/family/state/look/schema/seed/rhythm IDs and all authored grids are unchanged; no HISTORY migration. Cooling seams / Lava channels / Cinder fountain retain 2.5 / 7.75 / 14.67 family hits/bar. Slot 3 still strikes zero-based driving steps 2/10/18/26 at division 2, with 3.2-beat duration and 0.8 beat of cooling.

### r5 films and self-assessment

Six iterative change/capture/read rounds plus the final were inspected using current capture **v2**. Round 1 saved cost but kept padded contacts; round 2 removed them but exposed artificial lake spokes; round 3 rejected the spokes and exposed overly repetitive pointed ridge crowns; rounds 4–5 consolidated the escarpments and liquid hierarchy; round 6 tested exact base heights, rejected their extra cost without a visible benefit, and retained the conservative detail lower bound. Final removes the residual sine-rope normal and guards degenerate slab directions. Reverse Ember and Night Fountain/Glacier films were also read.

**Self-assessment: L7, not an independent pass.** Banks are less plastic and the sustained liquid root is clearer, but distant escarpments remain subdued/stylized, small dark horizon projections persist, and ground propagation is subtler than the rising packet. Portrait framing favours one side strongly. None of these are claimed solved by brighter bloom.

### r5 measured cost and verification

Apple M3 Pro / ANGLE Metal, native buffers verified. Final absolute synchronous probes: 60 measured frames/state, including post, asynchronous approval disabled only by the existing cost harness. This is **not** a fleet-wide serialized acceptance: other lanes were not controlled. Earlier shared-load probes missed 8 ms (up to 10.5 ms in Rivers) and remain preserved. Interleaved ABBA establishes savings despite that variability; each pair has 64 frames/candidate against main `ef5b7e9` (resolved at measurement; initial merge was `d24d3a2`).

| State    | Final 1080p p50/p95 ms | Final 4K p50/p95 ms | ABBA p50 delta 1080p / 4K |
| -------- | ---------------------- | ------------------- | ------------------------- |
| Crust    | 6.3 / 6.6              | 24.2 / 25.3         | −20.5% / −11.8%           |
| Rivers   | 6.7 / 6.9              | 24.1 / 24.7         | −13.0% / −18.2%           |
| Eruption | 6.8 / 7.0              | 23.4 / 24.4         | −10.5% / −12.8%           |

**1080p local cost probe passes; 4K still fails in every state.** Previous 4K Stage failure is not re-labelled or certified by these cost savings. No render scaling, limiter bypass or governor weakening was introduced.

- 30-second/state native 1080p Stage: p99 16.8 / 16.8 / 33.4 ms, all ≤34; actual 1920×1080, zero GPU/non-finite/page errors, zero step reductions/downgrades. Not an endurance/venue certificate.
- Native health: 33 final shots, chiefly 1920×1080, including energy .1/.5/.9, half-states, four alternate palettes, portrait and 43,200 s; zero GL/non-finite/page errors and no empty frames. Limiter-enabled 1080p smoke: 200 measured frames, p50/p95 16.7/16.7 ms, 19 live/allocated textures, zero health errors.
- CPU family suite 28/28, including exact fault-face gradients/bounds, hash-free physical relief, periodic sampled escarpments, protected geometry/governor invariants, delayed pressure, throat staging, muting and unchanged grid steps. Full suite, typecheck, native DE/EN, pipeline-flash, build and owned-file formatting verified (raw logs below).
- Final reviewer evidence: `artifacts/look-review/magma-rift-r5/` (sheet, held bar-aligned rhythm strip, films, evidence JSON, grids). Iterations `magma-rift-r5-1` through `-6` remain. Numeric/native/Stage/reversal evidence: `artifacts/checks/magma-r5/`, final probes prefixed `verified-`.

## Historical r4 algorithm (2026-10-17)

The sections below preserve the prior implementation and measurements; the r5 changes above supersede them.

One continuous raymarched volcanic field develops from cracked basalt through flowing channels into an erupting vent lake. Palette colours are ordered by luminance into a thermal ramp: dark → saturated mid-colour → accent; only the hottest matter mixes partly toward white. The Phosphor palette deliberately produces pink lava with yellow-green packet heads; Ember gives orange lava.

### Crust and drainage

- A jittered Voronoi field supplies persistent plate identities. A cached 3×3 site search finds exact nearest-site bisector distances; the CPU suite compares 60,000 probes against a 7×7 search. Sites never move with development.
- The seed-only drainage tree has three meandering trunks from the vent and two branches per trunk. Each trunk and branch starts exactly at its parent. Profiles, arrival coordinates and local along/across frames are cached at lattice corners.
- **Unlike r3, the main river no longer outlines Voronoi plates.** The drainage profile directly incises their interiors; exact Voronoi seams remain only secondary narrow fissures. Width grows monotonically with development. A channel-facing normal comes from the cached profile's bilinear gradient, rather than the nearest tile bisector.
- Negative-only angular value-noise relief roughens the physical crust. Its height and exact bilinear gradient share four hashes. The slab upper bound is unchanged. Rough dark lips sit above lava recessed by 0.22 world units in the breakdown; the groove floor is lower still, so this is exposed molten material, not emission painted on dry rock. Local bounce, contact darkening and near/far perspective reveal the channel.
- Low-gloss basalt replaces broad glossy bevels. Non-channel perimeter emission is suppressed. Channel skins, narrow tears and fine clinker variation now shade the breakdown as well as Rivers.

### Lake, ejecta and environment

- Central plates sink by seeded site into the lake. A slowly rotating angular crack field forms floes; reduced warp, narrower cracks and interrupted exposure avoid continuous decorative rails.
- The molten root reaches 30% of fountain height. Four analytically intersected paraboloid spray shells retain bounded support, but seeded column heights, angular lobes, sparse falling shells and packet-selected occupancy break the uniform cone silhouette.
- Fourteen big bombs and twelve fine droplets follow exact gravity-7 parabolas. Large wakes cover only 0.27 seconds (small wakes 0.11 seconds), taper, cool and fragment; no long ornamental luminous arcs. Heads remain incandescent. Large landings have bounded 0.55-second local flares.
- A 14-sample bounded ash volume billows above the vent, with dark dense cores and localized illumination from below. Three radial caldera ridge systems overlap behind it, with subdued sky/heat illumination and valley haze. Ridge contributions ease in outside radius 19; the plate-field upper-bound shortcut remains valid. The coarse wall slope allowance is increased to cover the new relief.

### Data, clocks and rendering bounds

The existing **128×257 RGBA32F data pass** is unchanged: row 0 stores bomb/group bounds and tree curves; two 128² tiles store plate/tree data and channel frames. It caches data, never reduced-resolution colour. The analytic fallback remains supported (not pixel-identical to the interpolated cache). No new textures, passes or engine hooks.

Three integrated clocks preserve an endless orbit (2π), flow (16 cycles) and eruption (64 cycles). New terrain/material variation is seed-anchored; existing moving fields retain their periodic phases. No development threshold triggers a one-shot event. Camera path, force-aware clearance, 2% kick FOV punch and ≤0.03-radian roll are unchanged. Governor budgets still reduce march/detail/ash work.

## States and looks

State definitions, seeds, schemas and look parameters are unchanged; no saved-world HISTORY migration is required.

| Development | State EN / DE       | Form                                                                 |
| ----------- | ------------------- | -------------------------------------------------------------------- |
| 0           | Crust / Kruste      | Dark rough banks over a recessed molten drainage channel             |
| 1           | Rivers / Flüsse     | Wider continuous drainage, flowing skins and hot local tears         |
| 2           | Eruption / Ausbruch | Foundered lake, irregular spray packets, ballistic fragments and ash |

Extra looks: Black Glass, Ember Delta, Night Fountain, Ash Column and Rift Lattice. All state presets share seed 10401 and identical non-development parameters. Energy changes flow/orbit rates, skin breakup, spray occupancy, bomb/ember population and local detail, not master brightness.

## Rhythm

All four gesture IDs and the independently authored unequal loop lengths are preserved: **Seam pulse**, **Lava surge**, **Ejecta volley**, **Rift pressure / Spaltendruck** (slot 3).

Rift pressure now travels **inward** through the dominant rifts. The narrow local heat front reaches the vent before an incandescent, denser packet climbs the column. Lake pressure is clipped to actual crack exposure, not a whole annular flash. Envelope, hit and count select progress/onset/directional emphasis without resetting physical ballistics. Muting is exactly silent. Ordinary spray is cooler and sparser between packets.

| Preset          | Family hits/bar | Slot-3 zero-based steps          | Duration  |
| --------------- | --------------- | -------------------------------- | --------- |
| Cooling seams   | 2.5             | 4, 22 / 32 at division 2         | 3 beats   |
| Lava channels   | 7.75            | 2, 10, 18, 26 / 32 at division 2 | 3.2 beats |
| Cinder fountain | 14.67           | 0, 18, 32, 51 / 64 at division 4 | 2.8 beats |

The driving signature leaves 0.8 beat to cool between packets. All bright events remain local; the shared flash limiter is unchanged.

## r4 film rounds and remaining limits

The independent r3 review was L6.5/G8.5/E7.5, Overall 7.0. Six change/capture/read rounds plus final capture were inspected, including large individual stills. Early rounds exposed flat channels and sparse spray; later rounds corrected the recessed groove floor, delayed/densified the rising packet and restricted lake pressure to cracks. A cheap triangular relief optimization produced an obvious regular texture and was rejected; the final uses seeded angular noise with an analytic gradient.

**Implementer self-assessment: L7, not an independent pass.** Main neon paving and ornamental arc failures are materially reduced, but broad banks still look stylized, the plume is wispy, distant ridge separation remains subdued, and incoming ground pressure is less immediately legible than the rising packet. The world is not claimed to have cleared the owner's ≥8 bar.

## Measured cost and verification

Native Apple M3 Pro / ANGLE Metal, shared GPU. Thirty measured frames per state, synchronous throughput including post; not display cadence. ABBA uses 64 frames/candidate against main `1ef13ce` (resolved when profiling; initial worktree merge was `7e672a3`).

| State    | 1080p p50/p95 ms | 4K p50/p95 ms | ABBA p50 delta 1080p / 4K |
| -------- | ---------------- | ------------- | ------------------------- |
| Crust    | 9.0 / 11.2       | 35.1 / 38.0   | +33.3% / +27.8%           |
| Rivers   | 9.8 / 11.1       | 34.2 / 36.9   | +17.6% / +19.0%           |
| Eruption | 8.7 / 9.5        | 31.1 / 36.3   | +1.3% / +2.6%             |

**Both absolute budgets fail.** Crust/Rivers also regress relative to r3 because physical channel/roughness work replaces its cheap planar slabs. Rejecting the regular relief optimization protected appearance, not performance. No resolution reduction or engine change was attempted. Peak-state relative cost is near neutral.

- Full CPU suite: 1015 pass / 22 skipped / 0 fail; 25 family tests pass. Typecheck, DE/EN native UI tests, family formatting, world-rhythm and pipeline-flash tests pass. CATALOG has existing whole-table formatting debt; only the owned row changed. Family tests cover exact topology/ballistics, bounds, monotone incision, analytic relief gradients, delayed pressure staging, muting and preset density.
- Native verifier: 33 shots across five developments, energies 0.1/0.5/0.9, Ember/Glacier/Cobalt/Chalk, portrait and 43,200 seconds; zero GL/non-finite errors, no empty frames. Wrap runner: no detected seams/errors at 3600/4096/43200 seconds or energy/nudge changes.
- Limiter-enabled 1080p live smoke: 200 measured RAF frames, p50/p95 16.7/16.8 ms, no GL/non-finite errors, 19 live/allocated textures (no accounting mismatch). A short smoke is not venue qualification.
- Final evidence: `artifacts/look-review/magma-rift-r4/` (film, both sheets, large stills, grids). Reverse Ember and extra Night Fountain/Glacier films: `artifacts/films/magma-r4-{reverse,extra}/`. Raw checks: `artifacts/checks/magma-r4/`.

## History

Wave 4 introduced Voronoi crust, flow-layer lava and ballistic ejecta; wave 5 replaced jets with a molten column and added cached hashes. Earlier polish introduced the drainage tree, thermal ramp, lake floes and ash. Round 3 added full authored rhythm and slot-3 pressure but remained below the independent look bar. Round 4 changes material, incision, ejecta hierarchy and pressure staging as documented above, retaining persistent seeded identity and saved-world compatibility.
