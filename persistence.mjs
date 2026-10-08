import { initialSession, validateSession, migrateLegacy } from "./session.mjs";
export const SET_KEY = "phosphor-set-v2";
export const RECOVERY_KEY = "phosphor-recovery-v2";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function differences(a, b, path = [], changes = []) {
  if (same(a, b)) return changes;
  if (
    a &&
    b &&
    !Array.isArray(a) &&
    !Array.isArray(b) &&
    typeof a === "object" &&
    typeof b === "object"
  ) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
      differences(a[key], b[key], [...path, key], changes);
  } else
    changes.push({
      path,
      before: structuredClone(a),
      after: structuredClone(b),
    });
  return changes;
}
function assign(object, path, value) {
  let parent = object;
  for (const key of path.slice(0, -1)) parent = parent[key];
  if (value === undefined) delete parent[path.at(-1)];
  else parent[path.at(-1)] = structuredClone(value);
}
export class History {
  constructor() {
    this.undo = [];
    this.redo = [];
    this.pending = null;
  }
  checkpoint(session) {
    this.commit(session);
    this.pending = structuredClone(session);
  }
  commit(session) {
    if (!this.pending) return;
    const changes = differences(this.pending, session);
    this.pending = null;
    if (!changes.length) return;
    this.undo.push(changes);
    if (this.undo.length > 50) this.undo.shift();
    this.redo = [];
  }
  rebase(session, paths) {
    if (!this.pending) return;
    for (const path of paths) {
      let value = session;
      for (const key of path) value = value[key];
      assign(this.pending, path, value);
    }
  }
  restore(session, reverse = false) {
    this.commit(session);
    const source = reverse ? this.redo : this.undo;
    const target = reverse ? this.undo : this.redo;
    if (!source.length) return null;
    const changes = source.pop();
    const result = structuredClone(session);
    for (const change of changes)
      assign(result, change.path, reverse ? change.after : change.before);
    target.push(changes);
    return result;
  }
}
export class Persistence {
  constructor(storage, scenes, notify = () => {}, timers = globalThis) {
    this.storage = storage;
    this.scenes = scenes;
    this.notify = notify;
    this.timers = timers;
    this.dirty = false;
    this.blocked = false;
    this.recoveryRaw = null;
    this.recoveryDownloaded = false;
    this.timer = null;
  }
  save(session) {
    this.dirty = true;
    const valid = validateSession(session, this.scenes);
    if (this.blocked) {
      this.notify("blocked");
      return false;
    }
    this.storage.setItem(SET_KEY, JSON.stringify(valid));
    this.dirty = false;
    this.notify("saved");
    return true;
  }
  changed(getSession) {
    this.dirty = true;
    this.timers.clearTimeout(this.timer);
    this.notify("saving");
    this.timer = this.timers.setTimeout(() => {
      try {
        this.save(getSession());
      } catch (error) {
        this.notify("error", error);
      }
    }, 400);
  }
  flush(session) {
    this.timers.clearTimeout(this.timer);
    if (this.dirty && !this.blocked) return this.save(session);
    return false;
  }
  externalChange(event) {
    if (event.key !== SET_KEY) return false;
    this.blocked = true;
    this.timers.clearTimeout(this.timer);
    this.notify("stale");
    return true;
  }
  backup(raw) {
    this.recoveryRaw = raw;
    const prior = this.storage.getItem(RECOVERY_KEY);
    // Never evict an earlier rejected set. Retain additional originals by key.
    if (!prior || prior === raw) this.storage.setItem(RECOVERY_KEY, raw);
    else {
      let hash = 2166136261;
      for (let i = 0; i < raw.length; i++)
        hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
      this.storage.setItem(`${RECOVERY_KEY}-${hash >>> 0}`, raw);
    }
  }
  load() {
    let raw = null;
    let migrated = false;
    try {
      raw = this.storage.getItem(SET_KEY);
      if (!raw) {
        raw = this.storage.getItem("phosphor-set-v1");
        migrated = Boolean(raw);
      }
      const session = raw
        ? migrated
          ? migrateLegacy(JSON.parse(raw), this.scenes)
          : validateSession(JSON.parse(raw), this.scenes)
        : initialSession(this.scenes);
      if (migrated) this.backup(raw);
      this.recoveryRaw ||= this.storage.getItem(RECOVERY_KEY);
      return { session, migrated, error: null };
    } catch (error) {
      if (raw) {
        try {
          this.backup(raw);
        } catch {
          this.recoveryRaw = raw;
          this.blocked = true;
        }
      }
      return { session: initialSession(this.scenes), migrated: false, error };
    }
  }
}
