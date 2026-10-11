// Stable performance controls: read the playing family, edit desired patterns,
// and update only the playhead while the transport advances.
import {
  GLOBAL_EFFECTS,
  defaultPattern,
  effectDefinitions,
  validatePattern,
} from "./rhythm.mjs";

const copy = (value) => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const modulo = (value, length) => ((value % length) + length) % length;

export function stepLabel(index, division = 1) {
  const beat = Math.floor(index / division);
  const subdivision =
    division === 4
      ? ["", "e", "&", "a"][index % 4]
      : division === 2
        ? ["", "&"][index % 2]
        : "";
  return `${Math.floor(beat / 4) + 1}.${(beat % 4) + 1}${subdivision}`;
}

export function cycleStep(value, accent = false) {
  if (accent) return value === 1 ? 0.55 : 1;
  return value <= 0 ? 0.55 : value < 1 ? 1 : 0;
}

// Preserve existing placements when extending a loop, and musical placement
// when changing resolution. Truncating deliberately discards later steps.
export function resizeTrack(track, length, division = track.division) {
  const nextLength = Math.max(
    1,
    Math.min(256, division * 64, Math.round(length)),
  );
  const steps = Array(nextLength).fill(0);
  for (let index = 0; index < track.steps.length; index++) {
    const target = Math.round((index / track.division) * division);
    if (target < nextLength)
      steps[target] = Math.max(steps[target], track.steps[index]);
  }
  return { ...track, division, length: nextLength, steps };
}

export function editPatternTrack(pattern, effect, change) {
  return {
    ...copy(pattern),
    mode: "locked",
    tracks: pattern.tracks.map((track) =>
      track.effect === effect ? change(copy(track)) : copy(track),
    ),
  };
}

export function rhythmTarget(status, scenes, draft, preview = false) {
  const live =
    status?.rhythm?.live ??
    (status?.live && {
      family: status.live.scene,
      look: status.live.look,
      name: status.live.name,
    });
  if (preview && draft) {
    const scene = scenes.find((item) => item.id === draft.snapshot.scene);
    return {
      scene,
      look: draft.id,
      name: draft.name,
      own: !!draft.own,
      variant: scene?.type ? draft.snapshot.params[scene.type.key] : null,
      preview: true,
    };
  }
  if (!live) return null;
  const scene = scenes.find((item) => item.id === live.family);
  return {
    scene,
    look: live.look,
    name: live.name,
    own: !!live.own,
    variant: live.variant,
    audition: !!status?.rhythm?.drafts?.[live.look],
    preview: false,
  };
}

