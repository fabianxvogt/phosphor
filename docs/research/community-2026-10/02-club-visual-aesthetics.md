# Club visual aesthetics: what lands at techno and electronic parties (esp. Berlin)

Research lane 02 · 2026-10-14 · read-only web research · writer: this lane only

Evidence labels: **REPORTED** = stated by a cited source (paraphrased).
**SPECULATIVE** = this lane's inference or design judgement. Nothing here is a
measurement of Phosphor itself.

**Method and limits.** About 60 web searches and 35 page reads across club
press, festival editorials, VJ interviews, LED/broadcast technical guides,
accessibility standards and two audience studies. **Reddit could not be read.**
reddit.com, old.reddit.com and the JSON endpoints all refuse this crawler, and
`site:reddit.com` searches returned no Reddit pages. Audience opinion therefore
comes from substack essays by clubbers, festival reviews, a UK phone-use survey
and two controlled studies. It does not come from r/Techno or r/Berghain
threads, so treat the "audience" findings as weaker than the venue and
practitioner findings. The shared web-search budget ran out near the end. The
projector/haze points in Q4 therefore rest on technical first principles and
are labelled SPECULATIVE.

## Summary

- **Berlin's core techno rooms are built around darkness, not screens.** The
  Berghain main floor, the Tresor basement and Bassiani use near-black rooms,
  overhead strobes, single spots and fog. Screens are rare or absent. Designers
  name keeping the room dark enough as a main challenge. REPORTED.
- **Screens belong to festivals, A/V stages and arena techno.** Examples are
  Berlin Atonal/Kraftwerk, CTM, Awakenings, Time Warp, Dekmantel's UFO stages,
  Bicep, Afterlife and KNTXT. Even there, the most praised work is
  site-specific, monumental and abstract. REPORTED.
- **Praised looks:** monochrome or duotone, high contrast on black, geometric
  or data/line-based, flicker and strobe used as structure, single-colour
  washes. Examples are Pfadfinderei, Ryoji Ikeda, Alva Noto, Nonotak, Robert
  Henke, MFO, and red-and-white for techno. REPORTED.
- **Ridiculed or contested looks:** literal figurative imagery (giant robots,
  androids, narrative clips), stage-glorifying "DJ worship" production, AI
  "slop", and generic stock loops. The Milkdrop/Winamp look is treated as
  nostalgia rather than a club standard. REPORTED for the first three. The
  screensaver stigma is only partly sourced, so it is SPECULATIVE.
- **Music sync:** practitioners place structural changes on phrase boundaries
  and keep per-kick reactivity to one element. In a controlled study,
  audio-reactive visuals scored only slightly better than random ones and were
  also described as more hectic. REPORTED.
- **Audiences mostly notice three things:** the big moments (a merge or drop
  where visuals burst), whether the visuals pull attention away from dancing,
  and brightness and glare. REPORTED, but from a thin evidence base.
- **LED walls show every flaw.** Fine detail, thin lines and repeating
  patterns fail at 5 mm pitch and above and can cause moiré. Oversaturated
  colour clips. Dark gradients band. Motion should be slow and smooth. Good
  walls look fine at 40% output or less. REPORTED.
- **Phosphor's math-abstract, no-logo, no-footage stance suits the
  underground.** Its biggest gaps are probably a true-black, low-coverage,
  monochrome "club" register and phrase-locked hard cuts or blackouts at high
  energy. The acid default palette in `session.mjs` also deserves a look.
  SPECULATIVE.

---

## Q1. Do underground techno clubs use screens at all?

**Berlin core rooms: darkness and light, not video.**

- **Berghain main floor.** It is described as mostly dark, matching
  relentless techno. Panorama Bar upstairs has more colourful, dynamic light
  and lets dawn in through the shutters. REPORTED (Atmosfera; Domus/Dezeen on
  Studio Karhard). The interior designers treat artificial light as a building
  material. REPORTED (Domus). A 2024 Klubnacht write-up notes a night with no
  lighting effects at all and says the dark helped the warehouse feel.
  REPORTED (Berlin Waveforms). Photography is banned, which also limits shared
  visual culture. REPORTED (DJ Mag; Time Out). No source found states a formal
  "no screens" policy. The absence of screens is observed, not an official
  rule.
