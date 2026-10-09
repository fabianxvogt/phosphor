# Game of Life (64) — `scene-life.mjs`

Exact two-dimensional cellular automata on a torus. One simulation shader steps every variant with the same neighbourhood loop, and a CPU reference in the same module is the test oracle. GPU generations were read back and compared with the CPU step for every rule and every cyclic flavour: bit-exact (see Evidence).

## The algorithm and its signature detail

What an expert should see is the rule doing its known trick, legibly: **gliders gliding, a Gosper gun firing, oscillators blinking, HighLife replicators copying themselves, Brian's Brain ships streaking off, Griffeath spirals turning, Bosco bugs crawling**. How the picture foregrounds it:

- **Crisp cells.** Every cell is a rounded square with a gutter once it is more than three pixels wide, and a faint board grid on close-ups. The board maps exactly onto the frame (all boards are 16:9), so the torus seam is the frame edge: gliders leave on one side and come back on the other.
- **Age colouring.** A newborn cell flashes towards white and then walks the palette from `u_accent` (young) through `u_primary` to dim `u_secondary` (old), over `span` generations. Still lifes settle into calm dark colours. Anything that keeps being reborn, such as blinkers, the gun's shuttles, glider bodies and spiral fronts, stays bright, so motion stands out from ash.
- **Ghosts.** A dead cell keeps its age at death and fades over `trail` generations, so every glider and ship carries a short comet tail that shows its direction. A faint long residue (about 40 generations) leaves luminous glider lanes behind gun streams.
- **Sub-generation timing.** The visual pass reads the generation clock's fraction, so flashes and ghosts decay smoothly between discrete steps.
- **Events are marked.** Every injection or beat spawn draws accent corner brackets around the new material for about 1.5 s. A viewer sees *where* new life was added and *what* was added (a gun, a fleet, an R-pentomino, a spiral core).

## Variants (`type` = `rule`)

| rule | Variant | Rule | What it shows |
| ---- | ------- | ---- | ------------- |
| 0 | Conway | B3/S23 | Gosper guns (36×9, one glider per 30 generations), gliders, LWSS/MWSS/HWSS, copperhead, pulsars, pentadecathlons, methuselahs (R-pentomino, acorn, B-heptomino, diehard), soup and ash |
| 1 | HighLife | B36/S23 | The 12-cell replicator: two copies at (±2, ±2) every 12 generations, growing into a Sierpiński-like tree |
| 2 | Day & Night | B3678/S34678 | Self-complementary blobs: on and off obey the same rule, and inversion discs show it |
| 3 | Brian's Brain | firing → refractory → off, birth on exactly 2 | Dense c/1 spaceship storms; a firing domino launches two ships |
| 4 | Cyclic CA (Griffeath) | k → k+1 when ≥ T neighbours hold k+1 | Self-organising spiral waves (BZ). `comp` picks 313 (R1/T3/C3 Moore), R1/T2/C5 Moore, CCA (R1/T1/C14 von Neumann), cyclic spirals (R3/T5/C8 Moore) |
| 5 | Larger than Life: Bosco's rule | R5 Moore, B34–45, S33–57 | Bosco bugs: blobby spaceships (period 6, 5 cells per period) |

