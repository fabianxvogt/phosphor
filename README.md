<!-- portfolio
{
  "title": "Phosphor",
  "topic": "Creative tools/Generative art",
  "type": "product",
  "description": "A browser VJ instrument for DJ sets: a rated catalog of generative GPU families played from the keyboard, with a beat-following autopilot. The public demo runs the current VJ instrument.",
  "demo": "https://phosphor-performance.vercel.app/",
  "featured": true
}
-->

# Phosphor

A browser VJ instrument for other people's DJ sets: GPU-simulated generative families in one rated catalog played from the keyboard, an autopilot that follows the music, beat tracking from the booth feed, and a stage window that keeps playing if the controls crash. Everything runs locally in Chrome.

**State:** production candidate for live VJ work; first show planned for December 2026. The [public demo](https://phosphor-performance.vercel.app/) runs the current stage/control instrument, deployed 2026-10-08. See the [roadmap](ROADMAP.md), [decisions](docs/DECISIONS.md) and [release evidence](docs/EVIDENCE.md). External-display endurance and real DJ-mix acceptance remain open. Reference rig: MacBook Pro M3 Pro, Chrome, HDMI to the venue screen.

## Run

```sh
npm test && npm run build && npm run check:dist
npm run preview   # http://localhost:48101 (built, offline-capable)
```

Microphone, MIDI, the offline cache and screen placement need HTTPS or localhost.
If an older offline release still shows **Enter Show mode** or **Prep: click a slot to edit it**, save your clip edits and open [Update Phosphor](https://phosphor-performance.vercel.app/update.html) in that same tab. Close the stage and any other Phosphor tabs/windows, keeping the updater open; click **Update and open Phosphor**. Saved sets are retained.

## Prepare and play

1. **Rate and favourite.** The main preview animates the selected visual immediately, without opening the stage; its resolution (480×270 to 1920×1080, default 960×540) is a per-browser choice beside the readouts. All performance controls work locally: master, energy, hue, zoom, mirror, family faders, speed, autopilot, Random, Next, blackout, safe look, freeze, flash and tempo. The **Catalog** is the whole library: every look of every family plus your own looks, with thumbnails. Search it, filter by family or by favourites/rated/unrated/own, mark favourites with **♥** (listed first) and rate looks 0–10 stars (half stars; click the current rating to clear it; **0** means never). Looks with the same rating, including every unrated look, follow an editorial order, most interesting first (D69). Click a thumbnail or **▶ Play** to play a look. The first 32 cards of the current view are on the keyboard. **Edit** opens a look in the look editor: tune parameters, seed, palette and transition, try **Variations** (six bred neighbours), then **Save as own look**. Authored looks never change; own looks can be saved again or deleted.
   **Hear the demo:** the control window starts the 120 BPM demo after your first click or key press; no stage is needed. **Off** keeps it silent until you choose **Demo beat** again; **Mute file/demo** mutes the local demo. Opening the stage stops the local demo so only the stage owns audio. Closing the stage resumes the local demo if it was still selected.
2. **Open stage.** It opens on the second screen when Chrome may place windows; otherwise drag it to the projector. It renders at the screen's native resolution up to 4K (**Stage resolution** in the set; it steps down only if frames stay slow). It takes over your local playing look and performance controls, including unsaved live tweaks. The main preview switches to live output; the editor stays available. Click once on the stage to enable its audio and go fullscreen. Missed status reports during a slow frame do not redirect performer controls to the local preview: the open stage keeps ownership, including after a control reload. Closing the stage resumes local performance from its last reported state.
3. **Audio.** **Use input** for the line feed from the DJ mixer (booth or record out into a USB interface) — analysed only, never played. Automatic beat tracking did not meet its targets on real DJ mixes, so choosing the line input switches to tap tempo at the current BPM: tap Space, mark the downbeat with Enter; **Follow audio** turns tracking back on. **Rehearse with file** or **Demo beat** at home. The stage remembers the source across reloads; mute the demo or switch to the line input before doors.
4. **Pre-show check** — tick the list, show the **framing pattern** on the venue screen, and **export the set**.

## Performance and settings lock

Catalog clicks and keys play looks on the stage whenever it is connected. Look, set, audio and MIDI configuration stays editable with or without a stage. **Lock settings** in the top bar is optional, available only while a stage is connected and off by default. It disables configuration without hiding it (saving or deleting own looks, set fields, audio, MIDI); the keys, performance controls, **Play draft**, **Variations**, catalog search, favourites, ratings and **Play**, set export and pre-show checklist remain usable. Unlock it whenever you need to edit. Closing the stage automatically unlocks settings.

Autopilot plays from the whole **catalog** and reacts to breakdowns, builds and drops. It picks looks by rating (unrated counts as 5, 0 never plays) and avoids recent ones; **♥ only** limits it to favourites and the rating select to looks rated at least that much (it falls back to every playable look rather than stand still). With **Random** on (default) each look plays a random 8, 12 or 16 bars and its parameters glide slowly around their saved values; off, it changes every 8–64 bars (**In order every**), best first, and leaves parameters alone. **Next** (Shift+Space) plays the next pick on the next beat without waiting for the bars, even with autopilot off, and does not take over. Energy belongs to the show, not the look: a trigger keeps the current energy, so builds and drops carry across changes. Its changes are always smooth: three bars, drops one bar. Anything you trigger takes over; control returns after 32 bars without input.

**Transitions:** the select beside **Fade** offers **Auto**, eased **Crossfade**, soft-edged animated **Noise dissolve**, **Feedback melt** and **Cut**. Melt warps the outgoing picture through zoom, rotation and displacement while the incoming picture fades in. Manual Auto is Crossfade; Cut always waits for the downbeat and ignores Fade. Autopilot Auto mixes Crossfade (60 %), Dissolve and Melt (20 % each) in Random mode, uses Crossfade in order, Melt or Dissolve in breakdowns, and one-bar Melt on drops. Crossfades and dissolves ease with smootherstep. An authored smooth choice is respected; an authored Cut becomes Crossfade under autopilot, never a hard cut. Older v4 clips default to Auto, and all choices survive export/import.

**Colour:** every authored look comes with one of 24 mood-tagged palettes; own looks choose a palette or **Custom** colours. Set the show's palette **mood** (warm, cold, acid, mono, deep, peak or **Any palette**) in the Set panel. Manual triggers adopt the look's colours; autopilot changes keep the show's palette for continuity. In both Random and in-order modes, autopilot picks a fresh palette every 64–128 bars and a contrasting one on drops, always gliding over four beats. Manual input pauses both look and palette autopilot. Older sets keep every authored colour as Custom own looks.

For owner curation, `npm run contact -- --sheet palettes` writes every library palette across the six gated families' first types at energy 0.5 to `artifacts/contact/palettes/index.html`, with PNGs and dim/faulty-render findings.

| Keys                                 |                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `1`–`8`, `Q`–`I`, `A`–`K`, `Z/Y`–`,` | the first 32 cards of the catalog view, by key position (QWERTZ works)                                                                   |
| `Esc` / `Shift`+`Esc`                | blackout / safe look — work even with a slider focused; on the fullscreen stage Esc is locked to blackout (hold Esc to leave fullscreen) |
| `Space` / `Enter`                    | tap tempo / this is beat 1 of the bar                                                                                                    |
| `Shift` + `Space`                    | Next: autopilot's next pick on the next beat                                                                                             |
| `←` `→`                              | nudge the beat (adjusts latency while following audio)                                                                                   |
| `↑` `↓`                              | energy                                                                                                                                   |
| `9` / `0`                            | half / double speed (again for normal)                                                                                                   |
| `P` / `O` / hold `L`                 | autopilot / freeze / flash (through the limiter)                                                                                         |

Keys work in the control window and on the stage. Tempo follows the audio when locked (green light), holds through breakdowns (amber) or follows your taps (blue); **Follow audio** switches back from taps.

**If something crashes:** the stage keeps playing when the control window reloads. If the stage itself is lost, click **Open stage** and once on the stage: it comes back with the same clip, energy and shared controls. If the stage leaves fullscreen, it keeps playing without showing anything on the venue screen; the control window says **Stage not fullscreen** and one click on the stage returns. After a rig rehearsal, **Export rehearsal log** saves per-minute frame timing, errors and memory.

## Families

36 families, 304 looks. Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden · Pulse Geometry · Light Beams · Julia Observatory · Fractal Flight · Fourth Dimension · Hyperbolic Loom · Particle Swarm, and the algorithm families added 2026-10-09/10, each built around one recognisable mathematical idea: Game of Life · Strange Attractors · Mandelbrot Dive · Abelian Sandpile · Newton Basins · Fractal Flames · Aperiodic Tilings · Voronoi Cells · Ripple Tank · Langton's Ant · Indra's Pearls · Harmonograph · Wallpaper Groups · Truchet Tiles · Space-filling Curves · Phyllotaxis · Hopf Fibration · Chladni Figures · Domain Colouring ([catalog](docs/CATALOG.md), one page per family in [docs/families](docs/families/)). Every family's looks are in the catalog. A set from before the catalog keeps its edited clips as own looks; its pages are gone (D68). Models, energy behaviour and limits: [docs](docs/README.md).

## Source

`control.mjs` remote and editing, `control-catalog.mjs` and `catalog-thumbs.mjs` its catalog · `stage.mjs` renderer host and show owner · `show.mjs`, `show-clock.mjs`, `autopilot.mjs`, `keymap.mjs`, `show-set.mjs`, `catalog.mjs` show logic · `beat-tracker.mjs`, `beat-worklet.mjs`, `stage-audio.mjs`, `energy-events.mjs` audio · `engine.mjs`, `compositor.mjs`, `scene-*.mjs` renderer and families · `docs/` reference, [decisions](docs/DECISIONS.md) and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
