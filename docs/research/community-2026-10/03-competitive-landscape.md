# Competitive landscape: live visuals and VJ tools (October 2026)

Lane 03 of the community research set. This is read-only desk research done on 2026-10-14. It covers 35+ tools in four groups: pro VJ suites, generative/node tools, browser and DJ-automation tools, and AI tools.

**Evidence labels.** `REPORTED` means a vendor page, press article, forum post or repository metadata states it. It is still not independently verified. Vendor claims about scale ("25,000+ users") are marked as vendor claims. `SPECULATIVE` means this lane's inference. Prices are list prices seen on the date above, excluding VAT, and may change. All wording is paraphrased.

**Method limits.** Reddit could not be fetched directly. Opinion signals come from search snippets of r/vjing and r/resolume, the Resolume forum, and aggregators. The web-search budget ran out before a planned final pass on Synesthesia-vs-TouchDesigner opinions and WebGPU launches. Treat user-sentiment lines as anecdotal.

---

## Summary

1. **The browser niche is no longer empty** (REPORTED). Since 2025, at least eight browser or browser-adjacent visualizers have launched or posted a Show HN. VJam (free, PWA, 1,300+ presets including 945 MilkDrop) and VVavy (free, 226 scenes, MIDI, 9:16 export) are the closest. On HN each got only 1–8 points. A browser launch alone does not earn attention.
2. **Synesthesia is the closest paid competitor** (REPORTED). It costs $199 Standard or $399 Pro, perpetual, with an unlimited watermarked trial. It offers shader "scenes" with a strong audio engine, Shadertoy/ISF import and an in-app marketplace. Most of the $200 Pro premium buys Syphon, Spout, NDI and OSC, which shows these are the features working VJs pay for.
3. **DJ autopilot is real demand but crowded** (REPORTED). SYQEL Live, HYPERFLUX ($39/$79 with DMX), DjMirror Pulse ($99 or $179/yr), VJ AutoStage Pro and OneManVJ all sell "visuals without a VJ". An academic study found DJs and VJs ambivalent about automated visuals.
4. **Phosphor's real differentiators** (SPECULATIVE, based on the matrix):
   - a curated, rated catalog of _simulated_ mathematics with persistent state (physarum, reaction-diffusion, Kleinian, Hopf);
   - a muted, organic house aesthetic;
   - a crash-isolated stage window;
   - "living worlds" that develop with the music.

   Competitors in the browser mostly ship MilkDrop presets, fractal zooms or stateless shaders.

5. **Phosphor's credibility gaps against even cheap rivals** (REPORTED for the competitors):
   - no output to other software (Syphon, Spout or NDI);
   - no recording or export;
   - no external tempo sync (MIDI clock or Link);
   - a beat tracker the team itself calls unreliable.

   VJam, VVavy and HYPERFLUX each already offer recording, and most paid tools offer Spout, Syphon or NDI.

6. **Demand for web visuals inside Resolume is documented** (REPORTED). Resolume forum threads ask for browser sources. A paid Chromium fork with Spout output (SpoutBrowser) exists for exactly this. A "generative source for your Resolume rig" is the highest-value integration (SPECULATIVE).
7. **Loop export is the cheapest path into pro rigs** (SPECULATIVE). Rendered seamless loops would reach the existing VJ-loop market (Resolume Footage packs at €29–99, many Gumroad sellers) without a native helper.
8. **Communities grow through free tiers, tutorials, open formats and paid creators** (REPORTED). Examples:
   - TouchDesigner's free non-commercial tier plus an educator ecosystem: one Patreon has about 11.7k members, and the subreddit grew about 60% in a year.
   - Synesthesia's artist marketplace and Discord.
   - Resolume's artist footage labels.
   - Hydra and cables, which are free/open and grow through workshops and grants.
   - Butterchurn (MIT licence), embedded by other apps.
9. **AI real-time video is the momentum story of 2025–26, but heavy** (REPORTED). StreamDiffusion, Daydream Scope and StreamDiffusionTD need an RTX-class GPU or a cloud GPU. Browser AI VJ (freebeat) reports 3–5 s of latency. Being offline, deterministic and AI-free is a defensible counter-position (SPECULATIVE).
10. **Recommended position** (SPECULATIVE): "the free, zero-install generative instrument for DJ nights, with the most beautiful curated mathematics." Then earn the pro-rig claim with loop export and a later native output bridge. Do not compete on clip mixing, mapping or layering.

---

## Per-tool profiles

Format: **who / price / platform / core / output and sync / sentiment / momentum.**

### Synesthesia (Gravity Current, Austin): the closest competitor

- **Who:** DJs, VJs, streamers, shader coders (REPORTED, synesthesia.live).
- **Price** (REPORTED, pricing page):
  - Free trial: unlimited, watermarked, no sign-up.
  - Standard: $199 perpetual, 1 active device, MIDI mapping.
  - Pro: $399 perpetual, 2 devices, adds Syphon/Spout/NDI and OSC in and out.
  - One year of updates is included; renewal is optional at $60/yr. Updates are currently free for everyone.
