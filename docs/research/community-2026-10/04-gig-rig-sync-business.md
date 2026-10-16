# The real gig: rig, sync, and the DJ/promoter side

Research lane 04 · 2026-10-14 · read-only web research (nothing was posted or sent anywhere). Evidence labels: **REPORTED** means practitioner, vendor or press claims. **FORMAL** means specifications, standards or peer-reviewed papers. **SPECULATIVE** means this lane's own inference. All sources are paraphrased.

**Coverage limits.** This lane used up the shared web-search budget part way through. Reddit could not be fetched directly, so r/vjing evidence comes from search-index snippets and mirrors and is weaker than the forum, vendor and paper evidence. Pay figures in particular are thin and anecdotal. I could not confirm whether the DJM-A9 outputs MIDI clock.

## Summary

- **Most venue failures are mundane.** They come from resolution or scaling mismatches with LED processors, HDMI handshakes (EDID/HDCP), heat, 50 Hz vs 60 Hz rigs, and untested last-minute additions. They are rarely software bugs. A venue-check mode would address the most common failure class (REPORTED).
- **LED processors often present a standard 1920×1080 input** and crop or slice it to the wall. Sending "native wall size" can fail silently. Phosphor needs an explicit output-region or pixel-map option, not only native size plus cover-crop (REPORTED).
- **Wired DJ sync is fragmented.** The DJM-V10 sends real MIDI clock over DIN and USB. The 900NXS2 has no DIN clock. The Xone:96 only passes through clock that software generates. Pro DJ Link and Ableton Link need network access or software the DJ controls. The only input that always works is the audio line (REPORTED).
- **Working VJs mostly use Link if the DJ runs a Link-capable app, tap/resync otherwise, and Pro DJ Link at higher-end installs.** Resolume's own DJ-sync path relies on Pioneer or Denon network integration or SMPTE, and is aimed at pre-produced clip shows (REPORTED).
- **The state of the art in online (causal) beat tracking is about 80 % beat F1 and about 47 % downbeat F1 at under 50 ms latency** on standard datasets, scored with a ±70 ms tolerance. The best offline model reaches about 89 % / 78 % on GTZAN. Real-time downbeat detection remains unsolved in general. Phosphor's "phase error < 20 ms, hold 32 bars" target is far stricter than the literature's (FORMAL).
- **Practical recommendation:** keep tap-first, but let the tracker _assist_ a tapped grid with small, confidence-gated corrections and a drift warning, rather than run free (SPECULATIVE, backed by the numbers above).
- **Re-adding MIDI clock as input only** is cheap in Chrome (Web MIDI, behind a permission prompt since Chrome 124). It pays off only when the venue has a V10 or the DJ's software sends clock. This would reopen decision D35, so it needs owner approval (FORMAL + REPORTED).
- **Practitioners are ambivalent about unattended visuals.** VJs fear automated visuals will lower the artistic level, while clubs and DJs do run visualizers and SoundSwitch-style auto-loops. Phosphor's strongest framing is a co-pilot for one VJ over a long night, not a VJ replacement (REPORTED + FORMAL study).
- **Pay is low and variable.** Reported rates run from about $100–300 per night for beginners to about $600 on average for an experienced local VJ, with festivals higher. VJs get gigs through promoter and DJ networks and short reels, and are hired for content, mixing skill or playback reliability (REPORTED, weak).
- **Photosensitive-epilepsy limits are clear:** no more than 3 general or red flashes per second in any 25 % area, and about 4 Hz for club strobes under UK HSE guidance. Phosphor's limiter is a full-frame mean-luminance limiter, so it cannot see counter-phase or partial-screen flashes. That is the main safety gap (FORMAL + code reading).

---

## 1. Typical club VJ rig and what goes wrong

**Rig shape (REPORTED).**

- **Laptops.** One or two laptops with discrete GPUs. A documented festival rig used a Windows gaming laptop with a GTX 980M plus a MacBook Pro running Resolume, switched through a Barco Encore. Four HD outputs fed about 400 m² of LED through 10 processors, via Flux 4kTwo display controllers, with a USB capture device and an APC40 controller [Resolume blog, Storm].
- **Kit lists.** Spare HDMI, DisplayPort and USB-C adapters, EDID emulators (Dr.HDMI, Decimator), capture cards, a backup laptop or an external drive holding the show, a backlit keyboard, gaffer tape, and a "go bag" [Interactive & Immersive HQ via search; VV Edu].
- **Long runs.** Converted from HDMI to SDI (AJA HA5). One successful show ran content at 50 fps with the converters set to 50 Hz on the tech company's advice [Resolume forum].

