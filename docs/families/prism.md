# Prism Engine · Prismenmaschine (#108)

A continuous optical installation: **Shard → Array → Kaleidoscope**. One turning triangular glass prism splits a white beam over a dark receiver; eight relay prisms and four biconvex lenses grow around it; ten further prisms raise an optical vault. The camera approaches the entrance as the vault grows. The same maximal mesh and object indices carry the complete arc and its reversal.

## Signature mathematics

`prism-model.mjs` contains the independent CPU reference. Wavelengths are in **micrometres**, from 0.38 to 0.78. The glass uses Cauchy's normal dispersion:

```
n(λ) = 1.48 + 0.012 · dispersion / λ²
```

Five half-spaces describe an equilateral triangular prism (inradius 0.5; depth ±0.65). The GPU clips an incident ray against these planes, applies vector Snell refraction on entry, intersects the interior ray with the next face and refracts at the exit. A bounded extra reflected branch handles total internal reflection; the zero vector returned by GLSL `refract` is never normalized. Air has index 1.

The default incidence is near the minimum-deviation orientation, not the earlier grazing orientation that internally reflected short wavelengths. For apex angle α = π/3, the CPU test independently minimizes the two-interface scalar Snell construction and checks

```
δmin = 2 asin(n sin(α/2)) − α
```

against the actual vector trace. Other tests check tangential momentum, unit directions, critical angle, a real internally reflected prism path, face membership and the ordered spectral fan.

The lenses have front/back paraboloidal surfaces `z = ±(0.22 − 0.19 r²)`. Five aperture rays per wavelength undergo two Snell interfaces. An exact ray/paraboloid quadratic finds the second intersection; the stable root avoids cancellation. The resulting convergence and wavelength-dependent focal shift are CPU-tested, including rotationally equivalent aperture samples. These lenses actually focus visible bundles; they are not merely circular scenery.

## Rendering and material

- One fixed 31,512-vertex triangle mesh: 19 prism bodies, their floor mirrors, four curved lenses, 13 wavelength samples per optical element, beam ribbons and receiver/focus quads. Geometry is allocated on seed load only.
- Rate-dependent motion and camera use two integrated periodic clocks. Development never retimes them.
- Glass uses Schlick Fresnel, background refraction through the opposite face, thickness absorption, finite reflected studio cards, a soft key/rim and derivative-filtered polished bevels. The incident path is visible through the solid front face.
- Beam widths have a resolution-scaled minimum; emissive cores and sharp receiver caustics feed the existing float/bloom path. All hues are `palette(t)`'s equivalent palette-gradient interpolation, or palette anchors mixed with black/white. Wavelength does **not** select hard-coded RGB rainbow colours.
- The floor is dark, engraved very faintly, contact-darkened and mirrored. Broad scattered spectral spill supports the exact sharp ray-receiver footprints. Distance attenuation and gallery slots establish depth without noisy volume marching.
- No engine changes, extra framebuffer, simulation, screen-space feedback or unbounded ray march.

### Deliberate approximations

This is a bounded real-time optical installation, not a recursive path tracer. Glass view-ray backgrounds are analytic gallery/floor/studio radiance, not recursively traced neighbouring glass. The lens **beam** intersections are exact for the authored paraboloids; its **view-ray** thickness is a cheaper approximation. Caustics are finite spectral ray footprints with smooth scattering support, not a Monte Carlo irradiance estimate. One TIR bounce is drawn on the prism beam path. Lens focus quads are small airy focal highlights, not a diffraction simulation.

## Development and looks

The first three presets share seed **10801** and every non-development parameter.

| Look | Development | Composition |
| --- | ---: | --- |
| Shard / Splitter | 0 | One large glass prism, incident white beam and dispersed floor fan |
| Array / Anordnung | 1 | Eight radial relay prisms, four growing lenses, many floor fans |
| Kaleidoscope / Kaleidoskop | 2 | Ten raised vault prisms, converging lens bundles, full mirrored sculpture |
| Flint Nocturne / Flintglas-Nachtstück | 0 | Close, low, slow, strongly dispersive flint-glass study |
| Spectral Cloister / Spektraler Kreuzgang | 1.6 | Compressed elevated optical nave and stronger atmosphere |
| Long Exposure / Langzeitbelichtung | 0.6 | Elevated view of a slowly developing, strongly dispersed array |
| Cauchy Vault / Cauchy-Gewölbe | 2 | Wider, lower, faster full vault |
| Quiet Optics / Stille Optik | 1 | Spacious, elevated, low-dispersion array with little haze |

Stage faders: **Glass dispersion**, **Optical spacing**, **Beam atmosphere**. Energy changes the integrated motion/camera rates and the population of visible spectral bundles; it does not scale the whole picture's brightness. Bodies remain present at low energy. A kick changes focal length by at most 2%.

## Rhythm

- **Spectral address**, 4 beats: a persistent prism's dispersed rays receive a bounded local pulse.
- **Snell breath**, 8 beats: a small incidence-angle excursion steers the *actual* refracted fan.
- **Caustic sweep**, 16 beats: a wavelength band travels through existing receiver caustics.

All three effects act on the signature optics. No whole-frame flash or random reseed.

## Camera, continuity and endlessness

A slow closed camera glide has stable up and no cuts. Development moves the camera continuously from the isolated exhibit toward the optical vault's entrance. The camera remains outside the geometry. Short-side framing preserves the hero in landscape and portrait; outgoing light can leave the frame, but the main glass form remains composed. Small peripheral lenses may reach portrait borders.

Identity (`seed`, object id, side, bay, phase) does not depend on development. Auxiliary elements grow from zero continuously; reversal retraces the same poses. Clocks have periods 2π and are integrated by the engine, so energy/fader rate changes cannot jump the phases even after 12 hours. No state is accumulated or exhausted.

## Cost and verification

Native ANGLE Metal / Apple M3 Pro, full-resolution picture plus normal post chain, all three states at energy 0.95. No adaptive-resolution shortcut. Final synchronous throughput (12 measured frames per state):

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Shard | 1.8 / 2.0 ms | 4.4 / 4.8 ms |
| Array | 1.9 / 1.9 ms | 5.1 / 5.3 ms |
| Kaleidoscope | 1.7 / 1.9 ms | 4.9 / 5.0 ms |

Every state is below the 8 ms / 16 ms budgets, with zero GL errors and non-finite uploads. These short shared-machine throughput probes are not a venue cadence qualification. See the lane report for absolute evidence paths.

- CPU: `node --test tests/prism.test.mjs tests/time.test.mjs` — dispersion, numerical minimum deviation, Snell/TIR, convex intersections, lens focus, seed/mesh identity, forward/reverse continuity, eight valid presets and continuous world registration.
- `npm run typecheck`; built-distribution DE/EN browser localization check.
- Native long-show seam/rate audit at 3600, 4096 and 43200 seconds.
- Baseline plus seven filmed improvement rounds; low/mid/high energy ladder for all eight looks; full-size first/top stills; Phosphor, Glacier and Ember palettes; portrait film; extra Spectral Cloister film.
- Expected integration-only failures: new look previews/editorial curation have intentionally not been regenerated in this lane.
