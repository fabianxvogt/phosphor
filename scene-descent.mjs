import { familyEffect } from "./family-rhythm.mjs";

// Fractal Descent: one continuous raymarched space. A coarse "hall" carving
// one level above the Menger sponge opens with development: the sponge
// corridor (0) widens into a hypostyle cavern lit through ceiling shafts (1),
// whose floors and ceilings then recede into an endless city of recursive
// towers (2). The field is morphed, never crossfaded. Travel is integrated in
// a one-texel state (phase + wrap counter), so glides never teleport and
// seeded per-block variation stays fixed while the camera keeps flying.

const schema = [
  {
    key: "development",
    label: "Development · corridor / cavern / city",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
  },
  {
    key: "speed",
    label: "Flight speed",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.5,
  },
  {
    key: "detail",
    label: "Recursion levels",
    min: 2,
    max: 5,
    step: 0.01,
    default: 3.2,
  },
  {
    key: "opening",
    label: "Passage width",
    min: 0.75,
    max: 1.2,
    step: 0.01,
    default: 1,
  },
  { key: "bank", label: "Banking", min: 0, max: 1, step: 0.01, default: 0.6 },
  {
    key: "glow",
    label: "Window lights",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.8,
  },
  { key: "fog", label: "Depth fog", min: 0, max: 1, step: 0.01, default: 0.5 },
  {
    key: "light",
    label: "Shaft light",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 1,
  },
];

const base = {
  speed: 0.5,
  detail: 3.2,
  opening: 1,
  bank: 0.6,
  glow: 0.8,
  fog: 0.5,
  light: 1,
};
const look = (name, seed, development, params = {}) => ({
  name,
  seed,
  params: { development, ...base, ...params },
});

const presets = [
  // World states: one seed, identical parameters, development at integers.
  look("Sponge Corridor", 9301, 0),
  look("Pillared Cavern", 9301, 1),
  look("Endless City", 9301, 2),
  look("Ember Gallery", 9302, 0.4, {
    speed: 0.3,
    glow: 1.1,
    fog: 0.45,
  }),
  look("Quiet Vault", 9303, 1, {
    speed: 0.25,
    detail: 3.6,
    bank: 0.3,
    fog: 0.4,
    glow: 0.5,
    light: 1.3,
  }),
  look("Lantern Arcology", 9304, 2, {
    speed: 0.35,
    glow: 1.3,
    fog: 0.6,
    light: 0.6,
  }),
  look("Skyfall Streets", 9305, 1.6, {
    speed: 0.8,
    bank: 1,
    detail: 3,
    fog: 0.4,
  }),
  look("Narrow Lattice", 9306, 0.25, {
    speed: 0.6,
    opening: 0.85,
    detail: 3.5,
    glow: 1,
  }),
];

// Phase wraps every six units (the coarse lattice period); the counter
// records completed wraps so seeded block variation continues seamlessly.
const simulation = `
void main() {
  vec2 state = unpack16(texture(u_state, vec2(0.5)));
  if (u_reset) state = vec2(fract(u_seed * 0.0173), 0.0);
  else {
    float d = clamp(u_params[0], 0.0, 2.0);
    float x = state.x + u_dt * u_params[1] * 0.85 * (1.0 + 0.55 * d) / 6.0;
    float wraps = floor(x);
    float counter = floor(state.y * 65535.0 + 0.5);
    state = vec2(x - wraps, mod(counter + wraps, 65535.0) / 65535.0);
  }
  outColor = pack16(state);
}
`;

