import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import cathedral from '../scene-cathedral.mjs';
import { options, outputDirectory, serve, launch, openLab } from '../scripts/browser-runtime.mjs';
import { renderLook } from './browser/client.mjs';
import { imageMetrics, structureSignature, structureDistance } from './browser/metrics.mjs';

// Browser evidence is opt-in: node tests/cathedral-render.test.mjs --port 48121.
// Unit runs never reserve a browser or port. All pixels come from the real Engine.
test('cathedral keeps an authored, bounded look for every structural type', () => {
  assert.ok(cathedral.type.values.length >= 3);
  for (const value of cathedral.type.values)
    assert.ok(cathedral.presets.some((p) => p.params.geometry === value));
  for (const preset of cathedral.presets)
    for (const def of cathedral.schema)
      assert.ok(Number.isFinite(preset.params[def.key]) &&
        preset.params[def.key] >= def.min && preset.params[def.key] <= def.max,
        `${preset.name}/${def.key}`);
  assert.equal(cathedral.energy.glow, undefined, 'energy must not drive exposure');
  assert.ok(cathedral.beat.punch > 0 && cathedral.beat.pulse > 0);
});

const browserRequested = process.argv.includes('--port');
test('cathedral renders at 64 steps with ordered motion and shared kick response', {
  skip: !browserRequested,
  timeout: 600000,
}, async () => {
  const args = options({
    cross: { type: 'string' },
    width: { type: 'string', default: '320' },
    height: { type: 'string', default: '180' },
  });
  const width = Number(args.width), height = Number(args.height);
  assert.equal(args.rig, false, 'family probes are headless only');
  const out = await outputDirectory('contact/cathedral-probes', args.out);
  const server = await serve('.', args.port);
  const runtime = await launch();
  const evidence = { raySteps: 64, width, height, types: [], distinctness: null };
  try {
    const lab = await openLab(runtime.browser, server.url);
    await lab.page.evaluate(() => {
      window.__phosphorLab.engine.rayStepBudget = 64;
      window.__phosphorLab.engine.options.bloom = 0;
    });
    for (const geometry of cathedral.type.values) {
      const index = cathedral.presets.findIndex((p) => p.params.geometry === geometry);
      const levels = [];
      for (const level of [0.1, 0.5, 0.9]) {
        const r = await lab.page.evaluate(renderLook, {
          sceneId: 'cathedral', index, level, frames: 60, width, height,
        });
        assert.ok(r.peak > 8, `geometry ${geometry} at ${level} is blank`);
        assert.equal(r.glError, 0);
        assert.equal(r.nonFinite, 0);
        assert.equal(r.stats.liveTextures, r.stats.textures);
        const movement = await lab.page.evaluate(() => {
          const { engine } = window.__phosphorLab;
          const pixels = () => {
            const gl = engine.gl, data = new Uint8Array(engine.width * engine.height * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
            return data;
          };
          const a = pixels();
          // Fixed beat phase isolates geometry/camera motion from the shared kick.
          for (let frame = 0; frame < 30; frame++) engine.advance(1 / 60, false);
          const b = pixels();
          let sum = 0;
          for (let i = 0; i < a.length; i++) if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
          return sum / (engine.width * engine.height * 3 * 255);
        });
        const metrics = imageMetrics(r.rgba, r.width, r.height);
        await writeFile(resolve(out, `type-${geometry}-${Math.round(level * 100)}-64.png`), Buffer.from(r.png, 'base64'));
        levels.push({ level, motionDelta: movement, metrics });
      }
      const kick = await lab.page.evaluate(() => {
        const { engine } = window.__phosphorLab;
        engine.options.bloom = 0;
        const capture = (beat) => {
          engine.beat = beat;
          engine.advance(0, false); // exact same scene time; compositor alone changes
          const gl = engine.gl, data = new Uint8Array(engine.width * engine.height * 4);
          engine.beatFx.flash = 0; // test punch/pulse, not the top-energy auto flash
          engine.present();
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, engine.width, engine.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
          return { data, fx: { ...engine.beatFx } };
        };
        const rest = capture(.5), hit = capture(0);
        let sum = 0;
        for (let i = 0; i < rest.data.length; i++) if (i % 4 !== 3) sum += Math.abs(rest.data[i] - hit.data[i]);
        return { rest: rest.fx, hit: hit.fx, pixelDelta: sum / (engine.width * engine.height * 3 * 255) };
      });
      evidence.types.push({ geometry, preset: cathedral.presets[index].name, levels, kick });
      assert.ok(levels[0].motionDelta < levels[1].motionDelta && levels[1].motionDelta < levels[2].motionDelta,
        `geometry ${geometry}: motion is not ordered: ${levels.map((l) => l.motionDelta)}`);
      assert.ok(levels[0].metrics.edgeDensity < levels[1].metrics.edgeDensity &&
        levels[1].metrics.edgeDensity < levels[2].metrics.edgeDensity,
        `geometry ${geometry}: detail/contrast edges are not ordered: ${levels.map((l) => l.metrics.edgeDensity)}`);
      assert.ok(kick.pixelDelta > .005, `geometry ${geometry}: kick not visible`);
      assert.ok(kick.hit.punch > kick.rest.punch && kick.hit.pulse > kick.rest.pulse);
    }
    if (args.cross) {
      const directory = resolve(args.cross);
      const sheet = JSON.parse(await readFile(resolve(directory, 'metrics.json'), 'utf8'));
      const signatures = [];
      for (const row of sheet.rows) {
        const rgba = await lab.page.evaluate(async (path) => {
          const bitmap = await createImageBitmap(await (await fetch(path)).blob());
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext('2d');
          context.drawImage(bitmap, 0, 0);
          return { data: Array.from(context.getImageData(0, 0, bitmap.width, bitmap.height).data), width: bitmap.width, height: bitmap.height };
        }, '/' + args.cross + '/' + row.cells[0].file);
        signatures.push({ row, signature: structureSignature(rgba.data, rgba.width, rgba.height) });
      }
      evidence.distinctness = signatures.filter((s) => s.row.sceneId === 'cathedral').map((a) => {
        const others = signatures.filter((b) => b !== a).map((b) => ({
          family: b.row.sceneId, type: b.row.name, distance: structureDistance(a.signature, b.signature),
        }));
        return { type: a.row.name, within: others.filter((b) => b.family === 'cathedral'),
          nearestCross: others.filter((b) => b.family !== 'cathedral').sort((a, b) => a.distance - b.distance)[0] };
      });
      for (const type of evidence.distinctness)
        for (const pair of type.within)
          assert.ok(pair.distance >= .25, `${type.type}/${pair.type}: near pair ${pair.distance}`);
    }
    assert.deepEqual(lab.errors, []);
  } finally {
    await writeFile(resolve(out, 'metrics.json'), JSON.stringify(evidence, null, 2));
    await runtime.stop();
    await server.close();
  }
});
