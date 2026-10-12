import { setupPanelLayout } from "./control-layout.mjs";
// Presentation-only navigation. Playback and saved show state stay in control.mjs.
export function setupControlUI() {
  setupPanelLayout();
  setupPanelMenus();
  for (const [popupId, anchorId] of [
    ["tempoSettings", "previewTempo"],
    ["resolutionSettings", "previewResolution"],
  ]) {
    const popup = document.getElementById(popupId);
    const anchor = document.getElementById(anchorId);
    const position = () => {
      if (!popup.matches(":popover-open")) return;
      const rect = anchor.getBoundingClientRect();
      const box = popup.getBoundingClientRect();
      popup.style.left = `${Math.max(12, Math.min(rect.right - box.width, innerWidth - box.width - 12))}px`;
      popup.style.top = `${Math.max(12, Math.min(rect.top - box.height - 12, innerHeight - box.height - 12))}px`;
    };
    popup.addEventListener("toggle", position);
    popup.addEventListener("keydown", (event) => event.stopPropagation());
    addEventListener("resize", position);
    addEventListener("scroll", position, true);
  }
  const rhythmRoot = document.getElementById("rhythmControls");
  for (const [id, global] of [
    ["rhythmFamilyView", false],
    ["rhythmGlobalView", true],
  ]) {
    document.getElementById(id).addEventListener("click", () => {
      rhythmRoot.classList.toggle("rhythm-show-global", global);
      document.getElementById("rhythmFamilyView").ariaPressed = String(!global);
      document.getElementById("rhythmGlobalView").ariaPressed = String(global);
      const settings = document.getElementById("rhythmSettings");
      if (settings) settings.dataset.scope = global ? "global" : "family";
    });
  }
  document.getElementById("previewFit").addEventListener("click", (event) => {
    const fit = event.currentTarget.ariaPressed !== "true";
    event.currentTarget.ariaPressed = String(fit);
    document.querySelector(".preview").classList.toggle("preview-fit", fit);
  });
  const setupDialog = document.getElementById("setupDialog");
  document
    .getElementById("closeSetup")
    .addEventListener("click", () => setupDialog.close());
  setupDialog.addEventListener("click", (event) => {
    if (event.target !== setupDialog) return;
    const box = setupDialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      setupDialog.close();
  });
  const tabs = [...document.querySelectorAll('.setup-tabs [role="tab"]')];
  function selectTab(tab, focus = false) {
    for (const item of tabs) {
      const selected = item === tab;
      item.ariaSelected = String(selected);
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden =
        !selected;
    }
    if (focus) tab.focus();
  }
  for (const tab of tabs) {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      const index = tabs.indexOf(tab);
      const target = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      selectTab(tabs[target], true);
    });
  }
  for (const button of document.querySelectorAll("[data-setup-open]"))
    button.addEventListener("click", () => {
      setupDialog.showModal();
      selectTab(
        document.getElementById(`tab-${button.dataset.setupOpen}`),
        true,
      );
    });
  document.getElementById("editSetName").addEventListener("click", () => {
    setupDialog.showModal();
    selectTab(document.getElementById("tab-set"));
    const input = document.querySelector("#setFields input");
    input?.focus();
    input?.select();
  });
  const filter = document.getElementById("catalogShow");
  const filters = [...document.querySelectorAll("[data-catalog-filter]")];
  const syncFilters = () => {
    for (const button of filters)
      button.ariaPressed = String(
        button.dataset.catalogFilter === filter.value,
      );
  };
  for (const button of filters)
    button.addEventListener("click", () => {
      filter.value = button.dataset.catalogFilter;
      filter.dispatchEvent(new Event("change"));
    });
  filter.addEventListener("change", syncFilters);
  syncFilters();
  // Native activation of buttons/disclosures must not also tap or nudge the show.
  document.addEventListener("keydown", (event) => {
    if (
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      (event.key === " " || event.key === "Enter") &&
      event.target.closest(
        "button, summary, a, input[type=checkbox], input[type=file]",
      )
    )
      event.stopPropagation();
    if (
      event.target.matches('input[type="range"]') &&
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(event.key)
    )
      event.stopPropagation();
  });
}

// Keep disclosures above scrollable panels while preserving their DOM ancestry
// (settings locks and existing event handlers depend on it).
function setupPanelMenus() {
  for (const popup of document.querySelectorAll(
    ".panel-menu-body, .performance-options > .detail-body, .catalog-refine-body",
  )) {
    const details = popup.parentElement;
    const anchor = details.querySelector("summary");
    popup.popover = "auto";
    popup.classList.add("panel-floating-menu");
    const position = () => {
      if (!popup.matches(":popover-open")) return;
      const scale =
        popup.getBoundingClientRect().width / popup.offsetWidth || 1;
      popup.style.maxWidth = `${(innerWidth - 24) / scale}px`;
      popup.style.maxHeight = `${(innerHeight - 24) / scale}px`;
      const rect = anchor.getBoundingClientRect();
      const box = popup.getBoundingClientRect();
      const above = rect.bottom + 8 + box.height > innerHeight - 12;
      const x = Math.max(
        12,
        Math.min(rect.right - box.width, innerWidth - box.width - 12),
      );
      const y = Math.max(
        12,
        Math.min(
          above ? rect.top - box.height - 8 : rect.bottom + 8,
          innerHeight - box.height - 12,
        ),
      );
      popup.style.left = `${x / scale}px`;
      popup.style.top = `${y / scale}px`;
    };
    details.addEventListener("toggle", () => {
      if (details.open) {
        popup.showPopover();
        position();
      } else popup.hidePopover();
    });
    popup.addEventListener("toggle", (event) => {
      if (event.newState === "closed") details.open = false;
    });
    popup.addEventListener("keydown", (event) => event.stopPropagation());
    addEventListener("resize", position);
    addEventListener("scroll", position, true);
  }
}

// Only validated palette values become CSS colours. Repeated status messages
// do not rewrite styles; the skin keeps text and surface contrast independent.
export function syncControlPalette(palette) {
  if (!palette) return;
  for (const key of ["primary", "secondary"]) {
    const color = palette[key];
    if (!/^#[0-9a-f]{6}$/i.test(color ?? "")) continue;
    const property = `--scene-${key}`;
    if (document.documentElement.style.getPropertyValue(property) !== color)
      document.documentElement.style.setProperty(property, color);
  }
}