**LED processors (REPORTED).**

- A Resolume staffer says the processor usually runs at a _standard_ input resolution and slices that frame to the panels, not at your composition size. Ask the LED tech for the processor's input layout or pixel map [Resolume forum, HDMI >1080p].
- One user with a 2688×384 runway on a NovaStar unit found the processor showed up as a 1920×1080 display and anything past x = 1920 was lost [Resolume forum, Output Mapping].
- NovaStar input limits range from 1920×1200@60 (VX4S class) to custom-wide timings on newer units. Scaling modes include pixel-to-pixel, snap-to-canvas and fill [NovaStar spec pages].

**HDMI, EDID and HDCP (REPORTED).**

- Macs failing to hold a picture on AV gear is a known problem. University AV guidance suggests disabling HDCP on the first device in the chain, or inserting an EDID device [U Toronto PDF].
- Shared screens with several VJs need a switcher. A cheap switcher can add 30 ms or more of delay and fail when inputs drop EDID during switching [r/vjing changeover thread via mirror; search snippet].

**Heat and power (REPORTED).**

- A VJ saw the picture fade to white after about 3 h, with the laptop's video-output corner very hot [VirtualDJ forum].
- A MacBook left in direct sun lagged before a festival show. The same VJ reports that overheating also crashes Resolume on Windows laptops, and recommends extra fans [Resolume blog, Storm].
- Festival guidance adds UPS units, A/B media servers, a pre-made "safe loop", genlock, and a full rehearsal with a simulated failover. The aim is no time on black screen [Ticket Fairy].

**Untested additions (REPORTED).**

- A first paid gig collapsed into repeated crashes. The VJ's own guess was a MIDI clock that the band added that night. Replies stressed testing the exact rig in advance [Resolume forum, "First VJ gig… nightmare"].

**Soundcheck and routine (REPORTED).**

- Arrive early, run through the full setup, and coordinate with the sound and lighting crew. Ask the front-of-house engineer for an audio feed.
- Do not update the OS or software the day before a show.
- Keep a bootable clone and media on separate drives [VV Edu "Getting Gig Ready"].

**Implications (SPECULATIVE).** Phosphor already covers crash restore, preflight and the flash limiter. Still missing for the venue moment:

- a pixel-map / output-region mode
- a refresh-rate match (50 Hz rigs vs the fixed 60 Hz pacer)
- a test-pattern page showing the measured resolution and refresh rate
- a "safe loop" that does not depend on the GPU-heavy families
- a thermal or pressure signal

## 2. Sync options in practice

| Option                        | What it carries                                             | Who has it                                                                                                                                                 | Used by working VJs?                                                                                                        | Feasible in a Chrome app?                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Audio analysis                | tempo, beat phase; downbeat weak                            | any line feed                                                                                                                                              | yes, as a fallback; VDMX Waveclock, SoundSwitch auto-BPM                                                                    | yes (current). Accuracy limits in §3                                                                                                      |
| Tap / resync                  | tempo, phase by hand                                        | everyone                                                                                                                                                   | yes, widely. Reported as tiring when DJs chop and change                                                                    | yes (current default)                                                                                                                     |
| MIDI clock from mixer         | 24 ppqn tempo + phase; bar only via Start/SPP               | **DJM-V10/V10-LF** (DIN + USB). **Not** the 900NXS2 (no DIN). **Xone:96** only passes software clock. Xone:92 clock follows its tap button. A9 unconfirmed | sometimes; reliability reports conflict                                                                                     | **yes**: Web MIDI via a USB-MIDI interface or the mixer's USB. Permission prompt since Chrome 124                                         |
| MIDI clock from DJ software   | same                                                        | DJ laptop apps; not CDJ-only booths                                                                                                                        | rarely in clubs                                                                                                             | yes (Web MIDI), but needs a cable to the DJ's laptop                                                                                      |
| Ableton Link                  | tempo, beat, phase over a quantum (bar), start/stop         | rekordbox, Serato, Traktor, VirtualDJ (laptop DJs); bridges for CDJs                                                                                       | yes. Resolume's main DJ path; phase alignment with DJ apps is reported as imperfect                                         | **no direct support**: needs UDP multicast. Possible with a local helper (Carabiner over TCP + WebSocket relay)                           |
| Pro DJ Link (CDJ/DJM network) | per-player tempo, beat-in-bar, on-air/master, track, phrase | CDJ-2000NXS2/3000/3000X, DJM-900NXS2/V10/A9                                                                                                                | high-end installs. Resolume Arena and ArKaos via the licensed PRO DJ LINK Bridge; BLT and open-beat-control for custom work | **no direct support**: UDP. Possible through open-beat-control (Java) → OSC → WebSocket relay; needs an Ethernet port on the booth switch |
| Denon StageLinQ               | BPM, beat info                                              | Denon Prime/SC players                                                                                                                                     | rare in clubs                                                                                                               | via unofficial Node/Go libraries + relay                                                                                                  |
| SMPTE / timecode              | absolute time                                               | pre-produced shows                                                                                                                                         | festival headliners                                                                                                         | not relevant to generative looks                                                                                                          |

