import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import scenes from "../scenes.mjs";
import { defaultPattern, validatePattern } from "../rhythm.mjs";
import { sampleSceneRhythm } from "../engine-rhythm.mjs";
import { launch } from "../scripts/browser-runtime.mjs";

const abyss = scenes.find((scene) => scene.id === "abyss");

test("adding a gesture at capacity preserves every dormant and locked track", () => {
  const oldDefinitions = abyss.rhythm.filter((effect) => effect.slot < 3);
  const saved = defaultPattern(oldDefinitions);
  const template = saved.tracks[0];
  for (let i = saved.tracks.length; i < 32; i++)
    saved.tracks.push({ ...structuredClone(template), effect: `future-${i}` });
  for (const mode of ["auto", "locked"]) {
    const input = { ...saved, mode };
    const validated = validatePattern(input, abyss.rhythm);
    assert.equal(validated.tracks.length, 32);
    assert.deepEqual(
      validated.tracks.map((t) => t.effect),
      input.tracks.map((t) => t.effect),
    );
    for (const track of input.tracks.filter((t) =>
      t.effect.startsWith("future-"),
    ))
      assert.deepEqual(
        validated.tracks.find((t) => t.effect === track.effect),
        track,
      );
    if (mode === "locked") assert.deepEqual(validated, input);
    assert.deepEqual(validatePattern(validated, abyss.rhythm), validated);
  }
});

test(
  "native GLSL leaf endpoints are finite and every positive Abyss relay hit latches",
  {
    skip: process.env.PHOSPHOR_REVIEW_GPU !== "1",
    timeout: 120000,
  },
  async () => {
    const leafSource = await readFile(
      new URL("../scene-mycelium.mjs", import.meta.url),
      "utf8",
    );
    const abyssSource = await readFile(
      new URL("../scene-abyss.mjs", import.meta.url),
      "utf8",
    );
    const leaf = leafSource.match(/float leafWidth\([^}]+\}/)?.[0];
    const latch = abyssSource.match(
      /if \(!u_reset && u_rhythmHit\.w[^}]+\}/,
    )?.[0];
    assert.ok(leaf && latch);
    const cases = [];
    for (const style of ["restrained", "driving", "accented"])
      for (const level of [0.1, 0.5, 1]) {
        const pattern = defaultPattern(abyss.rhythm, style);
        const track = pattern.tracks.find(
          (t) => t.effect === abyss.rhythm.find((d) => d.slot === 3).id,
        );
        for (let i = 0; i < track.steps.length; i++) {
          if (!track.steps[i]) continue;
          const beat = i / track.division;
          const slot = {
            scene: abyss,
            snapshot: { params: { development: 2 } },
            rhythmPosition: beat - 0.001,
          };
          const result = sampleSceneRhythm(
            slot,
            { beat, style, settings: { families: { abyss: pattern } } },
            beat,
            level,
          );
          cases.push({
            hit: result.hits[3],
            count: result.counts[3],
            label: `${style}/${level}/${i}`,
          });
        }
      }
    const runtime = await launch({ rig: true, headless: true });
    try {
      const page = await runtime.browser.newPage();
      const result = await page.evaluate(
        ({ leaf, latch, cases }) => {
          const gl = document.createElement("canvas").getContext("webgl2", {
            preserveDrawingBuffer: true,
            antialias: false,
          });
          if (!gl) throw new Error("No WebGL2");
          gl.canvas.width = gl.canvas.height = 1;
          gl.viewport(0, 0, 1, 1);
          const shader = (type, source) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
              throw new Error(gl.getShaderInfoLog(s));
            return s;
          };
          const vs = shader(
            gl.VERTEX_SHADER,
            `#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`,
          );
          const program = (body) => {
            const p = gl.createProgram();
            gl.attachShader(p, vs);
            gl.attachShader(
              p,
              shader(
                gl.FRAGMENT_SHADER,
                `#version 300 es\nprecision highp float;out vec4 colour;${body}`,
              ),
            );
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS))
              throw new Error(gl.getProgramInfoLog(p));
            return p;
          };
          const draw = () => {
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const bytes = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            return [...bytes];
          };
          const leafProgram = program(
            `uniform float u;${leaf}\nvoid main(){float w=leafWidth(u,1.);colour=vec4(isnan(w)||isinf(w)?1.:0.,w<0.?1.:0.,abs(w)>.001?1.:0.,1.);}`,
          );
          gl.useProgram(leafProgram);
          const leaves = [0, 0.25, 0.5, 0.75, 1].map((u) => {
            gl.uniform1f(gl.getUniformLocation(leafProgram, "u"), u);
            return { u, bytes: draw() };
          });
          const relayProgram = program(
            `uniform bool u_reset;uniform vec4 u_rhythmHit,u_rhythm,u_rhythmCount;void main(){float age=2.,strength=0.,direction=0.;${latch}\ncolour=vec4(age/3.,strength,direction,1.);}`,
          );
          gl.useProgram(relayProgram);
          gl.uniform1i(gl.getUniformLocation(relayProgram, "u_reset"), 0);
          const relays = [...cases, { hit: 0, count: 1, label: "silent" }].map(
            (c) => {
              gl.uniform4f(
                gl.getUniformLocation(relayProgram, "u_rhythmHit"),
                0,
                0,
                0,
                c.hit,
              );
              gl.uniform4f(
                gl.getUniformLocation(relayProgram, "u_rhythm"),
                0,
                0,
                0,
                c.hit,
              );
              gl.uniform4f(
                gl.getUniformLocation(relayProgram, "u_rhythmCount"),
                0,
                0,
                0,
                c.count,
              );
              return { ...c, bytes: draw() };
            },
          );
          return { leaves, relays, error: gl.getError() };
        },
        { leaf, latch, cases },
      );
      assert.equal(result.error, 0);
      for (const { u, bytes } of result.leaves) {
        assert.equal(bytes[0], 0, `finite leaf ${u}`);
        assert.equal(bytes[1], 0, `nonnegative leaf ${u}`);
        if (u === 0 || u === 1)
          assert.equal(bytes[2], 0, `zero-width endpoint ${u}`);
      }
      for (const { hit, count, label, bytes } of result.relays) {
        if (hit === 0) {
          assert.ok(bytes[0] > 0, label);
          continue;
        }
        assert.equal(bytes[0], 0, `latches ${label}`);
        assert.ok(
          Math.abs(bytes[1] / 255 - hit) < 2 / 255,
          `velocity ${label}`,
        );
        assert.equal(bytes[2], count % 2 ? 255 : 0, `alternates ${label}`);
      }
    } finally {
      await runtime.stop();
    }
  },
);
