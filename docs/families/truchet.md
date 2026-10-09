# Truchet Tiles (77) — `scene-truchet.mjs`

Random tiles, endless paths. Every square tosses a coin between the two Smith tiles (quarter arcs around opposite corners). The arcs join into long meandering curves that never end, because every tile has an arc through every edge midpoint.

## Signature detail

- **Endless curves from coin tosses.** Closed loops and long rivers emerge from purely local random choices.
- **The 2-colouring orients everything.** The curves split the plane into two colours (band colour = coin XOR cell parity), and orienting each curve with colour 1 on its left gives every curve a consistent direction. Light pulses therefore run along all paths at once without ever meeting head-on. Tested: colours agree across every tile edge, and the flow parameter leaves one tile (1) exactly where it enters the next (0).
- **Re-routing on the beat.** Each beat some tiles re-toss (crossfaded over a quarter beat), and whole paths re-route through the field. Every 64 beats a new era re-tosses every coin.

## Variants (`variant`)

| variant | Variant                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| 0       | Smith arcs with flowing pulses and the 2-colour fill                                     |
| 1       | 10 PRINT: one diagonal per cell, the classic one-line maze                               |
| 2       | Hexagonal tiles: three 120° arcs around alternate vertices                               |
| 3       | Smith tiling in log-polar coordinates (an even number of cells around), a zooming tunnel |

## Looks

Smith Rivers, Flip Storm, Fat Loops, Pulse Field, 10 PRINT, Diagonal Maze, Hex Rivers, Hex Lace, Truchet Tunnel, Spiral Weave.

## Energy, beat, endless

- Energy: re-toss −0.1 → +0.4, pulse speed ×0.5 → ×2, pulse light −0.1 → +0.25.
- Audio: re-toss ← onset (0.12), pulse light ← high (0.1), pulse speed ← low (0.06). The shared punch/pulse is 0.6/1.
- Endless: coins re-toss every beat and every 64 beats, the camera pans and turns, and the tunnel zooms through log-space for ever.

## Cost

One analytic pass, `maxRenderWidth` 1600: two tile evaluations (before and after the flip) and up to 2 × 16 hashes to find each cell's last re-toss. Well under 1 ms on the reference GPU.

## Tests (`tests/truchet.test.mjs`)

2-colouring consistent across edges; flow continuous and oriented across edges; arcs through every edge midpoint; presets validate and cover all four tilings.
