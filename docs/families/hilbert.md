# Space-filling Curves (78) — `scene-hilbert.mjs`

One unbroken line through every cell of a grid. Per pixel, the shader takes the 3×3 cells around it, finds their curve indices (xy → d) and draws the segments d → d+1 between the cell centres. The centres glide during a refinement, so the neighbourhood covers every segment that can pass by.

## Signature detail

- **One line, every cell, unit steps.** Hilbert's curve (2×2 refinement, corner to corner), Moore's closed loop (four Hilbert quarters) and Peano's original 3×3 curve. Tested on the CPU for several orders: d → xy is a bijection with its inverse, consecutive cells are always neighbours, Hilbert runs from (0,0) to (n−1,0), and Moore's last cell touches its first.
- **The construction, live.** Every 4–32 beats the curve refines to the next order: each vertex glides out of its parent cell's centre into its own (tested: every cell lies inside its parent cell of the previous order). Then it coarsens back, ping-pong, for ever.
- **Locality you can see.** Colour runs along the line by index, so neighbouring stretches of the line fill compact blocks. The locality variant fills every cell in its index colour. A comet runs the whole line.
- **An endless strip.** Mirrored copies left and right join Hilbert curves end to start.

## Variants (`variant`)

| variant | Variant                                                  |
| ------- | -------------------------------------------------------- |
| 0       | Hilbert curve, orders 1 … 7                              |
| 1       | Moore curve (closed), orders 2 … 7                       |
| 2       | Peano curve, orders 1 … 4 (up to 81 × 81)                |
| 3       | Hilbert with the locality fill (cells coloured by index) |

## Looks

Hilbert Refinement, Hilbert Strip, Deep Hilbert, Moore Loop, Moore Chase, Peano Weave, Peano Steps, Locality Blocks, Locality Flow.

## Energy, beat, endless

- Energy: colour flow ×0.5 → ×2, comet −0.1 → +0.3, width −0.05 → +0.15.
- Audio: flow ← low (0.06), comet ← onset (0.15), width ← high (0.06). The shared punch/pulse is 0.6/1.
- Endless: the refinement ping-pong is locked to the beat; colours flow and the comet loops.

## Cost

One analytic pass, `maxRenderWidth` 1600: 9 cells × (one xy → d and up to four d → xy of ≤ 7 bit steps) per pixel. About 1 ms on the reference GPU. (The cloud software renderer needs about 1.5 s per frame; looks were checked at chosen beats.)

## Tests (`tests/hilbert.test.mjs`)

Bijection, unit steps and full coverage for Hilbert (orders 1–7), Moore (2–6) and Peano (1–4). The refinement property. Endpoints and Moore closure. Presets validate and cover all four variants.
