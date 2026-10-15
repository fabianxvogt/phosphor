import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { serve, launch } from "./browser-runtime.mjs";
import en from "../i18n/en.mjs";
import de from "../i18n/de.mjs";

// --port N (or PHOSPHOR_PORT) lets parallel worktrees run this check at once.
const portFlag = process.argv.indexOf("--port");
const server = await serve(
  "dist",
  portFlag > 0
    ? process.argv[portFlag + 1]
    : (process.env.PHOSPHOR_PORT ?? 48135),
);
const out = new URL("../artifacts/i18n/", import.meta.url);
await mkdir(out, { recursive: true });
let runtime;
try {
  runtime = await launch({
    rig: process.argv.includes("--native-gpu"),
    headless: true,
  });
  for (const language of ["de-DE", "en-GB"]) {
    const dictionary = language.startsWith("de") ? de : en;
    const context = await runtime.browser.newContext({
      locale: language,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.url);
    await page.waitForFunction(
      () =>
        window.__phosphorControl?.rhythmPanel &&
        document.querySelector(".look-name"),
    );
    assert.equal(
      await page.locator("html").getAttribute("lang"),
      language.slice(0, 2),
    );
    assert.equal(await page.title(), dictionary["Phosphor · control"]);
    assert.equal(
      (await page.locator("#openStage").innerText())
        .trim()
        .replace(/\s+↗$/, ""),
      dictionary["Open stage"],
    );
    assert.equal(
      await page.locator("#catalogSearch").getAttribute("placeholder"),
      dictionary["Search looks"],
    );
    assert.equal(
      await page.locator("#setName").innerText(),
      dictionary["New show"],
    );
    await page.locator("#autopilot").evaluate((button) => {
      if (button.ariaPressed === "true") button.click();
    });
    await page.locator("#previewPause").click();
    assert.equal(
      await page.locator("#previewPause").getAttribute("aria-label"),
      dictionary["Resume playback (Space)"],
    );
    await page.locator("#previewTempo").click();
    await page.locator("#quickBpm").fill("123.5");
    await page.locator("#quickBpm").press("Tab");
    await page.locator("#tempoFaster").click();
    assert.equal(await page.locator("#quickBpm").inputValue(), "124.5");
    assert.equal(
      await page.locator("#bpm").innerText(),
      language.startsWith("de") ? "124,5" : "124.5",
    );
    await page.keyboard.press("Escape");
    await page.locator("#themeToggle").click();
    assert.equal(
      await page.locator("#themeToggle").getAttribute("aria-label"),
      dictionary["Switch to dark mode"],
    );
    await page.locator("#themeToggle").click();
    // A fresh window opens on the featured world; search lives in Looks.
    await page.locator(".world-tabs button").first().click();
    for (const query of ["Quiet Herbarium", dictionary["Quiet Herbarium"]]) {
      await page.locator("#catalogSearch").fill(query);
      assert.equal(await page.locator("#catalogList .look").count(), 1);
      assert.equal(
        await page.locator("#catalogList .look-name").innerText(),
        dictionary["Quiet Herbarium"],
      );
    }
    await page.locator("#catalogSearch").fill("");
    const ratedCard = page.locator("#catalogList .look").nth(2);
    await ratedCard.locator("summary").click();
    const lastStar = ratedCard.locator(".star").nth(9);
    const box = await lastStar.boundingBox();
    await lastStar.click({
      position: { x: box.width * 0.9, y: box.height / 2 },
    });
    assert.equal(
      await ratedCard.locator(".stars").getAttribute("aria-valuenow"),
      "10",
    );
    await ratedCard.locator("summary").click();
    await page.mouse.move(2, 2);
    await page.locator("#lookMenu > summary").click();
    await page.locator("#editorMore .field input").first().fill("Custom");
    await page.keyboard.press("Escape");
    await page.locator("#saveAsLook").click();
    await page.waitForFunction(
      () => document.querySelector("#editorTitle")?.textContent === "Custom",
    );
    assert.ok(
      (
        await page.locator("#catalogList .look-name").allTextContents()
      ).includes("Custom"),
    );
    await page.locator(".palette-swatch").first().click();
    assert.equal(
      await page.locator(".color-presets summary").innerText(),
      dictionary["Palette presets"],
    );
    await page.locator(".color-close").click();
    await page.locator("#rhythmOptions").click();
    assert.ok(
      (await page.locator("#rhythmSettings").innerText()).includes(
        dictionary["Automatic"],
      ),
    );
    await page.keyboard.press("Escape");
    await page.locator('[data-setup-open="midi"]').click();
    assert.equal(
      await page.locator("#midiTarget option").first().innerText(),
      dictionary["midi.blackout"],
    );
    await page.locator("#tab-set").click();
    await page.locator("#showName").fill("My living set / Mein Set");
    await page.locator("#showName").press("Tab");
    await page.locator("#importSet").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"bad":'),
    });
    // The import error arrives asynchronously after the file is read.
    await page.waitForFunction(
      (text) => document.querySelector("#toast")?.innerText.includes(text),
      dictionary["error.json"],
      { timeout: 10000 },
    );
    await page.locator("#closeSetup").click();
    // All static declarations, including hidden dialogs and accessibility text, resolve.
    const staticFailures = await page.evaluate((dictionary) => {
      const failures = [];
      for (const node of document.querySelectorAll("*"))
        for (const attr of node.attributes) {
          if (!attr.name.startsWith("data-i18n")) continue;
          const expected = dictionary[attr.value];
          if (expected === undefined) failures.push(attr.value);
        }
      return failures;
    }, dictionary);
    assert.deepEqual(staticFailures, []);
    await page.screenshot({
      path: new URL(`${language}-desktop.png`, out).pathname,
    });
    const snapshot = await page.evaluate(() => {
      const texts = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent.trim();
        if (
          text &&
          node.parentElement?.checkVisibility() &&
          !node.parentElement.closest("script,style")
        )
          texts.push(text);
      }
      for (const node of document.querySelectorAll(
        "[title],[aria-label],[placeholder]",
      ))
        for (const attr of ["title", "aria-label", "placeholder"])
          if (node.getAttribute(attr)) texts.push(node.getAttribute(attr));
      return [...new Set(texts)];
    });
    await writeFile(
      new URL(`${language}-copy.json`, out),
      JSON.stringify(snapshot, null, 2),
    );
    // Compact layout must fit, with key controls still on screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () => document.body.dataset.panelLayout === "portrait",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: new URL(`${language}-mobile.png`, out).pathname,
    });
    const overlaps = await page.evaluate(() => {
      const a = document
        .getElementById("previewResolution")
        .getBoundingClientRect();
      const b = document.getElementById("beats").getBoundingClientRect();
      return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
      );
    });
    assert.equal(
      overlaps,
      false,
      "resolution and beat indicators must not overlap",
    );
    await page.reload();
    await page.waitForFunction(
      () =>
        document.getElementById("setName")?.textContent ===
        "My living set / Mein Set",
    );
    const stage = await context.newPage();
    stage.on("pageerror", (error) => errors.push(error.message));
    await stage.goto(server.url + "stage.html");
    assert.equal(
      (await stage.locator("#start").innerText()).trim(),
      dictionary["Start stage"],
    );
    assert.equal(
      await stage.locator("html").getAttribute("lang"),
      language.slice(0, 2),
    );
    await stage.close();
    await page.goto(server.url + "update.html");
    assert.equal(
      (await page.locator("#applyUpdate").innerText()).trim(),
      dictionary["Update and open Phosphor"],
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `PASS ${language}: controls, search, settings, names, errors, stage, updater and compact layout`,
    );
  }
} finally {
  await runtime?.stop();
  await server.close();
}