- **Platform:** macOS and Windows. Needs OpenGL 3.3. The vendor uses a GTX 1060 as its GPU baseline and advises keeping scenes at roughly 45 fps or better (REPORTED, FAQ and troubleshooting docs).
- **Core** (REPORTED):
  - Generative GLSL "scenes" in its own format (SSF), with audio uniforms.
  - 80 built-in scenes plus 20+ free marketplace scenes; the pricing page says "100+ from 20+ artists".
  - Shadertoy and ISF import, a built-in scene editor/live coding, and media/webcam/logo input with effects.
  - Crossfading is described as an initial version. Alpha is treated as black.
- **Sync:** live audio input with an in-house analysis engine, OSC export of audio features (Pro), and NDI in and out since v1.17. No Ableton Link or recording appears on official pages (REPORTED absence).
- **Sentiment** (REPORTED, r/vjing snippets): praised for audio-reactive shaders that look good out of the box and for audio tuning that works with poor laptop mics. Some users route its FFT over OSC into other tools. Aggregator pages flag GPU load and the cost of the full feature set for hobbyists.
- **Momentum:** steady but incremental. The changelog runs v1.17 → v1.20 (2022) → v1.25.2 (current). Company founded 2014; a small team of about 5 per a Gust profile. Community runs through Discord, a Facebook group and the in-app marketplace (REPORTED).
- **Implication** (SPECULATIVE): Synesthesia wins on audio feel, an artist pipeline and pro I/O. Phosphor can differ on zero install, a free price, simulation families with memory, an autopilot that follows song structure, and curation. Synesthesia's look leans toward "shader demo".

### Resolume Avenue / Arena / Wire

- **Who:** working VJs, clubs, festivals. Arena adds mapping, edge blending and DMX for LED walls.
- **Price:** Avenue €299, Arena €799, Wire €399, per computer. Watermarked trial, 50% education discount, 12 months of updates then optional renewal (€79 / €219). No subscription since v7 (REPORTED, shop and renewal pages).
- **Core:** a clip mixer with layers, effects and generators. ISF support requires Wire. Ableton Link and OSC are supported. Spout, Syphon and NDI in and out.
- **Ecosystem:** the Resolume Footage store sells artist packs (about €29–99). Its licence restricts footage to live shows: no recording or streaming of the raw clips (REPORTED).
- **Sentiment** (REPORTED, forum and Reddit snippets): fast to learn, but expensive. Crash reports cluster around large sets and specific versions. In April 2025 a nine-licence team said it no longer trusted Resolume for events; replies blamed hardware and OS.
- **Momentum:** the incumbent, actively maintained.

### TouchDesigner (Derivative)

- **Who:** interactive and installation artists, technical VJs, students.
- **Price:** Non-Commercial free, capped at 1280×1280 and with no paid work allowed. Educational $300, Commercial $600, Pro $2,200 (REPORTED, licensing page).
- **Core:** node-based real-time programming with full audio, sensor and network I/O, plus Syphon/Spout/NDI. The POP operator family arrived in 2025 (REPORTED).
- **Sentiment:** unmatched power, but a steep learning curve (REPORTED, roundups).
- **Momentum:** very strong. r/TouchDesigner has about 47k members, up about 60% in a year per a third-party tracker. Educator Patreons reach about 11.7k members (elekktronaut). Derivative runs workshops and an AI/StreamDiffusion ecosystem (REPORTED).

### VDMX6 (Vidvox)

- **Who:** Mac VJs who build custom interfaces.
- **Price:** $199, or Plus at $349 with TouchDesigner and Vuo hosting. Launch coverage in 2024 reported $99/$249. Education discounts available (REPORTED, Vidvox cart and CDM).
- **Platform:** macOS only, on a Metal engine.
- **Core:** modular clip and generator mixing, an ISF host (Vidvox created ISF and HAP), and tempo tracking.
- **Momentum:** a niche but loyal Mac user base.

### MadMapper (GarageCube)

- **Who:** projection and LED mapping, lasers.
- **Price:** perpetual about €479–519. Rental about €44–49/month. Watermarked demo (REPORTED, reseller pages and the official v5 bundle page; figures conflict).
- **Core:** mapping first, with ISF generators built in.
- **Relevance:** mapping is out of Phosphor's scope. MadMapper is a _destination_ for a Phosphor source via Syphon/Spout.

### Magic Music Visuals

- **Who:** budget audio-reactive VJs and music video makers.
- **Price:** about $45 Studio, about $80 Performer (REPORTED, roundups; figures conflict).
- **Core:** modular 2D/3D and GLSL with multiple audio/MIDI/OSC inputs, file export and folder-based ISF.
- **Sentiment:** good value and light on resources. The modular UI takes learning (REPORTED).

### Modul8 (GarageCube)

- macOS-only veteran VJ mixer, now at v3. It supports macOS 26 but needs Rosetta on Apple Silicon (REPORTED, garagecube.com).
- **Momentum:** legacy and maintained, with little growth (SPECULATIVE).

### Millumin

- **Who:** theatre and cue-based shows.
- **Price:** rental from about €29/week; lifetime about €399/$499. 50% education discount. 30-day full trial, then watermark (REPORTED).
- **Platform:** macOS only.
- **Relevance:** another destination, not a rival.

### Notch

