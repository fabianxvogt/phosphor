# Langton's Ant (73) — `scene-turmite.mjs`

An ant on a grid of coloured cells turns right or left according to the colour under it (one letter of the rule per colour), advances that cell's colour by one and steps forward. The grid is a 320×180 torus stored in the state texture (colour index and flip glow per cell). Row 180 holds up to 12 ants (position and heading) and a meta texel. Every simulation pass moves each ant one step, 48 passes per frame at full speed, about 2 900 steps per second.

## Signature detail

- **The highway.** With rule RL (Langton's ant) the ant makes about 10 000 steps of apparent chaos. Then, out of nowhere, it builds a highway: a 104-step cycle that carries it two cells diagonally for ever. Tested on the CPU: from step 10 200 on, every 104 steps shift the ant by (±2, ±2); before 9 000 that almost never happens.
- **It never settles.** On the torus the highway wraps around and crashes into the old debris, which makes new chaos and, eventually, a new highway.
- **Other rules, other worlds.** LLRR grows a bloom that is exactly mirror-symmetric every time the ant comes home (tested). LRRRRRLLR fills a growing square, RRLLLRLLLRRR builds a triangle, RLR grows chaotically, and LLRRRLRLRLLR builds a convoluted highway.
- **The path reads at once.** Fresh flips glow and fade, and the ants are bright heads with a nose pointing where they go. Several ants share the grid and wreck or join each other's highways.

## Variants (`rule`)

| rule | Variant                                   |
| ---- | ----------------------------------------- |
| 0    | RL: Langton's ant, chaos then the highway |
| 1    | LLRR: symmetric bloom                     |
| 2    | LRRRRRLLR: square filler                  |
| 3    | RRLLLRLLLRRR: growing triangle            |
| 4    | RLR: chaotic growth                       |
| 5    | LLRRRLRLRLLR: convoluted highway          |

## Looks

Langton's Highway, Highway Crash, Ant Colony, Symmetric Bloom, Twin Blooms, Square Filler, Triangle Builder, Chaotic Growth, Convoluted Highway, Swarm of Twelve.

## Energy, beat, endless

- Energy: speed ×0.5 → ×1.6, path glow −0.1 → +0.25, beat rush −0.2 → +0.3.
- Audio: speed ← low (0.06), rush ← onset (0.15), glow ← high (0.08). The beat rushes the ants (up to 3.5× speed right after the kick). The shared punch/pulse is 0.6/0.8.
- Endless: the torus keeps feeding chaos into new highways. `renew` optionally starts a fresh grid every 32, 64 or 128 beats (generation counter in the meta texel, new ant positions each time).

## Cost

Simulation: 48 passes per frame over 320×181 texels, each looping over ≤ 12 ants (about 2.8 M cheap fragments per frame). Visual: one texel read plus ≤ 12 ant glows per pixel. Under 1 ms on the reference GPU. The software renderer in the cloud is slow here (≈ 2.5 s per frame), so long renders were checked on the CPU reference instead.

## Tests (`tests/turmite.test.mjs`)

Rule masks. Langton's highway: period 104, shift (±2, ±2), absent in the chaotic phase. LLRR mirror symmetry at every return home. Presets validate and cover all six rules.
