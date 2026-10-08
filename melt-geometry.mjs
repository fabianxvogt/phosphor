// Camera-space vertices and their projections. RGBA32F is a core WebGL2
// sampled format; no float framebuffer or blending extension is required.
export const MELT_POINTS = 162;
export const MELT_ROWS = 6;

export function updateMeltGeometry(params, time, data) {
  const tau = Math.PI * 2;
  const family = Math.round(params[0]);
  const cycle = tau * (
    (params[3] + Math.round(params[7]) * time / Math.max(params[2], 4)) % 1
  );
  const breath = Math.sin(cycle);
  const tide = Math.cos(cycle);
  const yaw = params[4] * Math.PI / 180;
  const pitch = params[5] * Math.PI / 180;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rowSize = MELT_POINTS * 4;
  const width = family === 2 ? 0.065 + 1.25 * params[1] : 0.024 + 0.58 * params[1];
  for (let strand = 0; strand < (family === 3 ? 2 : 1); strand++) {
    for (let i = 0; i <= 80; i++) {
      const t = tau * i / 80;
      let x, y, z;
      if (family === 0) {
        const r = 0.7 + (0.23 + 0.045 * breath) * Math.cos(3 * t);
        x = r * Math.cos(2 * t);
        y = r * Math.sin(2 * t);
        z = (0.28 + 0.085 * tide) * Math.sin(3 * t);
      } else if (family === 1) {
        const r = 0.6 + 0.3 * Math.cos(2 * t);
        x = r * Math.cos(3 * t);
        y = r * Math.sin(3 * t);
        z = (0.27 + 0.08 * breath) * Math.sin(4 * t);
      } else if (family === 2) {
        const r = 0.82 + 0.065 * Math.cos(3 * t + cycle);
        x = r * Math.cos(t);
        y = r * Math.sin(t);
        z = 0.12 * Math.sin(2 * t + cycle);
      } else {
        const a = 3 * t + strand * Math.PI + cycle;
        const r = 0.73 + (0.17 + 0.035 * breath) * Math.cos(a);
        x = r * Math.cos(t);
        y = r * Math.sin(t);
        z = (0.21 + 0.03 * tide) * Math.sin(a);
      }
      x *= 1 + 0.105 * breath;
      y *= 1 + 0.105 * tide;
      const px = cy * x - sy * y;
      const ry = sy * x + cy * y;
      const py = cp * ry - sp * z;
      const pz = sp * ry + cp * z;
      const offset = (strand * 81 + i) * 4;
      data[offset] = px;
      data[offset + 1] = py;
      data[offset + 2] = pz;
      const projection = 1.78 / (4.1 - pz);
      data[rowSize + offset] = px * projection;
      data[rowSize + offset + 1] = py * projection;
      if (family < 2) continue; // Tubes never consume ribbon geometry.
      const twist = family === 2 ? 0.5 * t + cycle : 3 * t + strand * Math.PI + cycle;
      x = Math.cos(t) * Math.cos(twist);
      y = Math.sin(t) * Math.cos(twist);
      z = Math.sin(twist);
      const ax = cy * x - sy * y;
      const ay = sy * x + cy * y;
      const az = sp * ay + cp * z;
      const tiltedY = cp * ay - sp * z;
      for (let side = 0; side < 2; side++) {
        const sign = side * 2 - 1;
        const vx = px + sign * ax * width;
        const vy = py + sign * tiltedY * width;
        const vz = pz + sign * az * width;
        const vertex = (2 + side) * rowSize + offset;
        data[vertex] = vx;
        data[vertex + 1] = vy;
        data[vertex + 2] = vz;
        const scale = 1.78 / (4.1 - vz);
        const projected = (4 + side) * rowSize + offset;
        data[projected] = vx * scale;
        data[projected + 1] = vy * scale;
      }
    }
  }
}
