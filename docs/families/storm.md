# Thunderhead / Gewitterzelle

World `thunderhead`, scene `storm`, family **107**. **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. World ID, the eight look names/IDs and seeds, schema keys and rhythm IDs/defaults are unchanged; the three states share seed **10701** and identical non-development parameters. Tests find the world by ID.

## Polish round 2026-10-16 (wave 6)

Wave 5 left a strip of grey "crumpled foil": a black body shaded by high-frequency surface normals, lightning pasted over the cloud as screen-space tubes, a mirrored "+" of crawlers, a tiny moon and no scale. This round replaces the material, the shape and the lightning grammar. **Before/after stills at identical beats:** `artifacts/stills/before/` vs `artifacts/stills/final/` in the lane worktree (not committed).

**Pitch:** a colossal storm on a dark plain; every discharge lights the cloud *from inside*, revealing its lobes, gaps and anvil, then it falls back to a moonlit silhouette.

| State | Composition |
| --- | --- |
| Haze (0) | Telephoto view of a distant line of storms on the horizon under a large moon; sparse settlement lights on the plain. Heat lightning: frequent buried flashes wander from cell to cell and light whole parts of the bank. |
| Towers (1) | Closer, lower. Five separated convective towers with cauliflower crowns and a seeded lean, a shared flat base, deep gaps; the moon rims the crowns. Intra-cloud flashes light single towers; cloud-to-cloud leaders jump between them; the first rain shaft hangs under one tower. |
| Supercell (2) | Low wide view of the whole storm: a striated, rotating updraft ("mothership" terraces), a flanking line stepping down, an asymmetric anvil streaming downstream with mammatus underneath, rain shafts. Hero strikes fall from the forward anvil to the plain at a new seeded place every time; spider crawlers race across the anvil underside. |

The in-between states are real geometry: the bank's cells rise into towers (1), then the central tower widens and twists, the anvil spreads from its crown and the side cells slide into a flanking line (1→2). Reversal splits the anvil back into towers without a pop (filmed, `reverse.mp4`); development 1.5 is a strong held state (`hover15.mp4`).

## Cloud: shape, lattice and light

**Carrier field (`stCarrier`).** Five seeded convective cells, each a rounded cylinder with a flat base, a crown slightly wider than the stem and a seeded lean, joined by a polynomial smooth minimum. In the supercell the central cell narrows downward in stacked terraces and carries helical striations `0.55·sin(2π·0.7·y + θ − 2·phase)`; an elliptical anvil wedge (thick core, thin lifted edge, long downstream, short upstream) spreads from the main crown; an overshooting dome sits on top; mammatus pouches hang from the anvil underside (fine field only).

**Density (`stDensityAt`).** Nubis-style erosion of the carrier by two octaves of the existing 27-cell rounded cellular billows: `v = −sd + e·(billow − 0.5)`, density `smoothstep(0, 0.55, v)` (wider than two lattice nodes, so interpolation never prints the lattice). Erosion `e` is small at the base (flat dark bases), large at the crowns, laminar in the rotating updraft and shallow, sheared and fibrous in the anvil. The second octave stays below the lattice Nyquist rate.

**Camera-independent optical lattice** (precompute, RGBA32F, linear, `nearestFallback`): **128×80×64** nodes over `[-26,26]×[0.3,17.1]×[-7,23]`, atlas **1024×675**. Channels: extinction (or, outside, a negative conservative skip distance), moonlight optical depth (5 exponentially spaced taps), sky-fill visibility (2 taps toward a fill direction above the camera side) and **lightning irradiance with in-cloud attenuation** (closest point on each active channel, falloff `1/(1+0.06 d²)^1.5`, two occlusion taps along the path). Nodes far from the storm's conservative bounds store only the bound distance; nodes in a 2.2-unit band outside the carrier carry the same transport as interior nodes, so interpolation across the surface is continuous. Light taps use the cheap carrier-only density.

**Visual march (full resolution).** Sphere-tracing through empty space on the stored skip distance; at the first positive sample the crossing is bisected (3 steps) and one static interleaved-gradient dither offsets the interior samples (no depth contours, no visible grain at 4K). Interior steps `min(0.15 + 0.008t, 0.7/σ)` until transmittance < 0.03. The first four interior samples are carved at output resolution by the periodic 28³ lobe field (two octaves, sheared in the anvil, faded where lobes fall below a pixel) and darkened in their crevices. Shading per sample: three Wrenninge multiple-scattering octaves with a dual-lobe Henyey–Greenstein phase (evaluated once per pixel), a powder term, palette sky fill (secondary), town glow from below (primary), lightning irradiance (white with a trace of accent). The moon sits behind the storm: thin edges glow, thick fronts stay dark.

