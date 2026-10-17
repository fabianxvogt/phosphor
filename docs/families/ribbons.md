# Attractor Ribbons (97)

World `attractor-ribbons` · `scene-ribbons.mjs` · `ribbons-geometry.mjs`.
192 seeded trajectories develop from Lorenz's butterfly, through Aizawa's
vortex, into Thomas's labyrinth. No engine or shared limiter change.

## Algorithm and identity

A 224 × 1153 RGBA8 simulation stores 224 recent samples per trajectory in all
three flows simultaneously. Two texels encode x/y/z and escape generation as
16-bit fractions. Each sample advances two RK4 substeps: Lorenz h=.005,
Aizawa h=.015, Thomas h=.08. Thomas uses b=.09, box ±11 and canonical scale
1/7. CPU references check bounded quantized histories and positive finite-time
Lyapunov exponents. An escaped head respawns locally; segments spanning different
generations are suppressed.

The fixed-tick accumulator interpolates between history updates. Development
blends corresponding histories geometrically; it never changes integration,
relaunches trajectories or resets time. Camera and light phases are integrated
in 24-bit simulation globals, including at 43,200 seconds. Seeded ranks and
trajectory indices remain paired: sorting the mesh changes draw order only.

The display now uses 224 Hermite-resampled segments per ribbon (258,048
vertices). Analytic Hermite derivatives supply tangents from the same four
history points, avoiding three separate curve evaluations per vertex. Histories
remain exact RK4 samples; interpolation, lane scales and panoramic placement
are presentation, not a claim that the transformed display solves a new ODE.

## States and looks

- **Wings (0):** recognizable two-lobed butterfly, maximum population 42%.
- **Vortex (1):** spiral shell and axial tube, maximum population 68%.
- **Labyrinth (2):** spatial looping paths, maximum population 88%.

The unchanged eight looks are Butterfly Wings / Aizawa Vortex / Thomas Labyrinth
(seed 9701), Long Exposure (9702), Vortex from Below (9703), Labyrinth Rush (9704),
Unfolding Wings (9705), Slow Labyrinth (9706). State names, definitions, seeds,
schema and rhythm IDs are unchanged; no saved-world HISTORY migration is needed.

## Earlier r4 look grammar

The independent r3 review scored L5/G8.5/E6.5. Six subsequent filmed experiments
addressed its framing, flat belts, peak knot, scattered relay and broken edges.

A wider, aspect-aware panoramic projection and integrated lateral drift move the
image off center. Ranked peripheral histories provide near/far scale cues.
Small continuous lane-scale differences separate nearly coincident dominant
paths; distant strands stay subordinate. Portrait disables the horizontal
stretch and lateral translation, retaining the existing short-side lens relief.
Focal lengths are 2.46 → 2.42 → 2.02; kick focal punch remains 2.2%. A soft
frame-edge fade handles peripheral excursions without a hard content boundary.

Only the first 24 ranked ribbons are opaque. Remaining ribbons use the engine's
existing depth-tested additive mesh section, without depth writes. This prevents
subpixel coverage masks from punching dark holes through broad bands. Stable
opaque depth ordering reduces co-surface fighting. An eight-opaque-band trial
was rejected: it traded fewer intersections for transparent, overbright clutter.

Broad widths are concentrated exponentially into the lowest ranks. Curved
cross-sectional optical normals, dark selvedges, narrow satin highlights and
cool underside/warm upper-face contrast replace constant-colour slats. Tails
retain enough body to follow the paths. Thin trajectories keep minimum-pixel
coverage and derivative-based edge softening. No arbitrary connectors or added
non-attractor geometry.

Energy changes population ×(.65+.35×level), width ×(.65+.5×level), flow speed
×.55→×1.5, length ±.15, orbit ×.6→×1.6 and pulse density ±.2; not master brightness.

## Four gestures and three grooves