- **Berghain Säule (newer floor).** Thin metal light bands around the
  concrete pillars glow in soft single hues that shift with the music. Steady
  red light falls from the ceiling and behind the booth. There are no screens.
  REPORTED (Electronic Beats).
- **Tresor.** The basement is described as a black void broken by strobes.
  The Tresor team calls the strobe a navigation aid in the dark. The original
  1991 vault used strobes, orange warning lights and very heavy fog. REPORTED
  (Time Out; DJ Mag; bldgblog).
- **Bassiani (Tbilisi).** Light comes mainly from overhead lasers, light
  cannons and rows of yellow spots. At times the room is fully dark except for
  the booth glow and one spotlight on one dancer. REPORTED (Dazed).
- **General Berlin taste.** Light artist Christopher Bauder says Berlin clubs
  are understated, with few flashing lights and a reduced look. He also says
  light was once an equal partner to sound before it faded back. REPORTED
  (Electronic Beats, Dark Matter). Lighting designer Veslemøy Rustad Holseter
  (Grinderteeth, who also runs visuals at Trauma Bar und Kino) names keeping a
  club dark enough as a top challenge. Nitemind's Potvin says people want to
  be in the dark with their friends. Dixon warns against lighting that
  glorifies the DJ. REPORTED (Electronic Beats, club-lighting psychology).
- **Open-air and garden clubs** (Sisyphos, Kater Blau). They rely on decor,
  festoon and coloured lights, sculptures and themed builds, not screens.
  REPORTED (berlin.de; Mixmag sketches feature via search summary).
- **Art-club hybrids** (OHM, RSO, Trauma Bar, Khidi). These are where
  projection and installation appear inside clubs. Examples: OHM's KOOKOO
  installation nights, Raster's monolithic A/V environment at RSO's Wall to
  Wall festival, and Khidi's video-art and VJ nights. REPORTED (tip Berlin;
  RA event listing; georgia.travel).
- **History.** Berlin had a strong 1990s VJ scene: Pfadfinderei, Visomat,
  Lillevan, monitor.automatique, Daniel Pflumm and others. The role later
  became an afterthought and one of the first costs cut when a club struggles.
  REPORTED (Whitehot, _Screendancing_ retrospective). A 2008 Berlin VJ said
  visuals must keep people dancing rather than standing and watching.
  REPORTED (Taipei Times).

**Where visuals are used, and how.**

- **Berlin Atonal / Kraftwerk.** Lighting and visual director Marcel Weber
  (MFO) responds to the building. In 2016 he built a roughly 20 m vertical
  screen because the hall reads as a concrete cathedral. Haze is heavy and
  visuals appear sporadically across floors. REPORTED (Freunde von Freunden;
  Crack). In 2025 the A/V that landed was monumental scenography and strobing
  corridors, plus red beams through haze over silhouettes. A looping literal
  first-person jungle video was the reviewer's least successful pairing.
  REPORTED (Clot; Berlin Waveforms).
- **Dekmantel.** The design lead calls the festival sound-forward: music
  comes first and visuals support it. He avoids spectacle for its own sake.
  The UFO stages swing between all-consuming darkness and strobe-filled cubes.
  In 2023 the smaller UFO had two screens. REPORTED (Dekmantel editorials;
  Drowned in Sound; Metal; Mixmag Asia).
- **Awakenings.** Massive LED rigs: 96 screens at ADE 2016, LED triangles on
  winches, and LED moving-head lights simulated in Notch. Too much light was
  the stated technical problem, so screens were switched individually. KBK has
  run visuals for 100+ shows on Resolume. REPORTED (disguise; Resolume blog).
- **Time Warp.** Light and video complement the hall. The 2026 Mannheim
  edition was praised for minimal staging, with sound, light and the raw hall
  at the centre. REPORTED (Inspired by Beatz; ArchUp).
