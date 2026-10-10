// Mandelbrot Dive (#66): an endless escape-time deep zoom. Each dive flies
// from the whole set down to ~1e-10..1e-12 at a verified boundary point (a
// minibrot nucleus or a Misiurewicz point), surfaces on a fast eased glide
// and dives into the next target. Float32 alone pixelates near 1e-5; here
// the pixels iterate only a float32 *perturbation* δ around one reference
// orbit Z (δ' = 2Zδ + δ² + δc, with Zhuoran rebasing), and that reference
// orbit is computed once per target in emulated double-single arithmetic in
// a small simulation texture. Nucleus and Misiurewicz orbits are exactly
// (pre)periodic, so one stored period serves any number of iterations.

// ---------------------------------------------------------------- tables --

// Overview framing per set: centre, half of the short screen side, and
// whether the screen's y axis runs along -Im (the Burning Ship is shown with
// its masts up, as is customary).
export const SETS = [
  { name: "Mandelbrot", degree: 2, view: [-0.75, 0, 1.3], flip: false },
  { name: "Burning Ship", degree: 2, view: [-0.45, -0.52, 1.12], flip: true },
  { name: "Tricorn", degree: 2, view: [-0.32, 0, 1.4], flip: false },
  { name: "Multibrot z³", degree: 3, view: [0, 0, 1.4], flip: false },
  { name: "Celtic", degree: 2, view: [-0.62, 0, 1.62], flip: false },
];

// Dive targets. kind "n": nucleus of a period-p minibrot (z_p = 0);
// kind "m": Misiurewicz point, orbit enters a p-cycle after k steps. Both
// sit on the boundary at every scale, so a dive never ends in flat colour.
// D: end depth in octaves below the overview (the dive surfaces there).
// Misiurewicz targets carry their own iteration slope (iterations/octave).
export const TARGETS = [
  // Mandelbrot · route 0: seahorse valley (seahorse tails, double spirals)
  { set: 0, route: 0, kind: "n", p: 41, x: -0.7949573757463125, y: 0.16279060511431684, D: 34.9 },
  { set: 0, route: 0, kind: "n", p: 47, x: -0.7960363631433862, y: 0.18306523233812358, D: 35.1 },
  { set: 0, route: 0, kind: "n", p: 35, x: -0.7432297472658107, y: 0.16873609283083466, D: 34.8 },
  // route 1: elephant valley and its eastern neighbours
  { set: 0, route: 1, kind: "n", p: 37, x: 0.3579156619028207, y: 0.07148527040645308, D: 35.5 },
  { set: 0, route: 1, kind: "n", p: 49, x: 0.34537543349775723, y: 0.05515208820044652, D: 34.7 },
  { set: 0, route: 1, kind: "n", p: 45, x: 0.39067485105484556, y: -0.2381775293414651, D: 35.2 },
  // route 2: minibrots hanging in the dendrite filaments
  { set: 0, route: 2, kind: "n", p: 34, x: -0.22965910006604096, y: -0.7379659567336307, D: 34.8 },
  { set: 0, route: 2, kind: "n", p: 33, x: 0.15555297578926258, y: -0.6494302819261032, D: 34.8 },
  { set: 0, route: 2, kind: "n", p: 52, x: -1.0764504587643533, y: -0.28096542209041053, D: 37.3 },
  // route 3: Misiurewicz spirals, self-similar under the cycle multiplier
  { set: 0, route: 3, kind: "m", k: 20, p: 2, x: -0.7451801330874476, y: 0.16554461426352585, D: 40, slope: 10.9 },
  { set: 0, route: 3, kind: "m", k: 19, p: 2, x: -0.7457366674032312, y: 0.18266360665865802, D: 40, slope: 8.8 },
  { set: 0, route: 3, kind: "m", k: 20, p: 3, x: -0.747164760825975, y: 0.1503284334488133, D: 60, slope: 5.3 },
  // Burning Ship · route 0: mini ships of the armada (masts up)
  { set: 1, route: 0, kind: "n", p: 24, x: -1.7641782209867207, y: -0.031914880275701246, D: 37.6 },
  { set: 1, route: 0, kind: "n", p: 23, x: -1.7767577248883597, y: -0.04314694659485874, D: 36.1 },
  { set: 1, route: 0, kind: "n", p: 26, x: -1.739448430059651, y: -0.05585290317207539, D: 36.9 },
  { set: 1, route: 0, kind: "n", p: 27, x: -1.7390286871676863, y: -0.04790476963960595, D: 35.5 },
  // route 1: ships in the rigging close to the antenna
  { set: 1, route: 1, kind: "n", p: 31, x: -1.6168546836768196, y: -0.008587505344208152, D: 37.9 },
  { set: 1, route: 1, kind: "n", p: 22, x: -1.7769722161242294, y: -0.033629426205990236, D: 36.4 },
  { set: 1, route: 1, kind: "n", p: 26, x: -1.7869192638565277, y: -0.02333076722867557, D: 38 },
  // Tricorn: even-period babies are Mandelbrots, odd-period babies tricorns
  { set: 2, route: 0, kind: "n", p: 46, x: 0.2373301169606956, y: -0.6032340309951062, D: 36.1 },
  { set: 2, route: 0, kind: "n", p: 31, x: 0.20960596046495344, y: -0.5553121757159672, D: 36.6 },
  { set: 2, route: 0, kind: "n", p: 56, x: 0.6716463063422898, y: -0.8681928990140084, D: 35.7 },
  { set: 2, route: 0, kind: "n", p: 35, x: 0.40886271244474093, y: -0.9480487116774882, D: 34.9 },
  { set: 2, route: 1, kind: "n", p: 56, x: -0.7195582494647813, y: -0.10795857649973292, D: 35.2 },
  { set: 2, route: 1, kind: "n", p: 37, x: -1.075039417959455, y: -0.1421857085008746, D: 34.8 },
  // Multibrot z³: two-fold minibrots in ringed halos
  { set: 3, route: 0, kind: "n", p: 41, x: 0.17312486548203318, y: 0.7655250006509099, D: 35.7 },
  { set: 3, route: 0, kind: "n", p: 37, x: -0.34454432911933897, y: 0.7451692132636106, D: 35.7 },
  { set: 3, route: 0, kind: "n", p: 37, x: 0.24815094255405593, y: 1.1313285772536754, D: 35.8 },
  { set: 3, route: 0, kind: "n", p: 40, x: -0.5056665844264217, y: -0.6406791183120378, D: 35.3 },
  // Celtic: |Re z²| folds the plane; skewed minibrots in braided halos
  { set: 4, route: 0, kind: "n", p: 26, x: -1.4607760823433031, y: -0.1449672835000821, D: 37.2 },
  { set: 4, route: 0, kind: "n", p: 28, x: -1.4273276952036136, y: 0.036355182153671096, D: 38.9 },
  { set: 4, route: 0, kind: "n", p: 21, x: -1.1757299251050293, y: -0.5142871301589302, D: 35 },
  { set: 4, route: 0, kind: "n", p: 31, x: -0.7220113921345306, y: -1.3912594891133818, D: 38.2 },
];

