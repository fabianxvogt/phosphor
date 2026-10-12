import { tr } from "./i18n/index.mjs";
import {
  PANEL_NAMES,
  defaultPanelLayout,
  readPanelLayout,
  savePanelLayout,
  desktopLimits,
  resizeDesktop,
  resizePortrait,
  portraitLimits,
  panelGeometry,
} from "./panel-layout.mjs";
import { createChassisRenderer } from "./chassis-renderer.mjs";

export function setupPanelLayout() {
  const body = document.body;
  const panels = [
    ".monitor-panel",
    ".catalog",
    ".look-panel",
    ".performance-panel",
    ".rhythm-panel",
  ].map((selector) => document.querySelector(selector));
  if (panels.some((panel) => !panel)) return;
  let storage;
  try {
    storage = localStorage;
  } catch {
    /* Layout still works in a storage-blocked browser. */
  }
  let state = readPanelLayout(storage),
    geometry,
    drag,
    pending = 0,
    mode;
  const canvas = document.createElement("canvas");
  canvas.className = "chassis-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const paint = createChassisRenderer(canvas);
  if (!paint) return;
  body.prepend(canvas);
  panels.forEach((panel, i) => {
    panel.id ||= `panel-${PANEL_NAMES[i]}`;
  });
  const grips = document.createElement("div");
  grips.className = "panel-resizers";
  body.append(grips);
  const catalogFooter = document.createElement("div");
  catalogFooter.className = "chassis-footer chassis-catalog-footer";
  panels[1].after(catalogFooter);
  const footer = document.createElement("footer");
  footer.className = "chassis-footer chassis-project-footer";
  const github = document.createElement("a");
  github.href = "https://github.com/fabianxvogt/phosphor";
  github.target = "_blank";
  github.rel = "noopener noreferrer";
  github.textContent = "GitHub ↗";
  github.setAttribute("aria-label", tr("Phosphor on GitHub (new tab)"));
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = tr("Reset layout");
  reset.title = tr("Restore panel sizes for this layout");
  footer.append(github, reset);
  panels[4].after(footer);
  const filterHome = document.createComment("catalog filter position");
  const filterGroup = document.querySelector(".catalog-filters");
  filterGroup.before(filterHome);
  const filterBar = document.createElement("div");
  filterBar.className = "catalog-filter-bar";
  filterBar.id = "catalogFilterBar";
  filterHome.after(filterBar);
  const filterSelect = document.getElementById("catalogShow");
  filterSelect.removeAttribute("tabindex");
  filterSelect.classList.remove("sr-only");
  filterSelect.classList.add("catalog-filter-select");
  filterSelect.setAttribute("aria-label", tr("Filter looks"));
  filterBar.append(
    filterGroup,
    document.querySelector(".catalog-refine"),
    filterSelect,
  );
  const images = {};
  for (const [key, file] of [
    ["desktop", "shell"],
    ["portrait", "portrait"],
  ]) {
    const image = new Image();
    images[key] = image;
    image.onload = schedule;
    image.onerror = schedule;
    image.src = new URL(
      `./public/ui/biomechanical-page-${file}.png`,
      import.meta.url,
    ).href;
  }
  const rect = (element, bounds) => {
    for (const key of ["left", "top", "width", "height"])
      element.style[key] = `${bounds[key]}px`;
  };
  function save() {
    savePanelLayout(storage, state);
  }
  function current(key) {
    if (mode === "portrait")
      return geometry.gaps
        .slice(0, Number(key) + 1)
        .reduce((sum, gap) => sum + gap, 0);
    return key === "split"
      ? state.desktop.split
      : state.desktop.seams[{ upper: 0, left: 1, lower: 2 }[key]];
  }
  function limits(key) {
    if (mode === "desktop") return desktopLimits(key);
    return portraitLimits(geometry, Number(key));
  }
  function change(key, value) {
    if (mode === "desktop") resizeDesktop(state, key, value);
    else resizePortrait(state, geometry, Number(key), value);
    schedule();
  }
  function finish(cancel = false) {
    if (!drag) return;
    if (cancel) state = drag.before;
    drag = null;
    body.classList.remove("resizing-panels");
    if (!cancel) save();
    schedule();
  }
  function buildGrips() {
    const parts =
      mode === "desktop"
        ? [
            ["split", tr("Column width")],
            ["left", tr("Preview and Catalog heights")],
            ["upper", tr("Look and Performance heights")],
            ["lower", tr("Performance and Rhythm heights")],
          ]
        : PANEL_NAMES.slice(0, 4).map((name, i) => [
            String(i),
            tr("Panel heights: {first} / {second}", {
              first: tr(name[0].toUpperCase() + name.slice(1)),
              second: tr(
                PANEL_NAMES[i + 1][0].toUpperCase() +
                  PANEL_NAMES[i + 1].slice(1),
              ),
            }),
          ]);
    grips.replaceChildren(
      ...parts.map(([key, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "panel-resizer";
        button.dataset.resize = key;
        button.setAttribute("role", "separator");
        button.setAttribute("aria-label", label);
        button.setAttribute(
          "aria-orientation",
          key === "split" ? "vertical" : "horizontal",
        );
        button.setAttribute(
          "aria-controls",
          (mode === "portrait"
            ? panels.slice(Number(key), Number(key) + 2)
            : key === "left"
              ? panels.slice(0, 2)
              : key === "upper"
                ? panels.slice(2, 4)
                : key === "lower"
                  ? panels.slice(3, 5)
                  : panels
          )
            .map((panel) => panel.id)
            .join(" "),
        );
        button.title = tr(
          "{value1} · Drag or use arrow keys · Double-click to reset",
          { value1: label },
        );
        const dots = document.createElement("span");
        dots.textContent = key === "split" ? "⋮" : "•••";
        dots.setAttribute("aria-hidden", "true");
        button.append(dots);
        button.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || !event.isPrimary || drag) return;
          event.preventDefault();
          button.focus({ preventScroll: true });
          for (const menu of document.querySelectorAll(
            ".panel-floating-menu:popover-open",
          ))
            menu.hidePopover();
          drag = {
            key,
            x: event.clientX,
            y: event.pageY,
            start: current(key),
            before: structuredClone(state),
            scale: mode === "desktop" ? geometry.ys : 1,
          };
          button.setPointerCapture(event.pointerId);
          body.classList.add("resizing-panels");
        });
        button.addEventListener("pointermove", (event) => {
          if (!drag || drag.key !== key) return;
          const delta =
            key === "split"
              ? ((event.clientX - drag.x) / geometry.width) * 100
              : (event.pageY - drag.y) / drag.scale;
          change(key, drag.start + delta);
        });
        button.addEventListener("pointerup", () => finish());
        button.addEventListener("pointercancel", () => finish(true));
        button.addEventListener("lostpointercapture", () => finish());
        button.addEventListener("dblclick", () => {
          if (mode === "portrait") {
            const defaults = panelGeometry(
              geometry.width,
              geometry.height,
              defaultPanelLayout(),
              mode,
            );
            resizePortrait(
              state,
              geometry,
              Number(key),
              defaults.gaps
                .slice(0, Number(key) + 1)
                .reduce((sum, gap) => sum + gap, 0),
            );
          } else {
            const defaults = defaultPanelLayout().desktop;
            resizeDesktop(
              state,
              key,
              key === "split"
                ? defaults.split
                : defaults.seams[{ upper: 0, left: 1, lower: 2 }[key]],
            );
          }
          schedule();
          save();
        });
        button.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(true);
            return;
          }
          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          const step =
            (key === "split" ? 1 : mode === "desktop" ? 20 : 10) *
            (event.shiftKey ? 5 : 1);
          const [min, max] = limits(key);
          change(
            key,
            event.key === "Home"
              ? min
              : event.key === "End"
                ? max
                : current(key) +
                  (event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -step
                    : step),
          );
          save();
        });
        return button;
      }),
    );
  }
  function apply() {
    pending = 0;
    const width = document.documentElement.clientWidth,
      nextMode = matchMedia("(min-width: 1100px)").matches
        ? "desktop"
        : "portrait";
    if (mode !== nextMode) {
      finish();
      mode = nextMode;
      buildGrips();
    }
    const image = images[mode];
    if (!image.complete || !image.naturalWidth) {
      delete body.dataset.panelLayout;
      body.style.removeProperty("--chassis-height");
      body.style.removeProperty("--chassis-header-height");
      panels.forEach((panel) => {
        for (const key of ["left", "top", "width", "height"])
          panel.style.removeProperty(key);
      });
      if (filterBar.parentNode !== filterHome.parentNode)
        filterHome.after(filterBar);
      return;
    }
    geometry = panelGeometry(width, innerHeight, state, mode);
    body.dataset.panelLayout = mode;
    body.style.setProperty("--chassis-height", `${geometry.height}px`);
    body.style.setProperty(
      "--chassis-header-height",
      `${geometry.headerHeight}px`,
    );
    panels.forEach((panel, i) => {
      rect(panel, geometry.panels[i]);
      panel.style.setProperty(
        "--panel-height",
        `${geometry.panels[i].height}px`,
      );
      panel.classList.toggle("panel-narrow", geometry.panels[i].width < 370);
      panel.classList.toggle("panel-short", geometry.panels[i].height < 190);
    });
    if (mode === "desktop") {
      if (filterBar.parentNode !== catalogFooter)
        catalogFooter.append(filterBar);
      rect(catalogFooter, geometry.footer[0]);
    } else if (filterBar.parentNode !== filterHome.parentNode)
      filterHome.after(filterBar);
    rect(footer, geometry.footer[1]);
    rect(canvas, { left: 0, top: 0, width, height: geometry.height });
    paint(image, geometry);
    for (const button of grips.children) {
      const key = button.dataset.resize,
        [x, y] = geometry.handles[key],
        [min, max] = limits(key);
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.setAttribute("aria-valuemin", String(Math.round(min)));
      button.setAttribute("aria-valuemax", String(Math.round(max)));
      button.setAttribute("aria-valuenow", String(Math.round(current(key))));
      button.setAttribute(
        "aria-valuetext",
        key === "split"
          ? tr("{value1}% left column", { value1: Math.round(current(key)) })
          : mode === "portrait"
            ? tr("{value1} pixels", {
                value1: Math.round(geometry.panels[key].height),
              })
            : tr("{value1}% down the frame", {
                value1: Math.round((current(key) / 1924) * 100),
              }),
      );
    }
  }
  function schedule() {
    if (!pending) pending = requestAnimationFrame(apply);
  }
  reset.addEventListener("click", () => {
    finish(true);
    state[mode] = defaultPanelLayout()[mode];
    schedule();
    save();
  });
  addEventListener("resize", schedule);
  addEventListener("pagehide", () => finish());
  new ResizeObserver(schedule).observe(document.documentElement);
  schedule();
}
