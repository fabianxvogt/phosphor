import { worldPresentation, WORLD_DURATIONS } from "./worlds.mjs";
import { tr } from "./i18n/index.mjs";
// A small remote for Show's world commands. No playback state is owned here:
// the same controls follow local preview and the Stage's status messages.
const node = (tag, props = {}, ...children) => {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children);
  return el;
};
const button = (label, action) => {
  const el = node("button", { type: "button", textContent: label });
  el.addEventListener("click", action);
  return el;
};
export class WorldPanel {
  constructor({ getSet, act, preview }) {
    this.getSet = getSet;
    this.act = act;
    this.preview = preview;
    this.status = null;
    this.signature = "";
    const catalog = document.querySelector(".catalog");
    const tabs = node("div", {
      className: "world-tabs",
      role: "group",
      ariaLabel: tr("Catalog view"),
    });
    this.looksTab = button(tr("Looks"), () => this.setView(false));
    this.worldsTab = button(tr("Worlds"), () => this.setView(true));
    this.worldsTab.append(
      node("span", { className: "world-beta", textContent: tr("Beta") }),
    );
    tabs.append(this.looksTab, this.worldsTab);
    document.querySelector(".catalog-heading").append(tabs);
    this.list = node("div", {
      className: "world-list",
      id: "worldList",
      role: "list",
      ariaLabel: tr("Curated worlds"),
    });
    this.dock = node("div", { className: "world-dock" });
    this.worldView = node(
      "div",
      { className: "world-view", hidden: true },
      this.dock,
      this.list,
    );
    document.getElementById("catalogList").after(this.worldView);
    this.footer = node("span", {
      className: "world-footer-note",
      hidden: true,
      textContent: tr(
        "Prepare here, then start on the next bar. Look keys still play the catalog.",
      ),
    });
    catalog.querySelector(".catalog-footer").append(this.footer);
    this.live = node("div", { className: "world-live", hidden: true });
    document.querySelector(".preview").append(this.live);
    this.developments = node("div", {
      className: "world-developments",
      hidden: true,
    });
    document.querySelector(".look-heading").before(this.developments);
    this.setView(false);
  }
  setView(worlds) {
    document.body.dataset.catalogMode = worlds ? "worlds" : "looks";
    this.looksTab.ariaPressed = String(!worlds);
    this.worldsTab.ariaPressed = String(worlds);
    this.worldView.hidden = !worlds;
    this.footer.hidden = !worlds;
  }
  update(status) {
    this.status = status?.worlds;
    const ws = this.status;
    if (!ws) return;
    const worlds = this.getSet().worlds ?? [];
    const signature = JSON.stringify([
      worlds,
      ws.active && {
        id: ws.active.id,
        state: ws.active.state,
        development: !!ws.active.development,
      },
      ws.bars,
      ws.tour?.on,
      ws.tour?.active,
      ws.prepared,
      ws.queued,
      !!ws.transition,
      status.disabled,
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      const previous = this.renderedPrepared;
      this.render(
        worlds.map((world) => worldPresentation(world)),
        status,
      );
      if (ws.prepared && previous !== ws.prepared.id)
        this.worldView.scrollTop = 0;
      this.renderedPrepared = ws.prepared?.id;
    }
    this.developmentButtons?.forEach((b, i) => {
      const selected = ws.active.development
        ? Math.abs(
            ws.active.development.value - ws.active.development.positions[i],
          ) < 0.001
        : i === ws.active.state;
      b.ariaPressed = String(selected);
      b.disabled = !!ws.queued || !!ws.transition || selected;
    });
    if (this.developmentDuration)
      this.developmentDuration.value = String(ws.bars);
    if (this.tourNote) this.tourNote.textContent = this.tourText(ws);
    if (this.developmentRange && ws.active?.development) {
      const d = ws.active.development;
      if (document.activeElement !== this.developmentRange || !this.dragging)
        this.developmentRange.value = d.value;
      this.paintDevelopment();
      this.developmentRange.disabled =
        !!ws.transition && ws.transition.kind !== "morph";
    }
    if (this.progress) {
      this.progress.value = ws.transition?.progress ?? 0;
      this.progress.ariaValueText = tr("{value1} percent", {
        value1: Math.round(this.progress.value * 100),
      });
    }
    if (this.liveLabel && ws.queued)
      this.liveLabel.textContent = tr("Next bar · {value1} beats", {
        value1: Math.ceil(status.pending?.beats ?? 0),
      });
  }
  tourText(ws) {
    const tour = ws.tour;
    if (!tour?.on) return tr("Autopilot stays in this world.");
    if (!tour.active) return tr("The tour waits while you play.");
    if (tour.nextIn === null) return "";
    const next = tour.next
      ? this.getSet().worlds?.find((w) => w.id === tour.next)
      : null;
    return next
      ? tr("Next world in {value1} bars: {value2}", {
          value1: tour.nextIn,
          value2: worldPresentation(next).name,
        })
      : tr("Next development in {value1} bars", { value1: tour.nextIn });
  }
  paintDevelopment() {
    const input = this.developmentRange;
    const x =
      (Number(input.value) - Number(input.min)) /
      (Number(input.max) - Number(input.min));
    input.style.setProperty(
      "--fill-center",
      `calc(${x * 100}% + ${29 - 42 * x}px)`,
    );
    input.style.setProperty("--fill", `${x * 100}%`);
    this.developmentOutput.value = tr("{value1} percent", {
      value1: Math.round(x * 100),
    });
  }
  renderDevelopment(active, ws) {
    this.developments.replaceChildren();
    this.developmentRange = null;
    this.developmentDuration = null;
    this.developmentButtons = [];
    this.dragging = false;
    if (!active) return;
    const busy = ws.queued || !!ws.transition;
    const leave = button(tr("Free play"), () =>
      this.act({ type: "world-leave" }),
    );
    this.developments.append(
      node(
        "div",
        { className: "world-development-title" },
        node("span", { textContent: active.name }),
        leave,
      ),
    );
    const choices = node("div", {
      className: "world-state-choices",
      role: "group",
      ariaLabel: tr("World development"),
    });
    active.states.forEach((state, i) => {
      const b = button(state.name, () =>
        this.act({ type: "world-develop", state: i }),
      );
      b.ariaPressed = String(i === ws.active.state);
      b.disabled = busy || i === ws.active.state;
      choices.append(b);
      this.developmentButtons.push(b);
    });
    this.developments.append(choices);
    if (ws.active.development) {
      const d = ws.active.development;
      const duration = node("select", {
        ariaLabel: tr("Development duration"),
      });
      WORLD_DURATIONS.forEach((bars) =>
        duration.append(
          node("option", {
            value: String(bars),
            textContent: tr("{value1} bars", { value1: bars }),
          }),
        ),
      );
      duration.value = String(ws.bars);
      duration.onchange = () =>
        this.act({ type: "world-duration", bars: Number(duration.value) });
      choices.append(duration);
      this.developmentDuration = duration;
      this.developmentRange = node("input", {
        id: "worldDevelopment",
        type: "range",
        min: String(d.min),
        max: String(d.max),
        step: "0.001",
        value: String(d.value),
        ariaLabel: tr("Development"),
      });
      this.developmentOutput = node("output", {
        htmlFor: "worldDevelopment",
      });
      this.developmentRange.onpointerdown = (event) => {
        this.dragging = true;
        this.developmentRange.setPointerCapture(event.pointerId);
      };
      this.developmentRange.onpointerup =
        this.developmentRange.onpointercancel =
        this.developmentRange.onblur =
          () => {
            this.dragging = false;
          };
      this.developmentRange.oninput = () => {
        this.paintDevelopment();
        this.act({
          type: "world-seek",
          value: Number(this.developmentRange.value),
        });
      };
      this.developments.append(
        node(
          "div",
          { className: "world-development-fader" },
          node("label", {
            htmlFor: "worldDevelopment",
            textContent: tr("Development"),
          }),
          this.developmentRange,
          this.developmentOutput,
        ),
      );
      this.developments.append(
        node("p", {
          className: "world-development-hint",
          textContent: tr(
            "Move freely, or choose a state for a timed transformation. Centres and branches stay connected.",
          ),
        }),
      );
      this.paintDevelopment();
    }
  }
  render(worlds, status) {
    const ws = this.status;
    const active = worlds.find((w) => w.id === ws.active?.id);
    const prepared = worlds.find((w) => w.id === ws.prepared?.id);
    const busy = ws.queued || !!ws.transition;
    this.list.replaceChildren(
      ...worlds.map((world) => {
        const selected = world.id === prepared?.id;
        const running = world.id === active?.id;
        const img = node("img", {
          src: this.preview(world.states[0].look) ?? "",
          alt: "",
          loading: "lazy",
        });
        const prepare = button(
          running ? tr("Prepare again") : tr("Prepare"),
          () => this.act({ type: "world-prepare", id: world.id }),
        );
        prepare.disabled =
          busy || status.disabled?.includes(world.states[0].look.split(":")[0]);
        const card = node(
          "article",
          {
            className: `world-card${selected ? " prepared" : ""}${running ? " active" : ""}`,
            role: "listitem",
          },
          img,
          node(
            "div",
            { className: "world-card-body" },
            node("span", {
              className: "world-eyebrow",
              textContent: running
                ? tr("LIVE WORLD")
                : selected
                  ? tr("PREPARED")
                  : tr("LIVING WORLD"),
            }),
            node("h3", { textContent: world.name }),
            node("p", { textContent: world.description }),
            node(
              "div",
              { className: "world-card-bottom" },
              node("span", {
                textContent: world.states.map((s) => s.name).join(" · "),
              }),
              prepare,
            ),
          ),
        );
        return card;
      }),
    );
    if (!worlds.length)
      this.list.append(
        node("p", {
          className: "note",
          textContent: tr("This show contains no worlds."),
        }),
      );
    this.dock.replaceChildren();
    this.live.replaceChildren();
    this.live.hidden = !active && !prepared;
    this.developments.hidden = !active;
    this.progress = null;
    this.liveLabel = null;
    this.tourNote = null;
    if (active) {
      const on = ws.tour?.on !== false;
      const toggle = button(tr("World tour"), () =>
        this.act({ type: "world-tour", on: !on }),
      );
      toggle.className = "world-tour-toggle";
      toggle.ariaPressed = String(on);
      toggle.title = tr(
        "Autopilot plays every development of this world, then the next world.",
      );
      this.tourNote = node("span", {
        className: "world-tour-note",
        textContent: this.tourText(ws),
      });
      this.dock.append(
        node("div", { className: "world-tour" }, toggle, this.tourNote),
      );
    }
    if (active) {
      const state = active.states[ws.active.state];
      this.live.append(
        node("span", {
          className: "world-live-name",
          textContent: `${active.name} · ${state?.name ?? ""}`,
        }),
      );
    }
    // Transport status must never detach the native range under a held pointer.
    const developmentSignature = JSON.stringify([
      active,
      !!ws.active?.development,
    ]);
    if (developmentSignature !== this.developmentSignature) {
      this.developmentSignature = developmentSignature;
      this.renderDevelopment(active, ws);
    }

    if (ws.transition) {
      this.progress = node("progress", {
        max: 1,
        value: ws.transition.progress,
        ariaLabel: tr("World transition"),
      });
      this.live.append(this.progress);
      this.dock.append(
        node("p", {
          className: "note",
          textContent: tr(
            "Growing into the next development. Space pauses the entire transition.",
          ),
        }),
      );
    } else if (prepared) {
      const change = (patch) =>
        this.act({ type: "world-prepare", ...ws.prepared, ...patch });
      const state = node("select", {
        ariaLabel: tr("Starting development"),
        disabled: ws.queued,
      });
      prepared.states.forEach((s, i) =>
        state.append(node("option", { value: String(i), textContent: s.name })),
      );
      state.value = String(ws.prepared.state);
      state.onchange = () => change({ state: Number(state.value) });
      const duration = node("select", {
        ariaLabel: tr("World transition duration"),
        disabled: ws.queued,
      });
      WORLD_DURATIONS.forEach((n) =>
        duration.append(
          node("option", {
            value: String(n),
            textContent: tr("{value1} bars", { value1: n }),
          }),
        ),
      );
      duration.value = String(ws.prepared.bars);
      duration.onchange = () => change({ bars: Number(duration.value) });
      const carry = node("input", {
        type: "checkbox",
        checked: ws.prepared.carry && ws.prepared.compatible,
        disabled: ws.queued || !ws.prepared.compatible,
      });
      carry.onchange = () => change({ carry: carry.checked });
      const start = button(
        ws.queued ? tr("Waiting for next bar…") : tr("Start transition"),
        () => this.act({ type: "world-start" }),
      );
      start.className = "accent";
      start.disabled = busy;
      const cancel = button(tr("Cancel"), () =>
        this.act({ type: "world-cancel" }),
      );
      this.dock.append(
        node(
          "div",
          { className: "world-dock-heading" },
          node("strong", {
            textContent: tr("{value1} · ready", { value1: prepared.name }),
          }),
          cancel,
        ),
        node(
          "div",
          { className: "world-transition-controls" },
          state,
          duration,
          node("label", {}, carry, tr("Carry traces")),
          start,
        ),
        node("p", {
          className: "note",
          textContent:
            ws.prepared.compatible && ws.prepared.carry
              ? tr(
                  "Grown filaments and chemical concentrations continue in the new world.",
                )
              : tr("A soft crossfade introduces a freshly grown world."),
        }),
      );
      this.liveLabel = button(
        ws.queued
          ? tr("Next bar…")
          : tr("{value1} ready → Start", { value1: prepared.name }),
        () => this.act({ type: "world-start" }),
      );
      this.liveLabel.disabled = busy;
      this.live.append(this.liveLabel);
    } else
      this.dock.append(
        node("p", {
          className: "note",
          textContent: active
            ? ws.tour?.on !== false
              ? tr(
                  "Autopilot plays every development, then moves on to the next world.",
                )
              : tr(
                  "Autopilot develops this world. Only you can start a different one.",
                )
            : tr(
                "Choose a world to prepare. The current visual keeps playing until you start.",
              ),
        }),
      );
  }
}