**Evidence notes.**

- **DJM-V10 (REPORTED).** CDM calls it the first recent Pioneer mixer with dependable clock out, on DIN and USB MIDI. The clock follows the active channel's BPM from a playing Pro DJ Link CDJ, or tapped or typed tempo. The 900NXS2 lacked DIN clock [CDM 2024].
- **V10 contrary report (REPORTED).** A forum user found the V10's DIN clock unreliable and went back to manual beatmatching [Nome II forum].
- **Xone:96 (REPORTED).** Allen & Heath documents only passing software clock from USB to DIN [A&H support]. An Eventide moderator reports that native clock was dropped on the 96 [Eventide forum].
- **Xone:92 (REPORTED).** Its clock depended on the DJ tapping the tempo button [Ableton forum].
- **Ableton Link basics (FORMAL).** Link syncs tempo, beat, phase (per-app quantum) and, since v3, start/stop. Any peer can change the tempo [ableton.github.io/link].
- **Link in Resolume (REPORTED).** Resolume disables Resync while Link is on and warns that tempo changes spread to the DJ [Resolume article 63]. DJ-app Link sessions often run the same tempo with misaligned grids [Resolume / VirtualDJ forums via search].
- **Link in the browser (FORMAL + REPORTED).** Browsers cannot join Link directly. The standard workaround is a Node or C++ peer that relays timing to the browser [Cycling '74 forum]. Carabiner is a loopback-only TCP bridge on port 17000. It sends status at most every 20 ms, ships prebuilt for macOS, and is GPL-family like Link itself [Carabiner; Ableton/link].
- **Pro DJ Link via BLT (REPORTED).** BLT and beat-link act as a virtual CDJ. They need a dedicated wired gigabit switch, no Wi-Fi, and their own network adapter, and cannot run on the same machine as rekordbox [BLT guide].
- **open-beat-control (REPORTED).** Exposes beat-link over OSC (default port 17002), can bridge to Link through Carabiner, and runs headless on Java 9+. It is explicitly not a sanctioned protocol implementation [open-beat-control].
- **Licensed route (REPORTED).** AlphaTheta licenses its PRO DJ LINK Bridge to partners (Resolume, Avolites, ChamSys, SoundSwitch, TC Supply). It now lists the CDJ-3000X and DJM-A9 [PRO DJ LINK Bridge; DJTechTools 2019].
- **Resolume's Pioneer sync (REPORTED).** It carries track name, play state, playhead and fader state, and is meant for track-matched video clips, not generative tempo [Resolume support].
- **CDJ-3000X (REPORTED).** No beat-link compatibility statement found; it launched in September 2025 with Wi-Fi and USB-C [beat-link wiki; Mixmag].
- **rekordbox Link (REPORTED).** rekordbox supports Link, which a deck must opt into [rekordbox FAQ]. **rkbx_link** reads rekordbox memory and outputs Link/OSC/sACN, with a paid licence for newer versions and experimental macOS support [GitHub].
- **Web MIDI permissions (FORMAL).** Since Chrome 124, all Web MIDI access requires permission, not only SysEx [Chrome blog].
- **Clock jitter (REPORTED).** MIDI clock receivers should smooth with a PLL or by averaging, not trust each pulse interval [linux-audio-dev; JUCE forum].
- **Bar position over MIDI clock (FORMAL, from the MIDI 1.0 standard; not re-fetched in this lane).** Clock carries no bar information. A downbeat arrives only with Start or Song Position Pointer, so Phosphor's downbeat key stays necessary.

**Which options are reliable in a real booth (SPECULATIVE synthesis).**

- **Audio line:** the only always-available input.
- **MIDI clock:** reliable only with a V10, or when the DJ runs clock-sending software and agrees to a cable.
- **Link:** good when the DJ is on a laptop app, but needs a native helper next to Chrome and accepts that the grid phase may be off.
- **Pro DJ Link:** the most accurate (the DJ's own analysed beat grids and bar positions), but needs a cable into the booth network, venue permission, a Java process, and an unofficial protocol.

For a one-person rig plugging HDMI into other people's venues, that ordering argues for: audio + tap first; MIDI clock as a cheap optional input; Link and Pro DJ Link as optional helpers only if gigs show they are available.

## 3. Automatic beat/downbeat tracking on DJ mixes

**Offline state of the art (FORMAL).**

- **Beat This! (ISMIR 2024, JKU)** reaches beat F1 89.1 and downbeat F1 78.3 on GTZAN without DBN post-processing, slightly above Hung et al. (88.7 / 75.6). A 2M-parameter "small" variant scores 88.8 / 77.2 [arXiv 2407.21658].
- It is non-causal: attention covers 30 s excerpts, and the authors do not target online use. It scores lower on continuity metrics and still fails on under-represented genres. Code and weights are MIT-licensed.

**Online (causal) state of the art (FORMAL).**

- **BEAST (ICASSP 2024)** is a streaming transformer. At ≤ 50 ms latency it reaches **80.0 % beat F1 and 46.8 % downbeat F1**, about 5 points above earlier online models [arXiv 2312.17156].
- **BeatNet (ISMIR 2021)**, a CRNN with a particle filter, scores about 75 / 46 on GTZAN in a third-party comparison and is slow at its default particle count [arXiv 2111.00704]. Its repo offers stream, realtime, online and offline modes and is licensed CC-BY-4.0 [BeatNet GitHub].
- **Real-time PLP (TISMIR 2024)** runs at zero latency, is lightweight, and provides beat lookahead and confidence/stability signals meant for interactive control [AudioLabs].
- **madmom** has a CLI online mode [madmom docs].
- **essentia.js** runs Essentia in WASM for real-time and offline analysis under AGPL-3. The beat-tracking algorithms it exposes were not confirmed [essentia.js].

**Commercial tools (REPORTED).** VDMX Waveclock tracks BPM and measure position from a mic or line input and can send MIDI clock [VDMX]. SoundSwitch 2.9 added real-time auto-BPM for unsupported sources [press release].

**What is realistic in a browser (SPECULATIVE, grounded in the figures above).**

- **Scoring tolerance.** All published F-measures use a **±70 ms** window. Phosphor's "phase error < 20 ms, lock within 8 beats, hold through a 32-bar breakdown" is stricter than anything the literature reports for online systems.
- **Beats vs downbeats.** Four-on-the-floor techno/house is easier than GTZAN for _beats_. Breakdowns without kicks and beatmatched overlaps are harder. Online downbeat F1 sits near 47 % even in the best paper, so automatic bar phase should not be trusted.
- **Model cost.** A 2M-parameter model is small enough to try in a Web Worker through onnxruntime-web. Without a streaming redesign, though, a non-causal model only helps as a delayed _re-anchor_: it can spot drift after a few seconds, not predict the next beat.
- **Highest-value change:** constrain the problem. The performer's tap or downbeat sets the grid. The tracker then only corrects phase within a small window (for example ±40 ms) and tempo within ±2 %, and only while confidence is high (kick present, stable inter-onset intervals). It freezes during breakdowns and flashes a "drift?" indicator rather than jumping. This is a much easier problem than free tracking, and PLP-style confidence suits it.
- **Evaluation.** Run Beat This offline on the Creative-Commons mixes as a _reference labeller_, then hand-correct a sample. That would make the D63 evaluation scorable at scale, beyond the current about one-third of beats.

## 4. Do DJs and promoters want hands-off visuals?

- **CHI 2020 study (FORMAL).** Spagnolli et al. combined 7 interviews, a survey of 102 people and 25 remote interviews with Italian DJs and VJs about prototype software that syncs visuals automatically. They found four controversies centred on artistic identity and competitive advantage. Some VJs argued automation would lower the sector's artistic level [arXiv 1807.11322 / CHI 2020].
- **Unattended visuals happen (REPORTED).** A DJTechTools forum poster describes a club running Winamp/Milkdrop unattended on a standalone machine. A 2011 DJTT article calls audio-reactive visualizers an easy show, but notes noise sensitivity and argues a person on the "visual decks" is better.
- **Advice to DJs (REPORTED).** Digital DJ Tips gives three options: run visuals yourself on a laptop (impossible with CDJ/USB-only setups), hand loops to the venue's visuals person, or plan with a VJ. The author prefers delegating.
- **Lighting automation is accepted (REPORTED).** SoundSwitch Autoloops play beat-synced looks for tracks without scripts and run in the background. Version 2.9 grew to 128 loops plus auto-BPM.
- **Promoter budgets (REPORTED).** A UK feature notes many promoters accept mediocre visuals to protect margin, while others hire real artists [The Skinny via search].
- **Implication (SPECULATIVE).** The real demand is "good visuals with no dedicated operator", such as small clubs, DJs without a VJ, and a VJ resting through hour 5. Practitioners' stated identity concerns mean Phosphor should be marketed as the VJ's instrument with an autopilot, not as "no VJ needed". Autopilot that looks generic will read as a screensaver, so per-night identity (palette, event or promoter branding, curated favourites) matters.

## 5. Business side

**Pay (REPORTED, anecdotal, regional).**

- An r/VJing post (via mirror) reports starting at $200–300 per gig and averaging about $600 now. A joint act asks about $1,000, and the poster's best solo festival paid $1,500. Beginners take $100–200, and the poster warns against free work.
- Older Resolume forum posts: about €150 for a full club night in Helsinki (2004), around 150 in Adelaide, and £110 offered per touring gig.
- For a benchmark outside VJing, the Scottish Artists Union recommends £226–350 per day for visual artists (2024–25).
- Pay depends on whether the VJ brings gear and custom content [search synthesis].

**Getting gigs (REPORTED).**

- Network with local promoters and DJs, and be a regular, friendly face at nights that fit your style.
- Follow up after meeting people. Free first nights are common but contested.
- Clients book a VJ because they need one of three things: content, mixing skill, or a playback system [r/vjing via search].
- Showreels should be short, tailored to the client and easy to open. Instagram is the de-facto portfolio [general showreel guidance; weak VJ-specific evidence].

**Crediting.** No solid VJ-specific source was found. Common practice appears to be "visuals by" lines on flyers and tagging in event posts (SPECULATIVE).

**DJs running visuals themselves (REPORTED).** This happens through Serato Video, VirtualDJ, djay's built-in visualizers, or Resolume/NestDrop/Synesthesia. A 2025 r/vjing thread from a DJ moving into VJing was pointed at NestDrop or Synesthesia with Resolume. With CDJs or USB sticks, the DJ has no laptop to run visuals on, which is a gap a separate browser box could fill (SPECULATIVE).

## 6. Safety and legal

**WCAG 2.3.1 (FORMAL).** Content passes if it has no more than 3 general flashes and no more than 3 red flashes in any 1 s.

- A general flash is a pair of opposing changes of at least 0.1 relative luminance, with the darker state below 0.8.
- A red flash involves saturated red, with R/(R+G+B) ≥ 0.8.
- Flashes are exempt if the combined flashing area is at most 25 % of any 10° visual field (about 341×256 px at 1024×768).

**UK broadcast and ads (REPORTED/FORMAL).** Ofcom's guidance note, applied to ads by the ASA, sets the same 3-per-second, 25 %-area and brightness tests. The Harding analyser is the common automated check, but passing it does not guarantee compliance [ASA; Pinsent Masons; Wikipedia Harding test].

**Club strobes (REPORTED).** The Epilepsy Society relays UK HSE guidance that club and performance strobes flash at no more than 4 Hz, and says 3–30 Hz can still trigger photosensitive people [Epilepsy Society 2023 PDF]. Other summaries cite 5 Hz with bursts of at most 30 s. The US Epilepsy Foundation reportedly advises under 2 Hz.

**Phosphor today (code reading).** `flash-limiter.mjs` implements a full-frame WCAG _general-flash_ limiter on mean luminance and says explicitly that it is not a spatial or red-flash certification. Gaps:

1. **Counter-phase flashes.** Half the screen flashing white while the other half goes dark keeps the mean flat, so the limiter does not see it.
2. **Red flashes** are not tracked.
3. **Regular patterns** (stripes, checkerboards; Ofcom also covers these) are not checked.
4. **Venue strobes.** Visuals add to the venue's own strobes, so a visual-side 3 Hz budget does not make the room safe.

## 7. Implications for Phosphor (ranked)

| #   | Recommendation                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                          | Feasibility                                                                                               | Priority                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Venue check page.** Pixel grid with edge markers and labelled corners; measured output size, devicePixelRatio and refresh rate (from rAF intervals plus `getScreenDetails()`); 50/60 Hz pacer choice matching the display; black/white/grey levels; a GPU-light "safe loop" fallback. Add a note to the pre-show check: "ask LED tech for processor input layout". | LED processors use standard inputs and crop; EU 50 Hz rigs; failures cluster at connect time (§1)                 | High: pure web; Window Management API since Chrome 100                                                    | **P0**                                     |
| 2   | **Output region / pixel map.** Render the look into a chosen sub-rectangle (or rectangles) of the output frame, e.g. 2688×384 split into 1920-wide strips or a top-left region of 1080p, beyond today's native size and cover-crop.                                                                                                                                  | NovaStar 1920×1080 input with a wider wall; Resolume staff advice (§1)                                            | Medium: compositor viewport and slice mapping                                                             | **P0** if the first venue has LED, else P1 |
| 3   | **Fix the limiter's spatial blind spot.** Compute flash state per tile on a downsampled frame (e.g. 8×6 tiles approximating the 25 %-field rule) plus a red-ratio channel; add a counter-phase test pattern to CI.                                                                                                                                                   | WCAG area and red rules; limiter header admits scope (§6)                                                         | Medium: one GPU reduction pass plus CPU state per tile; must keep p99                                     | **P0** (safety)                            |
| 4   | **Tracker-assisted tap.** Tap/downbeat anchors the grid. The tracker applies only confidence-gated phase (±40 ms) and tempo (±2 %) corrections, freezes in breakdowns, and shows a drift light. Measure with ±70 ms F-measure alongside the 20 ms target.                                                                                                            | Online SOTA ~80 % beat / ~47 % downbeat F1 (§3); tapping is tiring (§2)                                           | High: reuses the AudioWorklet tracker                                                                     | **P0/P1**                                  |
| 5   | **MIDI clock _input_ via Web MIDI (follower only).** Tempo and beat phase from 24 ppqn with PLP or PLL smoothing; Start/SPP or the downbeat key for bars; auto-fallback to tap when the clock stops. Requires reversing part of D35, so needs the owner's decision.                                                                                                  | V10 sends DIN/USB clock; many USB audio interfaces have MIDI DIN in; Web MIDI is already used for MIDI learn (§2) | High: small code; permission prompt already needed                                                        | **P1**                                     |
| 6   | **Thermal and pressure signal.** Use Chrome's Compute Pressure API, where available, plus frame-time trend to step down render scale _before_ throttling; record it in telemetry.                                                                                                                                                                                    | Overheating reports, a 3 h fade-out, sun lag (§1). API availability on macOS not verified in this lane            | Medium                                                                                                    | **P1**                                     |
| 7   | **Per-night identity.** Event or promoter logo/text overlay with a flash-safe fade, a night palette, and a "visuals by" end slate.                                                                                                                                                                                                                                   | Promoters want a coherent visual identity; credit norms (§4–5, weak)                                              | High                                                                                                      | **P1**                                     |
| 8   | **Showreel capture.** Short clip capture of the stage output for Instagram reels (WebM was cut in D35; a 30–60 s clip is narrower).                                                                                                                                                                                                                                  | VJs need reels to get gigs (§5)                                                                                   | High (MediaRecorder)                                                                                      | **P2**, owner decision                     |
| 9   | **Optional local sync helper.** A tiny signed macOS helper running Carabiner for Link plus open-beat-control for Pro DJ Link, relaying over `ws://localhost`. Follower-only (never sets Link tempo). Shown only if detected.                                                                                                                                         | Link and Pro DJ Link are the accurate paths when available; browsers cannot join UDP multicast (§2)               | Low–medium: native distribution, notarisation, GPL, Java; Pro DJ Link needs booth Ethernet and permission | **P2**                                     |
| 10  | **Offline reference labelling.** Run Beat This on the CC mixes to label beats and downbeats (spot-checked by hand) so D63 becomes scorable. Separately, prototype a small causal model in a worker (onnxruntime-web).                                                                                                                                                | Beat This 2M-param variant ~89/77 on GTZAN offline; BEAST shows streaming is possible (§3)                        | Medium; research lane                                                                                     | **P2**                                     |
| 11  | **Positioning.** "One VJ, eight hours, with a co-pilot." Also a "DJ-owned visuals box" for CDJ booths without a VJ. Validate with 3–5 DJ/promoter conversations before building anything.                                                                                                                                                                            | Practitioner ambivalence about automation; DJs lacking a laptop in CDJ booths (§4–5)                              | n/a                                                                                                       | **P2**                                     |

Not recommended: Denon StageLinQ (rare in clubs, unofficial protocol) and SMPTE timecode (meant for pre-produced shows, not generative looks).

## Sources

**Sync, hardware and protocols**

1. CDM, Pioneer DJM-V10 MIDI clock (2024) — https://cdm.link/pioneer-v10-midi/
2. Allen & Heath, Xone:96 MIDI clock out — https://support.allen-heath.com/hc/en-gb/articles/24250141826193-Xone-96-MIDI-clock-out
3. Eventide forum, H9 and Xone:96 clock — https://www.eventideaudio.com/forums/topic/how-to-use-midi-clock-between-h9-and-xone96/
4. Ableton forum, Xone:92 tap and clock — https://forum.ableton.com/viewtopic.php?p=1549733
5. Nome II forum, V10 clock reliability — https://www.forums.simntonic.com/viewtopic.php?p=2985
6. Resolume forum, BPM/MIDI clock sync — https://resolume.com/forum/viewtopic.php?p=56947
7. Resolume, Sync to Pioneer DJ players — https://resolume.com/support/en/sync-to-pioneer-dj-players
8. Resolume, Sync with a DJ — https://resolume.com/support/en/sync-with-dj
9. Resolume, DJ sync overview — https://resolume.com/support/en/dj-sync
10. Resolume, Ableton Link — https://resolume.com/article/63
11. Beat Link Trigger user guide — https://blt-guide.deepsymmetry.org/beat-link-trigger/README.html
12. Deep Symmetry, open-beat-control — https://github.com/Deep-Symmetry/open-beat-control
13. Deep Symmetry, Carabiner — https://github.com/Deep-Symmetry/carabiner
14. beat-link wiki — https://github.com/Deep-Symmetry/beat-link/wiki
15. Ableton Link concepts — https://ableton.github.io/link/
16. Ableton Link source and licence — https://github.com/Ableton/link
17. Cycling '74 forum, Link and browsers — https://cycling74.com/forums/ableton-link-working-on-raspberry-pi-server!
18. rekordbox Ableton Link FAQ — https://rekordbox.com/en/support/faq/ableton-link/
19. rkbx_link — https://github.com/grufkork/rkbx_link
20. AlphaTheta PRO DJ LINK Bridge — https://www.pioneerdj.com/en/product/software-interfaces/pro-dj-link-bridge/
21. DJTechTools, Pro DJ Link Bridge (2019) — https://djtechtools.com/2019/03/28/pro-dj-link-bridge-connect-nxs2-hardware-to-visual-lighting
22. Obsidian forum, Pro DJ Link vs timecode — https://forum.obsidiancontrol.com/t/pro-dj-link/7945
23. Mixmag, CDJ-3000X — https://mixmag.net/read/alphatheta-announces-next-generation-cdj-3000x-news
24. go-stagelinq — https://github.com/icedream/go-stagelinq
25. Chrome, Web MIDI permission prompt — https://developer.chrome.com/blog/web-midi-permission-prompt
26. Chrome, Window Management API — https://developer.chrome.com/articles/window-management
27. linux-audio-dev, MIDI clock receivers — https://lists.linuxaudio.org/archives/linux-audio-dev/2004-July/008850.html
28. JUCE forum, MIDI clock timing — https://forum.juce.com/t/high-accuracy-scheduling-for-midi-only-so-no-audio-interface-or-process-block-callback/63659

**Beat tracking** 29. Foscarin et al., Beat This! (ISMIR 2024) — https://arxiv.org/abs/2407.21658 (HTML: https://arxiv.org/html/2407.21658v1) 30. Chang & Su, BEAST (ICASSP 2024) — https://arxiv.org/abs/2312.17156 31. Heydari et al., BeatNet — https://arxiv.org/abs/2108.03576 · https://github.com/mjhydri/BeatNet 32. 1D state space comparison — https://arxiv.org/pdf/2111.00704 33. Meier, Chiu & Müller, Real-time PLP (TISMIR 2024) — https://audiolabs-erlangen.com/resources/MIR/2024-TISMIR-RealTimePLP 34. madmom usage — https://madmom.readthedocs.io/en/latest/usage.html 35. essentia.js — https://mtg.github.io/essentia.js/ 36. VDMX Waveclock — https://vdmx.vidvox.net/tutorials/enabling-automatic-bpm-detection-in-vdmx-clock-plugin-using-waveclock 37. SoundSwitch 2.9 — https://news.hummingbirdmedia.com/lighting-control-software-soundswitch-announces-version-29-with-auto-bpm-detection-and-enhanced-autoloop-features

**Rig and venue** 38. Resolume blog, Storm Festival rig — https://resolume.com/blog/14007 39. Resolume forum, first VJ gig — https://www.resolume.com/forum/viewtopic.php?p=40102 40. Resolume forum, composition above 1080p over HDMI — https://resolume.com/forum/viewtopic.php?p=63450 41. Resolume forum, NovaStar output mapping — https://www.resolume.com/forum/viewtopic.php?p=89502 42. Resolume forum, AJA HA5 at 50 Hz — https://resolume.com/forum/viewtopic.php?p=88072 43. NovaStar MX20 — https://www.sonovente.com/en-gb/novastar-mx20-p127084.html 44. NovaStar VX4S — https://www.elationlighting.com/novastar-vx4s 45. Ticket Fairy, LED/projection pipelines — https://www.ticketfairy.com/blog/projection-led-for-festivals-content-pipelines-that-dont-break.md 46. VV Edu, Getting Gig Ready — https://docs.vidvox.net/vv-edu/handout_module_6_3 47. VirtualDJ forum, heat — https://virtualdj.com/forums/166772/General_Discussion/A_note_about_heat_....html 48. U Toronto, MacBook to AV — https://it.chem.utoronto.ca/quick-links/faq/Why%20some%20MacBook%20fails%20to%20display%20to%20AV.pdf 49. r/vjing, changeover between VJs (read via mirror) — https://www.reddit.com/r/vjing/comments/1gcewbc/changeover_between_vjs

**Attitudes and business** 50. Spagnolli et al., automated visual software (CHI 2020; preprint) — https://arxiv.org/abs/1807.11322 51. Digital DJ Tips, visuals behind the DJ — https://www.digitaldjtips.com/your-questions-how-do-i-set-up-visuals-behind-me/ 52. DJTechTools, Blinded by the Lights (2011) — https://djtechtools.com/2011/11/13/blinded-by-the-lights-music-visualizers-and-vjing 53. DJTechTools forum, visualizers for a party — https://forum.djtechtools.com/t/vjing-visualizers-for-a-party/61698 54. r/VJing rates post (search-index mirror; unverified) — https://redlib.ssps.io/r/VJing 55. r/vjing, what gigging looks like (read via mirror) — https://www.reddit.com/r/vjing/comments/1lax4op/what_does_gigging_look_like 56. Resolume forum, VJ earnings (2004) — https://resolume.com/forum/viewtopic.php?p=5940 57. Scottish Artists Union rates — https://artistsunion.scot/sites/default/files/content-files/SAU_ROP_24_formula___explanation.pdf 58. The Skinny, Last Night A VJ Saved My Life — https://www.theskinny.co.uk/festivals/uk-festivals/music/last-night-a-vj-saved-my-life

**Safety** 59. W3C, Understanding WCAG 2.3.1 — https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html 60. Epilepsy Society, photosensitive epilepsy (2023) — https://epilepsysociety.org.uk/sites/default/files/2023-07/PhotosensitiveepilepsyJuly2023.pdf 61. ASA, flashing images in advertising — https://www.asa.org.uk/news/flashing-images-in-advertising.html 62. Pinsent Masons, Ofcom flashing-logo ruling — https://www.pinsentmasons.com/out-law/news/bbc-broke-epilepsy-rule-with-flashing-olympics-logo-rules-ofcom 63. Harding test — https://en.wikipedia.org/wiki/Harding_test
