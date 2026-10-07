// A 512-cell periodic elementary CA. Texture row zero holds the bounded
// history clock; rows 1–511 form a circular buffer of exact binary generations.
const WIDTH = 512;
const HISTORY = 511;

// CPU reference for exact fixtures; bit ordering is Wolfram's (left, self, right).
export function stepTapestry(row, rule) {
  const next = new Uint8Array(row.length);
  const code = Math.round(rule) & 255;
  for (let x = 0; x < row.length; x += 1) {
    const neighborhood =
      (row[(x + row.length - 1) % row.length] << 2) |
      (row[x] << 1) |
      row[(x + 1) % row.length];
    next[x] = (code >>> neighborhood) & 1;
  }
  return next;
}

function seedHash(value) {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Integer hashing matches the GPU, including phrase-boundary seed variations.
// Shape: 0 single island, 1 paired islands, 2 periodic stripe, 3 sparse noise.
export function seedTapestry(
  width = WIDTH,
  seed = 1,
  shape = 0,
  density = 0.08,
  phrase = 0,
) {
  const row = new Uint8Array(width);
  const salt =
    (Math.max(0, Math.trunc(seed)) + Math.imul(phrase & 65535, 1013)) >>> 0;
  const fill = Math.round(density * 100);
  const span = Math.min(97, width);
  const center = Math.floor(width / 2) + (salt % span) - Math.floor(span / 2);
  const period = 4 + Math.floor(((100 - fill) * 28) / 100);
  for (let x = 0; x < width; x += 1) {
    if (shape === 0)
      row[x] = Math.abs(x - center) < 1 + Math.floor(fill / 10) ? 1 : 0;
    else if (shape === 1) {
      const gap = 10 + Math.floor((fill * 120) / 100);
      row[x] =
        Math.min(Math.abs(x - center - gap), Math.abs(x - center + gap)) <
        1 + Math.floor((fill * 4) / 100)
          ? 1
          : 0;
    } else if (shape === 2) {
      row[x] =
        (x + (salt % period)) % period <
        Math.max(1, Math.floor((fill * period) / 100))
          ? 1
          : 0;
    } else
      row[x] =
        (seedHash((x + salt) >>> 0) & 65535) < Math.floor((fill * 65536) / 100)
          ? 1
          : 0;
  }
  return row;
}

const schema = [
  {
    key: "rule",
    label: "Elementary rule",
    min: 0,
    max: 255,
    step: 1,
    default: 90,
  },
  {
    key: "seedShape",
    label: "Seed shape · island / pair / stripe / noise",
    min: 0,
    max: 3,
    step: 1,
    default: 0,
  },
  {
    key: "density",
    label: "Seed fill",
    min: 0.01,
    max: 0.8,
    step: 0.01,
    default: 0.01,
  },
  {
    key: "scroll",
    label: "Scroll · rows per second",
    min: 0,
    max: 60,
    step: 1,
    default: 30,
  },
  {
    key: "weave",
    label: "Woven relief",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.72,
  },
  {
    key: "playback",
    label: "History playback · reverse / pause / forward",
    min: -1,
    max: 1,
    step: 0.05,
    default: 1,
  },
  {
    key: "phrase",
    label: "Reseed phrase · beats (0 off)",
    min: 0,
    max: 32,
    step: 1,
    default: 0,
  },
  {
    key: "paletteDrift",
    label: "Palette drift",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.24,
  },
];

const presets = [
  {
    name: "90 · Nested linen",
    seed: 97,
    params: {
      rule: 90,
      seedShape: 0,
      density: 0.01,
      scroll: 34,
      weave: 0.72,
      playback: 1,
      phrase: 0,
      paletteDrift: 0.12,
    },
  },
  {
    name: "54 · Twin brocade",
    seed: 211,
    params: {
      rule: 54,
      seedShape: 1,
      density: 0.08,
      scroll: 26,
      weave: 0.86,
      playback: 1,
      phrase: 16,
      paletteDrift: 0.3,
    },
  },
  {
    name: "30 · Wild silk",
    seed: 307,
    params: {
      rule: 30,
      seedShape: 3,
      density: 0.06,
      scroll: 48,
      weave: 0.48,
      playback: 1,
      phrase: 0,
      paletteDrift: 0.65,
    },
  },
  {
    name: "184 · Traffic ribbon",
    seed: 401,
    params: {
      rule: 184,
      seedShape: 2,
      density: 0.43,
      scroll: 18,
      weave: 0.38,
      playback: 1,
      phrase: 0,
      paletteDrift: 0.08,
    },
  },
  {
    name: "110 · Persistent knots",
    seed: 509,
    params: {
      rule: 110,
      seedShape: 2,
      density: 0.37,
      scroll: 36,
      weave: 0.76,
      playback: 1,
      phrase: 32,
      paletteDrift: 0.26,
    },
  },
  {
    name: "150 · Interference lace",
    seed: 613,
    params: {
      rule: 150,
      seedShape: 3,
      density: 0.14,
      scroll: 42,
      weave: 0.64,
      playback: 1,
      phrase: 16,
      paletteDrift: 0.44,
    },
  },
  {
    name: "22 · Sparse ceremony",
    seed: 719,
    params: {
      rule: 22,
      seedShape: 1,
      density: 0.1,
      scroll: 14,
      weave: 0.92,
      playback: 1,
      phrase: 0,
      paletteDrift: 0.04,
    },
  },
  {
    name: "126 · Burning fringe",
    seed: 823,
    params: {
      rule: 126,
      seedShape: 0,
      density: 0.1,
      scroll: 54,
      weave: 0.58,
      playback: 1,
      phrase: 8,
      paletteDrift: 0.82,
    },
  },
];

const metadata = `
int readInt(int slot) {
  vec2 bytes = floor(texelFetch(u_state, ivec2(slot, 0), 0).rg * 255. + .5);
  return int(bytes.x) + 256 * int(bytes.y);
}
vec4 packedInt(int value) {
  return vec4(float(value % 256) / 255., float(value / 256) / 255., 0., 1.);
}
int wrapRow(int row) { return (row + 1022) % 511; }
`;

const simulationFragment = `${metadata}
uint seedHash(uint value) {
  value ^= value >> 16u;
  value *= 2246822519u;
  value ^= value >> 13u;
  value *= 3266489917u;
  return value ^ (value >> 16u);
}
float initialCell(int x, int shape, int fill, int phraseIndex) {
  uint salt = u_seedBits + uint(phraseIndex) * 1013u;
  int center = 256 + int(salt % 97u) - 48;
  if (shape == 0) return abs(x - center) < 1 + fill / 10 ? 1. : 0.;
  if (shape == 1) {
    int gap = 10 + fill * 120 / 100;
    return min(abs(x - center - gap), abs(x - center + gap))
      < 1 + fill * 4 / 100 ? 1. : 0.;
  }
  if (shape == 2) {
    int period = 4 + (100 - fill) * 28 / 100;
    int filled = max(1, fill * period / 100);
    return (x + int(salt % uint(period))) % period < filled ? 1. : 0.;
  }
  return int(seedHash(uint(x) + salt) & 65535u) < fill * 65536 / 100 ? 1. : 0.;
}
void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  int rule = int(floor(u_params[0] + .5));
  int shape = int(floor(u_params[1] + .5));
  int densityHundredths = int(floor(u_params[2] * 100. + .5));
  int phrase = int(floor(u_params[6] + .5));
  int phraseIndex = phrase > 0 ? int(floor(max(u_beat, 0.) / float(phrase))) % 65536 : 0;
  ivec3 oldConfig = ivec3(floor(texelFetch(u_state, ivec2(5, 0), 0).rgb * 255. + .5));
  bool reset = u_reset || any(notEqual(oldConfig, ivec3(rule, shape, densityHundredths)));
  int head = reset ? 0 : readInt(0);
  int count = reset ? 1 : readInt(1);
  int back = reset ? 0 : readInt(2);
  float clock = reset ? 0. : float(readInt(3)) / 65535.;
  float playback = clamp(u_params[5], -1., 1.);
  if (!reset) clock += clamp(u_params[3], 0., 60.) * u_dt * abs(playback);
  bool tick = clock >= 1.;
  if (tick) clock -= 1.;
  bool cue = !reset && phrase > 0 && playback > 0. && back == 0
    && readInt(7) == phrase && readInt(6) != phraseIndex;
  bool evolve = !reset && ((tick && playback > 0. && back == 0) || cue);
  int newHead = evolve ? (head + 1) % 511 : head;
  int newCount = evolve ? min(count + 1, 511) : count;
  int newBack = back;
  if (tick && playback < 0.) newBack = min(back + 1, count - 1);
  if (tick && playback > 0. && back > 0) newBack = back - 1;
  if (pixel.y == 0) {
    if (pixel.x == 0) outColor = packedInt(newHead);
    else if (pixel.x == 1) outColor = packedInt(newCount);
    else if (pixel.x == 2) outColor = packedInt(newBack);
    else if (pixel.x == 3) outColor = packedInt(int(floor(clamp(clock, 0., 1.) * 65535. + .5)));
    else if (pixel.x == 5) outColor = vec4(vec3(float(rule), float(shape), float(densityHundredths)) / 255., 1.);
    else if (pixel.x == 6) outColor = packedInt(phraseIndex);
    else if (pixel.x == 7) outColor = packedInt(phrase);
    else outColor = vec4(0., 0., 0., 1.);
    return;
  }
  if (reset) {
    float value = pixel.y == 1 ? initialCell(pixel.x, shape, densityHundredths, 0) : 0.;
    outColor = vec4(value, 0., 0., 1.);
    return;
  }
  if (evolve && pixel.y == newHead + 1) {
    float value;
    if (cue) value = initialCell(pixel.x, shape, densityHundredths, phraseIndex);
    else {
      int left = int(texelFetch(u_state, ivec2((pixel.x + 511) % 512, head + 1), 0).r + .5);
      int self = int(texelFetch(u_state, ivec2(pixel.x, head + 1), 0).r + .5);
      int right = int(texelFetch(u_state, ivec2((pixel.x + 1) % 512, head + 1), 0).r + .5);
      int neighborhood = (left << 2) | (self << 1) | right;
      value = float((rule >> neighborhood) & 1);
    }
    outColor = vec4(value, 0., 0., 1.);
  } else outColor = texelFetch(u_state, pixel, 0);
}
`;

const fragment = `${metadata}
void main() {
  int head = readInt(0);
  int count = readInt(1);
  int back = readInt(2);
  float weave = u_params[4];
  vec2 cloth = v_uv;
  // Geometry and lighting bend the textile; the stored cells remain unmodified.
  float envelope = sin(cloth.x * 3.14159265);
  cloth.x += weave * .008 * envelope * sin(cloth.y * 17. + u_time * .14);
  cloth.x += u_bass * weave * .002 * sin(cloth.y * 35. - u_time * .8);
  float column = clamp(cloth.x, 0., .999999) * 512.;
  float age = (1. - cloth.y) * float(max(32, min(510, count - back - 1))) + float(back);
  int ageIndex = int(floor(age));
  int row = wrapRow(head - ageIndex);
  bool available = ageIndex < count;
  float cell = available ? texelFetch(u_state, ivec2(int(column), row + 1), 0).r : 0.;
  vec2 thread = fract(vec2(column, age));
  vec2 aa = max(fwidth(vec2(column, age)), vec2(.015));
  float warpThread = smoothstep(0., min(.4, aa.x + .1), thread.x)
    * smoothstep(0., min(.4, aa.x + .1), 1. - thread.x);
  float weftThread = smoothstep(0., min(.4, aa.y + .08), thread.y)
    * smoothstep(0., min(.4, aa.y + .08), 1. - thread.y);
  float overUnder = mod(floor(column) + float(ageIndex), 2.);
  float filament = mix(warpThread, weftThread, overUnder);
  float ridge = .78 + .22 * cos(cloth.x * 38. + .25 * sin(cloth.y * 12.));
  float relief = mix(1., ridge * (.62 + .38 * filament), weave);
  float tone = fract(.15 + cloth.x * .26 + float(ageIndex) * .0022
    + u_time * u_params[7] * .018);
  vec3 ink = palette(tone);
  vec3 ground = u_secondary * .055 + vec3(.007, .009, .018);
  vec3 color = mix(ground, ink * (.72 + .2 * u_energy), cell);
  color *= relief;
  // A selvedge frames the huge binary curtain without hiding its cell pattern.
  float edge = smoothstep(0., .015, cloth.x) * smoothstep(0., .015, 1. - cloth.x);
  color *= .35 + .65 * edge;
  if (!available) color = ground * (.32 + .15 * warpThread);
  outColor = vec4(clamp(color, 0., 1.), 1.);
}
`;

export default {
  id: "tapestry",
  number: 51,
  name: "Causal Tapestry",
  description:
    "Exact elementary automata woven into a 511-row curtain. Negative playback revisits recorded history, never inverse dynamics. Seed shape and fill edit the initial row; phrase cues insert fresh seeded rows.",
  schema,
  presets,
  fragment,
  simulation: {
    fragment: simulationFragment,
    size: [WIDTH, HISTORY + 1],
    steps: 1,
  },
};