- **Arena and melodic techno** (Afterlife/Anyma, Bicep, KNTXT). Screens are
  central and production-led. Bicep's show is praised for calm passages
  building to crescendos, a per-track palette, and single-colour holds during
  transitions. REPORTED (RA; MusicTech). KNTXT is marketed with pitch-black
  visual programming. REPORTED, promotional (Tickets Ibiza). Anyma's Sphere
  show split opinion on spectacle versus rave culture. REPORTED (EDM Maniac;
  Beat).
- **Boiler Room.** Started with no stage lighting and a camera behind the DJ.
  It added visuals later. REPORTED (Creative Review; Inspired by Beatz).

## Q2. Styles praised versus ridiculed

| Style                                                                            | Reception                                                            | Evidence                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monochrome or duotone on black; white lines, data, sine geometry                 | Praised, canonical in A/V techno                                     | Ikeda's _datamatics_ is pared-down black and white with colour accents; Alva Noto is minimal line and colour; Pfadfinderei use high-contrast simple shapes, sometimes a single white block; Nonotak use monochrome white light bands. REPORTED |
| Red/white and amber for techno                                                   | Practitioner default                                                 | Holseter pairs red and white for techno and amber or gold for softer moments; Säule uses steady red; Atonal 2025's praised moment was red beams through haze. REPORTED                                                                         |
| Strobe and flicker as structure                                                  | Iconic in Berlin; also a health risk                                 | Tresor's navigation strobe; Kohlberger's flicker and strobe work; Hentschläger's _ZEE_ (strobes in fog) was closed after seizure-like reactions. REPORTED                                                                                      |
| Darkness and negative space                                                      | Strongly valued                                                      | A clubber essay would rather it be too dark than too bright and asks for pauses of darkness. REPORTED (Peace of Mind)                                                                                                                          |
| Literal or figurative imagery (robots, androids, giant figures, narrative clips) | Criticised                                                           | The same essay names robot projections behind Tale Of Us and Eric Prydz as pulling attention from the music; the Atonal reviewer was confused by literal jungle footage; 2008 Berlin VJ rejected movie-plot visuals. REPORTED                  |
| Spectacle and "DJ worship"                                                       | Contested, rising                                                    | Essays say the dancefloor is becoming an audience as screens grow; Dixon warns against lighting that glorifies the DJ; half of UK clubbers in a survey said phones ruin the floor. REPORTED                                                    |
| AI-generated imagery                                                             | Stigmatised in the scene's promo culture                             | Revealed Recordings apologised for AI "slop" artwork in October 2026; one industry blog calls obvious AI promo amateurish. No techno visuals-specific backlash found. REPORTED                                                                 |
| Stock "dark geometry" loops                                                      | Ubiquitous and commoditised                                          | Many Gumroad/VJ packs are sold as dark, monochrome, BPM-synced techno loops; one seller says real minimalism is hard to find. REPORTED (market evidence, not an audience verdict)                                                              |
| Milkdrop/Winamp visualiser look                                                  | Nostalgic reference, not a club standard                             | Clients still request it; coverage frames it as retro. REPORTED. "Screensaver" as an insult is SPECULATIVE: no source found                                                                                                                    |
| Busy, colourful, high-saturation EDM look                                        | Fits arena and commercial stages; clashes with Berlin understatement | Bauder on understated Berlin; a festival report saw darker, sparser colour for house versus heavy strobes and visuals for dubstep. REPORTED                                                                                                    |
| Glitch, faces, overload                                                          | Praised in artist A/V (Weirdcore/Aphex Twin), not in club rooms      | Multi-screen control-room density and crowd face-mapping. REPORTED                                                                                                                                                                             |

**Pace, density, cuts.** No source favours constant motion. Practitioners
describe slow drift in breakdowns and more cutting and density on drops
(DJ.Studio). LED guides recommend slow, smooth motion (NMR; ROE). Bicep is
praised for calm periods and single-colour holds that set up crescendos. All
REPORTED.

## Q3. Relation to the music

- **Phrase, not kick.** Resolume's own docs say beat-matching is not required
  for abstract content and matters for visibly rhythmic content. A Max/Jitter
  VJ says too much automatic control feels mechanical and varies loop length,
  contrast and luminance instead. A VJ workflow guide keeps audio reactivity
  small and maps scene changes to song sections. REPORTED.
