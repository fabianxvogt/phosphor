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

## Prepare and play

1. **Fill the grid.** The main preview animates the selected visual immediately, without opening the stage. All performance controls work locally: master, energy, hue, zoom, mirror, family faders, speed, autopilot, Random, blackout, safe look, freeze, flash and tempo. Click a slot, pick a family and look, tune it in the editor, set its energy, fade, when it starts (next beat, next bar, immediately) and whether autopilot may play it, then **Save to slot**. **Variations** breeds six nearby looks to pick from. Use pages as moods for the night — warm-up, peak, closing.
   **Hear the demo:** the control window starts the 120 BPM demo after your first click or key press; no stage is needed. **Off** keeps it silent until you choose **Demo beat** again; **Mute file/demo** mutes the local demo. Opening the stage stops the local demo so only the stage owns audio. Closing the stage resumes the local demo if it was still selected.
2. **Open stage.** It opens on the second screen when Chrome may place windows; otherwise drag it to the projector. It takes over your local playing look and performance controls, including unsaved live tweaks. The main preview switches to live output; the editor stays available. Click once on the stage to enable its audio and go fullscreen. Closing the stage resumes local performance from its last reported state.
3. **Audio.** **Use input** for the line feed from the DJ mixer (booth or record out into a USB interface) — analysed only, never played. **Rehearse with file** or **Demo beat** at home. The stage remembers the source across reloads; mute the demo or switch to the line input before doors.
4. **Pre-show check** — tick the list, show the **framing pattern** on the venue screen, and **export the set**.

## Performance and settings lock

Grid clicks and keys trigger clips on the stage whenever it is connected. Clip, set, audio and MIDI configuration stays editable with or without a stage. **Lock settings** in the top bar is optional, available only while a stage is connected and off by default. It disables configuration without hiding it; the grid, performance controls, **Play selected clip**, set export and pre-show checklist remain usable. Unlock it whenever you need to edit. Closing the stage automatically unlocks settings.

Autopilot plays the clips on the current page, changes every 32 bars on a bar line and reacts to breakdowns, builds and drops. Its changes always crossfade (at least two bars; drops one bar). With **Random** on (default) it picks a random clip and lets the playing clip's parameters glide slowly around their saved values; off, it walks the page in slot order and leaves parameters alone. Anything you trigger takes over; control returns after 32 bars without input. Switching pages steers the night.

| Keys | |
| --- | --- |
| `1`–`8`, `Q`–`I`, `A`–`K`, `Z/Y`–`,` | the 32 grid slots, by key position (QWERTZ works) |
| `Shift` + `1`–`8` | page |
| `Esc` / `Shift`+`Esc` | blackout / safe look — work even with a slider focused |
| `Space` / `Enter` | tap tempo / this is beat 1 of the bar |
| `←` `→` | nudge the beat (adjusts latency while following audio) |
| `↑` `↓` | energy |
| `9` / `0` | half / double speed (again for normal) |
| `P` / `O` / hold `L` | autopilot / freeze / flash (through the limiter) |

Keys work in the control window and on the stage. Tempo follows the audio when locked (green light), holds through breakdowns (amber) or follows your taps (blue); **Follow audio** switches back from taps.

**If something crashes:** the stage keeps playing when the control window reloads. If the stage itself is lost, click **Open stage** and once on the stage: it comes back with the same clip, energy and shared controls. After a rig rehearsal, **Export rehearsal log** saves per-minute frame timing, errors and memory.

## Families

Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden · Pulse Geometry · Light Beams · Julia Observatory · Fractal Flight · Fourth Dimension · Hyperbolic Loom · Particle Swarm. A new set holds every family on page 1. Models, energy behaviour and limits: [docs](docs/README.md).

## Source

`control.mjs` remote and editing · `stage.mjs` renderer host and show owner · `show.mjs`, `show-clock.mjs`, `autopilot.mjs`, `keymap.mjs`, `show-set.mjs` show logic · `beat-tracker.mjs`, `beat-worklet.mjs`, `stage-audio.mjs`, `energy-events.mjs` audio · `engine.mjs`, `compositor.mjs`, `scene-*.mjs` renderer and families · `docs/` reference, [decisions](docs/DECISIONS.md) and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
