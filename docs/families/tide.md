# Moon Tide · Mondflut

**EXPLORATORY / EMPIRICAL**, worlds wave 4, family **103**, renderer `tide`, world `moon-tide`. A new material: a dark, reflective ocean at night, not an underwater particle world. No engine changes.

## Signature mathematics

Six seeded, persistent directional Gerstner waves. For wave `i`, `ωᵢ = 0.35 nᵢ`, `n = [2,3,4,5,7,10]`, and **`kᵢ = ωᵢ² / 9.81`**. Longer waves travel faster: phase speed `ω/k`; group speed `ω/(2k)`. The speed control reparametrizes physical time; it does not replace the dispersion law with a shared phase velocity.

The material surface is

```
X(q) = q + Σ Q Aᵢ dᵢ cos(kᵢ dᵢ·q + φᵢ)
H(q) = Σ Aᵢ sin(kᵢ dᵢ·q + φᵢ), Q = 0.65
```

The six amplitudes `[0.8,0.4,0.24,0.16,0.085,0.035]` scale continuously from ×0.48 to ×2.35 with Calm → Swell and by the height fader (≤1.3). At the **entire schema maximum**, `Σ Q k A = 0.5530875468 < 1`; the symmetric horizontal Jacobian has minimum eigenvalue ≥0.4469124532. Thus the horizontal map cannot fold or self-intersect. Development never alters wave IDs, seeded directions or initial phases.

Two Newton iterations invert `X(q)` for a world-space heightfield query. A six-texel RGBA32F **data-only** precompute stores wavevectors, amplitudes and phases each frame; the fallback computes the identical coefficients directly. A capped 15-step safeguarded regula-falsi intersection solves the water height. Normals pull the material height gradient through the inverse horizontal Jacobian, rather than repeating four height queries per pixel.

### The peak: Maelstrom

The ocean's vertical coordinate develops into a 27-unit depression with a raised shoulder and five meandering, rotating spiral ridges. Its base is

```
-27 exp(-r²/245) + 3.8 exp(-((r-23)/7)²)
```

and the ridge phase is `5θ + 0.44r - 2f + 0.28 sin(3θ - 0.12r + f)`. An inner smooth window removes the angular singularity. All angular and clock harmonics are integers, so neither the atan seam nor phase wrapping jumps. Analytic radial/angular derivatives shade the bowl. Since this only adds height, it does not invalidate the Gerstner no-fold bound.

**Choice:** the maelstrom gives a much larger peak silhouette and a dramatic crane reveal while remaining a reversible single-valued ocean. A breaking barrel would require overturning geometry, hidden surfaces and more fragile camera clearance; it would contradict this heightfield's deliberate no-fold guarantee. The bowl is an authored deformation, **not** a Navier–Stokes vortex solution.

## Light and depth

Fresnel sky reflection, a compact moon plus a rough moon-glitter path, faint lunar surface mottling, sparse stars, distant horizon haze, soft directional key, grazing rim and trough darkening. All colour comes from palette uniforms and white/black mixtures. Living foam follows actual Gerstner crest compression; rare accent pinpoints mark the hottest foam and spiral ridges. Fine wind ripples, foam filaments and surface spindrift fade before becoming subpixel. Spray is a surface-linked analytic sparkle treatment, not simulated airborne droplets.

## States and looks

States share **seed 10301 and all non-development parameters**.

| EN | DE | Development | Character |
| --- | --- | --- | --- |
| Calm | Stille | 0 | Low glassy swell, moon path, faint living foam |
| Swell | Dünung | 1 | Tall crossing swells, wind detail, igniting crests |
| Maelstrom | Mahlstrom | 2 | Vast luminous funnel; camera cranes above the shoulder |
| Silver Passage | Silberpassage | 0.2 | Low moon, low viewpoint, long gentle waves |
| Living Breakers | Lebendige Brecher | 1 | Maximum wave height, turbulent crests, low viewpoint |
| Spiral Cathedral | Spiralkathedrale | 2 | High crane over the full vortex |
| Far Lantern | Ferne Laterne | 0.65 | Higher moon and viewpoint, smaller swell |
| Undertow | Sog | 1.7 | Low approach to the forming funnel, faster flow |

