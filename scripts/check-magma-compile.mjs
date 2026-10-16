// Compile Magma Rift's shaders in the lab and print the GLSL info logs.
//   PHOSPHOR_HEADLESS_RIG=1 node scripts/check-magma-compile.mjs --port 48366
import { options, serve, launch, openLab } from "./browser-runtime.mjs";
const args = options();
const server = await serve(".", args.port);
const runtime = await launch({ rig: true, headless: true });
try {
  const lab = await openLab(runtime.browser, server.url);
  const logs = await lab.page.evaluate(() => {
    const { engine, scenes } = window.__phosphorLab;
    const scene = scenes.find((s) => s.id === "magma");
    const gl = engine.gl;
    const compile = (source) => {
      const sh = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      return log;
    };
    const header = engine.pictureHeader;
    return {
      visual: compile(header + "#define PRECOMPUTED\n" + scene.fragment),
      visualLate: compile(
        header +
          "#define PRECOMPUTED\n#define PHOSPHOR_LATE\n" +
          scene.fragment,
      ),
      fallback: compile(header + scene.fragment),
      precompute: compile(header + scene.precompute.fragment),
    };
  });
  for (const [k, v] of Object.entries(logs))
    console.log(k, v ? v.slice(0, 2000) : "ok");
} finally {
  await runtime.stop();
  await server.close();
}
