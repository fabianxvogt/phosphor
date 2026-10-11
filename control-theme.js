// Apply the saved appearance before the stylesheet paints; never part of a set.
(() => {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  let preference = null;
  try {
    const saved = localStorage.getItem("phosphor-theme");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {}
  const apply = () => {
    const theme = preference ?? (media.matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === "light" ? "#f1f0ec" : "#191b19";
    const button = document.getElementById("themeToggle");
    if (button) {
      button.ariaLabel = `Switch to ${theme === "light" ? "dark" : "light"} mode`;
      button.title = button.ariaLabel;
    }
  };
  apply();
  media.addEventListener("change", apply);
  window.addEventListener("storage", (event) => {
    if (event.key !== "phosphor-theme" && event.key !== null) return;
    preference = ["light", "dark"].includes(event.newValue)
      ? event.newValue
      : null;
    apply();
  });
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themeToggle").addEventListener("click", () => {
      preference =
        document.documentElement.dataset.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem("phosphor-theme", preference);
      } catch {}
      apply();
    });
  });
})();
