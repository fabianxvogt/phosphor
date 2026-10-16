# VJ tools, features and workflows: what working VJs expect

Lane 01 of the October 2026 community research. Read-only desk research, 2026-10-14.
Labels: **REPORTED** = what people said in a source; **SPECULATIVE** = this lane's inference.
Frequencies count the sources in this sample (about 50), not the whole internet.

## Method and limits

- **Reddit was not directly readable.** reddit.com and old.reddit.com block this research agent, and mirror front-ends were behind bot challenges, which were not bypassed. Reddit evidence (r/vjing, r/resolume, r/SynesthesiaLive) comes only from search-engine summaries of mirrored threads. Treat it as thinner than the rest.
- The Resolume forum is behind Cloudflare, so its threads are cited from search summaries of the forum pages.
- Readable first-hand sources were Hacker News, the Troikatronix (Isadora), VDMX and Ableton forums, CDM, DJ TechTools, KVR, a Stanford CCRMA course wiki, an itch.io devlog and vendor docs.
- The shared web-search budget for this session ran out partway through. Some planned queries were not run: the r/TouchDesigner and r/vjloops angles, Discord-public pages and YouTube descriptions. A follow-up pass could fill these gaps.

## Summary

- **Inter-app video routing (Spout/Syphon/NDI) is the entry ticket.** Generative tools such as NestDrop, Synesthesia and TouchDesigner are usually judged as _sources_ that feed Resolume or MadMapper. Phosphor cannot do this today. (REPORTED, ~10 sources)
- **Tempo sync is expected, and tap is the real-world default.** VJs tap, then fix phase by hand. External clocks (MIDI clock, Ableton Link, Pioneer Pro DJ Link) are what they upgrade to. Automatic beat detection is widely distrusted outside steady four-on-the-floor music. (REPORTED, ~15 sources)
- **MIDI control is assumed.** Popular controllers are the APC40, Launchpad, Midi Fighter Twister, NI F1/X1 and Akai MPD. (REPORTED, ~10 sources)
- **Stage reliability beats features.** Crashes after updates, mid-set lockups and a browser showing a black screen are the stories people retell. (REPORTED, ~8 sources)
- **The typical stack is hybrid.** Resolume handles clips, mixing and mapping, and a generative or audio-reactive app is fed into it. Pure "visualizers" are viewed with suspicion as a substitute for VJing. (REPORTED, ~8 sources)
- **Fully automatic VJing gets an ambivalent-to-hostile reaction from VJs**, but there is real demand from solo DJs and venues with no VJ. Autopilot is accepted as a backup or co-pilot. (REPORTED, ~7 sources)
- **Browser tools are seen as accessible but fragile.** Hydra is admired in live coding, but people report slowness and Chrome glitches at gigs. Free, no-install browser VJ apps now exist, including VJam and Vortexia. (REPORTED, ~6 sources)
- **Self-made tools mostly win on visual quality and zero friction.** They lose on platform limits, login or price walls, weak demo videos, visible audio/visual lag and the "this is just Winamp" comparison. (REPORTED, 8 Show HN-type examples)
- **For Phosphor:** its strengths are distinctive math visuals, free, offline, cross-OS Chrome, crash recovery, tap-first sync and a photosensitivity limiter. Its P0 gaps are video routing out of the browser, MIDI-clock input with phase resync, and a demo that proves sync and stability.

---

## Q1. Must-have features, ranked by how often and how strongly they come up