- **Who:** high-end real-time motion graphics for touring and broadcast.
- **Price:** subscription tiers; legacy Builder Pro about £189/month, VFX annual about $1,399. Media-server export is gated to higher tiers (REPORTED, manual FAQ and a third-party tracker).
- **Platform:** Windows only.
- **Relevance:** not in Phosphor's market.

### Smode

- **Who:** pro real-time compositing.
- **Price:** Smode Community is free for non-commercial use, Full HD with no watermark, and includes MIDI/OSC/NDI/Spout. Paid tiers are subscriptions (REPORTED).
- **Platform:** Windows-first.

### Videosync (Showsync), Max for Live

- **Who:** Ableton Live performers.
- **Price:** €199 full, €79 Lite (REPORTED, SonicState, December 2025).
- **Platform:** v2 added Windows.
- **Core:** treats video like audio inside Live (warping, racks, automation) and ships with a 200+ ISF shader collection.
- **Relevance:** tempo-locked visuals for musicians who already own Live, a segment Phosphor reaches only through tempo sync.

### Butterchurn / MilkDrop / projectM / NestDrop

- **Butterchurn:** MIT, WebGL2 MilkDrop port, about 2.0k GitHub stars, pushed April 2026. It is embedded in Music Assistant, MusicBee, Cider and Webamp-style apps (REPORTED).
- **projectM:** LGPL-2.1, about 4.5k stars, active October 2026 (REPORTED).
- **NestDrop:** Windows MilkDrop VJ engine with Spout, used for fulldome. Free Classic edition plus paid Midnight editions (REPORTED). Its 2020 Show HN drew 64 points and 115 comments, the strongest VJ Show HN found.
- **2026 MilkDrop wave:** milkbar.fm (Show HN, June 2026), IKANDY (Steam, Windows, 500+ scenes, $0 / $7.99 / Studio $39.59–59.99) and TripWave (Apple TV) (REPORTED).
- **Implication** (SPECULATIVE): MilkDrop's 50k-preset legacy is the commodity baseline for free browser visualizers. Phosphor must look clearly _not_ like MilkDrop.

### Hydra

- **What:** browser live-coding video synth by Olivia Jack. AGPL-3.0, about 2.7k stars.
- **Community:** grows through workshops in 2025 (Linz/TOPLAP, Bogotá, Frankfurt NODE) and the TOPLAP live-coding network (REPORTED).
- **Model:** free, with no product monetisation.
- **Lesson:** a zero-install URL plus teachable workshops travels far.

### cables.gl

- **What:** browser node-based patcher with an Electron standalone (v0.7.0, July 2025). MIT per the vendor; the GitHub API shows no licence. About 570 stars (REPORTED).
- **Money:** all major features stay free. Patreon tiers lift storage and export limits. Funded partly by NLnet grants (REPORTED).

### KodeLife (Hexler)

- Live GLSL editor for desktop and mobile, with audio spectrum textures and MIDI. iOS/Android about $9.99 (REPORTED).
- **Audience:** shader coders, not DJs.

### Vuo (Kosada)

- Node-based Mac tool. Community Edition free for personal use and small organisations; Pro $299 (REPORTED).
- **Relevance:** low.

### Lumen (Paracosm)

- Mac semi-modular "analog-style" video synth with 150+ patches, $129, licensed for two machines (REPORTED).
- **Lesson:** a coherent instrument metaphor plus a curated patch library sustains a small paid product. This parallels Phosphor's "instrument" framing (SPECULATIVE).

### TiXL (formerly Tooll3)

- Open-source Windows real-time motion graphics, MIT, about 5.1k stars, active October 2026 (REPORTED).

### iPad and mobile apps

- **Imaginando VS 2:** layered audio-reactive shaders. iPad $49.99; desktop €99, then €129 after 2025 promotions. Runs as a plugin inside Live/AUM. No Ableton Link found (REPORTED).
- **Vythm:** iOS, MIDI and NDI out, freemium subscription (REPORTED).
- **Others:** 100VJ, SoundReact, AV Synth (NDI) (REPORTED).
- **Gap:** no strong generative-math iPad instrument was found (SPECULATIVE; lightly searched).

### Plane9

- Windows visualizer, free plus Pro. AlternativeTo marks it discontinued (REPORTED).

### Browser and DJ-automation tools launched 2023–2026

