# Acid Mycelium quality pass — 2026-09-17

Status: LOCAL PREVIEW. Classification: INCREMENTAL. This is a renderer-quality improvement, not a device-performance or visual-certification claim.

## Change

Acid Mycelium used a fixed 120×75 reaction-diffusion image and enlarged it directly into the 960×600 Full stage. The new renderer keeps that bounded simulation state but chooses a quality-aware display raster: 120×75 at Low, 240×150 at Full, and 480×300 at HD. It bilinearly samples the field and adds a restrained local edge lift before color mapping, so branch boundaries remain legible without changing the seeded simulation or adding an unbounded buffer. The explicit Gray–Scott update also maps the public diffusion control into a stable coefficient range; the previous `0.82` default amplified the alternating checkerboard mode into the hard raster seen in the low-quality pass.

## Evidence

EMPIRICAL: the source suite passes 44/44 tests. Session coverage verifies the three Acid raster plans and preserves the existing live/offline seeded-injection equality check; the core fixture now also rejects checkerboard collapse at the public diffusion ceiling. `npm run build`, `npm run check:dist`, and whitespace validation pass.

The renderer remains bounded by the selected output profile. The simulation grid is unchanged, so deterministic Acid state, portable sessions, and offline frame plans retain their prior contract.

## Limits and next check

The new raster adds interpolation and edge emphasis; it does not create information absent from the 120×75 simulation. Recheck the Full and HD looks on the named reference device during the next sustained rehearsal, alongside the existing set timing and audio-headroom evidence. The public Site still needs a successful save/deploy once its existing Sites project becomes addressable again.