- **Evidence from studies.** In 62 participants, audio-driven visuals beat
  randomised visuals only slightly on aesthetic emotion (moderate effect
  sizes). The difference in perceived synchrony was large. The reactive
  version was also described as more hectic and chaotic, and some noticed sync
  slips. REPORTED (Frontiers in VR, 2025). Live visuals improved audience
  understanding of electronic performances in two of four tested design
  patterns. REPORTED (Correia, Castro and Tanaka, Audio Mostly 2017).
- **What audiences notice.** Big structural merges: when Bicep blended two
  tracks and the visuals burst, the crowd briefly stopped to watch. REPORTED
  (MusicTech). Visuals subordinate to the music: Heleen Blanken (Jeff Mills,
  Ben Klock, A Made Up Sound) says her mistakes go unnoticed while audio
  mistakes do not. Matched visuals can induce a meditative state. REPORTED.
  Long builds: an hour-long build to a hazy, lights-up finish at OHM was a
  festival highlight. REPORTED (Berlin Waveforms).
- **Slow evolution versus drops.** Techno is less drop-based than EDM.
  Lighting guides keep beams and strobes for peak hours, with washes carrying
  the early night. REPORTED (Top Pro Sound, vendor). Holseter matches colour
  intensity to the hardness of the music. REPORTED.

## Q4. Technical realities of club screens

- **Pixel pitch.** At 5 mm and above, detailed content looks poor and motion
  blurs. Text and thin lines need contrast and bold strokes. Fine repeating
  patterns cause moiré. Keep thin lines away from the wall's resolution limit.
  REPORTED (ROE; LEDWallCentral; NMR). Viewing distance in feet is roughly
  pitch in mm times three. REPORTED (vendor rule of thumb).
- **Brightness.** LED walls are emissive and very bright. Awakenings had to
  switch panels individually to control 420 m² of light output. Good walls
  look fine at 40% output or less. REPORTED (disguise; LEDWallCentral).
- **Black and gradients.** On LED, black means unlit diodes, so a dark frame
  makes the wall disappear into a dark room. That is a strength. Dark shadow
  detail can crush, and gradients band, so dithering is recommended. Heavy
  saturation clips at high brightness. REPORTED (LEDWallCentral; NMR).
- **Odd shapes.** Vertical screens (Atonal), multi-screen arrays (Weirdcore,
  Max Cooper with 8 synced screens), LED triangles, light strips and ceilings
  (Awakenings, Säule, UNVRS). Content must match the exact aspect ratio rather
  than stretch. REPORTED.
- **Projectors and haze.** Projectors in clubs fight ambient light and haze.
  Projector "black" is grey, and a mostly black image keeps the room dark.
  Sparse, high-contrast lines from a projector in haze read as volumetric
  beams, the effect lasers produce. SPECULATIVE: first-principles inference;
  the search budget ran out before sourcing.

## Q5. Notable visual artists and collectives (techno / A/V)

1. **Pfadfinderei** (Berlin): 1990s Berlin rave and BPitch Control design
   collective, Moderat's visual directors. Minimal, geometric, high-contrast,
   with an improvised live mix.
2. **MFO / Marcel Weber** (Berlin): Berlin Atonal light and visual director.
   Site-responsive, monumental, analogue plus generative, with strobe climaxes.
3. **Christopher Bauder / WHITEvoid** (Berlin): kinetic light sculptures
   (_Dark Matter_), and argues for light as an equal partner to sound.
4. **Robert Henke** (Berlin): _Lumière_ laser performances; precise
   laser/sound sync from one control source; plays lasers "quietly".
5. **Ryoji Ikeda**: black-and-white data aesthetics with colour accents,
   moving from 2D to 4D.
6. **Alva Noto / Carsten Nicolai** (Raster): sine-wave and line minimalism,
   geometric visuals almost always synced to sound.
7. **Kurt Hentschläger**: strobes in dense fog (_ZEE_, _FEED_). A perceptual
   extreme that also shows the seizure risk.