**Empty-space skipping is conservative.** The carrier is not 1-Lipschitz where the anvil is elliptically scaled or the updraft striated; the stored skip is divided by a local bound `L = mix(1.55,1.15,rise) + wA·mix(0.45,2.2,supercell) + 3·wM` chosen by the nearest part. `tests/storm.test.mjs` checks `|∇sd| ≤ L/0.8` on 20,000 samples (worst ratio 1.23 ≤ 1.25).

## Lightning

**Events, not fixed trees.** Four slots: 0 **stepped return** (rhythm z), 1 **autonomous storm life** (two-beat grid, energy sets the chance), 2 **crawler** (rhythm y), 3 **buried discharge** (rhythm x; between rhythm events it carries autonomous intra-cloud flicker on a one-beat grid). Each event takes a seeded tree shape (12 per slot, the existing 30-edge stepped-leader graph: 18 trunk + 3×4 branch edges, branch probability 0.78) and a seeded site from `(seed, slot, event index)`, so strikes never repeat one tree at one place; development only moves endpoints continuously. Leaders are intra-cloud/cloud-to-cloud in Haze and Towers and turn into cloud-to-ground strikes from 1.15 to 1.75; the hero stroke leaves the forward anvil in the supercell. Crawlers are one-sided chords under the anvil (never mirrored). Trunks end exactly on the ground (horizontal jitter only).

**Grammar.** The rhythm envelope is inverted analytically (`stEnvelopeTime`) to a normalised event time. Ground strikes: dim stepped leader, one return stroke, up to two restrikes, short afterglow. Intra-cloud events: three overlapping seeded pulses on a sustained glow (modulation, not on/off). **Only the return stroke feeds the broad sky/ground term — one broad pulse per event**; restrikes and flicker stay local (channel and nearby cloud). All light passes the engine's full-frame flash limiter (`flash-limiter.mjs`, which measures the presented frame).

**Drawing.** Tile masks in the cache now list only edges of active events. Each edge is drawn with two levels of seeded midpoint displacement (tortuous zigzag; masks are padded by `0.07 + 0.3·len`). Bolts are **occluded by the cloud in front of them**: the march records a piecewise log-linear transmittance and each bolt pixel looks it up at its 3D depth, so channels vanish into the cloud as a glow (which the lattice irradiance supplies) and emerge crisp below the base. Ground strikes light a pool on the plain (fields and hedgerows appear in the flash) and the rain shafts.

## Scene, camera, energy, rhythm

- **Plain:** ridge silhouette, faint moonlit sheen toward the horizon, pixel-sized settlement lights in noise-shaped clusters (primary). **Rain shafts:** analytic soft cylinders under three cells with moving streaks, forward-scattered moonlight and per-frame shaft lighting from the discharges (computed once in the cache).
- **Camera:** closed orbit as before; the storm grows toward the camera while the camera itself moves < 8 units over the whole development (z −22 → −15, height 1.6 → 0.8, focal 2.35 → 1.45), so a one-bar drop never lurches. `eye` (Storm overlook) now moves the camera lower/closer (0) or higher/farther (1). Kick punch 2% FOV.
- **Energy** changes discharge rate (autonomous chance 0.14–0.70 per two beats in the supercell, 0.35–0.85 in Haze; intra-cloud flicker 0.15–0.60 per beat), branch detail, rain density, cloud and camera rates — never exposure. At energy 0.1 the supercell is a dark moonlit silhouette with striations and rare strikes.
- **Rhythm (IDs/defaults unchanged):** `buried-discharge` (4 beats) lights one seeded cell from inside; `branch-corona` (8) is the crawler; `stepped-return` (16) is the hero ground strike.
- **Palette:** secondary for sky fill and moonlight tint, primary for town glow and lights, accent only as a trace in bolt halos and discharge light.

## Looks

Values unchanged; `eye` now changes distance as well as height, which separates the compositions.

| EN | DE | Development / composition |
| --- | --- | --- |
| Haze | Dunst | 0 · distant line of storms, heat lightning |
| Towers | Türme | 1 · separated towers, intra-cloud flashes |
| Supercell | Superzelle | 2 · whole supercell, anvil strikes |
| Heat Lantern | Wetterlaterne | 0.25 · low wide bank seen from high and far |
| Anvil Choir | Ambosschor | 1.2 · tall dense towers spreading an anvil, low close view |
| Silent Shelf | Stille Wolkenbank | 0.8 · squat dense shelf, little rain |
| Ground Current | Erdstrom | 2 · low close view under the anvil, strikes in front |
| Midnight Rotation | Mitternachtsrotation | 1.8 · the rotating storm from high and far, heavy rain |

## Cost