1. **Ribbon cohort**, slot 0: count-selected whole-ribbon primary-light accent.
2. **Flow run**, slot 1: repeated light bands following history coordinates.
3. **Head sparks**, slot 2: local leading-tip fills, now restricted to dominant
   ribbons rather than sparkling through every thin strand.
4. **Ribbon relay / Bandstaffel**, slot 3: one advancing hot front per selected
   dominant trajectory, followed by a dim, sharply decaying wake and 32% local
   width swell. Selection is restricted to the first eight ranked trajectories,
   divided into three alternating bundles; secondary cohorts remain quiet.

Relay texels 4–6 latch age, strength and bundle once from `u_rhythmHit.w`,
`u_rhythm.w` and `u_rhythmCount.w`. Fixed-tick age runs over .75 seconds,
independent of envelope decay, energy and transport. The front moves from tail
to head, never reverses, then expires. White remains confined to tiny hot cores;
accent stays local. Existing English/German strings and all loop placements stay.

| Preset          | Relay placement                          | Family hits/bar |
| --------------- | ---------------------------------------- | --------------: |
| Loose strands   | eighth steps 5, 23 / four bars           |             3.0 |
| Braided current | eighth steps 1, 12 / two bars            |             6.7 |
| Attractor weave | sixteenth steps 1, 13, 20, 27 / two bars |            11.3 |

Independent six-/five-beat flow-run lengths and phrase fills are preserved.

## r5 look grammar

The independent r4 review scored L6/G8.5/E7, overall 6.5: rounded cables,
cluttered circulation, cropped enlargement and painted-looking relay sections.
The r5 renderer retains the exact integration, 192 seeded histories, schema,
looks, state IDs and all groove placements. No HISTORY migration is required.

- **Material:** broad shallow-camber faces replace circular-looking lighting.
  Optical twist narrows the projected width toward an edge-on fold, without
  rotating neighbouring strips into one another. Thin selvedges and a broad
  two-sided satin key retain lime/blue depth; the last quarter of each tail
  tapers continuously to zero. Head width also tapers, removing blunt ends.
- **Hierarchy:** width falls exponentially by fixed seed rank, and secondary
  reflectance falls to 18%. Three dominant bands carry the relay; subordinate
  returns and distant additive filaments remain present, not removed from the
  simulation. All four gestures inherit the same material hierarchy so a beat
  does not relight the entire hairline field.
- **Framing:** less peripheral magnification, reduced lateral offset and a
  restrained landscape stretch leave the whole circulation room. The opening
  butterfly retains its lens scale. Final focal lengths are 2.46/2.36/2.20;
  portrait relief remains. Perimeter coverage fades over 2–12% of the short
  side; this is presentation falloff, not an excuse to crop a hero.
- **Depth:** the existing rank bias gains a small continuous history-age bias
  to separate nearly coincident successive turns of the same ribbon. This
  reduces some self-overlap steps but does not eliminate close mesh aliasing.
- **Relay:** one of the first three ranked bands receives each scheduled hit.
  Age is latched once and advances by 1/72 per fixed tick (1.2 seconds).
  The front moves monotonically from s=.96 toward the head, with a compact
  Gaussian core (width .035), a contiguous exponential wake (decay 8) and
  dark recovery. The physical width crest is only 12%, not a swollen tube.
  English/German labels and slot-3 ID `ribbon-relay` are unchanged. Driving
  eighth steps 1/12 still select successive bands; restrained and accented
  retain all their distinct placements and 3.0/6.7/11.3 family hits/bar.

Four change/capture/read/critique films are preserved in `-r5-1` through `-r5-4`.
Round 1 overcorrected darkness/scale; round 2 restored occupancy and two-sided
face lighting; round 3 refined satin camber and slowed the relay; round 4 added
continuous age ordering. Final reviewer evidence uses capture v2: a separate
Thomas state at energy .85, aligned to beat 8 after two warm-up bars. The look
arc is unchanged. Film evidence does not certify limiter-enabled presentation.

