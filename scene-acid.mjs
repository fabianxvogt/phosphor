// Gray–Scott art model, not a biological realism claim. Only this scene owns
// these two chemicals: U is nutrient and V is the autocatalytic activator.
const stateCodec = `
vec2 chemicals(vec2 uv) {
  vec4 packedState = texture(u_state, uv);
  return vec2(dot(packedState.rg, vec2(256., 1.)),
              dot(packedState.ba, vec2(256., 1.))) / 257.;
}
vec4 encodeChemicals(vec2 concentration) {
  vec2 bits = floor(clamp(concentration, 0., 1.) * 65535. + .5);
  vec2 upper = floor(bits / 256.);
  vec2 lower = bits - upper * 256.;
  return vec4(upper.x, lower.x, upper.y, lower.y) / 255.;
}
`;

const simulationFragment = `${stateCodec}
// Smooth, seeded geometry rather than independent per-pixel random inoculation.
float inoculum(vec2 uv, float family) {
  vec2 p = (uv - .5) * vec2(u_resolution.x / u_resolution.y, 1.);
  float phase = hash(vec2(3., 7.)) * 6.2831853;
  float mask = 0.;
  if (family < .5) {
    // An organic street plan, interrupted by large negative-space courtyards.
    vec2 q = p + .013 * vec2(sin(p.y * 25. + phase), sin(p.x * 19. - phase));
    vec2 street = abs(fract(q * vec2(9., 7.) + .5) - .5);
    float line = 1. - smoothstep(.035, .09, min(street.x, street.y));
    float courtyard = smoothstep(.09, .14, length(p - vec2(.24, -.12)));
    mask = line * courtyard * (1. - smoothstep(.42, .69, length(p)));
  } else if (family < 1.5) {
    // Three open, nested arches become thick membrane boundaries.
    vec2 q = p * vec2(1.05, 1.35);
    float radius = length(q - vec2(0., -.24));
    float ring = abs(fract(radius * 10. + .16 * sin(atan(q.y, q.x) * 3. + phase)) - .5);
    mask = (1. - smoothstep(.035, .095, ring))
         * smoothstep(-.33, -.25, p.y) * (1. - smoothstep(.34, .66, radius));
  } else if (family < 2.5) {
    // A central bloom with six satellite colonies, not a full-field noise seed.
    mask = 1. - smoothstep(.038, .054, length(p));
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * 1.0471976 + phase;
      vec2 center = vec2(cos(angle), sin(angle)) * .24;
      float ring = abs(length(p - center) - .049);
      mask = max(mask, 1. - smoothstep(.007, .015, ring));
    }
  } else if (family < 3.5) {
    // Quiet orchard: well-separated discs whose positions reproduce from seed.
    for (int i = 0; i < 24; i++) {
      vec2 cell = vec2(float(i % 6), float(i / 6));
      vec2 jitter = vec2(hash(cell + 11.), hash(cell + 31.)) - .5;
      vec2 center = (cell - vec2(2.5, 1.5)) * vec2(.205, .175) + jitter * .043;
      float radius = .016 + .008 * hash(cell + 53.);
      mask = max(mask, 1. - smoothstep(radius, radius + .009, length(p - center)));
    }
  } else if (family < 4.5) {
    // A broad tide of connected lamellae with generous dark margins.
    float fold = p.y + .052 * sin(p.x * 12. + phase) + .026 * sin(p.x * 27. - phase);
    float stripe = abs(sin(fold * 40.));
    mask = (1. - smoothstep(.15, .34, stripe))
         * (1. - smoothstep(.44, .69, length(p * vec2(.8, 1.4))));
  } else {
    // Two branching ribbons: the reaction creates filaments between them.
    float branch = .12 * sin(p.x * 8. + phase) + .037 * sin(p.x * 21.);
    float vein = min(abs(p.y - branch - .085), abs(p.y + branch + .085));
    mask = (1. - smoothstep(.008, .017, vein)) * (1. - smoothstep(.47, .68, abs(p.x)));
    for (int i = 0; i < 9; i++) {
      float x = (float(i) - 4.) * .13;
      vec2 center = vec2(x, .12 * sin(x * 8. + phase) + .16);
      mask = max(mask, 1. - smoothstep(.012, .024, length(p - center)));
    }
  }
  return clamp(mask, 0., 1.);
}

void main() {
  float family = clamp(u_params[5], 0., 5.);
  if (u_reset) {
    float seedMask = inoculum(v_uv, family);
    // High-V inocula occupy coherent discs/ribbons several texels wide.
    outColor = encodeChemicals(mix(vec2(1., 0.), vec2(.48, .29), seedMask));
    return;
  }
  vec2 texel = 1. / vec2(textureSize(u_state, 0));
  vec2 c = chemicals(v_uv);
  // Nine-point isotropic Laplacian: center -1, axial .2, diagonal .05.
  vec2 lap = -c;
  lap += .2 * (chemicals(v_uv + vec2(texel.x, 0.))
             + chemicals(v_uv - vec2(texel.x, 0.))
             + chemicals(v_uv + vec2(0., texel.y))
             + chemicals(v_uv - vec2(0., texel.y)));
  lap += .05 * (chemicals(v_uv + texel) + chemicals(v_uv - texel)
              + chemicals(v_uv + vec2(texel.x, -texel.y))
              + chemicals(v_uv + vec2(-texel.x, texel.y)));
  float audio = clamp(u_params[7], 0., 1.);
  float feed = clamp(u_params[0] + .0012 * audio * clamp(u_bass, 0., 1.), .024, .055);
  float kill = clamp(u_params[1] + .0007 * audio * clamp(u_high, 0., 1.), .050, .067);
  float du = clamp(u_params[3], .65, 1.);
  float dv = .5 * du;
  float h = min(.45, max(0., u_dt) * 27.) * clamp(u_params[2], .25, 1.);
  float reaction = c.x * c.y * c.y;
  vec2 derivative = vec2(du * lap.x - reaction + feed * (1. - c.x),
                         dv * lap.y + reaction - (feed + kill) * c.y);
  c = clamp(c + h * derivative, 0., 1.);

  // Tiny fixed source colonies sustain growth without painting over mature veins.
  // This explicitly disclosed localized source is separate from the Gray–Scott PDE.
  vec2 p = (v_uv - .5) * vec2(u_resolution.x / u_resolution.y, 1.);
  float source = 0.;
  for (int i = 0; i < 3; i++) {
    float angle = float(i) * 2.0943951 + hash(vec2(61., 9.)) * 6.2831853;
    float radius = .14 + .065 * hash(vec2(float(i), 37.));
    vec2 center = vec2(cos(angle), sin(angle)) * radius;
    source = max(source, 1. - smoothstep(.009, .024, length(p - center)));
  }
  float injection = clamp(u_params[4], 0., 1.);
  c = mix(c, vec2(.48, .29), source * injection * h * .025);

  // A brush is a convex local chemical injection, never a full-screen reset.
  vec2 brushDelta = v_uv - clamp(u_gesture.xy, 0., 1.);
  brushDelta.x *= u_resolution.x / u_resolution.y;
  float brushRadius = mix(.018, .054, injection);
  float brush = 1. - smoothstep(brushRadius * .45, brushRadius, length(brushDelta));
  float brushAmount = brush * clamp(u_gesture.z, 0., 1.) * (.08 + .32 * injection) * h;
  c = mix(c, vec2(.42, .34), brushAmount);
  outColor = encodeChemicals(c);
}
`;