8. **Rainer Kohlberger** (Berlin): algorithmic, reductionist flicker, noise
   and drone visuals, with strobe layers.
9. **Nonotak** (Paris): monochrome light bands, strobes and op-art kinetic
   structures.
10. **Children of the Light** (Amsterdam): light-as-medium installations
    (_Mirror Moon_ for Darkside, _Warping Halos_ at the Gashouder).
11. **Weirdcore** (London): Aphex Twin's glitch, face-mapped, multi-screen
    "control room" overload, reacting to frequency bands.
12. **Heleen Blanken** (Amsterdam): self-filmed nature footage turned into
    meditative techno visuals for Jeff Mills and Ben Klock.
13. **Max Cooper and collaborators**: maths, data and science-driven A/V,
    with Ableton driving Resolume across synced screens.
14. **KBK** (NL): Awakenings' long-running LED visual team; large-format
    Resolume work.
15. **Black Box Echo / Zak Norman** (Bicep): per-track palettes, calm to
    crescendo, single-colour transition holds.
16. **Matière Noire** (NL): Dekmantel UFO scenography built from light
    sources rather than screens.

All descriptions REPORTED from the sources below.

## Q6. Implications for Phosphor (ranked)

Phosphor already has assets that fit this scene. It shows no footage, text or
logos. Its families are mathematical and abstract. It has mono palettes
(Silver, Chalk, Ice & Ink, Redline), a blackout envelope (`engine.mjs`), a
WCAG general-flash limiter (`flash-limiter.mjs`), phrase-length autopilot and
an energy fader. One flag to check: `session.mjs` sets `DEFAULT_PALETTE` to
the acid lime/blue/pink "Phosphor" palette. That conflicts with the muted
sage/sand default described in the brief. Confirm which one a first-run user
actually sees.

