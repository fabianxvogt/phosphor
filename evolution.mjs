// Schema-generic, immutable breeding. No renderer or scene registry dependency.
// Strength is the maximum mutation distance as a fraction of a parameter's range.
const MAX_NODES = 128;
const SEED_MAX = 0x7fffffff;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function seedValue(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > SEED_MAX)
    throw new RangeError("Breeding seed must be an integer in 0–2147483647.");
  return value;
}

function randomSource(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sceneSchema(scene) {
  if (
    !scene ||
    typeof scene.id !== "string" ||
    !scene.id ||
    !Array.isArray(scene.schema) ||
    !scene.schema.length
  ) {
    throw new TypeError(
      "Breeding requires a scene with an id and parameter schema.",
    );
  }
  const keys = new Set();
  for (const field of scene.schema) {
    if (
      !field ||
      typeof field.key !== "string" ||
      !field.key ||
      keys.has(field.key) ||
      !Number.isFinite(field.min) ||
      !Number.isFinite(field.max) ||
      field.max < field.min ||
      !Number.isFinite(field.step) ||
      field.step <= 0 ||
      !Number.isFinite(field.default) ||
      field.default < field.min ||
      field.default > field.max
    ) {
      throw new TypeError(
        `Invalid breeding parameter schema for scene "${scene.id}".`,
      );
    }
    keys.add(field.key);
  }
  return scene.schema;
}

function lockedKeys(locked, schema) {
  let keys;
  if (locked === undefined) keys = [];
  else if (Array.isArray(locked) || locked instanceof Set) keys = [...locked];
  else if (locked && typeof locked === "object") {
    if (Object.values(locked).some((value) => typeof value !== "boolean")) {
      throw new TypeError(
        "Parameter locks must be a key array, Set, or boolean key map.",
      );
    }
    // Validate even disabled map entries so misspelled controls cannot silently fail.
    const available = new Set(schema.map((field) => field.key));
    for (const key of Object.keys(locked)) {
      if (!available.has(key))
        throw new RangeError(`Unknown locked parameter "${key}".`);
    }
    keys = Object.keys(locked).filter((key) => locked[key]);
  } else
    throw new TypeError(
      "Parameter locks must be a key array, Set, or boolean key map.",
    );
  const available = new Set(schema.map((field) => field.key));
  for (const key of keys) {
    if (!available.has(key))
      throw new RangeError(`Unknown locked parameter "${String(key)}".`);
  }
  return new Set(keys);
}

function boundedParams(schema, preset, locks = new Set()) {
  if (
    !preset ||
    typeof preset !== "object" ||
    !preset.params ||
    typeof preset.params !== "object" ||
    Array.isArray(preset.params)
  ) {
    throw new TypeError("A parent preset must contain a parameter object.");
  }
  const params = {};
  for (const field of schema) {
    const present = own(preset.params, field.key);
    if (!present && locks.has(field.key))
      throw new RangeError(
        `Locked parameter "${field.key}" is missing from its parent.`,
      );
    const value = present ? preset.params[field.key] : field.default;
    if (!Number.isFinite(value) || value < field.min || value > field.max) {
      throw new RangeError(
        `Parent parameter "${field.key}" must be finite and within [${field.min}, ${field.max}].`,
      );
    }
    // In particular, never quantize a locked value, even if it is off the step grid.
    Object.defineProperty(params, field.key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return params;
}

/** Return a complete bounded preset; identical inputs produce identical mutations.
 * Missing unlocked parent parameters use scene defaults. Invalid/out-of-range values
 * throw instead of silently changing an imported parent or violating a lock.
 */
export function mutatePreset(
  scene,
  parentPreset,
  { seed = parentPreset?.seed ?? 1, strength = 0.15, locked } = {},
) {
  const schema = sceneSchema(scene);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError("Mutation strength must be between 0 and 1.");
  }
  const locks = lockedKeys(locked, schema);
  const params = boundedParams(schema, parentPreset, locks);
  const nextSeed = seedValue(seed);
  const random = randomSource(nextSeed);
  for (const field of schema) {
    // Draw for every field, keeping unlocked mutations stable when locks change.
    const offset = random() - random();
    if (locks.has(field.key) || strength === 0 || field.max === field.min)
      continue;
    const radius = strength * (field.max - field.min);
    const lower = Math.max(field.min, params[field.key] - radius);
    const upper = Math.min(field.max, params[field.key] + radius);
    const firstStep = Math.ceil((lower - field.min) / field.step);
    const lastStep = Math.floor((upper - field.min) / field.step);
    // Small strengths may contain no legal step; retaining the parent is honest.
    if (firstStep > lastStep) continue;
    const candidate = clamp(params[field.key] + offset * radius, lower, upper);
    const stepIndex = clamp(
      Math.round((candidate - field.min) / field.step),
      firstStep,
      lastStep,
    );
    const stepped = field.min + stepIndex * field.step;
    params[field.key] = Number(stepped.toPrecision(14));
  }
  return {
    name: `${scene.name || scene.id} ${nextSeed.toString(36).toUpperCase()}`,
    seed: nextSeed,
    params,
  };
}

function cloneLineage(lineage) {
  if (!lineage || !Array.isArray(lineage.nodes) || !lineage.nodes.length) {
    throw new TypeError("A lineage must contain at least one node.");
  }
  if (lineage.nodes.length > MAX_NODES)
    throw new RangeError(
      `A lineage cannot contain more than ${MAX_NODES} nodes.`,
    );
  const ids = new Set();
  const nodes = lineage.nodes.map((node) => {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id ||
      ids.has(node.id) ||
      (node.parentId !== null && typeof node.parentId !== "string") ||
      typeof node.name !== "string" ||
      typeof node.scene !== "string" ||
      !node.scene ||
      !Number.isInteger(node.seed) ||
      node.seed < 0 ||
      node.seed > SEED_MAX ||
      !node.params ||
      typeof node.params !== "object" ||
      Array.isArray(node.params) ||
      Object.values(node.params).some((value) => !Number.isFinite(value))
    ) {
      throw new TypeError(
        "Lineage nodes need unique ids, valid ancestry, names, scene ids, integer seeds, and finite parameters.",
      );
    }
    ids.add(node.id);
    return {
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      scene: node.scene,
      seed: node.seed,
      params: { ...node.params },
    };
  });
  if (!ids.has(lineage.selectedId))
    throw new RangeError("The selected lineage node does not exist.");
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const visited = new Set([node.id]);
    let parentId = node.parentId;
    while (parentId !== null) {
      if (!ids.has(parentId))
        throw new RangeError(`Lineage parent "${parentId}" does not exist.`);
      if (visited.has(parentId))
        throw new RangeError("Lineage ancestry cannot contain a cycle.");
      visited.add(parentId);
      parentId = byId.get(parentId).parentId;
    }
  }
  return { nodes, selectedId: lineage.selectedId };
}

