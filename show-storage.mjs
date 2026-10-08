// Local persistence for v3 shows (decision D9). The set is saved by the
// control window on edits only; the stage saves its runtime state (current
// clip, energy, shared controls, clock) every second for crash recovery.
import { initialShowSet, parseShowSet, validateShowSet } from "./show-set.mjs";

export const SET_KEY = "phosphor-set-v3";
export const RUNTIME_KEY = "phosphor-runtime-v3";
const V2_KEY = "phosphor-set-v2";
const RUNTIME_MAX_AGE = 12 * 3600 * 1000;

export function loadSet(storage, scenes) {
  try {
    const raw = storage.getItem(SET_KEY);
    if (raw)
      return { set: validateShowSet(JSON.parse(raw), scenes), report: [] };
  } catch (error) {
    return {
      set: initialShowSet(scenes),
      report: [`Saved show unreadable: ${error.message}`],
    };
  }
  try {
    const old = storage.getItem(V2_KEY);
    if (old) {
      const migrated = parseShowSet(JSON.parse(old), scenes);
      return {
        ...migrated,
        report: ["Migrated the saved v2 set.", ...migrated.report],
      };
    }
  } catch {}
  return { set: validateShowSet(initialShowSet(scenes), scenes), report: [] };
}

export function saveSet(storage, set) {
  storage.setItem(SET_KEY, JSON.stringify(set));
}

export function saveRuntime(storage, state, now = Date.now()) {
  try {
    storage.setItem(RUNTIME_KEY, JSON.stringify({ savedAt: now, state }));
  } catch {}
}

export function loadRuntime(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(RUNTIME_KEY));
    if (saved && now - saved.savedAt < RUNTIME_MAX_AGE) return saved.state;
  } catch {}
  return null;
}