| #   | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                                                                          | Priority |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Add a "club dark" register.** Mostly true black (e.g. 70–90% of pixels near zero at low energy), with a bounded mean luminance and a global output-gain cap ("venue brightness"). Treat negative space as the default, not as a failure.                                                                                                                                                                                                                                  | Darkness is the main room tool at Berghain, Tresor and Bassiani; designers name darkness as a key challenge; a clubber prefers too dark over too bright; LED black disappears into the room; good walls run at 40% or less. REPORTED. Thresholds are SPECULATIVE. | **P0**   |
| 2   | **Make monochrome and duotone first-class for techno.** Add white-on-black ("bone"), red/white, amber/sodium and single-hue wash palettes. Let autopilot pick within a mood (mono) instead of hopping across hues.                                                                                                                                                                                                                                                          | Ikeda, Alva Noto, Pfadfinderei, Nonotak; Holseter's red and white for techno; Säule's single hues; Berlin understatement. REPORTED                                                                                                                                | **P0**   |
| 3   | **Map the energy fader to contrast, density, cut rate and flash access before hue or saturation.** Calm means sparse, slow, dim and one hue. Peak means more coverage, harder cuts and strobe hits.                                                                                                                                                                                                                                                                         | Beams and strobes saved for peak; Bicep's calm-to-crescendo arc; Holseter matches colour intensity to hardness. REPORTED                                                                                                                                          | **P0**   |
| 4   | **Keep scene changes phrase-locked and limit per-beat reactivity to one element per scene.** Expose a "reactivity" ceiling. Default to low per-kick motion and stronger response at phrase or section boundaries.                                                                                                                                                                                                                                                           | Resolume; Max/Jitter VJ; DJ.Studio; the Frontiers study found reactive visuals only slightly better and more hectic. REPORTED                                                                                                                                     | **P0**   |
| 5   | **Add phrase-boundary blackout and hard-cut transitions** as alternatives to crossfades. At high energy, allow a cut on the downbeat or a one-bar blackout before the new look. Keep slow crossfades for low energy. Route everything through the flash limiter.                                                                                                                                                                                                            | Bicep's single-colour transition holds; the darkness pauses requested by clubbers; drops get more cutting (DJ.Studio). REPORTED, design SPECULATIVE                                                                                                               | **P1**   |
| 6   | **Strobe mode inside the safety envelope.** Full-frame white or low-saturation flashes at phrase hits, capped at 3 per second. Before shipping red/white strobe palettes, add red-flash handling: the current limiter only covers full-frame general flash, not red or spatial flash.                                                                                                                                                                                       | WCAG 2.3.1 includes a separate saturated-red test; _ZEE_ seizure closures; strobes are iconic at Tresor. REPORTED                                                                                                                                                 | **P1**   |
| 7   | **"LED-safe" output option.** Set a minimum stroke and feature size in output pixels, suppress fine periodic patterns (wallpaper, moiré, Truchet, Hilbert and quasicrystal at fine scales), clip saturation, and keep grain/dither on dark gradients.                                                                                                                                                                                                                       | Problems at 5 mm+ pitch; moiré from fine repeats; banding and dithering; saturation clipping. REPORTED                                                                                                                                                            | **P1**   |
| 8   | **Arbitrary aspect ratios that compose well:** vertical (9:16 to 1:3), strips (4:1 to 10:1) and multi-output spans. Check that each family re-centres sensibly rather than cropping.                                                                                                                                                                                                                                                                                        | Atonal's vertical screen, LED strips and ceilings, multi-screen A/V shows. REPORTED                                                                                                                                                                               | **P1**   |
| 9   | **Curate family fit for techno rooms.** Strongest are sparse, line or field-based, mono-friendly families: Chladni, interference/moiré at coarse scale, beams, pulse, Life, physarum, reaction-diffusion, attractors as line art, Kleinian/Hopf as line work, and the raymarched cathedral as slow monumental holds. Use colourful fractal zooms (Mandelbrot, Julia, Newton), flames and rainbow hue cycling sparingly, since they risk the visualiser/screensaver reading. | Praised A/V aesthetics are line/data/mono (REPORTED); screensaver association SPECULATIVE                                                                                                                                                                         | **P1**   |
| 10  | **Venue presets:** "Basement" (mono, about 85% dark, strobe hits, 16–32-bar holds), "Daylight/Panorama" (warmer, more colour, softer), "Festival LED" (higher contrast and density, brightness cap), "A/V hall" (slow, monumental, long builds).                                                                                                                                                                                                                            | The contrast between Berghain and Panorama Bar; Dekmantel's deliberate contrasts between stages; Atonal's long builds. REPORTED, presets SPECULATIVE                                                                                                              | **P2**   |
| 11  | **Longer autopilot holds** (32–64 bars) for hypnotic or minimal techno, plus slow parameter drift inside a hold, so looks evolve instead of rotating.                                                                                                                                                                                                                                                                                                                       | Hypnotic long builds landed at Atonal; one VJ varies loop length and contrast instead of switching clips. REPORTED                                                                                                                                                | **P2**   |
| 12  | **"Light-source" wash mode:** low-detail full-field single-hue output, so a screen can act as room light (like Säule's bands or Bicep's transition holds).                                                                                                                                                                                                                                                                                                                  | Säule bands; Bicep holds. REPORTED                                                                                                                                                                                                                                | **P2**   |
| 13  | **Keep the no-figurative, no-AI-imagery stance as positioning.** In copy, say that every frame is computed mathematics, not generated imagery.                                                                                                                                                                                                                                                                                                                              | AI "slop" stigma; criticism of literal robot imagery. REPORTED                                                                                                                                                                                                    | **P2**   |

**Next tests (SPECULATIVE):**

- Measure each family's mean luminance and black-pixel share per energy level.
- Run the LED-safe check by rendering at 1/8 resolution with nearest-neighbour
  upscaling.
- Do a blind A/B with a few Berlin clubbers: mono club register against the
  current default on a dark projector.

---

## Sources

Venues, Berlin