| Tool                                        | What and who                                              | Price                                                            | Key features (REPORTED)                                                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VJam** (vjam.art; Show HN Feb 2026)       | Browser VJ, any device                                    | Free, no account                                                 | 945 MilkDrop + 426 original p5/GLSL presets; mic/file beat detection; A/B decks and crossfader; MIDI (DJ2GO2 profile); 4-point mapping; WebCodecs recording; PWA offline                                                                              |
| **VVavy**                                   | Browser visualizer for performers, streamers, clip makers | Free                                                             | 226 scenes; webcam/video effects; MIDI in; tab/system capture; 9:16 and 16:9 export; OBS browser source; custom shaders                                                                                                                               |
| **vizz.fm** (Show HN May 2026)              | Browser DJ visuals                                        | Free                                                             | Presets with bar-length morphs; band-to-parameter mapping; kaleidoscope/bloom; line-in or virtual cable                                                                                                                                               |
| **Vortexia**                                | Browser fractals for streamers                            | Free 720p with watermark; Plus $4.99/mo for 1080p60              | 6 2D + 2 raymarched fractals; OBS browser source; kick-lock mode                                                                                                                                                                                      |
| **SYQEL** (Desktop/Live/Art)                | DJs, venues, streamers, worship                           | Free to try, paid tiers                                          | Instrument-level reactivity; AI prompt-to-shader; Live adds NDI/Syphon/Spout and offline. Vendor claims 25k+ users and Product Hunt #2                                                                                                                |
| **HYPERFLUX**                               | Solo DJs and small venues: visuals plus lights            | Watermarked trial; $39 Standard / $79 Pro, perpetual, 3 machines | 33 WebGL scenes; stem-reactive (drums, bass, vocals, melody); MIDI learn; tap tempo; beat-synced auto-cycle; recording; DMX console (Art-Net/sACN in Pro). Desktop app on web tech, plus a browser demo                                               |
| **DjMirror Pulse**                          | Solo DJs                                                  | $99 perpetual personal, or $179/yr commercial; 14-day trial      | Real-time BPM, key and structure detection; auto effects and DMX; NDI out; MIDI/HID/OSC; optional Resolume add-on                                                                                                                                     |
| **Visualz / CVJ-1 Deck** (Show HN Feb 2026) | VJs; laptop app or hardware deck                          | Free with AI tokens; PRO for save/export                         | Clip layers plus AI-generated shaders/videos; Syphon/Spout/NDI/RTMP; plugin runtime; marketplace publishing                                                                                                                                           |
| **IKANDY** (Show HN Aug 2026)               | Listeners to VJs, Windows                                 | $0 / $7.99 / Studio about $60                                    | 500+ scenes; MilkDrop engine; HDR; outputs to OBS/Resolume (Pro); BYO-key AI scenes                                                                                                                                                                   |
| **freebeat AI VJ**                          | DJs wanting AI visuals                                    | Credit-based                                                     | Cloud generation with about 3–5 s latency; 16:9/9:16 MP4                                                                                                                                                                                              |
| Others                                      | –                                                         | –                                                                | Three.js visualizer with MP4 export; vmoebius (3-layer shader crossfade); VJ AutoStage Pro (Windows); OneManVJ ($29, fingerprints tracks to clips); 4mapper (browser mapping, $39); Screen Sampler (open source); shimga (browser music-video render) |

### AI live-visual tools

- **StreamDiffusion:** about 10.8k stars; repository dormant since December 2024.
- **StreamDiffusionTD (dotsimulate):** a TouchDesigner operator, with a Daydream cloud backend so a 4090 is not required.
- **Daydream Scope:** open source, about 450 stars, created October 2025. It outputs via Spout, Syphon and NDI to TouchDesigner, OBS and Resolume. Daydream ran a builder prize programme of up to $5k in March 2026.
- Performers report 30–60 fps restyling of camera feeds.
- **Kaiber Superstudio:** about $0 / $29 / $149 per month.
- **neural frames:** credits, about $26–299 per month, with stem-reactive offline render. The cost per finished minute is a common complaint.

All points above are REPORTED.

**Implication** (SPECULATIVE): AI tools target offline music videos or need heavy GPUs/cloud. None offers deterministic, beat-tight, offline, free generative visuals in a browser.

---

## Feature matrix vs Phosphor

Legend: ✓ yes · ◐ partial or tier-gated · ✗ no · ? not found.

