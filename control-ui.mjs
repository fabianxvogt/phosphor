// Presentation-only navigation. Playback and saved show state stay in control.mjs.
export function setupControlUI() {
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
