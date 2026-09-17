import { createEffectStack, effectDefaults, validateEffects } from './effects.mjs';
import * as advancedModule from './advanced.mjs';
import { audioBandLevels, DARK_TECHNO_PATTERN, darkTechnoStep, drivenRegimeFieldStep, drivenRegimeTarget, aquariumFoodStep, boundedFeedbackValue, cathedralShading, clamp, countPolylineIntersections, coupledRegimeFieldStep, evolutionContour, finiteArray, fractalRenderSize, filteredInterference, interferenceField, lifecycleStressCheck, PHOSPHOR_FAMILY_CATALOG, qualityProfile, rayMarchCorridor, reactionDiffusionStep, resolutionAwareInterferenceFilter, seededRandom, stepElementary, topologyClosureError, topologyLoopPoint } from './core.mjs';
import { FRACTAL_WORLD, defaultFlightPose, validateFlightPose, turnFlight, advanceFlight, worldDistance } from './fractal-navigation.mjs';
import { createMandelboxFlythroughRenderer } from './mandelbox-flythrough.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const { advancedDefaults, advancedScenes, drawAdvanced } = advancedModule;
const fallbackJuliaRenderState = (buffer) => {
  const path = ['webgl', 'cpu'].includes(buffer?.__juliaRenderPath) ? buffer.__juliaRenderPath : 'warming-up';
  const width = Number.isInteger(buffer?.__juliaRenderWidth) ? buffer.__juliaRenderWidth : null;
  const height = Number.isInteger(buffer?.__juliaRenderHeight) ? buffer.__juliaRenderHeight : null;
  const reason = typeof buffer?.__juliaRenderReason === 'string' && buffer.__juliaRenderReason.length <= 120 ? buffer.__juliaRenderReason : null;
  return { path, width, height, reason };
};
const juliaRenderState = typeof advancedModule.juliaRenderState === 'function' ? advancedModule.juliaRenderState : fallbackJuliaRenderState;
const effectStack = createEffectStack(() => document.createElement('canvas'));
let effects = { ...effectDefaults };
const sceneList = $('sceneList');
const controls = $('sceneControls');
const cueList = $('cueList');
const toast = $('toast');
const phaseArcs = [
  { id: 'dawn-assembly', name: 'Dawn Assembly', curve: 'ramp / crystallize / release', bars: 12, seed: 401, points: [{ phase: 'build', control: .34, regime: 1, disturbance: .12, release: .7 }, { phase: 'transition', control: .66, regime: 3, disturbance: .48, release: .3 }, { phase: 'release', control: .4, regime: 0, disturbance: .08, release: .9 }] },
  { id: 'glass-front', name: 'Glass Front', curve: 'hold / threshold / dissolve', bars: 16, seed: 402, points: [{ phase: 'build', control: .42, regime: 2, disturbance: .2, release: .62 }, { phase: 'transition', control: .78, regime: 5, disturbance: .7, release: .18 }, { phase: 'release', control: .28, regime: 1, disturbance: .1, release: .96 }] },
  { id: 'night-return', name: 'Night Return', curve: 'pulse / wave / quiet', bars: 20, seed: 403, points: [{ phase: 'build', control: .38, regime: 0, disturbance: .28, release: .76 }, { phase: 'transition', control: .72, regime: 4, disturbance: .62, release: .24 }, { phase: 'release', control: .32, regime: 2, disturbance: .06, release: .98 }] },
];
const legacyPhaseModel = { id: 'coupled-regime-field-v1', name: 'Coupled Regime Field', equation: 'bounded neighbor relaxation + threshold drive + release damping' };
const phaseModel = { id: 'driven-regime-field-v2', name: 'Driven Regime Field', equation: 'convex neighbor diffusion + spatial threshold forcing + target relaxation' };
const phaseMeasurementFormat = 'phosphor-phase-measurement-v1';
const frameManifestFormat = 'phosphor-frame-sequence-v2';
const legacyFrameManifestFormat = 'phosphor-frame-sequence-v1';
const frameClockId = 'pre-step-elapsed-v1';
const frameOutputMetadataFormat = 'phosphor-frame-output-v1';
const maxFrameCount = 240;

const sceneDefs = [
  { id: 'acid', number: '47', name: 'Acid Mycelium', tagline: 'Fluorescent reaction–diffusion structures that feel grown.', description: 'Slow branching veins with a luminous center.', mechanism: 'Gray–Scott reaction diffusion', kind: 'reaction', presets: [
    ['Mycelial City', 'dense branching streets', 18], ['Vein Cathedral', 'arched membranes', 41], ['Lime Bloom', 'soft radial growth', 73], ['Night Orchard', 'quiet clustered spores', 101], ['Tidal Membrane', 'wide liquid folds', 149], ['Signal Understory', 'fine electric filaments', 211],
  ], schema: [['growth', 'Growth', 0, 1, .01], ['injection', 'Injection', 0, 1, .01], ['diffusion', 'Diffusion', .2, 1.4, .01], ['contrast', 'Contrast', .5, 2, .01], ['drift', 'Drift', 0, 1, .01]] },
  { id: 'tapestry', number: '51', name: 'Causal Tapestry', tagline: 'Cellular histories become woven curtains.', description: 'A reversible scroll through a living history buffer.', mechanism: 'Elementary cellular automaton', kind: 'automaton', presets: [
    ['Nested Orchard', 'rule 90 · nested', 90, { rule: 90, scroll: .42, weave: .55, reversal: 0, phrase: 8 }], ['Periodic Loom', 'rule 54 · periodic', 54, { rule: 54, scroll: .3, weave: .72, reversal: 0, phrase: 6 }], ['Chaos Mantle', 'rule 30 · chaotic', 30, { rule: 30, scroll: .76, weave: .44, reversal: 0, phrase: 12 }], ['Quiet Weave', 'rule 184 · drifting', 184, { rule: 184, scroll: .22, weave: .3, reversal: 1, phrase: 10 }], ['Crown Pattern', 'rule 110 · complex', 110, { rule: 110, scroll: .58, weave: .86, reversal: 0, phrase: 16 }], ['Mirror Canal', 'rule 150 · braided', 150, { rule: 150, scroll: .47, weave: .64, reversal: 1, phrase: 8 }], ['Pulse Brocade', 'rule 22 · granular', 22, { rule: 22, scroll: .88, weave: .38, reversal: 0, phrase: 4 }], ['Night Relay', 'rule 126 · cellular', 126, { rule: 126, scroll: .34, weave: .52, reversal: 1, phrase: 14 }],
  ], schema: [['rule', 'Rule', 0, 255, 1], ['scroll', 'Scroll', 0, 1, .01], ['weave', 'Weave', 0, 1, .01], ['reversal', 'History playback', 0, 1, .01], ['phrase', 'Phrase length', 2, 16, 1]] },
  { id: 'feedback', number: '52', name: 'Feedback Chapel', tagline: 'Molten halos retain and dissolve traces of movement.', description: 'A mirrored tunnel that remembers the last gesture.', mechanism: 'Two-buffer feedback transform', kind: 'feedback', presets: [
    ['Molten Halo', 'soft circular persistence', 13, { decay: .94, transform: .012, symmetry: 3, injection: .62, tunnel: .48 }], ['Mirror Nave', 'four-fold architecture', 29, { decay: .9, transform: .02, symmetry: 4, injection: .54, tunnel: .68 }], ['Glass Tunnel', 'deep receding trace', 47, { decay: .86, transform: -.018, symmetry: 5, injection: .72, tunnel: .9 }], ['Afterimage Choir', 'layered gesture memory', 71, { decay: .96, transform: .008, symmetry: 6, injection: .48, tunnel: .58 }], ['Red Chapel', 'slow ember geometry', 113, { decay: .82, transform: -.032, symmetry: 2, injection: .8, tunnel: .72 }], ['Clean Recovery', 'bright opening / clear exit', 167, { decay: .74, transform: 0, symmetry: 1, injection: .22, tunnel: .2 }],
  ], schema: [['decay', 'Decay', .72, .99, .005], ['transform', 'Transform', -.06, .06, .001], ['symmetry', 'Symmetry', 1, 6, 1], ['injection', 'Impulse', 0, 1, .01], ['tunnel', 'Tunnel depth', 0, 1, .01]] },
  { id: 'magnetic', number: '48', name: 'Magnetic Choir', tagline: 'Luminous particle threads form breathing tori and split vortices.', description: 'Click the stage to place an attractor; pull liquid silk through three rehearsed flow compositions.', mechanism: 'Bounded attractor particle flow', kind: 'particles', presets: [
    ['Breathing Torus', 'dense circular choir', 17, { attractorX: .5, attractorY: .5, attractor: .8, trail: .8, density: .92, motion: .54, split: .18 }], ['Split Vortex', 'paired attractors', 31, { attractorX: .38, attractorY: .5, attractor: .84, trail: .84, density: .78, motion: .68, split: .82 }], ['Liquid Silk', 'long drifting filaments', 59, { attractorX: .62, attractorY: .42, attractor: .55, trail: .94, density: .48, motion: .3, split: .28 }], ['Orbit Choir', 'wide ring phrases', 83, { attractorX: .5, attractorY: .35, attractor: .9, trail: .88, density: .92, motion: .76, split: .4 }], ['Blue Undertow', 'low magnetic pull', 127, { attractorX: .72, attractorY: .58, attractor: .42, trail: .96, density: .36, motion: .22, split: .18 }], ['Choir of Knots', 'crossing silk loops', 181, { attractorX: .34, attractorY: .66, attractor: .76, trail: .8, density: 1, motion: .86, split: .68 }],
  ], schema: [['attractorX', 'Attractor X', 0, 1, .01], ['attractorY', 'Attractor Y', 0, 1, .01], ['attractor', 'Attractor', 0, 1, .01], ['trail', 'Trail decay', .72, .98, .005], ['density', 'Density', .2, 1, .01], ['motion', 'Motion', .1, 1, .01], ['split', 'Split', 0, 1, .01]] },
  { id: 'cathedrals', number: '49', name: 'Cathedrals of Error', tagline: 'Recursive crystal corridors for stained-glass immersion.', description: 'Choose one of four bounded corridor families and three camera journeys.', mechanism: 'Bounded recursive ray march', kind: 'geometry', presets: [
    ['Crystal Nave', 'square corridor / cool diffuse', 23, { family: 0, journey: 0, recursion: 4, scale: .82, color: .38, traversal: .44, stationary: 0, lighting: .82, material: .18, fog: .22, emission: .16 }], ['Error Bloom', 'diamond corridor / hot specular', 43, { family: 1, journey: 1, recursion: 5, scale: .72, color: .74, traversal: .66, stationary: 0, lighting: .5, material: .94, fog: .12, emission: .62 }], ['Quiet Vault', 'arch corridor / deep fog', 67, { family: 2, journey: 2, recursion: 3, scale: .9, color: .28, traversal: .12, stationary: 1, lighting: .28, material: .36, fog: .88, emission: .08 }], ['Prism Crossing', 'folded corridor / emissive edge', 97, { family: 3, journey: 2, recursion: 6, scale: .64, color: .82, traversal: .76, stationary: 0, lighting: .9, material: .58, fog: .2, emission: .78 }], ['Cathedral Zero', 'empty-space recovery / matte haze', 139, { family: 1, journey: 0, recursion: 2, scale: .58, color: .16, traversal: .22, stationary: 1, lighting: .34, material: .06, fog: .96, emission: .04 }], ['Glass Engine', 'high-depth crystal / charged sheen', 199, { family: 3, journey: 1, recursion: 6, scale: 1.04, color: .92, traversal: .9, stationary: 0, lighting: .68, material: .78, fog: .34, emission: .88 }],
  ], schema: [['family', 'Geometry family', 0, 3, 1], ['journey', 'Camera journey', 0, 2, 1], ['recursion', 'Recursion', 1, 6, 1], ['scale', 'Scale', .55, 1.2, .01], ['color', 'Color drift', 0, 1, .01], ['traversal', 'Traversal', 0, 1, .01], ['stationary', 'Stationary camera', 0, 1, .01], ['lighting', 'Surface light', 0, 1, .01], ['material', 'Material sheen', 0, 1, .01], ['fog', 'Depth fog', 0, 1, .01], ['emission', 'Edge emission', 0, 1, .01]] },
  { id: 'aquarium', number: '50', name: 'Alien Aquarium', tagline: 'Soft fluorescent organisms make a readable living habitat.', description: 'Feed a bounded habitat as it grows from solitary life to ecosystem and back.', mechanism: 'Seeded local food web', kind: 'aquarium', presets: [
    ['Lantern Nursery', 'small living food web', 37, { population: .3, feeding: .62, trails: .78, habitat: 0, bloom: .52, food: .82, extinction: .08 }], ['Tide Pool', 'small feeding habitat', 53, { population: .34, feeding: .7, trails: .86, habitat: 1, bloom: .42, food: .68, extinction: .18 }], ['Bloom Basin', 'busy fluorescent life', 79, { population: .92, feeding: .62, trails: .78, habitat: 2, bloom: .78, food: .76, extinction: .1 }], ['Glass Reef', 'layered trail currents', 107, { population: .72, feeding: .56, trails: .94, habitat: 1, bloom: .64, food: .6, extinction: .2 }], ['Night Plankton', 'quiet drifting population', 151, { population: .48, feeding: .32, trails: .96, habitat: 2, bloom: .36, food: .28, extinction: .3 }], ['Return to Stillness', 'clear recovery habitat', 223, { population: .18, feeding: .24, trails: .72, habitat: 0, bloom: .18, food: .16, extinction: .76 }],
  ], schema: [['population', 'Population', .1, 1, .01], ['feeding', 'Feeding', 0, 1, .01], ['trails', 'Trails', .5, .98, .005], ['habitat', 'Habitat', 0, 2, 1], ['bloom', 'Bloom', 0, 1, .01], ['food', 'Food', 0, 1, .01], ['extinction', 'Extinction', 0, 1, .01]] },
  { id: 'interference', number: '53', name: 'Interference Rituals', tagline: 'Ripples, moiré and quasiperiodic lattices align with phrases.', description: 'Three bounded fields phase in and out without unstable fine-pattern aliasing.', mechanism: 'Three-field analytic interference', kind: 'interference', presets: [
    ['Moiré Benediction', 'slow aligned ripples', 27, { fieldA: .92, fieldB: .18, fieldC: .08, frequency: .7, ratio: .62, phase: .12, orientation: .08, filter: .82, tempoLock: .9 }], ['Quasi Lattice', 'near-periodic lattice', 61, { fieldA: .58, fieldB: .84, fieldC: .34, frequency: 1.8, ratio: 1.18, phase: .42, orientation: .3, filter: .64, tempoLock: .72 }], ['Phase Choir', 'three field chorus', 89, { fieldA: .72, fieldB: .7, fieldC: .7, frequency: 1.2, ratio: .82, phase: .66, orientation: .48, filter: .58, tempoLock: .55 }], ['Tilted Water', 'oriented wave sheets', 131, { fieldA: .86, fieldB: .42, fieldC: .22, frequency: 1.05, ratio: 1.42, phase: .28, orientation: .82, filter: .76, tempoLock: .36 }], ['Ritual Fringe', 'dense filtered fringe', 173, { fieldA: .46, fieldB: .78, fieldC: .92, frequency: 3.2, ratio: 1.76, phase: .84, orientation: .64, filter: .92, tempoLock: .62 }], ['Afterimage Grid', 'soft reduced-motion lattice', 229, { fieldA: .66, fieldB: .3, fieldC: .14, frequency: .44, ratio: .5, phase: .08, orientation: .18, filter: .4, tempoLock: 1 }],
  ], schema: [['fieldA', 'Field A', 0, 1, .01], ['fieldB', 'Field B', 0, 1, .01], ['fieldC', 'Field C', 0, 1, .01], ['frequency', 'Frequency', .2, 4, .01], ['ratio', 'Ratio', .25, 2, .01], ['phase', 'Phase', 0, 1, .01], ['orientation', 'Orientation', 0, 1, .01], ['filter', 'Filter', .2, 1, .01], ['tempoLock', 'Tempo lock / audio', 0, 1, .01]] },
  { id: 'topology', number: '54', name: 'Topological Melt', tagline: 'Braided ribbons transform as continuous sculptural loops.', description: 'Three colored strands form a closed loop. Change Twist to reshape it, View angle to turn it, and Thickness to change its weight.', mechanism: 'Closed parametric loop families', kind: 'topology', presets: [
    ['Braided Loop', 'braid family / keyframe one', 19, { family: 0, loop: .62, thickness: .48, twist: .58, camera: .42, material: .4, keyframe: .12 }], ['Soft Knot', 'knot family / keyframe two', 47, { family: 1, loop: .7, thickness: .34, twist: .42, camera: .58, material: .66, keyframe: .32 }], ['Tangent Garden', 'tangent family / editable turn', 71, { family: 2, loop: .44, thickness: .62, twist: .8, camera: .36, material: .25, keyframe: .55 }], ['Chrome Braid', 'braid family / material travel', 109, { family: 0, loop: .86, thickness: .7, twist: .24, camera: .78, material: .92, keyframe: .7 }], ['Quiet Figure Eight', 'figure-eight / still camera', 157, { family: 1, loop: .3, thickness: .28, twist: .12, camera: .08, material: .18, keyframe: .46 }], ['Melted Rosette', 'rosette family / petal loop', 233, { family: 2, loop: .58, thickness: .84, twist: .66, camera: .62, material: .78, keyframe: .82 }],
  ], schema: [['family', 'Loop family', 0, 3, 1], ['loop', 'Loop duration', .2, 1, .01], ['thickness', 'Thickness', .1, 1, .01], ['twist', 'Twist', 0, 1, .01], ['camera', 'View angle', 0, 1, .01], ['material', 'Color blend', 0, 1, .01], ['keyframe', 'Shape morph', 0, 1, .01]] },
  { id: 'phase', number: '55', name: 'Phase Transition Theatre', tagline: 'Calm fields crystallize, coordinate, and release.', description: 'Move Threshold to grow or dissolve bands. Change Pattern for a different wave field, or Play journey to automate the controls.', mechanism: 'Driven diffusion · artistic field', arcs: phaseArcs, kind: 'phase', presets: [
    ['Calm Domain', 'quiet field / arc one', 11, { regime: 0, compare: 0, control: .3, coupling: .48, disturbance: .08, release: .82, tempo: .32, arc: 0 }], ['Crystal Front', 'build / arc one', 37, { regime: 2, compare: .4, control: .62, coupling: .74, disturbance: .32, release: .42, tempo: .68, arc: 0 }], ['Wave Release', 'release / arc one', 73, { regime: 3, compare: .65, control: .58, coupling: .86, disturbance: .44, release: .26, tempo: .76, arc: 0 }], ['Threshold Stage', 'compare driven responses', 101, { regime: 4, compare: 1, control: .74, coupling: .68, disturbance: .56, release: .16, tempo: .58, arc: 1 }], ['Pulse Assembly', 'full arc three transition', 149, { regime: 5, compare: .72, control: .86, coupling: .56, disturbance: .78, release: .12, tempo: .88, arc: 2 }], ['Soft Landing', 'full arc three release', 197, { regime: 1, compare: .84, control: .34, coupling: .42, disturbance: .12, release: .92, tempo: .38, arc: 2 }],
  ], schema: [['arc', 'Performance arc', 0, 2, 1], ['regime', 'Pattern', 0, 5, 1], ['compare', 'Split comparison', 0, 1, 1], ['control', 'Threshold', 0, 1, .01], ['coupling', 'Coupling', 0, 1, .01], ['disturbance', 'Disturbance', 0, 1, .01], ['release', 'Release', 0, 1, .01], ['tempo', 'Wave speed', .2, 1, .01]] },
  { id: 'evolution', number: '56', name: 'Evolution Garden', tagline: 'Bounded mutations reveal related visual families.', description: 'Lock one selectable parameter, compare deterministic siblings, name a child, undo, and promote its saved snapshot.', mechanism: 'Seeded bounded parameter mutation', kind: 'evolution', presets: [
    ['Seed Garden', 'three related seedlings', 5, { mutation: .18, lock: 0, lockField: 0, generation: 1, lineage: .2, focus: .5 }], ['Locked Bloom', 'mutation with a fixed stem', 17, { mutation: .36, lock: 1, lockField: 1, generation: 3, lineage: .46, focus: .25 }], ['Sibling Study', 'compare nearby children', 29, { mutation: .52, lock: 0, lockField: 2, generation: 4, lineage: .72, focus: .75 }], ['Lineage Walk', 'persistent family path', 43, { mutation: .28, lock: .62, lockField: 3, generation: 6, lineage: .88, focus: 1 }], ['Chosen Child', 'promoted rehearsal variant', 71, { mutation: .68, lock: .24, lockField: 0, generation: 5, lineage: .58, focus: .5 }], ['Recovery Grove', 'quiet return to origin', 113, { mutation: .12, lock: .84, lockField: 2, generation: 1, lineage: .1, focus: 0 }],
  ], schema: [['mutation', 'Mutation strength', 0, 1, .01], ['lock', 'Lock selected field', 0, 1, .01], ['lockField', 'Locked field', 0, 3, 1], ['generation', 'Generation', 0, 8, 1], ['lineage', 'Lineage view', 0, 1, .01], ['focus', 'Chosen sibling', 0, 1, .01]] },
  ...advancedScenes,
  { id: 'fractal', number: '57', name: 'Fractal Flight', tagline: 'Find your own route through recursive passages.', description: 'Drag to look. W/S move, A/D strafe, Q/E descend or rise. Hold the flight buttons or start Cruise. Pause and leaving the window stop travel.', mechanism: 'Five-level recursive sponge · repeating world', kind: 'fractal', presets: [
    ['Cathedral Drift', 'broad chambers / electric blue', 47, { cameraSpeed: .18, fractalScale: 2.05, detail: .62, steering: 0 }],
    ['Ember Nervure', 'fast branching pressure / ember', 83, { cameraSpeed: .42, fractalScale: 2.18, detail: .82, steering: .18 }],
    ['Glass Orbit', 'slow crystalline return / cool lime', 131, { cameraSpeed: .14, fractalScale: 2.32, detail: .7, steering: -.12 }],
  ], schema: [['cameraSpeed', 'Speed', .04, .8, .01], ['steering', 'Cruise turn', -.6, .6, .01], ['fractalScale', 'Passage width', 2.05, 2.45, .01], ['detail', 'Surface glow', .25, 1, .01]] },
];

const initialParams = {
  ...advancedDefaults,
  acid: { growth: .62, injection: .34, diffusion: .82, contrast: 1.2, drift: .25 },
  tapestry: { rule: 90, scroll: .42, weave: .55, reversal: 0, phrase: 8 },
  feedback: { decay: .91, transform: .012, symmetry: 4, injection: .55, tunnel: .58 },
  magnetic: { attractorX: .5, attractorY: .5, attractor: .62, trail: .88, density: .72, motion: .54, split: .35 },
  cathedrals: { family: 0, journey: 0, recursion: 4, scale: .82, color: .38, traversal: .44, stationary: 0, lighting: .72, material: .28, fog: .3, emission: .2 },
  aquarium: { population: .56, feeding: .42, trails: .84, habitat: 1, bloom: .48, food: .52, extinction: .18 },
  interference: { fieldA: .8, fieldB: .58, fieldC: .34, frequency: 1.4, ratio: .82, phase: .36, orientation: .3, filter: .72, tempoLock: .65 },
  topology: { family: 0, loop: .62, thickness: .48, twist: .58, camera: .42, material: .4, keyframe: .5 },
  phase: { arc: 0, regime: 2, compare: .5, control: .48, coupling: .64, disturbance: .28, release: .58, tempo: .5 },
  evolution: { mutation: .34, lock: .18, lockField: 0, generation: 2, lineage: .5, focus: .5 },
  fractal: { cameraSpeed: .18, steering: 0, fractalScale: 2.05, detail: .62 },
};
const fractalLookPalettes = [
  { primary: '#d5ff5f', secondary: '#5364ff', accent: '#ff5bc8' },
  { primary: '#ffcd75', secondary: '#802938', accent: '#65caff' },
  { primary: '#b1ffed', secondary: '#234f9e', accent: '#ecc7ff' },
];
const palette = { primary: '#d5ff5f', secondary: '#5364ff', accent: '#ff5bc8' };
const scenePalettes = Object.fromEntries(sceneDefs.map(def => [def.id, { ...palette }]));
const paletteCollections = { neon: ['#d5ff5f', '#5364ff', '#ff5bc8'], ember: ['#ffcd75', '#802938', '#ff643d'], glacier: ['#b1ffed', '#234f9e', '#65caff'], orchid: ['#ecc7ff', '#5c2dba', '#ff70ab'], mono: ['#ffffff', '#364152', '#a5b4c9'] };
const state = { sceneIndex: 0, presetIndex: Array(sceneDefs.length).fill(0), params: structuredClone(initialParams), evolution: null, gestureHistory: [], phaseEvents: [], phaseMeasurementArchive: null, workflow: 'explore', focusMode: false, renderingLost: false, tempo: 92, paused: false, muted: false, blackout: false, reducedMotion: false, brightness: .92, quality: '1080', cadenceAccumulator: 0, currentCue: -1, transition: null, dirty: false, setPlaying: false, setComplete: false, lastTime: performance.now(), elapsed: 0, audioLevel: 0, audioBands: { low: 0, mid: 0, high: 0 }, audioBandsReady: false, audioPeak: 0, audioPeakHold: 0, beatPulse: 0, beatStep: 0, beatBar: 0, gesture: { x: .5, y: .5, active: false }, setName: 'Untitled set', rehearsalNotes: '', rehearsalChecks: { microphone: false, tabAudio: false, recording: false, pngFolder: false, performance: false }, rehearsalChecksAt: null, demoOn: false };
state.deviceLabel = '';
let previousBeatVisualPulse = 0;
let beatVisualArmed = true;
const beatVisualTriggerThreshold = .28;
const beatVisualRearmThreshold = .14;
const audioMappings = { acid: ['mid', 'injection', .35], tapestry: ['high', 'weave', .3], feedback: ['low', 'tunnel', .25], magnetic: ['mid', 'motion', .4], cathedrals: ['high', 'emission', .5], aquarium: ['low', 'bloom', .4], interference: ['high', 'phase', .35], topology: ['mid', 'twist', .3], phase: ['mid', 'disturbance', .4], evolution: ['high', 'mutation', .3], julia: ['high', 'motion', .3], fourspace: ['mid', 'thickness', .3], hyperbolic: ['low', 'orbit', .3], fractal: ['low', 'detail', .25] };
const metrics = {
  frameTimes: [],
  sceneFrames: Array(sceneDefs.length).fill(0),
  sceneTimes: Array.from({ length: sceneDefs.length }, () => []),
  reset() {
    this.frameTimes.length = 0;
    this.sceneFrames = Array(sceneDefs.length).fill(0);
    this.sceneTimes = Array.from({ length: sceneDefs.length }, () => []);
  },
  summary(sceneIndex) {
    const values = (this.sceneTimes[sceneIndex] || []).filter((value) => Number.isFinite(value) && value > 0).slice(-240);
    if (!values.length) return { sampleCount: 0, medianMs: null, p95Ms: null, sceneFrames: this.sceneFrames[sceneIndex] || 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const medianIndex = (sorted.length - 1) / 2;
    const median = sorted.length % 2 ? sorted[Math.floor(medianIndex)] : (sorted[Math.floor(medianIndex)] + sorted[Math.ceil(medianIndex)]) / 2;
    const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * .95) - 1));
    return { sampleCount: values.length, medianMs: Number(median.toFixed(2)), p95Ms: Number(sorted[p95Index].toFixed(2)), sceneFrames: this.sceneFrames[sceneIndex] || 0 };
  },
  setSummary(profile = outputProfile()) {
    const sceneSummaries = sceneDefs.map((def, index) => ({ def, index, summary: this.summary(index) }));
    const measured = sceneSummaries.filter(({ summary }) => summary.sampleCount > 0);
    const values = measured.flatMap(({ index }) => (this.sceneTimes[index] || []).filter((value) => Number.isFinite(value) && value > 0).slice(-240));
    const totalScenes = sceneDefs.length;
    const sampledScenes = measured.length;
    const sceneFrames = sceneSummaries.reduce((sum, entry) => sum + (entry.summary.sceneFrames || 0), 0);
    if (!values.length) {
      const target = performanceTargetSummary({ sampleCount: 0 }, profile);
      return { sampleCount: 0, medianMs: null, p95Ms: null, sceneFrames, sampledScenes: 0, totalScenes, unmeasuredScenes: totalScenes, coverage: 'partial', worstScene: null, ...target };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const medianIndex = (sorted.length - 1) / 2;
    const median = sorted.length % 2 ? sorted[Math.floor(medianIndex)] : (sorted[Math.floor(medianIndex)] + sorted[Math.ceil(medianIndex)]) / 2;
    const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * .95) - 1));
    const worst = measured.reduce((current, entry) => !current || entry.summary.p95Ms > current.summary.p95Ms ? entry : current, null);
    const p95Ms = Number(worst.summary.p95Ms.toFixed(2));
    const target = performanceTargetSummary({ sampleCount: values.length, p95Ms }, profile);
    return { sampleCount: values.length, medianMs: Number(median.toFixed(2)), p95Ms, sceneFrames, sampledScenes, totalScenes, unmeasuredScenes: totalScenes - sampledScenes, coverage: sampledScenes === totalScenes ? 'complete' : 'partial', worstScene: { id: worst.def.id, name: worst.def.name, index: worst.index, sampleCount: worst.summary.sampleCount, p95Ms }, ...target };
  },
};

const buffers = {
  acid: { width: 120, height: 75, u: new Float32Array(120 * 75), v: new Float32Array(120 * 75), seed: 1, random: hash(1) },
  tapestry: { width: 220, height: 120, rows: Array.from({ length: 120 }, () => new Uint8Array(220)), current: new Uint8Array(220), cursor: 0, seed: 1 },
  feedback: { a: document.createElement('canvas'), b: document.createElement('canvas'), current: 0 },
  magnetic: { count: 720, particles: new Float32Array(720 * 4), previous: new Float32Array(720 * 2), attractors: new Float32Array(4), seed: 1, replay: { events: [], index: 0, playing: false, startBeat: 0 } },
  cathedrals: { phase: 0, seed: 1 },
  aquarium: { count: 96, organisms: new Float32Array(96 * 6), food: new Float32Array(12 * 3), seed: 1 },
  interference: { phase: 0, seed: 1 },
  topology: { phase: 0, seed: 1, keyframes: new Float32Array(2 * 5), intersections: 0 },
  phase: { width: 64, height: 40, values: new Float32Array(64 * 40), next: new Float32Array(64 * 40), compare: new Float32Array(64 * 40), compareNext: new Float32Array(64 * 40), seed: 1, transitionGap: 0, arcProgress: 0, arcPlaying: false, arcMode: 'single', arcPhase: 'idle', arcTrace: [] },
  evolution: { phase: 0, seed: 1, siblings: new Float32Array(5 * 4) },
};
let tapestryColumnMap = new Uint16Array(0);
let tapestrySinX = new Float64Array(0);
let tapestryCosX = new Float64Array(0);
function ensureTapestryRasterCache(width) {
  if (tapestryColumnMap.length === width && tapestrySinX.length === width && tapestryCosX.length === width) return;
  tapestryColumnMap = new Uint16Array(width);
  tapestrySinX = new Float64Array(width);
  tapestryCosX = new Float64Array(width);
  for (let x = 0; x < width; x += 1) {
    tapestryColumnMap[x] = Math.floor((x / width) * buffers.tapestry.width);
    const angle = x * .028;
    tapestrySinX[x] = Math.sin(angle);
    tapestryCosX[x] = Math.cos(angle);
  }
}
let interferenceRasterCache = new Float64Array(0);
let interferenceRasterCacheWidth = 0;
let interferenceRasterCacheHeight = 0;
function ensureInterferenceRasterCache(width, height) {
  if (interferenceRasterCacheWidth === width && interferenceRasterCacheHeight === height) return;
  interferenceRasterCacheWidth = width;
  interferenceRasterCacheHeight = height;
  interferenceRasterCache = new Float64Array((width + 2) * (height + 2));
}
let cathedralDirectionCache = new Float32Array(0);
let cathedralDirectionCacheWidth = 0;
let cathedralDirectionCacheHeight = 0;
let cathedralMarchDistance = 0;
let cathedralMarchSteps = 0;
let cathedralMarchHit = false;
function ensureCathedralDirectionCache(width, height) {
  if (cathedralDirectionCacheWidth === width && cathedralDirectionCacheHeight === height) return;
  cathedralDirectionCacheWidth = width;
  cathedralDirectionCacheHeight = height;
  cathedralDirectionCache = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const nx = (x / width - .5) * 1.5;
    const ny = (y / height - .5) * 1.25;
    const length = Math.hypot(nx, ny, 1);
    const index = (y * width + x) * 3;
    cathedralDirectionCache[index] = nx / length;
    cathedralDirectionCache[index + 1] = ny / length;
    cathedralDirectionCache[index + 2] = 1 / length;
  }
}
function marchCathedral(originX, originY, originZ, directionX, directionY, directionZ, family, recursion, steps) { let distance = 0; const depthFrequency = 1.2 + family * .4; for (let step = 0; step < steps; step += 1) { const x = originX + directionX * distance; const y = originY + directionY * distance; const z = originZ + directionZ * distance; let px = x; let py = y; for (let fold = 0; fold < recursion; fold += 1) { const scale = 1.45 + fold * .18; px = Math.abs(((px + .5 * scale) % scale) - .5 * scale) - .16; py = Math.abs(((py + .5 * scale) % scale) - .5 * scale) - .16; const swap = family === 1 || (family === 3 && fold % 2 === 1); if (swap) { const nextPx = px; px = py; py = nextPx; } } const radial = Math.hypot(px, py); const corridor = family === 0 ? Math.max(Math.abs(px), Math.abs(py)) - .06 : family === 1 ? radial - .08 : family === 2 ? Math.abs(px) + Math.abs(py) - .095 : Math.max(Math.abs(px + py) * .7, Math.abs(px - py) * .7) - .07; const depth = Math.abs(Math.sin(z * depthFrequency)) * .018; const fieldDistance = Math.max(.002, corridor + depth); if (!Number.isFinite(fieldDistance)) { cathedralMarchHit = false; cathedralMarchDistance = 6; cathedralMarchSteps = step + 1; return; } if (fieldDistance < .006) { cathedralMarchHit = true; cathedralMarchDistance = distance; cathedralMarchSteps = step + 1; return; } distance += clamp(fieldDistance * .72, .004, .22); if (distance > 6) { cathedralMarchHit = false; cathedralMarchDistance = distance; cathedralMarchSteps = step + 1; return; } } cathedralMarchHit = false; cathedralMarchDistance = distance; cathedralMarchSteps = steps; }
buffers.feedback.a.width = buffers.feedback.b.width = canvas.width;
buffers.feedback.a.height = buffers.feedback.b.height = canvas.height;
const fctx = [buffers.feedback.a.getContext('2d'), buffers.feedback.b.getContext('2d')];
const renderBuffer = document.createElement('canvas'); renderBuffer.width = canvas.width; renderBuffer.height = canvas.height;
const renderCtx = renderBuffer.getContext('2d');
let activeRenderState = { path: 'canvas-2d', width: canvas.width, height: canvas.height };
const transitionCanvas = document.createElement('canvas'); transitionCanvas.width = canvas.width; transitionCanvas.height = canvas.height;
let fractalRenderer = null;
let flightPose = defaultFlightPose();
let flightCruise = false;
const flightKeys = new Set();
let flightPointer = null;
let flightBlocked = false;
let fractalError = '';
const transitionCtx = transitionCanvas.getContext('2d');
const captureCanvas = document.createElement('canvas'); captureCanvas.width = canvas.width; captureCanvas.height = canvas.height;

let audio = { context: null, analyser: null, gain: null, recordDestination: null, source: null, demoGain: null, demoCompressor: null, demoNodes: new Set(), demoNoiseBuffer: null, demoStep: 0, demoBar: 0, media: null, mediaUrl: null, micStream: null, tabStream: null, data: null, frequencyData: null, recorder: null, recordingStream: null, recordingMime: null, recordingStem: null, recordingScene: null, recordingStartedAt: null, recordingLastPaint: -Infinity, chunks: [], peakSession: createAudioPeakSession() };
let audioRequest = 0;
let pulseTimer = null;
let audioSensitivity = 1;
const maxAudioPeakSessionSamples = 120000;
const rehearsalMinimumAudioSeconds = 20 * 60;
function createAudioPeakSession() { return { sampleCount: 0, elapsedSeconds: 0, peakMax: 0, holdMax: 0, holdSum: 0, hotSamples: 0, nearClipSamples: 0, capped: false }; }
let cueTimer = null;
let cueRunToken = 0;
let advanceCue = null;
let cueStartedAt = 0;
let cueRemainingMs = 0;
let cueRemainingBeats = 0;
let cueConsumedBeats = 0;
let lastSetProgressPaint = 0;
let previousScoreBackup = null;
let toastTimer = null;
let pendingFrameManifest = null;
let offlineFrameJob = null;
let lastPerformanceReadoutPaint = -Infinity;
let lastRehearsalPassReadoutPaint = -Infinity;
let lastDisplayScaleSignature = '';
let lastFocusFitPixelRatio = null;
let metricsProfile = null;
let lastPreflightReport = null;
let lastPreflightAt = null;
let lastPreflightRecordingMime;
let lastRehearsalReportAt = null;
let lastRehearsalReportSignature = null;
let lastRehearsalReportLiveSignature = null;
let lastRehearsalReportPerformanceSignature = null;
let lastRehearsalReportPerformanceSetSignature = null;
let lastRehearsalReportAudioPeakSessionSignature = null;
let lastRehearsalReportDeviceLabel = '';
let lastRehearsalReportQualityAB = null;
let rehearsalReportStale = false;
let recordingOutcome = 'idle';
const rehearsalReportCacheKey = 'phosphor-rehearsal-report-cache-v1';
const qualityABSampleCount = 3;
let lastQualityABProbe = null;
const beatResponseFormat = 'phosphor-beat-response-v1';
const beatResponsePulse = 1;
const beatResponseEffectKeys = Object.keys(effectDefaults);
let lastBeatResponseCheck = null;
const recordingOutcomeLabels = { idle: 'Recording idle', active: 'Recording active', saved: 'Recording saved', empty: 'Recording returned no data · use still or frame export', failed: 'Recording failed · use still or frame export' };
const recordingOutcomes = new Set(Object.keys(recordingOutcomeLabels));
let audioSourceOutcome = 'idle';
const audioSourceOutcomes = new Set(['idle', 'connecting', 'active', 'empty', 'ended', 'failed']);
const audioSourceOutcomeLabels = { idle: 'Source idle', connecting: 'Source connecting', active: 'Source active', empty: 'Source empty', ended: 'Source ended', failed: 'Source failed' };
const maxAudioSourceEvents = 8;
let audioSourceEvents = [];
const beatTelemetryFormat = 'phosphor-beat-telemetry-v1';
const beatTelemetryTriggerThreshold = .28;
const beatTelemetryRearmThreshold = .12;
const maxBeatTelemetryHits = 4096;
let beatTelemetryHits = 0;
let beatTelemetryLastOnsetAt = null;
let beatTelemetryLastOnsetSource = null;
let beatTelemetryArmed = true;
let lastDemoTelemetryStep = -1;

function hash(seed) { return seededRandom(seed); }
function normalizeQuality(value) { return ['720', '1080', 'native'].includes(value) ? value : '1080'; }
function qualityForProfileId(id) { return id === '480x300' ? '720' : id === '1920x1200' ? 'native' : id === '960x600' ? '1080' : null; }
function outputProfile() { return qualityProfile(state.quality); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400); }
function scene() { return sceneDefs[state.sceneIndex]; }
function preset() { return scene().presets[state.presetIndex[state.sceneIndex]]; }
function offlineJobActive(message = 'Offline frame render owns the instrument') { if (!offlineFrameJob) return false; showToast(message); return true; }
function recordingBlocksSourceChange() { if (!audio.recorder && !audio.recordingStream) return false; showToast('Stop recording before changing audio source'); return true; }
function displayPixelRatio() { const ratio = Number(globalThis.devicePixelRatio); return Number.isFinite(ratio) && ratio > 0 ? Math.min(8, Math.max(.1, ratio)) : 1; }
function rehearsalEnvironment() { const nav = globalThis.navigator; const width = Number(globalThis.innerWidth) || Number(document.documentElement?.clientWidth) || canvas.width; const height = Number(globalThis.innerHeight) || Number(document.documentElement?.clientHeight) || canvas.height; return { userAgent: typeof nav?.userAgent === 'string' ? nav.userAgent.slice(0, 240) : null, language: typeof nav?.language === 'string' ? nav.language.slice(0, 32) : null, viewport: { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }, devicePixelRatio: Number.isFinite(globalThis.devicePixelRatio) ? Math.max(.1, Math.min(8, Number(globalThis.devicePixelRatio))) : 1, hardwareConcurrency: Number.isInteger(nav?.hardwareConcurrency) ? Math.max(1, Math.min(256, nav.hardwareConcurrency)) : null, maxTouchPoints: Number.isInteger(nav?.maxTouchPoints) ? Math.max(0, Math.min(32, nav.maxTouchPoints)) : null }; }
function audioSourceKind() { return audio.media ? 'FILE' : audio.micStream ? 'MIC' : audio.tabStream ? 'TAB AUDIO' : state.demoOn ? 'DEMO' : 'NO AUDIO'; }
function recordAudioSourceEvent(source, status) { if (!audioSourceOutcomes.has(status)) return; const safeSource = rehearsalAudioSources.has(source) ? source : 'NO AUDIO'; const previous = audioSourceEvents.at(-1); if (previous?.source === safeSource && previous.status === status) return; audioSourceEvents.push({ source: safeSource, status }); if (audioSourceEvents.length > maxAudioSourceEvents) audioSourceEvents.shift(); }
function beatTelemetry() { return { format: beatTelemetryFormat, version: 1, hits: beatTelemetryHits, lastOnsetAt: beatTelemetryLastOnsetAt, lastOnsetSource: beatTelemetryLastOnsetSource, capped: beatTelemetryHits >= maxBeatTelemetryHits }; }
function beatTelemetryDisplayText(telemetry = beatTelemetry(), source = audioSourceKind(), prefix = 'BEAT TELEMETRY') {
  const last = telemetry.lastOnsetAt ? `${telemetry.lastOnsetAt.slice(11, 19)}Z` : '—';
  const onsetSource = telemetry.lastOnsetSource || source;
  return `${prefix} · ${telemetry.hits} HIT${telemetry.hits === 1 ? '' : 'S'}${telemetry.capped ? ' · CAP' : ''} · LAST ${last}${telemetry.lastOnsetAt ? ` · ${onsetSource}` : ''}`;
}
function beatTelemetryDisplayAria(telemetry = beatTelemetry(), source = audioSourceKind()) {
  return telemetry.lastOnsetAt ? `${telemetry.hits} detected beat hits${telemetry.capped ? '; telemetry cap reached' : ''}; last onset ${telemetry.lastOnsetAt} from ${telemetry.lastOnsetSource || source}; current source ${source}` : `No detected beat hits; source ${source}`;
}
function syncRehearsalBeatReadout() {
  const output = $('rehearsalBeatReadout');
  if (!output) return;
  const source = audioSourceKind();
  const telemetry = beatTelemetry();
  const next = `${beatTelemetryDisplayText(telemetry, source)} · diagnostic only`;
  if (output.textContent !== next) output.textContent = next;
  output.setAttribute('aria-label', `${beatTelemetryDisplayAria(telemetry, source)}. Diagnostic rehearsal telemetry only; this does not certify a beat grid.`);
  output.dataset.active = String(telemetry.hits > 0);
}
function syncBeatTelemetryReadout() {
  const output = $('audioBeatTelemetryReadout');
  if (!output) return;
  const source = audioSourceKind();
  const telemetry = beatTelemetry();
  const last = telemetry.lastOnsetAt ? `${telemetry.lastOnsetAt.slice(11, 19)}Z` : '—';
  const onsetSource = telemetry.lastOnsetSource || source;
  const next = `HITS ${telemetry.hits}${telemetry.capped ? ' · CAP' : ''} · LAST ${last}${telemetry.lastOnsetAt ? ` · ${onsetSource}` : ''}`;
  const previousHits = output.dataset.hits;
  const previousSource = output.dataset.source;
  const capChanged = output.dataset.capped !== String(telemetry.capped);
  const firstHit = previousHits === '0' && telemetry.hits > 0;
  output.setAttribute('aria-live', previousHits === undefined || previousSource !== source || capChanged || firstHit ? 'polite' : 'off');
  if (output.textContent !== next) output.textContent = next;
  output.dataset.hits = String(telemetry.hits);
  output.dataset.source = source;
  output.dataset.capped = String(telemetry.capped);
  output.dataset.active = String(telemetry.hits > 0);
  output.setAttribute('aria-label', beatTelemetryDisplayAria(telemetry, source));
  syncRehearsalBeatReadout();
}
function resetBeatTelemetry() { beatTelemetryHits = 0; beatTelemetryLastOnsetAt = null; beatTelemetryLastOnsetSource = null; beatTelemetryArmed = true; lastDemoTelemetryStep = -1; syncBeatTelemetryReadout(); }
function recordBeatEvent(source) {
  if (beatTelemetryHits >= maxBeatTelemetryHits) return false;
  beatTelemetryHits += 1;
  beatTelemetryLastOnsetAt = new Date().toISOString();
  beatTelemetryLastOnsetSource = rehearsalAudioSources.has(source) ? source : 'NO AUDIO';
  syncBeatTelemetryReadout();
  return true;
}
function recordAudioBeatOnset(level, source = audioSourceKind()) {
  const safeLevel = clamp(Number(level) || 0, 0, 1);
  if (safeLevel <= beatTelemetryRearmThreshold) beatTelemetryArmed = true;
  if (!beatTelemetryArmed || safeLevel < beatTelemetryTriggerThreshold) return false;
  beatTelemetryArmed = false;
  return recordBeatEvent(source);
}
function recordDemoBeatOnset(step, level) {
  const safeStep = ((Math.floor(Number(step) || 0) % 16) + 16) % 16;
  const safeLevel = clamp(Number(level) || 0, 0, 1);
  if (safeLevel < beatTelemetryTriggerThreshold || safeStep === lastDemoTelemetryStep) return false;
  lastDemoTelemetryStep = safeStep;
  return recordBeatEvent('DEMO');
}
function rehearsalReportStateSignature() { const source = audioSourceKind(); return JSON.stringify({ environment: rehearsalEnvironment(), renderer: currentRendererEvidence(), qualityAB: lastQualityABProbe, beatResponse: lastBeatResponseCheck, setName: state.setName, rehearsalNotes: state.rehearsalNotes, rehearsalChecks: state.rehearsalChecks, rehearsalChecksAt: state.rehearsalChecksAt, sceneIndex: state.sceneIndex, preset: state.presetIndex[state.sceneIndex], outputProfile: outputProfile().id, workflow: state.workflow, tempo: state.tempo, paused: state.paused, blackout: state.blackout, renderingLost: state.renderingLost, setPlaying: state.setPlaying, setComplete: state.setComplete, currentCue: state.currentCue, source, audioSourceOutcome, audioSourceEvents, recording: Boolean(audio.recordingStream), recordingOutcome, progress: $('setProgress')?.textContent || '', cueReadout: $('cueCurrentReadout')?.textContent || '', preflightCheckedAt: lastPreflightAt, cues: cues.map((cue) => [cue.label, cue.scene, cue.preset, cue.duration]) }); }
function rehearsalReportLiveSignature() { const environment = rehearsalEnvironment(); const source = audioSourceKind(); return JSON.stringify([environment.userAgent, environment.language, environment.viewport.width, environment.viewport.height, environment.devicePixelRatio, currentRendererEvidence(), lastBeatResponseCheck, state.setName, state.rehearsalNotes, state.rehearsalChecks, state.rehearsalChecksAt, state.sceneIndex, state.presetIndex[state.sceneIndex], outputProfile().id, state.workflow, state.tempo, state.paused, state.blackout, state.renderingLost, state.setPlaying, state.setComplete, state.currentCue, source, audioSourceOutcome, audioSourceEvents, Boolean(audio.recordingStream), recordingOutcome, $('setProgress')?.textContent || '', $('cueCurrentReadout')?.textContent || '', lastPreflightAt]); }
function rehearsalReportInputSignature() { return JSON.stringify({ state: JSON.parse(rehearsalReportStateSignature()), rehearsalNotes: state.rehearsalNotes, params: state.params, palette, scenePalettes, effects, brightness: state.brightness, reducedMotion: state.reducedMotion, audioSensitivity, flightPose, evolution: state.evolution, gestureHistory: state.gestureHistory, phaseEvents: state.phaseEvents, phaseMeasurementArchive: state.phaseMeasurementArchive }); }
function rehearsalReportLabelSuffix() { const label = sanitizeDeviceLabel(lastRehearsalReportDeviceLabel); return label ? ` · ${label}` : ''; }
function markRehearsalReportStale() { markRehearsalReportImportStale(); if (offlineFrameJob || !lastRehearsalReportAt || rehearsalReportStale) return; rehearsalReportStale = true; syncQualityABReadout(); const output = $('rehearsalReportReadout'); if (!output) return; output.textContent = `Saved ${lastRehearsalReportAt}${rehearsalReportLabelSuffix()} · state changed`; output.setAttribute('aria-label', `Rehearsal report saved at ${lastRehearsalReportAt}${rehearsalReportLabelSuffix()}; current state changed since that snapshot`); }
function markRehearsalReportImportStale() { if (offlineFrameJob || !importedRehearsalReport || importedRehearsalReportStale) return; importedRehearsalReportStale = true; syncQualityABReadout(); const output = $('rehearsalReportImportReadout'); const compareOutput = $('rehearsalReportImportCompareReadout'); const passOutput = $('rehearsalReportImportPassReadout'); if (passOutput && importedRehearsalReport.passSnapshot) { const contextText = rehearsalReportImportPassContext(importedRehearsalReport); const contextAria = rehearsalReportImportPassContextAria(importedRehearsalReport); passOutput.textContent = `Loaded ${rehearsalPassDisplayText(importedRehearsalReport.passSnapshot)}${contextText} · stale`; passOutput.setAttribute('aria-label', `Loaded ${rehearsalPassDisplayAria(importedRehearsalReport.passSnapshot)}${contextAria} The current instrument changed after this snapshot, so the loaded pass is stale.`); passOutput.dataset.level = 'stale'; } if (compareOutput) { compareOutput.textContent = 'Compare · stale · current state changed'; const qualityGuidance = qualityABRecommendationAria(importedRehearsalReport?.qualityAB); compareOutput.setAttribute('aria-label', `Loaded report comparison is stale because the current instrument changed${qualityGuidance ? `; ${qualityGuidance}` : ''}`); compareOutput.dataset.level = 'stale'; } if (!output) return; const stamp = rehearsalReportImportDisplayStamp(importedRehearsalReport); const label = importedRehearsalReport.deviceLabel ? ` · ${importedRehearsalReport.deviceLabel}` : ''; output.textContent = `Loaded ${stamp}${label} · current state changed`; output.setAttribute('aria-label', `Loaded rehearsal report from ${stamp}${label}; current state changed since comparison`); }
function syncRehearsalReportFreshness() { if (offlineFrameJob || (!lastRehearsalReportLiveSignature && !importedRehearsalReportLiveSignature)) return; const liveSignature = rehearsalReportLiveSignature(); if (lastRehearsalReportLiveSignature && !rehearsalReportStale && liveSignature !== lastRehearsalReportLiveSignature) markRehearsalReportStale(); if (importedRehearsalReport && !importedRehearsalReportStale && importedRehearsalReportLiveSignature && liveSignature !== importedRehearsalReportLiveSignature) markRehearsalReportImportStale(); }
function syncStartAudioControl() { const button = $('startAudioButton'); if (!button) return; const active = audioSourceKind() !== 'NO AUDIO'; const fallback = !active && ['empty', 'ended', 'failed'].includes(audioSourceOutcome); button.setAttribute('aria-pressed', String(active)); button.setAttribute('aria-label', active ? 'Audio active' : fallback ? 'Start dark techno demo fallback' : 'Start dark techno demo beat'); button.title = active ? 'Audio context and a source are active' : fallback ? 'Start the local dark techno demo beat as a fallback' : 'Start the local dark techno demo beat'; }
function syncAudioSourceControls() { const locked = Boolean(audio.recorder || audio.recordingStream); const active = { demoAudioButton: state.demoOn, micButton: Boolean(audio.micStream), tabAudioButton: Boolean(audio.tabStream) }; const describedBy = 'audioStatus beatReadout beatBarReadout beatNextReadout audioCoverageReadout audioHeadroomReadout audioSessionReadout audioBeatTelemetryReadout audioSourceHistoryReadout'; for (const id of ['demoAudioButton', 'micButton', 'tabAudioButton', 'audioFileInput', 'stopAudioButton']) { const element = $(id); if (!element) continue; element.disabled = locked; element.setAttribute('aria-disabled', String(locked)); element.setAttribute('aria-describedby', describedBy); if (id in active) element.setAttribute('aria-pressed', String(Boolean(active[id]))); if (locked) element.title = 'Stop recording before changing audio source'; else element.removeAttribute?.('title'); } const sensitivity = $('audioSensitivity'); if (sensitivity) sensitivity.setAttribute('aria-describedby', describedBy); syncStartAudioControl(); syncReadinessStatus(); }
function refreshPaused() { if (state.paused && !state.blackout && !state.renderingLost) { state.transition = null; drawPreview(); } }
function markDirty(redraw = true, resetCompletion = true) { pendingFrameManifest = null; if (resetCompletion) state.setComplete = false; state.dirty = true; $('dirtyState').textContent = 'UNSAVED'; markRehearsalReportStale(); applyDisplayBrightness(); if (redraw) refreshPaused(); scheduleSave(); }
function sceneActionHint() { if (scene().kind === 'fractal') return 'DRAG TO LOOK · W/S MOVE · A/D STRAFE · Q/E HEIGHT'; if (scene().id === 'julia') return 'DRAG TO CHANGE FRACTAL'; if (scene().id === 'fourspace') return 'DRAG TO SET ROTATION'; if (scene().id === 'hyperbolic') return 'DRAG TO MOVE VIEWPOINT'; if (scene().kind === 'topology') return 'DRAG TO TURN THE LOOP'; if (scene().kind === 'evolution') return 'CLICK / SPACE TO CHOOSE SIBLING'; if (scene().kind === 'particles') return 'CLICK / DRAG TO SHAPE FLOW'; if (scene().kind === 'aquarium') return 'CLICK / DRAG TO STEER FEEDERS TOWARD FOOD'; if (scene().kind === 'phase') return 'CLICK / SPACE TO NUDGE FIELD'; return 'CLICK / SPACE TO INJECT'; }
function brightnessFilter() { return state.brightness < 1 ? `brightness(${state.brightness})` : 'none'; }
function applyDisplayBrightness() { canvas.style.filter = state.brightness < 1 ? `brightness(${state.brightness})` : ''; }
function rendererReadoutText() {
  const { path, width, height, reason } = activeRenderState;
  const name = scene().id === 'julia' ? 'Julia' : scene().kind === 'fractal' ? 'Fractal Flight' : 'Canvas 2D';
  if (path === 'warming-up') return `${name} renderer warming up`;
  const rendered = Number.isInteger(width) && Number.isInteger(height) ? `${width}×${height}` : 'size unknown';
  if (path === 'webgl') return `${name} · WebGL${width === canvas.width && height === canvas.height ? ' native' : ''} ${rendered}`;
  if (path === 'cpu') return `${name} · CPU fallback ${rendered} → ${canvas.width}×${canvas.height}${reason ? ` · ${reason}` : ''}`;
  if (path === 'unavailable') return `${name} · renderer unavailable`;
  if (scene().kind === 'geometry' && (state.demoOn || state.audioBandsReady)) {
    const profile = outputProfile();
    const beatScale = cathedralBeatRasterScale(profile);
    const beatWidth = Math.max(1, Math.round(profile.cathedralWidth * beatScale));
    const beatHeight = Math.max(1, Math.round(profile.cathedralHeight * beatScale));
    return `${name} · ${rendered} · beat raster ${beatWidth}×${beatHeight}`;
  }
  return `${name} · ${rendered}`;
}
function cathedralBeatRasterScale(profile = outputProfile()) { return profile?.workScale >= 2 ? .95 : 1; }
function currentRendererEvidence() {
  const { path, width, height } = activeRenderState;
  return { path, width, height, outputWidth: canvas.width, outputHeight: canvas.height };
}
function syncRendererReadout() {
  const text = rendererReadoutText();
  for (const id of ['rendererReadout', 'focusRendererReadout']) {
    const output = $(id);
    if (!output) continue;
    if (output.textContent !== text) output.textContent = text;
    output.setAttribute('aria-label', `Renderer path: ${text}`);
  }
  syncFocusRenderFit();
}
function syncFocusRenderFit() {
  const stageWrap = $('stageWrap');
  if (!stageWrap) return;
  const cpuFocus = Boolean(state.focusMode && scene().id === 'julia' && activeRenderState.path === 'cpu');
  const juliaQualityFit = Boolean(state.focusMode && scene().id === 'julia');
  const fractalQualityFit = Boolean(state.focusMode && scene().kind === 'fractal' && activeRenderState.path === 'webgl');
  stageWrap.classList.toggle('julia-cpu-fit', cpuFocus);
  stageWrap.classList.toggle('julia-quality-fit', juliaQualityFit);
  stageWrap.classList.toggle('fractal-quality-fit', fractalQualityFit);
  const rasterWidth = Number.isInteger(activeRenderState.width) && activeRenderState.width > 0 ? activeRenderState.width : canvas.width;
  // Keep Focus from enlarging Julia or Fractal output past useful detail.
  // WebGL still renders a supersampled backing into this output canvas; the
  // output cap avoids stretching that composited surface a second time.
  const pixelRatio = Math.max(1, displayPixelRatio());
  const fitCap = activeRenderState.path === 'webgl' && fractalQualityFit ? Math.min(canvas.width, rasterWidth * 1.5 / pixelRatio) : activeRenderState.path === 'webgl' ? Math.min(canvas.width, rasterWidth / pixelRatio) : activeRenderState.path === 'cpu' ? Math.min(canvas.width, rasterWidth * 4 / 3 / pixelRatio) : Math.min(canvas.width, rasterWidth / pixelRatio);
  const fitWidth = `${Math.max(1, Math.round(fitCap))}px`;
  stageWrap.style.setProperty?.('--focus-fit-width', fitWidth);
  if (!stageWrap.style.setProperty) stageWrap.style['--focus-fit-width'] = fitWidth;
  lastFocusFitPixelRatio = pixelRatio;
}
function syncFocusQualityAction(showHint = false) {
  const button = $('focusQualityButton');
  if (!button) return;
  const visible = Boolean(showHint && !offlineFrameJob);
  button.hidden = !visible;
  button.disabled = Boolean(offlineFrameJob);
  button.setAttribute('aria-label', 'Switch Julia output to HD 1920 by 1200');
}
function syncPerformanceReadouts(text, ariaLabel) {
  for (const id of ['performanceReadout', 'focusPerformanceReadout']) {
    const output = $(id);
    if (!output) continue;
    if (output.textContent !== text) output.textContent = text;
    output.setAttribute('aria-label', ariaLabel);
  }
}
function syncFocusScaleReadout() {
  const output = $('focusScaleReadout');
  if (!output) return;
  const rect = canvas.getBoundingClientRect?.();
  const displayWidth = Number(rect?.width);
  const displayHeight = Number(rect?.height);
  if (!(displayWidth > 0) || !(displayHeight > 0) || !(canvas.width > 0) || !(canvas.height > 0)) {
    output.textContent = 'Display scale warming up';
    output.setAttribute('aria-label', 'Display scale is warming up');
    output.classList.remove('quality-warning');
    syncFocusQualityAction(false);
    return;
  }
  const pixelRatio = displayPixelRatio();
  const effectivePixelRatio = Math.max(1, pixelRatio);
  if (effectivePixelRatio !== lastFocusFitPixelRatio) syncFocusRenderFit();
  const densitySuffix = Math.abs(pixelRatio - 1) > .05 ? ` · DPR ${pixelRatio.toFixed(1)}×` : '';
  const scaleX = displayWidth * pixelRatio / canvas.width;
  const scaleY = displayHeight * pixelRatio / canvas.height;
  const scale = Math.max(scaleX, scaleY);
  const signature = `${Math.round(displayWidth)}×${Math.round(displayHeight)}·${pixelRatio.toFixed(3)}·${scale.toFixed(3)}·${activeRenderState.path}·${activeRenderState.width ?? ''}·${activeRenderState.height ?? ''}`;
  if (signature === lastDisplayScaleSignature) {
    // Focus can toggle without changing the canvas rect. Keep the correction
    // affordance synchronized even when the scale readout itself is cached.
    const rasterScale = activeRenderState.path === 'cpu' && Number.isInteger(activeRenderState.width) && activeRenderState.width > 0 ? displayWidth * pixelRatio / activeRenderState.width : scale;
    const showHdHint = scene().id === 'julia' && outputProfile().id !== '1920x1200' && (state.focusMode || rasterScale >= 1.5);
    output.classList.toggle('quality-warning', showHdHint);
    syncFocusQualityAction(showHdHint);
    return;
  }
  lastDisplayScaleSignature = signature;
  syncQualityABReadout();
  if (activeRenderState.path === 'cpu' && Number.isInteger(activeRenderState.width) && activeRenderState.width > 0) {
    const rasterScale = displayWidth * pixelRatio / activeRenderState.width;
    const roundedRasterScale = rasterScale.toFixed(1);
    const mode = rasterScale > 1.05 ? 'CPU raster upscale' : rasterScale < .95 ? 'CPU raster downscale' : 'native CPU fit';
    const showHdHint = scene().id === 'julia' && outputProfile().id !== '1920x1200' && (state.focusMode || Number(roundedRasterScale) >= 1.5);
    const hdHint = showHdHint ? ' · HD available' : '';
    output.classList.toggle('quality-warning', showHdHint);
    syncFocusQualityAction(showHdHint);
    output.textContent = `Display ${Math.round(displayWidth)}×${Math.round(displayHeight)} · ${roundedRasterScale}× ${mode}${densitySuffix}${hdHint}`;
    output.setAttribute('aria-label', `Displayed at ${Math.round(displayWidth)} by ${Math.round(displayHeight)} CSS pixels${densitySuffix ? ` at device pixel ratio ${pixelRatio.toFixed(1)}` : ''}, ${roundedRasterScale} times the ${activeRenderState.width} by ${activeRenderState.height} CPU raster; ${mode}${hdHint ? '; HD output is available from the quality control' : ''}`);
    return;
  }
  if (activeRenderState.path === 'webgl' && Number.isInteger(activeRenderState.width) && activeRenderState.width > 0 && Number.isInteger(activeRenderState.height) && activeRenderState.height > 0 && (activeRenderState.width !== canvas.width || activeRenderState.height !== canvas.height)) {
    const backingScale = Math.max(displayWidth * pixelRatio / activeRenderState.width, displayHeight * pixelRatio / activeRenderState.height);
    const roundedBackingScale = backingScale.toFixed(1);
    const mode = backingScale > 1.05 ? 'WebGL backing upscale' : backingScale < .95 ? 'WebGL backing downscale' : 'native WebGL backing fit';
    const showHdHint = scene().id === 'julia' && outputProfile().id !== '1920x1200' && (state.focusMode || Number(roundedBackingScale) >= 1.5);
    const hdHint = showHdHint ? ' · HD available' : '';
    output.classList.toggle('quality-warning', showHdHint);
    syncFocusQualityAction(showHdHint);
    output.textContent = `Display ${Math.round(displayWidth)}×${Math.round(displayHeight)} · ${roundedBackingScale}× ${mode}${densitySuffix}${hdHint}`;
    output.setAttribute('aria-label', `Displayed at ${Math.round(displayWidth)} by ${Math.round(displayHeight)} CSS pixels${densitySuffix ? ` at device pixel ratio ${pixelRatio.toFixed(1)}` : ''}, ${roundedBackingScale} times the ${activeRenderState.width} by ${activeRenderState.height} WebGL backing surface; ${mode}${hdHint ? '; HD output is available from the quality control' : ''}`);
    return;
  }
  const roundedScale = scale.toFixed(1);
  const mode = scale > 1.05 ? 'CSS upscale' : scale < .95 ? 'CSS downscale' : 'native fit';
  const showHdHint = scene().id === 'julia' && outputProfile().id !== '1920x1200' && (state.focusMode || Number(roundedScale) >= 1.5);
  const hdHint = showHdHint ? ' · HD available' : '';
  output.classList.toggle('quality-warning', showHdHint);
  syncFocusQualityAction(showHdHint);
  output.textContent = `Display ${Math.round(displayWidth)}×${Math.round(displayHeight)} · ${roundedScale}× ${mode}${densitySuffix}${hdHint}`;
  output.setAttribute('aria-label', `Displayed at ${Math.round(displayWidth)} by ${Math.round(displayHeight)} CSS pixels${densitySuffix ? ` at device pixel ratio ${pixelRatio.toFixed(1)}` : ''}, ${roundedScale} times the ${canvas.width} by ${canvas.height} render surface; ${mode}${hdHint ? '; HD output is available from the quality control' : ''}`);
}
function compositeOutputFrame() { captureCanvas.width = canvas.width; captureCanvas.height = canvas.height; const outputCtx = captureCanvas.getContext('2d'); outputCtx.save(); outputCtx.globalAlpha = 1; outputCtx.globalCompositeOperation = 'source-over'; outputCtx.filter = brightnessFilter(); outputCtx.drawImage(canvas, 0, 0); outputCtx.restore(); return captureCanvas; }
function fractalDescription() { return fractalError ? `${scene().description} 3D unavailable (${fractalError}). Choose another scene or retry after restoring WebGL.` : scene().description; }
function syncReadinessStatus() { const transport = state.renderingLost ? 'RECOVERING' : state.blackout ? 'BLACKOUT' : state.setPlaying ? 'SET LIVE' : state.setComplete ? 'SET COMPLETE' : state.currentCue >= 0 ? 'SET PAUSED' : state.paused ? 'PAUSED' : 'READY'; const source = audio.media ? 'FILE' : audio.micStream ? 'MIC' : audio.tabStream ? 'TAB AUDIO' : state.demoOn ? 'DEMO' : 'NO AUDIO'; const output = offlineFrameJob ? 'PNG RENDER' : audio.recordingStream ? 'RECORDING' : 'OUTPUT READY'; const element = $('readinessReadout'); if (element) { const next = `${transport} · ${source} · ${output}`; if (element.textContent !== next) element.textContent = next; } const badge = $('transitionBadge'); if (badge) { badge.setAttribute('role', 'status'); badge.setAttribute('aria-live', 'polite'); const next = stageTransportBadge(); if (badge.textContent !== next) badge.textContent = next; } syncSetTimingControl(); syncRehearsalReportFreshness(); syncRehearsalPassReadout(); }
function performanceTargetSummary(summary, profile = outputProfile()) { const targetMs = Number((1000 / profile.cadence).toFixed(2)); if (!summary.sampleCount) return { status: 'warming-up', statusLabel: 'Warming up', targetMs }; const within = summary.p95Ms <= targetMs; return { status: within ? 'within-target' : 'over-target', statusLabel: within ? 'Within target' : 'Over target', targetMs }; }
function rehearsalPerformanceSignature(performance) { return JSON.stringify([performance?.sampleCount ?? null, performance?.medianMs ?? null, performance?.p95Ms ?? null, performance?.sceneFrames ?? null, performance?.status ?? null, performance?.targetMs ?? null]); }
function rehearsalPerformanceSetSignature(performance) { return JSON.stringify([performance?.sampleCount ?? null, performance?.medianMs ?? null, performance?.p95Ms ?? null, performance?.sceneFrames ?? null, performance?.sampledScenes ?? null, performance?.totalScenes ?? null, performance?.unmeasuredScenes ?? null, performance?.coverage ?? null, performance?.status ?? null, performance?.targetMs ?? null, performance?.worstScene?.id ?? null, performance?.worstScene?.p95Ms ?? null]); }
function syncRehearsalReportPerformanceFreshness(performance) { if (offlineFrameJob || (!lastRehearsalReportPerformanceSignature && !importedRehearsalReportPerformanceSignature)) return; const signature = rehearsalPerformanceSignature(performance); if (lastRehearsalReportPerformanceSignature && !rehearsalReportStale && signature !== lastRehearsalReportPerformanceSignature) markRehearsalReportStale(); if (importedRehearsalReportPerformanceSignature && !importedRehearsalReportStale && signature !== importedRehearsalReportPerformanceSignature) markRehearsalReportImportStale(); }
function syncRehearsalReportPerformanceSetFreshness(performance) { if (offlineFrameJob || (!lastRehearsalReportPerformanceSetSignature && !importedRehearsalReportPerformanceSetSignature)) return; const signature = rehearsalPerformanceSetSignature(performance); if (lastRehearsalReportPerformanceSetSignature && !rehearsalReportStale && signature !== lastRehearsalReportPerformanceSetSignature) markRehearsalReportStale(); if (importedRehearsalReportPerformanceSetSignature && !importedRehearsalReportStale && signature !== importedRehearsalReportPerformanceSetSignature) markRehearsalReportImportStale(); }
function syncSetPerformanceDetail(summary = metrics.setSummary()) { const output = $('performanceSetDetailReadout'); if (!output) return; if (!summary.sampledScenes) { output.textContent = 'No timing coverage yet'; output.setAttribute('aria-label', 'No visual family timing has been captured yet'); return; } const rows = sceneDefs.map((def, index) => { const sceneSummary = metrics.summary(index); if (!sceneSummary.sampleCount) return `${String(def.number).padStart(2, '0')} ${def.name} · unmeasured`; const target = performanceTargetSummary(sceneSummary); return `${String(def.number).padStart(2, '0')} ${def.name} · ${sceneSummary.p95Ms.toFixed(1)}ms p95 · ${target.statusLabel.toLowerCase()}`; }); const text = rows.join('\n'); if (output.textContent !== text) output.textContent = text; output.setAttribute('aria-label', rows.join('; ')); }
function syncSetPerformanceReadout(summary = metrics.setSummary()) { const output = $('performanceSetReadout'); if (!output) return; syncSetPerformanceDetail(summary); const coverage = `${summary.sampledScenes}/${summary.totalScenes} scenes`; if (!summary.sampledScenes) { const text = `Set timing warming up · ${coverage} · ${summary.targetMs.toFixed(1)}ms target`; output.textContent = text; output.setAttribute('aria-label', `Set timing is warming up; ${coverage} measured; the ${summary.targetMs.toFixed(1)} millisecond target applies to this output profile`); syncRehearsalPassReadout(true, summary); return; } const qualifier = summary.coverage === 'complete' ? summary.statusLabel.toLowerCase() : `${summary.statusLabel.toLowerCase()} so far`; const worst = summary.worstScene ? ` · worst ${summary.worstScene.name} ${summary.worstScene.p95Ms.toFixed(1)}ms` : ''; const text = `Set ${coverage} · ${summary.p95Ms.toFixed(1)}ms p95 max · ${qualifier}${worst}`; output.textContent = text; output.setAttribute('aria-label', `Set timing ${coverage}; worst measured scene ${summary.worstScene?.name || 'unknown'} 95th percentile ${summary.p95Ms.toFixed(1)} milliseconds; ${qualifier} against a ${summary.targetMs.toFixed(1)} millisecond target${summary.unmeasuredScenes ? `; ${summary.unmeasuredScenes} visual families remain unmeasured` : ''}`); syncRehearsalPassReadout(true, summary); }
function updatePerformanceReadout(now = performance.now()) { const output = $('performanceReadout'); if (!output || now - lastPerformanceReadoutPaint < 1000) return; lastPerformanceReadoutPaint = now; const setSummary = metrics.setSummary(); syncSetPerformanceReadout(setSummary); syncRehearsalReportPerformanceSetFreshness(setSummary); const summary = metrics.summary(state.sceneIndex); const target = performanceTargetSummary(summary); const measuredPerformance = { ...summary, ...target }; syncRehearsalReportPerformanceFreshness(measuredPerformance); if (!summary.sampleCount) { const text = `Frame timing warming up · ${target.targetMs.toFixed(1)}ms target`; syncPerformanceReadouts(text, `Frame timing is warming up; the ${outputProfile().cadence} target is ${target.targetMs.toFixed(1)} milliseconds`); return; } const memory = Number.isFinite(performance.memory?.usedJSHeapSize) ? ` · ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} MB` : ''; const text = `Frame ${summary.medianMs.toFixed(1)}ms med · ${summary.p95Ms.toFixed(1)}ms p95 · ${target.statusLabel.toLowerCase()}${memory}`; syncPerformanceReadouts(text, `Frame timing median ${summary.medianMs.toFixed(1)} milliseconds, 95th percentile ${summary.p95Ms.toFixed(1)} milliseconds; ${target.statusLabel.toLowerCase()} against a ${target.targetMs.toFixed(1)} millisecond target${memory ? `; ${memory.slice(3)}` : ''}`); }
function resetPerformanceReadout() { lastPerformanceReadoutPaint = -Infinity; const output = $('performanceReadout'); if (output) { const target = performanceTargetSummary({ sampleCount: 0 }); syncPerformanceReadouts(`Frame timing warming up · ${target.targetMs.toFixed(1)}ms target`, `Frame timing is warming up; the ${outputProfile().cadence} target is ${target.targetMs.toFixed(1)} milliseconds`); } syncSetPerformanceReadout(metrics.setSummary()); }
function syncMetricsProfile(profileId) { if (metricsProfile === profileId) return; metricsProfile = profileId; metrics.reset(); }
const qualityABFormat = 'phosphor-quality-ab-v1';
const qualityABProfileIds = { full: '960x600', hd: '1920x1200' };
const qualityABModes = new Set(['CSS upscale', 'CSS downscale', 'native fit']);
const setTimingProbeSampleCount = 3;
const setTimingProbeWarmupCount = 1;
let setTimingProbeActive = false;
function qualityABMeasurement(profileId, samples, renderer, display) {
  const quality = qualityForProfileId(profileId); const profile = qualityProfile(quality); const values = samples.filter((value) => Number.isFinite(value) && value >= 0).slice(0, qualityABSampleCount); const sorted = [...values].sort((a, b) => a - b); const medianIndex = (sorted.length - 1) / 2; const medianMs = sorted.length % 2 ? sorted[Math.floor(medianIndex)] : (sorted[Math.floor(medianIndex)] + sorted[Math.ceil(medianIndex)]) / 2; const p95Ms = sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * .95) - 1))]; const target = performanceTargetSummary({ sampleCount: sorted.length, p95Ms }, profile); return { outputProfile: profile.id, width: profile.width, height: profile.height, frameRate: profile.cadence, renderer: structuredClone(renderer), samples: sorted.map((value) => Number(value.toFixed(2))), medianMs: Number(medianMs.toFixed(2)), p95Ms: Number(p95Ms.toFixed(2)), status: target.status, statusLabel: target.statusLabel, targetMs: target.targetMs, display: { width: display.width, height: display.height, pixelRatio: display.pixelRatio, scale: display.scale, mode: display.mode } };
}
function sanitizeQualityABMeasurement(data, expectedProfileId) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !['outputProfile', 'width', 'height', 'frameRate', 'renderer', 'samples', 'medianMs', 'p95Ms', 'status', 'statusLabel', 'targetMs', 'display'].includes(key)) || data.outputProfile !== expectedProfileId) throw new Error('Quality A/B measurement is malformed');
  const quality = qualityForProfileId(expectedProfileId); const profile = qualityProfile(quality); const renderer = sanitizeRehearsalRenderer(data.renderer); const samples = Array.isArray(data.samples) && data.samples.length >= 1 && data.samples.length <= qualityABSampleCount && data.samples.every((value) => Number.isFinite(value) && value >= 0 && value <= 60000) ? data.samples.map((value) => Number(value)) : null; const medianMs = Number.isFinite(data.medianMs) && data.medianMs >= 0 && data.medianMs <= 60000 ? Number(data.medianMs) : null; const p95Ms = Number.isFinite(data.p95Ms) && data.p95Ms >= 0 && data.p95Ms <= 60000 ? Number(data.p95Ms) : null; const targetMs = Number.isFinite(data.targetMs) && data.targetMs > 0 && data.targetMs <= 1000 ? Number(data.targetMs) : null; const display = data.display; const displayWidth = Number.isInteger(display?.width) && display.width >= 1 && display.width <= 32768 ? display.width : null; const displayHeight = Number.isInteger(display?.height) && display.height >= 1 && display.height <= 32768 ? display.height : null; const pixelRatio = display?.pixelRatio === undefined ? 1 : Number.isFinite(display.pixelRatio) && display.pixelRatio >= .1 && display.pixelRatio <= 8 ? Number(display.pixelRatio) : null; const scale = Number.isFinite(display?.scale) && display.scale >= .01 && display.scale <= 8 ? Number(display.scale) : null; const mode = qualityABModes.has(display?.mode) ? display.mode : null; const sortedSamples = samples ? [...samples].sort((a, b) => a - b) : []; const medianIndex = (sortedSamples.length - 1) / 2; const expectedMedian = sortedSamples.length ? sortedSamples.length % 2 ? sortedSamples[Math.floor(medianIndex)] : (sortedSamples[Math.floor(medianIndex)] + sortedSamples[Math.ceil(medianIndex)]) / 2 : null; const expectedP95 = sortedSamples.length ? sortedSamples[Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(sortedSamples.length * .95) - 1))] : null; const expectedScale = displayWidth !== null && displayHeight !== null ? Math.max(displayWidth / profile.width, displayHeight / profile.height) : null; const expectedMode = expectedScale === null ? null : expectedScale > 1.05 ? 'CSS upscale' : expectedScale < .95 ? 'CSS downscale' : 'native fit'; if (data.width !== profile.width || data.height !== profile.height || data.frameRate !== profile.cadence || !renderer || renderer.outputWidth !== profile.width || renderer.outputHeight !== profile.height || !samples || medianMs === null || p95Ms === null || medianMs > p95Ms || expectedMedian === null || expectedP95 === null || Math.abs(medianMs - expectedMedian) > .011 || Math.abs(p95Ms - expectedP95) > .011 || targetMs === null || Math.abs(targetMs - Number((1000 / profile.cadence).toFixed(2))) > .01 || displayWidth === null || displayHeight === null || pixelRatio === null || scale === null || !mode || expectedScale === null || Math.abs(scale - expectedScale) > .011 || mode !== expectedMode) throw new Error('Quality A/B measurement is malformed'); const status = p95Ms <= targetMs ? 'within-target' : 'over-target'; if (data.status !== status || (data.statusLabel !== undefined && data.statusLabel !== (status === 'within-target' ? 'Within target' : 'Over target'))) throw new Error('Quality A/B measurement status is inconsistent'); return { outputProfile: profile.id, width: profile.width, height: profile.height, frameRate: profile.cadence, renderer, samples, medianMs, p95Ms, status, statusLabel: status === 'within-target' ? 'Within target' : 'Over target', targetMs, display: { width: displayWidth, height: displayHeight, pixelRatio, scale, mode } };
}
function sanitizeQualityAB(data) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !['format', 'version', 'capturedAt', 'scene', 'preset', 'deviceLabel', 'full', 'hd'].includes(key)) || data.format !== qualityABFormat || data.version !== 1 || typeof data.capturedAt !== 'string' || data.capturedAt.length > 64 || !Number.isFinite(Date.parse(data.capturedAt)) || data.scene !== 'julia' || typeof data.preset !== 'string' || data.preset.length < 1 || data.preset.length > 120 || (data.deviceLabel !== undefined && typeof data.deviceLabel !== 'string')) throw new Error('Quality A/B evidence is malformed');
  const full = sanitizeQualityABMeasurement(data.full, qualityABProfileIds.full); const hd = sanitizeQualityABMeasurement(data.hd, qualityABProfileIds.hd); return { format: qualityABFormat, version: 1, capturedAt: data.capturedAt, scene: 'julia', preset: data.preset, deviceLabel: sanitizeDeviceLabel(data.deviceLabel), full, hd };
}
function qualityABDisplay() { const rect = canvas.getBoundingClientRect?.(); const width = Number.isFinite(Number(rect?.width)) && Number(rect.width) > 0 ? Math.round(Number(rect.width)) : canvas.width; const height = Number.isFinite(Number(rect?.height)) && Number(rect.height) > 0 ? Math.round(Number(rect.height)) : canvas.height; return { width, height, pixelRatio: displayPixelRatio(), scale: 1, mode: 'native fit' }; }
function qualityABMeasurementDisplay(profile) { const display = qualityABDisplay(); const scale = Math.max(display.width / profile.width, display.height / profile.height); return { ...display, scale: Number(scale.toFixed(3)), mode: scale > 1.05 ? 'CSS upscale' : scale < .95 ? 'CSS downscale' : 'native fit' }; }
function qualityABDisplayIsStale(probe) {
  const captured = probe?.full?.display;
  if (!captured || !Number.isInteger(captured.width) || !Number.isInteger(captured.height)) return false;
  const current = qualityABDisplay();
  const capturedPixelRatio = captured.pixelRatio === undefined ? 1 : Number(captured.pixelRatio);
  return captured.width !== current.width || captured.height !== current.height || !Number.isFinite(capturedPixelRatio) || Math.abs(capturedPixelRatio - current.pixelRatio) > .011;
}
function qualityABRendererText(measurement) {
  const renderer = measurement?.renderer || {};
  const backing = Number.isInteger(renderer.width) && Number.isInteger(renderer.height) ? `${renderer.width}×${renderer.height}` : 'size unknown';
  const output = Number.isInteger(measurement?.width) && Number.isInteger(measurement?.height) ? `${measurement.width}×${measurement.height}` : 'output size unknown';
  return backing === output ? backing : `${backing}→${output}`;
}
function qualityABRendererAria(measurement) {
  const renderer = measurement?.renderer || {};
  const backing = Number.isInteger(renderer.width) && Number.isInteger(renderer.height) ? `${renderer.width} by ${renderer.height}` : 'an unknown-size backing surface';
  const output = Number.isInteger(measurement?.width) && Number.isInteger(measurement?.height) ? `${measurement.width} by ${measurement.height}` : 'an unknown-size output canvas';
  return backing === output ? backing : `${backing} composited to ${output}`;
}
function qualityABEffectiveBackingScale(measurement) {
  const display = measurement?.display || {};
  const renderer = measurement?.renderer || {};
  const displayWidth = Number(display.width);
  const displayHeight = Number(display.height);
  const pixelRatio = Number.isFinite(Number(display.pixelRatio)) && Number(display.pixelRatio) > 0 ? Number(display.pixelRatio) : 1;
  const backingWidth = Number(renderer.width);
  const backingHeight = Number(renderer.height);
  if (!(displayWidth > 0) || !(displayHeight > 0) || !(backingWidth > 0) || !(backingHeight > 0)) return null;
  return Math.max(displayWidth * pixelRatio / backingWidth, displayHeight * pixelRatio / backingHeight);
}
function qualityABRecommendation(probe) {
  const full = probe?.full;
  const hd = probe?.hd;
  const fullScale = qualityABEffectiveBackingScale(full);
  const hdScale = qualityABEffectiveBackingScale(hd);
  const fullBacking = Number(full?.renderer?.width) * Number(full?.renderer?.height);
  const hdBacking = Number(hd?.renderer?.width) * Number(hd?.renderer?.height);
  if (hdBacking > fullBacking) {
    if (Number.isFinite(fullScale) && Number.isFinite(hdScale) && fullScale > 1.05 && fullScale - hdScale > .05) return ' · HD REDUCES UPSCALE';
    return ' · HD HIGHER DETAIL';
  }
  if (fullBacking > hdBacking) return ' · FULL HIGHER DETAIL';
  return ' · SAME BACKING DETAIL';
}
function qualityABRecommendationAria(probe) { if (!probe?.full || !probe?.hd) return ''; const recommendation = qualityABRecommendation(probe); return recommendation ? `quality A/B recommendation: ${recommendation.slice(3).toLowerCase()}` : ''; }
function syncQualityABReadout() {
  const output = $('qualityABReadout');
  if (!output) return;
  const probe = lastQualityABProbe || (importedRehearsalReport ? importedRehearsalReport.qualityAB : lastRehearsalReportQualityAB);
  const loaded = !lastQualityABProbe && Boolean(importedRehearsalReport?.qualityAB);
  const reopened = !lastQualityABProbe && !importedRehearsalReport && Boolean(lastRehearsalReportQualityAB);
  if (!probe) {
    output.removeAttribute?.('data-level');
    output.textContent = scene().id === 'julia' ? 'Quality A/B not captured · Full vs HD' : 'Quality A/B available on Julia';
    output.setAttribute('aria-label', scene().id === 'julia' ? 'Julia quality A/B has not been captured; compare Full and HD from this device' : 'Quality A/B is available when Julia is selected');
    return;
  }
  const full = probe.full;
  const hd = probe.hd;
  const fullRenderer = qualityABRendererText(full);
  const hdRenderer = qualityABRendererText(hd);
  const recommendation = qualityABRecommendation(probe);
  const pixelRatio = Number(full.display?.pixelRatio);
  const densitySuffix = Number.isFinite(pixelRatio) && Math.abs(pixelRatio - 1) > .05 ? ` · DPR ${pixelRatio.toFixed(1)}×` : '';
  const prefix = loaded ? 'Loaded A/B' : reopened ? 'Saved A/B' : 'A/B';
  const displayStale = qualityABDisplayIsStale(probe);
  const reportStale = loaded ? importedRehearsalReportStale : reopened ? rehearsalReportStale : false;
  const stale = reportStale || displayStale;
  const staleSuffix = stale ? ' · STALE' : '';
  output.dataset.level = stale ? 'stale' : 'fresh';
  output.textContent = `${prefix} ${full.renderer.path.toUpperCase()} ${fullRenderer} ${full.medianMs.toFixed(1)}ms · HD ${hd.renderer.path.toUpperCase()} ${hdRenderer} ${hd.medianMs.toFixed(1)}ms${densitySuffix}${recommendation}${staleSuffix}`;
  const staleAria = displayStale ? ' The live display size or density changed after capture, so this evidence is stale.' : stale ? ` The ${loaded ? 'loaded' : 'saved'} evidence is stale.` : '';
  output.setAttribute('aria-label', `${loaded ? 'Loaded ' : reopened ? 'Saved ' : ''}Julia quality A/B captured on ${probe.deviceLabel || 'this device'}${densitySuffix ? ` at device pixel ratio ${pixelRatio.toFixed(1)}` : ''}; Full ${qualityABRendererAria(full)}, ${full.renderer.path}, ${full.medianMs.toFixed(1)} millisecond median; HD ${qualityABRendererAria(hd)}, ${hd.renderer.path}, ${hd.medianMs.toFixed(1)} millisecond median${recommendation ? `; recommendation ${recommendation.slice(3).toLowerCase()}` : ''}${staleAria}`);
}
function syncQualityABControl() { const button = $('qualityABButton'); if (!button) return; const eligible = scene().id === 'julia' && !offlineFrameJob; button.disabled = !eligible; button.setAttribute('aria-disabled', String(!eligible)); button.title = eligible ? 'Capture a bounded Full versus HD Julia comparison' : 'Switch to Julia and stop offline rendering first'; }
function runQualityABProbe() {
  if (offlineJobActive()) return null;
  if (scene().id !== 'julia') { showToast('Choose Julia Observatory first'); return null; }
  if (state.setPlaying || state.blackout || state.renderingLost || audio.recorder || audio.recordingStream) { showToast('Pause the set, blackout, and recording before the quality probe'); return null; }
  const original = { quality: state.quality, elapsed: state.elapsed, cadenceAccumulator: state.cadenceAccumulator, paused: state.paused, blackout: state.blackout, renderingLost: state.renderingLost, transition: structuredClone(state.transition), dirty: state.dirty, activeRenderState: structuredClone(activeRenderState), flightPose: structuredClone(flightPose) };
  const savedMetrics = { profile: metricsProfile, frameTimes: [...metrics.frameTimes], sceneFrames: [...metrics.sceneFrames], sceneTimes: metrics.sceneTimes.map((values) => [...values]) };
  const measurements = {};
  const button = $('qualityABButton'); if (button) { button.disabled = true; button.textContent = 'Running…'; }
  const readout = $('qualityABReadout'); if (readout) readout.textContent = 'Quality A/B running · Full then HD';
  try {
    for (const [key, profileId] of Object.entries(qualityABProfileIds)) {
      state.quality = qualityForProfileId(profileId); applyOutputProfile(); const samples = []; let renderer = currentRendererEvidence();
      for (let index = 0; index < qualityABSampleCount; index += 1) { const started = performance.now(); drawPreview(); samples.push(Math.max(0, performance.now() - started)); renderer = currentRendererEvidence(); }
      measurements[key] = qualityABMeasurement(profileId, samples, renderer, qualityABMeasurementDisplay(qualityProfile(state.quality)));
    }
  } finally {
    state.quality = original.quality; state.elapsed = original.elapsed; state.cadenceAccumulator = original.cadenceAccumulator; state.paused = original.paused; state.blackout = original.blackout; state.renderingLost = original.renderingLost; state.transition = original.transition; flightPose = original.flightPose; applyOutputProfile(); metricsProfile = savedMetrics.profile; metrics.frameTimes = savedMetrics.frameTimes; metrics.sceneFrames = savedMetrics.sceneFrames; metrics.sceneTimes = savedMetrics.sceneTimes; if (!state.blackout && !state.renderingLost) drawPreview(); else { ctx.fillStyle = '#020207'; ctx.fillRect(0, 0, canvas.width, canvas.height); activeRenderState = original.activeRenderState; } state.dirty = original.dirty; $('qualityInput').value = state.quality; announce(); syncRendererReadout(); syncQualityABControl(); if (button) { button.textContent = 'Run Full / HD A/B'; button.disabled = scene().id !== 'julia' || Boolean(offlineFrameJob); } updatePerformanceReadout(performance.now());
  }
  const result = sanitizeQualityAB({ format: qualityABFormat, version: 1, capturedAt: new Date().toISOString(), scene: scene().id, preset: preset()[0], deviceLabel: state.deviceLabel, full: measurements.full, hd: measurements.hd }); lastQualityABProbe = result; syncQualityABReadout(); markRehearsalReportStale(); showToast('Julia Full / HD A/B captured · save a rehearsal report to keep it'); return structuredClone(result);
}
function syncSetTimingControl() {
  const button = $('setTimingButton');
  if (!button) return;
  const blocked = Boolean(offlineFrameJob || setTimingProbeActive || state.setPlaying || state.blackout || state.renderingLost || audio.recorder || audio.recordingStream);
  button.disabled = blocked;
  button.setAttribute('aria-disabled', String(blocked));
  button.title = blocked
    ? setTimingProbeActive ? 'The set timing probe is already running' : state.setPlaying ? 'Pause the cue set before measuring all scenes' : state.blackout ? 'Recover the stage before measuring all scenes' : state.renderingLost ? 'Wait for graphics recovery before measuring all scenes' : audio.recorder || audio.recordingStream ? 'Stop recording before measuring all scenes' : 'Wait for the offline render to finish'
    : `Measure all ${sceneDefs.length} visual families with warmed ${setTimingProbeSampleCount}-frame samples`;
}
function runSetTimingProbe() {
  if (offlineJobActive()) return null;
  if (setTimingProbeActive) return null;
  if (state.setPlaying || state.blackout || state.renderingLost || audio.recorder || audio.recordingStream) {
    showToast('Pause the set, recover blackout, and stop recording before the timing pass');
    return null;
  }
  const original = {
    sceneIndex: state.sceneIndex,
    elapsed: state.elapsed,
    cadenceAccumulator: state.cadenceAccumulator,
    paused: state.paused,
    blackout: state.blackout,
    renderingLost: state.renderingLost,
    transition: structuredClone(state.transition),
    dirty: state.dirty,
    gesture: structuredClone(state.gesture),
    lastTime: state.lastTime,
    activeRenderState: structuredClone(activeRenderState),
    flightPose: structuredClone(flightPose),
    flightCruise,
    flightBlocked,
    fractalError,
    previousBeatVisualPulse,
    beatVisualArmed,
    palette: structuredClone(palette),
    metricsProfile,
    frameTimes: [...metrics.frameTimes],
    sceneFrames: [...metrics.sceneFrames],
    sceneTimes: metrics.sceneTimes.map((values) => [...values]),
  };
  const profile = outputProfile();
  const button = $('setTimingButton');
  const output = $('performanceSetReadout');
  setTimingProbeActive = true;
  syncSetTimingControl();
  if (button) button.textContent = `Measuring 0/${sceneDefs.length}…`;
  if (output) {
    output.textContent = `Set timing probe running · 0/${sceneDefs.length} scenes`;
    output.setAttribute('aria-label', `Set timing probe running; zero of ${sceneDefs.length} visual families measured`);
  }
  let status = 'complete';
  let failure = null;
  try {
    metricsProfile = profile.id;
    metrics.frameTimes = [];
    metrics.sceneFrames = Array(sceneDefs.length).fill(0);
    metrics.sceneTimes = Array.from({ length: sceneDefs.length }, () => []);
    state.paused = true;
    state.transition = null;
    for (let index = 0; index < sceneDefs.length; index += 1) {
      const def = sceneDefs[index];
      state.sceneIndex = index;
      Object.assign(palette, scenePalettes[def.id]);
      fillPalette();
      for (let warmup = 0; warmup < setTimingProbeWarmupCount; warmup += 1) drawPreview();
      const samples = [];
      for (let sample = 0; sample < setTimingProbeSampleCount; sample += 1) {
        const started = performance.now();
        drawPreview();
        samples.push(Math.max(.01, performance.now() - started));
      }
      metrics.sceneTimes[index] = samples;
      metrics.sceneFrames[index] = samples.length;
      if (button) button.textContent = `Measuring ${index + 1}/${sceneDefs.length}…`;
      if (output) output.textContent = `Set timing probe running · ${index + 1}/${sceneDefs.length} scenes`;
    }
  } catch (error) {
    status = 'failed';
    failure = error;
  } finally {
    if (status === 'failed') {
      metricsProfile = original.metricsProfile;
      metrics.frameTimes = original.frameTimes;
      metrics.sceneFrames = original.sceneFrames;
      metrics.sceneTimes = original.sceneTimes;
    }
    state.sceneIndex = original.sceneIndex;
    state.elapsed = original.elapsed;
    state.cadenceAccumulator = original.cadenceAccumulator;
    state.paused = original.paused;
    state.blackout = original.blackout;
    state.renderingLost = original.renderingLost || state.renderingLost;
    state.transition = original.transition;
    state.gesture = original.gesture;
    state.lastTime = performance.now();
    flightPose = original.flightPose;
    flightCruise = original.flightCruise;
    flightBlocked = original.flightBlocked;
    fractalError = original.fractalError || fractalError;
    previousBeatVisualPulse = original.previousBeatVisualPulse;
    beatVisualArmed = original.beatVisualArmed;
    Object.assign(palette, original.palette);
    fillPalette();
    activeRenderState = original.activeRenderState;
    state.dirty = original.dirty;
    setTimingProbeActive = false;
    if (button) button.textContent = 'Measure 14 scenes';
    if (!state.blackout && !state.renderingLost) drawPreview();
    else { ctx.fillStyle = '#020207'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    announce();
    syncRendererReadout();
    syncSetTimingControl();
    updatePerformanceReadout(performance.now());
  }
  if (status === 'failed') {
    showToast(`Set timing probe failed · ${failure?.message || 'use the live readout instead'}`);
    return { status, sampledScenes: metrics.setSummary(profile).sampledScenes, totalScenes: sceneDefs.length, error: failure?.message || 'unknown error' };
  }
  const summary = metrics.setSummary(profile);
  markRehearsalReportStale();
  showToast(`Set timing captured · ${summary.sampledScenes}/${summary.totalScenes} visual families`);
  return { status, outputProfile: profile.id, sampleCount: summary.sampleCount, sampledScenes: summary.sampledScenes, totalScenes: summary.totalScenes, coverage: summary.coverage, summary: structuredClone(summary) };
}
function beatResponseCheckSnapshot() {
  const coverage = visualBeatResponseSnapshot().map(({ id, mapped, valid, band, response }) => ({ id, mapped, valid, band, response }));
  const pulsedEffects = beatDrivenEffects();
  const effectEvidence = beatResponseEffectKeys.map((key) => {
    const authored = Number(clamp(effectsForReportValue(effects, key), 0, 1).toFixed(3));
    const beat = Number(clamp(pulsedEffects[key], 0, 1).toFixed(3));
    return { key, authored, beat, boost: Number(Math.max(0, beat - authored).toFixed(3)) };
  });
  return { format: beatResponseFormat, version: 1, capturedAt: new Date().toISOString(), source: audioSourceKind(), pulse: beatResponsePulse, total: coverage.length, linked: coverage.filter((entry) => entry.mapped && entry.valid && entry.response >= .5).length, sharedEffectsLinked: beatResponseEffectKeys.every((key) => Number.isFinite(pulsedEffects[key]) && pulsedEffects[key] >= effectsForReportValue(effects, key)), coverage: coverage.map(({ id, mapped, band, response }) => ({ id, mapped, band, response })), effects: effectEvidence };
}
function effectsForReportValue(effectState, key) { return Number(effectState?.[key]) || 0; }
function sanitizeBeatResponseCheck(data) {
  if (data === undefined || data === null) return null;
  const allowed = new Set(['format', 'version', 'capturedAt', 'source', 'pulse', 'total', 'linked', 'sharedEffectsLinked', 'coverage', 'effects']);
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !allowed.has(key)) || data.format !== beatResponseFormat || data.version !== 1 || typeof data.capturedAt !== 'string' || data.capturedAt.length > 64 || !Number.isFinite(Date.parse(data.capturedAt)) || typeof data.source !== 'string' || !rehearsalAudioSources.has(data.source) || data.pulse !== beatResponsePulse || data.total !== sceneDefs.length || data.linked !== sceneDefs.length || data.sharedEffectsLinked !== true) throw new Error('Beat response evidence is malformed');
  if (!Array.isArray(data.coverage) || data.coverage.length !== sceneDefs.length) throw new Error('Beat response coverage is malformed');
  const coverage = data.coverage.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some((key) => !['id', 'mapped', 'band', 'response'].includes(key)) || entry.id !== sceneDefs[index].id || entry.mapped !== true || !['low', 'mid', 'high'].includes(entry.band) || entry.band !== audioMappings[entry.id]?.[0] || !Number.isFinite(entry.response) || entry.response < .5 || entry.response > 1 || !visualAudioCoverage()[index]?.valid) throw new Error('Beat response coverage is malformed');
    return { id: entry.id, mapped: true, band: entry.band, response: Number(entry.response) };
  });
  if (!Array.isArray(data.effects) || data.effects.length !== beatResponseEffectKeys.length) throw new Error('Beat response effect evidence is malformed');
  const effects = data.effects.map((entry, index) => {
    const key = beatResponseEffectKeys[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some((field) => !['key', 'authored', 'beat', 'boost'].includes(field)) || entry.key !== key || !Number.isFinite(entry.authored) || entry.authored < 0 || entry.authored > 1 || !Number.isFinite(entry.beat) || entry.beat < 0 || entry.beat > 1 || !Number.isFinite(entry.boost) || entry.boost < 0 || entry.boost > 1 || entry.beat + .011 < entry.authored || Math.abs(entry.boost - Math.max(0, entry.beat - entry.authored)) > .011) throw new Error('Beat response effect evidence is malformed');
    return { key, authored: Number(entry.authored), beat: Number(entry.beat), boost: Number(entry.boost) };
  });
  if (visualAudioCoverage().some((entry) => !entry.valid)) throw new Error('Beat response mapping is invalid');
  return { format: beatResponseFormat, version: 1, capturedAt: data.capturedAt, source: data.source, pulse: beatResponsePulse, total: sceneDefs.length, linked: sceneDefs.length, sharedEffectsLinked: true, coverage, effects };
}
function syncBeatResponseReadout() {
  const output = $('beatResponseReadout');
  if (!output) return;
  if (!lastBeatResponseCheck) {
    output.textContent = `Beat wiring check not run · ${sceneDefs.length} families`;
    output.setAttribute('aria-label', `Beat wiring check not run; ${sceneDefs.length} visual families are available for a bounded check`);
    return;
  }
  output.textContent = `Beat check ${lastBeatResponseCheck.linked}/${lastBeatResponseCheck.total} · ${lastBeatResponseCheck.source} · effects linked`;
  output.setAttribute('aria-label', `Beat wiring check captured ${lastBeatResponseCheck.linked} of ${lastBeatResponseCheck.total} visual families from ${lastBeatResponseCheck.source}; shared effects linked`);
}
function syncBeatResponseControl() {
  const button = $('beatResponseButton');
  if (!button) return;
  const disabled = Boolean(offlineFrameJob);
  button.disabled = disabled;
  button.setAttribute('aria-disabled', String(disabled));
  button.title = disabled ? 'Wait for the offline render to finish' : 'Check all visual beat-response mappings without changing the set';
}
function runBeatResponseCheck() {
  if (offlineJobActive()) return null;
  const original = { beatPulse: state.beatPulse, beatStep: state.beatStep, beatBar: state.beatBar };
  const button = $('beatResponseButton');
  if (button) { button.disabled = true; button.textContent = 'Checking…'; }
  const output = $('beatResponseReadout');
  if (output) output.textContent = 'Beat wiring check running · all families';
  let result;
  try {
    state.beatPulse = beatResponsePulse;
    state.beatStep = 0;
    state.beatBar = 0;
    result = sanitizeBeatResponseCheck(beatResponseCheckSnapshot());
    lastBeatResponseCheck = result;
    syncBeatResponseReadout();
    markRehearsalReportStale();
    showToast(`${result.linked}/${result.total} visuals beat-linked · check captured`);
  } finally {
    state.beatPulse = original.beatPulse;
    state.beatStep = original.beatStep;
    state.beatBar = original.beatBar;
    syncBeatReadout();
    syncBeatResponseControl();
    if (button) button.textContent = 'Run beat check';
  }
  return structuredClone(result);
}
function recordingMimeType() { if (typeof captureCanvas.captureStream !== 'function' || !window.MediaRecorder) return ''; const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']; if (typeof MediaRecorder.isTypeSupported !== 'function') return candidates[0]; return candidates.find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch { return false; } }) || ''; }
function syncRecordingMimeReadout() { const output = $('recordingMimeReadout'); if (!output) return; if (audio.recordingMime) { output.textContent = `WebM path · ${audio.recordingMime}`; output.setAttribute('aria-label', `Active WebM recording path ${audio.recordingMime}`); return; } if (!lastPreflightAt) { output.textContent = 'WebM path not checked'; output.setAttribute('aria-label', 'WebM recording path not checked'); return; } if (lastPreflightRecordingMime === undefined) { output.textContent = 'WebM path · not recorded'; output.setAttribute('aria-label', 'WebM recording path was not recorded in this cached check'); return; } if (lastPreflightRecordingMime) { output.textContent = `WebM path · ${lastPreflightRecordingMime}`; output.setAttribute('aria-label', `Accepted WebM recording path ${lastPreflightRecordingMime}`); } else { output.textContent = 'WebM path · none accepted'; output.setAttribute('aria-label', 'No WebM recording MIME path was accepted'); } }
function syncRecordingOutcome() { const output = $('recordingStatus'); if (!output) return; const label = recordingOutcomeLabels[recordingOutcome] || recordingOutcomeLabels.idle; if (output.textContent !== label) output.textContent = label; output.setAttribute('aria-label', label); }
function setRecordingOutcome(next) { recordingOutcome = recordingOutcomes.has(next) ? next : 'idle'; syncRecordingOutcome(); syncReadinessStatus(); }
function audioSourceHistoryKinds() { return [...new Set(audioSourceEvents.map((event) => event.source).filter((source) => rehearsalAudioSources.has(source) && source !== 'NO AUDIO'))]; }
function syncAudioSourceHistoryReadout() {
  const outputs = [$('audioSourceHistoryReadout'), $('rehearsalSourceHistoryReadout')].filter(Boolean);
  if (!outputs.length) return;
  const kinds = audioSourceHistoryKinds();
  const countLabel = `${kinds.length} ${kinds.length === 1 ? 'PATH' : 'PATHS'}`;
  const detail = kinds.length > 1 ? `${kinds.join(' · ')} · MULTIPLE PATHS SEEN` : kinds.length ? kinds[0] : 'SWITCHING NOT OBSERVED';
  const text = `SOURCE HISTORY · ${countLabel} · ${detail}`;
  const aria = kinds.length > 1 ? `Source history includes ${kinds.length} paths seen or attempted: ${kinds.join(', ')}. Multiple source paths are present in this local history; this does not prove that each path became active.` : kinds.length === 1 ? `Source history includes one path seen or attempted: ${kinds[0]}. Source switching is not observed yet.` : 'No audio source paths are in history; source switching is not observed yet.';
  for (const output of outputs) { output.textContent = text; output.setAttribute('aria-label', aria); output.dataset.paths = String(kinds.length); }
}
function syncAudioSourceOutcome() { const output = $('audioOutcomeReadout'); if (!output) return; const label = audioSourceOutcomeLabels[audioSourceOutcome] || audioSourceOutcomeLabels.idle; if (output.textContent !== label) output.textContent = label; output.setAttribute('aria-label', label); syncAudioSourceHistoryReadout(); }
function setAudioSourceOutcome(next, source = audioSourceKind()) { audioSourceOutcome = audioSourceOutcomes.has(next) ? next : 'idle'; recordAudioSourceEvent(source, audioSourceOutcome); syncAudioSourceOutcome(); syncBeatTelemetryReadout(); syncStartAudioControl(); syncReadinessStatus(); }
const preflightLabels = { audioApi: 'Audio API', microphone: 'Microphone API', tabAudio: 'Tab-audio API', recording: 'WebM recording', pngFolder: 'PNG folder output', localSave: 'Local save', webglApi: 'WebGL API' };
const preflightFallbacks = { audioApi: 'Use visual controls only', microphone: 'Use Demo beat or local audio', tabAudio: 'Use Demo beat or local audio', recording: 'Use Capture still or Render PNGs', pngFolder: 'Use Frame plan or WebM', localSave: 'Export JSON for a file backup', webglApi: 'Choose a 2D scene' };
const rehearsalCheckIds = { microphone: 'observedMicCheck', tabAudio: 'observedTabCheck', recording: 'observedRecordingCheck', pngFolder: 'observedPngCheck', performance: 'observedPerformanceCheck' };
const rehearsalCheckLabels = { microphone: 'Microphone', tabAudio: 'Tab audio', recording: 'Recording', pngFolder: 'PNG folder', performance: 'Performance' };
const rehearsalEvidenceStatusLabels = { 'not-started': 'Not started', 'in-progress': 'In progress', complete: 'Complete' };
function sanitizeRehearsalChecks(data) { const keys = Object.keys(rehearsalCheckIds); if (data === undefined || data === null) return Object.fromEntries(keys.map((key) => [key, false])); if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !keys.includes(key)) || keys.some((key) => data[key] !== undefined && typeof data[key] !== 'boolean')) throw new Error('Observed rehearsal checks are malformed'); return Object.fromEntries(keys.map((key) => [key, data[key] === true])); }
function sanitizeRehearsalChecksAt(value) { if (value === undefined || value === null || value === '') return null; if (typeof value !== 'string' || value.length > 64 || !Number.isFinite(Date.parse(value))) throw new Error('Observed rehearsal timestamp is malformed'); return value; }
function rehearsalEvidenceStatusFor(checks) { const keys = Object.keys(rehearsalCheckIds); const completed = keys.filter((key) => checks[key]).length; const id = completed === 0 ? 'not-started' : completed === keys.length ? 'complete' : 'in-progress'; return { status: id, label: rehearsalEvidenceStatusLabels[id], completed, total: keys.length }; }
function rehearsalEvidenceStatus() { return rehearsalEvidenceStatusFor(state.rehearsalChecks); }
function rehearsalPassSummaryFromEvidence({ source, sourceStatus, audio, performance, visual, observed }) {
  const issues = [];
  if (source === 'NO AUDIO' || sourceStatus !== 'active') issues.push('audio source');
  if (!audio.sampleCount) issues.push('audio run');
  else if (audio.durationSeconds < rehearsalMinimumAudioSeconds) issues.push('20m audio run');
  if (audio.headroom < .08) issues.push('headroom');
  if (performance.coverage !== 'complete') issues.push('visual timing');
  else if (performance.status === 'over-target') issues.push('performance');
  if (visual.linked < visual.total) issues.push('visual beat links');
  if (observed.status !== 'complete') issues.push('observed checks');
  const attention = ['failed', 'ended', 'empty'].includes(sourceStatus) || audio.headroom < .08 || performance.status === 'over-target';
  const status = attention ? 'attention' : issues.length ? 'in-progress' : 'ready';
  return { status, label: status === 'ready' ? 'Ready' : status === 'attention' ? 'Attention' : 'In progress', source, sourceStatus, audio: { sampleCount: audio.sampleCount, durationSeconds: audio.durationSeconds, headroom: audio.headroom, holdMax: audio.holdMax, capped: audio.capped }, visual: { linked: visual.linked, total: visual.total }, performance: { sampledScenes: performance.sampledScenes, totalScenes: performance.totalScenes, unmeasuredScenes: performance.unmeasuredScenes, coverage: performance.coverage, status: performance.status, p95Ms: performance.p95Ms }, observed, issues };
}
function rehearsalPassSummary(performanceOverride = null) {
  const coverage = visualAudioCoverage();
  const audio = audioPeakSessionTelemetry();
  const performance = performanceOverride || metrics.setSummary();
  const observed = rehearsalEvidenceStatus();
  return rehearsalPassSummaryFromEvidence({ source: audioSourceKind(), sourceStatus: audioSourceOutcome, audio, performance, visual: { linked: coverage.filter((entry) => entry.mapped && entry.valid).length, total: coverage.length }, observed });
}
const rehearsalPassStatuses = new Set(['ready', 'attention', 'in-progress']);
const rehearsalPassStatusLabels = { ready: 'Ready', attention: 'Attention', 'in-progress': 'In progress' };
const rehearsalPassIssueLabels = new Set(['audio source', 'audio run', '20m audio run', 'headroom', 'visual timing', 'performance', 'visual beat links', 'observed checks']);
function sanitizeRehearsalPassSnapshot(data, context = null) {
  if (data === undefined || data === null) return null;
  const allowed = ['status', 'label', 'source', 'sourceStatus', 'audio', 'visual', 'performance', 'observed', 'issues'];
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !allowed.includes(key))) throw new Error('Rehearsal report pass snapshot is malformed');
  const status = rehearsalPassStatuses.has(data.status) ? data.status : null;
  const label = typeof data.label === 'string' && data.label === rehearsalPassStatusLabels[data.status] ? data.label : null;
  const source = typeof data.source === 'string' && rehearsalAudioSources.has(data.source) ? data.source : null;
  const sourceStatus = typeof data.sourceStatus === 'string' && audioSourceOutcomes.has(data.sourceStatus) ? data.sourceStatus : null;
  const audio = data.audio;
  const audioAllowed = ['sampleCount', 'durationSeconds', 'headroom', 'holdMax', 'capped'];
  const safeAudio = audio && typeof audio === 'object' && !Array.isArray(audio) && !Object.keys(audio).some((key) => !audioAllowed.includes(key)) ? {
    sampleCount: Number.isInteger(audio.sampleCount) && audio.sampleCount >= 0 && audio.sampleCount <= maxAudioPeakSessionSamples ? audio.sampleCount : null,
    durationSeconds: Number.isFinite(audio.durationSeconds) && audio.durationSeconds >= 0 && audio.durationSeconds <= 7200 ? Number(audio.durationSeconds) : null,
    headroom: Number.isFinite(audio.headroom) && audio.headroom >= 0 && audio.headroom <= 1 ? Number(audio.headroom) : null,
    holdMax: Number.isFinite(audio.holdMax) && audio.holdMax >= 0 && audio.holdMax <= 1 ? Number(audio.holdMax) : null,
    capped: typeof audio.capped === 'boolean' ? audio.capped : null,
  } : null;
  const visual = data.visual;
  const visualAllowed = ['linked', 'total'];
  const safeVisual = visual && typeof visual === 'object' && !Array.isArray(visual) && !Object.keys(visual).some((key) => !visualAllowed.includes(key)) ? {
    linked: Number.isInteger(visual.linked) && visual.linked >= 0 && visual.linked <= sceneDefs.length ? visual.linked : null,
    total: Number.isInteger(visual.total) && visual.total === sceneDefs.length ? visual.total : null,
  } : null;
  const performance = data.performance;
  const performanceAllowed = ['sampledScenes', 'totalScenes', 'unmeasuredScenes', 'coverage', 'status', 'p95Ms'];
  const safePerformance = performance && typeof performance === 'object' && !Array.isArray(performance) && !Object.keys(performance).some((key) => !performanceAllowed.includes(key)) ? {
    sampledScenes: Number.isInteger(performance.sampledScenes) && performance.sampledScenes >= 0 && performance.sampledScenes <= sceneDefs.length ? performance.sampledScenes : null,
    totalScenes: Number.isInteger(performance.totalScenes) && performance.totalScenes === sceneDefs.length ? performance.totalScenes : null,
    unmeasuredScenes: Number.isInteger(performance.unmeasuredScenes) && performance.unmeasuredScenes >= 0 && performance.unmeasuredScenes <= sceneDefs.length ? performance.unmeasuredScenes : null,
    coverage: performance.coverage === 'partial' || performance.coverage === 'complete' ? performance.coverage : null,
    status: ['warming-up', 'within-target', 'over-target'].includes(performance.status) ? performance.status : null,
    p95Ms: performance.p95Ms === null ? null : Number.isFinite(performance.p95Ms) && performance.p95Ms >= 0 && performance.p95Ms <= 60000 ? Number(performance.p95Ms) : null,
  } : null;
  const observed = data.observed;
  const observedAllowed = ['status', 'label', 'completed', 'total'];
  const safeObserved = observed && typeof observed === 'object' && !Array.isArray(observed) && !Object.keys(observed).some((key) => !observedAllowed.includes(key)) ? {
    status: ['not-started', 'in-progress', 'complete'].includes(observed.status) ? observed.status : null,
    label: typeof observed.label === 'string' && observed.label === rehearsalEvidenceStatusLabels[observed.status] ? observed.label : null,
    completed: Number.isInteger(observed.completed) && observed.completed >= 0 && observed.completed <= Object.keys(rehearsalCheckIds).length ? observed.completed : null,
    total: Number.isInteger(observed.total) && observed.total === Object.keys(rehearsalCheckIds).length ? observed.total : null,
  } : null;
  const issues = Array.isArray(data.issues) && data.issues.length <= 8 && data.issues.every((issue) => typeof issue === 'string' && rehearsalPassIssueLabels.has(issue)) ? [...data.issues] : null;
  const malformed = !status || !label || !source || !sourceStatus || !safeAudio || Object.values(safeAudio).some((value) => value === null) || safeAudio && Math.abs(safeAudio.headroom - (1 - safeAudio.holdMax)) > .011 || safeAudio && safeAudio.sampleCount === 0 && (safeAudio.durationSeconds !== 0 || safeAudio.headroom !== 1 || safeAudio.holdMax !== 0 || safeAudio.capped) || !safeVisual || Object.values(safeVisual).some((value) => value === null) || safeVisual.linked > safeVisual.total || !safePerformance || Object.entries(safePerformance).some(([key, value]) => key !== 'p95Ms' && value === null) || safePerformance.unmeasuredScenes !== safePerformance.totalScenes - safePerformance.sampledScenes || safePerformance.coverage !== (safePerformance.sampledScenes === safePerformance.totalScenes ? 'complete' : 'partial') || safePerformance.status === 'warming-up' && safePerformance.p95Ms !== null || safePerformance.status !== 'warming-up' && safePerformance.p95Ms === null || !safeObserved || Object.values(safeObserved).some((value) => value === null) || safeObserved.completed > safeObserved.total || safeObserved.status !== rehearsalEvidenceStatusFor(Object.fromEntries(Object.keys(rehearsalCheckIds).map((key, index) => [key, index < safeObserved.completed]))).status || !issues || new Set(issues).size !== issues.length || (status === 'ready' && issues.length);
  if (malformed) throw new Error('Rehearsal report pass snapshot is malformed');
  const candidate = { status, label, source, sourceStatus, audio: safeAudio, visual: safeVisual, performance: safePerformance, observed: safeObserved, issues };
  if (context) {
    if (!context.audio?.peakSession || !context.performanceSet || !context.observedEvidence) throw new Error('Rehearsal report pass snapshot is inconsistent');
    const coverage = visualAudioCoverage();
    const expected = rehearsalPassSummaryFromEvidence({ source: context.audio.source, sourceStatus: context.audio.status, audio: context.audio.peakSession, performance: context.performanceSet, visual: { linked: coverage.filter((entry) => entry.mapped && entry.valid).length, total: coverage.length }, observed: context.observedEvidence });
    if (JSON.stringify(candidate) !== JSON.stringify(expected)) throw new Error('Rehearsal report pass snapshot is inconsistent');
  }
  return candidate;
}
function syncRehearsalPassReadout(force = false, performanceOverride = null) {
  const output = $('rehearsalPassReadout');
  if (!output) return;
  const now = Number(performance.now()) || 0;
  if (!force && now - lastRehearsalPassReadoutPaint < 500) return;
  lastRehearsalPassReadoutPaint = now;
  const summary = rehearsalPassSummary(performanceOverride);
  const text = rehearsalPassDisplayText(summary);
  if (output.textContent !== text) output.textContent = text;
  output.setAttribute('aria-label', rehearsalPassDisplayAria(summary));
  output.dataset.level = summary.status;
}
function rehearsalPassDisplayText(summary, prefix = 'PASS') {
  const audioText = summary.audio.sampleCount ? `${formatSetTime(summary.audio.durationSeconds)} / ${formatSetTime(rehearsalMinimumAudioSeconds)} run · ${Math.round(summary.audio.headroom * 100)}% headroom` : `no audio run / ${formatSetTime(rehearsalMinimumAudioSeconds)} target`;
  const timingText = summary.performance.sampledScenes === 0 ? `0/${summary.performance.totalScenes} timing warmup` : `${summary.performance.sampledScenes}/${summary.performance.totalScenes} timing ${summary.performance.status === 'over-target' ? 'over target' : summary.performance.coverage === 'complete' ? 'within target' : 'partial'}`;
  return `${prefix} ${summary.label.toUpperCase()} · ${summary.source} · ${audioText} · ${summary.visual.linked}/${summary.visual.total} visuals · ${timingText} · ${summary.observed.completed}/${summary.observed.total} observed`;
}
function rehearsalPassDisplayAria(summary) {
  const audioText = summary.audio.sampleCount ? `${formatSetTime(summary.audio.durationSeconds)} of ${formatSetTime(rehearsalMinimumAudioSeconds)} run; ${Math.round(summary.audio.headroom * 100)} percent headroom` : `no audio run; ${formatSetTime(rehearsalMinimumAudioSeconds)} target`;
  const issueText = summary.issues.length ? ` Remaining: ${summary.issues.join(', ')}.` : ' All local rehearsal gates are recorded.';
  return `Rehearsal pass ${summary.label.toLowerCase()}; source ${summary.source}; ${audioText}; ${summary.visual.linked} of ${summary.visual.total} visual families beat-linked; ${summary.performance.sampledScenes} of ${summary.performance.totalScenes} visual families timed; ${summary.observed.completed} of ${summary.observed.total} manual observations recorded.${issueText} This is local rehearsal evidence, not device certification.`;
}
function rehearsalReportImportPassContext(report) {
  if (!report?.capturedAt) return '';
  const stamp = rehearsalReportImportCaptureStamp(report);
  if (!stamp) return '';
  const device = report.deviceLabel ? ` · setup ${report.deviceLabel}` : '';
  return ` · captured ${stamp}${device}`;
}
function rehearsalReportImportPassContextAria(report) {
  if (!report?.capturedAt) return '';
  const stamp = rehearsalReportImportCaptureStamp(report);
  if (!stamp) return '';
  return ` Captured at ${stamp}.${report.deviceLabel ? ` Setup ${report.deviceLabel}.` : ''}`;
}
function rehearsalReportImportCaptureStamp(report) {
  const date = new Date(report?.capturedAt);
  if (!report?.capturedAt || !Number.isFinite(date.getTime())) return '';
  try { return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace('T', ' '); } catch { return ''; }
}
function rehearsalReportImportDisplayStamp(report) { return rehearsalReportImportCaptureStamp(report) || preflightTimestamp(new Date(report?.capturedAt)); }
function syncObservedChecksReadout() { const output = $('observedChecksReadout'); if (!output) return; const keys = Object.keys(rehearsalCheckIds); const total = keys.length; const passed = keys.filter((key) => state.rehearsalChecks[key]).length; const remaining = keys.filter((key) => !state.rehearsalChecks[key]).map((key) => rehearsalCheckLabels[key]); const evidence = rehearsalEvidenceStatus(); output.textContent = `${passed}/${total} observed checks recorded`; const next = $('observedChecksNext'); if (next) next.textContent = remaining.length ? `Evidence ${evidence.label.toLowerCase()} · remaining: ${remaining.join(' · ')}` : `Evidence ${evidence.label.toLowerCase()} · all observed checks recorded`; const stamp = $('observedChecksTimestamp'); if (stamp) stamp.textContent = state.rehearsalChecksAt ? `Updated ${preflightTimestamp(new Date(state.rehearsalChecksAt))}` : 'Not recorded'; output.setAttribute('aria-label', `Evidence ${evidence.label.toLowerCase()}. ${passed} of ${total} observed checks recorded. ${remaining.length ? `Remaining: ${remaining.join(', ')}. ` : ''}${state.rehearsalChecksAt ? `Last updated ${preflightTimestamp(new Date(state.rehearsalChecksAt))}. ` : ''}Manual outcomes only, not browser API proof.`); syncRehearsalPassReadout(true); }
function resetObservedChecks() { if (offlineJobActive()) return false; const keys = Object.keys(rehearsalCheckIds); if (keys.every((key) => !state.rehearsalChecks[key]) && !state.rehearsalChecksAt) return false; state.rehearsalChecks = Object.fromEntries(keys.map((key) => [key, false])); state.rehearsalChecksAt = null; for (const id of Object.values(rehearsalCheckIds)) { const check = $(id); if (check) check.checked = false; } syncObservedChecksReadout(); markDirty(false, false); showToast('Observed checks reset · run the device pass again'); return true; }
function renderPreflightChecklist(report) { const checklist = $('preflightChecklist'); if (!checklist) return; checklist.innerHTML = Object.entries(report).map(([key, available]) => `<li class="${available ? 'preflight-ok' : 'preflight-fallback'}"><span aria-hidden="true">${available ? '✓' : '!'}</span><span>${preflightLabels[key]} · ${available ? 'available' : 'fallback'}</span>${available ? '' : `<span class="preflight-detail">Fallback: ${preflightFallbacks[key]}</span>`}</li>`).join(''); checklist.hidden = false; }
function preflightTimestamp(date = new Date()) { try { return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date); } catch { return date.toISOString().slice(11, 19); } }
function localSaveAvailable() { const key = 'phosphor-preflight-probe-v1'; let storage = null; let previous = null; let touched = false; try { storage = window.localStorage; if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') return false; previous = storage.getItem(key); storage.setItem(key, 'ok'); touched = true; const available = storage.getItem(key) === 'ok'; if (previous === null) storage.removeItem(key); else storage.setItem(key, previous); touched = false; return available; } catch { if (touched) { try { if (previous === null) storage.removeItem(key); else storage.setItem(key, previous); } catch {} } return false; } }
function usableWebglContext() {
  if (typeof document?.createElement !== 'function') return false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext?.('webgl', { alpha: false, antialias: false }) || probe.getContext?.('experimental-webgl');
    return Boolean(gl && typeof gl.createShader === 'function' && !(typeof gl.isContextLost === 'function' && gl.isContextLost()));
  } catch { return false; }
}
function preflightReport() {
  const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
  return { audioApi: Boolean(window.AudioContext || window.webkitAudioContext), microphone: Boolean(mediaDevices?.getUserMedia), tabAudio: Boolean(mediaDevices?.getDisplayMedia), recording: Boolean(recordingMimeType()), pngFolder: Boolean(window.showDirectoryPicker), localSave: localSaveAvailable(), webglApi: usableWebglContext() };
}
function runPreflight() { if (offlineJobActive()) return null; markRehearsalReportStale(); const report = preflightReport(); const missing = Object.entries(report).filter(([, available]) => !available).map(([key]) => preflightLabels[key]); const status = missing.length ? `Fallbacks needed · ${missing.join(', ')}` : 'All browser APIs available'; lastPreflightReport = structuredClone(report); lastPreflightRecordingMime = recordingMimeType() || null; lastPreflightAt = new Date().toISOString(); $('preflightReadout').textContent = status; $('preflightTimestamp').textContent = `Checked ${preflightTimestamp()}`; syncRecordingMimeReadout(); renderPreflightChecklist(report); showToast(status); return report; }
function rehearsalReport() { const profile = outputProfile(); const timing = metrics.summary(state.sceneIndex); const performance = { ...timing, ...performanceTargetSummary(timing, profile), heapUsedBytes: Number.isFinite(globalThis.performance?.memory?.usedJSHeapSize) ? globalThis.performance.memory.usedJSHeapSize : null }; const performanceSet = metrics.setSummary(profile); const passSnapshot = rehearsalPassSummary(performanceSet); const totalBars = cues.reduce((sum, cue) => sum + cue.duration, 0); const activeCue = state.currentCue >= 0 ? cues[state.currentCue] : null; return { format: 'phosphor-rehearsal-report-v1', version: 1, capturedAt: new Date().toISOString(), environment: rehearsalEnvironment(), renderer: currentRendererEvidence(), qualityAB: lastQualityABProbe ? structuredClone(lastQualityABProbe) : null, beatResponse: lastBeatResponseCheck ? structuredClone(lastBeatResponseCheck) : null, setName: state.setName, notes: state.rehearsalNotes, observedChecks: { ...state.rehearsalChecks }, observedChecksAt: state.rehearsalChecksAt, observedEvidence: rehearsalEvidenceStatus(), scene: scene().id, sceneName: scene().name, sceneIndex: state.sceneIndex, preset: preset()[0], outputProfile: profile.id, width: profile.width, height: profile.height, frameRate: profile.cadence, readiness: $('readinessReadout')?.textContent || '', recordingMimeType: audio.recordingMime || (lastPreflightRecordingMime ?? null), recordingStatus: recordingOutcome, set: { cueCount: cues.length, totalBars, playing: state.setPlaying, complete: state.setComplete, progress: $('setProgress')?.textContent || '', currentCue: activeCue ? { index: state.currentCue, label: activeCue.label, scene: sceneDefs[activeCue.scene].id, preset: sceneDefs[activeCue.scene].presets[activeCue.preset][0], duration: activeCue.duration } : null }, cuePlan: cues.map((cue, index) => ({ index, label: cue.label, scene: sceneDefs[cue.scene].id, preset: sceneDefs[cue.scene].presets[cue.preset][0], duration: cue.duration })), preflight: lastPreflightReport ? structuredClone(lastPreflightReport) : null, preflightCheckedAt: lastPreflightAt, performance, performanceSet, passSnapshot, audio: { source: audioSourceKind(), status: audioSourceOutcome, history: structuredClone(audioSourceEvents), bands: structuredClone(state.audioBands), bandsReady: state.audioBandsReady, peak: audioPeakTelemetry(), peakSession: audioPeakSessionTelemetry(), beat: beatTelemetry() } }; }
const rehearsalAudioSources = new Set(['FILE', 'MIC', 'TAB AUDIO', 'DEMO', 'NO AUDIO']);
const rehearsalPerformanceStatusLabels = { 'warming-up': 'Warming up', 'within-target': 'Within target', 'over-target': 'Over target' };
function sanitizeRehearsalPerformance(data, profileId) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Rehearsal report performance is malformed');
  const sampleCount = Number.isInteger(data.sampleCount) && data.sampleCount >= 0 && data.sampleCount <= 240 ? data.sampleCount : null;
  const sceneFrames = Number.isInteger(data.sceneFrames) && data.sceneFrames >= 0 && data.sceneFrames <= 1000000000 ? data.sceneFrames : null;
  const medianMs = data.medianMs === null ? null : Number.isFinite(data.medianMs) && data.medianMs >= 0 && data.medianMs <= 60000 ? Number(data.medianMs) : null;
  const p95Ms = data.p95Ms === null ? null : Number.isFinite(data.p95Ms) && data.p95Ms >= 0 && data.p95Ms <= 60000 ? Number(data.p95Ms) : null;
  const targetMs = Number.isFinite(data.targetMs) && data.targetMs > 0 && data.targetMs <= 1000 ? Number(data.targetMs) : null;
  const heapUsedBytes = data.heapUsedBytes === null ? null : Number.isSafeInteger(data.heapUsedBytes) && data.heapUsedBytes >= 0 ? data.heapUsedBytes : null;
  if (sampleCount === null || sceneFrames === null || targetMs === null || (sampleCount === 0 ? medianMs !== null || p95Ms !== null : medianMs === null || p95Ms === null) || (medianMs !== null && p95Ms !== null && medianMs > p95Ms)) throw new Error('Rehearsal report performance is malformed');
  const expectedTargetMs = profileId === '480x300' ? 33.33 : 16.67;
  if (Math.abs(targetMs - expectedTargetMs) > .01) throw new Error('Rehearsal report performance target is inconsistent');
  const status = sampleCount === 0 ? 'warming-up' : p95Ms <= targetMs ? 'within-target' : 'over-target';
  if (data.status !== status || (data.statusLabel !== undefined && data.statusLabel !== rehearsalPerformanceStatusLabels[status])) throw new Error('Rehearsal report performance status is inconsistent');
  return { sampleCount, medianMs, p95Ms, sceneFrames, status, statusLabel: rehearsalPerformanceStatusLabels[status], targetMs, heapUsedBytes };
}
function sanitizeRehearsalPerformanceSet(data, profileId) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !['sampleCount', 'medianMs', 'p95Ms', 'sceneFrames', 'sampledScenes', 'totalScenes', 'unmeasuredScenes', 'coverage', 'worstScene', 'status', 'statusLabel', 'targetMs'].includes(key))) throw new Error('Rehearsal report set performance is malformed');
  const maxSamples = sceneDefs.length * 240;
  const sampleCount = Number.isInteger(data.sampleCount) && data.sampleCount >= 0 && data.sampleCount <= maxSamples ? data.sampleCount : null;
  const sceneFrames = Number.isInteger(data.sceneFrames) && data.sceneFrames >= 0 && data.sceneFrames <= 1000000000 ? data.sceneFrames : null;
  const sampledScenes = Number.isInteger(data.sampledScenes) && data.sampledScenes >= 0 && data.sampledScenes <= sceneDefs.length ? data.sampledScenes : null;
  const totalScenes = Number.isInteger(data.totalScenes) && data.totalScenes === sceneDefs.length ? data.totalScenes : null;
  const unmeasuredScenes = Number.isInteger(data.unmeasuredScenes) && data.unmeasuredScenes >= 0 && data.unmeasuredScenes <= sceneDefs.length ? data.unmeasuredScenes : null;
  const medianMs = data.medianMs === null ? null : Number.isFinite(data.medianMs) && data.medianMs >= 0 && data.medianMs <= 60000 ? Number(data.medianMs) : null;
  const p95Ms = data.p95Ms === null ? null : Number.isFinite(data.p95Ms) && data.p95Ms >= 0 && data.p95Ms <= 60000 ? Number(data.p95Ms) : null;
  const targetMs = Number.isFinite(data.targetMs) && data.targetMs > 0 && data.targetMs <= 1000 ? Number(data.targetMs) : null;
  if (sampleCount === null || sceneFrames === null || sampledScenes === null || totalScenes === null || unmeasuredScenes === null || unmeasuredScenes !== totalScenes - sampledScenes || (sampledScenes === 0 ? sampleCount !== 0 || medianMs !== null || p95Ms !== null : sampleCount < sampledScenes || medianMs === null || p95Ms === null) || (medianMs !== null && p95Ms !== null && medianMs > p95Ms) || targetMs === null) throw new Error('Rehearsal report set performance is malformed');
  const expectedTargetMs = profileId === '480x300' ? 33.33 : 16.67;
  if (Math.abs(targetMs - expectedTargetMs) > .01) throw new Error('Rehearsal report set performance target is inconsistent');
  const coverage = sampledScenes === totalScenes ? 'complete' : 'partial';
  const status = sampledScenes === 0 ? 'warming-up' : p95Ms <= targetMs ? 'within-target' : 'over-target';
  if (data.coverage !== coverage || data.status !== status || (data.statusLabel !== undefined && data.statusLabel !== rehearsalPerformanceStatusLabels[status])) throw new Error('Rehearsal report set performance status is inconsistent');
  let worstScene = null;
  if (data.worstScene !== null && data.worstScene !== undefined) {
    const candidate = data.worstScene;
    const def = sceneDefs.find((entry) => entry.id === candidate?.id);
    if (!def || !Number.isInteger(candidate.index) || candidate.index !== sceneDefs.indexOf(def) || candidate.name !== def.name || !Number.isInteger(candidate.sampleCount) || candidate.sampleCount < 1 || candidate.sampleCount > 240 || !Number.isFinite(candidate.p95Ms) || candidate.p95Ms < 0 || candidate.p95Ms > 60000 || Math.abs(candidate.p95Ms - p95Ms) > .01) throw new Error('Rehearsal report set performance worst scene is malformed');
    worstScene = { id: def.id, name: def.name, index: candidate.index, sampleCount: candidate.sampleCount, p95Ms: Number(candidate.p95Ms) };
  }
  if ((sampledScenes === 0 && worstScene !== null) || (sampledScenes > 0 && worstScene === null)) throw new Error('Rehearsal report set performance worst scene is inconsistent');
  return { sampleCount, medianMs, p95Ms, sceneFrames, sampledScenes, totalScenes, unmeasuredScenes, coverage, worstScene, status, statusLabel: rehearsalPerformanceStatusLabels[status], targetMs };
}
const rehearsalRendererPaths = new Set(['webgl', 'cpu', 'canvas-2d', 'warming-up', 'unavailable']);
function sanitizeRehearsalRenderer(data) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !['path', 'width', 'height', 'outputWidth', 'outputHeight'].includes(key)) || !rehearsalRendererPaths.has(data.path)) throw new Error('Rehearsal report renderer is malformed');
  const dimension = (value, nullable = false) => nullable && value === null ? null : Number.isInteger(value) && value >= 1 && value <= 4096 ? value : null;
  const width = dimension(data.width, true), height = dimension(data.height, true), outputWidth = dimension(data.outputWidth), outputHeight = dimension(data.outputHeight);
  if ((data.path === 'webgl' || data.path === 'cpu' || data.path === 'canvas-2d') && (width === null || height === null) || outputWidth === null || outputHeight === null) throw new Error('Rehearsal report renderer is malformed');
  return { path: data.path, width, height, outputWidth, outputHeight };
}
function sanitizeRehearsalEnvironment(data) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !['userAgent', 'language', 'viewport', 'devicePixelRatio', 'hardwareConcurrency', 'maxTouchPoints'].includes(key))) throw new Error('Rehearsal report environment is malformed');
  const userAgent = data.userAgent === null ? null : typeof data.userAgent === 'string' && data.userAgent.length <= 240 ? data.userAgent : null;
  const language = data.language === null ? null : typeof data.language === 'string' && data.language.length <= 32 ? data.language : null;
  const viewport = data.viewport;
  const width = Number.isInteger(viewport?.width) && viewport.width >= 1 && viewport.width <= 32768 ? viewport.width : null;
  const height = Number.isInteger(viewport?.height) && viewport.height >= 1 && viewport.height <= 32768 ? viewport.height : null;
  const devicePixelRatio = Number.isFinite(data.devicePixelRatio) && data.devicePixelRatio >= .1 && data.devicePixelRatio <= 8 ? Number(data.devicePixelRatio) : null;
  const hardwareConcurrency = data.hardwareConcurrency === null ? null : Number.isInteger(data.hardwareConcurrency) && data.hardwareConcurrency >= 1 && data.hardwareConcurrency <= 256 ? data.hardwareConcurrency : null;
  const maxTouchPoints = data.maxTouchPoints === null ? null : Number.isInteger(data.maxTouchPoints) && data.maxTouchPoints >= 0 && data.maxTouchPoints <= 32 ? data.maxTouchPoints : null;
  if (!viewport || typeof viewport !== 'object' || Array.isArray(viewport) || Object.keys(viewport).some((key) => !['width', 'height'].includes(key)) || width === null || height === null || devicePixelRatio === null || (data.userAgent !== null && userAgent === null) || (data.language !== null && language === null)) throw new Error('Rehearsal report environment is malformed');
  return { userAgent, language, viewport: { width, height }, devicePixelRatio, hardwareConcurrency, maxTouchPoints };
}
function sanitizeBeatTelemetry(data) {
  if (data === undefined || data === null) return null;
  const allowed = new Set(['format', 'version', 'hits', 'lastOnsetAt', 'lastOnsetSource', 'capped']);
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => !allowed.has(key)) || data.format !== beatTelemetryFormat || data.version !== 1) throw new Error('Rehearsal report beat telemetry is malformed');
  const hits = Number.isInteger(data.hits) && data.hits >= 0 && data.hits <= maxBeatTelemetryHits ? data.hits : null;
  const lastOnsetAt = data.lastOnsetAt === null ? null : typeof data.lastOnsetAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(data.lastOnsetAt) && data.lastOnsetAt.length <= 64 && Number.isFinite(Date.parse(data.lastOnsetAt)) ? data.lastOnsetAt : null;
  const lastOnsetSource = data.lastOnsetSource === null ? null : typeof data.lastOnsetSource === 'string' && rehearsalAudioSources.has(data.lastOnsetSource) ? data.lastOnsetSource : null;
  const capped = typeof data.capped === 'boolean' ? data.capped : null;
  if (hits === null || lastOnsetAt === null && lastOnsetSource !== null || lastOnsetAt !== null && lastOnsetSource === null || capped === null || capped !== (hits >= maxBeatTelemetryHits) || hits === 0 && (lastOnsetAt !== null || lastOnsetSource !== null || capped) || hits > 0 && (lastOnsetAt === null || lastOnsetSource === null)) throw new Error('Rehearsal report beat telemetry is malformed');
  return { format: beatTelemetryFormat, version: 1, hits, lastOnsetAt, lastOnsetSource, capped };
}
function sanitizeRehearsalAudio(data) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.source !== 'string' || !rehearsalAudioSources.has(data.source)) throw new Error('Rehearsal report audio source is malformed');
  const status = data.status === undefined || data.status === null ? 'idle' : typeof data.status === 'string' && audioSourceOutcomes.has(data.status) ? data.status : (() => { throw new Error('Rehearsal report audio status is malformed'); })();
  const hasHistory = data.history !== undefined && data.history !== null;
  const history = !hasHistory ? [] : Array.isArray(data.history) && data.history.length <= maxAudioSourceEvents && data.history.every((event) => event && typeof event === 'object' && !Array.isArray(event) && typeof event.source === 'string' && rehearsalAudioSources.has(event.source) && typeof event.status === 'string' && audioSourceOutcomes.has(event.status) && Object.keys(event).every((key) => key === 'source' || key === 'status')) ? data.history.map((event) => ({ source: event.source, status: event.status })) : (() => { throw new Error('Rehearsal report audio history is malformed'); })();
  if (hasHistory && status === 'active' && data.source === 'NO AUDIO') throw new Error('Rehearsal report audio history is inconsistent');
  if (hasHistory && history.length && history.at(-1).status !== status) throw new Error('Rehearsal report audio history is inconsistent');
  if (hasHistory && history.length && data.source !== 'NO AUDIO' && history.at(-1).source !== data.source) throw new Error('Rehearsal report audio history is inconsistent');
  const peakData = data.peak === undefined || data.peak === null ? null : data.peak;
  if (peakData !== null && (!peakData || typeof peakData !== 'object' || Array.isArray(peakData) || Object.keys(peakData).some((key) => !['current', 'hold', 'headroom'].includes(key)))) throw new Error('Rehearsal report audio peak is malformed');
  const peak = peakData === null ? null : Object.fromEntries(['current', 'hold', 'headroom'].map((key) => [key, Number.isFinite(peakData[key]) && peakData[key] >= 0 && peakData[key] <= 1 ? Number(peakData[key]) : null]));
  if (peak && Object.values(peak).some((value) => value === null) || peak && Math.abs(peak.headroom - (1 - peak.hold)) > .011) throw new Error('Rehearsal report audio peak is malformed');
  const sessionData = data.peakSession === undefined || data.peakSession === null ? null : data.peakSession;
  if (sessionData !== null && (!sessionData || typeof sessionData !== 'object' || Array.isArray(sessionData) || Object.keys(sessionData).some((key) => !['sampleCount', 'durationSeconds', 'peakMax', 'holdMax', 'averageHold', 'headroom', 'hotPercent', 'nearClipPercent', 'capped'].includes(key)))) throw new Error('Rehearsal report audio peak session is malformed');
  const peakSession = sessionData === null ? null : (() => { const sampleCount = Number.isInteger(sessionData.sampleCount) && sessionData.sampleCount >= 0 && sessionData.sampleCount <= maxAudioPeakSessionSamples ? sessionData.sampleCount : null; const durationSeconds = sessionData.durationSeconds === undefined ? (sampleCount === null ? null : Number((sampleCount / 60).toFixed(2))) : Number.isFinite(sessionData.durationSeconds) && sessionData.durationSeconds >= 0 && sessionData.durationSeconds <= 7200 ? Number(sessionData.durationSeconds) : null; return { sampleCount, durationSeconds, peakMax: Number.isFinite(sessionData.peakMax) && sessionData.peakMax >= 0 && sessionData.peakMax <= 1 ? Number(sessionData.peakMax) : null, holdMax: Number.isFinite(sessionData.holdMax) && sessionData.holdMax >= 0 && sessionData.holdMax <= 1 ? Number(sessionData.holdMax) : null, averageHold: Number.isFinite(sessionData.averageHold) && sessionData.averageHold >= 0 && sessionData.averageHold <= 1 ? Number(sessionData.averageHold) : null, headroom: Number.isFinite(sessionData.headroom) && sessionData.headroom >= 0 && sessionData.headroom <= 1 ? Number(sessionData.headroom) : null, hotPercent: Number.isFinite(sessionData.hotPercent) && sessionData.hotPercent >= 0 && sessionData.hotPercent <= 100 ? Number(sessionData.hotPercent) : null, nearClipPercent: Number.isFinite(sessionData.nearClipPercent) && sessionData.nearClipPercent >= 0 && sessionData.nearClipPercent <= 100 ? Number(sessionData.nearClipPercent) : null, capped: typeof sessionData.capped === 'boolean' ? sessionData.capped : null }; })();
  if (peakSession && Object.values(peakSession).some((value) => value === null) || peakSession && Math.abs(peakSession.headroom - (1 - peakSession.holdMax)) > .011 || peakSession && peakSession.peakMax > peakSession.holdMax + .011 || peakSession && peakSession.averageHold > peakSession.holdMax + .011 || peakSession && peakSession.sampleCount === 0 && (peakSession.durationSeconds !== 0 || peakSession.peakMax !== 0 || peakSession.holdMax !== 0 || peakSession.averageHold !== 0 || peakSession.headroom !== 1 || peakSession.hotPercent !== 0 || peakSession.nearClipPercent !== 0 || peakSession.capped)) throw new Error('Rehearsal report audio peak session is malformed');
  const beat = sanitizeBeatTelemetry(data.beat);
  return { source: data.source, status, history, peak, peakSession, beat };
}
function sanitizeRehearsalReportSet(data, cuePlan) {
  if (data === undefined || data === null) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Rehearsal report transport is malformed');
  const cueCount = data.cueCount === undefined ? cuePlan.length : Number.isInteger(data.cueCount) && data.cueCount === cuePlan.length ? data.cueCount : null;
  const expectedTotalBars = cuePlan.reduce((sum, cue) => sum + cue.duration, 0);
  const totalBars = data.totalBars === undefined ? expectedTotalBars : Number.isInteger(data.totalBars) && data.totalBars === expectedTotalBars ? data.totalBars : null;
  const playing = data.playing === undefined ? false : typeof data.playing === 'boolean' ? data.playing : null;
  const complete = data.complete === undefined ? false : typeof data.complete === 'boolean' ? data.complete : null;
  const progress = data.progress === undefined ? '' : typeof data.progress === 'string' && data.progress.length <= 120 ? data.progress : null;
  let currentCue = null;
  if (data.currentCue !== undefined && data.currentCue !== null) {
    const cue = data.currentCue;
    if (!cue || typeof cue !== 'object' || Array.isArray(cue) || !Number.isInteger(cue.index) || cue.index < 0 || cue.index >= cuePlan.length || typeof cue.label !== 'string' || cue.label.trim().length < 1 || cue.label.length > 60 || typeof cue.scene !== 'string' || cue.scene.length < 1 || cue.scene.length > 80 || typeof cue.preset !== 'string' || cue.preset.length < 1 || cue.preset.length > 120 || !Number.isInteger(cue.duration) || cue.duration < 1 || cue.duration > 64) throw new Error('Rehearsal report transport is malformed');
    const expectedCue = cuePlan[cue.index];
    if (cue.label.trim() !== expectedCue.label || cue.scene !== expectedCue.scene || cue.preset !== expectedCue.preset || cue.duration !== expectedCue.duration) throw new Error('Rehearsal report transport is inconsistent with the cue plan');
    currentCue = { index: cue.index, label: cue.label.trim(), scene: cue.scene, preset: cue.preset, duration: cue.duration };
  }
  if (cueCount === null || totalBars === null || playing === null || complete === null || progress === null || (playing && complete) || (playing && !currentCue) || (complete && currentCue)) throw new Error('Rehearsal report transport is malformed');
  return { cueCount, totalBars, playing, complete, progress, currentCue };
}
function validateRehearsalReport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.format !== 'phosphor-rehearsal-report-v1' || data.version !== 1) throw new Error('Unsupported rehearsal report format');
  if (typeof data.capturedAt !== 'string' || data.capturedAt.length > 64 || !Number.isFinite(Date.parse(data.capturedAt))) throw new Error('Rehearsal report timestamp is malformed');
  if (typeof data.setName !== 'string' || data.setName.trim().length > 80) throw new Error('Rehearsal report set name is malformed');
  if (data.deviceLabel !== undefined && typeof data.deviceLabel !== 'string') throw new Error('Rehearsal report device label is malformed');
  if (typeof data.scene !== 'string' || data.scene.length < 1 || data.scene.length > 80 || typeof data.preset !== 'string' || data.preset.length < 1 || data.preset.length > 120) throw new Error('Rehearsal report scene is malformed');
  if (!Number.isInteger(data.sceneIndex) || data.sceneIndex < 0 || data.sceneIndex >= sceneDefs.length) throw new Error('Rehearsal report scene index is malformed');
  const reportQuality = qualityForProfileId(data.outputProfile);
  if (!reportQuality || !Number.isInteger(data.width) || data.width < 1 || data.width > 4096 || !Number.isInteger(data.height) || data.height < 1 || data.height > 4096 || !Number.isInteger(data.frameRate) || data.frameRate < 1 || data.frameRate > 240) throw new Error('Rehearsal report output profile is malformed');
  const reportProfile = qualityProfile(reportQuality);
  if (data.width !== reportProfile.width || data.height !== reportProfile.height || data.frameRate !== reportProfile.cadence) throw new Error('Rehearsal report output profile is inconsistent');
  if (!Array.isArray(data.cuePlan) || data.cuePlan.length < 1 || data.cuePlan.length > 64) throw new Error('Rehearsal report cue plan is malformed');
  const cuePlan = data.cuePlan.map((cue, index) => { if (!cue || typeof cue !== 'object' || cue.index !== index || typeof cue.label !== 'string' || cue.label.trim().length < 1 || cue.label.length > 60 || typeof cue.scene !== 'string' || cue.scene.length < 1 || cue.scene.length > 80 || typeof cue.preset !== 'string' || cue.preset.length < 1 || cue.preset.length > 120 || !Number.isInteger(cue.duration) || cue.duration < 1 || cue.duration > 64) throw new Error('Rehearsal report cue plan is malformed'); return { index, label: cue.label.trim(), scene: cue.scene, preset: cue.preset, duration: cue.duration }; });
  const preflight = data.preflight === null ? null : data.preflight && typeof data.preflight === 'object' && !Array.isArray(data.preflight) && Object.keys(preflightLabels).every((key) => typeof data.preflight[key] === 'boolean') && Object.keys(data.preflight).every((key) => Object.hasOwn(preflightLabels, key)) ? Object.fromEntries(Object.keys(preflightLabels).map((key) => [key, data.preflight[key]])) : (() => { throw new Error('Rehearsal report preflight is malformed'); })();
  const recordingMimeType = data.recordingMimeType === null || data.recordingMimeType === undefined ? null : typeof data.recordingMimeType === 'string' && data.recordingMimeType.length <= 80 ? data.recordingMimeType : (() => { throw new Error('Rehearsal report recording MIME detail is malformed'); })();
  const recordingStatus = data.recordingStatus === null || data.recordingStatus === undefined ? 'idle' : typeof data.recordingStatus === 'string' && recordingOutcomes.has(data.recordingStatus) ? data.recordingStatus : (() => { throw new Error('Rehearsal report recording status is malformed'); })();
  const observedChecks = sanitizeRehearsalChecks(data.observedChecks);
  const observedChecksAt = sanitizeRehearsalChecksAt(data.observedChecksAt);
  const preflightCheckedAt = sanitizeRehearsalChecksAt(data.preflightCheckedAt);
  const environment = sanitizeRehearsalEnvironment(data.environment);
  const renderer = sanitizeRehearsalRenderer(data.renderer);
  const qualityAB = sanitizeQualityAB(data.qualityAB);
  if (qualityAB && (data.scene !== qualityAB.scene || data.preset !== qualityAB.preset)) throw new Error('Quality A/B evidence is inconsistent with the report scene');
  const beatResponse = sanitizeBeatResponseCheck(data.beatResponse);
  const performance = sanitizeRehearsalPerformance(data.performance, data.outputProfile);
  const performanceSet = sanitizeRehearsalPerformanceSet(data.performanceSet, data.outputProfile);
  const audio = sanitizeRehearsalAudio(data.audio);
  const set = sanitizeRehearsalReportSet(data.set, cuePlan);
  const observedEvidence = rehearsalEvidenceStatusFor(observedChecks);
  if (data.observedEvidence !== undefined) { const candidateEvidence = data.observedEvidence; if (!candidateEvidence || typeof candidateEvidence !== 'object' || Array.isArray(candidateEvidence) || !['not-started', 'in-progress', 'complete'].includes(candidateEvidence.status) || !Number.isInteger(candidateEvidence.completed) || candidateEvidence.completed !== observedEvidence.completed || candidateEvidence.total !== observedEvidence.total || candidateEvidence.status !== observedEvidence.status) throw new Error('Rehearsal report evidence status is inconsistent'); }
  const passSnapshot = sanitizeRehearsalPassSnapshot(data.passSnapshot, { audio, performanceSet, observedEvidence });
  return { format: data.format, version: 1, capturedAt: data.capturedAt, environment, renderer, qualityAB, beatResponse, setName: data.setName.trim().slice(0, 80) || 'Untitled set', deviceLabel: sanitizeDeviceLabel(data.deviceLabel), notes: typeof data.notes === 'string' ? data.notes.slice(0, 1000) : '', scene: data.scene, sceneName: typeof data.sceneName === 'string' ? data.sceneName.slice(0, 120) : data.scene, sceneIndex: data.sceneIndex, preset: data.preset, outputProfile: data.outputProfile, width: data.width, height: data.height, frameRate: data.frameRate, recordingMimeType, recordingStatus, cuePlan, set, preflight, preflightCheckedAt, performance, performanceSet, passSnapshot, audio, observedChecks, observedChecksAt, observedEvidence };
}
function compareRehearsalReports(current, candidate) {
  const safeCurrent = validateRehearsalReport(current); const safeCandidate = validateRehearsalReport(candidate);
  const sameSet = JSON.stringify({ setName: safeCurrent.setName, cuePlan: safeCurrent.cuePlan }) === JSON.stringify({ setName: safeCandidate.setName, cuePlan: safeCandidate.cuePlan });
  const sameScene = JSON.stringify([safeCurrent.scene, safeCurrent.sceneIndex, safeCurrent.preset]) === JSON.stringify([safeCandidate.scene, safeCandidate.sceneIndex, safeCandidate.preset]);
  const sameProfile = JSON.stringify([safeCurrent.outputProfile, safeCurrent.width, safeCurrent.height, safeCurrent.frameRate]) === JSON.stringify([safeCandidate.outputProfile, safeCandidate.width, safeCandidate.height, safeCandidate.frameRate]);
  const sameTransport = !safeCurrent.set || !safeCandidate.set || JSON.stringify([safeCurrent.set.playing, safeCurrent.set.complete, safeCurrent.set.currentCue?.index ?? null]) === JSON.stringify([safeCandidate.set.playing, safeCandidate.set.complete, safeCandidate.set.currentCue?.index ?? null]);
  const sameDevice = safeCurrent.deviceLabel === safeCandidate.deviceLabel;
  const sameEnvironment = !safeCurrent.environment || !safeCandidate.environment || JSON.stringify(safeCurrent.environment) === JSON.stringify(safeCandidate.environment);
  const sameRenderer = !safeCurrent.renderer || !safeCandidate.renderer || JSON.stringify(safeCurrent.renderer) === JSON.stringify(safeCandidate.renderer);
  const sameQualityAB = JSON.stringify(safeCurrent.qualityAB ?? null) === JSON.stringify(safeCandidate.qualityAB ?? null);
  const sameBeatResponse = JSON.stringify(safeCurrent.beatResponse ?? null) === JSON.stringify(safeCandidate.beatResponse ?? null);
  const samePreflight = JSON.stringify([safeCurrent.preflight, safeCurrent.recordingMimeType]) === JSON.stringify([safeCandidate.preflight, safeCandidate.recordingMimeType]);
  const sameRecording = safeCurrent.recordingStatus === safeCandidate.recordingStatus;
  const sameObservations = JSON.stringify(safeCurrent.observedChecks) === JSON.stringify(safeCandidate.observedChecks);
  const sameAudio = safeCurrent.audio?.source === safeCandidate.audio?.source && safeCurrent.audio?.status === safeCandidate.audio?.status;
  const sameAudioHistory = JSON.stringify(safeCurrent.audio?.history ?? []) === JSON.stringify(safeCandidate.audio?.history ?? []);
  const sameAudioPeak = JSON.stringify(safeCurrent.audio?.peak ?? null) === JSON.stringify(safeCandidate.audio?.peak ?? null);
  const sameAudioPeakSession = !safeCurrent.audio?.peakSession || !safeCandidate.audio?.peakSession || JSON.stringify(safeCurrent.audio.peakSession) === JSON.stringify(safeCandidate.audio.peakSession);
  const sameAudioBeat = !safeCurrent.audio?.beat || !safeCandidate.audio?.beat || JSON.stringify(safeCurrent.audio.beat) === JSON.stringify(safeCandidate.audio.beat);
  const samePerformance = JSON.stringify([safeCurrent.performance?.sampleCount ?? null, safeCurrent.performance?.medianMs ?? null, safeCurrent.performance?.p95Ms ?? null, safeCurrent.performance?.sceneFrames ?? null, safeCurrent.performance?.status ?? null, safeCurrent.performance?.targetMs ?? null]) === JSON.stringify([safeCandidate.performance?.sampleCount ?? null, safeCandidate.performance?.medianMs ?? null, safeCandidate.performance?.p95Ms ?? null, safeCandidate.performance?.sceneFrames ?? null, safeCandidate.performance?.status ?? null, safeCandidate.performance?.targetMs ?? null]);
  const samePerformanceSet = JSON.stringify(safeCurrent.performanceSet ?? null) === JSON.stringify(safeCandidate.performanceSet ?? null);
  const samePassSnapshot = !safeCurrent.passSnapshot || !safeCandidate.passSnapshot || JSON.stringify(safeCurrent.passSnapshot) === JSON.stringify(safeCandidate.passSnapshot);
  return { sameSet, sameScene, sameProfile, sameTransport, sameDevice, sameEnvironment, sameRenderer, sameQualityAB, sameBeatResponse, samePreflight, sameRecording, sameObservations, sameAudio, sameAudioHistory, sameAudioPeak, sameAudioPeakSession, sameAudioBeat, samePerformance, samePerformanceSet, samePassSnapshot, equivalent: sameSet && sameScene && sameProfile && sameTransport && sameDevice && sameEnvironment && sameRenderer && sameQualityAB && sameBeatResponse && samePreflight && sameRecording && sameObservations && sameAudio && sameAudioHistory && sameAudioPeak && sameAudioPeakSession && sameAudioBeat && samePerformance && samePerformanceSet && samePassSnapshot };
}
let importedRehearsalReport = null;
let importedRehearsalReportLiveSignature = null;
let importedRehearsalReportPerformanceSignature = null;
let importedRehearsalReportPerformanceSetSignature = null;
let importedRehearsalReportAudioPeakSessionSignature = null;
let importedRehearsalReportStale = false;
function importRehearsalReport(data) {
  if (offlineJobActive()) return null;
  const report = validateRehearsalReport(data); const comparison = compareRehearsalReports(rehearsalReport(), report); importedRehearsalReport = report; importedRehearsalReportLiveSignature = rehearsalReportLiveSignature(); importedRehearsalReportPerformanceSignature = rehearsalPerformanceSignature(report.performance); importedRehearsalReportPerformanceSetSignature = rehearsalPerformanceSetSignature(report.performanceSet); importedRehearsalReportAudioPeakSessionSignature = rehearsalAudioPeakSessionSignature(report.audio?.peakSession); importedRehearsalReportStale = false; syncRehearsalReportClearControl(); syncRehearsalReportImportEvidence(report); syncRehearsalReportImportSourceHistory(report);
  syncRehearsalReportImportComparison(comparison);
  syncRehearsalReportImportPass(report);
  syncQualityABReadout();
  const output = $('rehearsalReportImportReadout');
  const differences = []; if (!comparison.sameSet) differences.push('set plan'); if (!comparison.sameScene) differences.push('scene'); if (!comparison.sameProfile) differences.push('profile'); if (!comparison.sameTransport) differences.push('transport'); if (!comparison.sameDevice) differences.push('device'); if (!comparison.sameEnvironment) differences.push('runtime'); if (!comparison.sameRenderer) differences.push('renderer path'); if (!comparison.sameQualityAB) differences.push('quality A/B'); if (!comparison.sameBeatResponse) differences.push('beat response'); if (!comparison.samePreflight) differences.push('capabilities'); if (!comparison.sameRecording) differences.push('recording result'); if (!comparison.sameAudio || !comparison.sameAudioHistory) differences.push('audio source'); if (!comparison.sameAudioPeak || !comparison.sameAudioPeakSession) differences.push('headroom'); if (!comparison.sameAudioBeat) differences.push('beat telemetry'); if (!comparison.samePerformance || !comparison.samePerformanceSet) differences.push('performance'); if (!comparison.samePassSnapshot) differences.push('pass snapshot'); if (!comparison.sameObservations) differences.push('observations');
  const stamp = rehearsalReportImportDisplayStamp(report); const label = report.deviceLabel ? ` · ${report.deviceLabel}` : ''; const suffix = differences.length ? `differs: ${differences.join(' · ')}` : 'matches current set';
  if (output) { output.textContent = `Loaded ${stamp}${label} · ${suffix}`; output.setAttribute('aria-label', `Loaded rehearsal report from ${stamp}${label}; ${suffix}`); }
  showToast(`Report loaded · ${suffix}`); return { report, comparison };
}
function syncRehearsalReportClearControl() { const button = $('clearRehearsalReportButton'); if (button) button.disabled = !importedRehearsalReport; }
function syncRehearsalReportImportEvidence(report = importedRehearsalReport) { const output = $('rehearsalReportImportEvidenceReadout'); if (!output) return; if (!report?.observedEvidence) { output.textContent = 'No loaded evidence'; output.setAttribute('aria-label', 'No loaded rehearsal evidence'); return; } const evidence = report.observedEvidence; output.textContent = `Loaded evidence · ${evidence.completed}/${evidence.total} · ${evidence.label}`; output.setAttribute('aria-label', `Loaded rehearsal report evidence ${evidence.completed} of ${evidence.total}; ${evidence.label.toLowerCase()}`); }
function syncRehearsalReportImportSourceHistory(report = importedRehearsalReport) {
  const output = $('rehearsalReportImportSourceHistoryReadout');
  if (!output) return;
  if (!report) { output.textContent = 'No loaded source history'; output.setAttribute('aria-label', 'No loaded source history'); output.dataset.paths = '0'; return; }
  if (!report.audio) { output.textContent = 'LOADED SOURCE HISTORY · UNAVAILABLE (LEGACY REPORT)'; output.setAttribute('aria-label', 'Loaded report predates the persisted audio source history'); delete output.dataset.paths; return; }
  const kinds = [...new Set((report.audio.history || []).map((event) => event.source).filter((source) => rehearsalAudioSources.has(source) && source !== 'NO AUDIO'))];
  const countLabel = `${kinds.length} ${kinds.length === 1 ? 'PATH' : 'PATHS'}`;
  const detail = kinds.length > 1 ? `${kinds.join(' · ')} · MULTIPLE PATHS SEEN` : kinds.length ? kinds[0] : 'NO AUDIO';
  const source = report.audio.source || 'NO AUDIO';
  const status = report.audio.status || 'idle';
  output.textContent = `LOADED SOURCE HISTORY · ${countLabel} · ${detail} · LAST ${source} ${status.toUpperCase()}`;
  output.setAttribute('aria-label', kinds.length ? `Loaded source history includes ${kinds.length} paths seen or attempted: ${kinds.join(', ')}. Last recorded source ${source}, outcome ${status}. This is historical report evidence; media and permissions were not saved.` : `Loaded source history has no connected source paths. Last recorded source ${source}, outcome ${status}. This is historical report evidence; media and permissions were not saved.`);
  output.dataset.paths = String(kinds.length);
}
function syncRehearsalReportImportPass(report = importedRehearsalReport) { const output = $('rehearsalReportImportPassReadout'); if (!output) return; if (!report?.passSnapshot) { output.textContent = 'No loaded pass snapshot'; output.setAttribute('aria-label', 'No loaded rehearsal pass snapshot; this report predates the persisted pass field'); delete output.dataset.level; return; } const contextText = rehearsalReportImportPassContext(report); const contextAria = rehearsalReportImportPassContextAria(report); output.textContent = `Loaded ${rehearsalPassDisplayText(report.passSnapshot)}${contextText}`; output.setAttribute('aria-label', `Loaded ${rehearsalPassDisplayAria(report.passSnapshot)}${contextAria}`); output.dataset.level = report.passSnapshot.status; }
function syncRehearsalReportImportComparison(comparison = null) { const output = $('rehearsalReportImportCompareReadout'); if (!output) return; if (!comparison) { output.textContent = 'No loaded comparison'; output.setAttribute('aria-label', 'No loaded rehearsal report comparison'); delete output.dataset.level; return; } const groups = [['setup', comparison.sameDevice && comparison.sameEnvironment], ['transport', comparison.sameTransport], ['audio', comparison.sameAudio && comparison.sameAudioHistory && comparison.sameAudioPeak && comparison.sameAudioPeakSession && comparison.sameAudioBeat && comparison.sameRecording], ['timing', comparison.samePerformance && comparison.samePerformanceSet], ['visuals', comparison.sameScene && comparison.sameProfile && comparison.sameRenderer && comparison.sameQualityAB && comparison.sameBeatResponse], ['evidence', comparison.samePreflight && comparison.sameObservations], ['pass', comparison.samePassSnapshot], ['set', comparison.sameSet]]; const differences = groups.filter(([, same]) => !same).map(([label]) => label); const qualityGuidance = qualityABRecommendationAria(importedRehearsalReport?.qualityAB); const qualitySuffix = qualityGuidance ? `; ${qualityGuidance}` : ''; if (!differences.length) { output.textContent = 'Compare · live match'; output.setAttribute('aria-label', `Loaded rehearsal report matches the live setup, transport, audio, timing, visuals, evidence, pass, and set${qualitySuffix}`); output.dataset.level = 'match'; return; } output.textContent = `Compare · differs: ${differences.join(' · ')}`; output.setAttribute('aria-label', `Loaded rehearsal report differs from the live instrument in ${differences.join(', ')}${qualitySuffix}`); output.dataset.level = 'differs'; }
function clearRehearsalReportImport() {
  if (offlineJobActive() || !importedRehearsalReport) return false;
  importedRehearsalReport = null;
  importedRehearsalReportLiveSignature = null;
  importedRehearsalReportPerformanceSignature = null;
  importedRehearsalReportPerformanceSetSignature = null;
  importedRehearsalReportAudioPeakSessionSignature = null;
  importedRehearsalReportStale = false;
  syncRehearsalReportClearControl();
  syncRehearsalReportImportEvidence();
  syncRehearsalReportImportSourceHistory();
  syncRehearsalReportImportPass();
  syncRehearsalReportImportComparison();
  syncQualityABReadout();
  const output = $('rehearsalReportImportReadout');
  if (output) {
    output.textContent = 'No report loaded';
    output.setAttribute('aria-label', 'No rehearsal report loaded');
  }
  showToast('Loaded report cleared');
  return true;
}
function readRehearsalReportFile(file) { if (offlineJobActive() || !file || file.size > 2 * 1024 * 1024) return showToast('Report must be JSON under 2 MB'); const reader = new FileReader(); reader.onload = () => { try { importRehearsalReport(JSON.parse(reader.result)); } catch (error) { showToast(`Report rejected · ${error.message}`); } }; reader.readAsText(file); return true; }
function writeRehearsalReportCache() { try { localStorage.setItem(rehearsalReportCacheKey, JSON.stringify({ format: rehearsalReportCacheKey, version: 1, reportStamp: lastRehearsalReportAt, signature: lastRehearsalReportSignature, liveSignature: lastRehearsalReportLiveSignature, performanceSignature: lastRehearsalReportPerformanceSignature, performanceSetSignature: lastRehearsalReportPerformanceSetSignature, audioPeakSessionSignature: lastRehearsalReportAudioPeakSessionSignature, qualityAB: lastRehearsalReportQualityAB ? structuredClone(lastRehearsalReportQualityAB) : null, deviceLabel: lastRehearsalReportDeviceLabel, recordingMimeType: lastPreflightRecordingMime, recordingStatus: recordingOutcome, preflight: lastPreflightReport ? structuredClone(lastPreflightReport) : null, preflightCheckedAt: lastPreflightAt, observedChecks: { ...state.rehearsalChecks }, observedChecksAt: state.rehearsalChecksAt })); } catch {} }
function restoreRehearsalReportCacheWithQuality(data) { let qualityAB = null; if (data?.qualityAB !== undefined && data.qualityAB !== null) { try { qualityAB = sanitizeQualityAB(data.qualityAB); } catch { return false; } } const previousProbe = lastQualityABProbe; let restored = false; try { if (!previousProbe && qualityAB) lastQualityABProbe = qualityAB; restored = restoreRehearsalReportCache(data); } finally { lastQualityABProbe = previousProbe; } if (!restored) return false; lastRehearsalReportQualityAB = qualityAB ? structuredClone(qualityAB) : null; syncQualityABReadout(); return true; }
function restoreRehearsalReportCache(data) { let hasObservedChecks = data?.observedChecks === undefined; if (!hasObservedChecks) { try { sanitizeRehearsalChecks(data.observedChecks); hasObservedChecks = true; } catch {} } const hasObservedChecksAt = data?.observedChecksAt === undefined || data.observedChecksAt === null || (typeof data?.observedChecksAt === 'string' && data.observedChecksAt.length <= 64 && Number.isFinite(Date.parse(data.observedChecksAt))); const hasPreflight = data?.preflight === null || (data?.preflight && typeof data.preflight === 'object' && Object.keys(preflightLabels).every((key) => typeof data.preflight[key] === 'boolean') && Object.keys(data.preflight).every((key) => Object.hasOwn(preflightLabels, key))); const hasPreflightTimestamp = data?.preflightCheckedAt === null || (typeof data?.preflightCheckedAt === 'string' && data.preflightCheckedAt.length <= 64 && Number.isFinite(Date.parse(data.preflightCheckedAt))); const hasDeviceLabel = data?.deviceLabel === undefined || typeof data.deviceLabel === 'string'; const hasRecordingMime = data?.recordingMimeType === undefined || data.recordingMimeType === null || (typeof data.recordingMimeType === 'string' && data.recordingMimeType.length <= 80); const hasRecordingStatus = data?.recordingStatus === undefined || data.recordingStatus === null || (typeof data.recordingStatus === 'string' && recordingOutcomes.has(data.recordingStatus)); const hasPerformanceSignature = data?.performanceSignature === undefined || (typeof data.performanceSignature === 'string' && data.performanceSignature.length <= 500); const hasPerformanceSetSignature = data?.performanceSetSignature === undefined || (typeof data.performanceSetSignature === 'string' && data.performanceSetSignature.length <= 1000); const hasAudioPeakSessionSignature = data?.audioPeakSessionSignature === undefined || (typeof data.audioPeakSessionSignature === 'string' && data.audioPeakSessionSignature.length <= 1000); if (!data || data.format !== rehearsalReportCacheKey || data.version !== 1 || typeof data.reportStamp !== 'string' || data.reportStamp.length > 64 || typeof data.signature !== 'string' || data.signature.length > 200000 || typeof data.liveSignature !== 'string' || data.liveSignature.length > 5000 || !hasPreflight || !hasPreflightTimestamp || !hasObservedChecks || !hasObservedChecksAt || !hasDeviceLabel || !hasRecordingMime || !hasRecordingStatus || !hasPerformanceSignature || !hasPerformanceSetSignature || !hasAudioPeakSessionSignature) return false; lastRehearsalReportAt = data.reportStamp; lastRehearsalReportSignature = data.signature; lastRehearsalReportLiveSignature = data.liveSignature; lastRehearsalReportPerformanceSignature = data.performanceSignature || null; lastRehearsalReportPerformanceSetSignature = data.performanceSetSignature || null; lastRehearsalReportAudioPeakSessionSignature = data.audioPeakSessionSignature || null; lastRehearsalReportDeviceLabel = sanitizeDeviceLabel(data.deviceLabel === undefined ? state.deviceLabel : data.deviceLabel); lastPreflightRecordingMime = data.recordingMimeType === undefined ? undefined : typeof data.recordingMimeType === 'string' ? data.recordingMimeType : null; recordingOutcome = data.recordingStatus === undefined || data.recordingStatus === null ? 'idle' : data.recordingStatus; syncRecordingOutcome(); lastPreflightReport = data.preflight ? structuredClone(data.preflight) : null; lastPreflightAt = data.preflightCheckedAt; if (lastPreflightReport) { const missing = Object.entries(lastPreflightReport).filter(([, available]) => !available).map(([key]) => preflightLabels[key]); $('preflightReadout').textContent = missing.length ? `Fallbacks needed · ${missing.join(', ')}` : 'All browser APIs available'; $('preflightTimestamp').textContent = `Checked ${preflightTimestamp(new Date(lastPreflightAt))}`; syncRecordingMimeReadout(); renderPreflightChecklist(lastPreflightReport); } rehearsalReportStale = false; const output = $('rehearsalReportReadout'); if (output) { output.textContent = `Saved ${lastRehearsalReportAt}${rehearsalReportLabelSuffix()} · reopened`; output.setAttribute('aria-label', `Rehearsal report saved at ${lastRehearsalReportAt}${rehearsalReportLabelSuffix()}; reopened from local report metadata`); } if (rehearsalReportStateSignature() !== lastRehearsalReportSignature) markRehearsalReportStale(); else syncRehearsalReportFreshness(); return true; }
function exportRehearsalReport() { if (offlineJobActive()) return null; if (!lastPreflightReport) runPreflight(); const report = rehearsalReport(); download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `phosphor-${assetStem()}-rehearsal-report.json`); const stamp = preflightTimestamp(); lastRehearsalReportAt = stamp; lastRehearsalReportSignature = rehearsalReportStateSignature(); lastRehearsalReportLiveSignature = rehearsalReportLiveSignature(); lastRehearsalReportPerformanceSignature = rehearsalPerformanceSignature(report.performance); lastRehearsalReportPerformanceSetSignature = rehearsalPerformanceSetSignature(report.performanceSet); lastRehearsalReportAudioPeakSessionSignature = rehearsalAudioPeakSessionSignature(report.audio?.peakSession); lastRehearsalReportDeviceLabel = report.deviceLabel; lastRehearsalReportQualityAB = report.qualityAB ? structuredClone(report.qualityAB) : null; rehearsalReportStale = false; writeRehearsalReportCache(); $('rehearsalReportReadout').textContent = `Saved ${stamp}${rehearsalReportLabelSuffix()}`; $('rehearsalReportReadout').setAttribute('aria-label', `Rehearsal report saved at ${stamp}${rehearsalReportLabelSuffix()}`); showToast('Rehearsal report saved'); return report; }
function stageTransportBadge() { if (state.renderingLost) return 'RECOVERING'; if (state.blackout) return 'BLACKOUT'; const transport = state.paused ? 'PAUSED' : state.setPlaying ? 'SET LIVE' : state.setComplete ? 'SET COMPLETE' : state.currentCue >= 0 ? 'SET PAUSED' : 'LIVE'; return state.transition ? `${transport} · MORPHING` : transport; }
function announce() { $('sceneKicker').textContent = `${scene().number} / ${scene().name}`; $('scenePresetName').textContent = preset()[0]; $('sceneDescription').textContent = scene().kind === 'fractal' ? fractalDescription() : scene().description; $('sceneMechanism').textContent = scene().mechanism; $('controlHeading').textContent = `${scene().name.toUpperCase()} / ${state.workflow === 'perform' ? 'PERFORM' : 'EXPLORE'}`; $('transitionBadge').textContent = stageTransportBadge(); $('tempoReadout').textContent = `♩ ${state.tempo} BPM`; $('tempoOutput').textContent = state.tempo; $('tempoReadout').setAttribute('aria-label', `${state.tempo} beats per minute`); $('stageActionHint').textContent = sceneActionHint(); canvas.setAttribute('aria-label', `${scene().name} visual stage. ${sceneActionHint().toLowerCase()}.`); $('qualityBadge').textContent = outputProfile().label; $('fpsReadout').textContent = `${outputProfile().label}`; applyDisplayBrightness(); syncQualityABReadout(); syncQualityABControl(); syncBeatResponseReadout(); syncSceneBeatReadout(); syncBeatScope(); syncBeatResponseControl(); syncSetPerformanceReadout(); syncReadinessStatus(); }
function colorRgb(hex) { const clean = hex.replace('#', ''); return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)]; }
function mixColor(a, b, amount) { const t = clamp(amount, 0, 1); return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
function fillPalette() { Object.assign(scenePalettes[scene().id], palette); for (const key of ['primary', 'secondary', 'accent']) $(key + 'Color').value = palette[key]; }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("\"", '&quot;').replaceAll("'", '&#39;'); }
function applyOutputProfile() { const profile = outputProfile(); syncMetricsProfile(profile.id); canvas.width = profile.width; canvas.height = profile.height; buffers.feedback.a.width = buffers.feedback.b.width = profile.width; buffers.feedback.a.height = buffers.feedback.b.height = profile.height; renderBuffer.width = profile.width; renderBuffer.height = profile.height; transitionCanvas.width = profile.width; transitionCanvas.height = profile.height; state.cadenceAccumulator = 0; resetPerformanceReadout(); resetRenderer(); }
function setQuality(value) {
  if (offlineJobActive()) return false;
  const next = normalizeQuality(value);
  if (next === state.quality) return false;
  state.quality = next;
  lastQualityABProbe = null;
  const pose = flightPose;
  applyOutputProfile();
  flightPose = pose;
  $('qualityInput').value = state.quality;
  announce();
  markDirty();
  return true;
}

function resetAcid(seed = preset()[2]) {
  const b = buffers.acid; b.seed = seed; const rand = hash(seed); b.random = hash(seed ^ 0x51ac1d); b.u.fill(1); b.v.fill(0);
  for (let i = 0; i < b.v.length; i += 1) { if (rand() > .965) b.v[i] = rand() * .9; }
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) { const i = (Math.floor(b.height / 2) + y - 2) * b.width + Math.floor(b.width / 2) + x - 2; b.v[i] = .9; }
}
function resetTapestry(seed = preset()[2]) { const b = buffers.tapestry; b.seed = seed; b.cursor = 0; b.current.fill(0); b.rows.forEach((row) => row.fill(0)); const rand = hash(seed); for (let i = 0; i < b.current.length; i += 1) b.current[i] = rand() > .84 ? 1 : 0; b.current[Math.floor(b.width / 2)] = 1; }
function resetFeedback() { buffers.feedback.current = 0; fctx[0].clearRect(0, 0, canvas.width, canvas.height); fctx[1].clearRect(0, 0, canvas.width, canvas.height); }
function resetMagnetic(seed = preset()[2]) { const b = buffers.magnetic; const p = state.params.magnetic; const profile = outputProfile(); b.seed = seed; b.count = profile.magneticCap; b.replay = { events: [], index: 0, playing: false, startBeat: 0 }; b.attractors[0] = clamp(p.attractorX, 0, 1); b.attractors[1] = clamp(p.attractorY, 0, 1); b.attractors[2] = clamp(p.attractorX + (p.split - .5) * .28, 0, 1); b.attractors[3] = clamp(p.attractorY + Math.sin(seed) * p.split * .18, 0, 1); b.particles.fill(0); b.previous.fill(0); const rand = hash(seed); for (let i = 0; i < b.count; i += 1) { const angle = (i / b.count) * Math.PI * 2 + (rand() - .5) * .06; const attractor = i % 2 ? 2 : 0; const radius = .12 + p.split * .045 + Math.sin(angle * 2 + seed * .01) * .018 + rand() * .024; const index = i * 4; const anchorX = b.attractors[attractor]; const anchorY = b.attractors[attractor + 1]; b.particles[index] = clamp(anchorX + Math.cos(angle) * radius, .02, .98); b.particles[index + 1] = clamp(anchorY + Math.sin(angle) * radius * .8, .02, .98); b.particles[index + 2] = -Math.sin(angle) * (.008 + p.motion * .012); b.particles[index + 3] = Math.cos(angle) * (.008 + p.motion * .012); b.previous[i * 2] = b.particles[index]; b.previous[i * 2 + 1] = b.particles[index + 1]; } }
function resetCathedrals(seed = preset()[2]) { buffers.cathedrals.seed = seed; buffers.cathedrals.phase = 0; ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
function resetAquarium(seed = preset()[2]) { const b = buffers.aquarium; b.seed = seed; b.count = outputProfile().aquariumCap; b.organisms.fill(0); b.food.fill(0); const rand = hash(seed); for (let i = 0; i < b.count; i += 1) { const index = i * 6; b.organisms[index] = .08 + rand() * .84; b.organisms[index + 1] = .1 + rand() * .8; b.organisms[index + 2] = (rand() - .5) * .018; b.organisms[index + 3] = (rand() - .5) * .018; b.organisms[index + 4] = .008 + rand() * .022; b.organisms[index + 5] = .45 + rand() * .55; } for (let i = 0; i < b.food.length; i += 3) { b.food[i] = .1 + rand() * .8; b.food[i + 1] = .16 + rand() * .68; b.food[i + 2] = .35 + rand() * .65; } }
function resetInterference(seed = preset()[2]) { buffers.interference.seed = seed; buffers.interference.phase = 0; }
function resetTopology(seed = preset()[2]) { const b = buffers.topology; const p = state.params.topology; b.seed = seed; b.phase = 0; b.intersections = 0; b.keyframes.set([p.thickness, p.twist, p.camera, p.material, 0, clamp(p.thickness * .7 + .12, .1, 1), clamp(p.twist + .22, 0, 1), clamp(p.camera + .18, 0, 1), clamp(p.material + .28, 0, 1), 1]); }
function resetPhase(seed = preset()[2]) { const b = buffers.phase; b.seed = seed; b.values.fill(0); b.next.fill(0); b.compare.fill(0); b.compareNext.fill(0); b.transitionGap = 0; b.arcIndex = clamp(Math.round(Number(state.params.phase.arc) || 0), 0, 2); b.arcProgress = 0; b.arcPlaying = false; b.arcMode = 'single'; b.arcPhase = 'idle'; b.arcTrace = []; const rand = hash(seed); for (let i = 0; i < b.values.length; i += 1) { b.values[i] = clamp(.35 + rand() * .3, 0, 1); b.compare[i] = b.values[i]; } }
function evolutionSiblingSource(current) { if (current?.children?.some((id) => state.evolution.nodes.some((node) => node.id === id))) return current; return state.evolution.nodes.find((node) => node.id === current?.parent) || current; }
function resetEvolution(seed = preset()[2]) { const b = buffers.evolution; b.seed = seed; b.phase = 0; if (!state.evolution?.nodes?.length) state.evolution = { seed, nodes: [{ id: 'root', parent: null, name: 'Origin seed', generation: 0, params: structuredClone(state.params.evolution), lockedParameters: [], favorite: true, children: [] }], currentId: 'root', selectedId: 'root', undo: [] }; const rand = hash(seed); const current = state.evolution.nodes.find((node) => node.id === state.evolution.currentId) || state.evolution.nodes[0]; const source = evolutionSiblingSource(current); for (let i = 0; i < 5; i += 1) { const index = i * 4; const child = source?.children?.[i] ? state.evolution.nodes.find((node) => node.id === source.children[i]) : null; b.siblings[index] = child ? (child.params.mutation + i * .17) * Math.PI * 2 : rand() * Math.PI * 2; b.siblings[index + 1] = child ? child.params.lineage : .1 + rand() * .2; b.siblings[index + 2] = child ? child.generation + 1 : .7 + rand() * .3; b.siblings[index + 3] = child ? child.params.focus * Math.PI * 2 : rand() * Math.PI * 2; } }
function ensureFractalRenderer() { if (fractalRenderer || fractalError) return fractalRenderer; try { const target = document.createElement('canvas'); const { width, height } = fractalRenderSize(state.quality, Boolean(state.focusMode && !offlineFrameJob)); fractalRenderer = createMandelboxFlythroughRenderer({ canvas: target, width, height, onError: (error) => { fractalError = error.code || error.message; if (scene().kind === 'fractal') { state.renderingLost = true; announce(); } showToast(`3D renderer unavailable · ${fractalError}`); }, onRecover: () => { fractalError = ''; if (scene().kind === 'fractal') { state.renderingLost = false; announce(); } showToast('3D renderer recovered'); } }); } catch (error) { fractalError = error.code || error.message; if (scene().kind === 'fractal') announce(); showToast(`3D renderer unavailable · ${fractalError}`); } return fractalRenderer; }
function resetRenderer() { activeRenderState = { path: 'warming-up', width: null, height: null }; syncRendererReadout(); effectStack.reset(canvas.width, canvas.height); ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); const seedOverride = arguments.length ? arguments[0] : null; const seed = seedOverride === null ? undefined : seedOverride; if (scene().kind === 'fractal') { stopFlight(); flightPose = defaultFlightPose(); fractalError = ''; const renderer = ensureFractalRenderer(); const { width, height } = fractalRenderSize(state.quality, Boolean(state.focusMode && !offlineFrameJob)); renderer?.resize(width, height); } if (scene().kind === 'reaction') resetAcid(seed); if (scene().kind === 'automaton') resetTapestry(seed); if (scene().kind === 'feedback') resetFeedback(seed); if (scene().kind === 'particles') resetMagnetic(seed); if (scene().kind === 'geometry') resetCathedrals(seed); if (scene().kind === 'aquarium') resetAquarium(seed); if (scene().kind === 'interference') resetInterference(seed); if (scene().kind === 'topology') resetTopology(seed); if (scene().kind === 'phase') resetPhase(seed); if (scene().kind === 'evolution') resetEvolution(seed); if (scene().kind === 'advanced') state.elapsed = 0; }
function resetScene() { if (offlineJobActive()) return; resetRenderer(); state.elapsed = 0; announce(); showToast('Seed reset · deterministic start restored'); markDirty(); }

function setWorkflow(mode) { if (offlineJobActive()) return; const next = mode === 'perform' ? 'perform' : 'explore'; if (next === state.workflow) return false; state.workflow = next; renderControls(); announce(); markDirty(); return true; }
function renderWorkflow() { const explore = $('exploreModeButton'); const perform = $('performModeButton'); explore.classList.toggle('active', state.workflow !== 'perform'); perform.classList.toggle('active', state.workflow === 'perform'); explore.setAttribute('aria-pressed', String(state.workflow !== 'perform')); perform.setAttribute('aria-pressed', String(state.workflow === 'perform')); $('workflowHint').textContent = state.workflow === 'perform' ? 'Essential controls' : 'Full controls'; }
function toggleFocusMode() { if (offlineJobActive()) return; state.focusMode = !state.focusMode; document.body.classList.toggle('focus-mode', state.focusMode); $('focusButton').textContent = state.focusMode ? 'Exit focus' : 'Focus canvas'; $('focusButton').setAttribute('aria-pressed', String(state.focusMode)); refreshPaused(); syncFocusRenderFit(); syncFocusScaleReadout(); }
function renderScenes() {
  sceneList.innerHTML = sceneDefs.map((item, i) => `<button class="scene-item ${i === state.sceneIndex ? 'active' : ''}" data-scene="${i}" aria-pressed="${i === state.sceneIndex}" aria-label="${item.name}: ${item.mechanism}; starting look ${item.presets[0][0]}"><span class="scene-index">${item.number}</span><span class="scene-card-copy"><span class="scene-name">${item.name}</span><span class="scene-mechanism">${item.mechanism}</span><span class="scene-start">Start · ${item.presets[0][0]}</span></span><span class="scene-status"></span></button>`).join('');
  sceneList.querySelectorAll('[data-scene]').forEach((button) => button.addEventListener('click', () => switchScene(Number(button.dataset.scene))));
}
function currentEvolutionNode() { return state.evolution?.nodes?.find((node) => node.id === state.evolution.currentId) || state.evolution?.nodes?.[0]; }
function selectedEvolutionNode() { return state.evolution?.nodes?.find((node) => node.id === state.evolution.selectedId) || currentEvolutionNode(); }
function syncMagneticAttractors() { const p = state.params.magnetic; const b = buffers.magnetic; b.attractors[0] = clamp(p.attractorX, 0, 1); b.attractors[1] = clamp(p.attractorY, 0, 1); b.attractors[2] = clamp(p.attractorX + (p.split - .5) * .28, 0, 1); b.attractors[3] = clamp(p.attractorY + Math.sin(b.seed) * p.split * .18, 0, 1); }
function phaseArcAt(progress, index = state.params.phase.arc) { const arcIndex = clamp(Math.round(Number(index) || 0), 0, phaseArcs.length - 1); const arc = phaseArcs[arcIndex]; const t = clamp(Number(progress), 0, 1); const segment = t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2; const local = segment === 0 ? t * 3 : segment === 1 ? (t - 1 / 3) * 3 : 1; const from = arc.points[segment]; const to = segment === 2 ? from : arc.points[segment + 1]; const blend = local * local * (3 - 2 * local); return { arcIndex, arcId: arc.id, arcName: arc.name, curve: arc.curve, phase: from.phase, control: from.control + (to.control - from.control) * blend, regime: Math.round(from.regime + (to.regime - from.regime) * blend), disturbance: from.disturbance + (to.disturbance - from.disturbance) * blend, release: from.release + (to.release - from.release) * blend }; }
function recordPhaseEvent(type, arc = buffers.phase.arcIndex) { const b = buffers.phase; state.phaseEvents = [...state.phaseEvents.slice(-127), { type, arc: clamp(Math.round(Number(arc) || 0), 0, 2), phase: b.arcPhase, progress: Number(clamp(b.arcProgress, 0, 1).toFixed(5)), time: Number(state.elapsed.toFixed(4)), tempo: Number(state.tempo.toFixed(2)) }]; }
function startPhaseArc(index = state.params.phase.arc, mode = 'single', eventType = 'start') { if (offlineJobActive()) return; const arcIndex = clamp(Math.round(Number(index) || 0), 0, phaseArcs.length - 1); state.params.phase.arc = arcIndex; resetPhase(phaseArcs[arcIndex].seed); const b = buffers.phase; b.arcIndex = arcIndex; b.arcProgress = 0; b.arcPlaying = true; b.arcMode = mode; b.arcPhase = 'build'; recordPhaseEvent(eventType, arcIndex); markDirty(); updatePhaseReadout(); }
function stopPhaseArc(reason = 'stop') { if (offlineJobActive()) return; const b = buffers.phase; if (b.arcPlaying) recordPhaseEvent(reason, b.arcIndex); b.arcPlaying = false; b.arcMode = 'single'; b.arcPhase = reason === 'complete' ? 'release' : 'stopped'; markDirty(); updatePhaseReadout(); }
function rehearsePhaseArcs() { if (offlineJobActive()) return; startPhaseArc(0, 'all', 'rehearse'); showToast('Three arcs rehearsing · build, transition, release'); }
function effectivePhaseParameters() {
  const p = state.params.phase, b = buffers.phase;
  return b.arcPlaying ? phaseArcAt(b.arcProgress, b.arcIndex) : { control: p.control, regime: Math.round(p.regime), disturbance: p.disturbance, release: p.release };
}
function phaseMeasurement() { const p = state.params.phase; const b = buffers.phase; const profile = phaseArcAt(b.arcProgress, b.arcIndex); const effective = effectivePhaseParameters(); const effectiveControl = effective.control; return { model: phaseModel.id, modelName: phaseModel.name, equation: phaseModel.equation, arcId: profile.arcId, arcName: profile.arcName, curve: profile.curve, phase: b.arcPlaying ? profile.phase : b.arcPhase === 'idle' ? 'idle' : b.arcPhase, progress: Number(clamp(b.arcProgress, 0, 1).toFixed(5)), tempo: Number(state.tempo.toFixed(2)), control: Number(effectiveControl.toFixed(5)), regime: effective.regime, transitionGap: Number(clamp(b.transitionGap, 0, 1).toFixed(6)), compareReturnPath: p.compare > .5, playing: b.arcPlaying, traceSamples: b.arcTrace.length }; }
function sanitizePhaseMeasurement(data, label = 'Phase measurement') { const model = data?.model === legacyPhaseModel.id ? legacyPhaseModel : phaseModel; if (!data || typeof data !== 'object' || data.model !== model.id || data.modelName !== model.name || data.equation !== model.equation || typeof data.arcId !== 'string' || typeof data.arcName !== 'string' || typeof data.curve !== 'string' || !['idle', 'stopped', 'build', 'transition', 'release'].includes(data.phase) || !Number.isFinite(Number(data.progress)) || Number(data.progress) < 0 || Number(data.progress) > 1 || !Number.isFinite(Number(data.tempo)) || Number(data.tempo) < 40 || Number(data.tempo) > 180 || !Number.isFinite(Number(data.control)) || Number(data.control) < 0 || Number(data.control) > 1 || !Number.isInteger(data.regime) || data.regime < 0 || data.regime > 5 || !Number.isFinite(Number(data.transitionGap)) || Number(data.transitionGap) < 0 || Number(data.transitionGap) > 1 || typeof data.compareReturnPath !== 'boolean' || typeof data.playing !== 'boolean' || !Number.isInteger(data.traceSamples) || data.traceSamples < 0 || data.traceSamples > 512) throw new Error(`${label} is malformed`); const arc = phaseArcs.find((candidate) => candidate.id === data.arcId); if (!arc || data.arcName !== arc.name || data.curve !== arc.curve) throw new Error(`${label} has unknown arc identity`); return { model: model.id, modelName: model.name, equation: model.equation, arcId: arc.id, arcName: arc.name, curve: arc.curve, phase: data.phase, progress: Number(data.progress), tempo: Number(data.tempo), control: Number(data.control), regime: data.regime, transitionGap: Number(data.transitionGap), compareReturnPath: data.compareReturnPath, playing: data.playing, traceSamples: data.traceSamples }; }
function sanitizePhaseMeasurementArchive(data) { if (data === undefined || data === null) return null; if (!data || typeof data !== 'object' || data.format !== phaseMeasurementFormat || data.version !== 1 || data.savedMeasurement !== true || (data.eventPosition !== undefined && data.eventPosition !== null && (!Number.isInteger(data.eventPosition) || data.eventPosition < 0 || data.eventPosition > 128))) throw new Error('Archived phase measurement is malformed'); return { format: phaseMeasurementFormat, version: 1, savedMeasurement: true, eventPosition: data.eventPosition === undefined || data.eventPosition === null ? null : data.eventPosition, measurement: sanitizePhaseMeasurement(data.measurement, 'Archived phase measurement') }; }
function phaseArchiveSummary() { const archive = state.phaseMeasurementArchive; if (!archive) return 'Saved capture (archived): none'; const m = archive.measurement; const position = archive.eventPosition === null ? 'event position unavailable' : `event ${archive.eventPosition}`; return `Saved capture (archived) · model ${m.modelName} · arc ${m.arcName} · curve ${m.curve} · ${m.phase} · progress ${m.progress.toFixed(2)} · ${m.tempo.toFixed(0)} BPM · control ${m.control.toFixed(2)} · transition gap ${m.transitionGap.toFixed(3)} · ${position}`; }
function archivePhaseMeasurement() { if (offlineJobActive()) return; if (scene().kind !== 'phase') return showToast('Choose Phase Transition Theatre first'); state.phaseMeasurementArchive = { format: phaseMeasurementFormat, version: 1, savedMeasurement: true, eventPosition: state.phaseEvents.length, measurement: structuredClone(phaseMeasurement()) }; markDirty(); renderPhaseActions(); showToast('Phase measurement archived locally'); }
function renderEvolutionActions() { const existing = $('evolutionActions'); existing?.remove(); if (scene().kind !== 'evolution') return; controls.insertAdjacentHTML('beforeend', `<div class="evolution-actions" id="evolutionActions"><div class="evolution-action-row"><button class="small-button" id="mutateButton">Mutate siblings</button><button class="small-button" id="chooseButton">Choose focus</button><button class="small-button" id="favoriteButton">Favorite</button><button class="small-button" id="undoEvolutionButton">Undo</button><button class="small-button" id="promoteButton">Promote to set</button></div><div class="evolution-name-row"><input id="evolutionNameInput" maxlength="40" placeholder="Name selected discovery" value="${escapeHtml(selectedEvolutionNode()?.name || '')}" /><button class="small-button" id="nameEvolutionButton">Name</button></div></div>`); $('mutateButton').addEventListener('click', mutateEvolution); $('chooseButton').addEventListener('click', () => chooseEvolutionChild(Math.round(clamp(state.params.evolution.focus, 0, 1) * 4))); $('favoriteButton').addEventListener('click', toggleEvolutionFavorite); $('undoEvolutionButton').addEventListener('click', undoEvolution); $('promoteButton').addEventListener('click', promoteEvolution); $('nameEvolutionButton').addEventListener('click', nameEvolution); }
function renderMagneticActions() { const existing = $('magneticActions'); existing?.remove(); if (scene().kind !== 'particles') return; const events = state.gestureHistory.filter((event) => event.scene === 3); const queued = buffers.magnetic.replay.playing ? ' · replaying on beat clock' : ''; controls.insertAdjacentHTML('beforeend', `<div class="magnetic-actions" id="magneticActions"><button class="small-button" id="replayGesturesButton">Replay timed gestures</button><button class="small-button" id="stopGesturesButton">Stop replay</button><button class="small-button" id="clearGesturesButton">Clear gestures</button><span class="hint">${events.length} saved gestures${queued}</span></div>`); $('replayGesturesButton').addEventListener('click', replayGestureSequence); $('stopGesturesButton').addEventListener('click', () => { stopMagneticReplay('Magnetic replay stopped'); renderMagneticActions(); }); $('clearGesturesButton').addEventListener('click', () => { if (offlineJobActive()) return; stopMagneticReplay(); state.gestureHistory = state.gestureHistory.filter((event) => event.scene !== 3); markDirty(); renderMagneticActions(); showToast('Magnetic gesture history cleared'); }); }
function renderPhaseActions() { const existing = $('phaseActions'); existing?.remove(); if (scene().kind !== 'phase') return; controls.insertAdjacentHTML('beforeend', `<div class="phase-actions" id="phaseActions"><div class="phase-action-row"><label>Arc <select id="phaseArcSelect">${phaseArcs.map((arc, index) => `<option value="${index}">${arc.name} · ${arc.curve}</option>`).join('')}</select></label><button class="small-button" id="playPhaseArcButton">Play journey</button><button class="small-button" id="stopPhaseArcButton">Manual controls</button><button class="small-button" id="rehearsePhaseArcsButton">Rehearse all</button><button class="small-button" id="capturePhaseMeasurementButton">Archive measurement</button></div><div class="phase-action-readout" id="phaseActionReadout"></div><div class="phase-archive-readout" id="phaseArchiveReadout"></div></div>`); const select = $('phaseArcSelect'); select.value = String(state.params.phase.arc); select.addEventListener('change', () => { if (offlineJobActive()) return; state.params.phase.arc = clamp(Number(select.value), 0, 2); stopPhaseArc('choose'); resetPhase(phaseArcs[state.params.phase.arc].seed); recordPhaseEvent('choose', state.params.phase.arc); renderPhaseActions(); markDirty(); updatePhaseReadout(); }); $('playPhaseArcButton').addEventListener('click', () => startPhaseArc(Number(select.value), 'single')); $('stopPhaseArcButton').addEventListener('click', () => stopPhaseArc()); $('rehearsePhaseArcsButton').addEventListener('click', rehearsePhaseArcs); $('capturePhaseMeasurementButton').addEventListener('click', archivePhaseMeasurement); updatePhaseReadout(); }
function renderControls() { const def = scene(); const values = state.params[def.id]; const manualSchema = def.kind === 'phase' ? def.schema.filter(([key]) => key !== 'arc') : def.id === 'fourspace' ? def.schema.filter(([key]) => key !== 'density' || values.shape > .5) : def.schema; const visibleSchema = state.workflow === 'perform' ? manualSchema.slice(0, Math.min(3, manualSchema.length)) : manualSchema; controls.innerHTML = visibleSchema.map(([key, label, min, max, step]) => `<div class="control"><label for="control-${key}">${label}<output id="output-${key}">${Number(values[key]).toFixed(step < 1 ? 2 : 0)}</output></label><input id="control-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${values[key]}" /></div>`).join(''); visibleSchema.forEach(([key]) => { const input = $(`control-${key}`); input.addEventListener('input', () => { if (offlineJobActive()) return; state.params[def.id][key] = Number(input.value); if (def.kind === 'fractal' && key === 'fractalScale' && worldDistance(flightPose.position, state.params.fractal.fractalScale) < .035) { stopFlight(); flightPose = defaultFlightPose(); showToast('Passage narrowed · returned to the entrance'); } if (def.kind === 'particles' && ['attractorX', 'attractorY', 'split'].includes(key)) syncMagneticAttractors(); $(`output-${key}`).value = Number(input.value).toFixed(input.step < 1 ? 2 : 0); if (def.id === 'fourspace' && key === 'shape') renderControls(); if (def.kind === 'phase') { if (buffers.phase.arcPlaying) stopPhaseArc(); updatePhaseReadout(); } markDirty(); }); }); renderWorkflow(); renderPresets(); renderEvolutionActions(); renderMagneticActions(); renderPhaseActions(); renderFlightControls(); }
function renderPresets() { const strip = $('presetStrip'); strip.innerHTML = scene().presets.map((item, i) => `<button class="preset-chip ${i === state.presetIndex[state.sceneIndex] ? 'active' : ''}" data-preset="${i}"><strong>${item[0]}</strong><small>${item[1]}</small></button>`).join(''); strip.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => selectPreset(Number(button.dataset.preset)))); }
function formatSetTime(seconds) { const total = Math.max(0, Math.round(Number(seconds) || 0)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`; }
function syncRecordingReadout(now = performance.now()) { const button = $('recordButton'); if (!button || audio.recorder?.state !== 'recording' || !Number.isFinite(audio.recordingStartedAt)) return; if (now - audio.recordingLastPaint < 250) return; audio.recordingLastPaint = now; button.textContent = `Stop · ${formatSetTime((now - audio.recordingStartedAt) / 1000)}`; }
function setSetName(value) {
  if (offlineJobActive() || state.setPlaying) return false;
  const name = typeof value === 'string' ? value.trim().slice(0, 80) : '';
  if (!name) return false;
  const input = $('setNameInput'); if (input) input.value = name;
  if (name === state.setName) return true;
  state.setName = name;
  markDirty(); return true;
}
function setDurationSeconds() { return cues.reduce((sum, cue) => sum + Number(cue.duration) * 4 * (60 / state.tempo), 0); }
function updateSetProgress() {
  const total = setDurationSeconds();
  const totalBars = cues.reduce((sum, cue) => sum + Number(cue.duration), 0);
  const complete = state.setComplete && state.currentCue < 0;
  let elapsed = 0;
  let activeCue = null;
  let cueElapsedBeats = 0;
  if (state.currentCue >= 0 && cues[state.currentCue]) {
    const cue = cues[state.currentCue]; activeCue = cue;
    for (let index = 0; index < state.currentCue; index += 1) elapsed += cues[index].duration * 4 * (60 / state.tempo);
    cueElapsedBeats = state.setPlaying ? cueConsumedBeats + Math.max(0, performance.now() - cueStartedAt) * state.tempo / 60000 : cue.duration * 4 - cueRemainingBeats;
    elapsed += Math.min(cue.duration * 4, cueElapsedBeats) * 60 / state.tempo;
  }
  const progress = $('setProgress');
  if (progress) progress.textContent = `${formatSetTime(complete ? total : elapsed)} / ${formatSetTime(total)} · ${totalBars} bars${state.setPlaying ? ' · LIVE' : complete ? ' · COMPLETE' : state.currentCue >= 0 ? ' · PAUSED' : ''}`;
  const current = $('cueCurrentReadout');
  if (current) {
    if (activeCue) {
      const remaining = Math.max(0, activeCue.duration * 4 - cueElapsedBeats) * 60 / state.tempo;
      const mode = state.setPlaying ? 'LIVE' : 'PAUSED';
      current.textContent = `Cue ${state.currentCue + 1}/${cues.length} · ${activeCue.label} · ${formatSetTime(remaining)} left · ${mode}`;
      current.setAttribute('aria-label', `Cue ${state.currentCue + 1} of ${cues.length}, ${activeCue.label}, ${formatSetTime(remaining)} remaining, ${mode.toLowerCase()}`);
    } else if (complete) {
      current.textContent = 'Set complete · Play set to restart';
      current.setAttribute('aria-label', 'Set complete. Play set to restart.');
    } else {
      current.textContent = 'No cue selected';
      current.setAttribute('aria-label', 'No cue selected');
    }
  }
  syncRehearsalReportFreshness();
}
function setCueDuration(index, value) {
  if (offlineJobActive() || state.setPlaying) return false;
  const cue = cues[index]; let raw = NaN;
  if (typeof value === 'number') raw = value;
  else if (typeof value === 'string' && value.trim()) raw = Number(value);
  if (!cue || !Number.isFinite(raw) || !Number.isInteger(raw)) return false;
  const next = clamp(Math.round(raw), 1, 64);
  const previous = cue.duration;
  if (next === previous) return true;
  cue.duration = next;
  state.setComplete = false;
  if (state.currentCue === index && (cueRemainingBeats > 0 || cueConsumedBeats > 0)) {
    const elapsedBeats = Math.max(0, previous * 4 - cueRemainingBeats, cueConsumedBeats);
    cueRemainingBeats = Math.max(0, next * 4 - elapsedBeats);
    cueConsumedBeats = Math.min(next * 4, elapsedBeats);
    cueRemainingMs = cueRemainingBeats * 60000 / state.tempo;
  }
  renderCues(); markDirty(); return true;
}
function setCueLabel(index, value) {
  if (offlineJobActive() || state.setPlaying) return false;
  const cue = cues[index];
  const label = typeof value === 'string' ? value.trim().slice(0, 60) : '';
  if (!cue || !label) return false;
  if (label === cue.label) return true;
  cue.label = label;
  state.setComplete = false;
  renderCues(); markDirty(); return true;
}
function moveCue(index, direction) {
  if (offlineJobActive() || state.setPlaying) return false;
  const from = Number(index); const offset = Number(direction); const to = from + offset;
  if (!Number.isInteger(from) || !Number.isInteger(offset) || ![-1, 1].includes(offset) || from < 0 || from >= cues.length || to < 0 || to >= cues.length) return false;
  const [cue] = cues.splice(from, 1); cues.splice(to, 0, cue);
  state.setComplete = false;
  if (state.currentCue === from) state.currentCue = to;
  else if (state.currentCue === to) state.currentCue = from;
  renderCues(); markDirty(); return true;
}
function previewCue(index) {
  if (offlineJobActive() || state.setPlaying) return false;
  const cueIndex = Number(index); const cue = cues[cueIndex];
  if (!Number.isInteger(cueIndex) || !cue) return false;
  state.setComplete = false; stopSetRun(false); switchScene(cue.scene, cue.preset, cue); applyCueSnapshot(cue);
  state.currentCue = cueIndex; cueRemainingBeats = cue.duration * 4; cueConsumedBeats = 0; cueRemainingMs = cueRemainingBeats * 60000 / state.tempo;
  renderCues(); updateSetProgress(); syncReadinessStatus(); showToast(`Cue ${cueIndex + 1} previewed`); return true;
}
function duplicateCue(index) {
  if (offlineJobActive() || state.setPlaying) return false;
  const cueIndex = Number(index); const cue = cues[cueIndex];
  if (!Number.isInteger(cueIndex) || !cue) return false;
  if (cues.length >= 64) { showToast('Set is full · remove a cue first'); return false; }
  const suffix = ' · copy'; const base = String(cue.label || 'Unnamed cue').trim() || 'Unnamed cue';
  const duplicate = structuredClone(cue); duplicate.label = `${base.slice(0, 60 - suffix.length)}${suffix}`;
  state.setComplete = false;
  cues.splice(cueIndex + 1, 0, duplicate); if (state.currentCue > cueIndex) state.currentCue += 1;
  renderCues(); markDirty(); showToast('Cue duplicated'); return true;
}
function revealCurrentCue() { const active = cueList.querySelector?.('.cue.current'); active?.scrollIntoView?.({ block: 'nearest' }); }
function renderCues() { $('cueCount').textContent = `${cues.length.toString().padStart(2, '0')} CUES`; cueList.innerHTML = cues.map((cue, i) => `<div class="cue ${i === state.currentCue ? 'current' : ''}" role="listitem" aria-posinset="${i + 1}" aria-setsize="${cues.length}" aria-label="Cue ${i + 1} of ${cues.length}: ${escapeHtml(cue.label)} · ${escapeHtml(sceneDefs[cue.scene].name)} · ${cue.duration} bars"${i === state.currentCue ? ' aria-current="step"' : ''}><span class="cue-num">${String(i + 1).padStart(2, '0')}</span><div class="cue-main"><label class="cue-label"><input data-label-cue="${i}" type="text" maxlength="60" value="${escapeHtml(cue.label)}" aria-label="Name for cue ${i + 1}"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} /></label><span class="cue-meta">${sceneDefs[cue.scene].number} / ${sceneDefs[cue.scene].name} · <label class="cue-duration"><input data-duration-cue="${i}" type="number" min="1" max="64" step="1" value="${cue.duration}" aria-label="Duration for ${escapeHtml(cue.label)} in bars"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} /> bars</label>${cue.sceneParamsSnapshot ? ' · captured' : ''}</span></div><div class="cue-actions"><button class="cue-preview" data-preview-cue="${i}"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Preview ${escapeHtml(cue.label)}">▷</button><button class="cue-duplicate" data-duplicate-cue="${i}"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Duplicate ${escapeHtml(cue.label)}">⧉</button><button class="cue-move" data-move-cue="${i}" data-direction="-1"${i === 0 || state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Move ${escapeHtml(cue.label)} earlier">↑</button><button class="cue-move" data-move-cue="${i}" data-direction="1"${i === cues.length - 1 || state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Move ${escapeHtml(cue.label)} later">↓</button><button class="cue-update" data-update-cue="${i}"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Capture current look into ${escapeHtml(cue.label)}">↺</button><button class="cue-remove" data-remove-cue="${i}"${state.setPlaying || offlineFrameJob ? ' disabled' : ''} aria-label="Remove ${escapeHtml(cue.label)}">×</button></div></div>`).join(''); cueList.querySelectorAll('[data-duplicate-cue]').forEach((button) => button.addEventListener('click', () => { if (!duplicateCue(Number(button.dataset.duplicateCue))) renderCues(); })); cueList.querySelectorAll('[data-preview-cue]').forEach((button) => button.addEventListener('click', () => { if (!previewCue(Number(button.dataset.previewCue))) renderCues(); })); cueList.querySelectorAll('[data-move-cue]').forEach((button) => button.addEventListener('click', () => { if (!moveCue(Number(button.dataset.moveCue), Number(button.dataset.direction))) renderCues(); })); cueList.querySelectorAll('[data-label-cue]').forEach((input) => input.addEventListener('change', () => { if (!setCueLabel(Number(input.dataset.labelCue), input.value)) renderCues(); })); cueList.querySelectorAll('[data-duration-cue]').forEach((input) => input.addEventListener('change', () => { if (!setCueDuration(Number(input.dataset.durationCue), input.value)) renderCues(); })); cueList.querySelectorAll('[data-update-cue]').forEach((button) => button.addEventListener('click', () => { if (offlineJobActive() || state.setPlaying) return showToast('Pause the set before updating a cue'); const index = Number(button.dataset.updateCue); const cue = cues[index]; if (!cue || cue.scene !== state.sceneIndex) return showToast('Show the cue scene before capturing its look'); captureCueSnapshot(cue); renderCues(); markDirty(); showToast('Cue look captured'); })); cueList.querySelectorAll('[data-remove-cue]').forEach((button) => button.addEventListener('click', () => { if (offlineJobActive() || state.setPlaying) return showToast('Pause the set before removing a cue'); if (cues.length <= 1) return showToast('A set needs at least one cue'); const index = Number(button.dataset.removeCue); if (!Number.isInteger(index) || index < 0 || index >= cues.length) return; const wasCurrent = state.currentCue === index; stopSetRun(true); cues.splice(index, 1); if (wasCurrent) { state.currentCue = -1; cueRemainingMs = 0; cueRemainingBeats = 0; cueConsumedBeats = 0; } else if (state.currentCue > index) state.currentCue -= 1; renderCues(); markDirty(); })); updateSetProgress(); revealCurrentCue(); }
const cues = [
  { label: 'Root / City breathing', scene: 0, preset: 0, duration: 8 }, { label: 'Magnetic torus', scene: 3, preset: 0, duration: 8 }, { label: 'Magnetic split', scene: 3, preset: 1, duration: 8 }, { label: 'Magnetic silk', scene: 3, preset: 2, duration: 8 }, { label: 'Crystal nave', scene: 4, preset: 0, duration: 8 }, { label: 'Aquarium solitary', scene: 5, preset: 0, duration: 8 }, { label: 'Aquarium bloom', scene: 5, preset: 2, duration: 8 }, { label: 'Aquarium recovery', scene: 5, preset: 5, duration: 8 }, { label: 'Causal bloom', scene: 1, preset: 2, duration: 12 }, { label: 'Glass remembers', scene: 2, preset: 2, duration: 16 }, { label: 'Interference fringe', scene: 6, preset: 0, duration: 8 }, { label: 'Topological braid', scene: 7, preset: 0, duration: 8 }, { label: 'Topological tangent', scene: 7, preset: 2, duration: 8 }, { label: 'Topological rosette', scene: 7, preset: 5, duration: 8 }, { label: 'Dawn Assembly / build-transition-release', scene: 8, preset: 1, duration: 12, arc: 0 }, { label: 'Glass Front / build-transition-release', scene: 8, preset: 3, duration: 16, arc: 1 }, { label: 'Night Return / build-transition-release', scene: 8, preset: 4, duration: 20, arc: 2 }, { label: 'Chosen child', scene: 9, preset: 4, duration: 8 }, { label: 'Clean recovery', scene: 2, preset: 5, duration: 8 },
];
canvas.addEventListener('contextlost', () => { if (state.setPlaying) stopSetRun(true); });
canvas.addEventListener('contextrestored', () => { queueMicrotask(() => { if (state.paused && !state.blackout && !state.renderingLost) drawPreview(); }); });
const performanceScoreCues = [
  { label: 'I · Mycelium / Build · First veins', scene: 0, preset: 0, duration: 64, sceneParamsSnapshot: { growth: .38, injection: .24, diffusion: .7, contrast: 1, drift: .12 }, paletteSnapshot: { primary: '#b1ffed', secondary: '#234f9e', accent: '#65caff' }, effectsSnapshot: { symmetry: .08, echo: .18, chroma: .04, glow: .3 } },
  { label: 'I · Mycelium / Peak · Vein cathedral', scene: 0, preset: 1, duration: 64, sceneParamsSnapshot: { growth: .82, injection: .72, diffusion: 1.1, contrast: 1.7, drift: .4 }, paletteSnapshot: { primary: '#d5ff5f', secondary: '#5364ff', accent: '#ff5bc8' }, effectsSnapshot: { symmetry: .34, echo: .58, chroma: .16, glow: .8 } },
  { label: 'I · Mycelium / Release · Night orchard', scene: 0, preset: 3, duration: 64, sceneParamsSnapshot: { growth: .52, injection: .16, diffusion: .55, contrast: .8, drift: .05 }, paletteSnapshot: { primary: '#ffffff', secondary: '#364152', accent: '#a5b4c9' }, effectsSnapshot: { symmetry: .04, echo: .22, chroma: .02, glow: .3 } },
  { label: 'II · Magnetic / Build · Silk gathers', scene: 3, preset: 2, duration: 64, sceneParamsSnapshot: { attractorX: .62, attractorY: .42, attractor: .55, trail: .94, density: .48, motion: .3, split: .28 }, paletteSnapshot: { primary: '#b1ffed', secondary: '#234f9e', accent: '#65caff' }, effectsSnapshot: { symmetry: .12, echo: .35, chroma: .08, glow: .52 } },
  { label: 'II · Magnetic / Peak · Split vortex', scene: 3, preset: 1, duration: 64, sceneParamsSnapshot: { attractorX: .38, attractorY: .5, attractor: .84, trail: .84, density: .78, motion: .68, split: .82 }, paletteSnapshot: { primary: '#ffcd75', secondary: '#802938', accent: '#ff643d' }, effectsSnapshot: { symmetry: .42, echo: .64, chroma: .24, glow: .88 } },
  { label: 'II · Magnetic / Release · Blue undertow', scene: 3, preset: 4, duration: 64, sceneParamsSnapshot: { attractorX: .72, attractorY: .58, attractor: .42, trail: .96, density: .36, motion: .22, split: .18 }, paletteSnapshot: { primary: '#ffffff', secondary: '#364152', accent: '#a5b4c9' }, effectsSnapshot: { symmetry: .06, echo: .2, chroma: .02, glow: .28 } },
  { label: 'III · Topology / Build · Braided loop', scene: 7, preset: 0, duration: 64, sceneParamsSnapshot: { family: 0, loop: .62, thickness: .48, twist: .58, camera: .42, material: .4, keyframe: .12 }, paletteSnapshot: { primary: '#ecc7ff', secondary: '#5c2dba', accent: '#ff70ab' }, effectsSnapshot: { symmetry: .12, echo: .3, chroma: .08, glow: .48 } },
  { label: 'III · Topology / Peak · Melted rosette', scene: 7, preset: 5, duration: 64, sceneParamsSnapshot: { family: 2, loop: .58, thickness: .84, twist: .66, camera: .62, material: .78, keyframe: .82 }, paletteSnapshot: { primary: '#ffcd75', secondary: '#802938', accent: '#ff643d' }, effectsSnapshot: { symmetry: .38, echo: .62, chroma: .22, glow: .86 } },
  { label: 'III · Topology / Release · Quiet figure eight', scene: 7, preset: 4, duration: 64, sceneParamsSnapshot: { family: 1, loop: .3, thickness: .28, twist: .12, camera: .08, material: .18, keyframe: .46 }, paletteSnapshot: { primary: '#ffffff', secondary: '#364152', accent: '#a5b4c9' }, effectsSnapshot: { symmetry: .02, echo: .16, chroma: .01, glow: .24 } },
];

function switchScene(index, presetIndex = state.presetIndex[index], cue = null) { if (offlineJobActive()) return; const nextPreset = clamp(presetIndex, 0, sceneDefs[index].presets.length - 1); if (index === state.sceneIndex && nextPreset === state.presetIndex[index] && !cue?.paramsSnapshot && !cue?.sceneParamsSnapshot && cue?.arc === undefined) return; transitionCtx.clearRect(0, 0, canvas.width, canvas.height); transitionCtx.drawImage(canvas, 0, 0); state.transition = { from: state.sceneIndex, to: index, progress: 0 }; Object.assign(scenePalettes[scene().id], palette); stopFlight(); state.sceneIndex = index; resetPerformanceReadout(); lastQualityABProbe = null; if (scene().kind !== 'fractal') state.renderingLost = false; Object.assign(palette, scenePalettes[scene().id]); fillPalette(); state.presetIndex[index] = nextPreset; state.gesture = { x: .5, y: .5, active: false, scene: index }; const presetConfig = sceneDefs[index].presets[nextPreset][3]; if (presetConfig) Object.assign(state.params[sceneDefs[index].id], structuredClone(presetConfig)); if (sceneDefs[index].kind === 'fractal') Object.assign(palette, fractalLookPalettes[nextPreset] || fractalLookPalettes[0]); if (cue?.paramsSnapshot && sceneDefs[index].kind === 'evolution') { state.params.evolution = structuredClone(cue.paramsSnapshot); const node = state.evolution?.nodes?.find((candidate) => candidate.id === cue.nodeId); if (node) state.evolution.currentId = state.evolution.selectedId = node.id; } resetRenderer(); if (sceneDefs[index].kind === 'phase' && cue?.arc !== undefined) startPhaseArc(cue.arc, 'single', 'cue'); renderScenes(); renderControls(); announce(); syncSetControls(); markDirty(); }
function selectPreset(index) { if (offlineJobActive()) return; const next = clamp(index, 0, scene().presets.length - 1); const current = state.presetIndex[state.sceneIndex]; const presetConfig = scene().presets[next][3]; const paramsMatch = !presetConfig || Object.entries(presetConfig).every(([key, value]) => state.params[scene().id]?.[key] === value); const look = scene().kind === 'fractal' ? fractalLookPalettes[next] || fractalLookPalettes[0] : null; const paletteMatch = !look || JSON.stringify(palette) === JSON.stringify(look); if (next === current && paramsMatch && paletteMatch) return false; state.presetIndex[state.sceneIndex] = next; if (presetConfig) Object.assign(state.params[scene().id], structuredClone(presetConfig)); if (scene().kind === 'fractal') { Object.assign(palette, look); fillPalette(); } resetScene(); renderControls(); renderPresets(); return true; }

function applyMagneticGesture(x, y, amount = 1) { const b = buffers.magnetic; const safeX = clamp(x, 0, 1); const safeY = clamp(y, 0, 1); b.attractors[0] = safeX; b.attractors[1] = safeY; b.attractors[2] = clamp(safeX + (state.params.magnetic.split - .5) * .28, 0, 1); b.attractors[3] = clamp(safeY + Math.sin(b.seed) * state.params.magnetic.split * .18, 0, 1); state.params.magnetic.attractorX = b.attractors[0]; state.params.magnetic.attractorY = b.attractors[1]; for (let i = 0; i < b.count; i += 1) { const index = i * 4; const dx = b.particles[index] - safeX; const dy = b.particles[index + 1] - safeY; const distance = Math.max(.02, Math.hypot(dx, dy)); b.particles[index + 2] += clamp(dx / distance, -.08, .08) * amount * .01; b.particles[index + 3] += clamp(dy / distance, -.08, .08) * amount * .01; } }
function stopMagneticReplay(message = '') { if (offlineJobActive()) return; const replay = buffers.magnetic.replay; if (replay.playing) replay.playing = false; if (message) showToast(message); }
function replayGestureSequence() { if (offlineJobActive()) return; const events = state.gestureHistory.filter((event) => event.scene === 3); if (!events.length) return showToast('No magnetic gestures saved'); resetMagnetic(preset()[2]); const timed = events.filter((event) => event.timing === 'beat' && Number.isFinite(event.beat)); const legacy = events.filter((event) => event.timing !== 'beat' || !Number.isFinite(event.beat)); for (const event of legacy) applyMagneticGesture(event.x, event.y, event.amount); if (timed.length) { const firstBeat = timed[0].beat; buffers.magnetic.replay = { events: timed.map((event) => ({ ...event, beat: Math.max(0, event.beat - firstBeat) })), index: 0, playing: true, startBeat: state.elapsed * state.tempo / 60 }; showToast(`${legacy.length ? `${legacy.length} legacy gesture(s) applied now · ` : ''}${timed.length} gestures queued on beat clock`); } else showToast(`${legacy.length} legacy gesture(s) applied now`); markDirty(); }
function injectAcid(x, y, amount = 1) { const b = buffers.acid; const cx = Math.floor(clamp(x, 0, 1) * b.width); const cy = Math.floor(clamp(y, 0, 1) * b.height); const radius = Math.max(2, Math.floor(2 + state.params.acid.injection * 6)); for (let yy = -radius; yy <= radius; yy += 1) for (let xx = -radius; xx <= radius; xx += 1) if (xx * xx + yy * yy <= radius * radius) { const i = ((cy + yy + b.height) % b.height) * b.width + ((cx + xx + b.width) % b.width); b.v[i] = clamp(b.v[i] + .7 * amount, 0, 1); b.u[i] = clamp(b.u[i] - .25 * amount, 0, 1); } }
function inject(x = state.gesture.x, y = state.gesture.y, amount = 1) { if (offlineJobActive()) return; const def = scene(); if (def.kind === 'advanced') { const p = state.params[def.id]; if (def.id === 'julia') { p.real = -1.2 + clamp(x, 0, 1) * 1.7; p.imaginary = -.9 + clamp(y, 0, 1) * 1.8; } else if (def.id === 'fourspace') { p.rotation = (clamp(x, 0, 1) - .5) * 1.6; p.counter = (clamp(y, 0, 1) - .5) * 1.6; } else { p.bend = clamp(x, 0, 1) * .85; p.weave = clamp(y, 0, 1); } renderControls(); markDirty(); } else if (def.kind === 'topology') { state.params.topology.camera = clamp(x, 0, 1); state.params.topology.twist = clamp(y, 0, 1); renderControls(); markDirty(); } else if (def.kind === 'reaction') { injectAcid(x, y, amount); } else if (def.kind === 'automaton') { const b = buffers.tapestry; b.current[Math.min(b.width - 1, Math.floor(clamp(x, 0, 1) * b.width))] = 1; } else if (def.kind === 'particles') { state.gestureHistory = [...state.gestureHistory.filter((event) => event.scene !== 3), ...state.gestureHistory.filter((event) => event.scene === 3).slice(-127), { scene: 3, x: clamp(x, 0, 1), y: clamp(y, 0, 1), amount: clamp(amount, 0, 1), timing: 'beat', beat: Number((state.elapsed * state.tempo / 60).toFixed(4)) }]; applyMagneticGesture(x, y, amount); markDirty(); } else if (def.kind === 'phase') { const b = buffers.phase; const cx = Math.min(b.width - 1, Math.floor(clamp(x, 0, 1) * b.width)); const cy = Math.min(b.height - 1, Math.floor(clamp(y, 0, 1) * b.height)); b.values[cy * b.width + cx] = clamp(b.values[cy * b.width + cx] + amount * .5, 0, 1); } else if (def.kind === 'evolution') { chooseEvolutionChild(Math.floor(clamp(x, 0, 1) * 5)); } else { state.gesture = { x, y, active: true, scene: state.sceneIndex }; } }

function stepAcid(dt) { const p = state.params.acid; const b = buffers.acid; const speed = state.reducedMotion ? .35 : .7 + p.growth * 2.4; const steps = Math.max(1, Math.min(4, Math.floor(dt * 60 * speed / 16))); for (let i = 0; i < steps; i += 1) { const next = reactionDiffusionStep(b.u, b.v, b.width, b.height, .018 + p.growth * .026, .045 + (1 - p.growth) * .02, p.diffusion); b.u = next.u; b.v = next.v; } if (p.injection > .01 && b.random() < dt * 0.35) injectAcid(.45 + Math.sin(state.elapsed * .3) * .22, .5 + Math.cos(state.elapsed * .23) * .2, p.injection * .25); }
function drawAcid() { const b = buffers.acid; const p = state.params.acid; const a = colorRgb(palette.primary); const s = colorRgb(palette.secondary); const c = colorRgb(palette.accent); const image = ctx.createImageData(b.width, b.height); for (let i = 0; i < b.v.length; i += 1) { let value = clamp(b.v[i] * p.contrast * 2.6, 0, 1); const m = value < .5 ? mixColor([5, 7, 12], s, value * 2) : mixColor(s, a, (value - .5) * 2); const tint = (Math.sin(i * .021 + state.elapsed * p.drift * 1.5) + 1) * .5; const rgb = mixColor(m, c, tint * value * .28); image.data[i * 4] = rgb[0]; image.data[i * 4 + 1] = rgb[1]; image.data[i * 4 + 2] = rgb[2]; image.data[i * 4 + 3] = 255; } renderBuffer.width = b.width; renderBuffer.height = b.height; renderCtx.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(renderBuffer, 0, 0, canvas.width, canvas.height); renderBuffer.width = canvas.width; renderBuffer.height = canvas.height; }
function stepTapestry(dt) { const b = buffers.tapestry; const p = state.params.tapestry; const count = Math.max(1, Math.min(5, Math.floor(dt * 60 * (state.reducedMotion ? .2 : .4 + p.scroll * 1.8)))); for (let n = 0; n < count; n += 1) { b.rows[b.cursor] = b.current.slice(); b.current = stepElementary(b.current, p.rule); b.cursor = (b.cursor + 1) % b.rows.length; } }
function drawTapestry() { const b = buffers.tapestry; const p = state.params.tapestry; const width = canvas.width; const height = canvas.height; const image = ctx.createImageData(width, height); const data = image.data; const a = colorRgb(palette.primary); const s = colorRgb(palette.secondary); const c = colorRgb(palette.accent); const phase = state.elapsed * (state.reducedMotion ? .05 : .3); const offset = p.reversal > .5 ? -Math.floor(state.elapsed * 4 * p.scroll) : Math.floor(state.elapsed * 4 * p.scroll); ensureTapestryRasterCache(width); for (let y = 0; y < height; y += 1) { const historyY = Math.floor(y / 5); const rowIndex = (b.cursor - historyY * (1 + Math.floor(p.weave * 2)) + offset + b.rows.length * 20) % b.rows.length; const row = b.rows[rowIndex]; const yPhase = y * .011 + phase; const sinY = Math.sin(yPhase); const cosY = Math.cos(yPhase); let index = y * width * 4; for (let x = 0; x < width; x += 1) { const weave = (tapestrySinX[x] * cosY + tapestryCosX[x] * sinY) * .5 + .5; if (row[tapestryColumnMap[x]]) { const target = weave > .68 ? c : s; data[index] = Math.round(a[0] + (target[0] - a[0]) * weave); data[index + 1] = Math.round(a[1] + (target[1] - a[1]) * weave); data[index + 2] = Math.round(a[2] + (target[2] - a[2]) * weave); } else { data[index] = 4 + Math.floor(weave * 6); data[index + 1] = 5 + Math.floor(weave * 4); data[index + 2] = 12 + Math.floor(weave * 12); } data[index + 3] = 255; index += 4; } } ctx.putImageData(image, 0, 0); }
function stepFeedback() { const p = state.params.feedback; const current = buffers.feedback.current; const next = 1 - current; const source = fctx[current]; const target = fctx[next]; target.setTransform(1, 0, 0, 1, 0, 0); target.globalCompositeOperation = 'source-over'; target.fillStyle = '#04040a'; target.fillRect(0, 0, canvas.width, canvas.height); target.save(); target.translate(canvas.width / 2, canvas.height / 2); target.rotate(p.transform * (state.reducedMotion ? .2 : 1)); target.scale(1 + p.transform * .55, 1 + p.transform * .55); target.translate(-canvas.width / 2, -canvas.height / 2); target.globalAlpha = boundedFeedbackValue(0, 0, p.decay) + boundedFeedbackValue(1, 0, p.decay); target.drawImage(source.canvas, 0, 0); target.restore(); const liveGesture = state.gesture.active && state.gesture.scene === state.sceneIndex; const x = (liveGesture ? state.gesture.x : .5 + Math.sin(state.elapsed * .22) * .22) * canvas.width; const y = (liveGesture ? state.gesture.y : .5 + Math.cos(state.elapsed * .18) * .22) * canvas.height; const radius = 20 + p.tunnel * 180; const grad = target.createRadialGradient(x, y, 0, x, y, radius); grad.addColorStop(0, `${palette.primary}cc`); grad.addColorStop(.4, `${palette.accent}77`); grad.addColorStop(.7, `${palette.secondary}44`); grad.addColorStop(1, '#0000'); target.globalCompositeOperation = 'lighter'; target.fillStyle = grad; target.beginPath(); target.arc(x, y, radius, 0, Math.PI * 2); target.fill(); const symmetry = Math.round(p.symmetry); for (let n = 1; n < symmetry; n += 1) { target.save(); target.translate(canvas.width / 2, canvas.height / 2); target.rotate((Math.PI * 2 * n) / symmetry); target.translate(-canvas.width / 2, -canvas.height / 2); target.globalAlpha = boundedFeedbackValue(.45, 0, p.decay); target.fillStyle = grad; target.beginPath(); target.arc(x, y, radius * (.72 + n / symmetry * .18), 0, Math.PI * 2); target.fill(); target.restore(); } target.globalCompositeOperation = 'source-over'; buffers.feedback.current = next; state.gesture.active = false; }
function drawFeedback() { ctx.drawImage(fctx[buffers.feedback.current].canvas, 0, 0); }

function stepMagnetic(dt) { const p = state.params.magnetic; const b = buffers.magnetic; const replay = b.replay; if (replay.playing && !state.paused) { const beat = state.elapsed * state.tempo / 60 - replay.startBeat; while (replay.index < replay.events.length && beat >= replay.events[replay.index].beat) { const event = replay.events[replay.index]; applyMagneticGesture(event.x, event.y, event.amount); replay.index += 1; } if (replay.index >= replay.events.length) { replay.playing = false; showToast('Magnetic gesture replay complete'); } } const active = Math.min(b.count, Math.floor(96 + p.density * 384)); for (let i = 0; i < active; i += 1) { const index = i * 4; const attractor = i % 2 ? 2 : 0; const dx = b.attractors[attractor] - b.particles[index]; const dy = b.attractors[attractor + 1] - b.particles[index + 1]; const distance = Math.max(.03, Math.hypot(dx, dy)); const radialError = distance - (.12 + p.split * .045); const normalX = dx / distance; const normalY = dy / distance; const tangentX = -normalY; const tangentY = normalX; const orbitForce = (.0005 + p.motion * .0012) * p.attractor * dt * 60; const tetherForce = radialError * .12 * p.attractor * dt * 60; b.particles[index + 2] += tangentX * orbitForce + normalX * tetherForce; b.particles[index + 3] += tangentY * orbitForce + normalY * tetherForce; b.particles[index + 2] *= .994; b.particles[index + 3] *= .994; const speed = Math.hypot(b.particles[index + 2], b.particles[index + 3]); if (speed > .04) { const scale = .04 / speed; b.particles[index + 2] *= scale; b.particles[index + 3] *= scale; } b.previous[i * 2] = b.particles[index]; b.previous[i * 2 + 1] = b.particles[index + 1]; b.particles[index] = (b.particles[index] + b.particles[index + 2] * dt * 5 + 1) % 1; b.particles[index + 1] = (b.particles[index + 1] + b.particles[index + 3] * dt * 5 + 1) % 1; if (![b.particles[index], b.particles[index + 1], b.particles[index + 2], b.particles[index + 3]].every(Number.isFinite)) { b.particles[index] = .5; b.particles[index + 1] = .5; b.particles[index + 2] = 0; b.particles[index + 3] = 0; } } }
function drawMagnetic() { const p = state.params.magnetic; const b = buffers.magnetic; const active = Math.min(b.count, Math.floor(96 + p.density * 384)); ctx.fillStyle = `rgba(4,4,10,${clamp(1 - p.trail, .02, .28)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 1.35 + p.density * .85; for (let i = 0; i < active; i += 1) { const index = i * 4; const x = b.particles[index] * canvas.width; const y = b.particles[index + 1] * canvas.height; const oldX = b.previous[i * 2] * canvas.width; const oldY = b.previous[i * 2 + 1] * canvas.height; const color = i % 3 === 0 ? palette.accent : i % 2 ? palette.secondary : palette.primary; ctx.strokeStyle = color; ctx.globalAlpha = .32 + (i % 7) / 18; ctx.beginPath(); ctx.moveTo(oldX, oldY); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = color; ctx.globalAlpha = .42 + (i % 5) / 16; ctx.beginPath(); ctx.arc(x, y, 1.1 + p.motion * 1.15, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; for (let i = 0; i < 4; i += 2) { ctx.strokeStyle = i ? palette.accent : palette.primary; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(b.attractors[i] * canvas.width, b.attractors[i + 1] * canvas.height, 8 + p.attractor * 20, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
function stepCathedrals(dt) { const p = state.params.cathedrals; buffers.cathedrals.phase = (buffers.cathedrals.phase + dt * (p.stationary ? .02 : .18 + p.traversal * .8)) % (Math.PI * 2); }
function drawCathedrals() { const p = state.params.cathedrals; const profile = outputProfile(); const beatLoad = state.demoOn || state.audioBandsReady; const rasterScale = beatLoad ? cathedralBeatRasterScale(profile) : 1; const width = Math.max(1, Math.round(profile.cathedralWidth * rasterScale)); const height = Math.max(1, Math.round(profile.cathedralHeight * rasterScale)); const image = ctx.createImageData(width, height); const data = image.data; const primary = colorRgb(palette.primary); const secondary = colorRgb(palette.secondary); const accent = colorRgb(palette.accent); const journey = Math.round(clamp(p.journey, 0, 2)); const travel = p.stationary ? 0 : buffers.cathedrals.phase * (.35 + p.traversal); const cameraX = journey === 0 ? Math.sin(travel) * .22 : journey === 1 ? Math.cos(travel * .7) * .28 : Math.sin(travel * .55) * .18; const cameraY = journey === 0 ? Math.cos(travel * .8) * .14 : journey === 1 ? Math.sin(travel) * .2 : Math.cos(travel * .45) * .12; const maxSteps = beatLoad ? (profile.workScale < 1 ? 8 : 10) : profile.workScale < 1 ? 32 : 48; const family = Math.round(clamp(p.family, 0, 3)); const recursion = Math.round(clamp(p.recursion, 1, 6)); const light = clamp(p.lighting, 0, 1); const surface = clamp(p.material, 0, 1); const haze = clamp(p.fog, 0, 1); const glowLevel = clamp(p.emission, 0, 1); const facingBase = .5; const surfaceExponent = 2 + surface * 10; const surfaceSpecular = .12 + surface * .48; const diffuseLight = .2 + light * .8; ensureCathedralDirectionCache(width, height); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const directionIndex = (y * width + x) * 3; const directionX = cathedralDirectionCache[directionIndex]; const directionY = cathedralDirectionCache[directionIndex + 1]; const directionZ = cathedralDirectionCache[directionIndex + 2]; marchCathedral(cameraX, cameraY, -2.2, directionX, directionY, directionZ, family, recursion, maxSteps); const distance = cathedralMarchDistance; const steps = cathedralMarchSteps; const safeDistance = distance < 0 ? 0 : distance > 6 ? 6 : distance; const safeSteps = steps < 1 ? 1 : steps > 64 ? 64 : steps; const normalZ = directionZ < 0 ? -directionZ : directionZ; const facing = (normalZ + 1) * facingBase; const specular = Math.pow(facing, surfaceExponent) * surfaceSpecular; const depth = 1 - safeDistance / 6; const marchConfidence = 1 - safeSteps / 64; const diffuse = facing * diffuseLight * (.35 + depth * .65); const fogFactor = clamp(haze * (safeDistance / 6) + (1 - marchConfidence) * .18, 0, .95); const shadingValue = clamp((diffuse + specular + glowLevel * (.2 + depth * .45)) * (1 - fogFactor) + glowLevel * .12, 0, 1); const glow = cathedralMarchHit ? clamp(1 - distance / 4, 0, 1) : 0; const shade = clamp(glow * shadingValue * p.scale, 0, 1); const index = (y * width + x) * 4; if (cathedralMarchHit) { const baseR = Math.round(secondary[0] + (primary[0] - secondary[0]) * shade); const baseG = Math.round(secondary[1] + (primary[1] - secondary[1]) * shade); const baseB = Math.round(secondary[2] + (primary[2] - secondary[2]) * shade); const colorMix = clamp(p.color * (1 - shade) + specular * .35, 0, 1); data[index] = Math.round(baseR + (accent[0] - baseR) * colorMix); data[index + 1] = Math.round(baseG + (accent[1] - baseG) * colorMix); data[index + 2] = Math.round(baseB + (accent[2] - baseB) * colorMix); } else { const fogMix = clamp(fogFactor * .22, 0, 1); data[index] = Math.round(2 + (secondary[0] - 2) * fogMix); data[index + 1] = Math.round(3 + (secondary[1] - 3) * fogMix); data[index + 2] = Math.round(9 + (secondary[2] - 9) * fogMix); } data[index + 3] = 255; } renderBuffer.width = width; renderBuffer.height = height; renderCtx.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(renderBuffer, 0, 0, canvas.width, canvas.height); }
function stepAquarium(dt) { const p = state.params.aquarium; const b = buffers.aquarium; const active = Math.min(b.count, Math.floor(4 + p.population * 60)); const liveGesture = state.gesture.active && state.gesture.scene === state.sceneIndex; for (let patch = 0; patch < b.food.length; patch += 3) b.food[patch + 2] = clamp(b.food[patch + 2] + p.food * .00045 * dt * 60, 0, 1); for (let i = 0; i < active; i += 1) { const index = i * 6; const phase = state.elapsed * (.2 + p.habitat * .5) + i * .73; let ax = Math.cos(phase + i) * .0008; let ay = Math.sin(phase * .9 + i * .3) * .0008; const dx = state.gesture.x - b.organisms[index]; const dy = state.gesture.y - b.organisms[index + 1]; const distance = Math.hypot(dx, dy); if (liveGesture && distance < .28) { ax += dx * p.feeding * .001; ay += dy * p.feeding * .001; } let consumed = 0; for (let patch = 0; patch < b.food.length; patch += 3) { const foodDx = b.food[patch] - b.organisms[index]; const foodDy = b.food[patch + 1] - b.organisms[index + 1]; const interaction = aquariumFoodStep(b.organisms[index + 5], b.food[patch + 2], Math.hypot(foodDx, foodDy), .075 + p.feeding * .045, p.feeding, dt); b.organisms[index + 5] = interaction.energy; b.food[patch + 2] = interaction.patchAmount; consumed += interaction.consumed; if (interaction.consumed > 0) { ax += foodDx * p.feeding * .012; ay += foodDy * p.feeding * .012; } } b.organisms[index + 5] = clamp(b.organisms[index + 5] - p.extinction * .0012 * dt * 60, 0, 1); b.organisms[index + 2] = clamp((b.organisms[index + 2] + ax * dt * 60) * .998, -.025, .025); b.organisms[index + 3] = clamp((b.organisms[index + 3] + ay * dt * 60) * .998, -.025, .025); b.organisms[index] = (b.organisms[index] + b.organisms[index + 2] * dt * 60 + 1) % 1; b.organisms[index + 1] = (b.organisms[index + 1] + b.organisms[index + 3] * dt * 60 + 1) % 1; if (![b.organisms[index], b.organisms[index + 1], b.organisms[index + 2], b.organisms[index + 3], b.organisms[index + 4], b.organisms[index + 5], consumed].every(Number.isFinite)) { b.organisms[index] = .5; b.organisms[index + 1] = .5; b.organisms[index + 2] = 0; b.organisms[index + 3] = 0; b.organisms[index + 4] = .012; b.organisms[index + 5] = .5; } } state.gesture.active = false; }
function drawAquarium() { const p = state.params.aquarium; const b = buffers.aquarium; const active = Math.min(b.count, Math.floor(4 + p.population * 60)); ctx.fillStyle = `rgba(4,4,10,${clamp(1 - p.trails, .02, .24)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = palette.secondary; ctx.globalAlpha = .18; ctx.lineWidth = 1; const habitat = Math.round(clamp(p.habitat, 0, 2)); if (habitat === 0) { ctx.beginPath(); ctx.ellipse(canvas.width / 2, canvas.height * .62, canvas.width * .28, canvas.height * .18, 0, 0, Math.PI * 2); ctx.stroke(); } else if (habitat === 1) { for (let reef = 0; reef < 4; reef += 1) { ctx.beginPath(); ctx.arc(canvas.width * (.2 + reef * .2), canvas.height * .72, 26 + reef * 8, Math.PI, Math.PI * 2); ctx.stroke(); } } else { ctx.beginPath(); ctx.rect(canvas.width * .12, canvas.height * .16, canvas.width * .76, canvas.height * .68); ctx.stroke(); } for (let patch = 0; patch < b.food.length; patch += 3) { const amount = b.food[patch + 2]; if (amount <= .01) continue; ctx.globalAlpha = .12 + amount * .42; ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.arc(b.food[patch] * canvas.width, b.food[patch + 1] * canvas.height, 2 + amount * 7, 0, Math.PI * 2); ctx.fill(); } for (let i = 0; i < active; i += 1) { const index = i * 6; const energy = b.organisms[index + 5]; if (energy <= .02) continue; const x = b.organisms[index] * canvas.width; const y = b.organisms[index + 1] * canvas.height; const radius = (b.organisms[index + 4] + p.bloom * .014) * canvas.width * (.65 + energy * .5); ctx.globalAlpha = .18 + energy * .72; ctx.fillStyle = i % 3 === 0 ? palette.accent : i % 2 ? palette.secondary : palette.primary; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = palette.primary; ctx.beginPath(); ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
function stepInterference(dt) { const p = state.params.interference; const beat = state.tempo / 60; const tempoStep = (beat * Math.PI * 2 / 8) * dt; const audioStep = (.08 + audioResponseLevel('interference') * .5) * dt; buffers.interference.phase = (buffers.interference.phase + (p.tempoLock > .5 ? tempoStep : audioStep)) % (Math.PI * 2); }
function interferenceComposite(x, y, p, phase) { const fieldA = interferenceField(x, y, phase, p.frequency, p.ratio, p.phase, p.orientation); const fieldB = interferenceField(y, x, phase * .73, p.frequency * 1.13, p.ratio, p.phase + .17, p.orientation + .16); const fieldC = interferenceField(x + y, y - x, phase * .43, p.frequency * .67, p.ratio * 1.31, p.phase + .33, p.orientation + .32); return clamp(fieldA * p.fieldA + fieldB * p.fieldB + fieldC * p.fieldC, -1, 1); }
function interferenceBasis(p) { const phase = clamp(p.phase, 0, 1) * Math.PI * 2; const orientation = clamp(p.orientation, 0, 1) * Math.PI; const shiftedOrientation = clamp(p.orientation + .16, 0, 1) * Math.PI; const finalOrientation = clamp(p.orientation + .32, 0, 1) * Math.PI; const cos = Math.cos(orientation); const sin = Math.sin(orientation); const shiftedCos = Math.cos(shiftedOrientation); const shiftedSin = Math.sin(shiftedOrientation); const finalCos = Math.cos(finalOrientation); const finalSin = Math.sin(finalOrientation); return { fieldA: { frequency: clamp(p.frequency, .2, 4) * 18, ratio: clamp(p.ratio, .25, 2) * 18, phase, cos, sin }, fieldB: { frequency: clamp(p.frequency * 1.13, .2, 4) * 18, ratio: clamp(p.ratio, .25, 2) * 18, phase: clamp(p.phase + .17, 0, 1) * Math.PI * 2, cos: shiftedCos, sin: shiftedSin }, fieldC: { frequency: clamp(p.frequency * .67, .2, 4) * 18, ratio: clamp(p.ratio * 1.31, .25, 2) * 18, phase: clamp(p.phase + .33, 0, 1) * Math.PI * 2, cos: finalCos, sin: finalSin } }; }
function interferenceFieldWithBasis(x, y, time, basis) { const u = (x * basis.cos - y * basis.sin) * basis.frequency; const v = (x * basis.sin + y * basis.cos) * basis.ratio; return clamp((Math.sin(u + time) + Math.sin(v - time * .7) + Math.sin((u + v) * .61 + basis.phase)) / 3, -1, 1); }
function interferenceCompositeWithBasis(x, y, p, phase, basis) { const fieldA = interferenceFieldWithBasis(x, y, phase, basis.fieldA); const fieldB = interferenceFieldWithBasis(y, x, phase * .73, basis.fieldB); const fieldC = interferenceFieldWithBasis(x + y, y - x, phase * .43, basis.fieldC); return clamp(fieldA * p.fieldA + fieldB * p.fieldB + fieldC * p.fieldC, -1, 1); }
function drawInterference() { const p = state.params.interference; const profile = outputProfile(); const width = profile.interferenceWidth; const height = profile.interferenceHeight; const image = ctx.createImageData(width, height); const data = image.data; const a = colorRgb(palette.primary); const s = colorRgb(palette.secondary); const c = colorRgb(palette.accent); const phase = buffers.interference.phase; const basis = interferenceBasis(p); ensureInterferenceRasterCache(width, height); const stride = width + 2; for (let y = -1; y <= height; y += 1) for (let x = -1; x <= width; x += 1) interferenceRasterCache[(y + 1) * stride + x + 1] = interferenceCompositeWithBasis(x / width - .5, y / height - .5, p, phase, basis); for (let y = 0; y < height; y += 1) { const row = (y + 1) * stride + 1; for (let x = 0; x < width; x += 1) { const center = row + x; const field = interferenceRasterCache[center]; const neighbors = (interferenceRasterCache[center - 1] + interferenceRasterCache[center + 1] + interferenceRasterCache[center - stride] + interferenceRasterCache[center + stride]) * .25; const filtered = resolutionAwareInterferenceFilter(field, neighbors, canvas.width, canvas.height, p.filter); const value = filteredInterference(filtered, p.filter); const tint = clamp(.5 + Math.sin(filtered * 4 + p.phase * 6) * .5, 0, 1) * value * .35; const baseR = Math.round(s[0] + (a[0] - s[0]) * value); const baseG = Math.round(s[1] + (a[1] - s[1]) * value); const baseB = Math.round(s[2] + (a[2] - s[2]) * value); const index = (y * width + x) * 4; data[index] = Math.round(baseR + (c[0] - baseR) * tint); data[index + 1] = Math.round(baseG + (c[1] - baseG) * tint); data[index + 2] = Math.round(baseB + (c[2] - baseB) * tint); data[index + 3] = 255; } } renderBuffer.width = width; renderBuffer.height = height; renderCtx.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(renderBuffer, 0, 0, canvas.width, canvas.height); }
function stepTopology(dt) { const p = state.params.topology; buffers.topology.phase = (buffers.topology.phase + dt * (.15 + p.camera * .6) / Math.max(.2, p.loop)) % (Math.PI * 2); }
function drawTopology() { const p = state.params.topology; const b = buffers.topology; const primary = colorRgb(palette.primary); const secondary = colorRgb(palette.secondary); const k = clamp(p.keyframe, 0, 1); const start = b.keyframes; const thickness = p.thickness * (1 - k * .3); const twist = clamp(p.twist + k * .22, 0, 1); const camera = clamp(p.camera + k * .18, 0, 1); const material = p.material; ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.globalCompositeOperation = 'lighter'; for (let strand = 0; strand < 3; strand += 1) { ctx.strokeStyle = `rgb(${mixColor(colorRgb([palette.primary, palette.secondary, palette.accent][strand]), primary, material * .6).join(',')})`; ctx.globalAlpha = .58; ctx.lineWidth = 1.5 + thickness * 7; ctx.beginPath(); const points = outputProfile().topologyPoints; const sampled = []; for (let i = 0; i <= points; i += 1) { const t = i / points; const point = topologyLoopPoint(p.family, t, clamp(twist + (strand - 1) * .13, 0, 1), camera, b.phase + (strand - 1) * .15); const x = point[0] * Math.min(canvas.width, canvas.height) * .37; const y = point[1] * Math.min(canvas.width, canvas.height) * .37; sampled.push([x, y]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); if (strand === 0) b.intersections = countPolylineIntersections(sampled); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.restore(); }
function stepPhase(dt) { const p = state.params.phase; const b = buffers.phase; const { width, height } = b; if (b.arcPlaying) { const arc = phaseArcs[b.arcIndex]; b.arcProgress = clamp(b.arcProgress + (state.tempo / 60) * dt / Math.max(4, arc.bars * 4), 0, 1); } const profile = phaseArcAt(b.arcProgress, b.arcIndex); b.arcPhase = b.arcPlaying ? profile.phase : b.arcPhase; const { control, regime, disturbance, release } = effectivePhaseParameters(); let gap = 0; for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const index = y * width + x; const left = b.values[y * width + (x + width - 1) % width]; const right = b.values[y * width + (x + 1) % width]; const up = b.values[((y + height - 1) % height) * width + x]; const down = b.values[((y + 1) % height) * width + x]; const compareLeft = b.compare[y * width + (x + width - 1) % width]; const compareRight = b.compare[y * width + (x + 1) % width]; const compareUp = b.compare[((y + height - 1) % height) * width + x]; const compareDown = b.compare[((y + 1) % height) * width + x]; const time = state.elapsed * (.2 + p.tempo) * (state.reducedMotion ? .2 : 1); const target = drivenRegimeTarget(x / width - .5, y / height - .5, time, regime, control, disturbance); const alternate = drivenRegimeTarget(x / width - .5, y / height - .5, time, regime, clamp(control - .2, 0, 1), disturbance); b.next[index] = drivenRegimeFieldStep(b.values[index], (left + right + up + down) * .25, target, p.coupling, release, dt); b.compareNext[index] = drivenRegimeFieldStep(b.compare[index], (compareLeft + compareRight + compareUp + compareDown) * .25, alternate, p.coupling, release, dt); gap += Math.abs(b.next[index] - b.compareNext[index]); } [b.values, b.next] = [b.next, b.values]; [b.compare, b.compareNext] = [b.compareNext, b.compare]; b.transitionGap = clamp(gap / b.values.length, 0, 1); if (b.arcPlaying) { if (b.arcTrace.length >= 512) b.arcTrace.shift(); b.arcTrace.push({ progress: Number(b.arcProgress.toFixed(5)), phase: b.arcPhase, control: Number(control.toFixed(5)), regime, transitionGap: Number(b.transitionGap.toFixed(6)) }); if (b.arcProgress >= 1) { recordPhaseEvent('complete', b.arcIndex); if (b.arcMode === 'all' && b.arcIndex < phaseArcs.length - 1) startPhaseArc(b.arcIndex + 1, 'all', 'start'); else stopPhaseArc('complete'); } } }
function drawPhase() { const p = state.params.phase; const b = buffers.phase; const image = ctx.createImageData(b.width, b.height); const a = colorRgb(palette.secondary); const c = colorRgb(palette.accent); const primary = colorRgb(palette.primary); for (let i = 0; i < b.values.length; i += 1) { const x = i % b.width; const source = p.compare > .5 && x >= b.width / 2 ? b.compare[i] : b.values[i]; const value = clamp(source, 0, 1); const rgb = value < .5 ? mixColor(a, c, value * 2) : mixColor(c, primary, (value - .5) * 2); image.data[i * 4] = rgb[0]; image.data[i * 4 + 1] = rgb[1]; image.data[i * 4 + 2] = rgb[2]; image.data[i * 4 + 3] = 255; } renderBuffer.width = b.width; renderBuffer.height = b.height; renderCtx.putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(renderBuffer, 0, 0, canvas.width, canvas.height); if (p.compare > .5) { ctx.strokeStyle = palette.primary; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); ctx.globalAlpha = 1; } }
function chooseEvolutionChild(index) { if (offlineJobActive()) return; const parent = evolutionSiblingSource(currentEvolutionNode()); const childId = parent?.children?.[clamp(Math.round(index), 0, 4)]; const child = state.evolution?.nodes?.find((node) => node.id === childId); if (!child) return showToast('Mutate siblings first'); state.evolution.selectedId = child.id; state.evolution.currentId = child.id; state.params.evolution = structuredClone(child.params); renderControls(); markDirty(); showToast(`Chosen ${child.name}`); }
function mutateEvolution() { if (offlineJobActive()) return; const parent = currentEvolutionNode(); if (!parent || state.evolution.nodes.length >= 128) return showToast('Lineage cap reached · undo a generation or choose a fresh preset'); const p = state.params.evolution; const snapshot = { seed: state.evolution.seed, nodes: state.evolution.nodes, currentId: state.evolution.currentId, selectedId: state.evolution.selectedId }; state.evolution.undo = [...(state.evolution.undo || []).slice(-7), structuredClone(snapshot)]; const rand = seededRandom((buffers.evolution.seed | 0) + state.evolution.nodes.length * 31); const lockKeys = ['mutation', 'generation', 'lineage', 'focus']; const lockedParameters = p.lock > .5 ? [lockKeys[clamp(Math.round(p.lockField), 0, lockKeys.length - 1)]] : []; const children = []; for (let i = 0; i < 5 && state.evolution.nodes.length < 128; i += 1) { const childParams = structuredClone(parent.params); childParams.mutation = clamp(parent.params.mutation + (rand() - .5) * p.mutation * .8, 0, 1); childParams.lineage = clamp((i + rand()) / 5, 0, 1); childParams.focus = i / 4; childParams.generation = clamp(parent.generation + 1, 0, 8); for (const key of lockedParameters) childParams[key] = parent.params[key]; const child = { id: `${parent.id}.${state.evolution.nodes.length + 1}`, parent: parent.id, name: `Generation ${childParams.generation} / sibling ${i + 1}`, generation: childParams.generation, params: childParams, lockedParameters: [...lockedParameters], favorite: false, children: [] }; state.evolution.nodes.push(child); children.push(child.id); } parent.children = children; state.evolution.currentId = parent.id; state.evolution.selectedId = parent.id; state.params.evolution = structuredClone(parent.params); resetEvolution(buffers.evolution.seed); renderEvolutionActions(); markDirty(); showToast(`${children.length} deterministic siblings grown`); }
function toggleEvolutionFavorite() { if (offlineJobActive()) return; const node = selectedEvolutionNode(); if (!node) return; node.favorite = !node.favorite; renderEvolutionActions(); markDirty(); showToast(node.favorite ? 'Discovery favorited' : 'Favorite removed'); }
function nameEvolution() { if (offlineJobActive()) return; const node = selectedEvolutionNode(); const input = $('evolutionNameInput'); if (!node || !input?.value.trim()) return showToast('Type a discovery name first'); node.name = input.value.trim().slice(0, 40); renderEvolutionActions(); markDirty(); showToast('Discovery named'); }
function undoEvolution() { if (offlineJobActive()) return; const snapshot = state.evolution?.undo?.pop(); if (!snapshot) return showToast('No lineage step to undo'); state.evolution = { ...structuredClone(snapshot), undo: state.evolution.undo }; const node = currentEvolutionNode(); if (node) state.params.evolution = structuredClone(node.params); resetEvolution(buffers.evolution.seed); renderEvolutionActions(); markDirty(); showToast('Lineage step undone'); }
function promoteEvolution() { if (offlineJobActive()) return; const node = selectedEvolutionNode(); if (!node) return; node.favorite = true; if (cues.length < 64 && !cues.some((cue) => cue.nodeId === node.id && cue.scene === 9)) cues.push({ label: node.name, scene: 9, preset: state.presetIndex[9], duration: 8, nodeId: node.id, paramsSnapshot: structuredClone(node.params) }); renderCues(); markDirty(); showToast('Favorite promoted to local set'); }
function stepEvolution(dt) { const p = state.params.evolution; buffers.evolution.phase = (buffers.evolution.phase + dt * (.08 + p.mutation * .5)) % (Math.PI * 2); }
function drawEvolution() { const p = state.params.evolution; const b = buffers.evolution; const primary = colorRgb(palette.primary); const secondary = colorRgb(palette.secondary); const accent = colorRgb(palette.accent); ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i += 1) { const index = i * 4; const lineage = clamp(b.siblings[index + 1], 0, 1); const genotype = b.siblings[index]; const selected = Math.abs(p.focus - i / 4) < .13; const generation = 1 + p.generation * .06 + b.siblings[index + 2] * p.mutation; const rawRadius = canvas.height * (.115 + lineage * .06) * generation * (selected ? 1.12 : 1); const x = (i - 2) * canvas.width * .13 + Math.cos(genotype + b.phase) * canvas.width * .028; const maxBodyRadius = Math.max(16, (canvas.width / 2 - Math.abs(x) - 18) / (selected ? 1.28 : 1.18)); const radius = Math.min(rawRadius, maxBodyRadius); const y = Math.sin(b.siblings[index + 3] + b.phase * .7) * canvas.height * .1; const body = mixColor(secondary, i % 2 ? accent : primary, .24 + lineage * .56); const vein = mixColor(body, selected ? primary : accent, .48); const contour = evolutionContour(genotype, lineage, p.mutation, b.siblings[index + 2], b.phase, 40); ctx.globalAlpha = selected ? .24 : .1; ctx.fillStyle = `rgb(${body.join(',')})`; ctx.beginPath(); ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = selected ? .96 : .48 + i * .06; ctx.strokeStyle = `rgb(${body.join(',')})`; ctx.lineWidth = selected ? 3 : 1.5; ctx.beginPath(); contour.forEach(([px, py], point) => { const screenX = x + px * radius; const screenY = y + py * radius; if (point === 0) ctx.moveTo(screenX, screenY); else ctx.lineTo(screenX, screenY); }); ctx.fillStyle = `rgba(${body[0]},${body[1]},${body[2]},${selected ? .12 : .045})`; ctx.fill(); ctx.stroke(); ctx.globalAlpha = selected ? .82 : .28; ctx.strokeStyle = `rgb(${vein.join(',')})`; ctx.lineWidth = selected ? 1.5 : 1; for (let veinIndex = 0; veinIndex < 5; veinIndex += 1) { const origin = genotype + veinIndex * Math.PI * 2 / 5; ctx.beginPath(); for (let point = 0; point <= 9; point += 1) { const progress = point / 9; const angle = origin + Math.sin(progress * Math.PI * 2 + lineage) * .22; const rr = radius * progress * (.72 + Math.sin(progress * Math.PI * (3 + Math.round(lineage * 5)) + genotype) * .12); const px = x + Math.cos(angle) * rr; const py = y + Math.sin(angle) * rr * (.78 + lineage * .18); if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); } ctx.globalAlpha = selected ? .7 : .2; ctx.beginPath(); ctx.arc(x, y, radius * (.44 + lineage * .12), 0, Math.PI * 2); ctx.stroke(); if (selected) { ctx.globalAlpha = .95; ctx.strokeStyle = palette.primary; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius * 1.28, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = selected ? 1 : .7; ctx.fillStyle = `rgb(${(selected ? primary : accent).join(',')})`; ctx.beginPath(); ctx.arc(x, y, Math.max(4, radius * .07), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.restore(); }

function updatePhaseReadout() { if (scene().kind !== 'phase') return; const measurement = phaseMeasurement(); $('sceneDescription').textContent = `${measurement.playing ? measurement.arcName + ' · ' + measurement.phase : 'Manual · adjust Pattern and Threshold'}${measurement.compareReturnPath ? ' · left: threshold / right: lower threshold' : ''}`; const actionReadout = $('phaseActionReadout'); if (actionReadout) actionReadout.textContent = `Live current · ${measurement.arcName} · ${measurement.curve} · ${measurement.phase} ${measurement.progress.toFixed(2)} · ${measurement.tempo.toFixed(0)} BPM · control ${measurement.control.toFixed(2)} · gap ${measurement.transitionGap.toFixed(3)}`; const archiveReadout = $('phaseArchiveReadout'); if (archiveReadout) archiveReadout.textContent = phaseArchiveSummary(); }
function stopFlight() {
  flightKeys.clear(); flightPointer = null; flightCruise = false; flightBlocked = false;
  const button = $('flight-cruise');
  if (button) { button.textContent = 'Start cruise'; button.setAttribute('aria-pressed', 'false'); }
}
function stepFlight(dt) {
  const key = code => flightKeys.has(code) ? 1 : 0;
  const input = offlineFrameJob ? { forward: offlineFrameJob.flightCruise ? 1 : 0, turn: offlineFrameJob.flightCruise ? state.params.fractal.steering : 0 } : {
    forward: key('KeyW') - key('KeyS') || (flightCruise ? 1 : 0), strafe: key('KeyD') - key('KeyA'), rise: key('KeyE') - key('KeyQ'),
    turn: key('ArrowRight') - key('ArrowLeft') + (flightCruise ? state.params.fractal.steering : 0), look: key('ArrowUp') - key('ArrowDown'),
  };
  const result = advanceFlight(flightPose, input, dt * (state.reducedMotion ? .2 : 1), { speed: state.params.fractal.cameraSpeed, scale: state.params.fractal.fractalScale });
  const turned = result.pose.yaw !== flightPose.yaw || result.pose.pitch !== flightPose.pitch;
  flightPose = result.pose;
  if (result.blocked && !flightBlocked && !offlineFrameJob) showToast('Surface ahead · reverse, turn, or Reset to entrance');
  flightBlocked = result.blocked;
  if ((result.moved || turned) && !offlineFrameJob) markDirty(false);
}
function renderFlightControls() {
  if (scene().kind !== 'fractal') return;
  const actions = [['forward', 'Forward · W', 'KeyW'], ['back', 'Reverse · S', 'KeyS'], ['left', 'Strafe left · A', 'KeyA'], ['right', 'Strafe right · D', 'KeyD'], ['down', 'Descend · Q', 'KeyQ'], ['up', 'Rise · E', 'KeyE'], ['turn-left', 'Look left · ←', 'ArrowLeft'], ['turn-right', 'Look right · →', 'ArrowRight'], ['look-up', 'Look up · ↑', 'ArrowUp'], ['look-down', 'Look down · ↓', 'ArrowDown']];
  controls.insertAdjacentHTML('beforeend', `<div class="flight-controls"><p>Drag the stage to look. Hold to travel; release to stop.</p><div class="flight-buttons">${actions.map(([id, label]) => `<button type="button" id="flight-${id}">${label}</button>`).join('')}</div><button type="button" id="flight-cruise" aria-pressed="${flightCruise}">${flightCruise ? 'Stop cruise' : 'Start cruise'}</button><button type="button" id="flight-reset">Reset to entrance</button><p>Five levels of detail in a repeating world. Cruise follows your heading. Save set keeps your viewpoint; reopening stops movement.</p></div>`);
  for (const [id, , code] of actions) {
    const button = $(`flight-${id}`);
    let heldPointer = false; let pointerStartPose = null;
    button.addEventListener('pointerdown', event => { if (offlineJobActive() || state.paused || state.blackout || state.renderingLost) return; heldPointer = true; pointerStartPose = JSON.stringify(flightPose); button.setPointerCapture?.(event.pointerId); flightKeys.add(code); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => flightKeys.delete(code));
    button.addEventListener('click', () => { if (heldPointer) { heldPointer = false; if (pointerStartPose !== JSON.stringify(flightPose)) return; } if (offlineJobActive() || state.paused || state.blackout || state.renderingLost) return; flightKeys.add(code); for (let i = 0; i < 5; i++) stepFlight(.05); flightKeys.delete(code); drawPreview(); });
  }
  $('flight-cruise').addEventListener('click', () => { if (offlineJobActive()) return; if (state.paused || state.blackout || state.renderingLost) return showToast('Resume the stage before starting cruise'); flightCruise = !flightCruise; renderFlightControlsState(); markDirty(false); });
  $('flight-reset').addEventListener('click', () => { if (offlineJobActive()) return; stopFlight(); flightPose = defaultFlightPose(); flightBlocked = false; markDirty(); showToast('Returned to the passage entrance'); });
}
function renderFlightControlsState() { const button = $('flight-cruise'); if (button) { button.textContent = flightCruise ? 'Stop cruise' : 'Start cruise'; button.setAttribute('aria-pressed', String(flightCruise)); } }
window.addEventListener('keyup', event => flightKeys.delete(event.code));
window.addEventListener('blur', stopFlight);
document.addEventListener?.('visibilitychange', () => { if (document.hidden) stopFlight(); });
window.addEventListener('focusin', event => { if (event.target.matches?.('input,textarea,select,[contenteditable="true"]')) stopFlight(); });
canvas.addEventListener('pointerup', () => { flightPointer = null; });
canvas.addEventListener('pointercancel', () => { flightPointer = null; });
canvas.addEventListener('lostpointercapture', () => { flightPointer = null; });

function drawFractal() { const renderer = ensureFractalRenderer(); if (!renderer) { activeRenderState = { path: 'unavailable', width: canvas.width, height: canvas.height }; ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; } try { const { width: internalWidth, height: internalHeight } = fractalRenderSize(state.quality, Boolean(state.focusMode && !offlineFrameJob)); if (renderer.canvas.width !== internalWidth || renderer.canvas.height !== internalHeight) renderer.resize(internalWidth, internalHeight); renderer.render(state.elapsed, { seed: preset()[2], cameraSpeed: state.params.fractal.cameraSpeed, fractalScale: state.params.fractal.fractalScale, detail: state.params.fractal.detail, fog: .28, light: .9, exposure: 1.3, quality: state.quality === '720' ? 'low' : 'full', pose: flightPose, palette }); ctx.drawImage(renderer.canvas, 0, 0, canvas.width, canvas.height); activeRenderState = { path: 'webgl', width: internalWidth, height: internalHeight }; } catch (error) { activeRenderState = { path: 'unavailable', width: canvas.width, height: canvas.height }; fractalError = error.code || error.message; if (error.code === 'WEBGL_CONTEXT_LOST') { state.renderingLost = true; stopFlight(); announce(); } ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#f0e7ff'; ctx.font = '600 15px ui-monospace, monospace'; ctx.fillText(`3D renderer unavailable · ${fractalError}`, 24, 36); } }
function drawSceneBase() {
  activeRenderState = { path: 'canvas-2d', width: canvas.width, height: canvas.height };
  if (scene().kind === 'reaction') drawAcid();
  else if (scene().kind === 'automaton') drawTapestry();
  else if (scene().kind === 'feedback') drawFeedback();
  else if (scene().kind === 'particles') drawMagnetic();
  else if (scene().kind === 'geometry') drawCathedrals();
  else if (scene().kind === 'aquarium') drawAquarium();
  else if (scene().kind === 'interference') drawInterference();
  else if (scene().kind === 'topology') drawTopology();
  else if (scene().kind === 'phase') drawPhase();
  else if (scene().kind === 'evolution') drawEvolution();
  else if (scene().kind === 'fractal') drawFractal();
  else if (scene().kind === 'advanced') {
    const path = drawAdvanced(ctx, renderBuffer, scene().id, state.params[scene().id], state.elapsed * (state.reducedMotion ? .15 : 1), palette, state.quality === '720', beatResponseLevel(scene().id), { focus: state.focusMode });
    activeRenderState = scene().id === 'julia' ? { ...juliaRenderState(renderBuffer), outputWidth: canvas.width, outputHeight: canvas.height } : { path: path || 'canvas-2d', width: canvas.width, height: canvas.height };
  }
  syncRendererReadout();
}
function beatDrivenEffects() {
  const pulse = state.reducedMotion ? 0 : clamp(state.beatPulse, 0, 1);
  if (pulse <= .01) return effects;
  return {
    symmetry: clamp(effects.symmetry + pulse * .08, 0, 1),
    echo: clamp(effects.echo + pulse * .18, 0, 1),
    chroma: clamp(effects.chroma + pulse * .05, 0, 1),
    glow: clamp(effects.glow + pulse * .2, 0, 1),
  };
}
function drawScene(advance = false) { effectStack.restore(ctx); if (!advance && ['particles', 'aquarium'].includes(scene().kind)) { ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, canvas.width, canvas.height); } drawSceneBase(); effectStack.apply(ctx, beatDrivenEffects(), advance); applyBeatVisualPulse(); }
function markEffectDirty() { if (state.paused && !state.blackout && !state.renderingLost) effectStack.apply(ctx, beatDrivenEffects(), false, false); markDirty(false); }
function renderEffects() { for (const key of Object.keys(effectDefaults)) { $('effect-' + key).value = effects[key]; $('effect-value-' + key).textContent = `${Math.round(effects[key] * 100)}%`; } }
function drawPreview() { const intersections = buffers.topology.intersections; drawScene(); buffers.topology.intersections = intersections; syncFocusScaleReadout(); }
function stepAndDrawBase(dt) { if (scene().kind === 'reaction') stepAcid(dt); else if (scene().kind === 'automaton') stepTapestry(dt); else if (scene().kind === 'feedback') stepFeedback(); else if (scene().kind === 'particles') stepMagnetic(dt); else if (scene().kind === 'geometry') stepCathedrals(dt); else if (scene().kind === 'aquarium') stepAquarium(dt); else if (scene().kind === 'interference') stepInterference(dt); else if (scene().kind === 'topology') stepTopology(dt); else if (scene().kind === 'phase') stepPhase(dt); else if (scene().kind === 'evolution') stepEvolution(dt); else if (scene().kind === 'fractal') stepFlight(dt); drawScene(true); }
function stepAndDraw(dt) {
  const id = scene().id, original = state.params[id];
  const mapping = audioMappingForScene(id);
  if (mapping) { const [, key, amount] = mapping; const mappedLevel = beatResponseLevel(id); if (mappedLevel > 0) state.params[id] = { ...original, [key]: clamp(original[key] + mappedLevel * amount, 0, 1) }; }
  try { stepAndDrawBase(dt); } finally { state.params[id] = original; }
}
function audioResponseLevel(id) { const mapping = audioMappingForScene(id); if (!mapping) return 0; return state.audioBandsReady ? state.audioBands[mapping[0]] : state.audioLevel; }
function renderFrame(now) { const frameGap = Math.max(0, (now - state.lastTime) / 1000); const dt = Math.min(.05, frameGap); state.lastTime = now; decayBeatPulse(dt); const active = !state.paused && !state.blackout && !state.renderingLost; if (!active && scene().kind === 'fractal' && !offlineFrameJob) stopFlight(); if (active) { state.elapsed += dt; updateAudioLevel(frameGap); state.cadenceAccumulator += dt; const cadence = 1 / outputProfile().cadence; if (state.cadenceAccumulator >= cadence || outputProfile().cadence === 60) { const renderDt = Math.min(.05, state.cadenceAccumulator); state.cadenceAccumulator = 0; const renderStartedAt = performance.now(); stepAndDraw(renderDt); const renderDuration = Math.max(0, performance.now() - renderStartedAt); if (renderDuration > 0) metrics.sceneTimes[state.sceneIndex].push(renderDuration); updatePhaseReadout(); metrics.sceneFrames[state.sceneIndex] += 1; } metrics.frameTimes.push(dt * 1000); if (metrics.frameTimes.length > 3600) metrics.frameTimes.shift(); if (metrics.sceneTimes[state.sceneIndex].length > 360) metrics.sceneTimes[state.sceneIndex].shift(); } else if (state.blackout || state.renderingLost) { ctx.fillStyle = '#020207'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (state.transition && active) { state.transition.progress = Math.min(1, state.transition.progress + dt / 2.6); ctx.save(); ctx.globalAlpha = 1 - state.transition.progress; ctx.drawImage(transitionCanvas, 0, 0); ctx.restore(); if (state.transition.progress >= 1) state.transition = null; } if (state.setPlaying && now - lastSetProgressPaint > 250) { lastSetProgressPaint = now; updateSetProgress(); } applyDisplayBrightness(); if (audio.recordingStream) compositeOutputFrame(); syncRecordingReadout(now); updatePerformanceReadout(now); syncFocusScaleReadout(); $('fpsReadout').textContent = outputProfile().label; const badge = $('transitionBadge'); if (badge) { const next = stageTransportBadge(); if (badge.textContent !== next) badge.textContent = next; } syncReadinessStatus(); requestAnimationFrame(renderFrame); }

function updateAudioLevel(elapsedSeconds = 0) {
  let next = 0;
  let bands = { low: 0, mid: 0, high: 0 };
  let peak = 0;
  const sourceActive = Boolean(audio.analyser && (audio.source || audio.demoGain || audio.micStream || audio.tabStream));
  const canReadTimeDomain = sourceActive && typeof audio.analyser.getByteTimeDomainData === 'function' && audio.data && Number.isFinite(audio.data.length);
  if (canReadTimeDomain) {
    audio.analyser.getByteTimeDomainData(audio.data); let sum = 0; for (const value of audio.data) { const sample = Math.abs((value - 128) / 128); peak = Math.max(peak, sample); sum += sample ** 2; } next = Math.sqrt(sum / audio.data.length);
    if (audio.analyser.getByteFrequencyData && audio.frequencyData) { audio.analyser.getByteFrequencyData(audio.frequencyData); bands = audioBandLevels(audio.frequencyData, audio.context?.sampleRate); state.audioBandsReady = true; }
  } else state.audioBandsReady = false;
  state.audioPeak += (clamp(peak, 0, 1) - state.audioPeak) * .35;
  state.audioPeakHold = Math.max(state.audioPeakHold * .96, peak);
  state.audioLevel += (clamp(next * audioSensitivity * 3, 0, 1) - state.audioLevel) * .15;
  for (const key of ['low', 'mid', 'high']) state.audioBands[key] += (clamp(bands[key] * audioSensitivity * 1.8, 0, 1) - state.audioBands[key]) * .15;
  const detectedBeat = clamp(Math.max(next * 1.6, bands.low * 1.35, bands.mid * 1.05) * audioSensitivity, 0, 1);
  state.beatPulse = Math.max(state.beatPulse, detectedBeat * .55);
  if (sourceActive && !state.demoOn) recordAudioBeatOnset(detectedBeat);
  if (sourceActive) recordAudioPeakSample(state.audioPeak, state.audioPeakHold, elapsedSeconds);
  $('modulationReadout').textContent = `AUDIO ${Math.round(state.audioLevel * 100)}% · L${Math.round(state.audioBands.low * 100)} M${Math.round(state.audioBands.mid * 100)} H${Math.round(state.audioBands.high * 100)}`;
  syncAudioHeadroomReadout();
  syncBeatReadout();
}
function audioPeakTelemetry() {
  const hold = Number(clamp(state.audioPeakHold, 0, 1).toFixed(3));
  return { current: Number(clamp(state.audioPeak, 0, 1).toFixed(3)), hold, headroom: Number((1 - hold).toFixed(3)) };
}
function resetAudioPeakSession() { audio.peakSession = createAudioPeakSession(); }
function recordAudioPeakSample(peak = state.audioPeak, hold = state.audioPeakHold, elapsedSeconds = 0) {
  const session = audio.peakSession || (audio.peakSession = createAudioPeakSession());
  const safePeak = clamp(Number(peak) || 0, 0, 1);
  const safeHold = clamp(Number(hold) || 0, 0, 1);
  if (session.sampleCount >= maxAudioPeakSessionSamples) { session.capped = true; return; }
  session.sampleCount += 1;
  session.elapsedSeconds = clamp((Number(session.elapsedSeconds) || 0) + Math.max(0, Number(elapsedSeconds) || 0), 0, 7200);
  session.peakMax = Math.max(session.peakMax, safePeak);
  session.holdMax = Math.max(session.holdMax, safeHold);
  session.holdSum += safeHold;
  if (safeHold >= .78) session.hotSamples += 1;
  if (safeHold >= .92) session.nearClipSamples += 1;
}
function audioPeakSessionTelemetry() {
  const session = audio.peakSession || createAudioPeakSession();
  const sampleCount = Math.max(0, Math.min(maxAudioPeakSessionSamples, Math.floor(Number(session.sampleCount) || 0)));
  const durationSeconds = clamp(Number.isFinite(Number(session.elapsedSeconds)) ? Number(session.elapsedSeconds) : sampleCount / 60, 0, 7200);
  const holdMax = clamp(Number(session.holdMax) || 0, 0, 1);
  const averageHold = sampleCount ? clamp((Number(session.holdSum) || 0) / sampleCount, 0, 1) : 0;
  const hotSamples = Math.max(0, Math.min(sampleCount, Math.floor(Number(session.hotSamples) || 0)));
  const nearClipSamples = Math.max(0, Math.min(sampleCount, Math.floor(Number(session.nearClipSamples) || 0)));
  return { sampleCount, durationSeconds: Number(durationSeconds.toFixed(2)), peakMax: Number(clamp(Number(session.peakMax) || 0, 0, 1).toFixed(3)), holdMax: Number(holdMax.toFixed(3)), averageHold: Number(averageHold.toFixed(3)), headroom: Number((1 - holdMax).toFixed(3)), hotPercent: sampleCount ? Number((hotSamples / sampleCount * 100).toFixed(1)) : 0, nearClipPercent: sampleCount ? Number((nearClipSamples / sampleCount * 100).toFixed(1)) : 0, capped: session.capped === true };
}
function rehearsalAudioPeakSessionSignature(session) { return JSON.stringify([session?.sampleCount ?? null, session?.durationSeconds ?? null, session?.peakMax ?? null, session?.holdMax ?? null, session?.averageHold ?? null, session?.headroom ?? null, session?.hotPercent ?? null, session?.nearClipPercent ?? null, session?.capped ?? null]); }
function syncRehearsalReportAudioPeakSessionFreshness(session) {
  if (offlineFrameJob || (!lastRehearsalReportAudioPeakSessionSignature && !importedRehearsalReportAudioPeakSessionSignature)) return;
  const signature = rehearsalAudioPeakSessionSignature(session);
  if (lastRehearsalReportAudioPeakSessionSignature && !rehearsalReportStale && signature !== lastRehearsalReportAudioPeakSessionSignature) markRehearsalReportStale();
  if (importedRehearsalReportAudioPeakSessionSignature && !importedRehearsalReportStale && signature !== importedRehearsalReportAudioPeakSessionSignature) markRehearsalReportImportStale();
}
function syncAudioPeakSessionReadout(session = audioPeakSessionTelemetry()) {
  const output = $('audioSessionReadout');
  if (!output) return;
  const duration = formatSetTime(session.durationSeconds ?? session.sampleCount / 60);
  const text = session.sampleCount ? `RUN ${duration} · MAX ${Math.round(session.holdMax * 100)}% · ${Math.round(session.headroom * 100)}% HEADROOM${session.capped ? ' · CAP' : ''}` : 'RUN 0:00 · ENVELOPE WARMING UP';
  if (output.textContent !== text) output.textContent = text;
  const aria = session.sampleCount ? `Audio headroom run ${duration}; maximum held peak ${Math.round(session.holdMax * 100)} percent; ${Math.round(session.headroom * 100)} percent headroom${session.capped ? '; sample cap reached' : ''}` : 'Audio headroom run is warming up; no active source samples yet';
  output.setAttribute('aria-label', aria);
  const progress = $('audioRunProgress');
  const progressReadout = $('audioRunProgressReadout');
  if (progress) {
    const seconds = clamp(Number(session.durationSeconds) || 0, 0, rehearsalMinimumAudioSeconds);
    const roundedSeconds = Number(seconds.toFixed(2));
    const remaining = Math.max(0, rehearsalMinimumAudioSeconds - seconds);
    const complete = seconds >= rehearsalMinimumAudioSeconds;
    const remainingLabelSeconds = remaining > 0 ? Math.max(1, Math.round(remaining)) : 0;
    progress.max = rehearsalMinimumAudioSeconds;
    progress.value = roundedSeconds;
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(rehearsalMinimumAudioSeconds));
    progress.setAttribute('aria-valuenow', String(roundedSeconds));
    progress.setAttribute('aria-valuetext', `${formatSetTime(seconds)} of ${formatSetTime(rehearsalMinimumAudioSeconds)}`);
    progress.dataset.complete = String(complete);
    if (progressReadout) {
      const nextText = complete ? 'AUDIO GATE COMPLETE' : `${formatSetTime(remainingLabelSeconds)} LEFT`;
      const nextAria = complete ? 'Twenty-minute audio gate complete' : `${formatSetTime(remainingLabelSeconds)} remaining to complete the twenty-minute audio gate`;
      if (progressReadout.textContent !== nextText) progressReadout.textContent = nextText;
      if (progressReadout.dataset.ariaLabel !== nextAria) { progressReadout.setAttribute('aria-label', nextAria); progressReadout.dataset.ariaLabel = nextAria; }
      progressReadout.dataset.complete = String(complete);
    }
  }
  syncRehearsalReportAudioPeakSessionFreshness(session);
}
function syncAudioHeadroomReadout() {
  const output = $('audioHeadroomReadout');
  if (!output) return;
  const telemetry = audioPeakTelemetry();
  const level = telemetry.hold >= .92 ? 'hot' : telemetry.hold >= .78 ? 'warm' : 'clear';
  const label = level === 'hot' ? 'NEAR CLIP' : level === 'warm' ? 'HOT' : 'HEADROOM';
  output.dataset.level = level;
  output.textContent = `PEAK ${Math.round(telemetry.current * 100)}% · ${label} ${Math.round(telemetry.headroom * 100)}%`;
  output.setAttribute('aria-label', `Input peak ${Math.round(telemetry.current * 100)} percent; ${label.toLowerCase()}, ${Math.round(telemetry.headroom * 100)} percent headroom`);
  syncAudioPeakSessionReadout();
}
function beatStepVoices(step) {
  const voices = [];
  if (step?.kick) voices.push({ readout: 'KICK', label: 'kick', symbol: 'K' });
  if (step?.clap) voices.push({ readout: 'CLAP', label: 'clap', symbol: 'C' });
  if (step?.hat) voices.push(step.openHat ? { readout: 'HAT+OPEN', label: 'closed hat and open hat', symbol: 'H/O' } : { readout: 'HAT', label: 'closed hat', symbol: 'H' });
  else if (step?.openHat) voices.push({ readout: 'OPEN HAT', label: 'open hat', symbol: 'O' });
  if (step?.bass) voices.push({ readout: 'SUB', label: 'sub', symbol: 'S' });
  if (step?.perc) voices.push({ readout: 'PERC', label: 'ghost percussion', symbol: 'P' });
  return voices;
}
function syncBeatReadout() {
  const output = $('beatReadout');
  if (!output) return;
  const barOutput = $('beatBarReadout');
  const nextOutput = $('beatNextReadout');
  const pulse = Math.round(clamp(state.beatPulse, 0, 1) * 20) * 5;
  let next = 'BEAT IDLE';
  let barReadout = 'BAR —';
  let barActive = false;
  let nextStepReadout = 'NEXT —';
  let nextStepActive = false;
  if (state.demoOn) {
    const step = darkTechnoStep(state.beatStep); const voices = beatStepVoices(step).map(({ readout }) => readout);
    const bar = Math.max(0, Math.floor(Number(state.beatBar) || 0)) + 1;
    barReadout = `BAR ${String(bar).padStart(2, '0')}`;
    barActive = true;
    next = `BEAT ${String(state.beatStep + 1).padStart(2, '0')}/16 · ${voices.join('+') || 'REST'} · ${pulse}%`;
    const nextStepIndex = (state.beatStep + 1) % DARK_TECHNO_PATTERN.length;
    const followingVoices = beatStepVoices(darkTechnoStep(nextStepIndex)).map(({ readout }) => readout);
    const wrapsBar = state.beatStep === DARK_TECHNO_PATTERN.length - 1;
    nextStepReadout = wrapsBar
      ? `NEXT BAR ${String(bar + 1).padStart(2, '0')} · ${String(nextStepIndex + 1).padStart(2, '0')}/16 · ${followingVoices.join('+') || 'REST'}`
      : `NEXT ${String(nextStepIndex + 1).padStart(2, '0')}/16 · ${followingVoices.join('+') || 'REST'}`;
    nextStepActive = true;
  } else if (audioSourceKind() !== 'NO AUDIO' && pulse > 0) next = `BEAT RESPONSE · ${pulse}%`;
  if (output.textContent !== next) output.textContent = next;
  if (barOutput) {
    if (barOutput.textContent !== barReadout) barOutput.textContent = barReadout;
    barOutput.dataset.active = String(barActive);
    barOutput.setAttribute('aria-label', state.demoOn ? `Demo bar ${barReadout.replace('BAR ', '')}` : 'Demo bar unavailable for the current source');
  }
  if (nextOutput) {
    if (nextOutput.textContent !== nextStepReadout) nextOutput.textContent = nextStepReadout;
    nextOutput.dataset.active = String(nextStepActive);
    if (state.demoOn) {
      const wrapsBar = state.beatStep === DARK_TECHNO_PATTERN.length - 1;
      const nextStepIndex = (state.beatStep + 1) % DARK_TECHNO_PATTERN.length;
      const followingLabels = beatStepVoices(darkTechnoStep(nextStepIndex)).map(({ label }) => label).join(' and ') || 'rest';
      nextOutput.setAttribute('aria-label', wrapsBar
        ? `Next demo bar ${String(Math.max(0, Math.floor(Number(state.beatBar) || 0) + 2)).padStart(2, '0')}, step ${String(nextStepIndex + 1).padStart(2, '0')}: ${followingLabels}`
        : `Next demo step ${String(nextStepIndex + 1).padStart(2, '0')}/16: ${followingLabels}`);
    } else nextOutput.setAttribute('aria-label', 'Next demo step unavailable for the current source');
  }
  syncSceneBeatReadout();
  syncAudioCoverageReadout();
  syncAudioHeadroomReadout();
  syncBeatTelemetryReadout();
  syncBeatPattern();
}
function beatPatternVoiceLabel(step) {
  return beatStepVoices(step).map(({ label }) => label).join(', ') || 'rest';
}
function beatPatternVoiceSymbols(step) {
  return beatStepVoices(step).map(({ symbol }) => symbol).join('·') || '·';
}
function normalizedBeatIndex(step = 0) {
  let value = 0;
  try { value = Number(step); } catch {}
  return Number.isFinite(value) ? Math.floor(value) : 0;
}
function syncBeatPattern() {
  const output = $('beatPattern');
  if (!output) return;
  if (output.dataset.ready !== 'true') {
    output.innerHTML = DARK_TECHNO_PATTERN.map((step, index) => {
      const number = String(index + 1).padStart(2, '0');
      const label = beatPatternVoiceLabel(step);
      return `<span class="beat-pattern-step" data-beat-step="${index}" data-active="false" role="img" aria-label="Step ${number}: ${label}"><span class="beat-pattern-index">${number}</span><span class="beat-pattern-voices">${beatPatternVoiceSymbols(step)}</span></span>`;
    }).join('');
    output.dataset.ready = 'true';
  }
  const currentStep = state.demoOn ? state.beatStep : -1;
  const source = audioSourceKind();
  const signature = `${source}:${currentStep}`;
  if (output.dataset.signature === signature) return;
  output.dataset.signature = signature;
  const cells = output.querySelectorAll('[data-beat-step]');
  for (const cell of cells) {
    const active = String(state.demoOn && Number(cell.dataset.beatStep) === currentStep);
    if (cell.dataset.active !== active) cell.dataset.active = active;
  }
  output.dataset.active = String(state.demoOn);
  output.setAttribute('aria-label', state.demoOn ? `Demo 16-step pattern; step ${String(currentStep + 1).padStart(2, '0')} is active` : 'Demo 16-step pattern preview; inactive for the current source');
}
function syncSceneBeatReadout() {
  const output = $('sceneBeatReadout');
  if (!output) return;
  const def = scene();
  const level = clamp(beatResponseLevel(def.id), 0, 1);
  const percentage = Math.round(level * 100);
  const active = level > .05;
  const sceneChanged = output.dataset.sceneId !== def.id;
  const activeChanged = output.dataset.active !== String(active);
  const next = active ? `SCENE ${def.name.toUpperCase()} · ${percentage}% RESPONSE` : `SCENE ${def.name.toUpperCase()} · BEAT IDLE`;
  output.setAttribute('aria-live', sceneChanged || activeChanged ? 'polite' : 'off');
  if (output.textContent !== next) output.textContent = next;
  output.dataset.sceneId = def.id;
  output.dataset.active = String(active);
  output.dataset.beatLevel = level.toFixed(3);
  const source = audioSourceKind();
  const sourceDescription = source === 'NO AUDIO' && state.beatPulse > .01 ? 'the permission-free wiring check' : source === 'NO AUDIO' ? 'no audio source' : `${source.toLowerCase()} audio`;
  output.setAttribute('aria-label', active ? `${def.name} is receiving a ${percentage} percent response from ${sourceDescription}` : `${def.name} is beat idle; ${sourceDescription} is not producing a visible response`);
}
function syncAudioCoverageReadout() {
  const output = $('audioCoverageReadout');
  if (!output) return;
  const coverage = visualBeatResponseSnapshot();
  const mapped = coverage.filter((entry) => entry.mapped && entry.valid).length;
  const source = audioSourceKind();
  const mode = source === 'NO AUDIO' ? 'READY' : source === 'DEMO' ? 'BEAT-LINKED' : 'AUDIO-LINKED';
  const next = `${mapped}/${coverage.length} VISUALS ${mode}`;
  if (output.textContent !== next) output.textContent = next;
  syncBeatScope(coverage);
}
function syncBeatScope(coverage = visualBeatResponseSnapshot()) {
  const output = $('beatScope');
  if (!output) return;
  const responseById = new Map(coverage.map((entry) => [entry.id, entry]));
  if (output.dataset.ready !== 'true') {
    output.innerHTML = coverage.map(({ id }) => {
      const def = sceneDefs.find((candidate) => candidate.id === id);
      return `<span class="beat-scope-cell" data-beat-family="${id}" data-active="false" role="img"><span class="beat-scope-meter" aria-hidden="true"></span><span class="beat-scope-label">${def?.number || id}</span></span>`;
    }).join('');
    output.dataset.ready = 'true';
  }
  const source = audioSourceKind();
  const cells = output.querySelectorAll('[data-beat-family]');
  for (const cell of cells) {
    const id = cell.dataset.beatFamily;
    const def = sceneDefs.find((candidate) => candidate.id === id);
    const response = responseById.get(id);
    const level = response?.response || 0;
    const levelText = level.toFixed(3);
    if (cell.dataset.beatLevel !== levelText) { cell.style?.setProperty?.('--beat-level', levelText); cell.dataset.beatLevel = levelText; }
    const active = String(response?.active ?? level > .05);
    if (cell.dataset.active !== active) cell.dataset.active = active;
    const selected = String(id === scene().id);
    if (cell.dataset.selected !== selected) cell.dataset.selected = selected;
    const ariaLabel = `${def?.name || id}: ${Math.round(level * 100)}% beat response${selected === 'true' ? '; selected visual family' : ''}`;
    if (cell.dataset.beatAria !== ariaLabel) { cell.setAttribute('aria-label', ariaLabel); cell.dataset.beatAria = ariaLabel; }
    const title = `${def?.name || id} · ${source} · ${Math.round(level * 100)}% response`;
    if (cell.dataset.beatTitle !== title) { cell.title = title; cell.dataset.beatTitle = title; }
  }
  const scopeAria = `${coverage.length} visual-family beat response meters; ${source === 'NO AUDIO' ? 'awaiting audio' : `${source} response active`}`;
  if (output.dataset.beatScopeAria !== scopeAria) { output.setAttribute('aria-label', scopeAria); output.dataset.beatScopeAria = scopeAria; }
}
function decayBeatPulse(dt) { state.beatPulse = clamp(state.beatPulse * Math.exp(-Math.max(0, Number(dt) || 0) * 9), 0, 1); syncBeatReadout(); }
function setBeatPulse(amount, step = state.beatStep) { const safeAmount = clamp(Number(amount) || 0, 0, 1); const rawStep = normalizedBeatIndex(step); const safeStep = ((rawStep % DARK_TECHNO_PATTERN.length) + DARK_TECHNO_PATTERN.length) % DARK_TECHNO_PATTERN.length; state.beatPulse = Math.max(state.beatPulse, safeAmount); state.beatStep = safeStep; state.beatBar = Math.floor(Math.max(0, rawStep) / DARK_TECHNO_PATTERN.length); if (state.demoOn) recordDemoBeatOnset(safeStep, safeAmount); syncBeatReadout(); }
function beatResponseLevel(id) { return clamp(Math.max(audioResponseLevel(id), state.beatPulse * .72), 0, 1); }
function audioMappingValidation(def) {
  const mapping = audioMappings[def?.id];
  const [band, parameter, amount] = Array.isArray(mapping) ? mapping : [];
  const validBand = ['low', 'mid', 'high'].includes(band);
  const validParameter = typeof parameter === 'string' && def?.schema?.some(([key]) => key === parameter);
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= 1;
  const valid = Boolean(Array.isArray(mapping) && mapping.length === 3 && validBand && validParameter && validAmount);
  return { mapping, band, parameter, amount, valid };
}
function audioMappingForScene(id) {
  const def = sceneDefs.find((candidate) => candidate.id === id);
  const validation = audioMappingValidation(def);
  return validation.valid ? validation.mapping : null;
}
function visualAudioCoverage() {
  return sceneDefs.map((def) => {
    const { mapping, band, parameter, amount, valid } = audioMappingValidation(def);
    return { id: def.id, mapped: Boolean(mapping), band: typeof band === 'string' ? band : null, parameter: typeof parameter === 'string' ? parameter : null, amount: Number.isFinite(amount) ? amount : null, valid };
  });
}
function visualBeatResponseSnapshot() {
  return visualAudioCoverage().map((entry) => {
    const level = clamp(beatResponseLevel(entry.id), 0, 1);
    return { ...entry, response: Number(level.toFixed(3)), active: level > .05 };
  });
}
function applyBeatVisualPulse() {
  const pulse = clamp(state.beatPulse, 0, 1);
  if (pulse <= beatVisualRearmThreshold) beatVisualArmed = true;
  const onset = beatVisualArmed && pulse >= beatVisualTriggerThreshold ? clamp(pulse - previousBeatVisualPulse, 0, 1) : 0;
  previousBeatVisualPulse = pulse;
  if (onset > .01) beatVisualArmed = false;
  if (state.reducedMotion || onset <= .01) return;
  const kickAccent = state.demoOn && state.beatStep % 4 === 0 ? .025 : 0;
  const washAlpha = clamp(.012 + onset * .09 + kickAccent, 0, .1);
  const frameAlpha = clamp(.01 + onset * .08 + kickAccent * .5, 0, .1);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = washAlpha;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = frameAlpha;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(1, Math.min(canvas.width, canvas.height) * (.0015 + pulse * .004));
  const inset = Math.min(canvas.width, canvas.height) * (.018 + pulse * .012);
  ctx.beginPath();
  ctx.rect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
  ctx.stroke();
  ctx.restore();
}
function streamTracks(stream, audioOnly = false) {
  const getter = audioOnly ? stream?.getAudioTracks : stream?.getTracks;
  if (typeof getter !== 'function') return [];
  try { return getter.call(stream).filter(Boolean); } catch { return []; }
}
function stopMediaStream(stream) { for (const track of streamTracks(stream)) { try { track.stop?.(); } catch {} } }
function bindStreamEnded(stream, request, status) {
  let ended = false;
  const handleEnded = () => { if (ended || request !== audioRequest) return; ended = true; stopAudioSource(status); };
  for (const track of streamTracks(stream)) if (track && typeof track === 'object') track.onended = handleEnded;
}
function bindRecordingStreamEnded(stream, recorder) {
  let ended = false;
  const handleEnded = () => { if (ended || audio.recorder !== recorder) return; ended = true; finishRecording(false, 'Recording source ended · use still or frame export'); };
  for (const track of streamTracks(stream)) if (track && typeof track === 'object') track.onended = handleEnded;
}
function demoConnect(node, destination) { try { node?.connect?.(destination); } catch {} }
function demoTrackNodes(nodes, endTime) {
  const tracked = nodes.filter(Boolean);
  tracked.forEach((node) => audio.demoNodes.add(node));
  const delay = Math.max(120, ((endTime - (audio.context?.currentTime || 0)) * 1000) + 120);
  setTimeout(() => tracked.forEach((node) => audio.demoNodes.delete(node)), delay);
}
function demoEnvelope(gain, start, peak, attack, end) {
  const param = gain?.gain;
  if (!param) return;
  try { param.cancelScheduledValues?.(start); param.setValueAtTime?.(.0001, start); param.exponentialRampToValueAtTime?.(Math.max(.0001, peak), start + attack); param.exponentialRampToValueAtTime?.(.0001, end); } catch { param.value = Math.max(.0001, peak); }
}
function demoOscillator(start, duration, peak, type, frequency, endFrequency = frequency, destination = audio.demoGain) {
  const context = audio.context;
  if (!context?.createOscillator || !context?.createGain || !destination) return;
  const osc = context.createOscillator(); const gain = context.createGain();
  osc.type = type; if (osc.frequency?.setValueAtTime) { osc.frequency.setValueAtTime(frequency, start); osc.frequency.exponentialRampToValueAtTime?.(Math.max(20, endFrequency), start + Math.min(.12, duration * .65)); } else if (osc.frequency) osc.frequency.value = frequency;
  demoEnvelope(gain, start, peak, Math.min(.012, duration * .25), start + duration);
  demoConnect(osc, gain); demoConnect(gain, destination); osc.start?.(start); osc.stop?.(start + duration + .03); demoTrackNodes([osc, gain], start + duration + .04);
}
function demoNoiseBuffer() {
  if (audio.demoNoiseBuffer || typeof audio.context?.createBuffer !== 'function') return audio.demoNoiseBuffer;
  try {
    const sampleRate = Number(audio.context.sampleRate) || 44100; const buffer = audio.context.createBuffer(1, Math.floor(sampleRate * 1.2), sampleRate); const data = buffer.getChannelData(0); let seed = 0x5eeda11;
    for (let i = 0; i < data.length; i += 1) { seed = Math.imul(seed, 1664525) + 1013904223 | 0; data[i] = ((seed >>> 0) / 4294967296) * 2 - 1; }
    audio.demoNoiseBuffer = buffer;
  } catch { audio.demoNoiseBuffer = null; }
  return audio.demoNoiseBuffer;
}
function demoNoise(start, duration, peak, filterType, frequency, q = 0.7) {
  const context = audio.context; const buffer = demoNoiseBuffer();
  if (!context?.createBufferSource || !context?.createGain || !buffer || !audio.demoGain) return demoOscillator(start, duration, peak * .4, 'square', frequency, frequency * .4);
  const source = context.createBufferSource(); const gain = context.createGain(); const filter = context.createBiquadFilter?.();
  source.buffer = buffer; if (filter) { filter.type = filterType; if (filter.frequency) filter.frequency.value = frequency; if (filter.Q) filter.Q.value = q; }
  demoEnvelope(gain, start, peak, Math.min(.004, duration * .2), start + duration); demoConnect(source, filter || gain); demoConnect(filter || gain, filter ? gain : audio.demoGain); if (filter) demoConnect(gain, audio.demoGain);
  source.start?.(start); source.stop?.(start + duration + .02); demoTrackNodes([source, filter, gain], start + duration + .03);
}
function playDemoKick(start, velocity) {
  // Give the kick a separate low body; the compressor below catches the
  // summed transient so the master bus does not need to run hotter.
  demoOscillator(start, .32, .44 + velocity * .22, 'sine', 112, 36);
  demoOscillator(start, .25, .56 + velocity * .24, 'sine', 148, 44);
  demoOscillator(start, .045, .14 + velocity * .08, 'square', 1800, 420);
}
function playDemoBass(start, step, velocity) {
  const notes = [55, 49, 65, 49]; const note = notes[Math.floor(step / 4) % notes.length];
  demoOscillator(start, .2, .1 + velocity * .08, 'sawtooth', note, note * .985);
}
function playDemoClap(start) {
  for (const offset of [0, .018, .036]) demoNoise(start + offset, .105, .16 - offset * 1.4, 'bandpass', 1750, 1.2);
}
function playDemoHat(start, velocity, open = false) { demoNoise(start, open ? .22 : .055, (open ? .13 : .085) + velocity * .07, 'highpass', open ? 4200 : 6200, .6); }
function playDemoPerc(start, velocity) { demoNoise(start, .045, .045 + velocity * .04, 'bandpass', 2800, 2.2); }
function scheduleDemoStep(request) {
  if (request !== audioRequest || !state.demoOn || !audio.context) return;
  if (state.paused) { pulseTimer = setTimeout(() => scheduleDemoStep(request), 40); return; }
  const stepIndex = audio.demoStep; const absoluteStep = audio.demoBar * DARK_TECHNO_PATTERN.length + stepIndex; const step = darkTechnoStep(stepIndex); const start = (audio.context.currentTime || 0) + .018;
  if (step.kick) { setBeatPulse(.86 + step.kick * .14, absoluteStep); playDemoKick(start, step.kick); }
  if (step.bass) playDemoBass(start, stepIndex, step.bass);
  if (step.clap) { setBeatPulse(Math.max(state.beatPulse, .7), absoluteStep); playDemoClap(start); }
  if (step.hat) { setBeatPulse(Math.max(state.beatPulse, .24 + step.hat * .18), absoluteStep); playDemoHat(start, step.hat); }
  if (step.openHat) playDemoHat(start, step.openHat, true);
  if (step.perc) { setBeatPulse(Math.max(state.beatPulse, .16 + step.perc * .12), absoluteStep); playDemoPerc(start, step.perc); }
  if (stepIndex === DARK_TECHNO_PATTERN.length - 1) audio.demoBar += 1;
  audio.demoStep = (stepIndex + 1) % DARK_TECHNO_PATTERN.length;
  const stepMs = 60000 / clamp(Number(state.tempo) || 92, 40, 180) / 4;
  pulseTimer = setTimeout(() => scheduleDemoStep(request), Math.max(18, stepMs));
}
function audioOutputGain() { return state.muted || audio.micStream || audio.tabStream ? 0 : state.demoOn ? .24 : .18; }
function stopAudioSource(status = 'No music connected') {
  setAudioSourceOutcome(status === 'No music connected' ? 'idle' : /ended/i.test(status) ? 'ended' : 'failed');
  audioRequest += 1; clearTimeout(pulseTimer); pulseTimer = null;
  if (audio.source) { try { audio.source.stop?.(); audio.source.disconnect(); } catch {} audio.source = null; }
  for (const node of audio.demoNodes) { try { node.stop?.(); } catch {} try { node.disconnect?.(); } catch {} }
  audio.demoNodes.clear(); audio.demoNoiseBuffer = null; audio.demoStep = 0; audio.demoBar = 0;
  audio.demoGain?.disconnect(); audio.demoGain = null;
  audio.demoCompressor?.disconnect(); audio.demoCompressor = null;
  if (audio.media) { audio.media.onerror = null; audio.media.pause(); audio.media.removeAttribute('src'); audio.media.load(); audio.media = null; }
  if (audio.mediaUrl) URL.revokeObjectURL(audio.mediaUrl); audio.mediaUrl = null;
  for (const stream of [audio.micStream, audio.tabStream]) stopMediaStream(stream);
  audio.micStream = null; audio.tabStream = null; state.demoOn = false; state.audioLevel = 0; state.audioPeak = 0; state.audioPeakHold = 0; resetAudioPeakSession(); state.beatPulse = 0; state.beatStep = 0; state.beatBar = 0; resetBeatTelemetry();
  state.audioBands = { low: 0, mid: 0, high: 0 }; state.audioBandsReady = false;
  if (audio.gain) audio.gain.gain.value = audioOutputGain();
  $('demoAudioButton').textContent = 'Demo beat'; $('micButton').textContent = 'Microphone';
  $('audioStatus').textContent = status; $('tabAudioButton').textContent = 'Use tab audio'; $('modulationReadout').textContent = 'AUDIO 0% · L0 M0 H0'; syncBeatReadout(); syncAudioHeadroomReadout(); syncAudioSourceControls();
}
async function ensureAudio(source = audioSourceKind()) {
  if (offlineJobActive()) return false;
  try {
    if (!audio.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('unsupported');
      audio.context = new Context(); audio.analyser = audio.context.createAnalyser(); audio.analyser.fftSize = 512;
      audio.data = new Uint8Array(audio.analyser.fftSize); audio.frequencyData = new Uint8Array(audio.analyser.frequencyBinCount); audio.gain = audio.context.createGain();
      audio.gain.gain.value = audioOutputGain(); audio.recordDestination = audio.context.createMediaStreamDestination();
      audio.analyser.connect(audio.gain); audio.gain.connect(audio.context.destination); audio.gain.connect(audio.recordDestination);
    }
    await audio.context.resume(); if (offlineJobActive()) return false;
    $('startAudioButton').textContent = '◉'; syncStartAudioControl(); return true;
  } catch {
    if (audioSourceKind() !== 'NO AUDIO') stopAudioSource('Audio unavailable · visual controls still work');
    else { setAudioSourceOutcome('failed', source); $('audioStatus').textContent = 'Audio unavailable · visual controls still work'; }
    $('startAudioButton').textContent = '●'; syncStartAudioControl(); return false;
  }
}
async function startAudioPlayback() { if (offlineJobActive()) return false; return audioSourceKind() === 'NO AUDIO' ? toggleDemo() : ensureAudio(); }
async function toggleDemo() {
  if (offlineJobActive() || recordingBlocksSourceChange()) return;
  const wasOn = state.demoOn; stopAudioSource(); if (wasOn) return;
  const request = audioRequest; setAudioSourceOutcome('connecting', 'DEMO'); if (!await ensureAudio('DEMO') || request !== audioRequest) { if (request === audioRequest) setAudioSourceOutcome('failed', 'DEMO'); return; }
  const bus = audio.context.createGain(); bus.gain.value = .92;
  const compressor = audio.context.createDynamicsCompressor?.();
  if (compressor) {
    try {
      compressor.threshold.value = -18;
      compressor.knee.value = 9;
      compressor.ratio.value = 6;
      compressor.attack.value = .003;
      compressor.release.value = .14;
    } catch {}
    demoConnect(bus, compressor); demoConnect(compressor, audio.analyser); audio.demoCompressor = compressor;
  } else demoConnect(bus, audio.analyser);
  audio.demoGain = bus; audio.demoStep = 0; audio.demoBar = 0; state.demoOn = true; audio.gain.gain.value = audioOutputGain();
  scheduleDemoStep(request); setAudioSourceOutcome('active', 'DEMO'); $('demoAudioButton').textContent = 'Stop beat'; $('audioStatus').textContent = 'Dark techno demo beat · kick, clap, hats, perc · tempo follows BPM'; syncAudioSourceControls();
}
async function loadLocalAudio(file) {
  if (offlineJobActive() || recordingBlocksSourceChange() || !file) return;
  if (file.size > 80 * 1024 * 1024) { setAudioSourceOutcome('failed', 'FILE'); return showToast('Audio is over the 80 MB local limit'); }
  stopAudioSource(); const request = audioRequest;
  setAudioSourceOutcome('connecting', 'FILE');
  if (!await ensureAudio('FILE') || request !== audioRequest) { if (request === audioRequest) setAudioSourceOutcome('failed', 'FILE'); return; }
  const url = URL.createObjectURL(file), media = new Audio(url);
  media.loop = true; media.volume = .7; audio.media = media; audio.mediaUrl = url;
  const release = () => { media.onerror = null; media.pause?.(); media.removeAttribute?.('src'); media.load?.(); if (audio.media === media) { try { audio.source?.disconnect?.(); } catch {} audio.source = null; audio.media = null; } if (audio.mediaUrl === url) audio.mediaUrl = null; try { URL.revokeObjectURL(url); } catch {} };
  const fail = () => { if (request !== audioRequest) return; stopAudioSource(); setAudioSourceOutcome('failed', 'FILE'); $('audioStatus').textContent = 'Could not play this file · try another audio format'; };
  media.onerror = fail;
  try { audio.source = audio.context.createMediaElementSource(media); audio.source.connect(audio.analyser); await media.play(); if (request !== audioRequest) { release(); return; } setAudioSourceOutcome('active', 'FILE'); $('audioStatus').textContent = `Playing ${file.name} · local file`; syncAudioSourceControls(); } catch { if (request !== audioRequest) release(); else fail(); }
}
async function toggleMic() {
  if (offlineJobActive() || recordingBlocksSourceChange()) return; const wasOn = Boolean(audio.micStream); stopAudioSource(); if (wasOn) return;
  const request = audioRequest;
  setAudioSourceOutcome('connecting', 'MIC');
  if (!await ensureAudio('MIC') || request !== audioRequest) { if (request === audioRequest) setAudioSourceOutcome('failed', 'MIC'); return; }
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (request !== audioRequest || offlineFrameJob) { stopMediaStream(stream); return; }
    const tracks = streamTracks(stream, true);
    if (!tracks.length) { stopMediaStream(stream); if (request === audioRequest) { setAudioSourceOutcome('empty', 'MIC'); $('audioStatus').textContent = 'Microphone returned no audio · try an audio file'; syncAudioSourceControls(); } return; }
    audio.micStream = stream; audio.gain.gain.value = 0; audio.source = audio.context.createMediaStreamSource(stream); audio.source.connect(audio.analyser);
    bindStreamEnded(stream, request, 'Microphone ended · choose another source');
    setAudioSourceOutcome('active', 'MIC'); $('micButton').textContent = 'Mic active'; $('audioStatus').textContent = 'Microphone reacts locally · speakers and audio recording off'; syncAudioSourceControls();
  } catch { if (request === audioRequest) { stopMediaStream(stream); stopAudioSource(); setAudioSourceOutcome('failed', 'MIC'); $('audioStatus').textContent = 'Microphone unavailable or permission declined · try an audio file'; } else stopMediaStream(stream); }
}
async function connectTabAudio() {
  if (offlineJobActive() || recordingBlocksSourceChange()) return;
  stopAudioSource(); const request = audioRequest;
  if (!navigator.mediaDevices?.getDisplayMedia) { setAudioSourceOutcome('failed', 'TAB AUDIO'); $('audioStatus').textContent = 'Tab audio unavailable here · try desktop Chrome or an audio file'; return; }
  setAudioSourceOutcome('connecting', 'TAB AUDIO');
  $('audioStatus').textContent = 'Choose a music tab and enable Share tab audio';
  let stream = null;
  try {
    // Invoke the chooser before awaiting AudioContext, preserving the user gesture.
    const pending = navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true, selfBrowserSurface: 'exclude', monitorTypeSurfaces: 'exclude', systemAudio: 'exclude' });
    stream = await pending;
    if (request !== audioRequest || offlineFrameJob) { stopMediaStream(stream); return; }
    if (!streamTracks(stream, true).length) { stopMediaStream(stream); setAudioSourceOutcome('empty', 'TAB AUDIO'); $('audioStatus').textContent = 'No audio was shared · select a browser tab and enable Share tab audio'; syncAudioSourceControls(); return; }
    audio.tabStream = stream;
    if (!await ensureAudio('TAB AUDIO') || request !== audioRequest) { stopMediaStream(stream); if (audio.tabStream === stream) audio.tabStream = null; if (request === audioRequest) setAudioSourceOutcome('failed', 'TAB AUDIO'); return; }
    audio.gain.gain.value = 0; audio.source = audio.context.createMediaStreamSource(new MediaStream(streamTracks(stream, true))); audio.source.connect(audio.analyser);
    bindStreamEnded(stream, request, 'Shared tab ended · choose another source');
    setAudioSourceOutcome('active', 'TAB AUDIO'); $('tabAudioButton').textContent = 'Tab audio active'; $('audioStatus').textContent = 'Music tab connected · analysis only · video is unused · recordings are visual-only'; syncAudioSourceControls();
  } catch { if (request === audioRequest) { stopAudioSource(); setAudioSourceOutcome('failed', 'TAB AUDIO'); $('audioStatus').textContent = 'Tab sharing canceled or unavailable · try an audio file'; } else stopMediaStream(stream); }
}

function syncSetControls() { const label = state.setPlaying ? 'Ⅱ Pause set' : state.setComplete ? '↻ Restart set' : '▶ Play set'; $('playSetButton').textContent = label; $('mobilePlayButton').textContent = label; const nameInput = $('setNameInput'); if (nameInput) { nameInput.disabled = state.setPlaying || offlineFrameJob; nameInput.value = state.setName; } syncReadinessStatus(); }
function syncPauseControls() { $('pauseButton').textContent = state.paused ? 'Resume' : 'Pause'; $('transportState').textContent = state.paused ? 'PAUSED' : 'RUNNING'; $('mobilePauseButton').textContent = state.paused ? 'Resume' : 'Pause'; syncReadinessStatus(); }
function stopSetRun(preservePosition = true) { cueRunToken += 1; advanceCue = null; clearTimeout(cueTimer); cueTimer = null; if (state.setPlaying && preservePosition && state.currentCue >= 0 && cues[state.currentCue]) { cueConsumedBeats += Math.max(0, performance.now() - cueStartedAt) * state.tempo / 60000; cueRemainingBeats = Math.max(0, cueRemainingBeats - Math.max(0, performance.now() - cueStartedAt) * state.tempo / 60000); cueRemainingMs = cueRemainingBeats * 60000 / state.tempo; } else if (!preservePosition) { state.currentCue = -1; cueRemainingMs = 0; cueRemainingBeats = 0; cueConsumedBeats = 0; } state.setPlaying = false; syncSetControls(); updateSetProgress(); }
function captureCueSnapshot(cue) { if (scene().kind === 'fractal') cue.flightPose = structuredClone(flightPose); cue.preset = state.presetIndex[state.sceneIndex]; cue.sceneParamsSnapshot = structuredClone(state.params[scene().id]); cue.paletteSnapshot = { ...palette }; cue.effectsSnapshot = { ...effects }; }
function applyCueSnapshot(cue) { const def = sceneDefs[cue.scene]; if (cue.sceneParamsSnapshot) state.params[def.id] = structuredClone(cue.sceneParamsSnapshot); if (cue.paletteSnapshot) { Object.assign(palette, cue.paletteSnapshot); Object.assign(scenePalettes[def.id], cue.paletteSnapshot); fillPalette(); } if (cue.effectsSnapshot) { effects = validateEffects(cue.effectsSnapshot); renderEffects(); } if (cue.sceneParamsSnapshot) resetRenderer(); if (cue.flightPose) { flightPose = validateFlightPose(cue.flightPose); flightBlocked = false; } if (cue.sceneParamsSnapshot || cue.flightPose) { renderControls(); announce(); refreshPaused(); } }
function startSet() { if (offlineJobActive()) return; if (state.setPlaying) { stopSetRun(true); renderCues(); return showToast('Set paused at current cue'); } state.setComplete = false; const token = ++cueRunToken; state.setPlaying = true; syncSetControls(); const play = (index) => { if (!state.setPlaying || token !== cueRunToken || !cues.length) return; if (index >= cues.length) { state.setComplete = true; stopSetRun(false); renderCues(); return showToast('Set complete · play set to restart'); } const cue = cues[index]; const resuming = state.currentCue === index && cueRemainingBeats > 0; state.currentCue = index; if (!resuming) { switchScene(cue.scene, cue.preset, cue); applyCueSnapshot(cue); cueRemainingBeats = cue.duration * 4; cueConsumedBeats = 0; } cueRemainingMs = cueRemainingBeats * 60000 / state.tempo; cueStartedAt = performance.now(); advanceCue = play; renderCues(); const remaining = cueRemainingMs; cueTimer = setTimeout(() => { if (token !== cueRunToken || !state.setPlaying) return; cueRemainingMs = 0; cueRemainingBeats = 0; cueConsumedBeats = 0; play(index + 1); }, remaining); }; const hasCurrentCue = state.currentCue >= 0 && state.currentCue < cues.length; const startIndex = hasCurrentCue && cueRemainingBeats <= 0 && cueConsumedBeats > 0 ? state.currentCue + 1 : hasCurrentCue ? state.currentCue : 0; play(startIndex); showToast('Rehearsed cue set running'); }
function addCue() { if (offlineJobActive()) return; if (cues.length >= 64) return showToast('Set is full · remove a cue first'); const cue = { label: `${scene().name} / ${preset()[0]}`, scene: state.sceneIndex, preset: state.presetIndex[state.sceneIndex], duration: 8 }; captureCueSnapshot(cue); cues.push(cue); state.setComplete = false; renderCues(); markDirty(); showToast('Cue added with current look'); }
function syncScoreRecovery() { const button = $('restoreScoreButton'); if (button) button.hidden = !previousScoreBackup; }
function loadPreviousScoreBackup() { if (previousScoreBackup) return structuredClone(previousScoreBackup); try { const stored = localStorage.getItem('phosphor-previous-set-v1'); return stored ? JSON.parse(stored) : null; } catch { return null; } }
function restorePreviousScore() { if (offlineJobActive()) return; const backup = loadPreviousScoreBackup(); if (!backup) return showToast('No previous set backup is available'); try { applySession(backup); previousScoreBackup = null; try { localStorage.removeItem('phosphor-previous-set-v1'); } catch {} syncScoreRecovery(); showToast('Previous set restored'); } catch (error) { showToast(`Previous set could not be restored · ${error.message}`); } }
function loadPerformanceScore() { if (offlineJobActive()) return; const score = structuredClone(sessionData()); const first = performanceScoreCues[0]; const existingBackup = loadPreviousScoreBackup(); if (existingBackup) previousScoreBackup = existingBackup; else { previousScoreBackup = structuredClone(score); try { localStorage.setItem('phosphor-previous-set-v1', JSON.stringify(previousScoreBackup)); } catch {} } syncScoreRecovery(); score.activeScene = first.scene; score.tempo = 96; score.cues = structuredClone(performanceScoreCues); score.presetIndex[first.scene] = first.preset; score.params[sceneDefs[first.scene].id] = structuredClone(first.sceneParamsSnapshot); score.options = { ...score.options, quality: '720', workflow: 'perform', effects: structuredClone(first.effectsSnapshot) }; score.name = '24-minute rehearsal score'; score.palette = { ...first.paletteSnapshot }; score.scenePalettes = { ...score.scenePalettes, [sceneDefs[first.scene].id]: { ...first.paletteSnapshot }, topology: { ...performanceScoreCues[6].paletteSnapshot } }; applySession(score); exportSession(); syncScoreRecovery(); showToast('24-minute score loaded · Restore previous set is available'); }

function sessionData() { return { format: 'phosphor-set-v1', version: 1, name: state.setName, notes: state.rehearsalNotes, rehearsalChecks: { ...state.rehearsalChecks }, rehearsalChecksAt: state.rehearsalChecksAt, activeScene: state.sceneIndex, presetIndex: state.presetIndex, params: state.params, evolution: state.evolution, gestureHistory: state.gestureHistory, phaseEvents: state.phaseEvents, phaseMeasurement: scene().kind === 'phase' ? phaseMeasurement() : null, phaseMeasurementArchive: state.phaseMeasurementArchive, palette, scenePalettes: structuredClone(scenePalettes), flight: { world: FRACTAL_WORLD, pose: structuredClone(flightPose) }, tempo: state.tempo, cues, options: { reducedMotion: state.reducedMotion, brightness: state.brightness, quality: state.quality, workflow: state.workflow, audioSensitivity, effects: { ...effects } } }; }
let saveTimer = null;
function saveLocal() { try { localStorage.setItem('phosphor-set-v1', JSON.stringify(sessionData())); state.dirty = false; $('dirtyState').textContent = 'SAVED'; const stamp = preflightTimestamp(); $('saveReadout').textContent = `LOCAL · ${stamp}`; $('saveReadout').setAttribute('aria-label', `Saved locally at ${stamp}`); } catch { $('saveReadout').textContent = 'DOWNLOAD'; $('saveReadout').setAttribute('aria-label', 'Local storage unavailable; use download export'); showToast('Storage is full · use Export JSON for a direct file'); } }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 450); }
function flushLocalSave() { clearTimeout(saveTimer); if (state.dirty) saveLocal(); }
function migrateSession(data) { if (!data || data.format !== 'phosphor-set-v1' || data.version !== 1) throw new Error('Unsupported Phosphor set format'); const candidate = structuredClone(data); if (Array.isArray(candidate.presetIndex) && [3, 10, 13].includes(candidate.presetIndex.length)) { candidate.presetIndex = [...candidate.presetIndex, ...Array(sceneDefs.length - candidate.presetIndex.length).fill(0)]; const migratedParams = structuredClone(initialParams); for (const id of sceneDefs.slice(0, data.presetIndex.length).map(def => def.id)) if (candidate.params?.[id] && typeof candidate.params[id] === 'object') Object.assign(migratedParams[id], candidate.params[id]); candidate.params = migratedParams; } for (const def of sceneDefs) { if (!candidate.params?.[def.id] || typeof candidate.params[def.id] !== 'object') continue; for (const [key] of def.schema) if (candidate.params[def.id][key] === undefined) candidate.params[def.id][key] = initialParams[def.id][key]; } return candidate; }
function sanitizeEvolution(data) { if (data === undefined || data === null) return null; if (typeof data !== 'object' || !Array.isArray(data.nodes) || data.nodes.length > 128 || data.nodes.length < 1) throw new Error('Evolution lineage is malformed'); if (data.nodes.some((node) => !node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id.trim())) throw new Error('Evolution lineage contains an invalid node'); const ids = new Set(data.nodes.map((node) => node.id.slice(0, 80))); if (ids.size !== data.nodes.length) throw new Error('Evolution lineage contains duplicate nodes'); const nodes = data.nodes.map((node, index) => { const params = structuredClone(initialParams.evolution); for (const key of Object.keys(params)) { const raw = Number(node.params?.[key]); const max = key === 'generation' ? 8 : key === 'lockField' ? 3 : 1; if (Number.isFinite(raw)) params[key] = clamp(raw, 0, max); } return { id: String(node.id || `node-${index}`).slice(0, 80), parent: node.parent && ids.has(String(node.parent)) ? String(node.parent) : null, name: String(node.name || 'Unnamed discovery').slice(0, 40), generation: clamp(Math.round(Number(node.generation) || 0), 0, 8), params, lockedParameters: Array.isArray(node.lockedParameters) ? node.lockedParameters.filter((key) => ['mutation', 'generation', 'lineage', 'focus'].includes(key)) : [], favorite: Boolean(node.favorite), children: Array.isArray(node.children) ? node.children.map(String).filter((id) => ids.has(id)).slice(0, 16) : [] }; }); const nodeIds = new Set(nodes.map((node) => node.id)); return { seed: Number.isFinite(Number(data.seed)) ? Number(data.seed) : 1, nodes, currentId: nodeIds.has(String(data.currentId)) ? String(data.currentId) : nodes[0]?.id, selectedId: nodeIds.has(String(data.selectedId)) ? String(data.selectedId) : nodes[0]?.id, undo: [] }; }
function sanitizeGestureHistory(data) { if (data === undefined || data === null) return []; if (!Array.isArray(data) || data.length > 128) throw new Error('Gesture history is malformed'); return data.map((event) => { if (!event || typeof event !== 'object' || event.scene !== 3 || !Number.isFinite(Number(event.x)) || !Number.isFinite(Number(event.y)) || (event.timing !== undefined && !['beat', 'apply-now'].includes(event.timing))) throw new Error('Gesture history is malformed'); const timing = event.timing === undefined ? 'apply-now' : event.timing; if (timing === 'beat' && (!Number.isFinite(Number(event.beat)) || Number(event.beat) < 0)) throw new Error('Timed gesture history is malformed'); return { scene: 3, x: clamp(Number(event.x), 0, 1), y: clamp(Number(event.y), 0, 1), amount: clamp(Number(event.amount), 0, 1), timing, beat: timing === 'beat' ? Number(event.beat) : null }; }); }
function sanitizePhaseEvents(data) { if (data === undefined || data === null) return []; if (!Array.isArray(data) || data.length > 128) throw new Error('Phase event history is malformed'); return data.map((event) => { if (!event || typeof event !== 'object' || !['choose', 'start', 'stop', 'rehearse', 'complete', 'cue'].includes(event.type) || !Number.isInteger(event.arc) || event.arc < 0 || event.arc >= phaseArcs.length || !Number.isFinite(Number(event.progress)) || Number(event.progress) < 0 || Number(event.progress) > 1 || !Number.isFinite(Number(event.time)) || Number(event.time) < 0 || !Number.isFinite(Number(event.tempo)) || Number(event.tempo) < 40 || Number(event.tempo) > 180) throw new Error('Phase event history is malformed'); return { type: event.type, arc: event.arc, phase: String(event.phase || 'idle').slice(0, 16), progress: Number(event.progress), time: Number(event.time), tempo: Number(event.tempo) }; }); }
function validateSession(data) { const candidate = migrateSession(data); candidate.name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 80) || 'Untitled set' : 'Untitled set'; candidate.notes = typeof candidate.notes === 'string' ? candidate.notes.slice(0, 1000) : ''; if (candidate.flight && candidate.flight.world !== FRACTAL_WORLD) throw new Error('Unsupported flight world'); candidate.flight = { world: FRACTAL_WORLD, pose: validateFlightPose(candidate.flight?.pose) }; candidate.options = { ...candidate.options, effects: validateEffects(candidate.options?.effects) }; if (!Number.isInteger(candidate.activeScene) || candidate.activeScene < 0 || candidate.activeScene >= sceneDefs.length || !Number.isFinite(candidate.tempo) || candidate.tempo < 40 || candidate.tempo > 180 || (candidate.options?.brightness !== undefined && (!Number.isFinite(candidate.options.brightness) || candidate.options.brightness < .2 || candidate.options.brightness > 1))) throw new Error('Session transport settings are malformed'); if (!candidate.presetIndex?.every((n, i) => Number.isInteger(n) && n >= 0 && n < (sceneDefs[i]?.presets.length || 0))) throw new Error('Preset references an unknown look'); if (!Array.isArray(candidate.presetIndex) || candidate.presetIndex.length !== sceneDefs.length) throw new Error('Preset list is malformed'); if (!candidate.params || typeof candidate.params !== 'object') throw new Error('Parameter state is missing'); for (const def of sceneDefs) { if (!candidate.params[def.id] || typeof candidate.params[def.id] !== 'object') throw new Error(`Parameter state is missing for ${def.name}`); for (const [key, label, min, max] of def.schema) { const raw = Number(candidate.params[def.id][key]); if (!Number.isFinite(raw) || raw < min || raw > max) throw new Error(`Parameter ${def.id}.${key} is outside its ${min}–${max} bound`); } } if (!Array.isArray(candidate.cues) || candidate.cues.length < 1 || candidate.cues.length > 64) throw new Error('Cue list must contain 1–64 cues'); candidate.cues = candidate.cues.map((cue) => { if (!cue || !Number.isInteger(cue.scene) || cue.scene < 0 || cue.scene >= sceneDefs.length || !Number.isInteger(cue.preset) || cue.preset < 0 || cue.preset >= sceneDefs[cue.scene].presets.length) throw new Error('Cue references an unknown scene'); const def = sceneDefs[cue.scene]; if (cue.flightPose && def.kind !== 'fractal') throw new Error('Flight pose belongs to a fractal cue'); if (cue.flightPose && worldDistance(validateFlightPose(cue.flightPose).position, cue.sceneParamsSnapshot?.fractalScale ?? def.presets[cue.preset][3]?.fractalScale) < .035) throw new Error('Cue viewpoint is inside a surface'); const safeLabel = String(cue.label ?? '').trim().slice(0, 60) || 'Unnamed cue'; const safeCue = { ...(cue.flightPose ? { flightPose: validateFlightPose(cue.flightPose) } : {}), label: safeLabel, scene: cue.scene, preset: cue.preset, duration: Number(cue.duration) }; if (!Number.isFinite(safeCue.duration) || !Number.isInteger(safeCue.duration) || safeCue.duration < 1 || safeCue.duration > 64) throw new Error('Cue duration is outside its 1–64 bound'); if (cue.arc !== undefined) { if (def.kind !== 'phase' || !Number.isInteger(cue.arc) || cue.arc < 0 || cue.arc >= phaseArcs.length) throw new Error('Cue arc is malformed'); safeCue.arc = cue.arc; } if (cue.nodeId !== undefined) { if (typeof cue.nodeId !== 'string' || cue.nodeId.length > 80) throw new Error('Cue provenance is malformed'); safeCue.nodeId = cue.nodeId; } if (cue.paramsSnapshot !== undefined) { if (!cue.paramsSnapshot || typeof cue.paramsSnapshot !== 'object') throw new Error('Cue parameter snapshot is malformed'); safeCue.paramsSnapshot = structuredClone(initialParams.evolution); for (const key of Object.keys(safeCue.paramsSnapshot)) { const raw = Number(cue.paramsSnapshot[key]); const max = key === 'generation' ? 8 : key === 'lockField' ? 3 : 1; if (!Number.isFinite(raw) || raw < 0 || raw > max) throw new Error(`Cue snapshot ${key} is outside its bound`); safeCue.paramsSnapshot[key] = raw; } } if (cue.sceneParamsSnapshot !== undefined) { if (!cue.sceneParamsSnapshot || typeof cue.sceneParamsSnapshot !== 'object' || Object.keys(cue.sceneParamsSnapshot).some((key) => !def.schema.some(([name]) => name === key))) throw new Error('Cue scene snapshot is malformed'); safeCue.sceneParamsSnapshot = {}; for (const [key, label, min, max] of def.schema) { const raw = Number(cue.sceneParamsSnapshot[key]); if (!Number.isFinite(raw) || raw < min || raw > max) throw new Error(`Cue snapshot ${def.id}.${key} is outside its bound`); safeCue.sceneParamsSnapshot[key] = raw; } } for (const [key, target] of [['paletteSnapshot', 'palette'], ['effectsSnapshot', 'effects']]) if (cue[key] !== undefined) { if (!cue[key] || typeof cue[key] !== 'object' || Array.isArray(cue[key])) throw new Error(`Cue ${target} snapshot is malformed`); safeCue[key] = key === 'effectsSnapshot' ? validateEffects(cue[key]) : Object.fromEntries(['primary', 'secondary', 'accent'].map((name) => { if (typeof cue[key][name] !== 'string' || !/^#[0-9a-f]{6}$/i.test(cue[key][name])) throw new Error('Cue palette snapshot is malformed'); return [name, cue[key][name]]; })); } return safeCue; }); candidate.gestureHistory = sanitizeGestureHistory(candidate.gestureHistory); if (candidate.phaseMeasurement !== undefined && candidate.phaseMeasurement !== null) candidate.phaseMeasurement = sanitizePhaseMeasurement(candidate.phaseMeasurement, 'Phase measurement metadata'); const legacyArchive = candidate.phaseMeasurement ? { format: phaseMeasurementFormat, version: 1, savedMeasurement: true, measurement: candidate.phaseMeasurement } : null; candidate.phaseMeasurementArchive = sanitizePhaseMeasurementArchive(candidate.phaseMeasurementArchive ?? legacyArchive); candidate.phaseEvents = sanitizePhaseEvents(candidate.phaseEvents); candidate.evolution = sanitizeEvolution(candidate.evolution); if (worldDistance(candidate.flight.pose.position, candidate.params.fractal.fractalScale) < .035) throw new Error('Flight viewpoint is inside a surface'); return candidate; }
function applySession(data, internalRestore = false) { if (offlineJobActive() && !internalRestore) throw new Error('Offline frame render is in progress'); const reportInputBefore = !internalRestore && lastRehearsalReportSignature ? rehearsalReportInputSignature() : null; const safe = validateSession(data); const nextPresetIndex = safe.presetIndex.map((n, i) => clamp(Math.round(n), 0, sceneDefs[i].presets.length - 1)); const nextParams = structuredClone(initialParams); for (const def of sceneDefs) for (const [key, label, min, max] of def.schema) nextParams[def.id][key] = clamp(Number(safe.params[def.id][key]), min, max); const nextEvolution = safe.evolution ? structuredClone(safe.evolution) : null; const nextGestures = structuredClone(safe.gestureHistory || []); const nextPhaseEvents = structuredClone(safe.phaseEvents || []); const nextPhaseMeasurementArchive = safe.phaseMeasurementArchive ? structuredClone(safe.phaseMeasurementArchive) : null; const nextPalette = Object.fromEntries(Object.entries(palette).map(([key, fallback]) => [key, /^#[0-9a-f]{6}$/i.test(safe.palette?.[key]) ? safe.palette[key] : fallback])); const nextCues = safe.cues.map((cue) => { const next = { label: cue.label, scene: cue.scene, preset: cue.preset, duration: clamp(Number(cue.duration), 1, 64) }; if (cue.arc !== undefined) next.arc = cue.arc; if (cue.nodeId !== undefined) next.nodeId = cue.nodeId; if (cue.paramsSnapshot) next.paramsSnapshot = structuredClone(cue.paramsSnapshot); if (cue.sceneParamsSnapshot) next.sceneParamsSnapshot = structuredClone(cue.sceneParamsSnapshot); if (cue.paletteSnapshot) next.paletteSnapshot = structuredClone(cue.paletteSnapshot); if (cue.effectsSnapshot) next.effectsSnapshot = structuredClone(cue.effectsSnapshot); if (cue.flightPose) next.flightPose = structuredClone(cue.flightPose); return next; }); const nextReducedMotion = Boolean(safe.options?.reducedMotion); const nextBrightness = clamp(Number(safe.options?.brightness ?? .92), .2, 1); const nextQuality = normalizeQuality(safe.options?.quality); const nextWorkflow = safe.options?.workflow === 'perform' ? 'perform' : 'explore'; const nextScene = clamp(Number(safe.activeScene), 0, sceneDefs.length - 1); if (!internalRestore) { pendingFrameManifest = null; setFrameProgress('Seeded start · current scene'); } clearTimeout(cueTimer); cueTimer = null; state.setPlaying = false; state.setComplete = false; state.currentCue = -1; syncSetControls(); state.presetIndex = nextPresetIndex; state.params = nextParams; state.evolution = nextEvolution; state.gestureHistory = nextGestures; state.phaseEvents = nextPhaseEvents; state.phaseMeasurementArchive = nextPhaseMeasurementArchive; state.workflow = nextWorkflow; state.setName = safe.name; $('setNameInput').value = state.setName; effects = validateEffects(safe.options.effects); renderEffects(); audioSensitivity = Number.isFinite(safe.options?.audioSensitivity) ? clamp(safe.options.audioSensitivity, 0, 3) : 1; $('audioSensitivity').value = audioSensitivity; state.tempo = clamp(Number(safe.tempo), 40, 180); for (const def of sceneDefs) for (const key of ['primary', 'secondary', 'accent']) scenePalettes[def.id][key] = /^#[0-9a-f]{6}$/i.test(safe.scenePalettes?.[def.id]?.[key]) ? safe.scenePalettes[def.id][key] : nextPalette[key]; Object.assign(palette, scenePalettes[sceneDefs[nextScene].id]); cues.splice(0, cues.length, ...nextCues); state.reducedMotion = nextReducedMotion; state.brightness = nextBrightness; state.quality = nextQuality; state.sceneIndex = nextScene; state.transition = null; fillPalette(); applyOutputProfile(); renderScenes(); renderControls(); announce(); renderCues(); $('tempoInput').value = state.tempo; flightPose = structuredClone(safe.flight.pose); stopFlight(); if (!internalRestore) refreshPaused(); $('primaryColor').value = palette.primary; $('secondaryColor').value = palette.secondary; $('accentColor').value = palette.accent; $('reducedMotionInput').checked = state.reducedMotion; $('brightnessInput').value = state.brightness * 100; $('qualityInput').value = state.quality; if (reportInputBefore && rehearsalReportInputSignature() !== reportInputBefore) markRehearsalReportStale(); saveLocal(); showToast('Session restored from portable JSON'); }
const validateSessionCore = validateSession;
validateSession = function validateSessionWithChecks(data) { const candidate = validateSessionCore(data); candidate.rehearsalChecks = sanitizeRehearsalChecks(candidate.rehearsalChecks); candidate.rehearsalChecksAt = sanitizeRehearsalChecksAt(candidate.rehearsalChecksAt); return candidate; };
const applySessionCore = applySession;
applySession = function applySessionWithNotes(data, internalRestore = false) { const previousNotes = state.rehearsalNotes; const previousChecks = state.rehearsalChecks; const previousChecksAt = state.rehearsalChecksAt; const result = applySessionCore(data, internalRestore); const nextNotes = typeof data?.notes === 'string' ? data.notes.slice(0, 1000) : ''; const nextChecks = sanitizeRehearsalChecks(data?.rehearsalChecks); const nextChecksAt = sanitizeRehearsalChecksAt(data?.rehearsalChecksAt); state.rehearsalNotes = nextNotes; state.rehearsalChecks = nextChecks; state.rehearsalChecksAt = nextChecksAt; const input = $('rehearsalNotesInput'); if (input) input.value = nextNotes; for (const [key, id] of Object.entries(rehearsalCheckIds)) { const check = $(id); if (check) check.checked = nextChecks[key]; } syncObservedChecksReadout(); if (nextNotes !== previousNotes || JSON.stringify(nextChecks) !== JSON.stringify(previousChecks) || nextChecksAt !== previousChecksAt) { markRehearsalReportStale(); if (!internalRestore) saveLocal(); } return result; };
const validateSessionWithChecksCore = validateSession;
validateSession = function validateSessionWithDeviceLabel(data) { const candidate = validateSessionWithChecksCore(data); candidate.deviceLabel = sanitizeDeviceLabel(candidate.deviceLabel); return candidate; };
const sessionDataCore = sessionData;
sessionData = function sessionDataWithDeviceLabel() { return { ...sessionDataCore(), deviceLabel: state.deviceLabel }; };
const rehearsalReportCore = rehearsalReport;
rehearsalReport = function rehearsalReportWithDeviceLabel() { return { ...rehearsalReportCore(), deviceLabel: state.deviceLabel }; };
const rehearsalReportStateSignatureCore = rehearsalReportStateSignature;
rehearsalReportStateSignature = function rehearsalReportStateSignatureWithDeviceLabel() { const base = JSON.parse(rehearsalReportStateSignatureCore()); base.deviceLabel = state.deviceLabel; return JSON.stringify(base); };
const rehearsalReportLiveSignatureCore = rehearsalReportLiveSignature;
rehearsalReportLiveSignature = function rehearsalReportLiveSignatureWithDeviceLabel() { const base = JSON.parse(rehearsalReportLiveSignatureCore()); base.push(state.deviceLabel); return JSON.stringify(base); };
const applySessionWithNotesCore = applySession;
applySession = function applySessionWithDeviceLabel(data, internalRestore = false) { const previousDeviceLabel = state.deviceLabel; const result = applySessionWithNotesCore(data, internalRestore); lastQualityABProbe = null; lastBeatResponseCheck = null; syncQualityABReadout(); syncBeatResponseReadout(); const nextDeviceLabel = sanitizeDeviceLabel(data?.deviceLabel); state.deviceLabel = nextDeviceLabel; const input = $('rehearsalDeviceInput'); if (input) input.value = nextDeviceLabel; if (nextDeviceLabel !== previousDeviceLabel) { markRehearsalReportStale(); if (!internalRestore) saveLocal(); } return result; };
const setOfflineControlsLockedCore = setOfflineControlsLocked;
setOfflineControlsLocked = function setOfflineControlsLockedWithDeviceLabel(job, locked) { const input = $('rehearsalDeviceInput'); if (input) { if (locked) job.controlState.set(input, input.disabled); input.disabled = locked ? true : job.controlState.get(input) ?? false; } return setOfflineControlsLockedCore(job, locked); };
function download(blob, filename) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }
function assetStem(name = state.setName) { const source = String(name || 'Untitled set').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); return source.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 48).toLowerCase() || 'untitled-set'; }
function exportFilename() { return `phosphor-${assetStem()}.json`; }
function exportSession() { download(new Blob([JSON.stringify(sessionData(), null, 2)], { type: 'application/json' }), exportFilename()); showToast('Portable set exported'); }
function isRecord(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function frameParams(def, value, label = 'Frame parameters') { if (!isRecord(value)) throw new Error(`${label} are missing`); const keys = new Set(def.schema.map(([key]) => key)); if (Object.keys(value).some((key) => !keys.has(key))) throw new Error(`${label} contain an unknown field`); const result = {}; for (const [key, _name, min, max] of def.schema) { const raw = value[key]; if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) throw new Error(`${label} ${key} is outside its ${min}–${max} bound`); result[key] = raw; } return result; }
function framePalette(value, label = 'Frame palette') { if (!isRecord(value) || Object.keys(value).some((key) => !['primary', 'secondary', 'accent'].includes(key)) || Object.keys(value).length !== 3 || !['primary', 'secondary', 'accent'].every((key) => typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key]))) throw new Error(`${label} is malformed`); return { primary: value.primary, secondary: value.secondary, accent: value.accent }; }
function frameEvolutionState(value) { if (!isRecord(value) || !isRecord(value.evolution)) throw new Error('Frame Evolution state is missing'); const raw = value.evolution; if (!Array.isArray(raw.nodes) || raw.nodes.length < 1 || raw.nodes.length > 128 || typeof raw.seed !== 'number' || !Number.isInteger(raw.seed) || raw.seed < -2147483648 || raw.seed > 2147483647) throw new Error('Frame Evolution state is malformed'); const ids = new Set(); for (const node of raw.nodes) { if (!isRecord(node) || typeof node.id !== 'string' || node.id.length < 1 || node.id.length > 80 || ids.has(node.id) || typeof node.name !== 'string' || node.name.length > 40 || !Number.isInteger(node.generation) || node.generation < 0 || node.generation > 8 || !Array.isArray(node.lockedParameters) || node.lockedParameters.length > 4 || node.lockedParameters.some((key) => !['mutation', 'generation', 'lineage', 'focus'].includes(key)) || typeof node.favorite !== 'boolean' || !Array.isArray(node.children) || node.children.length > 16 || node.children.some((id) => typeof id !== 'string')) throw new Error('Frame Evolution node is malformed'); ids.add(node.id); }
  const nodes = raw.nodes.map((node) => { if (node.parent !== null && (typeof node.parent !== 'string' || !ids.has(node.parent))) throw new Error('Frame Evolution parent is malformed'); if (node.children.some((id) => !ids.has(id))) throw new Error('Frame Evolution child is malformed'); return { id: node.id, parent: node.parent, name: node.name, generation: node.generation, params: frameParams(sceneDefs[9], node.params, 'Frame Evolution parameters'), lockedParameters: [...new Set(node.lockedParameters)], favorite: node.favorite, children: [...node.children] }; }); if (typeof raw.currentId !== 'string' || !ids.has(raw.currentId) || typeof raw.selectedId !== 'string' || !ids.has(raw.selectedId)) throw new Error('Frame Evolution selection is malformed'); return { seed: raw.seed, nodes, currentId: raw.currentId, selectedId: raw.selectedId, undo: [] }; }
function frameCount() { const raw = $('frameCountInput').value; const count = raw === '' ? 120 : Number(raw); if (!Number.isInteger(count) || count < 1 || count > maxFrameCount) throw new Error(`Frame count must be 1–${maxFrameCount}`); return count; }
function validateFrameManifest(data) { if (!isRecord(data)) throw new Error('Frame plan must be a JSON object'); if (data.format === legacyFrameManifestFormat && data.version === 1) throw new Error('Legacy frame recipe v1 is not executable; export a new Frame plan'); const allowed = new Set(['format', 'version', 'phaseModel', 'fractalWorld', 'startMode', 'frameClock', 'width', 'height', 'frameRate', 'targetCadence', 'outputProfile', 'frames', 'stepSeconds', 'scene', 'sceneIndex', 'preset', 'presetIndex', 'seed', 'params', 'palette', 'settings', 'initialState', 'performanceMeasurement', 'phaseMeasurement', 'phaseMeasurementArchive', 'note']); if (Object.keys(data).some((key) => !allowed.has(key)) || data.format !== frameManifestFormat || data.version !== 2 || data.startMode !== 'seeded-start' || data.frameClock !== frameClockId) throw new Error('Frame plan is not an executable seeded-start plan'); if (!Number.isInteger(data.frames) || data.frames < 1 || data.frames > maxFrameCount) throw new Error(`Frame plan count must be 1–${maxFrameCount}`); if (typeof data.scene !== 'string') throw new Error('Frame plan scene is missing'); const sceneIndex = sceneDefs.findIndex((def) => def.id === data.scene); if (sceneIndex < 0) throw new Error('Frame plan scene is unknown'); if (data.sceneIndex !== undefined && data.sceneIndex !== sceneIndex) throw new Error('Frame plan scene index disagrees'); const def = sceneDefs[sceneIndex]; if (typeof data.preset !== 'string') throw new Error('Frame plan preset is missing'); const presetIndex = def.presets.findIndex(([name]) => name === data.preset); if (presetIndex < 0) throw new Error('Frame plan preset is unknown'); if (data.presetIndex !== undefined && data.presetIndex !== presetIndex) throw new Error('Frame plan preset index disagrees'); if (typeof data.seed !== 'number' || !Number.isInteger(data.seed) || data.seed < -2147483648 || data.seed > 2147483647) throw new Error('Frame plan seed is malformed'); const quality = qualityForProfileId(data.outputProfile); if (!quality) throw new Error('Frame plan output profile is unknown'); const profile = qualityProfile(quality); if (data.width !== profile.width || data.height !== profile.height || data.frameRate !== profile.cadence || data.targetCadence !== profile.cadence || typeof data.stepSeconds !== 'number' || !Number.isFinite(data.stepSeconds) || Math.abs(data.stepSeconds - 1 / profile.cadence) > 1e-9) throw new Error('Frame plan size, cadence, and step do not agree'); if (!isRecord(data.settings) || Object.keys(data.settings).some((key) => !['params', 'palette', 'brightness', 'reducedMotion', 'tempo', 'effects'].includes(key)) || ![5, 6].includes(Object.keys(data.settings).length)) throw new Error('Frame plan settings are incomplete'); if (def.kind === 'phase' && data.phaseModel !== phaseModel.id) throw new Error('Phase model changed · export a new frame plan'); const frameEffects = validateEffects(data.settings.effects); const params = frameParams(def, data.params); const settingsParams = frameParams(def, data.settings.params, 'Frame plan settings'); for (const [key] of def.schema) if (params[key] !== settingsParams[key]) throw new Error('Frame plan parameter copies disagree'); const paletteValue = framePalette(data.palette); const settingsPalette = framePalette(data.settings.palette, 'Frame plan settings palette'); if (JSON.stringify(paletteValue) !== JSON.stringify(settingsPalette)) throw new Error('Frame plan palette copies disagree'); if (typeof data.settings.brightness !== 'number' || !Number.isFinite(data.settings.brightness) || data.settings.brightness < .2 || data.settings.brightness > 1 || typeof data.settings.reducedMotion !== 'boolean' || typeof data.settings.tempo !== 'number' || !Number.isFinite(data.settings.tempo) || data.settings.tempo < 40 || data.settings.tempo > 180) throw new Error('Frame plan settings are outside their bounds'); let initialState = null; if (def.kind === 'fractal') { if (data.fractalWorld !== FRACTAL_WORLD) throw new Error('Flight world changed · export a new frame plan'); if (!isRecord(data.initialState) || typeof data.initialState.cruise !== 'boolean') throw new Error('Flight frame start is malformed'); initialState = { pose: validateFlightPose(data.initialState.pose), cruise: data.initialState.cruise }; if (worldDistance(initialState.pose.position, params.fractalScale) < .035) throw new Error('Flight frame viewpoint is inside a surface'); } else if (def.kind === 'evolution') initialState = { evolution: frameEvolutionState(data.initialState) }; else if (data.initialState !== null) throw new Error('Frame plan initial state is not supported for this scene'); const performanceMeasurement = data.performanceMeasurement === undefined || data.performanceMeasurement === null ? null : isRecord(data.performanceMeasurement) ? structuredClone(data.performanceMeasurement) : (() => { throw new Error('Frame plan performance metadata is malformed'); })(); const phaseMeasurementValue = data.phaseMeasurement === undefined || data.phaseMeasurement === null ? null : sanitizePhaseMeasurement(data.phaseMeasurement, 'Frame plan phase measurement'); const phaseArchive = data.phaseMeasurementArchive === undefined || data.phaseMeasurementArchive === null ? null : sanitizePhaseMeasurementArchive(data.phaseMeasurementArchive); return { ...(def.kind === 'fractal' ? { fractalWorld: FRACTAL_WORLD } : {}), ...(def.kind === 'phase' ? { phaseModel: phaseModel.id } : {}), format: frameManifestFormat, version: 2, startMode: 'seeded-start', frameClock: frameClockId, width: profile.width, height: profile.height, frameRate: profile.cadence, targetCadence: profile.cadence, outputProfile: profile.id, frames: data.frames, stepSeconds: 1 / profile.cadence, scene: def.id, sceneIndex, preset: def.presets[presetIndex][0], presetIndex, seed: data.seed, params, palette: paletteValue, settings: { params: structuredClone(params), palette: settingsPalette, brightness: data.settings.brightness, reducedMotion: data.settings.reducedMotion, tempo: data.settings.tempo, effects: frameEffects }, initialState, performanceMeasurement, phaseMeasurement: phaseMeasurementValue, phaseMeasurementArchive: phaseArchive, note: typeof data.note === 'string' ? data.note.slice(0, 500) : 'Seeded-start frames; not a lossless live-buffer checkpoint.' }; }
function frameManifest() { const profile = outputProfile(); const frameCountValue = frameCount(); const def = scene(); const evolution = def.kind === 'fractal' ? { pose: structuredClone(flightPose), cruise: flightCruise } : def.kind === 'evolution' ? { evolution: structuredClone({ ...state.evolution, undo: [] }) } : null; const params = structuredClone(state.params[def.id]); const settings = { params: structuredClone(params), palette: { ...palette }, brightness: state.brightness, reducedMotion: state.reducedMotion, tempo: state.tempo, effects: { ...effects } }; const timing = metrics.summary(state.sceneIndex); const performanceMeasurement = { ...timing, ...performanceTargetSummary(timing, profile) }; return validateFrameManifest({ ...(def.kind === 'fractal' ? { fractalWorld: FRACTAL_WORLD } : {}), ...(def.kind === 'phase' ? { phaseModel: phaseModel.id } : {}), format: frameManifestFormat, version: 2, startMode: 'seeded-start', frameClock: frameClockId, width: canvas.width, height: canvas.height, frameRate: profile.cadence, targetCadence: profile.cadence, outputProfile: profile.id, frames: frameCountValue, stepSeconds: 1 / profile.cadence, scene: def.id, preset: preset()[0], seed: preset()[2], params, palette: { ...palette }, settings, initialState: evolution, performanceMeasurement, phaseMeasurement: def.kind === 'phase' ? phaseMeasurement() : null, phaseMeasurementArchive: state.phaseMeasurementArchive, note: 'Fractal plans begin at the saved pose with constant cruise/turn controls; prior live camera actions are not replayed. Other scenes use seeded-start frames only; live buffers, audio, cues, transitions, and mid-run phase are not restored. Frame time is state.elapsed immediately before each fixed step.' }); }
function setFrameProgress(text) { const output = $('frameProgress'); if (output) output.textContent = text; }
function exportFrameManifest() { if (offlineJobActive()) return; const manifest = frameManifest(); pendingFrameManifest = manifest; setFrameProgress(`Plan ready · ${manifest.frames} seeded frames`); download(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), `phosphor-${assetStem()}-frame-plan.json`); showToast('Frame plan saved · seeded start only'); }
function importFrameManifest(data) { if (offlineJobActive()) throw new Error('Offline frame render is in progress'); const manifest = validateFrameManifest(data); pendingFrameManifest = manifest; $('frameCountInput').value = String(manifest.frames); setFrameProgress(`Plan loaded · ${manifest.frames} seeded frames`); showToast('Frame plan loaded · stage will restart paused'); return manifest; }
function frameOutputMetadata(manifest, status, written) { return { format: frameOutputMetadataFormat, version: 1, status, written, total: manifest.frames, setName: state.setName, scene: manifest.scene, sceneIndex: manifest.sceneIndex, outputProfile: manifest.outputProfile, width: manifest.width, height: manifest.height, frameRate: manifest.frameRate, frameClock: manifest.frameClock, stepSeconds: manifest.stepSeconds, note: status === 'complete' ? 'All seeded frames were written.' : 'Partial seeded output; inspect written before reuse.' }; }
function frameDirectoryWriter(directory, prefix = assetStem()) { const safePrefix = assetStem(prefix); const claim = (async () => { const base = `phosphor-${safePrefix}-frames-${Date.now()}`; for (let attempt = 0; attempt < 8; attempt += 1) { const name = `${base}${attempt ? `-${attempt + 1}` : ''}`; try { await directory.getDirectoryHandle(name, { create: false }); } catch (error) { if (error?.name !== 'NotFoundError') throw error; return directory.getDirectoryHandle(name, { create: true }); } } throw new Error('Could not reserve a new frame output folder'); })(); const writeFile = async (name, blob) => { const outputDirectory = await claim; const handle = await outputDirectory.getFileHandle(name, { create: true }); const writable = await handle.createWritable(); try { await writable.write(blob); await writable.close(); } catch (error) { try { await writable.abort?.(); } catch {} throw error; } }; return { async writeFrame(name, blob) { const outputName = name.startsWith(`phosphor-${safePrefix}-`) ? name : `phosphor-${safePrefix}-${name.replace(/^phosphor-/, '')}`; return writeFile(outputName, blob); }, async writeMetadata(metadata) { return writeFile(`phosphor-${safePrefix}-frame-output.json`, new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })); } }; }
function frameBlob(source) { return new Promise((resolve, reject) => { try { source.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding returned no data')), 'image/png'); } catch (error) { reject(error); } }); }
function frameBlocker() { if (state.setPlaying || cueTimer) return 'Stop the cue set first'; if (audio.source || audio.demoGain || audio.media || audio.micStream) return 'Stop audio sources first'; if (audio.recorder || audio.recordingStream) return 'Stop recording first'; if (state.transition) return 'Wait for the scene transition to finish'; if (buffers.magnetic.replay.playing) return 'Stop Magnetic replay first'; if (state.renderingLost) return 'Wait for graphics recovery'; return ''; }
function offlineSnapshot() { return { session: structuredClone(sessionData()), paused: state.paused, blackout: state.blackout, renderingLost: state.renderingLost, elapsed: state.elapsed, cadenceAccumulator: state.cadenceAccumulator, currentCue: state.currentCue, setComplete: state.setComplete, cueRemainingMs, cueRemainingBeats, cueConsumedBeats, audioLevel: state.audioLevel, audioPeak: state.audioPeak, audioPeakHold: state.audioPeakHold, audioPeakSession: structuredClone(audio.peakSession), audioBands: structuredClone(state.audioBands), audioBandsReady: state.audioBandsReady, gesture: structuredClone(state.gesture), renderer: structuredClone(activeRenderState), metricsProfile, frameTimes: [...metrics.frameTimes], sceneFrames: [...metrics.sceneFrames], sceneTimes: metrics.sceneTimes.map((values) => [...values]) }; }
function applyOfflineManifest(manifest) { effects = validateEffects(manifest.settings.effects); renderEffects(); const def = sceneDefs[manifest.sceneIndex]; state.sceneIndex = manifest.sceneIndex; state.presetIndex[manifest.sceneIndex] = manifest.presetIndex; state.params[def.id] = structuredClone(manifest.params); palette.primary = manifest.palette.primary; palette.secondary = manifest.palette.secondary; palette.accent = manifest.palette.accent; state.brightness = manifest.settings.brightness; state.reducedMotion = manifest.settings.reducedMotion; state.tempo = manifest.settings.tempo; state.quality = normalizeQuality(qualityForProfileId(manifest.outputProfile)); if (manifest.initialState?.evolution) state.evolution = structuredClone(manifest.initialState.evolution); state.paused = true; state.blackout = false; state.renderingLost = false; state.audioLevel = 0; state.audioPeak = 0; state.audioPeakHold = 0; resetAudioPeakSession(); state.audioBands = { low: 0, mid: 0, high: 0 }; state.audioBandsReady = false; state.setPlaying = false; state.currentCue = -1; state.transition = null; state.elapsed = 0; state.cadenceAccumulator = 0; state.gesture = { x: .5, y: .5, active: false, scene: manifest.sceneIndex }; fillPalette(); applyOutputProfile(); resetRenderer(manifest.seed); if (def.kind === 'fractal') { flightPose = validateFlightPose(manifest.initialState.pose); flightCruise = manifest.initialState.cruise; if (offlineFrameJob) offlineFrameJob.flightCruise = manifest.initialState.cruise; } renderScenes(); renderControls(); announce(); renderCues(); syncPauseControls(); syncSetControls(); syncAudioHeadroomReadout(); }
function restoreOfflineSnapshot(snapshot) { applySession(snapshot.session, true); if (typeof snapshot.metricsProfile === 'string') metricsProfile = snapshot.metricsProfile; metrics.frameTimes = Array.isArray(snapshot.frameTimes) ? snapshot.frameTimes.slice(-3600) : []; metrics.sceneFrames = Array.isArray(snapshot.sceneFrames) ? snapshot.sceneFrames.slice(0, sceneDefs.length) : Array(sceneDefs.length).fill(0); while (metrics.sceneFrames.length < sceneDefs.length) metrics.sceneFrames.push(0); metrics.sceneTimes = Array.isArray(snapshot.sceneTimes) ? snapshot.sceneTimes.slice(0, sceneDefs.length).map((values) => Array.isArray(values) ? values.slice(-360) : []) : Array.from({ length: sceneDefs.length }, () => []); while (metrics.sceneTimes.length < sceneDefs.length) metrics.sceneTimes.push([]); state.paused = true; state.blackout = snapshot.blackout; state.renderingLost = snapshot.renderingLost; state.audioLevel = snapshot.audioLevel; state.audioPeak = clamp(Number(snapshot.audioPeak) || 0, 0, 1); state.audioPeakHold = clamp(Number(snapshot.audioPeakHold) || 0, 0, 1); audio.peakSession = snapshot.audioPeakSession && typeof snapshot.audioPeakSession === 'object' ? { ...createAudioPeakSession(), ...snapshot.audioPeakSession } : createAudioPeakSession(); state.audioBands = structuredClone(snapshot.audioBands || { low: 0, mid: 0, high: 0 }); state.audioBandsReady = Boolean(snapshot.audioBandsReady); state.elapsed = 0; state.cadenceAccumulator = 0; state.currentCue = Number.isInteger(snapshot.currentCue) && snapshot.currentCue >= 0 && snapshot.currentCue < cues.length ? snapshot.currentCue : -1; state.setComplete = Boolean(snapshot.setComplete) && state.currentCue < 0; const activeCue = state.currentCue >= 0 ? cues[state.currentCue] : null; const maxCueBeats = activeCue ? activeCue.duration * 4 : 0; cueRemainingBeats = activeCue ? clamp(Number(snapshot.cueRemainingBeats), 0, maxCueBeats) : 0; cueConsumedBeats = activeCue ? clamp(Number(snapshot.cueConsumedBeats), 0, maxCueBeats) : 0; cueRemainingMs = activeCue ? clamp(Number(snapshot.cueRemainingMs), 0, maxCueBeats * 60000 / state.tempo) : 0; state.transition = null; state.gesture = snapshot.gesture; state.lastTime = performance.now(); syncPauseControls(); syncSetControls(); renderCues(); announce(); if (!state.blackout && !state.renderingLost) drawPreview(); else { ctx.fillStyle = '#020207'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (snapshot.renderer) { activeRenderState = structuredClone(snapshot.renderer); syncRendererReadout(); } syncAudioHeadroomReadout(); }
function cancelOfflineRender() { if (!offlineFrameJob || offlineFrameJob.pickerPending) return false; offlineFrameJob.cancelled = true; setFrameProgress(`Canceling · ${offlineFrameJob.written} written`); return true; }
function syncFrameCancelControl(job) { const button = $('frameCancelButton'); if (!button) return; button.disabled = Boolean(job?.pickerPending); button.hidden = !offlineFrameJob; button.title = job?.pickerPending ? 'Choose an output folder before canceling' : ''; }
function setOfflineControlsLocked(job, locked) { const ids = ['focusButton', 'exploreModeButton', 'performModeButton', 'resetButton', 'randomButton', 'addCueButton', 'playSetButton', 'startAudioButton', 'demoAudioButton', 'micButton', 'tabAudioButton', 'stopAudioButton', 'pauseButton', 'muteButton', 'captureButton', 'recordButton', 'frameExportButton', 'frameImportInput', 'frameCountInput', 'saveButton', 'exportButton', 'importInput', 'audioFileInput', 'audioSensitivity', 'qualityInput', 'brightnessInput', 'primaryColor', 'secondaryColor', 'accentColor', 'reducedMotionInput', 'tempoInput', 'setNameInput', 'rehearsalNotesInput', 'qualityABButton', 'beatResponseButton', 'setTimingButton', ...Object.values(rehearsalCheckIds), 'preflightButton', 'rehearsalReportButton', 'rehearsalReportInput', 'clearRehearsalReportButton', 'clearObservedChecksButton', 'tripStackButton', 'clearEffectsButton', 'loadScoreButton', 'restoreScoreButton', 'mobilePlayButton', 'mobilePauseButton', 'mobileSaveButton', 'mobileExportButton']; for (const id of ids) { const element = $(id); if (!element) continue; if (locked) job.controlState.set(element, element.disabled); element.disabled = locked ? true : job.controlState.get(element) ?? false; } $('frameRenderButton').disabled = locked; syncFrameCancelControl(locked ? job : null); syncQualityABControl(); syncBeatResponseControl(); syncReadinessStatus(); }
function releaseOfflineJob(job) { if (offlineFrameJob !== job) return; offlineFrameJob = null; setOfflineControlsLocked(job, false); if (scene().kind === 'fractal' && state.focusMode && !state.renderingLost) drawPreview(); renderCues(); }
async function renderOfflineFrames(input = pendingFrameManifest || frameManifest(), options = {}) { const manifest = validateFrameManifest(input); if (offlineFrameJob) throw new Error('A frame render is already running'); const blocker = frameBlocker(); if (blocker) throw new Error(blocker); let writer = options.writer; const job = { cancelled: false, pickerPending: !writer, written: 0, total: manifest.frames, controlState: new Map() }; offlineFrameJob = job; clearTimeout(saveTimer); saveTimer = null; setOfflineControlsLocked(job, true); let snapshot = null; let status = 'complete'; let failure = null; try { if (!writer) { if (typeof window.showDirectoryPicker !== 'function') { setFrameProgress('Batch folder output unavailable · use still, WebM, or Frame plan'); showToast('Batch PNG folder output needs a supported browser · still, WebM, or Frame plan still work'); return { status: 'unsupported', written: 0, total: manifest.frames }; } let directory; try { directory = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (error) { if (error?.name === 'AbortError') { setFrameProgress('Batch output canceled'); return { status: 'canceled', written: 0, total: manifest.frames }; } throw error; } writer = frameDirectoryWriter(directory); } job.pickerPending = false; syncFrameCancelControl(job); if (!writer || typeof writer.writeFrame !== 'function') throw new Error('Frame writer is unavailable'); snapshot = offlineSnapshot(); setFrameProgress(`Starting seeded render · 0 / ${job.total}`); applyOfflineManifest(manifest); const digits = Math.max(3, String(manifest.frames).length); for (let index = 0; index < manifest.frames; index += 1) { if (job.cancelled) { status = 'canceled'; break; } if (state.renderingLost) throw new Error('Graphics recovery interrupted the frame render'); const frameTime = index * manifest.stepSeconds; state.elapsed = frameTime; stepAndDraw(manifest.stepSeconds); const blob = await frameBlob(compositeOutputFrame()); if (job.cancelled) { status = 'canceled'; break; } const name = `phosphor-${manifest.scene}-${String(index + 1).padStart(digits, '0')}.png`; await writer.writeFrame(name, blob, { index: index + 1, time: frameTime, frameClock: manifest.frameClock, width: manifest.width, height: manifest.height, scene: manifest.scene, params: structuredClone(manifest.params) }); job.written += 1; setFrameProgress(`Rendering seeded frames · ${job.written} / ${job.total}`); } } catch (error) { if (!snapshot) throw error; status = 'failed'; failure = error; } finally { if (snapshot && typeof writer?.writeMetadata === 'function') { try { await writer.writeMetadata(frameOutputMetadata(manifest, status, job.written)); } catch (error) { status = 'failed'; failure = failure || error; } } if (snapshot) { try { restoreOfflineSnapshot(snapshot); } catch (error) { status = 'failed'; failure = failure || error; } } releaseOfflineJob(job); } if (status === 'complete') { setFrameProgress(`Done · ${job.written} PNGs · ${manifest.width}×${manifest.height}`); showToast(`Rendered ${job.written} PNGs · seeded start · stage paused`); } else if (status === 'canceled') { setFrameProgress(`Canceled · ${job.written} PNGs written`); showToast(`Frame render canceled after ${job.written} PNGs`); } else { setFrameProgress(`Failed · ${job.written} PNGs written · use still, WebM, or Frame plan`); showToast(`Frame render failed after ${job.written} PNGs · still, WebM, or Frame plan remain available`); } return { status, written: job.written, total: job.total, width: manifest.width, height: manifest.height, stepSeconds: manifest.stepSeconds, error: failure?.message || null }; }
async function renderOfflineFramesWithNamedAssets(input = pendingFrameManifest || frameManifest(), options = {}) { if (!options.writer) return renderOfflineFrames(input, options); const writer = options.writer; const prefix = `phosphor-${assetStem()}`; const namedWriter = { async writeFrame(name, blob, metadata) { const outputName = name.startsWith(`${prefix}-`) ? name : `${prefix}-${name.replace(/^phosphor-/, '')}`; return writer.writeFrame(outputName, blob, metadata); } }; if (typeof writer.writeMetadata === 'function') namedWriter.writeMetadata = (metadata) => writer.writeMetadata(metadata); return renderOfflineFrames(input, { ...options, writer: namedWriter }); }
function captureStill() { if (offlineJobActive()) return; const output = compositeOutputFrame(); const stem = assetStem(); const sceneId = scene().id; output.toBlob((blob) => { if (blob) { download(blob, `phosphor-${stem}-${sceneId}-${Date.now()}.png`); showToast('Still captured'); } else showToast('Still capture is not available'); }, 'image/png'); }
function finishRecording(saveBlob = false, message = '') {
  const recorder = audio.recorder;
  const wasActive = Boolean(recorder || audio.recordingStream);
  if (recorder) { recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null; recorder.onabort = null; }
  const mime = audio.recordingMime || 'video/webm';
  const stem = audio.recordingStem || assetStem(); const sceneId = audio.recordingScene || scene().id;
  const hasData = audio.chunks.length > 0;
  if (saveBlob && hasData) download(new Blob(audio.chunks, { type: mime }), `phosphor-${stem}-${sceneId}-${Date.now()}.webm`);
  const outcomeMessage = saveBlob && !hasData ? 'Recording returned no data · use still or frame export' : message;
  setRecordingOutcome(saveBlob ? hasData ? 'saved' : 'empty' : message ? 'failed' : wasActive ? 'failed' : recordingOutcome);
  audio.recorder = null;
  try { if (recorder?.state === 'recording') recorder.stop(); } catch {}
  for (const track of streamTracks(audio.recordingStream)) if (track && typeof track === 'object') track.onended = null;
  stopMediaStream(audio.recordingStream);
  audio.recordingStream = null; audio.recordingMime = null; audio.recordingStem = null; audio.recordingScene = null; audio.recordingStartedAt = null; audio.recordingLastPaint = -Infinity; audio.chunks = [];
  $('recordButton').textContent = 'Record'; syncRecordingMimeReadout(); syncRecordingOutcome(); syncAudioSourceControls(); if (outcomeMessage) showToast(outcomeMessage);
}
function toggleRecord() {
  if (offlineJobActive()) return;
  if (audio.recorder) {
    if (audio.recorder.state === 'recording') {
      $('recordButton').textContent = 'Saving…';
      try { audio.recorder.stop(); } catch { finishRecording(false, 'Recording could not stop · capture cleaned up'); }
    }
    else showToast('Finishing the previous recording');
    return;
  }
  const videoType = recordingMimeType();
  if (!videoType) { setRecordingOutcome('failed'); return showToast('Recording is unsupported here · use still or frame export'); }
  let stream = null;
  const clonedTracks = [];
  try {
    stream = compositeOutputFrame().captureStream(outputProfile().cadence);
    if (!stream || typeof stream.addTrack !== 'function' || typeof stream.getTracks !== 'function') throw new Error('Capture stream is unavailable');
    if (audio.recordDestination && !audio.micStream && !audio.tabStream) audio.recordDestination.stream.getAudioTracks().forEach(track => { const clone = track.clone(); clonedTracks.push(clone); stream.addTrack(clone); });
  } catch {
    const tracks = new Set([...(stream?.getTracks?.() || []), ...clonedTracks]);
    tracks.forEach(track => track?.stop?.());
    setRecordingOutcome('failed'); syncRecordingMimeReadout(); syncAudioSourceControls();
    return showToast('Recording capture setup failed · use still or frame export');
  }
  audio.recordingStream = stream; audio.recordingMime = videoType; syncRecordingMimeReadout(); setRecordingOutcome('active');
  let recorder;
  try { recorder = new MediaRecorder(stream, { mimeType: videoType }); audio.recorder = recorder; audio.recordingStem = assetStem(); audio.recordingScene = scene().id; }
  catch { finishRecording(false, 'Recorder setup failed · use still or frame export'); return; }
  audio.chunks = [];
  recorder.ondataavailable = event => { if (audio.recorder === recorder && event.data.size) audio.chunks.push(event.data); };
  recorder.onerror = () => { if (audio.recorder === recorder) finishRecording(false, 'Recording encoder error · capture cleaned up'); };
  recorder.onabort = () => { if (audio.recorder === recorder) finishRecording(false, 'Recording aborted · capture cleaned up'); };
  recorder.onstop = () => { if (audio.recorder === recorder) finishRecording(true, 'Local recording saved'); };
  bindRecordingStreamEnded(stream, recorder);
  try { recorder.start(); } catch { finishRecording(false, 'Recording could not start · capture cleaned up'); return; }
  audio.recordingStartedAt = performance.now(); audio.recordingLastPaint = -Infinity; syncRecordingReadout(audio.recordingStartedAt); syncAudioSourceControls(); showToast(audio.micStream || audio.tabStream ? 'Recording visuals only' : 'Recording locally · no upload');
}

async function startOfflineRender() { try { const result = await renderOfflineFramesWithNamedAssets(pendingFrameManifest || frameManifest()); if (result.status === 'unsupported') setFrameProgress('Batch folder output unavailable · use still, WebM, or Frame plan'); } catch (error) { setFrameProgress(`Frame plan rejected · ${error.message}`); showToast(`Frame plan rejected · ${error.message}`); } }
function readFrameManifestFile(file) { if (offlineJobActive() || !file || file.size > 2 * 1024 * 1024) return showToast('Frame plan must be JSON under 2 MB'); const reader = new FileReader(); reader.onload = () => { if (offlineJobActive()) return showToast('Frame plan ignored · offline render is in progress'); try { importFrameManifest(JSON.parse(reader.result)); } catch (error) { setFrameProgress(`Frame plan rejected · ${error.message}`); showToast(`Frame plan rejected · ${error.message}`); } }; reader.readAsText(file); }
function runLifecycleProbe() { const saved = { sceneIndex: state.sceneIndex, presetIndex: [...state.presetIndex], params: structuredClone(state.params), elapsed: state.elapsed }; const heapBefore = performance.memory?.usedJSHeapSize ?? null; clearTimeout(saveTimer); state.transition = null; finishRecording(false); stopAudioSource(); const samples = []; for (let i = 0; i < 10; i += 1) { switchScene((state.sceneIndex + 1) % sceneDefs.length, i % sceneDefs[(state.sceneIndex + 1) % sceneDefs.length].presets.length); stepAndDraw(.016); const pixels = ctx.getImageData(0, 0, 24, 24).data; samples.push({ scene: scene().id, nonBlack: pixels.some((value, index) => index % 4 !== 3 && value > 0), finitePixels: [...pixels].every((value) => Number.isFinite(value)) }); finishRecording(false); stopAudioSource(); } const heapAfter = performance.memory?.usedJSHeapSize ?? null; const result = { switches: samples.length, samples, fixedFeedbackBuffers: buffers.feedback.a.width === canvas.width && buffers.feedback.b.width === canvas.width, fixedTapestryRows: buffers.tapestry.rows.length === 120, fixedAcidCells: buffers.acid.u.length === 9000, fixedMagneticParticles: buffers.magnetic.particles.length === 720 * 4, fixedAquariumOrganisms: buffers.aquarium.organisms.length === 96 * 6, fixedPhaseCells: buffers.phase.values.length === 64 * 40, audioCleared: !audio.source && !audio.demoGain && !audio.media && !audio.mediaUrl && !audio.micStream && !audio.tabStream, captureCleared: !audio.recorder && !audio.recordingStream, heapBytes: heapBefore === null || heapAfter === null ? null : { before: heapBefore, after: heapAfter } }; state.sceneIndex = saved.sceneIndex; state.presetIndex = saved.presetIndex; state.params = saved.params; state.elapsed = saved.elapsed; resetRenderer(); renderScenes(); renderControls(); announce(); renderCues(); state.dirty = false; $('dirtyState').textContent = 'SAVED'; return result; }

    function wire() {
      syncRehearsalReportClearControl();
      syncRehearsalReportImportEvidence();
      syncRehearsalReportImportSourceHistory();
      $('clearRehearsalReportButton').addEventListener('click', clearRehearsalReportImport);
      $('focusQualityButton').addEventListener('click', () => { if (setQuality('native')) { syncFocusScaleReadout(); showToast('HD output enabled · native WebGL when available'); } });
      for (const key of Object.keys(effectDefaults)) $('effect-' + key).addEventListener('input', event => { if (offlineJobActive()) return; effects[key] = Number(event.target.value); $('effect-value-' + key).textContent = `${Math.round(effects[key] * 100)}%`; markEffectDirty(); });
      $('tripStackButton').addEventListener('click', () => { if (offlineJobActive()) return; effects = { symmetry: .5, echo: .55, chroma: .45, glow: .4 }; renderEffects(); markEffectDirty(); showToast('Trip stack on · each layer is adjustable'); });
      $('clearEffectsButton').addEventListener('click', () => { if (offlineJobActive()) return; effects = { ...effectDefaults }; renderEffects(); markEffectDirty(); });
      document.querySelectorAll?.('[data-palette]').forEach(button => button.addEventListener('click', () => { if (offlineJobActive()) return; const colors = paletteCollections[button.dataset.palette]; [palette.primary, palette.secondary, palette.accent] = colors; fillPalette(); markDirty(); }));
      window.addEventListener('keydown', (event) => { if (offlineFrameJob) { event.preventDefault(); event.stopImmediatePropagation?.(); } }, true);
      canvas.addEventListener('pointerdown', (event) => { if (offlineFrameJob) { event.preventDefault(); event.stopImmediatePropagation?.(); } }, true);
      canvas.addEventListener('pointermove', (event) => { if (offlineFrameJob) { event.preventDefault(); event.stopImmediatePropagation?.(); } }, true);
      canvas.addEventListener('contextlost', (event) => { event.preventDefault(); if (offlineFrameJob) offlineFrameJob.cancelled = true; state.renderingLost = true; $('transitionBadge').textContent = 'RECOVERING'; syncReadinessStatus(); showToast('Graphics paused · waiting for context recovery'); }); canvas.addEventListener('contextrestored', () => { state.renderingLost = false; applyOutputProfile(); renderControls(); announce(); syncReadinessStatus(); showToast('Graphics context restored · seed reset'); });
  $('setNameInput').addEventListener('change', (event) => { if (!setSetName(event.target.value)) event.target.value = state.setName; });
  $('rehearsalDeviceInput').addEventListener('change', (event) => { const nextDeviceLabel = sanitizeDeviceLabel(event.target.value); event.target.value = nextDeviceLabel; if (state.deviceLabel === nextDeviceLabel) return; state.deviceLabel = nextDeviceLabel; markDirty(false, false); });
  $('rehearsalNotesInput').addEventListener('input', (event) => { const nextNotes = String(event.target.value || '').slice(0, 1000); if (state.rehearsalNotes === nextNotes) return; state.rehearsalNotes = nextNotes; event.target.value = nextNotes; markDirty(false, false); });
  for (const [key, id] of Object.entries(rehearsalCheckIds)) {
    $(id).addEventListener('change', (event) => {
      const next = Boolean(event.target.checked);
      if (state.rehearsalChecks[key] === next) return;
      state.rehearsalChecks[key] = next;
      state.rehearsalChecksAt = new Date().toISOString();
      syncObservedChecksReadout();
      markDirty(false, false);
    });
  }
  $('focusButton').addEventListener('click', toggleFocusMode); $('mobilePauseButton').addEventListener('click', () => $('pauseButton').click()); $('mobilePlayButton').addEventListener('click', () => $('playSetButton').click()); $('mobileSaveButton').addEventListener('click', () => $('saveButton').click()); $('mobileExportButton').addEventListener('click', () => $('exportButton').click()); $('exploreModeButton').addEventListener('click', () => setWorkflow('explore')); $('performModeButton').addEventListener('click', () => setWorkflow('perform')); $('resetButton').addEventListener('click', resetScene); $('randomButton').addEventListener('click', () => { inject(Math.random(), Math.random(), 1); showToast('Growth nudge injected'); }); $('addCueButton').addEventListener('click', addCue); $('loadScoreButton').addEventListener('click', loadPerformanceScore); $('restoreScoreButton').addEventListener('click', restorePreviousScore); $('playSetButton').addEventListener('click', startSet); $('startAudioButton').addEventListener('click', startAudioPlayback); $('demoAudioButton').addEventListener('click', toggleDemo); $('micButton').addEventListener('click', toggleMic); $('tabAudioButton').addEventListener('click', connectTabAudio); $('stopAudioButton').addEventListener('click', () => { if (!offlineJobActive() && !recordingBlocksSourceChange()) stopAudioSource(); }); $('audioSensitivity').addEventListener('input', event => { audioSensitivity = Number(event.target.value); markDirty(); }); $('pauseButton').addEventListener('click', () => { state.paused = !state.paused; stopFlight(); syncPauseControls(); }); $('muteButton').addEventListener('click', () => { state.muted = !state.muted; if (audio.gain) audio.gain.gain.value = audioOutputGain(); $('muteButton').textContent = state.muted ? 'Unmute' : 'Mute'; }); $('tempoInput').addEventListener('input', (event) => { const previousTempo = state.tempo; if (state.setPlaying && state.currentCue >= 0 && cues[state.currentCue]) { const elapsedBeats = Math.max(0, performance.now() - cueStartedAt) * previousTempo / 60000; cueConsumedBeats += elapsedBeats; cueRemainingBeats = Math.max(0, cueRemainingBeats - elapsedBeats); } state.tempo = Number(event.target.value); if (state.setPlaying && state.currentCue >= 0 && cues[state.currentCue] && advanceCue) { clearTimeout(cueTimer); cueStartedAt = performance.now(); cueRemainingMs = cueRemainingBeats * 60000 / state.tempo; const token = cueRunToken; cueTimer = setTimeout(() => { if (token !== cueRunToken || !state.setPlaying) return; cueRemainingBeats = 0; cueRemainingMs = 0; advanceCue(state.currentCue + 1); }, cueRemainingMs); } announce(); markDirty(); updateSetProgress(); }); $('captureButton').addEventListener('click', captureStill); $('frameExportButton').addEventListener('click', exportFrameManifest); $('frameRenderButton').addEventListener('click', startOfflineRender); $('frameCancelButton').addEventListener('click', cancelOfflineRender); $('frameImportInput').addEventListener('change', (event) => { readFrameManifestFile(event.target.files[0]); event.target.value = ''; }); $('rehearsalReportInput').addEventListener('change', (event) => { readRehearsalReportFile(event.target.files[0]); event.target.value = ''; }); $('recordButton').addEventListener('click', toggleRecord); $('saveButton').addEventListener('click', () => { saveLocal(); showToast('Set saved locally'); }); $('preflightButton').addEventListener('click', runPreflight); $('qualityABButton').addEventListener('click', runQualityABProbe); $('beatResponseButton').addEventListener('click', runBeatResponseCheck); $('setTimingButton').addEventListener('click', runSetTimingProbe); $('rehearsalReportButton').addEventListener('click', exportRehearsalReport); $('clearObservedChecksButton').addEventListener('click', resetObservedChecks); $('exportButton').addEventListener('click', exportSession); $('importInput').addEventListener('change', (event) => { const file = event.target.files[0]; if (!file || file.size > 2 * 1024 * 1024) return showToast('Import must be a JSON file under 2 MB'); const reader = new FileReader(); reader.onload = () => { try { applySession(JSON.parse(reader.result)); } catch (error) { showToast(`Import rejected · ${error.message}`); } }; reader.readAsText(file); event.target.value = ''; }); $('audioFileInput').addEventListener('change', (event) => { loadLocalAudio(event.target.files[0]); event.target.value = ''; }); $('primaryColor').addEventListener('input', (event) => { palette.primary = event.target.value; fillPalette(); markDirty(); }); $('secondaryColor').addEventListener('input', (event) => { palette.secondary = event.target.value; fillPalette(); markDirty(); }); $('accentColor').addEventListener('input', (event) => { palette.accent = event.target.value; fillPalette(); markDirty(); }); $('reducedMotionInput').addEventListener('change', (event) => { state.reducedMotion = event.target.checked; markDirty(); }); $('brightnessInput').addEventListener('input', (event) => { state.brightness = Number(event.target.value) / 100; markDirty(); }); $('qualityInput').addEventListener('change', (event) => { state.quality = normalizeQuality(event.target.value); lastQualityABProbe = null; const pose = flightPose; applyOutputProfile(); flightPose = pose; announce(); markDirty(); }); $('helpButton').addEventListener('click', () => $('helpDialog').showModal()); $('themeButton').addEventListener('click', () => document.body.classList.toggle('high-contrast'));
  canvas.addEventListener('pointerdown', (event) => { if (scene().kind === 'fractal') { canvas.focus?.(); canvas.setPointerCapture(event.pointerId); flightPointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; return; } const rect = canvas.getBoundingClientRect(); canvas.setPointerCapture(event.pointerId); state.gesture = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, active: true, scene: state.sceneIndex }; inject(); }); canvas.addEventListener('pointermove', (event) => { if (scene().kind === 'fractal') { if (flightPointer && event.pointerId === flightPointer.id && event.buttons & 1) { flightPose = turnFlight(flightPose, (event.clientX - flightPointer.x) * .004, (flightPointer.y - event.clientY) * .004); flightPointer.x = event.clientX; flightPointer.y = event.clientY; markDirty(); } return; } if (!(event.buttons & 1)) return; const rect = canvas.getBoundingClientRect(); inject((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, .4); }); window.addEventListener('keydown', (event) => { const editing = event.target.matches?.('input,select,textarea,[contenteditable="true"]') || event.target.isContentEditable; if (editing) return; if (event.code === 'Space' && state.blackout) { event.preventDefault(); state.blackout = false; $('blackoutLabel').hidden = true; syncReadinessStatus(); showToast('Blackout recovered'); return; } if (event.target.matches?.('button') && ['Space', 'Enter'].includes(event.code)) return; if (scene().kind === 'fractal' && !event.shiftKey && !event.ctrlKey && !event.metaKey && ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) { if (!state.paused && !state.blackout && !state.renderingLost) flightKeys.add(event.code); event.preventDefault(); return; } if (event.code === 'Space') { event.preventDefault(); inject(); } if (event.key.toLowerCase() === 'p') $('pauseButton').click(); if (event.key.toLowerCase() === 'b') { state.blackout = !state.blackout; stopFlight(); $('blackoutLabel').hidden = !state.blackout; syncReadinessStatus(); showToast(state.blackout ? 'Blackout engaged' : 'Blackout recovered'); } if (event.key.toLowerCase() === 'r') resetScene(); if (event.shiftKey && event.key === 'ArrowRight') switchScene((state.sceneIndex + 1) % sceneDefs.length); if (event.shiftKey && event.key === 'ArrowLeft') switchScene((state.sceneIndex + sceneDefs.length - 1) % sceneDefs.length); if (/^[1-3]$/.test(event.key)) switchScene(Number(event.key) - 1); });
  window.addEventListener('pagehide', () => { flushLocalSave(); if (offlineFrameJob) offlineFrameJob.cancelled = true; if (audio.recorder) { audio.recorder.onstop = null; audio.recorder.onerror = null; audio.recorder.onabort = null; try { if (audio.recorder.state === 'recording') audio.recorder.stop(); } catch {} finishRecording(false); } stopAudioSource(); });
}

function boot() {
  let saved = null; let savedReportCache = null; try { saved = localStorage.getItem('phosphor-set-v1'); savedReportCache = localStorage.getItem(rehearsalReportCacheKey); } catch { $('storageHint').textContent = 'Browser storage unavailable · Export JSON keeps your work'; }
  resetAcid(); resetTapestry(); resetFeedback(); fillPalette(); renderEffects(); renderScenes(); renderControls(); renderCues(); $('rehearsalNotesInput').value = state.rehearsalNotes; for (const [key, id] of Object.entries(rehearsalCheckIds)) $(id).checked = state.rehearsalChecks[key]; syncObservedChecksReadout(); $('preflightReadout').textContent = 'Capability check not run'; $('preflightTimestamp').textContent = 'Not run'; $('preflightChecklist').innerHTML = ''; $('preflightChecklist').hidden = true; $('rehearsalReportReadout').textContent = 'No report saved'; $('rehearsalReportReadout').setAttribute('aria-label', 'No rehearsal report saved'); $('rehearsalReportImportReadout').textContent = 'No report loaded'; $('rehearsalReportImportReadout').setAttribute('aria-label', 'No rehearsal report loaded'); syncRehearsalReportImportComparison(); syncRehearsalReportImportPass(); syncRecordingMimeReadout(); $('recordingStatus').textContent = recordingOutcomeLabels.idle; syncAudioSourceOutcome(); resetPerformanceReadout(); syncRendererReadout(); announce(); syncPauseControls(); syncBeatReadout(); syncAudioSourceControls(); previousScoreBackup = loadPreviousScoreBackup(); wire(); syncScoreRecovery();
  if (saved) { try { applySession(JSON.parse(saved)); } catch { showToast('Saved session could not be restored; starting clean'); } }
  if (savedReportCache) { try { restoreRehearsalReportCacheWithQuality(JSON.parse(savedReportCache)); } catch {} }
  syncFocusScaleReadout(); requestAnimationFrame(renderFrame);
}

function sanitizeDeviceLabel(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : ''; }
function stagePixelStats() { const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let visible = 0; for (let index = 0; index < data.length; index += 4) if (data[index] > 16 || data[index + 1] > 16 || data[index + 2] > 16) visible += 1; return { width: canvas.width, height: canvas.height, visiblePixels: visible, totalPixels: data.length / 4 }; }
function renderRuntimeState() { return { sceneIndex: state.sceneIndex, paused: state.paused, blackout: state.blackout, renderingLost: state.renderingLost, elapsed: state.elapsed, cadenceAccumulator: state.cadenceAccumulator, currentCue: state.currentCue, setPlaying: state.setPlaying, audioLevel: state.audioLevel, renderer: currentRendererEvidence(), phaseSeed: buffers.phase.seed, phaseValues: Array.from(buffers.phase.values), phaseCompare: Array.from(buffers.phase.compare), topologyPhase: buffers.topology.phase, topologyIntersections: buffers.topology.intersections }; }
function setTestRenderFlags(flags = {}) { if (Object.hasOwn(flags, 'blackout')) state.blackout = Boolean(flags.blackout); if (Object.hasOwn(flags, 'renderingLost')) state.renderingLost = Boolean(flags.renderingLost); }

window.__phosphorTest = { stepFlight, stopFlight, flightState: () => ({ pose: structuredClone(flightPose), cruise: flightCruise, blocked: flightBlocked, keys: [...flightKeys] }), sceneDefs, performanceScoreCues, PHOSPHOR_FAMILY_CATALOG, audioBandLevels, audioResponseLevel, darkTechnoStep, visualAudioCoverage, visualBeatResponseSnapshot, beatDrivenEffects, applyBeatVisualPulse, runBeatResponseCheck, sanitizeBeatResponseCheck, setCueLabel, setCueDuration, moveCue, previewCue, duplicateCue, clearRehearsalReportImport, stepElementary, reactionDiffusionStep, finiteArray, boundedFeedbackValue, lifecycleStressCheck, qualityProfile, cathedralShading, aquariumFoodStep, evolutionContour, runLifecycleProbe, runQualityABProbe, runSetTimingProbe, sanitizeQualityAB, sessionData, validateSession, applySession, switchScene, stepPhase, phaseMeasurement, startPhaseArc, stopPhaseArc, rehearsePhaseArcs, archivePhaseMeasurement, frameManifest, validateFrameManifest, importFrameManifest, frameDirectoryWriter, renderOfflineFrames, cancelOfflineRender, mutateEvolution, chooseEvolutionChild, promoteEvolution, inject, stepMagnetic, stopMagneticReplay, replayGestureSequence, magneticReplayState: () => ({ index: buffers.magnetic.replay.index, total: buffers.magnetic.replay.events.length, playing: buffers.magnetic.replay.playing }), evolutionRenderState: () => ({ phase: buffers.evolution.phase, siblings: Array.from(buffers.evolution.siblings) }), magneticRenderState: () => ({ phase: buffers.magnetic.phase, particles: Array.from(buffers.magnetic.particles), previous: Array.from(buffers.magnetic.previous), attractors: Array.from(buffers.magnetic.attractors) }), interferenceRenderState: () => ({ phase: buffers.interference.phase }), beatTelemetry, resetBeatTelemetry, recordBeatOnset: recordAudioBeatOnset, stagePixelStats, renderRuntimeState, restoreOfflineSnapshot, setTestRenderFlags, setTestElapsed: (value) => { state.elapsed = Math.max(0, Number(value) || 0); }, setTestAudioLevel: (value) => { state.audioLevel = Math.max(0, Number(value) || 0); }, setTestAudioPeak: (value, hold = value, record = false, elapsedSeconds = 0) => { state.audioPeak = clamp(Number(value) || 0, 0, 1); state.audioPeakHold = clamp(Number(hold) || 0, 0, 1); if (record) recordAudioPeakSample(state.audioPeak, state.audioPeakHold, elapsedSeconds); syncAudioHeadroomReadout(); }, recordAudioPeakSample, audioPeakSessionTelemetry, rehearsalPassSummary, setTestAudioBands: (value) => { state.audioBands = { low: clamp(Number(value?.low), 0, 1), mid: clamp(Number(value?.mid), 0, 1), high: clamp(Number(value?.high), 0, 1) }; state.audioBandsReady = true; }, setTestBeatPulse: (value, step = 0) => { const safeStep = normalizedBeatIndex(step); state.beatPulse = clamp(Number(value) || 0, 0, 1); state.beatStep = ((safeStep % DARK_TECHNO_PATTERN.length) + DARK_TECHNO_PATTERN.length) % DARK_TECHNO_PATTERN.length; state.beatBar = Math.floor(Math.max(0, safeStep) / DARK_TECHNO_PATTERN.length); syncBeatReadout(); } };
Object.assign(window.__phosphorTest, { drawPreview, stepAcid, resetAcid, acidRenderState: () => ({ u: Array.from(buffers.acid.u), v: Array.from(buffers.acid.v) }), pendingFramePlan: () => pendingFrameManifest, toggleRecord, finishRecording, syncRecordingReadout, updatePerformanceReadout, syncSetPerformanceReadout, syncSetPerformanceDetail, performanceSetSummary: () => metrics.setSummary(), syncFocusScaleReadout, syncFocusRenderFit, rehearsalReport, exportRehearsalReport, validateRehearsalReport, compareRehearsalReports, importRehearsalReport, readRehearsalReportFile, rehearsalReportImport: () => structuredClone(importedRehearsalReport), restoreRehearsalReportCache: restoreRehearsalReportCacheWithQuality, resetObservedChecks, recordingState: () => ({ recorder: audio.recorder, chunks: audio.chunks.length, stream: audio.recordingStream, startedAt: audio.recordingStartedAt }), stepAndDraw, updateAudioLevel, stopAudioSource, toggleDemo, loadLocalAudio, toggleMic, connectTabAudio, preflightReport, runPreflight, assetStem, exportFilename, audioState: () => ({ request: audioRequest, hasSource: Boolean(audio.source), hasDemo: state.demoOn, demoStep: audio.demoStep, demoBar: audio.demoBar, hasDemoCompressor: Boolean(audio.demoCompressor), hasMic: Boolean(audio.micStream), hasTab: Boolean(audio.tabStream), sourceOutcome: audioSourceOutcome, sourceHistory: structuredClone(audioSourceEvents), outputGain: audio.gain?.gain.value, bands: structuredClone(state.audioBands), bandsReady: state.audioBandsReady, peak: audioPeakTelemetry(), peakSession: audioPeakSessionTelemetry(), beatPulse: state.beatPulse, beat: beatTelemetry() }) });
window.__phosphorTest.renderOfflineFrames = renderOfflineFramesWithNamedAssets;
window.__phosphorTest.qualityABRecommendation = qualityABRecommendation;
window.__phosphorTest.compositeOutputFrame = compositeOutputFrame;
window.__phosphorTest.renderFrame = renderFrame;
window.__phosphorMetrics = metrics;
window.__phosphorTest.restoreRehearsalReportCache = restoreRehearsalReportCacheWithQuality;
boot();