| Rank | Feature                                                                                                         | Strength of expectation                             | Evidence (approx. frequency)                                                                                                                                                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Video routing: Spout (Win), Syphon (Mac), NDI (network)**                                                     | Near-mandatory for any "source" app                 | NestDrop's Show HN answered mapping and multi-projector questions with "output Spout into Resolume/MadMapper". Synesthesia advertises Syphon/Spout/NDI. r/SynesthesiaLive users route Spout/Syphon locally and NDI between PCs. Resolume forum has a long-running NDI thread and Spout/Syphon requests. TouchDesigner users "spout to Resolume". (REPORTED, ~10) |
| 2    | **Tempo sync**: tap, BPM entry, nudge or resync, plus an external clock (MIDI clock, Ableton Link, Pro DJ Link) | Expected in every serious tool                      | Resolume, VDMX, GrandVJ and Magic forum threads; CDM coverage of Link and Pioneer sync; Troikatronix threads. (REPORTED, ~15)                                                                                                                                                                                                                                    |
| 3    | **MIDI controller mapping (MIDI learn) and OSC**                                                                | Assumed baseline                                    | r/vjing beginner threads say to buy a durable controller early. Resolume forum controller threads; DJ TechTools Twister + APC40 rigs; Synesthesia's "MIDI & OSC mappable" controls. (REPORTED, ~10)                                                                                                                                                              |
| 4    | **Stability on stage**                                                                                          | Dealbreaker if missing                              | r/resolume April 2025: a nine-licence team distrusted Resolume after crashes. Synesthesia crashed mid-set alongside VirtualDJ stems. Hydra showed a Chrome black screen at a rave. On HN, someone noted that any glitch is noticed by the crowd. (REPORTED, ~8)                                                                                                  |
| 5    | **Layering, blend modes, effects, clip grid**                                                                   | Core for clip VJs; optional for a generative source | Guides describe Resolume's "clip grid, layers with blend modes, effect chains" as the default stack. (REPORTED, ~6)                                                                                                                                                                                                                                              |
| 6    | **Mapping, multi-output, edge blend**                                                                           | Needed for festivals; usually delegated             | r/vjing advice: Arena is worth it for its mapping. NestDrop and MadMapper are paired with a mapping app. (REPORTED, ~6)                                                                                                                                                                                                                                          |
| 7    | **Custom content: ISF/GLSL/Shadertoy import, own clips, logos**                                                 | Valued by power users                               | A Resolume ISF request said almost every other VJ host supports it. Synesthesia imports Shadertoy/ISF and logos. r/vjing has ISF conversion threads (Metal vs OpenGL compatibility pain). (REPORTED, ~5)                                                                                                                                                         |
| 8    | **Recording or export of the visual output**                                                                    | Secondary but recurring                             | NestDrop users asked how to record (answer: a separate Spout recorder). Hydra users switched tools over recording gripes. Hyperchroma users asked for video export. VJam ships WebCodecs recording. (REPORTED, ~4)                                                                                                                                               |
| 9    | **Cross-platform (Mac and Windows)**                                                                            | Single-OS tools get called out                      | NestDrop and Tooll3 were criticised as Windows-only; VDMX is Mac-only. (REPORTED, ~4)                                                                                                                                                                                                                                                                            |

**Controllers named (REPORTED):**

- APC40 / APC40 mk2: favoured for Resolume's 8x8 grid plus crossfader; discontinued, so people buy it used.
- Novation Launchpad
- Midi Fighter Twister: 16 endless encoders, often paired with a pad grid.
- NI Traktor Kontrol F1/X1: recommended because it "can take abuse".
- Akai MPD232

## Q2. Biggest pain points with existing tools

**Resolume (REPORTED, ~10 sources)**

- **Cost and edition gating.** People call it beginner-friendly but expensive. Mapping and Pioneer sync are Arena-only. After the version 7 licence change, one user said keeping current costs infrequent users more than before.
- **Stability regressions.** Crashes after point updates led one venue to roll back from 7.14 to 7.13.2. Staff say random crashes are mostly out-of-memory.
- **BPM.** Clip auto-BPM read 120 for everything on Windows in Resolume 7 and was still wrong after the fix. A moderator has said audio BPM detection only works for simple four-on-the-floor music. MIDI-clock input could jump to 500 BPM and stay there until relinked. Controllers sending on both press and release produced phantom 500-BPM taps. Integer tap rounding drifts.

**TouchDesigner (REPORTED, ~5)**

- A "big learning curve" is the standard warning.
- The free licence caps resolution (commenters cite 1280x1280 or "720p").
- Everything must be built yourself, BPM sync and scenes included.
- Many TD users wrap their work in a VJ front-end and Spout it into Resolume.

**Synesthesia (REPORTED, ~5)**

- Pro tier needed for some I/O; one 2021–22 thread says NDI _input_ is Pro-only.
- Fighting other apps for the GPU: frame rate fell from 60–150 fps to 15–20 fps beside VirtualDJ stems.
- A crash that forced a laptop reboot mid-set.
- MIDI getting "stuck" when shared with Resolume.
- Praised for audio reactivity tuned to poor laptop mics, and for exporting its FFT analysis as OSC.

