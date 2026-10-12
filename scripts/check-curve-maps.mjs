// Check the actual shader's integer curve maps exhaustively against the CPU
// reference, independently in both directions, at every supported order.
import assert from "node:assert/strict";
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options();
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const report = await page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    const {
      default: scene,
      hilbertD2xy,
      hilbertXy2d,
      mooreD2xy,
      mooreXy2d,
      peanoD2xy,
      peanoXy2d,
    } = await import("/scene-hilbert.mjs");
    const { shaderHeader } = await import("/scene-contract.mjs");
    const helpers = scene.fragment.slice(
      0,
      scene.fragment.indexOf("void main()"),
    );
    const program = engine.program(
      shaderHeader +
        helpers +
        `
      uniform int probeKind, probeOrder, probeSide;
      void main() {
        int d = int(gl_FragCoord.x) + int(gl_FragCoord.y) * 256;
        ivec2 xy = sD2xy(probeKind, probeOrder, d);
        int inverse = sXy2d(probeKind, probeOrder, ivec2(d % probeSide, d / probeSide));
        outColor = vec4(float(xy.x), float(xy.y), float(inverse / 256), float(inverse % 256)) / 255.;
      }
    `,
    );
    const gl = engine.gl;
    gl.disable(gl.DITHER);
    const rows = [];
    try {
      for (let kind = 0; kind < 3; kind++)
        for (
          let order = kind === 1 ? 2 : 1;
          order <= (kind === 2 ? 5 : 7);
          order++
        ) {
          const side = (kind === 2 ? 3 : 2) ** order,
            count = side * side;
          const target = engine.target(256, Math.ceil(count / 256), {
            bytes: true,
          });
          try {
            engine.bind(program, target);
            gl.uniform1i(program.uniforms.probeKind, kind);
            gl.uniform1i(program.uniforms.probeOrder, order);
            gl.uniform1i(program.uniforms.probeSide, side);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            const pixels = new Uint8Array(target.w * target.h * 4);
            gl.readPixels(
              0,
              0,
              target.w,
              target.h,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            if (gl.getError()) throw new Error("Curve probe GL error");
            for (let d = 0; d < count; d++) {
              const xy =
                kind === 0
                  ? hilbertD2xy(side, d)
                  : kind === 1
                    ? mooreD2xy(side, d)
                    : peanoD2xy(order, d);
              const grid = [d % side, Math.floor(d / side)];
              const inverse =
                kind === 0
                  ? hilbertXy2d(side, grid)
                  : kind === 1
                    ? mooreXy2d(side, grid)
                    : peanoXy2d(order, grid);
              const got = pixels.subarray(d * 4, d * 4 + 4);
              if (
                got[0] !== xy[0] ||
                got[1] !== xy[1] ||
                got[2] * 256 + got[3] !== inverse
              )
                throw new Error(
                  `Curve ${kind}, order ${order}, index ${d}: ${[...got]} != ${xy}, ${inverse}`,
                );
            }
            rows.push({ kind, order, count });
          } finally {
            engine.deleteTarget(target);
          }
        }
    } finally {
      gl.deleteProgram(program.p);
    }
    return rows;
  });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      orders: report.length,
      cells: report.reduce((n, r) => n + r.count, 0),
      rows: report,
    }),
  );
} finally {
  await runtime.stop();
  await server.close();
}
