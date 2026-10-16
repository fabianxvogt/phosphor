# Laser Grid (`laser-grid`, family `laser`) — round 3 plan

Lane: r3/laser-grid, worktree `.claude/worktrees/laser-grid-r3`, ports 48520–48529. No earlier plans for this world; the independent baseline review (review-base) did not exist yet when this plan was written, so the diagnosis is my own, deliberately harsh.

## Honest score now (baseline 26e5f47, `artifacts/look-review/laser-grid-r3-before/`)

L 5.5 · G 6.5 · E 3 → Overall ≈ 5.0 (self-assessment). Fails.

## What a demanding club audience finds weak

1. **Horizon is empty** (sheet stills 1–4): one thin yellow scanner line, a grey haze band and a faint floor grid; ~70 % of the frame is plain black sky. Small-object-on-black, nothing to film.
2. **Desaturated haze** (stills 1–7): the liquid-sky sheet sits _below_ eye level near the horizon and reads as a grey smudge, not as laser light.
3. **Towers are wire boxes** (stills 6–7): uniform glowing outlines on black, see-through faces (failure pattern 2). They read as a CAD preview, not a skyline lit by lasers.
4. **Tunnel is a small centred starburst** (stills 9–12): all light converges in the middle 30 % of the frame; the cone spokes form a blue tangle; the vault is a thin box outline; the retracted towers float as tilted boxes.
5. **Rhythm is invisible** (rhythm strip): the 24 frames are nearly identical; beam address is a faint tint, the vault rib lives 0.2 beat on grid lines only, aperture breath is ±12 % of a fan nobody sees moving.

## Film-it-on-a-phone moment

The vault closes, the ceiling becomes a rippling liquid-sky sheet of laser light, and on the drop the eight tunnel lasers fire a **sixteenth chase**: one hot accent beam after another spins around the tunnel and slams into the wall next to the viewer.

## Concrete changes

1. **Liquid sky ceiling**: lift the scanning sheet above the eye (height ≈ eye + 1.6 in Horizon, rising with the vault), extend it towards the viewer, give it travelling scan bands and saturated palette tint, so the upper half of Horizon/Towers is a lit, rippling light ceiling rather than black.
2. **Horizon fan with identity**: the eight cone spokes exist in every state. In Horizon/Towers they are a fan from the horizon emitter raking the floor (energy population 1 → 8); development folds the same eight beams into the tunnel cone. Hot emitter glow at the source.
3. **Solid towers**: opaque, graded dark faces, lit window _cells_ (seeded occupancy, not continuous rows), dimmer generic outlines, brighter top edge/rim; laser impact splashes larger on façades.
4. **Tunnel depth**: continuous scan rings travelling down the cone towards the viewer (depth motion), hotter cone wall, softer apex glow; apex framed off-centre over phrases via a slow target drift (bounded).
5. **Rhythm**: slot-3 signature **Tunnel chase / Tunneljagd** (count-selected spoke flares in accent with a wide hot core, two-step afterglow tail on the previous spokes, impact flare on the wall); beam address boosts brightness/width not only tint; vault rib becomes a soft visible band on every surface (not only grid lines, also on the Horizon floor) with longer authored durations; aperture breath also opens the spokes/fan.

## Signature rhythm effect

`tunnel-chase` (slot 3, `familyEffect`): restrained = a four-step run at the end of every second bar; driving = off-beat sixteenth runs; accented = full sixteenth chase with phrase-end rolls. `u_rhythmCount.w` selects the spoke (rotating 3-step stride so the chase spins around the tunnel), `u_rhythm.w` drives intensity. Local beams only; no full-screen brightening.

## Cost risks

Tunnel at 4K was already 14.4 ms p50 in wave 5. Liquid sky is one plane (cheap). Spokes in Horizon add up to 8 beam integrals on candidate pixels (Horizon was the cheapest state, 8 ms 4K). Chase uses the existing spokes (no new beams, bounds unchanged since core width stays below the 0.4 sheath). Watch Tunnel 4K; if over budget reduce cone ring work first.