**VDMX (REPORTED, ~3)**

- Mac-only.
- Waveclock auto-BPM ran unstably under Rosetta on M1 and fell a beat behind after a second tempo change.
- Pioneer/Pro DJ Link integration is still a feature request (thread 2022–2025).

**MadMapper (REPORTED, ~3)**

- Needs a separate content tool.
- ISF shaders written for Metal (VDMX) often fail on its OpenGL renderer.

**Magic Music Visuals (REPORTED, ~4)**

- Lacked beat detection for years; users relied on external MIDI-clock tools.
- One user said tapping is only good for approximating, then you type in the BPM.
- Wavetick was "confused by double beats and breaks" and needed a bar to recover.

**Milkdrop / NestDrop / Butterchurn (REPORTED, ~5)**

- Windows/DX9 only (NestDrop).
- The full preset library is mostly mediocre and needs curation.
- The appeal is framed as nostalgia: VJs get asked for the Winamp look.

**Hydra and browser tools (REPORTED, ~5)**

- A rave performer said it ran too slowly, with Chrome showing a black screen, and would not use it live again.
- An itch.io devlog reports heavy machines struggling and a high JavaScript/RAM barrier.
- Recording was awkward enough that one user moved to KodeLife plus MIDI.

## Q3. How VJs actually sync to DJs

**Practice ladder (REPORTED, ~15 sources; ordering SPECULATIVE):**

1. **Tap tempo, then manual phase fixes.** This is the default and the fallback.
   - A Troikatronix staffer said he has tried several options and always falls back to tapping, calling it simple and effective.
   - The cost: when the DJ changes tempo mid-set, keeping it updated takes attention away from design.
   - Resolume moderators point out that a tapped 156.47 BPM drifts against either 156 or 157. Users ask for decimal BPM, nudge and "resync to 1".
2. **Audio-to-MIDI-clock utilities** (Waveclock, Wavetick, Visual Jockey, BPM-to-OSC).
   - One user called Waveclock accurate and stable with VDMX/Isadora.
   - Others report it losing phase on tempo changes, breaks and double kicks.
   - The consensus is that it works for steady four-on-the-floor music and fails on complex or beatless material.
3. **Ableton Link.** Popular wherever the DJ software emits it.
   - Supported by Resolume (since 6), VDMX, GrandVJ, CoGe and TouchDesigner's Link CHOP.
   - Users praise it as "perfectly synced" when it works.
   - An Algoriddim djay user found Link time-stretching each bar and reverted to manual tap.
4. **Pioneer Pro DJ Link.** The high end.
   - Resolume Arena 7.12+ links clips to tracks on up to four CDJs, keeping the playhead aligned through scratching and loops.
   - GrandVJ receives BPM via TCNet.
   - beat-link-trigger (open source) turns CDJ data into MIDI or OSC. ShowKontrol provides timecode and waveforms.
   - Costs: an Ethernet hub, the venue's cooperation, and Arena-only support.
5. **Envelope/FFT reactivity without a beat grid.** Synesthesia's band analysis from a laptop mic is accepted by users as "good enough" reactivity. One Magic user leaves individual beats to automation and keeps motion tied to volume.

**On automatic beat detection specifically (REPORTED, ~8):**

- The common view is that it is unreliable on real mixes. The failure modes match Phosphor's own finding: half/double-tempo errors, locking to off-beats, losing lock in breakdowns and slow recovery.
- What VJs trust is a human anchor: tap, a "1" button, nudge, and an external clock when available.
- SPECULATIVE: Phosphor's choice to default line input to tap tempo matches practice. Its tracker failing accuracy targets is normal for the category, not a unique weakness.

## Q4. Attitudes

**Generative/procedural vs clip-based (REPORTED, ~8)**

