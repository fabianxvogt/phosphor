# Community research and launch plan (2026-10-14)

**Status:** parked by owner (2026-10-16); proposal, not acted on. Nothing here changes a decision in the [decision log](../../DECISIONS.md) until the owner accepts it. Classification: **EXPLORATORY / REPORTED**: a synthesis of community and press evidence, not measured user behaviour.

## Lane reports

| #   | Report                                                    | Question                                                     |
| --- | --------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | [VJ tools and workflows](01-vj-tools-workflows.md)        | What do working VJs expect from a tool?                      |
| 2   | [Club visual aesthetics](02-club-visual-aesthetics.md)    | What works visually at techno parties, especially in Berlin? |
| 3   | [Competitive landscape](03-competitive-landscape.md)      | Who already does this, and where is a niche?                 |
| 4   | [Gig rig, sync and business](04-gig-rig-sync-business.md) | What breaks at real venues; how sync works with DJs          |
| 5   | [Launch channels](05-launch-channels.md)                  | Where and how to share; how such launches are received       |

**Method limit:** Reddit and the Resolume forum blocked every research tool, including the built-in browser. Reddit opinions therefore come from search snippets and are anecdotal; subreddit rules must be checked while logged in before posting. The shared web-search budget ran out in every lane, so the evidence on projectors, haze, pay and DJM-A9 clock output is thin.

## What the evidence says

1. **Phosphor has a real visual identity.** Its curated mathematics/simulation catalog (physarum, reaction–diffusion, Kleinian, worlds) is uncontested; free browser rivals mostly ship MilkDrop presets or fractal zooms (03). Quality of visuals drives praise in every comparable launch (01, 05).
2. **"Runs in a browser" is not a selling point.** At least eight browser visualizers launched in 2025–26; generic ones scored 1–8 points on Show HN, while launches with a distinctive emergent-systems angle scored 60–360 (03, 05).
3. **Working VJs need two things Phosphor lacks:** a route into their stack (Spout/Syphon/NDI) and an external tempo clock. Tap tempo itself is normal practice; automatic beat detection on DJ mixes is distrusted anyway (01, 04).
4. **Autopilot is a co-pilot, not a replacement.** VJs are ambivalent to hostile about unattended visuals; solo DJs and venues without a VJ want it, but that market is sold on beat/structure detection, Phosphor's weak spot (01, 03, 04).
5. **Berlin core rooms are dark.** Berghain, Tresor and Bassiani main floors use darkness, strobes, red/white or amber light and fog, not screens. Screens live at festivals and A/V stages (Atonal, CTM, Awakenings, Dekmantel). Praised looks: monochrome/duotone on black, line and data geometry, strobe as structure. Ridiculed: figurative robots, DJ glorification, AI slop, stock loops (02).
6. **Music relation:** change scenes on phrase boundaries; keep per-beat reactivity small. Reactive visuals beat random ones only slightly and feel more hectic (02).
7. **LED walls punish fine detail.** Fine repeating patterns cause moiré at ≥5 mm pitch, gradients band, saturation clips; good walls run at ≤40 % brightness. Most venue failures are processor cropping, EDID/HDCP, heat and 50 Hz, not software (02, 04).
8. **Realistic beat-tracking ceiling:** about 80 % beat / 47 % downbeat F1 at ±70 ms for the best published online trackers. Phosphor's 20 ms target was stricter than the literature (04).
9. **The live site is not launch-ready:** no link-preview tags, title "Phosphor · control", no explainer, phone path, photosensitivity notice or feedback channel; about 12.7 MB precached per visitor (05; verified title/meta in `index.html`).
10. **Safety gap:** the flash limiter is full-frame only. Spatial (part-screen) and saturated-red flashes are not covered, as its own header states (`flash-limiter.mjs`) (02, 04).

## Proposed positioning

> **Phosphor: living mathematics for the dark room.** A free generative VJ instrument in the browser: slime moulds, reaction–diffusion and hyperbolic tilings that follow the DJ. Play it from the keyboard, or let the co-pilot carry the long hours.

Lead with the catalog as proof, frame autopilot as co-pilot, state "every frame is computed, no generated imagery", keep the core free and without accounts (01–03).

## Roadmap proposal

Phases follow the owner's sequence: research (done) → improvement round → launch assets → community waves. The first gig remains the most valuable evidence and runs in parallel.

### Phase 1 — Improvement round (15 Oct – 15 Nov)

**A. Club look (P0):**

- **Club-dark register:** mostly true black at low energy, venue brightness cap.
- **Monochrome/duotone first-class:** bone white, red/white, amber, single-hue wash; autopilot stays within a mood.
- **Energy fader** mainly drives contrast, density, cut rate and flash access, not hue.
- **Reactivity ceiling;** look changes stay phrase-locked.
- **High-energy transitions:** downbeat cut and one-bar blackout. Keep slow fades at low energy.
- **"Techno room" filter:** curate the families that read well in dark rooms (Chladni, coarse moiré, beams, pulse, Life, physarum, RD, line attractors, Kleinian/Hopf line work, cathedral holds); use colourful fractal zooms sparingly.
- **Longer holds:** 32–64 bars with in-hold drift.