## r4

Independent review: L 6 / G 8.5 / E 7 / Overall 6.5. Clean worktree preserved; merged main (19c6522) before building. Keep IDs, looks, seeds, folded-sheet identity, haze/sheaths, rare pink shots and all three named rhythm placements. No polyrhythm requested: retain the successful grids (4.3 / 9.8 / 22 hits/bar).

Responses in reviewer priority order:

1. **Vault substance:** replace evenly emissive wirework with directional, panelled dark metal washes, seam/contact darkening, grazing light on selected bays and much dimmer distant ribs. Increase directional tower face separation and retract outlined detail under the fold. Same five isometric strips, not new geometry.
2. **Unknot peak:** distribute crossfire into separated near/middle/far same-side rakes, stagger cohorts, and open the cone's vanishing aperture (spokes begin on a small ring instead of one point). Leave a dark central portal; no extra beam loops.
3. **Intentional breakdown:** light the floor only around grazing pools and a softly broken polished mirror; suppress uniformly ruled lines, soften/dim distance. Keep the overhead liquid sky and dark ground.
4. **Spatial chase sentence:** keep clockwise adjacent-spoke selection, lower ordinary spokes/crossfire during a chase, make addressed wall sectors and end impacts legible with restrained two-step tails. Preserve bright pink punctuation without a whole-frame wash.

Film rounds: (1) material/beam geometry; (2) critique legibility and refine depth/chase; (3) final balance after reading both sheets. Then three palettes, portrait, reversal, low/mid/high energy, late time, full tests, native compilation and performance/pair. Cost risk: material adds scalar work; re-use existing masks/integrals and reduce simultaneous cohorts rather than add beams. Self-assessment remains provisional until final evidence.

### r4 film critique and decisions

- v1: centre untangled, faces now opaque, floor quieter. Still weak: small portal and flat bilateral wall wash; not an 8 yet.
- v2: shared truncated cone (virtual apex z=70, physical crown z=55) enlarges the open portal; directional inward-facing light differentiates surfaces. Full-size still exposed an accidental hourglass on each roof: x/z face classification was being applied to roof pixels.
- v3: fixed roof-face classification; added clockwise accent arcs to the existing travelling rings, competing beams rest during a chase. Read both sheets: pink motion is now isolated against the dark aperture; architecture remains graphic rather than photoreal.
- Final: compact smooth light pools replace five material exponentials; mirror only four persistent spokes plus any actively chased neighbours/tails, keeping the same conservative cache. Grid placements untouched. Final film and both sheets read again; floor remains deliberately dark, tilt during folding is still visible. Self-assessment: L 7.5–8 / G 8.5 / E 8, approximately Overall 8; independent acceptance remains pending.
- Verification resolves the brief's singular `--family` spelling to the actual profiler's `--families laser` option. No new i18n strings, IDs, world state definitions or catalog description changes were needed. No HISTORY entry, engine edits or preview rebake.

## Outcome (end of round 3)

Implemented 1–5 as planned; decisions recorded: the chase reuses the eight spokes (no new beams, bounds unchanged), `scene-laser-data.mjs` is treated as this family's geometry helper (owned), and a `scripts/verify-laser.mjs` compile probe was added. Self-assessment after four film rounds: L 7, G 8, E 7.5 → ≈ 7.5. Still weak: Tunnel remains a centred one-point-perspective composition; Horizon's lower third is a dark floor; mid-fold towers tilt like falling crates.

## Addendum after the independent baseline review (L 4.5 · G 2 · E 3.5 → 4.0)

Its weaknesses ("static wireframe outlines with no volumetric beams or haze; no floor reflection; no hero element") were answered with: 1.33× beam sheath scattering, a polished floor mirroring the scanner and eight spokes (tile-culled, chase colour included), and projector-lit structural lines instead of uniform outline glow. Rounds v5–v7. Self-assessment unchanged at ≈ 7.5 (L 7, G 8, E 7.5); pair cost vs main rose to ×1.43 / 1.32 / 1.12.