## Energy, rhythm and camera

Energy is orthogonal: motion speed ×0.7–1.3 (1.86× range), wind-normal/foam detail, spindrift activity and camera drift rate. It does **not** multiply brightness, wave amplitudes or development. High audio contributes at most 0.06 to wind detail.

- **Crest packet / Schaumwoge**, 4 beats: wakes a travelling packet on existing foam crests.
- **Spiral ridge / Spiralgrat**, 8 beats: accents the existing spiral ridge locally.
- **Incoming tide / Ankommende Flut**, 16 beats: a broad ring crosses the vortex shoulder.

The camera follows a slow closed coastal sway (±5 units horizontally, ±3 units in distance) and cranes continuously with development. No roll. The minimum eye height starts at 4.8, rises to 6.4 in Swell (before the viewing-height fader), and reaches 33–46 at the peak. A CPU envelope test proves clearance at every development value and maximum wave height. Kick FOV modulation is bounded to **2.2%**.

## Endless time

Three integrated engine clocks: base wave phase (period 2π), camera phase (2π), spiral flow (2π). Rate-dependent terms read `u_clock` behind `PHOSPHOR_LATE`, declared in both the picture and data-pass shader. Every use is periodic in those exact periods, including capillary normal detail. No cumulative coordinates or growing sine arguments. Energy/fader changes change velocity, not phase. Development does not reset clocks or seed.

## Cost (native Apple M3 Pro, ANGLE Metal)

Synchronous whole-frame throughput, **including post**, not display cadence. Shared-machine indicative numbers, final three states:

| Resolution | Calm p50 / p95 | Swell p50 / p95 | Maelstrom p50 / p95 |
| --- | --- | --- | --- |
| 1920×1080 | 3.8 / 4.1 ms | 4.8 / 5.2 ms | 7.0 / 7.4 ms |
| 3840×2160 | 14.5 / 17.2 ms | 16.9 / 17.2 ms | 25.9 / 26.7 ms |

1080p meets the ≤8 ms family budget. **4K Maelstrom is not a 60 Hz two-world-crossfade budget**; the 4K probe exceeds its default 16.67 ms threshold. No resolution cap, engine downgrade or cached colour image is used.

## Verification

- `node --test tests/tide.test.mjs`: exact dispersion and group velocity; full-schema steepness/Jacobian bound; two-step inverse versus a converged solution (<2.5 cm horizontal residual, <1.2 cm height error); analytic normals versus numeric derivatives; bowl center/atan seam; identity and C1 state boundaries; camera envelope, energy/rhythm limits, 12-hour clocks; all eight presets and continuous-world registration.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-tide.mjs --rig --port 48303`: explicit early/late and no-precompute shader compilation, 1080p/4K/portrait, low-energy coverage, 3600 s and 43200 s, reverse sweep with unchanged seed/slot; zero GL errors/non-finite uniforms. Evidence under `artifacts/films/tide-verification/`.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --families tide --port 48303`: no seams at 3600/4096/43200 s, no excessive energy or fader-rate departure at 2 h; actual late variant verified.
- Final 30-second world film (Glacier) and extra-look film (Living Breakers / Ember), plus Phosphor palette film, under `artifacts/films/tide-final/`; all opened as contact strips and selected stills.
- Eight-look energy ladder: `artifacts/contact/tide-final/index.html`; PNG overview under `artifacts/films/tide-verification/energy-ladder.png`.

## Limits

This is a small analytic spectrum, not an FFT sea. The heightfield cannot overturn. The vortex and foam are deliberately stylized; no refraction-through-water, multiple scattering, foam advection simulation or airborne spray simulation. Regula-falsi is a bounded approximation and may not choose the very nearest root in steep overlapping silhouettes. Very distant foam becomes a band-limited average. Portrait crops the shoulder of the peak rather than shrinking the ocean to fit. The moon intentionally leaves the frame during the peak crane. No claim of venue qualification.
