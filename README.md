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

**State:** production candidate for live VJ work; first show planned for December 2026. The [public demo](https://phosphor-performance.vercel.app/) automatically publishes verified pushes to `main` (connected 2026-10-10). See the [roadmap](ROADMAP.md), [decisions](docs/DECISIONS.md) and [release evidence](docs/EVIDENCE.md). External-display endurance and real DJ-mix acceptance remain open. Reference rig: MacBook Pro M3 Pro, Chrome, HDMI to the venue screen.

## Run

```sh
npm test && npm run build && npm run check:dist
npm run preview   # http://localhost:48101 (built, offline-capable)
```

For a headless control/stage smoke on a local machine with Chrome installed, run `npm run test:browser -- --only show --native-gpu` after building. Use `npm run test:stage-output -- --native-gpu` for popup, Retina-resolution and preview/audio handoff checks, and `npm run test:output-controls -- --native-gpu` for shared BPM and selectable-resolution controls. The default browser runners use software rendering; neither path applies rig timing gates.

Microphone, MIDI, the offline cache and screen placement need HTTPS or localhost.
If an older offline release still shows **Enter Show mode** or **Prep: click a slot to edit it**, save your clip edits and open [Update Phosphor](https://phosphor-performance.vercel.app/update.html) in that same tab. Close the stage and any other Phosphor tabs/windows, keeping the updater open; click **Update and open Phosphor**. Saved sets are retained.

## Languages

Phosphor follows the browser’s ordered language preferences: German and English,
including regional variants such as `de-AT` and `en-GB`. If neither is supported,
it uses English. Reload after changing the browser’s language preferences.
Controls, catalog names and descriptions, rhythm gestures, accessibility labels,
Stage and the updater share dictionaries in [`i18n/`](i18n/). Your own look and set
names stay as written; saved IDs, ratings, MIDI mappings and exports stay compatible.
Catalog search accepts both translated and original names. Interface copy stays
direct and informal; look and palette names carry the quieter, mystical tone.

Run `npm run test:i18n -- --native-gpu` after building to check both languages in
Chrome, including narrow layouts, custom names and error messages. The dictionaries
are bundled into the same offline release as the app.

## Appearance and navigation

Use the sun/moon button to switch between light and dark themes. Phosphor starts in dark mode and remembers your choice in this browser. A single sculpted biomechanical frame connects Preview and Catalog on the left with Look, Performance and Rhythm on the right. Narrow screens use a matching one-column frame with all five panels stacked. Inset controls keep clear of the organic edges; Forum lettering gives the logo and headings a quieter, mystical character. **Rate & edit** on each card reveals its rating and editing controls. Audio, MIDI, Set and Pre-show open a keyboard-accessible setup dialog; Escape closes it. Click the set name to rename it, or the **•••** menus for additional look and performance controls. The rhythm grid is directly editable: click a cell to cycle off/on/accent, or Shift-click for an accent. Bar arrows reach longer loops without expanding the panel. Click a track name for its small timing/strength menu; **•••** opens pattern presets and draft/own-look options. Edits stay protected until you switch back to **Auto**. Enter activates focused buttons, arrow keys adjust focused sliders, and Shift+Space still plays Next. Space pauses/resumes playback, including when a button or slider is focused; text fields keep normal typing.

Drag the dotted seams to resize the panels in either layout; the middle seam also changes column widths. Each layout remembers its own split in this browser. Double-click a seam to reset it, or use **Reset layout** for the current arrangement. Focused seams accept arrow keys (Shift for larger steps), Home/End and Escape to cancel a drag. The complete frame fits the window; long contents scroll inside their panels. On wide screens, catalog filters sit together in the bottom rail; in one column they stay inside Catalog.

## Prepare and play

1. **Rate and favourite.** The main preview animates the selected visual immediately, without opening the stage; it defaults to the current monitor’s native resolution, including Retina pixels, within the graphics device’s limits. Click the resolution readout to choose a lower size for both preview and Stage, or return to **Native**. The choice is saved with the set; old low-resolution preferences are ignored. All performance controls work locally: master, energy, hue, zoom, mirror, family faders, speed, autopilot, Random, Next, blackout, safe look, freeze, flash and tempo. The **Catalog** is the whole library: every look of every family plus your own looks, with thumbnails. Search it, filter by family or by favourites/rated/unrated/own, mark favourites with **♥** (listed first) and rate looks 0–10 stars (half stars; click the current rating to clear it; **0** means never). Looks with the same rating, including every unrated look, follow an editorial order starting with organic networks, cells, caustics, toroidal particles and flowing patterns (D69). Autopilot and **Next** keep the Look name, family, parameters and catalog selection aligned with the playing visual. Click a thumbnail or **▶ Play** to play a look. The first 32 cards of the current view are on the keyboard. **Edit** opens a look in the look editor: tune parameters, seed and transition, try **Variations** (six bred neighbours), then **Save look**. Authored looks never change; own looks can be saved again or deleted.
   **Hear the demo:** the control window starts the demo after your first click or key press; no stage is needed. It follows the same tempo and beat phase as the visual (120 BPM initially). Click the **BPM** display in the preview for a compact tempo input, ± buttons and Tap; the Audio settings input controls the same clock. **Off** keeps it silent until you choose **Demo beat** again; **Mute file/demo** mutes the local demo. Opening the stage stops the local demo so only the stage owns audio. Closing the stage resumes the local demo if it was still selected.
2. **Open stage.** It opens on the second screen when Chrome may place windows; otherwise drag it to the projector. It defaults to the screen's native physical resolution (including Retina pixels), constrained by GPU dimensions. The resolution selector can reduce that size while preserving aspect ratio; visual shading uses the selected output size, and slow frames never reduce it automatically. It takes over your local playing look and performance controls, including unsaved live tweaks. The main preview switches to live output; the editor stays available. Click once on the stage to enable its audio and go fullscreen. Missed status reports during a slow frame do not redirect performer controls to the local preview: the open stage keeps ownership, including after a control reload. Closing the stage resumes local performance from its last reported state.
3. **Audio.** **Use input** for the line feed from the DJ mixer (booth or record out into a USB interface) — analysed only, never played. Automatic beat tracking did not meet its targets on real DJ mixes, so choosing the line input switches to tap tempo at the current BPM: click **Tap** in the BPM popover, mark the downbeat with Enter; **Follow audio** turns tracking back on. **Rehearse with file** or **Demo beat** at home. The stage remembers the source across reloads; mute the demo or switch to the line input before doors.
4. **Pre-show check** — tick the list, show the **framing pattern** on the venue screen, and **export the set**.

**Pause / resume:** press **Space**, or the preview’s **Pause/Play** button. The visual, rhythm clock and app audio hold their current position, including a fractional beat; another press continues there. Blackout remains available while paused. Demo notes and a rehearsal file retain their position. This does not control an external DJ player feeding the line input.

## Rhythm patterns

The **Rhythm** panel follows the playing look. Its upper section contains that family's gestures; the lower section contains the same four global effects everywhere: brightness, zoom, echo and colour. Each track has its own loop length, quarter/eighth/sixteenth grid, step accents, strength, duration and mute. A three-beat loop keeps running across four-beat bars. **Speed** changes visual motion while the patterns stay on the music clock.

**Live** shows every track against one shared bar and a vertically aligned playhead. Loop-length labels explain how often each gesture repeats. The bar number wraps within the longest track’s displayed cycle, while shorter loops retain their phase across it. The arrows and step edits pin an **Edit bar**; choose Live to follow playback again.

Useful authored patterns play immediately. Editing protects a pattern until **Automatic** is chosen again; automatic phrases vary at 8/16/32-bar boundaries. Steps take effect at the next subdivision, whole patterns and loop changes at the next downbeat, strength and mute immediately. Energy changes intensity without rewriting your steps. An effect unavailable for a variant stays saved and visibly inactive.

Family and global patterns travel with the exported set. Save a separate override explicitly for an own look, or inherit its family again. **Preview draft rhythm** lets you work on an editor draft; the normal grid always controls what is playing, including the incoming look during a fade. Opening or closing the stage preserves the active rhythm and clock phase.

## Performance and settings lock

Catalog clicks and keys play looks on the stage whenever it is connected. Look, set, audio and MIDI configuration stays editable with or without a stage. **Lock settings** in the top bar is optional, available only while a stage is connected and off by default. It disables configuration without hiding it (saving or deleting own looks, set fields, audio, MIDI); the keys, performance controls, **Play draft**, **Variations**, catalog search, favourites, ratings and **Play**, set export and pre-show checklist remain usable. Unlock it whenever you need to edit. Closing the stage automatically unlocks settings.

Autopilot plays from the whole **catalog** and reacts to breakdowns, builds and drops. It picks looks by rating (unrated counts as 5, 0 never plays) and avoids recent ones; **♥ only** limits it to favourites and the rating select to looks rated at least that much (it falls back to every playable look rather than stand still). With **Random** on (default) each look plays a random 8, 12 or 16 bars and its parameters glide slowly around their saved values; off, it changes every 8–64 bars (**In order every**), best first, and leaves parameters alone. **Next** (Shift+Space) plays the next pick on the next beat without waiting for the bars, even with autopilot off, and does not take over. Energy belongs to the show, not the look: a trigger keeps the current energy, so builds and drops carry across changes. Its changes are always smooth: three bars, drops one bar. Anything you trigger takes over; control returns after 32 bars without input.

**Transitions:** the select beside **Fade** offers **Auto**, eased **Crossfade**, soft-edged animated **Noise dissolve**, **Feedback melt** and **Cut**. Melt warps the outgoing picture through zoom, rotation and displacement while the incoming picture fades in. Manual Auto is Crossfade; Cut always waits for the downbeat and ignores Fade. Autopilot Auto mixes Crossfade (60 %), Dissolve and Melt (20 % each) in Random mode, uses Crossfade in order, Melt or Dissolve in breakdowns, and one-bar Melt on drops. Crossfades and dissolves ease with smootherstep. An authored smooth choice is respected; an authored Cut becomes Crossfade under autopilot, never a hard cut. Older v4 clips default to Auto, and all choices survive export/import.

**Colour:** click any of the three **Palette** pebbles to edit the shared show palette. The 2D colour field controls saturation horizontally and brightness vertically; the hue strip covers the full colour spectrum. Hex and numeric inputs offer precise control, and arrow keys on the field work in 1% increments (Shift: 10%). **Palette presets** offers 25 starting palettes, including the mint/amber/teal **Symbiosis** default. Live output, editor, catalog thumbnails, variations and rhythm use these same colours. Changing looks or running Autopilot keeps the chosen palette. It is saved and exported with the set; older look-specific colours remain in their saved data. Catalog thumbnails recolour immediately without restarting simulations. All 328 authored previews are bundled as 512×288 images; your own looks and variations render once and then reuse their images.

For owner curation, `npm run contact -- --sheet palettes` writes every library palette across the six gated families' first types at energy 0.5 to `artifacts/contact/palettes/index.html`, with PNGs and dim/faulty-render findings.

| Keys                                 |                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `1`–`8`, `Q`–`I`, `A`–`K`, `Z/Y`–`,` | the first 32 cards of the catalog view, by key position (QWERTZ works)                                                                   |
| `Esc` / `Shift`+`Esc`                | no performance action; use the Blackout and Safe look buttons |
| `Space`                              | pause / resume visual and app audio at the current position |
| `Enter`                              | mark beat 1 of the bar (outside focused controls) |
| `Shift` + `Space`                    | Next: autopilot's next pick on the next beat                                                                                             |
| `←` `→`                              | nudge the beat (adjusts latency while following audio)                                                                                   |
| `↑` `↓`                              | energy                                                                                                                                   |
| `9` / `0`                            | half / double speed (again for normal)                                                                                                   |
| `P` / `O` / hold `L`                 | autopilot / freeze / flash (through the limiter)                                                                                         |

Keys work in the control window and on the stage. Tempo follows the audio when locked (green light), holds through breakdowns (amber) or follows your taps (blue); **Follow audio** switches back from taps.

**If something crashes:** the stage keeps playing when the control window reloads. If the stage itself is lost, click **Open stage** and once on the stage: it comes back with the same clip, energy and shared controls. The Stage start gate uses the same visual style and starts immediately even if optional fullscreen, keyboard-lock or wake-lock requests remain pending. If the stage leaves fullscreen, it keeps playing without showing anything on the venue screen; the control window says **Stage not fullscreen** and one click on the stage returns. After a rig rehearsal, **Export rehearsal log** saves per-minute frame timing, errors and memory.

## Families

38 catalog families, 39 renderers, 328 looks. Acid Mycelium and Evolution Garden share the Reaction–Diffusion family. New families: **Physarum Networks**, **Geometric Caustics** and **Space Colonization**. Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden · Pulse Geometry · Light Beams · Julia Observatory · Fractal Flight · Fourth Dimension · Hyperbolic Loom · Particle Swarm, and the algorithm families added 2026-10-09/10, each built around one recognisable mathematical idea: Game of Life · Strange Attractors · Mandelbrot Dive · Abelian Sandpile · Newton Basins · Fractal Flames · Aperiodic Tilings · Voronoi Cells · Ripple Tank · Langton's Ant · Indra's Pearls · Harmonograph · Wallpaper Groups · Truchet Tiles · Space-filling Curves · Phyllotaxis · Hopf Fibration · Chladni Figures · Domain Colouring ([catalog](docs/CATALOG.md), one page per family in [docs/families](docs/families/)). Every family's looks are in the catalog. A set from before the catalog keeps its edited clips as own looks; its pages are gone (D68). Models, energy behaviour and limits: [docs](docs/README.md).

## Source

`control.mjs` remote and editing, `control-catalog.mjs` and `catalog-thumbs.mjs` its catalog · `control-rhythm.mjs`, `rhythm.mjs`, `engine-rhythm.mjs` pattern editing and playback · `stage.mjs` renderer host and show owner · `show.mjs`, `show-clock.mjs`, `autopilot.mjs`, `keymap.mjs`, `show-set.mjs`, `catalog.mjs` show logic · `beat-tracker.mjs`, `beat-worklet.mjs`, `stage-audio.mjs`, `energy-events.mjs` audio · `engine.mjs`, `compositor.mjs`, `scene-*.mjs` renderer and families · `docs/` reference, [decisions](docs/DECISIONS.md) and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