// Iteration budget per octave of depth. A period-p minibrot is the parent
// set iterated p times per step, so it needs ~30·p iterations to show its
// cardioid and bulbs at the end of the dive.
export const ITERATION_CAP = 1500;
export function iterationSlope(t) {
  return t.slope ?? (Math.min(ITERATION_CAP, 30 * t.p) - 64) / t.D;
}

// Fill routes that have no targets of their own with the set's route 0.
export function routeList(set, route) {
  const own = TARGETS.flatMap((t, i) => (t.set === set && t.route === route ? [i] : []));
  if (own.length) return own;
  return TARGETS.flatMap((t, i) => (t.set === set && t.route === 0 ? [i] : []));
}

// ------------------------------------------------------- CPU references --

const fr = Math.fround;
// One escape-time step z -> f(z) + c for each set (float64).
export function mapStep(set, x, y, cx, cy) {
  switch (set) {
    case 0: return [x * x - y * y + cx, 2 * x * y + cy];
    case 1: return [x * x - y * y + cx, 2 * Math.abs(x * y) + cy];
    case 2: return [x * x - y * y + cx, -2 * x * y + cy];
    case 3: return [x * x * x - 3 * x * y * y + cx, 3 * x * x * y - y * y * y + cy];
    default: return [Math.abs(x * x - y * y) + cx, 2 * x * y + cy];
  }
}
// Plain float64 escape count (bailout |z|² > r2), for reference tests.
export function escapeCount(set, cx, cy, limit, r2 = 1e5) {
  let x = 0, y = 0;
  for (let n = 0; n < limit; n++) {
    [x, y] = mapStep(set, x, y, cx, cy);
    if (x * x + y * y > r2) return n + 1;
  }
  return limit;
}

// Double-single helpers, a bit-exact port of the GLSL ones (float32 ops).
export const ds = {
  quickTwoSum(a, b) { const s = fr(a + b); return [s, fr(b - fr(s - a))]; },
  twoSum(a, b) {
    const s = fr(a + b), v = fr(s - a);
    return [s, fr(fr(a - fr(s - v)) + fr(b - v))];
  },
  split(a) { const t = fr(a * 4097), hi = fr(t - fr(t - a)); return [hi, fr(a - hi)]; },
  twoProd(a, b) {
    const p = fr(a * b), [ah, al] = ds.split(a), [bh, bl] = ds.split(b);
    const e = fr(fr(fr(fr(fr(ah * bh) - p) + fr(ah * bl)) + fr(al * bh)) + fr(al * bl));
    return [p, e];
  },
  add(a, b) {
    let [sh, sl] = ds.twoSum(a[0], b[0]);
    const [th, tl] = ds.twoSum(a[1], b[1]);
    sl = fr(sl + th);
    [sh, sl] = ds.quickTwoSum(sh, sl);
    sl = fr(sl + tl);
    return ds.quickTwoSum(sh, sl);
  },
  mul(a, b) {
    let [p, e] = ds.twoProd(a[0], b[0]);
    e = fr(e + fr(fr(a[0] * b[1]) + fr(a[1] * b[0])));
    return ds.quickTwoSum(p, e);
  },
  from(x) { const hi = fr(x); return [hi, fr(x - hi)]; },
  value(a) { return a[0] + a[1]; },
};
const dsNeg = (a) => [-a[0], -a[1]];
const dsAbs = (a) => (a[0] < 0 ? dsNeg(a) : a);
const dsScale2 = (a, s) => [a[0] * s, a[1] * s]; // exact for s = ±2
// The reference orbit exactly as the simulation pass computes it.
export function dsOrbit(set, x, y, count) {
  const cr = ds.from(x), ci = ds.from(y);
  let zr = [0, 0], zi = [0, 0];
  const out = [[0, 0]];
  for (let n = 1; n < count; n++) {
    const xx = ds.mul(zr, zr), yy = ds.mul(zi, zi), xy = ds.mul(zr, zi);
    let nr, ni;
    if (set === 3) {
      const yy3 = ds.add(yy, ds.add(yy, yy)), xx3 = ds.add(xx, ds.add(xx, xx));
      nr = ds.add(ds.mul(zr, ds.add(xx, dsNeg(yy3))), cr);
      ni = ds.add(ds.mul(zi, ds.add(xx3, dsNeg(yy))), ci);
    } else {
      const re = ds.add(xx, dsNeg(yy));
      nr = ds.add(set === 4 ? dsAbs(re) : re, cr);
      const im = set === 1 ? dsAbs(xy) : xy;
      ni = ds.add(dsScale2(im, set === 2 ? -2 : 2), ci);
    }
    zr = nr; zi = ni;
    out.push([fr(zr[0] + zr[1]), fr(zi[0] + zi[1])]);
  }
  return out;
}