Apple M3 Pro / Chrome / ANGLE Metal, headless rig, after the fleet load dropped (load ≈ 12). `profile-rework-pair.mjs --families storm --reference cda9842` alternates the previous storm (identical to main's storm sources) with this revision in the same browser; two 4K runs agreed within 0.2 ms.

| State | 1080p previous → now p50 | 4K previous → now p50 |
| --- | --- | --- |
| Haze | 2.9 → **4.4 ms** | 8.0 → **11.9 ms** |
| Towers | 3.3 → **4.0 ms** | 10.0 → **11.2 ms** |
| Supercell | 3.6 → **5.6 ms** | 10.4 → **15.8 ms** |

Standard `profile-families.mjs --types --families storm --frames 60`: 1080p 3.9 / 3.8 / 5.3 ms (p95 ≤ 5.5), 4K 11.2 / 11.4 / 15.8 ms (p95 ≤ 16.2). All within the new-world budget (≤ 8 ms 1080p, ≤ 16 ms 4K), but the Supercell at 4K sits at the limit and the rework costs +12–56 % over the previous version. Measured savings that made it fit: per-frame state (cells, events, shaft light) computed once in the cache rows instead of per pixel; tile masks list only active events; lattice nodes far from the storm bounds skip all transport; lobe carving only on the first four interior samples. Under heavy fleet load (load 30–45) the same probes read 1.3–1.9× higher; those numbers are not qualification. Native shader compile ≈ 50 ms (unchanged). Software GL (SwiftShader) renders a 160×90 storm frame in ≈ 0.95 s versus 0.16 s before, because the resolution-independent lattice is heavier.

## Verification

- `tests/storm.test.mjs`, **24 CPU tests**: BigInt hash oracle; connectivity and branch statistics for all 48 tree shapes; event identity independent of development, 12 shapes in use, consecutive strikes moving; continuous and exactly reversible endpoints; heat lightning inside the bank, trunks ending exactly on the ground, hero roots in the anvil; crawlers inside the anvil and never mirrored; exact inversion of the rhythm envelope; one broad pulse per event and non-strobing intra-cloud flicker; energy-driven autonomous rate; tile-mask padding including the zigzag; monotone recorded transmittance; Henyey–Greenstein normalisation and monotone multiple scattering; local monotone lightning falloff; **conservative empty-space skipping** (|∇sd| ≤ L/0.8 on 20,000 samples); camera clearance and travel < 8 units; atlas bijection and trilinear exactness; cellular features and billow gradients; detail atlas; footprint fade; supercell-only anvil/dome and 2π-periodic striations; presets/world registration; clock continuity and integer weather harmonics.
- `scripts/verify-storm.mjs` (native GPU): 60 late frames (3600/43,200 s × energy 0.1/0.9 × developments 0/0.5/1/1.5/2 × Glacier/Ember/Phosphor): zero GL/non-finite errors, late variant ready, minimum lit fraction **13.5 %**; 72 lattice scans (8 developments × heights 0.7/1/1.2 × 3 event times): every positive node inside the march bounds (max −0.21, i.e. ≥ 0.21 inside); 72 GPU/CPU event-graph comparisons: max **1.6×10⁻⁶** world units; portrait 540×960, square 720×720 and 4K stills.
- `PHOSPHOR_STORM_GPU=1 node --test tests/browser/storm-precompute.test.mjs` (port via `PHOSPHOR_PORT`): native linear, manual nearest and uncached fallback, paused refresh, context restoration, texture accounting pass. **Gate changed:** nearest vs linear now max ≤ 4 levels / mean < 0.02 / outliers < 0.01 % (measured max 3, mean 0.004, 0.0024 % > 2 levels), because empty-space skipping and the bisected entry are threshold decisions on the interpolated field. The uncached fallback evaluates the optical function at the sample instead of interpolating nodes; it renders correctly but is not image-identical to the cache.
- `npm test` 916 pass / 21 skipped / 0 fail; `npm run typecheck`; build; `test:i18n` (software and `--native-gpu`) pass. Films: world (default, Ember, Glacier), reversal 2→0, hold at 1.5, Ground Current; 8-look energy ladder; before/after stills at beats 13.5/16.1/24.12.

## Honest review

**Rating: 7/10** (was 4.5). The material problem is solved: the clouds read as volumetric cumulonimbus with moonlit rims, cauliflower crowns and dark bases, and a discharge now lights a whole tower or the anvil from inside, which is the moment that works. The supercell has a believable silhouette (striated updraft, flanking line, streaming anvil) and strikes land somewhere new each time. Still weak: between flashes the storm is a fairly uniform dark grey (backlit moon), so quiet bars depend on the flicker; the towers in Towers look a little like rounded pillars; at 1-second sampling many frames show no visible bolt, because channels inside the cloud are now (correctly) hidden, so the lightning is less graphic than the old pasted-on tubes; the plain and rain shafts are subtle; mammatus barely reads; the Supercell at 4K uses the whole 16 ms budget. Next tests: brighter moonlit fill for quiet bars, sharper crown silhouettes, a second simultaneous ground strike at high energy.
