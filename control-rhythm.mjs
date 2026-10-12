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

// A compact cell always means a sixteenth within the selected bar. Finer
// edits promote the track's grid without moving any of its existing hits.
export function editCompactStep(track, bar, cell, accent = false) {
  const beat = bar * 4 + cell / 4;
  const next = Number.isInteger(beat * track.division)
    ? copy(track)
    : resizeTrack(track, (track.length * 4) / track.division, 4);
  const index = modulo(Math.round(beat * next.division), next.length);
  next.steps[index] = cycleStep(next.steps[index], accent);
  return next;
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

function anchorOptions(popover, anchor) {
  const view = popover.ownerDocument.defaultView;
  const position = () => {
    if (!popover.matches(":popover-open") || !anchor?.isConnected) return;
    const rect = anchor.getBoundingClientRect();
    const box = popover.getBoundingClientRect();
    popover.style.left = `${Math.max(12, Math.min(rect.left, view.innerWidth - box.width - 12))}px`;
    popover.style.top = `${Math.max(12, Math.min(rect.bottom + 8, view.innerHeight - box.height - 12))}px`;
  };
  popover.addEventListener("toggle", position);
  view.addEventListener("resize", position);
  view.addEventListener("scroll", position, true);
  // These controls live in the top layer, outside the grid's key boundary.
  popover.addEventListener("keydown", (event) => event.stopPropagation());
  return () => {
    view.removeEventListener("resize", position);
    view.removeEventListener("scroll", position, true);
  };
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
    this.compact = root.dataset.compact === "true";
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
    if (this.compact) {
      this.settings = el("div", {
        id: "rhythmSettings",
        className: "rhythm-options",
        popover: "auto",
      });
      this.settings.dataset.scope = "family";
      this.settings.append(
        this.optionHeading("Rhythm options", this.settings),
        this.root.querySelector(".rhythm-context"),
        this.targetLabel,
        this.contextNote,
        this.root.querySelector(".rhythm-guide"),
      );
      this.document.body.append(this.settings);
      this.removeSettingsAnchor = anchorOptions(
        this.settings,
        this.document.getElementById("rhythmOptions"),
      );
    }
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
            (this.clock.enabled && !this.clock.paused
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
    this.settings?.remove();
    this.removeSettingsAnchor?.();
    for (const group of this.groups.values()) this.removeOptions(group);
  }

  optionHeading(title, popover) {
    const el = (...args) => element(this.document, ...args);
    return el(
      "div",
      { className: "rhythm-option-heading" },
      el("strong", { textContent: title }),
      el("button", {
        type: "button",
        textContent: "×",
        ariaLabel: "Close rhythm options",
        onclick: () => popover.hidePopover(),
      }),
    );
  }

  removeOptions(group) {
    group.settings?.remove();
    for (const row of group.rows.values()) {
      row.options?.remove();
      row.removeAnchor?.();
    }
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
      paused: !!status?.paused,
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
      if (this.groups.has("family"))
        this.removeOptions(this.groups.get("family"));
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
      if (group) this.removeOptions(group);
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
    if (this.compact) {
      group.barCount = Math.max(
        1,
        ...pattern.tracks.map((track) =>
          Math.ceil(track.length / track.division / 4),
        ),
      );
      group.quickAuto.textContent = pattern.mode === "auto" ? "Auto" : "Edited";
      group.quickAuto.ariaPressed = String(pattern.mode === "auto");
      group.quickAuto.title =
        pattern.mode === "auto"
          ? "Automatic patterns · click to protect"
          : "Your edits are protected · click to restore automatic patterns";
    }
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
    if (group.quickAuto) group.quickAuto.disabled = group.auto.disabled;
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
        row.options?.remove();
        row.removeAnchor?.();
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
    const group = {
      scope,
      root,
      key,
      rows: new Map(),
      bar: 0,
      follow: true,
      barCount: 1,
    };
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
    if (this.compact) {
      group.settings = el("section", {
        className: `rhythm-options-group rhythm-options-${scope}`,
      });
      group.settings.append(
        ...[...root.children].filter(
          (child) => child !== group.tracks && child !== group.empty,
        ),
      );
      this.settings.append(group.settings);
      const turn = (delta) => {
        group.follow = false;
        const start = Math.floor(group.bar / group.barCount) * group.barCount;
        group.bar = Math.max(
          start,
          Math.min(start + group.barCount - 1, group.bar + delta),
        );
        this.update();
      };
      group.previous = el("button", {
        type: "button",
        textContent: "‹",
        ariaLabel: `${scope} previous rhythm bar`,
        onclick: () => turn(-1),
      });
      group.next = el("button", {
        type: "button",
        textContent: "›",
        ariaLabel: `${scope} next rhythm bar`,
        onclick: () => turn(1),
      });
      group.barLabel = el("span", {
        className: "rhythm-bar-label",
        title:
          "Bars in the longest track. Shorter loops continue across this cycle without restarting.",
      });
      group.live = el("button", {
        type: "button",
        className: "rhythm-live-toggle",
        textContent: "Live",
        ariaLabel: `${scope} follow live rhythm bar`,
        title:
          "Follow the shared live bar · each track keeps its own loop length",
        onclick: () => {
          group.follow = !group.follow;
          this.paintPlayheads(this.clock.position);
        },
      });
      group.quickAuto = el("button", {
        type: "button",
        className: "rhythm-auto-toggle",
        onclick: () =>
          (group.pattern.mode === "auto" ? group.lock : group.auto).click(),
      });
      root.prepend(
        el(
          "div",
          { className: "rhythm-mini-toolbar" },
          group.previous,
          group.barLabel,
          group.next,
          group.live,
          group.quickAuto,
        ),
      );
    }
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
    row.name = el(this.compact ? "button" : "span", {
      className: "rhythm-effect-name",
      textContent: definition.label,
      ...(this.compact
        ? {
            type: "button",
            title: `${definition.label} · track settings`,
            ariaLabel: `${definition.label} settings`,
            onclick: () => row.options.togglePopover(),
          }
        : {}),
    });
    if (this.compact) {
      row.loopBadge = el("span", { className: "rhythm-loop-badge" });
      row.name.append(row.loopBadge);
    }
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
    row.mini = el("div", {
      className: "rhythm-mini",
      ...(this.compact
        ? { role: "group", ariaLabel: `${definition.label} pattern` }
        : { ariaHidden: "true" }),
    });
    row.miniCells = Array.from({ length: 16 }, (_, index) =>
      el(
        this.compact ? "button" : "i",
        this.compact
          ? {
              type: "button",
              tabIndex: index === 0 ? 0 : -1,
              onclick: (event) => {
                group.follow = false;
                edit(
                  (track) =>
                    editCompactStep(track, group.bar, index, event.shiftKey),
                  "step",
                );
              },
              onpointerdown: () => {
                group.follow = false;
              },
              onfocus: () => {
                group.follow = false;
                row.miniCells.forEach((cell, at) => {
                  cell.tabIndex = at === index ? 0 : -1;
                });
              },
            }
          : {},
      ),
    );
    row.mini.addEventListener("keydown", (event) => {
      const index = row.miniCells.indexOf(event.target);
      const next = {
        ArrowLeft: Math.max(0, index - 1),
        ArrowRight: Math.min(15, index + 1),
        Home: 0,
        End: 15,
      }[event.key];
      if (index < 0 || next === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      row.miniCells[next].focus();
    });
    row.mini.append(...row.miniCells);
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
      row.mini,
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
    if (this.compact) {
      row.options = el("div", {
        className: "rhythm-row-options",
        popover: "auto",
      });
      row.options.dataset.effectOptions = definition.id;
      row.options.append(
        this.optionHeading(definition.label, row.options),
        row.kind,
        row.inactive,
        row.mute,
        row.root.querySelector(".rhythm-track-timing"),
        row.root.querySelector(".rhythm-track-shape"),
        row.loop,
      );
      this.document.body.append(row.options);
      row.removeAnchor = anchorOptions(row.options, row.name);
      row.root.querySelector(".rhythm-step-scroll").remove();
    }
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
    row.miniPhase = null;
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
    row.miniCells.forEach((cell) => {
      if (this.compact) cell.disabled = inactive;
    });
    const beats = track.length / track.division;
    if (row.loopBadge)
      row.loopBadge.textContent =
        beats % 4
          ? `${Number(beats.toFixed(2))} beats`
          : `${beats / 4} ${beats === 4 ? "bar" : "bars"}`;
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
    const liveBar = Math.max(0, Math.floor(position / 4));
    for (const group of this.groups.values()) {
      if (this.compact) {
        if (group.follow) group.bar = liveBar;
        const displayBar = modulo(group.bar, group.barCount);
        const label = `${group.follow ? "Bar" : "Edit bar"} ${displayBar + 1} / ${group.barCount}`;
        if (group.barLabel.textContent !== label)
          group.barLabel.textContent = label;
        group.previous.disabled = displayBar === 0;
        group.next.disabled = displayBar === group.barCount - 1;
        group.live.ariaPressed = String(group.follow);
      }
      for (const row of group.rows.values()) {
        const available =
          !row.root.classList.contains("rhythm-unavailable") &&
          !(this.preview && group.scope === "global");
        const phase = this.compact
          ? group.bar * 4
          : Math.floor(position / 4) * 4;
        if (phase !== row.miniPhase) {
          const steps = rhythmPreviewSteps(row.track, phase);
          row.miniCells.forEach((cell, index) => {
            if (this.compact) {
              cell.ariaPressed = String(steps[index] > 0);
              const displayBar = modulo(group.bar, group.barCount);
              cell.ariaLabel = `${row.definition.label}, bar ${displayBar + 1}, beat ${Math.floor(index / 4) + 1}, subdivision ${(index % 4) + 1}, ${steps[index] === 1 ? "accent" : steps[index] > 0 ? "on" : "off"}`;
              cell.title = `${stepLabel(displayBar * 16 + index, 4)} · click to change, Shift-click for accent`;
            }
            cell.classList.toggle(
              "on",
              steps[index] > 0 && !row.track.muted && available,
            );
            cell.classList.toggle(
              "accent",
              steps[index] === 1 && !row.track.muted && available,
            );
          });
          row.miniPhase = phase;
        }
        const inViewedBar = !this.compact || liveBar === group.bar;
        const miniActive =
          this.clock.enabled && available && inViewedBar
            ? Math.floor(modulo(position, 4) * 4)
            : -1;
        if (miniActive !== row.miniActive) {
          row.miniCells[row.miniActive]?.classList.remove("current");
          row.miniCells[miniActive]?.classList.add("current");
          row.miniActive = miniActive;
        }
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
}

// Sixteenth-note view of the actual loop, including loops crossing bar edges.
export function rhythmPreviewSteps(track, barStart) {
  return Array.from({ length: 16 }, (_, index) => {
    const step = (barStart + index / 4) * track.division;
    return Number.isInteger(step) ? track.steps[modulo(step, track.length)] : 0;
  });
}
