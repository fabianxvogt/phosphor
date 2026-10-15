# Prism Engine · Prismenmaschine (#108)

One continuous optical world: **Shard / Splitter → Array / Anordnung → Kaleidoscope / Kaleidoskop**. A glass prism splits a white beam, grows eight optical relays and four biconvex lenses, then opens into a seven-bay pointed-glass cathedral. Ten upper prisms form a large optical rose; their physically refracted spectra cross its centre. The camera glides from an exterior studio view into the nave. World id, eight preset names, seeds, schema and rhythm ids are unchanged.

## Signature mathematics

`prism-model.mjs` is the independent CPU reference. Wavelengths are micrometres, 0.38–0.78. Cauchy's law remains:

```
n(λ) = 1.48 + 0.012 · dispersion / λ²
δmin = 2 asin(n sin(α/2)) − α,  α = π/3
```

Five half-spaces define the equilateral prism (inradius 0.5; depth ±0.65). The vertex shader intersects the incident ray, applies vector Snell refraction at both interfaces, and follows a bounded TIR branch when needed. CPU tests independently minimize the scalar two-interface solution and compare it to the vector trace, check tangential momentum, critical angle, face membership and wavelength ordering.

**Forty-one wavelengths** define forty adjoining fan strips. Adjacent strip boundaries use the same physical wavelength trace; wavelength interpolates across each triangle and samples the **entire** shared palette gradient, including its accent endpoint. Geometry retains the true Cauchy angular spread: there is no artificial RGB rainbow or decorative bend. A separate soft billboard sheath scatters light around the fan. Cores exceed 1.0 before shared bloom/tonemapping.

A secondary, lower-power fan follows energy reflected at the first exit face, intersects the next real face and applies Snell refraction again. At a critical wavelength, invalid transmitted primitives are suppressed while their vertices remain on a finite limiting tangent, never at a distant clip origin. The secondary branch has an authored, bounded power rather than a full polarization-dependent Fresnel solver.

The four lenses use paraboloids `z = ±(0.22 − 0.19 r²)`. Five aperture rays per wavelength undergo two Snell interfaces, with an exact quadratic intersection at the second surface. Tests check convergence, rotational symmetry and chromatic focal shift.

The cathedral's two equal circular arch halves satisfy

```
(|x| + w)² + (y − 2.3)² = (2w)²,  w = 3.3 · spacing
```

They meet at `x = 0`, `y = 2.3 + √3w`. Seven identical, persistent bays have 98 faceted rib/column pieces, 18 longitudinal rails and 72 thin glass roof panes. CPU references check symmetry, circle membership, crown continuity, positive dimensions, rail spans and exact development reversal.

## Rendering

- One fixed **72,840-vertex** mesh: 19 optical prisms and their floor mirrors; four lenses; cathedral ribs, rails, mirrored supports and panes; primary and reflected spectral sheets; volumetric sheaths and caustic receivers. Opaque/additive split at vertex **25,344**. Geometry is rebuilt only when the seed changes.
- Glass: Schlick Fresnel, two-interface background refraction, thickness absorption, finite studio-card reflections, soft key/rim lighting, derivative-filtered polished bevels. Nonuniform architectural rods transform exit normals back into world space before refraction.
- Internal light: closest approach between the view segment through the glass and the actual refracted segment, plus the next reflected segment. The front surface therefore transmits the interior paths instead of hiding them behind its depth write.
- Ground: mirror geometry, contact darkening, restrained tile seams, smooth receiver spill, narrow exact spectral footprints and animated fold-caustic support. The distant cyclorama, gallery slots, floor sheen and bounded palette haze establish studio depth rather than a pure-black void.
- All colour is the shared palette gradient or palette anchors mixed with black/white. No engine change, new framebuffer, simulation or volume-march pass.

### Deliberate approximations

Glass view rays sample analytic gallery/studio/floor radiance, not recursively refracted neighbouring solids. Lens **beam** intersections are exact for the authored paraboloids; lens **view-ray** thickness is approximate. Exact finite ray footprints are supplemented by an artistic analytic fold-caustic field, not a photon-mapped irradiance solution. Haze uses finite camera-facing Gaussian sheaths and bounded spatial scattering, not a heterogeneous volumetric transport solve. The closest arches intentionally pass beyond the frame to establish an enclosing room; the central prism and optical rose remain composed.

