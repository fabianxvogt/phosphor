import { breedLineage, selectNode } from "./evolution.mjs";
export function manualOverrideUI(transport, render) {
  if (transport.manual()) render();
}
export function selectedDevice(previous, devices) {
  return devices.some((device) => device.id === previous) ? previous : "";
}
export function numberValue(value) {
  return typeof value === "string" && !value.trim() ? NaN : Number(value);
}
export function pruneLocks(locks, scene) {
  for (const key of locks)
    if (!scene?.schema.some((field) => field.key === key)) locks.delete(key);
  return locks;
}
export function breedSiblings(lineage, scene, seeds, options) {
  const parent = lineage.selectedId;
  let next = lineage;
  for (const seed of seeds)
    next = breedLineage(selectNode(next, parent), scene, { ...options, seed });
  return selectNode(next, parent);
}
export function updateWaiting(registration, controller) {
  return Boolean(controller && registration.waiting);
}
export class OutputWindow {
  constructor(open) {
    this.open = open;
    this.window = null;
  }
  show() {
    if (!this.window || this.window.closed) {
      this.window = this.open(
        "",
        "phosphor-output",
        "popup,width=1280,height=720",
      );
      if (!this.window)
        throw new Error("Allow pop-ups to open the clean output");
      if (
        !this.window.location.href ||
        this.window.location.href === "about:blank"
      )
        this.window.location.replace("output.html");
    }
    this.window.focus();
    return this.window;
  }
}
export class OutputConnection {
  constructor(video, status) {
    this.video = video;
    this.status = status;
    this.api = null;
    this.stream = null;
    this.connecting = false;
  }
  async refresh(api) {
    if (this.connecting) return;
    if (
      api === this.api &&
      this.stream?.getTracks().every((t) => t.readyState === "live")
    )
      return;
    this.dispose();
    if (!api?.outputStream || api.ready === false) {
      this.api = null;
      this.status("Waiting for the performance window to reconnect…");
      return;
    }
    this.connecting = true;
    try {
      this.api = api;
      this.stream = api.outputStream();
      this.video.srcObject = this.stream;
      await this.video.play();
      this.status("Live output connected. Audio stays in the control window.");
    } catch (error) {
      this.dispose();
      this.api = null;
      this.status("Output reconnect failed: " + error.message);
    } finally {
      this.connecting = false;
    }
  }
  dispose() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
