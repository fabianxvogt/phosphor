# Visual style for worlds and reworked looks

Owner direction 2026-10-14: Phosphor should look more impressive, more three-dimensional and consistent across the catalog. These rules extend the club rules in [AUTHORING.md](../families/AUTHORING.md). They are review criteria, not decoration; the signature detail of the algorithm still comes first.

## Depth

Every world reads as a space, not a flat illustration. Use at least three of:

- **Perspective with parallax:** a moving camera, so near and far parts move at different speeds.
- **Atmosphere:** distance fades toward the palette's dark (fog, depth falloff); far detail is softer and dimmer.
- **Light:** a soft key light plus a rim/fresnel edge in `u_accent` or a lighter `u_secondary`; surfaces carry gradients, never flat fills.
- **Occlusion:** ambient occlusion, contact darkening or self-shadowing where forms meet.
- **Scale cues:** many small elements against few large ones; detail density increases toward the focus.

Flat clip-art (uniform fills, outlined shapes on black, no shading) fails review.

## Camera

- Continuous and never cut. Base motion is a slow orbit, dolly, crane or flight; phrase-scale changes of direction land on 8 or 16 bars.
- Energy may raise camera speed up to about 2×; the kick may punch field of view or dolly by at most 2–3%. No handheld shake, no jitter.
- Horizon stable unless the world is about weightlessness; roll stays under about 10° and changes slowly.
- The camera path is endless (closed or self-similar loops) and never enters geometry.

## Light and colour

- Colour comes only from the palette (`palette(t)`, `u_primary`, `u_secondary`, `u_accent`, mixed with black or white), so every library palette works.
- Dark ground and high contrast: at energy 0.1 most of the frame is near black; the brightest values belong to the signature detail.
- Accent is rare (roughly ≤ 10% of lit pixels) and marks what matters: cores, edges, events.
- Emissive highlights may exceed 1.0 on the float path to feed bloom. Never full-screen white; flashes stay behind the shared limiter.

## Development arc

- The states tell one story: **sparse → structured → full form**. State 0 plays in a breakdown; the top state carries a peak.
- Each integer state is a strong composition on its own. In-between values are real geometry, not dissolves.
- Identity persists: the same centres, bodies or paths carry through every state, so the audience sees one thing transform.

## Motion and rhythm

- Energy changes structure, density, detail and motion, not brightness.
- Nothing crosses more than about a quarter of the short screen side per second at energy 0.9, except particles.
- Three family gestures on the signature detail (periods 4/8/16 beats); the kick envelope is bounded and never strobes.

## Line, edge and resolution

- Line widths and edge softness scale with output resolution (minimum about 1.5 px at 1080p), antialiased, without shimmer at 4K.
- No hard content edges at the frame border; composition fills roughly 60–85% of the short side and works in any aspect.

## Names

- World names: a two-word evocative noun phrase ("Unfolding Garden"). State names: one word each ("Filaments", "Membrane", "Blossom"). Look names follow the catalog's quiet, slightly atmospheric tone; provide German and English.
