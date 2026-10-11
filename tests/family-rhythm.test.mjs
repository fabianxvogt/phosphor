import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { defaultPattern, samplePattern, validatePattern } from "../rhythm.mjs";
import { shaderHeader, particleHeader } from "../scene-contract.mjs";
import { serve, launch, openLab } from "../scripts/browser-runtime.mjs";

test("every family owns distinct, bounded and schedulable algorithm gestures", () => {
  for (const scene of scenes) {
    assert.ok(scene.rhythm.length >= 2 && scene.rhythm.length <= 4, scene.id);
    assert.equal(
      new Set(scene.rhythm.map((effect) => effect.slot)).size,
      scene.rhythm.length,
      scene.id,
    );
    assert.equal(
      new Set(scene.rhythm.map((effect) => effect.id)).size,
      scene.rhythm.length,
      scene.id,
    );
    for (const effect of scene.rhythm) {
      assert.ok(effect.label && effect.description, `${scene.id}/${effect.id}`);
      assert.ok(["accent", "motion", "simulation"].includes(effect.kind));
      if (effect.variants)
        for (const variant of effect.variants)
          assert.ok(scene.type.values.includes(variant));
    }
    for (const style of ["restrained", "driving", "accented"])
      assert.deepEqual(
        validatePattern(defaultPattern(scene.rhythm, style), scene.rhythm),
        defaultPattern(scene.rhythm, style),
      );
    const pattern = defaultPattern(scene.rhythm);
    pattern.mode = "locked";
    pattern.tracks.forEach((track) => (track.muted = true));
    const sample = samplePattern(pattern, scene.rhythm, 64, 63.99);
    assert.deepEqual(sample.values, [0, 0, 0, 0], scene.id);
    assert.deepEqual(sample.hits, [0, 0, 0, 0], scene.id);
  }
});

test("variant-incompatible structural tracks remain stored and emit no gestures", () => {
  for (const scene of scenes) {
    const pattern = defaultPattern(scene.rhythm);
    for (const variant of scene.type?.values ?? []) {
      const sample = samplePattern(pattern, scene.rhythm, 32, 31.99, {
        variant,
      });
      for (const effect of scene.rhythm) {
        if (!effect.variants || effect.variants.includes(variant)) continue;
        assert.ok(pattern.tracks.some((track) => track.effect === effect.id));
        assert.equal(
          sample.values[effect.slot],
          0,
          `${scene.id}/${effect.id}/${variant}`,
        );
        assert.equal(sample.hits[effect.slot], 0);
      }
    }
  }
});

test(
  "all family simulation, picture and particle shaders compile with rhythm channels",
  {
    skip: !process.argv.includes("--port"),
    timeout: 180000,
  },
  async () => {
    const index = process.argv.indexOf("--port");
    const server = await serve(".", process.argv[index + 1] || "48127");
    const runtime = await launch();
    try {
      const lab = await openLab(runtime.browser, server.url);
      const result = await lab.page.evaluate(
        ({ shaders, header, particles }) => {
          const gl = window.__phosphorLab.engine.gl;
          const declarations =
            "\nuniform vec4 u_rhythm, u_rhythmCount, u_rhythmHit;\nuniform bool u_rhythmEnabled;\n";
          const withRhythm = (source) =>
            source.includes("uniform vec4 u_rhythm")
              ? source
              : source + declarations;
          const errors = [],
            checked = [];
          for (const scene of shaders) {
            for (const [kind, body, sourceHeader, type] of [
              ["picture", scene.fragment, header, gl.FRAGMENT_SHADER],
              ["simulation", scene.simulation, header, gl.FRAGMENT_SHADER],
              ["particles", scene.particles, particles, gl.VERTEX_SHADER],
            ]) {
              if (!body) continue;
              const shader = gl.createShader(type);
              gl.shaderSource(shader, withRhythm(sourceHeader) + body);
              gl.compileShader(shader);
              if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                errors.push(
                  `${scene.id}/${kind}: ${gl.getShaderInfoLog(shader)}`,
                );
              else checked.push(`${scene.id}/${kind}`);
              gl.deleteShader(shader);
            }
          }
          return { errors, checked };
        },
        {
          shaders: scenes.map((scene) => ({
            id: scene.id,
            fragment: scene.fragment,
            simulation: scene.simulation?.fragment,
            particles: scene.particles?.vertex,
          })),
          header: shaderHeader,
          particles: particleHeader,
        },
      );
      assert.deepEqual(result.errors, []);
      assert.ok(result.checked.length >= 60);
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
