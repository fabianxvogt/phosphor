// Check Cathedral's early-return distance bounds on the native GPU. Each
// proposed return records its value and the full field is still evaluated in
// the same function; the recorded distance and material must equal the full
// result exactly. Image comparisons separately catch compiler arithmetic changes.
import assert from "node:assert/strict";
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options();
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const report = await page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    const { default: scene } = await import("/scene-cathedral.mjs");
    const { shaderHeader } = await import("/scene-contract.mjs");
    let field = scene.fragment.slice(
      0,
      scene.fragment.indexOf("vec2 sceneSDF"),
    );
    const signature = "vec2 familySDF(vec3 p, float family) {";
    // Nave, reliquary and folded-gallery early returns, in source order.
    const stops = [
      "return result;\n    // Two intersecting circles",
      "return wide ? nearer(vec2(chamber, 2.), vec2(ground, 0.)) : vec2(ground, 0.);",
      "return nearer(result, vec2(ground, 0.));",
    ];
    for (const needle of [signature, ...stops])
      if (field.split(needle).length !== 2)
        throw new Error(`Missing Cathedral bound: ${needle}`);
    // Record the proposed value, then continue the complete evaluation.
    const record = (stop) => {
      const value = stop.slice(7, stop.indexOf(";"));
      return `{ if (!stopped) { stopped = true; stoppedValue = ${value}; } }${stop.slice(stop.indexOf(";") + 1)}`;
    };
    field = field.replace(
      signature,
      "vec2 familySDF(vec3 p, float family, inout bool stopped, inout vec2 stoppedValue) {",
    );
    for (const stop of stops) field = field.replace(stop, record(stop));
    const program = engine.program(
      shaderHeader +
        field +
        `
      uniform float probeFamily, probeTurn, probeAxis, probeSlice;
      uniform vec2 probeResolution;
      void main() {
        crystalTurn = probeTurn;
        vec2 grid = (gl_FragCoord.xy - 128.) / 12.8;
        vec3 p = probeAxis < .5 ? vec3(grid.x, probeSlice, grid.y)
                                : vec3(grid.x, grid.y + 2., probeSlice);
        bool stopped = false;
        vec2 stoppedValue = vec2(0.);
        vec2 full = familySDF(p, probeFamily, stopped, stoppedValue);
        if (!stopped) stoppedValue = full;
        outColor = vec4(full.x, stoppedValue.x, full.y,
                        stoppedValue.y + (stopped ? 8. : 0.));
      }
    `,
    );
    const u = program.uniforms;
    for (const name of ["u_params", "u_level", "probeFamily", "probeAxis"])
      if (!u[name]) throw new Error(`Missing probe uniform ${name}`);
    const gl = engine.gl;
    const target = engine.target(256, 256, {
      simulation: true,
      floatData: true,
    });
    const pixels = new Float32Array(256 * 256 * 4);
    const slices = [
      [0, -2.08],
      [0, -1.75],
      [0, 0.2],
      [0, 2.5],
      [0, 4.4],
      [1, 0],
      [1, 1.03],
      [1, 3.1],
    ];
    let points = 0,
      stopped = 0,
      cases = 0;
    try {
      for (const family of [0, 1, 3])
        for (const generations of [1, 1.5, 3, 4])
          for (const scale of [0.65, 1, 1.6])
            for (const level of [0, 1])
              for (const aspect of [16 / 9, 32 / 9])
                for (const turn of family === 1 ? [0, 1.3, 400.7] : [0])
                  for (const [axis, slice] of slices) {
                    engine.bind(program, target);
                    gl.uniform1fv(
                      u.u_params,
                      new Float32Array([
                        family,
                        generations,
                        scale,
                        0,
                        0,
                        0,
                        1,
                        80,
                      ]),
                    );
                    gl.uniform1f(u.u_level, level);
                    gl.uniform2f(u.u_resolution, 1080 * aspect, 1080);
                    gl.uniform1f(u.probeFamily, family);
                    gl.uniform1f(u.probeTurn, turn);
                    gl.uniform1f(u.probeAxis, axis);
                    gl.uniform1f(u.probeSlice, slice);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                    gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.FLOAT, pixels);
                    if (gl.getError())
                      throw new Error("Cathedral bound probe GL error");
                    cases++;
                    for (let i = 0; i < pixels.length; i += 4) {
                      const flagged = pixels[i + 3] >= 8;
                      const material = pixels[i + 3] - (flagged ? 8 : 0);
                      if (
                        !Number.isFinite(pixels[i]) ||
                        pixels[i] !== pixels[i + 1] ||
                        pixels[i + 2] !== material
                      )
                        throw new Error(
                          `Cathedral bound ${family}/${generations}/${scale}/${level}/${aspect}/${turn}/${axis}:${slice}, point ${i / 4}: ${[...pixels.slice(i, i + 4)]}`,
                        );
                      if (flagged) stopped++;
                      points++;
                    }
                  }
    } finally {
      engine.deleteTarget(target);
      gl.deleteProgram(program.p);
    }
    return { cases, points, stopped };
  });
  assert.deepEqual(errors, []);
  assert.ok(report.stopped > 0, "No early return was exercised");
  console.log(JSON.stringify(report));
} finally {
  await runtime.stop();
  await server.close();
}