// Perturbation step δ -> f(Z+δ) - f(Z) + δc, cancellation-free.
function diffAbs(c, d) {
  return c >= 0 ? (c + d >= 0 ? d : -(2 * c + d)) : c + d > 0 ? 2 * c + d : -d;
}
export function perturbStep(set, X, Y, x, y, dcx, dcy, round = (v) => v) {
  const r = round;
  if (set === 3) {
    const ar = r(r(3 * r(X * X - Y * Y)) + r(3 * r(X * x - Y * y)) + r(x * x - y * y));
    const ai = r(r(6 * r(X * Y)) + r(3 * r(X * y + Y * x)) + r(2 * x * y));
    return [r(r(ar * x - ai * y) + dcx), r(r(ar * y + ai * x) + dcy)];
  }
  const re = r(r(r(2 * X + x) * x) - r(r(2 * Y + y) * y));
  const cross = r(r(X * y) + r(x * Y) + r(x * y));
  const nr = set === 4 ? diffAbs(r(X * X - Y * Y), re) : re;
  const ni = set === 1 ? 2 * diffAbs(r(X * Y), cross) : (set === 2 ? -2 : 2) * cross;
  return [r(nr + dcx), r(ni + dcy)];
}
// Escape count of c = target + δc by perturbation with rebasing, as the
// shader does it (pass Math.fround as `round` to emulate float32).
export function perturbEscape(set, ref, loopAt, dcx, dcy, limit, round = (v) => v, r2 = 1e5) {
  let x = 0, y = 0, m = 0, X = 0, Y = 0;
  const L = ref.length;
  for (let n = 0; n < limit; n++) {
    [x, y] = perturbStep(set, X, Y, x, y, dcx, dcy, round);
    if (++m === L) m = loopAt;
    [X, Y] = ref[m];
    const zx = round(X + x), zy = round(Y + y);
    const z2 = zx * zx + zy * zy;
    if (z2 > r2) return n + 1;
    if (z2 < x * x + y * y) { x = zx; y = zy; m = 0; X = 0; Y = 0; }
  }
  return limit;
}
// Reference orbit length and loop start for a target.
export function orbitShape(t) {
  return t.kind === "n" ? { L: t.p, loopAt: 0 } : { L: t.k + t.p, loopAt: t.k };
}

// Jacobian [a b; c d] of z -> f(z) (rows), for every set.
export function jacobian(set, x, y) {
  switch (set) {
    case 0: return [2 * x, -2 * y, 2 * y, 2 * x];
    case 1: { const s = x * y < 0 ? -2 : 2; return [2 * x, -2 * y, s * y, s * x]; }
    case 2: return [2 * x, -2 * y, -2 * y, -2 * x];
    case 3: { const a = 3 * (x * x - y * y), b = 6 * x * y; return [a, -b, b, a]; }
    default: { const s = x * x - y * y < 0 ? -2 : 2; return [s * x, -s * y, 2 * y, 2 * x]; }
  }
}
const mat = (A, B) => [
  A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
  A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3],
];
// Skew of a minibrot in the non-conformal sets. Near a period-p nucleus the
// return map renormalises to the parent set in w = L·β·δc (β = dz_p/dc,
// L = Df(z_{p-1})···Df(z_1)), so the baby is the parent seen through
// (Lβ)⁻¹. Its symmetric part P (det 1, eigen-angle theta, log-stretch ell)
// is what the view applies, eased in with depth, to show it undistorted.
export function skewOf(t) {
  if (t.kind !== "n" || t.set === 0 || t.set === 3) return { theta: 0, ell: 0 };
  let x = 0, y = 0, J = [0, 0, 0, 0], L = [1, 0, 0, 1];
  for (let n = 0; n < t.p; n++) {
    const D = jacobian(t.set, x, y);
    if (n >= 1) L = mat(D, L);
    J = mat(D, J);
    J[0] += 1;
    J[3] += 1;
    [x, y] = mapStep(t.set, x, y, t.x, t.y);
  }
  const A = mat(L, J);
  const det = A[0] * A[3] - A[1] * A[2];
  const k = 1 / Math.sqrt(Math.abs(det));
  // M = (Lβ)⁻¹ normalised; P² = M Mᵀ (a reflection in M does not matter).
  const M = [A[3] * k, -A[1] * k, -A[2] * k, A[0] * k].map((v) => v * Math.sign(det));
  const a = M[0] * M[0] + M[1] * M[1], b = M[0] * M[2] + M[1] * M[3], d = M[2] * M[2] + M[3] * M[3];
  const theta = 0.5 * Math.atan2(2 * b, a - d);
  const top = (a + d) / 2 + Math.sqrt(((a - d) / 2) ** 2 + b * b);
  return { theta, ell: 0.5 * Math.log(top) };
}

// ------------------------------------------------------------ GLSL data --