- Hybrid is the norm. Beginners are told to start with Resolume for clips, mixing and mapping, then add Synesthesia, NestDrop or TouchDesigner for reactive generative content.
- Loop packs are sold as BPM-synced assets ("128-beat loops for Resolume").
- On HN, a critique of a loop seller's reel asked for more visuals generated in real time with the music. Another commenter said generative and datamosh work is in demand, but few people do it well.
- Purists question calling it "VJing" when no video is mixed; Wikipedia cites this objection.
- On KVR, one user found pure reactive visualizers boring on their own and wanted visuals that make a statement without the audio. Another said visualizers got tiresome once they were everywhere.
- The refined criticism targets single-parameter mappings (kick drives scale), not reactivity itself.

**Autopilot / auto-VJ (REPORTED, ~7)**

- NestDrop's author rejected a request for fully automated club mode, arguing VJing is a human skill.
- DJ TechTools (2013) said visualizers are no replacement for a real VJ, but useful when none is available.
- A 2020 academic study of DJs and VJs (Spagnolli et al.; 102 survey responses plus interviews) found ambivalence, with resistance to automation in some user groups.
- Vendors target the gap: DjMirror and Freebeat sell self-running visuals to solo DJs, and OneManVJ markets auto-VJ both to venues and to VJs as a backup.
- SPECULATIVE: autopilot sells as "keeps the screen good while you are busy or absent". It does not sell as "replaces the VJ".

**Browser-based tools (REPORTED, ~6)**

- Respected in live-coding/algorave circles (Hydra).
- People recommend browser Milkdrop (butterchurnviz) as the Mac/no-Windows alternative to NestDrop.
- Free, no-install apps are appearing: VJam (Butterchurn plus 426 shaders, MIDI, WebCodecs recording, 4-point mapping, PWA) and Vortexia (no MIDI).
- Doubts centre on performance and glitches at gigs, plus the lack of integration with the pro stack.
- SPECULATIVE: browsers cannot natively emit Spout/Syphon/NDI or speak UDP for Link/OSC. That inability, more than WebGL speed, is the structural reason pros dismiss them.

## Q5. Reactions to self-made tools (concrete examples)

| Tool (venue, date)                                         | Praised                                                                              | Criticised or ignored                                                                            | Requests                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **NestDrop** (Show HN, Feb 2020; 64 points, 115 comments)  | Curated 9,795 presets (users said the raw library is mediocre); Spout out; nostalgia | Windows/DX9 only; demo music disliked; visuals visibly behind the audio; price suspected too low | Full auto mode (author refused); multi-projector support (answer: Spout to Resolume/MadMapper); recording |
| **Kaleidosync** WebGL visualizer (HN, Apr 2022; 65 points) | Called the "gold standard" for audio-reactive visuals in the browser                 | Spotify login wall; ran at its own tempo on beatless tracks; no licence                          | Custom/sample audio, BPM readout, shader code                                                             |
| **Banger.show** (Show HN, Jul 2023; 84 points)             | Slick UX, concept                                                                    | Visuals "really amateur" and elementary next to Shadertoy; $8/month for 3 visuals; cookie wall   | More visuals, free tier, song-structure view                                                              |
| **Hyperchroma** (Show HN, Nov 2021; 61 points)             | Polished transitions and animations                                                  | Did not work "out of the box" without user images; Electron resource use; closed source          | Default visuals, video export, native build                                                               |
| **Fractal music visualizer** (Show HN, ~2026; 4 points)    | Raymarched shaders look "incredible"                                                 | Little traction                                                                                  | Open source, collaboration with live coders                                                               |
| **Goom browser port** (Show HN, Jun 2024; 2 points)        | (none)                                                                               | Ignored; CPU and battery cost                                                                    | Mic input                                                                                                 |
| **Tooll3** (CDM via VJ Union)                              | Audio-reactive setups come together quickly; OSC; MIT licence                        | Not yet trusted live on stage; Windows-only                                                      | (none recorded)                                                                                           |
| **Hydra** (course wikis, devlogs)                          | Free, browser, gorgeous live-coded aesthetic                                         | Slow and glitchy at gigs; coding barrier                                                         | (none recorded)                                                                                           |

**Pattern (SPECULATIVE, from the above):**

- Attention comes from visibly high-quality visuals plus zero friction: free, instant, no login.
- Dismissal comes from:
  - platform walls
  - weak or ugly demos (music choice matters)
  - visible audio/visual lag
  - "Winamp/Shadertoy already does this"
  - subscriptions for a few presets
- VJ-literate commenters immediately ask how the tool plugs into Resolume or MadMapper, multi-output and recording.