1. Domus, Studio Karhard apartment (Berghain designers): https://www.domusweb.it/en/interiors/gallery/2026/02/13/house-by-karhard-berghain-designer-berlin.html
2. Electronic Beats, Säule review: https://www.electronicbeats.net/reviewed-berghains-new-experimental-dance-floor-saule
3. Electronic Beats, psychology of club lighting: https://www.electronicbeats.net/investigating-the-psychological-effects-of-club-lighting
4. Atmosfera, light design in nightclubs: https://www.atmosferamag.it/light-design-nightclub-history/
5. Berlin Waveforms, Berghain Klubnacht 29 Sep 2024: https://berlinwaveforms.substack.com/p/josh-wink-nd_baumecker-and-stefan
6. Time Out Berlin, Tresor: https://www.timeout.com/berlin/nightlife/tresor
7. DJ Mag, Berlin's Tresor hits London: https://djmag.com/content/berlins-tresor-hits-london
8. BLDGBLOG, Tresor: https://bldgblog.com/2007/01/tresor/
9. Electronic Beats, Bauder _Dark Matter_: https://www.electronicbeats.net/berlin-dark-matter-exhibition
10. Freunde von Freunden, Marcel Weber at Kraftwerk: https://www.freundevonfreunden.com/music/a-tour-through-a-former-east-berlin-power-plant-turned-nightclub-and-venue-with-marcel-weber/
11. Crack, Berlin Atonal 2017: https://crackmagazine.net/article/live-reviews/from-apocalyptic-visions-grotesque-berlin-atonal-2017/
12. Clot, Atonal 2025 review: https://clotmag.com/oped/atonal-2025-the-house-that-jack-built-five-days-of-noise-darkness-in-the-looming-corridors-of-kraftwerk-berlin
13. Berlin Waveforms, Atonal 2025: https://berlinwaveforms.substack.com/p/the-underground-meets-the-art-world
14. Whitehot, _Screendancing_ (90s Berlin club visuals): https://whitehotmagazine.com/articles/may-2010-screendancing-hbc-berlin/2066
15. Format, Pfadfinderei: https://format.com/magazine/pfadfinderei-design-berlin-electronic-music-moderat
16. Taipei Times, German VJ culture (2008): https://www.taipeitimes.com/News/feat/archives/2008/05/28/2003413094
17. berlin.de, Sisyphos: https://www.berlin.de/en/clubs/8872029-4469452-sisyphos.en.html
18. tip Berlin, KOOKOO at OHM: https://www.tip-berlin.de/event/kookoo-the-long-light-after-time-gong-dj-sets-und-installation-im-ohm/
19. RA event, RSO Wall to Wall / Raster: https://ra.co/events/1540117

International venues and festivals 20. Dazed, inside Bassiani: https://www.dazeddigital.com/music/article/41340/1/inside-bassiani-tbilisi-georgia-techno-protests 21. Dekmantel, Designing the Moment: https://dekmantel.com/Editorial/designing-the-moment 22. Dekmantel, stage designs: https://dekmantel.com/editorial/in-for-the-long-run-stage-designs 23. Metal Magazine, Dekmantel 2023: https://metalmagazine.eu/en/post/dekmantel-2023 24. disguise, Awakenings ADE case study: https://www.disguise.one/en/insights/case-studies/awakenings-ade 25. Resolume blog, KBK / Awakenings: https://www.resolume.com/blog/14965 26. Inspired by Beatz, Time Warp 2026: https://www.inspiredbybeatz.com/en/time-warp-2026-19-hours-not-a-single-gimmick/ 27. ArchUp, Time Warp designs: https://archup.net/nature-inspired-designs-at-time-warp-techno-festival-where-engineering-meets-environment 28. Inspired by Beatz, Boiler Room at 15: https://www.inspiredbybeatz.com/en/boiler-room-15-years-club-culture/ 29. Creative Review, Boiler Room visuals: https://www.creativereview.co.uk/boiler-room-hayden-martin-ai-photography-music/ 30. RA review, Bicep at Printworks: https://ra.co/reviews/23321 31. MusicTech, Bicep Coachella 2024: https://musictech.com/features/opinion-analysis/bicep-coachella-2024-avdj-set/ 32. EDM Maniac, Anyma at Sphere: https://edmmaniac.com/?p=126 33. Beat, Anyma and EDM: https://beat.com.au/what-tales-of-us-did-for-techno-anyma-does-for-edm/ 34. Tickets Ibiza, Charlotte de Witte at UNVRS (promotional): https://ticketsibiza.com/de/event/charlotte-de-witte-unvrs-2026-05-29/ 35. Festival Squad, Movement 2019: https://festivalsquad.com/2019/05/movement-music-festival-a-haven-for-techno-and-house-purists

