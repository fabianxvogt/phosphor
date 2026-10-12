import { tr, errorText } from "./i18n/index.mjs";
// Local persistence (D9): the control saves v5 sets on edits; the stage
// saves runtime state each second. Old set entries remain as migration backups.
import { initialShowSet, parseShowSet, validateShowSet } from "./show-set.mjs";

export const SET_KEY = "phosphor-set-v5";
// v4 runtime state named page/slot positions; v5 names the live look.
export const RUNTIME_KEY = "phosphor-runtime-v4";
const OLD_SET_KEYS = ["phosphor-set-v4", "phosphor-set-v3", "phosphor-set-v2"];
// An unreadable save is never thrown away: the next edit would overwrite it
// (e.g. a clip whose family narrowed a parameter range). The first one kept.
export const UNREADABLE_KEY = "phosphor-set-v5-unreadable";
const RUNTIME_MAX_AGE = 12 * 3600 * 1000;

export function loadSet(storage, scenes) {
  for (const key of [SET_KEY, ...OLD_SET_KEYS]) {
    let raw = null;
    let loaded;
    try {
      raw = storage.getItem(key);
      if (!raw) continue;
      loaded = parseShowSet(JSON.parse(raw), scenes);
    } catch (error) {
      const backup = key === SET_KEY ? UNREADABLE_KEY : `${key}-unreadable`;
      let preservedAt = key;
      try {
        const previous = storage.getItem(backup);
        if (raw && (!previous || previous === raw)) {
          if (!previous) storage.setItem(backup, raw);
          preservedAt = backup;
        }
      } catch {}
      return {
        set: initialShowSet(scenes),
        report: [
          tr(
            'Saved show unreadable: {value1}. The original is kept in local storage under "{value2}".',
            { value1: errorText(error), value2: preservedAt },
          ),
        ],
      };
    }
    if (key !== SET_KEY) {
      loaded.report.unshift(
        tr("Migrated the saved {value1} set.", { value1: key.slice(-2) }),
      );
      try {
        saveSet(storage, loaded.set);
      } catch (error) {
        loaded.report.push(
          tr(
            'Could not save the migrated set ({value1}); the original is still kept under "{value2}".',
            { value1: errorText(error), value2: key },
          ),
        );
      }
    }
    return loaded;
  }
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
