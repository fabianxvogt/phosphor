# Thunderhead / Gewitterzelle

World `thunderhead`, scene `storm`, family **107**. **Haze / Dunst → Towers / Türme → Supercell / Superzelle**. World ID, the eight look names/IDs and seeds, schema keys and rhythm IDs/defaults are unchanged; the three states share seed **10701** and identical non-development parameters. Tests find the world by ID.

## Round 3 (2026-10-16/17): colour grammar, clean lake, signature strike

Round 3 starts from the round-2 world (moonlit lake, plain, graphic bolts, below) and fixes what still read as unfinished on a club screen. Lane films: `artifacts/look-review/thunderhead-r3-{before,a..e}/` and the final review capture `artifacts/look-review/thunderhead-r3/` (sheet, rhythm sheet, film, `grids.md`).

- **Colour grammar.** Ordinary discharges are cold white-violet (`mix(0.9/0.94/1, sat(secondary), 0.12)` with 18 % accent); sky, rain and plain flash tint carry 14 % accent. The full accent is reserved for the signature strike, which floods the storm's interior with it (`flashLight` accent share 0.18 → 0.60 with the signature envelope `stSig`). Round 2 tinted every flash 65 % accent, so the storm was pink all the time and nothing could escalate.
- **Lake.** The blocky value-noise ripple normals are replaced by four long-crested analytic wave trains (integer harmonics of the weather clock, each faded once its wavelength falls below a few pixels): smooth swell, a continuous moon path, no stair-stepped glitter. The reflected storm is one undithered lattice tap at a fixed chord fraction (no IGN hatch) and never goes fully black (`mix(1, T, 0.85)`); the moon glint is added after it and only dimmed by the reflected storm edge, so the path is no longer notched.
- **Plain.** Low moonlit mist over the far plain (moon-side forward scattering plus warm town light), lamp clusters fade into their town glow with distance instead of reading as stray dashes.
- **Towers.** Weaker, smoother crevice term (0.68–1.13 instead of 0.22–1.22) and 40 % less near-surface erosion: fewer dark "craters"; flash light is no longer multiplied by the crevice term.
- **Supercell composition.** The camera comes 2 units closer in the supercell and pans 2.2 units with the downstream anvil, so the storm sits centred and fills ≈ 70 % of the width instead of leaving the left third empty.
- **Bounds.** The storm box has 2.8 (was 2.0) headroom above the highest crown: `verify-storm.mjs` found Haze bubbles 0.35 above the box at height 0.7 (a round-2 regression, now max overflow −0.04).

### Rhythm: four gestures, signature in slot 3

IDs unchanged; the three authored presets come from main's "World rhythm presets": **Distant rumble** (restrained), **Charged silence** (driving), **Forked sky** (accented).

| Slot | ID | Label EN / DE | Shader |
| --- | --- | --- | --- |
| 0 | `buried-discharge` | Buried discharge / Verborgene Entladung | `u_rhythm.x` → discharge slot 3, lights one cell from inside |
| 1 | `branch-corona` | Anvil crawler / Ambosskriecher (relabelled: it always drove the crawler) | `u_rhythm.y` → slot 2, gain 1.0 → 1.3 |
| 2 | `stepped-return` | Stepped return / Gestufter Rückstrom | `u_rhythm.z` → slot 0, hero ground strike |
| 3 | `bolt-from-the-blue` | Bolt from the blue / Blitz aus heiterem Himmel | `u_rhythm.w`, `u_rhythmCount.w` → takes over slot 1 |

**Signature, "Bolt from the blue".** While the slot-3 envelope runs, discharge slot 1 (autonomous storm life) carries a giant positive strike instead: it leaves the outer cell's crown (towers/bank) or the anvil's forward edge (supercell), alternating sides per hit, crosses clear air and lands on the plain beside the storm. All branches on, two restrikes, always cloud-to-ground (also in Haze), core 1.7× brighter with a full-accent halo, accent attachment flash, mirrored in the lake with an accent streak running down the water below the attachment point, and the storm interior flares accent. No new loops or channel storage: the envelope `stSig` travels in state texel (133, row 1). The shader inverts the envelope at nominal 1, so every style uses full-strength steps only (tested). Loops: restrained `........|........|........|......X.|........|........|....X...|......X.` (÷2, 1.8 beats), driving `......X.|........|......X.|....X.X.` (÷2, 1.4), accented `..............X.|...X............|......X.......X.|...........X..X.` (÷4, 0.9). Bright events stay local or ramp; nothing is full-screen; the shared flash limiter is untouched (`tests/pipeline-flash.test.mjs` passes).

### Round-3 cost

Headless rig, M3 Pro, **five lanes sharing the GPU** (absolute numbers inflated; wave 6 measured main at 2.9/3.3/3.6 ms 1080p unloaded). `profile-families --types`: 1080p p50/p95 Haze 7.2/7.9, Towers 9.2/10.1, Supercell 10.8/11.4 ms; 4K 17.7–25.7 / 25.2 / 24.1–31.6 ms (two runs, contention swings ±40 %). Interleaved pair vs main (`profile-rework-pair --reference main`): **+62 % / +62 % / +33 %** (Haze 5.0 → 8.1, Towers 5.2 → 8.4, Supercell 7.9 → 10.5 ms). Most of the delta is inherited from round 2 (a richer voxel pass: bubbles, scud, anvil streaks, plus sky/lake/plain); round 3 adds ≈ 0.3–0.5 ms. A probe that skipped the voxel transport costs ≈ 3 ms; the real fix is a lower-rate or lower-resolution voxel update or an engine render scale (engine change, not done here).

### Round-3 verification