Audience and culture 36. Laureline, "The dancefloor is turning into an audience": https://jefaisqueregarder.substack.com/p/the-dancefloor-is-turning-into-an 37. Peace of Mind, rethinking rave lighting: https://peaceofmind.link/the-science-of-the-sensational-light-show-rethinking-rave-festival-lighting-and-visuals/ 38. NME, phones survey: https://www.nme.com/news/music/half-of-all-clubbers-think-that-phones-are-ruining-the-dancefloor-3918512 39. EDM.com, Revealed "AI slop" apology: https://edm.com/news/revealed-recordings-apologizes-ai-slop-artwork/ 40. CDM, classic visualisers for VJ apps: https://cdm.link/recreate-classic-mp3-visualizers-free-use-vj-apps/ 41. Example VJ-pack market listing (dark geometry techno): https://vjkazakhstan.gumroad.com/l/Kpful

Practitioners and artists 42. Subbacultcha, Heleen Blanken: https://subbacultcha.nl/2015/03/31/heleen-blanken/ 43. The Skinny, visual artistry: https://www.theskinny.co.uk/clubs/interviews/the-practice-and-proliferation-of-visual-artistry 44. Dazed, Weirdcore: https://www.dazeddigital.com/music/article/37384/1/weirdcore-aphex-twin-mia-visuals-interview 45. Ableton, Robert Henke _Lumière_: https://ableton.com/en/blog/robert-henke-lumiere-lasers-interview 46. Forma, Ryoji Ikeda _datamatics_: https://www.forma.org.uk/projects/datamatics 47. CDM, Alva Noto UNIEQAV: https://cdm.link/alva-noto-unieqav/ 48. Rhizome, Hentschläger _ZEE_: https://rhizome.org/editorial/2009/apr/13/zee-2008-kurt-hentschlaeger/ 49. NBC Philadelphia, _ZEE_ seizure closure: https://www.nbcphiladelphia.com/news/national-international/art-exhibit-seizures-zee/1971584/ 50. CTM archive, Rainer Kohlberger: https://archive2013-2020.ctm-festival.de/archive/all-artists/p-t/rainer-kohlberger/ 51. inkl, Nonotak _Eclipse_: https://www.inkl.com/news/light-and-sound-art-show-eclipse-by-nonotak-is-an-immersive-and-sensory-experience 52. WePresent, Children of the Light: https://wepresent.wetransfer.com/stories/children-of-the-light-harness-power-of-light 53. Ableton, Max Cooper: https://www.ableton.com/en/blog/composing-infinity-max-cooper-his-new-album/

Sync and studies 54. Resolume, BPM sync docs: https://resolume.com/support/en/bpm 55. DJ.Studio, VJ mix workflow: https://dj.studio/blog/create-vj-mixes 56. Cycling '74 forum, live A/V sync: https://cycling74.com/forums/liveon-the-fly-sync-of-audio-with-video 57. Frontiers in VR (2025), audio-reactive vs random visuals: https://www.frontiersin.org/articles/10.3389/frvir.2025.1552321/full 58. Correia, Castro and Tanaka (2017), live visuals and understanding: https://research.gold.ac.uk/id/eprint/20878

Technical and safety 59. ROE Visual, content design for LED: http://www.roevisual.com/en/knowledge-and-support/content-design-in-relation-to-led-screens 60. NMR Events, LED content best practices: https://nmrevents.com/post/led-content-best-practices 61. LEDWallCentral, DVLED content essentials: https://www.ledwallcentral.com/content-creation-essentials-for-dvled-walls.htm 62. Top Pro Sound, nightclub lighting techniques (vendor): https://topprosound.com/stage-lighting-techniques-for-nightclubs/ 63. W3C WCAG 2.1, Three Flashes or Below Threshold: https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold 64. Wikipedia, Harding test: https://en.wikipedia.org/wiki/Harding_test
