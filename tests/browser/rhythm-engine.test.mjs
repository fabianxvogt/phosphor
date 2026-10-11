import test from "node:test";
import assert from "node:assert/strict";
import { serve, launch, openLab } from "../../scripts/browser-runtime.mjs";

test(
  "native rhythm impulses, CPU/field lifetimes and graphics recovery",
  { skip: process.env.PHOSPHOR_RHYTHM_GPU !== "1", timeout: 120000 },
  async (t) => {
    const server = await serve(".", 48138),
      runtime = await launch({ rig: true, headless: true });
    t.after(async () => {
      await runtime.stop();
      await server.close();
    });
    try {
      const { page } = await openLab(runtime.browser, server.url);
      page.on("console", (m) => console.log(m.text()));
      const results = await page.evaluate(async () => {
        const { engine, scenes, presetSnapshot } = window.__phosphorLab;
        const { initialRhythm } = await import("/rhythm.mjs");
        const settings = initialRhythm(scenes);
        settings.global.tracks.forEach((t) => (t.muted = true));
        const frame = { beat: 0.5, origin: 0, settings, enabled: true };
        const load = async (id, opts = {}) => {
          console.log("rhythm load", id);
          engine.setRhythmFrame(frame);
          engine.load(presetSnapshot(scenes.find((s) => s.id === id)), 0, opts);
          if (!(await engine.ready(id))) throw Error(`${id} compile`);
          while (engine.slots.at(-1).warmTicks > 0) engine.advance(0, true);
          return engine.slots.at(-1);
        };
        engine.resize(320, 180);
        engine.setLevel(0.5, 0);
        const feedback = await load("feedback");
        const ft =
          settings.families.feedback.tracks.find(
            (t) => t.effect === "seed-stamp",
          ) ?? settings.families.feedback.tracks[2];
        ft.length = 1;
        ft.steps = [1];
        ft.division = 1;
        frame.beat = 1.01;
        engine.setRhythmFrame(frame);
        engine.advance(1 / 60);
        const feedbackConsumed =
          feedback.rhythmPending[2] === 0 && feedback.rhythmGesture[2] === 0;
        const life = await load("life");
        life.snapshot.params.inject = 0;
        const lp = settings.families.life;
        lp.mode = "locked";
        for (const t of lp.tracks) {
          t.muted = t !== lp.tracks[2];
          t.length = 1;
          t.steps = [1];
          t.division = 1;
        }
        const count = () => {
          const p = new Uint8Array(4),
            gl = engine.gl;
          gl.bindFramebuffer(gl.FRAMEBUFFER, life.sim[life.si].fbo);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
          return p[3];
        };
        const increments = [];
        for (let i = 0; i < 6; i++) {
          const before = count();
          frame.beat = 2.01 + i;
          engine.setRhythmFrame(frame);
          engine.advance(1 / 60);
          increments.push((count() - before + 256) % 256);
        }
        const textureChecks = [];
        for (const id of [
          "physarum",
          "caustics",
          "colonization",
          "physarum",
          "feedback",
        ]) {
          const slot = await load(id);
          engine.advance(1 / 60);
          textureChecks.push(engine.liveTextures === engine.stats().textures);
          if (id === "colonization") {
            const gl = engine.gl,
              bytes = new Uint8Array(128 * 256 * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, slot.sim[slot.si].fbo);
            gl.readPixels(0, 0, 128, 256, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            if (!bytes.some((n) => n > 0)) throw Error("CPU graph erased");
          }
        }
        const override = structuredClone(settings.families.quasicrystal);
        override.tracks.forEach((t) => (t.muted = true));
        override.mode = "locked";
        frame.overrides = { "own-recovery": override };
        await load("quasicrystal", { lookId: "own-recovery", energy: 0.37 });
        const gl = engine.gl,
          ext = gl.getExtension("WEBGL_lose_context");
        await new Promise((resolve) => {
          engine.canvas.addEventListener("webglcontextlost", resolve, {
            once: true,
          });
          ext.loseContext();
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("rhythm context lost");
        // Incoming selection while lost must also retain its saved identity.
        engine.load(
          presetSnapshot(scenes.find((s) => s.id === "quasicrystal")),
          0,
          { lookId: "own-recovery", energy: 0.37 },
        );
        await new Promise((resolve) => {
          engine.canvas.addEventListener("webglcontextrestored", resolve, {
            once: true,
          });
          ext.restoreContext();
        });
        console.log("rhythm context restored");
        await engine.ready("quasicrystal");
        engine.advance(1 / 60);
        const restored = engine.slots.at(-1);
        return {
          feedbackConsumed,
          increments,
          textureChecks,
          look: restored.lookId,
          energy: restored.baseLevel,
          values: restored.rhythm.values,
          gl: engine.gl.getError(),
          nonfinite: window.__harness.nonFiniteUploads,
        };
      });
      assert.equal(results.feedbackConsumed, true);
      assert.deepEqual(results.increments, [1, 1, 1, 1, 1, 1]);
      assert.ok(results.textureChecks.every(Boolean));
      assert.equal(results.look, "own-recovery");
      assert.equal(results.energy, 0.37);
      assert.deepEqual(results.values, [0, 0, 0, 0]);
      assert.equal(results.gl, 0);
      assert.equal(results.nonfinite, 0);
    } finally {
      await runtime.stop();
      await server.close();
    }
  },
);