### r5 verification and cost

Final evidence: `artifacts/look-review/attractor-ribbons-r5/`; native health,
limiter capture and profiles: `artifacts/ribbons-verification/r5-*`.
The native matrix covers three palettes × five development values × energies
.1/.5/.9 at 43,200 s, 241-frame reversal without identity replacement, one-shot
RGBA8 relay age/expiry, portrait, square and 4K. All have zero GL/non-finite
errors. A separate 180-frame native 1080p RAF run enables the unmodified live
flash limiter, without exemption; its approved screenshot is preserved.

Final 60-frame native M3 Pro throughput (states 0/1/2): 1080p p50
1.8/2.2/2.1 ms, p95 2.0/2.4/2.4; 4K p50 4.6/5.0/4.9 ms, p95
4.9/5.3/5.4. Paired ABBA against main ef5b7e9: p50 deltas 0/0/0%
at 1080p and −4.2/−7.7/−7.5% at 4K. Both final absolute budgets and
paired +5% gates pass. An earlier contended 4K run failed at p50
18.5/16.6/18.2 ms; its logs remain. These are synchronous throughput probes,
not real Stage cadence acceptance. No render scale, limiter or governor changes.

Tests add compact-core/contiguous-wake, tail/edge taper and shallow-face guards;
all earlier tests remain. Full suite: 1031 pass / 22 opt-in skips; targeted
flash/family/world-rhythm: 50 pass. Typecheck, build, native DE/EN browser i18n
and family-file formatting pass.
Self-assessment: look 7/10, not independent acceptance. Transition 9 remains
busy; close crossings retain fine stepped edges, and some relay travel is
occluded. Sparse mathematical sculpture presentation is still a limitation.

## Archived r4 verification and cost

Final evidence: `artifacts/look-review/attractor-ribbons-r4/` (30-second film,
12-still sheet, 24-frame rhythm sheet, grids). Six experimental rounds are kept
in sibling `-r4-roundN` directories. Native verification is under
`artifacts/ribbons-verification/r4-*`: three palettes × five development values
× energies .1/.5/.9 at 43,200 s, reversal without slot replacement, one-shot
RGBA8 relay readback, portrait/square and 4K stills. Zero GL/non-finite errors.

Full suite: 998 pass, 21 opt-in skips; targeted ribbons/world-rhythm/pipeline-flash:
49 pass. Typecheck, build, DE/EN browser i18n and formatted-family Prettier pass.
Tests additionally protect sorted trajectory identity, opaque/additive split,
bounded mesh size, safe interpolation margins and packet wake direction.

Native M3 Pro profiles of the retained final source: 1080p states
0/1/2 p50 2.1/2.3/2.2 ms, p95 2.3/2.6/2.4; 4K p50 5.5/6.0/5.9,
p95 6.1/6.3/6.2. An earlier heavily contended 1080p run reached 13.7 ms p50.
Final retained-source ABBA against merged reference `7c6257b` measured
0/+15.0/+15.8% at 1080p and +6.3/+19.1/+8.2% at 4K. An earlier paired
run reached +28% in Vortex at 1080p. Absolute budgets pass; the pair runner's +5%
regression gate does not. This is a deliberate quality/cost increase, not a
performance win. The standard pair runner shares geometry helpers, so an
additional artifact-local runner routes the reference's `ribbons-geometry.mjs`
as well; otherwise the baseline incorrectly inherits the larger mesh.
These synchronous probes are not venue-cadence acceptance.

## Remaining limits

This is still a flowing mathematical sculpture, not a literal landscape.
Dense near-coincident broad paths can retain fine stepped occlusion at large
inspection sizes; additive peripheral paths can overlap visibly. Peak transition
frames are busier than held states. Optical normals are satin-band impostors,
not simulated cloth. Self-assessment is not independent acceptance.
