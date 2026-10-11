import test from "node:test";
import assert from "node:assert/strict";
import { launch, serve } from "../../scripts/browser-runtime.mjs";

test(
  "rhythm grid keeps performer focus, explicit scope, dormant variants and independent loops",
  { skip: process.env.PHOSPHOR_RHYTHM_UI !== "1", timeout: 120000 },
  async () => {
    const server = await serve(".", 48276);
    // A dedicated fixture avoids rendering the show during this UI check.
    let runtime;
    try {
      runtime = await launch({ headless: true });
      const page = await runtime.browser.newPage({
        viewport: { width: 1100, height: 1000 },
      });
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${server.url}tests/browser/rhythm.html`);
      await page.evaluate(async () => {
        const { RhythmPanel } = await import("../../control-rhythm.mjs");
        const { defaultPattern, initialRhythm } =
          await import("../../rhythm.mjs");
        const scenes = [
          {
            id: "tiles",
            name: "Aperiodic Tilings",
            type: { key: "tiling" },
            rhythm: [
              {
                id: "ribbon",
                slot: 0,
                label: "Ribbon chase",
                kind: "accent",
                description: "Follow tile neighbours",
                defaults: {
                  division: 1,
                  length: 3,
                  steps: [0.55, 0, 1],
                  strength: 0.4,
                  duration: 0.5,
                  muted: false,
                },
              },
              {
                id: "flip",
                slot: 1,
                label: "Tile rearrangement",
                kind: "motion",
                variants: [1],
                defaults: {
                  division: 1,
                  length: 8,
                  steps: [1, 0, 0, 0, 0, 0, 0, 0],
                  strength: 0.5,
                  duration: 1,
                  muted: false,
                },
              },
            ],
          },
        ];
        const set = {
          looks: [{ id: "own-test", snapshot: { scene: "tiles" } }],
          rhythm: initialRhythm(scenes),
        };
        const state = {
          clock: { beat: 3.1, bpm: 120 },
          rhythm: {
            position: 3.1,
            beat: 3.1,
            origin: 0,
            style: "driving",
            enabled: true,
            settings: set.rhythm,
            applied: structuredClone(set.rhythm),
            overrides: {},
            pending: [],
            live: {
              family: "tiles",
              look: "own-test",
              name: "Playing look",
              own: true,
              variant: 0,
            },
          },
        };
        const draft = {
          id: "own-test",
          name: "Different draft",
          own: true,
          snapshot: { scene: "tiles", params: { tiling: 1 } },
        };
        const actions = [],
          previews = [],
          saves = [];
        const panel = new RhythmPanel({
          root: document.getElementById("rhythmControls"),
          scenes,
          getSet: () => set,
          getStatus: () => state,
          getDraft: () => draft,
          onCommand: (action) => {
            actions.push(action);
            if (action.scope === "global")
              state.rhythm.settings.global = action.pattern;
            else if (action.scope === "look")
              state.rhythm.overrides[action.look] = action.pattern;
            else state.rhythm.settings.families[action.family] = action.pattern;
            state.rhythm.pending = [{ ...action, at: 4, beats: 0.9 }];
          },
          onDraftPreview: (pattern) => {
            previews.push(pattern);
            if (pattern) draft.rhythm = pattern;
          },
          onSaveOverride: (target, pattern) => {
            saves.push({ target, pattern });
            if (pattern) {
              set.looks[0].rhythm = pattern;
              state.rhythm.overrides[target.look] = pattern;
            } else {
              delete state.rhythm.overrides[target.look];
              set.looks[0].rhythm = null;
            }
          },
        });
        panel.update();
        window.rhythmFixture = {
          panel,
          state,
          set,
          draft,
          actions,
          previews,
          saves,
          defaultPattern,
        };
      });
      const ribbon = page.locator(
        '.rhythm-section:not(.rhythm-global) [data-effect="ribbon"]',
      );
      const flip = page.locator('[data-effect="flip"]');
      assert.equal(await ribbon.locator(".rhythm-step").count(), 3);
      assert.match(
        await page.locator(".rhythm-target").textContent(),
        /Playing look/,
      );
      assert.match(
        await ribbon.locator(".rhythm-loop-note").textContent(),
        /3 beats.*crosses bars/,
      );
      assert.equal(
        await flip.locator(".rhythm-step").first().isDisabled(),
        true,
      );
      await ribbon.locator(".rhythm-step").first().focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await ribbon
          .locator(".rhythm-step")
          .nth(1)
          .evaluate((node) => document.activeElement === node),
        true,
      );
      await page.keyboard.press("Space");
      assert.equal(
        await ribbon
          .locator(".rhythm-step")
          .nth(1)
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page.evaluate(() => rhythmFixture.actions.at(-1).quantize),
        "step",
      );
      assert.equal(
        await page.evaluate(() => rhythmFixture.actions.at(-1).scope),
        "family",
      );
      await page.evaluate(() => {
        window.savedStep = document.activeElement;
        for (let index = 0; index < 20; index++) {
          rhythmFixture.state.rhythm.position += 0.1;
          rhythmFixture.panel.update();
        }
      });
      assert.equal(
        await page.evaluate(
          () =>
            document.activeElement === window.savedStep &&
            window.savedStep.isConnected,
        ),
        true,
      );
      await ribbon.locator("select").selectOption("4");
      assert.equal(await ribbon.locator(".rhythm-step").count(), 12);
      assert.equal(
        await page.evaluate(() => rhythmFixture.actions.at(-1).quantize),
        "bar",
      );
      assert.match(
        await page
          .locator(".rhythm-save .rhythm-pending")
          .first()
          .textContent(),
        /next 1/,
      );
      await ribbon.locator('input[type="number"]').first().fill("256");
      await ribbon.locator('input[type="number"]').first().press("Tab");
      assert.equal(await ribbon.locator(".rhythm-step").count(), 256);
      assert.equal(
        await ribbon
          .locator(".rhythm-step-scroll")
          .evaluate((node) => node.scrollWidth > node.clientWidth),
        true,
      );
      await ribbon.locator('input[type="range"]').focus();
      await page.evaluate(() => {
        window.savedFader = document.activeElement;
        rhythmFixture.panel.update();
      });
      assert.equal(
        await page.evaluate(() => document.activeElement === savedFader),
        true,
      );
      await page.evaluate(() => {
        rhythmFixture.state.rhythm.live.variant = 1;
        rhythmFixture.panel.update();
      });
      assert.equal(
        await flip.locator(".rhythm-step").first().isDisabled(),
        false,
      );
      await page
        .getByRole("button", { name: "Save as look override", exact: true })
        .click();
      assert.equal(await page.evaluate(() => rhythmFixture.saves.length), 1);
      await ribbon.locator(".rhythm-step").first().click();
      assert.equal(
        await page.evaluate(() => rhythmFixture.actions.at(-1).scope),
        "look",
      );
      const before = await page.evaluate(() => rhythmFixture.actions.length);
      await page
        .getByRole("button", { name: "Preview draft rhythm", exact: true })
        .click();
      assert.match(
        await page.locator(".rhythm-target").textContent(),
        /Draft preview.*Different draft/,
      );
      await ribbon.locator(".rhythm-step").first().click();
      assert.equal(
        await page.evaluate(() => rhythmFixture.actions.length),
        before,
      );
      assert.ok(
        (await page.evaluate(() => rhythmFixture.previews.length)) >= 2,
      );
      assert.equal(
        await page.locator(".rhythm-global .rhythm-step").first().isDisabled(),
        true,
      );
      assert.deepEqual(errors, []);
      await page.close();
    } finally {
      await runtime?.stop();
      await server.close();
    }
  },
);
