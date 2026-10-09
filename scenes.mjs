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
import life from "./scene-life.mjs";
import attractor from "./scene-attractor.mjs";
import mandelbrot from "./scene-mandelbrot.mjs";
import sandpile from "./scene-sandpile.mjs";
import newton from "./scene-newton.mjs";
import flame from "./scene-flame.mjs";
import quasicrystal from "./scene-quasicrystal.mjs";
import voronoi from "./scene-voronoi.mjs";
import ripple from "./scene-ripple.mjs";
import turmite from "./scene-turmite.mjs";
import kleinian from "./scene-kleinian.mjs";
import harmonograph from "./scene-harmonograph.mjs";
import wallpaper from "./scene-wallpaper.mjs";
import truchet from "./scene-truchet.mjs";
import hilbert from "./scene-hilbert.mjs";
import phyllotaxis from "./scene-phyllotaxis.mjs";
import hopf from "./scene-hopf.mjs";
import chladni from "./scene-chladni.mjs";
import domain from "./scene-domain.mjs";

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
  life,
  attractor,
  mandelbrot,
  sandpile,
  newton,
  flame,
  quasicrystal,
  voronoi,
  ripple,
  turmite,
  kleinian,
  harmonograph,
  wallpaper,
  truchet,
  hilbert,
  phyllotaxis,
  hopf,
  chladni,
  domain,
];

// Families that passed the family gate (roadmap "Family gate status", D51).
// Kept for tooling (contact sheets); since D65/D68 the owner's ratings, not
// this list, decide what plays.
export const GATED = new Set([
  "feedback",
  "tapestry",
  "cathedral",
  "interference",
  "pulse",
  "flight",
]);
