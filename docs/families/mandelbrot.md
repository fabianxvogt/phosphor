# Mandelbrot Dive (#66)

An endless escape-time deep zoom. Each dive flies from the whole set down to a view whose short side is **1e-10 or less** (the Misiurewicz tunnels go to 2e-12 and one to 2e-18), arrives at a minibrot, surfaces on a fast eased glide to the overview and dives into the next target. Status: draft family on the default list, not gated.

## Algorithm

- **Escape time** for five maps `z → f(z) + c`: Mandelbrot `z²`, Burning Ship `(|x| + i|y|)²`, Tricorn `conj(z)²`, Multibrot `z³`, Celtic `|Re z²| + i Im z²`.
- **Perturbation.** Float32 runs out near 1e-5 (all pixels collapse onto one float). The pixels never iterate `z`; they iterate a float32 offset `δ` from one reference orbit `Z`: `δ' = f(Z + δ) − f(Z) + δc`, written without cancellation (`(2Z + δ)δ` for `z²`, a `diffAbs` fold for the Ship and Celtic, `conj` for the Tricorn). `δc` is a float32 offset from the target, so the view can shrink to 1e-18 and below; float32 only has to hold relative precision.
- **Rebasing (Zhuoran).** When `|Z + δ| < |δ|` the pixel continues from the reference's start with `δ = Z + δ`. One reference serves every pixel; no glitch detection is needed.
- **Periodic references.** Every target is either a minibrot nucleus (`z_p = 0`, period p) or a Misiurewicz point (`z_{k+p} = z_k`). Their orbits are exactly periodic, so one stored period (≤ 256 points) serves any number of iterations: the reference index wraps from `L` back to 0 or k.
- **Double-single reference.** The simulation pass computes the reference orbit once per target in emulated double-single arithmetic (Dekker `twoSum` / `twoProd` with the 4097 split). Target coordinates reach the shader as exact float32 hi/lo bit patterns. A `ONE` read from the state texture multiplies every error term, so no compiler can fuse or reassociate them away. On SwiftShader the GPU orbit is bit-identical to the JS port and within 5e-8 of float64.
- **Distance estimate.** A pixel-scaled `dz/dc` (complex for the conformal sets, a 2×2 Jacobian for the others) gives `|z| ln|z| / |∇|z||` in pixels: filaments are drawn 1–2 px wide at any render size.
- **Unskewing.** Baby sets of the Ship, Tricorn and Celtic are affinely stretched copies. Near a period-p nucleus the return map renormalises in `w = L·β·δc` (`β = dz_p/dc`, `L = Df(z_{p−1})···Df(z_1)`), so the view applies the symmetric part of `(Lβ)⁻¹` (det 1), eased in with depth. The babies arrive undistorted.
- **Interior early-out.** Inside the target minibrot `δ` settles on the attracting cycle; when a whole period returns it to the same place (1e-4 relative) the pixel stops.
- **Temporal supersampling.** A Halton sub-pixel jitter per tick is accumulated in the previous frame, reprojected exactly through the camera (the fractal is fixed in the plane; only depth, turn and target change). The state keeps the previous tick's camera, the output alpha the tick a frame was drawn at. History is dropped on reset, set changes, depth jumps and off-screen samples, and weighted less during the fast surfacing. Sub-pixel filaments (dense in the Ship and Celtic) average instead of sparkling.

## Signature detail

The self-similar zoom: seahorse tails, spirals and filament halos give way, at the end of every dive, to a **minibrot — the whole set again, iterated p times per step** — sitting in its ring of embedded Julia structure. The iteration budget per target is `30·p` at the end depth, so the baby shows its cardioid and bulbs instead of a blob. Variant-specific details an expert will look for:

- **Tricorn:** even-period babies are Mandelbrot sets, odd-period babies are tricorns; the *Tricorn Nursery* route alternates them.
- **Burning Ship:** the armada's mini ships arrive with masts up, unskewed.
- **Multibrot z³:** two-fold babies inside ringed halos.
- **Spiral Tunnel:** Misiurewicz points are asymptotically self-similar under the cycle multiplier, so the dive is a vortex that never changes character; one of them goes to 2e-18, deeper than float64 could render directly.

## Variants (`set`) and routes

| set              | route 0                         | route 1                   | route 2                 | route 3                         |
| ---------------- | ------------------------------- | ------------------------- | ----------------------- | ------------------------------- |
| 0 · Mandelbrot   | seahorse valley (p41, p47, p35) | elephant valley (p37, p49, p45) | dendrite minibrots (p34, p33, p52) | Misiurewicz spirals (M20,2 · M19,2 · M20,3 to 2e-18) |
| 1 · Burning Ship | armada (p24, p23, p26, p27)     | rigging (p31, p22, p26)   | = route 0               | = route 0                       |
| 2 · Tricorn      | nursery: p46 · p31 · p56 · p35 (even/odd) | p56 · p37      | = route 0               | = route 0                       |
| 3 · Multibrot z³ | p41, p37, p37, p40              | = route 0                 | = route 0               | = route 0                       |
| 4 · Celtic       | p26, p28, p21, p31              | = route 0                 | = route 0               | = route 0                       |

