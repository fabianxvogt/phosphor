# Phase Transition Theatre quality pass — 2026-09-17

Status: LOCAL PREVIEW. Classification: INCREMENTAL. This is a renderer-quality improvement, not a device-performance or visual-certification claim.

## Change

Phase Transition Theatre used a fixed 64×40 field and enlarged it directly into the stage. The new renderer keeps the deterministic field and comparison split, but chooses a bounded display raster: 128×80 at Low, 256×160 at Full, and 384×240 at HD. Bilinear sampling and a restrained local edge lift keep threshold fronts legible while preserving the existing phase model and state contract.

## Evidence

EMPIRICAL: source tests pass after the raster plan and renderer guards were added. Session coverage verifies all three Phase raster plans; existing phase arc, capture, seeded-start and finite-field checks remain unchanged. Build, distribution and whitespace validation pass.

The output remains bounded by the selected profile. No phase state or archive format changed, and the comparison divider remains a stage-space overlay.

## Limits and next check

Interpolation cannot add information absent from the 64×40 field. Recheck the Full and HD looks on the named reference device during the next sustained rehearsal, then compare the remaining authored raster families only if this pass holds up visually and within the existing timing budget.