---

## Implications for Phosphor (ranked)

| #   | Gap or strength                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                    | Priority                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **GAP: no route out of the browser into a pro stack** (Spout/Syphon/NDI). Without it, working VJs see Phosphor as a standalone visualizer, not a source for Resolume/MadMapper. Cheapest paths (SPECULATIVE): a documented OBS recipe (Chrome window or browser source, then OBS NDI/Spout/Syphon plugins), then a tiny optional native companion (Tauri/Electron shell, or WebRTC-to-NDI helper). | Q1 rank 1; NestDrop thread; Synesthesia/TouchDesigner routing threads       | **P0**                                                                 |
| 2   | **GAP: external clock input and phase control.** Add MIDI-clock input via Web MIDI (Chrome supports it; Waveclock, DJ software and some mixers emit it), plus a "1 / resync downbeat" key, nudge ±, half/double and decimal BPM. Then Ableton Link through a local bridge (Link-to-MIDI apps or a small helper), and document beat-link-trigger to MIDI for Pioneer rigs.                          | Q3; Resolume tap-drift and MIDI-clock threads; Troikatronix tap threads     | **P0** (MIDI clock + resync), **P1** (Link bridge, Pro DJ Link recipe) |
| 3   | **STRENGTH, needs proof: stage reliability.** Crash recovery, a separate stage window, offline PWA and the photosensitivity limiter address the top fear. Prove it with a multi-hour soak test on mid-range GPUs, a published "gig checklist", and no black-screen failure modes (context loss, tab throttling, sleep).                                                                            | Q1 rank 4; Hydra rave report; Resolume/Synesthesia crash stories            | **P0**                                                                 |
| 4   | **STRENGTH: tap-first sync is honest and matches practice.** Keep it. Never market auto beat detection for DJ mixes; describe audio input as "reactivity, not tempo".                                                                                                                                                                                                                              | Q3 consensus; Resolume moderator; Wavetick and Waveclock reports            | **P1** (copy and UX)                                                   |
| 5   | **GAP: MIDI depth.** MIDI learn exists. Add tested templates for APC40/APC mini, Launchpad, Midi Fighter Twister, nanoKONTROL/MIDImix and Traktor F1. Add LED feedback, endless-encoder (relative) support, and press-only triggering to avoid phantom double taps.                                                                                                                                | Q1 rank 3; Resolume 500-BPM tap bug                                         | **P1**                                                                 |
| 6   | **STRENGTH: distinctive visual identity.** 39 math families and muted organic palettes set Phosphor apart from Milkdrop neon and stock loops. Quality was the main driver of praise in every Show HN example. Lead with a short, well-scored demo film showing tight sync and a hand on a controller, and avoid any visible audio/visual lag.                                                      | Q5 pattern; Banger.show and NestDrop demo critiques                         | **P1**                                                                 |
| 7   | **POSITIONING: autopilot as co-pilot.** Frame the rating-driven autopilot as "backup / solo-DJ / long-night mode" that a VJ can override at any moment. Do not frame it as a VJ replacement. Separately, address solo DJs and venues, where the demand for self-running visuals is.                                                                                                                | Q4 autopilot evidence; Spagnolli et al.; NestDrop author; DjMirror/OneManVJ | **P1**                                                                 |
| 8   | **GAP: recording/export.** WebCodecs capture of the stage output would serve social clips and set documentation. A free browser competitor, VJam, already ships it.                                                                                                                                                                                                                                | Q1 rank 8; Hyperchroma/NestDrop requests                                    | **P1**                                                                 |
| 9   | **GAP, partly by design: layering/compositing.** VJs who mix in Resolume will layer there once routing exists (SPECULATIVE). For standalone users, a minimal two-look blend or overlay mode would counter the "it's just a visualizer" critique.                                                                                                                                                   | Q4 KVR and purist comments; Q1 rank 5                                       | **P2** (after #1)                                                      |
| 10  | **STRENGTH with a caveat: free, no install, Mac and Windows via Chrome.** This beats Windows-only NestDrop/Tooll3 and Mac-only VDMX, and avoids the price and login backlash. Chrome-only is acceptable to this audience; Safari/Firefox are low priority.                                                                                                                                         | Q1 rank 9; Q5 kaleidosync/Banger                                            | **P2** (keep)                                                          |
| 11  | **GAP: mapping/multi-output.** Delegate to MadMapper/Resolume through #1. At most add 4-corner keystone (VJam has it) for small gigs.                                                                                                                                                                                                                                                              | Q1 rank 6                                                                   | **P2**                                                                 |
| 12  | **GAP: custom content/ISF.** Power users value importing shaders. Exporting selected Phosphor families as ISF could be a distribution channel into VDMX, Resolume and Synesthesia users (SPECULATIVE). Logo/text overlays are often needed for corporate or club gigs but are excluded by design; state this as a deliberate choice.                                                               | Q1 rank 7; Synesthesia logo import                                          | **P2**                                                                 |
| 13  | **GAP: OSC out/in** (for example, publishing Phosphor's beat or energy to other apps, as Synesthesia does). This needs a WebSocket-to-OSC bridge; it can share the helper from #1 and #2.                                                                                                                                                                                                          | Synesthesia OSC praise; Troikatronix OSC preference                         | **P2**                                                                 |

**Likely dealbreakers for working VJs today (SPECULATIVE, from the evidence):**

- no Spout/Syphon/NDI
- no external tempo clock
- any on-stage black screen or stall

**Likely dealbreakers for solo DJs / hobbyists:** few; they mainly need quality, zero setup and reliability, which Phosphor already targets.

---

## Sources

Reddit (via search-engine summaries of mirrored threads; not directly readable):

1. r/vjing "Getting into VJing" (Jul 2024): https://www.reddit.com/r/vjing/comments/1edrtmp/getting_into_vjing
2. r/vjing "DJ wanting to get into VJing" (2025): https://www.reddit.com/r/vjing/comments/1kiv6nf/dj_wanting_to_get_into_vjing
3. r/vjing "Aspiring VJ needs advice" (2025): https://www.reddit.com/r/vjing/comments/1ii0esa/aspiring_vj_needs_advice
4. r/vjing "Seeking guidance": https://www.reddit.com/r/vjing/comments/1gkid55/seeking_guidance
5. r/resolume "Problem with Resolume crashing" (Apr 2025): https://www.reddit.com/r/resolume/comments/1k62lpn/problem_with_resolume_crashing
6. r/SynesthesiaLive Resolume→Synesthesia→Resolume (Dec 2021): https://www.reddit.com/r/SynesthesiaLive/comments/rfbs8m/resolumesynesthesiaresolume
7. r/vjing "Shader conversions week 2" (ISF, May 2025): https://www.reddit.com/r/vjing/comments/1ktsrgv/shader_conversions_week2

Resolume: 8. Auto BPM detection in Resolume 7: https://resolume.com/forum/viewtopic.php?t=22018 9. Reliable realtime BPM analyzing: https://resolume.com/forum/viewtopic.php?t=21604 10. Tap tempo / BPM threads: https://resolume.com/forum/viewtopic.php?t=6090 , https://resolume.com/forum/viewtopic.php?t=7527 , https://resolume.com/forum/viewtopic.php?t=21632 11. ISF request (implemented 7.8): https://resolume.com/forum/viewtopic.php?p=59861 12. NDI support thread: https://resolume.com/forum/viewtopic.php?t=13155&start=40 13. Controllers (APC40 shortage; hardware advice): https://www.resolume.com/forum/viewtopic.php?p=92776 , https://www.resolume.com/forum/viewtopic.php?p=37468 14. Licence expiration and renewal: https://www.resolume.com/forum/viewtopic.php?p=81966 15. Crash threads: https://resolume.com/forum/viewtopic.php?p=105230 , https://www.resolume.com/forum/viewtopic.php?p=49273 16. Sync to Pioneer DJ players (official): https://resolume.com/article/137

Other forums: 17. VDMX discourse, Pioneer CDJ DJ Link Bridge (2022–2025): https://discourse.vidvox.net/t/pioneer-cdj-dj-link-bridge/1763 18. VDMX beta thread, Waveclock on M1: https://discourse.vidvox.net/t/vdmx-beta-8-7-2-11-now-ready-for-testing-m1-intel/1613?page=2 19. VDMX Waveclock tutorial: https://vdmx.vidvox.net/tutorials/using-waveclock-to-send-midi-clock-to-vdmx 20. Troikatronix, automatic BPM for DJ sets: https://community.troikatronix.com/post/15368 21. Troikatronix, tap-tempo fallback: https://community.troikatronix.com/post/1878 22. Troikatronix, Synesthesia Pro trial and OSC: https://community.troikatronix.com/post/49692 23. Magic forum, BPM clock auto vs manual: https://magicmusicvisuals.com/forums/viewtopic.php?t=150 24. Magic forum, automation of beats: https://magicmusicvisuals.com/forums/viewtopic.php?p=4253 25. KVR, Magic Music Visuals thread: https://www.kvraudio.com/forum/viewtopic.php?p=7427434 26. VirtualDJ forum, Synesthesia/Spout issues: https://virtualdj.com/forums/257131/General_Discussion/VDJ_%28with_stems%29_%2F_Synesthesia_%2F_Spout_issues....html 27. Ableton forum, Link + Resolume 6: https://forum.ableton.com/viewtopic.php?p=1727440 28. Algoriddim community, Ableton Link not working as hoped: https://community.algoriddim.com/t/ableton-link-not-working-as-hoped/24565/47 29. DJ TechTools forum, dual Twister + APC40: https://forum.djtechtools.com/t/dual-midi-fighter-twister-and-apc40-mkii-setup/73966 30. Derivative, Ableton Link CHOP and beat-detection posts: https://derivative.ca/UserGuide/Ableton_Link_CHOP , https://derivative.ca/community-post/tutorial/beat-detection/62551

Hacker News: 31. Show HN: NestDrop: https://news.ycombinator.com/item?id=22418099 32. Ask HN: concert visuals business: https://news.ycombinator.com/item?id=40945532 33. Show HN: Blotter: https://news.ycombinator.com/item?id=36037419 34. Show HN: Banger.show: https://news.ycombinator.com/item?id=36622992 35. A WebGL Music Visualizer (kaleidosync): https://news.ycombinator.com/item?id=30929909 36. Show HN: Hyperchroma: https://news.ycombinator.com/item?id=29362969 37. Show HN: fractal music visualizer: https://news.ycombinator.com/item?id=47303813 38. Show HN: Goom in the browser: https://news.ycombinator.com/item?id=40788863

Press, blogs, docs and research: 39. CDM, Resolume 7.12 Pioneer sync: https://cdm.link/resolume-7-12-now-syncs-your-live-visuals-with-pioneer-dj-gear-among-other-goodies/ 40. CDM, Ableton Link for visuals: https://cdm.link/now-can-sync-live-visuals-ableton-link/ 41. CDM, Tooll3: https://cdm.link/tooll3-vj-friendly-free-procedural-visuals-puts-some-sweetness-in-sweet-spot-windows/ 42. CDM, Hydra: https://cdm.link/hydra-olivia-jack/ 43. Stanford CCRMA wiki, Hydra at a rave: https://ccrma.stanford.edu/wiki/User:Lemonaut 44. itch.io devlog, Hydra video synthesis: https://rafipdf.itch.io/drawing-moving-and-seeing-with-code/devlog/959271/dmsc-devlog-week-8-video-synthesis 45. DJ TechTools, Visualizers for DJs: https://djtechtools.com/2013/03/15/visualizers-for-djs-3-simple-diy-solutions 46. Spagnolli et al. 2020, DJs'/VJs' ambivalence toward automated visuals: https://research.unipd.it/handle/11577/3341438 47. ArKaos GrandVJ, Pro DJ Link bridge: https://pro.arkaos.com/node/821 48. beat-link-trigger: https://github.com/deep-symmetry/beat-link-trigger 49. Synesthesia (official): https://synesthesia.live/ 50. Lazy Lighting VJ software guide (vendor): https://lazylighting.com/blog/best-vj-software 51. VJam browser VJ app: https://vjam.art/ 52. Vortexia browser VJ: https://vortexia.live/visuals/free-vj-software-browser 53. OneManVJ auto-VJ: https://deejeitokyo.itch.io/onemanvj 54. DjMirror (vendor, solo-DJ visuals): https://djmirror.com/ 55. awesome-vjing list: https://github.com/LimeLimeW/awesome-vjing
