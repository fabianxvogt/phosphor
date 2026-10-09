# Abelian Sandpile (67) — `scene-sandpile.mjs`

The Bak–Tang–Wiesenfeld sandpile. A cell with four or more grains topples and gives one grain to each of its four neighbours. Grains that fall off the board are lost. The stable result does not depend on the toppling order (the abelian property), so the GPU topples every unstable cell at once, 8 passes per 60 Hz tick, and multi-topples tall cells: each neighbour gets floor(h/4) grains.

## Signature detail

- **One colour per grain count (0–3).** This is the classic four-colour picture: a growing pile draws the fractal mandala with its D4 symmetry and nested triangles and checkerboards.
- **Avalanches.** Toppling cells burn white-hot, and recently toppled cells glow in the accent colour. On a critical board (rain), the grains dim to a carpet and the avalanches are the picture: from one cell to the whole board (self-organised criticality).
- **The identity of the sandpile group:** (2m − (2m)°)°, with m the board of all threes. A board of sixes stabilises in a storm, the subtraction leaves the famous identity fractal, it holds and breathes, then blows away.

## Variants (`drop`)

| drop | Variant                                                    | Endless by                                                                                                                                |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Centre pile(s): grains rain onto 1, 2, 3, 4 or 6 sources   | When the pile fills the board it blows away (random erosion, ~3.75 s) and regrows in the next source layout                               |
| 1    | Critical rain: random single grains everywhere             | Naturally stationary at criticality. Kicks drop heaps on random cells                                                                     |
| 2    | Wandering sources: the sources circle slowly while feeding | Same grow / blow-away cycle, with a new phase each cycle                                                                                  |
| 3    | Identity element                                           | Fill sixes → stabilise → subtract → stabilise → hold ~10 s → blow away. The next cycle uses the next board shape (16:9, square, 4:3, 2:1) |

## Looks

Mandala Bloom, Grain by Grain (big cells), Four Crowns (four sources, fast), Critical Rain, Avalanche Field (large board, big kicks), Kick Sand (every kick drops a heap), Twin Fountains, Hexagram Drift (six wandering sources), Identity, Identity Shapes.

## Energy, beat and audio

- Energy: `rate` +0.75 across the range (grain flow 150 → 2500 grains/s), `kick` +0.5, `glow` +0.4. Heap size also grows with energy.
- Beat: every beat drops a heap (`kick` × 24–640 grains), on a source or on a random cell, so avalanches land on the beat. The shared punch/pulse is 0.6/0.9.
- Audio: `rate` ← low, `glow` ← high, `kick` ← onset.

## State and cost

- 384×218 RGBA8. Rows 2–217 hold the board: 16-bit grain count (r, g) and avalanche glow (b). Row 1 holds per-column "unstable" flags (a two-pass reduction). Row 0 holds the phase, timers, grains added, the stable flag and the last beat.
- Each pass is one full-texture pass. Board cells do 5 fetches; row-1 texels loop ≤ 216 fetches; one texel loops ≤ 384. Eight passes per tick come to about 0.7 M fetches per frame. The visual pass does 6 fetches per pixel.
- Boards: 128×72, 192×108, 256×144 and 384×216 (16:9, cover-cropped on other screens).

## Tests (`tests/sandpile.test.mjs`)

CPU reference: single topples and edge loss. The parallel multi-topple equals sequential toppling on random boards (abelian). A central pile is stable, D4-symmetric and conserves grains. The 3×3 identity is 2 1 2 / 1 0 1 / 2 1 2, and e + e = e on several boards. Source layouts stay on the board, and the presets validate.
