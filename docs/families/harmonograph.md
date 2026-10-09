# Harmonograph (75) — `scene-harmonograph.mjs`

Curves drawn by oscillators, like an XY oscilloscope on a phosphor screen. 65 536 points sample the whole curve every frame. They are stateless, computed in the particle vertex shader (the 256×256 simulation texture only sets the point count). The visual pass fades the previous frame with a frame-rate-independent persistence, so the beam leaves phosphor trails.

## Signature detail

- **The ratio is the shape.** x = sin(a·u + δ), y = sin(b·u) closes after one period for every rational a:b (tested for all ten ratios). A tiny detuning lets δ drift, and the figure precesses as if it were turning in space.
- **Pendulums draw.** The harmonograph proper: two damped pendulums per axis, slightly detuned, spiral inward. They are pushed again every 16 beats with new phases, and the drawing grows from a bright pen head like ink on paper.
- **Spirograph petals.** A hypotrochoid with coprime R:r has exactly R petals (tested by counting the maxima of its radius).
- **Lissajous knot.** Three frequencies (a, b, c), pairwise coprime, give a closed curve in space that never touches itself (tested), turned in 3D and drawn in perspective.
- A comet runs along every curve and flares on the beat.

## Variants (`variant`)

| variant | Variant                                                           |
| ------- | ----------------------------------------------------------------- |
| 0       | Lissajous figure, precessing                                      |
| 1       | Harmonograph: damped, detuned pendulums, re-pushed every 16 beats |
| 2       | Spirograph (hypotrochoid), R:r from the ratio, breathing pen      |
| 3       | Lissajous knot (a, b, c) in 3D perspective                        |

Ratios: 1:2, 2:3, 3:4, 3:5, 4:5, 5:6, 5:8, 7:9, 2:5, 3:7.

## Looks

Scope 3:2, Precessing 5:8, Octave Ribbon, Pendulum Drawing, Harmonograph 3:4, Slow Spiral, Spirograph Rose, Seven Petals, Lissajous Knot, Knot 5:8:13.

## Energy, beat, endless

- Energy: beam +0.25, detune ×0.6 → ×1.8, persistence +0.05 → −0.1.
- Audio: beam ← onset (0.12), detune ← low (0.05), turn ← high (0.06). The shared punch/pulse is 0.5/0.8.
- Endless: precession and turning never repeat exactly; the pendulums are pushed every 16 beats with fresh phases.

## Cost

65 536 points of about 2 px, each a handful of sines, plus one fade pass. Well under 1 ms on the reference GPU.

## Tests (`tests/harmonograph.test.mjs`)

Lissajous closure for every ratio. Spirograph petal count. Lissajous knots never touch themselves. Presets validate and cover all four curves.