const bits = (v) => new Uint32Array(new Float32Array([v]).buffer)[0];
const hex = (v) => `0x${bits(v).toString(16).padStart(8, "0")}u`;
const num = (v) => {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
};
const ROUTES = [];
const ROUTE_START = [], ROUTE_LEN = [];
for (let set = 0; set < SETS.length; set++)
  for (let route = 0; route < 4; route++) {
    const list = routeList(set, route);
    ROUTE_START.push(ROUTES.length);
    ROUTE_LEN.push(list.length);
    ROUTES.push(...list);
  }
const T = TARGETS.length;
// Hi/lo float32 pairs as exact bit patterns: decimal literals could be
// rounded differently by a shader compiler and move the target.
const targetBits = TARGETS.flatMap((t) => {
  const [xh, xl] = ds.from(t.x), [yh, yl] = ds.from(t.y);
  return [xh, yh, xl, yl].map(hex);
});
const common = `
const int MB_T = ${T};
const uint MB_TC[${4 * T}] = uint[${4 * T}](${targetBits.join(", ")});
const vec4 MB_TM[${T}] = vec4[${T}](${TARGETS.map((t) => {
  const { L, loopAt } = orbitShape(t);
  return `vec4(${num(L)}, ${num(loopAt)}, ${num(t.D)}, ${num(+iterationSlope(t).toFixed(3))})`;
}).join(", ")});
const int MB_TS[${T}] = int[${T}](${TARGETS.map((t) => t.set).join(", ")});
const vec2 MB_TK[${T}] = vec2[${T}](${TARGETS.map((t) => {
  const { theta, ell } = skewOf(t);
  return `vec2(${num(+theta.toFixed(6))}, ${num(+ell.toFixed(6))})`;
}).join(", ")});
const int MB_RS[${ROUTE_START.length}] = int[${ROUTE_START.length}](${ROUTE_START.join(", ")});
const int MB_RL[${ROUTE_LEN.length}] = int[${ROUTE_LEN.length}](${ROUTE_LEN.join(", ")});
const int MB_RT[${ROUTES.length}] = int[${ROUTES.length}](${ROUTES.join(", ")});
const vec4 MB_VIEW[${SETS.length}] = vec4[${SETS.length}](${SETS.map(
  (s) => `vec4(${num(s.view[0])}, ${num(s.view[1])}, ${num(s.view[2])}, ${s.flip ? "1.0" : "0.0"})`,
).join(", ")});

// The state holds raw float32/uint32 bit patterns, one per RGBA8 texel.
uint mbU(ivec2 p) {
  uvec4 b = uvec4(texelFetch(u_state, p, 0) * 255.0 + 0.5);
  return b.x | (b.y << 8u) | (b.z << 16u) | (b.w << 24u);
}
float mbF(ivec2 p) { return uintBitsToFloat(mbU(p)); }
vec4 mbEnc(uint v) { return vec4(uvec4(v, v >> 8u, v >> 16u, v >> 24u) & 255u) / 255.0; }
`;

