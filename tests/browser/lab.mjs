// Render lab for the browser harness and contact sheets: one Engine, no UI.
// Served from the repository root; never shipped (not reachable from the app).
import scenes from "../../scenes.mjs";
import { Engine } from "../../engine.mjs";
import { presetSnapshot } from "../../session.mjs";

const errors = [];
const engine = new Engine(document.getElementById("canvas"), scenes, (m) =>
  errors.push(m),
);
window.__phosphorLab = { engine, scenes, presetSnapshot, errors };
