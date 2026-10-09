<!-- portfolio
{
  "title": "Phosphor",
  "topic": "Creative tools/Generative art",
  "type": "product",
  "description": "A browser VJ instrument for DJ sets: generative GPU families on a keyboard clip grid with a beat-following autopilot. The public demo runs the current VJ instrument.",
  "demo": "https://phosphor-performance.vercel.app/",
  "featured": true
}
-->

# Phosphor

A browser VJ instrument for other people's DJ sets: GPU-simulated generative families on a 4×8 keyboard clip grid, an autopilot that follows the music, beat tracking from the booth feed, and a stage window that keeps playing if the controls crash. Everything runs locally in Chrome.

**State:** production candidate for live VJ work; first show planned for December 2026. The [public demo](https://phosphor-performance.vercel.app/) runs the current stage/control instrument, deployed 2026-10-08. See the [roadmap](ROADMAP.md), [decisions](docs/DECISIONS.md) and [release evidence](docs/EVIDENCE.md). External-display endurance and real DJ-mix acceptance remain open. Reference rig: MacBook Pro M3 Pro, Chrome, HDMI to the venue screen.

## Run

```sh
npm test && npm run build && npm run check:dist
npm run preview   # http://localhost:48101 (built, offline-capable)
```

Microphone, MIDI, the offline cache and screen placement need HTTPS or localhost.
If an older offline release still shows **Enter Show mode** or **Prep: click a slot to edit it**, save your clip edits and open [Update Phosphor](https://phosphor-performance.vercel.app/update.html) in that same tab. Close the stage and any other Phosphor tabs/windows, keeping the updater open; click **Update and open Phosphor**. Saved sets are retained.

## Prepare and play

1. **Rate and fill.** The main preview animates the selected visual immediately, without opening the stage; its resolution (480×270 to 1920×1080, default 960×540) is a per-browser choice beside the readouts. All performance controls work locally: master, energy, hue, zoom, mirror, family faders, speed, autopilot, Random, Next, blackout, safe look, freeze, flash and tempo. The **Catalog** below the grid lists every look of every family with a thumbnail: search it, filter by family, **Play** a look, and rate it 0–10 stars (half stars; click the current rating to clear it; **0** means never). Autopilot plays highly rated looks more often and never a 0. **To slot** stores a look in the selected grid slot. A new set already holds every look on its eight pages. Click a slot, pick a family and look, tune it in the editor, set its energy, fade, transition, when it starts (next beat, next bar, immediately) and whether autopilot may play it, then **Save to slot**. **Variations** breeds six nearby looks to pick from. Use pages as moods for the night — warm-up, peak, closing.
   **Hear the demo:** the control window starts the 120 BPM demo after your first click or key press; no stage is needed. **Off** keeps it silent until you choose **Demo beat** again; **Mute file/demo** mutes the local demo. Opening the stage stops the local demo so only the stage owns audio. Closing the stage resumes the local demo if it was still selected.
2. **Open stage.** It opens on the second screen when Chrome may place windows; otherwise drag it to the projector. It renders at the screen's native resolution up to 4K (**Stage resolution** in the set; it steps down only if frames stay slow). It takes over your local playing look and performance controls, including unsaved live tweaks. The main preview switches to live output; the editor stays available. Click once on the stage to enable its audio and go fullscreen. Missed status reports during a slow frame do not redirect performer controls to the local preview: the open stage keeps ownership, including after a control reload. Closing the stage resumes local performance from its last reported state.
3. **Audio.** **Use input** for the line feed from the DJ mixer (booth or record out into a USB interface) — analysed only, never played. Automatic beat tracking did not meet its targets on real DJ mixes, so choosing the line input switches to tap tempo at the current BPM: tap Space, mark the downbeat with Enter; **Follow audio** turns tracking back on. **Rehearse with file** or **Demo beat** at home. The stage remembers the source across reloads; mute the demo or switch to the line input before doors.
4. **Pre-show check** — tick the list, show the **framing pattern** on the venue screen, and **export the set**.

## Performance and settings lock

Grid clicks and keys trigger clips on the stage whenever it is connected. Clip, set, audio and MIDI configuration stays editable with or without a stage. **Lock settings** in the top bar is optional, available only while a stage is connected and off by default. It disables configuration without hiding it (including the catalog's **To slot**); the grid, performance controls, **Play selected clip**, catalog search, ratings and **Play**, set export and pre-show checklist remain usable. Unlock it whenever you need to edit. Closing the stage automatically unlocks settings.

Autopilot plays from the **catalog** (default) or from the current **page** (the select beside **Random**) and reacts to breakdowns, builds and drops. From the catalog it picks any look by rating (unrated counts as 5, 0 never plays) and avoids the last 24; from a page it weighs each clip by its look's rating and avoids the last six. With **Random** on (default) each clip plays a random 8, 12 or 16 bars and its parameters glide slowly around their saved values; off, it changes every 8–64 bars (**In order every**) in slot order (or best-rated first from the catalog) and leaves parameters alone. **Next** (Shift+Space) plays the next pick on the next beat without waiting for the bars, even with autopilot off, and does not take over. Energy belongs to the show, not the clip: a trigger keeps the current energy, so builds and drops carry across clip changes. Its changes are always smooth: three bars, drops one bar. Anything you trigger takes over; control returns after 32 bars without input. Switching pages steers the night when the page is the source.

**Transitions:** the select beside **Fade** offers **Auto**, eased **Crossfade**, soft-edged animated **Noise dissolve**, **Feedback melt** and **Cut**. Melt warps the outgoing picture through zoom, rotation and displacement while the incoming picture fades in. Manual Auto is Crossfade; Cut always waits for the downbeat and ignores Fade. Autopilot Auto mixes Crossfade (60 %), Dissolve and Melt (20 % each) in Random mode, uses Crossfade in order, Melt or Dissolve in breakdowns, and one-bar Melt on drops. Crossfades and dissolves ease with smootherstep. An authored smooth choice is respected; an authored Cut becomes Crossfade under autopilot, never a hard cut. Older v4 clips default to Auto, and all choices survive export/import.

**Colour:** each clip chooses one of 24 mood-tagged palettes, or **Custom** to reveal the three colour inputs. Set a page's **mood** to warm, cold, acid, mono, deep or peak (or **Any palette**). Manual triggers adopt the clip's colours; autopilot clip changes keep the show's palette for continuity. In both Random and in-order modes, autopilot picks a fresh palette every 64–128 bars and a contrasting one on drops, always gliding over four beats. Manual input pauses both clip and palette autopilot. New v4 sets start with varied palettes; importing or loading v3 preserves every authored colour as Custom.

For owner curation, `npm run contact -- --sheet palettes` writes every library palette across the six gated families' first types at energy 0.5 to `artifacts/contact/palettes/index.html`, with PNGs and dim/faulty-render findings.

| Keys                                 |                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `1`–`8`, `Q`–`I`, `A`–`K`, `Z/Y`–`,` | the 32 grid slots, by key position (QWERTZ works)                                                                                        |
| `Shift` + `1`–`8`                    | page                                                                                                                                     |
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

Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden · Pulse Geometry · Light Beams · Julia Observatory · Fractal Flight · Fourth Dimension · Hyperbolic Loom · Particle Swarm. Every family's looks are in the catalog; a new set spreads all of them over its eight pages, every type first and families mixed on each page. A set from before the catalog keeps its clips; its old **Lab** page becomes Page 8 and autopilot may play it. Models, energy behaviour and limits: [docs](docs/README.md).

## Source

`control.mjs` remote and editing, `control-catalog.mjs` and `catalog-thumbs.mjs` its catalog · `stage.mjs` renderer host and show owner · `show.mjs`, `show-clock.mjs`, `autopilot.mjs`, `keymap.mjs`, `show-set.mjs`, `catalog.mjs` show logic · `beat-tracker.mjs`, `beat-worklet.mjs`, `stage-audio.mjs`, `energy-events.mjs` audio · `engine.mjs`, `compositor.mjs`, `scene-*.mjs` renderer and families · `docs/` reference, [decisions](docs/DECISIONS.md) and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
