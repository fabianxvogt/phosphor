// Headless correctness checks (no timing gates): every look renders, fades
// leave no leaked textures, energy curves stay finite, and the control/stage
// show behaves — keys, panic under slider focus, safe look, autopilot,
// control reload, stage reload recovery, set edits and the framing pattern.
// Requires `npm run build` first (the app is served from dist/).
import assert from "node:assert/strict";
import {
  options,
  outputDirectory,
  serve,
  launch,
  openLab,
  openShow,
  lookList,
  deadline,
} from "./browser-runtime.mjs";
import { renderLook, readStage } from "../tests/browser/client.mjs";

const args = options({
  frames: { type: "string", default: "20" },
  only: { type: "string" }, // "lab" or "show" while iterating
  "native-gpu": { type: "boolean", default: false }, // installed Chrome's GPU; still headless correctness-only
});
if (args.rig)
  throw new Error("test:browser is always headless correctness-only");
const output = await outputDirectory("browser", args.out);
const server = await serve(".", args.port);
const frames = Number(args.frames);
let runtime;
const pass = (name) => console.log(`PASS ${name}`);
const waitFor = async (page, fn, arg, label, timeout = 60000) => {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 100 });
  } catch (error) {
    throw new Error(`${label}: ${error.message.split("\n")[0]}`);
  }
};
try {
  runtime = await launch({ rig: args["native-gpu"], headless: true });
  console.log(
    `Chrome ${runtime.version}; ${args["native-gpu"] ? "native" : "software"} GPU; no timing gates`,
  );

  if (args.only !== "show") {
    // --- render lab ---------------------------------------------------------
    const lab = await openLab(runtime.browser, server.url);
    const looks = await lookList(lab.page);
    for (const look of looks) {
      const r = await deadline(
        lab.page.evaluate(renderLook, { ...look, frames, capture: false }),
        180000,
        look.name,
      );
      assert.ok(
        r.peak > 8,
        `${look.sceneId}/${look.name} is blank (peak ${r.peak})`,
      );
      assert.equal(r.glError, 0, `${look.name}: WebGL error`);
      assert.equal(r.nonFinite, 0, `${look.name}: non-finite input`);
      assert.equal(
        r.stats.liveTextures,
        r.stats.textures,
        `${look.name}: unaccounted textures`,
      );
    }
    pass(
      `all ${looks.length} looks render · WebGL 0 · non-finite 0 · textures accounted`,
    );

    const families = [...new Set(looks.map((l) => l.sceneId))];
    for (const sceneId of families)
      for (const level of [0.05, 0.95]) {
        const r = await lab.page.evaluate(renderLook, {
          sceneId,
          level,
          frames,
          capture: false,
        });
        assert.equal(
          r.nonFinite,
          0,
          `${sceneId} at energy ${level}: non-finite`,
        );
        assert.equal(
          r.glError,
          0,
          `${sceneId} at energy ${level}: WebGL error`,
        );
      }
    pass("every family stays finite at the energy extremes");

    for (const sceneId of families)
      for (const [width, height] of [
        [640, 180], // 32:9 LED strip
        [240, 240], // square wall
        [180, 320], // portrait
      ]) {
        const r = await lab.page.evaluate(renderLook, {
          sceneId,
          frames,
          width,
          height,
          capture: false,
        });
        assert.ok(
          r.peak > 8,
          `${sceneId} ${width}×${height} is blank (peak ${r.peak})`,
        );
        assert.equal(
          r.glError,
          0,
          `${sceneId} ${width}×${height}: WebGL error`,
        );
        assert.equal(r.stats.liveTextures, r.stats.textures);
      }
    pass("every family renders on 32:9, square and portrait screens");

    for (const sceneId of families) {
      const stats = await lab.page.evaluate(async (id) => {
        const { engine, scenes, presetSnapshot } = window.__phosphorLab;
        engine.load(presetSnapshot(scenes.find((s) => s.id === id)), 0.1);
        await engine.ready(id);
        for (let i = 0; i < 400 && engine.transition; i++)
          engine.advance(1 / 60, false);
        return {
          ...engine.stats(),
          transition: !!engine.transition,
          error: engine.gl.getError(),
        };
      }, sceneId);
      assert.equal(stats.transition, false, `${sceneId}: fade never finished`);
      assert.equal(stats.slots, 1);
      assert.equal(
        stats.liveTextures,
        stats.textures,
        `${sceneId}: leaked textures after fade`,
      );
      assert.equal(stats.error, 0);
    }
    pass("every family fade returns to one slot with no leaked textures");

    // An incoming simulation family warms up behind the outgoing picture:
    // the transition clock (and so its mix) holds at 0 until the warm-up is
    // done, then the smooth fade runs to completion (D66).
    const warmups = await lab.page.evaluate(async () => {
      const { engine, scenes, presetSnapshot } = window.__phosphorLab;
      engine.resize(160, 90);
      const plain = scenes.find((s) => !s.simulation);
      await engine.ready(plain.id);
      const rows = [];
      for (const scene of scenes.filter((s) => s.simulation)) {
        await engine.ready(scene.id);
        engine.load(presetSnapshot(plain), 0);
        for (let i = 0; i < 3; i++) engine.advance(1 / 60);
        engine.load(presetSnapshot(scene), 2, { transition: "crossfade" });
        let held = true,
          steps = 0;
        while (engine.slots.at(-1).warmTicks > 0 && steps++ < 400) {
          held &&= engine.transition?.elapsed === 0;
          engine.advance(1 / 60);
        }
        for (let i = 0; i < 400 && engine.transition; i++)
          engine.advance(1 / 60);
        rows.push({
          id: scene.id,
          held,
          steps,
          warmTicks: scene.simulation.warmTicks ?? 120,
          done: !engine.transition,
        });
      }
      return rows;
    });
    assert.ok(warmups.length > 0);
    for (const row of warmups) {
      if (row.warmTicks > 6)
        assert.ok(row.steps > 0, `${row.id} had no warm-up`);
      else
        assert.equal(
          row.steps,
          0,
          `${row.id} requested immediate prepared playback`,
        );
      assert.ok(row.held, `${row.id}: transition advanced during warm-up`);
      assert.ok(row.done, `${row.id}: fade never finished`);
    }
    pass(
      `${warmups.length} simulation families respect preparation and held-transition contracts`,
    );
    assert.deepEqual(lab.errors, []);
    await lab.context.close();
  }
  if (args.only === "lab") process.exit(0);

  // --- show: control + stage ------------------------------------------------
  const show = await openShow(runtime.browser, server.url);
  const { control, stage } = show;
  await waitFor(
    control,
    () => /Stage live/.test(document.getElementById("stagePill").textContent),
    null,
    "control sees the stage",
  );
  pass("control opens the stage, the stage starts and reports back");
  await waitFor(
    control,
    () => {
      const images = [...document.querySelectorAll("#catalogList .thumb img")];
      return (
        images.length >= 8 &&
        images
          .slice(0, 8)
          .every(
            (image) =>
              image.naturalWidth === 512 && image.naturalHeight === 288,
          )
      );
    },
    null,
    "baked catalog images appear immediately",
  );
  assert.equal(
    await control.evaluate(
      () => window.__phosphorControl.thumbnails.engine === undefined,
    ),
    true,
    "authored catalog does not start a thumbnail renderer",
  );

  const { lookTotal, familyTotal } = await stage.evaluate(async () => {
    const { familyMetadata } = await import("./family-catalog.mjs");
    return {
      lookTotal: window.__phosphorStage.scenes.reduce(
        (n, scene) => n + scene.presets.length,
        0,
      ),
      familyTotal: new Set(
        window.__phosphorStage.scenes.map(
          (scene) => familyMetadata(scene).familyId,
        ),
      ).size,
    };
  });
  const originalTheme = await control
    .locator("html")
    .getAttribute("data-theme");
  await control.locator("#themeToggle").click();
  const savedTheme = originalTheme === "dark" ? "light" : "dark";
  assert.equal(
    await control.locator("html").getAttribute("data-theme"),
    savedTheme,
  );
  await control
    .getByRole("button", { name: "Edit primary colour", exact: true })
    .click();
  const pad = control.locator(".color-sv");
  const bounds = await pad.boundingBox();
  await control.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.25,
  );
  await control.mouse.down();
  await control.mouse.move(
    bounds.x + bounds.width * 0.7,
    bounds.y + bounds.height * 0.4,
    { steps: 4 },
  );
  await control.mouse.up();
  await waitFor(
    control,
    () => {
      const saturation = Number(document.querySelector(".color-s").value);
      const brightness = Number(document.querySelector(".color-v").value);
      return Math.abs(saturation - 70) < 2 && Math.abs(brightness - 60) < 2;
    },
    null,
    "2D colour field changes saturation and brightness together",
  );
  await control
    .getByRole("textbox", { name: "Hex colour", exact: true })
    .fill("#8844cc");
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.currentSnapshot().palette.primary ===
      "#8844cc",
    null,
    "custom colour reaches stage",
  );
  await waitFor(
    control,
    () =>
      [...document.querySelectorAll(".look")].every(
        (card) => card.card.snapshot.palette.primary === "#8844cc",
      ),
    null,
    "all catalog snapshots share the live palette",
  );
  await pad.press("ArrowDown");
  assert.equal(
    await control.getByLabel("Colour brightness", { exact: true }).inputValue(),
    "79",
  );
  await control.locator(".color-presets > summary").click();
  await control
    .getByRole("button", { name: "Use Symbiosis palette", exact: true })
    .click();
  await control
    .getByRole("button", { name: "Close colour picker", exact: true })
    .click();
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.currentSnapshot().palette.primary ===
      "#bfe7d8",
    null,
    "palette preset restores shared colours",
  );
  assert.equal(
    await control.evaluate(
      () => window.__phosphorControl.thumbnails.engine === undefined,
    ),
    true,
    "palette changes never start a thumbnail renderer",
  );
  pass(
    "2D colour dragging, keyboard controls, hex input and presets reach stage and catalog",
  );

  await control.locator('[data-setup-open="audio"]').click();
  await control.locator("#tab-audio").press("ArrowRight");
  assert.equal(
    await control.locator("#tab-midi").getAttribute("aria-selected"),
    "true",
  );
  assert.equal(await control.locator("#setup-audio").isVisible(), false);
  await control.locator("#tab-audio").click();
  await control.locator("#closeSetup").click();
  await control.locator("#catalogSearch").fill("no-such-look-ui-check");
  assert.equal(await control.locator(".catalog-empty").isVisible(), true);
  await control.getByRole("button", { name: "Explore all looks" }).click();
  assert.equal(await control.locator(".look").count(), lookTotal);
  pass("theme switch, keyboard setup tabs and empty-catalog recovery");

  await control.locator('[data-setup-open="audio"]').click();
  await control.locator("#audioMute").check();
  await waitFor(
    stage,
    () => window.__phosphorStage.audio.engine.muted,
    null,
    "mute reaches the playing stage without restarting its source",
    5000,
  );
  await control.locator("#audioOff").click();
  await waitFor(
    stage,
    () => window.__phosphorStage.audio.source === "off",
    null,
    "audio off",
  );
  await control.locator("#useDemo").click();
  await waitFor(
    stage,
    () => window.__phosphorStage.audio.source === "demo",
    null,
    "demo resumes",
  );
  assert.equal(
    await stage.evaluate(() => window.__phosphorStage.audio.engine.muted),
    true,
  );
  await control.evaluate(() => {
    window.__getUserMedia = navigator.mediaDevices.getUserMedia;
    window.__stoppedPermissionTracks = 0;
    navigator.mediaDevices.getUserMedia = () =>
      new Promise((resolve) => {
        window.__finishPermission = () =>
          resolve({
            getTracks: () => [
              { stop: () => window.__stoppedPermissionTracks++ },
            ],
          });
      });
  });
  for (const cancel of ["source", "lock"]) {
    await control.locator("#useInput").click();
    if (cancel === "source") await control.locator("#audioOff").click();
    else await control.locator("#settingsLock").check();
    await control.evaluate(() => window.__finishPermission());
    await control.waitForTimeout(300);
    assert.equal(
      await stage.evaluate(() => window.__phosphorStage.audio.source),
      "off",
      "late microphone permission cannot override a newer choice or lock",
    );
    if (cancel === "lock") await control.locator("#settingsLock").uncheck();
  }
  assert.equal(
    await control.evaluate(() => window.__stoppedPermissionTracks),
    2,
  );
  await control.evaluate(() => {
    navigator.mediaDevices.getUserMedia = window.__getUserMedia;
  });
  await control.locator("#useDemo").click();
  await waitFor(
    stage,
    () => window.__phosphorStage.audio.source === "demo",
    null,
    "demo restored",
  );
  await control.locator("#audioMute").uncheck();
  await waitFor(
    stage,
    () => !window.__phosphorStage.audio.engine.muted,
    null,
    "unmute reaches stage",
  );
  pass("file/demo mute controls the playing stage");

  await control.locator("#tab-checks").click();
  const checklist = control.locator("#checks input").first();
  await checklist.focus();
  await checklist.click();
  await control.waitForTimeout(700); // multiple periodic stage status paints
  assert.equal(await checklist.isChecked(), true);
  assert.equal(
    await checklist.evaluate((node) => node === document.activeElement),
    true,
  );
  await control.locator("#tab-set").click();
  const ceiling = await control.locator("#fader-opt-bloom").elementHandle();
  await ceiling.press("ArrowLeft");
  await control.waitForTimeout(300); // scheduled set render must preserve the dragged/focused node
  assert.equal(
    await ceiling.evaluate(
      (node) => node.isConnected && node === document.activeElement,
    ),
    true,
  );
  await control.locator("#tab-audio").click();
  await control.locator("#closeSetup").click();
  await control.mouse.move(2, 2);
  const heart = control.locator(".look .heart").first();
  await heart.press("Enter");
  assert.equal(
    await heart.evaluate((node) => node === document.activeElement),
    true,
  );
  await heart.press("Enter"); // restore the fixture's favourite state
  const favouriteBeforePause = await heart.getAttribute("aria-pressed");
  await heart.press("Space");
  await waitFor(
    stage,
    () => window.__phosphorStage.show.clock.paused,
    null,
    "Space pauses from a focused button",
  );
  assert.equal(await heart.getAttribute("aria-pressed"), favouriteBeforePause);
  await heart.press("Space");
  await waitFor(
    stage,
    () => !window.__phosphorStage.show.clock.paused,
    null,
    "Space resumes",
  );
  pass(
    "checklist, set faders and keyboard favourites retain focus through updates",
  );

  await control.keyboard.press("KeyW"); // key 9 (QWERTY/QWERTZ W)
  await waitFor(
    stage,
    () => {
      const { show } = window.__phosphorStage;
      return !!show.set.keys[9] && show.live?.clip.id === show.set.keys[9];
    },
    null,
    "grid key 9 plays the tenth card",
  );
  pass("grid key plays the look on that card on the stage (D68)");

  const familyChange = await stage.evaluate(() => {
    const { show, scenes } = window.__phosphorStage;
    const scene = scenes.find((s) => s.id === show.live.clip.snapshot.scene);
    const key = scene.stage?.[0] ?? scene.schema.find((d) => d.step < 1).key;
    const def = scene.schema.find((d) => d.key === key);
    return { key, value: def.max };
  });
  await control.evaluate((change) => {
    const channel = new BroadcastChannel("phosphor-show");
    channel.postMessage({
      type: "action",
      action: { type: "param", ...change },
    });
    channel.close();
  }, familyChange);
  await waitFor(
    control,
    ({ key, value }) =>
      Number(document.getElementById(`fader-family-${key}`)?.value) === value,
    familyChange,
    "family faders reflect remote/MIDI parameter changes",
  );
  await control.locator("body").press("KeyL");
  await control.keyboard.down("KeyL");
  await waitFor(
    stage,
    () => window.__phosphorStage.show.flash,
    null,
    "held Flash starts",
  );
  await control.evaluate(() => window.dispatchEvent(new Event("blur")));
  await waitFor(
    stage,
    () => !window.__phosphorStage.show.flash,
    null,
    "window blur releases held Flash",
  );
  await control.keyboard.up("KeyL");
  pass(
    "family faders follow remote edits and held Flash releases on focus loss",
  );

  // Panic under slider focus: the old instrument ignored B/Blackout button here.
  await control.locator("#fader-master").focus();
  await control.locator("#blackout").click();
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackoutTarget === 1,
    null,
    "Blackout button with a slider focused",
  );
  const latency = await stage.evaluate(
    () => window.__phosphorStage.telemetry().blackoutLatencyFrames,
  );
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackout === 1,
    null,
    "blackout reaches black",
  );
  assert.ok(
    latency.every((f) => f <= 2),
    `blackout latency ${latency}`,
  );
  await control.locator("#blackout").click();
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.blackoutTarget === 0,
    null,
    "Blackout button again recovers",
  );
  pass(
    "Blackout button blacks out within two frames even with a slider focused, and recovers",
  );

  await control.locator(".performance-options > summary").click();
  await control.locator("#safe").click();
  await control.locator(".performance-options > summary").click();
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.live === null &&
      window.__phosphorStage.engine.slots.at(-1).scene.id === "interference",
    null,
    "safe look",
  );
  pass("Safe look button loads the safe look");

  const autopilot = await stage.evaluate(
    () => window.__phosphorStage.show.autopilot.enabled,
  );
  await control.locator("body").press("KeyP");
  await waitFor(
    stage,
    (was) => window.__phosphorStage.show.autopilot.enabled !== was,
    autopilot,
    "P toggles autopilot",
  );
  pass("P toggles autopilot");

  // Set edits remain available while the stage is connected.
  const name = `Harness ${Date.now()}`;
  await control.locator('[data-setup-open="set"]').click();
  await control.locator("#setFields input").first().fill(name);
  await control.locator("#setFields input").first().dispatchEvent("change");
  await waitFor(
    stage,
    (n) => window.__phosphorStage.show.set.name === n,
    name,
    "set edit reaches the stage",
  );
  pass("configuration edits reach the stage");
  await control.locator("#closeSetup").click();

  // Catalog (D65, D68): every look is listed; a star rating and a favourite
  // reach the stage's set; the keys follow the view; Play plays live.
  const catalog = await control.evaluate(() => ({
    title: document.getElementById("catalogTitle").textContent,
    cards: document.querySelectorAll(".look").length,
  }));
  assert.equal(catalog.cards, lookTotal);
  assert.equal(
    catalog.title,
    `Catalog${lookTotal} looks · ${familyTotal} families`,
  );
  const cards = control.locator(".look");
  const rated = await cards.nth(2).evaluate((node) => node.card.look.id);
  await cards.nth(2).locator("summary").click();
  const lastStar = cards.nth(2).locator(".star").nth(9);
  const starBox = await lastStar.boundingBox();
  await lastStar.click({
    position: { x: starBox.width * 0.9, y: starBox.height / 2 },
  });
  await waitFor(
    stage,
    (id) => window.__phosphorStage.show.set.ratings[id] === 10,
    rated,
    "a ten-star rating reaches the stage",
  );
  await control.mouse.move(2, 2); // leaving the list re-sorts by rating
  await waitFor(
    control,
    (id) => document.querySelector(".look")?.card.look.id === id,
    rated,
    "the rated look sorts first",
  );
  const loved = await cards.nth(6).evaluate((node) => node.card.look.id);
  await cards.nth(6).locator(".heart").click();
  await control.mouse.move(2, 2);
  await waitFor(
    stage,
    (id) => {
      const { set } = window.__phosphorStage.show;
      return set.favorites.includes(id) && set.keys[0] === id;
    },
    loved,
    "a favourite sorts first and takes the first key",
  );
  const played = await cards.nth(4).evaluate((node) => node.card.look.id);
  await cards.nth(4).locator("summary").click();
  await cards.nth(4).locator(".play").click();
  await waitFor(
    stage,
    (id) => window.__phosphorStage.show.live?.clip.id === id,
    played,
    "Play plays the look live",
  );
  pass(
    "catalog lists every look; ratings and favourites reach the stage; keys follow the view; Play plays live",
  );

  // Next (D66): Shift+Space plays autopilot's next pick without taking over.
  const beforeNext = await stage.evaluate(() => ({
    id: window.__phosphorStage.show.live?.clip.id,
    manualUntil: window.__phosphorStage.show.autopilot.manualUntil,
  }));
  // A focused catalog thumbnail must preserve Shift+Space instead of replaying itself.
  await cards.first().locator(".thumb").press("Shift+Space");
  await waitFor(
    stage,
    (id) => {
      const live = window.__phosphorStage.show.live;
      return !!live && live.clip.id !== id;
    },
    beforeNext.id,
    "Shift+Space plays the next pick",
  );
  assert.equal(
    await stage.evaluate(
      () => window.__phosphorStage.show.autopilot.manualUntil,
    ),
    beforeNext.manualUntil,
    "Next is not a performer takeover",
  );
  pass("Shift+Space plays autopilot's next pick on the stage");

  // Control reload: the stage keeps rendering and the control reconnects.
  // Leave the text field: typing there must not trigger clips.
  await control.evaluate(() => document.activeElement?.blur());
  await control.keyboard.press("KeyE"); // key 10
  const key10 = await stage.evaluate(
    () => window.__phosphorStage.show.set.keys[10],
  );
  await waitFor(
    stage,
    (id) => window.__phosphorStage.show.live?.clip.id === id,
    key10,
    "key 10",
  );
  const before = await stage.evaluate(readStage);
  await control.reload();
  assert.equal(
    await control.locator("html").getAttribute("data-theme"),
    savedTheme,
    "appearance survives a reload while the stage keeps playing",
  );
  await waitFor(
    control,
    () => /Stage live/.test(document.getElementById("stagePill").textContent),
    null,
    "control reconnects",
  );
  const after = await stage.evaluate(readStage);
  assert.ok(
    after.frames > before.frames,
    "stage kept rendering through the control reload",
  );
  assert.equal(after.status.live.look, key10);
  await waitFor(
    control,
    () => document.getElementById("previewEmpty").hidden,
    null,
    "preview reattached",
  );
  pass("control reload: stage keeps playing, control and preview reconnect");
  // A slow GPU can miss status reports without closing the stage. Exercise
  // the real key/channel path beyond the old 2 s lease, after control reload
  // has also discarded the original window.open() return value.
  await control.evaluate(() => {
    const channel = new BroadcastChannel("phosphor-show");
    const probe = { last: performance.now(), channel };
    channel.onmessage = ({ data }) => {
      if (data?.type === "status") probe.last = performance.now();
    };
    window.__stageStatusProbe = probe;
  });
  await stage.evaluate(() => {
    const original = BroadcastChannel.prototype.postMessage;
    window.__resumeStageStatus = () => {
      BroadcastChannel.prototype.postMessage = original;
    };
    BroadcastChannel.prototype.postMessage = function (data) {
      if (data?.type !== "status") return original.call(this, data);
    };
  });
  try {
    await waitFor(
      control,
      () => performance.now() - window.__stageStatusProbe.last > 2500,
      null,
      "stage status reports are paused",
    );
    const state = await stage.evaluate(() => ({
      blackout: window.__phosphorStage.engine.blackoutTarget,
      autopilot: window.__phosphorStage.show.autopilot.enabled,
    }));
    await control.locator("#fader-master").focus();
    await control.locator("#blackout").click();
    await waitFor(
      stage,
      (was) => window.__phosphorStage.engine.blackoutTarget !== was,
      state.blackout,
      "Blackout button reaches the open stage without status reports",
    );
    await control.locator("#blackout").click();
    await waitFor(
      stage,
      (was) => window.__phosphorStage.engine.blackoutTarget === was,
      state.blackout,
      "Blackout button recovers the open stage without status reports",
    );
    await control.locator("body").press("KeyP");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.show.autopilot.enabled !== was,
      state.autopilot,
      "P reaches the open stage without status reports",
    );
    await control.locator("body").press("KeyP");
    await waitFor(
      stage,
      (was) => window.__phosphorStage.show.autopilot.enabled === was,
      state.autopilot,
      "P recovers the open stage without status reports",
    );
    pass(
      "Blackout button and P keep reaching the open stage through missed status reports",
    );
  } finally {
    await stage.evaluate(() => {
      window.__resumeStageStatus();
      delete window.__resumeStageStatus;
    });
    await control.evaluate(() => {
      window.__stageStatusProbe.channel.close();
      delete window.__stageStatusProbe;
    });
  }

  // Stage reload: runtime state restores the clip, energy and shared controls.
  await control.evaluate(() => {
    const channel = new BroadcastChannel("phosphor-show");
    channel.postMessage({
      type: "action",
      action: { type: "energy", value: 0.8 },
    });
    channel.postMessage({
      type: "action",
      action: { type: "shared", zoom: 1.4 },
    });
  });
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.energy === 0.8 &&
      window.__phosphorStage.show.shared.zoom === 1.4,
    null,
    "energy/zoom",
  );
  await stage.waitForTimeout(1500); // runtime state is saved every second
  await stage.reload();
  await waitFor(stage, () => !!window.__phosphorStage, null, "stage reloads");
  const restored = await stage.evaluate(readStage);
  assert.equal(restored.status.live.look, key10);
  assert.equal(restored.status.energy, 0.8);
  assert.equal(restored.status.shared.zoom, 1.4);
  pass("stage reload restores clip, energy and shared controls");

  // Real control → stage sequencer flow, beyond the isolated UI fixture.
  const rhythmCue = (id) =>
    control.evaluate((id) => {
      const bus = new BroadcastChannel("phosphor-show");
      bus.postMessage({
        type: "action",
        action: { type: "autopilot", on: false },
      });
      bus.postMessage({ type: "action", action: { type: "look", id } });
      bus.close();
    }, id);
  await rhythmCue("quasicrystal:Penrose Rhombs");
  const ribbon = control.locator('[data-effect="ribbon"]');
  await ribbon.waitFor();
  const compactCell = ribbon.locator(".rhythm-mini button").nth(1);
  await compactCell.click();
  await waitFor(
    stage,
    () => {
      const track = window.__phosphorStage.show.rhythmFrame(
        performance.now() / 1000,
      ).settings.families.quasicrystal.tracks[0];
      return track.division === 4 && track.steps[1] > 0;
    },
    null,
    "compact cell edits the live pattern without expanding the panel",
  );
  await control.keyboard.down("KeyL");
  await waitFor(
    stage,
    () => window.__phosphorStage.engine.flashHeld,
    null,
    "Flash held before opening rhythm options",
  );
  await ribbon
    .getByRole("button", { name: "Ribbon chase settings", exact: true })
    .click();
  const ribbonOptions = control.locator('[data-effect-options="ribbon"]');
  await ribbonOptions.getByLabel("Ribbon chase strength").focus();
  await control.keyboard.up("KeyL");
  await waitFor(
    stage,
    () => !window.__phosphorStage.engine.flashHeld,
    null,
    "Flash releases inside rhythm options",
  );
  await ribbonOptions.getByLabel("Ribbon chase resolution").selectOption("1");
  const length = ribbonOptions.getByLabel("Ribbon chase loop length in steps");
  await length.fill("3");
  await length.dispatchEvent("change");
  await waitFor(
    stage,
    () => {
      const pattern = window.__phosphorStage.show.rhythmFrame(
        performance.now() / 1000,
      ).settings.families.quasicrystal;
      return pattern.mode === "locked" && pattern.tracks[0].length === 3;
    },
    null,
    "three-beat family loop applies on the music clock",
  );
  await ribbonOptions
    .getByRole("button", { name: "Close rhythm options" })
    .click();
  await control.locator("#rhythmGlobalView").click();
  await control
    .locator('[data-effect="brightness"] .rhythm-effect-name')
    .click();
  const globalOptions = control.locator('[data-effect-options="brightness"]');
  const globalMute = globalOptions.locator(".rhythm-mute");
  await globalMute.click();
  await globalOptions
    .getByRole("button", { name: "Close rhythm options" })
    .click();
  await control.locator("#rhythmFamilyView").click();
  await waitFor(
    stage,
    () =>
      window.__phosphorStage.show.rhythmFrame(performance.now() / 1000).settings
        .global.tracks[0].muted,
    null,
    "global mute reaches stage immediately",
  );
  await rhythmCue("caustics:Pool of Light");
  await control.locator('[data-effect="ray-bundle"]').waitFor();
  assert.equal(await globalMute.getAttribute("aria-pressed"), "true");
  await rhythmCue("quasicrystal:Penrose Rhombs");
  await ribbon.waitFor();
  await waitFor(
    control,
    () =>
      document.querySelector(
        '[data-effect-options="ribbon"] input[type="number"]',
      ).value === "3",
    null,
    "protected family pattern returns unchanged",
  );
  await control
    .locator(".rhythm-panel")
    .screenshot({ path: `${output}/rhythm-panel.png` });
  pass(
    "live rhythm grid applies independent loops, protects edits and retains global effects across families",
  );

  await control.locator('[data-setup-open="checks"]').click();
  await control.locator("#pattern").click();
  await waitFor(
    stage,
    () => document.body.classList.contains("pattern"),
    null,
    "framing pattern",
  );
  pass("framing pattern toggles on the stage");

  const counters = await stage.evaluate(
    () => window.__phosphorStage.engine.counters,
  );
  assert.equal(counters.gpuErrors, 0);
  assert.equal(counters.nonFinite, 0);
  pass("no GPU errors, non-finite inputs or page errors");

  // Presence-based ownership must still release the preview on real closure,
  // including the window proxy recovered after control and stage reloads.
  await control.locator("#settingsLock").check();
  assert.equal(await control.locator("#breedLook").isDisabled(), true);
  await stage.close();
  await waitFor(
    control,
    () =>
      document.getElementById("stagePill").textContent === "Stage not open" &&
      document.getElementById("settingsLock").disabled &&
      !document.getElementById("settingsLock").checked,
    null,
    "stage closure resumes local performance and unlocks settings",
  );
  await control.locator("#closeSetup").click();
  await control.locator("#blackout").click();
  await waitFor(
    control,
    () => document.getElementById("blackout").ariaPressed === "true",
    null,
    "Blackout button controls the local preview after stage closure",
  );
  await control.locator("#blackout").click();
  await waitFor(
    control,
    () => document.getElementById("blackout").ariaPressed === "false",
    null,
    "Blackout button recovers the local preview after stage closure",
  );
  assert.deepEqual(show.errors, []);
  pass("closing the stage resumes local keys and unlocks settings");

  if (
    (await control.locator("#autopilot").getAttribute("aria-pressed")) ===
    "true"
  )
    await control.locator("#autopilot").click();
  await control
    .getByRole("combobox", { name: "Look family", exact: true })
    .selectOption("interference");
  await control.evaluate(async () => {
    const { Engine } = await import("./engine.mjs");
    const load = Engine.prototype.load;
    window.__variationLoads = [];
    window.__restoreVariationProbe = () => {
      Engine.prototype.load = load;
    };
    Engine.prototype.load = function (...args) {
      window.__variationLoads.push(this.canvas.id);
      return load.apply(this, args);
    };
  });
  await control.locator("#breedLook").click();
  assert.equal(await control.locator("#variations button").count(), 6);
  await waitFor(
    control,
    () => !!document.querySelector("#variations img[src]"),
    null,
    "variation thumbnail renders independently",
  );
  assert.equal(
    await control.evaluate(() =>
      window.__variationLoads.includes("editorCanvas"),
    ),
    false,
    "generating variations must not replace the playing preview",
  );
  await control.evaluate(() => window.__restoreVariationProbe());
  await control.locator("#variations button").first().click();
  assert.equal(
    await control
      .getByRole("combobox", { name: "Look family", exact: true })
      .inputValue(),
    "interference",
  );
  await control
    .getByRole("combobox", { name: "Look family", exact: true })
    .selectOption("pulse");
  assert.equal(
    await control.locator("#variations button").count(),
    0,
    "changing family clears incompatible variations",
  );
  await control.locator("#saveAsLook").click();
  await control.locator("body").focus();
  await control.keyboard.down("KeyL");
  await control.locator("#lookMenu > summary").click();
  await control.locator("#deleteLook").click();
  await control.keyboard.up("KeyL");
  assert.equal(
    await control.locator("#flash").getAttribute("aria-pressed"),
    "false",
    "confirmation must not swallow held Flash release",
  );
  await control.locator("#confirmNo").click();
  await control.locator("#lookMenu > summary").click();
  await control.locator('[data-setup-open="set"]').click();
  const [download] = await Promise.all([
    control.waitForEvent("download"),
    control.locator("#exportSet").click(),
  ]);
  const { readFile } = await import("node:fs/promises");
  const exportedPath = `${output}/ui-export.json`;
  await download.saveAs(exportedPath);
  const exported = JSON.parse(await readFile(exportedPath, "utf8"));
  const saved = exported.looks.find(
    (look) => look.name === "Pulse Geometry" || look.snapshot.scene === "pulse",
  );
  assert.ok(saved, "own look exports");
  assert.equal(
    saved.base,
    "pulse:0",
    "saved family changes retain a valid authored base",
  );
  assert.deepEqual(show.errors, []);
  pass(
    "variations preserve playback, clear on family change and save a valid own look",
  );
} finally {
  await runtime?.stop();
  await server.close();
}