| Tool                   | Price model                        | Platform                | Zero-install     | Generative / clips                         | Audio analysis                  | Tempo sync                | Out to other apps            | Record/export | MIDI             | Autopilot                        | Layers/mapping   | Content ecosystem                          |
| ---------------------- | ---------------------------------- | ----------------------- | ---------------- | ------------------------------------------ | ------------------------------- | ------------------------- | ---------------------------- | ------------- | ---------------- | -------------------------------- | ---------------- | ------------------------------------------ |
| **Phosphor**           | Free                               | Chrome desktop          | ✓ (PWA, offline) | Gen only: 39 sim/math families, ~178 looks | Line-in; own tracker unreliable | Tap tempo                 | ✗                            | ✗             | ✓ learn, 32 keys | ✓ 8–16 bars, phrase-aware worlds | ✗ / ✗            | Rated catalog, no sharing                  |
| Synesthesia            | $0 trial (watermark) / $199 / $399 | Mac, Win                | ✗                | Gen + media                                | Strong, mic-tuned               | ? (no Link found)         | ◐ Pro: Syphon/Spout/NDI, OSC | ?             | ✓                | ?                                | ◐ crossfade / ✗  | Marketplace, ISF/Shadertoy import, Discord |
| Resolume Avenue/Arena  | €299 / €799 perpetual              | Mac, Win                | ✗                | Clips + generators                         | ✓                               | ✓ Link, MIDI clock, SMPTE | ✓                            | ◐             | ✓                | ◐ (auto-pilot clip advance)      | ✓ / Arena ✓      | Footage store                              |
| TouchDesigner          | Free NC (1280px) / $600+           | Mac, Win                | ✗                | Anything                                   | ✓ (DIY)                         | ✓ (DIY)                   | ✓                            | ✓             | ✓                | DIY                              | ✓ / ✓            | Huge education ecosystem                   |
| VDMX6                  | $199 / $349                        | Mac                     | ✗                | Both, ISF host                             | ✓                               | ✓                         | ✓                            | ✓             | ✓                | ?                                | ✓ / ◐            | ISF                                        |
| MadMapper              | ~€479 / rent                       | Mac, Win                | ✗                | Clips + ISF                                | ◐                               | ✓                         | ✓                            | ?             | ✓                | ✗                                | ✓ / ✓            | –                                          |
| Magic Music Visuals    | ~$45–80                            | Mac, Win                | ✗                | Modular gen + video                        | ✓ multi-input                   | ?                         | ?                            | ✓             | ✓                | ?                                | ✓ / ✗            | ISF folders                                |
| Videosync              | €79 / €199                         | Mac, Win (Live)         | ✗                | Clips + ISF                                | via Live                        | ✓ Live timeline           | ?                            | via Live      | ✓                | ✗                                | ✓ / ✗            | 200+ ISF                                   |
| Butterchurn / NestDrop | Free / donation                    | Web / Win               | ✓ / ✗            | Gen (MilkDrop)                             | ✓ simple                        | ✗                         | NestDrop Spout               | ✗             | NestDrop ✓       | preset cycling                   | NestDrop ◐       | ~50k presets                               |
| Hydra                  | Free, AGPL                         | Web                     | ✓                | Gen (live code)                            | ◐                               | ✗                         | ✗                            | ✗             | ◐                | ✗                                | code / ✗         | Workshops, garden                          |
| VJam                   | Free                               | Web, any device         | ✓                | Gen (MilkDrop + p5)                        | ✓ beat detect                   | ?                         | ✗                            | ✓ WebCodecs   | ✓                | ?                                | A/B decks / 4-pt | –                                          |
| VVavy                  | Free                               | Web                     | ✓                | Gen + webcam                               | ✓                               | ?                         | OBS source                   | ✓ 9:16, 16:9  | ✓                | ?                                | FX stack / ✗     | Custom shaders                             |
| SYQEL Live             | Freemium                           | Mac, Win (+web desktop) | ◐                | Gen + AI shaders                           | ✓ instrument-level              | ?                         | ✓ NDI/Syphon/Spout           | ✓ (Desktop)   | ?                | ✓                                | ?                | Visual packs, socials                      |
| HYPERFLUX              | $39 / $79                          | Mac, Win (web tech)     | ◐ demo           | Gen + video layer                          | ✓ stems                         | Tap tempo                 | ?                            | ✓             | ✓ learn          | ✓ beat-synced cycle              | ◐ / ✗            | – (DMX bundled)                            |
| DjMirror Pulse         | $99 / $179 per yr                  | Win, Mac, Android       | ✗                | Clips + particles                          | ✓ BPM/key/structure             | ?                         | ✓ NDI                        | ?             | ✓                | ✓                                | ?                | Presets                                    |

Reading the matrix (SPECULATIVE):

- Phosphor is the only free tool that combines persistent-state simulations, phrase-aware autopilot, crash-isolated stage output and a curated rating system.
- It ties for last on _I/O_: no recording, no output to other apps, no external tempo sync.
- The cheapest rivals (VJam, VVavy, HYPERFLUX) already ship recording. Every paid desktop rival except Standard Synesthesia ships Spout, Syphon or NDI.

---

## Niche analysis

Each candidate is scored for demand evidence, competition, and fit/cost for Phosphor. All scores are SPECULATIVE judgements built on the REPORTED facts above.