/** Create a JSON-serializable root. The source preset is never changed. */
export function createLineage(scene, preset) {
  const schema = sceneSchema(scene);
  const root = {
    id: "node-0",
    parentId: null,
    name:
      typeof preset?.name === "string"
        ? preset.name
        : `${scene.name || scene.id} origin`,
    scene: scene.id,
    seed: seedValue(preset?.seed ?? 1),
    params: boundedParams(schema, preset),
  };
  return { nodes: [root], selectedId: root.id };
}

/** Append and select one child of the selected node. All prior siblings remain.
 * This works for every family, but a parent must use the supplied scene's schema;
 * incompatible visual families are not represented as meaningful hybrids.
 */
export function breedLineage(
  lineage,
  scene,
  { seed, strength = 0.15, locked } = {},
) {
  const next = cloneLineage(lineage);
  if (next.nodes.length >= MAX_NODES) {
    throw new RangeError(
      `Lineage limit reached (${MAX_NODES} nodes). Start a new lineage from a chosen preset; no existing nodes were removed.`,
    );
  }
  sceneSchema(scene);
  const parent = next.nodes.find((node) => node.id === next.selectedId);
  if (parent.scene !== scene.id) {
    throw new RangeError(
      `Selected node belongs to "${parent.scene}"; breed it with that scene, not "${scene.id}".`,
    );
  }
  const childSeed =
    seed === undefined
      ? ((parent.seed + Math.imul(next.nodes.length, 0x9e3779b9)) >>> 0) &
        SEED_MAX
      : seed;
  const preset = mutatePreset(scene, parent, {
    seed: childSeed,
    strength,
    locked,
  });
  let index = next.nodes.length;
  const ids = new Set(next.nodes.map((node) => node.id));
  while (ids.has(`node-${index}`)) index++;
  const node = {
    id: `node-${index}`,
    parentId: parent.id,
    name: preset.name,
    scene: scene.id,
    seed: preset.seed,
    params: preset.params,
  };
  next.nodes.push(node);
  next.selectedId = node.id;
  return next;
}

/** Change selection without changing presets or ancestry. */
export function selectNode(lineage, id) {
  const next = cloneLineage(lineage);
  if (!next.nodes.some((node) => node.id === id))
    throw new RangeError(`Lineage node "${String(id)}" does not exist.`);
  next.selectedId = id;
  return next;
}

/** Navigate to the parent; undo never deletes a generation or its siblings. */
export function undoGeneration(lineage) {
  const next = cloneLineage(lineage);
  const selected = next.nodes.find((node) => node.id === next.selectedId);
  if (selected.parentId !== null) next.selectedId = selected.parentId;
  return next;
}
