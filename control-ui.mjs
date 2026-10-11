// Presentation-only navigation. Playback and saved show state stay in control.mjs.
export function setupControlUI() {
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
  document.getElementById("editSetName").addEventListener("click", () => {
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