const fragment = `
const int RAY_CAP = 96;
const int LEVEL_CAP = 5;

// Per-frame constants, assigned once in main().
float gCave, gCity, gVar, gCounter, gW0, gW, gLevels, gDetail, gLodScale;
vec2 gXs, gZs, gYs;
vec3 gL;

// Infinite cross of three square prisms, half-width w; negative inside.
float dsCross(vec3 p, float w) {
  vec3 a = abs(p);
  return min(max(a.x, a.y), min(max(a.y, a.z), max(a.z, a.x))) - w;
}

// Block randoms are cached per call site: march steps mostly stay in one
// block, and the sunlight probe has its own slot.
vec2 gCacheCell[2];
vec4 gCacheR[2];
vec4 dsCellRandomCached(vec2 cell, int slot) {
  if (cell == gCacheCell[slot]) return gCacheR[slot];
  uint h = cellHash(uvec3(ivec3(vec3(cell.x + gCounter, 0.0, cell.y))));
  gCacheCell[slot] = cell;
  gCacheR[slot] = vec4(uvec4(h, h >> 8, h >> 16, h >> 24) & 255u) / 255.0;
  return gCacheR[slot];
}
vec4 dsCellRandom(vec3 cell) {
  uint h = cellHash(uvec3(ivec3(cell + vec3(gCounter, 0.0, 0.0))));
  return vec4(uvec4(h, h >> 8, h >> 16, h >> 24) & 255u) / 255.0;
}

// The coarse hall carving one level above the sponge (cells of six units):
// the street the camera travels along x, cross streets along z and vertical
// shafts. Negative inside free space. Per-block variation only widens the
// camera's street, so the camera core stays free in every cell.
void dsHallSizes(vec3 cell, int slot, out vec2 xs, out vec2 zs, out vec2 ys, out float deck) {
  xs = gXs; zs = gZs; ys = gYs;
  deck = 0.0;
  if (gVar > 0.0) {
    vec4 r = dsCellRandomCached(cell.xz, slot);
    xs.y *= 1.0 + gVar * 0.3 * r.x;
    zs.x *= mix(1.0, mix(0.55, 1.3, r.y), gVar);
    ys *= mix(1.0, mix(0.6, 1.4, r.z), gVar);
    // City blocks: a few gateways span the street; some cross streets close
    // into bridges. Both stay outside the camera core. Variation depends on
    // the x/z column only, so only vertical block faces bound the step.
    xs.x = mix(xs.x, min(xs.x, 2.7), step(r.w, 0.16) * gCity);
    zs.y = mix(zs.y, min(zs.y, 1.6 + 2.2 * r.x), step(0.72, r.w) * gCity);
    // Every third block along the flight is an avenue: its towers recede
    // and open a deep sideways vista (scale cue of few large voids).
    float avenue = step(mod(cell.x + gCounter, 3.0), 0.5) * gCity;
    zs.x = mix(zs.x, 3.4, avenue);
    // City decks: perforated megastructure floors every 18 units of height,
    // far above and below the flight, in about half of the blocks.
    deck = 0.4 * gCity * step(fract(r.x * 7.0 + r.w * 3.0), 0.55);
  }
}

float dsHall(vec3 p, bool clampCells) {
  vec3 cell = floor(p / 6.0 + 0.5);
  vec3 a = abs(p - cell * 6.0);
  vec2 xs, zs, ys;
  float deck;
  dsHallSizes(cell, clampCells ? 0 : 1, xs, zs, ys, deck);
  float c = min(max(a.y - xs.x, a.z - xs.y),
    min(max(a.x - zs.x, a.y - zs.y), max(a.x - ys.x, a.z - ys.y)));
  if (deck > 0.0)
    c = max(c, deck - abs(mod(p.y, 18.0) - 9.0));
  // Neighbouring blocks differ: never step further than into the next
  // block, unless the narrowest variant of every block is still open there.
  // That variant is a subset of all free space, so its distance is a bound.
  float face = max(a.x, a.z) - 3.05;
  // The narrow variant lies inside every block's variant, so it can only
  // matter when the face bound would otherwise shorten the step.
  if (clampCells && gVar > 0.0 && c < face) {
    vec2 mx = vec2(mix(gXs.x, min(gXs.x, 2.7), gCity), gXs.y);
    vec2 mz = vec2(gZs.x * mix(1.0, 0.55, gVar), mix(gZs.y, min(gZs.y, 1.6), gCity));
    vec2 my = gYs * mix(1.0, 0.6, gVar);
    float narrow = min(max(a.y - mx.x, a.z - mx.y),
      min(max(a.x - mz.x, a.y - mz.y), max(a.x - my.x, a.z - my.y)));
    narrow = max(narrow, 0.4 * gCity - abs(mod(p.y, 18.0) - 9.0));
    c = min(narrow, face);
  }
  return c;
}

// max(u, v) of two axis terms and its gradient (unit axis with sign of q).
float dsMaxGrad(float u, vec3 gu, float v, vec3 gv, out vec3 g) {
  g = u > v ? gu : gv;
  return max(u, v);
}

// Every face of this field is axis-aligned, so the surface normal follows
// from the winning term exactly: one evaluation instead of four samples.
vec3 dsNormal(vec3 p) {
  vec3 cell = floor(p / 6.0 + 0.5);
  vec3 q = p - cell * 6.0, a = abs(q), sq = sign(q);
  vec3 ex = vec3(sq.x, 0.0, 0.0), ey = vec3(0.0, sq.y, 0.0), ez = vec3(0.0, 0.0, sq.z);
  vec2 xs, zs, ys;
  float deck;
  dsHallSizes(cell, 1, xs, zs, ys, deck);
  vec3 g, gt;
  float c = dsMaxGrad(a.y - xs.x, ey, a.z - xs.y, ez, g);
  float t = dsMaxGrad(a.x - zs.x, ex, a.y - zs.y, ey, gt);
  if (t < c) { c = t; g = gt; }
  t = dsMaxGrad(a.x - ys.x, ex, a.z - ys.y, ez, gt);
  if (t < c) { c = t; g = gt; }
  if (deck > 0.0) {
    float m = mod(p.y, 18.0) - 9.0;
    t = deck - abs(m);
    if (t > c) { c = t; g = vec3(0.0, -sign(m), 0.0); }
  }
  float holes = c, scale = 1.0;
  for (int i = 0; i < LEVEL_CAP; ++i) {
    if (float(i) >= gLevels) break;
    q = mod(p * scale + 1.0, 2.0) - 1.0;
    a = abs(q); sq = sign(q);
    float w = (i == 0 ? gW0 : gW) * clamp(gLevels - float(i), 0.0, 1.0);
    vec3 gx, gy, gz;
    float px = dsMaxGrad(a.y, vec3(0.0, sq.y, 0.0), a.z, vec3(0.0, 0.0, sq.z), gx);
    float py = dsMaxGrad(a.z, vec3(0.0, 0.0, sq.z), a.x, vec3(sq.x, 0.0, 0.0), gy);
    float pz = dsMaxGrad(a.x, vec3(sq.x, 0.0, 0.0), a.y, vec3(0.0, sq.y, 0.0), gz);
    float m = min(px, min(py, pz));
    float cl = (m - w) / scale;
    if (cl < holes) { holes = cl; g = m == px ? gx : (m == py ? gy : gz); }
    scale *= 3.0;
    if (holes <= -gW / scale) break;
  }
  return -g;
}

// Signed distance to solid, positive in free space. trap is the level whose
// carving wins (-1 = hall, 0.. = sponge recursion); first winner on ties.
float dsMap(vec3 p, out float trap, bool clampCells) {
  float holes = dsHall(p, clampCells);
  trap = -1.0;
  float scale = 1.0;
  for (int i = 0; i < LEVEL_CAP; ++i) {
    if (float(i) >= gLevels) break;
    vec3 q = mod(p * scale + 1.0, 2.0) - 1.0;
    float w = (i == 0 ? gW0 : gW) * clamp(gLevels - float(i), 0.0, 1.0);
    float c = dsCross(q, w) / scale;
    if (c < holes) { holes = c; trap = float(i); }
    scale *= 3.0;
    // Later crosses are at least -gW / scale (gW >= gW0).
    if (holes <= -gW / scale) break;
  }
  return -holes;
}

// Sunlight through the coarse structure: project along the light to just
// above the hall ceiling (cavern) or a block above (city) and test openness.
float dsSky(vec3 p, bool fine) {
  float top = min(gXs.x + 0.3, p.y + 4.0);
  vec3 s = p + gL * (max(top - p.y, 0.0) / gL.y);
  // Openings: the hall and the vertical shafts of the two coarsest sponge
  // levels, so light also falls through holes in corridor ceilings. Beams
  // use only the coarser openings so the volume stays legible, not hazy.
  vec2 a0 = abs(mod(s.xz + 1.0, 2.0) - 1.0), a1 = abs(mod(s.xz * 3.0 + 1.0, 2.0) - 1.0);
  float gap = dsHall(s, false);
  // Corridor beams fall through the sponge's own ceiling holes; in the open
  // states only the hall shafts and streets cast beams, which stay legible.
  if (fine || gCave < 0.5) gap = min(gap, max(a0.x, a0.y) - gW0);
  if (fine) gap = min(gap, (max(a1.x, a1.y) - gW) / 3.0);
  float edge = fine ? 0.03 : 0.12;
  return smoothstep(edge, -edge, gap);
}

// Occlusion probes at radius h only need holes wider than about h / 2, so
// each probe caps the recursion (the field only gains solid when capped).
float dsOcclusion(vec3 p, vec3 n, float reach) {
  float blocked = 0.0, weight = 0.5, tmp, levels = gLevels;
  for (int i = 0; i < 4; ++i) {
    float h = reach * 0.018 * pow(3.0, float(i));
    gLevels = min(levels, max(1.0, log(2.6 * gW / h) / log(3.0)));
    blocked += weight * max(0.0, 1.0 - dsMap(p + n * h, tmp, false) / h);
    weight *= 0.5;
  }
  gLevels = levels;
  return clamp(1.0 - blocked * 0.85, 0.15, 1.0);
}

void main() {
  vec2 state = unpack16(texture(u_state, vec2(0.5)));
  float dev = clamp(u_params[0], 0.0, 2.0);
  float level = clamp(u_level, 0.0, 1.0);
  float open = clamp(u_params[3], 0.75, 1.2);
  float bankAmount = u_params[4];
  float glowAmount = u_params[5];
  float fog = u_params[6];
  float light = u_params[7];
  float bass = smoothstep(0.0, 1.0, clamp(u_low, 0.0, 1.0));
  float kick = u_kick * smoothstep(0.15, 1.0, level);

  // Development morphs the field: hall half-sizes grow from the sponge's own
  // corridor (open / 3) to a cavern, then floors and ceilings recede.
  gCave = smoothstep(0.0, 1.0, dev);
  gCity = smoothstep(1.0, 2.0, dev);
  gVar = smoothstep(0.35, 1.25, dev);
  gCounter = floor(state.y * 65535.0 + 0.5);
  float b = open / 3.0;
  float rise = exp(2.8 * gCity);
  gXs = vec2(mix(b, 2.6, gCave) * rise, mix(b, 2.0, gCave) - 0.1 * gCity);
  gZs = vec2(mix(b, 2.1, gCave) - 0.6 * gCity, mix(b, 2.6, gCave) * exp(3.2 * gCity));
  gYs = vec2(mix(b, 0.9, gCave), mix(b, 0.9, gCave));
  gW = b;
  gW0 = b * mix(1.0, 0.6, gCity);
  gDetail = clamp(u_params[2], 2.0, 5.0);
  gLevels = gDetail;
  gCacheCell[0] = gCacheCell[1] = vec2(1e9);
  gL = normalize(vec3(0.62, 0.85, 0.3));

  // Camera: sway and bob scale with the guaranteed free core of the
  // camera's street, which is never narrower than the sponge corridor.
  float s = state.x * 6.0 + u_rhythm.y * 0.05 * (1.0 + dev);
  float w = s * TAU / 6.0;
  float coreY = min(gXs.x, 1.6) - b, coreZ = gXs.y - b;
  float ay = 0.15 * b + 0.5 * coreY, az = 0.15 * b + 0.55 * coreZ;
  vec3 ro = vec3(s, ay * sin(2.0 * w + 1.3), az * sin(w));
  vec3 velocity = vec3(1.0, ay * 2.0 * cos(2.0 * w + 1.3), az * cos(w)) ;
  // In the city the gaze swings slowly to alternate sides, so every third
  // block's avenue opens as a deep sideways vista (period 36 units).
  float route = mod(gCounter, 6.0) * 6.0 + s;
  float vista = 0.6 * gCity * cos(TAU * route / 36.0);
  vec3 fw = normalize(vec3(1.0, 0.2 * velocity.y - 0.08 * gCity, 0.4 * velocity.z + vista));
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 rt = normalize(cross(up, fw));
  up = cross(fw, rt);
  // Bank into the lateral turn: at most 0.16 rad (about 9 degrees).
  float roll = bankAmount * 0.16 * smoothstep(0.0, 0.6, az) * sin(w);
  vec2 uv = rot2(roll) * (aspectUV() * 2.0);
  float focal = 1.35 * (1.0 + kick * 0.025);
  vec3 rd = normalize(fw * focal + rt * uv.x + up * uv.y);

  int limit = int(min(float(RAY_CAP), u_raySteps));
  float tMax = 14.0 + 8.0 * gCave + 2.0 * gCity;
  float extinction = (0.035 + fog * 0.12) / (1.0 + 1.1 * gCave + 0.2 * gCity);
  // Level of detail: recursion stops where its holes would shrink below
  // about 1.5 output pixels (fractional, so it fades rather than pops).
  // This removes shimmer and work; the field only gains solid, never loses.
  // Above 1440 lines the cutoff grows with resolution (2.25 px at 2160),
  // so 4K keeps the detail of a 1440p frame instead of paying for
  // near-sub-pixel holes.
  float lodPixels = 1.5 * max(1.0, u_resolution.y / 1440.0);
  gLodScale = 2.0 * gW * focal * u_resolution.y / (2.0 * lodPixels);
  // Surface tolerance of about 0.6 output pixels (same 1440-line rule).
  float hitScale = 1.2 * max(1.0, u_resolution.y / 1440.0) / (focal * u_resolution.y);
  float t = 0.02, trap = 0.0, edge = 0.0, scattering = 0.0, d = 1.0;
  bool hit = false;
  float beamHeld = 0.0;
  // Sunlight is the corridor's hero; open states rely on more beams instead.
  float beamGain = mix(3.4, 2.2, gCave);
  // Narrow corridor beams need a denser medium than the wide cavern shafts;
  // the city keeps only faint shafts between towers.
  float beamDensity = mix(0.3, 0.05, gCave) * (1.0 - smoothstep(0.0, 0.45, gCity));
  for (int i = 0; i < RAY_CAP; ++i) {
    if (i >= limit) break;
    vec3 p = ro + rd * t;
    gLevels = min(gDetail, max(1.5, log(gLodScale / t) / log(3.0)));
    d = dsMap(p, trap, true);
    if (d < hitScale * t) { hit = true; break; }
    float segment = min(d * 0.9, tMax - t);
    // Light reuses the governed march: sunlight through ceiling holes in the
    // corridor, shafts in the cavern and gaps between towers in the city.
    // Sampled on alternate steps and held: half the probes, same shafts.
    if ((i & 1) == 0 && segment > 0.03 && t < 18.0) {
      // Drifting dust breaks the shafts into soft volumetric streaks.
      float phase = mod(u_time * 0.21, TAU);
      float dust = sin(dot(p, vec3(1.7, 0.3, 2.3)) + phase) * sin(dot(p, vec3(-0.9, 1.3, 0.7)) * 1.7 - phase);
      beamHeld = beamGain * dsSky(p, false) * (0.6 + 0.4 * dust);
    }
    float beam = segment > 0.03 && t < 18.0 ? beamHeld : 0.0;
    // Scattering density is independent of the fog, so beams stay crisp.
    // Beams start a little ahead of the lens, so passing through a shaft
    // never veils the whole frame.
    // A fixed falloff (not the fog) keeps distant shafts from piling into haze
    // when energy thins the fog.
    scattering += exp(-t * max(extinction, 0.11)) * segment * (0.002 + beam * light * beamDensity * smoothstep(0.2, 1.2, t));
    edge += exp(-max(d, 0.0) * 90.0) * min(segment, 0.03) * 0.6;
    t += segment;
    if (t >= tMax) break;
  }
  // Out of steps close to a surface: shade it rather than leaving a hole.
  if (!hit && t < tMax && d < 0.03 * t) hit = true;

  vec3 cityGlow = mix(u_primary, u_secondary, 0.45);
  vec3 atmCave = mix(u_secondary, u_primary, 0.25) * 0.06;
  // The city's haze glows from its lit depths: aerial perspective turns far
  // towers into layered silhouettes, darkest overhead.
  vec3 atmCity = mix(u_secondary * 0.035, cityGlow * 0.26, smoothstep(0.35, -0.75, rd.y));
  vec3 atmosphere = mix(atmCave, atmCity, gCity);
  vec3 col = vec3(0.0);
  if (hit) {
    vec3 hp = ro + rd * t;
    float tmp;
    vec3 n = dsNormal(hp);
    float occlusion = dsOcclusion(hp, n, 1.0 + 1.5 * gCave);
    // One dark structural stone for every level, so cut sponge grooves read
    // as relief rather than as clutter in a second colour. Deeper levels are
    // only slightly lighter; accent stays reserved for lights.
    vec4 r = dsCellRandom(floor(hp / 6.0 + 0.5));
    vec3 stone = mix(u_secondary, palette(0.2 + 0.4 * r.x * gVar), 0.4);
    vec3 tint = palette(0.15 + 0.17 * clamp(trap, 0.0, 3.0));
    vec3 material = mix(stone, tint, 0.2) * (0.5 + 0.06 * clamp(trap, -1.0, 3.0)) * (1.0 - 0.2 * gCity);
    float head = max(dot(n, -rd), 0.0);
    float sun = max(dot(n, gL), 0.0);
    if (sun > 0.0) {
      float sh = dsSky(hp + n * 0.02, true);
      float levels = gLevels;
      gLevels = min(levels, 1.5);
      float s1 = dsMap(hp + gL * 0.25, tmp, false);
      gLevels = levels;
      sun *= sh * clamp(s1 / 0.25 * 1.5, 0.0, 1.0);
    }
    float sky = 0.5 + 0.5 * n.y;
    // The headlight falls off with distance so depth reads as darkness.
    float att = 1.0 / (1.0 + 0.07 * t * t);
    // Dark ground: a dim headlight; the sun patches carry the corridor and
    // cavern, while the night city keeps the sun low against its windows.
    float sunGain = mix(mix(2.2, 1.9, gCave), 1.1, gCity);
    float shade = 0.02 + light * (mix(0.18, 0.3, gCave) * head * head * att +
      sunGain * sun + mix(0.05, 0.14, gCave) * (1.0 - 0.3 * gCity) * sky);
    col = material * shade * occlusion;
    // Night city: faces turned downwards catch the glow of the depths.
    col += material * cityGlow * 0.35 * gCity * max(-n.y, 0.0) * occlusion;
    // A level still fading in (by energy or distance) shows as dark grooves
    // rather than bright sub-pixel slits; it brightens as it opens.
    if (trap >= 0.0) col *= mix(0.25, 1.0, clamp(gLevels - trap, 0.0, 1.0));
    float rim = pow(max(1.0 - head, 0.0), 3.0);
    col += mix(u_secondary, u_primary, 0.65) * rim * glowAmount *
      (0.06 + level * 0.16 + bass * (0.14 + level * 0.5)) * occlusion;
    // Window lights: inner faces of recursive holes, seeded per window and
    // continuous across travel wraps. More windows light as the city forms.
    if (trap >= 0.0 && trap < 2.5) {
      float sc = pow(3.0, trap);
      vec3 cid = floor((hp * sc + 1.0) * 0.5);
      uvec3 id = uvec3(ivec3(cid));
      id.x += uint(gCounter) * uint(3.0 * sc + 0.5);
      uint wh = cellHash(id ^ uvec3(0u, uint(trap) * 7919u, 0x9e37u));
      float r1 = float(wh >> 8) / 16777216.0;
      float r2 = float(wh & 255u) / 255.0;
      // Lights live in the city; the corridor keeps a few deep embers.
      float allowed = trap < 0.5 ? 0.4 * gCity : gCity + 0.3 * (1.0 - gCave);
      float chance = 0.3 + 0.2 * level;
      vec3 block = floor(hp / 6.0 + 0.5);
      uint fh = cellHash(uvec3(ivec3(block.x + gCounter, cid.y, block.z)) ^ uvec3(0x51u, uint(trap), 0u));
      float floorOn = step(float(fh >> 8) / 16777216.0, 0.35 + 0.3 * level);
      // Light one horizontal tunnel of the window's cross, chosen per window,
      // so lights read as panes and slots rather than plus signs.
      vec3 wq = abs(mod(hp * sc + 1.0, 2.0) - 1.0);
      float tx = max(wq.y, wq.z), tz = max(wq.x, wq.y);
      float tunnel = r2 < 0.55 ? step(tz, min(tx, max(wq.x, wq.z))) : step(tx, min(tz, max(wq.x, wq.z)));
      float lit = step(r1, chance) * floorOn * allowed * tunnel;
      float band = mod(u_rhythmCount.x, 4.0);
      float cohort = step(abs(floor(r2 * 4.0) - band), 0.5) * u_rhythm.x * allowed * tunnel;
      vec3 lamp = r2 < 0.12 ? u_accent : mix(u_primary, vec3(1.0), 0.3);
      float depth = clamp(1.0 - head * 0.5, 0.5, 1.0);
      // On every beat one floor band of the city answers the kick; the band
      // climbs a floor per beat, so the towers carry the bar's rhythm.
      float storey = floor(hp.y * 1.5);
      float chase = step(mod(storey - floor(u_beat), 4.0), 0.5) * u_kick * gCity * tunnel * step(0.5, r1 * 2.0 + floorOn);
      col += lamp * glowAmount * depth * (lit * (1.2 + r1 / chance) + cohort * 0.9 + chase * 0.7);
    }
  }
  float transmission = exp(-min(t, tMax) * extinction);
  col = mix(atmosphere, col, hit ? transmission : 0.0);
  vec3 beamColour = mix(u_primary, vec3(1.0), 0.25);
  vec3 seamColour = mix(u_accent, u_primary, 0.5 + 0.5 * sin(s * TAU / 6.0 + trap));
  col += seamColour * glowAmount * edge * (1.0 - 0.85 * gCity) *
    (1.0 + bass * level + u_rhythm.z);
  col += mix(seamColour, beamColour, 0.6 + 0.4 * gCave) * min(scattering, 0.6) *
    (0.5 + level * 0.1 + bass * level * 0.3);
  outColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

export default {
  id: "descent",
  number: 93,
  name: "Fractal Descent",
  description:
    "One continuous raymarched space: a coarse carving above a Menger sponge widens the sponge corridor into a pillared cavern lit through ceiling shafts, then dissolves its floors into an endless city of recursive towers with seeded window lights. Development morphs the distance field itself; travel and block variation are integrated, so the flight never jumps. Energy raises speed, recursion and window density.",
  development: "development",
  schema,
  presets,
  stage: ["speed", "bank", "glow"],
  type: { key: "development", values: [0, 1, 2] },
  energy: {
    speed: { mul: [0.65, 1.3] },
    detail: [2.6, 4.4],
    fog: [0.6, 0.35],
  },
  beat: { punch: 0.6, pulse: 0.5 },
  audio: [
    { param: "glow", feature: "low", amount: 0.1 },
    { param: "light", feature: "high", amount: 0.06 },
  ],
  rhythm: [
    familyEffect(
      "window-cohort",
      0,
      "Window cohort",
      "One seeded cohort of recursive windows lights together.",
      { period: 4, strength: 0.6, duration: 1 },
    ),
    familyEffect(
      "descent-impulse",
      1,
      "Flight impulse",
      "Advance the camera a bounded distance along its street and settle back.",
      { period: 8, strength: 0.5, duration: 1, kind: "motion" },
    ),
    familyEffect(
      "seam-surge",
      2,
      "Seam surge",
      "The sponge's recursive edges flare once.",
      { period: 16, strength: 0.6, duration: 2 },
    ),
  ],
  fragment,
  simulation: { fragment: simulation, size: [1, 1], steps: 1 },
};
