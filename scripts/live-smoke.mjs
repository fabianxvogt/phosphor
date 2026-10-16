// Smoke the public demo: page loads, the featured world renders, no errors.
//   node scripts/live-smoke.mjs [url] [--out artifacts/live-smoke.png]
import { launch } from "./browser-runtime.mjs";
const url =
  process.argv.find((a) => a.startsWith("http")) ??
  "https://phosphor-performance.vercel.app/";
const outIndex = process.argv.indexOf("--out");
const out =
  outIndex > 0 ? process.argv[outIndex + 1] : "artifacts/live-smoke.png";
const runtime = await launch({ rig: true });
const errors = [];
try {
  const page = await runtime.browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on(
    "response",
    (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`),
  );
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(8000);
  const title = await page.title();
  await page.screenshot({ path: out });
  console.log(JSON.stringify({ url, title, errors, screenshot: out }));
  if (errors.length) process.exitCode = 1;
} finally {
  await runtime.browser.close();
}
