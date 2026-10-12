// Check the actual early-stop predicate while continuing the full field search
// on the native GPU. Later levels must not change the saved minimum or trap.
import assert from "node:assert/strict";
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options();
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const { page, errors } = await openLab(runtime.browser, server.url);
  const report = await page.evaluate(async () => {
    const { engine } = window.__phosphorLab;
    const { default: scene } = await import("/scene-flight.mjs");
    const { shaderHeader } = await import("/scene-contract.mjs");
    const helpers = scene.fragment.slice(
      0,
      scene.fragment.indexOf("// Camera path"),
    );
    const field = helpers.slice(helpers.indexOf("float ffMap"));
    const stop = "if (holes <= -w / scale) break;";
    if (!field.includes(stop))
      throw new Error("Missing accelerated field bound");
    // Continue after the first early-stop opportunity and compare with the
    // eventual full search. This uses one arithmetic path: separately compiled
    // map functions can differ by a few ULPs for the twist division itself.
    const probe = field
      .replace(
        "float ffMap(vec3 p, out float trap)",
        "float ffProbe(vec3 p, out float trap, out float stoppedMinimum, out float stoppedTrap)",
      )
      .replace("  trap = 0.0;", "  trap = 0.0; bool stopped = false;")
      .replace(
        stop,
        `if (!stopped && holes <= -w / scale) {
        stopped = true; stoppedMinimum = holes; stoppedTrap = trap;
      }`,
      )
      .replace(
        "return -holes / (twistBound + (twistBound > 1.0 ? PI * abs(holes) : 0.0));",
        "if (!stopped) { stoppedMinimum = holes; stoppedTrap = trap; } return holes;",
      );
    const program = engine.program(
      shaderHeader +
        helpers.slice(0, helpers.indexOf("float ffMap")) +
        probe +
        `
      uniform float probeSlice;
      void main() {
        // Cell boundaries, tunnel interiors and distant repeated/twisted cells.
        vec3 p = vec3((gl_FragCoord.xy - 128.0) / 24.0, probeSlice);
        float trap, stoppedMinimum, stoppedTrap;
        float fullMinimum = ffProbe(p, trap, stoppedMinimum, stoppedTrap);
        outColor = vec4(fullMinimum, stoppedMinimum, trap, stoppedTrap);
      }
    `,
    );
    if (!program.uniforms.u_params || !program.uniforms.probeSlice)
      throw new Error("Missing probe controls");
    const gl = engine.gl;
    const target = engine.target(256, 256, {
      simulation: true,
      floatData: true,
    });
    const pixels = new Float32Array(256 * 256 * 4);
    let points = 0;
    try {
      for (const path of [0, 1, 2, 3])
        for (const levels of [2, 2.01, 2.5, 3, 3.9, 4, 4.75, 5])
          for (const opening of [0.75, 1, 1.2])
            for (const slice of [0, 1 / 3, 0.99999, 6.125]) {
              engine.bind(program, target);
              gl.uniform1fv(
                program.uniforms.u_params,
                new Float32Array([path, 0, levels, opening]),
              );
              gl.uniform1f(program.uniforms.probeSlice, slice);
              gl.drawArrays(gl.TRIANGLES, 0, 6);
              gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.FLOAT, pixels);
              if (gl.getError()) throw new Error("Flight bound probe GL error");
              for (let i = 0; i < pixels.length; i += 4) {
                if (
                  !Number.isFinite(pixels[i]) ||
                  pixels[i] !== pixels[i + 1] ||
                  pixels[i + 2] !== pixels[i + 3]
                )
                  throw new Error(
                    `Flight bound ${path}/${levels}/${opening}/${slice}, point ${i / 4}: ${[...pixels.slice(i, i + 4)]}`,
                  );
                points++;
              }
            }
    } finally {
      engine.deleteTarget(target);
      gl.deleteProgram(program.p);
    }
    return { cases: points / (256 * 256), points };
  });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report));
} finally {
  await runtime.stop();
  await server.close();
}