// ------------------------------------------------------------ simulation --
// Texel row 0: depth, turn, hue, slot (route index | 256·surfacing),
// previous tick's view depth, orbit target id, zero, previous turn,
// previous target, beat punch. Rows 1–4: Re Z_j, rows 5–8: Im Z_j.
const simulation = `${common}
float ONE; // 1.0, read from the state so no compiler can fold the error terms
vec2 mbQuick(float a, float b) { float s = (a + b) * ONE; return vec2(s, b - (s - a) * ONE); }
vec2 mbTwoSum(float a, float b) {
  float s = a + b;
  float v = (s * ONE - a) * ONE;
  return vec2(s, (a - (s - v) * ONE) * ONE * ONE * ONE + (b - v));
}
vec2 mbSplit(float a) { float t = a * 4097.0; float hi = t * ONE - (t - a); return vec2(hi, a * ONE - hi); }
vec2 mbTwoProd(float a, float b) {
  float p = a * b;
  vec2 A = mbSplit(a), B = mbSplit(b);
  return vec2(p, ((A.x * B.x - p) + A.x * B.y + A.y * B.x) + A.y * B.y);
}
vec2 dsAdd(vec2 a, vec2 b) {
  vec2 s = mbTwoSum(a.x, b.x), t = mbTwoSum(a.y, b.y);
  s.y += t.x;
  s = mbQuick(s.x, s.y);
  s.y += t.y;
  return mbQuick(s.x, s.y);
}
vec2 dsMul(vec2 a, vec2 b) {
  vec2 p = mbTwoProd(a.x, b.x);
  p.y += a.x * b.y + a.y * b.x;
  return mbQuick(p.x, p.y);
}
vec2 dsAbs(vec2 a) { return a.x < 0.0 ? -a : a; }

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ONE = 1.0 + texelFetch(u_state, ivec2(6, 0), 0).r;
  int set = clamp(int(u_params[0] + 0.5), 0, ${SETS.length - 1});
  int route = clamp(int(u_params[1] + 0.5), 0, 3);
  int rs = MB_RS[set * 4 + route], rl = MB_RL[set * 4 + route];
  float depth = mbF(ivec2(0, 0)), turn = mbF(ivec2(1, 0)), hue = mbF(ivec2(2, 0));
  uint slot = mbU(ivec2(3, 0)), orbit = mbU(ivec2(5, 0));
  float punch = mbF(ivec2(9, 0));
  // The camera of the tick before, for the visual pass's reprojection.
  float lastView = depth + punch, lastTurn = turn;
  uint lastTarget = orbit;
  bool fresh = u_reset || !(depth >= 0.0 && depth < 128.0) || !(abs(turn) <= 1.0) ||
    !(abs(hue) <= 1.0) || !(abs(punch) <= 1.0);
  if (fresh) {
    uint h = seedHash(u_seedBits ^ 0x6d2b79f5u);
    slot = h % uint(rl);
    turn = float(seedHash(h) >> 8) / 16777216.0;
    hue = float(seedHash(h + 1u) >> 8) / 16777216.0;
    int first = MB_RT[rs + int(slot)];
    depth = MB_TM[first].z * (0.12 + 0.5 * float(seedHash(h + 2u) >> 8) / 16777216.0);
    orbit = 0xffffffffu;
  }
  bool surfacing = (slot & 256u) != 0u;
  int index = int(slot & 255u) % rl;
  float end = MB_TM[MB_RT[rs + index]].z;
  float speed = max(u_params[2], 0.0);
  float level = clamp(u_level, 0.0, 1.0);
  if (!surfacing) {
    // Ease in from the overview, decelerate into the end depth.
    depth += u_dt * speed * mix(0.35, 1.0, smoothstep(0.0, 1.5, depth)) *
      clamp((end - depth) / 0.7 + 0.2, 0.0, 1.0);
    if (depth >= end - 0.004) surfacing = true;
  } else {
    // Surface on a fast eased glide; the overview is the same frame for
    // every target, so the next dive starts seamlessly.
    float rise = 2.0 + 3.0 * speed;
    depth -= u_dt * rise * clamp((end - depth) * 0.8 + 0.12, 0.0, 1.0) *
      clamp(depth * 0.35 + 0.05, 0.0, 1.0);
    if (depth <= 0.004) {
      depth = 0.0;
      surfacing = false;
      index = (index + 1) % rl;
    }
  }
  depth = clamp(depth, 0.0, 120.0);
  turn = fract(turn + u_dt * u_params[3] * 0.035);
  float flow = (0.004 + 0.03 * speed + 0.02 * u_params[5]) * (0.3 + 1.6 * level);
  hue = fract(hue + u_dt * flow);
  int tid = MB_RT[rs + index];
  // Beat: a small dive along the zoom axis, part of the camera state.
  punch = 0.08 * clamp(u_kick, 0.0, 1.0) * (0.3 + 0.7 * level);
  if (fresh) { lastView = depth + punch; lastTurn = turn; lastTarget = uint(tid); }
  if (p.y == 0) {
    uint v = 0u;
    if (p.x == 0) v = floatBitsToUint(depth);
    else if (p.x == 1) v = floatBitsToUint(turn);
    else if (p.x == 2) v = floatBitsToUint(hue);
    else if (p.x == 3) v = uint(index) | (surfacing ? 256u : 0u);
    else if (p.x == 4) v = floatBitsToUint(lastView);
    else if (p.x == 5) v = uint(tid);
    else if (p.x == 7) v = floatBitsToUint(lastTurn);
    else if (p.x == 8) v = min(lastTarget, uint(MB_T - 1));
    else if (p.x == 9) v = floatBitsToUint(punch);
    outColor = mbEnc(v);
    return;
  }
  if (orbit == uint(tid)) { outColor = texelFetch(u_state, p, 0); return; }
  // New target: iterate its orbit in double-single from 0 to Z_j.
  int j = (p.y - 1) % 4 * 64 + p.x;
  bool imag = p.y >= 5;
  int tset = MB_TS[tid];
  int len = int(MB_TM[tid].x);
  vec2 cr = vec2(uintBitsToFloat(MB_TC[4 * tid]), uintBitsToFloat(MB_TC[4 * tid + 2]));
  vec2 ci = vec2(uintBitsToFloat(MB_TC[4 * tid + 1]), uintBitsToFloat(MB_TC[4 * tid + 3]));
  vec2 zr = vec2(0.0), zi = vec2(0.0);
  for (int n = 1; n < 256; ++n) {
    if (n > j || n > len) break;
    vec2 xx = dsMul(zr, zr), yy = dsMul(zi, zi), xy = dsMul(zr, zi);
    if (tset == 3) {
      vec2 yy3 = dsAdd(yy, dsAdd(yy, yy)), xx3 = dsAdd(xx, dsAdd(xx, xx));
      vec2 nr = dsAdd(dsMul(zr, dsAdd(xx, -yy3)), cr);
      zi = dsAdd(dsMul(zi, dsAdd(xx3, -yy)), ci);
      zr = nr;
    } else {
      vec2 re = dsAdd(xx, -yy);
      zr = dsAdd(tset == 4 ? dsAbs(re) : re, cr);
      vec2 im = tset == 1 ? dsAbs(xy) : xy;
      zi = dsAdd(im * (tset == 2 ? -2.0 : 2.0), ci);
    }
  }
  vec2 z = imag ? zi : zr;
  outColor = mbEnc(floatBitsToUint(j > len ? 0.0 : z.x + z.y));
}
`;

// ---------------------------------------------------------------- visual --