## Looks and development

The first three presets retain seed **10801** and identical non-development parameters.

| Look | Development | Composition |
| --- | ---: | --- |
| Shard / Splitter | 0 | Isolated glass hero, white incident path, full-gradient spectrum and floor caustics |
| Array / Anordnung | 1 | Eight relays, four focusing lenses and mirrored spectral fans |
| Kaleidoscope / Kaleidoskop | 2 | Enclosing pointed nave, large ten-prism optical rose and crossing spectra |
| Flint Nocturne / Flintglas-Nachtstück | 0 | Close, low, slow, strongly dispersive study |
| Spectral Cloister / Spektraler Kreuzgang | 1.6 | Compressed elevated nave during its growth |
| Long Exposure / Langzeitbelichtung | 0.6 | Elevated, slowly developing array |
| Cauchy Vault / Cauchy-Gewölbe | 2 | Wider, lower, faster cathedral |
| Quiet Optics / Stille Optik | 1 | Spacious, low-dispersion optical array |

Stage: **dispersion**, **spacing**, **haze**. Energy changes integrated optical/camera speed and the population of spectral bundles, never whole-picture brightness. The kick changes focal length by at most 2%.

## Rhythm, camera and endlessness

Unchanged signature gestures: **Spectral address** (4 beats), **Snell breath** (8 beats, actual incident-angle excursion), **Caustic sweep** (16 beats, wavelength-band receiver emphasis). No full-frame flash or reseed.

The continuous camera moves into the nave on development, with closed slow lateral/dolly motion and stable up. Two engine-integrated 2π clocks preserve phase through energy/fader changes and 12-hour operation. Persistent ids, maximal topology and reverse-development poses are deterministic. The portrait composition preserves the central optical subject; peripheral relays and near structural ribs can meet the border.

## Cost and verification — next-round revision

Native ANGLE Metal / Apple M3 Pro; full-resolution picture and normal post chain, energy 0.95, 12 measured frames/state. No resolution shortcut. Timings are short shared-machine throughput probes, not sustained venue-cadence guarantees.

| State | Baseline 1080p p50 | Final 1080p p50 / p95 | Baseline 4K p50 | Final 4K p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| Shard | 1.8 ms | 2.6 / 2.8 ms | 4.6 ms | 6.3 / 6.5 ms |
| Array | 1.9 ms | 3.2 / 3.5 ms | 5.2 ms | 8.5 / 8.8 ms |
| Kaleidoscope | 1.7 ms | 3.8 / 4.2 ms | 5.0 ms | 11.0 / 11.5 ms |

Every state remains below **8 ms at 1080p / 16 ms at 4K**. Additional geometry and richer light transport increase Array/Kaleidoscope cost; no baseline-plus-5% claim is made. All measured states have zero GL/GPU errors and non-finite uploads.

- `node --test tests/prism.test.mjs tests/time.test.mjs`: optics, secondary branch, connected full-spectrum sheets, triangle-metadata regression, architectural mathematics/continuity, eight valid presets and 12-hour clocks. World lookup is by `w.id === "prism-engine"`, never registry position.
- Native late-time seam/rate checks: 3600, 4096, 43200 seconds; zero seams/errors.
- Baseline, Liquid Chrome reference and seven next-round visual revisions; strips and full-size stills reviewed. A rejected overbright reflected-fan topology revision is explicitly retained as a strip.
- Final default/Glacier/Ember films, portrait, Spectral Cloister film and all-eight-look 0.1/0.5/0.9 energy ladder.
- Typecheck, build and DE/EN browser localization pass. Full CPU suite has only the three expected integration-owned preview/curation failures.

**Honest visual assessment: 8.5/10**, improved from the independent ~7/10 baseline. The enclosing composition and spectrum are substantially stronger, but the analytic glass environment and restrained haze do not yet equal Liquid Chrome's material richness. Absolute films, strips, raw timings and logs are in the fleet lane report.
