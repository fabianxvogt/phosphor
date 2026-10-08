export const DEFAULT_PALETTE = {
  primary: "#d5ff5f",
  secondary: "#5364ff",
  accent: "#ff5bc8",
};
const record = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const finite = (x, min, max, label) => {
  if (typeof x !== "number" || !Number.isFinite(x) || x < min || x > max)
    throw new Error(`${label} must be ${min}–${max}`);
  return x;
};
const text = (x, label, max = 80) => {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error(`${label} must be 1–${max} characters`);
  return x;
};
export function presetSnapshot(scene, index = 0) {
  const p = scene.presets[index];
  return {
    scene: scene.id,
    preset: p.name,
    seed: p.seed,
    params: { ...p.params },
    palette: { ...DEFAULT_PALETTE },
  };
}
export function initialSession(scenes) {
  return {
    format: "phosphor-set-v2",
    version: 2,
    name: "Living systems / opening set",
    tempo: 92,
    active: presetSnapshot(scenes[0]),
    cues: scenes.map((s, i) => {
      const chosen =
        { cathedral: 2, tapestry: 2, feedback: 4, melt: 1, phase: 3 }[s.id] ||
        0;
      return {
        id: `cue-${i}`,
        name: s.name,
        snapshot: presetSnapshot(s, chosen),
        bars: 64,
        transition: 4,
        keyframes: [],
        energy: [0.35, 0.45, 0.8, 0.3, 0.6, 0.65, 0.5, 0.7, 0.85, 0.25][i] ?? 0.5,
      };
    }),
    mappings: scenes.flatMap((s) => {
      const target = s.schema.find(
        (p) =>
          ["speed", "motion", "injection", "flow", "sway"].includes(p.key) &&
          p.step < 1,
      );
      return target
        ? [{ scene: s.id, source: "energy", target: target.key, depth: 0.08 }]
        : [];
    }),
    midi: [],
    options: {
      quality: "balanced",
      brightness: 0.92,
      reducedMotion: false,
      bloom: 0.15,
      kaleido: 1,
      autoQuality: true,
      autoRecovery: true,
      flashLimit: true,
      echo: 0,
      chroma: 0,
    },
    lineages: [],
  };
}
export function validateSnapshot(value, scenes) {
  if (!record(value)) throw new Error("Scene snapshot missing");
  const scene = scenes.find((s) => s.id === value.scene);
  if (!scene) throw new Error("Unknown scene");
  text(value.preset, "Preset");
  finite(value.seed, 0, 2147483647, "Seed");
  if (!Number.isInteger(value.seed)) throw new Error("Seed must be an integer");
  if (!record(value.params)) throw new Error("Parameters missing");
  const params = {};
  for (const def of scene.schema) {
    const v = finite(
      value.params[def.key],
      def.min,
      def.max,
      `${scene.id}.${def.key}`,
    );
    if (def.step === 1 && !Number.isInteger(v))
      throw new Error(`${def.key} must be an integer`);
    params[def.key] = v;
  }
  if (!record(value.palette)) throw new Error("Palette missing");
  const palette = {};
  for (const key of Object.keys(DEFAULT_PALETTE)) {
    if (
      typeof value.palette[key] !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(value.palette[key])
    )
      throw new Error("Invalid palette colour");
    palette[key] = value.palette[key];
  }
  return {
    scene: scene.id,
    preset: value.preset,
    seed: value.seed,
    params,
    palette,
  };
}
export function validateSession(value, scenes) {
  if (
    !record(value) ||
    value.format !== "phosphor-set-v2" ||
    value.version !== 2
  )
    throw new Error("Expected a Phosphor v2 set");
  const name = text(value.name, "Set name");
  const tempo = finite(value.tempo, 40, 200, "Tempo");
  const active = validateSnapshot(value.active, scenes);
  if (
    !Array.isArray(value.cues) ||
    value.cues.length < 1 ||
    value.cues.length > 256
  )
    throw new Error("A set needs 1–256 cues");
  const ids = new Set();
  const cues = value.cues.map((c) => {
    if (!record(c)) throw new Error("Invalid cue");
    const id = text(c.id, "Cue id");
    if (ids.has(id)) throw new Error("Duplicate cue id");
    ids.add(id);
    const bars = finite(c.bars, 1, 256, "Cue bars");
    if (!Number.isInteger(bars)) throw new Error("Cue bars must be an integer");
    const transition = finite(c.transition, 0, 32, "Transition beats");
    if (!Array.isArray(c.keyframes) || c.keyframes.length > 32)
      throw new Error("Cue supports up to 32 keyframes");
    const keyframes = c.keyframes
      .map((k) => ({
        beat: finite(k.beat, 0, bars * 4, "Keyframe beat"),
        snapshot: validateSnapshot(k.snapshot, scenes),
      }))
      .sort((a, b) => a.beat - b.beat);
    if (
      keyframes.some((k) => k.snapshot.scene !== c.snapshot.scene) ||
      keyframes.some((k, i) => i && k.beat === keyframes[i - 1].beat)
    )
      throw new Error("Keyframes must use cue scene and unique beats");
    return {
      id,
      name: text(c.name, "Cue name"),
      snapshot: validateSnapshot(c.snapshot, scenes),
      bars,
      transition,
      energy: finite(c.energy ?? 0.5, 0, 1, "Cue energy"),
      keyframes,
    };
  });
  if (!Array.isArray(value.mappings) || value.mappings.length > 64)
    throw new Error("Too many mappings");
  const mappings = value.mappings.map((m) => {
    const scene = scenes.find((s) => s.id === m.scene);
    if (
      !scene ||
      !scene.schema.some((d) => d.key === m.target) ||
      !["energy", "bass", "mid", "high", "onset"].includes(m.source)
    )
      throw new Error("Unknown modulation route");
    return {
      scene: m.scene,
      source: m.source,
      target: m.target,
      depth: finite(m.depth, -1, 1, "Modulation depth"),
    };
  });
  if (
    !record(value.options) ||
    !["high", "balanced", "low"].includes(value.options.quality)
  )
    throw new Error("Invalid render quality");
  if (
    value.options.flashLimit !== undefined &&
    typeof value.options.flashLimit !== "boolean"
  )
    throw new Error("Flash limiter must be a boolean");
  const options = {
    quality: value.options.quality,
    brightness: finite(value.options.brightness, 0, 1, "Brightness"),
    bloom: finite(value.options.bloom, 0, 1, "Bloom"),
    kaleido: finite(value.options.kaleido, 1, 12, "Kaleidoscope"),
    reducedMotion: value.options.reducedMotion === true,
    autoQuality: value.options.autoQuality === true,
    autoRecovery: value.options.autoRecovery === true,
    flashLimit:
      value.options.flashLimit === undefined ? true : value.options.flashLimit,
    echo: finite(
      value.options.echo === undefined ? 0 : value.options.echo,
      0,
      1,
      "Echo",
    ),
    chroma: finite(
      value.options.chroma === undefined ? 0 : value.options.chroma,
      0,
      1,
      "Chroma",
    ),
  };
  if (!Array.isArray(value.midi) || value.midi.length > 64)
    throw new Error("Invalid MIDI mappings");
  const midi = value.midi.map((m) => {
    if (
      !["cc", "note"].includes(m.type) ||
      ![
        "brightness",
        "crossfade",
        "go",
        "blackout",
        "tempo",
        ...activeSceneTargets(scenes),
      ].includes(m.target)
    )
      throw new Error("Invalid MIDI target");
    if (!Number.isInteger(m.channel) || !Number.isInteger(m.number))
      throw new Error("MIDI channel and number must be integers");
    return {
      type: m.type,
      channel: finite(m.channel, 0, 15, "MIDI channel"),
      number: finite(m.number, 0, 127, "MIDI number"),
      target: m.target,
    };
  });
  const lineages = validateLineages(value.lineages, scenes);
  return {
    format: value.format,
    version: 2,
    name,
    tempo,
    active,
    cues,
    mappings,
    midi,
    options,
    lineages,
  };
}
// Breeding lineages are shared by v2 and v3 sets.
export function validateLineages(list, scenes) {
  if (!Array.isArray(list) || list.length > 20)
    throw new Error("Too many lineages");
  return list.map((l) => {
    if (
      !record(l) ||
      !Array.isArray(l.nodes) ||
      l.nodes.length < 1 ||
      l.nodes.length > 128
    )
      throw new Error("Invalid lineage");
    const nodes = l.nodes.map((n) => {
      text(n.id, "Lineage node id");
      if (n.parentId !== null) text(n.parentId, "Lineage parent id");
      const snapshot = validateSnapshot(
        {
          scene: n.scene,
          preset: n.name,
          seed: n.seed,
          params: n.params,
          palette: DEFAULT_PALETTE,
        },
        scenes,
      );
      return {
        id: n.id,
        parentId: n.parentId,
        name: snapshot.preset,
        scene: snapshot.scene,
        seed: snapshot.seed,
        params: snapshot.params,
      };
    });
    const ids = new Set(nodes.map((n) => n.id));
    if (ids.size !== nodes.length || !ids.has(l.selectedId))
      throw new Error("Invalid lineage selection");
    for (const n of nodes) {
      if (
        typeof n.id !== "string" ||
        (n.parentId !== null && !ids.has(n.parentId))
      )
        throw new Error("Invalid ancestry");
      const seen = new Set();
      let cur = n;
      while (cur?.parentId !== null) {
        if (seen.has(cur.id)) throw new Error("Cyclic ancestry");
        seen.add(cur.id);
        cur = nodes.find((p) => p.id === cur.parentId);
      }
    }
    return { nodes, selectedId: l.selectedId };
  });
}
function activeSceneTargets(scenes) {
  return scenes.flatMap((s) => s.schema.map((d) => `${s.id}.${d.key}`));
}
export function interpolateSnapshot(a, b, t) {
  t = Number.isNaN(t) || t === -Infinity ? 0 : Math.max(0, Math.min(1, t));
  if (a.scene !== b.scene) return t < 1 ? a : b;
  const result = structuredClone(a);
  for (const key of Object.keys(a.params))
    result.params[key] = a.params[key] + (b.params[key] - a.params[key]) * t;
  for (const key of Object.keys(a.palette)) {
    const colour = (hex) =>
      hex
        .slice(1)
        .match(/../g)
        .map((x) => parseInt(x, 16));
    result.palette[key] =
      "#" +
      colour(a.palette[key])
        .map((v, i) =>
          Math.round(v + (colour(b.palette[key])[i] - v) * t)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
  }
  return result;
}

// Data migration only: the old unstable renderer's trajectory is not reproducible
// in the corrected GPU models. Original v1 storage is retained as a backup.
export function migrateLegacy(value, scenes) {
  if (
    !record(value) ||
    value.format !== "phosphor-set-v1" ||
    value.version !== 1
  )
    throw new Error("Expected a Phosphor v1 set");
  if (value.presetIndex?.length === 14) return migrateB(value, scenes);
  const ids = ["acid", "tapestry", "feedback"];
  const base = initialSession(scenes);
  if (
    !Number.isInteger(value.activeScene) ||
    !ids[value.activeScene] ||
    !Array.isArray(value.presetIndex) ||
    value.presetIndex.length !== 3 ||
    !record(value.params) ||
    !Array.isArray(value.cues) ||
    value.cues.length < 1 ||
    value.cues.length > 64
  )
    throw new Error("Malformed legacy scene or cue list");
  const bounds = {
    acid: {
      growth: [0, 1],
      injection: [0, 1],
      diffusion: [0.2, 1.4],
      contrast: [0.5, 2],
      drift: [0, 1],
    },
    tapestry: {
      rule: [0, 255],
      scroll: [0, 1],
      weave: [0, 1],
      reversal: [0, 1],
      phrase: [2, 16],
    },
    feedback: {
      decay: [0.72, 0.99],
      transform: [-0.06, 0.06],
      symmetry: [1, 6],
      injection: [0, 1],
      tunnel: [0, 1],
    },
  };
  for (const id of ids)
    for (const [key, range] of Object.entries(bounds[id]))
      finite(value.params[id]?.[key], ...range, `${id}.${key}`);
  const snapshot = (index, presetIndex) => {
    const scene = scenes.find((s) => s.id === ids[index]);
    if (
      !scene ||
      !Number.isInteger(presetIndex) ||
      presetIndex < 0 ||
      presetIndex >= scene.presets.length
    )
      throw new Error("Unknown legacy preset");
    const result = presetSnapshot(scene, presetIndex);
    const old = value.params[scene.id];
    let updates;
    if (scene.id === "acid")
      updates = {
        feed: 0.018 + old.growth * 0.026,
        kill: 0.045 + (1 - old.growth) * 0.02,
        speed: 0.25 + old.growth * 0.75,
        diffusion: old.diffusion,
        injection: old.injection,
        contrast: old.contrast,
      };
    else if (scene.id === "tapestry")
      updates = {
        rule: old.rule === 90 ? result.params.rule : old.rule,
        scroll: old.scroll * 60,
        weave: old.weave,
        playback: old.reversal > 0.5 ? -1 : 1,
        phrase: Math.round(old.phrase * 4),
      };
    else
      updates = {
        persistence: old.decay,
        zoom: old.transform * 4,
        rotation: old.transform * 12,
        symmetry: old.symmetry,
        injection: old.injection,
        aperture: 0.12 + old.tunnel * 0.78,
      };
    for (const field of scene.schema)
      if (updates[field.key] !== undefined) {
        let v = Math.min(field.max, Math.max(field.min, updates[field.key]));
        if (field.step === 1) v = Math.round(v);
        result.params[field.key] = v;
      }
    if (value.palette) result.palette = { ...value.palette };
    return result;
  };
  base.name = "Migrated v1 performance";
  base.tempo = value.tempo;
  base.active = snapshot(
    value.activeScene,
    value.presetIndex[value.activeScene],
  );
  base.cues = value.cues.map((cue, index) => ({
    id: `legacy-${index}`,
    name: cue.label,
    snapshot: snapshot(cue.scene, cue.preset),
    bars: cue.duration,
    transition: 4,
    keyframes: [],
  }));
  base.options.reducedMotion = value.options?.reducedMotion === true;
  base.options.brightness = value.options?.brightness ?? 0.92;
  base.options.quality = value.options?.quality === "720" ? "low" : "balanced";
  return validateSession(base, scenes);
}

// Covers the bounded cue/keyframe/lineage schema, including pretty-printed exports.
export async function readSetFile(file, scenes) {
  if (!file || file.size > 32 * 1024 * 1024)
    throw new Error("Import a JSON set up to 32 MB");
  const parsed = JSON.parse(await file.text());
  return parsed?.format === "phosphor-set-v1"
    ? migrateLegacy(parsed, scenes)
    : validateSession(parsed, scenes);
}

export const B_FAMILIES = [
  "acid",
  "tapestry",
  "feedback",
  "magnetic",
  "cathedrals",
  "aquarium",
  "interference",
  "topology",
  "phase",
  "evolution",
  "julia",
  "fourspace",
  "hyperbolic",
  "fractal",
];
const bShared = { cathedrals: "cathedral", topology: "melt" };
const bBounds = {
  acid: {
    growth: [0, 1],
    injection: [0, 1],
    diffusion: [0.2, 1.4],
    contrast: [0.5, 2],
    drift: [0, 1],
  },
  tapestry: {
    rule: [0, 255],
    scroll: [0, 1],
    weave: [0, 1],
    reversal: [0, 1],
    phrase: [2, 16],
  },
  feedback: {
    decay: [0.72, 0.99],
    transform: [-0.06, 0.06],
    symmetry: [1, 6],
    injection: [0, 1],
    tunnel: [0, 1],
  },
  magnetic: {
    attractorX: [0, 1],
    attractorY: [0, 1],
    attractor: [0, 1],
    trail: [0.72, 0.98],
    density: [0.2, 1],
    motion: [0.1, 1],
    split: [0, 1],
  },
  cathedrals: {
    family: [0, 3],
    journey: [0, 2],
    recursion: [1, 6],
    scale: [0.55, 1.2],
    color: [0, 1],
    traversal: [0, 1],
    stationary: [0, 1],
    lighting: [0, 1],
    material: [0, 1],
    fog: [0, 1],
    emission: [0, 1],
  },
  aquarium: {
    population: [0.1, 1],
    feeding: [0, 1],
    trails: [0.5, 0.98],
    habitat: [0, 2],
    bloom: [0, 1],
    food: [0, 1],
    extinction: [0, 1],
  },
  interference: {
    fieldA: [0, 1],
    fieldB: [0, 1],
    fieldC: [0, 1],
    frequency: [0.2, 4],
    ratio: [0.25, 2],
    phase: [0, 1],
    orientation: [0, 1],
    filter: [0.2, 1],
    tempoLock: [0, 1],
  },
  topology: {
    family: [0, 3],
    loop: [0.2, 1],
    thickness: [0.1, 1],
    twist: [0, 1],
    camera: [0, 1],
    material: [0, 1],
    keyframe: [0, 1],
  },
  phase: {
    arc: [0, 2],
    regime: [0, 5],
    compare: [0, 1],
    control: [0, 1],
    coupling: [0, 1],
    disturbance: [0, 1],
    release: [0, 1],
    tempo: [0.2, 1],
  },
  evolution: {
    mutation: [0, 1],
    lock: [0, 1],
    lockField: [0, 3],
    generation: [0, 8],
    lineage: [0, 1],
    focus: [0, 1],
  },
};
function bSnapshot(value, index, preset, scenes, cue) {
  // Only the ten shared families translate. The v6 fractal families now
  // exist as new GPU scenes with different models; their cues are dropped
  // and reported, never mapped by name.
  if (index >= 10) return null;
  const id = B_FAMILIES[index];
  const scene = scenes.find((s) => s.id === (bShared[id] || id));
  if (!scene) return null;
  const limits = id === "tapestry" ? 8 : 6;
  if (!Number.isInteger(preset) || preset < 0 || preset >= limits)
    throw new Error("Unknown B preset");
  const snapshot = presetSnapshot(
    scene,
    Math.min(preset, scene.presets.length - 1),
  );
  const old = cue
    ? (cue.sceneParamsSnapshot ??
      (id === "evolution" ? cue.paramsSnapshot : undefined))
    : value.params[id];
  // Snapshot-less cues play their own preset, not the export-time live look.
  if (!cue || old !== undefined) {
    if (!record(old)) throw new Error(`B parameters missing for ${id}`);
    for (const [key, bounds] of Object.entries(bBounds[id]))
      finite(old[key], ...bounds, `${id}.${key}`);
    let updates;
    switch (id) {
      case "acid":
        updates = {
          feed: 0.018 + old.growth * 0.026,
          kill: 0.045 + (1 - old.growth) * 0.02,
          speed: 0.25 + old.growth * 0.75,
          diffusion: old.diffusion,
          injection: old.injection,
          contrast: old.contrast,
        };
        break;
      case "tapestry":
        updates = {
          rule: old.rule,
          scroll: old.scroll * 60,
          weave: old.weave,
          playback: old.reversal > 0.5 ? -1 : 1,
          phrase: Math.round(old.phrase * 4),
        };
        break;
      case "feedback":
        updates = {
          persistence: old.decay,
          zoom: old.transform * 4,
          rotation: old.transform * 12,
          symmetry: old.symmetry,
          injection: old.injection,
          aperture: 0.12 + old.tunnel * 0.78,
        };
        break;
      case "magnetic":
        updates = {
          flow: old.split > 0.65 ? 1 : old.trail > 0.9 ? 2 : 0,
          motion: old.motion * 2,
          density: old.density,
          trails: 0.2 + ((old.trail - 0.72) / 0.26) * 2.8,
          radius: 0.12 + old.attractor * 0.26,
          curl: old.attractor * 1.4,
          separation: 0.14 + old.split * 0.5,
          weave: old.split,
        };
        break;
      case "cathedrals":
        updates = {
          geometry: old.family,
          journey: old.journey,
          recursion: old.recursion,
          scale: old.scale,
          speed: old.stationary > 0.5 ? 0 : old.traversal * 1.5,
          material: Math.round(old.material * 5),
          glow: 0.1 + old.emission * 1.4,
        };
        break;
      case "aquarium":
        updates = {
          population: Math.round(old.population * 12),
          dynamics: (1 - old.extinction) * 1.6,
          feeding: old.feeding,
          habitat: old.habitat,
          form: old.bloom,
          flow: old.food * 1.5,
          trails: old.trails,
        };
        break;
      case "interference":
        updates = {
          composition: preset % 6,
          fields: Math.max(
            1,
            [old.fieldA, old.fieldB, old.fieldC].filter((v) => v > 0.25).length,
          ),
          ratio: old.ratio,
          phase: old.phase,
          orientation: old.orientation * 180,
          palette: old.phase,
          motion: old.frequency / 4,
          beatLock: old.tempoLock,
        };
        break;
      case "topology":
        updates = {
          family: [3, 0, 1, 2][Math.round(old.family)],
          thickness: 0.018 + old.thickness * 0.122,
          duration: 4 + (1 - old.loop) * 86,
          phase: old.keyframe,
          yaw: old.camera * 360 - 180,
          material: Math.round(old.material * 5),
          motion: old.twist,
        };
        break;
      case "phase":
        updates = {
          coupling: old.coupling * 6,
          noise: old.disturbance,
          speed: old.tempo * 3,
          disturbance: old.disturbance * 2,
          detuning: (1 - old.release) * 2,
          winding: old.regime,
          coherence: old.control,
          arc: old.arc + 1,
        };
        break;
      case "evolution":
        updates = {
          feed: 0.025 + old.mutation * 0.023,
          prune: 0.051 + old.lineage * 0.014,
          spread: 0.35 + old.focus * 0.3,
          planting: 3 + old.generation,
          petals: old.mutation,
          sway: old.focus,
          glow: 0.35 + old.lineage * 1.3,
          growth: 0.2 + old.mutation * 1.3,
        };
        break;
    }
    for (const field of scene.schema) {
      if (updates[field.key] === undefined) continue;
      let next = Math.max(field.min, Math.min(field.max, updates[field.key]));
      if (field.step === 1) next = Math.round(next);
      snapshot.params[field.key] = next;
    }
  }
  snapshot.palette = {
    ...(cue?.paletteSnapshot ||
      value.scenePalettes?.[id] ||
      value.palette ||
      DEFAULT_PALETTE),
  };
  return validateSnapshot(snapshot, scenes);
}
function migrateB(value, scenes) {
  if (
    !Number.isInteger(value.activeScene) ||
    !B_FAMILIES[value.activeScene] ||
    !record(value.params) ||
    !Array.isArray(value.cues) ||
    value.cues.length < 1 ||
    value.cues.length > 64
  )
    throw new Error("Malformed B scene or cue list");
  const base = initialSession(scenes);
  base.name = value.name || "Migrated B performance";
  base.tempo = value.tempo;
  base.cues = [];
  value.cues.forEach((cue, index) => {
    if (!record(cue) || !Number.isInteger(cue.scene) || !B_FAMILIES[cue.scene])
      throw new Error("Unknown B cue family");
    const snapshot = bSnapshot(value, cue.scene, cue.preset, scenes, cue);
    if (!snapshot) return;
    base.cues.push({
      id: `legacy-${index}`,
      name: cue.label || "Unnamed cue",
      snapshot,
      bars: cue.duration,
      transition: 4,
      keyframes: [],
      energy: 0.5,
    });
  });
  if (!base.cues.length)
    throw new Error("B set has no cues in the ten supported families");
  base.active =
    bSnapshot(
      value,
      value.activeScene,
      value.presetIndex[value.activeScene],
      scenes,
    ) || base.cues[0].snapshot;
  base.options.reducedMotion = value.options?.reducedMotion === true;
  base.options.brightness = value.options?.brightness ?? 0.92;
  const qualityTiers = { native: "high", 1080: "balanced", 720: "low" };
  base.options.quality = Object.hasOwn(qualityTiers, value.options?.quality)
    ? qualityTiers[value.options.quality]
    : "balanced";
  const effects = value.options?.effects;
  if (effects) {
    base.options.echo = effects.echo;
    base.options.chroma = effects.chroma;
    base.options.bloom = effects.glow;
    base.options.kaleido = 1 + Math.round(effects.symmetry * 11);
  }
  return validateSession(base, scenes);
}
export function importReport(value) {
  if (value?.format !== "phosphor-set-v1") return [];
  const report = [
    "v1 parameters translated to corrected GPU models; visuals are not identical. Original JSON retained in recovery backup.",
  ];
  if (value.presetIndex?.length === 14) {
    for (let i = 0; i < value.cues.length; i++) {
      const cue = value.cues[i];
      if (cue.scene >= 10)
        report.push(
          `Dropped cue ${i + 1}: ${cue.label || "Unnamed cue"} (${B_FAMILIES[cue.scene]}).`,
        );
    }
    if (value.activeScene >= 10)
      report.push(
        "Unsupported active family replaced by the first supported cue.",
      );
    report.push(
      "Global effects translated; per-cue effect automation, flight poses and model-specific provenance remain in the backup, not in v2.",
    );
  }
  return report;
}
