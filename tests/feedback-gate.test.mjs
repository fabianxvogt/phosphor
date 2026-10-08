import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import scene from "../scene-feedback.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
} from "../scripts/browser-runtime.mjs";
import {
  imageMetrics,
  structureDistance,
} from "./browser/metrics.mjs";

// npm test covers portable authored looks; explicitly run the GPU seam with:
// node tests/feedback-gate.test.mjs --port 48123
// Contact summary only: append --cross <types-directory> (no scene rerender).
const browserRequested = process.argv.includes("--port");
const args = browserRequested ? options({ cross: { type: "string" } }) : null;

test("every Feedback Chapel type has a portable authored preset", () => {
  for (const value of scene.type.values) {
    const index = scene.presets.findIndex(
      (preset) => preset.params[scene.type.key] === value,
    );
    assert.ok(index >= 0, `geometry ${value} has no authored preset`);
    const snapshot = presetSnapshot(scene, index);
    assert.deepEqual(validateSnapshot(snapshot, [scene]), snapshot);
  }
});

test("feedback survives cuts, two-beat fades, kicks and sustained energy", {
  skip: !browserRequested || !!args.cross,
}, async () => {
  assert.equal(args.rig, false, "feedback gate is headless only");
  const out = await outputDirectory("contact/feedback-behaviour", args.out);
  const server = await serve(".", args.port);
  const runtime = await launch();
  try {
    const lab = await openLab(runtime.browser, server.url);
    const evidence = await lab.page.evaluate(async () => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      const scene = scenes.find((s) => s.id === "feedback");
      const width = 320, height = 180;
      engine.resize(width, height);
      engine.features = { energy: 0, bass: 0, mid: 0, high: 0, onset: 0 };
      engine.speed = 1;
      engine.view = { hue: 0, zoom: 1 };
      engine.options.flashLimit = false;
      engine.options.kaleido = 1;
      engine.flashHeld = false;
      engine.blackout = engine.blackoutTarget = 0;
      const captures = [];
      const grab = (name) => {
        engine.present();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(engine.canvas, 0, 0);
        const rgba = Array.from(context.getImageData(0, 0, width, height).data);
        captures.push({ name, rgba, png: canvas.toDataURL("image/png").split(",")[1] });
        return rgba;
      };
      const difference = (a, b) => {
        let sum = 0;
        for (let i = 0; i < a.length; i++)
          if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
        return sum / (width * height * 3 * 255);
      };
      const step = (frames) => {
        for (let i = 0; i < frames; i++) {
          engine.beat = 0.5 + Math.floor(engine.frameCount / 30);
          engine.advance(1 / 60, false);
        }
      };
      const rows = [];
      for (const geometry of scene.type.values) {
        const look = presetSnapshot(scene, 0);
        look.params.geometry = geometry;
        const levels = [];
        for (const level of [0.1, 0.5, 0.9]) {
          engine.setLevel(level, 0);
          engine.load(look, 0, { energy: 0.5 });
          await engine.ready(scene.id);
          step(120);
          const a = grab(`geometry-${geometry}-energy-${level}`);
          step(15);
          const b = grab(`geometry-${geometry}-motion-${level}`);
          levels.push({ level, motion: difference(a, b) });
        }
        step(585); // twelve seconds at 0.9 since the cut, excluding compilation.
        const sustained = grab(`geometry-${geometry}-sustained`);
        step(30);
        const next = grab(`geometry-${geometry}-sustained-next`);
        engine.beat = 32.5;
        engine.updatePerformance(0, false);
        engine.beatFx.flash = 0;
        const off = grab(`geometry-${geometry}-offbeat`);
        const calmFx = { ...engine.beatFx };
        engine.beat = 32;
        engine.updatePerformance(0, false);
        engine.beatFx.flash = 0; // isolate punch/pulse, not the automatic flash.
        const kickFx = { ...engine.beatFx };
        const kick = grab(`geometry-${geometry}-kick`);
        // A cut discards the outgoing history; compare with a second fresh cut.
        const outgoing = presetSnapshot(scene, 1);
        engine.load(outgoing, 0, { energy: 0.5 });
        step(30);
        engine.beat = 0.5;
        engine.updatePerformance(0, false);
        engine.load(look, 0, { energy: 0.5 });
        const cut = grab(`geometry-${geometry}-cut`);
        engine.load(look, 0, { energy: 0.5 });
        const fresh = grab(`geometry-${geometry}-fresh`);
        step(120);
        const target = presetSnapshot(scene, (geometry + 1) % scene.presets.length);
        target.params.geometry = geometry;
        engine.load(target, 1, { energy: 0.5 }); // 2 beats at 120 BPM.
        const fade = [];
        for (const frames of [1, 29, 29, 2]) {
          step(frames);
          const elapsed = fade.reduce((sum, row) => sum + row.frames, 0) + frames;
          grab(`geometry-${geometry}-fade-${elapsed}`);
          fade.push({ frames, elapsed, slots: engine.slots.length,
            transition: !!engine.transition, stats: engine.stats() });
        }
        rows.push({ geometry, levels, sustainedMotion: difference(sustained, next),
          kickDifference: difference(off, kick), calmFx, kickFx,
          cutDifference: difference(cut, fresh), fade,
          glError: engine.gl.getError(), nonFinite: engine.counters.nonFinite + window.__harness.nonFiniteUploads });
      }
      // Low persistence must not freeze the injector at high energy.
      engine.load(presetSnapshot(scene, 5), 0, { energy: 0.5 });
      step(120);
      const recovery = grab("recovery-high");
      step(30);
      const recoveryNext = grab("recovery-high-next");
      return { width, height, rows, captures, recoveryMotion: difference(recovery, recoveryNext) };
    });
    const captures = new Map();
    for (const { name, rgba, png } of evidence.captures) {
      await writeFile(resolve(out, `${name}.png`), Buffer.from(png, "base64"));
      const metrics = imageMetrics(rgba, evidence.width, evidence.height);
      let white = 0, peak = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        peak = Math.max(peak, rgba[i], rgba[i + 1], rgba[i + 2]);
        if (rgba[i] > 245 && rgba[i + 1] > 245 && rgba[i + 2] > 245) white++;
      }
      captures.set(name, { file: `${name}.png`, metrics, peak,
        whiteFraction: white / (evidence.width * evidence.height) });
    }
    const report = { ...evidence, captures: Object.fromEntries(captures),
      errors: lab.errors };
    await writeFile(resolve(out, "metrics.json"), JSON.stringify(report, null, 2));
    const gallery = `<!doctype html><meta charset="utf-8"><title>Feedback history gate</title>
<style>body{background:#101018;color:#eee;font:14px system-ui}section{display:inline-block;margin:8px}img{display:block;width:320px}</style>
<h1>Feedback Chapel: cuts, fades, energy and kicks</h1>
${[...captures].map(([name, capture]) => `<section>${name}<img src="${capture.file}" alt="${name}"></section>`).join("")}`;
    await writeFile(resolve(out, "index.html"), gallery);
    console.log(JSON.stringify({ rows: report.rows, recoveryMotion: report.recoveryMotion }, null, 2));
    for (const row of report.rows) {
      assert.equal(row.glError, 0);
      assert.equal(row.nonFinite, 0);
      assert.equal(row.cutDifference, 0, `type ${row.geometry}: stale history after cut`);
      assert.ok(row.sustainedMotion > 0.005, `type ${row.geometry}: frozen at 0.9`);
      assert.ok(row.kickDifference > 0.005, `type ${row.geometry}: invisible shared kick`);
      assert.ok(row.kickFx.punch > row.calmFx.punch);
      assert.ok(row.kickFx.pulse > row.calmFx.pulse);
      assert.ok(row.levels[0].motion < row.levels[1].motion &&
        row.levels[1].motion < row.levels[2].motion, `type ${row.geometry}: unordered motion`);
      for (const fade of row.fade) {
        assert.equal(fade.stats.liveTextures, fade.stats.textures);
        assert.equal(fade.slots, fade.elapsed < 60 ? 2 : 1);
        assert.equal(fade.transition, fade.elapsed < 60);
        assert.ok(captures.get(`geometry-${row.geometry}-fade-${fade.elapsed}`).peak > 8);
      }
      assert.equal(captures.get(`geometry-${row.geometry}-sustained`).whiteFraction, 0);
    }
    assert.ok(report.recoveryMotion > 0.005, "Clean Recovery freezes at high energy");
    assert.deepEqual(lab.errors, []);
  } finally {
    await runtime.stop();
    await server.close();
  }
});

