import acid from "./scene-acid.mjs";
import magnetic from "./scene-magnetic.mjs";
import cathedral from "./scene-cathedral.mjs";
import aquarium from "./scene-aquarium.mjs";
import tapestry from "./scene-tapestry.mjs";
import feedback from "./scene-feedback.mjs";
import interference from "./scene-interference.mjs";
import melt from "./scene-melt.mjs";
import phase from "./scene-phase.mjs";
import evolution from "./scene-evolution.mjs";
import pulse from "./scene-pulse.mjs";
import flight from "./scene-flight.mjs";
import beams from "./scene-beams.mjs";
import julia from "./scene-julia.mjs";
import fourspace from "./scene-fourspace.mjs";
import hyperbolic from "./scene-hyperbolic.mjs";
import swarm from "./scene-swarm.mjs";
import mandelbrot from "./scene-mandelbrot.mjs";

export default [
  acid,
  magnetic,
  cathedral,
  aquarium,
  tapestry,
  feedback,
  interference,
  melt,
  phase,
  evolution,
  pulse,
  flight,
  beams,
  julia,
  fourspace,
  hyperbolic,
  swarm,
  mandelbrot,
];

// Families that passed the family gate (roadmap "Family gate status", D51).
// Only these go onto the show pages autopilot plays (D55); drafts start on
// the lab page.
export const GATED = new Set([
  "feedback",
  "tapestry",
  "cathedral",
  "interference",
  "pulse",
  "flight",
]);