All 33 targets were found by a ball-period search and Newton refinement in float64; the tests check that each is exact to the last bit (a Newton step would move it by < 2e-15), that the dive shows structure at 0.35, 0.7 and 1 × D, and that every nucleus ends with a visible minibrot.

## Looks

| Look            | set / route      | Style                                                                 |
| --------------- | ---------------- | --------------------------------------------------------------------- |
| Seahorse Valley | Mandelbrot / 0   | Banded neon (dense colour bands) through seahorse tails               |
| Elephant March  | Mandelbrot / 1   | Soft wide glow, slow counter-spin through the elephant trunks         |
| Filament Lace   | Mandelbrot / 2   | Distance-estimate filaments only, on black                            |
| Spiral Tunnel   | Mandelbrot / 3   | Fast vortex into Misiurewicz spiral centres                           |
| Minibrot Halo   | Mandelbrot / 2   | Slow meditative dive, smooth gradients, bright interior rim           |
| Burning Armada  | Burning Ship / 0 | Banded glow, no spin, mini ships with masts up                        |
| Ship Rigging    | Burning Ship / 1 | Near filament-only, faster, unskewed ships in the rigging             |
| Tricorn Nursery | Tricorn / 0      | Alternating baby Mandelbrots and baby tricorns                        |
| Cubic Bloom     | Multibrot z³ / 0 | Spinning, banded two-fold babies                                      |
| Celtic Braid    | Celtic / 0       | Filament-leaning braided halos, counter-spin                          |

## Parameters and energy grammar

`set` and `route` are integer selectors (never drift). Continuous: `speed` (octaves/s, ×0.48…×1.52 from energy 0.1→0.9), `spin` (×0.37…×1.55), `detail` (±0.24: iteration budget ×0.75…1.25 and filament width 1.9→0.85 px), `bands` (±0.16: colour band density), `edge` (fill → filaments only), `glow` (interior rim). Colour flow is integrated in the simulation at `(0.004 + 0.03·speed + 0.02·bands)·(0.3 + 1.6·level)` cycles/s. Energy therefore changes zoom speed, rotation, colour cycling and filament density, not brightness. Beat: the compositor's shared punch (0.5) plus a small integrated dive along the zoom axis on the kick (≤ 0.08 octave). Audio: low band → interior glow (0.12), high band → filament emphasis (0.06). Stage faders: speed, spin, edge.

## Endless

A one-texel-row simulation integrates depth, turn and colour phase every tick (`fract`-wrapped phases; depth is bounded), so live glides never jump. A dive eases in from the overview, decelerates into the end depth, surfaces at `2 + 3·speed` octaves/s with eased ends and switches target exactly at the overview, which is the same frame for every target. A seed picks the starting target and depth.

Long-run evidence (SwiftShader, simulation ticked at 60 Hz, header sampled every second, frames drawn along the way, zero GL errors):

- *Seahorse Valley*, 30,000 ticks (8.3 min): four dives of ~98 s (speed 0.38) to depth 34.9 (short side 8e-11), surfacing in ~14 s, targets 0 → 1 → 2 → 0; the depth curve is a continuous sawtooth with eased turns.
- *Spiral Tunnel*, 50,000 ticks (13.9 min): eleven dives cycling 10 → 11 → 9; the two spiral targets reach depth 40 (2.4e-12) every ~45 s, the abyss target depth 59.97 (2.3e-18) every ~65 s.

## Cost estimate (MacBook Pro M3 Pro, 1280×720)

Measured on the CPU model of the shader loop (8×4 SIMD tiles, the same caps and early-outs): SIMD-effective iterations per pixel are ~50–150 at mid-dive, ~90–270 at 0.9·D and ~200–420 in the last half-octave. One iteration is ~60 ALU ops (Mandelbrot) to ~75 (Jacobian sets) plus two RGBA8 texel fetches; half of the ALU work is decoding the float32 reference from bytes. At 3.2–4.5 T ops/s: **≈1.5–2 ms mid-dive, ≈3 ms at 0.9·D, 5–8 ms (worst ≈9 ms on the slowest assumption) for the ~2–3 s around each arrival.** The arrival lingers ~1 s per 0.4 oct/s of speed. If the rig shows p99 trouble, `maxRenderWidth: 1120` cuts every number by 23 %.

## Contract notes

- The reference orbit must live in an RGBA8 state texture as raw float bits (two fetches and a 14-op decode per iteration). An RGBA32F simulation-state option would remove the decode (≈40 % of the loop).
- The visual pass needs the previous frame's camera for reprojection. It stores the tick in its own output alpha; the compositor reads only `.rgb`. A contract-level "previous camera" or a guarantee about alpha would make this explicit.

## Tests

`tests/mandelbrot.test.mjs`: hand-iterated escape counts per set; double-single helpers (exact `twoSum`/`twoProd`, ~46-bit add/mul against float64); every target exact; the JS port of the GPU reference orbit against float64; boundary at depth and the minibrot at the end; float32 perturbation resolving a 1e-10 view where plain float32 collapses to one point; routes, skews and shader tables; presets validate with a distinct style each.
