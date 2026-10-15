# Laser Grid / Lasergitter

Family **105**, renderer `laser`, world `laser-grid`. Fragment-only: a hinged vector sheet, seeded wireframe towers and analytically integrated club lasers. No engine extension, simulation, volume march or reduced-resolution image pass.

## Signature mathematics

The original grid is five planar strips extruded along z: a floor of width 18, two 11-unit wings, and two `9 / cos(0.42)`-unit outer wings. Development 1→2 rotates the wings by `θ = smoothstep(1,2,d) π/2` and the outer wings by `φ = smoothstep(1,2,d) (π−0.42)`. The result is a pointed vault, closing exactly at x=0. Material coordinates survive every hinge, rather than dissolving between independent grids. Analytic ray/plane intersections supply the nearest surface, derivative-antialiased grid lines, four-cell architectural ribs and lit hinge rails.

Twelve seed-derived towers share `(side, bay, hash(index, seed))` across all states. Heights grow with `smoothstep(0,1,d)`, then retract to 16% while riding the side-wing basis. In the vault they become wall relief. Ray/box intersections occlude the grid and laser volume; bright silhouette edges, floor bands and fine uprights reveal scale.

### Closed-form single scattering

A finite beam has axis n, length L, transverse Gaussian radius w and longitudinal Gaussian radius `ell = 0.38 L`. Its density is

`rho(p) = exp(−|p_perp|²/(2w²) − z²/(2ell²))`, clipped to axial distance `[0,L]`.

For view ray `p(t)=p0+t r`, define `c=r·n`, `z=p0·n`, `q=p0−zn`, `v=r−cn`, with p0 relative to the beam midpoint:

- `A = (v·v/w² + c²/ell²)/2`
- `B = q·v/w² + z c/ell²`
- `tc = −B/(2A)`
- `C = |q+v tc|²/(2w²) + (z+c tc)²/(2ell²)`

The axial end planes, camera near plane and nearest opaque surface give `[lo,hi]`. With homogeneous camera extinction sigma, completing the square yields

`I = exp(−C−sigma tc+sigma²/(4A)) sqrt(pi)/(2 sqrt(A)) [erf(sqrt(A)(hi−shift))−erf(sqrt(A)(lo−shift))]`

where `shift=tc−sigma/(2A)`. This includes Beer attenuation inside the integral, not at a representative sample. The axial envelope keeps A positive even for exactly parallel rays. `lgErf` is Abramowitz–Stegun 7.1.26 (absolute error <1.5e−7). A 6-sigma candidate rejection discards at most `limit exp(−18)` before transmittance. A narrow integral is the laser core; a second, broader integral is its scattering sheath, with a bounded Henyey–Greenstein angular factor (`g=0.3`, normalization absorbed into gain). There are at most 17 beams, never ray steps.

The longitudinal envelope is authored beam power falloff, not a simulated laser transport solution. There is no multiple scattering or geometry shadowing along the light-to-scatter path.

## States and looks

The first three presets share seed **10501** and every parameter except development.

| EN | DE | Development / composition |
| --- | --- | --- |
| Horizon | Horizont | 0: a single wireframe plane and one slowly scanning laser |
| Towers | Türme | 1: twelve raised, ribbed towers and horizon fans |
| Tunnel | Tunnel | 2: the same sheet folds into a cathedral; floor and ceiling banks cross through it |
| Low Voltage | Niederspannung | 0.3: low viewpoint, coarse grid, slow broad haze |
| Vector District | Vektorviertel | 1: tall towers, high viewpoint and fine façades |
| Folded Chapel | Gefaltete Kapelle | 1.65: held-open wings, low eye, dense scattering |
| Light Organ | Lichtorgel | 2: fine vault, narrow aperture and higher eye |
| Afterimage Arcade | Nachbildarkade | 2: coarse vault, shallow relief, wide aperture and drifting view |

## Energy, rhythm and camera

Energy never multiplies picture gain. It changes sweep/glide rate by ×0.75→1.35, interleaved beam population, and the visibility of half-cell grid detail. Even at energy 0.1, both upper and lower banks survive in the tunnel; Horizon stays one beam at every energy.

Three bounded family gestures: **Beam address / Strahladresse** (4 beats, one persistent beam receives an accent), **Aperture breath / Atmende Öffnung** (8 beats, ≤12% opening), **Vault rib / Gewölberippe** (16 beats, one narrow travelling material rib). Accent is otherwise absent from the static field. A kick changes focal length by at most **2%**. No roll, shake or flash.

The camera follows a slow closed lateral/dolly/crane path: x±1.1, z=−9±1.8, eye±0.25. It looks toward the centre of the developing vault without cutting. The CPU test conservatively bounds every tower's x envelope outside the entire camera corridor, including maximum tower height. Portrait uses the short screen dimension for its ray footprint and FOV.

## Endlessness and continuity

Two engine clocks integrate the parameter-dependent sweep and camera rates, both with period 2π. The authored branch uses the same rate products; the late branch uses clocks. Every trigonometric use is an integer harmonic, and phases are reduced before adding spatial/seed offsets. Development never enters the clocks, seed, tower indexing or camera phase. Reversal physically unfolds the sheet and lowers the same towers.

## Measured cost and verification

Apple M3 Pro / Chrome ANGLE Metal, synchronous whole-frame probe including post, 12 measured frames per state. Shared GPU, so these are indicative throughput figures, not display-cadence qualification.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Horizon | 3.3 / 3.4 ms | 13.2 / 14.0 ms |
| Towers | 6.2 / 6.6 ms | 26.7 / 30.5 ms |
| Tunnel | 6.9 / 7.2 ms | 25.1 / 26.3 ms |

`tests/laser.test.mjs` pins shader arithmetic to a CPU mirror and independently integrates the original 3D density with 24,000-step Simpson quadrature. It covers widths 0.022–0.4, perpendicular/oblique/parallel/antiparallel rays, extinction, occlusion endpoints, rejection bounds, erf error, hinge joins/isometry, roof closure, seeded identity, reversibility, camera safety, preset bounds, continuous-world recognition, rhythm periods and late clock continuity.

Native GPU checks: every look at energy 0.1 and 0.9 across 3600 s and 43,200 s (16 cases); built-in time-wrap probe also checks 4096 s and rate changes at two hours. No GL errors or non-finite uploads. Full-resolution 4K 12-hour still and 1080p low-energy one-hour still were read visually. Forward/reverse films, an extra look, portrait, the complete 24-cell ladder and three palettes (Phosphor, Glacier, Ember) were reviewed.

Evidence (uncommitted) is under `artifacts/films/laser-final`, `laser-extra`, `laser-palettes`, `laser-portrait`, `laser-reverse`, `laser-ladder` and `laser-fullres`. Three improvement rounds after v0: tower scale/façade definition and thinner cores; floor/ceiling crossfire and vault ribs; low-energy bank interleaving, fine grid, atmospheric separation, outer-edge fade and exact roof closure.

## Limits and integration

- Deliberately restrained retro-vector material, not photoreal solid architecture. The open Horizon has a large black sky by design.
- Smooth, homogeneous haze rather than turbulent smoke. Laser illumination of solid surfaces and light-path shadows are omitted; view occlusion is exact.
- 4K is not a 60 Hz dual-world guarantee (peak whole-frame throughput is about 25–31 ms).
- Generated previews and curated order are intentionally untouched per the wave-4 brief. Narrow test allowances cover only family numbers 101–105 pending integration; existing previews and editorial coverage remain validated. L0 must bake/curate after combining the lanes.