// One specialised loop per set (uniform branch outside, none inside).
// Per step: the derivative at z = Z + δ, then δ' = f(Z + δ) − f(Z) + δc
// written without cancellation (diffAbs folds |·| for Ship and Celtic).
const re = "(2.0 * Z.x + dl.x) * dl.x - (2.0 * Z.y + dl.y) * dl.y";
const xc = "(Z.x * dl.y + dl.x * Z.y + dl.x * dl.y)";
const STEPS = [
  ["der = 2.0 * cmul(z, der) + vec2(pix, 0.0);", `dl = vec2(${re}, 2.0 * ${xc}) + dc;`],
  [
    "float s = z.x * z.y < 0.0 ? -2.0 : 2.0;\n      J = mbJmul(vec4(2.0 * z.x, -2.0 * z.y, s * z.y, s * z.x), J) + pix * S;",
    `dl = vec2(${re}, 2.0 * diffAbs(Z.x * Z.y, ${xc})) + dc;`,
  ],
  ["J = mbJmul(vec4(2.0 * z.x, -2.0 * z.y, -2.0 * z.y, -2.0 * z.x), J) + pix * S;", `dl = vec2(${re}, -2.0 * ${xc}) + dc;`],
  ["der = 3.0 * cmul(cmul(z, z), der) + vec2(pix, 0.0);", "dl = cmul(3.0 * cmul(Z, Z) + 3.0 * cmul(Z, dl) + cmul(dl, dl), dl) + dc;"],
  [
    "float s = z.x * z.x - z.y * z.y < 0.0 ? -2.0 : 2.0;\n      J = mbJmul(vec4(s * z.x, -s * z.y, 2.0 * z.y, 2.0 * z.x), J) + pix * S;",
    `dl = vec2(diffAbs(Z.x * Z.x - Z.y * Z.y, ${re}), 2.0 * ${xc}) + dc;`,
  ],
];
const loops = STEPS.map(
  ([derivative, perturb], set) => `  ${set ? "else " : ""}if (set == ${set}) {
    for (int i = 0; i < CAP; ++i) {
      if (i >= N) break;
      ${derivative}
      ${perturb}
      if (++m == L) {
        m = loopAt;
        // Inside the target minibrot δ settles onto the attracting cycle:
        // once a whole period returns it to the same place, stop early.
        if (loopAt == 0) {
          vec2 moved = dl - lastWrap;
          if (dot(moved, moved) < 1e-8 * dot(dl, dl)) break;
          lastWrap = dl;
        }
      }
      Z = mbZ(m);
      z = Z + dl;
      r2 = dot(z, z);
      if (r2 > 1e5) { escaped = true; n = i + 1; break; }
      // Rebase (Zhuoran): when the orbit comes closer to 0 than to the
      // reference, continue from the reference's start.
      if (r2 < dot(dl, dl)) { dl = z; Z = vec2(0.0); m = 0; }
    }
  }`,
).join("\n");

