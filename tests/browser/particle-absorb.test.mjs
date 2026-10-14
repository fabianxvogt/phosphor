import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";
import { renderLook } from "./client.mjs";

// Optional particles.blend = "absorb": colour adds, alpha darkens what lies
// beneath. Without the option particles stay purely additive.
test(
  "absorbing particles darken the picture; default particles only add",
  {
    skip: process.env.PHOSPHOR_PARTICLE_GPU !== "1",
    timeout: 120000,
  },
  async () => {
    const server = await serve(".", Number(process.env.PHOSPHOR_PORT ?? 48141));
    const runtime = await launch({ rig: true, headless: true });
    try {
      const { page, errors } = await openLab(runtime.browser, server.url);
      const centre = {};
      for (const blend of ["absorb", undefined]) {
        const id = `absorb-probe-${blend ?? "add"}`;
        await page.evaluate(
          ({ id, blend }) => {
            const { scenes } = window.__phosphorLab;
            scenes.push({
              id,
              number: 999,
              name: id,
              description: "probe",
              schema: [{ key: "a", label: "a", min: 0, max: 1, step: 0.01, default: 0.5 }],
              presets: [{ name: "Probe", seed: 1, params: { a: 0.5 } }],
              stage: ["a", "a", "a"],
              type: { key: "a", values: [0, 0.5, 1] },
              energy: {},
              beat: { punch: 0, pulse: 0 },
              fragment: "void main(){emit(vec4(vec3(.4),1.));}",
              simulation: { fragment: "void main(){outColor=vec4(0.);}", size: [4, 4], steps: 1 },
              particles: {
                vertex: `void main(){gl_Position=vec4(0.,0.,0.,1.);gl_PointSize=64.;v_color=vec3(0.);}`,
                fragment: `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;
void main(){outColor=vec4(v_color,1.);}`,
                ...(blend ? { blend } : {}),
              },
            });
          },
          { id, blend },
        );
        const result = await page.evaluate(renderLook, {
          sceneId: id,
          width: 128,
          height: 72,
          frames: 4,
          pollHealth: false,
        });
        assert.equal(result.glError, 0);
        const at = (x, y) => result.rgba[(y * result.width + x) * 4 + 1];
        centre[blend ?? "add"] = { mid: at(64, 36), edge: at(4, 4) };
      }
      // Absorbing points punch black into the grey; additive black adds 0.
      assert.ok(centre.absorb.mid < 8, JSON.stringify(centre));
      assert.ok(centre.absorb.edge > 40);
      assert.ok(Math.abs(centre.add.mid - centre.add.edge) < 6);
      assert.deepEqual(errors, []);
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
