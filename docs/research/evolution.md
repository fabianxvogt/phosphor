# Evolution and artificial-life directions

Date: 2026-09-07. Classification: `EXPLORATORY`. Research synthesis and implementation proposals; no performance experiment or novelty claim. `REPORTED` labels describe primary-source results, `EMPIRICAL` labels describe inspected project code, and `SPECULATIVE` labels describe proposed Phosphor work. Proof status: no new theorem; numerical and reproducibility checks below are acceptance requirements.

## Decision

Build a proper visual breeding workbench around richer genomes, then add a Physarum trail world. Prototype Lenia separately before promising an interactive population of organisms. Improve Acid Mycelium through spatial parameter painting and flow rather than adding another nearly identical reaction–diffusion scene. This ranking is a product judgment: it favors visible variety, meaningful interaction, saved discoveries, and bounded browser cost.

| Rank | Direction | Artistic payoff | Suggested first bounded experiment |
| --- | --- | --- | --- |
| 1 | Evolvable expression networks / CPPNs | Users breed their own animated organisms, masks, and textures; descendants have recognizable inherited structure | 6 children at 96×60 preview resolution, maximum 32 nodes and 64 edges; one selected 192×120 animation |
| 2 | Physarum-inspired agents | Dense branching veins, channels, and contracting networks; painting food and barriers changes the motion | 4,000 agents and a 160×100 trail field; three sensors per agent; fixed-step benchmark |
| 3 | Lenia | Coherent soft organisms that move, pulse, and collide through local rules | One channel, one documented organism, 128×128 world; measure direct convolution before choosing FFT or GPU |
| 4 | Gray–Scott field studio | Coral, mitosis, moving chemical surfaces, and sculptable transitions between pattern regimes | Reuse Acid field; add a feed/kill map and bounded advection independently, with baseline comparisons |
| 5 | SmoothLife | Continuous cellular life with a different birth/survival control vocabulary | Small circular neighborhoods and one published rule; compare artistic diversity with Lenia before shipping both |

Budgets are `SPECULATIVE` starting points, not measured speed claims. Preserve the existing low-quality output option, offline frame plan, and local export contract.

## What Evolution Garden currently does

`EMPIRICAL`: [app.js](../../app.js) already implements seeded mutation, human selection, parent/child records, names, favorites, undo, and promotion to a set. That is a limited form of interactive evolutionary search. It would be inaccurate to say there is no selection or evolution.

Its expressive limit is the representation: [evolutionContour](../../core.mjs) draws a bounded harmonic outline. Mutation operates on four small parameters, including display focus and a generation value; the contour cannot discover an arbitrary new grammar or network. There is no ecological reproduction or autonomous fitness evaluation. The word “generation” also serves both history and appearance, which makes causality confusing.

Inspected edge cases to regression-test: repeated mutation appends offspring while the visible/selection path addresses the first five child IDs; runtime child accumulation can exceed the stricter frame-plan child limit; near the node cap a partial batch is still announced as five children. These observations describe source inspection on this date and should be checked against subsequent fixes.

## 1. Breeding a generative representation