const fragment = `${common}
const int CAP = ${ITERATION_CAP};
vec2 mbZ(int m) {
  ivec2 p = ivec2(m & 63, 1 + (m >> 6));
  return vec2(mbF(p), mbF(p + ivec2(0, 4)));
}
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
float diffAbs(float c, float d) {
  return c >= 0.0 ? (c + d >= 0.0 ? d : -(2.0 * c + d)) : (c + d > 0.0 ? 2.0 * c + d : -d);
}
vec4 mbJmul(vec4 A, vec4 J) {
  return vec4(A.x * J.x + A.y * J.z, A.x * J.y + A.y * J.w, A.z * J.x + A.w * J.z, A.z * J.y + A.w * J.w);
}
float tri(float t) { return abs(fract(t) * 2.0 - 1.0); }
vec2 mbTarget(int tid) { return vec2(uintBitsToFloat(MB_TC[4 * tid]), uintBitsToFloat(MB_TC[4 * tid + 1])); }
// The inverse stretch of a non-conformal baby, eased in with depth:
// symmetric with det 1, stored as (a, b, b, d).
vec4 mbSkew(int tid, float d) {
  vec2 sk = MB_TK[tid];
  float k = 1.0 - clamp(d / MB_TM[tid].z, 0.0, 1.0);
  float e = exp((1.0 - k * k * k) * sk.y), cs = cos(sk.x), sn = sin(sk.x);
  float b = cs * sn * (e - 1.0 / e);
  return vec4(cs * cs * e + sn * sn / e, b, b, sn * sn * e + cs * cs / e);
}
// The camera zooms about the target, which slides from its place in the
// overview to the screen centre during the first four octaves.
vec2 mbOffset(int tid, float d) {
  vec4 view = MB_VIEW[MB_TS[tid]];
  return (view.xy - mbTarget(tid)) * (exp2(-d) * (1.0 - smoothstep(0.0, 4.0, d)));
}
float mbHalton(uint i, uint b) {
  float f = 1.0, r = 0.0;
  for (int k = 0; k < 4; ++k) {
    if (i == 0u) break;
    f /= float(b);
    r += f * float(i % b);
    i /= b;
  }
  return r;
}

void main() {
  float depth = mbF(ivec2(0, 0)), turn = mbF(ivec2(1, 0)), hue = mbF(ivec2(2, 0));
  int tid = int(min(mbU(ivec2(5, 0)), uint(MB_T - 1)));
  int set = MB_TS[tid];
  vec4 meta = MB_TM[tid];
  int L = int(meta.x), loopAt = int(meta.y);
  vec4 view = MB_VIEW[set];
  float level = clamp(u_level, 0.0, 1.0);
  float detail = clamp(u_params[4], 0.0, 1.0);
  float bands = clamp(u_params[5], 0.0, 1.0);
  float edge = clamp(u_params[6], 0.0, 1.0);
  float glow = clamp(u_params[7], 0.0, 1.0);

  float viewDepth = max(depth + mbF(ivec2(9, 0)), 0.0);
  float scale = view.z * exp2(-viewDepth);
  vec2 off = mbOffset(tid, viewDepth);
  vec4 S = mbSkew(tid, viewDepth);
  // Temporal supersampling: a sub-pixel Halton jitter per simulation tick,
  // accumulated in the reprojected previous frame below.
  vec2 jitter = vec2(mbHalton(u_tick % 8u + 1u, 2u), mbHalton(u_tick % 8u + 1u, 3u)) - 0.5;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uv = ((gl_FragCoord.xy + jitter) / u_resolution - 0.5) * aspect * 2.0;
  if (view.w > 0.5) uv.y = -uv.y;
  vec2 q = rot2(turn * TAU) * uv;
  vec2 dc = off + vec2(S.x * q.x + S.y * q.y, S.z * q.x + S.w * q.y) * scale;
  float pix = 2.0 * scale / u_resolution.y;

  int N = int(clamp((64.0 + meta.w * depth) * mix(0.75, 1.25, detail), 32.0, float(CAP)));
  vec2 dl = vec2(0.0), Z = vec2(0.0), z = vec2(0.0), der = vec2(0.0);
  vec4 J = vec4(0.0);
  int m = 0, n = 0;
  bool escaped = false;
  float r2 = 0.0;
  vec2 lastWrap = vec2(1e30);
${loops}
  // |∇|z|| = |Jᵀ ẑ|: the escape potential's gradient, also for the
  // non-conformal sets whose Jacobian stretches one direction.
  vec2 zh = z / max(length(z), 1e-30);
  float jn = (set == 0 || set == 3) ? length(der) :
    length(vec2(J.x * zh.x + J.z * zh.y, J.y * zh.x + J.w * zh.y));
  float deg = set == 3 ? 3.0 : 2.0;
  float lz = 0.5 * log2(max(r2, 2.0));
  float nu = escaped ? float(n) + 1.0 - log2(lz / 8.3) / log2(deg) : 0.0;
  float stretched = 40.0 * log2(1.0 + max(nu, 0.0) / 40.0);
  float t = stretched * mix(0.012, 0.11, bands * bands) + hue;
  // Band-limit the palette where escape counts change faster than the
  // pixel grid can show (dense sub-pixel dust would otherwise sparkle).
  float aa = smoothstep(0.15, 0.6, fwidth(t));
  // Escape counts that jump by many iterations between neighbouring pixels
  // mark sub-pixel dust (dense in the Ship and Celtic): dim it so the
  // resolved structure reads.
  float dust = smoothstep(3.0, 14.0, fwidth(stretched));
  vec3 col = vec3(0.0);
  if (escaped) {
    // Distance to the set in pixels: |z| ln|z| / |∇|z||.
    float dist = sqrt(r2) * lz * 0.6931472 / max(jn, 1e-30);
    vec3 bandColour = palette(mix(tri(t), 0.5, aa));
    // Glow falls off with distance in screen terms (360-line reference), so
    // the look does not thin out at higher render widths.
    float reach = 2.0 + 26.0 * (1.0 - edge) * (1.0 - edge);
    float near = exp2(-dist * (360.0 / u_resolution.y) / reach);
    float stripe = 1.0 - bands * 0.75 * mix(1.0 - smoothstep(0.35, 0.9, tri(t * 2.0)), 0.5, aa);
    // Filament core: one or two pixels wide whatever the render size.
    float line = 1.0 - smoothstep(0.0, mix(1.9, 0.85, detail), dist);
    vec3 lineColour = palette(mix(tri(t * 0.35 + 0.35), 0.5, aa * 0.6));
    col = bandColour * near * stripe * (1.0 - edge) * 0.85 +
      lineColour * line * (0.35 + 0.65 * edge) * (1.0 - 0.6 * dust) + vec3(0.18) * line * line * edge;
    col *= 1.0 - 0.45 * dust;
  } else {
    // Interior stays dark; a rim glow grows towards the boundary, where
    // dz/dc diverges (unresolved exterior lands here as a bright edge).
    float inner = 1.0 / max(jn, 1e-30);
    col = mix(u_accent, u_primary, 0.35) * glow * exp2(-inner * 0.08) * 0.8;
  }
  col = max(col, vec3(0.0));

  // Reproject this pixel's centre into the previous frame. The fractal is
  // fixed in the plane and only the camera moves, so history stays valid;
  // alpha carries the tick the history was drawn at.
  float blend = 1.0;
  vec4 history = vec4(0.0);
  if (!u_reset) {
    history = texture(u_previous, v_uv);
    uint ticks = (u_tick - uint(history.a * 255.0 + 0.5)) & 255u;
    float lastDepth = mbF(ivec2(4, 0)), lastTurn = mbF(ivec2(7, 0));
    int lastTid = int(min(mbU(ivec2(8, 0)), uint(MB_T - 1)));
    float k = float(ticks);
    float pd = viewDepth - k * (viewDepth - lastDepth);
    float pt = turn - k * (fract(turn - lastTurn + 0.5) - 0.5);
    int ptid = ticks == 0u ? tid : lastTid;
    if (ticks == 0u) { pd = viewDepth; pt = turn; }
    vec2 centre = (gl_FragCoord.xy / u_resolution - 0.5) * aspect * 2.0;
    if (view.w > 0.5) centre.y = -centre.y;
    vec2 cq = rot2(turn * TAU) * centre;
    // Offsets stay relative to the reference: an absolute float32 c would
    // lose the whole deep view. Targets only change at the overview.
    vec2 c = off + vec2(S.x * cq.x + S.y * cq.y, S.z * cq.x + S.w * cq.y) * scale;
    if (ptid != tid) c += mbTarget(tid) - mbTarget(ptid);
    vec4 Sp = mbSkew(ptid, pd);
    vec2 r = (c - mbOffset(ptid, pd)) / (view.z * exp2(-pd));
    vec2 back = rot2(-pt * TAU) * vec2(Sp.w * r.x - Sp.y * r.y, -Sp.z * r.x + Sp.x * r.y);
    if (view.w > 0.5) back.y = -back.y;
    vec2 prevUV = back / (aspect * 2.0) + 0.5;
    bool inside = all(greaterThanEqual(prevUV, vec2(0.0))) && all(lessThanEqual(prevUV, vec2(1.0)));
    if (ticks < 6u && inside && MB_TS[ptid] == set && abs(viewDepth - pd) < 0.5) {
      history = texture(u_previous, prevUV);
      // About eight jittered frames (one Halton cycle) while diving; fast
      // surfacing keeps less history so the glide stays sharp.
      blend = mix(0.13, 0.6, smoothstep(0.01, 0.05, abs(viewDepth - lastDepth)));
    }
  }
  outColor = vec4(mix(history.rgb, col, blend), float(u_tick & 255u) / 255.0);
}
`;

