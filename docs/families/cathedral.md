# Cathedrals of Error — family sign-off packet

2026-10-08 · **INCREMENTAL / EMPIRICAL** · family/cathedral. Headless evidence is not owner approval or rig timing; the family remains a draft until both owner gates pass.

## Structural types
- **0 · Vaults:** forward travel through repeated pointed Gothic ribs and recessed stained-glass tracery; preset Prismatic Nave.
- **1 · Crystals:** camera orbit around a free-standing octahedral reliquary and rotating satellite facets, with a faceted chamber on wide screens; preset Opal Reliquary.
- **2 · Roses:** frontal circular rose disk with raised rings, radial mullions and lancets, repeated as an arcade on wide screens; preset Midnight Rose.
- **3 · Folded:** oblique travel through staggered diagonal planes inside a continuous diamond shell; preset Enamel Glide (also Ember Vault).

## Distinctness (480×270, grayscale, energy 0.5, 120 frames)
PASS: four declared types, no within-family pair below 0.25 (baseline: five near pairs, minimum .0723). Family-only minimum .2618; final all-family minimum .2580. The nave/folded margin needs owner judgement. Table and nearest neighbours below use the final all-family sheet; other families are untouched drafts from base 103921c.
| Type | Vaults | Crystals | Roses | Folded | Nearest cross-family |
| --- | --- | --- | --- | --- | --- |
| Vaults | — | .7111 | .4930 | .2580 | interference · composition 1: .3460 |
| Crystals | .7111 | — | .3321 | .8595 | melt · family 2: .2242 |
| Roses | .4930 | .3321 | — | .6418 | acid · composition 2: .2383 |
| Folded | .2580 | .8595 | .6418 | — | interference · composition 3: .3026 |
Seven cross-family flags below .25 (not a within-family failure): Crystals ↔ Topological Melt family 2 (.2242), Topological Melt family 3 (.2397), Evolution Garden planting 3 (.2431), Fourth Dimension shape 1 (.2443), Feedback Chapel geometry 3 (.2448).
Roses ↔ Acid Mycelium composition 2 (.2383), Acid Mycelium composition 1 (.2398). No such flags involve Vaults or Folded; owner must judge these cross-family similarities.

## Energy and 64-step governor
The real-engine probes pass ordered motion and edge density at 0.1 / 0.5 / 0.9 for all four types, with WebGL 0, non-finite 0 and accounted textures. The inspected 64-step peak PNGs retain each subject.
| Type | Mean luminance, low / mid / high | Edges, low / mid / high | Probe verdict |
| --- | --- | --- | --- |
| Vaults | .0697 / .0680 / .0706 | .0186 / .0554 / .0698 | PASS: quiet broad panes → dense advancing tracery |
| Crystals | .0312 / .0308 / .0319 | .0054 / .0080 / .0121 | PASS: smooth facets → sharp moving engraving and satellite detail |
| Roses | .0431 / .0421 / .0418 | .0268 / .0470 / .0662 | PASS: broad petals → nested rings and fine radial lead |
| Folded | .0898 / .0891 / .0906 | .0206 / .1431 / .1647 | PASS: broad folds → dense diagonal lattice and faster traversal |
Probe table: 320×180, 60 frames, 64 steps, first preset per type, fixed master; luminance stays within 4% per type. A fixed-time high-energy kick/rest comparison, with auto flash suppressed, changes mean RGB by .1529 / .0640 / .1188 / .1631 for types 0–3 through shared punch/pulse.

## Ladder and aspect results
PASS (headless, owner ordering still required): all 18 PNGs in the 480×270, 120-frame ladder inspected; all six presets have rising edges at 0.1 / 0.5 / 0.9 and mean luminance spans <5% per look. Each type's verdict is above.
PASS: every type at 640×360, 1280×360 and 480×480 (30 frames), WebGL/non-finite 0; no stretched geometry, lost main subject or empty bands. Peripheral lancets may crop in square framing. Above aspect 2.2 the crystal chamber/rose arcade fill the flanks; the initial wide 1–2 near pair (0.1777) is gone, and all three aspect sheets have no near pairs.
The separate 640×180 wide probes also pass all four types at 64 steps: ordered motion/edges, visible shared kick and accounted textures.

## Authoring and controls
Energy changes speed, detail generations, pane/engraving frequency and lead contrast; it no longer changes glow/exposure. Glow stays an authored control and master remains the shared brightness control. Shared kick weights: punch 1.2, pulse 1; no simulation injection. Enamel Still became Enamel Glide so its mid-energy preset moves.
Journey trims only the nave; bay scale sets nave/fold spacing and camera periods. Other types keep their own camera grammar. Fine lattice/engraving can alias on small renders; judge it on the LED wall. Luminance is not promised invariant for every arbitrary edited preset.

## Correctness evidence
`npm test`: 131 pass, 0 fail, one opt-in browser skip; `node tests/cathedral-render.test.mjs --port 48121 --cross artifacts/contact/cathedral-cross-family`: 2 pass, 0 fail. The wide probe also passed separately (2/2). All six authored presets remain bounded and each type has a preset.
`npm run build && node scripts/test-browser.mjs --only lab --port 48121`: PASS, 47 built assets; all 104 looks render, WebGL 0, non-finite 0, textures accounted. Every family passes energy extremes, 32:9/square/portrait and fade texture teardown.

## Local review artifacts (absolute paths; PNGs/metrics beside each sheet)
- Types: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-types/index.html`
- Cross-family: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-cross-family/index.html`
- Ladder: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-ladder/index.html`
- 16:9: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-640x360/index.html`
- Wide: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-1280x360/index.html`
- Square: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-480x480/index.html`
- 64-step probes: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-probes/metrics.json`
- Wide 64-step probes: `/Users/fabian/Development/phosphor-worktrees/family-cathedral/artifacts/contact/cathedral-wide-probes/metrics.json`

## Owner decision and limits
Judge whether the grayscale types are genuinely different, whether each ladder orders instantly and reaches warm-up through peak time, and whether the dark negative space around the reliquary/rose is desirable on venue screens. Headless stills and pixel metrics cannot approve movement, taste or long-show performance. Procedural stained glass is not physical optics; recursion is capped at four generations. The 40-step emergency tier is not an artistic approval target.
Real-GPU timing is reserved for the parent/owner: `npm run timing -- --rig --family cathedral`, alone on the reference rig; every type must have p99 ≤ 34 ms with no downgrade. No rig command was run in this lane.
