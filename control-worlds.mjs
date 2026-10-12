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
      ariaLabel: "Catalog view",
    });
    this.looksTab = button("Looks", () => this.setView(false));
    this.worldsTab = button("Worlds", () => this.setView(true));
    tabs.append(this.looksTab, this.worldsTab);
    document.querySelector(".catalog-heading").append(tabs);
    this.list = node("div", {
      className: "world-list",
      id: "worldList",
      role: "list",
      ariaLabel: "Curated worlds",
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
      textContent:
        "Prepare here, then start on the next bar. Look keys still play the catalog.",
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
      ws.active,
      ws.prepared,
      ws.queued,
      !!ws.transition,
      status.disabled,
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      const previous = this.renderedPrepared;
      this.render(worlds, status);
      if (ws.prepared && previous !== ws.prepared.id)
        this.worldView.scrollTop = 0;
      this.renderedPrepared = ws.prepared?.id;
    }
    if (this.progress) {
      this.progress.value = ws.transition?.progress ?? 0;
      this.progress.ariaValueText = `${Math.round(this.progress.value * 100)} percent`;
    }
    if (this.liveLabel && ws.queued)
      this.liveLabel.textContent = `Next bar · ${Math.ceil(status.pending?.beats ?? 0)} beats`;
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
        const prepare = button(running ? "Prepare again" : "Prepare", () =>
          this.act({ type: "world-prepare", id: world.id }),
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
                ? "LIVE WORLD"
                : selected
                  ? "PREPARED"
                  : "LIVING WORLD",
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
          textContent: "This show contains no worlds.",
        }),
      );
    this.dock.replaceChildren();
    this.live.replaceChildren();
    this.developments.replaceChildren();
    this.live.hidden = !active && !prepared;
    this.developments.hidden = !active;
    this.progress = null;
    this.liveLabel = null;
    if (active) {
      const state = active.states[ws.active.state];
      this.live.append(
        node("span", {
          className: "world-live-name",
          textContent: `${active.name} · ${state?.name ?? ""}`,
        }),
      );
      const leave = button("Free play", () =>
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
        ariaLabel: "World development",
      });
      active.states.forEach((state, i) => {
        const b = button(state.name, () =>
          this.act({ type: "world-develop", state: i }),
        );
        b.ariaPressed = String(i === ws.active.state);
        b.disabled = busy || i === ws.active.state;
        choices.append(b);
      });
      this.developments.append(choices);
    }
    if (ws.transition) {
      this.progress = node("progress", {
        max: 1,
        value: ws.transition.progress,
        ariaLabel: "World transition",
      });
      this.live.append(this.progress);
      this.dock.append(
        node("p", {
          className: "note",
          textContent:
            "Growing into the next development. Space pauses the entire transition.",
        }),
      );
    } else if (prepared) {
      const change = (patch) =>
        this.act({ type: "world-prepare", ...ws.prepared, ...patch });
      const state = node("select", {
        ariaLabel: "Starting development",
        disabled: ws.queued,
      });
      prepared.states.forEach((s, i) =>
        state.append(node("option", { value: String(i), textContent: s.name })),
      );
      state.value = String(ws.prepared.state);
      state.onchange = () => change({ state: Number(state.value) });
      const duration = node("select", {
        ariaLabel: "World transition duration",
        disabled: ws.queued,
      });
      [4, 8].forEach((n) =>
        duration.append(
          node("option", { value: String(n), textContent: `${n} bars` }),
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
        ws.queued ? "Waiting for next bar…" : "Start transition",
        () => this.act({ type: "world-start" }),
      );
      start.className = "accent";
      start.disabled = busy;
      const cancel = button("Cancel", () => this.act({ type: "world-cancel" }));
      this.dock.append(
        node(
          "div",
          { className: "world-dock-heading" },
          node("strong", { textContent: `${prepared.name} · ready` }),
          cancel,
        ),
        node(
          "div",
          { className: "world-transition-controls" },
          state,
          duration,
          node("label", {}, carry, "Carry traces"),
          start,
        ),
        node("p", {
          className: "note",
          textContent:
            ws.prepared.compatible && ws.prepared.carry
              ? "Grown filaments and chemical concentrations continue in the new world."
              : "A soft crossfade introduces a freshly grown world.",
        }),
      );
      this.liveLabel = button(
        ws.queued ? "Next bar…" : `${prepared.name} ready → Start`,
        () => this.act({ type: "world-start" }),
      );
      this.liveLabel.disabled = busy;
      this.live.append(this.liveLabel);
    } else
      this.dock.append(
        node("p", {
          className: "note",
          textContent: active
            ? "Autopilot develops this world. Only you can start a different one."
            : "Choose a world to prepare. The current visual keeps playing until you start.",
        }),
      );
  }
}
