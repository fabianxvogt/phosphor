import { tr, translateDocument } from "./i18n/index.mjs";
// HSV editing preserves hue while saturation/value pass through white or black.
export function hexToHsv(hex) {
  const [r, g, b] = hex
    .match(/[\da-f]{2}/gi)
    .map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d)
    h =
      (max === r
        ? (g - b) / d
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4) * 60;
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max };
}
export function hsvToHex({ h, s, v }) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60)];
  return (
    "#" +
    rgb
      .map((n) =>
        Math.round((n + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export class PalettePicker {
  constructor({ root, palettes, value, onChange, isLocked = () => false }) {
    this.palettes = palettes;
    this.onChange = onChange;
    this.isLocked = isLocked;
    this.key = "primary";
    root.classList.add("palette-control");
    root.innerHTML =
      '<span data-i18n="Palette">Palette</span><div class="palette-swatches"></div>';
    this.buttons = {};
    const names = {
      primary: tr("Edit primary colour"),
      secondary: tr("Edit secondary colour"),
      accent: tr("Edit accent colour"),
    };
    for (const key of Object.keys(names)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-swatch";
      button.ariaLabel = names[key];
      button.ariaHasPopup = "dialog";
      button.onclick = () => {
        if (isLocked()) return;
        this.key = key;
        this.hsv = hexToHsv(this.colors[key]);
        this.paint();
        this.popover.showPopover();
        const rect = button.getBoundingClientRect();
        this.popover.style.left = `${Math.max(12, Math.min(innerWidth - 332, rect.left - 30))}px`;
        const height = this.popover.getBoundingClientRect().height;
        this.popover.style.top = `${Math.max(12, Math.min(innerHeight - height - 12, rect.bottom + 12))}px`;
        this.pad.focus({ preventScroll: true });
      };
      this.buttons[key] = button;
      root.lastElementChild.append(button);
    }
    this.popover = document.createElement("div");
    this.popover.className = "color-popover settings-controls";
    this.popover.setAttribute("popover", "auto");
    this.popover.role = "dialog";
    this.popover.ariaLabel = tr("Show palette colour picker");
    this.popover.innerHTML = `
      <div class="color-heading"><strong></strong><button type="button" class="color-close" aria-label="Close colour picker" data-i18n-aria-label="Close colour picker">×</button></div>
      <div class="color-sv" tabindex="0" role="group" aria-label="Saturation and brightness. Arrow keys adjust; Shift makes larger changes." data-i18n-aria-label="Saturation and brightness. Arrow keys adjust; Shift makes larger changes."><i></i></div>
      <label class="color-hue-label"><span data-i18n="Hue">Hue</span><input class="color-hue" type="range" min="0" max="360" step="1" aria-label="Colour hue" data-i18n-aria-label="Colour hue"></label>
      <div class="color-values"><label><span data-i18n="Hex">Hex</span><input class="color-hex" type="text" maxlength="7" spellcheck="false" aria-label="Hex colour" data-i18n-aria-label="Hex colour"></label><label><span data-i18n="Saturation">Saturation</span><input class="color-s" type="number" min="0" max="100" aria-label="Colour saturation" data-i18n-aria-label="Colour saturation"></label><label><span data-i18n="Brightness">Brightness</span><input class="color-v" type="number" min="0" max="100" aria-label="Colour brightness" data-i18n-aria-label="Colour brightness"></label></div>
      <p class="color-note" data-i18n="Shared by the preview, catalog and rhythm.">Shared by the preview, catalog and rhythm.</p>
      <details class="color-presets"><summary data-i18n="Palette presets">Palette presets</summary><div></div></details>`;
    document.body.append(this.popover);
    translateDocument(root);
    translateDocument(this.popover);
    const q = (selector) => this.popover.querySelector(selector);
    this.pad = q(".color-sv");
    this.hue = q(".color-hue");
    this.hex = q(".color-hex");
    this.saturation = q(".color-s");
    this.brightness = q(".color-v");
    q(".color-close").onclick = () => {
      this.popover.hidePopover();
      this.buttons[this.key].focus();
    };
    const point = (event) => {
      if (isLocked()) return;
      const rect = this.pad.getBoundingClientRect();
      this.hsv.s = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
      this.hsv.v =
        1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      this.publish();
    };
    this.pad.onpointerdown = (event) => {
      if (event.button !== 0 || isLocked()) return;
      event.preventDefault();
      this.pad.focus();
      this.pad.setPointerCapture(event.pointerId);
      point(event);
    };
    this.pad.onpointermove = (event) => {
      if (this.pad.hasPointerCapture(event.pointerId)) point(event);
    };
    this.pad.onpointerup = (event) => {
      if (this.pad.hasPointerCapture(event.pointerId))
        this.pad.releasePointerCapture(event.pointerId);
    };
    this.pad.onkeydown = (event) => {
      if (
        isLocked() ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 0.1 : 0.01;
      if (event.key === "ArrowLeft") this.hsv.s -= step;
      if (event.key === "ArrowRight") this.hsv.s += step;
      if (event.key === "ArrowUp") this.hsv.v += step;
      if (event.key === "ArrowDown") this.hsv.v -= step;
      this.hsv.s = Math.max(0, Math.min(1, this.hsv.s));
      this.hsv.v = Math.max(0, Math.min(1, this.hsv.v));
      this.publish();
    };
    this.hue.oninput = () => {
      this.hsv.h = Number(this.hue.value);
      this.publish();
    };
    for (const [input, key] of [
      [this.saturation, "s"],
      [this.brightness, "v"],
    ]) {
      input.oninput = () => {
        if (input.value === "" || !input.validity.valid) return;
        this.hsv[key] = Number(input.value) / 100;
        this.publish();
      };
      input.onblur = () => this.paint();
    }
    this.hex.oninput = () => {
      const hex = this.hex.value.startsWith("#")
        ? this.hex.value
        : "#" + this.hex.value;
      this.hex.ariaInvalid = String(!/^#[\da-f]{6}$/i.test(hex));
      if (this.hex.ariaInvalid === "true") return;
      this.hsv = hexToHsv(hex);
      this.publish();
    };
    this.hex.onblur = () => {
      this.hex.ariaInvalid = "false";
      this.paint();
    };
    for (const palette of palettes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-preset";
      button.ariaLabel = tr("Use {value1} palette", {
        value1: tr(palette.name),
      });
      button.append(document.createTextNode(tr(palette.name)));
      for (const color of Object.values(palette.colors)) {
        const dot = document.createElement("i");
        dot.style.background = color;
        button.append(dot);
      }
      button.onclick = () => {
        if (!isLocked()) {
          this.setValue(palette.id);
          onChange(palette.id);
        }
      };
      q(".color-presets > div").append(button);
    }
    this.setValue(value);
  }
  setValue(value) {
    const colors =
      typeof value === "string"
        ? this.palettes.find((p) => p.id === value)?.colors
        : value;
    if (!colors || JSON.stringify(colors) === JSON.stringify(this.colors))
      return;
    this.colors = { ...colors };
    this.hsv = hexToHsv(this.colors[this.key]);
    this.paint();
  }
  publish() {
    if (this.isLocked()) return;
    this.colors[this.key] = hsvToHex(this.hsv);
    this.paint();
    this.onChange({ ...this.colors });
  }
  paint() {
    for (const [key, button] of Object.entries(this.buttons)) {
      button.style.setProperty("--swatch", this.colors[key]);
      button.title = `${tr("palette." + key)}: ${this.colors[key]}`;
    }
    this.popover.querySelector("strong").textContent = tr("{value1} colour", {
      value1: tr("palette." + this.key),
    });
    this.pad.style.backgroundColor = hsvToHex({ h: this.hsv.h, s: 1, v: 1 });
    const marker = this.pad.firstElementChild;
    marker.style.left = `${this.hsv.s * 100}%`;
    marker.style.top = `${(1 - this.hsv.v) * 100}%`;
    this.pad.ariaDescription = tr(
      "{value1}% saturation, {value2}% brightness",
      {
        value1: Math.round(this.hsv.s * 100),
        value2: Math.round(this.hsv.v * 100),
      },
    );
    this.hue.value = this.hsv.h;
    if (document.activeElement !== this.hex)
      this.hex.value = this.colors[this.key].toUpperCase();
    if (document.activeElement !== this.saturation)
      this.saturation.value = Math.round(this.hsv.s * 100);
    if (document.activeElement !== this.brightness)
      this.brightness.value = Math.round(this.hsv.v * 100);
  }
}