Comp selects the seeding and injection mix per rule (Conway: 0 guns, 1 methuselahs, 2 soup, 3 spaceship fleets plus oscillators; HighLife: replicators / replicators + soup / swarm / soup; Day & Night: soup / islands / dense discs / inversions; Brian's Brain: soup / domino sparks / central burst / both; Bosco: bugs / soup / patches / bugs + patches). On the 96×54 close-up board, Conway comp 0 is a **gun feeding an eater 1**: period 30 and no debris.

## Looks

| Look | Variant · board | Style |
| ---- | --------------- | ----- |
| Gosper Barrage | Conway · 240 | Three guns whose glider streams cross, collide and burn; new guns arrive when the board goes quiet |
| Gun & Eater | Conway · 96 (close-up) | One big gun firing a stream into an eater, 20 px cells; occasional intruders smash it |
| Methuselah Bloom | Conway · 320 | R-pentominoes, acorns and B-heptominoes blooming into wide debris fields |
| Glider Rain | Conway · 160 | Spaceship fleets entering from the seams past pulsars and pentadecathlons |
| Primordial Soup | Conway · 320 | Full random soup burning down to ash, then rescued with methuselahs, patches and fleets |
| Replicator Field | HighLife · 240 | A replicator copying itself across the board |
| Day & Night Lava | Day & Night · 240 | Smooth islands with churning boundaries, injected patches and inversions |
| Brian's Brain Storm | Brian's Brain · 320 | Dense chaos of streaking ships with long trails |
| Brain Sparks | Brian's Brain · 160 | Dominoes firing ship pairs, bigger cells |
| Cyclic Spirals | Cyclic CCA · 320 | Griffeath's classic: large smooth spirals rotating |
| 313 Vortex | Cyclic 313 · 240 | Fast, small turbulent spiral cores |
| Wide Spirals | Cyclic R3/T5/C8 · 320 | Large-scale spiral waves |
| Bosco Bugs | Bosco · 160 | Blobby bugs crawling in from the seams, patches exploding |

## Energy grammar (0.1 → 0.9)

- `rate` (generations per second) × 0.43 → × 1.57 around the look's value (`{ mul: [0.35, 2.1] }`). One generation runs per 60 Hz pass at most, so the rate is capped at 60.
- `inject` +0.6 across the range. This sets the rain interval (40 s at 0, 2 s at 1) and the beat-spawn probability.
- `trail` +5 generations across the range (longer comet tails at speed).
- Beat: `beat.inject = 1`. The engine's beat gesture (strength rises with energy and is zero at 0.1) drops one small recognisable object at the gesture point: a glider or LWSS, a replicator, a Day & Night patch, a domino, a spiral core or a bug. The shared punch/pulse is 0.5/0.8.
- Audio: `rate` ← low (0.10), `trail` ← high (0.10), `inject` ← flux (0.12).

Brightness does not depend on energy.

## Endless

- **Exact activity reduction.** Each pass, row 1 of the state texture sums every column (cells that differ from two generations ago, plus live cells), and texel (3,0) sums row 1. Comparing with two generations ago ignores still lifes and period-2 oscillators, the ash of Conway and HighLife, so an ash board reads as zero activity.
- **Rescue.** If activity stays below a per-rule fraction of the board for 0.75 s, an injection lands every 0.6–1.5 s until the board is lively again. The fractions are 0.3 % for Conway and HighLife (one gun is about 60 changes), 2 % for Day & Night, 3 % for Brian's Brain, 5 % for cyclic and 1 % for Bosco.
- **Rain.** Independently, `inject` drops material every 2–40 s (skipped when the board is crowded).
- **What is injected** is recognisable where the rule has such objects: Gosper guns (or the gun with eater on the close-up), glider and ship fleets entering from the seams, methuselahs, pulsars, replicators, dominoes, bugs, and cyclic winding cores, which are phase singularities that grow into new spirals. Random patches are used only where the rule's own objects come from soup.
- **Pre-roll.** After a reset the first 110 generations run one per pass inside the engine's 120-tick warm-up, so a clip opens on streams in flight and formed spirals.
- Counters saturate (generation) or are pass-relative (since-injection), so nothing wraps into a dead state after hours.

## Cost

- State: 320×182 RGBA8, **one pass per tick** (`steps: 1`). Per cell per generation: 9 fetches (life-like, Brian's Brain, 313/C5), 5 (CCA), 49 (R3 cyclic) or 121 (Bosco). Non-generation passes copy. Row 1 adds a 180-fetch column sum for 320 texels, and one texel sums 320.
- Visual: 9 cell fetches plus 8 metadata fetches per pixel, no loops beyond those. Roughly 19 fetches/pixel at 2.1 MP is well under 1 ms on the reference GPU.
- Software GL note: SwiftShader runs every branch masked, so its cost tracks code size, and dynamically indexed `const` arrays are very slow there. Pattern and rule tables are therefore select chains, and all events share one builder and one stamp. A real GPU takes the one coherent path, because every fragment derives the same event from the same metadata texels.

## Evidence

- `tests/life.test.mjs`: CPU reference rules (blinker period 2, glider (1,1) per 4 generations, Gosper gun period 30, Brian's Brain, cyclic and Bosco steps), seeding patterns, injections and activity rescue; all pass.
- SwiftShader contact sheets of all 13 looks at 320×180 and a 960×540 Gosper Barrage frame after 300 frames (two pairs of guns firing converging glider streams): crisp cells, age colours, ghost tails, zero GL errors and zero non-finite inputs.
- Not yet measured on the reference GPU (frame cost, 8-hour soak); owner ratings pending.
