// Timed Autopilot changes must synchronize the editor without replaying a look.
import assert from "node:assert/strict";
import { serve, launch, openShow, options, APP } from "./browser-runtime.mjs";
import scenes from "../scenes.mjs";
import { initialShowSet } from "../show-set.mjs";
import { SET_KEY } from "../show-storage.mjs";
import { catalogLooks } from "../catalog.mjs";

const args = options({ "native-gpu": { type: "boolean", default: false } });
const server = await serve(".", args.port);
let runtime;
const identity = (look) => ({
  id: look.id,
  name: look.name,
  family: scenes.find((s) => s.id === look.snapshot.scene).name,
  params: look.snapshot.params,
});
async function assertLook(control, expected) {
  await control.waitForFunction(
    (id) => window.__phosphorControl.catalog.live === id,
    expected.id,
    { timeout: 15000 },
  );
  const actual = await control.evaluate(() => {
    const catalog = window.__phosphorControl.catalog;
    return {
      name: document.getElementById("editorTitle").textContent,
      family: document.querySelector("#editorFamily select").selectedOptions[0]
        .textContent,
      selected: catalog.selected,
      marked: catalog.cards
        .get(catalog.live)
        .node.classList.contains("selected"),
      params: Object.fromEntries(
        [
          ...document.querySelectorAll(
            '#editor input[type="range"], #editorMore input[type="range"]',
          ),
        ].map((input) => [
          input.id.replace("fader-param-", ""),
          { value: Number(input.value), step: Number(input.step) },
        ]),
      ),
    };
  });
  assert.equal(actual.name, expected.name, "Look name follows Autopilot");
  assert.equal(actual.family, expected.family, "Look family follows Autopilot");
  assert.equal(
    actual.selected,
    expected.id,
    "Catalog selection follows Autopilot",
  );
  assert.equal(actual.marked, true, "Playing card has the selected mark");
  assert.deepEqual(
    Object.keys(actual.params).sort(),
    Object.keys(expected.params).sort(),
  );
  for (const [key, { value, step }] of Object.entries(actual.params))
    assert.ok(
      Math.abs(value - expected.params[key]) <= step / 2 + 1e-8,
      `Look setting ${key} follows Autopilot`,
    );
}
try {
  runtime = await launch({ rig: args["native-gpu"], headless: true });
  const { context, control, stage, errors } = await openShow(
    runtime.browser,
    server.url,
    { stageViewport: { width: 640, height: 360 } },
  );
  const target = await stage.evaluate(() => {
    const { show } = window.__phosphorStage;
    const look = show.catalog.find(
      (item) => item.snapshot.scene !== show.live.clip.snapshot.scene,
    );
    show.set.favorites = [look.id];
    show.set.autopilot.favoritesOnly = true;
    show.autopilot.enabled = true;
    show.autopilot.manualUntil = -Infinity;
    show.autopilot.nextChange = 0;
    show.autopilot.nextDrift = Infinity;
    return look;
  });
  await assertLook(control, identity(target));
  assert.equal(
    await stage.evaluate(
      () => window.__phosphorStage.show.autopilot.manualUntil,
    ),
    -Infinity,
    "Status synchronization never takes over Autopilot",
  );
  console.log(
    "PASS Stage Autopilot updates Look identity, all controls and catalog selection",
  );

  // A stage-side tweak (e.g. MIDI) must reach the same live editor too.
  const changeStageParam = async (value) => {
    await control.evaluate((value) => {
      const channel = new BroadcastChannel("phosphor-show");
      channel.postMessage({
        type: "action",
        action: { type: "param", key: "speed", value },
      });
      channel.close();
    }, value);
    await control.waitForFunction(
      (value) =>
        Number(document.getElementById("fader-family-speed").value) === value,
      value,
    );
  };
  await changeStageParam(0.81);
  assert.equal(
    await control.locator("#fader-param-speed").inputValue(),
    "0.81",
  );
  const editorNode = await control
    .locator("#fader-param-speed")
    .elementHandle();
  await changeStageParam(0.82);
  assert.equal(
    await editorNode.evaluate((input) => input.isConnected),
    true,
    "Status updates retain existing controls",
  );
  console.log(
    "PASS Live parameter changes update existing controls without rebuilding them",
  );

  await control.locator("#fader-param-speed").press("ArrowRight");
  const edited = await control.locator("#fader-param-speed").inputValue();
  await control.locator("#themeToggle").focus();
  await changeStageParam(0.84);
  assert.equal(
    await control.locator("#fader-param-speed").inputValue(),
    edited,
    "An unsaved manual edit survives later status updates",
  );
  console.log(
    "PASS Manual draft edits are not overwritten by subsequent status",
  );
  assert.deepEqual(errors, []);
  await context.close();

  // No Stage: let the real local clock cross the shortest configured interval.
  const local = await runtime.browser.newContext({
    viewport: { width: 1280, height: 850 },
  });
  const set = initialShowSet(scenes);
  set.autopilot = { ...set.autopilot, random: false, everyBars: 8 };
  set.clock = { ...set.clock, mode: "manual", manualBpm: 200 };
  await local.addInitScript(
    ({ key, set }) => localStorage.setItem(key, JSON.stringify(set)),
    { key: SET_KEY, set },
  );
  const page = await local.newPage();
  const localErrors = [];
  page.on("pageerror", (error) => localErrors.push(error.message));
  await page.goto(server.url + APP);
  await page.waitForFunction(() => !!window.__phosphorControl?.catalog.live);
  const initial = await page.evaluate(
    () => window.__phosphorControl.catalog.live,
  );
  await page.waitForFunction(
    (id) => window.__phosphorControl.catalog.live !== id,
    initial,
    { timeout: 15000 },
  );
  const current = await page.evaluate(
    () => window.__phosphorControl.catalog.live,
  );
  const localTarget = catalogLooks(scenes).find((look) => look.id === current);
  await assertLook(page, identity(localTarget));
  assert.deepEqual(localErrors, []);
  console.log("PASS Local Autopilot updates Look and catalog without a Stage");
  const manualId = await page.evaluate(() => {
    const catalog = window.__phosphorControl.catalog;
    const look = catalog.looks.find((look) => look.id !== catalog.live);
    catalog.onEdit(look);
    const name = document.querySelector('#editorMore input[maxlength="80"]');
    name.value = "Manual draft test";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    return look.id;
  });
  await page.waitForFunction(
    (id) => window.__phosphorControl.catalog.live === id,
    manualId,
  );
  assert.equal(
    await page.locator('#editorMore input[maxlength="80"]').inputValue(),
    "Manual draft test",
    "First status after a local audition preserves immediate edits",
  );
  console.log(
    "PASS Immediate local draft edits survive the first playback status",
  );
  await local.close();
} finally {
  await runtime?.stop();
  await server.close();
}