const fragment = `${stateCodec}
// Decode BEFORE interpolating: packed low bytes are not linear concentrations.
vec2 smoothChemicals(vec2 uv) {
  vec2 size = vec2(textureSize(u_state, 0));
  vec2 pixel = uv * size - .5;
  vec2 base = floor(pixel);
  vec2 f = fract(pixel);
  vec2 a = chemicals((base + .5) / size);
  vec2 b = chemicals((base + vec2(1.5, .5)) / size);
  vec2 c = chemicals((base + vec2(.5, 1.5)) / size);
  vec2 d = chemicals((base + 1.5) / size);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 texel = 1. / vec2(textureSize(u_state, 0));
  vec2 c = smoothChemicals(v_uv);
  float vx = smoothChemicals(v_uv + vec2(texel.x, 0.)).y
           - smoothChemicals(v_uv - vec2(texel.x, 0.)).y;
  float vy = smoothChemicals(v_uv + vec2(0., texel.y)).y
           - smoothChemicals(v_uv - vec2(0., texel.y)).y;
  float contrast = clamp(u_params[6], .7, 1.9);
  float body = smoothstep(.016, .30, c.y * contrast);
  float ridge = smoothstep(.004, .10, length(vec2(vx, vy)) * contrast);
  float nutrientEdge = smoothstep(.10, .72, 1. - c.x);
  // Spatial palette follows grown chemical structures, not a moving noise field.
  float chroma = clamp(.16 + .55 * body + .24 * nutrientEdge, 0., 1.);
  vec3 ink = palette(chroma);
  vec3 normal = normalize(vec3(-vx * 12., -vy * 12., 1.));
  float relief = .70 + .30 * max(0., dot(normal, normalize(vec3(-.45, .55, 1.))));
  vec3 background = u_secondary * .022 + vec3(.005, .008, .012);
  vec3 color = background + ink * body * relief * .73;
  color += mix(u_primary, u_accent, nutrientEdge) * ridge * .28;
  // Audio accents edges modestly; the simulation supplies all visible motion.
  float audioLight = clamp(u_params[7], 0., 1.) * clamp(u_mid, 0., 1.);
  color += u_accent * ridge * audioLight * .035;
  outColor = vec4(clamp(color, 0., 1.), 1.);
}
`;