// ---------------------------------------------------------------- scene --

const schema = [
  { key: "set", label: "Set · Mandelbrot / Burning Ship / Tricorn / Multibrot / Celtic", min: 0, max: 4, step: 1, default: 0 },
  { key: "route", label: "Route · target group", min: 0, max: 3, step: 1, default: 0 },
  { key: "speed", label: "Zoom speed (octaves/s)", min: 0.05, max: 1.2, step: 0.01, default: 0.35 },
  { key: "spin", label: "Spin", min: -1, max: 1, step: 0.01, default: 0.1 },
  { key: "detail", label: "Filament detail", min: 0, max: 1, step: 0.01, default: 0.55 },
  { key: "bands", label: "Colour bands", min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: "edge", label: "Fill → filaments only", min: 0, max: 1, step: 0.01, default: 0.35 },
  { key: "glow", label: "Interior rim glow", min: 0, max: 1, step: 0.01, default: 0.3 },
];

const presets = [
  // Banded neon through seahorse tails down to a period-41 minibrot.
  { name: "Seahorse Valley", seed: 6601, params: { set: 0, route: 0, speed: 0.38, spin: 0.08, detail: 0.6, bands: 0.75, edge: 0.2, glow: 0.25 } },
  // Soft wide glow, slow counter-spin through the elephant trunks.
  { name: "Elephant March", seed: 6602, params: { set: 0, route: 1, speed: 0.28, spin: -0.12, detail: 0.5, bands: 0.35, edge: 0.4, glow: 0.35 } },
  // Distance-estimate filaments only, on black.
  { name: "Filament Lace", seed: 6603, params: { set: 0, route: 2, speed: 0.3, spin: 0.04, detail: 0.85, bands: 0.2, edge: 1, glow: 0.15 } },
  // Fast vortex into Misiurewicz spiral centres (one goes past 1e-17).
  { name: "Spiral Tunnel", seed: 6604, params: { set: 0, route: 3, speed: 0.95, spin: 0.3, detail: 0.6, bands: 0.85, edge: 0.3, glow: 0.2 } },
  // Slow meditative dive, smooth gradients and a bright minibrot rim.
  { name: "Minibrot Halo", seed: 6605, params: { set: 0, route: 2, speed: 0.12, spin: -0.03, detail: 0.5, bands: 0.08, edge: 0.55, glow: 0.9 } },
  { name: "Burning Armada", seed: 6606, params: { set: 1, route: 0, speed: 0.35, spin: 0, detail: 0.6, bands: 0.55, edge: 0.25, glow: 0.3 } },
  { name: "Ship Rigging", seed: 6607, params: { set: 1, route: 1, speed: 0.42, spin: 0.05, detail: 0.75, bands: 0.3, edge: 0.85, glow: 0.2 } },
  // Alternating baby Mandelbrots (even period) and baby tricorns (odd).
  { name: "Tricorn Nursery", seed: 6608, params: { set: 2, route: 0, speed: 0.33, spin: 0.1, detail: 0.55, bands: 0.5, edge: 0.4, glow: 0.5 } },
  { name: "Cubic Bloom", seed: 6609, params: { set: 3, route: 0, speed: 0.34, spin: 0.15, detail: 0.6, bands: 0.65, edge: 0.3, glow: 0.4 } },
  { name: "Celtic Braid", seed: 6610, params: { set: 4, route: 0, speed: 0.3, spin: -0.1, detail: 0.6, bands: 0.4, edge: 0.6, glow: 0.3 } },
];

export default {
  id: "mandelbrot",
  energy: {
    speed: { mul: [0.4, 1.9] },
    spin: { mul: [0.35, 2.2] },
    detail: [-0.3, 0.3],
    bands: [-0.2, 0.2],
  },
  beat: { punch: 0.5, pulse: 0.6 },
  audio: [
    { param: "glow", feature: "low", amount: 0.12 },
    { param: "edge", feature: "high", amount: 0.06 },
  ],
  stage: ["speed", "spin", "edge"],
  type: { key: "set", values: [0, 1, 2, 3, 4] },
  number: 66,
  name: "Mandelbrot Dive",
  description:
    "An endless deep zoom into escape-time fractals: Mandelbrot, Burning Ship, Tricorn, the cubic Multibrot and the Celtic set. Each dive flies from the whole set down past 1e-10 to a verified boundary point — a minibrot nucleus or a Misiurewicz spiral centre — then surfaces on a fast eased glide and dives into the next. Pixels iterate a float32 perturbation around one reference orbit (with rebasing); the reference is computed once per target in double-single arithmetic in a small simulation texture. Smooth escape-count bands, distance-estimate filaments and a dark interior with a rim glow; energy drives zoom speed, spin, colour flow and filament detail.",
  schema,
  presets,
  fragment,
  simulation: { fragment: simulation, size: [64, 9], steps: 1 },
};