function element(document, tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export class RhythmPanel {
  constructor({
    root,
    scenes,
    getSet,
    getStatus,
    getDraft,
    onCommand,
    onDraftPreview,
    onSaveOverride,
    isLocked = () => false,
  }) {
    Object.assign(this, {
      root,
      scenes,
      getSet,
      getStatus,
      getDraft,
      onCommand,
      onDraftPreview,
      onSaveOverride,
      isLocked,
    });
    this.document = root.ownerDocument;
    this.preview = false;
    this.groups = new Map();
    this.optimistic = new Map();
    this.clock = { position: 0, bpm: 120, time: 0, enabled: false };
    const el = (...args) => element(this.document, ...args);
    this.targetLabel = el("p", { className: "rhythm-target" });
    this.playingButton = el("button", {
      type: "button",
      textContent: "Playing visual",
      ariaPressed: "true",
      onclick: () => this.setPreview(false),
    });
    this.previewButton = el("button", {
      type: "button",
      textContent: "Preview draft rhythm",
      ariaPressed: "false",
      onclick: () => this.setPreview(true),
    });
    this.pendingLabel = el("span", {
      className: "rhythm-pending",
      role: "status",
    });
    this.contextNote = el("p", { className: "note" });
    this.familyRoot = el("div", {
      className: "rhythm-section",
      ariaLabel: "Family rhythm effects",
    });
    this.globalRoot = el("div", {
      className: "rhythm-section rhythm-global",
      ariaLabel: "Global rhythm effects",
    });
    this.root.append(
      el(
        "div",
        { className: "rhythm-context" },
        el(
          "div",
          { className: "segmented" },
          this.playingButton,
          this.previewButton,
        ),
        this.pendingLabel,
      ),
      this.targetLabel,
      this.contextNote,
      this.familyRoot,
      this.globalRoot,
      el("p", {
        className: "note rhythm-guide",
        textContent:
          "Click a step: off → on → accent. Shift-click for an accent. Arrow keys move between steps. Loops keep running across bars; Speed only changes movement.",
      }),
    );
    this.root.addEventListener("keydown", (event) => {
      if (
        event.target.closest("button, input, select") &&
        [
          " ",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        event.stopPropagation();
    });
    const animate = (ms) => {
      if (!root.isConnected) return;
      if (!this.document.hidden)
        this.paintPlayheads(
          this.clock.position +
            (this.clock.enabled
              ? (Math.max(0, ms - this.clock.time) / 60000) * this.clock.bpm
              : 0),
        );
      this.frame = requestAnimationFrame(animate);
    };
    this.frame = requestAnimationFrame(animate);
    this.update();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
  }

  setPreview(on) {
    if (on && (!this.getDraft() || this.isLocked())) return;
    if (on === this.preview) return this.update();
    this.preview = on;
    this.optimistic.clear();
    if (on) this.onDraftPreview?.(this.previewPattern());
    else this.onDraftPreview?.(null);
    this.update();
  }

  previewPattern() {
    const draft = this.getDraft();
    const target = rhythmTarget(this.getStatus(), this.scenes, draft, true);
    if (!target?.scene) return null;
    const definitions = effectDefinitions(target.scene);
    return validatePattern(
      draft.rhythm ??
        this.getSet().rhythm?.families?.[target.scene.id] ??
        defaultPattern(definitions),
      definitions,
    );
  }

  groupPattern(scope, target, status) {
    const rhythm = status?.rhythm;
    const set = this.getSet();
    if (scope === "global")
      return (
        rhythm?.settings?.global ??
        set.rhythm?.global ??
        defaultPattern(GLOBAL_EFFECTS)
      );
    if (target.preview) return this.previewPattern();
    return (
      rhythm?.drafts?.[target.look] ??
      rhythm?.overrides?.[target.look] ??
      set.looks.find((look) => look.id === target.look)?.rhythm ??
      rhythm?.settings?.families?.[target.scene.id] ??
      set.rhythm?.families?.[target.scene.id] ??
      defaultPattern(effectDefinitions(target.scene))
    );
  }

  update(status = this.getStatus()) {
    this.status = status;
    const target = rhythmTarget(
      status,
      this.scenes,
      this.getDraft(),
      this.preview,
    );
    this.target = target;
    const rhythm = status?.rhythm;
    this.clock = {
      position: rhythm?.position ?? status?.clock?.beat ?? 0,
      bpm: status?.clock?.bpm ?? 120,
      time: performance.now(),
      enabled: rhythm?.enabled ?? !!target,
    };
    this.playingButton.ariaPressed = String(!this.preview);
    this.previewButton.ariaPressed = String(this.preview);
    this.previewButton.disabled = !this.getDraft() || this.isLocked();
    this.targetLabel.textContent = target
      ? `${this.preview ? "Draft preview" : "Playing"} · ${target.name} · ${target.scene?.name ?? "Family"}`
      : "Family effects appear when a visual is playing.";
    this.contextNote.textContent = this.preview
      ? "Family pattern preview. Changes stay in this draft until you explicitly save an own-look pattern. Global tracks below remain set-wide."
      : rhythm?.enabled === false
        ? "Rhythm is paused for the safe look. Saved patterns are retained."
        : "Family gestures follow the music beat. Your edits are protected until you choose Automatic.";
    const pending = rhythm?.pending ?? [];
    const relevant = pending.filter(
      (item) =>
        item.scope === "global" ||
        (target &&
          (item.scope === "family"
            ? item.family === target.scene?.id
            : item.look === target.look)),
    );
    const next = relevant.length
      ? Math.min(
          ...relevant.map(
            (item) => item.beats ?? Math.max(0, item.at - this.clock.position),
          ),
        )
      : null;
    this.pendingLabel.textContent =
      next === null ? "" : `Queued · ${Math.ceil(next * 4) / 4} beats`;
    if (target?.scene)
      this.updateGroup(
        "family",
        this.familyRoot,
        effectDefinitions(target.scene),
        target,
        status,
      );
    else {
      this.familyRoot.replaceChildren();
      this.groups.delete("family");
    }
    this.updateGroup("global", this.globalRoot, GLOBAL_EFFECTS, target, status);
    this.paintPlayheads(this.clock.position);
  }

  updateGroup(scope, root, definitions, target, status) {
    const key =
      scope === "global"
        ? "global"
        : `${target.preview ? "draft" : "family"}:${target.scene.id}`;
    let group = this.groups.get(scope);
    if (!group || group.key !== key) {
      group = this.buildGroup(scope, root, key);
      this.groups.set(scope, group);
    }
    const savedPattern = this.groupPattern(scope, target, status);
    const override =
      scope === "family" &&
      !target.preview &&
      (status?.rhythm?.overrides?.[target.look] ??
        this.getSet().looks.find((look) => look.id === target.look)?.rhythm);
    const targetKey =
      scope === "global"
        ? "global"
        : target.preview || target.audition
          ? `draft:${target.look}`
          : override
            ? `look:${target.look}`
            : `family:${target.scene.id}`;
    let pattern = validatePattern(savedPattern, definitions);
    const optimistic = this.optimistic.get(targetKey);
    if (optimistic) {
      if (same(pattern, optimistic.pattern)) this.optimistic.delete(targetKey);
      else pattern = optimistic.pattern;
    }
    // The grid displays the currently authored phrase, so protecting or
    // editing it preserves the steps the performer actually sees.
    if (
      !optimistic &&
      pattern.mode === "auto" &&
      status?.rhythm?.style &&
      !target?.preview
    )
      pattern = defaultPattern(definitions, status.rhythm.style);
    Object.assign(group, { pattern, definitions, target, targetKey });
    group.title.textContent =
      scope === "global" ? "Global effects" : target.scene.name;
    group.mode.textContent =
      pattern.mode === "locked" ? "Protected" : "Automatic";
    group.mode.className = `rhythm-mode ${pattern.mode === "locked" ? "protected" : ""}`;
    group.auto.ariaPressed = String(pattern.mode === "auto");
    group.lock.ariaPressed = String(pattern.mode === "locked");
    if (this.document.activeElement !== group.style)
      group.style.value = pattern.style;
    group.note.textContent =
      pattern.mode === "auto"
        ? `Authored patterns · ${status?.rhythm?.style ?? pattern.style} phrase`
        : "Your steps stay fixed. Energy changes intensity.";
    group.override.hidden = scope !== "family" || !target?.own;
    group.override.textContent = target?.preview
      ? "Save pattern for this look"
      : override
        ? "Save current look pattern"
        : "Save as look override";
    const savedLook =
      target?.own &&
      this.getSet().looks.find((look) => look.id === target.look);
    const differentDraftFamily =
      target?.preview && savedLook?.snapshot.scene !== target.scene.id;
    group.override.disabled = this.isLocked() || differentDraftFamily;
    group.override.title = differentDraftFamily
      ? "Save this draft's new family as an own look first."
      : "Save a pattern override for this own look.";
    group.inherit.hidden =
      scope !== "family" || !target?.own || (!override && !target?.preview);
    group.inherit.disabled = this.isLocked() || differentDraftFamily;
    group.scopeNote.textContent =
      scope === "global"
        ? "Shared by every visual in this set"
        : target.preview
          ? "Unsaved draft pattern"
          : target.audition
            ? "Playing audition · edit with Preview draft rhythm"
            : override
              ? "Override for this own look"
              : "Shared by this family in this set";
    const disabled =
      (this.preview && scope === "global") ||
      (!this.preview && scope === "family" && target.audition);
    group.root.classList.toggle("rhythm-preview-inactive", disabled);
    for (const control of [group.auto, group.lock, group.style])
      control.disabled = disabled || (target?.preview && this.isLocked());
    const present = new Set();
    for (const definition of definitions) {
      const track = pattern.tracks.find(
        (item) => item.effect === definition.id,
      );
      if (!track) continue;
      present.add(definition.id);
      let row = group.rows.get(definition.id);
      if (!row) {
        row = this.buildRow(group, definition);
        group.rows.set(definition.id, row);
        group.tracks.append(row.root);
      }
      this.updateRow(group, row, definition, track, disabled);
    }
    for (const [id, row] of group.rows)
      if (!present.has(id)) {
        row.root.remove();
        group.rows.delete(id);
      }
    group.empty.hidden = definitions.length > 0;
    const pending = (status?.rhythm?.pending ?? []).filter((item) =>
      scope === "global"
        ? item.scope === "global"
        : item.scope === "family"
          ? item.family === target.scene.id
          : item.look === target.look,
    );
    group.pending.textContent = pending.some((item) => item.quantize === "bar")
      ? "Queued for the next 1"
      : pending.length
        ? "Queued for the next grid point"
        : "";
  }

  buildGroup(scope, root, key) {
    const el = (...args) => element(this.document, ...args);
    const group = { scope, root, key, rows: new Map() };
    group.title = el("h3");
    group.mode = el("span", { className: "rhythm-mode" });
    group.auto = el("button", {
      type: "button",
      textContent: "Automatic",
      onclick: () => {
        const pattern = defaultPattern(group.definitions, group.pattern.style);
        this.submit(group, { ...pattern, mode: "auto" }, "bar");
      },
    });
    group.lock = el("button", {
      type: "button",
      textContent: "Protect",
      onclick: () =>
        this.submit(group, { ...group.pattern, mode: "locked" }, "now"),
    });
    group.style = el(
      "select",
      {
        ariaLabel: `${scope === "global" ? "Global" : "Family"} authored pattern`,
        onchange: () => {
          const pattern = defaultPattern(group.definitions, group.style.value);
          this.submit(group, { ...pattern, mode: "locked" }, "bar");
        },
      },
      ...["restrained", "driving", "accented"].map((style) =>
        el("option", {
          value: style,
          textContent: `${style[0].toUpperCase()}${style.slice(1)}`,
        }),
      ),
    );
    group.note = el("p", { className: "note rhythm-pattern-note" });
    group.scopeNote = el("span", { className: "note" });
    group.pending = el("span", { className: "rhythm-pending" });
    group.override = el("button", {
      type: "button",
      onclick: () => {
        if (this.isLocked()) return;
        this.onSaveOverride?.(group.target, copy(group.pattern));
        this.update();
      },
    });
    group.inherit = el("button", {
      type: "button",
      textContent: "Use family pattern",
      onclick: () => {
        if (this.isLocked()) return;
        this.onSaveOverride?.(group.target, null);
        this.optimistic.delete(group.targetKey);
        this.update();
      },
    });
    group.tracks = el("div", { className: "rhythm-tracks" });
    group.empty = el("p", {
      className: "note",
      textContent: "This family has no rhythm effects yet.",
    });
    root.replaceChildren(
      el("div", { className: "rhythm-section-head" }, group.title, group.mode),
      el(
        "div",
        { className: "rhythm-pattern-controls" },
        el("div", { className: "segmented" }, group.auto, group.lock),
        group.style,
      ),
      group.note,
      group.tracks,
      group.empty,
      el(
        "div",
        { className: "rhythm-save" },
        group.scopeNote,
        group.pending,
        group.override,
        group.inherit,
      ),
    );
    return group;
  }

  submit(group, pattern, quantize) {
    const validated = validatePattern(pattern, group.definitions);
    if (this.preview && group.scope === "family") {
      if (this.isLocked()) return;
      this.onDraftPreview?.(validated);
    } else if (this.preview) return;
    else {
      const override =
        group.scope === "family" &&
        (this.status?.rhythm?.overrides?.[group.target.look] ??
          this.getSet().looks.find((look) => look.id === group.target.look)
            ?.rhythm);
      this.onCommand({
        type: "rhythm",
        scope:
          group.scope === "global" ? "global" : override ? "look" : "family",
        ...(group.scope === "family"
          ? {
              family: group.target.scene.id,
              ...(override ? { look: group.target.look } : {}),
            }
          : {}),
        pattern: validated,
        quantize,
      });
      this.optimistic.set(group.targetKey, { pattern: validated });
    }
    group.pattern = validated;
    this.update();
  }

  edit(group, effect, change, quantize) {
    this.submit(
      group,
      editPatternTrack(group.pattern, effect, change),
      quantize,
    );
  }

  buildRow(group, definition) {
    const el = (...args) => element(this.document, ...args);
    const edit = (change, quantize) =>
      this.edit(group, definition.id, change, quantize);
    const row = { definition, buttons: [], active: -1 };
    row.name = el("span", {
      className: "rhythm-effect-name",
      textContent: definition.label,
    });
    row.kind = el("span", {
      className: "rhythm-kind",
      textContent:
        definition.kind === "simulation"
          ? "Simulation"
          : definition.kind === "motion"
            ? "Motion"
            : "Accent",
    });
    row.inactive = el("span", {
      className: "rhythm-inactive",
      textContent: "Inactive for this variant",
      hidden: true,
    });
    row.mute = el("button", {
      type: "button",
      className: "rhythm-mute",
      textContent: "Mute",
      ariaLabel: `Mute ${definition.label}`,
      onclick: () =>
        edit((track) => ({ ...track, muted: !track.muted }), "now"),
    });
    row.division = el(
      "select",
      {
        ariaLabel: `${definition.label} resolution`,
        onchange: () =>
          edit(
            (track) =>
              resizeTrack(
                track,
                (track.length / track.division) * Number(row.division.value),
                Number(row.division.value),
              ),
            "bar",
          ),
      },
      ...[
        [1, "Quarter"],
        [2, "Eighth"],
        [4, "Sixteenth"],
      ].map(([value, textContent]) => el("option", { value, textContent })),
    );
    row.length = el("input", {
      type: "number",
      min: 1,
      max: 256,
      step: 1,
      ariaLabel: `${definition.label} loop length in steps`,
      onchange: () => {
        if (!Number.isFinite(row.length.valueAsNumber)) return this.update();
        edit((track) => resizeTrack(track, row.length.valueAsNumber), "bar");
      },
    });
    row.loop = el("span", { className: "rhythm-loop-note" });
    row.strength = el("input", {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01,
      ariaLabel: `${definition.label} strength`,
      oninput: () =>
        edit(
          (track) => ({ ...track, strength: Number(row.strength.value) }),
          "now",
        ),
    });
    row.strengthValue = el("output");
    row.duration = el("input", {
      type: "number",
      min: 0.0625,
      max: 8,
      step: 0.0625,
      ariaLabel: `${definition.label} duration in beats`,
      onchange: () => {
        if (!Number.isFinite(row.duration.valueAsNumber)) return this.update();
        edit(
          (track) => ({
            ...track,
            duration: Math.max(0.0625, Math.min(8, row.duration.valueAsNumber)),
          }),
          "now",
        );
      },
    });
    row.steps = el("div", {
      className: "rhythm-steps",
      role: "group",
      ariaLabel: `${definition.label} loop steps`,
    });
    row.root = el("div", { className: "rhythm-track" });
    row.root.dataset.effect = definition.id;
    row.root.append(
      el(
        "div",
        { className: "rhythm-track-head", title: definition.description },
        row.name,
        row.kind,
        row.inactive,
        row.mute,
      ),
      el(
        "div",
        { className: "rhythm-track-timing" },
        el("label", {}, "Grid ", row.division),
        el("label", {}, "Steps ", row.length),
        row.loop,
      ),
      el("div", { className: "rhythm-step-scroll", tabIndex: -1 }, row.steps),
      el(
        "div",
        { className: "rhythm-track-shape" },
        el(
          "label",
          { className: "rhythm-strength" },
          "Strength",
          row.strength,
          row.strengthValue,
        ),
        el(
          "label",
          { className: "rhythm-duration" },
          "Duration",
          row.duration,
          el("span", { className: "note", textContent: "beats" }),
        ),
      ),
    );
    row.steps.addEventListener("keydown", (event) => {
      const index = row.buttons.indexOf(event.target);
      if (index < 0) return;
      const next = {
        ArrowLeft: Math.max(0, index - 1),
        ArrowRight: Math.min(row.buttons.length - 1, index + 1),
        Home: 0,
        End: row.buttons.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      for (const button of row.buttons) button.tabIndex = -1;
      row.buttons[next].tabIndex = 0;
      row.buttons[next].focus();
    });
    return row;
  }

  updateRow(group, row, definition, track, disabled) {
    row.track = track;
    const available =
      !definition.variants ||
      definition.variants.includes(group.target?.variant);
    const inactive =
      !available || disabled || (group.target?.preview && this.isLocked());
    row.root.classList.toggle("rhythm-unavailable", !available);
    row.root.classList.toggle("rhythm-muted", track.muted);
    row.inactive.hidden = available;
    row.mute.ariaPressed = String(track.muted);
    row.mute.textContent = track.muted ? "Muted" : "Mute";
    for (const [input, value] of [
      [row.division, track.division],
      [row.length, track.length],
      [row.strength, track.strength],
      [row.duration, track.duration],
    ]) {
      if (this.document.activeElement !== input) input.value = value;
      input.disabled = inactive;
    }
    row.length.max = track.division * 64;
    row.strength.style.setProperty("--fill", `${track.strength * 100}%`);
    row.strengthValue.value = `${Math.round(track.strength * 100)}%`;
    row.mute.disabled = inactive;
    const beats = track.length / track.division;
    row.loop.textContent = `${Number(beats.toFixed(2))} beats${beats % 4 ? " · crosses bars" : ` · ${beats / 4} ${beats === 4 ? "bar" : "bars"}`}`;
    if (row.buttons.length > track.length) {
      const activeIndex = row.buttons.indexOf(this.document.activeElement);
      for (const button of row.buttons.splice(track.length)) button.remove();
      if (activeIndex >= track.length) {
        row.buttons.at(-1).tabIndex = 0;
        row.buttons.at(-1).focus();
      }
    }
    while (row.buttons.length < track.length) {
      const index = row.buttons.length;
      const button = element(this.document, "button", {
        type: "button",
        className: "rhythm-step",
        tabIndex: index === 0 ? 0 : -1,
        onclick: (event) =>
          this.edit(
            group,
            definition.id,
            (current) => ({
              ...current,
              steps: current.steps.map((value, at) =>
                at === index ? cycleStep(value, event.shiftKey) : value,
              ),
            }),
            "step",
          ),
      });
      button.addEventListener("focus", () => {
        for (const other of row.buttons)
          other.tabIndex = other === button ? 0 : -1;
      });
      row.buttons.push(button);
      row.steps.append(button);
    }
    row.steps.style.setProperty("--rhythm-steps", track.length);
    for (let index = 0; index < row.buttons.length; index++) {
      const button = row.buttons[index];
      const strength = track.steps[index];
      button.textContent = stepLabel(index, track.division);
      button.ariaPressed = String(strength > 0);
      button.ariaLabel = `${definition.label}, loop bar ${Math.floor(index / track.division / 4) + 1}, beat ${(Math.floor(index / track.division) % 4) + 1}${track.division > 1 ? `, subdivision ${(index % track.division) + 1} of ${track.division}` : ""}, ${strength <= 0 ? "off" : strength === 1 ? "accent" : "on"}`;
      button.title = `Loop ${stepLabel(index, track.division)} · ${strength <= 0 ? "off" : strength === 1 ? "accent" : "on"}`;
      button.classList.toggle("rhythm-accent", strength === 1);
      button.classList.toggle(
        "rhythm-bar-start",
        index % (track.division * 4) === 0,
      );
      button.classList.toggle(
        "rhythm-beat-start",
        index % track.division === 0,
      );
      button.disabled = inactive;
    }
  }

  paintPlayheads(position) {
    for (const group of this.groups.values())
      for (const row of group.rows.values()) {
        const next =
          this.clock.enabled &&
          !row.root.classList.contains("rhythm-unavailable") &&
          !(this.preview && group.scope === "global")
            ? modulo(
                Math.floor(position * row.track.division + 1e-6),
                row.track.length,
              )
            : -1;
        if (next === row.active) continue;
        if (row.buttons[row.active]) {
          row.buttons[row.active].classList.remove("rhythm-current");
          row.buttons[row.active].removeAttribute("aria-current");
        }
        row.active = next;
        if (row.buttons[next]) {
          row.buttons[next].classList.add("rhythm-current");
          row.buttons[next].setAttribute("aria-current", "step");
        }
      }
  }
}