`tests/storm.test.mjs` 25 pass (slot-3 gesture present, all styles ≥ 2 full-strength hits, `u_rhythm.w` used); `npm test` 956 pass / 21 skipped / 0 fail (incl. `world-rhythm`, `pipeline-flash`); `npm run typecheck`; build; `test:i18n` DE/EN pass; `verify-storm.mjs` (60 late frames, 72 bound scans, 72 graph checks, 4 aspect/4K stills) pass with min lit 58.6 %; stills at energy 0.1 (mean 28–32 / 255, no black frames), Ember/Glacier/Acid Yellow palettes, portrait 540×960; zero GL errors, no non-finite values.

### Round-3 honest review

Self-assessment **≈ 7/10** (round 2 ≈ 6.5, main 5.5). The signature strike is the phone moment and reads at a glance; flashes are no longer uniformly pink; the lake is clean. Still weak: quiet Haze bars are dark and static, the plain remains a thin dark strip, towers still show some mottling under broad flashes, the lake is a narrow band in the supercell, and the cost delta against main is large.

## Round 2 (2026-10-16): a storm in a world

Round 1 made the cloud volumetric, but it was a grey object floating on black: no sky, no ground, a flat moon disc, uniform grey between flashes, palettes reduced to beige or grey, rare and short bolts, a caterpillar of round puff bottoms, a fish-scale anvil and cotton-pillar towers. Round 2 gives the storm an environment and makes lightning the graphic hero. Lane worktree films and stills (not committed): `artifacts/films/r3/` (world, Ember, Glacier), baseline from main in the lane scratchpad, sheets `artifacts/stills/final/{before,after}-*.png`, `before-after.png`, Supercell holds `strip3-e09.png`/`strip3-e01.png`, portrait `portrait-sheet.png`, looks `looks-sheet.png`.

**Pitch:** a supercell over a moonlit lake and plain; every strike tears from the anvil to the shore and appears twice, in the sky and mirrored in the black water.

| State | Composition |
| --- | --- |
| Haze (0) | A low, wide bank sunk behind the horizon (base below eye level) with three towers rising out of it; textured moon with aureole above it; cirrus drifting across a palette sky; heat lightning mirrored in a still lake. |
| Towers (1) | A towering complex on one dark shelf: tapered columns with boiling thermal bubbles (seeded, phase-driven) and deep self-shadowed crevices; the moon low between them; cloud-to-cloud leaders across the gaps. |
| Supercell (2) | Low camera looking up; storm plus anvil ≈ 75–85 % of the width; a torn, fibrous anvil with the moon at its downstream edge; striated updraft over a flat dark shelf with ragged scud and soft rain veils; anvil-to-ground strikes with attachment flash, lit plain and their reflection. |

**Environment (visual pass, analytic):** palette night sky (deep zenith, horizon band tinted toward accent, the moon side of the sky lighter, wide aureole), warm town light domes on the horizon, a drifting two-octave cirrus deck lit by the moon and by return strokes (sheet lightning), static 1-px stars; moon disc with limb darkening, maria and cirrus veil. The moon direction is a smooth function of development, placed in the view of the orbit-free camera so it stays in frame; transport light comes from slightly beyond the disc (side light on the flanks, silver linings toward the moon). Plain: moonlit fields fading into horizon haze, town clusters (warm pool + lamps that merge into glow at distance), road threads, strike-lit pools. **Lake** from the camera to a seeded far shore: static ripple normals plus a slow swell (energy raises the chop), Fresnel, a lite sky with moon glint, the storm as one lattice sample along the reflected ray (a soft silhouette with its flash light), and **exact mirrored channels** (mirrored projections in cache row 33, mirrored tile masks in columns 64–95), so a strike's foot meets its reflection at the waterline.

**Shape:** cells carry three seeded thermal bubbles (cached once per invocation in the cache pass, omitted in far light taps), columns reach 1.6 below the base so the ragged floor ramp cuts one flat shelf; a shelf slab joins the bases (thin in Towers, full under the supercell) with scud below; Haze cells sit lower (base 1.4) and wider with towers rising; supercell base 4.0 → 4.4 (base-to-horizon gap ≈ 18–20 %); anvil radius 19 → 17.5 with a ragged low-harmonic outline, fibrous downstream streak noise instead of cellular lobes, and a gradient-normalised radial distance (near-Euclidean skip beside the anvil).

**Colour:** palette mid-tones are saturated before any white mix (moonlight `mix(sat(secondary),white,0.3)`, was 0.78 white); town underlight `sat(mix(primary,accent,0.45))` on the base; flash light inside the cloud `mix(white,sat(accent),0.65)`, so a strike recolours the storm (violet in Phosphor, orange in Ember, cyan in Glacier).

**Lightning:** cores ≥ 2 px at 1080p (`clamp(pixel·2.2, 0.0016, 0.0075)`), a windowed accent halo (`min(width·9, 0.04)`, inside the tile padding), channels inside the cloud only as scattered glow (core visibility T³). Storm life on a one-beat grid (chance 0.08 → 0.85 with energy in the supercell); between hero strokes the stepped-return slot carries autonomous anvil strikes on a two-beat grid above energy 0.3 (supercell only). Supercell 16 s hold at energy 0.9: strike light in 5 of 6 strip frames; at 0.1 mostly dark with one or two strikes.

**Cost measures** (visual pass): sky shaded after the march and only where it shows; ground, lake and rain shaded after the march (not live inside the loop); bolt loops skipped for tiles without active channels; march floor at base − 1.5; transmittance cut 0.08 with remainder fill; interior step growth with optical depth; only the first interior sample carved; fewer noise call sites (analytic fields, rain streaks, swell).

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
- **Rhythm (wave 6; see round 3 for the current four gestures):** `buried-discharge` (4 beats) lights one seeded cell from inside; `branch-corona` (8) is the crawler; `stepped-return` (16) is the hero ground strike.
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
