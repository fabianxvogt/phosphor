# Phosphor

A browser VJ instrument for other people's DJ sets: GPU-simulated generative families on a 4×8 keyboard clip grid, an autopilot that follows the music, beat tracking from the booth feed, and a stage window that keeps playing if the controls crash. Everything runs locally in Chrome.

**State:** being rebuilt for live VJ work; first show planned for December 2026. See the [roadmap](ROADMAP.md) and [decisions](docs/DECISIONS.md). Reference rig: MacBook Pro M3 Pro, Chrome, HDMI to the venue screen. The [public demo](https://phosphor-performance.vercel.app/) still runs the previous instrument and is not updated.

## Run

```sh
npm test && npm run build && npm run check:dist
npm run preview   # http://localhost:48101 (built, offline-capable)
```

Microphone, MIDI, the offline cache and screen placement need HTTPS or localhost.

## Prepare (Prep mode)

1. **Fill the grid.** Click a slot, pick a family and look, tune it in the editor (its preview runs beside you), set its energy, fade, when it starts (next beat, next bar, immediately) and whether autopilot may play it, then **Save to slot**. **Variations** breeds six nearby looks to pick from. Use pages as moods for the night — warm-up, peak, closing.
2. **Open stage.** It opens on the second screen when Chrome may place windows; otherwise drag it to the projector. **Click once on the stage**: that starts audio analysis and goes fullscreen.
3. **Audio.** **Use input** for the line feed from the DJ mixer (booth or record out into a USB interface) — analysed only, never played. **Rehearse with file** or **Demo beat** at home.
4. **Pre-show check** — tick the list, show the **framing pattern** on the venue screen, and **export the set**.

## Play (Show mode)

Autopilot plays the clips on the current page, changes every 32 bars on a bar line and reacts to breakdowns, builds and drops. Anything you trigger takes over; control returns after 32 bars without input. Switching pages steers the night.

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

Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden. Models, energy behaviour and limits: [docs](docs/README.md).

## Source

`control.mjs` remote and editing · `stage.mjs` renderer host and show owner · `show.mjs`, `show-clock.mjs`, `autopilot.mjs`, `keymap.mjs`, `show-set.mjs` show logic · `beat-tracker.mjs`, `beat-worklet.mjs`, `stage-audio.mjs`, `energy-events.mjs` audio · `engine.mjs`, `compositor.mjs`, `scene-*.mjs` renderer and families · `docs/` reference, [decisions](docs/DECISIONS.md) and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