**B. Timing (P0/P1):**

- **Tracker-assisted tap:** tap/downbeat anchor the grid; the tracker applies only confidence-gated corrections (±40 ms, ±2 %) and shows a drift light. Report F-measure at ±70 ms beside the 20 ms target.
- **MIDI clock input via Web MIDI** (follower only, tap fallback). This reverses part of D35 and needs an owner decision.

**C. Venue robustness (P0):**

- **Venue-check page:**
  - edge grid
  - measured size and refresh rate
  - 50/60 Hz choice
  - black/white levels
  - GPU-light safe loop
- **Output region:** render into a sub-rectangle or strips of the output frame, for LED processors that take 1080p and crop.
- **Flash limiter:** per-tile flash detection and a red channel, plus a counter-phase CI pattern.
- **Eight-hour external-display soak:** already a show gate, still open.

**D. Out of the browser (P0/P1):**

- **Recording and seamless tempo-length loop export (WebCodecs), 16:9 and 9:16:** for reels, Resolume rigs and loop packs. This partly reverses D35.
- **Documented OBS route** (window capture → NDI/Spout/Syphon).
- **MIDI templates:** APC mini/40, Launchpad, Midi Fighter Twister, nanoKONTROL/MIDImix.
- **Native output helper:** only after community feedback asks for it.

**E. First contact (P0, before any post):**

- **Link previews and page identity:** OG/Twitter tags, a 1200×630 image and a real page title.
- **"Start here":** three-step overlay with a photosensitivity notice and a **Just watch** mode.
- **Phone/unsupported-browser path:** an explainer and a video or light watch mode; never run a full simulation and the offline precache on phones.
- **Precache only on request:** run it on "Prepare for show / install offline". Verify the Vercel Hobby bandwidth limit and its non-commercial terms first.
- **Weak-GPU default** and a minimum-spec line.
- **Immediate click feedback:** the card highlights and the picture starts changing at once; currently the name switches seconds before the picture.
- **Feedback channel:** GitHub Discussions and an issue template; a **Copy diagnostics** button; "no tracking" stated.
- **Honest status copy:** pre-gig, desktop Chrome, tap-first on a live feed.

### Phase 2 — Launch assets (mid–late Nov)

- 30–45 s hero reel with owned or licensed audio; 5–10 s family loops, horizontal and vertical.
- Technical write-up (physarum/RD/Kleinian on the GPU, crash-isolated stage, tempo honesty) for HN and r/GraphicsProgramming.
- Plain README **Start here**; prepared answer on AI-assisted development (owner wording).

### Phase 3 — Community waves

| Wave                    | When            | Where                                                                                                                        | Asset                            |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1 Quiet expert feedback | late Nov        | Berlin VJ Open Lab (Trials-and-Errors slot), Creative Code Stammtisch, one r/vjing feedback post, 3–5 DJs/promoters directly | live demo, reel                  |
| 2 Generative-art wave   | Dec–Jan         | r/generative, r/creativecoding, r/proceduralgeneration, Genuary (#genuary, Mastodon/Bluesky/Instagram)                       | family loops, technical angle    |
| 3 VJ wave               | after first gig | r/vjing, VJ Union, CDM                                                                                                       | real club footage (with consent) |
| 4 Broad                 | Jan+            | Show HN with write-up, r/GraphicsProgramming; later Product Hunt, r/InternetIsBeautiful (only with a phone-safe mode)        | write-up, landing                |

Draft titles per channel: [launch report](05-launch-channels.md#draft-titles-not-posted). The owner posts; agents never post.

### Out of scope

Clip mixing, projection mapping, DMX, AI generation, Safari/Firefox (Chrome-only accepted by this audience), accounts and watermarks.

## Owner decisions needed

1. **Positioning:** accept "co-pilot / living mathematics for the dark room"?
2. **D35 reversal:** MIDI clock input and recording/loop export?
3. **Native helper** (Syphon/Spout/NDI) under the browser-first hosting rule: build later only on demand, or never?
4. **Revenue:** keep everything free, or a paid helper/pro export later?
5. **Launch gating:** wave 1 before the first gig (recommended) or wait for club footage?
6. **AI-assistance disclosure** wording.
7. **First gig:** the 2026-12-17 date is still a placeholder.

## Small findings to fix

- `session.mjs` `DEFAULT_PALETTE` is acid lime/blue/pink. Sets default to Symbiosis, so this only affects legacy callers; check that no first-run path shows it.
- Catalog thumbnails show grey placeholders while scrolling until lazily rendered.