test("feedback contact sheets retain distinct structures", {
  skip: !browserRequested || !args.cross,
}, async () => {
  assert.equal(args.rig, false, "contact summary is headless only");
  const out = await outputDirectory("contact/feedback-behaviour", args.out);
  const report = JSON.parse(await readFile(resolve(out, "metrics.json"), "utf8"));
  const server = await serve(".", args.port);
  const runtime = await launch();
  try {
    const lab = await openLab(runtime.browser, server.url);
    const distances = [];
    const nearest = [];
    if (args.cross) {
      const directory = resolve(args.cross);
      const contacts = JSON.parse(await readFile(resolve(directory, "metrics.json"), "utf8"));
      const signatures = await lab.page.evaluate(async (rows) => {
        const { structureSignature } = await import("/tests/browser/metrics.mjs");
        const result = [];
        for (const row of rows) {
          const image = await createImageBitmap(await (await fetch(row.url)).blob());
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          const rgba = context.getImageData(0, 0, image.width, image.height).data;
          result.push({ ...row,
            signature: structureSignature(rgba, image.width, image.height) });
          image.close();
        }
        return result;
      }, contacts.rows.map((row) => ({ sceneId: row.sceneId, name: row.name,
        url: `/${args.cross}/${row.cells[0].file}` })));
      const feedback = signatures.filter((row) => row.sceneId === "feedback");
      for (let i = 0; i < feedback.length; i++) {
        for (let j = i + 1; j < feedback.length; j++)
          distances.push({ a: feedback[i].name, b: feedback[j].name,
            distance: structureDistance(feedback[i].signature, feedback[j].signature) });
        const other = signatures.filter((row) => row.sceneId !== "feedback")
          .map((row) => ({ sceneId: row.sceneId, name: row.name,
            distance: structureDistance(feedback[i].signature, row.signature) }))
          .sort((a, b) => a.distance - b.distance)[0];
        nearest.push({ type: feedback[i].name, ...other });
      }
    }
    if (args.cross) {
      for (const name of ["feedback-ladder", "feedback-types", "feedback-640x360",
        "feedback-1280x360", "feedback-480x480"]) {
        await lab.page.goto(`${server.url}artifacts/contact/${name}/index.html`);
        await lab.page.locator("img").evaluateAll(async (images) =>
          Promise.all(images.map((image) => image.decode())));
        await lab.page.screenshot({ path: resolve(`artifacts/contact/${name}/sheet.png`),
          fullPage: true });
      }
    }
    report.distances = distances;
    report.nearest = nearest;
    await writeFile(resolve(out, "metrics.json"), JSON.stringify(report, null, 2));
    const gallery = `<!doctype html><meta charset="utf-8"><title>Feedback history gate</title>
<style>body{background:#101018;color:#eee;font:14px system-ui}section{display:inline-block;margin:8px}img{display:block;width:320px}</style>
<h1>Feedback Chapel: cuts, fades, energy and kicks</h1>
${Object.entries(report.captures).map(([name, capture]) => `<section>${name}<img src="${capture.file}" alt="${name}"></section>`).join("")}`;
    await writeFile(resolve(out, "index.html"), gallery);
    console.log(JSON.stringify({ distances, nearest }, null, 2));
    for (const pair of distances) assert.ok(pair.distance >= 0.25, JSON.stringify(pair));
    assert.deepEqual(lab.errors, []);
  } finally {
    await runtime.stop();
    await server.close();
  }
});