| #   | Niche                                                                            | Demand evidence                                                                                                                                                 | Competition                                              | Fit / cost                                                                                                                     | Verdict                                                                                   |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | **Zero-install browser VJ**                                                      | Many 2025–26 launches (VJam, VVavy, vizz.fm, Vortexia, milkbar, audiolabs). All drew ≤8 HN points, so supply is high and attention low                          | High and free                                            | Already built                                                                                                                  | **Table stakes, not a moat.** Lead with it only together with quality                     |
| 2   | **Curated generative-math catalog** (simulations with memory, a muted aesthetic) | r/vjing's "Realtime/Generative" flair is among its top flairs. TouchDesigner's generative/POP community is growing fast. Lumen shows a curated instrument sells | Low: rivals ship MilkDrop, fractals or stateless shaders | Core asset, already built                                                                                                      | **Primary differentiator.** Needs to be _shown_ (clips, socials)                          |
| 3   | **Autopilot for DJs without a VJ**                                               | Five-plus products sell exactly this. Loop packs are marketed to people who are "not a VJ". DJs streaming on Twitch use Serato's OBS packs                      | High (SYQEL, HYPERFLUX, DjMirror)                        | Autopilot exists; beat tracking is the weak link                                                                               | **Strong demand, but must win on tempo reliability.** External sync is P0                 |
| 4   | **Streamers (OBS)**                                                              | OBS forum resources (Vortexia, audio-wave plugins); VVavy and Vortexia target it                                                                                | Medium; willingness to pay is low ($4.99/mo)             | Needs a clean output URL or capture-friendly stage                                                                             | **Secondary.** A cheap win via "stage as OBS source" docs                                 |
| 5   | **Small venues, unattended screens**                                             | HYPERFLUX and DjMirror bundle DMX for venues; SYQEL targets venues                                                                                              | Medium                                                   | Needs endurance proof (open in Phosphor's README); no DMX                                                                      | **Later.** Unattended mode follows endurance evidence                                     |
| 6   | **Generative source inside Resolume/MadMapper (Spout/Syphon/NDI)**               | Resolume forum browser-source threads; SpoutBrowser sold for this; Synesthesia charges $200 for this tier; Daydream, SYQEL and Visualz all advertise it         | Medium                                                   | Browsers cannot emit Spout/Syphon/NDI natively, so it needs a native helper (Electron/Tauri shell or companion)                | **Highest-value pro integration.** P1 after loop export                                   |
| 7   | **ISF shader export**                                                            | ISF runs in VDMX, Resolume Wire, MadMapper, Synesthesia, Magic and Videosync; isf.video hosts "thousands"                                                       | Low for generative-math ISFs                             | Stateless families port well. Simulations need multi-pass persistent buffers (ISF supports them) but the porting work is large | **P2 brand/reach play** for a subset of families                                          |
| 8   | **Loop-pack rendering (seamless, tempo-length loops)**                           | Active market: Resolume Footage packs €29–99 with licence limits; many Gumroad sellers; AI loop packs €59–99                                                    | High for loops, low for _generator-of-loops_             | WebCodecs offline render is feasible in Chrome. VJam and the Three.js visualizer already record in-browser                     | **Best cost-to-reach ratio.** Gets Phosphor into every clip-based rig without native code |
| 9   | **AI real-time**                                                                 | Hot (Daydream prize programme, LDI courses, TouchDesigner operators)                                                                                            | Medium                                                   | Contradicts offline/free; needs heavy GPUs                                                                                     | **Avoid.** Use "no cloud, no AI, runs offline" as contrast                                |

---

## How successful tools grow community

The patterns below are REPORTED; what each means for Phosphor is SPECULATIVE.

1. **A free tier that is real, with a visible upgrade.** TouchDesigner Non-Commercial is fully featured but capped at 1280px. Resolume, Synesthesia, Millumin and HYPERFLUX use unlimited watermarked trials. Smode Community is free at Full HD, and cables keeps every feature free. _For Phosphor:_ being fully free is already stronger than all of these. A paid helper can come later.
2. **Educators as distribution.** The TouchDesigner ecosystem runs on third-party teachers (one Patreon about 11.7k members), Derivative workshops and paid courses. Hydra spreads through city workshops. _For Phosphor:_ short "play a DJ night in 5 minutes" videos and one workshop format.
3. **Creator marketplaces and attribution.** Synesthesia's scene marketplace credits shader artists. Resolume Footage runs artist labels. Visualz offers marketplace publishing. _For Phosphor:_ the catalog's family authors and look ratings are the seed. A marketplace is premature below a few thousand users.
4. **Open formats travel.** ISF (Vidvox) and HAP made Vidvox central even though VDMX is Mac-only. Butterchurn's MIT licence put MilkDrop into many players. _For Phosphor:_ exportable looks (ISF or seamless loops) carry the name further than the app does.
5. **Community hubs.** Discord, Facebook groups (Synesthesia), Discord and GitHub (cables, Daydream), and r/vjing at about 47k members growing about 34%/yr. _For Phosphor:_ one channel only, after the first show.
6. **Short-form video.** SYQEL lists YouTube, Instagram, TikTok and X. VVavy exports 9:16 for TikTok and Reels. _For Phosphor:_ visuals are inherently shareable, so in-app 9:16 loop export doubles as marketing.
7. **Integration as distribution.** Butterchurn ships inside Music Assistant, MusicBee and Cider. Synesthesia, SYQEL and Daydream all advertise "works with Resolume/OBS". _For Phosphor:_ being a source in other people's rigs is the growth path.
8. **Launch venues.** Product Hunt helped SYQEL (#2 of the day). HN Show posts for visualizers mostly fail: only NestDrop (64 points, 2020) did well. _For Phosphor:_ do not expect HN alone to work. A video demo of something visually _unlike_ MilkDrop is required.

---

## Implications for Phosphor (ranked)

| Rank | Implication                                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                                                               | Priority                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1    | **Fix tempo truth before marketing autopilot.** Add WebMIDI clock in (DJ mixers and CDJs via interface, Ableton via IAC), keep tap tempo, and make tracker confidence visible. Ableton Link needs a native bridge, and the Link licence is GPLv2+ or proprietary by agreement                                                                                         | All autopilot rivals sell on beat/structure detection (DjMirror, HYPERFLUX stems, SYQEL per-instrument); Resolume and Videosync win musicians on Link/Live sync; the team itself rates the Phosphor tracker unreliable | **P0**                             |
| 2    | **Ship recording and seamless loop export (WebCodecs, tempo-length loops, 16:9 and 9:16).** This is the cheapest bridge into Resolume, VDMX and MadMapper rigs, social video and loop markets                                                                                                                                                                         | Free rivals already record (VJam, VVavy, HYPERFLUX); active loop market (Resolume Footage, Gumroad, AI packs)                                                                                                          | **P0**                             |
| 3    | **Positioning: one primary statement** (SPECULATIVE options). (a) _"Free generative visuals for DJ nights: open a tab, plug in the booth, play."_ (b) _"A living library of mathematics for the stage, curated, rated and offline."_ (c) later: _"The generative source for your Resolume rig."_ Recommend (a) as the headline and (b) as the proof; earn (c) with #5 | Browser-only claims are crowded (Summary 1); curation and simulations are uncontested (Niche 2)                                                                                                                        | **P0**                             |
| 4    | **Prove it doesn't look like MilkDrop.** A 60-second reel per family group and one public "first show" film. Lead with physarum, RD, Kleinian and worlds                                                                                                                                                                                                              | MilkDrop presets dominate free browser rivals (VJam 945, IKANDY, milkbar, NestDrop); HN response to generic visualizers is weak                                                                                        | **P0** (before any launch post)    |
| 5    | **Native output helper (Syphon on Mac, Spout on Windows, NDI)** as an optional companion or desktop shell, keeping the web app primary                                                                                                                                                                                                                                | Synesthesia's $200 Pro premium is mainly this I/O; SpoutBrowser exists; Resolume forum demand; SYQEL Live, Visualz, Daydream and DjMirror advertise it                                                                 | **P1**                             |
| 6    | **OBS/streamer path:** document stage capture or a clean output URL; low cost                                                                                                                                                                                                                                                                                         | Vortexia and VVavy target OBS; Serato publishes OBS packs                                                                                                                                                              | **P1**                             |
| 7    | **Pricing:** keep the full instrument free (it beats every rival's free tier and fits the €0-hosting rule). If revenue is ever wanted, sell the _native helper_ or pro export (4K, ProRes/HAP loops), not the catalog. Never add accounts or watermarks to the core                                                                                                   | Competitor ladder: HYPERFLUX $39–79; DjMirror $99; Synesthesia $199–399; Resolume €299–799; streamers pay ≤$5/mo                                                                                                       | **P1** (decide before helper work) |
| 8    | **Light layering (two looks with a crossfade or mask)** so autopilot transitions and blends feel pro                                                                                                                                                                                                                                                                  | VJam has A/B decks; Synesthesia's crossfade is "initial" and blending is a common ask; Resolume is layer-native                                                                                                        | **P2**                             |
| 9    | **ISF export for stateless families** as reach and attribution                                                                                                                                                                                                                                                                                                        | Broad ISF host base (VDMX, Wire, MadMapper, Synesthesia, Magic, Videosync)                                                                                                                                             | **P2**                             |
| 10   | **Community:** one Discord or forum after the first show; tutorials over marketplace; publish family attributions                                                                                                                                                                                                                                                     | TouchDesigner education flywheel; Synesthesia artist credits; r/vjing growth                                                                                                                                           | **P2**                             |
| 11   | **Out of scope:** clip mixing, projection mapping, DMX and AI generation. The incumbents (Resolume, MadMapper, Millumin, HYPERFLUX, Daydream) own these, and chasing them dilutes the instrument                                                                                                                                                                      | Matrix                                                                                                                                                                                                                 | Don't                              |
| 12   | **Safari and Firefox:** low priority for VJs, since rivals are desktop-native and Chrome covers the rig. Revisit only for viewer or OBS cases                                                                                                                                                                                                                         | Vortexia supports Safari and Firefox for streamers only                                                                                                                                                                | **P2**                             |

**Open questions for owner review**

- Is any revenue intended? This decides whether #5 is a paid helper or a free one.
- Should the first public launch wait for #1, #2 and #4?
- Is a native companion acceptable under the portfolio's "prefer browser and static hosting" rule?

---

## Sources

All accessed 2026-10-14.

**Synesthesia**

1. Synesthesia home – https://synesthesia.live/
2. Synesthesia pricing – https://synesthesia.live/pricing
3. Synesthesia FAQ – https://synesthesia.live/docs/faq/
4. Synesthesia troubleshooting – https://app.synesthesia.live/docs/faq/troubleshooting.html
5. Synesthesia changelog index – https://app.synesthesia.live/docs/resources/changelogs.html
6. Synesthesia v1.17 changelog – https://www.synesthesia.live/public-release/changelog/1.17.5.24.html
7. Synesthesia 1.20 (VJ Union) – https://vjun.io/vdmo/synesthesia-120-24bm
8. Gravity Current / Synesthesia profile – https://gust.com/companies/synesthesia
9. r/SynesthesiaLive NDI note (via redlib mirror) – https://redlib.ssps.io/r/SynesthesiaLive/comments/rfbs8m/resolumesynesthesiaresolume

**Resolume** 10. Resolume shop – https://resolume.com/shop 11. Resolume renewals – https://resolume.com/shop/upgrade 12. Resolume Footage example pack – https://www.resolume.com/footage/spectrum 13. Resolume forum, crash reports – https://www.resolume.com/forum/viewtopic.php?p=95370 14. Resolume forum, browser source – https://resolume.com/forum/viewtopic.php?p=82337 15. Resolume Ableton Link article – https://resolume.com/article/63

**Pro and node tools** 16. TouchDesigner licensing – https://derivative.ca/UserGuide/Licensing 17. r/TouchDesigner stats – https://gummysearch.com/r/TouchDesigner/ 18. elekktronaut Patreon – https://www.patreon.com/elekktronaut 19. CDM on VDMX6 – https://cdm.link/2024/09/vdmx6/ 20. Vidvox cart – https://cart.vidvox.net 21. VJ Galaxy software guide 2026 – https://vjgalaxy.com/blogs/resources-digital-assets/vj-software-guide-2026-from-vjing-to-generative-art 22. MadMapper bundle (official) – https://www.madmapper.com/madbundle 23. MadMapper guide 2026 – https://videomapping.store/madmapper-projection-mapping-software/ 24. Magic Music Visuals – https://magicmusicvisuals.com/ 25. Modul8 – https://garagecube.com/modul8 26. Millumin education pricing – https://millumin.com/educational 27. Notch subscriptions FAQ – https://manual.notch.one/2026.1/en/docs/reference/faq/subscriptions/ 28. Smode Community – https://www.smode.io/en/product/smode-community 29. Videosync 2.1 (SonicState) – https://www.sonicstate.com/news/2025/12/16/videosync-live-video-fx-and-playback-in-ableton- 30. Videosync 2 (Gearnews) – https://www.gearnews.com/showsync-videosync 31. Showsync – https://www.showsync.com/

**Open source and browser engines** 32. Butterchurn – https://github.com/jberg/butterchurn 33. projectM – https://github.com/projectM-visualizer/projectm 34. NestDrop – https://nestimmersion.ca/nestdrop.php 35. Hydra repo – https://github.com/hydra-synth/hydra 36. Hydra workshop, Frankfurt NODE – https://nodeforum.org/?p=7657 37. cables.gl downloads – https://cables.gl/downloads 38. cables.gl payment FAQ – https://cables.gl/docs/faq/licence_payment/payment/payment 39. cables repo – https://github.com/cables-gl/cables 40. KodeLife (App Store) – https://apps.apple.com/app/id1569922579 41. Vuo compare – https://www.vuo.org/compare 42. Lumen – https://lumen-app.com/ 43. Lumen pricing (Synthtopia) – https://www.synthtopia.com/?p=77771 44. TiXL – https://github.com/tixl3d/tixl

**Mobile and desktop visualizers** 45. Imaginando VS – https://www.imaginando.pt/news/introducing-vs-visual-synthesizer 46. Vythm – https://apps.apple.com/app/id1550581532 47. Plane9 (AlternativeTo) – https://alternativeto.net/software/plane9 48. IKANDY – https://ikandy.app/

**Browser and DJ-automation tools** 49. VJam – https://vjam.art/ 50. VVavy – https://www.vvavy.io/ 51. vizz.fm for DJs – https://vizz.fm/music-visualizer-for-djs/ 52. Vortexia – https://vortexia.live/visuals/webgl-music-visualizer/ 53. Vortexia OBS resource – https://obsproject.com/forum/resources/vortexia-%E2%80%94-free-audio-reactive-visuals-via-browser-source.2416 54. HYPERFLUX – https://www.hyperfluxvj.com/ 55. SYQEL – https://syqel.com/ 56. Visualz – https://visualzstudio.com/ 57. DjMirror Pulse – https://djmirror.com/ 58. OneManVJ – https://deejeitokyo.itch.io/onemanvj 59. Mega list of VJ software 2026 – https://limeartgroup.com/the-mega-list-of-vj-software-and-tools/ 60. SpoutBrowser – https://bntr.itch.io/spout-browser

**AI tools** 61. freebeat for DJs – https://freebeat.ai/for-djs 62. Daydream (Livepeer) – https://livepeer.org/ecosystem/daydream 63. Daydream Scope repo – https://github.com/daydreamlive/scope 64. dotsimulate x Daydream – https://blog.livepeer.org/builder-story-dotsimulate-x-daydream 65. StreamDiffusion – https://github.com/cumulo-autumn/StreamDiffusion 66. Jascha Süss profile – https://vjstv.com/artists/jascha-suss 67. Kaiber overview – https://www.eesel.ai/en/blog/kaiber-overview 68. neural frames review – https://vidmuse.ai/blog/neural-frames-review

**Formats, sync, market signals and research** 69. ISF docs – https://docs.isf.video/quickstart 70. Ableton Link FAQ – https://help.ableton.com/hc/articles/209776125 71. Ableton Link repo (licence) – https://github.com/Ableton/link 72. Serato Twitch visuals – https://the-drop.serato.com/inspiration/free-dj-visuals-and-extensions-for-twitch/ 73. r/vjing stats – https://gummysearch.com/r/vjing 74. HN Show HN search, "VJ" – https://hn.algolia.com/api/v1/search?query=VJ&tags=show_hn 75. HN Show HN search, "music visualizer" – https://hn.algolia.com/api/v1/search?query=music%20visualizer&tags=show_hn 76. Spagnolli et al., automated visual software acceptance – https://arxiv.org/abs/1807.11322
