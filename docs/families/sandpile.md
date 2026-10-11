# Abelian Sandpile (67) — `scene-sandpile.mjs`

The Bak–Tang–Wiesenfeld sandpile. A cell with four or more grains topples and gives one grain to each of its four neighbours. Grains that fall off the board are lost. The stable result does not depend on the toppling order (the abelian property), so the GPU topples every unstable cell at once, 8 passes per 60 Hz tick, and multi-topples tall cells: each neighbour gets floor(h/4) grains.

## Signature detail

- **One colour per grain count (0–3).** This is the classic four-colour picture: a growing pile draws the fractal mandala with its D4 symmetry and nested triangles and checkerboards.
- **Avalanches.** A fresh front marks currently unstable cells and the newest ~80 ms of real toppling history. A weaker tail retains the recent half-second history. The signal interpolates toward the accent colour with bounded exposure, so dense avalanches preserve height patterns rather than clipping into a white disc. On a critical board (rain), the grains dim to a carpet and the avalanche fronts become the picture.
- **Framing follows the real pile.** Exact occupied bounds are reduced from the actual grid. A display-only camera fits them with margin, eases toward growth, and starts with a 24-cell minimum window so a young central pile is visible. Multiple sources remain in view. Critical rain shows the full board. Erosion holds the preceding view so disappearing grains do not cause a zoom into dust. The cells, sources, toppling rule and sinks remain in board coordinates; the camera cannot change them.
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

- Energy: `rate` +0.75 across the range (grain flow 150 → 2500 grains/s), `kick` +0.5, `glow` +0.4. Heap size also grows with energy. The glow remains bounded rather than adding white light to every recent cell.
- Three independent family tracks: frequent actual avalanche-front light; a stable grain-height class every three beats; and a bounded heap every eight beats by default. Heap events use `kick` × 24–640 grains, scaled by the scheduled hit, on a source or a random rain cell. Identity is incompatible with heap insertion. Muting the heap track does not stop ordinary grain feeding. Display accents do not add grains or brighten empty background cells.
- The rhythm remains on the music grid when movement speed changes. Shared punch/pulse coefficients are 0.6/0.9 when legacy beat mode is used; the common rhythm controls own the current global gestures.
- Audio: `rate` ← low, `glow` ← high, `kick` ← onset.

## State and cost

- 384×218 RGBA8. Rows 2–217 hold the board: 16-bit grain count (r, g) and avalanche glow (b). Row 1 holds per-column unstable flags in r, occupied y bounds in g/b and presence in a. Row 0 holds phase, timers, grains added, stable flag and last event; two previously unused texels hold the display camera centre and span at 16-bit precision.
- Each pass is one full-texture pass. Board cells read their own state and four neighbours; column reductions inspect up to 216 cells; stable/camera reductions inspect up to 384 columns. Framing adds metadata fetches to the visual pass. The state dimensions and eight passes per tick are unchanged; native-output cost still requires measurement.
- Boards: 128×72, 192×108, 256×144 and 384×216 (16:9, cover-cropped on other screens).

## Tests (`tests/sandpile.test.mjs`)

CPU reference: single topples and edge loss. The parallel multi-topple equals sequential toppling on random boards (abelian). A central pile is stable, D4-symmetric and conserves grains. The 3×3 identity is 2 1 2 / 1 0 1 / 2 1 2, and e + e = e on several boards. Source layouts stay on the board, and the presets validate. Display tests verify exact bounds, distant-source inclusion, grain-state preservation, fit margins on all board sizes, eased following and dissolve hold.

The 2026-10-11 visibility revision also fixes Identity initialisation: its first reset writes the required sixes before entering stabilisation. Previously the phase advanced while reset cells were still empty, skipping the initial sixes stabilisation. The identity formula and subsequent toppling remain unchanged.

Numerical/metadata checks pass. Updated moving views, high-energy exposure, complete renewal cycles, and native-output performance remain explicit visual-QA checks. Exact occupied bounds include residual grains; they do not silently hide outliers to produce a tighter crop.
