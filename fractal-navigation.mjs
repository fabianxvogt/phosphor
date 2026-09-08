// A five-level periodic sponge: empty cross-passages cut through solid space.
// Positive distance denotes navigable space; the finite recursion is deliberate.
export const FRACTAL_WORLD = 'recursive-passages-v1';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const wrapPosition = v => v >= -3 && v < 3 ? v : ((v + 3) % 6 + 6) % 6 - 3;
export const defaultFlightPose = () => ({ position: [-0.24, 0.16, -2.1], yaw: 0.28, pitch: 0.12 });

export function validateFlightPose(value = defaultFlightPose()) {
  if (!value || !Array.isArray(value.position) || value.position.length !== 3 ||
      !value.position.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e6) ||
      !Number.isFinite(value.yaw) || !Number.isFinite(value.pitch) || Math.abs(value.pitch) > 1.45 || Math.abs(value.yaw) > Math.PI) {
    throw new Error('Flight pose is malformed');
  }
  return { position: value.position.map(wrapPosition), yaw: value.yaw, pitch: value.pitch };
}

export function worldDistance(point, scale = 2.05) {
  // Scale changes the passage width without changing the periodic cell size.
  const opening = 0.29 + (clamp(scale, 2.05, 2.45) - 2.05) * 0.22;
  let distance = -3;
  let cell = 6;
  for (let level = 0; level < 5; level += 1) {
    const a = point.map(v => Math.abs(((v + cell / 2) % cell + cell) % cell - cell / 2)).sort((a, b) => a - b);
    distance = Math.max(distance, cell * opening / 2 - a[1]);
    cell /= 3;
  }
  return distance;
}

export function flightBasis(pose) {
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  return { forward: [sy * cp, sp, cy * cp], right: [cy, 0, -sy], up: [-sy * sp, cp, -cy * sp] };
}

export function turnFlight(pose, yaw, pitch) {
  return { position: [...pose.position], yaw: ((pose.yaw + yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI,
    pitch: clamp(pose.pitch + pitch, -1.45, 1.45) };
}

export function advanceFlight(pose, input, dt, settings = {}) {
  const seconds = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  const axis = key => clamp(Number.isFinite(input[key]) ? input[key] : 0, -1, 1);
  const next = turnFlight(pose, axis('turn') * seconds * 1.4, axis('look') * seconds * 1.1);
  const { forward, right } = flightBasis(next);
  const direction = forward.map((v, i) => v * axis('forward') + right[i] * axis('strafe') + (i === 1 ? axis('rise') : 0));
  const length = Math.hypot(...direction);
  if (!length) return { pose: next, blocked: false, moved: false };
  const speed = clamp(Number.isFinite(settings.speed) ? settings.speed : 0.18, 0, 0.8) * 3;
  let remaining = speed * seconds * Math.min(length, 1);
  let position = [...next.position], blocked = false, moved = false;
  // Conservative substeps prevent crossing narrow walls at a large frame delta.
  for (let step = 0; step < 32 && remaining > 1e-7; step += 1) {
    const clearance = worldDistance(position, settings.scale) - 0.035;
    if (clearance <= 0) { blocked = true; break; }
    const distance = Math.min(remaining, Math.max(clearance * 0.5, 0.000001), 0.025);
    const candidate = position.map((v, i) => wrapPosition(v + direction[i] / length * distance));
    if (worldDistance(candidate, settings.scale) < 0.035) { blocked = true; break; }
    position = candidate;
    remaining -= distance;
    moved = true;
  }
  if (remaining > 1e-7) blocked = true;
  return { pose: { ...next, position }, blocked, moved };
}

export const WORLD_GLSL = `
float mapScene(vec3 p, out float trap) {
  float d = -3.0;
  float cell = 6.0;
  float opening = 0.29 + (clamp(u_fractalScale, 2.05, 2.45) - 2.05) * 0.22;
  trap = 0.0;
  for (int level = 0; level < 5; level++) {
    vec3 a = abs(mod(p + cell * 0.5, cell) - cell * 0.5);
    float middle = max(min(a.x, a.y), min(max(a.x, a.y), a.z));
    float passage = cell * opening * 0.5 - middle;
    if (passage > d) { d = passage; trap = float(level) * 0.13 + 0.025; }
    cell /= 3.0;
  }
  return d;
}
`;