`REPORTED`: CPPNs compose functions with different regularities to map spatial coordinates into an image. They are indirect encodings: each output location can be evaluated independently. Stanley demonstrated recognizable structure through interactive evolution. Picbreeder extends this into branching, human-selected image lineages. Sources: [Stanley, 2007](https://gwern.net/doc/ai/nn/fully-connected/2007-stanley.pdf), [Picbreeder project](https://picbreeder.net/), [Secretan et al., 2011](https://www.campbellssite.com/papers/secretan_ecj11.pdf). Sims also studied human selection of procedurally encoded dynamical systems: [Interactive Evolution of Dynamical Systems](https://www.karlsims.com/papers/DynamicalSystemsECAL92.pdf).

`SPECULATIVE` implementation: start with an acyclic, bounded expression network containing sine, Gaussian, tanh, absolute value, addition, and multiplication. Inputs are normalized coordinates, radius, and sine/cosine of loop phase; outputs are two scalar fields. Rendering maps these fields through the user's palette. Avoid arbitrary code evaluation. Call this a bounded CPPN-inspired genome unless the implemented representation and operators justify the stronger name; it is not NEAT simply because it uses a network.

Separate three concepts: **genome** (heritable nodes, connections, weights), **search settings** (mutation strength, locked modules), and **performance settings** (palette, tempo, brightness). Generation belongs to lineage metadata. Color should be independently lockable so choosing a morphology does not force new colors. Use periodic phase inputs for seamless mathematical loops; screen pixel equality still needs a capture test.

The complete workflow: pick an authored seed → generate a contact sheet → compare children under identical phase/palette → select a parent → mutate again → branch or return to an ancestor → name/favorite → promote to a cue → export/reopen the genome and lineage. Keep the parent visible and unchanged. Offer “small variation” and “structural mutation” rather than an unexplained single intensity slider. Show mutation summaries such as “one weight changed” or “symmetry node added.” Automatic searches should remain optional and bounded; they should not replace the user's taste with a hidden fitness score.

Acceptance invariants: locked genes are bit-identical; seed + parent + operator version yields identical child genomes; topology is acyclic; node/edge and evaluation costs are capped; values remain finite; unchanged genomes produce the same fields; every displayed child ID is selectable; all parents/children resolve after import; cancel/undo restores the selected branch. Repeated mutation, full capacity, duplicate IDs, broken ancestry, oversized graphs, and unsupported versions require explicit tests. A successful export must reconstruct the selected phenotype, not merely its descriptive sliders.

Small falsifiable experiment: compare existing contours with the richer representation at the same thumbnail budget. Ask three viewers to select and evolve a recognizable motif through five generations. Measure whether the selection loop stays responsive and whether descendants preserve something users intended to retain. Reject the new representation if diversity comes mainly from destructive noise or expensive rendering.

## 2. Physarum trail networks

`REPORTED`: Jones models agents that sense and deposit a shared chemical trail. Local chemotaxis and trail dynamics generate emergent transport networks; the work studies network formation and responses to external cues. This is a synthetic approximation of selected behaviors, not a complete organism simulator. [Jones, author manuscript](https://arxiv.org/abs/1503.06579).

`SPECULATIVE`: a “living circuit” scene could expose sensor distance/angle, turn angle, deposition, diffusion, decay, and attractant painting. Keep only three controls prominent: branching scale, cohesion, and trail memory; put physical parameters in an advanced panel. Contrast against Magnetic Choir: motion follows a collectively modified trail field rather than orbiting a few fixed attractors. Start with one species. Multi-species attraction/repulsion is a later extension that needs separate behavior evidence.

Guarantees to test: bounded agent count and field allocation, explicit periodic or reflecting boundaries, simultaneous field updates, defined tie-breaking, fixed integration step, finite nonnegative trail values, deterministic RNG consumption, and documented collision semantics. Audio can gently modulate trail rendering or attractant injection; avoid changing diffusion/time step directly on every kick. Performance evidence should include a long high-trail run, not just the empty initial field.

## 3. Lenia and SmoothLife

`REPORTED`: Lenia combines a normalized neighborhood convolution, a growth map, and clipped continuous-valued state updates. Chan reports diverse localized moving patterns and interactive parameter exploration. Its organism-like motion is an observed property of specific rules and seeds, not something every random rule produces. [Lenia paper](https://arxiv.org/html/1812.05433v3). SmoothLife smooths cellular states and neighborhood-dependent birth/survival transitions using inner/outer circular neighborhoods. [Rafler, 2011](https://arxiv.org/abs/1111.1567).

`SPECULATIVE`: Lenia is the more distinctive next aquarium because coherent motion emerges from the field. Begin with a small curated organism shelf and a visible “return to last living state.” Kernel radius, growth center/width, and time step affect viability strongly; expose bounded neighborhoods around working presets. A sandbox can allow extinction, but it must explain empty outcomes. Do not describe this as open-ended Darwinian evolution without an implemented inheritance and selection process.

Numerical checks: kernel sum is one within tolerance; zero field behaves as specified; values remain in [0,1]; wrap boundaries and convolution orientation are tested; known seeds survive their reference horizon. Clipping proves bounded values, not correct dynamics. Check smaller time steps and finer grids; any FFT implementation must match direct convolution on small test cases. Record rule, discretization, initial field, seed, and implementation version for reopening. Audio should affect color and presentation first: continuous arbitrary rule modulation can kill the very organisms the user wants to see.

## 4. Make reaction–diffusion more controllable

`REPORTED`: Sims' Gray–Scott tutorial describes spatial feed/kill maps, orientation, flow, and a parameter-map interface as extensions to two-species chemical fields. [Author tutorial](https://www.karlsims.com/rd.html).

`SPECULATIVE`: offer a navigable pattern atlas rather than six disconnected parameter sliders. A paintable map can place coral and dividing spots in different canvas regions. Follow with directional diffusion, then flow. Test each extension alone against the existing implementation; adding all three together obscures bugs. Field evolution and color mapping must be independent, so recoloring a paused field never resets its history.

## Research limits and next decision

No proposal here is a claim of novel science. Primary papers establish algorithmic foundations; local quality, performance, numerical fidelity, and desirability remain unmeasured. The strongest next test is a bounded richer-genome contact sheet with preserved ancestry, alongside a tiny Physarum prototype. Promote only after the saved-discovery workflow and frame-budget measurements work. A visually empty or unstable prototype is useful negative evidence, not a released scene.