export default {
  id: "acid",
  number: 47,
  name: "Acid Mycelium",
  description:
    "A seeded Gray–Scott reaction–diffusion garden. Nutrient and activator grow spots, veins, and membranes; tiny source colonies sustain growth, and a localized brush steers it. An artistic chemical model, not biological realism.",
  schema: [
    {
      key: "feed",
      label: "Nutrient feed",
      min: 0.024,
      max: 0.055,
      step: 0.0001,
      default: 0.029,
    },
    {
      key: "kill",
      label: "Activator decay",
      min: 0.05,
      max: 0.067,
      step: 0.0001,
      default: 0.057,
    },
    {
      key: "speed",
      label: "Growth speed",
      min: 0.25,
      max: 1,
      step: 0.01,
      default: 0.72,
    },
    {
      key: "diffusion",
      label: "Nutrient diffusion",
      min: 0.65,
      max: 1,
      step: 0.01,
      default: 0.9,
    },
    {
      key: "injection",
      label: "Growth injection",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.35,
    },
    {
      key: "composition",
      label: "Seed composition",
      min: 0,
      max: 5,
      step: 1,
      default: 0,
    },
    {
      key: "contrast",
      label: "Structure relief",
      min: 0.7,
      max: 1.9,
      step: 0.01,
      default: 1.2,
    },
    {
      key: "audio",
      label: "Audio influence",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.3,
    },
  ],
  presets: [
    {
      name: "Mycelial City",
      seed: 18,
      params: {
        feed: 0.029,
        kill: 0.057,
        speed: 0.72,
        diffusion: 0.9,
        injection: 0.35,
        composition: 0,
        contrast: 1.2,
        audio: 0.3,
      },
    },
    {
      name: "Vein Cathedral",
      seed: 41,
      params: {
        feed: 0.042,
        kill: 0.059,
        speed: 0.55,
        diffusion: 1,
        injection: 0.22,
        composition: 1,
        contrast: 1.1,
        audio: 0.25,
      },
    },
    {
      name: "Lime Bloom",
      seed: 73,
      params: {
        feed: 0.034,
        kill: 0.061,
        speed: 0.85,
        diffusion: 0.82,
        injection: 0.5,
        composition: 2,
        contrast: 1.45,
        audio: 0.55,
      },
    },
    {
      name: "Night Orchard",
      seed: 101,
      params: {
        feed: 0.03,
        kill: 0.062,
        speed: 0.3,
        diffusion: 0.75,
        injection: 0.15,
        composition: 3,
        contrast: 0.9,
        audio: 0.1,
      },
    },
    {
      name: "Tidal Membrane",
      seed: 149,
      params: {
        feed: 0.037,
        kill: 0.061,
        speed: 0.48,
        diffusion: 1,
        injection: 0.3,
        composition: 4,
        contrast: 1.15,
        audio: 0.35,
      },
    },
    {
      name: "Signal Understory",
      seed: 211,
      params: {
        feed: 0.026,
        kill: 0.055,
        speed: 1,
        diffusion: 0.68,
        injection: 0.65,
        composition: 5,
        contrast: 1.65,
        audio: 0.7,
      },
    },
  ],
  fragment,
  // Fixed engine ticks, eight ping-pong substeps per 1/60 s, not eight in-shader
  // neighbor updates. h <= .45. Du in [.65,1], Dv = Du/2, F <= .055,
  // K <= .067, so Euler loss factors are nonnegative for U,V in [0,1]:
  // 1-h*(Du+V^2+F) >= .07525; 1-h*(Dv+F+K) >= .7201.
  // The stencil spectrum is [-1.6,0], hence h*Du*1.6 <= .72 < 2.
  // Even the worst checkerboard diffusion mode has positive gain >= .28.
  // Upper concentration projection and convex source/brush mixtures maintain
  // finite [0,1] state for every advertised setting. Projection is a numerical
  // bound, not a claim of exact chemistry. RG/BA stores 16 bits per species;
  // nearest rounding error <= 1/(2*65535), avoiding RG8 reaction pinning.
  simulation: { fragment: simulationFragment, size: [320, 192], steps: 8 },
};
