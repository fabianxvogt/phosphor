import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkAssets } from "../scripts/build.mjs";
import { verifyDistribution } from "../scripts/check-dist.mjs";

test("HTML entrypoints walk nested, side-effect, re-export and literal dynamic imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "pipeline graph "));
  try {
    await mkdir(join(root, "nested"));
    const files = {
      "index.html": '<link href="./style.css?v=1"><script type="module" src="./main.mjs"></script>',
      "stage.html": '<script src="./stage.mjs"></script>',
      "update.html": '<script type="module" src="./update.mjs"></script>',
      "update.mjs": 'export {};',
      "beat-worklet.mjs": "export {};",
      "style.css": "body{}",
      "main.mjs": '// import "./absent-comment.mjs";\nconst text = \'import "./absent-string.mjs";\';\nimport "./nested/side.mjs"; export { x } from "./nested/value.mjs"; import("./lazy.mjs");',
      "nested/side.mjs": 'import { x } from "./value.mjs";',
      "nested/value.mjs": "export const x=1;",
      "lazy.mjs": "export default 1;",
      "stage.mjs": 'import "./main.mjs";',
    };
    for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content);
    assert.deepEqual(await walkAssets(root), Object.keys(files).sort());
    const dist = join(root, "dist");
    await mkdir(dist);
    for (const name of Object.keys(files)) { await mkdir(join(dist, name, ".."), { recursive: true }); await cp(join(root, name), join(dist, name)); }
    const assets = ["./", ...Object.keys(files).map(name => `./${name}`)];
    const worker = list => `const REVISION="abcdef1234567890"; const ASSETS = ${JSON.stringify(list)};`;
    await writeFile(join(dist, "sw.js"), worker(assets.filter(name => name !== "./lazy.mjs")));
    await assert.rejects(verifyDistribution(root, dist), /not precached: lazy.mjs/);
    await writeFile(join(dist, "sw.js"), worker(assets));
    await rm(join(dist, "lazy.mjs"));
    await assert.rejects(verifyDistribution(root, dist), /lazy.mjs/);
    await writeFile(join(root, "main.mjs"), 'import "../outside.mjs";');
    await assert.rejects(walkAssets(root), /Unsafe asset/);
  } finally { await rm(root, {recursive:true,force:true}); }
});
