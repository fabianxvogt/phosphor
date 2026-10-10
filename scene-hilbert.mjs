// Space-filling Curves (#78): one unbroken line through every cell of a
// grid. Hilbert's curve (2×2 refinement), Moore's closed version (four
// Hilbert quarters in a loop) and Peano's original (3×3 refinement).
// Every few beats the curve refines to the next order: each vertex glides
// out of its parent cell's centre into its own, the classic picture of
// the construction, then coarsens back, ping-pong, for ever. Colour runs
// along the curve by index, so the locality the curves are famous for
// shows as blocks of neighbouring colour; a comet travels the whole line.
//
// Per pixel, the shader finds the cells around it, their curve indices
// (xy → d), and draws the segments d → d+1 between the (gliding) cell
// centres. Copies to the left and right are mirror images, which joins
// Hilbert curves end to start into an endless strip.

// Hilbert curve (Wikipedia's d2xy / xy2d), start (0,0), end (n−1, 0).
function hRot(n, p, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      p[0] = n - 1 - p[0];
      p[1] = n - 1 - p[1];
    }
    [p[0], p[1]] = [p[1], p[0]];
  }
}
export function hilbertD2xy(n, d) {
  const p = [0, 0];
  let t = d;
  for (let s = 1; s < n; s *= 2) {
    const rx = 1 & (t >> 1),
      ry = 1 & (t ^ rx);
    hRot(s, p, rx, ry);
    p[0] += s * rx;
    p[1] += s * ry;
    t >>= 2;
  }
  return p;
}
export function hilbertXy2d(n, [x, y]) {
  const p = [x, y];
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (p[0] & s) > 0 ? 1 : 0,
      ry = (p[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    hRot(n, p, rx, ry);
  }
  return d;
}
// Moore curve: four Hilbert quarters, closed.
export function mooreD2xy(n, d) {
  const m = n / 2,
    q = Math.floor(d / (m * m));
  const [x, y] = hilbertD2xy(m, d % (m * m));
  if (q < 2) return [m - 1 - y, x + (q === 1 ? m : 0)];
  return [y + m, m - 1 - x + (q === 2 ? m : 0)];
}
export function mooreXy2d(n, [x, y]) {
  const m = n / 2;
  const left = x < m,
    up = y >= m;
  const q = left ? (up ? 1 : 0) : up ? 2 : 3;
  const lx = x - (left ? 0 : m),
    ly = y - (up ? m : 0);
  const local = left ? [ly, m - 1 - lx] : [m - 1 - ly, lx];
  return q * m * m + hilbertXy2d(m, local);
}
// Peano curve on 3^k × 3^k: ternary digits a1 a2 … (most significant
// first); x takes the odd digits, y the even ones, each complemented
// (a → 2 − a) when the sum of the other coordinate's earlier digits is odd.
export function peanoD2xy(k, d) {
  const a = [];
  for (let i = 0; i < 2 * k; i++) {
    a.unshift(d % 3);
    d = Math.floor(d / 3);
  }
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  for (let i = 0; i < k; i++) {
    const ax = a[2 * i],
      ay = a[2 * i + 1];
    x = x * 3 + (sy % 2 ? 2 - ax : ax);
    sx += ax;
    y = y * 3 + (sx % 2 ? 2 - ay : ay);
    sy += ay;
  }
  return [x, y];
}
export function peanoXy2d(k, [x, y]) {
  const xs = [],
    ys = [];
  for (let i = 0; i < k; i++) {
    xs.unshift(x % 3);
    ys.unshift(y % 3);
    x = Math.floor(x / 3);
    y = Math.floor(y / 3);
  }
  let d = 0,
    sx = 0,
    sy = 0;
  for (let i = 0; i < k; i++) {
    const ax = sy % 2 ? 2 - xs[i] : xs[i];
    sx += ax;
    const ay = sx % 2 ? 2 - ys[i] : ys[i];
    sy += ay;
    d = d * 9 + ax * 3 + ay;
  }
  return d;
}

const fragment = `
void hRot(int n, inout ivec2 p, int rx, int ry) {
  if (ry == 0) {
    if (rx == 1) p = ivec2(n - 1) - p;
    p = p.yx;
  }
}
ivec2 hD2xy(int n, int d) {
  ivec2 p = ivec2(0);
  int t = d;
  for (int s = 1; s < 256; s *= 2) {
    if (s >= n) break;
    int rx = 1 & (t >> 1), ry = 1 & (t ^ rx);
    hRot(s, p, rx, ry);
    p += s * ivec2(rx, ry);
    t >>= 2;
  }
  return p;
}
int hXy2d(int n, ivec2 p) {
  int d = 0;
  for (int s = 128; s > 0; s >>= 1) {
    if (s >= n) continue;
    int rx = (p.x & s) > 0 ? 1 : 0, ry = (p.y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    hRot(n, p, rx, ry);
  }
  return d;
}
ivec2 mD2xy(int n, int d) {
  int m = n / 2, q = d / (m * m);
  ivec2 h = hD2xy(m, d % (m * m));
  if (q < 2) return ivec2(m - 1 - h.y, h.x + (q == 1 ? m : 0));
  return ivec2(h.y + m, m - 1 - h.x + (q == 2 ? m : 0));
}
int mXy2d(int n, ivec2 p) {
  int m = n / 2;
  bool left = p.x < m, up = p.y >= m;
  int q = left ? (up ? 1 : 0) : (up ? 2 : 3);
  ivec2 l = p - ivec2(left ? 0 : m, up ? m : 0);
  ivec2 local = left ? ivec2(l.y, m - 1 - l.x) : ivec2(m - 1 - l.y, l.x);
  return q * m * m + hXy2d(m, local);
}
ivec2 pD2xy(int k, int d) {
  int digits[10];
  for (int i = 9; i >= 0; i--) { digits[i] = d % 3; d /= 3; }
  int x = 0, y = 0, sx = 0, sy = 0;
  for (int i = 0; i < 5; i++) {
    if (i >= k) break;
    int ax = digits[10 - 2 * k + 2 * i], ay = digits[10 - 2 * k + 2 * i + 1];
    x = x * 3 + (sy % 2 == 1 ? 2 - ax : ax);
    sx += ax;
    y = y * 3 + (sx % 2 == 1 ? 2 - ay : ay);
    sy += ay;
  }
  return ivec2(x, y);
}
int pXy2d(int k, ivec2 p) {
  int xs[5], ys[5];
  for (int i = 4; i >= 0; i--) {
    if (i >= k) { xs[i] = 0; ys[i] = 0; continue; }
    xs[i] = p.x % 3; ys[i] = p.y % 3; p /= 3;
  }
  int d = 0, sx = 0, sy = 0;
  for (int i = 0; i < 5; i++) {
    if (i >= k) break;
    int ax = sy % 2 == 1 ? 2 - xs[i] : xs[i];
    sx += ax;
    int ay = sx % 2 == 1 ? 2 - ys[i] : ys[i];
    sy += ay;
    d = d * 9 + ax * 3 + ay;
  }
  return d;
}
// Curve kind: 0 Hilbert, 1 Moore, 2 Peano. Order o: n = 2^o or 3^o.
int sSide(int kind, int o) { return kind == 2 ? int(pow(3.0, float(o)) + 0.5) : 1 << o; }
ivec2 sD2xy(int kind, int o, int d) {
  int n = sSide(kind, o);
  return kind == 0 ? hD2xy(n, d) : kind == 1 ? mD2xy(n, d) : pD2xy(o, d);
}
int sXy2d(int kind, int o, ivec2 p) {
  int n = sSide(kind, o);
  return kind == 0 ? hXy2d(n, p) : kind == 1 ? mXy2d(n, p) : pXy2d(o, p);
}
// Vertex d of order o, gliding out of its parent's centre (s: 0 → 1).
vec2 sVertex(int kind, int o, int d, float s) {
  vec2 own = (vec2(sD2xy(kind, o, d)) + 0.5) / float(sSide(kind, o));
  if (o <= 1 || s >= 1.0) return own;
  int base = kind == 2 ? 9 : 4;
  vec2 parent = (vec2(sD2xy(kind, o - 1, d / base)) + 0.5) / float(sSide(kind, o - 1));
  return mix(parent, own, s);
}
float sSeg(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 ab = b - a;
  h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0);
  return length(p - a - ab * h);
}

void main() {
  int variant = int(floor(u_params[0] + 0.5));
  int kind = variant == 3 ? 0 : variant;
  int maxOrder = int(floor(u_params[1] + 0.5));
  if (kind == 2) maxOrder = min(maxOrder, 4);
  if (kind == 1) maxOrder = max(maxOrder, 2);
  int stepIdx = int(floor(u_params[2] + 0.5));
  float flow = u_params[3];
  float width = u_params[4];
  float fill = u_params[5];
  float comet = u_params[6];
  float zoom = u_params[7];
  float t = mod(u_time, 3600.0);
  float beats = u_beat > 0.0 ? u_beat : t * 2.0;

  // Refinement schedule: ping-pong between order 1 (2 for Moore) and max.
  int lo = kind == 1 ? 2 : 1;
  int span = max(maxOrder - lo, 1);
  float per = stepIdx == 0 ? 4.0 : stepIdx == 1 ? 8.0 : stepIdx == 2 ? 16.0 : 32.0;
  float k = beats / per;
  int stepN = int(floor(k)) % (2 * span);
  float within = fract(k);
  // Up: order lo+1 … max gliding out of parents; down: the reverse.
  bool upward = stepN < span;
  int o = upward ? lo + 1 + stepN : maxOrder - (stepN - span);
  float s = smoothstep(0.0, 0.5, within);
  if (!upward) s = 1.0 - s; // coarsening: vertices glide back into parents
  int n = sSide(kind, o);
  int total = n * n;

  // Square of curve space; mirrored copies left and right.
  vec2 q = aspectUV() / zoom + 0.5;
  float copy = floor(q.x);
  float fx = fract(q.x);
  if (mod(copy, 2.0) > 0.5) fx = 1.0 - fx;
  vec2 f = vec2(fx, q.y);
  float px = max(length(fwidth(q)) * 0.7, 1e-6);
  bool inside = q.y >= 0.0 && q.y < 1.0;

  vec3 colour = u_secondary * 0.02;
  if (inside) {
    ivec2 cell = clamp(ivec2(floor(f * float(n))), ivec2(0), ivec2(n - 1));
    float best = 1e9, along = 0.0;
    for (int dy = -1; dy <= 1; dy++)
      for (int dx = -1; dx <= 1; dx++) {
        ivec2 c = cell + ivec2(dx, dy);
        if (any(lessThan(c, ivec2(0))) || any(greaterThanEqual(c, ivec2(n)))) continue;
        int d = sXy2d(kind, o, c);
        int e = d + 1;
        if (e >= total) { if (kind != 1) continue; e = 0; }
        float h;
        float dist = sSeg(f, sVertex(kind, o, d, s), sVertex(kind, o, e, s), h);
        if (dist < best) { best = dist; along = (float(d) + h) / float(total); }
      }
    int own = sXy2d(kind, o, cell);
    float u = along;
    float cycles = 1.0 + float(o);
    vec3 pathColour = palette(fract(u * cycles - t * flow * 0.2 + copy * 0.5));
    // Locality fill: every cell in the colour of its place on the line.
    float cellU = (float(own) + 0.5) / float(total);
    vec3 cellColour = palette(fract(cellU * cycles - t * flow * 0.2 + copy * 0.5));
    colour += cellColour * fill * (variant == 3 ? 0.55 : 0.12);
    float wt = (0.06 + 0.3 * width) / float(n);
    float line = 1.0 - smoothstep(wt - px, wt + px, best);
    float halo = exp(-max(best - wt, 0.0) / (wt + 2.0 * px));
    colour = mix(colour, mix(pathColour, vec3(1.0), 0.25), line * (0.65 + 0.35 * u_level));
    colour += pathColour * halo * 0.25;
    // The comet: one point running the whole line.
    float head = fract(t * (0.01 + 0.04 * flow) + copy * 0.5);
    float gap = fract(head - u);
    colour += mix(u_accent, vec3(1.0), 0.5) * comet * (line + halo * 0.5) * (exp(-gap * 60.0) * 2.0 + exp(-gap * 6.0) * 0.4);
  }
  outColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

const schema = [
  {
    key: "variant",
    label: "Curve · Hilbert / Moore / Peano / Hilbert locality",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  { key: "order", label: "Finest order", min: 2, max: 7, step: 1, default: 6 },
  {
    key: "pace",
    label: "Beats per refinement · 4 / 8 / 16 / 32",
    min: 0,
    max: 3,
    step: 1,
    default: 1,
  },
  {
    key: "flow",
    label: "Colour flow",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "width",
    label: "Line width",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
  },
  {
    key: "fill",
    label: "Locality fill",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  { key: "comet", label: "Comet", min: 0, max: 1, step: 0.01, default: 0.7 },
  { key: "zoom", label: "Zoom", min: 0.5, max: 3, step: 0.01, default: 0.95 },
];

const look = (
  name,
  seed,
  variant,
  order,
  pace,
  flow,
  width,
  fill,
  comet,
  zoom,
) => ({
  name,
  seed,
  params: { variant, order, pace, flow, width, fill, comet, zoom },
});

const presets = [
  look("Hilbert Refinement", 7801, 0, 6, 1, 0.4, 0.4, 0.5, 0.7, 0.95),
  look("Hilbert Strip", 7802, 0, 5, 2, 0.6, 0.5, 0.3, 0.8, 0.6),
  look("Deep Hilbert", 7803, 0, 7, 0, 0.3, 0.3, 0.4, 0.6, 1.4),
  look("Moore Loop", 7804, 1, 6, 1, 0.5, 0.4, 0.4, 0.8, 0.95),
  look("Moore Chase", 7805, 1, 5, 2, 0.8, 0.55, 0.2, 1, 0.9),
  look("Peano Weave", 7806, 2, 4, 1, 0.4, 0.4, 0.45, 0.7, 0.95),
  look("Peano Steps", 7807, 2, 3, 0, 0.6, 0.6, 0.3, 0.8, 0.8),
  look("Locality Blocks", 7808, 3, 6, 1, 0.5, 0.25, 1, 0.5, 0.95),
  look("Locality Flow", 7809, 3, 7, 2, 0.9, 0.2, 0.9, 0.4, 0.7),
];

export default {
  id: "hilbert",
  number: 78,
  name: "Space-filling Curves",
  description:
    "One unbroken line through every cell of a grid: Hilbert's curve, Moore's closed loop and Peano's 3×3 original. Every few beats the curve refines to the next order, each vertex gliding out of its parent cell's centre into its own, then coarsens back. Colour runs along the line by index, so its famous locality shows as blocks of neighbouring colour, and a comet travels the whole line. Mirrored copies join Hilbert curves end to start into an endless strip.",
  energy: { flow: { mul: [0.5, 2] }, comet: [-0.1, 0.3], width: [-0.05, 0.15] },
  beat: { punch: 0.6, pulse: 1 },
  audio: [
    { param: "flow", feature: "low", amount: 0.06 },
    { param: "comet", feature: "onset", amount: 0.15 },
    { param: "width", feature: "high", amount: 0.06 },
  ],
  stage: ["flow", "comet", "fill"],
  type: { key: "variant", values: [0, 1, 2, 3] },
  schema,
  presets,
  fragment,
};
